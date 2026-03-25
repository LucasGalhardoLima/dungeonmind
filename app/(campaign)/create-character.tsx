import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCharacter } from '../../src/character/hooks/use-character';
import { stripMetadataForDisplay } from '../../src/engine/response-parser';
import { CharacterPortrait } from '../../src/ui/CharacterPortrait';
import { NarrativeLoading } from '../../src/ui/NarrativeLoading';
import { colors, typography, spacing } from '../../src/ui/theme';
import type { AdventureType } from '../../src/types/entities';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ConversationMessage {
  id: string;
  role: 'dm' | 'player';
  content: string;
}

type SearchParamKeys = 'campaignId' | 'world' | 'adventureType';

// ---------------------------------------------------------------------------
// Phase metadata
// ---------------------------------------------------------------------------

const TOTAL_EXCHANGES = 8;

function getInputPlaceholder(phase: string): string {
  switch (phase) {
    case 'naming':
      return 'Nome do personagem...';
    case 'complete':
      return '';
    default:
      return 'Escreva sua resposta...';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function DmMessageBubble({ content }: { content: string }) {
  return (
    <Animated.View entering={FadeInDown.duration(400)} style={styles.dmBubble}>
      <Text style={styles.dmText}>{content}</Text>
    </Animated.View>
  );
}

function PlayerMessageBubble({ content }: { content: string }) {
  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      style={styles.playerBubble}
    >
      <Text style={styles.playerText}>{content}</Text>
    </Animated.View>
  );
}

function StreamingBubble({ text }: { text: string }) {
  const cursorOpacity = useSharedValue(0);

  useEffect(() => {
    cursorOpacity.value = withDelay(
      200,
      withTiming(1, { duration: 400, easing: Easing.inOut(Easing.ease) }),
    );
  }, [cursorOpacity]);

  const cursorStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  return (
    <View style={styles.dmBubble}>
      <Text style={styles.dmText}>
        {text}
        <Animated.Text style={[styles.cursor, cursorStyle]}>|</Animated.Text>
      </Text>
    </View>
  );
}

function ProgressIndicator({ exchangeCount }: { exchangeCount: number }) {
  const displayCount = Math.min(exchangeCount + 1, TOTAL_EXCHANGES);
  const fillRatio = Math.min(exchangeCount / TOTAL_EXCHANGES, 1);

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>
        Pergunta {displayCount} de {TOTAL_EXCHANGES}
      </Text>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${fillRatio * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main screen component
// ---------------------------------------------------------------------------

export default function CreateCharacter() {
  const params = useLocalSearchParams<Record<SearchParamKeys, string>>();
  const campaignId = params.campaignId ?? '';
  const world = params.world ?? '';
  const adventureType = (params.adventureType ?? 'dungeon_crawl') as AdventureType;

  const {
    creationState,
    isStreaming,
    streamingText,
    startCreation,
    sendCreationResponse,
    finalizeWithName,
    extractionFailed,
    retryExtraction,
    isGeneratingPortrait,
    portraitPath,
    generateCharacterPortrait,
    character,
    error,
  } = useCharacter();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [showPortrait, setShowPortrait] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const hasStartedRef = useRef(false);
  const lastDmMessageCountRef = useRef(0);
  const messageIdCounterRef = useRef(0);

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const generateMessageId = useCallback((): string => {
    messageIdCounterRef.current += 1;
    return `msg-${messageIdCounterRef.current}`;
  }, []);

  const scrollToBottom = useCallback(() => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  }, []);

  // -------------------------------------------------------------------------
  // Start creation on mount
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (!hasStartedRef.current && campaignId && world && adventureType) {
      hasStartedRef.current = true;
      startCreation(campaignId, world, adventureType);
    }
  }, [campaignId, world, adventureType, startCreation]);

  // -------------------------------------------------------------------------
  // Watch for DM messages completing (when streaming stops and conversation
  // history has a new DM entry)
  // -------------------------------------------------------------------------

  useEffect(() => {
    const history = creationState.conversationHistory;
    const dmMessages = history.filter((entry) => entry.role === 'dm');

    if (dmMessages.length > lastDmMessageCountRef.current) {
      const latestDm = dmMessages[dmMessages.length - 1];
      if (latestDm) {
        // Strip metadata blocks from visible text
        const cleanContent = stripMetadataForDisplay(latestDm.content);

        setMessages((prev) => [
          ...prev,
          { id: generateMessageId(), role: 'dm', content: cleanContent },
        ]);
        lastDmMessageCountRef.current = dmMessages.length;
        scrollToBottom();
      }
    }
  }, [creationState.conversationHistory, generateMessageId, scrollToBottom]);

  // -------------------------------------------------------------------------
  // Auto-finalize when phase is 'complete' and streaming is done
  // -------------------------------------------------------------------------

  useEffect(() => {
    if (
      creationState.phase === 'complete' &&
      !isStreaming &&
      !error &&
      characterName.length > 0 &&
      !isFinalizing &&
      !character &&
      creationState.derivedData !== null
    ) {
      setIsFinalizing(true);

      finalizeWithName(characterName)
        .then((savedCharacter) => {
          generateCharacterPortrait(savedCharacter);
          setShowPortrait(true);
        })
        .catch(() => {
          setIsFinalizing(false);
        });
    }
  }, [
    creationState.phase,
    creationState.derivedData,
    isStreaming,
    error,
    characterName,
    isFinalizing,
    character,
    finalizeWithName,
    generateCharacterPortrait,
  ]);

  // -------------------------------------------------------------------------
  // Handle sending a player message
  // -------------------------------------------------------------------------

  const handleSend = useCallback(() => {
    const trimmed = inputText.trim();
    if (trimmed.length === 0 || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Track name if we are in the naming phase
    if (creationState.phase === 'naming') {
      setCharacterName(trimmed);
    }

    // Add the player message to local display
    setMessages((prev) => [
      ...prev,
      { id: generateMessageId(), role: 'player', content: trimmed },
    ]);

    setInputText('');
    scrollToBottom();

    // Send to the creation flow (triggers AI streaming)
    sendCreationResponse(trimmed);
  }, [
    inputText,
    isStreaming,
    creationState.phase,
    generateMessageId,
    scrollToBottom,
    sendCreationResponse,
  ]);

  // -------------------------------------------------------------------------
  // Handle portrait reveal completion -> navigate to session
  // -------------------------------------------------------------------------

  const handleRevealComplete = useCallback(() => {
    if (campaignId) {
      // Short delay to let the player appreciate the portrait
      setTimeout(() => {
        router.replace(`/(campaign)/${campaignId}/session`);
      }, 1500);
    }
  }, [campaignId]);

  // -------------------------------------------------------------------------
  // Determine if input should be shown
  // -------------------------------------------------------------------------

  const shouldShowInput =
    !isStreaming &&
    !showPortrait &&
    !isFinalizing &&
    creationState.phase !== 'complete';

  const isInputDisabled = isStreaming || isFinalizing;

  // -------------------------------------------------------------------------
  // Render: loading state before first message
  // -------------------------------------------------------------------------

  if (messages.length === 0 && !isStreaming && !streamingText) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <NarrativeLoading message="O narrador prepara sua historia..." />
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render: portrait reveal
  // -------------------------------------------------------------------------

  if (showPortrait) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.portraitContainer}>
          <Animated.View entering={FadeIn.duration(600)}>
            <CharacterPortrait
              portraitPath={portraitPath}
              isGenerating={isGeneratingPortrait}
              characterName={characterName}
              size={280}
              onRevealComplete={handleRevealComplete}
            />
          </Animated.View>
          {characterName.length > 0 && (
            <Animated.View entering={FadeInDown.delay(300).duration(500)}>
              <Text style={styles.portraitNameText}>{characterName}</Text>
              <Text style={styles.portraitSubtitle}>
                Sua jornada esta prestes a comecar...
              </Text>
            </Animated.View>
          )}
          {!isGeneratingPortrait && !portraitPath && (
            <Animated.View entering={FadeIn.delay(500).duration(400)}>
              <Pressable
                style={styles.startAdventureButton}
                onPress={() => router.replace(`/(campaign)/${campaignId}/session`)}
              >
                <Text style={styles.startAdventureText}>Iniciar Aventura</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render: conversation UI
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Progress indicator — hidden during auto-finalize */}
        {creationState.phase !== 'complete' && (
          <ProgressIndicator exchangeCount={creationState.exchangeCount} />
        )}

        {/* Conversation scroll area */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
        >
          {messages.map((msg) =>
            msg.role === 'dm' ? (
              <DmMessageBubble key={msg.id} content={msg.content} />
            ) : (
              <PlayerMessageBubble key={msg.id} content={msg.content} />
            ),
          )}

          {/* Streaming text (appearing word by word) */}
          {isStreaming && stripMetadataForDisplay(streamingText).length > 0 && (
            <StreamingBubble text={stripMetadataForDisplay(streamingText)} />
          )}

          {/* Streaming loading indicator (before any visible tokens arrive) */}
          {isStreaming && stripMetadataForDisplay(streamingText).length === 0 && (
            <View style={styles.loadingContainer}>
              <NarrativeLoading message="O narrador pondera..." />
            </View>
          )}

          {/* Error display */}
          {error && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.errorBubble}>
              <Text style={styles.errorText}>{error}</Text>
            </Animated.View>
          )}

          {/* Retry button when extraction fails */}
          {extractionFailed && (
            <Pressable onPress={retryExtraction} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </Pressable>
          )}
        </ScrollView>

        {/* Input area */}
        {shouldShowInput && (
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              value={inputText}
              onChangeText={setInputText}
              placeholder={getInputPlaceholder(creationState.phase)}
              placeholderTextColor={colors.muted}
              multiline
              maxLength={500}
              editable={!isInputDisabled}
              returnKeyType="send"
              onSubmitEditing={handleSend}
              blurOnSubmit={false}
            />
            <Pressable
              onPress={handleSend}
              disabled={isInputDisabled || inputText.trim().length === 0}
              style={({ pressed }) => [
                styles.sendButton,
                (isInputDisabled || inputText.trim().length === 0) && styles.sendButtonDisabled,
                pressed && !(isInputDisabled || inputText.trim().length === 0) && styles.sendButtonPressed,
              ]}
            >
              <Text style={styles.sendButtonText}>Enviar</Text>
            </Pressable>
          </View>
        )}

        {/* Finalizing indicator */}
        {isFinalizing && !showPortrait && (
          <View style={styles.finalizingContainer}>
            <NarrativeLoading message="Dando vida ao seu personagem..." />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardAvoid: {
    flex: 1,
  },

  // Progress
  progressContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressText: {
    color: colors.muted,
    fontSize: 12,
    fontFamily: typography.body,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  progressBarBackground: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },

  // DM bubble
  dmBubble: {
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    borderRadius: 16,
    borderTopLeftRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.md,
    maxWidth: '88%',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
  },
  dmText: {
    color: colors.narration,
    fontSize: 16,
    lineHeight: 24,
    fontFamily: typography.body,
  },
  cursor: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '300',
  },

  // Player bubble
  playerBubble: {
    backgroundColor: 'rgba(74, 44, 110, 0.35)',
    borderRadius: 16,
    borderTopRightRadius: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    marginBottom: spacing.md,
    maxWidth: '80%',
    alignSelf: 'flex-end',
    borderWidth: 1,
    borderColor: 'rgba(74, 44, 110, 0.5)',
  },
  playerText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: typography.body,
  },

  // Loading inside conversation
  loadingContainer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Error
  errorBubble: {
    backgroundColor: 'rgba(220, 50, 50, 0.12)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 50, 50, 0.3)',
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
  retryButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  retryButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },

  // Input area
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    color: colors.text,
    fontSize: 15,
    lineHeight: 20,
    fontFamily: typography.body,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  sendButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendButtonPressed: {
    opacity: 0.8,
  },
  sendButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },

  // Portrait reveal
  portraitContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  portraitNameText: {
    color: colors.accent,
    fontSize: 28,
    fontFamily: typography.heading,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  portraitSubtitle: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  startAdventureButton: {
    backgroundColor: colors.accent,
    borderRadius: 20,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    alignSelf: 'center',
  },
  startAdventureText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.body,
  },

  // Finalizing
  finalizingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
