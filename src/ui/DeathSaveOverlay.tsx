import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from './theme';

interface DeathSaveOverlayProps {
  successes: number;
  failures: number;
  maxFailures: number; // 3 for standard/hardcore, 4 for beginner
}

export function DeathSaveOverlay({ successes, failures, maxFailures }: DeathSaveOverlayProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Salvaguardas contra a Morte</Text>
      <View style={styles.pipsContainer}>
        <View style={styles.pipRow}>
          <Text style={styles.pipLabel}>Sucessos</Text>
          <View style={styles.pips}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={[styles.pip, styles.successPip, i < successes && styles.successPipFilled]}
              />
            ))}
          </View>
        </View>
        <View style={styles.pipRow}>
          <Text style={styles.pipLabel}>Falhas</Text>
          <View style={styles.pips}>
            {Array.from({ length: maxFailures }).map((_, i) => (
              <View
                key={i}
                style={[styles.pip, styles.failurePip, i < failures && styles.failurePipFilled]}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 80,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(139, 0, 0, 0.9)',
    borderRadius: 12,
    padding: spacing.md,
    zIndex: 10,
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  pipsContainer: {
    gap: spacing.sm,
  },
  pipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pipLabel: {
    color: colors.muted,
    fontSize: 13,
    width: 70,
  },
  pips: {
    flexDirection: 'row',
    gap: 8,
  },
  pip: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
  },
  successPip: {
    borderColor: '#4CAF50',
  },
  successPipFilled: {
    backgroundColor: '#4CAF50',
  },
  failurePip: {
    borderColor: '#F44336',
  },
  failurePipFilled: {
    backgroundColor: '#F44336',
  },
});
