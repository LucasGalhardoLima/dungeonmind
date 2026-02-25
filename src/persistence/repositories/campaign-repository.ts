import type { SQLiteDatabase } from 'expo-sqlite';
import type { Campaign, CampaignStatus } from '../../types/entities';
import type { StateDocument } from '../../types/state-document';
import { generateId, nowISO } from '../database';

export class CampaignRepository {
  constructor(private db: SQLiteDatabase) {}

  create(
    campaign: Omit<Campaign, 'id' | 'created_at' | 'last_played_at' | 'session_count'>
  ): Campaign {
    const id = generateId();
    const now = nowISO();
    this.db.runSync(
      `INSERT INTO campaign (id, player_id, session_code, world, adventure_type, name, opening_hook, state_document, status, difficulty, mature_content, session_count, created_at, last_played_at, thumbnail_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        id,
        campaign.player_id,
        campaign.session_code,
        campaign.world,
        campaign.adventure_type,
        campaign.name,
        campaign.opening_hook,
        campaign.state_document,
        campaign.status,
        campaign.difficulty,
        campaign.mature_content ? 1 : 0,
        now,
        now,
        campaign.thumbnail_path,
      ]
    );
    return {
      ...campaign,
      id,
      created_at: now,
      last_played_at: now,
      session_count: 0,
    };
  }

  getById(id: string): Campaign | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM campaign WHERE id = ?',
      [id]
    );
    return row ? this.mapRow(row) : null;
  }

  getActive(playerId: string): Campaign[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      "SELECT * FROM campaign WHERE player_id = ? AND status = 'active' ORDER BY last_played_at DESC",
      [playerId]
    );
    return rows.map((r) => this.mapRow(r));
  }

  getByStatus(playerId: string, status: CampaignStatus): Campaign[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM campaign WHERE player_id = ? AND status = ? ORDER BY last_played_at DESC',
      [playerId, status]
    );
    return rows.map((r) => this.mapRow(r));
  }

  getActiveCount(playerId: string): number {
    const row = this.db.getFirstSync<{ count: number }>(
      "SELECT COUNT(*) as count FROM campaign WHERE player_id = ? AND status = 'active'",
      [playerId]
    );
    return row?.count ?? 0;
  }

  archive(id: string): void {
    this.db.runSync("UPDATE campaign SET status = 'archived' WHERE id = ?", [
      id,
    ]);
  }

  reactivate(id: string): void {
    this.db.runSync("UPDATE campaign SET status = 'active' WHERE id = ?", [id]);
  }

  complete(id: string): void {
    this.db.runSync("UPDATE campaign SET status = 'completed' WHERE id = ?", [
      id,
    ]);
  }

  updateStateDocument(id: string, stateDocument: StateDocument): void {
    this.db.runSync('UPDATE campaign SET state_document = ? WHERE id = ?', [
      JSON.stringify(stateDocument),
      id,
    ]);
  }

  updateThumbnail(id: string, thumbnailPath: string): void {
    this.db.runSync('UPDATE campaign SET thumbnail_path = ? WHERE id = ?', [
      thumbnailPath,
      id,
    ]);
  }

  touchLastPlayed(id: string): void {
    this.db.runSync('UPDATE campaign SET last_played_at = ? WHERE id = ?', [
      nowISO(),
      id,
    ]);
  }

  incrementSessionCount(id: string): void {
    this.db.runSync(
      'UPDATE campaign SET session_count = session_count + 1 WHERE id = ?',
      [id]
    );
  }

  delete(id: string): void {
    this.db.runSync('DELETE FROM campaign WHERE id = ?', [id]);
  }

  private mapRow(row: Record<string, unknown>): Campaign {
    return {
      id: row['id'] as string,
      player_id: row['player_id'] as string,
      session_code: row['session_code'] as string | null,
      world: row['world'] as Campaign['world'],
      adventure_type: row['adventure_type'] as Campaign['adventure_type'],
      name: row['name'] as string,
      opening_hook: row['opening_hook'] as string,
      state_document: row['state_document'] as string,
      status: row['status'] as Campaign['status'],
      difficulty: row['difficulty'] as Campaign['difficulty'],
      mature_content: (row['mature_content'] as number) === 1,
      session_count: row['session_count'] as number,
      created_at: row['created_at'] as string,
      last_played_at: row['last_played_at'] as string,
      thumbnail_path: row['thumbnail_path'] as string | null,
    };
  }
}
