# Data Model: DungeonMind MVP

**Phase**: 1 — Design & Contracts
**Date**: 2026-02-23

## Overview

**Local (Expo SQLite)** is the source of truth for all game data. **Zustand** stores are runtime caches hydrated from SQLite on app launch. **Supabase PostgreSQL** handles multiplayer session sync only — data is scoped to active sessions and purged 24 hours after session end (NFR-012).

## Entity Relationship Diagram

```
Player (1) ──────────< Campaign (many)
                           │
                           ├──── (1:1) ──── Character
                           │
                           ├────< Session (many)
                           │        │
                           │        ├────< Exchange (many)
                           │        │
                           │        └────< SceneImage (many)
                           │
                           ├────< NPC (many)
                           │
                           └────< NotificationLog (many)

Supabase (multiplayer sync only):
  sessions (1) ────< session_players (many)
```

## Local Entities (SQLite)

### Player

The human user. One per device (no server-side account for solo play).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | Generated client-side |
| display_name | TEXT | NOT NULL | Player-chosen name |
| subscription_tier | TEXT | NOT NULL, DEFAULT 'free', CHECK IN (free, adventurer, legendary) | |
| mature_content_enabled | INTEGER | NOT NULL, DEFAULT 0 | Boolean (0/1) |
| difficulty_preference | TEXT | NOT NULL, DEFAULT 'standard', CHECK IN (beginner, standard, hardcore) | |
| notification_preferences | TEXT | NOT NULL, DEFAULT '{}' | JSON object |
| created_at | TEXT | NOT NULL, ISO 8601 | |
| updated_at | TEXT | NOT NULL, ISO 8601 | |

**Validation**: display_name must be 1-50 characters.

### Campaign

A specific story within a world + adventure type combination.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | |
| player_id | TEXT | FK → Player, NOT NULL | |
| session_code | TEXT | NULLABLE | Only set for multiplayer |
| world | TEXT | NOT NULL, DEFAULT 'valdris', CHECK IN (valdris) | MVP: only valdris. Post-MVP: ferrumclave, vazio_entre_estrelas, thalassar, cinzas_de_umbra, kenhado |
| adventure_type | TEXT | NOT NULL, CHECK IN (dungeon_crawl, wilderness_exploration, political_intrigue, horror_survival) | |
| name | TEXT | NOT NULL | AI-generated from opening hook |
| opening_hook | TEXT | NOT NULL | The selected 2-3 sentence hook |
| state_document | TEXT | NOT NULL, DEFAULT '{}' | JSON, max 4000 tokens |
| status | TEXT | NOT NULL, DEFAULT 'active', CHECK IN (active, archived, completed) | |
| difficulty | TEXT | NOT NULL, DEFAULT 'standard', CHECK IN (beginner, standard, hardcore) | |
| mature_content | INTEGER | NOT NULL, DEFAULT 0 | Boolean (0/1) |
| session_count | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | |
| created_at | TEXT | NOT NULL, ISO 8601 | |
| last_played_at | TEXT | NOT NULL, ISO 8601 | |
| thumbnail_path | TEXT | NULLABLE | Path to most recent scene image |

**State Transitions**:
- `active` → `archived` (player archives to free campaign slot)
- `active` → `completed` (character dies; campaign ends with epilogue)
- `archived` → `active` (player reactivates; only if slot available)

**Indexes**: player_id, status, (player_id, status), last_played_at, session_code

**Validation**: Free tier allows max 1 active campaign per player.

### Character

A player's in-game identity within a campaign. One character per campaign.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | |
| campaign_id | TEXT | FK → Campaign, UNIQUE, NOT NULL | One character per campaign |
| player_id | TEXT | NOT NULL | |
| name | TEXT | NOT NULL | Asked at end of creation |
| class | TEXT | NOT NULL | D&D 5e class |
| race | TEXT | NOT NULL | D&D 5e race |
| level | INTEGER | NOT NULL, DEFAULT 1, CHECK 1-20 | |
| hp_current | INTEGER | NOT NULL, CHECK >= 0 | |
| hp_max | INTEGER | NOT NULL, CHECK >= 1 | |
| stats | TEXT | NOT NULL | JSON: {str, dex, con, int, wis, cha} with values + modifiers |
| inventory | TEXT | NOT NULL, DEFAULT '[]' | JSON array of item objects |
| saving_throws | TEXT | NOT NULL | JSON object |
| skills | TEXT | NOT NULL | JSON object |
| portrait_path | TEXT | NULLABLE | Local file path to portrait image |
| portrait_prompt | TEXT | NOT NULL | Prompt used to generate portrait |
| portrait_seed | INTEGER | NOT NULL | Fixed seed for regeneration |
| backstory | TEXT | NOT NULL | Full backstory narrative |
| backstory_summary | TEXT | NOT NULL | Short version for State Document |
| narrative_description | TEXT | NOT NULL | Prose version for Narrative Mode |
| xp | INTEGER | NOT NULL, DEFAULT 0, CHECK >= 0 | |
| created_at | TEXT | NOT NULL, ISO 8601 | |

**Indexes**: campaign_id (UNIQUE), player_id

### Session

A single play period within a campaign.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | |
| campaign_id | TEXT | FK → Campaign, NOT NULL | |
| summary | TEXT | NULLABLE | AI-generated on session end |
| summary_generated_at | TEXT | NULLABLE, ISO 8601 | |
| started_at | TEXT | NOT NULL, ISO 8601 | When player enters campaign |
| ended_at | TEXT | NULLABLE, ISO 8601 | When player exits or app closes |
| is_multiplayer | INTEGER | NOT NULL, DEFAULT 0 | Boolean (0/1) |

**State Transitions**:
- Created (started_at set) → Active (ended_at NULL) → Ended (ended_at set) → Summarized (summary set)

**Indexes**: campaign_id, (campaign_id, ended_at), started_at

### Exchange

A single message in the conversation (player action, DM narration, or system event).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | |
| session_id | TEXT | FK → Session, NOT NULL | |
| campaign_id | TEXT | FK → Campaign, NOT NULL | Denormalized for efficient queries |
| role | TEXT | NOT NULL, CHECK IN (player, dm, system) | |
| content | TEXT | NOT NULL | The message text |
| metadata | TEXT | NULLABLE | JSON: dice_request, dice_result, scene_change, etc. |
| sequence | INTEGER | NOT NULL, CHECK >= 0 | Monotonic within session |
| created_at | TEXT | NOT NULL, ISO 8601 | |

**Unique Constraint**: (session_id, sequence)

**Metadata Examples**:
```json
// Dice request (system exchange)
{ "type": "dice_request", "dice_type": "d20", "context": "Arcana check", "dc": 15 }

// Dice result (system exchange)
{ "type": "dice_result", "dice_type": "d20", "result": 17, "is_critical": false }

// Scene change (dm exchange)
{ "type": "scene_change", "trigger": "location_change", "scene_prompt": { ... } }
```

**Indexes**: (session_id, sequence) UNIQUE, campaign_id, session_id, created_at

### SceneImage

A generated pixel art image tied to a specific moment.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | |
| campaign_id | TEXT | FK → Campaign, NOT NULL | |
| session_id | TEXT | FK → Session, NOT NULL | |
| image_path | TEXT | NOT NULL | Local file path |
| prompt | TEXT | NOT NULL | ScenePrompt JSON used to generate |
| trigger | TEXT | NOT NULL, CHECK IN (campaign_start, location_change, encounter, reveal, cliffhanger) | |
| created_at | TEXT | NOT NULL, ISO 8601 | |

**Indexes**: campaign_id, session_id, created_at

### NPC

A tracked non-player character with emotional state.

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | |
| campaign_id | TEXT | FK → Campaign, NOT NULL | |
| name | TEXT | NOT NULL | |
| description | TEXT | NOT NULL | Physical appearance + role |
| trust | INTEGER | NOT NULL, DEFAULT 50, CHECK 0-100 | |
| fear | INTEGER | NOT NULL, DEFAULT 0, CHECK 0-100 | |
| anger | INTEGER | NOT NULL, DEFAULT 0, CHECK 0-100 | |
| gratitude | INTEGER | NOT NULL, DEFAULT 0, CHECK 0-100 | |
| last_interaction_summary | TEXT | NOT NULL, DEFAULT '' | |
| last_interaction_session_id | TEXT | FK → Session, NULLABLE | |
| created_at | TEXT | NOT NULL, ISO 8601 | |
| updated_at | TEXT | NOT NULL, ISO 8601 | |

**Indexes**: campaign_id, (campaign_id, name)

**Notes**: NPC emotional states are never shown to the player (FR-011). They influence AI behavior through the State Document's npc_registry.

### NotificationLog

Tracks sent notifications for rate limiting (max 3 per day per campaign).

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | TEXT | PK, UUID | |
| campaign_id | TEXT | FK → Campaign, NOT NULL | |
| category | TEXT | NOT NULL, CHECK IN (turn_reminder, session_summary, campaign_nudge, story_continuation) | |
| sent_at | TEXT | NOT NULL, ISO 8601 | |
| tapped_at | TEXT | NULLABLE, ISO 8601 | |

**Indexes**: campaign_id, (category, sent_at), (campaign_id, category, sent_at)

## Supabase Tables (Multiplayer Sync Only)

### sessions

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| id | uuid | PK, DEFAULT gen_random_uuid() | |
| session_code | text | UNIQUE, NOT NULL | e.g., DRAGON-42 |
| world | text | NOT NULL | |
| adventure_type | text | NOT NULL | |
| state_document | jsonb | DEFAULT '{}' | Synced from host device |
| recent_history | jsonb | DEFAULT '[]' | Last 20 exchanges for reconnect |
| created_at | timestamptz | DEFAULT now() | |
| last_active_at | timestamptz | DEFAULT now() | |
| expires_at | timestamptz | NOT NULL | created_at + 24h |

### session_players

| Field | Type | Constraints | Notes |
|-------|------|-------------|-------|
| session_id | uuid | FK → sessions, NOT NULL | |
| player_id | uuid | NOT NULL | |
| character_data | jsonb | | Character snapshot for sync |
| portrait_url | text | NULLABLE | |
| is_connected | boolean | DEFAULT false | |
| last_seen_at | timestamptz | DEFAULT now() | |

**Primary Key**: (session_id, player_id)

## TypeScript Types

```typescript
// State Document — compressed campaign memory (max 4000 tokens)
type StateDocument = {
  active_characters: Array<{
    player_id: string;
    name: string;
    class: string;
    race: string;
    level: number;
    hp: { current: number; max: number };
    inventory: string[];
    portrait_prompt: string;
    backstory_summary: string;
  }>;
  session_events: Array<{ turn: number; summary: string }>;
  npc_registry: Array<{
    name: string;
    relationship: 'trusted' | 'neutral' | 'fearful' | 'hostile' | 'unknown';
    last_interaction: string;
  }>;
  active_quests: Array<{
    title: string;
    status: 'active' | 'completed' | 'failed';
    description: string;
    location: string;
  }>;
  world_state: {
    location: string;
    time_of_day: string;
    weather: string;
    active_threats: string[];
  };
  narrative_arc: {
    current_chapter: string;
    open_plot_threads: string[];
  };
};

// Scene generation prompt
type ScenePrompt = {
  setting: string;
  characters: string[];
  tone: 'tense' | 'triumphant' | 'ominous' | 'peaceful' | 'chaotic' | 'comedic';
  style_tokens: string[];
  negative_prompt: string;
};

// Multiplayer session events (discriminated union)
type SessionEvent =
  | { type: 'narration_chunk'; text: string; sequence: number }
  | { type: 'narration_complete'; full_text: string; sequence: number }
  | { type: 'dice_requested'; dice_type: DiceType; context: string; requesting_player: string }
  | { type: 'dice_rolling'; player_id: string; seed: number }
  | { type: 'dice_result'; player_id: string; result: number; dice_type: string }
  | { type: 'scene_generating' }
  | { type: 'scene_ready'; image_url: string; prompt: string }
  | { type: 'chat_message'; player_id: string; content: string; layer: ChatLayer }
  | { type: 'player_connected'; player_id: string }
  | { type: 'player_disconnected'; player_id: string }
  | { type: 'turn_change'; active_player_id: string };

type DiceType = 'd4' | 'd6' | 'd8' | 'd10' | 'd12' | 'd20';
type ChatLayer = 'in_character' | 'out_of_character';
type CampaignStatus = 'active' | 'archived' | 'completed';
type SubscriptionTier = 'free' | 'adventurer' | 'legendary';
type Difficulty = 'beginner' | 'standard' | 'hardcore';
type SceneTrigger = 'campaign_start' | 'location_change' | 'encounter' | 'reveal' | 'cliffhanger';
type ExchangeRole = 'player' | 'dm' | 'system';
type NotificationCategory = 'turn_reminder' | 'session_summary' | 'campaign_nudge' | 'story_continuation';
```

## Migration Strategy

- Migrations live in `src/persistence/migrations/` as numbered TypeScript files
- Each migration exports `version: number` and `up(db): void`
- A `schema_version` table tracks the current version
- On app launch, `database.ts` checks current version and runs pending migrations sequentially
- Migrations are synchronous (expo-sqlite v14 sync API)
- WAL mode is enabled for crash recovery

```typescript
// Migration runner pattern
function runMigrations(db: SQLiteDatabase): void {
  db.execSync('CREATE TABLE IF NOT EXISTS schema_version (version INTEGER)');
  const current = db.getFirstSync<{ version: number }>('SELECT version FROM schema_version');
  const currentVersion = current?.version ?? 0;
  for (const migration of migrations) {
    if (migration.version > currentVersion) {
      migration.up(db);
      db.runSync('INSERT OR REPLACE INTO schema_version VALUES (?)', [migration.version]);
    }
  }
}
```

## Data Flow Diagrams

### 1. Character Creation Flow

```
Player → AI asks narrative questions (5-8 exchanges)
  → Each answer saved as Exchange (role: player)
  → AI response saved as Exchange (role: dm)
  → After final exchange, AI derives: class, race, stats, backstory
  → Character record created in SQLite
  → Portrait prompt assembled from character data
  → Replicate API generates portrait image
  → Image saved to expo-file-system
  → portrait_path updated on Character record
  → Portrait reveal animation plays (min 2s, NFR-008)
  → Campaign status remains active, session continues
```

### 2. Narrative Exchange Flow

```
Player types action → DM Engine assembles prompt:
  [system_prompt + state_document + recent_20_exchanges + player_action]
  → LLM API call (streaming)
  → Parse response for:
    ├── dice_request? → Pause narration → Show dice → Player rolls
    │   → Physics simulation → Settle → Result
    │   → Send result back to LLM → Resume narration
    ├── scene_change? → Build ScenePrompt → Replicate API
    │   → Cache image → Fade in new scene
    └── plain narration → Stream token by token
  → Save exchanges to SQLite
  → Update Character stats/inventory if changed
  → Update/create NPC records if interacted
  → Update Campaign last_played_at + thumbnail_path
```

### 3. Multiplayer Sync Flow

```
Host creates session → Supabase Edge Function generates code
  → Host subscribes to Realtime channel
  → Joiner enters code → Subscribes to same channel
  → Both complete character creation
  → Gameplay loop:
    Active player takes action → Saved to local SQLite
    → Broadcast via Realtime: narration_chunk, dice_requested, etc.
    → Remote device receives events (sequence-ordered)
    → Remote saves to local SQLite
    → Both devices show same state
  → Periodically sync state_document to Supabase (for reconnect)
  → Session ends → 24h TTL → cleanup-expired cron deletes Supabase data
```

### 4. State Document Compression Flow

```
Trigger: session end OR exchange count > 30 OR token budget exceeded
  → Load current State Document from Campaign
  → Load raw exchanges since last compression
  → Load current NPC emotional states
  → Build compression prompt for LLM:
    "Merge new events into State Document. Update NPC registry,
     quest statuses, world state, narrative arc. Stay within 4000 tokens."
  → LLM returns updated State Document JSON
  → Validate: schema correct, <= 4000 tokens, no data loss for active entities
  → Save to Campaign.state_document in SQLite
  → If multiplayer: sync to Supabase sessions table
```
