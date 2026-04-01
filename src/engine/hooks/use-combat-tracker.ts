import { useCallback } from 'react';
import { useCombatStore } from '../../store/combat-store';
import { getAbilityModifier } from '../dnd-constants';
import type { Character } from '../../types/entities';
import type { ParsedResponse } from '../../types/session-events';
import type { CombatParticipant } from '../../types/combat';

let participantIdCounter = 0;
function nextParticipantId(): string {
  participantIdCounter += 1;
  return `cp-${participantIdCounter}`;
}

function rollInitiative(dexModifier: number): number {
  const roll = Math.floor(Math.random() * 20) + 1;
  return roll + dexModifier;
}

/**
 * Detects combat start from DM response signals:
 * - scene_change with 'encounter' trigger
 * - dice_request with attack/initiative context
 */
function detectCombatStart(response: ParsedResponse): boolean {
  if (response.scene_change?.trigger === 'encounter') return true;
  if (response.dice_request?.context.toLowerCase().includes('initiative')) return true;
  return false;
}

/**
 * Detects combat end from response signals:
 * - Narration containing combat-ending patterns
 * - Rest being applied (combat is over if resting)
 */
function detectCombatEnd(response: ParsedResponse): boolean {
  if (response.rest) return true;
  const lowerNarration = response.narration.toLowerCase();
  const endPatterns = [
    'combat ends',
    'battle is over',
    'enemies defeated',
    'foes vanquished',
    'the fight is over',
    'combat is over',
    'victory is yours',
    'you have won',
    'the battle concludes',
    'enemies flee',
    'enemy flees',
    'surrenders',
    'last enemy falls',
  ];
  return endPatterns.some((p) => lowerNarration.includes(p));
}

/**
 * Extracts enemy names from narration when combat starts.
 * Looks for common patterns in DM narration.
 */
function extractEnemyNames(narration: string): string[] {
  // Look for names after common combat-start patterns
  const patterns = [
    /(?:a|an|the)\s+(\w+(?:\s+\w+)?)\s+(?:attacks?|lunges?|charges?|strikes?|appears?|emerges?)/gi,
    /(?:facing|confront(?:ed|ing)?|encounter)\s+(?:a|an|the|some|several)\s+([\w\s]+?)(?:\.|!|,|\s+and\b)/gi,
  ];

  const names = new Set<string>();
  for (const pattern of patterns) {
    let match = pattern.exec(narration);
    while (match) {
      const name = (match[1] ?? '').trim();
      if (name.length > 1 && name.length < 40) {
        names.add(name.charAt(0).toUpperCase() + name.slice(1));
      }
      match = pattern.exec(narration);
    }
  }

  // Fallback: if no names found, use generic
  if (names.size === 0) {
    names.add('Enemy');
  }

  return [...names].slice(0, 5); // max 5 enemies
}

export function useCombatTracker() {
  const startCombat = useCombatStore((s) => s.startCombat);
  const endCombat = useCombatStore((s) => s.endCombat);
  const addLogEntry = useCombatStore((s) => s.addLogEntry);
  const advanceTurn = useCombatStore((s) => s.advanceTurn);
  const updateParticipantHP = useCombatStore((s) => s.updateParticipantHP);
  const inCombat = useCombatStore((s) => s.inCombat);
  const round = useCombatStore((s) => s.round);
  const participants = useCombatStore((s) => s.participants);

  /**
   * Process a DM response and update combat state accordingly.
   * Called from useDMEngine after each complete response.
   */
  const processResponse = useCallback(
    (response: ParsedResponse, character: Character | null) => {
      // Check for combat start
      if (!inCombat && detectCombatStart(response) && character) {
        const dexMod = getAbilityModifier(character.stats.dex);
        const playerInit = rollInitiative(dexMod);

        const playerParticipant: CombatParticipant = {
          id: nextParticipantId(),
          name: character.name,
          initiative: playerInit,
          isPlayer: true,
          isActive: false,
          hpCurrent: character.hp_current,
          hpMax: character.hp_max,
          conditions: [],
        };

        const enemyNames = extractEnemyNames(response.narration);
        const enemyParticipants: CombatParticipant[] = enemyNames.map((name) => ({
          id: nextParticipantId(),
          name,
          initiative: rollInitiative(Math.floor(Math.random() * 3)), // 0-2 DEX mod estimate
          isPlayer: false,
          isActive: false,
          conditions: [],
        }));

        startCombat([playerParticipant, ...enemyParticipants]);
        return;
      }

      // Check for combat end
      if (inCombat && detectCombatEnd(response)) {
        endCombat();
        return;
      }

      // Log combat events from response data
      if (inCombat) {
        const currentRound = round;

        // Log spell cast
        if (response.spell_cast) {
          addLogEntry({
            round: currentRound,
            type: 'spell',
            actor: character?.name ?? 'Player',
            description: `cast ${response.spell_cast.name} (slot level ${response.spell_cast.slot_level})`,
            details: { spellName: response.spell_cast.name },
          });
        }

        // Log damage taken
        if (response.character_updates?.hp_delta && response.character_updates.hp_delta < 0) {
          addLogEntry({
            round: currentRound,
            type: 'damage',
            actor: character?.name ?? 'Player',
            description: `took ${Math.abs(response.character_updates.hp_delta)} damage`,
            details: { value: Math.abs(response.character_updates.hp_delta) },
          });
        }

        // Log healing
        if (response.character_updates?.hp_delta && response.character_updates.hp_delta > 0) {
          addLogEntry({
            round: currentRound,
            type: 'heal',
            actor: character?.name ?? 'Player',
            description: `healed for ${response.character_updates.hp_delta}`,
            details: { value: response.character_updates.hp_delta },
          });
        }

        // Log dice roll (attack/save)
        if (response.dice_request) {
          const context = response.dice_request.context.toLowerCase();
          const type = context.includes('attack') ? 'attack' as const
            : context.includes('sav') ? 'save' as const
            : 'ability' as const;
          addLogEntry({
            round: currentRound,
            type,
            actor: character?.name ?? 'Player',
            description: response.dice_request.context,
          });
        }

        // Update player HP in participants
        if (response.character_updates?.hp_delta && character) {
          const playerParticipant = participants.find((p) => p.isPlayer);
          if (playerParticipant) {
            const newHP = Math.max(
              0,
              (playerParticipant.hpCurrent ?? character.hp_current) +
                response.character_updates.hp_delta,
            );
            updateParticipantHP(playerParticipant.id, newHP);
          }
        }

        // Advance turn after each DM response during combat
        advanceTurn();
      }
    },
    [
      inCombat,
      round,
      participants,
      startCombat,
      endCombat,
      addLogEntry,
      advanceTurn,
      updateParticipantHP,
    ],
  );

  return { processResponse };
}
