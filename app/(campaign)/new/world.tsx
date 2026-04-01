import { useCallback, useMemo } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ImageSource } from 'expo-image';
import { WorldCard } from '../../../src/ui/WorldCard';
import { getDatabase } from '../../../src/persistence/database';
import { trackEvent } from '../../../src/analytics/analytics-service';
import { colors } from '../../../src/ui/theme';

interface World {
  id: string;
  name: string;
  description: string;
  image: ImageSource;
  isAvailable: boolean;
}

const WORLDS: readonly World[] = [
  {
    id: 'valdris',
    name: 'Valdris',
    description:
      'The gods are dead. Their power shattered and scattered across the world 400 years ago. Each kingdom was built upon a fragment — and the fragments are vanishing.',
    image: require('../../../assets/images/worlds/valdris.png'),
    isAvailable: true,
  },
  {
    id: 'ashenmoor',
    name: 'Ashenmoor',
    description:
      'An ancestral curse consumes the land. The nobility struck a pact with entities beyond the veil — and the price was never paid. The dead do not stay dead.',
    image: require('../../../assets/images/worlds/ashenmoor.png'),
    isAvailable: true,
  },
  {
    id: 'ferrumclave',
    name: 'Ferrumclave',
    description:
      'Automatons developed consciousness 30 years ago. They have no legal rights. The industrial revolution was built on their labor.',
    image: require('../../../assets/images/worlds/ferrumclave.png'),
    isAvailable: false,
  },
  {
    id: 'vazio-entre-estrelas',
    name: 'Void Between Stars',
    description:
      'Interstellar travel exists but takes generations. Those who leave never return to the same world they left behind.',
    image: require('../../../assets/images/worlds/vazio-entre-estrelas.png'),
    isAvailable: false,
  },
  {
    id: 'thalassar',
    name: 'Thalassar',
    description:
      'The ocean has no bottom, and something down there answers when you descend deep enough.',
    image: require('../../../assets/images/worlds/thalassar.png'),
    isAvailable: false,
  },
  {
    id: 'cinzas-de-umbra',
    name: 'Ashes of Umbra',
    description:
      'Death is not the end, but what comes after is worse. The living and the dead share the same space.',
    image: require('../../../assets/images/worlds/cinzas-de-umbra.png'),
    isAvailable: false,
  },
  {
    id: 'kenhado',
    name: 'Kenhado',
    description:
      'Spirits and humans lived in balance for millennia through a sacred pact. The pact was recently broken.',
    image: require('../../../assets/images/worlds/kenhado.png'),
    isAvailable: false,
  },
];

export default function WorldSelection() {
  const db = useMemo(() => getDatabase(), []);

  const handleWorldSelect = useCallback((id: string) => {
    trackEvent(db, 'world_selected', { world: id });
    router.push({ pathname: '/(campaign)/new/adventure-type', params: { world: id } });
  }, [db]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          alignItems: 'center',
          paddingVertical: 32,
          paddingHorizontal: 24,
        }}
        showsVerticalScrollIndicator={false}
      >
        <Text
          style={{
            color: colors.accent,
            fontSize: 28,
            fontWeight: '700',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Choose Your World
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Select the world where your adventure will take place
        </Text>

        {WORLDS.map((world) => (
          <View key={world.id} style={{ marginBottom: 20 }}>
            <WorldCard
              id={world.id}
              name={world.name}
              description={world.description}
              image={world.image}
              isAvailable={world.isAvailable}
              onSelect={handleWorldSelect}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
