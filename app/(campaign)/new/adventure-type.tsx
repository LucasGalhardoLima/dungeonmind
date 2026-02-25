import { useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, Pressable } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { AdventureTypeCard } from '../../../src/ui/AdventureTypeCard';
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
    label: 'Exploração de Masmorra',
    description:
      'Progressão linear por ambientes fechados com ameaças escalonadas. Combate a cada 2-3 trocas narrativas.',
    exampleLine:
      'A escuridão engole a tocha. Algo se move nas sombras à frente...',
    pacing: 'Pesado em ação',
  },
  {
    type: 'wilderness_exploration',
    label: 'Exploração Selvagem',
    description:
      'Descoberta aberta por uma região sem destino fixo. A jornada é o conteúdo.',
    exampleLine:
      'O horizonte se abre diante de você. Nenhum mapa cobre o que está além...',
    pacing: 'Equilibrado',
  },
  {
    type: 'political_intrigue',
    label: 'Intriga Política',
    description:
      'Navegação por redes de NPCs. Alianças, traições e consequências de escolhas sociais.',
    exampleLine:
      'O conselheiro do rei sorri, mas seus olhos não mentem...',
    pacing: 'Pesado em narrativa',
  },
  {
    type: 'horror_survival',
    label: 'Horror e Sobrevivência',
    description:
      'Revelação escalonada. A ameaça fica mais clara e mais errada conforme a sessão avança.',
    exampleLine: 'A porta não deveria estar aberta. Algo já entrou...',
    pacing: 'Narrativa com picos de ação',
  },
];

export default function AdventureTypeSelection() {
  const params = useLocalSearchParams<Record<'world', string>>();
  const [selectedType, setSelectedType] = useState<AdventureType | null>(null);

  const handleSelect = (type: AdventureType) => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (!selectedType) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
          Tipo de Aventura
        </Text>

        <Text
          style={{
            color: colors.muted,
            fontSize: 15,
            textAlign: 'center',
            marginBottom: 32,
          }}
        >
          Como sua história será contada
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
            Continuar
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
