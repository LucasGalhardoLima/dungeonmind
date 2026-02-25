import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from './theme';

type ChatLayer = 'narration' | 'in_character' | 'out_of_character';

interface ChatBubbleProps {
  layer: ChatLayer;
  content: string;
  playerName?: string;
  portraitPath?: string | null;
  isStreaming?: boolean;
}

const CURSOR_CHAR = '\u258D'; // ▍

export function ChatBubble({
  layer,
  content,
  playerName,
  portraitPath,
  isStreaming,
}: ChatBubbleProps) {
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (layer === 'narration' && isStreaming) {
      cursorOpacity.value = withRepeat(
        withTiming(0, { duration: 530 }),
        -1,
        true,
      );
    } else {
      cursorOpacity.value = 0;
    }
  }, [layer, isStreaming, cursorOpacity]);

  const cursorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  if (layer === 'narration') {
    return (
      <View style={styles.narrationContainer}>
        <Text style={styles.narrationText}>
          {content}
          {isStreaming && (
            <Animated.Text style={[styles.cursorText, cursorAnimatedStyle]}>
              {CURSOR_CHAR}
            </Animated.Text>
          )}
        </Text>
      </View>
    );
  }

  if (layer === 'in_character') {
    return (
      <View style={styles.inCharacterContainer}>
        {portraitPath != null && (
          <Image
            source={portraitPath}
            style={styles.avatar}
            contentFit="cover"
          />
        )}
        <Text style={styles.inCharacterText}>
          {playerName != null && (
            <Text style={styles.characterName}>{playerName}: </Text>
          )}
          {content}
        </Text>
      </View>
    );
  }

  // out_of_character
  return (
    <View style={styles.oocContainer}>
      <Text style={styles.oocText}>[{content}]</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Narration layer
  narrationContainer: {
    backgroundColor: 'rgba(74, 44, 110, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    width: '100%',
  },
  narrationText: {
    color: colors.narration,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  cursorText: {
    color: colors.narration,
    fontSize: 16,
    lineHeight: 24,
  },

  // In-character layer
  inCharacterContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(74, 44, 110, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    marginRight: 8,
  },
  characterName: {
    color: colors.accent,
    fontWeight: 'bold',
  },
  inCharacterText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },

  // Out-of-character layer
  oocContainer: {
    marginLeft: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  oocText: {
    color: colors.oocText,
    fontSize: 12,
    lineHeight: 16,
  },
});
