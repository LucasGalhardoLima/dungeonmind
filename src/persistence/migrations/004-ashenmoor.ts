import type { SQLiteDatabase } from 'expo-sqlite';

export const migration004 = {
  version: 4,
  up(db: SQLiteDatabase): void {
    // SQLite does not support ALTER CHECK constraints directly.
    // Recreate the campaign table with the expanded world CHECK constraint.
    db.execSync(`
      CREATE TABLE campaign_new (
        id TEXT PRIMARY KEY NOT NULL,
        player_id TEXT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
        session_code TEXT,
        world TEXT NOT NULL DEFAULT 'valdris' CHECK (world IN ('valdris', 'ashenmoor')),
        adventure_type TEXT NOT NULL
          CHECK (adventure_type IN ('dungeon_crawl', 'wilderness_exploration', 'political_intrigue', 'horror_survival')),
        name TEXT NOT NULL,
        opening_hook TEXT NOT NULL,
        state_document TEXT NOT NULL DEFAULT '{}',
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'archived', 'completed')),
        difficulty TEXT NOT NULL DEFAULT 'standard'
          CHECK (difficulty IN ('beginner', 'standard', 'hardcore')),
        mature_content INTEGER NOT NULL DEFAULT 0,
        session_count INTEGER NOT NULL DEFAULT 0 CHECK (session_count >= 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        last_played_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        thumbnail_path TEXT
      )
    `);

    db.execSync(`
      INSERT INTO campaign_new
        SELECT id, player_id, session_code, world, adventure_type, name,
               opening_hook, state_document, status, difficulty,
               mature_content, session_count, created_at, last_played_at, thumbnail_path
        FROM campaign
    `);

    db.execSync('DROP TABLE campaign');
    db.execSync('ALTER TABLE campaign_new RENAME TO campaign');

    // Re-create indexes
    db.execSync('CREATE INDEX idx_campaign_player ON campaign(player_id)');
    db.execSync('CREATE INDEX idx_campaign_status ON campaign(status)');
    db.execSync('CREATE INDEX idx_campaign_player_status ON campaign(player_id, status)');
  },
};
