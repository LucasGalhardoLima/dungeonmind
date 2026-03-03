import type { SQLiteDatabase } from 'expo-sqlite';

export const migration002 = {
  version: 2,
  up(db: SQLiteDatabase): void {
    // --- New columns on character ---
    db.execSync(`ALTER TABLE character ADD COLUMN armor_class INTEGER NOT NULL DEFAULT 10`);
    db.execSync(`ALTER TABLE character ADD COLUMN gold REAL NOT NULL DEFAULT 0`);
    db.execSync(`ALTER TABLE character ADD COLUMN hit_dice_total INTEGER NOT NULL DEFAULT 1`);
    db.execSync(`ALTER TABLE character ADD COLUMN hit_dice_spent INTEGER NOT NULL DEFAULT 0`);
    db.execSync(`ALTER TABLE character ADD COLUMN class_abilities TEXT NOT NULL DEFAULT '[]'`);
    db.execSync(`ALTER TABLE character ADD COLUMN spell_slots TEXT`);
    db.execSync(`ALTER TABLE character ADD COLUMN cantrips TEXT NOT NULL DEFAULT '[]'`);
    db.execSync(`ALTER TABLE character ADD COLUMN known_spells TEXT NOT NULL DEFAULT '[]'`);
    db.execSync(`ALTER TABLE character ADD COLUMN concentrating_on TEXT`);

    // --- Quest log (permanent ledger) ---
    db.execSync(`
      CREATE TABLE quest_log (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active'
          CHECK (status IN ('active', 'completed', 'failed')),
        giver_npc_id TEXT REFERENCES npc(id) ON DELETE SET NULL,
        created_session_id TEXT REFERENCES session(id) ON DELETE SET NULL,
        completed_session_id TEXT REFERENCES session(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
    db.execSync('CREATE INDEX idx_quest_log_campaign ON quest_log(campaign_id)');
    db.execSync('CREATE INDEX idx_quest_log_status ON quest_log(campaign_id, status)');

    // --- Quest events ---
    db.execSync(`
      CREATE TABLE quest_event (
        id TEXT PRIMARY KEY NOT NULL,
        quest_id TEXT NOT NULL REFERENCES quest_log(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        sequence INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
    db.execSync('CREATE INDEX idx_quest_event_quest ON quest_event(quest_id)');

    // --- NPC interaction history ---
    db.execSync(`
      CREATE TABLE npc_interaction (
        id TEXT PRIMARY KEY NOT NULL,
        npc_id TEXT NOT NULL REFERENCES npc(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
        summary TEXT NOT NULL,
        emotional_snapshot TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
    db.execSync('CREATE INDEX idx_npc_interaction_npc ON npc_interaction(npc_id)');

    // --- Player decisions (permanent ledger) ---
    db.execSync(`
      CREATE TABLE player_decision (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
        description TEXT NOT NULL,
        consequence TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
    db.execSync('CREATE INDEX idx_player_decision_campaign ON player_decision(campaign_id)');

    // --- Session recap ---
    db.execSync(`
      CREATE TABLE session_recap (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL UNIQUE REFERENCES session(id) ON DELETE CASCADE,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        recap_text TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);
    db.execSync('CREATE INDEX idx_session_recap_campaign ON session_recap(campaign_id)');
  },
};
