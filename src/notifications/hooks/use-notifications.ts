// useNotifications hook for DungeonMind
// Provides contextual notification scheduling with rate limiting and deep linking.
// Permission requests are contextual (not on app launch) per FR-030 guidelines.

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useRepository } from '../../persistence/hooks/use-repository';
import { useSettingsStore } from '../../store/settings-store';
import {
  requestNotificationPermission,
  scheduleLocalNotification,
  generateDeepLink,
  cancelAllCampaignNotifications,
  setupNotificationHandler,
  setupNotificationChannels,
} from '../notification-service';
import type { RateLimitChecker } from '../notification-service';
import {
  buildNotificationContent,
  INACTIVITY_THRESHOLD_DAYS,
  NUDGE_COOLDOWN_DAYS,
} from '../notification-categories';
import type { NotificationParams } from '../notification-categories';
import type { NotificationCategory } from '../../types/entities';
import type { StateDocument } from '../../types/state-document';

interface UseNotificationsReturn {
  requestPermission: () => Promise<boolean>;
  scheduleNotification: (
    params: NotificationParams & { campaignId: string }
  ) => Promise<string | null>;
  scheduleTurnReminder: (
    campaignId: string,
    campaignName: string
  ) => Promise<string | null>;
  scheduleSessionSummary: (
    campaignId: string,
    campaignName: string
  ) => Promise<string | null>;
  scheduleStoryContinuation: (
    campaignId: string,
    characterName: string,
    location: string
  ) => Promise<string | null>;
  checkInactiveCampaigns: () => void;
  cancelCampaignNotifications: (campaignId: string) => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const repos = useRepository();
  const settingsStore = useSettingsStore();
  const setupDoneRef = useRef(false);

  // Build rate limiter adapter from NotificationLogRepository
  const rateLimiter: RateLimitChecker = useMemo(
    () => ({
      getCountToday: (campaignId: string) =>
        repos.notificationLogs.getCountToday(campaignId),
      log: (campaignId: string, category: NotificationCategory) =>
        repos.notificationLogs.log(campaignId, category),
      getLastByCategory: (
        campaignId: string,
        category: NotificationCategory
      ) => repos.notificationLogs.getLastByCategory(campaignId, category),
    }),
    [repos.notificationLogs]
  );

  // Setup notification handler and channels on mount
  useEffect(() => {
    if (setupDoneRef.current) return;
    setupDoneRef.current = true;

    setupNotificationHandler();
    setupNotificationChannels().catch(() => {
      // Channel setup failure is non-critical on non-Android platforms
    });

    // Handle notification tap — deep link into the relevant campaign screen
    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;
        const deepLinkUrl = data?.['deepLinkUrl'];
        if (typeof deepLinkUrl === 'string' && deepLinkUrl.length > 0) {
          router.push(deepLinkUrl);
        }

        // Mark notification as tapped in the log
        const notificationId = data?.['notificationLogId'];
        if (typeof notificationId === 'string') {
          repos.notificationLogs.markTapped(notificationId);
        }
      });

    return () => {
      subscription.remove();
    };
  }, [repos.notificationLogs]);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    return requestNotificationPermission();
  }, []);

  const scheduleNotification = useCallback(
    async (
      params: NotificationParams & { campaignId: string }
    ): Promise<string | null> => {
      const content = buildNotificationContent(params);
      const deepLinkUrl = generateDeepLink(
        params.campaignId,
        content.deepLinkScreen
      );

      return scheduleLocalNotification({
        title: content.title,
        body: content.body,
        category: params.category,
        campaignId: params.campaignId,
        deepLinkUrl,
        rateLimiter,
      });
    },
    [rateLimiter]
  );

  const scheduleTurnReminder = useCallback(
    async (
      campaignId: string,
      campaignName: string
    ): Promise<string | null> => {
      return scheduleNotification({
        category: 'turn_reminder',
        params: { campaignName },
        campaignId,
      });
    },
    [scheduleNotification]
  );

  const scheduleSessionSummary = useCallback(
    async (
      campaignId: string,
      campaignName: string
    ): Promise<string | null> => {
      return scheduleNotification({
        category: 'session_summary',
        params: { campaignName },
        campaignId,
      });
    },
    [scheduleNotification]
  );

  const scheduleStoryContinuation = useCallback(
    async (
      campaignId: string,
      characterName: string,
      location: string
    ): Promise<string | null> => {
      // Check nudge cooldown — avoid spamming story continuation nudges
      const lastNudge = repos.notificationLogs.getLastByCategory(
        campaignId,
        'story_continuation'
      );
      if (lastNudge) {
        const daysSinceLastNudge = getDaysSince(lastNudge.sent_at);
        if (daysSinceLastNudge < NUDGE_COOLDOWN_DAYS) {
          return null;
        }
      }

      return scheduleNotification({
        category: 'story_continuation',
        params: { characterName, location },
        campaignId,
      });
    },
    [scheduleNotification, repos.notificationLogs]
  );

  const cancelNotifications = useCallback(
    async (campaignId: string): Promise<void> => {
      await cancelAllCampaignNotifications(campaignId);
    },
    []
  );

  const checkInactiveCampaigns = useCallback(() => {
    const playerId = settingsStore.getPlayerId();
    if (!playerId) return;

    const activeCampaigns = repos.campaigns.getActive(playerId);

    for (const campaign of activeCampaigns) {
      const daysSinceLastPlayed = getDaysSince(campaign.last_played_at);

      if (daysSinceLastPlayed < INACTIVITY_THRESHOLD_DAYS) continue;

      // Respect per-category notification preferences
      const player = settingsStore.player;
      if (player?.notification_preferences['story_continuation_disabled']) {
        continue;
      }

      // Get character name for the nudge message
      const characters = repos.characters.getByCampaignId(campaign.id);
      const character = characters[0];
      if (!character) continue;

      // Extract location from the campaign's state document
      const location = extractLocationFromStateDocument(
        campaign.state_document
      );

      scheduleStoryContinuation(campaign.id, character.name, location).catch(
        () => {
          // Non-critical: inactivity nudge scheduling failure
        }
      );
    }
  }, [settingsStore, repos.campaigns, repos.characters, scheduleStoryContinuation]);

  // Check for inactive campaigns when app returns to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkInactiveCampaigns();
      }
    });

    // Also check on mount
    checkInactiveCampaigns();

    return () => {
      subscription.remove();
    };
  }, [checkInactiveCampaigns]);

  return {
    requestPermission,
    scheduleNotification,
    scheduleTurnReminder,
    scheduleSessionSummary,
    scheduleStoryContinuation,
    checkInactiveCampaigns,
    cancelCampaignNotifications: cancelNotifications,
  };
}

// --- Utility functions ---

function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}

function extractLocationFromStateDocument(stateDocumentJson: string): string {
  const fallbackLocation = 'um local desconhecido';
  try {
    const stateDoc = JSON.parse(stateDocumentJson) as Partial<StateDocument>;
    return stateDoc.world_state?.location || fallbackLocation;
  } catch {
    return fallbackLocation;
  }
}
