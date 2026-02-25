import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from './theme';

import type { AdventureType } from '../types/entities';

const SURFACE_COLOR = '#252545';
const STAGGER_DELAY_MS = 100;

interface AdventureTypeCardProps {
  type: AdventureType;
  label: string;
  description: string;
  exampleLine: string;
  pacing: string;
  isSelected?: boolean;
  onSelect: (type: AdventureType) => void;
  index: number;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function AdventureTypeCard({
  type,
  label,
  description,
  exampleLine,
  pacing,
  isSelected = false,
  onSelect,
  index,
}: AdventureTypeCardProps) {
  const handlePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(type);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      entering={FadeInDown.delay(index * STAGGER_DELAY_MS).springify()}
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${description}`}
      accessibilityState={{ selected: isSelected }}
      style={{
        backgroundColor: SURFACE_COLOR,
        borderRadius: 12,
        borderWidth: isSelected ? 2 : 1,
        borderColor: isSelected ? colors.accent : `${colors.muted}4D`,
        padding: 16,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <View style={{ flex: 1, marginRight: 8 }}>
          <Text
            style={{
              color: colors.accent,
              fontWeight: 'bold',
              fontSize: 16,
              marginBottom: 6,
            }}
          >
            {label}
          </Text>

          <Text
            style={{
              color: colors.text,
              fontSize: 14,
              marginBottom: 8,
            }}
          >
            {description}
          </Text>

          <Text
            style={{
              color: colors.muted,
              fontSize: 13,
              fontStyle: 'italic',
            }}
          >
            &ldquo;{exampleLine}&rdquo;
          </Text>
        </View>
      </View>

      <View style={{ alignItems: 'flex-end', marginTop: 12 }}>
        <View
          style={{
            backgroundColor: colors.purple,
            borderRadius: 10,
            paddingHorizontal: 10,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontSize: 11,
            }}
          >
            {pacing}
          </Text>
        </View>
      </View>
    </AnimatedPressable>
  );
}
