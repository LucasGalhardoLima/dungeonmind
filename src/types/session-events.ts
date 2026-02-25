// Session event types per contracts/multiplayer.md and contracts/dm-engine.md

import type { DiceType } from './dice';
import type { ScenePrompt } from './scene-prompt';
import type { SceneTrigger } from './entities';

export type ChatLayer = 'in_character' | 'out_of_character';

export type SessionEvent =
  | NarrationChunkEvent
  | NarrationCompleteEvent
  | DiceRequestedEvent
  | DiceRollingEvent
  | DiceResultEvent
  | SceneGeneratingEvent
  | SceneReadyEvent
  | ChatMessageEvent
  | PlayerConnectedEvent
  | PlayerDisconnectedEvent
  | TurnChangeEvent;

interface NarrationChunkEvent {
  type: 'narration_chunk';
  text: string;
  sequence: number;
}

interface NarrationCompleteEvent {
  type: 'narration_complete';
  full_text: string;
  sequence: number;
}

interface DiceRequestedEvent {
  type: 'dice_requested';
  dice_type: DiceType;
  context: string;
  requesting_player: string;
  sequence: number;
}

interface DiceRollingEvent {
  type: 'dice_rolling';
  player_id: string;
  seed: number;
  sequence: number;
}

interface DiceResultEvent {
  type: 'dice_result';
  player_id: string;
  result: number;
  dice_type: string;
  sequence: number;
}

interface SceneGeneratingEvent {
  type: 'scene_generating';
  sequence: number;
}

interface SceneReadyEvent {
  type: 'scene_ready';
  image_url: string;
  prompt: string;
  sequence: number;
}

interface ChatMessageEvent {
  type: 'chat_message';
  player_id: string;
  content: string;
  layer: ChatLayer;
  sequence: number;
}

interface PlayerConnectedEvent {
  type: 'player_connected';
  player_id: string;
  sequence: number;
}

interface PlayerDisconnectedEvent {
  type: 'player_disconnected';
  player_id: string;
  sequence: number;
}

interface TurnChangeEvent {
  type: 'turn_change';
  active_player_id: string;
  sequence: number;
}

// DM Engine response parsing types per contracts/dm-engine.md
export interface NarrativeError {
  narrative: string;
  technical: string;
  retryable: boolean;
}

export interface ParsedResponse {
  narration: string;
  dice_request?: {
    dice_type: DiceType;
    context: string;
    skill?: string;
  };
  scene_change?: {
    trigger: SceneTrigger;
    scene_prompt: ScenePrompt;
  };
  suggested_actions?: string[];
  character_updates?: {
    hp_delta?: number;
    xp_delta?: number;
    inventory_add?: string[];
    inventory_remove?: string[];
  };
  npc_updates?: Array<{
    name: string;
    relationship_change?: string;
    trust_delta?: number;
    fear_delta?: number;
    anger_delta?: number;
    gratitude_delta?: number;
  }>;
}
