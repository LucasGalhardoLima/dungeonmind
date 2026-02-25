import type { SessionEvent } from '../types/session-events';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { broadcastToSession } from './realtime-channel';

/** All valid `type` values in the SessionEvent discriminated union. */
const VALID_EVENT_TYPES: ReadonlySet<string> = new Set([
  'narration_chunk',
  'narration_complete',
  'dice_requested',
  'dice_rolling',
  'dice_result',
  'scene_generating',
  'scene_ready',
  'chat_message',
  'player_connected',
  'player_disconnected',
  'turn_change',
]);

/**
 * Type guard that validates whether an unknown value conforms to the
 * `SessionEvent` discriminated union.
 *
 * Checks:
 * - The value is a non-null object.
 * - It has a `type` field whose value is one of the known event type strings.
 * - It has a `sequence` field that is a finite number.
 */
export function isSessionEvent(value: unknown): value is SessionEvent {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  const eventType = record['type'];
  if (typeof eventType !== 'string' || !VALID_EVENT_TYPES.has(eventType)) {
    return false;
  }

  const sequence = record['sequence'];
  if (typeof sequence !== 'number' || !Number.isFinite(sequence)) {
    return false;
  }

  return true;
}

/**
 * Assigns a monotonic sequence number to the event and broadcasts it on the
 * given Realtime channel.
 *
 * @param channel      - The Supabase Realtime channel to broadcast on.
 * @param event        - The event payload *without* a `sequence` number.
 * @param getNextSequence - A function that returns the next monotonic sequence
 *                          number (typically `store.incrementSequence`).
 */
export function sendEvent(
  channel: RealtimeChannel,
  event: Omit<SessionEvent, 'sequence'>,
  getNextSequence: () => number,
): void {
  const sequence = getNextSequence();
  const fullEvent: Record<string, unknown> = { ...event, sequence };
  broadcastToSession(channel, 'session_event', fullEvent);
}

/**
 * Validates an incoming event and determines whether it has already been
 * processed (idempotency check via monotonic sequence numbers).
 *
 * @param event        - The raw incoming value from the broadcast payload.
 * @param lastSequence - The last successfully processed sequence number.
 *
 * @returns An object containing the validated `SessionEvent` and an `isNew`
 *          flag, or `null` if the value is not a valid `SessionEvent`.
 */
export function processIncomingEvent(
  event: unknown,
  lastSequence: number,
): { event: SessionEvent; isNew: boolean } | null {
  if (!isSessionEvent(event)) {
    return null;
  }

  return {
    event,
    isNew: event.sequence > lastSequence,
  };
}
