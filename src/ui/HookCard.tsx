import { View, Text, Pressable } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors } from './theme';

const SURFACE = '#252545';
const STAGGER_DELAY_MS = 150;

interface HookCardProps {
  hookText: string;
  hookIndex: number;
  isSelected?: boolean;
  onSelect: (index: number) => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function HookCard({
  hookText,
  hookIndex,
  isSelected = false,
  onSelect,
}: HookCardProps) {
  const displayNumber = hookIndex + 1;

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(hookIndex);
  };

  return (
    <AnimatedPressable
      onPress={handlePress}
      entering={FadeInDown.delay(hookIndex * STAGGER_DELAY_MS).duration(400)}
      accessibilityRole="button"
      accessibilityLabel={`Gancho ${displayNumber}: ${hookText}`}
      accessibilityState={{ selected: isSelected }}
      style={{
        backgroundColor: SURFACE,
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: isSelected ? colors.accent : 'transparent',
        ...(isSelected
          ? {
              shadowColor: colors.accent,
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }
          : {
              shadowColor: 'transparent',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0,
              shadowRadius: 0,
              elevation: 0,
            }),
      }}
    >
      {/* Badge com o n\u00famero do gancho */}
      <View
        style={{
          position: 'absolute',
          top: -10,
          left: 12,
          width: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.background,
          borderWidth: 1.5,
          borderColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Text
          style={{
            color: colors.accent,
            fontSize: 12,
            fontWeight: '700',
          }}
        >
          {displayNumber}
        </Text>
      </View>

      {/* Texto do gancho */}
      <Text
        style={{
          color: colors.text,
          fontSize: 15,
          lineHeight: 15 * 1.6,
          fontStyle: 'italic',
          fontFamily: 'serif',
          marginTop: 4,
        }}
      >
        {hookText}
      </Text>
    </AnimatedPressable>
  );
}
