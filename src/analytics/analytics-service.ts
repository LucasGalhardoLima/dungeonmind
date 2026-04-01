import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowISO } from '../persistence/database';

/**
 * Core analytics event names tracked throughout the app.
 * No PII is ever stored — only event names, timestamps, and
 * non-identifying metadata (world, adventure type, counts).
 */
export type AnalyticsEventName =
  | 'app_open'
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'onboarding_skipped'
  | 'world_selected'
  | 'adventure_type_selected'
  | 'campaign_created'
  | 'character_created'
  | 'session_started'
  | 'session_ended'
  | 'exchange_sent'
  | 'dice_rolled'
  | 'scene_generated'
  | 'settings_opened'
  | 'feedback_submitted';

/** Funnel steps in order — used for conversion analysis. */
export const FUNNEL_STEPS: readonly AnalyticsEventName[] = [
  'onboarding_completed',
  'world_selected',
  'adventure_type_selected',
  'campaign_created',
  'character_created',
  'session_started',
] as const;

export interface AnalyticsEvent {
  id: string;
  event_name: AnalyticsEventName;
  properties: Record<string, string | number | boolean> | null;
  created_at: string;
}

/**
 * Check if the player has opted out of analytics tracking.
 */
function isOptedOut(db: SQLiteDatabase): boolean {
  const row = db.getFirstSync<{ analytics_opt_out: number }>(
    'SELECT analytics_opt_out FROM player LIMIT 1',
  );
  return row?.analytics_opt_out === 1;
}

/**
 * Track an analytics event. No-op if the user has opted out.
 * All properties must be non-PII primitives.
 */
export function trackEvent(
  db: SQLiteDatabase,
  eventName: AnalyticsEventName,
  properties?: Record<string, string | number | boolean>,
): void {
  if (isOptedOut(db)) return;

  const id = generateId();
  const now = nowISO();
  const propsJson = properties ? JSON.stringify(properties) : null;

  db.runSync(
    `INSERT INTO analytics_event (id, event_name, properties, created_at)
     VALUES (?, ?, ?, ?)`,
    [id, eventName, propsJson, now],
  );
}

/**
 * Get event counts grouped by event name for a date range.
 */
export function getEventCounts(
  db: SQLiteDatabase,
  sinceISO?: string,
): Record<string, number> {
  const rows = sinceISO
    ? db.getAllSync<{ event_name: string; count: number }>(
        `SELECT event_name, COUNT(*) as count FROM analytics_event
         WHERE created_at >= ? GROUP BY event_name`,
        [sinceISO],
      )
    : db.getAllSync<{ event_name: string; count: number }>(
        'SELECT event_name, COUNT(*) as count FROM analytics_event GROUP BY event_name',
      );

  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.event_name] = row.count;
  }
  return result;
}

/**
 * Compute funnel conversion rates.
 * Returns an array of { step, count, conversionFromPrevious }.
 */
export function getFunnelMetrics(
  db: SQLiteDatabase,
): Array<{ step: AnalyticsEventName; count: number; conversionFromPrevious: number }> {
  const counts = getEventCounts(db);
  let previousCount = 0;

  return FUNNEL_STEPS.map((step, index) => {
    const count = counts[step] ?? 0;
    const conversion =
      index === 0 || previousCount === 0
        ? 1
        : count / previousCount;
    previousCount = count;
    return { step, count, conversionFromPrevious: Math.round(conversion * 100) / 100 };
  });
}

/**
 * Export all analytics as a JSON string (no PII).
 */
export function exportAnalyticsEventsJson(db: SQLiteDatabase): string {
  const events = db.getAllSync<AnalyticsEvent>(
    'SELECT * FROM analytics_event ORDER BY created_at DESC LIMIT 500',
  );
  const counts = getEventCounts(db);
  const funnel = getFunnelMetrics(db);

  return JSON.stringify(
    {
      exported_at: new Date().toISOString(),
      total_events: events.length,
      event_counts: counts,
      funnel,
      recent_events: events.map((e) => ({
        event_name: e.event_name,
        properties: e.properties ? JSON.parse(e.properties as unknown as string) : null,
        created_at: e.created_at,
      })),
    },
    null,
    2,
  );
}
