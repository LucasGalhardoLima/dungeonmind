import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';

import { useDMEngine } from '../../../src/engine/hooks/use-dm-engine';
import { useSceneImage } from '../../../src/scene-painter/hooks/use-scene-image';
import { useSessionStore } from '../../../src/store/session-store';
import { useCampaignStore } from '../../../src/store/campaign-store';
import { detectShaderType } from '../../../src/scene-painter/shader-animations';

import { SceneIllustration } from '../../../src/ui/SceneIllustration';
import { NarrationBubble } from '../../../src/ui/NarrationBubble';
import { ActionButtons } from '../../../src/ui/ActionButtons';
import { DiceOverlay } from '../../../src/ui/DiceOverlay';
import { ChatBubble } from '../../../src/ui/ChatBubble';
import { useMultiplayerStore } from '../../../src/store/multiplayer-store';
import { colors, typography, spacing } from '../../../src/ui/theme';

import type { Exchange } from '../../../src/types/entities';
import type { SceneTrigger } from '../../../src/types/entities';

interface DisplayExchange {
  id: string;
  role: 'player' | 'dm' | 'system';
  content: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCENE_HEIGHT = 200;

function mapExchangeToDisplay(exchange: Exchange): DisplayExchange {
  return {
    id: exchange.id,
    role: exchange.role,
    content: exchange.content,
  };
}

const VALID_TRIGGERS: ReadonlySet<string> = new Set<SceneTrigger>([
  'campaign_start',
  'location_change',
  'encounter',
  'reveal',
  'cliffhanger',
]);

function isSceneTrigger(value: string): value is SceneTrigger {
  return VALID_TRIGGERS.has(value);
}

function extractTriggerFromMetadata(metadata: string | null): SceneTrigger {
  if (metadata === null) {
    return 'location_change';
  }
  try {
    const parsed: unknown = JSON.parse(metadata);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'trigger' in parsed
    ) {
      const record = parsed as Record<string, unknown>;
      const trigger = record.trigger;
      if (typeof trigger === 'string' && isSceneTrigger(trigger)) {
        return trigger;
      }
    }
  } catch {
    // Parsing failed, use default
  }
  return 'location_change';
}

export default function SessionScreen() {
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const [inputText, setInputText] = useState('');
  const [chatLayer, setChatLayer] = useState<'in_character' | 'out_of_character'>('in_character');
  const previousScenePromptRef = useRef<string | null>(null);

  // Engine hooks
  const {
    sendPlayerAction,
    submitDiceResult,
    streamingText,
    isStreaming,
    diceRequest,
    scenePrompt,
    suggestedActions,
    error,
  } = useDMEngine();

  const { generateSceneImage, currentImagePath, isGenerating } = useSceneImage();

  // Multiplayer state
  const isMultiplayer = useMultiplayerStore((s) => s.connectionState === 'connected');

  // Store selectors
  const recentExchanges = useSessionStore((s) => s.recentExchanges);
  const selectedCampaign = useCampaignStore((s) => s.getSelectedCampaign());

  // Map exchanges to display format
  const displayExchanges: DisplayExchange[] = recentExchanges.map(mapExchangeToDisplay);

  // Derive the latest narration text for shader detection
  const latestDMContent = recentExchanges
    .filter((e) => e.role === 'dm')
    .at(-1)?.content ?? '';

  const campaignSetting = scenePrompt?.setting ?? '';
  const shaderType = detectShaderType(
    streamingText || latestDMContent,
    campaignSetting,
  );

  // Auto-scroll to bottom when exchanges change or streaming text updates
  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  useEffect(() => {
    // Small delay to allow layout to settle before scrolling
    const timeout = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeout);
  }, [displayExchanges.length, streamingText, scrollToBottom]);

  // Scene generation when scenePrompt changes
  useEffect(() => {
    if (scenePrompt === null) return;

    const promptKey = JSON.stringify(scenePrompt);
    if (promptKey === previousScenePromptRef.current) return;
    previousScenePromptRef.current = promptKey;

    // Find the latest DM exchange metadata to extract trigger
    const latestDMExchange = recentExchanges
      .filter((e) => e.role === 'dm')
      .at(-1);
    const trigger = extractTriggerFromMetadata(latestDMExchange?.metadata ?? null);

    void generateSceneImage(scenePrompt, trigger);
  }, [scenePrompt, recentExchanges, generateSceneImage]);

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
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Scene Illustration with character sheet button */}
        <View style={styles.sceneContainer}>
          <SceneIllustration
            imagePath={currentImagePath}
            shaderType={shaderType}
            width={SCREEN_WIDTH}
            height={SCENE_HEIGHT}
          />

          {/* Floating character sheet button */}
          <Pressable
            style={styles.characterSheetButton}
            onPress={handleCharacterSheet}
            accessibilityRole="button"
            accessibilityLabel="Ficha do personagem"
          >
            <Text style={styles.characterSheetIcon}>{'\uD83D\uDCCB'}</Text>
          </Pressable>

          {/* Scene generation indicator */}
          {isGenerating && (
            <View style={styles.generatingBadge}>
              <Text style={styles.generatingText}>Gerando cena...</Text>
            </View>
          )}
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

          {/* Streaming text bubble */}
          {isStreaming && streamingText.length > 0 && (
            <View style={styles.dmBubbleRow}>
              <NarrationBubble
                text={streamingText}
                isStreaming={true}
                isLatest={true}
              />
            </View>
          )}

          {/* Error display */}
          {error !== null && (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>
                {error.narrative || 'Ocorreu um erro na narrativa.'}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          <ActionButtons
            actions={suggestedActions}
            onActionPress={handleActionPress}
            disabled={isStreaming}
          />
        </View>

        {/* Text input area */}
        <View style={styles.inputContainer}>
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
                marginRight: 8,
              }}
            >
              <Text style={{ color: chatLayer === 'out_of_character' ? '#808080' : '#C9A84C', fontSize: 12 }}>
                {chatLayer === 'out_of_character' ? 'OOC' : 'IC'}
              </Text>
            </Pressable>
          )}
          <TextInput
            style={styles.textInput}
            placeholder="O que voc\u00ea faz?"
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
          <Pressable
            style={({ pressed }) => [
              styles.sendButton,
              pressed && styles.sendButtonPressed,
              (isStreaming || inputText.trim().length === 0) && styles.sendButtonDisabled,
            ]}
            onPress={handleSend}
            disabled={isStreaming || inputText.trim().length === 0}
            accessibilityRole="button"
            accessibilityLabel="Enviar a\u00e7\u00e3o"
          >
            <Text
              style={[
                styles.sendButtonText,
                (isStreaming || inputText.trim().length === 0) && styles.sendButtonTextDisabled,
              ]}
            >
              {'\u27A4'}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

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
  sceneContainer: {
    position: 'relative',
    width: SCREEN_WIDTH,
    height: SCENE_HEIGHT,
  },
  characterSheetButton: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  characterSheetIcon: {
    fontSize: 20,
  },
  generatingBadge: {
    position: 'absolute',
    bottom: spacing.sm,
    left: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
  },
  generatingText: {
    color: colors.accent,
    fontSize: 12,
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
    backgroundColor: 'rgba(74, 44, 110, 0.3)',
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
  errorRow: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  actionButtonsContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    fontSize: 16,
    maxHeight: 100,
    minHeight: 44,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonText: {
    color: colors.background,
    fontSize: 20,
    fontWeight: '700',
  },
  sendButtonTextDisabled: {
    opacity: 1,
  },
});
