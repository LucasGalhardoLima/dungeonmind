import type { ScenePrompt, SceneTone } from '../types/scene-prompt';
import type { Character, Campaign, NPC } from '../types/entities';
import type { StateDocument } from '../types/state-document';
import { DEFAULT_NEGATIVE_PROMPT, VALDRIS_STYLE_TOKENS } from '../types/scene-prompt';

type SceneTrigger =
  | 'campaign_start'
  | 'location_change'
  | 'encounter'
  | 'reveal'
  | 'cliffhanger';

export interface AssembleSceneParams {
  campaign: Campaign;
  character: Character | null;
  stateDocument: StateDocument;
  npcsInScene: NPC[];
  narrativeContext: string;
  trigger: SceneTrigger;
}

const CHAOTIC_KEYWORDS = /combat|luta|batalha|espada|ataque/i;
const OMINOUS_KEYWORDS = /medo|horror|sombr|escur|terror/i;
const TRIUMPHANT_KEYWORDS = /vitória|triunfo|celebra/i;
const COMEDIC_KEYWORDS = /humor|riso|taverna|festa/i;

/**
 * Infer the scene tone from the trigger type and narrative context.
 * Exported separately for testing.
 */
export function inferTone(trigger: string, narrativeContext: string): SceneTone {
  switch (trigger) {
    case 'encounter':
      return 'tense';
    case 'reveal':
      return 'ominous';
    case 'cliffhanger':
      return 'tense';
    case 'campaign_start':
      return 'peaceful';
    case 'location_change': {
      if (CHAOTIC_KEYWORDS.test(narrativeContext)) return 'chaotic';
      if (OMINOUS_KEYWORDS.test(narrativeContext)) return 'ominous';
      if (TRIUMPHANT_KEYWORDS.test(narrativeContext)) return 'triumphant';
      if (COMEDIC_KEYWORDS.test(narrativeContext)) return 'comedic';
      return 'peaceful';
    }
    default:
      return 'peaceful';
  }
}

/**
 * Build the setting string from world state fields, skipping empty parts.
 */
function buildSetting(worldState: StateDocument['world_state']): string {
  const parts: string[] = [
    worldState.location,
    worldState.time_of_day,
    worldState.weather,
  ].filter((part) => part.length > 0);

  return parts.join(', ');
}

/**
 * Build the list of character visual descriptions for the scene prompt.
 */
function buildCharacters(
  character: Character | null,
  npcsInScene: NPC[],
): string[] {
  const descriptions: string[] = [];

  if (character) {
    if (character.narrative_description.length > 0) {
      descriptions.push(character.narrative_description);
    } else {
      descriptions.push(`${character.race} ${character.class}`);
    }
  }

  for (const npc of npcsInScene) {
    if (npc.description.length > 0) {
      descriptions.push(`${npc.name} (${npc.description})`);
    } else {
      descriptions.push(npc.name);
    }
  }

  return descriptions;
}

/**
 * Assemble a full ScenePrompt from the current game context.
 * Used by the scene painter pipeline to generate scene images.
 */
export function assembleScenePrompt(params: AssembleSceneParams): ScenePrompt {
  const {
    character,
    stateDocument,
    npcsInScene,
    narrativeContext,
    trigger,
  } = params;

  return {
    setting: buildSetting(stateDocument.world_state),
    characters: buildCharacters(character, npcsInScene),
    tone: inferTone(trigger, narrativeContext),
    style_tokens: [...VALDRIS_STYLE_TOKENS],
    negative_prompt: DEFAULT_NEGATIVE_PROMPT,
  };
}
