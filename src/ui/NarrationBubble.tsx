import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useEffect } from 'react';
import { colors } from './theme';

interface NarrationBubbleProps {
  text: string;
  isStreaming: boolean;
  isLatest: boolean;
}

const CURSOR_CHAR = '\u258D'; // ▍

export function NarrationBubble({ text, isStreaming, isLatest }: NarrationBubbleProps) {
  const cursorOpacity = useSharedValue(1);

  useEffect(() => {
    if (isStreaming && isLatest) {
      cursorOpacity.value = withRepeat(
        withTiming(0, { duration: 530, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      );
    } else {
      cursorOpacity.value = 0;
    }
  }, [isStreaming, isLatest, cursorOpacity]);

  const cursorAnimatedStyle = useAnimatedStyle(() => ({
    opacity: cursorOpacity.value,
  }));

  const showCursor = isStreaming && isLatest;

  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={text}>
      <Text style={styles.narrationText}>
        {text}
        {showCursor && (
          <Animated.Text style={[styles.cursor, cursorAnimatedStyle]}>
            {CURSOR_CHAR}
          </Animated.Text>
        )}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(74, 44, 110, 0.15)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    maxWidth: '100%',
  },
  narrationText: {
    color: colors.narration,
    fontSize: 16,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  cursor: {
    color: colors.narration,
    fontSize: 16,
    lineHeight: 24,
  },
});
