import { useCallback, useEffect, useRef } from 'react';
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
import { generateId, nowISO, getDatabase } from '../../persistence/database';
import { snapshotSessionMetrics } from '../../feedback/session-analytics';
import { trackEvent } from '../../analytics/analytics-service';
import { calculateLevelUp } from '../mechanics/leveling';
import { calculateAC } from '../mechanics/ac-calculator';
import { applyShortRest, applyLongRest } from '../mechanics/rest-recovery';
import { castSpell, recoverAllSpellSlots } from '../mechanics/spell-slots';
import { recoverClassAbilities } from '../mechanics/class-abilities';
import { classifyNPCTier, getInteractionBudget } from '../mechanics/npc-tiering';
import { useCombatTracker } from './use-combat-tracker';
import {
  scheduleLocalNotification,
  generateDeepLink,
} from '../../notifications/notification-service';
import type { RateLimitChecker } from '../../notifications/notification-service';
import { buildNotificationContent } from '../../notifications/notification-categories';

interface UseDMEngineReturn {
  sendPlayerAction: (text: string) => Promise<void>;
  retryLastAction: () => void;
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
  const lastPlayerActionRef = useRef<string | null>(null);

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

  // Combat tracker integration
  const { processResponse: processCombatResponse } = useCombatTracker();

  // Token throttle buffer: accumulate tokens and flush at ~30fps
  const tokenBufferRef = useRef('');
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTokenFlush = useCallback(() => {
    if (flushTimerRef.current !== null) return;
    flushTimerRef.current = setInterval(() => {
      if (tokenBufferRef.current.length > 0) {
        const chunk = tokenBufferRef.current;
        tokenBufferRef.current = '';
        appendStreamingText(chunk);
      }
    }, 32);
  }, [appendStreamingText]);

  const stopTokenFlush = useCallback(() => {
    if (flushTimerRef.current !== null) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }
    // Flush any remaining buffered tokens
    if (tokenBufferRef.current.length > 0) {
      const remaining = tokenBufferRef.current;
      tokenBufferRef.current = '';
      appendStreamingText(remaining);
    }
  }, [appendStreamingText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (flushTimerRef.current !== null) {
        clearInterval(flushTimerRef.current);
      }
    };
  }, []);

  const sendPlayerAction = useCallback(
    async (text: string) => {
      if (!selectedCampaign || !activeSession) return;

      errorRef.current = null;
      lastPlayerActionRef.current = text;
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
      trackEvent(getDatabase(), 'exchange_sent', { campaign_id: selectedCampaign.id });

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

      // Enrich prompt with permanent memory data
      const activeQuests = repos.questLogs.getActive(selectedCampaign.id).map((q) => ({
        title: q.title,
        status: q.status,
        description: q.description,
      }));
      const recentDecisions = repos.playerDecisions.getRecent(selectedCampaign.id, 3).map((d) => ({
        description: d.description,
        consequence: d.consequence,
      }));

      // Build NPC interaction history with tiering
      const npcInteractionHistory: Record<string, string[]> = {};
      for (const npc of campaignNPCs) {
        const interactionCount = repos.npcInteractions.getCountByNPCId(npc.id);
        const hasQuest = repos.questLogs.getActive(selectedCampaign.id).some(
          (q) => q.giver_npc_id === npc.id,
        );
        const tier = classifyNPCTier(npc, interactionCount, hasQuest);
        const budget = getInteractionBudget(tier);
        const interactions = repos.npcInteractions.getByNPCId(npc.id, budget);
        if (interactions.length > 0) {
          npcInteractionHistory[npc.name] = interactions.map((i) => i.summary);
        }
      }

      startTokenFlush();

      await sendAction(
        {
          campaign: selectedCampaign,
          character,
          stateDocument: stateDoc,
          recentExchanges,
          playerAction: text,
          activeQuests,
          recentDecisions,
          npcInteractionHistory,
        },
        {
          onToken(token: string) {
            tokenBufferRef.current += token;
          },
          onComplete(response: ParsedResponse) {
            // 1. Flush remaining buffered tokens and stop the timer
            stopTokenFlush();

            // 2. Set streaming text to final clean narration so the streaming
            //    bubble matches the permanent bubble (no visible content change)
            setStreamingText(response.narration);

            // 3. Save DM exchange and add to store — permanent bubble appears
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

            // Apply rest
            if (response.rest && character) {
              const restResult = response.rest.type === 'long'
                ? applyLongRest(character)
                : applyShortRest(character);
              repos.characters.updateHP(character.id, restResult.newHPCurrent, character.hp_max);
              repos.characters.updateHitDice(character.id, character.hit_dice_total, restResult.newHitDiceSpent);
              if (restResult.spellSlotsRecovered && character.spell_slots) {
                repos.characters.updateSpellSlots(character.id, recoverAllSpellSlots(character.spell_slots));
              }
              const recoveredAbilities = recoverClassAbilities(character.class_abilities, character.class, response.rest.type);
              repos.characters.updateClassAbilities(character.id, recoveredAbilities);
              const restSeq = repos.exchanges.getNextSequence(activeSession.id);
              repos.exchanges.create({
                session_id: activeSession.id,
                campaign_id: selectedCampaign.id,
                role: 'system',
                content: restResult.summary,
                metadata: JSON.stringify({ type: 'rest', rest_type: response.rest.type }),
                sequence: restSeq,
              });
            }

            // Apply spell cast
            if (response.spell_cast && character?.spell_slots) {
              const updatedSlots = castSpell(character.spell_slots, response.spell_cast.slot_level);
              if (updatedSlots) {
                repos.characters.updateSpellSlots(character.id, updatedSlots);
              }
            }

            // Apply gold delta
            if (response.gold_delta && character) {
              repos.characters.addGold(character.id, response.gold_delta);
            }

            // Apply quest updates
            if (response.quest_update && activeSession) {
              const qu = response.quest_update;
              if (qu.action === 'add') {
                const giverNpc = qu.giver_npc
                  ? repos.npcs.getByName(selectedCampaign.id, qu.giver_npc)
                  : null;
                repos.questLogs.create({
                  campaign_id: selectedCampaign.id,
                  title: qu.title,
                  description: qu.description ?? '',
                  status: 'active',
                  giver_npc_id: giverNpc?.id ?? null,
                  created_session_id: activeSession.id,
                  completed_session_id: null,
                });
              } else {
                const quest = repos.questLogs.getByTitle(selectedCampaign.id, qu.title);
                if (quest) {
                  if (qu.action === 'complete') {
                    repos.questLogs.updateStatus(quest.id, 'completed', activeSession.id);
                  } else if (qu.action === 'fail') {
                    repos.questLogs.updateStatus(quest.id, 'failed', activeSession.id);
                  } else if (qu.action === 'progress' && qu.description) {
                    repos.questLogs.addEvent({
                      quest_id: quest.id,
                      session_id: activeSession.id,
                      description: qu.description,
                      sequence: 0,
                    });
                  }
                }
              }
            }

            // Check for level-up after XP gain
            if (response.character_updates?.xp_delta && character) {
              const freshChar = repos.characters.getById(character.id);
              if (freshChar) {
                const levelUp = calculateLevelUp(freshChar);
                if (levelUp) {
                  repos.characters.updateHP(freshChar.id, freshChar.hp_current + levelUp.hpIncrease, levelUp.newHPMax);
                  repos.characters.levelUp(freshChar.id, levelUp.newLevel, freshChar.stats);
                  repos.characters.updateHitDice(freshChar.id, levelUp.newLevel, freshChar.hit_dice_spent);
                  if (levelUp.newSpellSlots) {
                    repos.characters.updateSpellSlots(freshChar.id, {
                      max: levelUp.newSpellSlots,
                      current: levelUp.newSpellSlots,
                    });
                  }
                  const lvlSeq = repos.exchanges.getNextSequence(activeSession.id);
                  repos.exchanges.create({
                    session_id: activeSession.id,
                    campaign_id: selectedCampaign.id,
                    role: 'system',
                    content: `Subiu para nível ${levelUp.newLevel}! HP máximo: ${levelUp.newHPMax}. Bônus de proficiência: +${levelUp.newProficiencyBonus}.`,
                    metadata: JSON.stringify({ type: 'level_up', new_level: levelUp.newLevel }),
                    sequence: lvlSeq,
                  });
                }
              }
            }

            // Recalculate AC after inventory change
            if ((response.character_updates?.inventory_add || response.character_updates?.inventory_remove) && character) {
              const freshChar = repos.characters.getById(character.id);
              if (freshChar) {
                const acResult = calculateAC(freshChar.stats, freshChar.inventory, freshChar.class);
                repos.characters.updateArmorClass(freshChar.id, acResult.value);
              }
            }

            repos.campaigns.touchLastPlayed(selectedCampaign.id);

            // Process combat state updates (initiative, log, round tracking)
            processCombatResponse(response, character);

            // 4. Set isStreaming false LAST — streaming bubble disappears
            setIsStreaming(false);
          },
          onDiceRequest(request: DiceRequest) {
            trackEvent(getDatabase(), 'dice_rolled', { dice_type: request.dice_type });
            setDiceRequest(request);
          },
          onSceneChange(prompt: ScenePrompt) {
            trackEvent(getDatabase(), 'scene_generated');
            setCurrentScenePrompt(prompt);
          },
          onError(error: NarrativeError) {
            stopTokenFlush();
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
      startTokenFlush,
      stopTokenFlush,
      processCombatResponse,
    ]
  );

  const retryLastAction = useCallback(() => {
    if (lastPlayerActionRef.current !== null) {
      // Remove the player exchange that was saved for the failed attempt
      // so it doesn't appear twice after retry
      void sendPlayerAction(lastPlayerActionRef.current);
    }
  }, [sendPlayerAction]);

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

      // Snapshot session analytics (no PII)
      try {
        const db = getDatabase();
        snapshotSessionMetrics(db, activeSession.id, nowISO());
        trackEvent(db, 'session_ended', {
          campaign_id: selectedCampaign.id,
          exchange_count: exchanges.length,
        });
      } catch {
        // Analytics snapshot failure is non-critical
      }

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
    retryLastAction,
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
