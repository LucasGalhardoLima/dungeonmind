import type { SQLiteDatabase } from 'expo-sqlite';
import type { Exchange } from '../../types/entities';
import { generateId, nowISO } from '../database';

export class ExchangeRepository {
  constructor(private db: SQLiteDatabase) {}

  create(exchange: Omit<Exchange, 'id' | 'created_at'>): Exchange {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO exchange (id, session_id, campaign_id, role, content, metadata, sequence, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        exchange.session_id,
        exchange.campaign_id,
        exchange.role,
        exchange.content,
        exchange.metadata,
        exchange.sequence,
        now,
      ]
    );
    return { ...exchange, id, created_at: now };
  }

  getById(id: string): Exchange | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM exchange WHERE id = ?',
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  getBySessionId(
    sessionId: string,
    limit?: number,
    offset?: number
  ): Exchange[] {
    let sql = 'SELECT * FROM exchange WHERE session_id = ? ORDER BY sequence ASC';
    const params: (string | number)[] = [sessionId];

    if (limit !== undefined) {
      sql += ' LIMIT ?';
      params.push(limit);
    }
    if (offset !== undefined) {
      sql += ' OFFSET ?';
      params.push(offset);
    }

    const rows = this.db.getAllSync<Record<string, unknown>>(sql, params);
    return rows.map((r) => this.mapRow(r));
  }

  getRecent(campaignId: string, limit: number = 20): Exchange[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM exchange WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?',
      [campaignId, limit]
    );
    return rows.map((r) => this.mapRow(r));
  }

  getCount(sessionId: string): number {
    const row = this.db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM exchange WHERE session_id = ?',
      [sessionId]
    );
    return row?.count ?? 0;
  }

  getNextSequence(sessionId: string): number {
    const row = this.db.getFirstSync<{ max_seq: number | null }>(
      'SELECT MAX(sequence) as max_seq FROM exchange WHERE session_id = ?',
      [sessionId]
    );
    return (row?.max_seq ?? -1) + 1;
  }

  getByCampaignSinceSession(
    campaignId: string,
    sinceSessionId: string
  ): Exchange[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM exchange WHERE campaign_id = ? AND session_id >= ? ORDER BY sequence ASC',
      [campaignId, sinceSessionId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  delete(id: string): void {
    this.db.runSync('DELETE FROM exchange WHERE id = ?', [id]);
  }

  private mapRow(row: Record<string, unknown>): Exchange {
    return {
      id: row['id'] as string,
      session_id: row['session_id'] as string,
      campaign_id: row['campaign_id'] as string,
      role: row['role'] as Exchange['role'],
      content: row['content'] as string,
      metadata: row['metadata'] as string | null,
      sequence: row['sequence'] as number,
      created_at: row['created_at'] as string,
    };
  }
}
