import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowISO } from '../database';

export interface NPCInteraction {
  id: string;
  npc_id: string;
  session_id: string;
  summary: string;
  emotional_snapshot: string; // JSON
  created_at: string;
}

const MAX_INTERACTIONS_PER_NPC = 5;

export class NPCInteractionRepository {
  constructor(private db: SQLiteDatabase) {}

  add(interaction: Omit<NPCInteraction, 'id' | 'created_at'>): NPCInteraction {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO npc_interaction (id, npc_id, session_id, summary, emotional_snapshot, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, interaction.npc_id, interaction.session_id, interaction.summary, interaction.emotional_snapshot, now],
    );

    // Enforce max 5 interactions per NPC — delete oldest beyond limit
    this.db.runSync(
      `DELETE FROM npc_interaction WHERE id IN (
        SELECT id FROM npc_interaction WHERE npc_id = ? ORDER BY created_at DESC LIMIT -1 OFFSET ?
      )`,
      [interaction.npc_id, MAX_INTERACTIONS_PER_NPC],
    );

    return { ...interaction, id, created_at: now };
  }

  getByNPCId(npcId: string, limit?: number): NPCInteraction[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      `SELECT * FROM npc_interaction WHERE npc_id = ? ORDER BY created_at DESC LIMIT ?`,
      [npcId, limit ?? MAX_INTERACTIONS_PER_NPC],
    );
    return rows.map((r) => this.mapRow(r));
  }

  getCountByNPCId(npcId: string): number {
    const row = this.db.getFirstSync<{ count: number }>(
      'SELECT COUNT(*) as count FROM npc_interaction WHERE npc_id = ?',
      [npcId],
    );
    return row?.count ?? 0;
  }

  private mapRow(r: Record<string, unknown>): NPCInteraction {
    return {
      id: r['id'] as string,
      npc_id: r['npc_id'] as string,
      session_id: r['session_id'] as string,
      summary: r['summary'] as string,
      emotional_snapshot: r['emotional_snapshot'] as string,
      created_at: r['created_at'] as string,
    };
  }
}
