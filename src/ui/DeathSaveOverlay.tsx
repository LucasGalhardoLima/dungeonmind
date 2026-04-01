import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  FadeIn,
  FadeOut,
  ZoomIn,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing } from './theme';

interface DeathSaveOverlayProps {
  successes: number;
  failures: number;
  maxFailures: number; // 3 for standard/hardcore, 4 for beginner
}

function SuccessPip({ filled, index }: { filled: boolean; index: number }) {
  return (
    <Animated.View
      entering={filled ? ZoomIn.delay(index * 150).duration(300) : undefined}
      style={[styles.pip, styles.successPip, filled && styles.successPipFilled]}
      accessibilityRole="image"
      accessibilityLabel={filled ? 'Success' : 'Pending success'}
    />
  );
}

function FailurePip({ filled, index }: { filled: boolean; index: number }) {
  return (
    <Animated.View
      entering={filled ? ZoomIn.delay(index * 150).duration(300) : undefined}
      style={[styles.pip, styles.failurePip, filled && styles.failurePipFilled]}
      accessibilityRole="image"
      accessibilityLabel={filled ? 'Failure' : 'Pending failure'}
    />
  );
}

export function DeathSaveOverlay({ successes, failures, maxFailures }: DeathSaveOverlayProps) {
  const pulseOpacity = useSharedValue(1);

  // Pulse animation for urgency
  useEffect(() => {
    pulseOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );
  }, [pulseOpacity]);

  // Haptic feedback on state changes
  useEffect(() => {
    if (successes > 0 || failures > 0) {
      if (failures >= maxFailures) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      } else if (successes >= 3) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }, [successes, failures, maxFailures]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const isStabilized = successes >= 3;
  const isDead = failures >= maxFailures;

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      exiting={FadeOut.duration(300)}
      style={styles.container}
    >
      <Animated.View style={[styles.pulseBackground, pulseStyle]} />
      <View style={styles.content}>
        {/* Skull icon */}
        <Text style={styles.icon}>{isDead ? '\u2620\uFE0F' : isStabilized ? '\uD83D\uDC9A' : '\uD83D\uDC80'}</Text>

        <Text style={styles.title}>
          {isDead ? 'Fallen...' : isStabilized ? 'Stabilized!' : 'Death Saving Throws'}
        </Text>

        <View style={styles.pipsContainer}>
          {/* Successes */}
          <View style={styles.pipRow}>
            <Text style={styles.pipLabel}>Successes</Text>
            <View style={styles.pips}>
              {[0, 1, 2].map((i) => (
                <SuccessPip key={i} filled={i < successes} index={i} />
              ))}
            </View>
          </View>

          {/* Failures */}
          <View style={styles.pipRow}>
            <Text style={styles.pipLabel}>Failures</Text>
            <View style={styles.pips}>
              {Array.from({ length: maxFailures }).map((_, i) => (
                <FailurePip key={i} filled={i < failures} index={i} />
              ))}
            </View>
          </View>
        </View>

        {!isStabilized && !isDead && (
          <Text style={styles.hint}>
            Roll d20: 10+ = success, 1 = 2 failures, 20 = stabilize at 1 HP
          </Text>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: spacing.md,
    right: spacing.md,
    borderRadius: 16,
    overflow: 'hidden',
    zIndex: 10,
  },
  pulseBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(139, 0, 0, 0.92)',
  },
  content: {
    padding: spacing.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: 28,
  },
  title: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  pipsContainer: {
    gap: spacing.sm,
    width: '100%',
  },
  pipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  pipLabel: {
    color: 'rgba(240, 240, 240, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    width: 80,
  },
  pips: {
    flexDirection: 'row',
    gap: 10,
  },
  pip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2.5,
  },
  successPip: {
    borderColor: 'rgba(76, 175, 80, 0.5)',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
  },
  successPipFilled: {
    backgroundColor: '#4CAF50',
    borderColor: '#66BB6A',
  },
  failurePip: {
    borderColor: 'rgba(244, 67, 54, 0.5)',
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
  },
  failurePipFilled: {
    backgroundColor: '#F44336',
    borderColor: '#EF5350',
  },
  hint: {
    color: 'rgba(240, 240, 240, 0.5)',
    fontSize: 11,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
