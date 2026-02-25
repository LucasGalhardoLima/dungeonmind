import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
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
import { CharacterPortrait } from '../../src/ui/CharacterPortrait';
import { NarrativeLoading } from '../../src/ui/NarrativeLoading';
import { colors, typography, spacing } from '../../src/ui/theme';
import type { CreationPhase } from '../../src/character/creation-flow';
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

const TOTAL_EXCHANGES = 7;

function getPhaseIndex(phase: CreationPhase): number {
  const phases: CreationPhase[] = [
    'greeting',
    'personality',
    'skills',
    'appearance',
    'suggestion',
    'naming',
    'complete',
  ];
  const idx = phases.indexOf(phase);
  return idx === -1 ? 0 : idx;
}

function getInputPlaceholder(phase: CreationPhase): string {
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

function ProgressIndicator({
  exchangeCount,
  phase,
}: {
  exchangeCount: number;
  phase: CreationPhase;
}) {
  const phaseIndex = getPhaseIndex(phase);
  const displayCount = Math.min(exchangeCount + 1, TOTAL_EXCHANGES);

  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressText}>
        Pergunta {displayCount} de {TOTAL_EXCHANGES}
      </Text>
      <View style={styles.progressBarBackground}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${(phaseIndex / (TOTAL_EXCHANGES - 1)) * 100}%` },
          ]}
        />
      </View>
    </View>
  );
}

function SendButton({
  onPress,
  disabled,
}: {
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.sendButton,
        disabled && styles.sendButtonDisabled,
        pressed && !disabled && styles.sendButtonPressed,
      ]}
    >
      <Text
        style={[
          styles.sendButtonText,
          disabled && styles.sendButtonTextDisabled,
        ]}
      >
        Enviar
      </Text>
    </Pressable>
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
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
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
        // Strip [CHAR_DATA]...[/CHAR_DATA] blocks from visible text
        const cleanContent = stripCharDataBlock(latestDm.content);

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
      characterName.length > 0 &&
      !isFinalizing &&
      !character
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
    isStreaming,
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
      <SafeAreaView style={styles.container}>
        <NarrativeLoading message="O narrador prepara sua historia..." />
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render: portrait reveal
  // -------------------------------------------------------------------------

  if (showPortrait) {
    return (
      <SafeAreaView style={styles.container}>
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
        </View>
      </SafeAreaView>
    );
  }

  // -------------------------------------------------------------------------
  // Render: conversation UI
  // -------------------------------------------------------------------------

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        {/* Progress indicator */}
        <ProgressIndicator
          exchangeCount={creationState.exchangeCount}
          phase={creationState.phase}
        />

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
          {isStreaming && streamingText.length > 0 && (
            <StreamingBubble text={streamingText} />
          )}

          {/* Streaming loading indicator (before any tokens arrive) */}
          {isStreaming && streamingText.length === 0 && (
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
        </ScrollView>

        {/* Input area */}
        {shouldShowInput && (
          <Animated.View
            entering={FadeInDown.duration(300)}
            style={styles.inputContainer}
          >
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
            <SendButton
              onPress={handleSend}
              disabled={isInputDisabled || inputText.trim().length === 0}
            />
          </Animated.View>
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
// Helpers
// ---------------------------------------------------------------------------

function stripCharDataBlock(text: string): string {
  const openTag = '[CHAR_DATA]';
  const closeTag = '[/CHAR_DATA]';

  const openIdx = text.indexOf(openTag);
  if (openIdx === -1) return text.trim();

  const closeIdx = text.indexOf(closeTag, openIdx);
  if (closeIdx === -1) return text.substring(0, openIdx).trim();

  const before = text.substring(0, openIdx);
  const after = text.substring(closeIdx + closeTag.length);
  return (before + after).trim();
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
    paddingVertical: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  sendButtonDisabled: {
    backgroundColor: 'rgba(201, 168, 76, 0.25)',
  },
  sendButtonPressed: {
    backgroundColor: '#B8973F',
  },
  sendButtonText: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '600',
    fontFamily: typography.body,
  },
  sendButtonTextDisabled: {
    color: 'rgba(26, 26, 46, 0.5)',
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

  // Finalizing
  finalizingContainer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
});
