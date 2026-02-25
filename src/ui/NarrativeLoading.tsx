import { useEffect } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface NarrativeLoadingProps {
  message?: string;
}

const ELLIPSIS_DOTS = ['·', '·', '·'];

export function NarrativeLoading({
  message = 'A história se desdobra...',
}: NarrativeLoadingProps) {
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View className="flex-1 items-center justify-center bg-background p-lg">
      <Animated.View style={animatedStyle}>
        <Text
          className="text-accent text-center text-lg"
          style={{ fontFamily: 'GeistPixel' }}
        >
          {message}
        </Text>
      </Animated.View>
      <View className="flex-row mt-sm gap-2">
        {ELLIPSIS_DOTS.map((dot, i) => (
          <AnimatedDot key={i} delay={i * 300} />
        ))}
      </View>
    </View>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-8, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })
        ),
        -1,
        false
      )
    );
  }, [delay, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      <Text className="text-accent text-2xl">·</Text>
    </Animated.View>
  );
}
