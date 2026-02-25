import type { SQLiteDatabase } from 'expo-sqlite';
import type { NotificationCategory, NotificationLog } from '../../types/entities';
import { generateId, nowISO } from '../database';

export class NotificationLogRepository {
  constructor(private db: SQLiteDatabase) {}

  log(campaignId: string, category: NotificationCategory): void {
    const id = generateId();
    this.db.runSync(
      `INSERT INTO notification_log (id, campaign_id, category, sent_at)
       VALUES (?, ?, ?, ?)`,
      [id, campaignId, category, nowISO()]
    );
  }

  getCountToday(campaignId: string): number {
    const row = this.db.getFirstSync<{ count: number }>(
      `SELECT COUNT(*) AS count FROM notification_log
       WHERE campaign_id = ? AND strftime('%Y-%m-%d', sent_at) = strftime('%Y-%m-%d', 'now')`,
      [campaignId]
    );
    return row?.count ?? 0;
  }

  getLastByCategory(campaignId: string, category: NotificationCategory): NotificationLog | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      `SELECT * FROM notification_log
       WHERE campaign_id = ? AND category = ?
       ORDER BY sent_at DESC LIMIT 1`,
      [campaignId, category]
    );
    return row ? this.mapRow(row) : null;
  }

  markTapped(id: string): void {
    this.db.runSync(
      'UPDATE notification_log SET tapped_at = ? WHERE id = ?',
      [nowISO(), id]
    );
  }

  private mapRow(row: Record<string, unknown>): NotificationLog {
    return {
      id: row['id'] as string,
      campaign_id: row['campaign_id'] as string,
      category: row['category'] as NotificationCategory,
      sent_at: row['sent_at'] as string,
      tapped_at: row['tapped_at'] as string | null,
    };
  }
}
