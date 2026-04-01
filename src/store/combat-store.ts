import { create } from 'zustand';
import type { CombatParticipant, CombatLogEntry, CombatLogEntryType } from '../types/combat';

interface CombatStoreState {
  inCombat: boolean;
  round: number;
  participants: CombatParticipant[];
  currentTurnIndex: number;
  log: CombatLogEntry[];
  combatLogExpanded: boolean;

  startCombat(participants: CombatParticipant[]): void;
  endCombat(): void;
  advanceTurn(): void;
  nextRound(): void;
  addLogEntry(entry: Omit<CombatLogEntry, 'id' | 'timestamp'>): void;
  updateParticipantHP(participantId: string, hpCurrent: number): void;
  addCondition(participantId: string, condition: string): void;
  removeCondition(participantId: string, condition: string): void;
  removeParticipant(participantId: string): void;
  setCombatLogExpanded(expanded: boolean): void;
  reset(): void;
}

let logIdCounter = 0;
function nextLogId(): string {
  logIdCounter += 1;
  return `clog-${logIdCounter}`;
}

export const useCombatStore = create<CombatStoreState>((set, get) => ({
  inCombat: false,
  round: 0,
  participants: [],
  currentTurnIndex: 0,
  log: [],
  combatLogExpanded: false,

  startCombat(participants: CombatParticipant[]) {
    // Sort by initiative descending
    const sorted = [...participants].sort((a, b) => b.initiative - a.initiative);
    // Mark the first participant as active
    const withActive = sorted.map((p, i) => ({ ...p, isActive: i === 0 }));

    set({
      inCombat: true,
      round: 1,
      participants: withActive,
      currentTurnIndex: 0,
      log: [
        {
          id: nextLogId(),
          round: 1,
          type: 'combat_start',
          actor: 'System',
          description: 'Combat begins!',
          timestamp: new Date().toISOString(),
        },
        {
          id: nextLogId(),
          round: 1,
          type: 'round_start',
          actor: 'System',
          description: 'Round 1',
          timestamp: new Date().toISOString(),
        },
      ],
    });
  },

  endCombat() {
    const state = get();
    const endEntry: CombatLogEntry = {
      id: nextLogId(),
      round: state.round,
      type: 'combat_end',
      actor: 'System',
      description: 'Combat ends.',
      timestamp: new Date().toISOString(),
    };
    set({
      inCombat: false,
      round: 0,
      participants: [],
      currentTurnIndex: 0,
      log: [...state.log, endEntry],
    });
  },

  advanceTurn() {
    set((state) => {
      if (!state.inCombat || state.participants.length === 0) return state;

      const nextIndex = (state.currentTurnIndex + 1) % state.participants.length;
      const updatedParticipants = state.participants.map((p, i) => ({
        ...p,
        isActive: i === nextIndex,
      }));

      // If we wrapped around, advance the round
      if (nextIndex === 0) {
        const newRound = state.round + 1;
        return {
          currentTurnIndex: nextIndex,
          participants: updatedParticipants,
          round: newRound,
          log: [
            ...state.log,
            {
              id: nextLogId(),
              round: newRound,
              type: 'round_start' as CombatLogEntryType,
              actor: 'System',
              description: `Round ${newRound}`,
              timestamp: new Date().toISOString(),
            },
          ],
        };
      }

      return {
        currentTurnIndex: nextIndex,
        participants: updatedParticipants,
      };
    });
  },

  nextRound() {
    set((state) => {
      if (!state.inCombat) return state;
      const newRound = state.round + 1;
      const updatedParticipants = state.participants.map((p, i) => ({
        ...p,
        isActive: i === 0,
      }));
      return {
        round: newRound,
        currentTurnIndex: 0,
        participants: updatedParticipants,
        log: [
          ...state.log,
          {
            id: nextLogId(),
            round: newRound,
            type: 'round_start' as CombatLogEntryType,
            actor: 'System',
            description: `Round ${newRound}`,
            timestamp: new Date().toISOString(),
          },
        ],
      };
    });
  },

  addLogEntry(entry: Omit<CombatLogEntry, 'id' | 'timestamp'>) {
    set((state) => ({
      log: [
        ...state.log,
        {
          ...entry,
          id: nextLogId(),
          timestamp: new Date().toISOString(),
        },
      ],
    }));
  },

  updateParticipantHP(participantId: string, hpCurrent: number) {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId ? { ...p, hpCurrent } : p,
      ),
    }));
  },

  addCondition(participantId: string, condition: string) {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId && !p.conditions.includes(condition)
          ? { ...p, conditions: [...p.conditions, condition] }
          : p,
      ),
    }));
  },

  removeCondition(participantId: string, condition: string) {
    set((state) => ({
      participants: state.participants.map((p) =>
        p.id === participantId
          ? { ...p, conditions: p.conditions.filter((c) => c !== condition) }
          : p,
      ),
    }));
  },

  removeParticipant(participantId: string) {
    set((state) => {
      const filtered = state.participants.filter((p) => p.id !== participantId);
      const newIndex = Math.min(state.currentTurnIndex, Math.max(0, filtered.length - 1));
      return {
        participants: filtered.map((p, i) => ({ ...p, isActive: i === newIndex })),
        currentTurnIndex: newIndex,
      };
    });
  },

  setCombatLogExpanded(expanded: boolean) {
    set({ combatLogExpanded: expanded });
  },

  reset() {
    set({
      inCombat: false,
      round: 0,
      participants: [],
      currentTurnIndex: 0,
      log: [],
      combatLogExpanded: false,
    });
  },
}));
