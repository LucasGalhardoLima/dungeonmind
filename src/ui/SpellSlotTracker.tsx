import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing } from './theme';
import type { SpellSlots } from '../types/entities';

interface SpellSlotTrackerProps {
  spellSlots: SpellSlots;
}

function SlotRow({ level, current, max }: { level: number; current: number; max: number }) {
  if (max === 0) return null;

  return (
    <View
      style={styles.row}
      accessibilityRole="text"
      accessibilityLabel={`Level ${level}: ${current} of ${max} spell slots remaining`}
    >
      <Text style={styles.levelLabel}>{level}</Text>
      <View style={styles.slotsContainer}>
        {Array.from({ length: max }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.slot,
              i < current ? styles.slotFilled : styles.slotEmpty,
            ]}
          />
        ))}
      </View>
      <Text style={styles.countText}>
        {current}/{max}
      </Text>
    </View>
  );
}

export function SpellSlotTracker({ spellSlots }: SpellSlotTrackerProps) {
  // Filter to only show levels with slots
  const activeLevels = spellSlots.max
    .map((max, index) => ({ level: index + 1, max, current: spellSlots.current[index] ?? 0 }))
    .filter((s) => s.max > 0);

  if (activeLevels.length === 0) return null;

  const totalCurrent = spellSlots.current.reduce((a, b) => a + b, 0);
  const totalMax = spellSlots.max.reduce((a, b) => a + b, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Spell Slots</Text>
        <Text style={styles.totalText}>
          {totalCurrent}/{totalMax}
        </Text>
      </View>
      <View style={styles.levels}>
        {activeLevels.map((s) => (
          <SlotRow key={s.level} level={s.level} current={s.current} max={s.max} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(74, 44, 110, 0.25)',
    borderRadius: 10,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(156, 106, 222, 0.2)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  title: {
    color: '#9C6ADE',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  totalText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
  },
  levels: {
    gap: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  levelLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '600',
    width: 14,
    textAlign: 'center',
  },
  slotsContainer: {
    flex: 1,
    flexDirection: 'row',
    gap: 3,
  },
  slot: {
    width: 14,
    height: 14,
    borderRadius: 3,
    borderWidth: 1.5,
  },
  slotFilled: {
    backgroundColor: '#9C6ADE',
    borderColor: '#B388FF',
  },
  slotEmpty: {
    backgroundColor: 'rgba(156, 106, 222, 0.1)',
    borderColor: 'rgba(156, 106, 222, 0.3)',
  },
  countText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '600',
    width: 24,
    textAlign: 'right',
  },
});
