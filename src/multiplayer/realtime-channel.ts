import { createClient } from '@supabase/supabase-js';
import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

const SUPABASE_URL =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ??
  process.env['EXPO_PUBLIC_SUPABASE_URL'] ??
  '';
const SUPABASE_KEY =
  Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_KEY ??
  process.env['EXPO_PUBLIC_SUPABASE_KEY'] ??
  '';

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY);

/** Returns the Supabase client singleton. */
export function getSupabaseClient(): SupabaseClient {
  return supabase;
}

/**
 * Subscribes to a Supabase Realtime Broadcast channel for the given session.
 *
 * The channel name follows the pattern `session:{sessionCode}`.
 * Incoming broadcast events with the name `session_event` are forwarded to
 * the provided `onEvent` callback.
 *
 * @returns The `RealtimeChannel` instance so the caller can later unsubscribe.
 */
export function subscribeToSession(
  sessionCode: string,
  onEvent: (payload: Record<string, unknown>) => void,
): RealtimeChannel {
  const channel = supabase.channel(`session:${sessionCode}`);

  channel
    .on('broadcast', { event: 'session_event' }, (message) => {
      const payload = message.payload as Record<string, unknown> | undefined;
      if (payload) {
        onEvent(payload);
      }
    })
    .subscribe();

  return channel;
}

/**
 * Unsubscribes from and removes a Realtime channel.
 *
 * Safe to call even if the channel is already removed.
 */
export async function unsubscribeFromSession(
  channel: RealtimeChannel,
): Promise<void> {
  await channel.unsubscribe();
  await supabase.removeChannel(channel);
}

/**
 * Sends a broadcast event on an existing Realtime channel.
 *
 * The event name is always `session_event` to keep the channel protocol
 * uniform; the actual event type is encoded inside the payload.
 */
export function broadcastToSession(
  channel: RealtimeChannel,
  eventName: string,
  payload: Record<string, unknown>,
): void {
  void channel.send({
    type: 'broadcast',
    event: eventName,
    payload,
  });
}
