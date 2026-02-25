import type { SQLiteDatabase } from 'expo-sqlite';
import type { SceneImage } from '../../types/entities';
import { generateId } from '../database';

export class SceneImageRepository {
  constructor(private db: SQLiteDatabase) {}

  create(image: Omit<SceneImage, 'id' | 'created_at'>): SceneImage {
    const id = generateId();
    this.db.runSync(
      `INSERT INTO scene_image (id, campaign_id, session_id, image_path, prompt, trigger_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, image.campaign_id, image.session_id, image.image_path, image.prompt, image.trigger]
    );
    const row = this.db.getFirstSync<Record<string, unknown>>('SELECT * FROM scene_image WHERE id = ?', [id]);
    return this.mapRow(row!);
  }

  getById(id: string): SceneImage | null {
    const row = this.db.getFirstSync<Record<string, unknown>>('SELECT * FROM scene_image WHERE id = ?', [id]);
    return row ? this.mapRow(row) : null;
  }

  getByCampaignId(campaignId: string): SceneImage[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM scene_image WHERE campaign_id = ? ORDER BY created_at DESC', [campaignId]
    );
    return rows.map(r => this.mapRow(r));
  }

  getBySessionId(sessionId: string): SceneImage[] {
    const rows = this.db.getAllSync<Record<string, unknown>>(
      'SELECT * FROM scene_image WHERE session_id = ? ORDER BY created_at ASC', [sessionId]
    );
    return rows.map(r => this.mapRow(r));
  }

  getLatest(campaignId: string): SceneImage | null {
    const row = this.db.getFirstSync<Record<string, unknown>>(
      'SELECT * FROM scene_image WHERE campaign_id = ? ORDER BY created_at DESC LIMIT 1', [campaignId]
    );
    return row ? this.mapRow(row) : null;
  }

  delete(id: string): void {
    this.db.runSync('DELETE FROM scene_image WHERE id = ?', [id]);
  }

  private mapRow(row: Record<string, unknown>): SceneImage {
    return {
      id: row['id'] as string,
      campaign_id: row['campaign_id'] as string,
      session_id: row['session_id'] as string,
      image_path: row['image_path'] as string,
      prompt: row['prompt'] as string,
      trigger: row['trigger_type'] as SceneImage['trigger'],
      created_at: row['created_at'] as string,
    };
  }
}
