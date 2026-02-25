// Entity types per data-model.md

export type CampaignStatus = 'active' | 'archived' | 'completed';
export type SubscriptionTier = 'free' | 'adventurer' | 'legendary';
export type Difficulty = 'beginner' | 'standard' | 'hardcore';
export type SceneTrigger =
  | 'campaign_start'
  | 'location_change'
  | 'encounter'
  | 'reveal'
  | 'cliffhanger';
export type ExchangeRole = 'player' | 'dm' | 'system';
export type NotificationCategory =
  | 'turn_reminder'
  | 'session_summary'
  | 'campaign_nudge'
  | 'story_continuation';
export type World = 'valdris';
export type AdventureType =
  | 'dungeon_crawl'
  | 'wilderness_exploration'
  | 'political_intrigue'
  | 'horror_survival';

export interface Player {
  id: string;
  display_name: string;
  subscription_tier: SubscriptionTier;
  mature_content_enabled: boolean;
  difficulty_preference: Difficulty;
  notification_preferences: Record<string, boolean>;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  player_id: string;
  session_code: string | null;
  world: World;
  adventure_type: AdventureType;
  name: string;
  opening_hook: string;
  state_document: string;
  status: CampaignStatus;
  difficulty: Difficulty;
  mature_content: boolean;
  session_count: number;
  created_at: string;
  last_played_at: string;
  thumbnail_path: string | null;
}

export interface Character {
  id: string;
  campaign_id: string;
  player_id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  hp_current: number;
  hp_max: number;
  stats: CharacterStats;
  inventory: InventoryItem[];
  saving_throws: Record<string, number>;
  skills: Record<string, number>;
  portrait_path: string | null;
  portrait_prompt: string;
  portrait_seed: number;
  backstory: string;
  backstory_summary: string;
  narrative_description: string;
  xp: number;
  created_at: string;
}

export interface CharacterStats {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

export interface InventoryItem {
  name: string;
  quantity: number;
  description?: string;
}

export interface Session {
  id: string;
  campaign_id: string;
  summary: string | null;
  summary_generated_at: string | null;
  started_at: string;
  ended_at: string | null;
  is_multiplayer: boolean;
}

export interface Exchange {
  id: string;
  session_id: string;
  campaign_id: string;
  role: ExchangeRole;
  content: string;
  metadata: string | null;
  sequence: number;
  created_at: string;
}

export interface SceneImage {
  id: string;
  campaign_id: string;
  session_id: string;
  image_path: string;
  prompt: string;
  trigger: SceneTrigger;
  created_at: string;
}

export interface NPC {
  id: string;
  campaign_id: string;
  name: string;
  description: string;
  trust: number;
  fear: number;
  anger: number;
  gratitude: number;
  last_interaction_summary: string;
  last_interaction_session_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationLog {
  id: string;
  campaign_id: string;
  category: NotificationCategory;
  sent_at: string;
  tapped_at: string | null;
}
