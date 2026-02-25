import type { SQLiteDatabase } from 'expo-sqlite';
import type { NPC } from '../../types/entities';
import { generateId, nowISO } from '../database';

export class NPCRepository {
  constructor(private db: SQLiteDatabase) {}

  create(npc: Omit<NPC, 'id' | 'created_at' | 'updated_at'>): NPC {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO npc (id, campaign_id, name, description, trust, fear, anger, gratitude,
        last_interaction_summary, last_interaction_session_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        npc.campaign_id,
        npc.name,
        npc.description,
        npc.trust,
        npc.fear,
        npc.anger,
        npc.gratitude,
        npc.last_interaction_summary,
        npc.last_interaction_session_id,
        now,
        now,
      ]
    );
    const row = this.db.getFirstSync<Record<string, unknown>>('SELECT * FROM npc WHERE id = ?', [id]);
    return this.mapRow(row!);
  }

  getByCampaignId(campaignId: string): NPC[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM npc WHERE campaign_id = ? ORDER BY name ASC',
      [campaignId]
    );
    return rows.map(r => this.mapRow(r));
  }

  getByName(campaignId: string, name: string): NPC | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM npc WHERE campaign_id = ? AND name = ?',
      [campaignId, name]
    );
    return row ? this.mapRow(row) : null;
  }

  updateEmotionalState(
    id: string,
    deltas: { trust?: number; fear?: number; anger?: number; gratitude?: number }
  ): void {
    const setClauses: string[] = [];
    const params: (string | number)[] = [];

    if (deltas.trust !== undefined) {
      setClauses.push('trust = MIN(100, MAX(0, trust + ?))');
      params.push(deltas.trust);
    }
    if (deltas.fear !== undefined) {
      setClauses.push('fear = MIN(100, MAX(0, fear + ?))');
      params.push(deltas.fear);
    }
    if (deltas.anger !== undefined) {
      setClauses.push('anger = MIN(100, MAX(0, anger + ?))');
      params.push(deltas.anger);
    }
    if (deltas.gratitude !== undefined) {
      setClauses.push('gratitude = MIN(100, MAX(0, gratitude + ?))');
      params.push(deltas.gratitude);
    }

    if (setClauses.length === 0) {
      return;
    }

    setClauses.push('updated_at = ?');
    params.push(nowISO());
    params.push(id);

    this.db.runSync(
      `UPDATE npc SET ${setClauses.join(', ')} WHERE id = ?`,
      params
    );
  }

  updateInteraction(id: string, sessionId: string, summary: string): void {
    this.db.runSync(
      `UPDATE npc SET last_interaction_summary = ?, last_interaction_session_id = ?, updated_at = ?
       WHERE id = ?`,
      [summary, sessionId, nowISO(), id]
    );
  }

  private mapRow(row: Record<string, unknown>): NPC {
    return {
      id: row['id'] as string,
      campaign_id: row['campaign_id'] as string,
      name: row['name'] as string,
      description: row['description'] as string,
      trust: row['trust'] as number,
      fear: row['fear'] as number,
      anger: row['anger'] as number,
      gratitude: row['gratitude'] as number,
      last_interaction_summary: row['last_interaction_summary'] as string,
      last_interaction_session_id: row['last_interaction_session_id'] as string | null,
      created_at: row['created_at'] as string,
      updated_at: row['updated_at'] as string,
    };
  }
}
