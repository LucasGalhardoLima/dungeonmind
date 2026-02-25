import { useEffect, useRef } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { colors, typography } from './theme';

interface CharacterPortraitProps {
  portraitPath: string | null;
  isGenerating: boolean;
  characterName?: string;
  size?: number;
  onRevealComplete?: () => void;
}

const ELLIPSIS_DOTS = ['·', '·', '·'];

export function CharacterPortrait({
  portraitPath,
  isGenerating,
  characterName,
  size = 200,
  onRevealComplete,
}: CharacterPortraitProps) {
  const hasRevealedRef = useRef(false);
  const revealOpacity = useSharedValue(0);
  const revealScale = useSharedValue(0.8);
  const pulseOpacity = useSharedValue(0.4);

  const handleRevealEnd = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    hasRevealedRef.current = true;
    onRevealComplete?.();
  };

  // Pulsing opacity animation for the generating state
  useEffect(() => {
    if (isGenerating) {
      pulseOpacity.value = withSequence(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
      );
      // Restart the loop via a repeating pattern
      const interval = setInterval(() => {
        pulseOpacity.value = withSequence(
          withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.4, { duration: 1200, easing: Easing.inOut(Easing.ease) })
        );
      }, 2400);
      return () => clearInterval(interval);
    }
  }, [isGenerating, pulseOpacity]);

  // Reveal animation: triggers when portrait becomes available and hasn't been revealed yet
  useEffect(() => {
    if (portraitPath && !isGenerating && !hasRevealedRef.current) {
      revealOpacity.value = 0;
      revealScale.value = 0.8;

      revealOpacity.value = withTiming(1, {
        duration: 2000,
        easing: Easing.out(Easing.cubic),
      });

      revealScale.value = withTiming(
        1,
        {
          duration: 2000,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (finished) {
            runOnJS(handleRevealEnd)();
          }
        }
      );
    }
  }, [portraitPath, isGenerating]);

  // If already revealed, ensure values are at their final state
  useEffect(() => {
    if (portraitPath && hasRevealedRef.current) {
      revealOpacity.value = 1;
      revealScale.value = 1;
    }
  }, [portraitPath, revealOpacity, revealScale]);

  const pulseAnimatedStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }));

  const revealAnimatedStyle = useAnimatedStyle(() => ({
    opacity: revealOpacity.value,
    transform: [{ scale: revealScale.value }],
  }));

  const containerStyle = {
    width: size,
    height: size,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: colors.purple,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  // State 1: Generating — narrative loading text with animated dots
  if (isGenerating && !portraitPath) {
    return (
      <View style={containerStyle}>
        <Animated.View style={[{ alignItems: 'center', paddingHorizontal: 16 }, pulseAnimatedStyle]}>
          <Text
            style={{
              color: colors.accent,
              fontSize: 14,
              textAlign: 'center',
              fontFamily: typography.heading,
              lineHeight: 20,
            }}
          >
            O artista est{'\u00e1'} desenhando seu personagem...
          </Text>
        </Animated.View>
        <View style={{ flexDirection: 'row', marginTop: 8, gap: 6 }}>
          {ELLIPSIS_DOTS.map((_, i) => (
            <AnimatedDot key={i} delay={i * 300} />
          ))}
        </View>
      </View>
    );
  }

  // State 2 & 3: Revealing or already shown
  if (portraitPath) {
    return (
      <View style={containerStyle}>
        <Animated.View
          style={[
            {
              width: '100%',
              height: '100%',
              borderRadius: 13,
              overflow: 'hidden',
            },
            revealAnimatedStyle,
          ]}
        >
          <Image
            source={{ uri: portraitPath }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={0}
          />
        </Animated.View>
        {characterName ? (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              paddingVertical: 4,
              paddingHorizontal: 8,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 12,
                textAlign: 'center',
                fontFamily: typography.heading,
              }}
              numberOfLines={1}
            >
              {characterName}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  // Fallback: no portrait, not generating (empty state)
  return (
    <View style={containerStyle}>
      <Text
        style={{
          color: colors.muted,
          fontSize: 14,
          textAlign: 'center',
          fontFamily: typography.heading,
        }}
      >
        Sem retrato
      </Text>
    </View>
  );
}

function AnimatedDot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSequence(
        withTiming(-8, { duration: 400, easing: Easing.out(Easing.ease) }),
        withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })
      )
    );
    const interval = setInterval(() => {
      translateY.value = withDelay(
        delay,
        withSequence(
          withTiming(-8, { duration: 400, easing: Easing.out(Easing.ease) }),
          withTiming(0, { duration: 400, easing: Easing.in(Easing.ease) })
        )
      );
    }, 1200 + delay);
    return () => clearInterval(interval);
  }, [delay, translateY]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View style={style}>
      <Text style={{ color: colors.accent, fontSize: 24 }}>{'\u00b7'}</Text>
    </Animated.View>
  );
}
