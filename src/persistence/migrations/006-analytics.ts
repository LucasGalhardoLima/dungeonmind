import type { SQLiteDatabase } from 'expo-sqlite';

export const migration006 = {
  version: 6,
  up(db: SQLiteDatabase): void {
    db.execSync(`
      CREATE TABLE IF NOT EXISTS analytics_event (
        id TEXT PRIMARY KEY NOT NULL,
        event_name TEXT NOT NULL,
        properties TEXT,
        created_at TEXT NOT NULL
      )
    `);

    db.execSync(
      'CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON analytics_event (event_name)',
    );

    db.execSync(
      'CREATE INDEX IF NOT EXISTS idx_analytics_event_created ON analytics_event (created_at)',
    );

    db.execSync(
      'ALTER TABLE player ADD COLUMN analytics_opt_out INTEGER NOT NULL DEFAULT 0',
    );
  },
};
