import { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AdventureTypeCard } from '../../../src/ui/AdventureTypeCard';
import { getDatabase } from '../../../src/persistence/database';
import { trackEvent } from '../../../src/analytics/analytics-service';
import type { AdventureType } from '../../../src/types/entities';
import { colors } from '../../../src/ui/theme';

const ADVENTURE_TYPES: Array<{
  type: AdventureType;
  label: string;
  description: string;
  exampleLine: string;
  pacing: string;
}> = [
  {
    type: 'dungeon_crawl',
    label: 'Dungeon Crawl',
    description:
      'Linear progression through enclosed environments with escalating threats. Combat every 2-3 narrative exchanges.',
    exampleLine:
      'Darkness swallows the torch. Something moves in the shadows ahead...',
    pacing: 'Action-Heavy',
  },
  {
    type: 'wilderness_exploration',
    label: 'Wilderness Exploration',
    description:
      'Open discovery across a region with no fixed destination. The journey is the content.',
    exampleLine:
      'The horizon opens before you. No map covers what lies beyond...',
    pacing: 'Balanced',
  },
  {
    type: 'political_intrigue',
    label: 'Political Intrigue',
    description:
      'Navigation through NPC networks. Alliances, betrayals, and consequences of social choices.',
    exampleLine:
      "The king's counselor smiles, but their eyes don't lie...",
    pacing: 'Story-Heavy',
  },
  {
    type: 'horror_survival',
    label: 'Horror & Survival',
    description:
      'Escalating revelation. The threat becomes clearer and more wrong as the session progresses.',
    exampleLine: "The door shouldn't be open. Something already came in...",
    pacing: 'Story with Action Peaks',
  },
];

export default function AdventureTypeSelection() {
  const params = useLocalSearchParams<Record<'world', string>>();
  const db = useMemo(() => getDatabase(), []);
  const [selectedType, setSelectedType] = useState<AdventureType | null>(null);

  const handleSelect = (type: AdventureType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (!selectedType) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    trackEvent(db, 'adventure_type_selected', {
      world: params.world ?? 'unknown',
      adventure_type: selectedType,
    });
    router.push({
      pathname: '/(campaign)/new/hooks',
      params: { world: params.world, adventureType: selectedType },
    });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 32, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.accent,
            fontSize: 24,
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Adventure Type
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          How your story will be told
        </Text>

        <View style={{ gap: 16 }}>
          {ADVENTURE_TYPES.map((adventure, index) => (
            <AdventureTypeCard
              key={adventure.type}
              type={adventure.type}
              label={adventure.label}
              description={adventure.description}
              exampleLine={adventure.exampleLine}
              pacing={adventure.pacing}
              isSelected={selectedType === adventure.type}
              onSelect={handleSelect}
              index={index}
            />
          ))}
        </View>
      </ScrollView>

      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          paddingHorizontal: 24,
          paddingBottom: 40,
          paddingTop: 16,
          backgroundColor: colors.background,
        }}
      >
        <Pressable
          onPress={handleContinue}
          disabled={!selectedType}
          style={{
            backgroundColor: selectedType ? colors.accent : `${colors.accent}4D`,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Text
            style={{
              color: selectedType ? colors.background : colors.muted,
              fontSize: 16,
              fontWeight: 'bold',
            }}
          >
            Continue
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
