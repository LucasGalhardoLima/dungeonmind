// Notification service for DungeonMind
// Handles permission requests, scheduling, push token registration, and rate limiting.
// Permission requests are contextual (e.g., on first multiplayer join), not on app launch.

import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import type { Campaign, NotificationCategory } from '../types/entities';
import {
  buildNotificationContent,
  INACTIVITY_THRESHOLD_DAYS,
  NUDGE_COOLDOWN_DAYS,
} from './notification-categories';

const MAX_NOTIFICATIONS_PER_DAY = 3;

// --- Permission Management ---

/**
 * Request notification permission from the user.
 * Should be called contextually (e.g., when joining multiplayer), not on app launch.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.warn('[notifications] Notifications are not supported on web');
    return false;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

// --- Push Token Registration ---

export async function registerForPushNotifications(): Promise<string | null> {
  try {
    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return null;

    const projectId =
      (Constants.expoConfig?.extra?.['eas'] as Record<string, string> | undefined)?.['projectId'] ??
      null;
    if (!projectId) {
      console.warn('[notifications] No EAS project ID configured');
      return null;
    }

    const tokenResponse = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    return tokenResponse.data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[notifications] Push token registration failed:', message);
    return null;
  }
}

// --- Notification Channel Setup (Android) ---

export async function setupNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('turn_reminder', {
    name: 'Lembretes de Turno',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('session_summary', {
    name: 'Resumos de Sessão',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('story_continuation', {
    name: 'Continuação de Aventura',
    importance: Notifications.AndroidImportance.LOW,
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('campaign_nudge', {
    name: 'Lembrete de Campanha',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: 'default',
  });
}

// --- Rate Limiting ---

export interface RateLimitChecker {
  getCountToday: (campaignId: string) => number;
  log: (campaignId: string, category: NotificationCategory) => void;
  getLastByCategory: (
    campaignId: string,
    category: NotificationCategory
  ) => { sent_at: string } | null;
}

export function canSendNotification(
  campaignId: string,
  rateLimiter: RateLimitChecker
): boolean {
  const todayCount = rateLimiter.getCountToday(campaignId);
  return todayCount < MAX_NOTIFICATIONS_PER_DAY;
}

// --- Local Notification Scheduling ---

export interface ScheduleNotificationParams {
  title: string;
  body: string;
  category: NotificationCategory;
  campaignId: string;
  deepLinkUrl: string;
  delaySeconds?: number;
  rateLimiter: RateLimitChecker;
}

export async function scheduleLocalNotification(
  params: ScheduleNotificationParams
): Promise<string | null> {
  try {
    const hasPermission = await hasNotificationPermission();
    if (!hasPermission) return null;

    if (!canSendNotification(params.campaignId, params.rateLimiter)) {
      return null;
    }

    const channelId =
      Platform.OS === 'android' ? params.category : undefined;

    const trigger = params.delaySeconds
      ? {
          seconds: params.delaySeconds,
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL as const,
        }
      : null;

    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: params.title,
        body: params.body,
        data: {
          campaignId: params.campaignId,
          category: params.category,
          deepLinkUrl: params.deepLinkUrl,
        },
        ...(channelId != null ? { channelId } : {}),
      },
      trigger,
    });

    params.rateLimiter.log(params.campaignId, params.category);

    return notificationId;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[notifications] Scheduling failed:', message);
    return null;
  }
}

// --- Deep Link Generation ---

export function generateDeepLink(
  campaignId: string,
  screen: 'session' | 'history' | 'hub'
): string {
  switch (screen) {
    case 'session':
      return `/(campaign)/${campaignId}/session`;
    case 'history':
      return `/(campaign)/${campaignId}/history`;
    case 'hub':
      return '/';
  }
}

// --- Cancel Notifications ---

export async function cancelAllCampaignNotifications(
  campaignId: string
): Promise<void> {
  try {
    const scheduled =
      await Notifications.getAllScheduledNotificationsAsync();
    for (const notification of scheduled) {
      const data = notification.content.data as
        | Record<string, unknown>
        | undefined;
      if (data?.['campaignId'] === campaignId) {
        await Notifications.cancelScheduledNotificationAsync(
          notification.identifier
        );
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn('[notifications] Cancel failed:', message);
  }
}

// --- Notification Handler Setup ---

export function setupNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// --- Inactivity Check ---

export interface InactivityCheckDeps {
  getActiveCampaigns: (playerId: string) => Campaign[];
  getCharacterName: (campaignId: string) => string | null;
  rateLimiter: RateLimitChecker;
  notificationPreferences: Record<string, boolean>;
}

/**
 * Scan campaigns where last_played_at > 7 days ago and schedule
 * a story_continuation notification (max 1 per campaign per 7-day period).
 * Respects per-campaign disable setting.
 * Should be called on app launch.
 */
export async function checkAndScheduleInactivityNudges(
  playerId: string,
  deps: InactivityCheckDeps
): Promise<number> {
  const campaigns = deps.getActiveCampaigns(playerId);
  let scheduledCount = 0;

  for (const campaign of campaigns) {
    const daysSinceLastPlayed = getDaysSince(campaign.last_played_at);

    if (daysSinceLastPlayed < INACTIVITY_THRESHOLD_DAYS) continue;

    // Check if notifications are disabled for this campaign
    const disableKey = `nudge_disabled_${campaign.id}`;
    if (deps.notificationPreferences[disableKey]) continue;

    // Check nudge cooldown (max 1 per 7 days per campaign)
    const lastNudge = deps.rateLimiter.getLastByCategory(
      campaign.id,
      'story_continuation'
    );
    if (lastNudge) {
      const daysSinceLastNudge = getDaysSince(lastNudge.sent_at);
      if (daysSinceLastNudge < NUDGE_COOLDOWN_DAYS) continue;
    }

    // Check daily rate limit
    if (!canSendNotification(campaign.id, deps.rateLimiter)) continue;

    // Get character name
    const characterName = deps.getCharacterName(campaign.id);
    if (!characterName) continue;

    // Parse location from state document
    let location = 'um lugar esquecido';
    try {
      const stateDoc = JSON.parse(campaign.state_document) as {
        world_state?: { location?: string };
      };
      if (stateDoc.world_state?.location) {
        location = stateDoc.world_state.location;
      }
    } catch {
      // Use default location when state_document is not valid JSON
    }

    const content = buildNotificationContent({
      category: 'story_continuation',
      params: { characterName, location },
    });

    const deepLinkUrl = generateDeepLink(campaign.id, 'session');

    const notificationId = await scheduleLocalNotification({
      title: content.title,
      body: content.body,
      category: 'story_continuation',
      campaignId: campaign.id,
      deepLinkUrl,
      rateLimiter: deps.rateLimiter,
    });

    if (notificationId) {
      scheduledCount++;
    }
  }

  return scheduledCount;
}

// --- Helpers ---

function getDaysSince(dateString: string): number {
  const date = new Date(dateString);
  return (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
}
