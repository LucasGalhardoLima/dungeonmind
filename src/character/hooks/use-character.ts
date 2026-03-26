import { useState, useCallback, useRef, useEffect } from 'react';
import type { Character, AdventureType } from '../../types/entities';
import type { PortraitPrompt } from '../../types/scene-prompt';
import type { NarrativeSheet, TechnicalSheet } from '../character-sheet';
import type { CreationState } from '../creation-flow';
import type { StreamCallbacks, StreamOptions } from '../../engine/streaming';
import {
  createInitialState,
  getCreationSystemPrompt,
  processExchange,
  parseCharacterData,
  extractSuggestionFromResponse,
  buildCharacterFromCreation,
  getMaxTokensForPhase,
} from '../creation-flow';
import { generatePortrait } from '../portrait-generator';
import { formatNarrativeSheet, formatTechnicalSheet } from '../character-sheet';
import { streamCompletion, streamCompletionGemini } from '../../engine/streaming';
import { stripMetadataForDisplay } from '../../engine/response-parser';
import { useRepository } from '../../persistence/hooks/use-repository';
import { useSettingsStore } from '../../store/settings-store';
import { getDatabase } from '../../persistence/database';
import { trackEvent } from '../../analytics/analytics-service';

export interface UseCharacterReturn {
  // Creation flow
  creationState: CreationState;
  isCreating: boolean;
  streamingText: string;
  isStreaming: boolean;
  startCreation: (campaignId: string, world: string, adventureType: AdventureType) => void;
  sendCreationResponse: (playerInput: string) => void;
  finalizeWithName: (name: string) => Promise<Character>;

  // Retry
  extractionFailed: boolean;
  retryExtraction: () => void;

  // Portrait
  isGeneratingPortrait: boolean;
  portraitPath: string | null;
  generateCharacterPortrait: (character: Character) => Promise<string | null>;

  // Character sheet
  character: Character | null;
  narrativeSheet: NarrativeSheet | null;
  technicalSheet: TechnicalSheet | null;
  loadCharacter: (campaignId: string) => void;

  // Error
  error: string | null;
}

export function useCharacter(): UseCharacterReturn {
  const { characters } = useRepository();
  const getPlayerId = useSettingsStore((state) => state.getPlayerId);

  // --- Creation flow state ---
  const [creationState, setCreationState] = useState<CreationState>(createInitialState);
  const [isCreating, setIsCreating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [extractionFailed, setExtractionFailed] = useState(false);

  // --- Portrait state ---
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [portraitPath, setPortraitPath] = useState<string | null>(null);

  // --- Character sheet state ---
  const [character, setCharacter] = useState<Character | null>(null);
  const [narrativeSheet, setNarrativeSheet] = useState<NarrativeSheet | null>(null);
  const [technicalSheet, setTechnicalSheet] = useState<TechnicalSheet | null>(null);

  // --- Error state ---
  const [error, setError] = useState<string | null>(null);

  // --- Refs for cross-callback access ---
  const systemPromptRef = useRef('');
  const campaignIdRef = useRef('');
  const creationStateRef = useRef<CreationState>(createInitialState());
  const lastAiPromptRef = useRef('');

  // --- Token throttle buffer (same pattern as use-dm-engine.ts) ---
  const tokenBufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fullTextRef = useRef('');

  // Keep the ref in sync with state
  const updateCreationState = useCallback((newState: CreationState) => {
    creationStateRef.current = newState;
    setCreationState(newState);
  }, []);

  // ---------------------------------------------------------------------------
  // Token throttle helpers (~30fps flush)
  // ---------------------------------------------------------------------------

  const startTokenFlush = useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = setInterval(() => {
      if (tokenBufferRef.current.length > 0) {
        const chunk = tokenBufferRef.current;
        tokenBufferRef.current = '';
        setStreamingText((prev) => prev + chunk);
      }
    }, 32);
  }, []);

  const stopTokenFlush = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    // Flush any remaining buffered tokens
    if (tokenBufferRef.current.length > 0) {
      const remaining = tokenBufferRef.current;
      tokenBufferRef.current = '';
      setStreamingText((prev) => prev + remaining);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        clearInterval(flushTimerRef.current);
      }
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Streaming helper: try Anthropic first, fallback to Gemini
  // ---------------------------------------------------------------------------
  const streamWithFallback = useCallback(
    (systemPrompt: string, userMessage: string, callbacks: StreamCallbacks, maxTokens?: number): void => {
      const options: StreamOptions | undefined = maxTokens ? { maxTokens } : undefined;

      streamCompletion(systemPrompt, userMessage, {
        onToken: callbacks.onToken,
        onComplete: callbacks.onComplete,
        onError: () => {
          // Anthropic failed — fallback to Gemini
          streamCompletionGemini(systemPrompt, userMessage, callbacks, options).catch(
            (geminiError: unknown) => {
              const message =
                geminiError instanceof Error
                  ? geminiError.message
                  : String(geminiError);
              callbacks.onError(new Error(message));
            },
          );
        },
      }, options).catch(() => {
        // streamCompletion itself threw (not via onError) — try Gemini
        streamCompletionGemini(systemPrompt, userMessage, callbacks, options).catch(
          (geminiError: unknown) => {
            const message =
              geminiError instanceof Error
                ? geminiError.message
                : String(geminiError);
            callbacks.onError(new Error(message));
          },
        );
      });
    },
    [],
  );

  // ---------------------------------------------------------------------------
  // Post-stream processing: extract character data on suggestion/complete phases
  // ---------------------------------------------------------------------------
  const handleStreamComplete = useCallback(
    (fullText: string, stateAtStreamStart: CreationState) => {
      // 1. Stop token flush and drain buffer
      stopTokenFlush();

      // 2. Set streaming text to match what the permanent bubble will show
      //    (prevents visible content change during transition)
      setStreamingText(stripMetadataForDisplay(fullText));

      // Add the DM response to conversation history
      const stateWithHistory: CreationState = {
        ...stateAtStreamStart,
        conversationHistory: [
          ...stateAtStreamStart.conversationHistory,
          { role: 'dm' as const, content: fullText },
        ],
      };

      let updatedState = stateWithHistory;

      // Auto-extract suggestion data when in the suggestion phase
      if (stateAtStreamStart.phase === 'suggestion') {
        updatedState = extractSuggestionFromResponse(updatedState, fullText);
        if (updatedState.derivedData === null) {
          setExtractionFailed(true);
          setError(
            'Nao foi possivel extrair os dados do personagem. Tente novamente.',
          );
        }
      }

      // Auto-parse final character data when in the complete phase
      if (stateAtStreamStart.phase === 'complete') {
        const parsedData = parseCharacterData(fullText);
        if (parsedData) {
          updatedState = {
            ...updatedState,
            derivedData: parsedData,
            suggestedClass: parsedData.class,
            suggestedRace: parsedData.race,
          };
        } else if (updatedState.derivedData === null) {
          // Both parseCharacterData and prior suggestion extraction failed
          setExtractionFailed(true);
          setError(
            'Nao foi possivel derivar os dados do personagem. Tente novamente.',
          );
        }
        // If parsedData is null but derivedData already exists from suggestion phase, keep it
      }

      // 3. Update creation state
      updateCreationState(updatedState);

      // 4. Set isStreaming false LAST — streaming bubble disappears after permanent appears
      setIsStreaming(false);
    },
    [updateCreationState, stopTokenFlush],
  );

  // ---------------------------------------------------------------------------
  // startCreation
  // ---------------------------------------------------------------------------
  const startCreation = useCallback(
    (campaignId: string, world: string, adventureType: AdventureType) => {
      setError(null);
      setExtractionFailed(false);
      setIsCreating(true);
      setStreamingText('');
      setIsStreaming(true);

      const initialState = createInitialState();
      updateCreationState(initialState);
      campaignIdRef.current = campaignId;

      const systemPrompt = getCreationSystemPrompt(world, adventureType);
      systemPromptRef.current = systemPrompt;

      // Process the greeting exchange (empty player input for the first message)
      const { updatedState, aiPrompt } = processExchange(initialState, '');
      updateCreationState(updatedState);
      lastAiPromptRef.current = aiPrompt;

      const stateSnapshot = updatedState;
      const maxTokens = getMaxTokensForPhase(updatedState.phase);

      // Reset token buffer and full text tracker
      tokenBufferRef.current = '';
      fullTextRef.current = '';
      startTokenFlush();

      streamWithFallback(systemPrompt, aiPrompt, {
        onToken: (token: string) => {
          tokenBufferRef.current += token;
          fullTextRef.current += token;
        },
        onComplete: (fullText: string) => {
          handleStreamComplete(fullText, stateSnapshot);
        },
        onError: (err: Error) => {
          stopTokenFlush();
          setIsStreaming(false);
          setError(`Erro ao conectar com o narrador. Tente novamente. (${err.message})`);
        },
      }, maxTokens);
    },
    [updateCreationState, streamWithFallback, handleStreamComplete, startTokenFlush, stopTokenFlush],
  );

  // ---------------------------------------------------------------------------
  // sendCreationResponse
  // ---------------------------------------------------------------------------
  const sendCreationResponse = useCallback(
    (playerInput: string) => {
      setError(null);
      setExtractionFailed(false);
      setStreamingText('');
      setIsStreaming(true);

      const currentState = creationStateRef.current;
      const { updatedState, aiPrompt } = processExchange(currentState, playerInput);
      updateCreationState(updatedState);
      lastAiPromptRef.current = aiPrompt;

      const stateSnapshot = updatedState;
      const maxTokens = getMaxTokensForPhase(updatedState.phase);

      // Reset token buffer and full text tracker
      tokenBufferRef.current = '';
      fullTextRef.current = '';
      startTokenFlush();

      streamWithFallback(systemPromptRef.current, aiPrompt, {
        onToken: (token: string) => {
          tokenBufferRef.current += token;
          fullTextRef.current += token;
        },
        onComplete: (fullText: string) => {
          handleStreamComplete(fullText, stateSnapshot);
        },
        onError: (err: Error) => {
          stopTokenFlush();
          setIsStreaming(false);
          setError(`Erro ao receber resposta do narrador. Tente novamente. (${err.message})`);
        },
      }, maxTokens);
    },
    [updateCreationState, streamWithFallback, handleStreamComplete, startTokenFlush, stopTokenFlush],
  );

  // ---------------------------------------------------------------------------
  // retryExtraction — re-attempt [CHAR_DATA] extraction after failure
  // ---------------------------------------------------------------------------
  const retryExtraction = useCallback(() => {
    setError(null);
    setExtractionFailed(false);
    setStreamingText('');
    setIsStreaming(true);

    const currentState = creationStateRef.current;
    const stateSnapshot = currentState;

    // Build a retry prompt that explicitly asks for the [CHAR_DATA] block
    const retryPrompt = [
      lastAiPromptRef.current,
      '',
      '[INSTRUÇÃO ADICIONAL: REENVIO]',
      'A resposta anterior não incluiu o bloco [CHAR_DATA] corretamente.',
      'Por favor, inclua o bloco [CHAR_DATA] com todos os 11 campos obrigatórios:',
      'class, race, stats, inventory, backstory, backstory_summary, narrative_description, portrait_prompt, saving_throws, skills.',
      'O bloco deve estar entre [CHAR_DATA] e [/CHAR_DATA] com JSON válido.',
    ].join('\n');

    const maxTokens = 1200; // Needs room for full [CHAR_DATA] JSON

    // Reset token buffer and full text tracker
    tokenBufferRef.current = '';
    fullTextRef.current = '';
    startTokenFlush();

    streamWithFallback(systemPromptRef.current, retryPrompt, {
      onToken: (token: string) => {
        tokenBufferRef.current += token;
        fullTextRef.current += token;
      },
      onComplete: (fullText: string) => {
        handleStreamComplete(fullText, stateSnapshot);
      },
      onError: (err: Error) => {
        stopTokenFlush();
        setIsStreaming(false);
        setError(`Erro ao tentar novamente. (${err.message})`);
      },
    }, maxTokens);
  }, [streamWithFallback, handleStreamComplete, startTokenFlush, stopTokenFlush]);

  // ---------------------------------------------------------------------------
  // finalizeWithName
  // ---------------------------------------------------------------------------
  const finalizeWithName = useCallback(
    async (name: string): Promise<Character> => {
      const playerId = getPlayerId();
      if (!playerId) {
        throw new Error('Jogador não identificado. Reinicie o aplicativo.');
      }

      const currentState = creationStateRef.current;
      const campaignId = campaignIdRef.current;

      if (!campaignId) {
        throw new Error('Campanha não identificada. Reinicie a criação do personagem.');
      }

      try {
        const characterData = buildCharacterFromCreation(
          currentState,
          name,
          campaignId,
          playerId,
        );

        // buildCharacterFromCreation returns Omit<Character, 'created_at'> which includes id: ''
        // CharacterRepository.create expects Omit<Character, 'id' | 'created_at'>
        const { id: _id, ...dataWithoutId } = characterData;

        const savedCharacter = characters.create(dataWithoutId);
        trackEvent(getDatabase(), 'character_created', {
          class: savedCharacter.class,
          race: savedCharacter.race,
        });

        setCharacter(savedCharacter);
        setNarrativeSheet(formatNarrativeSheet(savedCharacter));
        setTechnicalSheet(formatTechnicalSheet(savedCharacter));
        setIsCreating(false);

        return savedCharacter;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);
        setError(`Erro ao salvar personagem. (${message})`);
        throw new Error(`Erro ao salvar personagem. (${message})`);
      }
    },
    [characters, getPlayerId],
  );

  // ---------------------------------------------------------------------------
  // generateCharacterPortrait
  // ---------------------------------------------------------------------------
  const generateCharacterPortrait = useCallback(
    async (targetCharacter: Character): Promise<string | null> => {
      setError(null);
      setIsGeneratingPortrait(true);

      try {
        const prompt: PortraitPrompt = {
          physical_description: targetCharacter.portrait_prompt,
          equipment: targetCharacter.inventory
            .map((item) => item.name)
            .join(', '),
          expression: 'determined, heroic',
          style_tokens: [],
          seed: targetCharacter.portrait_seed,
        };

        const path = await generatePortrait(prompt);

        if (path) {
          characters.updatePortrait(targetCharacter.id, path);
          setPortraitPath(path);

          // Update local character state if it matches
          setCharacter((prev) => {
            if (prev && prev.id === targetCharacter.id) {
              return { ...prev, portrait_path: path };
            }
            return prev;
          });
        }

        setIsGeneratingPortrait(false);
        return path;
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);
        setError(`Erro ao gerar retrato do personagem. (${message})`);
        setIsGeneratingPortrait(false);
        return null;
      }
    },
    [characters],
  );

  // ---------------------------------------------------------------------------
  // loadCharacter
  // ---------------------------------------------------------------------------
  const loadCharacter = useCallback(
    (campaignId: string) => {
      setError(null);

      try {
        const characterList = characters.getByCampaignId(campaignId);

        if (characterList.length === 0) {
          setCharacter(null);
          setNarrativeSheet(null);
          setTechnicalSheet(null);
          return;
        }

        // Load the first character for this campaign
        const loaded = characterList[0];
        if (!loaded) {
          setCharacter(null);
          setNarrativeSheet(null);
          setTechnicalSheet(null);
          return;
        }

        setCharacter(loaded);
        setNarrativeSheet(formatNarrativeSheet(loaded));
        setTechnicalSheet(formatTechnicalSheet(loaded));
        setPortraitPath(loaded.portrait_path);
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : String(err);
        setError(`Erro ao carregar personagem. (${message})`);
      }
    },
    [characters],
  );

  return {
    // Creation flow
    creationState,
    isCreating,
    streamingText,
    isStreaming,
    startCreation,
    sendCreationResponse,
    finalizeWithName,

    // Retry
    extractionFailed,
    retryExtraction,

    // Portrait
    isGeneratingPortrait,
    portraitPath,
    generateCharacterPortrait,

    // Character sheet
    character,
    narrativeSheet,
    technicalSheet,
    loadCharacter,

    // Error
    error,
  };
}
