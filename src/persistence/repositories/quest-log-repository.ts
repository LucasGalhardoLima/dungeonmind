import type { SQLiteDatabase } from 'expo-sqlite';
import { generateId, nowISO } from '../database';
import type { QuestStatus } from '../../types/state-document';

export interface QuestLog {
  id: string;
  campaign_id: string;
  title: string;
  description: string;
  status: QuestStatus;
  giver_npc_id: string | null;
  created_session_id: string | null;
  completed_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuestEvent {
  id: string;
  quest_id: string;
  session_id: string;
  description: string;
  sequence: number;
  created_at: string;
}

export class QuestLogRepository {
  constructor(private db: SQLiteDatabase) {}

  create(quest: Omit<QuestLog, 'id' | 'created_at' | 'updated_at'>): QuestLog {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO quest_log (id, campaign_id, title, description, status, giver_npc_id, created_session_id, completed_session_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, quest.campaign_id, quest.title, quest.description, quest.status, quest.giver_npc_id, quest.created_session_id, quest.completed_session_id, now, now],
    );
    return { ...quest, id, created_at: now, updated_at: now };
  }

  getByCampaignId(campaignId: string): QuestLog[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM quest_log WHERE campaign_id = ? ORDER BY created_at ASC',
      [campaignId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  getActive(campaignId: string): QuestLog[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      `SELECT * FROM quest_log WHERE campaign_id = ? AND status = 'active' ORDER BY created_at ASC`,
      [campaignId],
    );
    return rows.map((r) => this.mapRow(r));
  }

  updateStatus(id: string, status: QuestStatus, sessionId?: string): void {
    const now = nowISO();
    if (status === 'completed' || status === 'failed') {
      this.db.runSync(
        'UPDATE quest_log SET status = ?, completed_session_id = ?, updated_at = ? WHERE id = ?',
        [status, sessionId ?? null, now, id],
      );
    } else {
      this.db.runSync(
        'UPDATE quest_log SET status = ?, updated_at = ? WHERE id = ?',
        [status, now, id],
      );
    }
  }

  getByTitle(campaignId: string, title: string): QuestLog | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM quest_log WHERE campaign_id = ? AND title = ?',
      [campaignId, title],
    );
    return row ? this.mapRow(row) : null;
  }

  addEvent(event: Omit<QuestEvent, 'id' | 'created_at'>): QuestEvent {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO quest_event (id, quest_id, session_id, description, sequence, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [id, event.quest_id, event.session_id, event.description, event.sequence, now],
    );
    return { ...event, id, created_at: now };
  }

  getEvents(questId: string): QuestEvent[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM quest_event WHERE quest_id = ? ORDER BY sequence ASC',
      [questId],
    );
    return rows.map((r) => ({
      id: r['id'] as string,
      quest_id: r['quest_id'] as string,
      session_id: r['session_id'] as string,
      description: r['description'] as string,
      sequence: r['sequence'] as number,
      created_at: r['created_at'] as string,
    }));
  }

  private mapRow(r: Record<string, unknown>): QuestLog {
    return {
      id: r['id'] as string,
      campaign_id: r['campaign_id'] as string,
      title: r['title'] as string,
      description: r['description'] as string,
      status: r['status'] as QuestStatus,
      giver_npc_id: r['giver_npc_id'] as string | null,
      created_session_id: r['created_session_id'] as string | null,
      completed_session_id: r['completed_session_id'] as string | null,
      created_at: r['created_at'] as string,
      updated_at: r['updated_at'] as string,
    };
  }
}
