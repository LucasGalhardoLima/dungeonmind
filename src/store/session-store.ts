import { create } from 'zustand';
import type { Session, Exchange } from '../types/entities';
import type { DiceRequest } from '../types/dice';
import type { ScenePrompt } from '../types/scene-prompt';
import type { DeathSaveState } from '../engine/mechanics/death-saves';

interface SessionState {
  activeSession: Session | null;
  recentExchanges: Exchange[];
  streamingText: string;
  isStreaming: boolean;
  diceRequest: DiceRequest | null;
  currentScenePrompt: ScenePrompt | null;
  currentSceneImagePath: string | null;
  suggestedActions: string[];
  deathSaveState: DeathSaveState;

  setActiveSession(session: Session | null): void;
  setRecentExchanges(exchanges: Exchange[]): void;
  addExchange(exchange: Exchange): void;
  setStreamingText(text: string): void;
  appendStreamingText(chunk: string): void;
  setIsStreaming(streaming: boolean): void;
  setDiceRequest(request: DiceRequest | null): void;
  setCurrentScenePrompt(prompt: ScenePrompt | null): void;
  setCurrentSceneImagePath(path: string | null): void;
  setSuggestedActions(actions: string[]): void;
  setDeathSaveState(state: DeathSaveState): void;
  reset(): void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSession: null,
  recentExchanges: [],
  streamingText: '',
  isStreaming: false,
  diceRequest: null,
  currentScenePrompt: null,
  currentSceneImagePath: null,
  suggestedActions: [],
  deathSaveState: { active: false, successes: 0, failures: 0 },

  setActiveSession(session: Session | null) {
    set({ activeSession: session });
  },

  setRecentExchanges(exchanges: Exchange[]) {
    set({ recentExchanges: exchanges });
  },

  addExchange(exchange: Exchange) {
    set((state) => ({
      recentExchanges: [...state.recentExchanges, exchange].slice(-20),
    }));
  },

  setStreamingText(text: string) {
    set({ streamingText: text });
  },

  appendStreamingText(chunk: string) {
    set((state) => ({ streamingText: state.streamingText + chunk }));
  },

  setIsStreaming(streaming: boolean) {
    set({ isStreaming: streaming });
  },

  setDiceRequest(request: DiceRequest | null) {
    set({ diceRequest: request });
  },

  setCurrentScenePrompt(prompt: ScenePrompt | null) {
    set({ currentScenePrompt: prompt });
  },

  setCurrentSceneImagePath(path: string | null) {
    set({ currentSceneImagePath: path });
  },

  setSuggestedActions(actions: string[]) {
    set({ suggestedActions: actions });
  },

  setDeathSaveState(deathSaveState: DeathSaveState) {
    set({ deathSaveState });
  },

  reset() {
    set({
      activeSession: null,
      recentExchanges: [],
      streamingText: '',
      isStreaming: false,
      diceRequest: null,
      currentScenePrompt: null,
      currentSceneImagePath: null,
      suggestedActions: [],
      deathSaveState: { active: false, successes: 0, failures: 0 },
    });
  },
}));
