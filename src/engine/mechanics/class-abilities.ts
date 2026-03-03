import type { ClassAbility, CharacterStats } from '../../types/entities';
import {
  CLASS_ABILITIES,
  getClassAbilityMax,
  getAbilityModifier,
} from '../dnd-constants';

/**
 * Initialize class abilities for a newly created character.
 */
export function initializeClassAbilities(
  characterClass: string,
  level: number,
  stats: CharacterStats,
): ClassAbility[] {
  const template = CLASS_ABILITIES[characterClass];
  if (!template) return [];

  const chaMod = getAbilityModifier(stats.cha);
  const max = getClassAbilityMax(characterClass, level, chaMod);

  // Passive abilities (no resource tracking)
  if (max === 0 && template.resource_name === null) {
    return [{
      name: template.name,
      description: template.description,
      resource_name: null,
      resource_max: 0,
      resource_current: 0,
    }];
  }

  return [{
    name: template.name,
    description: template.description,
    resource_name: template.resource_name,
    resource_max: max,
    resource_current: max,
  }];
}

/**
 * Recover class ability resources based on rest type.
 */
export function recoverClassAbilities(
  abilities: ClassAbility[],
  characterClass: string,
  restType: 'short' | 'long',
): ClassAbility[] {
  const template = CLASS_ABILITIES[characterClass];
  if (!template) return abilities;

  return abilities.map((ability) => {
    if (ability.resource_max === 0) return ability;

    const shouldRecover =
      restType === 'long' || template.recovery === 'short_rest';

    if (shouldRecover) {
      return { ...ability, resource_current: ability.resource_max };
    }
    return ability;
  });
}

/**
 * Deduct one use of a class ability. Returns updated abilities or null if insufficient.
 */
export function useClassAbility(
  abilities: ClassAbility[],
  abilityName: string,
): ClassAbility[] | null {
  const idx = abilities.findIndex(
    (a) => a.name.toLowerCase() === abilityName.toLowerCase()
  );
  if (idx === -1) return null;

  const ability = abilities[idx]!;
  if (ability.resource_max > 0 && ability.resource_current <= 0) return null;

  const updated = [...abilities];
  updated[idx] = {
    ...ability,
    resource_current: Math.max(0, ability.resource_current - 1),
  };
  return updated;
}
