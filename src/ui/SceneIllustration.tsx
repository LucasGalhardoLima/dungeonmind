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
import { ShaderOverlay, isActiveShader } from './ShaderOverlay';

interface SceneIllustrationProps {
  imagePath: string | null;
  shaderType?: 'fire' | 'rain' | 'water' | 'leaves' | 'mist' | 'none';
  width: number;
  height: number;
  portraitPath?: string | null;
  showPortrait?: boolean;
  portraitGlow?: boolean;
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
