import { useEffect, useRef } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { DiceCanvas } from '../dice/dice-renderer';
import { useDiceRoll } from '../dice/hooks/use-dice-roll';
import type { DiceType } from '../types/dice';
import { colors } from './theme';
import { useMultiplayerStore } from '../store/multiplayer-store';

interface DiceOverlayProps {
  diceType: DiceType;
  context: string;
  onResult: (result: number) => void;
  visible: boolean;
  partnerRolling?: boolean;    // true when the other player is rolling
  partnerName?: string | null; // partner's display name
}

export function DiceOverlay({
  diceType,
  context,
  onResult,
  visible,
  partnerRolling,
  partnerName,
}: DiceOverlayProps) {
  const {
    requestRoll,
    triggerRoll,
    result,
    isRolling,
    isWaitingForRoll,
    isCriticalHitResult,
    isCriticalFailResult,
    diceStates,
  } = useDiceRoll();

  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const overlayHeight = screenHeight * 0.5;

  const overlayOpacity = useSharedValue(0);
  const criticalScale = useSharedValue(1);
  const criticalOpacity = useSharedValue(0);
  const resultNotified = useRef(false);

  useEffect(() => {
    if (visible) {
      resultNotified.current = false;
      overlayOpacity.value = withTiming(1, { duration: 300 });
      requestRoll(diceType, context);
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [visible, diceType, context, requestRoll, overlayOpacity]);

  useEffect(() => {
    if (result !== null && !resultNotified.current) {
      resultNotified.current = true;

      if (isCriticalHitResult || isCriticalFailResult) {
        // Critical animation
        criticalOpacity.value = withSequence(
          withTiming(1, { duration: 200 }),
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 300 })
        );
        criticalScale.value = withSequence(
          withSpring(1.5, { damping: 8 }),
          withTiming(1, { duration: 500 })
        );

        // Delay result notification until after animation
        setTimeout(() => onResult(result), 2000);
      } else {
        onResult(result);
      }
    }
  }, [
    result,
    isCriticalHitResult,
    isCriticalFailResult,
    onResult,
    criticalOpacity,
    criticalScale,
  ]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const criticalStyle = useAnimatedStyle(() => ({
    opacity: criticalOpacity.value,
    transform: [{ scale: criticalScale.value }],
  }));

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 100,
        },
        overlayStyle,
      ]}
    >
      <View style={{ alignItems: 'center' }}>
        <Text
          style={{
            color: colors.accent,
            fontSize: 18,
            fontFamily: 'SpaceMono',
            textAlign: 'center',
            marginBottom: 16,
            paddingHorizontal: 24,
          }}
        >
          {context}
        </Text>

        <DiceCanvas
          width={screenWidth}
          height={overlayHeight}
          dice={diceStates.map((d) => ({
            diceType,
            x: d.x,
            y: d.y,
            angle: d.angle,
            result: d.result,
          }))}
        />

        {isWaitingForRoll && !partnerRolling && (
          <Pressable
            onPress={triggerRoll}
            accessibilityRole="button"
            accessibilityLabel={`Rolar ${diceType.toUpperCase()}`}
            style={{
              marginTop: 20,
              paddingHorizontal: 32,
              paddingVertical: 16,
              backgroundColor: colors.accent,
              borderRadius: 12,
            }}
          >
            <Text
              style={{
                color: colors.background,
                fontSize: 18,
                fontFamily: 'SpaceMono',
                fontWeight: '700',
              }}
            >
              Rolar {diceType.toUpperCase()}
            </Text>
          </Pressable>
        )}

        {partnerRolling && (
          <Text
            style={{
              color: colors.accent,
              fontSize: 16,
              fontFamily: 'SpaceMono',
              marginTop: 16,
              textAlign: 'center',
            }}
          >
            Esperando {partnerName ?? 'parceiro'} rolar...
          </Text>
        )}

        {isRolling && (
          <Text
            style={{
              color: colors.muted,
              fontSize: 14,
              marginTop: 12,
            }}
          >
            Rolando...
          </Text>
        )}

        {result !== null && !isCriticalHitResult && !isCriticalFailResult && (
          <Text
            accessibilityRole="text"
            accessibilityLiveRegion="polite"
            accessibilityLabel={`Resultado: ${String(result)}`}
            style={{
              color: colors.text,
              fontSize: 32,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
              marginTop: 16,
            }}
          >
            {result}
          </Text>
        )}
      </View>

      {/* Critical hit overlay */}
      {isCriticalHitResult && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              alignItems: 'center',
              justifyContent: 'center',
            },
            criticalStyle,
          ]}
        >
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityLabel="Acerto Crítico! Resultado: 20"
            style={{
              color: colors.accent,
              fontSize: 64,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
            }}
          >
            20!
          </Text>
          <Text
            style={{
              color: colors.accent,
              fontSize: 20,
              fontFamily: 'SpaceMono',
              marginTop: 8,
            }}
          >
            ACERTO CRÍTICO
          </Text>
        </Animated.View>
      )}

      {/* Critical fail overlay */}
      {isCriticalFailResult && (
        <Animated.View
          style={[
            {
              position: 'absolute',
              alignItems: 'center',
              justifyContent: 'center',
            },
            criticalStyle,
          ]}
        >
          <Text
            accessibilityLiveRegion="assertive"
            accessibilityLabel="Falha Crítica! Resultado: 1"
            style={{
              color: colors.danger,
              fontSize: 64,
              fontFamily: 'SpaceMono',
              fontWeight: '700',
            }}
          >
            1!
          </Text>
          <Text
            style={{
              color: colors.danger,
              fontSize: 20,
              fontFamily: 'SpaceMono',
              marginTop: 8,
            }}
          >
            FALHA CRÍTICA
          </Text>
        </Animated.View>
      )}
    </Animated.View>
  );
}
