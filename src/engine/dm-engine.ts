import type { Campaign, Character, Exchange } from '../types/entities';
import type { StateDocument } from '../types/state-document';
import type { ParsedResponse, NarrativeError } from '../types/session-events';
import type { DiceRequest } from '../types/dice';
import type { ScenePrompt } from '../types/scene-prompt';
import { buildPrompt } from './prompt-builder';
import { streamCompletion, streamCompletionGemini } from './streaming';
import { parseResponse } from './response-parser';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export interface DMEngineInput {
  campaign: Campaign;
  character: Character | null;
  stateDocument: StateDocument;
  recentExchanges: Exchange[];
  playerAction: string;
  includeRulesReference?: boolean;
}

export interface DMEngineCallbacks {
  onToken: (token: string) => void;
  onComplete: (response: ParsedResponse) => void;
  onDiceRequest: (request: DiceRequest) => void;
  onSceneChange: (prompt: ScenePrompt) => void;
  onError: (error: NarrativeError) => void;
}

function createNarrativeError(
  error: Error,
  retryable: boolean
): NarrativeError {
  return {
    narrative:
      'As estrelas obscurecem a visão... Tente novamente, aventureiro.',
    technical: error.message,
    retryable,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function sendAction(
  input: DMEngineInput,
  callbacks: DMEngineCallbacks
): Promise<void> {
  const { systemPrompt, userMessage } = buildPrompt(input);

  let lastError: Error | null = null;

  // Try Anthropic with retries
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      await attemptStream(systemPrompt, userMessage, callbacks, false);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const delay = RETRY_DELAYS[attempt];
      if (delay !== undefined && attempt < MAX_RETRIES - 1) {
        await sleep(delay);
      }
    }
  }

  // Fallback to Gemini
  try {
    await attemptStream(systemPrompt, userMessage, callbacks, true);
    return;
  } catch (error) {
    lastError = error instanceof Error ? error : new Error(String(error));
  }

  callbacks.onError(createNarrativeError(lastError ?? new Error('Unknown error'), false));
}

function attemptStream(
  systemPrompt: string,
  userMessage: string,
  callbacks: DMEngineCallbacks,
  useGemini: boolean
): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const streamFn = useGemini ? streamCompletionGemini : streamCompletion;

    streamFn(systemPrompt, userMessage, {
      onToken(token: string) {
        callbacks.onToken(token);
      },
      onComplete(fullText: string) {
        const parsed = parseResponse(fullText);

        if (parsed.dice_request) {
          callbacks.onDiceRequest({
            dice_type: parsed.dice_request.dice_type,
            context: parsed.dice_request.context,
            requesting_player: '',
          });
        }

        if (parsed.scene_change) {
          callbacks.onSceneChange(parsed.scene_change.scene_prompt);
        }

        callbacks.onComplete(parsed);
        resolve();
      },
      onError(error: Error) {
        reject(error);
      },
    });
  });
}
