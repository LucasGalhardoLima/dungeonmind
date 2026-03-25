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

interface TextSegment {
  type: 'text' | 'bold';
  content: string;
}

function parseMarkdownSegments(raw: string): TextSegment[] {
  // Strip bullet prefixes (lines starting with "- ") and backtick sequences
  let cleaned = raw
    .split('\n')
    .map((line) => line.replace(/^- /, ''))
    .join('\n');

  // Remove stray triple-backtick sequences
  cleaned = cleaned.replace(/```/g, '');

  const segments: TextSegment[] = [];
  const boldRegex = /\*\*(.+?)\*\*/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = boldRegex.exec(cleaned);

  while (match !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', content: cleaned.slice(lastIndex, match.index) });
    }
    segments.push({ type: 'bold', content: match[1] ?? '' });
    lastIndex = match.index + match[0].length;
    match = boldRegex.exec(cleaned);
  }

  if (lastIndex < cleaned.length) {
    segments.push({ type: 'text', content: cleaned.slice(lastIndex) });
  }

  // Strip single-asterisk italic markers (*text* → text) from text segments
  return segments.map((seg) =>
    seg.type === 'text'
      ? { ...seg, content: seg.content.replace(/\*([^*]+)\*/g, '$1') }
      : seg,
  );
}

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
  const segments = parseMarkdownSegments(text);

  return (
    <View style={styles.container} accessibilityRole="text" accessibilityLabel={text}>
      <Text style={styles.narrationText}>
        {segments.map((segment, index) =>
          segment.type === 'bold' ? (
            <Text key={index} style={styles.boldText}>
              {segment.content}
            </Text>
          ) : (
            segment.content
          ),
        )}
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
    backgroundColor: 'rgba(74, 44, 110, 0.3)',
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
  boldText: {
    fontWeight: 'bold',
    fontStyle: 'italic',
  },
  cursor: {
    color: colors.narration,
    fontSize: 16,
    lineHeight: 24,
  },
});
