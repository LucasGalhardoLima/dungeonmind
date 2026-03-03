import type { Character } from '../../types/entities';
import {
  HIT_DICE,
  HIT_DIE_AVERAGE,
  getAbilityModifier,
  CASTER_CLASSES,
} from '../dnd-constants';
import { recoverClassAbilities } from './class-abilities';

export interface RestResult {
  hpRecovered: number;
  newHPCurrent: number;
  hitDiceSpent: number;
  newHitDiceSpent: number;
  hitDiceRecovered: number;
  spellSlotsRecovered: boolean;
  classAbilitiesRecovered: boolean;
  summary: string;
}

/**
 * Apply a short rest: spend hit dice for HP, recover short-rest abilities.
 */
export function applyShortRest(character: Character): RestResult {
  const cls = character.class.toLowerCase();
  const hitDie = HIT_DICE[cls] ?? 'd8';
  const conMod = getAbilityModifier(character.stats.con);
  const avgRoll = HIT_DIE_AVERAGE[hitDie];

  // Auto-spend hit dice until full HP or no dice left
  let hpRecovered = 0;
  let diceSpent = 0;
  let currentHP = character.hp_current;
  const availableDice = character.hit_dice_total - character.hit_dice_spent;

  while (currentHP < character.hp_max && diceSpent < availableDice) {
    const heal = Math.max(1, avgRoll + conMod);
    currentHP = Math.min(character.hp_max, currentHP + heal);
    hpRecovered += heal;
    diceSpent++;
  }

  // Recover short-rest class abilities
  recoverClassAbilities(
    character.class_abilities,
    cls,
    'short',
  );

  // Warlock: recover pact slots on short rest
  let spellSlotsRecovered = false;
  if (cls === 'bruxo' && character.spell_slots) {
    spellSlotsRecovered = true;
  }

  const parts: string[] = [];
  if (hpRecovered > 0) parts.push(`+${hpRecovered} HP`);
  if (diceSpent > 0) parts.push(`${diceSpent} dados de vida gastos`);
  if (spellSlotsRecovered) parts.push('slots de pacto recuperados');

  return {
    hpRecovered,
    newHPCurrent: Math.min(currentHP, character.hp_max),
    hitDiceSpent: diceSpent,
    newHitDiceSpent: character.hit_dice_spent + diceSpent,
    hitDiceRecovered: 0,
    spellSlotsRecovered,
    classAbilitiesRecovered: true,
    summary: parts.length > 0 ? `Descanso curto: ${parts.join(', ')}.` : 'Descanso curto: sem recuperação necessária.',
  };
}

/**
 * Apply a long rest: full HP, half hit dice, all spell slots, all abilities.
 */
export function applyLongRest(character: Character): RestResult {
  const cls = character.class.toLowerCase();

  // Full HP
  const hpRecovered = character.hp_max - character.hp_current;

  // Recover half total hit dice (minimum 1)
  const hitDiceToRecover = Math.max(1, Math.floor(character.hit_dice_total / 2));
  const newHitDiceSpent = Math.max(0, character.hit_dice_spent - hitDiceToRecover);

  // Recover all spell slots
  const spellSlotsRecovered = CASTER_CLASSES.has(cls) && character.spell_slots !== null;

  const parts: string[] = [];
  parts.push('HP completo');
  if (hitDiceToRecover > 0) parts.push(`${hitDiceToRecover} dados de vida recuperados`);
  if (spellSlotsRecovered) parts.push('todos os slots de magia recuperados');
  parts.push('habilidades recuperadas');

  return {
    hpRecovered,
    newHPCurrent: character.hp_max,
    hitDiceSpent: 0,
    newHitDiceSpent,
    hitDiceRecovered: hitDiceToRecover,
    spellSlotsRecovered,
    classAbilitiesRecovered: true,
    summary: `Descanso longo: ${parts.join(', ')}.`,
  };
}
