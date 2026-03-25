import { useEffect, useRef } from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Image, type ImageSource } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { colors } from './theme';
import { ShaderOverlay, isActiveShader } from './ShaderOverlay';

interface AtmosphericBackgroundProps {
  imagePath: string | null;
  fallbackImage?: ImageSource;
  shaderType: 'fire' | 'rain' | 'water' | 'leaves' | 'mist' | 'none';
}

export function AtmosphericBackground({
  imagePath,
  fallbackImage,
  shaderType,
}: AtmosphericBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const previousPathRef = useRef<string | null>(null);
  const imageOpacity = useSharedValue(0);

  useEffect(() => {
    if (imagePath !== null && imagePath !== previousPathRef.current) {
      imageOpacity.value = 0;
      imageOpacity.value = withTiming(1, {
        duration: 800,
        easing: Easing.out(Easing.cubic),
      });
    }
    previousPathRef.current = imagePath;
  }, [imagePath, imageOpacity]);

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    opacity: imageOpacity.value,
  }));

  const hasImage = imagePath !== null;
  const hasFallback = fallbackImage !== undefined;

  if (!hasImage && !hasFallback) {
    return null;
  }

  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
      {/* Fallback image layer (bundled asset, always at full opacity) */}
      {hasFallback && (
        <Image
          source={fallbackImage}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          transition={0}
        />
      )}

      {/* Dynamic image layer (file URI, fades in over fallback) */}
      {hasImage && (
        <Animated.View style={[StyleSheet.absoluteFillObject, imageAnimatedStyle]}>
          <Image
            source={{ uri: imagePath }}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            transition={0}
          />
        </Animated.View>
      )}

      {isActiveShader(shaderType) ? (
        <ShaderOverlay shaderType={shaderType} width={width} height={height} />
      ) : null}

      <View style={[StyleSheet.absoluteFillObject, styles.tintOverlay]} />
    </View>
  );
}

const styles = StyleSheet.create({
  tintOverlay: {
    backgroundColor: colors.backgroundOverlay,
  },
});
