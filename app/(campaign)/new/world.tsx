import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import type { ImageSource } from 'expo-image';
import { WorldCard } from '../../../src/ui/WorldCard';
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
      'Os deuses estão mortos. Seu poder se fragmentou e espalhou pelo mundo há 400 anos. Cada reino foi construído sobre um fragmento — e os fragmentos estão desaparecendo.',
    image: require('../../../assets/images/worlds/valdris.png'),
    isAvailable: true,
  },
  {
    id: 'ashenmoor',
    name: 'Ashenmoor',
    description:
      'Uma maldição ancestral consome a terra. A nobreza fez um pacto com entidades além do véu — e o preço nunca foi pago. Os mortos não permanecem mortos.',
    image: require('../../../assets/images/worlds/ashenmoor.png'),
    isAvailable: true,
  },
  {
    id: 'ferrumclave',
    name: 'Ferrumclave',
    description:
      'Autômatos desenvolveram consciência há 30 anos. Não têm direitos legais. A revolução industrial foi construída sobre seu trabalho.',
    image: require('../../../assets/images/worlds/ferrumclave.png'),
    isAvailable: false,
  },
  {
    id: 'vazio-entre-estrelas',
    name: 'Vazio entre Estrelas',
    description:
      'Viagem interestelar existe mas leva gerações. Quem parte nunca retorna ao mesmo mundo que deixou.',
    image: require('../../../assets/images/worlds/vazio-entre-estrelas.png'),
    isAvailable: false,
  },
  {
    id: 'thalassar',
    name: 'Thalassar',
    description:
      'O oceano não tem fundo, e algo lá embaixo responde quando você desce fundo o suficiente.',
    image: require('../../../assets/images/worlds/thalassar.png'),
    isAvailable: false,
  },
  {
    id: 'cinzas-de-umbra',
    name: 'Cinzas de Umbra',
    description:
      'A morte não é o fim, mas o que vem depois é pior. Os vivos e os mortos compartilham o mesmo espaço.',
    image: require('../../../assets/images/worlds/cinzas-de-umbra.png'),
    isAvailable: false,
  },
  {
    id: 'kenhado',
    name: 'Kenhado',
    description:
      'Espíritos e humanos viveram em equilíbrio por milênios através de um pacto sagrado. O pacto foi quebrado recentemente.',
    image: require('../../../assets/images/worlds/kenhado.png'),
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
