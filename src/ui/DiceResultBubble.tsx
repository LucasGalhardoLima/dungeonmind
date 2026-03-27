import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { colors } from './theme';

interface DiceResultMeta {
  type: 'dice_result';
  dice_type: string;
  context?: string;
  result: number;
  is_critical: boolean;
}

interface DiceResultBubbleProps {
  content: string;
  metadata: string | null;
}

const DICE_EMOJI: Record<string, string> = {
  d4: '\u{1F538}',
  d6: '\u{1F3B2}',
  d8: '\u{1F539}',
  d10: '\u{1F4A0}',
  d12: '\u{2B50}',
  d20: '\u{1F3AF}',
};

function parseMeta(metadata: string | null): DiceResultMeta | null {
  if (!metadata) return null;
  try {
    const parsed = JSON.parse(metadata) as DiceResultMeta;
    if (parsed.type === 'dice_result') return parsed;
    return null;
  } catch {
    return null;
  }
}

export function DiceResultBubble({ content, metadata }: DiceResultBubbleProps) {
  const meta = parseMeta(metadata);

  if (!meta) {
    // Fallback to plain system text
    return (
      <View style={styles.fallbackRow}>
        <Text style={styles.fallbackText}>{content}</Text>
      </View>
    );
  }

  const emoji = DICE_EMOJI[meta.dice_type] ?? '\u{1F3B2}';
  const isCritHit = meta.is_critical && meta.result === 20;
  const isCritFail = meta.is_critical && meta.result === 1;

  return (
    <Animated.View
      entering={FadeInUp.duration(350).springify().damping(14)}
      style={[
        styles.container,
        isCritHit && styles.critHitContainer,
        isCritFail && styles.critFailContainer,
      ]}
    >
      <Text style={styles.diceEmoji}>{emoji}</Text>
      <View style={styles.resultInfo}>
        {meta.context ? (
          <Text style={styles.contextText}>{meta.context}</Text>
        ) : null}
        <Text
          style={[
            styles.resultValue,
            isCritHit && styles.critHitText,
            isCritFail && styles.critFailText,
          ]}
        >
          {meta.result}
          <Text style={styles.diceTypeText}> ({meta.dice_type})</Text>
        </Text>
      </View>
      {isCritHit && <Text style={styles.critLabel}>CRITICAL HIT!</Text>}
      {isCritFail && <Text style={styles.critLabel}>CRITICAL FAIL!</Text>}
    </Animated.View>
  );
}

export function isDiceResultExchange(metadata: string | null): boolean {
  return parseMeta(metadata) !== null;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.35)',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  critHitContainer: {
    borderColor: colors.success,
    backgroundColor: 'rgba(50, 205, 50, 0.12)',
  },
  critFailContainer: {
    borderColor: colors.danger,
    backgroundColor: 'rgba(220, 50, 50, 0.12)',
  },
  diceEmoji: {
    fontSize: 22,
  },
  resultInfo: {
    alignItems: 'flex-start',
  },
  contextText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  resultValue: {
    color: colors.accent,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  critHitText: {
    color: colors.success,
  },
  critFailText: {
    color: colors.danger,
  },
  diceTypeText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '400',
  },
  critLabel: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  fallbackRow: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  fallbackText: {
    color: colors.muted,
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
