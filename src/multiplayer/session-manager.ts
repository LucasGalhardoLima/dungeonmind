import { getSupabaseClient, subscribeToSession, unsubscribeFromSession } from './realtime-channel';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ??
  process.env['EXPO_PUBLIC_SUPABASE_URL'] ??
  '';

/** Reconnection window thresholds in milliseconds. */
const AUTO_RECOVER_MS = 30_000;
const RECOVERABLE_MS = 300_000;

interface CreateSessionResponse {
  session_code: string;
}

export class SessionManager {
  private channel: RealtimeChannel | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private disconnectTime: number | null = null;

  /**
   * Creates a new multiplayer session.
   *
   * 1. Calls the Supabase Edge Function to generate a session code.
   * 2. Subscribes to the Realtime channel for the new session.
   * 3. Registers the host player in `session_players`.
   * 4. Returns the generated session code.
   */
  async createSession(
    playerId: string,
    playerName: string,
    campaignId: string,
    onEvent: (payload: Record<string, unknown>) => void,
  ): Promise<string> {
    const supabase = getSupabaseClient();

    // 1. Call Supabase Edge Function to generate session code
    const response = await fetch(`${SUPABASE_URL}/functions/v1/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        host_player_id: playerId,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create session: ${String(response.status)}`);
    }

    const data: CreateSessionResponse = (await response.json()) as CreateSessionResponse;
    const sessionCode = data.session_code;

    // 2. Subscribe to the channel
    this.channel = subscribeToSession(sessionCode, onEvent);

    // 3. Register self in session_players
    const { error } = await supabase.from('session_players').insert({
      session_code: sessionCode,
      player_id: playerId,
      player_name: playerName,
      is_host: true,
      is_connected: true,
      joined_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Failed to register host player: ${error.message}`);
    }

    // 4. Return session code
    return sessionCode;
  }

  /**
   * Joins an existing multiplayer session.
   *
   * 1. Verifies the session exists and is active.
   * 2. Subscribes to the Realtime channel.
   * 3. Registers the joining player in `session_players`.
   * 4. Broadcasts a `player_connected` event to the channel.
   */
  async joinSession(
    sessionCode: string,
    playerId: string,
    playerName: string,
    onEvent: (payload: Record<string, unknown>) => void,
  ): Promise<void> {
    const supabase = getSupabaseClient();

    // 1. Verify session exists and is active
    const { data: session, error: sessionError } = await supabase
      .from('multiplayer_sessions')
      .select('session_code, status')
      .eq('session_code', sessionCode)
      .eq('status', 'active')
      .single();

    if (sessionError ?? !session) {
      throw new Error('Session not found or is no longer active');
    }

    // 2. Subscribe to channel
    this.channel = subscribeToSession(sessionCode, onEvent);

    // 3. Register self in session_players
    const { error: insertError } = await supabase.from('session_players').insert({
      session_code: sessionCode,
      player_id: playerId,
      player_name: playerName,
      is_host: false,
      is_connected: true,
      joined_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(`Failed to register player: ${insertError.message}`);
    }

    // 4. Broadcast player_connected event
    if (this.channel) {
      void this.channel.send({
        type: 'broadcast',
        event: 'session_event',
        payload: {
          type: 'player_connected',
          player_id: playerId,
          player_name: playerName,
        },
      });
    }
  }

  /**
   * Leaves the current multiplayer session.
   *
   * 1. Broadcasts a `player_disconnected` event.
   * 2. Updates `session_players.is_connected` to `false`.
   * 3. Unsubscribes from the Realtime channel.
   * 4. Clears any pending reconnect timer.
   */
  async leaveSession(playerId: string): Promise<void> {
    const supabase = getSupabaseClient();

    // 1. Broadcast player_disconnected
    if (this.channel) {
      void this.channel.send({
        type: 'broadcast',
        event: 'session_event',
        payload: {
          type: 'player_disconnected',
          player_id: playerId,
        },
      });
    }

    // 2. Update session_players.is_connected = false
    await supabase
      .from('session_players')
      .update({ is_connected: false })
      .eq('player_id', playerId);

    // 3. Unsubscribe from channel
    if (this.channel) {
      await unsubscribeFromSession(this.channel);
      this.channel = null;
    }

    // 4. Clear reconnect timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.disconnectTime = null;
  }

  /** Returns the current Realtime channel, or `null` if not subscribed. */
  getChannel(): RealtimeChannel | null {
    return this.channel;
  }

  /** Tracks the moment the player disconnected for reconnection logic. */
  handleDisconnect(playerId: string): void {
    void playerId; // kept for future per-player tracking
    this.disconnectTime = Date.now();
  }

  /**
   * Attempts to reconnect after a disconnection.
   *
   * - If disconnected less than 30 seconds: auto-recovers transparently.
   * - If disconnected between 30 seconds and 5 minutes: returns `true`
   *   (recoverable, but the UI should show a waiting/reconnecting state).
   * - If disconnected longer than 5 minutes: returns `false` (suggest solo mode).
   */
  async handleReconnect(
    playerId: string,
    onEvent: (payload: Record<string, unknown>) => void,
  ): Promise<boolean> {
    if (this.disconnectTime === null) {
      return false;
    }

    const elapsed = Date.now() - this.disconnectTime;

    if (elapsed > RECOVERABLE_MS) {
      // Disconnected too long -- not recoverable
      this.disconnectTime = null;
      return false;
    }

    const supabase = getSupabaseClient();

    // Look up the player's session to reconnect
    const { data: playerRow } = await supabase
      .from('session_players')
      .select('session_code')
      .eq('player_id', playerId)
      .eq('is_connected', false)
      .single();

    if (!playerRow) {
      this.disconnectTime = null;
      return false;
    }

    const sessionCode = playerRow.session_code as string;

    // Re-subscribe to the channel
    this.channel = subscribeToSession(sessionCode, onEvent);

    // Mark as connected again
    await supabase
      .from('session_players')
      .update({ is_connected: true })
      .eq('player_id', playerId);

    // Broadcast reconnection
    if (this.channel) {
      void this.channel.send({
        type: 'broadcast',
        event: 'session_event',
        payload: {
          type: 'player_reconnected',
          player_id: playerId,
        },
      });
    }

    this.disconnectTime = null;

    if (elapsed < AUTO_RECOVER_MS) {
      // Auto-recovered transparently
      return true;
    }

    // Recoverable but UI should show waiting state
    return true;
  }
}
