import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';

export type ActiveShaderType = 'fire' | 'rain' | 'water' | 'leaves' | 'mist';

export const SHADER_CONFIGS: Record<
  ActiveShaderType,
  { color: string; minOpacity: number; maxOpacity: number; duration: number; mode: 'pulse' | 'translateY' }
> = {
  fire: {
    color: 'rgba(255, 140, 0, 1)',
    minOpacity: 0.04,
    maxOpacity: 0.12,
    duration: 1200,
    mode: 'pulse',
  },
  rain: {
    color: 'rgba(100, 150, 200, 1)',
    minOpacity: 0.04,
    maxOpacity: 0.12,
    duration: 800,
    mode: 'translateY',
  },
  water: {
    color: 'rgba(100, 180, 255, 1)',
    minOpacity: 0.03,
    maxOpacity: 0.09,
    duration: 2000,
    mode: 'pulse',
  },
  leaves: {
    color: 'rgba(100, 180, 100, 1)',
    minOpacity: 0.02,
    maxOpacity: 0.08,
    duration: 2500,
    mode: 'pulse',
  },
  mist: {
    color: 'rgba(200, 200, 200, 1)',
    minOpacity: 0.04,
    maxOpacity: 0.12,
    duration: 3000,
    mode: 'pulse',
  },
};

export function isActiveShader(type: string | undefined): type is ActiveShaderType {
  return type !== undefined && type !== 'none' && type in SHADER_CONFIGS;
}

export function ShaderOverlay({
  shaderType,
  width,
  height,
}: {
  shaderType: ActiveShaderType;
  width: number;
  height: number;
}) {
  const config = SHADER_CONFIGS[shaderType];
  const overlayOpacity = useSharedValue(config.minOpacity);
  const translateY = useSharedValue(0);

  useEffect(() => {
    if (config.mode === 'pulse') {
      overlayOpacity.value = config.minOpacity;
      overlayOpacity.value = withRepeat(
        withTiming(config.maxOpacity, {
          duration: config.duration,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else if (config.mode === 'translateY') {
      overlayOpacity.value = (config.minOpacity + config.maxOpacity) / 2;
      translateY.value = 0;
      translateY.value = withRepeat(
        withTiming(height, {
          duration: config.duration,
          easing: Easing.linear,
        }),
        -1,
        false
      );
    }
  }, [shaderType, config, overlayOpacity, translateY, height]);

  const animatedStyle = useAnimatedStyle(() => {
    if (config.mode === 'translateY') {
      return {
        opacity: overlayOpacity.value,
        transform: [{ translateY: translateY.value - height }],
      };
    }
    return {
      opacity: overlayOpacity.value,
    };
  });

  return (
    <Animated.View
      style={[
        {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: config.color,
          width,
          height: config.mode === 'translateY' ? height * 2 : height,
        },
        animatedStyle,
      ]}
      pointerEvents="none"
    />
  );
}
