// Notification categories and message templates for DungeonMind
// All messages are in pt-BR as per FR-030.

import type { NotificationCategory } from '../types/entities';

export interface NotificationTemplate {
  category: NotificationCategory;
  title: string;
  bodyTemplate: string;
  deepLinkScreen: 'session' | 'history' | 'hub';
}

interface TurnReminderParams {
  campaignName: string;
}

interface SessionSummaryParams {
  campaignName: string;
}

interface StoryContinuationParams {
  characterName: string;
  location: string;
}

export type NotificationParams =
  | { category: 'turn_reminder'; params: TurnReminderParams }
  | { category: 'session_summary'; params: SessionSummaryParams }
  | { category: 'campaign_nudge'; params: StoryContinuationParams }
  | { category: 'story_continuation'; params: StoryContinuationParams };

/**
 * Build notification title and body from category and parameters.
 */
export function buildNotificationContent(input: NotificationParams): {
  title: string;
  body: string;
  deepLinkScreen: 'session' | 'history' | 'hub';
} {
  switch (input.category) {
    case 'turn_reminder':
      return {
        title: 'Sua vez de jogar!',
        body: `É a sua vez em '${input.params.campaignName}'!`,
        deepLinkScreen: 'session',
      };

    case 'session_summary':
      return {
        title: 'Resumo da Sessão',
        body: `O resumo da sua sessão em '${input.params.campaignName}' está pronto.`,
        deepLinkScreen: 'history',
      };

    case 'campaign_nudge':
    case 'story_continuation':
      return {
        title: 'A aventura espera...',
        body: `${input.params.characterName} ainda espera em ${input.params.location}. Continuar a aventura?`,
        deepLinkScreen: 'session',
      };
  }
}

/**
 * Default deep link screen for each notification category.
 */
export const CATEGORY_DEEP_LINK_SCREENS: Record<
  NotificationCategory,
  'session' | 'history' | 'hub'
> = {
  turn_reminder: 'session',
  session_summary: 'history',
  campaign_nudge: 'session',
  story_continuation: 'session',
};

/**
 * Check if a category should only fire when app is in background/closed.
 * turn_reminder: only when app is in background (never when active)
 * Others: always
 */
export const BACKGROUND_ONLY_CATEGORIES: ReadonlySet<NotificationCategory> =
  new Set<NotificationCategory>(['turn_reminder']);

/**
 * Minimum days between story_continuation/campaign_nudge notifications per campaign.
 */
export const NUDGE_COOLDOWN_DAYS = 7;

/**
 * Days of inactivity before sending a story continuation nudge.
 */
export const INACTIVITY_THRESHOLD_DAYS = 7;
