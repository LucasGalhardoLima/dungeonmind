import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { HookCard } from '../../../src/ui/HookCard';
import { NarrativeLoading } from '../../../src/ui/NarrativeLoading';
import { streamCompletion, streamCompletionGemini } from '../../../src/engine/streaming';
import { useRepository } from '../../../src/persistence/hooks/use-repository';
import { useSettingsStore } from '../../../src/store/settings-store';
import { useCampaignStore } from '../../../src/store/campaign-store';
import { EMPTY_STATE_DOCUMENT } from '../../../src/types/state-document';
import type { AdventureType } from '../../../src/types/entities';
import { colors, spacing, borderRadius, typography } from '../../../src/ui/theme';

const ADVENTURE_TYPE_LABELS: Record<AdventureType, string> = {
  dungeon_crawl: 'Exploração de Masmorra',
  wilderness_exploration: 'Exploração Selvagem',
  political_intrigue: 'Intriga Política',
  horror_survival: 'Horror e Sobrevivência',
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

function buildSystemPrompt(adventureType: AdventureType): string {
  const label = ADVENTURE_TYPE_LABELS[adventureType];
  return `Você é um mestre de RPG criando ganchos de abertura para campanhas.
Mundo: Valdris (Alta Fantasia — os deuses estão mortos, fragmentos de poder divino espalham-se pelo mundo)
Tipo de Aventura: ${label}

Gere exatamente 3 ganchos de abertura distintos para uma campanha neste mundo e tipo de aventura.
Cada gancho deve ter 2-3 frases: uma cena, um conflito e uma pergunta que atraia o jogador.
Os ganchos devem ser narrativos e em pt-BR.

Retorne os ganchos no formato:
[HOOKS]
["gancho 1", "gancho 2", "gancho 3"]
[/HOOKS]`;
}

export default function OpeningHooks() {
  const params = useLocalSearchParams<Record<'world' | 'adventureType', string>>();
  const world = params.world ?? 'valdris';
  const adventureType = (params.adventureType ?? 'dungeon_crawl') as AdventureType;

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

    const systemPrompt = buildSystemPrompt(adventureType);
    const userMessage = 'Gere os ganchos de abertura.';

    let completed = false;

    const handleComplete = (fullText: string) => {
      if (completed) return;
      completed = true;
      const parsed = parseHooks(fullText);
      if (parsed.length === 0) {
        setError('Não foi possível gerar os ganchos. Tente novamente.');
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
          setError(`Erro ao gerar ganchos: ${fallbackError.message}`);
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
  }, [adventureType]);

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
      world: world as 'valdris',
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

    router.replace({
      pathname: '/(campaign)/create-character',
      params: { campaignId: campaign.id, world, adventureType },
    });
  }, [selectedHook, hooks, settingsStore, repos, world, adventureType, addCampaign]);

  if (isLoading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <NarrativeLoading message="O destino tece suas opções..." />
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
          Escolha seu Destino
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
          Selecione um gancho de abertura para sua campanha
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
                Tentar Novamente
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
              Gerar mais opções
            </Text>
          </Pressable>
        )}

        {/* Start adventure button */}
        {hooks.length > 0 && (
          <Pressable
            onPress={handleStartAdventure}
            disabled={selectedHook === null}
            accessibilityRole="button"
            accessibilityLabel="Começar Aventura"
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
              Começar Aventura
            </Text>
          </Pressable>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
