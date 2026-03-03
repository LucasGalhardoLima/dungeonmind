import type { Character, CharacterStats } from '../../types/entities';
import {
  XP_THRESHOLDS,
  HIT_DICE,
  HIT_DIE_AVERAGE,
  getProficiencyBonus,
  getAbilityModifier,
  ASI_LEVELS,
  getMaxSpellSlots,
  getClassAbilityMax,
  CASTER_CLASSES,
} from '../dnd-constants';

export interface LevelUpResult {
  newLevel: number;
  hpIncrease: number;
  newHPMax: number;
  newProficiencyBonus: number;
  isASILevel: boolean;
  newSpellSlots: number[] | null;
  newClassAbilityMax: number;
}

/**
 * Check if a character has enough XP to level up.
 */
export function canLevelUp(xp: number, currentLevel: number): boolean {
  if (currentLevel >= 20) return false;
  const threshold = XP_THRESHOLDS[currentLevel + 1];
  return threshold !== undefined && xp >= threshold;
}

/**
 * Calculate all effects of leveling up.
 */
export function calculateLevelUp(character: Character): LevelUpResult | null {
  if (!canLevelUp(character.xp, character.level)) return null;

  const newLevel = character.level + 1;
  const cls = character.class;

  // HP increase: average hit die + CON modifier
  const hitDie = HIT_DICE[cls] ?? 'd8';
  const conMod = getAbilityModifier(character.stats.con);
  const hpIncrease = HIT_DIE_AVERAGE[hitDie] + conMod;
  const newHPMax = character.hp_max + Math.max(1, hpIncrease);

  // Proficiency bonus
  const newProficiencyBonus = getProficiencyBonus(newLevel);

  // ASI check
  const isASILevel = ASI_LEVELS.has(newLevel);

  // Spell slots
  const newSpellSlots = CASTER_CLASSES.has(cls)
    ? getMaxSpellSlots(cls, newLevel)
    : null;

  // Class ability max
  const chaMod = getAbilityModifier(character.stats.cha);
  const newClassAbilityMax = getClassAbilityMax(cls, newLevel, chaMod);

  return {
    newLevel,
    hpIncrease,
    newHPMax,
    newProficiencyBonus,
    isASILevel,
    newSpellSlots,
    newClassAbilityMax,
  };
}

/**
 * Apply an ASI (Ability Score Improvement) to stats.
 * Standard D&D: increase one ability by 2 or two abilities by 1 each.
 */
export function applyASI(
  stats: CharacterStats,
  increases: Partial<CharacterStats>,
): CharacterStats {
  return {
    str: Math.min(20, stats.str + (increases.str ?? 0)),
    dex: Math.min(20, stats.dex + (increases.dex ?? 0)),
    con: Math.min(20, stats.con + (increases.con ?? 0)),
    int: Math.min(20, stats.int + (increases.int ?? 0)),
    wis: Math.min(20, stats.wis + (increases.wis ?? 0)),
    cha: Math.min(20, stats.cha + (increases.cha ?? 0)),
  };
}
