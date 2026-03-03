import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowISO } from '../database';

export interface SessionRecap {
  id: string;
  session_id: string;
  campaign_id: string;
  recap_text: string;
  created_at: string;
}

export class SessionRecapRepository {
  constructor(private db: SQLiteDatabase) {}

  create(recap: Omit<SessionRecap, 'id' | 'created_at'>): SessionRecap {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO session_recap (id, session_id, campaign_id, recap_text, created_at) VALUES (?, ?, ?, ?, ?)`,
      [id, recap.session_id, recap.campaign_id, recap.recap_text, now],
    );
    return { ...recap, id, created_at: now };
  }

  getBySessionId(sessionId: string): SessionRecap | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM session_recap WHERE session_id = ?',
      [sessionId],
    );
    if (!row) return null;
    return {
      id: row['id'] as string,
      session_id: row['session_id'] as string,
      campaign_id: row['campaign_id'] as string,
      recap_text: row['recap_text'] as string,
      created_at: row['created_at'] as string,
    };
  }

  getLatestByCampaignId(campaignId: string): SessionRecap | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM session_recap WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 1',
      [campaignId],
    );
    if (!row) return null;
    return {
      id: row['id'] as string,
      session_id: row['session_id'] as string,
      campaign_id: row['campaign_id'] as string,
      recap_text: row['recap_text'] as string,
      created_at: row['created_at'] as string,
    };
  }
}
