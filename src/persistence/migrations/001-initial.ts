import type { SQLiteDatabase } from 'expo-sqlite';

export const migration001 = {
  version: 1,
  up(db: SQLiteDatabase): void {
    db.execSync(`
      CREATE TABLE player (
        id TEXT PRIMARY KEY NOT NULL,
        display_name TEXT NOT NULL,
        subscription_tier TEXT NOT NULL DEFAULT 'free'
          CHECK (subscription_tier IN ('free', 'adventurer', 'legendary')),
        mature_content_enabled INTEGER NOT NULL DEFAULT 0,
        difficulty_preference TEXT NOT NULL DEFAULT 'standard'
          CHECK (difficulty_preference IN ('beginner', 'standard', 'hardcore')),
        notification_preferences TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);

    db.execSync(`
      CREATE TABLE campaign (
        id TEXT PRIMARY KEY NOT NULL,
        player_id TEXT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
        session_code TEXT,
        world TEXT NOT NULL DEFAULT 'valdris' CHECK (world IN ('valdris')),
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

    db.execSync(
      'CREATE INDEX idx_campaign_player ON campaign(player_id)'
    );
    db.execSync(
      'CREATE INDEX idx_campaign_status ON campaign(status)'
    );
    db.execSync(
      'CREATE INDEX idx_campaign_player_status ON campaign(player_id, status)'
    );

    db.execSync(`
      CREATE TABLE character (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL UNIQUE REFERENCES campaign(id) ON DELETE CASCADE,
        player_id TEXT NOT NULL,
        name TEXT NOT NULL,
        class TEXT NOT NULL,
        race TEXT NOT NULL,
        level INTEGER NOT NULL DEFAULT 1 CHECK (level >= 1 AND level <= 20),
        hp_current INTEGER NOT NULL CHECK (hp_current >= 0),
        hp_max INTEGER NOT NULL CHECK (hp_max >= 1),
        stats TEXT NOT NULL,
        inventory TEXT NOT NULL DEFAULT '[]',
        saving_throws TEXT NOT NULL,
        skills TEXT NOT NULL,
        portrait_path TEXT,
        portrait_prompt TEXT NOT NULL,
        portrait_seed INTEGER NOT NULL,
        backstory TEXT NOT NULL,
        backstory_summary TEXT NOT NULL,
        narrative_description TEXT NOT NULL,
        xp INTEGER NOT NULL DEFAULT 0 CHECK (xp >= 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);

    db.execSync(`
      CREATE TABLE session (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        summary TEXT,
        summary_generated_at TEXT,
        started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        ended_at TEXT,
        is_multiplayer INTEGER NOT NULL DEFAULT 0
      )
    `);

    db.execSync(
      'CREATE INDEX idx_session_campaign ON session(campaign_id)'
    );

    db.execSync(`
      CREATE TABLE exchange (
        id TEXT PRIMARY KEY NOT NULL,
        session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        role TEXT NOT NULL CHECK (role IN ('player', 'dm', 'system')),
        content TEXT NOT NULL,
        metadata TEXT,
        sequence INTEGER NOT NULL CHECK (sequence >= 0),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        UNIQUE(session_id, sequence)
      )
    `);

    db.execSync(
      'CREATE INDEX idx_exchange_campaign ON exchange(campaign_id)'
    );
    db.execSync(
      'CREATE INDEX idx_exchange_session ON exchange(session_id)'
    );

    db.execSync(`
      CREATE TABLE scene_image (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
        image_path TEXT NOT NULL,
        prompt TEXT NOT NULL,
        trigger_type TEXT NOT NULL
          CHECK (trigger_type IN ('campaign_start', 'location_change', 'encounter', 'reveal', 'cliffhanger')),
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);

    db.execSync(
      'CREATE INDEX idx_scene_image_campaign ON scene_image(campaign_id)'
    );

    db.execSync(`
      CREATE TABLE npc (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        trust INTEGER NOT NULL DEFAULT 50 CHECK (trust >= 0 AND trust <= 100),
        fear INTEGER NOT NULL DEFAULT 0 CHECK (fear >= 0 AND fear <= 100),
        anger INTEGER NOT NULL DEFAULT 0 CHECK (anger >= 0 AND anger <= 100),
        gratitude INTEGER NOT NULL DEFAULT 0 CHECK (gratitude >= 0 AND gratitude <= 100),
        last_interaction_summary TEXT NOT NULL DEFAULT '',
        last_interaction_session_id TEXT REFERENCES session(id) ON DELETE SET NULL,
        created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
      )
    `);

    db.execSync(
      'CREATE INDEX idx_npc_campaign ON npc(campaign_id)'
    );

    db.execSync(`
      CREATE TABLE notification_log (
        id TEXT PRIMARY KEY NOT NULL,
        campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
        category TEXT NOT NULL
          CHECK (category IN ('turn_reminder', 'session_summary', 'campaign_nudge', 'story_continuation')),
        sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
        tapped_at TEXT
      )
    `);

    db.execSync(
      'CREATE INDEX idx_notification_campaign ON notification_log(campaign_id)'
    );
    db.execSync(
      'CREATE INDEX idx_notification_campaign_cat ON notification_log(campaign_id, category, sent_at)'
    );
  },
};
