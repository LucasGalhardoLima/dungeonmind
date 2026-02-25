import type { Exchange, NPC, Character } from '../types/entities';
import type {
  StateDocument,
  StateCharacter,
  StateNPC,
  NPCRelationship,
} from '../types/state-document';
import { EMPTY_STATE_DOCUMENT, STATE_DOCUMENT_MAX_TOKENS } from '../types/state-document';
import { streamCompletion } from './streaming';

export function createInitialStateDocument(
  character: Character
): StateDocument {
  const stateChar: StateCharacter = {
    player_id: character.player_id,
    name: character.name,
    class: character.class,
    race: character.race,
    level: character.level,
    hp: { current: character.hp_current, max: character.hp_max },
    inventory: character.inventory.map((item) => item.name),
    portrait_prompt: character.portrait_prompt,
    backstory_summary: character.backstory_summary,
  };

  return {
    ...EMPTY_STATE_DOCUMENT,
    active_characters: [stateChar],
  };
}

export function npcToStateNPC(npc: NPC): StateNPC {
  let relationship: NPCRelationship = 'neutral';
  if (npc.trust >= 70) relationship = 'trusted';
  else if (npc.gratitude >= 70 && npc.trust >= 50) relationship = 'trusted';
  else if (npc.anger >= 70) relationship = 'hostile';
  else if (npc.fear >= 70) relationship = 'fearful';
  else if (npc.fear >= 60 && npc.trust < 30) relationship = 'fearful';
  else if (npc.trust <= 20 && npc.anger >= 40) relationship = 'hostile';

  return {
    name: npc.name,
    relationship,
    last_interaction: npc.last_interaction_summary,
  };
}

export function enrichStateDocumentWithLiveNPCs(
  stateDoc: StateDocument,
  npcs: NPC[]
): StateDocument {
  return {
    ...stateDoc,
    npc_registry: npcs.map(npcToStateNPC),
  };
}

export interface NPCEmotionalSummary {
  name: string;
  relationship: NPCRelationship;
  emotionalProfile: string;
  lastInteraction: string;
}

function emotionIntensityLabel(value: number): string {
  if (value <= 15) return 'nenhum(a)';
  if (value <= 35) return 'leve';
  if (value <= 60) return 'moderado(a)';
  if (value <= 85) return 'alto(a)';
  return 'extremo(a)';
}

export function summarizeNPCEmotions(npc: NPC): NPCEmotionalSummary {
  const stateNpc = npcToStateNPC(npc);

  const parts: string[] = [];

  // Trust: notable when above 30 or below 20
  if (npc.trust > 30) {
    parts.push(`confiança ${emotionIntensityLabel(npc.trust)} (${npc.trust})`);
  } else if (npc.trust < 20) {
    parts.push(`confiança ${emotionIntensityLabel(npc.trust)} (${npc.trust})`);
  }

  // Gratitude: include when above 30
  if (npc.gratitude > 30) {
    parts.push(`gratidão ${emotionIntensityLabel(npc.gratitude)} (${npc.gratitude})`);
  }

  // Fear: include when above 30
  if (npc.fear > 30) {
    parts.push(`medo ${emotionIntensityLabel(npc.fear)} (${npc.fear})`);
  } else {
    parts.push('sem medo');
  }

  // Anger: include when above 30
  if (npc.anger > 30) {
    parts.push(`irritação ${emotionIntensityLabel(npc.anger)} (${npc.anger})`);
  }

  return {
    name: npc.name,
    relationship: stateNpc.relationship,
    emotionalProfile: parts.join(', '),
    lastInteraction: npc.last_interaction_summary,
  };
}

const COMPRESSION_SYSTEM_PROMPT = `Você é um assistente de compressão de estado de campanha D&D.

Sua tarefa é mesclar novos eventos de sessão em um State Document existente.
O State Document é uma representação comprimida da memória da campanha.

Regras:
1. Mantenha TODOS os personagens ativos, NPCs com interações recentes e quests ativas
2. Resuma eventos em frases curtas e informativas
3. Atualize o registro de NPCs com base em novas interações
4. Atualize o estado do mundo (localização, hora, clima, ameaças)
5. Atualize o arco narrativo (capítulo atual, fios abertos)
6. O resultado DEVE ser um JSON válido seguindo o schema StateDocument
7. O resultado NÃO DEVE exceder ${STATE_DOCUMENT_MAX_TOKENS} tokens
8. Nunca invente eventos que não aconteceram
9. Priorize informações recentes sobre antigas quando precisar cortar

Responda APENAS com o JSON atualizado, sem texto adicional.`;

export async function compressStateDocument(
  currentState: StateDocument,
  newExchanges: Exchange[],
  npcs: NPC[],
  character: Character
): Promise<StateDocument> {
  const exchangeSummary = newExchanges
    .map((e) => `[${e.role}] ${e.content.slice(0, 200)}`)
    .join('\n');

  const npcStates = npcs.map(npcToStateNPC);

  const userMessage = `State Document atual:
${JSON.stringify(currentState, null, 2)}

Novos eventos desde a última compressão:
${exchangeSummary}

NPCs atuais:
${JSON.stringify(npcStates, null, 2)}

Personagem atual:
Nome: ${character.name}, Classe: ${character.class}, Raça: ${character.race}, Nível: ${character.level}
HP: ${character.hp_current}/${character.hp_max}
XP: ${character.xp}

Atualize o State Document incorporando os novos eventos.`;

  return new Promise<StateDocument>((resolve) => {
    let result = '';

    streamCompletion(COMPRESSION_SYSTEM_PROMPT, userMessage, {
      onToken(token: string) {
        result += token;
      },
      onComplete(fullText: string) {
        try {
          const cleaned = fullText
            .replace(/```json\n?/g, '')
            .replace(/```\n?/g, '')
            .trim();
          const parsed = JSON.parse(cleaned) as StateDocument;
          resolve(validateStateDocument(parsed, currentState));
        } catch {
          resolve(currentState);
        }
      },
      onError() {
        resolve(currentState);
      },
    });
  });
}

function validateStateDocument(
  doc: StateDocument,
  fallback: StateDocument
): StateDocument {
  if (!doc.active_characters || !Array.isArray(doc.active_characters)) {
    return fallback;
  }
  if (!doc.world_state || typeof doc.world_state.location !== 'string') {
    return fallback;
  }
  if (!doc.narrative_arc || typeof doc.narrative_arc.current_chapter !== 'string') {
    return fallback;
  }

  return {
    active_characters: doc.active_characters,
    session_events: Array.isArray(doc.session_events)
      ? doc.session_events
      : fallback.session_events,
    npc_registry: Array.isArray(doc.npc_registry)
      ? doc.npc_registry
      : fallback.npc_registry,
    active_quests: Array.isArray(doc.active_quests)
      ? doc.active_quests
      : fallback.active_quests,
    world_state: doc.world_state,
    narrative_arc: doc.narrative_arc,
  };
}

const SUMMARY_SYSTEM_PROMPT = `Você é um narrador de D&D escrevendo um resumo de sessão.

Escreva um resumo narrativo da sessão como um capítulo de livro, em pt-BR.
Use terceira pessoa e tempo passado.
O resumo deve ser envolvente e capturar os momentos-chave da sessão.
Mantenha entre 150-300 palavras.
NÃO inclua mecânicas de jogo (números, dados, DCs) — apenas a história.`;

export async function generateSessionSummary(
  exchanges: Exchange[],
  campaignName: string
): Promise<string> {
  const conversation = exchanges
    .filter((e) => e.role !== 'system')
    .map((e) => {
      const role = e.role === 'player' ? 'Jogador' : 'Mestre';
      return `${role}: ${e.content}`;
    })
    .join('\n\n');

  const userMessage = `Campanha: ${campaignName}

Exchanges da sessão:
${conversation}

Escreva o resumo narrativo desta sessão.`;

  return new Promise<string>((resolve) => {
    let result = '';

    streamCompletion(SUMMARY_SYSTEM_PROMPT, userMessage, {
      onToken(token: string) {
        result += token;
      },
      onComplete(fullText: string) {
        resolve(fullText.trim());
      },
      onError() {
        resolve('A sessão terminou, mas as estrelas obscureceram a memória do narrador...');
      },
    });
  });
}

export function shouldCompress(
  exchangeCount: number,
  lastCompressionExchangeCount: number
): boolean {
  return exchangeCount - lastCompressionExchangeCount > 30;
}
