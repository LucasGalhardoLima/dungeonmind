import type { Character, InventoryItem, ClassAbility, SpellSlots } from '../types/entities';

// --- Narrative mode types ---

export interface NarrativeSheet {
  introduction: string;
  attributes: string;
  combat: string;
  equipment: string;
  background: string;
}

// --- Technical mode types ---

export interface TechnicalSheet {
  header: {
    name: string;
    class: string;
    race: string;
    level: number;
  };
  abilityScores: Array<{
    name: string;
    abbreviation: string;
    score: number;
    modifier: number;
  }>;
  hp: {
    current: number;
    max: number;
  };
  savingThrows: Array<{
    name: string;
    modifier: number;
    proficient: boolean;
  }>;
  skills: Array<{
    name: string;
    modifier: number;
    proficient: boolean;
  }>;
  inventory: InventoryItem[];
  xp: number;
  armorClass: number;
  gold: number;
  classAbilities: ClassAbility[];
  spellSlots: SpellSlots | null;
}

// --- Ability score mappings ---

interface AbilityMapping {
  key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  name: string;
  abbreviation: string;
}

const ABILITY_MAPPINGS: readonly AbilityMapping[] = [
  { key: 'str', name: 'Strength', abbreviation: 'STR' },
  { key: 'dex', name: 'Dexterity', abbreviation: 'DEX' },
  { key: 'con', name: 'Constitution', abbreviation: 'CON' },
  { key: 'int', name: 'Intelligence', abbreviation: 'INT' },
  { key: 'wis', name: 'Wisdom', abbreviation: 'WIS' },
  { key: 'cha', name: 'Charisma', abbreviation: 'CHA' },
] as const;

// D&D 5e skills in English, ordered canonically
const SKILL_NAMES: readonly string[] = [
  'Acrobatics',
  'Animal Handling',
  'Arcana',
  'Athletics',
  'Deception',
  'History',
  'Insight',
  'Intimidation',
  'Investigation',
  'Medicine',
  'Nature',
  'Perception',
  'Performance',
  'Persuasion',
  'Religion',
  'Sleight of Hand',
  'Stealth',
  'Survival',
] as const;

// --- Narrative descriptors by ability and score range ---

interface ScoreDescriptor {
  min: number;
  max: number;
  descriptors: Record<string, string>;
}

const SCORE_RANGES: readonly ScoreDescriptor[] = [
  {
    min: 1,
    max: 7,
    descriptors: {
      str: 'frail body, barely able to wield a weapon',
      dex: 'clumsy and hesitant movements',
      con: 'fragile health, constantly debilitated',
      int: 'simple mind, understanding little of the world around',
      wis: 'clouded perception, often oblivious to dangers',
      cha: 'faded presence, easily ignored by everyone',
    },
  },
  {
    min: 8,
    max: 9,
    descriptors: {
      str: 'modest strength, sufficient for daily life',
      dex: 'reflexes a bit slow for dangerous situations',
      con: 'endurance below what is expected of adventurers',
      int: 'limited understanding of complex matters',
      wis: 'attention that sometimes lets important details slip by',
      cha: 'reserved personality, without much social flair',
    },
  },
  {
    min: 10,
    max: 11,
    descriptors: {
      str: 'average strength, neither weak nor strong',
      dex: 'agility within the expected range',
      con: 'reasonable health, with no apparent frailties',
      int: 'adequate mind, capable of common reasoning',
      wis: 'normal awareness of the surroundings',
      cha: 'ordinary presence, blending into crowds',
    },
  },
  {
    min: 12,
    max: 13,
    descriptors: {
      str: 'firm muscles that reveal some training',
      dex: 'agile and coordinated movements',
      con: 'robust constitution, enduring exertion well',
      int: 'keen mind, connecting information with ease',
      wis: 'sharp intuition that perceives what others do not',
      cha: 'charisma that draws glances and attention',
    },
  },
  {
    min: 14,
    max: 15,
    descriptors: {
      str: 'remarkable strength, capable of impressive feats',
      dex: 'instincts sharp enough to sense danger before it arrives',
      con: 'impressive vitality, withstanding blows that would fell others',
      int: 'sharp intellect, unraveling enigmas with ease',
      wis: 'notable wisdom, reading intentions and sensing threats',
      cha: 'striking personality that inspires trust or fear',
    },
  },
  {
    min: 16,
    max: 17,
    descriptors: {
      str: 'body forged by years of battle',
      dex: 'exceptional reflexes, moving like a shadow',
      con: 'exceptional endurance, seemingly inexhaustible in combat',
      int: 'intellectual brilliance that few can keep up with',
      wis: 'near-supernatural perception of the surroundings',
      cha: 'dominant presence that commands any room',
    },
  },
  {
    min: 18,
    max: 19,
    descriptors: {
      str: 'enormous strength that inspires legends',
      dex: 'superhuman agility, nearly impossible to follow',
      con: 'iron constitution, enduring what would kill ordinary mortals',
      int: 'brilliant mind, rivaling the greatest sages',
      wis: 'profound wisdom, nearly oracular in its clarity',
      cha: 'irresistible magnetism that bends wills',
    },
  },
  {
    min: 20,
    max: 20,
    descriptors: {
      str: 'legendary strength, worthy of heroes from ages past',
      dex: 'supernatural grace, as if time bends around them',
      con: 'legendary vitality, an unshakeable bastion',
      int: 'absolute genius, able to comprehend the secrets of the multiverse',
      wis: 'near-divine omniscience, nothing escapes their perception',
      cha: 'legendary aura that makes kingdoms bow',
    },
  },
] as const;

// --- Core functions ---

export function calculateModifier(score: number): number {
  return Math.floor((score - 10) / 2);
}

function getStatDescriptor(
  abilityKey: string,
  score: number,
): string {
  for (const range of SCORE_RANGES) {
    if (score >= range.min && score <= range.max) {
      return range.descriptors[abilityKey] ?? '';
    }
  }
  return '';
}

function formatModifierSign(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

// --- Narrative sheet formatter ---

export function formatNarrativeSheet(character: Character): NarrativeSheet {
  const introduction = `You are ${character.name}, a level ${character.level} ${character.race} ${character.class}.`;

  const attributeParts: string[] = [];
  for (const ability of ABILITY_MAPPINGS) {
    const score = character.stats[ability.key];
    const descriptor = getStatDescriptor(ability.key, score);
    if (descriptor) {
      attributeParts.push(`${descriptor} (${ability.abbreviation} ${score})`);
    }
  }
  const attributes = attributeParts.join(', ') + '.';

  const hpRatio = character.hp_max > 0
    ? character.hp_current / character.hp_max
    : 0;
  let hpNarrative: string;
  if (hpRatio >= 1) {
    hpNarrative = 'in peak condition';
  } else if (hpRatio >= 0.75) {
    hpNarrative = 'lightly wounded';
  } else if (hpRatio >= 0.5) {
    hpNarrative = 'visibly injured';
  } else if (hpRatio >= 0.25) {
    hpNarrative = 'gravely wounded';
  } else if (hpRatio > 0) {
    hpNarrative = 'on the brink of death';
  } else {
    hpNarrative = 'fallen and unconscious';
  }

  const savingThrowKeys = Object.keys(character.saving_throws);
  const proficientSaves = ABILITY_MAPPINGS
    .filter((a) => savingThrowKeys.includes(a.key))
    .map((a) => a.name);

  const savesDescription =
    proficientSaves.length > 0
      ? ` Your training has prepared you to resist effects of ${proficientSaves.join(', ')}.`
      : '';

  const combat = `Currently ${hpNarrative} (${character.hp_current}/${character.hp_max} hit points).${savesDescription}`;

  let equipment: string;
  if (character.inventory.length === 0) {
    equipment = 'You carry no belongings with you.';
  } else {
    const itemDescriptions = character.inventory.map((item) => {
      if (item.quantity > 1) {
        return `${item.quantity}x ${item.name}`;
      }
      return item.name;
    });
    equipment = `Your belongings include: ${itemDescriptions.join(', ')}.`;
  }

  const background = character.backstory;

  return {
    introduction,
    attributes,
    combat,
    equipment,
    background,
  };
}

// --- Technical sheet formatter ---

export function formatTechnicalSheet(character: Character): TechnicalSheet {
  const header = {
    name: character.name,
    class: character.class,
    race: character.race,
    level: character.level,
  };

  const abilityScores = ABILITY_MAPPINGS.map((ability) => {
    const score = character.stats[ability.key];
    return {
      name: ability.name,
      abbreviation: ability.abbreviation,
      score,
      modifier: calculateModifier(score),
    };
  });

  const hp = {
    current: character.hp_current,
    max: character.hp_max,
  };

  const savingThrows = ABILITY_MAPPINGS.map((ability) => {
    const hasProficiency = ability.key in character.saving_throws;
    const modifier = hasProficiency
      ? (character.saving_throws[ability.key] ?? 0)
      : calculateModifier(character.stats[ability.key]);
    return {
      name: ability.name,
      modifier,
      proficient: hasProficiency,
    };
  });

  const skills: TechnicalSheet['skills'] = SKILL_NAMES.map((skillName) => {
    const hasProficiency = skillName in character.skills;
    const modifier = hasProficiency
      ? (character.skills[skillName] ?? 0)
      : 0;
    return {
      name: skillName,
      modifier,
      proficient: hasProficiency,
    };
  });

  return {
    header,
    abilityScores,
    hp,
    savingThrows,
    skills,
    inventory: character.inventory,
    xp: character.xp,
    armorClass: character.armor_class,
    gold: character.gold,
    classAbilities: character.class_abilities,
    spellSlots: character.spell_slots,
  };
}
