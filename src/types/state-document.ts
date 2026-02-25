// State Document type per data-model.md — compressed campaign memory (max 4000 tokens)

export interface StateDocument {
  active_characters: StateCharacter[];
  session_events: StateEvent[];
  npc_registry: StateNPC[];
  active_quests: StateQuest[];
  world_state: WorldState;
  narrative_arc: NarrativeArc;
}

export interface StateCharacter {
  player_id: string;
  name: string;
  class: string;
  race: string;
  level: number;
  hp: { current: number; max: number };
  inventory: string[];
  portrait_prompt: string;
  backstory_summary: string;
}

export interface StateEvent {
  turn: number;
  summary: string;
}

export type NPCRelationship =
  | 'trusted'
  | 'neutral'
  | 'fearful'
  | 'hostile'
  | 'unknown';

export interface StateNPC {
  name: string;
  relationship: NPCRelationship;
  last_interaction: string;
}

export type QuestStatus = 'active' | 'completed' | 'failed';

export interface StateQuest {
  title: string;
  status: QuestStatus;
  description: string;
  location: string;
}

export interface WorldState {
  location: string;
  time_of_day: string;
  weather: string;
  active_threats: string[];
}

export interface NarrativeArc {
  current_chapter: string;
  open_plot_threads: string[];
}

export const EMPTY_STATE_DOCUMENT: StateDocument = {
  active_characters: [],
  session_events: [],
  npc_registry: [],
  active_quests: [],
  world_state: {
    location: '',
    time_of_day: '',
    weather: '',
    active_threats: [],
  },
  narrative_arc: {
    current_chapter: '',
    open_plot_threads: [],
  },
};

export const STATE_DOCUMENT_MAX_TOKENS = 4000;
