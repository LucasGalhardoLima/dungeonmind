# Contract: Persistence Layer

## Repository Interfaces

```typescript
// Base repository pattern
interface Repository<T> {
  create(entity: Omit<T, 'id' | 'created_at'>): T;
  getById(id: string): T | null;
  update(id: string, fields: Partial<T>): void;
  delete(id: string): void;
}
```

### CampaignRepository

```typescript
interface CampaignRepository extends Repository<Campaign> {
  getActive(playerId: string): Campaign[];
  getByStatus(playerId: string, status: CampaignStatus): Campaign[];
  getActiveCount(playerId: string): number;
  archive(id: string): void;
  reactivate(id: string): void;
  complete(id: string): void;     // Character death → campaign completed
  updateStateDocument(id: string, stateDocument: StateDocument): void;
  updateThumbnail(id: string, thumbnailPath: string): void;
  touchLastPlayed(id: string): void;
  incrementSessionCount(id: string): void;
}
```

### CharacterRepository

```typescript
interface CharacterRepository extends Repository<Character> {
  getByCampaignId(campaignId: string): Character | null;
  updateStats(id: string, stats: CharacterStats): void;
  updateInventory(id: string, inventory: InventoryItem[]): void;
  updateHP(id: string, current: number, max: number): void;
  addXP(id: string, amount: number): void;
  levelUp(id: string, newLevel: number, newStats: CharacterStats): void;
  updatePortrait(id: string, portraitPath: string): void;
}
```

### SessionRepository

```typescript
interface SessionRepository extends Repository<Session> {
  getByCampaignId(campaignId: string): Session[];
  getLatest(campaignId: string): Session | null;
  getActive(campaignId: string): Session | null;  // ended_at IS NULL
  endSession(id: string): void;                     // Sets ended_at
  updateSummary(id: string, summary: string): void;
  getWithSummaries(campaignId: string): Session[];   // Only sessions with summaries
}
```

### ExchangeRepository

```typescript
interface ExchangeRepository extends Repository<Exchange> {
  getBySessionId(sessionId: string, limit?: number, offset?: number): Exchange[];
  getRecent(campaignId: string, limit?: number): Exchange[];  // Default limit: 20
  getCount(sessionId: string): number;
  getNextSequence(sessionId: string): number;
  getByCampaignSinceSession(campaignId: string, sinceSessionId: string): Exchange[];
}
```

### SceneImageRepository

```typescript
interface SceneImageRepository extends Repository<SceneImage> {
  getByCampaignId(campaignId: string): SceneImage[];
  getBySessionId(sessionId: string): SceneImage[];
  getLatest(campaignId: string): SceneImage | null;
}
```

### NPCRepository

```typescript
interface NPCRepository {
  create(npc: Omit<NPC, 'id' | 'created_at' | 'updated_at'>): NPC;
  getByCampaignId(campaignId: string): NPC[];
  getByName(campaignId: string, name: string): NPC | null;
  updateEmotionalState(id: string, deltas: {
    trust?: number; fear?: number; anger?: number; gratitude?: number;
  }): void;
  updateInteraction(id: string, sessionId: string, summary: string): void;
}
```

### NotificationLogRepository

```typescript
interface NotificationLogRepository {
  log(campaignId: string, category: NotificationCategory): void;
  getCountToday(campaignId: string): number;
  getLastByCategory(campaignId: string, category: NotificationCategory): NotificationLog | null;
  markTapped(id: string): void;
}
```

## SQLite Schema (Initial Migration)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

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
);

CREATE TABLE campaign (
  id TEXT PRIMARY KEY NOT NULL,
  player_id TEXT NOT NULL REFERENCES player(id) ON DELETE CASCADE,
  session_code TEXT,
  world TEXT NOT NULL DEFAULT 'valdris' CHECK (world IN ('valdris')),
  adventure_type TEXT NOT NULL CHECK (adventure_type IN ('dungeon_crawl', 'wilderness_exploration', 'political_intrigue', 'horror_survival')),
  name TEXT NOT NULL,
  opening_hook TEXT NOT NULL,
  state_document TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'completed')),
  difficulty TEXT NOT NULL DEFAULT 'standard' CHECK (difficulty IN ('beginner', 'standard', 'hardcore')),
  mature_content INTEGER NOT NULL DEFAULT 0,
  session_count INTEGER NOT NULL DEFAULT 0 CHECK (session_count >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_played_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  thumbnail_path TEXT
);

CREATE INDEX idx_campaign_player ON campaign(player_id);
CREATE INDEX idx_campaign_status ON campaign(status);
CREATE INDEX idx_campaign_player_status ON campaign(player_id, status);

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
);

CREATE TABLE session (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
  summary TEXT,
  summary_generated_at TEXT,
  started_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  ended_at TEXT,
  is_multiplayer INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_session_campaign ON session(campaign_id);

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
);

CREATE INDEX idx_exchange_campaign ON exchange(campaign_id);
CREATE INDEX idx_exchange_session ON exchange(session_id);

CREATE TABLE scene_image (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL REFERENCES session(id) ON DELETE CASCADE,
  image_path TEXT NOT NULL,
  prompt TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('campaign_start', 'location_change', 'encounter', 'reveal', 'cliffhanger')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX idx_scene_image_campaign ON scene_image(campaign_id);

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
);

CREATE INDEX idx_npc_campaign ON npc(campaign_id);

CREATE TABLE notification_log (
  id TEXT PRIMARY KEY NOT NULL,
  campaign_id TEXT NOT NULL REFERENCES campaign(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('turn_reminder', 'session_summary', 'campaign_nudge', 'story_continuation')),
  sent_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  tapped_at TEXT
);

CREATE INDEX idx_notification_campaign ON notification_log(campaign_id);
CREATE INDEX idx_notification_campaign_cat ON notification_log(campaign_id, category, sent_at);
```

## Zustand Store Hydration

On app launch:
1. Open SQLite database, run pending migrations
2. Load player record → `settingsStore`
3. Load active campaigns → `campaignStore`
4. If resuming a campaign: load character, recent exchanges → `sessionStore`

On mutations: write-through to SQLite first, then update Zustand store.
