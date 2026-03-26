import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from './theme';

interface NarrativeErrorBubbleProps {
  message: string;
  onRetry?: () => void;
}

export function NarrativeErrorBubble({
  message,
  onRetry,
}: NarrativeErrorBubbleProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      {onRetry != null && (
        <Pressable
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onRetry();
          }}
          style={({ pressed }) => [
            styles.retryButton,
            pressed ? styles.retryButtonPressed : undefined,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Try again"
        >
          <Text style={styles.retryText}>Try again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  message: {
    color: colors.accent,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: borderRadius.button,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  retryButtonPressed: {
    opacity: 0.7,
  },
  retryText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});
