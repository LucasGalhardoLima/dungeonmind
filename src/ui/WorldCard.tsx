import { useRef, useEffect } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import { colors } from './theme';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 280;
const IMAGE_HEIGHT = 180;

interface WorldCardProps {
  id: string;
  name: string;
  description: string;
  imagePath?: string;
  audioPath?: string;
  isAvailable: boolean;
  onSelect: (id: string) => void;
}

export function WorldCard({
  id,
  name,
  description,
  imagePath,
  audioPath,
  isAvailable,
  onSelect,
}: WorldCardProps) {
  const soundRef = useRef<Audio.Sound | null>(null);

  useEffect(() => {
    if (!audioPath) return;

    let isMounted = true;

    const loadAudio = async () => {
      try {
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioPath },
          { isLooping: true, shouldPlay: true, volume: 0.4 }
        );

        if (!isMounted) {
          await sound.unloadAsync();
          return;
        }

        soundRef.current = sound;
      } catch {
        // Gracefully handle missing or invalid audio files
      }
    };

    void loadAudio();

    return () => {
      isMounted = false;
      const currentSound = soundRef.current;
      if (currentSound) {
        void currentSound.unloadAsync();
        soundRef.current = null;
      }
    };
  }, [audioPath]);

  const handlePress = () => {
    if (!isAvailable) return;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(id);
  };

  const borderColor = isAvailable ? colors.accent : colors.muted;

  return (
    <Animated.View entering={FadeIn.duration(500)}>
      <Pressable
        onPress={handlePress}
        disabled={!isAvailable}
        accessibilityRole="button"
        accessibilityLabel={`${name}. ${description}${!isAvailable ? '. Indisponível' : ''}`}
        accessibilityState={{ disabled: !isAvailable }}
      >
        <View
          style={{
            width: CARD_WIDTH,
            height: CARD_HEIGHT,
            backgroundColor: colors.surface,
            borderRadius: 16,
            borderWidth: 2,
            borderColor,
            overflow: 'hidden',
          }}
        >
          {/* Image section */}
          <View style={{ width: '100%', height: IMAGE_HEIGHT, position: 'relative' }}>
            {imagePath ? (
              <Image
                source={{ uri: imagePath }}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            ) : (
              <View
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: colors.purple,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: colors.muted, fontSize: 14 }}>
                  Sem imagem
                </Text>
              </View>
            )}

            {/* Locked overlay */}
            {!isAvailable && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0, 0, 0, 0.6)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 32 }}>{'\uD83D\uDD12'}</Text>
                <Text
                  style={{
                    color: colors.muted,
                    fontSize: 16,
                    fontWeight: '600',
                    marginTop: 4,
                  }}
                >
                  Em breve
                </Text>
              </View>
            )}
          </View>

          {/* Info section */}
          <View style={{ flex: 1, paddingHorizontal: 12, paddingVertical: 8 }}>
            <Text
              style={{
                color: colors.accent,
                fontSize: 18,
                fontWeight: '700',
              }}
              numberOfLines={1}
            >
              {name}
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 13,
                lineHeight: 18,
                marginTop: 2,
              }}
              numberOfLines={3}
            >
              {description}
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}
