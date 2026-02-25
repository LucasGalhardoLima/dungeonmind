import { useState, useCallback } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { useMultiplayer } from '../../src/multiplayer/hooks/use-multiplayer';
import { useSettingsStore } from '../../src/store/settings-store';
import { colors, typography, spacing, borderRadius } from '../../src/ui/theme';

const MAX_CODE_LENGTH = 12;

export default function JoinMultiplayerScreen() {
  const router = useRouter();

  const { joinSession, isConnected } = useMultiplayer();

  const player = useSettingsStore((s) => s.player);
  const getPlayerId = useSettingsStore((s) => s.getPlayerId);

  const [code, setCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCodeChange = useCallback((text: string) => {
    // Auto-uppercase and strip whitespace, limit to max length
    const sanitised = text.toUpperCase().replace(/\s/g, '');
    if (sanitised.length <= MAX_CODE_LENGTH) {
      setCode(sanitised);
      // Clear error when user types
      setError(null);
    }
  }, []);

  const handleJoin = useCallback(async () => {
    const trimmedCode = code.trim();
    if (trimmedCode.length === 0) {
      setError('Digite o codigo da sessao');
      return;
    }

    const playerId = getPlayerId();
    if (!playerId || !player) {
      setError('Jogador nao encontrado. Configure seu perfil primeiro.');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await joinSession(trimmedCode, playerId, player.display_name);

      // On success, navigate to campaign session
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(campaign)/new/world');
    } catch (err: unknown) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message =
        err instanceof Error
          ? err.message
          : 'Codigo invalido ou sessao expirada';
      setError(message);
    } finally {
      setIsJoining(false);
    }
  }, [code, joinSession, getPlayerId, player, router]);

  const handleBack = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const isButtonDisabled = isJoining || code.trim().length === 0;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
      <View style={styles.container}>
        <Text style={styles.title}>Entrar na Sessao</Text>
        <Text style={styles.subtitle}>
          Digite o codigo compartilhado pelo seu parceiro de aventura.
        </Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.codeInput}
            value={code}
            onChangeText={handleCodeChange}
            placeholder="CODIGO"
            placeholderTextColor={colors.muted}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={MAX_CODE_LENGTH}
            textAlign="center"
            keyboardType="default"
            returnKeyType="join"
            editable={!isJoining}
            onSubmitEditing={() => void handleJoin()}
            accessibilityLabel="Codigo da sessao"
            accessibilityHint="Digite o codigo de 6 a 12 caracteres compartilhado pelo anfitriao"
          />
        </View>

        {error !== null && <Text style={styles.errorText}>{error}</Text>}

        <Pressable
          style={({ pressed }) => [
            styles.joinButton,
            pressed && styles.buttonPressed,
            isButtonDisabled && styles.buttonDisabled,
          ]}
          onPress={() => void handleJoin()}
          disabled={isButtonDisabled}
          accessibilityRole="button"
          accessibilityLabel="Conectar a sessao"
        >
          <Text style={styles.joinButtonText}>
            {isJoining ? 'Conectando...' : 'Conectar'}
          </Text>
        </Pressable>

        <Pressable
          style={styles.backButton}
          onPress={handleBack}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={styles.backButtonText}>Voltar</Text>
        </Pressable>
      </View>
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
  inputContainer: {
    width: '100%',
    maxWidth: 320,
    marginBottom: spacing.lg,
  },
  codeInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    fontFamily: typography.heading,
    fontSize: 32,
    textAlign: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.card,
    letterSpacing: 4,
    borderWidth: 1,
    borderColor: colors.surface,
  },
  errorText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  joinButton: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 300,
  },
  joinButtonText: {
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
  backButton: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.muted,
  },
});
