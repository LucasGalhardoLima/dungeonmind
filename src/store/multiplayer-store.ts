import { create } from 'zustand';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface MultiplayerState {
  connectionState: ConnectionState;
  sessionCode: string | null;
  partnerId: string | null;
  partnerName: string | null;
  partnerConnected: boolean;
  activePlayerId: string | null;
  lastSequenceNumber: number;

  setConnectionState(state: ConnectionState): void;
  setSessionCode(code: string | null): void;
  setPartner(id: string | null, name: string | null): void;
  setPartnerConnected(connected: boolean): void;
  setActivePlayerId(id: string | null): void;
  incrementSequence(): number;
  reset(): void;
}

export const useMultiplayerStore = create<MultiplayerState>((set, get) => ({
  connectionState: 'disconnected',
  sessionCode: null,
  partnerId: null,
  partnerName: null,
  partnerConnected: false,
  activePlayerId: null,
  lastSequenceNumber: 0,

  setConnectionState(state: ConnectionState) {
    set({ connectionState: state });
  },

  setSessionCode(code: string | null) {
    set({ sessionCode: code });
  },

  setPartner(id: string | null, name: string | null) {
    set({ partnerId: id, partnerName: name });
  },

  setPartnerConnected(connected: boolean) {
    set({ partnerConnected: connected });
  },

  setActivePlayerId(id: string | null) {
    set({ activePlayerId: id });
  },

  incrementSequence() {
    const next = get().lastSequenceNumber + 1;
    set({ lastSequenceNumber: next });
    return next;
  },

  reset() {
    set({
      connectionState: 'disconnected',
      sessionCode: null,
      partnerId: null,
      partnerName: null,
      partnerConnected: false,
      activePlayerId: null,
      lastSequenceNumber: 0,
    });
  },
}));
