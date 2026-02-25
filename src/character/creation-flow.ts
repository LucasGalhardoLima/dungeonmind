// Character creation conversation flow manager.
// Manages a 5-8 exchange narrative conversation in pt-BR where the AI
// derives D&D character data (class, race, stats, equipment, backstory)
// from story-based questions — never using technical D&D terminology.

import type {
  Character,
  CharacterStats,
  Difficulty,
  InventoryItem,
  AdventureType,
} from '../types/entities';

// ---------------------------------------------------------------------------
// Exported types
// ---------------------------------------------------------------------------

export type CreationPhase =
  | 'greeting'
  | 'personality'
  | 'difficulty'
  | 'skills'
  | 'appearance'
  | 'suggestion'
  | 'naming'
  | 'complete';

export interface CreationState {
  phase: CreationPhase;
  exchangeCount: number;
  conversationHistory: Array<{ role: 'player' | 'dm'; content: string }>;
  derivedData: Partial<DerivedCharacterData> | null;
  suggestedClass: string | null;
  suggestedRace: string | null;
  playerOverrides: { class?: string; race?: string } | null;
}

export interface DerivedCharacterData {
  class: string;
  race: string;
  stats: CharacterStats;
  inventory: InventoryItem[];
  backstory: string;
  backstory_summary: string;
  narrative_description: string;
  portrait_prompt: string;
  saving_throws: Record<string, number>;
  skills: Record<string, number>;
}

// ---------------------------------------------------------------------------
// Phase progression logic
// ---------------------------------------------------------------------------

/**
 * Determine the next phase based on current state after an exchange.
 * Exchange count thresholds:
 * - 0: greeting (first AI message)
 * - 1-3: personality (2-3 exchanges about values, fears, personality)
 * - 4-5: skills (1-2 exchanges about abilities, training)
 * - 6: appearance (one question about distinguishing features)
 * - 7: suggestion (AI presents derived class/race)
 * - 8: naming (ask for name)
 * - 9+: complete
 */
function determineNextPhase(currentPhase: CreationPhase, exchangeCount: number): CreationPhase {
  switch (currentPhase) {
    case 'greeting':
      return 'personality';
    case 'personality':
      // After 2-3 personality exchanges, move to difficulty
      if (exchangeCount >= 4) return 'difficulty';
      return 'personality';
    case 'difficulty':
      return 'skills';
    case 'skills':
      // After 1-2 skill exchanges, move to appearance
      if (exchangeCount >= 6) return 'appearance';
      return 'skills';
    case 'appearance':
      return 'suggestion';
    case 'suggestion':
      return 'naming';
    case 'naming':
      return 'complete';
    case 'complete':
      return 'complete';
  }
}

// ---------------------------------------------------------------------------
// Phase instructions for the AI (appended to user messages)
// ---------------------------------------------------------------------------

const PHASE_INSTRUCTIONS: Record<CreationPhase, string> = {
  greeting: [
    '[INSTRUÇÃO_FASE: SAUDAÇÃO]',
    'Esta é a primeira mensagem. Apresente-se brevemente como um narrador misterioso.',
    'Faça UMA pergunta narrativa sobre a ORIGEM do personagem.',
    'Exemplo: "De onde você vem? Uma vila pacata, uma cidade portuária movimentada, ou talvez das profundezas de uma floresta antiga?"',
    'NÃO inclua bloco [CHAR_DATA] ainda.',
  ].join('\n'),

  personality: [
    '[INSTRUÇÃO_FASE: PERSONALIDADE]',
    'Com base na resposta anterior, faça UMA pergunta narrativa sobre a PERSONALIDADE do personagem.',
    'Explore: medos, valores, o que motiva, como reage a injustiça, como trata estranhos.',
    'Construa sobre o que o jogador já revelou.',
    'NÃO inclua bloco [CHAR_DATA] ainda.',
  ].join('\n'),

  difficulty: [
    '[INSTRUÇÃO_FASE: DIFICULDADE]',
    'Faça UMA pergunta narrativa sobre como o personagem ENFRENTA O PERIGO.',
    'Use exatamente esta pergunta (ou algo muito próximo):',
    '"Quando o perigo se apresenta — quando a lâmina brilha na escuridão e seu coração dispara — como você reage? Avança sem pensar, mede cada passo com cautela, ou aceita que a morte faz parte do caminho?"',
    'As três opções representam:',
    '- Avança sem pensar → beginner (jogo mais fácil, morte raramente acontece)',
    '- Mede cada passo → standard (equilíbrio entre desafio e segurança)',
    '- Aceita que a morte faz parte → hardcore (perigo real, morte permanente)',
    'NÃO mencione "dificuldade" ou "nível" — mantenha a linguagem narrativa.',
    'NÃO inclua bloco [CHAR_DATA] ainda.',
    '',
    'Após a resposta do jogador, inclua um bloco de metadados:',
    '[DIFFICULTY]',
    '{"difficulty": "beginner"|"standard"|"hardcore"}',
    '[/DIFFICULTY]',
  ].join('\n'),

  skills: [
    '[INSTRUÇÃO_FASE: HABILIDADES]',
    'Faça UMA pergunta narrativa sobre as HABILIDADES e treinamento do personagem.',
    'Explore: que tipo de desafios enfrentou, como se defende, que talentos desenvolveu, momento decisivo de sua vida.',
    'Use linguagem narrativa — nunca mencione classes, atributos ou mecânica de jogo.',
    'NÃO inclua bloco [CHAR_DATA] ainda.',
  ].join('\n'),

  appearance: [
    '[INSTRUÇÃO_FASE: APARÊNCIA]',
    'Faça UMA pergunta breve sobre a APARÊNCIA do personagem.',
    'Pergunte sobre traços marcantes: cicatrizes, cor dos olhos, como se veste, o que carrega consigo.',
    'NÃO inclua bloco [CHAR_DATA] ainda.',
  ].join('\n'),

  suggestion: [
    '[INSTRUÇÃO_FASE: SUGESTÃO]',
    'Agora analise TODA a conversa e derive os dados do personagem.',
    'Apresente uma sugestão narrativa de quem esse personagem é no mundo (classe e raça) com justificativa baseada nas respostas.',
    'NÃO use termos técnicos de D&D — descreva de forma narrativa.',
    'Exemplo: "Pelas suas histórias, você me parece alguém que viveu pela espada, protegendo os fracos — um guerreiro de coração nobre. E pela sua origem nas montanhas, carrega o sangue dos anões."',
    'Pergunte se o jogador concorda ou gostaria de ajustar algo.',
    '',
    'IMPORTANTE: Inclua o bloco [CHAR_DATA] com todos os dados derivados:',
    '[CHAR_DATA]',
    '{',
    '  "class": "classe_derivada",',
    '  "race": "raça_derivada",',
    '  "stats": {"str":0,"dex":0,"con":0,"int":0,"wis":0,"cha":0},',
    '  "inventory": [{"name":"item","quantity":1}],',
    '  "backstory": "história completa baseada nas respostas",',
    '  "backstory_summary": "resumo em 1-2 frases",',
    '  "narrative_description": "descrição narrativa do personagem em 3ª pessoa",',
    '  "portrait_prompt": "english prompt for portrait generation: detailed physical description, art style, fantasy setting",',
    '  "saving_throws": {"str":0,"dex":0,"con":0,"int":0,"wis":0,"cha":0},',
    '  "skills": {"athletics":0,"perception":0}',
    '}',
    '[/CHAR_DATA]',
  ].join('\n'),

  naming: [
    '[INSTRUÇÃO_FASE: NOMEAÇÃO]',
    'O jogador aceitou (ou ajustou) a sugestão de classe/raça.',
    'Agora faça a pergunta final: "Qual é o nome deste personagem?"',
    'Faça isso de forma narrativa e épica, referenciando a jornada descrita.',
    'Se o jogador pediu ajustes na fase anterior, confirme que as mudanças foram feitas.',
    'NÃO inclua bloco [CHAR_DATA] — os dados já foram gerados.',
  ].join('\n'),

  complete: [
    '[INSTRUÇÃO_FASE: COMPLETO]',
    'O jogador informou o nome do personagem.',
    'Faça um resumo épico e narrativo do personagem completo, usando o nome fornecido.',
    'Inclua o bloco [CHAR_DATA] atualizado com todos os dados finais (incluindo ajustes, se houve).',
    'Este é o encerramento — finalize com uma frase inspiradora sobre a jornada que está por vir.',
  ].join('\n'),
};

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

const WORLD_DESCRIPTIONS: Record<string, string> = {
  valdris: [
    'O mundo de Valdris é uma terra de alta fantasia onde os deuses estão mortos há 400 anos.',
    'Seu poder divino se fragmentou e espalhou pelo mundo. Todo reino foi construído sobre um fragmento.',
    'A magia é instável porque ninguém mais a governa. Os fragmentos estão desaparecendo.',
  ].join(' '),
};

const ADVENTURE_TYPE_LABELS: Record<AdventureType, string> = {
  dungeon_crawl: 'exploração de masmorras e combate tático',
  wilderness_exploration: 'exploração de terras selvagens e sobrevivência',
  political_intrigue: 'intriga política e manipulação social',
  horror_survival: 'horror e sobrevivência contra o desconhecido',
};

export function getCreationSystemPrompt(world: string, adventureType: AdventureType): string {
  const worldDescription = WORLD_DESCRIPTIONS[world] ?? 'Um mundo de fantasia medieval.';
  const adventureLabel = ADVENTURE_TYPE_LABELS[adventureType];

  return [
    '# Criação de Personagem — Mestre Narrador',
    '',
    '## Seu Papel',
    'Você é um narrador misterioso conduzindo a criação de um personagem para uma aventura de RPG.',
    'Você conversa em pt-BR com o jogador, fazendo perguntas narrativas sobre a história de vida do personagem.',
    'A partir das respostas, você deduz internamente classe, raça, atributos, equipamento e história.',
    '',
    '## Regras Absolutas',
    '- NUNCA mencione termos técnicos de D&D (classe, raça, atributos, D20, CA, HP, nível, etc.).',
    '- NUNCA pergunte diretamente "qual classe você quer?" ou "qual raça?".',
    '- Faça EXATAMENTE UMA pergunta por mensagem.',
    '- Construa cada pergunta sobre as respostas anteriores do jogador.',
    '- Use linguagem evocativa, poética e imersiva.',
    '- O nome do personagem é perguntado APENAS no final, após toda a personalidade estar definida.',
    '- Nunca quebre o personagem — você é o narrador, não uma IA.',
    '',
    '## Contexto do Mundo',
    worldDescription,
    '',
    '## Tipo de Aventura',
    `A campanha será focada em ${adventureLabel}.`,
    'Considere isso ao derivar classe, equipamento e habilidades.',
    '',
    '## Derivação de Dados',
    'Internamente (invisível ao jogador), você deve derivar:',
    '- Classe (em português): guerreiro, mago, ladino, clérigo, ranger, bardo, bárbaro, paladino, druida, feiticeiro, bruxo, monge',
    '- Raça (em português): humano, elfo, anão, halfling, meio-orc, meio-elfo, tiefling, draconato, gnomo',
    '- Atributos (str, dex, con, int, wis, cha): valores entre 8 e 18, distribuídos de acordo com a personalidade narrada',
    '- Inventário inicial: 3-6 itens temáticos',
    '- Backstory: história completa baseada nas respostas',
    '- Salvaguardas e perícias: valores derivados da classe e atributos',
    '',
    '## Formato de Dados Estruturados',
    'Quando instruído a incluir dados (fase de sugestão e fase final), inclua um bloco:',
    '',
    '[CHAR_DATA]',
    '{',
    '  "class": "classe_em_portugues",',
    '  "race": "raça_em_portugues",',
    '  "stats": {"str":16,"dex":14,"con":15,"int":10,"wis":12,"cha":8},',
    '  "inventory": [{"name":"Espada longa","quantity":1},{"name":"Cota de malha","quantity":1}],',
    '  "backstory": "história completa...",',
    '  "backstory_summary": "resumo em 1-2 frases",',
    '  "narrative_description": "descrição em 3ª pessoa para ficha",',
    '  "portrait_prompt": "english description for AI portrait generation",',
    '  "saving_throws": {"str":4,"dex":2,"con":3,"int":0,"wis":1,"cha":-1},',
    '  "skills": {"athletics":4,"perception":3}',
    '}',
    '[/CHAR_DATA]',
    '',
    'O bloco [CHAR_DATA] deve conter JSON válido. O campo portrait_prompt DEVE ser em inglês.',
    '',
    '## Fluxo de Fases',
    'As fases serão indicadas por instruções entre colchetes na mensagem do jogador.',
    'Siga as instruções de cada fase rigorosamente.',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Create the initial blank creation state.
 */
export function createInitialState(): CreationState {
  return {
    phase: 'greeting',
    exchangeCount: 0,
    conversationHistory: [],
    derivedData: null,
    suggestedClass: null,
    suggestedRace: null,
    playerOverrides: null,
  };
}

/**
 * Process a player exchange and produce the updated state plus the prompt
 * to send to the AI. For the initial greeting, pass an empty string as playerInput.
 *
 * Returns the updated state and the user-message string to send to the streaming engine.
 */
export function processExchange(
  state: CreationState,
  playerInput: string,
): { updatedState: CreationState; aiPrompt: string } {
  // For the very first message, we don't have player input
  const isFirstMessage = state.phase === 'greeting' && state.exchangeCount === 0;

  // Build the updated conversation history
  const updatedHistory = isFirstMessage
    ? [...state.conversationHistory]
    : [
        ...state.conversationHistory,
        { role: 'player' as const, content: playerInput },
      ];

  // Detect player overrides during the suggestion phase
  let playerOverrides = state.playerOverrides;
  if (state.phase === 'suggestion' && playerInput.trim().length > 0) {
    const overrides = detectOverrides(playerInput, state.suggestedClass, state.suggestedRace);
    if (overrides) {
      playerOverrides = overrides;
    }
  }

  // Determine the next phase
  const nextPhase = isFirstMessage
    ? 'greeting'
    : determineNextPhase(state.phase, state.exchangeCount + 1);

  const newExchangeCount = isFirstMessage ? state.exchangeCount : state.exchangeCount + 1;

  // Build the AI prompt: conversation context + phase instruction
  const phaseInstruction = PHASE_INSTRUCTIONS[nextPhase];
  const conversationContext = buildConversationContext(updatedHistory);

  let aiPrompt: string;
  if (isFirstMessage) {
    aiPrompt = [
      phaseInstruction,
      '',
      'Comece a conversa de criação de personagem.',
    ].join('\n');
  } else {
    const overrideNote =
      playerOverrides && nextPhase === 'naming'
        ? buildOverrideNote(playerOverrides)
        : '';

    aiPrompt = [
      conversationContext,
      '',
      `Resposta do jogador: ${playerInput}`,
      '',
      phaseInstruction,
      overrideNote,
    ]
      .filter(Boolean)
      .join('\n');
  }

  const updatedState: CreationState = {
    phase: nextPhase,
    exchangeCount: newExchangeCount,
    conversationHistory: updatedHistory,
    derivedData: state.derivedData,
    suggestedClass: state.suggestedClass,
    suggestedRace: state.suggestedRace,
    playerOverrides,
  };

  return { updatedState, aiPrompt };
}

/**
 * Parse a [CHAR_DATA]...[/CHAR_DATA] block from an AI response.
 * Returns null if no valid block is found.
 */
export function parseCharacterData(aiResponse: string): DerivedCharacterData | null {
  const openTag = '[CHAR_DATA]';
  const closeTag = '[/CHAR_DATA]';

  const openIdx = aiResponse.indexOf(openTag);
  if (openIdx === -1) return null;

  const closeIdx = aiResponse.indexOf(closeTag, openIdx);
  if (closeIdx === -1) return null;

  const jsonStr = aiResponse.slice(openIdx + openTag.length, closeIdx).trim();

  let raw: RawCharData;
  try {
    raw = JSON.parse(jsonStr) as RawCharData;
  } catch {
    return null;
  }

  // Validate required fields
  if (typeof raw.class !== 'string' || raw.class.length === 0) return null;
  if (typeof raw.race !== 'string' || raw.race.length === 0) return null;
  if (!isValidStats(raw.stats)) return null;
  if (!Array.isArray(raw.inventory)) return null;
  if (typeof raw.backstory !== 'string') return null;
  if (typeof raw.backstory_summary !== 'string') return null;
  if (typeof raw.narrative_description !== 'string') return null;
  if (typeof raw.portrait_prompt !== 'string') return null;
  if (!isValidNumberRecord(raw.saving_throws)) return null;
  if (!isValidNumberRecord(raw.skills)) return null;

  // Validate and normalize inventory items
  const inventory = normalizeInventory(raw.inventory);
  if (inventory === null) return null;

  return {
    class: raw.class,
    race: raw.race,
    stats: {
      str: raw.stats.str,
      dex: raw.stats.dex,
      con: raw.stats.con,
      int: raw.stats.int,
      wis: raw.stats.wis,
      cha: raw.stats.cha,
    },
    inventory,
    backstory: raw.backstory,
    backstory_summary: raw.backstory_summary,
    narrative_description: raw.narrative_description,
    portrait_prompt: raw.portrait_prompt,
    saving_throws: raw.saving_throws,
    skills: raw.skills,
  };
}

/**
 * Parse a [DIFFICULTY]...[/DIFFICULTY] block from an AI response.
 * Returns the extracted Difficulty value, or null if no valid block is found.
 */
export function parseDifficulty(aiResponse: string): Difficulty | null {
  const openTag = '[DIFFICULTY]';
  const closeTag = '[/DIFFICULTY]';
  const openIdx = aiResponse.indexOf(openTag);
  if (openIdx === -1) return null;
  const closeIdx = aiResponse.indexOf(closeTag, openIdx);
  if (closeIdx === -1) return null;
  const jsonStr = aiResponse.slice(openIdx + openTag.length, closeIdx).trim();
  try {
    const parsed = JSON.parse(jsonStr) as { difficulty?: string };
    if (
      parsed.difficulty === 'beginner' ||
      parsed.difficulty === 'standard' ||
      parsed.difficulty === 'hardcore'
    ) {
      return parsed.difficulty;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract suggested class and race from an AI response during the suggestion phase.
 * Updates the state with parsed data.
 */
export function extractSuggestionFromResponse(
  state: CreationState,
  aiResponse: string,
): CreationState {
  const parsed = parseCharacterData(aiResponse);
  if (!parsed) return state;

  return {
    ...state,
    derivedData: parsed,
    suggestedClass: parsed.class,
    suggestedRace: parsed.race,
  };
}

/**
 * Build the final Character record from the creation state.
 * The caller provides the name (asked last), campaign ID, and player ID.
 * Returns a Character omitting only `created_at` (set by the repository).
 */
export function buildCharacterFromCreation(
  state: CreationState,
  name: string,
  campaignId: string,
  playerId: string,
): Omit<Character, 'created_at'> {
  const data = resolveFinalData(state);

  // Calculate HP from constitution modifier: base 10 + con modifier for level 1
  const conModifier = Math.floor((data.stats.con - 10) / 2);
  const baseHP = 10 + conModifier;

  return {
    id: '', // Will be set by repository
    campaign_id: campaignId,
    player_id: playerId,
    name,
    class: data.class,
    race: data.race,
    level: 1,
    hp_current: baseHP,
    hp_max: baseHP,
    stats: data.stats,
    inventory: data.inventory,
    saving_throws: data.saving_throws,
    skills: data.skills,
    portrait_path: null,
    portrait_prompt: data.portrait_prompt,
    portrait_seed: Math.floor(Math.random() * 2147483647),
    backstory: data.backstory,
    backstory_summary: data.backstory_summary,
    narrative_description: data.narrative_description,
    xp: 0,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Raw shape of the JSON inside [CHAR_DATA] blocks — used only for parsing. */
interface RawCharData {
  class: string;
  race: string;
  stats: {
    str: number;
    dex: number;
    con: number;
    int: number;
    wis: number;
    cha: number;
  };
  inventory: Array<{ name: string; quantity: number }>;
  backstory: string;
  backstory_summary: string;
  narrative_description: string;
  portrait_prompt: string;
  saving_throws: Record<string, number>;
  skills: Record<string, number>;
}

function isValidStats(stats: RawCharData['stats'] | undefined): boolean {
  if (!stats || typeof stats !== 'object') return false;
  const keys: Array<keyof CharacterStats> = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
  return keys.every((key) => {
    const val = stats[key];
    return typeof val === 'number' && val >= 1 && val <= 30;
  });
}

function isValidNumberRecord(
  record: Record<string, unknown> | undefined,
): record is Record<string, number> {
  if (!record || typeof record !== 'object') return false;
  return Object.values(record).every((v) => typeof v === 'number');
}

function normalizeInventory(
  raw: Array<{ name?: unknown; quantity?: unknown }>,
): InventoryItem[] | null {
  const items: InventoryItem[] = [];
  for (const entry of raw) {
    if (typeof entry.name !== 'string' || entry.name.length === 0) return null;
    const quantity = typeof entry.quantity === 'number' ? entry.quantity : 1;
    items.push({ name: entry.name, quantity });
  }
  return items;
}

/**
 * Build a compressed conversation context string from history.
 * Keeps the last few exchanges to stay within token budget.
 */
function buildConversationContext(
  history: Array<{ role: 'player' | 'dm'; content: string }>,
): string {
  if (history.length === 0) return '';

  // Include all history — the AI needs full context to derive character data accurately
  const lines = history.map((entry) => {
    const label = entry.role === 'player' ? 'Jogador' : 'Narrador';
    return `${label}: ${entry.content}`;
  });

  return ['[CONTEXTO DA CONVERSA]', ...lines].join('\n');
}

/**
 * Attempt to detect if the player wants to override the suggested class or race.
 * Simple heuristic: looks for common override patterns in pt-BR.
 */
function detectOverrides(
  playerInput: string,
  suggestedClass: string | null,
  suggestedRace: string | null,
): { class?: string; race?: string } | null {
  const input = playerInput.toLowerCase().trim();

  // If the player simply accepts, no overrides
  const acceptPatterns = [
    'sim', 'aceito', 'concordo', 'perfeito', 'ótimo',
    'gostei', 'isso mesmo', 'pode ser', 'tá ótimo', 'ok',
    'beleza', 'combinado', 'fechado',
  ];

  if (acceptPatterns.some((p) => input === p || input.startsWith(`${p},`) || input.startsWith(`${p}.`) || input.startsWith(`${p}!`))) {
    return null;
  }

  const overrides: { class?: string; race?: string } = {};

  // Check for class override keywords
  const classMap: Record<string, string> = {
    guerreiro: 'guerreiro',
    mago: 'mago',
    ladino: 'ladino',
    'clérigo': 'clérigo',
    clerigo: 'clérigo',
    ranger: 'ranger',
    bardo: 'bardo',
    'bárbaro': 'bárbaro',
    barbaro: 'bárbaro',
    paladino: 'paladino',
    druida: 'druida',
    feiticeiro: 'feiticeiro',
    bruxo: 'bruxo',
    monge: 'monge',
  };

  // Check for race override keywords
  const raceMap: Record<string, string> = {
    humano: 'humano',
    elfo: 'elfo',
    'anão': 'anão',
    anao: 'anão',
    halfling: 'halfling',
    'meio-orc': 'meio-orc',
    'meio orc': 'meio-orc',
    'meio-elfo': 'meio-elfo',
    'meio elfo': 'meio-elfo',
    tiefling: 'tiefling',
    draconato: 'draconato',
    gnomo: 'gnomo',
  };

  // Only detect overrides if the player mentions a class/race that differs from suggestion
  for (const [keyword, canonical] of Object.entries(classMap)) {
    if (input.includes(keyword) && canonical !== suggestedClass) {
      overrides.class = canonical;
      break;
    }
  }

  for (const [keyword, canonical] of Object.entries(raceMap)) {
    if (input.includes(keyword) && canonical !== suggestedRace) {
      overrides.race = canonical;
      break;
    }
  }

  if (Object.keys(overrides).length === 0) {
    return null;
  }

  return overrides;
}

function buildOverrideNote(overrides: { class?: string; race?: string }): string {
  const parts: string[] = [];
  if (overrides.class) {
    parts.push(`O jogador escolheu a classe: ${overrides.class}`);
  }
  if (overrides.race) {
    parts.push(`O jogador escolheu a raça: ${overrides.race}`);
  }
  if (parts.length === 0) return '';
  return [
    '[AJUSTES DO JOGADOR]',
    ...parts,
    'Confirme os ajustes na sua resposta e atualize os dados internamente.',
  ].join('\n');
}

/**
 * Resolve final character data, applying player overrides if present.
 * Throws if no derived data exists (should not happen if flow completed correctly).
 */
function resolveFinalData(state: CreationState): DerivedCharacterData {
  if (!state.derivedData) {
    throw new Error('Dados do personagem não foram derivados. A criação não foi completada.');
  }

  // Ensure all required fields are present
  const data = state.derivedData;
  if (
    !data.class ||
    !data.race ||
    !data.stats ||
    !data.inventory ||
    !data.backstory ||
    !data.backstory_summary ||
    !data.narrative_description ||
    !data.portrait_prompt ||
    !data.saving_throws ||
    !data.skills
  ) {
    throw new Error('Dados derivados incompletos. A criação não foi completada corretamente.');
  }

  const resolved: DerivedCharacterData = {
    class: data.class,
    race: data.race,
    stats: data.stats,
    inventory: data.inventory,
    backstory: data.backstory,
    backstory_summary: data.backstory_summary,
    narrative_description: data.narrative_description,
    portrait_prompt: data.portrait_prompt,
    saving_throws: data.saving_throws,
    skills: data.skills,
  };

  // Apply player overrides
  if (state.playerOverrides) {
    if (state.playerOverrides.class) {
      resolved.class = state.playerOverrides.class;
    }
    if (state.playerOverrides.race) {
      resolved.race = state.playerOverrides.race;
    }
  }

  return resolved;
}
