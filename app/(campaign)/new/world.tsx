import { View, Text, ScrollView, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { WorldCard } from '../../../src/ui/WorldCard';
import { colors } from '../../../src/ui/theme';

interface World {
  id: string;
  name: string;
  description: string;
  isAvailable: boolean;
}

const WORLDS: readonly World[] = [
  {
    id: 'valdris',
    name: 'Valdris',
    description:
      'Os deuses estão mortos. Seu poder se fragmentou e espalhou pelo mundo há 400 anos. Cada reino foi construído sobre um fragmento — e os fragmentos estão desaparecendo.',
    isAvailable: true,
  },
  {
    id: 'ferrumclave',
    name: 'Ferrumclave',
    description:
      'Autômatos desenvolveram consciência há 30 anos. Não têm direitos legais. A revolução industrial foi construída sobre seu trabalho.',
    isAvailable: false,
  },
  {
    id: 'vazio-entre-estrelas',
    name: 'Vazio entre Estrelas',
    description:
      'Viagem interestelar existe mas leva gerações. Quem parte nunca retorna ao mesmo mundo que deixou.',
    isAvailable: false,
  },
  {
    id: 'thalassar',
    name: 'Thalassar',
    description:
      'O oceano não tem fundo, e algo lá embaixo responde quando você desce fundo o suficiente.',
    isAvailable: false,
  },
  {
    id: 'cinzas-de-umbra',
    name: 'Cinzas de Umbra',
    description:
      'A morte não é o fim, mas o que vem depois é pior. Os vivos e os mortos compartilham o mesmo espaço.',
    isAvailable: false,
  },
  {
    id: 'kenhado',
    name: 'Kenhado',
    description:
      'Espíritos e humanos viveram em equilíbrio por milênios através de um pacto sagrado. O pacto foi quebrado recentemente.',
    isAvailable: false,
  },
];

function handleWorldSelect(id: string): void {
  router.push({ pathname: '/(campaign)/new/adventure-type', params: { world: id } });
}

export default function WorldSelection() {
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
          Escolha seu Mundo
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Selecione o mundo onde sua aventura acontecerá
        </Text>

        {WORLDS.map((world) => (
          <View key={world.id} style={{ marginBottom: 20 }}>
            <WorldCard
              id={world.id}
              name={world.name}
              description={world.description}
              isAvailable={world.isAvailable}
              onSelect={handleWorldSelect}
            />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
