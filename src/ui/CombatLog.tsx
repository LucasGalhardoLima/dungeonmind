import { useRef, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from './theme';
import type { CombatLogEntry, CombatLogEntryType } from '../types/combat';

interface CombatLogProps {
  entries: CombatLogEntry[];
  expanded: boolean;
  onToggleExpanded: () => void;
}

const LOG_ICONS: Record<CombatLogEntryType, string> = {
  combat_start: 'flash',
  combat_end: 'flag',
  round_start: 'refresh',
  attack: 'sword' as string,       // fallback below
  damage: 'flame',
  heal: 'heart',
  spell: 'sparkles',
  save: 'shield-checkmark',
  death_save: 'skull',
  ability: 'star',
  movement: 'walk',
  status: 'information-circle',
};

// Map to valid Ionicons names
function getIconName(type: CombatLogEntryType): string {
  switch (type) {
    case 'combat_start': return 'flash';
    case 'combat_end': return 'flag';
    case 'round_start': return 'refresh';
    case 'attack': return 'hand-left';
    case 'damage': return 'flame';
    case 'heal': return 'heart';
    case 'spell': return 'sparkles';
    case 'save': return 'shield-checkmark';
    case 'death_save': return 'skull';
    case 'ability': return 'star';
    case 'movement': return 'walk';
    case 'status': return 'information-circle';
    default: return 'ellipse';
  }
}

function getEntryColor(type: CombatLogEntryType): string {
  switch (type) {
    case 'combat_start':
    case 'combat_end':
      return colors.accent;
    case 'round_start':
      return colors.muted;
    case 'damage':
    case 'death_save':
      return colors.danger;
    case 'heal':
      return colors.success;
    case 'spell':
      return '#9C6ADE'; // purple for magic
    case 'attack':
    case 'save':
      return colors.text;
    default:
      return colors.muted;
  }
}

function LogEntry({ entry }: { entry: CombatLogEntry }) {
  const entryColor = getEntryColor(entry.type);
  const isRoundMarker = entry.type === 'round_start';

  if (isRoundMarker) {
    return (
      <View style={styles.roundMarker}>
        <View style={styles.roundMarkerLine} />
        <Text style={styles.roundMarkerText}>{entry.description}</Text>
        <View style={styles.roundMarkerLine} />
      </View>
    );
  }

  return (
    <View style={styles.entry}>
      <Ionicons
        name={getIconName(entry.type) as keyof typeof Ionicons.glyphMap}
        size={14}
        color={entryColor}
        style={styles.entryIcon}
      />
      <Text style={[styles.entryText, { color: entryColor }]} numberOfLines={2}>
        <Text style={styles.entryActor}>{entry.actor}</Text>
        {' '}
        {entry.description}
        {entry.details?.value !== undefined && (
          <Text style={styles.entryValue}> ({entry.details.value})</Text>
        )}
      </Text>
    </View>
  );
}

export function CombatLog({ entries, expanded, onToggleExpanded }: CombatLogProps) {
  const scrollViewRef = useRef<ScrollView>(null);

  // Auto-scroll to bottom on new entries
  useEffect(() => {
    if (expanded) {
      const timeout = setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [entries.length, expanded]);

  if (entries.length === 0) return null;

  const lastEntry = entries[entries.length - 1];
  const visibleEntries = expanded ? entries : [];

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.header}
        onPress={onToggleExpanded}
        accessibilityRole="button"
        accessibilityLabel={expanded ? 'Collapse combat log' : 'Expand combat log'}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="list" size={14} color={colors.accent} />
          <Text style={styles.headerTitle}>Combat Log</Text>
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{entries.length}</Text>
          </View>
        </View>
        {!expanded && lastEntry && (
          <Text style={styles.previewText} numberOfLines={1}>
            {lastEntry.description}
          </Text>
        )}
        <Ionicons
          name={expanded ? 'chevron-down' : 'chevron-up'}
          size={16}
          color={colors.muted}
        />
      </Pressable>
      {expanded && (
        <ScrollView
          ref={scrollViewRef}
          style={styles.logScroll}
          contentContainerStyle={styles.logContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleEntries.map((entry) => (
            <LogEntry key={entry.id} entry={entry} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(26, 26, 46, 0.95)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(201, 168, 76, 0.15)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  countBadge: {
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 1,
  },
  countText: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
  },
  previewText: {
    flex: 1,
    color: colors.muted,
    fontSize: 12,
    marginHorizontal: spacing.sm,
  },
  logScroll: {
    maxHeight: 200,
  },
  logContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: 4,
  },
  roundMarker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  roundMarkerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(201, 168, 76, 0.3)',
  },
  roundMarkerText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  entry: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    paddingVertical: 2,
  },
  entryIcon: {
    marginTop: 2,
  },
  entryText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
  },
  entryActor: {
    fontWeight: '700',
  },
  entryValue: {
    fontWeight: '600',
  },
});
