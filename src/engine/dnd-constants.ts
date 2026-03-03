// D&D 5e constants — single source of truth for all mechanical data used by the engine.
// All descriptions in pt-BR.

// ---------------------------------------------------------------------------
// XP Thresholds — levels 2-20
// ---------------------------------------------------------------------------

export const XP_THRESHOLDS: Record<number, number> = {
  2: 300,
  3: 900,
  4: 2700,
  5: 6500,
  6: 14000,
  7: 23000,
  8: 34000,
  9: 48000,
  10: 64000,
  11: 85000,
  12: 100000,
  13: 120000,
  14: 140000,
  15: 165000,
  16: 195000,
  17: 225000,
  18: 265000,
  19: 305000,
  20: 355000,
};

// ---------------------------------------------------------------------------
// Proficiency Bonus
// ---------------------------------------------------------------------------

export function getProficiencyBonus(level: number): number {
  if (level <= 4) return 2;
  if (level <= 8) return 3;
  if (level <= 12) return 4;
  if (level <= 16) return 5;
  return 6;
}

// ---------------------------------------------------------------------------
// Hit Dice
// ---------------------------------------------------------------------------

export type HitDieType = 'd6' | 'd8' | 'd10' | 'd12';

export const HIT_DICE: Record<string, HitDieType> = {
  barbaro: 'd12',
  bardo: 'd8',
  clerigo: 'd8',
  druida: 'd8',
  guerreiro: 'd10',
  monge: 'd8',
  paladino: 'd10',
  ranger: 'd10',
  ladino: 'd8',
  feiticeiro: 'd6',
  bruxo: 'd8',
  mago: 'd6',
};

export const HIT_DIE_AVERAGE: Record<HitDieType, number> = {
  d6: 4,
  d8: 5,
  d10: 6,
  d12: 7,
};

// ---------------------------------------------------------------------------
// Ability Modifier
// ---------------------------------------------------------------------------

export function getAbilityModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

// ---------------------------------------------------------------------------
// ASI Levels
// ---------------------------------------------------------------------------

export const ASI_LEVELS: ReadonlySet<number> = new Set([4, 8, 12, 16, 19]);

// ---------------------------------------------------------------------------
// Armor Category
// ---------------------------------------------------------------------------

export type ArmorCategory = 'light' | 'medium' | 'heavy';

// ---------------------------------------------------------------------------
// Class Ability Template
// ---------------------------------------------------------------------------

export type RecoveryType = 'short_rest' | 'long_rest' | 'always';

export interface ClassAbilityTemplate {
  name: string;
  description: string;
  resource_name: string | null;
  resource_max: number;
  recovery: RecoveryType;
  scales_at?: Record<number, number>;
}

// ---------------------------------------------------------------------------
// CLASS_ABILITIES — 12 D&D classes, all in Portuguese (pt-BR)
// ---------------------------------------------------------------------------

export const CLASS_ABILITIES: Record<string, ClassAbilityTemplate> = {
  barbaro: {
    name: 'Furia',
    description: 'Entra em furia, ganhando resistencia a dano e bonus em ataques corpo a corpo.',
    resource_name: 'Furia',
    resource_max: 2,
    recovery: 'long_rest',
    scales_at: {
      3: 3,
      6: 4,
      12: 5,
      17: 6,
      20: 999,
    },
  },
  bardo: {
    name: 'Inspiracao Bardica',
    description:
      'Inspira aliados com palavras ou musica, concedendo um dado de bonus em testes de habilidade, ataques ou salvaguardas.',
    resource_name: 'Inspiracao Bardica',
    resource_max: 1,
    recovery: 'long_rest',
    // Uses CHA modifier — handled by getClassAbilityMax
  },
  clerigo: {
    name: 'Canalizar Divindade',
    description:
      'Canaliza energia divina para efeitos poderosos como expulsar mortos-vivos ou habilidades de dominio.',
    resource_name: 'Canalizar Divindade',
    resource_max: 1,
    recovery: 'short_rest',
    scales_at: {
      6: 2,
      18: 3,
    },
  },
  druida: {
    name: 'Forma Selvagem',
    description:
      'Transforma-se em um animal que ja viu, adotando seus atributos fisicos e habilidades.',
    resource_name: 'Forma Selvagem',
    resource_max: 2,
    recovery: 'short_rest',
  },
  guerreiro: {
    name: 'Surto de Acao',
    description:
      'Faz um esforco extra em combate, ganhando uma acao adicional no turno.',
    resource_name: 'Surto de Acao',
    resource_max: 1,
    recovery: 'short_rest',
    scales_at: {
      17: 2,
    },
  },
  monge: {
    name: 'Ki',
    description:
      'Usa pontos de Ki para ativar habilidades especiais como Rajada de Golpes, Passo do Vento e Defesa Paciente.',
    resource_name: 'Ki',
    resource_max: 2,
    recovery: 'short_rest',
    // Uses level — handled by getClassAbilityMax
  },
  paladino: {
    name: 'Golpe Divino',
    description:
      'Canaliza poder divino atraves da arma, adicionando dano radiante extra ao acertar um ataque.',
    resource_name: null,
    resource_max: 0,
    recovery: 'always',
    // Consumes spell slots, not a separate resource
  },
  ranger: {
    name: 'Inimigo Favorito',
    description:
      'Possui conhecimento especial sobre certos tipos de criaturas, ganhando vantagens em rastrear e combater esses inimigos.',
    resource_name: null,
    resource_max: 0,
    recovery: 'always',
  },
  ladino: {
    name: 'Ataque Furtivo',
    description:
      'Desfere um ataque devastador ao acertar uma criatura que esta distraida ou flanqueada, adicionando dados extras de dano.',
    resource_name: null,
    resource_max: 0,
    recovery: 'always',
  },
  feiticeiro: {
    name: 'Metamagia',
    description:
      'Manipula a essencia da magia usando Pontos de Feiticaria para alterar magias — estendendo alcance, acelerando conjuracao ou dobrando efeitos.',
    resource_name: 'Pontos de Feiticaria',
    resource_max: 2,
    recovery: 'long_rest',
    // Uses level — handled by getClassAbilityMax
  },
  bruxo: {
    name: 'Rajada Mistica',
    description:
      'Dispara feixes de energia arcana contra inimigos, uma habilidade que cresce em poder conforme o bruxo se fortalece.',
    resource_name: null,
    resource_max: 0,
    recovery: 'always',
  },
  mago: {
    name: 'Recuperacao Arcana',
    description:
      'Recupera espacos de magia gastos durante um descanso curto, estudando o grimorio.',
    resource_name: 'Recuperacao Arcana',
    resource_max: 1,
    recovery: 'short_rest',
  },
};

// ---------------------------------------------------------------------------
// Caster Class Collections
// ---------------------------------------------------------------------------

export const FULL_CASTER_CLASSES: ReadonlySet<string> = new Set([
  'bardo',
  'clerigo',
  'druida',
  'feiticeiro',
  'mago',
]);

export const HALF_CASTER_CLASSES: ReadonlySet<string> = new Set([
  'paladino',
  'ranger',
]);

export const CASTER_CLASSES: ReadonlySet<string> = new Set([
  ...FULL_CASTER_CLASSES,
  ...HALF_CASTER_CLASSES,
  'bruxo',
]);

// ---------------------------------------------------------------------------
// Spell Slot Tables
// ---------------------------------------------------------------------------

/**
 * Full caster spell slots by character level (1-10).
 * Each entry is an array of slot counts per spell level [1st, 2nd, 3rd, 4th, 5th].
 */
export const FULL_CASTER_SLOTS: Record<number, number[]> = {
  1: [2],
  2: [3],
  3: [4, 2],
  4: [4, 3],
  5: [4, 3, 2],
  6: [4, 3, 3],
  7: [4, 3, 3, 1],
  8: [4, 3, 3, 2],
  9: [4, 3, 3, 3, 1],
  10: [4, 3, 3, 3, 2],
};

/**
 * Half caster spell slots by character level (1-10).
 * Half casters gain spellcasting at level 2; level 1 has no slots.
 */
export const HALF_CASTER_SLOTS: Record<number, number[]> = {
  1: [],
  2: [2],
  3: [3],
  4: [3],
  5: [4, 2],
  6: [4, 2],
  7: [4, 3],
  8: [4, 3],
  9: [4, 3, 2],
  10: [4, 3, 2],
};

/**
 * Warlock pact magic slots by character level (1-10).
 * Warlocks have fewer slots but all are the same level and recover on short rest.
 */
export const WARLOCK_PACT_SLOTS: Record<number, { count: number; level: number }> = {
  1: { count: 1, level: 1 },
  2: { count: 2, level: 1 },
  3: { count: 2, level: 2 },
  4: { count: 2, level: 2 },
  5: { count: 2, level: 3 },
  6: { count: 2, level: 3 },
  7: { count: 2, level: 4 },
  8: { count: 2, level: 4 },
  9: { count: 2, level: 5 },
  10: { count: 2, level: 5 },
};

// ---------------------------------------------------------------------------
// Spell Slot Lookup
// ---------------------------------------------------------------------------

/**
 * Returns the spell slot array for a given class and level.
 * For warlocks, returns an array representation of pact slots.
 * For non-casters, returns an empty array.
 */
export function getMaxSpellSlots(characterClass: string, level: number): number[] {
  const clampedLevel = Math.max(1, Math.min(level, 10));

  if (characterClass === 'bruxo') {
    const pact = WARLOCK_PACT_SLOTS[clampedLevel];
    if (!pact) return [];
    // Build a sparse array with slots placed at the pact spell level
    const slots: number[] = [];
    for (let i = 1; i < pact.level; i++) {
      slots.push(0);
    }
    slots.push(pact.count);
    return slots;
  }

  if (FULL_CASTER_CLASSES.has(characterClass)) {
    return FULL_CASTER_SLOTS[clampedLevel] ?? [];
  }

  if (HALF_CASTER_CLASSES.has(characterClass)) {
    return HALF_CASTER_SLOTS[clampedLevel] ?? [];
  }

  return [];
}

// ---------------------------------------------------------------------------
// Class Ability Resource Max Calculator
// ---------------------------------------------------------------------------

/**
 * Calculates the maximum number of class ability resources for a given class,
 * level, and charisma modifier.
 *
 * - Bard (bardo): uses CHA modifier (minimum 1)
 * - Monk (monge): uses level
 * - Sorcerer (feiticeiro): uses level
 * - Others: uses scales_at progression from ClassAbilityTemplate
 */
export function getClassAbilityMax(
  characterClass: string,
  level: number,
  charismaModifier: number,
): number {
  const template = CLASS_ABILITIES[characterClass];
  if (!template) return 0;

  // Bard uses CHA modifier for Bardic Inspiration
  if (characterClass === 'bardo') {
    return Math.max(1, charismaModifier);
  }

  // Monk Ki points = level
  if (characterClass === 'monge') {
    return level;
  }

  // Sorcerer sorcery points = level
  if (characterClass === 'feiticeiro') {
    return level;
  }

  // For classes with scales_at, find the highest applicable threshold
  if (template.scales_at) {
    let max = template.resource_max;
    const thresholds = Object.keys(template.scales_at)
      .map(Number)
      .sort((a, b) => a - b);

    for (const threshold of thresholds) {
      if (level >= threshold) {
        const value = template.scales_at[threshold];
        if (value !== undefined) {
          max = value;
        }
      }
    }
    return max;
  }

  return template.resource_max;
}
