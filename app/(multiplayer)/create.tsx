import { useState, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

import { useMultiplayer } from '../../src/multiplayer/hooks/use-multiplayer';
import { useSettingsStore } from '../../src/store/settings-store';
import { NarrativeLoading } from '../../src/ui/NarrativeLoading';
import { colors, typography, spacing, borderRadius } from '../../src/ui/theme';

/** Placeholder campaign ID -- the real value will come from navigation params. */
const PLACEHOLDER_CAMPAIGN_ID = 'default';

function WaitingDots() {
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const pulse = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
            withTiming(0.3, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        ),
      );

    dot1.value = pulse(0);
    dot2.value = pulse(200);
    dot3.value = pulse(400);
  }, [dot1, dot2, dot3]);

  const style1 = useAnimatedStyle(() => ({ opacity: dot1.value }));
  const style2 = useAnimatedStyle(() => ({ opacity: dot2.value }));
  const style3 = useAnimatedStyle(() => ({ opacity: dot3.value }));

  return (
    <View style={styles.dotsRow}>
      <Animated.Text style={[styles.dot, style1]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, style2]}>.</Animated.Text>
      <Animated.Text style={[styles.dot, style3]}>.</Animated.Text>
    </View>
  );
}

export default function CreateMultiplayerScreen() {
  const router = useRouter();

  const {
    createSession,
    leaveSession,
    sessionCode,
    partnerConnected,
    isConnected,
  } = useMultiplayer();

  const player = useSettingsStore((s) => s.player);
  const getPlayerId = useSettingsStore((s) => s.getPlayerId);

  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Navigate to campaign session when partner connects
  useEffect(() => {
    if (partnerConnected && sessionCode) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Navigate to the campaign session with multiplayer context
      router.replace('/(campaign)/new/world');
    }
  }, [partnerConnected, sessionCode, router]);

  const handleCreateSession = useCallback(async () => {
    const playerId = getPlayerId();
    if (!playerId || !player) {
      setError('Jogador nao encontrado. Configure seu perfil primeiro.');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await createSession(playerId, player.display_name, PLACEHOLDER_CAMPAIGN_ID);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Falha ao criar sessao';
      setError(message);
    } finally {
      setIsCreating(false);
    }
  }, [createSession, getPlayerId, player]);

  const handleCancel = useCallback(async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const playerId = getPlayerId();
    if (playerId && isConnected) {
      await leaveSession(playerId);
    }
    router.back();
  }, [leaveSession, getPlayerId, isConnected, router]);

  // ---- Before session is created: show create button ----
  if (!sessionCode) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
          <Text style={styles.title}>Sessao Multiplayer</Text>
          <Text style={styles.subtitle}>
            Crie uma sessao e compartilhe o codigo com seu parceiro de aventura.
          </Text>

          {error !== null && <Text style={styles.errorText}>{error}</Text>}

          <Pressable
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.buttonPressed,
              isCreating && styles.buttonDisabled,
            ]}
            onPress={() => void handleCreateSession()}
            disabled={isCreating}
            accessibilityRole="button"
            accessibilityLabel="Criar sessao multiplayer"
          >
            <Text style={styles.createButtonText}>
              {isCreating ? 'Criando...' : 'Criar Sessao'}
            </Text>
          </Pressable>

          <Pressable
            style={styles.cancelButton}
            onPress={() => void handleCancel()}
            accessibilityRole="button"
            accessibilityLabel="Voltar"
          >
            <Text style={styles.cancelButtonText}>Voltar</Text>
          </Pressable>
        </Animated.View>
      </SafeAreaView>
    );
  }

  // ---- Session created: show code and wait for partner ----
  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <Animated.View entering={FadeIn.duration(400)} style={styles.container}>
        <Text style={styles.title}>Sessao Multiplayer</Text>

        <View style={styles.codeContainer}>
          <Text style={styles.codeLabel}>Codigo da Sessao</Text>
          <Text style={styles.sessionCode}>{sessionCode}</Text>
          <Text style={styles.shareHint}>
            Compartilhe este codigo com seu parceiro
          </Text>
        </View>

        <View style={styles.waitingContainer}>
          <NarrativeLoading message="Esperando parceiro..." />
          <WaitingDots />
        </View>

        {error !== null && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={styles.cancelButton}
          onPress={() => void handleCancel()}
          accessibilityRole="button"
          accessibilityLabel="Cancelar sessao"
        >
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </Pressable>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontFamily: typography.heading,
    fontSize: 28,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  codeContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    width: '100%',
  },
  codeLabel: {
    fontSize: 14,
    color: colors.muted,
    marginBottom: spacing.sm,
    fontFamily: typography.heading,
  },
  sessionCode: {
    fontFamily: typography.heading,
    fontSize: 48,
    color: colors.accent,
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: spacing.sm,
  },
  shareHint: {
    fontSize: 14,
    color: colors.muted,
    textAlign: 'center',
  },
  waitingContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    minHeight: 120,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dot: {
    fontFamily: typography.heading,
    fontSize: 32,
    color: colors.accent,
  },
  createButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
  },
  createButtonText: {
    fontFamily: typography.heading,
    fontSize: 18,
    color: colors.background,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cancelButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  cancelButtonText: {
    fontSize: 16,
    color: colors.muted,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
