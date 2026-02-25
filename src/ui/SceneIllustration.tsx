import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { colors, borderRadius, animation } from './theme';

interface SceneIllustrationProps {
  imagePath: string | null;
  shaderType?: 'fire' | 'rain' | 'water' | 'leaves' | 'mist' | 'none';
  width: number;
  height: number;
  portraitPath?: string | null;
  showPortrait?: boolean;
  portraitGlow?: boolean;
}

type ActiveShaderType = 'fire' | 'rain' | 'water' | 'leaves' | 'mist';

const SHADER_CONFIGS: Record<
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

function isActiveShader(type: string | undefined): type is ActiveShaderType {
  return type !== undefined && type !== 'none' && type in SHADER_CONFIGS;
}

function ShaderOverlay({
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

function PortraitOverlay({
  portraitPath,
  glow,
}: {
  portraitPath: string;
  glow: boolean;
}) {
  const borderOpacity = useSharedValue(1);

  useEffect(() => {
    if (glow) {
      borderOpacity.value = 0.5;
      borderOpacity.value = withRepeat(
        withTiming(1, {
          duration: 800,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true
      );
    } else {
      borderOpacity.value = withTiming(1, { duration: 200 });
    }
  }, [glow, borderOpacity]);

  const glowStyle = useAnimatedStyle(() => ({
    borderColor: `rgba(201, 168, 76, ${borderOpacity.value})`,
  }));

  return (
    <Animated.View
      style={[styles.portraitContainer, glowStyle]}
      pointerEvents="none"
    >
      <Image
        source={{ uri: portraitPath }}
        style={styles.portraitImage}
        contentFit="cover"
      />
    </Animated.View>
  );
}

export function SceneIllustration({
  imagePath,
  shaderType,
  width,
  height,
  portraitPath,
  showPortrait,
  portraitGlow,
}: SceneIllustrationProps) {
  const previousPathRef = useRef<string | null>(null);
  const imageOpacity = useSharedValue(0);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    if (imagePath !== null && imagePath !== previousPathRef.current) {
      imageOpacity.value = 0;
      imageOpacity.value = withTiming(1, {
        duration: animation.sceneFadeIn,
        easing: Easing.out(Easing.cubic),
      });
      setImageError(false);
    }
    previousPathRef.current = imagePath;
  }, [imagePath, imageOpacity]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const showImage = imagePath !== null && !imageError;

  return (
    <View
      style={[
        styles.container,
        { width, height },
      ]}
    >
      {showImage ? (
        <Animated.View style={[styles.imageWrapper, imageAnimatedStyle]}>
          <Image
            source={{ uri: imagePath }}
            style={styles.image}
            contentFit="cover"
            transition={0}
            onError={() => setImageError(true)}
          />
        </Animated.View>
      ) : (
        <View style={[styles.placeholder, { width, height }]}>
          <Text style={styles.placeholderSymbol}>{'\u2694'}</Text>
        </View>
      )}

      {showImage && isActiveShader(shaderType) ? (
        <ShaderOverlay shaderType={shaderType} width={width} height={height} />
      ) : null}

      {showPortrait === true &&
      portraitPath !== undefined &&
      portraitPath !== null ? (
        <PortraitOverlay
          portraitPath={portraitPath}
          glow={portraitGlow === true}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadius.card,
    overflow: 'hidden',
    backgroundColor: colors.purple,
  },
  imageWrapper: {
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    backgroundColor: colors.purple,
    opacity: 0.3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderSymbol: {
    fontSize: 48,
    color: colors.text,
    opacity: 0.6,
  },
  portraitContainer: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    zIndex: 5,
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 3,
    borderColor: colors.accent,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    overflow: 'hidden',
  },
  portraitImage: {
    width: '100%',
    height: '100%',
  },
});
