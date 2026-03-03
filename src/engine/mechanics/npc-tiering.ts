import type { NPC } from '../../types/entities';

export type NPCTier = 'key' | 'notable' | 'minor';

export interface TieredNPC {
  npc: NPC;
  tier: NPCTier;
  interactionCount: number;
  hasActiveQuest: boolean;
}

/**
 * Determine NPC tier based on interaction count and quest linkage.
 * Key: has active quest linked OR 5+ interactions
 * Notable: 3+ interactions OR any emotion >= 60
 * Minor: everything else
 */
export function classifyNPCTier(
  npc: NPC,
  interactionCount: number,
  hasActiveQuest: boolean,
): NPCTier {
  if (hasActiveQuest || interactionCount >= 5) return 'key';
  if (interactionCount >= 3 || npc.trust >= 60 || npc.fear >= 60 || npc.anger >= 60 || npc.gratitude >= 60) return 'notable';
  return 'minor';
}

/**
 * Get prompt budget (interaction summaries to include) per tier.
 */
export function getInteractionBudget(tier: NPCTier): number {
  switch (tier) {
    case 'key': return 5;
    case 'notable': return 3;
    case 'minor': return 1;
  }
}
