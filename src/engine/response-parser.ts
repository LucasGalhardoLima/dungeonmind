// Response parser for DM Engine per contracts/dm-engine.md
// Extracts structured data from [DM_DATA]...[/DM_DATA] blocks in AI responses.

import type { ParsedResponse } from '../types/session-events';
import type { DiceType } from '../types/dice';
import type { SceneTrigger } from '../types/entities';
import type { ScenePrompt, SceneTone } from '../types/scene-prompt';

const DM_DATA_OPEN = '[DM_DATA]';
const DM_DATA_CLOSE = '[/DM_DATA]';

const METADATA_TAGS = [
  { open: '[DM_DATA]', close: '[/DM_DATA]' },
  { open: '[CHAR_DATA]', close: '[/CHAR_DATA]' },
  { open: '[DIFFICULTY]', close: '[/DIFFICULTY]' },
];

/**
 * Strip metadata blocks from streaming text for display purposes.
 *
 * Handles three states:
 * 1. Complete blocks (e.g. `[DM_DATA]....[/DM_DATA]`) — removed entirely
 * 2. Opened-but-unclosed blocks (e.g. `[DM_DATA]some json...`) — tag and content removed
 * 3. Partial opening tags at the end of stream (e.g. `text[DM_DA`) — partial tag trimmed
 */
export function stripMetadataForDisplay(text: string): string {
  let result = text;

  for (const tag of METADATA_TAGS) {
    // 1. Remove complete blocks
    let openIdx = result.indexOf(tag.open);
    while (openIdx !== -1) {
      const closeIdx = result.indexOf(tag.close, openIdx);
      if (closeIdx !== -1) {
        // Complete block — remove it
        result = result.slice(0, openIdx) + result.slice(closeIdx + tag.close.length);
        openIdx = result.indexOf(tag.open);
      } else {
        // 2. Opened but unclosed — remove from open tag to end
        result = result.slice(0, openIdx);
        break;
      }
    }

    // 3. Check for partial opening tags at end of text (e.g. `[DM_DA`)
    for (let len = tag.open.length - 1; len >= 1; len--) {
      const partial = tag.open.slice(0, len);
      if (result.endsWith(partial)) {
        result = result.slice(0, -len);
        break;
      }
    }
  }

  // Strip trailing triple backticks (AI sometimes wraps DM_DATA in a code block)
  result = result.replace(/```\s*$/g, '');

  return result.trimEnd();
}

/**
 * Parse a full AI response to extract narration text and structured data.
 *
 * The AI embeds structured data in a `[DM_DATA]...[/DM_DATA]` block at the
 * end of its response. Everything before that tag is treated as narrative text.
 * If no data block is present, the entire response is returned as narration.
 */
export function parseResponse(fullText: string): ParsedResponse {
  const openIdx = fullText.indexOf(DM_DATA_OPEN);

  // No structured data block — return the full text as narration
  if (openIdx === -1) {
    return { narration: fullText.trim() };
  }

  const narration = fullText.slice(0, openIdx).replace(/```\s*$/g, '').trim();
  const closeIdx = fullText.indexOf(DM_DATA_CLOSE, openIdx);

  // Opening tag found but no closing tag — treat the rest as malformed, return narration only
  if (closeIdx === -1) {
    return { narration };
  }

  const jsonStr = fullText.slice(openIdx + DM_DATA_OPEN.length, closeIdx).trim();

  let raw: RawDMData;
  try {
    raw = JSON.parse(jsonStr) as RawDMData;
  } catch {
    // Malformed JSON — return narration without structured data
    return { narration };
  }

  const result: ParsedResponse = { narration };

  if (raw.dice_request && isValidDiceRequest(raw.dice_request)) {
    result.dice_request = {
      dice_type: raw.dice_request.dice_type,
      context: raw.dice_request.context,
      ...(raw.dice_request.skill ? { skill: raw.dice_request.skill } : {}),
    };
  }

  if (raw.scene_change && isValidSceneChange(raw.scene_change)) {
    result.scene_change = {
      trigger: raw.scene_change.trigger,
      scene_prompt: raw.scene_change.scene_prompt,
    };
  }

  if (
    raw.suggested_actions &&
    Array.isArray(raw.suggested_actions) &&
    raw.suggested_actions.every((a): a is string => typeof a === 'string')
  ) {
    result.suggested_actions = raw.suggested_actions;
  }

  if (raw.character_updates && isValidCharacterUpdates(raw.character_updates)) {
    result.character_updates = buildCharacterUpdates(raw.character_updates);
  }

  if (raw.npc_updates && Array.isArray(raw.npc_updates)) {
    const validNpcs = raw.npc_updates
      .filter((npc): npc is RawNpcUpdate => typeof npc?.name === 'string')
      .map((npc) => ({
        name: npc.name,
        ...(typeof npc.relationship_change === 'string'
          ? { relationship_change: npc.relationship_change }
          : {}),
        ...(typeof npc.trust_delta === 'number' ? { trust_delta: npc.trust_delta } : {}),
        ...(typeof npc.fear_delta === 'number' ? { fear_delta: npc.fear_delta } : {}),
        ...(typeof npc.anger_delta === 'number' ? { anger_delta: npc.anger_delta } : {}),
        ...(typeof npc.gratitude_delta === 'number'
          ? { gratitude_delta: npc.gratitude_delta }
          : {}),
      }));

    if (validNpcs.length > 0) {
      result.npc_updates = validNpcs;
    }
  }

  // Parse rest
  if (raw.rest?.type === 'short' || raw.rest?.type === 'long') {
    result.rest = { type: raw.rest.type };
  }

  // Parse spell cast
  if (raw.spell_cast && typeof raw.spell_cast.name === 'string' && typeof raw.spell_cast.slot_level === 'number') {
    result.spell_cast = {
      name: raw.spell_cast.name,
      slot_level: raw.spell_cast.slot_level,
    };
  }

  // Parse quest update
  if (raw.quest_update && typeof raw.quest_update.title === 'string') {
    const validActions = new Set(['add', 'complete', 'fail', 'progress']);
    const action = typeof raw.quest_update.action === 'string' && validActions.has(raw.quest_update.action)
      ? raw.quest_update.action as 'add' | 'complete' | 'fail' | 'progress'
      : 'add';
    result.quest_update = {
      action,
      title: raw.quest_update.title,
      ...(typeof raw.quest_update.description === 'string' ? { description: raw.quest_update.description } : {}),
      ...(typeof raw.quest_update.giver_npc === 'string' ? { giver_npc: raw.quest_update.giver_npc } : {}),
    };
  }

  // Parse gold delta
  if (typeof raw.gold_delta === 'number') {
    result.gold_delta = raw.gold_delta;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Internal raw types for the unvalidated JSON structure
// ---------------------------------------------------------------------------

const VALID_DICE_TYPES: ReadonlySet<string> = new Set<DiceType>([
  'd4',
  'd6',
  'd8',
  'd10',
  'd12',
  'd20',
]);

const VALID_SCENE_TRIGGERS: ReadonlySet<string> = new Set<SceneTrigger>([
  'campaign_start',
  'location_change',
  'encounter',
  'reveal',
  'cliffhanger',
]);

const VALID_SCENE_TONES: ReadonlySet<string> = new Set<SceneTone>([
  'tense',
  'triumphant',
  'ominous',
  'peaceful',
  'chaotic',
  'comedic',
]);

interface RawDMData {
  dice_request?: {
    dice_type?: string;
    context?: string;
    skill?: string;
  };
  scene_change?: {
    trigger?: string;
    scene_prompt?: {
      setting?: string;
      characters?: unknown[];
      tone?: string;
      style_tokens?: unknown[];
      negative_prompt?: string;
    };
  };
  suggested_actions?: unknown[];
  character_updates?: {
    hp_delta?: unknown;
    xp_delta?: unknown;
    inventory_add?: unknown[];
    inventory_remove?: unknown[];
  };
  npc_updates?: RawNpcUpdate[];
  rest?: {
    type?: string;
  };
  spell_cast?: {
    name?: string;
    slot_level?: unknown;
  };
  quest_update?: {
    action?: string;
    title?: string;
    description?: string;
    giver_npc?: string;
  };
  gold_delta?: unknown;
}

interface RawNpcUpdate {
  name: string;
  relationship_change?: string;
  trust_delta?: number;
  fear_delta?: number;
  anger_delta?: number;
  gratitude_delta?: number;
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function isValidDiceRequest(
  req: NonNullable<RawDMData['dice_request']>,
): req is { dice_type: DiceType; context: string; skill?: string } {
  return (
    typeof req.dice_type === 'string' &&
    VALID_DICE_TYPES.has(req.dice_type) &&
    typeof req.context === 'string'
  );
}

function isValidSceneChange(
  sc: NonNullable<RawDMData['scene_change']>,
): sc is { trigger: SceneTrigger; scene_prompt: ScenePrompt } {
  if (typeof sc.trigger !== 'string' || !VALID_SCENE_TRIGGERS.has(sc.trigger)) {
    return false;
  }

  const sp = sc.scene_prompt;
  if (!sp || typeof sp.setting !== 'string') return false;
  if (!Array.isArray(sp.characters) || !sp.characters.every((c): c is string => typeof c === 'string')) {
    return false;
  }
  if (typeof sp.tone !== 'string' || !VALID_SCENE_TONES.has(sp.tone)) return false;
  if (
    !Array.isArray(sp.style_tokens) ||
    !sp.style_tokens.every((t): t is string => typeof t === 'string')
  ) {
    return false;
  }
  if (typeof sp.negative_prompt !== 'string') return false;

  return true;
}

function isValidCharacterUpdates(
  cu: NonNullable<RawDMData['character_updates']>,
): boolean {
  // At least one field should be present and valid
  const hasHp = typeof cu.hp_delta === 'number';
  const hasXp = typeof cu.xp_delta === 'number';
  const hasInvAdd =
    Array.isArray(cu.inventory_add) &&
    cu.inventory_add.every((i): i is string => typeof i === 'string');
  const hasInvRemove =
    Array.isArray(cu.inventory_remove) &&
    cu.inventory_remove.every((i): i is string => typeof i === 'string');

  return hasHp || hasXp || hasInvAdd || hasInvRemove;
}

function buildCharacterUpdates(
  cu: NonNullable<RawDMData['character_updates']>,
): NonNullable<ParsedResponse['character_updates']> {
  const updates: NonNullable<ParsedResponse['character_updates']> = {};

  if (typeof cu.hp_delta === 'number') {
    updates.hp_delta = cu.hp_delta;
  }
  if (typeof cu.xp_delta === 'number') {
    updates.xp_delta = cu.xp_delta;
  }
  if (
    Array.isArray(cu.inventory_add) &&
    cu.inventory_add.every((i): i is string => typeof i === 'string')
  ) {
    updates.inventory_add = cu.inventory_add;
  }
  if (
    Array.isArray(cu.inventory_remove) &&
    cu.inventory_remove.every((i): i is string => typeof i === 'string')
  ) {
    updates.inventory_remove = cu.inventory_remove;
  }

  return updates;
}
