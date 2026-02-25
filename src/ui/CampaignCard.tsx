import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { colors } from './theme';
import type { World, AdventureType } from '../types/entities';

interface CampaignCardProps {
  id: string;
  name: string;
  world: World;
  adventureType: AdventureType;
  sessionCount: number;
  lastPlayedAt: string;
  thumbnailPath: string | null;
  onPress: (id: string) => void;
}

const WORLD_LABELS: Record<World, string> = { valdris: 'Valdris' };

const ADVENTURE_TYPE_LABELS: Record<AdventureType, string> = {
  dungeon_crawl: 'Exploração de Masmorra',
  wilderness_exploration: 'Exploração Selvagem',
  political_intrigue: 'Intriga Política',
  horror_survival: 'Horror e Sobrevivência',
};

const MS_PER_DAY = 1000 * 60 * 60 * 24;
const MS_PER_WEEK = MS_PER_DAY * 7;

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = now - then;

  if (diffMs < 0) {
    return 'Hoje';
  }

  const diffDays = Math.floor(diffMs / MS_PER_DAY);

  if (diffDays === 0) {
    return 'Hoje';
  }

  if (diffDays === 1) {
    return 'Ontem';
  }

  if (diffDays < 7) {
    return `${diffDays} dias atrás`;
  }

  const diffWeeks = Math.floor(diffMs / MS_PER_WEEK);

  if (diffWeeks === 1) {
    return '1 semana atrás';
  }

  return `${diffWeeks} semanas atrás`;
}

export function CampaignCard({
  id,
  name,
  world,
  adventureType,
  sessionCount,
  lastPlayedAt,
  thumbnailPath,
  onPress,
}: CampaignCardProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress(id);
  };

  return (
    <Animated.View entering={FadeIn}>
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={`Campanha ${name}. ${WORLD_LABELS[world]}, ${ADVENTURE_TYPE_LABELS[adventureType]}. ${String(sessionCount)} ${sessionCount === 1 ? 'sessão' : 'sessões'}`}
        style={styles.card}
      >
        {/* Thumbnail */}
        {thumbnailPath !== null ? (
          <Image
            source={{ uri: thumbnailPath }}
            style={styles.thumbnail}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderEmoji}>⚔</Text>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.info}>
          <Text style={styles.campaignName} numberOfLines={1}>
            {name}
          </Text>

          <View style={styles.worldBadge}>
            <Text style={styles.worldBadgeText}>
              {WORLD_LABELS[world]}
            </Text>
          </View>

          <Text style={styles.adventureType} numberOfLines={1}>
            {ADVENTURE_TYPE_LABELS[adventureType]}
          </Text>

          <View style={styles.bottomRow}>
            <Text style={styles.sessionCount}>
              {sessionCount} {sessionCount === 1 ? 'sessão' : 'sessões'}
            </Text>
            <Text style={styles.lastPlayed}>
              {formatRelativeTime(lastPlayedAt)}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${colors.accent}4D`, // 30% opacity
    padding: 12,
    gap: 12,
  },
  thumbnail: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  placeholder: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: colors.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderEmoji: {
    fontSize: 28,
  },
  info: {
    flex: 1,
    justifyContent: 'space-between',
  },
  campaignName: {
    color: colors.accent,
    fontWeight: 'bold',
    fontSize: 16,
  },
  worldBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${colors.purple}80`, // 50% opacity
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  worldBadgeText: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  adventureType: {
    color: colors.muted,
    fontSize: 13,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionCount: {
    color: colors.text,
    fontSize: 12,
  },
  lastPlayed: {
    color: colors.muted,
    fontSize: 12,
  },
});
