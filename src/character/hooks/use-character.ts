import { useState, useCallback, useRef } from 'react';
import type { Character, AdventureType } from '../../types/entities';
import type { PortraitPrompt } from '../../types/scene-prompt';
import type { NarrativeSheet, TechnicalSheet } from '../character-sheet';
import type { CreationState } from '../creation-flow';
import type { StreamCallbacks } from '../../engine/streaming';
import {
  createInitialState,
  getCreationSystemPrompt,
  processExchange,
  parseCharacterData,
  extractSuggestionFromResponse,
  buildCharacterFromCreation,
} from '../creation-flow';
import { generatePortrait } from '../portrait-generator';
import { formatNarrativeSheet, formatTechnicalSheet } from '../character-sheet';
import { streamCompletion, streamCompletionGemini } from '../../engine/streaming';
import { useRepository } from '../../persistence/hooks/use-repository';
import { useSettingsStore } from '../../store/settings-store';

export interface UseCharacterReturn {
  // Creation flow
  creationState: CreationState;
  isCreating: boolean;
  streamingText: string;
  isStreaming: boolean;
  startCreation: (campaignId: string, world: string, adventureType: AdventureType) => void;
  sendCreationResponse: (playerInput: string) => void;
  finalizeWithName: (name: string) => Promise<Character>;

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

  // Keep the ref in sync with state
  const updateCreationState = useCallback((newState: CreationState) => {
    creationStateRef.current = newState;
    setCreationState(newState);
  }, []);

  // ---------------------------------------------------------------------------
  // Streaming helper: try Anthropic first, fallback to Gemini
  // ---------------------------------------------------------------------------
  const streamWithFallback = useCallback(
    (systemPrompt: string, userMessage: string, callbacks: StreamCallbacks): void => {
      streamCompletion(systemPrompt, userMessage, {
        onToken: callbacks.onToken,
        onComplete: callbacks.onComplete,
        onError: () => {
          // Anthropic failed — fallback to Gemini
          streamCompletionGemini(systemPrompt, userMessage, callbacks).catch(
            (geminiError: unknown) => {
              const message =
                geminiError instanceof Error
                  ? geminiError.message
                  : String(geminiError);
              callbacks.onError(new Error(message));
            },
          );
        },
      }).catch((anthropicError: unknown) => {
        // streamCompletion itself threw (not via onError) — try Gemini
        streamCompletionGemini(systemPrompt, userMessage, callbacks).catch(
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
      setIsStreaming(false);

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
        }
      }

      updateCreationState(updatedState);
    },
    [updateCreationState],
  );

  // ---------------------------------------------------------------------------
  // startCreation
  // ---------------------------------------------------------------------------
  const startCreation = useCallback(
    (campaignId: string, world: string, adventureType: AdventureType) => {
      setError(null);
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

      const stateSnapshot = updatedState;

      streamWithFallback(systemPrompt, aiPrompt, {
        onToken: (token: string) => {
          setStreamingText((prev) => prev + token);
        },
        onComplete: (fullText: string) => {
          handleStreamComplete(fullText, stateSnapshot);
        },
        onError: (err: Error) => {
          setIsStreaming(false);
          setError(`Erro ao conectar com o narrador. Tente novamente. (${err.message})`);
        },
      });
    },
    [updateCreationState, streamWithFallback, handleStreamComplete],
  );

  // ---------------------------------------------------------------------------
  // sendCreationResponse
  // ---------------------------------------------------------------------------
  const sendCreationResponse = useCallback(
    (playerInput: string) => {
      setError(null);
      setStreamingText('');
      setIsStreaming(true);

      const currentState = creationStateRef.current;
      const { updatedState, aiPrompt } = processExchange(currentState, playerInput);
      updateCreationState(updatedState);

      const stateSnapshot = updatedState;

      streamWithFallback(systemPromptRef.current, aiPrompt, {
        onToken: (token: string) => {
          setStreamingText((prev) => prev + token);
        },
        onComplete: (fullText: string) => {
          handleStreamComplete(fullText, stateSnapshot);
        },
        onError: (err: Error) => {
          setIsStreaming(false);
          setError(`Erro ao receber resposta do narrador. Tente novamente. (${err.message})`);
        },
      });
    },
    [updateCreationState, streamWithFallback, handleStreamComplete],
  );

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
