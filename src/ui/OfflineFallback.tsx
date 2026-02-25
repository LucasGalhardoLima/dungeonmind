import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from './theme';

interface OfflineFallbackProps {
  isOffline: boolean;
  lastSessionSummary?: string | null;
  onRetry: () => void;
}

export function OfflineFallback({
  isOffline,
  lastSessionSummary,
  onRetry,
}: OfflineFallbackProps) {
  if (!isOffline) return null;

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>
          A aventura requer uma conex{'\u00e3'}o com o mundo al{'\u00e9'}m...
        </Text>

        <Text style={styles.subtext}>
          Enquanto espera, releia seu {'\u00fa'}ltimo resumo de sess{'\u00e3'}o.
        </Text>

        {lastSessionSummary != null && lastSessionSummary.length > 0 && (
          <ScrollView
            style={styles.summaryScroll}
            contentContainerStyle={styles.summaryContent}
          >
            <Text style={styles.summaryText}>{lastSessionSummary}</Text>
          </ScrollView>
        )}

        <Pressable
          onPress={onRetry}
          style={({ pressed }) => [
            styles.retryButton,
            pressed ? styles.retryButtonPressed : undefined,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Tentar novamente"
        >
          <Text style={styles.retryButtonText}>Tentar novamente</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 90,
  },
  content: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  heading: {
    color: colors.accent,
    fontSize: 20,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginBottom: spacing.md,
    lineHeight: 30,
  },
  subtext: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  summaryScroll: {
    maxHeight: 250,
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    marginBottom: spacing.lg,
  },
  summaryContent: {
    padding: spacing.md,
  },
  summaryText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 4,
    borderRadius: borderRadius.button,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontFamily: 'SpaceMono',
    fontWeight: '700',
  },
});
