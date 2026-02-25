import { getSupabaseClient } from './realtime-channel';

export class SyncEngine {
  private syncInterval: ReturnType<typeof setInterval> | null = null;
  private isHost: boolean;

  constructor(isHost: boolean) {
    this.isHost = isHost;
  }

  /**
   * Starts periodic state synchronisation (host only).
   *
   * Every 30 seconds the host serialises the current state document and
   * recent history, then pushes them to the `multiplayer_sessions` table
   * so that reconnecting clients can catch up.
   */
  startPeriodicSync(
    sessionCode: string,
    getStateDocument: () => string,
    getRecentHistory: () => string,
  ): void {
    if (!this.isHost) return;

    this.syncInterval = setInterval(() => {
      void this.syncState(sessionCode, getStateDocument(), getRecentHistory());
    }, 30_000);
  }

  /** Stops the periodic sync timer if one is running. */
  stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * Persists the current game state to the `multiplayer_sessions` table.
   *
   * Both `stateDocument` and `recentHistory` are expected to be valid JSON
   * strings which are parsed before storage so Supabase stores them as JSONB.
   */
  async syncState(
    sessionCode: string,
    stateDocument: string,
    recentHistory: string,
  ): Promise<void> {
    const supabase = getSupabaseClient();

    await supabase
      .from('multiplayer_sessions')
      .update({
        state_document: JSON.parse(stateDocument) as Record<string, unknown>,
        recent_history: JSON.parse(recentHistory) as Record<string, unknown>,
        updated_at: new Date().toISOString(),
      })
      .eq('session_code', sessionCode);
  }

  /**
   * Fetches the latest game state from the `multiplayer_sessions` table.
   *
   * Used by non-host players when reconnecting to catch up with the
   * current session state.
   */
  async fetchState(
    sessionCode: string,
  ): Promise<{ stateDocument: string; recentHistory: string } | null> {
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('multiplayer_sessions')
      .select('state_document, recent_history')
      .eq('session_code', sessionCode)
      .single();

    if (!data) return null;

    return {
      stateDocument: JSON.stringify(data['state_document']),
      recentHistory: JSON.stringify(data['recent_history']),
    };
  }

  /**
   * Detects missing sequence numbers between the local and remote state.
   *
   * Returns an array of sequence numbers that the local client is missing,
   * which can then be requested or replayed. Returns an empty array when
   * the local state is already up to date.
   */
  detectSequenceGap(localLastSequence: number, remoteLastSequence: number): number[] {
    if (localLastSequence >= remoteLastSequence) return [];

    const missing: number[] = [];
    for (let i = localLastSequence + 1; i <= remoteLastSequence; i++) {
      missing.push(i);
    }
    return missing;
  }
}
