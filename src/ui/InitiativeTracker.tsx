import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { colors, spacing } from './theme';
import type { CombatParticipant } from '../types/combat';

interface InitiativeTrackerProps {
  participants: CombatParticipant[];
  round: number;
}

function ParticipantChip({ participant }: { participant: CombatParticipant }) {
  const isDefeated = participant.hpCurrent !== undefined && participant.hpCurrent <= 0;

  return (
    <View
      style={[
        styles.chip,
        participant.isActive && styles.chipActive,
        participant.isPlayer && styles.chipPlayer,
        isDefeated && styles.chipDefeated,
      ]}
      accessibilityRole="text"
      accessibilityLabel={`${participant.name}, initiative ${participant.initiative}${participant.isActive ? ', current turn' : ''}${isDefeated ? ', defeated' : ''}`}
    >
      <Text style={[styles.initiative, participant.isActive && styles.initiativeActive]}>
        {participant.initiative}
      </Text>
      <Text
        style={[
          styles.name,
          participant.isActive && styles.nameActive,
          isDefeated && styles.nameDefeated,
        ]}
        numberOfLines={1}
      >
        {participant.name}
      </Text>
      {participant.isPlayer && participant.hpCurrent !== undefined && participant.hpMax !== undefined && (
        <Text style={[styles.hp, participant.isActive && styles.hpActive]}>
          {participant.hpCurrent}/{participant.hpMax}
        </Text>
      )}
      {participant.conditions.length > 0 && (
        <View style={styles.conditionDot} />
      )}
    </View>
  );
}

export function InitiativeTracker({ participants, round }: InitiativeTrackerProps) {
  if (participants.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.roundBadge}>
          <Text style={styles.roundText}>R{round}</Text>
        </View>
        <Text style={styles.title}>Initiative</Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {participants.map((p) => (
          <ParticipantChip key={p.id} participant={p} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 26, 46, 0.92)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(201, 168, 76, 0.2)',
    paddingVertical: spacing.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
    gap: spacing.xs,
  },
  roundBadge: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roundText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '800',
  },
  title: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chipActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.15)',
    borderColor: colors.accent,
  },
  chipPlayer: {
    backgroundColor: 'rgba(74, 44, 110, 0.25)',
  },
  chipDefeated: {
    opacity: 0.4,
  },
  initiative: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
    minWidth: 16,
    textAlign: 'center',
  },
  initiativeActive: {
    color: colors.accent,
  },
  name: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '500',
    maxWidth: 100,
  },
  nameActive: {
    color: colors.accent,
    fontWeight: '700',
  },
  nameDefeated: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  hp: {
    color: colors.muted,
    fontSize: 11,
  },
  hpActive: {
    color: colors.accent,
  },
  conditionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.danger,
  },
});
