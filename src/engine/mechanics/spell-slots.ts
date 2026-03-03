import type { SpellSlots } from '../../types/entities';
import { getMaxSpellSlots, CASTER_CLASSES } from '../dnd-constants';

/**
 * Initialize spell slots for a character.
 * Returns null for non-casters.
 */
export function initializeSpellSlots(
  characterClass: string,
  level: number,
): SpellSlots | null {
  const cls = characterClass.toLowerCase();
  if (!CASTER_CLASSES.has(cls)) return null;

  const max = getMaxSpellSlots(cls, level);
  if (max.length === 0) return null;

  return { max: [...max], current: [...max] };
}

/**
 * Cast a spell by deducting a slot at the given level.
 * Returns updated spell slots or null if no slot available.
 */
export function castSpell(
  slots: SpellSlots,
  slotLevel: number,
): SpellSlots | null {
  const idx = slotLevel - 1;
  if (idx < 0 || idx >= slots.current.length) return null;
  const remaining = slots.current[idx];
  if (remaining === undefined || remaining <= 0) return null;

  const newCurrent = [...slots.current];
  newCurrent[idx] = remaining - 1;
  return { max: slots.max, current: newCurrent };
}

/**
 * Recover all spell slots (long rest or warlock short rest).
 */
export function recoverAllSpellSlots(slots: SpellSlots): SpellSlots {
  return { max: slots.max, current: [...slots.max] };
}

/**
 * Get total remaining slots across all levels.
 */
export function totalRemainingSlots(slots: SpellSlots): number {
  return slots.current.reduce((sum, n) => sum + n, 0);
}

/**
 * Format spell slots for prompt injection.
 * e.g. "Nv1: 2/4, Nv2: 1/3"
 */
export function formatSpellSlots(slots: SpellSlots): string {
  return slots.max
    .map((max, i) => (max > 0 ? `Nv${i + 1}: ${slots.current[i]}/${max}` : null))
    .filter(Boolean)
    .join(', ');
}
