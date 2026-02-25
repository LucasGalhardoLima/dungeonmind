import { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../src/store/settings-store';
import { useRepository } from '../src/persistence/hooks/use-repository';
import { getDatabase } from '../src/persistence/database';
import { colors, spacing, borderRadius, typography } from '../src/ui/theme';
import type { Difficulty } from '../src/types/entities';

const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: Difficulty;
  label: string;
  description: string;
}> = [
  {
    value: 'beginner',
    label: 'Iniciante',
    description: 'O destino é gentil com os heróis',
  },
  {
    value: 'standard',
    label: 'Padrão',
    description: 'O destino é justo',
  },
  {
    value: 'hardcore',
    label: 'Hardcore',
    description: 'O destino não perdoa',
  },
] as const;

const NOTIFICATION_OPTIONS: ReadonlyArray<{
  key: string;
  label: string;
}> = [
  { key: 'turn_reminder', label: 'Lembretes de turno' },
  { key: 'session_summary', label: 'Resumo de sessão' },
  { key: 'campaign_nudge', label: 'Lembrete de campanha inativa' },
  { key: 'story_continuation', label: 'Continuação da história' },
] as const;

const DELETE_TABLES = [
  'exchange',
  'scene_image',
  'session',
  'character',
  'npc',
  'campaign',
  'notification_log',
  'player',
] as const;

export default function Settings() {
  const db = useMemo(() => getDatabase(), []);
  const player = useSettingsStore((s) => s.player);
  const updateDisplayName = useSettingsStore((s) => s.updateDisplayName);
  const updateDifficulty = useSettingsStore((s) => s.updateDifficulty);
  const updateMatureContent = useSettingsStore((s) => s.updateMatureContent);
  const updateNotificationPreferences = useSettingsStore(
    (s) => s.updateNotificationPreferences,
  );
  const repos = useRepository();

  const [displayName, setDisplayName] = useState(
    player?.display_name ?? 'Aventureiro',
  );

  const handleDisplayNameBlur = useCallback(() => {
    const trimmed = displayName.trim();
    if (trimmed.length > 0 && trimmed !== player?.display_name) {
      updateDisplayName(db, trimmed);
    }
  }, [db, displayName, player?.display_name, updateDisplayName]);

  const handleDifficultyChange = useCallback(
    (difficulty: Difficulty) => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      updateDifficulty(db, difficulty);
    },
    [db, updateDifficulty],
  );

  const handleMatureContentToggle = useCallback(
    (enabled: boolean) => {
      updateMatureContent(db, enabled);
    },
    [db, updateMatureContent],
  );

  const handleNotificationToggle = useCallback(
    (key: string, enabled: boolean) => {
      updateNotificationPreferences(db, { [key]: enabled });
    },
    [db, updateNotificationPreferences],
  );

  const handleExport = useCallback(() => {
    try {
      const allCampaigns = [
        ...repos.campaigns.getActive(player?.id ?? ''),
        ...repos.campaigns.getByStatus(player?.id ?? '', 'archived'),
        ...repos.campaigns.getByStatus(player?.id ?? '', 'completed'),
      ];

      const exportData: {
        player: typeof player;
        campaigns: typeof allCampaigns;
        characters: ReturnType<typeof repos.characters.getByCampaignId>[];
        sessions: ReturnType<typeof repos.sessions.getByCampaignId>[];
        exchanges: ReturnType<typeof repos.exchanges.getBySessionId>[];
      } = {
        player,
        campaigns: allCampaigns,
        characters: [],
        sessions: [],
        exchanges: [],
      };

      for (const campaign of allCampaigns) {
        const characters = repos.characters.getByCampaignId(campaign.id);
        exportData.characters.push(characters);

        const sessions = repos.sessions.getByCampaignId(campaign.id);
        exportData.sessions.push(sessions);

        for (const session of sessions) {
          const exchanges = repos.exchanges.getBySessionId(session.id);
          exportData.exchanges.push(exchanges);
        }
      }

      const jsonContent = JSON.stringify(exportData, null, 2);
      const filePath = `${FileSystem.cacheDirectory ?? ''}dungeonmind-export.json`;

      void FileSystem.writeAsStringAsync(filePath, jsonContent).then(() => {
        Alert.alert(
          'O Narrador fala...',
          'Seus pergaminhos foram reunidos. Deseja compartilhá-los com o mundo exterior?',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Compartilhar',
              onPress: () => {
                void Sharing.shareAsync(filePath);
              },
            },
          ],
        );
      });
    } catch {
      Alert.alert('Erro', 'Não foi possível exportar os dados.');
    }
  }, [player, repos]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      'O Narrador adverte...',
      'Esta ação é irreversível. Todos os seus personagens, campanhas e histórias serão perdidos para sempre. Tem certeza?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar Tudo',
          style: 'destructive',
          onPress: () => {
            void Haptics.notificationAsync(
              Haptics.NotificationFeedbackType.Warning,
            );
            for (const table of DELETE_TABLES) {
              db.runSync(`DELETE FROM ${table}`);
            }
            router.replace('/');
          },
        },
      ],
    );
  }, [db]);

  if (!player) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando configurações...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text style={styles.title}>Configurações</Text>

        {/* Player Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nome do Jogador</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={handleDisplayNameBlur}
            placeholder="Seu nome de aventureiro"
            placeholderTextColor={colors.muted}
            maxLength={50}
            returnKeyType="done"
          />
        </View>

        {/* Difficulty Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dificuldade</Text>
          {DIFFICULTY_OPTIONS.map((option) => {
            const isSelected =
              player.difficulty_preference === option.value;
            return (
              <Pressable
                key={option.value}
                style={[
                  styles.radioOption,
                  isSelected && styles.radioOptionSelected,
                ]}
                onPress={() => handleDifficultyChange(option.value)}
              >
                <View style={styles.radioRow}>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.radioTextContainer}>
                    <Text
                      style={[
                        styles.radioLabel,
                        isSelected && styles.radioLabelSelected,
                      ]}
                    >
                      {option.label}
                    </Text>
                    <Text style={styles.radioDescription}>
                      {option.description}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>

        {/* Mature Content Toggle */}
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Conteúdo adulto</Text>
            <Switch
              value={player.mature_content_enabled}
              onValueChange={handleMatureContentToggle}
              trackColor={{ false: colors.surface, true: colors.purple }}
              thumbColor={
                player.mature_content_enabled ? colors.accent : colors.muted
              }
            />
          </View>
        </View>

        {/* Notification Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notificações</Text>
          {NOTIFICATION_OPTIONS.map((option) => {
            const isEnabled =
              player.notification_preferences[option.key] ?? false;
            return (
              <View key={option.key} style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>{option.label}</Text>
                <Switch
                  value={isEnabled}
                  onValueChange={(value) =>
                    handleNotificationToggle(option.key, value)
                  }
                  trackColor={{ false: colors.surface, true: colors.purple }}
                  thumbColor={isEnabled ? colors.accent : colors.muted}
                />
              </View>
            );
          })}
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gerenciamento de Dados</Text>

          <Pressable style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonText}>
              Exportar todos os dados
            </Text>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={handleDeleteAll}>
            <Text style={styles.deleteButtonText}>Apagar todos os dados</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
    fontFamily: typography.heading,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  textInput: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderRadius: borderRadius.button,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    fontSize: 16,
    borderWidth: 1,
    borderColor: colors.purple,
  },
  radioOption: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.chip,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  radioOptionSelected: {
    borderColor: colors.accent,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  radioOuterSelected: {
    borderColor: colors.accent,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  radioTextContainer: {
    flex: 1,
  },
  radioLabel: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
  },
  radioLabelSelected: {
    color: colors.accent,
  },
  radioDescription: {
    fontSize: 13,
    color: colors.muted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.chip,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
    marginRight: spacing.md,
  },
  exportButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },
  exportButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: 'transparent',
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
