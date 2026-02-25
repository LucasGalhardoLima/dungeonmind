import type { SQLiteDatabase } from 'expo-sqlite';
import type { Session } from '../../types/entities';
import { generateId, nowISO } from '../database';

export class SessionRepository {
  constructor(private db: SQLiteDatabase) {}

  create(session: Omit<Session, 'id' | 'started_at'>): Session {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO session (id, campaign_id, summary, summary_generated_at, started_at, ended_at, is_multiplayer)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        session.campaign_id,
        session.summary,
        session.summary_generated_at,
        now,
        session.ended_at,
        session.is_multiplayer ? 1 : 0,
      ]
    );
    return { ...session, id, started_at: now };
  }

  getById(id: string): Session | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM session WHERE id = ?',
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  getByCampaignId(campaignId: string): Session[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM session WHERE campaign_id = ? ORDER BY started_at DESC',
      [campaignId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  getLatest(campaignId: string): Session | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM session WHERE campaign_id = ? ORDER BY started_at DESC LIMIT 1',
      [campaignId]
    );
    return row ? this.mapRow(row) : null;
  }

  getActive(campaignId: string): Session | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM session WHERE campaign_id = ? AND ended_at IS NULL ORDER BY started_at DESC LIMIT 1',
      [campaignId]
    );
    return row ? this.mapRow(row) : null;
  }

  endSession(id: string): void {
    this.db.runSync('UPDATE session SET ended_at = ? WHERE id = ?', [
      nowISO(),
      id,
    ]);
  }

  updateSummary(id: string, summary: string): void {
    this.db.runSync(
      'UPDATE session SET summary = ?, summary_generated_at = ? WHERE id = ?',
      [summary, nowISO(), id]
    );
  }

  getWithSummaries(campaignId: string): Session[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM session WHERE campaign_id = ? AND summary IS NOT NULL ORDER BY started_at DESC',
      [campaignId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  delete(id: string): void {
    this.db.runSync('DELETE FROM session WHERE id = ?', [id]);
  }

  private mapRow(row: Record<string, unknown>): Session {
    return {
      id: row['id'] as string,
      campaign_id: row['campaign_id'] as string,
      summary: row['summary'] as string | null,
      summary_generated_at: row['summary_generated_at'] as string | null,
      started_at: row['started_at'] as string,
      ended_at: row['ended_at'] as string | null,
      is_multiplayer: (row['is_multiplayer'] as number) === 1,
    };
  }
}
