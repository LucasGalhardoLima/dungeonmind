import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowISO } from '../database';

export interface PlayerDecision {
  id: string;
  campaign_id: string;
  session_id: string;
  description: string;
  consequence: string;
  created_at: string;
}

export class PlayerDecisionRepository {
  constructor(private db: SQLiteDatabase) {}

  create(decision: Omit<PlayerDecision, 'id' | 'created_at'>): PlayerDecision {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO player_decision (id, campaign_id, session_id, description, consequence, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, decision.campaign_id, decision.session_id, decision.description, decision.consequence, now],
    );
    return { ...decision, id, created_at: now };
  }

  getRecent(campaignId: string, limit: number = 3): PlayerDecision[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM player_decision WHERE campaign_id = ? ORDER BY created_at DESC LIMIT ?',
      [campaignId, limit],
    );
    return rows.map((r) => ({
      id: r['id'] as string,
      campaign_id: r['campaign_id'] as string,
      session_id: r['session_id'] as string,
      description: r['description'] as string,
      consequence: r['consequence'] as string,
      created_at: r['created_at'] as string,
    }));
  }
}
