// Assembles the 7-section system prompt for the AI DM Engine
// Budget: ~12,500 input tokens total

import type { Campaign, Character, Exchange, AdventureType, Difficulty } from '../types/entities';
import type { StateDocument } from '../types/state-document';

// ---------------------------------------------------------------------------
// Public interface
// ---------------------------------------------------------------------------

export interface PromptBuilderInput {
  campaign: Campaign;
  character: Character | null;
  stateDocument: StateDocument;
  recentExchanges: Exchange[];
  playerAction: string;
  includeRulesReference?: boolean;
}

export interface AssembledPrompt {
  systemPrompt: string;
  userMessage: string;
}

// ---------------------------------------------------------------------------
// Section 1 — World Definition (~300 tokens)
// ---------------------------------------------------------------------------

const VALDRIS_WORLD_DEFINITION = `## Mundo: Valdris (Alta Fantasia)

Regra fundamental: Os deuses estão mortos. Seu poder divino se fragmentou e espalhou pelo mundo há 400 anos. Todo reino foi construído sobre um fragmento. A magia é instável porque ninguém mais a governa.

Tensão central: Os fragmentos estão desaparecendo, e ninguém sabe para onde estão indo. Todo reino construído sobre um está começando a desmoronar.

O que não pode existir aqui: ironia moderna, subversão cômica, tecnologia além do medieval, autoridade benevolente todo-poderosa.

Identidade estética: Um mundo de ruínas majestosas e poder indomável — onde cada feitiço pode ser o último e cada coroa pode desmoronar amanhã.`;

function buildWorldDefinition(): string {
  return `[SEÇÃO 1 — DEFINIÇÃO DO MUNDO]\n${VALDRIS_WORLD_DEFINITION}`;
}

// ---------------------------------------------------------------------------
// Section 2 — Adventure Type Definition (~200 tokens)
// ---------------------------------------------------------------------------

interface AdventureTypeProfile {
  label: string;
  structure: string;
  pacing: string;
  primaryChallenge: string;
  diceUsage: string;
  duoSuitability: string;
}

const ADVENTURE_TYPE_PROFILES: Record<AdventureType, AdventureTypeProfile> = {
  dungeon_crawl: {
    label: 'Exploração de Masmorra',
    structure: 'Progressão linear por salas e corredores com encontros escalonados.',
    pacing: 'Pesado em ação — combate a cada 2–3 trocas.',
    primaryChallenge: 'Combate tático e resolução de armadilhas.',
    diceUsage: 'Frequente — rolagens de ataque, dano, salvaguarda e percepção.',
    duoSuitability: 'Ideal para dupla — foco em combate direto e exploração.',
  },
  wilderness_exploration: {
    label: 'Exploração Selvagem',
    structure: 'Descoberta aberta com pontos de interesse espalhados pelo mapa.',
    pacing: 'Equilibrado — alternância entre exploração, sobrevivência e encontros.',
    primaryChallenge: 'Sobrevivência e navegação — recursos, clima, terreno.',
    diceUsage: 'Moderado — testes de sobrevivência, natureza, percepção e atletismo.',
    duoSuitability: 'Bom para dupla — decisões compartilhadas de rota e recursos.',
  },
  political_intrigue: {
    label: 'Intriga Política',
    structure: 'Rede de NPCs com alianças, segredos e objetivos conflitantes.',
    pacing: 'Pesado em narrativa — combate raro mas significativo.',
    primaryChallenge: 'Manipulação social, coleta de informação, negociação.',
    diceUsage: 'Raro mas impactante — testes de persuasão, intimidação, intuição e enganação.',
    duoSuitability: 'Excelente para dupla — diálogos profundos e decisões morais.',
  },
  horror_survival: {
    label: 'Horror e Sobrevivência',
    structure: 'Revelação escalonada — cada camada revela algo pior.',
    pacing: 'Pesado em narrativa com picos explosivos de ação.',
    primaryChallenge: 'Gestão de recursos, sanidade e decisões sob pressão.',
    diceUsage: 'Moderado — testes de resistência, percepção e investigação em momentos de tensão.',
    duoSuitability: 'Intenso para dupla — vulnerabilidade compartilhada aumenta a tensão.',
  },
};

function buildAdventureTypeDefinition(adventureType: AdventureType): string {
  const profile = ADVENTURE_TYPE_PROFILES[adventureType];
  return [
    `[SEÇÃO 2 — TIPO DE AVENTURA]`,
    `## ${profile.label}`,
    `Estrutura: ${profile.structure}`,
    `Ritmo: ${profile.pacing}`,
    `Desafio principal: ${profile.primaryChallenge}`,
    `Uso de dados: ${profile.diceUsage}`,
    `Adequação para dupla: ${profile.duoSuitability}`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Section 3 — DM Persona (~800 tokens)
// ---------------------------------------------------------------------------

function buildDMPersona(matureContent: boolean, difficulty: Difficulty): string {
  const contentPolicy = matureContent
    ? `Conteúdo maduro habilitado: descrições de violência, horror e temas adultos são permitidos quando narrativamente relevantes. Mantenha bom gosto — nunca gratuito.`
    : `Conteúdo familiar: evite violência gráfica, temas sexuais ou linguagem pesada. Mantenha o tom aventureiro e acessível.`;

  const difficultyRules: Record<Difficulty, string> = {
    beginner: [
      '### Dificuldade: Iniciante',
      '- NUNCA mate o personagem no primeiro fracasso — use escapes dramáticos, inconsciência ou intervenção de NPC.',
      '- Encontros devem ser desafiadores mas com saídas claras.',
      '- Dicas sutis quando o jogador parece perdido.',
      '- Rolagens de dados com CD mais brandas (reduza 2-3 pontos internamente).',
      '- Ênfase na exploração e narrativa sobre combate letal.',
    ].join('\n'),
    standard: [
      '### Dificuldade: Padrão',
      '- Morte é possível após múltiplos fracassos consecutivos, nunca no primeiro.',
      '- Encontros equilibrados — o jogador deve sentir perigo real mas ter chances justas.',
      '- Sem dicas diretas — o jogador deve descobrir por si.',
      '- CDs padrão conforme a referência de regras.',
      '- Consequências significativas para decisões ruins.',
    ].join('\n'),
    hardcore: [
      '### Dificuldade: Hardcore',
      '- Morte permanente é uma possibilidade real em qualquer combate.',
      '- Falhas críticas (1 natural) podem ter consequências devastadoras.',
      '- Sem piedade narrativa — o mundo reage com realismo brutal.',
      '- CDs severas (aumente 2-3 pontos internamente).',
      '- Recursos escassos — cada poção e cada descanso importa.',
    ].join('\n'),
  };

  const difficultyBlock = difficultyRules[difficulty];

  return [
    `[SEÇÃO 3 — PERSONA DO MESTRE]`,
    ``,
    `Você é o Mestre (DM) desta aventura. Siga estas regras rigorosamente:`,
    ``,
    `### Estilo de Narração`,
    `- Sempre narre em 2ª pessoa do presente ("Você se aproxima...", "Você sente...", "Seus olhos percebem...").`,
    `- Nunca quebre o personagem. Você é o Mestre — não um assistente de IA.`,
    `- Nunca diga "não posso fazer isso" — sempre encontre uma resposta narrativamente coerente.`,
    `- Nunca referencie o mundo real, pessoas reais ou eventos históricos reais.`,
    `- Descreva ambientes, NPCs e emoções com riqueza sensorial (visão, som, cheiro, tato, sabor quando relevante).
- Nunca aja em nome do personagem do jogador sem instrução explícita — descreva o mundo, NPCs e consequências, mas nunca decida o que o personagem faz, diz ou sente.`,
    ``,
    `### Política de Conteúdo`,
    `${contentPolicy}`,
    ``,
    difficultyBlock,
    ``,
    `### Dados e Mecânica`,
    `- Quando dados são necessários, narre até o momento de tensão e então solicite a rolagem.`,
    `- Nunca role dados pelo jogador — sempre peça que o jogador role.`,
    `- Descreva consequências baseadas no resultado da rolagem de forma dramática.`,
    ``,
    `### Formato de Resposta`,
    `- Responda sempre em pt-BR.`,
    `- Após a narração, forneça 2–4 sugestões contextuais de ação.`,
    `- Ao final de TODA resposta, inclua um bloco de dados estruturado no formato:`,
    ``,
    `\`\`\``,
    `[DM_DATA]`,
    `{`,
    `  "dice_request": null | { "type": "d20"|"d6"|..., "reason": "string", "dc": number|null, "skill": "string"|null },`,
    `  "scene_change": null | { "new_location": "string", "trigger": "location_change"|"encounter"|"reveal"|"cliffhanger" },`,
    `  "suggested_actions": ["string", "string", ...],`,
    `  "character_updates": null | { "hp_change": number|null, "xp_gain": number|null, "inventory_add": string[]|null, "inventory_remove": string[]|null },`,
    `  "npc_updates": null | [{ "name": "string", "relationship_change": "string"|null, "trust_delta": number|null, "fear_delta": number|null, "anger_delta": number|null, "gratitude_delta": number|null }]`,
    `}`,
    `[/DM_DATA]`,
    `\`\`\``,
    ``,
    `O bloco [DM_DATA] deve SEMPRE estar presente, mesmo que todos os campos sejam null.`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Section 4 — D&D Rules Reference (~700 tokens, contextual)
// ---------------------------------------------------------------------------

const DND_RULES_REFERENCE = [
  `[SEÇÃO 4 — REFERÊNCIA DE REGRAS D&D]`,
  ``,
  `### Mecânica Central`,
  `- Teste de habilidade: d20 + modificador vs CD (Classe de Dificuldade).`,
  `- Vantagem: role 2d20, use o maior. Desvantagem: role 2d20, use o menor.`,
  `- Bônus de proficiência por nível: Nv 1–4 = +2, Nv 5–8 = +3, Nv 9–12 = +4, Nv 13–16 = +5, Nv 17–20 = +6.`,
  ``,
  `### Classes de Dificuldade (CD)`,
  `- Fácil: 10`,
  `- Médio: 15`,
  `- Difícil: 20`,
  `- Muito Difícil: 25`,
  `- Quase Impossível: 30`,
  ``,
  `### Combate`,
  `- Iniciativa: d20 + mod de Destreza.`,
  `- Ataque: d20 + mod de atributo + proficiência vs CA do alvo.`,
  `- Acerto crítico (20 natural): dobra os dados de dano.`,
  `- Falha crítica (1 natural): sempre erra, independente de modificadores.`,
  `- Dano: dado da arma + mod de atributo.`,
  ``,
  `### Salvaguardas`,
  `- d20 + mod de atributo + proficiência (se proficiente) vs CD do efeito.`,
  `- Sucesso geralmente reduz ou anula o efeito.`,
  ``,
  `### Condições Comuns`,
  `- Agarrado, Caído, Amedrontado, Envenenado, Atordoado, Incapacitado, Invisível.`,
  `- Cada condição altera o que o personagem pode fazer — narre de acordo.`,
  ``,
  `### Descanso`,
  `- Descanso curto (1h): gasta Dados de Vida para recuperar HP.`,
  `- Descanso longo (8h): recupera todos os HP e metade dos Dados de Vida gastos.`,
].join('\n');

// ---------------------------------------------------------------------------
// Section 5 — Campaign State Document (max 4,000 tokens)
// ---------------------------------------------------------------------------

const RELATIONSHIP_BEHAVIORS: Record<string, string> = {
  trusted: 'compartilha informações livremente, oferece ajuda',
  neutral: 'interação padrão, sem viés positivo ou negativo',
  fearful: 'evasivo, nervoso, pode fugir ou esconder informações',
  hostile: 'agressivo, não coopera, pode atacar ou trair',
  unknown: 'primeira interação, sem histórico',
};

function buildStateDocumentSection(
  stateDocument: StateDocument,
  character: Character | null,
): string {
  const characterBlock = character
    ? [
        `### Personagem Ativo`,
        `Nome: ${character.name}`,
        `Classe: ${character.class} | Raça: ${character.race} | Nível: ${character.level}`,
        `HP: ${character.hp_current}/${character.hp_max}`,
        `Atributos: FOR ${character.stats.str} | DES ${character.stats.dex} | CON ${character.stats.con} | INT ${character.stats.int} | SAB ${character.stats.wis} | CAR ${character.stats.cha}`,
        `Inventário: ${character.inventory.map((i) => `${i.name}${i.quantity > 1 ? ` (x${String(i.quantity)})` : ''}`).join(', ') || 'vazio'}`,
        character.backstory_summary
          ? `Resumo do background: ${character.backstory_summary}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')
    : 'Nenhum personagem ativo.';

  const worldState = stateDocument.world_state;
  const worldBlock = [
    `### Estado do Mundo`,
    worldState.location ? `Localização: ${worldState.location}` : '',
    worldState.time_of_day ? `Hora: ${worldState.time_of_day}` : '',
    worldState.weather ? `Clima: ${worldState.weather}` : '',
    worldState.active_threats.length > 0
      ? `Ameaças ativas: ${worldState.active_threats.join(', ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const npcs = stateDocument.npc_registry;
  const npcBlock =
    npcs.length > 0
      ? [
          `### NPCs Conhecidos`,
          `Instrução: Use o estado emocional de cada NPC para guiar seu comportamento nas interações. O jogador NUNCA vê estes estados — eles se manifestam apenas através do comportamento do NPC.`,
          ...npcs.map((npc) => {
            const behavior = RELATIONSHIP_BEHAVIORS[npc.relationship] ?? 'interação padrão';
            return `- ${npc.name} | Relação: ${npc.relationship} (${behavior})${npc.last_interaction ? ` | Última interação: ${npc.last_interaction}` : ''}`;
          }),
        ].join('\n')
      : '';

  const quests = stateDocument.active_quests;
  const questBlock =
    quests.length > 0
      ? [
          `### Missões`,
          ...quests.map(
            (q) =>
              `- [${q.status.toUpperCase()}] ${q.title}: ${q.description}${q.location ? ` (${q.location})` : ''}`,
          ),
        ].join('\n')
      : '';

  const arc = stateDocument.narrative_arc;
  const arcBlock = [
    arc.current_chapter ? `### Arco Narrativo\nCapítulo atual: ${arc.current_chapter}` : '',
    arc.open_plot_threads.length > 0
      ? `Fios abertos: ${arc.open_plot_threads.join('; ')}`
      : '',
  ]
    .filter(Boolean)
    .join('\n');

  const recentEvents = stateDocument.session_events;
  const eventsBlock =
    recentEvents.length > 0
      ? [
          `### Eventos Recentes da Sessão`,
          ...recentEvents.map((e) => `- Turno ${String(e.turn)}: ${e.summary}`),
        ].join('\n')
      : '';

  return [
    `[SEÇÃO 5 — ESTADO DA CAMPANHA]`,
    characterBlock,
    worldBlock,
    npcBlock,
    questBlock,
    arcBlock,
    eventsBlock,
  ]
    .filter(Boolean)
    .join('\n\n');
}

// ---------------------------------------------------------------------------
// Section 6 — Recent History (max 5,000 tokens / last 20 exchanges)
// ---------------------------------------------------------------------------

const MAX_RECENT_EXCHANGES = 20;

function buildRecentHistory(exchanges: Exchange[]): string {
  const recent = exchanges.slice(-MAX_RECENT_EXCHANGES);

  if (recent.length === 0) {
    return '';
  }

  const lines = recent.map((exchange) => {
    const label = exchange.role === 'player' ? 'Jogador' : 'Mestre';
    return `${label}: ${exchange.content}`;
  });

  return [`[HISTÓRICO RECENTE]`, '', ...lines].join('\n');
}

// ---------------------------------------------------------------------------
// Section 7 — Current Player Action (max 500 tokens)
// ---------------------------------------------------------------------------

function buildPlayerAction(action: string): string {
  return [`[AÇÃO DO JOGADOR]`, '', `Jogador: ${action}`].join('\n');
}

// ---------------------------------------------------------------------------
// Main builder
// ---------------------------------------------------------------------------

export function buildPrompt(input: PromptBuilderInput): AssembledPrompt {
  const {
    campaign,
    character,
    stateDocument,
    recentExchanges,
    playerAction,
    includeRulesReference = false,
  } = input;

  // --- System prompt: sections 1–5 ---
  const systemSections: string[] = [
    buildWorldDefinition(),
    buildAdventureTypeDefinition(campaign.adventure_type),
    buildDMPersona(campaign.mature_content, campaign.difficulty),
  ];

  if (includeRulesReference) {
    systemSections.push(DND_RULES_REFERENCE);
  }

  systemSections.push(buildStateDocumentSection(stateDocument, character));

  const systemPrompt = systemSections.join('\n\n');

  // --- User message: sections 6–7 ---
  const userSections: string[] = [];

  const history = buildRecentHistory(recentExchanges);
  if (history) {
    userSections.push(history);
  }

  userSections.push(buildPlayerAction(playerAction));

  const userMessage = userSections.join('\n\n');

  return { systemPrompt, userMessage };
}
