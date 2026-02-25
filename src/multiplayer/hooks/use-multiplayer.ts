import { useCallback, useEffect, useRef } from 'react';
import { useMultiplayerStore } from '../../store/multiplayer-store';
import { SessionManager } from '../session-manager';
import { SyncEngine } from '../sync-engine';
import { sendEvent, processIncomingEvent } from '../event-broadcaster';
import type { SessionEvent } from '../../types/session-events';

type EventHandler = (event: SessionEvent) => void;

interface UseMultiplayerReturn {
  createSession(playerId: string, playerName: string, campaignId: string): Promise<string>;
  joinSession(code: string, playerId: string, playerName: string): Promise<void>;
  leaveSession(playerId: string): Promise<void>;
  broadcastEvent(event: Omit<SessionEvent, 'sequence'>): void;
  onEvent(handler: EventHandler): () => void;
  isConnected: boolean;
  partnerConnected: boolean;
  partnerName: string | null;
  sessionCode: string | null;
  activePlayerId: string | null;
}

export function useMultiplayer(): UseMultiplayerReturn {
  const store = useMultiplayerStore();

  const managerRef = useRef<SessionManager | null>(null);
  const syncRef = useRef<SyncEngine | null>(null);
  const handlersRef = useRef<Set<EventHandler>>(new Set());
  const lastSequenceRef = useRef<number>(0);

  // Lazily initialise the session manager once.
  if (managerRef.current === null) {
    managerRef.current = new SessionManager();
  }

  /**
   * Central handler for all incoming realtime payloads.
   * Validates, de-duplicates, dispatches to registered handlers,
   * and updates store state for well-known meta-events.
   */
  const handleIncomingPayload = useCallback(
    (payload: Record<string, unknown>) => {
      const result = processIncomingEvent(payload, lastSequenceRef.current);
      if (!result) return;

      const { event, isNew } = result;
      if (!isNew) return;

      // Advance local sequence watermark.
      lastSequenceRef.current = event.sequence;

      // Handle well-known meta-events to keep store in sync.
      if (event.type === 'player_connected') {
        const partnerId = typeof payload['player_id'] === 'string'
          ? payload['player_id']
          : null;
        const partnerNameValue = typeof payload['player_name'] === 'string'
          ? payload['player_name']
          : null;
        if (partnerId) {
          store.setPartner(partnerId, partnerNameValue);
        }
        store.setPartnerConnected(true);
      }

      if (event.type === 'player_disconnected') {
        store.setPartnerConnected(false);
      }

      if (event.type === 'turn_change') {
        const activeId = typeof payload['active_player_id'] === 'string'
          ? payload['active_player_id']
          : null;
        store.setActivePlayerId(activeId);
      }

      // Dispatch to all registered external handlers.
      for (const handler of handlersRef.current) {
        handler(event);
      }
    },
    [store],
  );

  // ------------------------------------------------------------------
  // Session lifecycle methods
  // ------------------------------------------------------------------

  const createSession = useCallback(
    async (playerId: string, playerName: string, campaignId: string): Promise<string> => {
      const manager = managerRef.current;
      if (!manager) throw new Error('SessionManager not initialised');

      store.setConnectionState('connecting');

      const code = await manager.createSession(
        playerId,
        playerName,
        campaignId,
        handleIncomingPayload,
      );

      store.setSessionCode(code);
      store.setConnectionState('connected');
      store.setActivePlayerId(playerId);

      // Start sync as host.
      const sync = new SyncEngine(true);
      syncRef.current = sync;
      sync.startPeriodicSync(
        code,
        () => '{}', // state document placeholder — filled in by higher layers
        () => '[]', // recent history placeholder
      );

      return code;
    },
    [store, handleIncomingPayload],
  );

  const joinSession = useCallback(
    async (code: string, playerId: string, playerName: string): Promise<void> => {
      const manager = managerRef.current;
      if (!manager) throw new Error('SessionManager not initialised');

      store.setConnectionState('connecting');

      await manager.joinSession(code, playerId, playerName, handleIncomingPayload);

      store.setSessionCode(code);
      store.setConnectionState('connected');

      // Start sync as non-host (no periodic writes, but keeps the ref for cleanup).
      const sync = new SyncEngine(false);
      syncRef.current = sync;
    },
    [store, handleIncomingPayload],
  );

  const leaveSession = useCallback(
    async (playerId: string): Promise<void> => {
      const manager = managerRef.current;
      if (!manager) return;

      // Stop sync before leaving.
      if (syncRef.current) {
        syncRef.current.stopPeriodicSync();
        syncRef.current = null;
      }

      await manager.leaveSession(playerId);
      store.reset();
    },
    [store],
  );

  // ------------------------------------------------------------------
  // Event broadcasting & subscription
  // ------------------------------------------------------------------

  const broadcastEvent = useCallback(
    (event: Omit<SessionEvent, 'sequence'>): void => {
      const manager = managerRef.current;
      if (!manager) return;

      const channel = manager.getChannel();
      if (!channel) return;

      sendEvent(channel, event, () => store.incrementSequence());
    },
    [store],
  );

  const onEvent = useCallback(
    (handler: EventHandler): (() => void) => {
      handlersRef.current.add(handler);
      return () => {
        handlersRef.current.delete(handler);
      };
    },
    [],
  );

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------

  useEffect(() => {
    return () => {
      // Stop sync engine.
      if (syncRef.current) {
        syncRef.current.stopPeriodicSync();
        syncRef.current = null;
      }

      // Leave session (fire-and-forget since we are unmounting).
      const manager = managerRef.current;
      const { sessionCode: currentCode } = useMultiplayerStore.getState();
      if (manager && currentCode) {
        // We cannot reliably await inside a cleanup function, so void the promise.
        void manager.leaveSession('').catch(() => {
          // Swallow errors during teardown.
        });
      }

      // Reset store so UI reflects disconnected state.
      useMultiplayerStore.getState().reset();
    };
  }, []);

  // ------------------------------------------------------------------
  // Return value
  // ------------------------------------------------------------------

  return {
    createSession,
    joinSession,
    leaveSession,
    broadcastEvent,
    onEvent,
    isConnected: store.connectionState === 'connected',
    partnerConnected: store.partnerConnected,
    partnerName: store.partnerName,
    sessionCode: store.sessionCode,
    activePlayerId: store.activePlayerId,
  };
}
