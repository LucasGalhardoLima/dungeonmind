import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useDMEngine } from '../../../src/engine/hooks/use-dm-engine';
import { stripMetadataForDisplay } from '../../../src/engine/response-parser';
import { useSessionStore } from '../../../src/store/session-store';
import { useCampaignStore } from '../../../src/store/campaign-store';
import { detectShaderType } from '../../../src/scene-painter/shader-animations';

import { NarrationBubble } from '../../../src/ui/NarrationBubble';
import { NarrativeLoading } from '../../../src/ui/NarrativeLoading';
import { NarrativeErrorBubble } from '../../../src/ui/NarrativeErrorBubble';
import { ActionButtons } from '../../../src/ui/ActionButtons';
import { DiceOverlay } from '../../../src/ui/DiceOverlay';
import { DeathSaveOverlay } from '../../../src/ui/DeathSaveOverlay';
import { AtmosphericBackground } from '../../../src/ui/AtmosphericBackground';
import { OfflineFallback } from '../../../src/ui/OfflineFallback';
import { useMultiplayerStore } from '../../../src/store/multiplayer-store';
import { useRepository } from '../../../src/persistence/hooks/use-repository';
import { useNetworkStatus } from '../../../src/engine/hooks/use-network-status';
import { PerformanceOverlay } from '../../../src/ui/PerformanceOverlay';
import { colors, spacing, typography } from '../../../src/ui/theme';

import type { ImageSource } from 'expo-image';
import type { Exchange } from '../../../src/types/entities';

const WORLD_COVER_IMAGES: Record<string, ImageSource> = {
  valdris: require('../../../assets/images/worlds/valdris.png'),
  ferrumclave: require('../../../assets/images/worlds/ferrumclave.png'),
  'vazio-entre-estrelas': require('../../../assets/images/worlds/vazio-entre-estrelas.png'),
  thalassar: require('../../../assets/images/worlds/thalassar.png'),
  'cinzas-de-umbra': require('../../../assets/images/worlds/cinzas-de-umbra.png'),
  kenhado: require('../../../assets/images/worlds/kenhado.png'),
};

interface DisplayExchange {
  id: string;
  role: 'player' | 'dm' | 'system';
  content: string;
}

function mapExchangeToDisplay(exchange: Exchange): DisplayExchange {
  return {
    id: exchange.id,
    role: exchange.role,
    content: exchange.content,
  };
}

export default function SessionScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [chatLayer, setChatLayer] = useState<'in_character' | 'out_of_character'>('in_character');

  // Engine hooks
  const {
    sendPlayerAction,
    retryLastAction,
    submitDiceResult,
    streamingText,
    isStreaming,
    diceRequest,
    suggestedActions,
    error,
  } = useDMEngine();

  // Network status
  const { isOnline } = useNetworkStatus();

  // Multiplayer state
  const isMultiplayer = useMultiplayerStore((s) => s.connectionState === 'connected');

  // Store selectors
  const recentExchanges = useSessionStore((s) => s.recentExchanges);
  const selectedCampaign = useCampaignStore((s) => s.getSelectedCampaign());

  // Repositories for recap
  const repos = useRepository();

  // Session recap — load the latest recap on mount
  const [sessionRecap, setSessionRecap] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedCampaign) return;
    const recap = repos.sessionRecaps.getLatestByCampaignId(selectedCampaign.id);
    if (recap) setSessionRecap(recap.recap_text);
  }, [selectedCampaign, repos]);

  // Death save state from session store
  const deathSaveState = useSessionStore((s) => s.deathSaveState);
  const difficulty = selectedCampaign?.difficulty ?? 'standard';
  const maxDeathFailures = difficulty === 'beginner' ? 4 : 3;

  // Atmospheric background from campaign thumbnail (generated at campaign creation)
  const backgroundPath = selectedCampaign?.thumbnail_path ?? null;
  const worldCoverFallback = selectedCampaign?.world
    ? WORLD_COVER_IMAGES[selectedCampaign.world]
    : undefined;

  // Memoize shader type detection — only recalculate when exchanges or streaming text change
  const shaderType = useMemo(() => {
    const latestDMContent = recentExchanges.filter(e => e.role === 'dm').at(-1)?.content ?? '';
    return detectShaderType(streamingText || latestDMContent, '');
  }, [recentExchanges, streamingText]);

  // Memoize exchange mapping to avoid re-creating array on every render
  const displayExchanges = useMemo(
    () => recentExchanges.map(mapExchangeToDisplay),
    [recentExchanges],
  );

  // Auto-scroll to bottom when exchanges change or streaming text updates
  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    // Small delay to allow layout to settle before scrolling
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [displayExchanges.length, isStreaming, scrollToBottom]);

  // Handle sending player action
  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || isStreaming) return;

    const messageText = chatLayer === 'out_of_character' ? `[OOC] ${trimmed}` : trimmed;

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText('');
    void sendPlayerAction(messageText);
  }, [inputText, isStreaming, sendPlayerAction, chatLayer]);

  // Handle action button press
  const handleActionPress = useCallback(
    (action: string) => {
      if (isStreaming) return;
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      void sendPlayerAction(action);
    },
    [isStreaming, sendPlayerAction],
  );

  // Handle dice result
  const handleDiceResult = useCallback(
    (result: number) => {
      void submitDiceResult(result);
    },
    [submitDiceResult],
  );

  // Navigate to character sheet
  const handleCharacterSheet = useCallback(() => {
    if (!selectedCampaign) return;
    router.push(`/(campaign)/${selectedCampaign.id}/character`);
  }, [router, selectedCampaign]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <AtmosphericBackground
        imagePath={backgroundPath}
        fallbackImage={worldCoverFallback}
        shaderType={shaderType}
      />
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Compact header with campaign name + character sheet button */}
        <View style={styles.sessionHeader}>
          <Text style={styles.campaignName} numberOfLines={1}>
            {selectedCampaign?.name ?? 'Adventure'}
          </Text>
          <Pressable
            style={styles.characterSheetButton}
            onPress={handleCharacterSheet}
            accessibilityRole="button"
            accessibilityLabel="Character Sheet"
          >
            <Text style={styles.characterSheetIcon}>{'\uD83D\uDCCB'}</Text>
          </Pressable>
        </View>

        {/* Scrollable narration area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={scrollToBottom}
        >
          {sessionRecap !== null && (
            <View style={styles.recapCard}>
              <Text style={styles.recapTitle}>Previously...</Text>
              <Text style={styles.recapText}>{sessionRecap}</Text>
            </View>
          )}

          {displayExchanges.map((exchange, index) => {
            const isLast = index === displayExchanges.length - 1;

            if (exchange.role === 'player') {
              return (
                <View key={exchange.id} style={styles.playerBubbleRow}>
                  <View style={styles.playerBubble}>
                    <Text style={styles.playerText}>{exchange.content}</Text>
                  </View>
                </View>
              );
            }

            if (exchange.role === 'system') {
              return (
                <View key={exchange.id} style={styles.systemRow}>
                  <Text style={styles.systemText}>{exchange.content}</Text>
                </View>
              );
            }

            // DM messages
            return (
              <View key={exchange.id} style={styles.dmBubbleRow}>
                <NarrationBubble
                  text={exchange.content}
                  isStreaming={false}
                  isLatest={isLast && !isStreaming}
                />
              </View>
            );
          })}

          {/* Narrador pondera — before first visible tokens arrive */}
          {isStreaming && stripMetadataForDisplay(streamingText).length === 0 && (
            <View style={styles.loadingContainer}>
              <NarrativeLoading message="The Narrator ponders..." />
            </View>
          )}

          {/* Streaming text bubble */}
          {isStreaming && stripMetadataForDisplay(streamingText).length > 0 && (
            <View style={styles.dmBubbleRow}>
              <NarrationBubble
                text={stripMetadataForDisplay(streamingText)}
                isStreaming={true}
                isLatest={true}
              />
            </View>
          )}

          {/* Error display with retry */}
          {error !== null && (
            <NarrativeErrorBubble
              message={error.narrative || 'The spirits are restless... tap to try again.'}
              onRetry={retryLastAction}
            />
          )}
        </ScrollView>

        {/* Unified bottom dock: actions + input */}
        <View style={styles.bottomDock}>
          {/* Action buttons */}
          <ActionButtons
            actions={suggestedActions}
            onActionPress={handleActionPress}
            disabled={isStreaming}
          />

          {/* Input row */}
          <View style={styles.inputRow}>
            {isMultiplayer && (
              <Pressable
                onPress={() => {
                  setChatLayer((prev) => prev === 'in_character' ? 'out_of_character' : 'in_character');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 8,
                  backgroundColor: chatLayer === 'out_of_character' ? 'rgba(128, 128, 128, 0.3)' : 'rgba(74, 44, 110, 0.3)',
                }}
              >
                <Text style={{ color: chatLayer === 'out_of_character' ? '#808080' : '#C9A84C', fontSize: 12 }}>
                  {chatLayer === 'out_of_character' ? 'OOC' : 'IC'}
                </Text>
              </Pressable>
            )}
            <TextInput
              style={styles.textInput}
              placeholder="What do you do?"
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              editable={!isStreaming}
              multiline
              maxLength={500}
              returnKeyType="send"
              blurOnSubmit={false}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (isStreaming || inputText.trim().length === 0) && styles.sendButtonDisabled,
              ]}
              onPress={handleSend}
              disabled={isStreaming || inputText.trim().length === 0}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="Send action"
            >
              <Ionicons
                name="send"
                size={20}
                color={
                  isStreaming || inputText.trim().length === 0
                    ? colors.muted
                    : colors.background
                }
              />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* Dev performance overlay — triple-tap top-right to toggle */}
      <PerformanceOverlay exchangeCount={displayExchanges.length} />

      {/* Offline fallback overlay */}
      <OfflineFallback
        isOffline={!isOnline}
        lastSessionSummary={sessionRecap}
        onRetry={() => {
          // Trigger a re-probe by toggling a lightweight state change;
          // the hook re-probes automatically on app foregrounding.
        }}
      />

      {/* Death save overlay */}
      {deathSaveState.active && (
        <DeathSaveOverlay
          successes={deathSaveState.successes}
          failures={deathSaveState.failures}
          maxFailures={maxDeathFailures}
        />
      )}

      {/* Dice overlay modal */}
      {diceRequest !== null && (
        <DiceOverlay
          visible={diceRequest !== null}
          diceType={diceRequest.dice_type}
          context={diceRequest.context}
          onResult={handleDiceResult}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(26, 26, 46, 0.85)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  campaignName: {
    flex: 1,
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  characterSheetButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  characterSheetIcon: {
    fontSize: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  playerBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  playerBubble: {
    backgroundColor: 'rgba(74, 44, 110, 0.5)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    maxWidth: '80%',
  },
  playerText: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 22,
  },
  dmBubbleRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    maxWidth: '95%',
  },
  systemRow: {
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  systemText: {
    color: colors.muted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  bottomDock: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(201, 168, 76, 0.15)',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    backgroundColor: colors.accent,
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  sendButtonDisabled: {
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  recapCard: {
    backgroundColor: 'rgba(74, 44, 110, 0.25)',
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  recapTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    fontFamily: typography.heading,
    fontStyle: 'italic',
    marginBottom: spacing.xs,
  },
  recapText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
    fontFamily: typography.body,
    fontStyle: 'italic',
  },
});
