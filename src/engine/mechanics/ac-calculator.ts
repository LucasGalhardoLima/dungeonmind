import type { InventoryItem, CharacterStats } from '../../types/entities';
import { getAbilityModifier } from '../dnd-constants';

export interface ACResult {
  value: number;
  source: string;
}

export function calculateAC(
  stats: CharacterStats,
  inventory: InventoryItem[],
  characterClass: string,
): ACResult {
  const dexMod = getAbilityModifier(stats.dex);

  const armor = inventory.find((i) => i.type === 'armor' && i.armor_base != null);
  const shield = inventory.find((i) => i.type === 'shield');
  const shieldBonus = shield ? 2 : 0;

  // Unarmored defense for Barbarian
  if (!armor && characterClass === 'bárbaro') {
    const conMod = getAbilityModifier(stats.con);
    const ac = 10 + dexMod + conMod + shieldBonus;
    const source = shield ? `defesa sem armadura + ${shield.name}` : 'defesa sem armadura';
    return { value: ac, source };
  }

  // Unarmored defense for Monk
  if (!armor && characterClass === 'monge') {
    const wisMod = getAbilityModifier(stats.wis);
    const ac = 10 + dexMod + wisMod + shieldBonus;
    const source = shield ? `defesa sem armadura + ${shield.name}` : 'defesa sem armadura';
    return { value: ac, source };
  }

  // No armor
  if (!armor) {
    const ac = 10 + dexMod + shieldBonus;
    const source = shield ? `sem armadura + ${shield.name}` : 'sem armadura';
    return { value: ac, source };
  }

  // Armored
  const armorBase = armor.armor_base ?? 10;
  const category = armor.armor_category;
  let ac: number;
  let source: string;

  if (category === 'light') {
    ac = armorBase + dexMod;
    source = armor.name;
  } else if (category === 'medium') {
    ac = armorBase + Math.min(dexMod, 2);
    source = armor.name;
  } else {
    // Heavy
    ac = armorBase;
    source = armor.name;
  }

  if (shield) {
    ac += shieldBonus;
    source += ` + ${shield.name}`;
  }

  return { value: ac, source };
}
