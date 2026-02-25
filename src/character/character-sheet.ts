import type { Character, InventoryItem } from '../types/entities';

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
}

// --- Ability score mappings ---

interface AbilityMapping {
  key: 'str' | 'dex' | 'con' | 'int' | 'wis' | 'cha';
  name: string;
  abbreviation: string;
}

const ABILITY_MAPPINGS: readonly AbilityMapping[] = [
  { key: 'str', name: 'Força', abbreviation: 'FOR' },
  { key: 'dex', name: 'Destreza', abbreviation: 'DES' },
  { key: 'con', name: 'Constituição', abbreviation: 'CON' },
  { key: 'int', name: 'Inteligência', abbreviation: 'INT' },
  { key: 'wis', name: 'Sabedoria', abbreviation: 'SAB' },
  { key: 'cha', name: 'Carisma', abbreviation: 'CAR' },
] as const;

// D&D 5e skills in pt-BR, ordered canonically
const SKILL_NAMES: readonly string[] = [
  'Acrobacia',
  'Lidar com Animais',
  'Arcanismo',
  'Atletismo',
  'Enganação',
  'História',
  'Intuição',
  'Intimidação',
  'Investigação',
  'Medicina',
  'Natureza',
  'Percepção',
  'Atuação',
  'Persuasão',
  'Religião',
  'Prestidigitação',
  'Furtividade',
  'Sobrevivência',
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
      str: 'corpo frágil, mal conseguindo empunhar uma arma',
      dex: 'movimentos desajeitados e hesitantes',
      con: 'saúde frágil, constantemente debilitado',
      int: 'mente simples, compreendendo pouco do mundo ao redor',
      wis: 'percepção turva, frequentemente alheio aos perigos',
      cha: 'presença apagada, facilmente ignorado por todos',
    },
  },
  {
    min: 8,
    max: 9,
    descriptors: {
      str: 'força modesta, suficiente para o dia a dia',
      dex: 'reflexos um pouco lentos para situações de perigo',
      con: 'resistência abaixo do esperado para aventureiros',
      int: 'compreensão limitada de assuntos complexos',
      wis: 'atenção que às vezes deixa escapar detalhes importantes',
      cha: 'personalidade reservada, sem muito brilho social',
    },
  },
  {
    min: 10,
    max: 11,
    descriptors: {
      str: 'força comum, nem fraco nem forte',
      dex: 'agilidade dentro do esperado',
      con: 'saúde razoável, sem fragilidades aparentes',
      int: 'mente adequada, capaz de raciocínio comum',
      wis: 'percepção normal do ambiente ao redor',
      cha: 'presença comum, sem se destacar em multidões',
    },
  },
  {
    min: 12,
    max: 13,
    descriptors: {
      str: 'músculos firmes que revelam algum treino',
      dex: 'movimentos ágeis e coordenados',
      con: 'constituição robusta, resistindo bem ao esforço',
      int: 'mente perspicaz, conectando informações com facilidade',
      wis: 'intuição aguçada que percebe o que outros não veem',
      cha: 'carisma que atrai olhares e atenção',
    },
  },
  {
    min: 14,
    max: 15,
    descriptors: {
      str: 'força notável, capaz de feitos impressionantes',
      dex: 'instintos afiados o suficiente para sentir o perigo antes que ele chegue',
      con: 'vitalidade impressionante, suportando golpes que derrubariam outros',
      int: 'intelecto afiado, desvendando enigmas com naturalidade',
      wis: 'sabedoria notável, lendo intenções e pressentindo ameaças',
      cha: 'personalidade marcante que inspira confiança ou temor',
    },
  },
  {
    min: 16,
    max: 17,
    descriptors: {
      str: 'corpo forjado por anos de batalha',
      dex: 'reflexos excepcionais, movendo-se como uma sombra',
      con: 'resistência excepcional, parecendo inesgotável em combate',
      int: 'brilhantismo intelectual que poucos conseguem acompanhar',
      wis: 'percepção quase sobrenatural dos arredores',
      cha: 'presença dominante que comanda qualquer sala',
    },
  },
  {
    min: 18,
    max: 19,
    descriptors: {
      str: 'força descomunal que inspira lendas',
      dex: 'agilidade sobre-humana, quase impossível de acompanhar',
      con: 'constituição de ferro, resistindo ao que mataria mortais comuns',
      int: 'mente brilhante, rivalizando com os maiores sábios',
      wis: 'sabedoria profunda, quase oracular em sua clareza',
      cha: 'magnetismo irresistível que dobra vontades',
    },
  },
  {
    min: 20,
    max: 20,
    descriptors: {
      str: 'força lendária, digna dos heróis das eras passadas',
      dex: 'graça sobrenatural, como se o tempo curvasse ao seu redor',
      con: 'vitalidade lendária, um bastião inabalável',
      int: 'gênio absoluto, capaz de compreender os segredos do multiverso',
      wis: 'onisciência quase divina, nada escapa à sua percepção',
      cha: 'aura lendária que faz reinos se curvarem',
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
  const introduction = `Você é ${character.name}, ${character.race} ${character.class} de nível ${character.level}.`;

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
    hpNarrative = 'em plena forma';
  } else if (hpRatio >= 0.75) {
    hpNarrative = 'levemente ferido';
  } else if (hpRatio >= 0.5) {
    hpNarrative = 'com ferimentos visíveis';
  } else if (hpRatio >= 0.25) {
    hpNarrative = 'gravemente ferido';
  } else if (hpRatio > 0) {
    hpNarrative = 'à beira da morte';
  } else {
    hpNarrative = 'caído e inconsciente';
  }

  const savingThrowKeys = Object.keys(character.saving_throws);
  const proficientSaves = ABILITY_MAPPINGS
    .filter((a) => savingThrowKeys.includes(a.key))
    .map((a) => a.name);

  const savesDescription =
    proficientSaves.length > 0
      ? ` Seu treinamento o preparou para resistir a efeitos de ${proficientSaves.join(', ')}.`
      : '';

  const combat = `Atualmente ${hpNarrative} (${character.hp_current}/${character.hp_max} pontos de vida).${savesDescription}`;

  let equipment: string;
  if (character.inventory.length === 0) {
    equipment = 'Você não carrega nenhum pertence consigo.';
  } else {
    const itemDescriptions = character.inventory.map((item) => {
      if (item.quantity > 1) {
        return `${item.quantity}x ${item.name}`;
      }
      return item.name;
    });
    equipment = `Seus pertences incluem: ${itemDescriptions.join(', ')}.`;
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
  };
}
