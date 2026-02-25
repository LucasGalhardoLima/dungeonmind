import { useCallback, useRef } from 'react';
import { useSessionStore } from '../../store/session-store';
import { useCampaignStore } from '../../store/campaign-store';
import { useRepository } from '../../persistence/hooks/use-repository';
import { sendAction } from '../dm-engine';
import { parseResponse } from '../response-parser';
import { npcToStateNPC, generateSessionSummary } from '../state-document';
import type { ParsedResponse, NarrativeError } from '../../types/session-events';
import type { DiceRequest } from '../../types/dice';
import type { ScenePrompt } from '../../types/scene-prompt';
import type { StateDocument } from '../../types/state-document';
import { EMPTY_STATE_DOCUMENT } from '../../types/state-document';
import { generateId, nowISO } from '../../persistence/database';
import {
  scheduleLocalNotification,
  generateDeepLink,
} from '../../notifications/notification-service';
import type { RateLimitChecker } from '../../notifications/notification-service';
import { buildNotificationContent } from '../../notifications/notification-categories';

interface UseDMEngineReturn {
  sendPlayerAction: (text: string) => Promise<void>;
  submitDiceResult: (result: number) => Promise<void>;
  endSession: () => Promise<string | null>;
  streamingText: string;
  isStreaming: boolean;
  diceRequest: DiceRequest | null;
  scenePrompt: ScenePrompt | null;
  suggestedActions: string[];
  error: NarrativeError | null;
}

export function useDMEngine(): UseDMEngineReturn {
  const repos = useRepository();
  const errorRef = useRef<NarrativeError | null>(null);

  const streamingText = useSessionStore((s) => s.streamingText);
  const isStreaming = useSessionStore((s) => s.isStreaming);
  const diceRequest = useSessionStore((s) => s.diceRequest);
  const currentScenePrompt = useSessionStore((s) => s.currentScenePrompt);
  const suggestedActions = useSessionStore((s) => s.suggestedActions);
  const recentExchanges = useSessionStore((s) => s.recentExchanges);
  const activeSession = useSessionStore((s) => s.activeSession);

  const setStreamingText = useSessionStore((s) => s.setStreamingText);
  const appendStreamingText = useSessionStore((s) => s.appendStreamingText);
  const setIsStreaming = useSessionStore((s) => s.setIsStreaming);
  const setDiceRequest = useSessionStore((s) => s.setDiceRequest);
  const setCurrentScenePrompt = useSessionStore((s) => s.setCurrentScenePrompt);
  const setSuggestedActions = useSessionStore((s) => s.setSuggestedActions);
  const addExchange = useSessionStore((s) => s.addExchange);

  const selectedCampaign = useCampaignStore((s) => s.getSelectedCampaign());

  const sendPlayerAction = useCallback(
    async (text: string) => {
      if (!selectedCampaign || !activeSession) return;

      errorRef.current = null;
      setStreamingText('');
      setIsStreaming(true);
      setDiceRequest(null);
      setCurrentScenePrompt(null);
      setSuggestedActions([]);

      // Save player exchange to SQLite
      const playerSequence = repos.exchanges.getNextSequence(activeSession.id);
      const playerExchange = repos.exchanges.create({
        session_id: activeSession.id,
        campaign_id: selectedCampaign.id,
        role: 'player',
        content: text,
        metadata: null,
        sequence: playerSequence,
      });
      addExchange(playerExchange);

      const characters = repos.characters.getByCampaignId(selectedCampaign.id);
      const character = characters[0] ?? null;

      let stateDoc: StateDocument;
      try {
        stateDoc = JSON.parse(selectedCampaign.state_document) as StateDocument;
      } catch {
        stateDoc = EMPTY_STATE_DOCUMENT;
      }

      // Enrich state document with live NPC data from SQLite
      const campaignNPCs = repos.npcs.getByCampaignId(selectedCampaign.id);
      if (campaignNPCs.length > 0) {
        stateDoc = {
          ...stateDoc,
          npc_registry: campaignNPCs.map(npcToStateNPC),
        };
      }

      await sendAction(
        {
          campaign: selectedCampaign,
          character,
          stateDocument: stateDoc,
          recentExchanges,
          playerAction: text,
        },
        {
          onToken(token: string) {
            appendStreamingText(token);
          },
          onComplete(response: ParsedResponse) {
            // Save DM exchange to SQLite
            const dmSequence = repos.exchanges.getNextSequence(activeSession.id);
            const dmExchange = repos.exchanges.create({
              session_id: activeSession.id,
              campaign_id: selectedCampaign.id,
              role: 'dm',
              content: response.narration,
              metadata: JSON.stringify({
                dice_request: response.dice_request,
                scene_change: response.scene_change,
                character_updates: response.character_updates,
                npc_updates: response.npc_updates,
              }),
              sequence: dmSequence,
            });
            addExchange(dmExchange);

            if (response.suggested_actions) {
              setSuggestedActions(response.suggested_actions);
            }

            // Apply character updates
            if (response.character_updates && character) {
              if (response.character_updates.hp_delta) {
                const newHP = Math.max(
                  0,
                  character.hp_current + response.character_updates.hp_delta
                );
                repos.characters.updateHP(
                  character.id,
                  newHP,
                  character.hp_max
                );
              }
              if (response.character_updates.xp_delta) {
                repos.characters.addXP(
                  character.id,
                  response.character_updates.xp_delta
                );
              }
            }

            // Apply NPC updates
            if (response.npc_updates) {
              for (const npcUpdate of response.npc_updates) {
                const existingNPC = repos.npcs.getByName(
                  selectedCampaign.id,
                  npcUpdate.name
                );
                if (existingNPC) {
                  repos.npcs.updateEmotionalState(existingNPC.id, {
                    trust: npcUpdate.trust_delta,
                    fear: npcUpdate.fear_delta,
                    anger: npcUpdate.anger_delta,
                    gratitude: npcUpdate.gratitude_delta,
                  });
                  if (npcUpdate.relationship_change) {
                    repos.npcs.updateInteraction(
                      existingNPC.id,
                      activeSession.id,
                      npcUpdate.relationship_change
                    );
                  }
                } else {
                  repos.npcs.create({
                    campaign_id: selectedCampaign.id,
                    name: npcUpdate.name,
                    description: '',
                    trust: 50 + (npcUpdate.trust_delta ?? 0),
                    fear: Math.max(0, npcUpdate.fear_delta ?? 0),
                    anger: Math.max(0, npcUpdate.anger_delta ?? 0),
                    gratitude: Math.max(0, npcUpdate.gratitude_delta ?? 0),
                    last_interaction_summary: npcUpdate.relationship_change ?? '',
                    last_interaction_session_id: activeSession.id,
                  });
                }
              }
            }

            repos.campaigns.touchLastPlayed(selectedCampaign.id);
            setIsStreaming(false);
          },
          onDiceRequest(request: DiceRequest) {
            setDiceRequest(request);
          },
          onSceneChange(prompt: ScenePrompt) {
            setCurrentScenePrompt(prompt);
          },
          onError(error: NarrativeError) {
            errorRef.current = error;
            setIsStreaming(false);
          },
        }
      );
    },
    [
      selectedCampaign,
      activeSession,
      recentExchanges,
      repos,
      setStreamingText,
      appendStreamingText,
      setIsStreaming,
      setDiceRequest,
      setCurrentScenePrompt,
      setSuggestedActions,
      addExchange,
    ]
  );

  const submitDiceResult = useCallback(
    async (result: number) => {
      if (!selectedCampaign || !activeSession || !diceRequest) return;

      // Save dice result as system exchange
      const sequence = repos.exchanges.getNextSequence(activeSession.id);
      repos.exchanges.create({
        session_id: activeSession.id,
        campaign_id: selectedCampaign.id,
        role: 'system',
        content: `Resultado: ${result} (${diceRequest.dice_type})`,
        metadata: JSON.stringify({
          type: 'dice_result',
          dice_type: diceRequest.dice_type,
          result,
          is_critical: diceRequest.dice_type === 'd20' && (result === 20 || result === 1),
        }),
        sequence,
      });

      setDiceRequest(null);

      // Continue narration with dice result
      await sendPlayerAction(
        `[RESULTADO DO DADO: ${result} no ${diceRequest.dice_type} para ${diceRequest.context}]`
      );
    },
    [selectedCampaign, activeSession, diceRequest, repos, setDiceRequest, sendPlayerAction]
  );

  const endSession = useCallback(
    async (): Promise<string | null> => {
      if (!selectedCampaign || !activeSession) return null;

      const exchanges = repos.exchanges.getBySessionId(activeSession.id);
      if (exchanges.length === 0) return null;

      // Generate narrative session summary
      const summary = await generateSessionSummary(exchanges, selectedCampaign.name);

      // Save summary to session
      repos.sessions.updateSummary(activeSession.id, summary);

      // Schedule session summary notification
      try {
        const rateLimiter: RateLimitChecker = {
          getCountToday: (campaignId: string) =>
            repos.notificationLogs.getCountToday(campaignId),
          log: (campaignId: string, category) =>
            repos.notificationLogs.log(campaignId, category),
          getLastByCategory: (campaignId: string, category) =>
            repos.notificationLogs.getLastByCategory(campaignId, category),
        };

        const content = buildNotificationContent({
          category: 'session_summary',
          params: { campaignName: selectedCampaign.name },
        });

        const deepLinkUrl = generateDeepLink(selectedCampaign.id, 'history');

        await scheduleLocalNotification({
          title: content.title,
          body: content.body,
          category: 'session_summary',
          campaignId: selectedCampaign.id,
          deepLinkUrl,
          rateLimiter,
        });
      } catch {
        // Notification scheduling failure is non-critical
      }

      return summary;
    },
    [selectedCampaign, activeSession, repos]
  );

  return {
    sendPlayerAction,
    submitDiceResult,
    endSession,
    streamingText,
    isStreaming,
    diceRequest,
    scenePrompt: currentScenePrompt,
    suggestedActions,
    error: errorRef.current,
  };
}
