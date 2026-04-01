import { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HookCard } from '../../../src/ui/HookCard';
import { NarrativeLoading } from '../../../src/ui/NarrativeLoading';
import { getDatabase } from '../../../src/persistence/database';
import { streamCompletion, streamCompletionGemini } from '../../../src/engine/streaming';
import { useRepository } from '../../../src/persistence/hooks/use-repository';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useCampaignStore } from '../../../src/store/campaign-store';
import { trackEvent } from '../../../src/analytics/analytics-service';
import { EMPTY_STATE_DOCUMENT } from '../../../src/types/state-document';
import { generateAdventureBackground } from '../../../src/scene-painter/scene-painter';
import { getCacheDir, ensureCacheDir } from '../../../src/scene-painter/image-cache';
import type { AdventureType, World } from '../../../src/types/entities';
import { colors, spacing, borderRadius, typography } from '../../../src/ui/theme';

const ADVENTURE_TYPE_LABELS: Record<AdventureType, string> = {
  dungeon_crawl: 'Dungeon Crawl',
  wilderness_exploration: 'Wilderness Exploration',
  political_intrigue: 'Political Intrigue',
  horror_survival: 'Horror & Survival',
};

function parseHooks(text: string): string[] {
  const openTag = '[HOOKS]';
  const closeTag = '[/HOOKS]';
  const openIdx = text.indexOf(openTag);
  const closeIdx = text.indexOf(closeTag, openIdx);
  if (openIdx === -1 || closeIdx === -1) return [];
  const jsonStr = text.slice(openIdx + openTag.length, closeIdx).trim();
  try {
    const parsed: unknown = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === 'string');
  } catch {
    return [];
  }
}

const WORLD_HOOK_CONTEXTS: Record<World, string> = {
  valdris: 'Valdris (High Fantasy — the gods are dead, fragments of divine power scattered across the world)',
  ashenmoor: 'Ashenmoor (Gothic Horror — an ancestral curse consumes the land, cursed nobility, haunted moors and eldritch horrors lurk in the fog)',
};

function buildSystemPrompt(world: World, adventureType: AdventureType): string {
  const label = ADVENTURE_TYPE_LABELS[adventureType];
  const worldContext = WORLD_HOOK_CONTEXTS[world] ?? WORLD_HOOK_CONTEXTS.valdris;
  return `You are an RPG dungeon master creating opening hooks for campaigns.
World: ${worldContext}
Adventure Type: ${label}

Generate exactly 3 distinct opening hooks for a campaign in this world and adventure type.
Each hook should be 2-3 sentences: a scene, a conflict, and a question that draws the player in.
The hooks should be narrative and in English.

Return the hooks in the format:
[HOOKS]
["hook 1", "hook 2", "hook 3"]
[/HOOKS]`;
}

export default function OpeningHooks() {
  const params = useLocalSearchParams<Record<'world' | 'adventureType', string>>();
  const world = params.world ?? 'valdris';
  const adventureType = (params.adventureType ?? 'dungeon_crawl') as AdventureType;

  const db = useMemo(() => getDatabase(), []);
  const repos = useRepository();
  const settingsStore = useSettingsStore();
  const addCampaign = useCampaignStore((s) => s.addCampaign);

  const [hooks, setHooks] = useState<string[]>([]);
  const [selectedHook, setSelectedHook] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const generateHooks = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setHooks([]);
    setSelectedHook(null);

    const systemPrompt = buildSystemPrompt(world as World, adventureType);
    const userMessage = 'Generate the opening hooks.';

    let completed = false;

    const handleComplete = (fullText: string) => {
      if (completed) return;
      completed = true;
      const parsed = parseHooks(fullText);
      if (parsed.length === 0) {
        setError('Failed to generate hooks. Try again.');
        setIsLoading(false);
        return;
      }
      setHooks(parsed);
      setIsLoading(false);
    };

    const handleErrorWithFallback = (_primaryError: Error) => {
      // Fallback to Gemini
      streamCompletionGemini(systemPrompt, userMessage, {
        onToken: () => {
          // Not streaming to UI — accumulate only
        },
        onComplete: handleComplete,
        onError: (fallbackError: Error) => {
          if (completed) return;
          completed = true;
          setError(`Error generating hooks: ${fallbackError.message}`);
          setIsLoading(false);
        },
      }).catch(() => {
        // Promise rejection already handled by onError callback
      });
    };

    streamCompletion(systemPrompt, userMessage, {
      onToken: () => {
        // Not streaming to UI — accumulate only
      },
      onComplete: handleComplete,
      onError: handleErrorWithFallback,
    }).catch(() => {
      // Promise rejection already handled by onError callback
    });
  }, [world, adventureType]);

  useEffect(() => {
    generateHooks();
  }, [generateHooks]);

  const handleSelectHook = useCallback((index: number) => {
    setSelectedHook(index);
  }, []);

  const handleRegenerate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    generateHooks();
  }, [generateHooks]);

  const handleStartAdventure = useCallback(() => {
    if (selectedHook === null || hooks.length === 0) return;

    const hookText = hooks[selectedHook];
    if (!hookText) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    const playerId = settingsStore.getPlayerId();
    if (!playerId) return;

    const campaign = repos.campaigns.create({
      player_id: playerId,
      session_code: null,
      world: world as World,
      adventure_type: adventureType,
      name: '',
      opening_hook: hookText,
      state_document: JSON.stringify(EMPTY_STATE_DOCUMENT),
      status: 'active',
      difficulty: settingsStore.player?.difficulty_preference ?? 'standard',
      mature_content: settingsStore.player?.mature_content_enabled ?? false,
      thumbnail_path: null,
    });

    addCampaign(campaign);
    trackEvent(db, 'campaign_created', { world: world as string, adventure_type: adventureType });

    // Generate adventure background image in the background
    void (async () => {
      try {
        await ensureCacheDir();
        const cacheDir = getCacheDir();
        const imagePath = await generateAdventureBackground(
          world as World,
          adventureType,
          cacheDir,
        );
        if (imagePath) {
          repos.campaigns.updateThumbnail(campaign.id, imagePath);
        }
      } catch {
        // Non-critical — session works without a background
      }
    })();

    router.replace({
      pathname: '/(campaign)/create-character',
      params: { campaignId: campaign.id, world, adventureType },
    });
  }, [selectedHook, hooks, settingsStore, repos, world, adventureType, addCampaign, db]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <NarrativeLoading message="Fate weaves your options..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xxl,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <Text
          style={{
            color: colors.accent,
            fontSize: 22,
            fontFamily: typography.heading,
            textAlign: 'center',
            marginBottom: spacing.sm,
          }}
        >
          Choose Your Destiny
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 14,
            textAlign: 'center',
            marginBottom: spacing.xl,
            lineHeight: 14 * 1.5,
          }}
        >
          Select an opening hook for your campaign
        </Text>

        {/* Error state */}
        {error !== null && (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: borderRadius.card,
              padding: spacing.lg,
              marginBottom: spacing.lg,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: colors.danger,
                fontSize: 14,
                textAlign: 'center',
                marginBottom: spacing.md,
              }}
            >
              {error}
            </Text>
            <Pressable
              onPress={handleRegenerate}
              style={{
                backgroundColor: colors.accent,
                borderRadius: borderRadius.button,
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.lg,
              }}
            >
              <Text
                style={{
                  color: colors.background,
                  fontSize: 14,
                  fontWeight: '700',
                }}
              >
                Try Again
              </Text>
            </Pressable>
          </View>
        )}

        {/* Hook cards */}
        {hooks.length > 0 && (
          <View style={{ marginTop: spacing.sm }}>
            {hooks.map((hookText, index) => (
              <HookCard
                key={`${hookText.slice(0, 20)}-${String(index)}`}
                hookText={hookText}
                hookIndex={index}
                isSelected={selectedHook === index}
                onSelect={handleSelectHook}
              />
            ))}
          </View>
        )}

        {/* Regenerate button */}
        {hooks.length > 0 && (
          <Pressable
            onPress={handleRegenerate}
            style={{
              alignSelf: 'center',
              marginTop: spacing.md,
              paddingVertical: spacing.sm,
              paddingHorizontal: spacing.lg,
              borderRadius: borderRadius.button,
              borderWidth: 1,
              borderColor: colors.accent,
            }}
          >
            <Text
              style={{
                color: colors.accent,
                fontSize: 14,
                fontWeight: '600',
              }}
            >
              Generate More Options
            </Text>
          </Pressable>
        )}

        {/* Start adventure button */}
        {hooks.length > 0 && (
          <Pressable
            onPress={handleStartAdventure}
            disabled={selectedHook === null}
            accessibilityRole="button"
            accessibilityLabel="Start Adventure"
            accessibilityState={{ disabled: selectedHook === null }}
            style={{
              marginTop: spacing.xl,
              paddingVertical: spacing.md,
              borderRadius: borderRadius.button,
              backgroundColor:
                selectedHook !== null ? colors.accent : colors.surface,
              alignItems: 'center',
              opacity: selectedHook !== null ? 1 : 0.5,
            }}
          >
            <Text
              style={{
                color:
                  selectedHook !== null ? colors.background : colors.muted,
                fontSize: 16,
                fontWeight: '700',
                fontFamily: typography.heading,
              }}
            >
              Start Adventure
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
