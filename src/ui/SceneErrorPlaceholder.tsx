import { View, Text, Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, borderRadius } from './theme';

interface SceneErrorPlaceholderProps {
  onRetry: () => void;
}

export function SceneErrorPlaceholder({ onRetry }: SceneErrorPlaceholderProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>The scene fades into the shadows...</Text>
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
        accessibilityLabel="Try generating scene again"
      >
        <Text style={styles.retryText}>Reveal again</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    backgroundColor: 'rgba(37, 37, 69, 0.6)',
    borderRadius: borderRadius.card,
    gap: spacing.sm,
  },
  text: {
    color: colors.muted,
    fontSize: 14,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
  },
  retryButtonPressed: {
    opacity: 0.7,
  },
  retryText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
});
