import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  Switch,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { useSettingsStore } from '../src/store/settings-store';
import { useRepository } from '../src/persistence/hooks/use-repository';
import { getDatabase } from '../src/persistence/database';
import { useFeedbackStore } from '../src/feedback/feedback-store';
import { getAnalyticsSummary, exportAnalyticsJson } from '../src/feedback/session-analytics';
import { trackEvent } from '../src/analytics/analytics-service';
import { colors, spacing, borderRadius, typography } from '../src/ui/theme';
import type { Difficulty } from '../src/types/entities';

const DIFFICULTY_OPTIONS: ReadonlyArray<{
  value: Difficulty;
  label: string;
  description: string;
}> = [
  {
    value: 'beginner',
    label: 'Beginner',
    description: 'Fate is kind to heroes',
  },
  {
    value: 'standard',
    label: 'Standard',
    description: 'Fate is fair',
  },
  {
    value: 'hardcore',
    label: 'Hardcore',
    description: 'Fate shows no mercy',
  },
] as const;

const NOTIFICATION_OPTIONS: ReadonlyArray<{
  key: string;
  label: string;
}> = [
  { key: 'turn_reminder', label: 'Turn Reminders' },
  { key: 'session_summary', label: 'Session Summary' },
  { key: 'campaign_nudge', label: 'Inactive Campaign Reminder' },
  { key: 'story_continuation', label: 'Story Continuation' },
] as const;

const DELETE_TABLES = [
  'analytics_event',
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
  const updateAnalyticsOptOut = useSettingsStore((s) => s.updateAnalyticsOptOut);
  const repos = useRepository();

  const showFeedbackModal = useFeedbackStore((s) => s.showModal);

  useEffect(() => {
    trackEvent(db, 'settings_opened');
  }, [db]);

  const [displayName, setDisplayName] = useState(
    player?.display_name ?? 'Adventurer',
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
          'The Narrator Speaks...',
          'Your scrolls have been gathered. Would you like to share them with the outside world?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share',
              onPress: () => {
                void Sharing.shareAsync(filePath);
              },
            },
          ],
        );
      });
    } catch {
      Alert.alert('Error', 'Unable to export data.');
    }
  }, [player, repos]);

  const handleAnalyticsOptOutToggle = useCallback(
    (optOut: boolean) => {
      updateAnalyticsOptOut(db, optOut);
    },
    [db, updateAnalyticsOptOut],
  );

  const handleSendFeedback = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent(db, 'feedback_submitted');
    showFeedbackModal();
  }, [db, showFeedbackModal]);

  const handleExportAnalytics = useCallback(() => {
    try {
      const json = exportAnalyticsJson(db);
      const filePath = `${FileSystem.cacheDirectory ?? ''}dungeonmind-analytics.json`;
      void FileSystem.writeAsStringAsync(filePath, json).then(() => {
        Alert.alert(
          'Session Data',
          'Report generated without personal data. Share with the team?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Share',
              onPress: () => {
                void Sharing.shareAsync(filePath);
              },
            },
          ],
        );
      });
    } catch {
      Alert.alert('Error', 'Unable to export session data.');
    }
  }, [db]);

  const handleDeleteAll = useCallback(() => {
    Alert.alert(
      'The Narrator Warns...',
      'This action is irreversible. All your characters, campaigns, and stories will be lost forever. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
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
          <Text style={styles.loadingText}>Loading settings...</Text>
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
        <Text style={styles.title}>Settings</Text>

        {/* Player Display Name */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Player Name</Text>
          <TextInput
            style={styles.textInput}
            value={displayName}
            onChangeText={setDisplayName}
            onBlur={handleDisplayNameBlur}
            placeholder="Your adventurer name"
            placeholderTextColor={colors.muted}
            maxLength={50}
            returnKeyType="done"
          />
        </View>

        {/* Difficulty Preference */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Difficulty</Text>
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
            <Text style={styles.toggleLabel}>Mature Content</Text>
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
          <Text style={styles.sectionTitle}>Notifications</Text>
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

        {/* Analytics Privacy */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>
          <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Disable Analytics</Text>
            <Switch
              value={player.analytics_opt_out}
              onValueChange={handleAnalyticsOptOutToggle}
              trackColor={{ false: colors.surface, true: colors.purple }}
              thumbColor={player.analytics_opt_out ? colors.accent : colors.muted}
            />
          </View>
          <Text style={styles.sectionHint}>
            Analytics never collect personal data. Disabling stops all event
            tracking.
          </Text>
        </View>

        {/* Beta Feedback */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Beta Feedback</Text>
          <Text style={styles.sectionHint}>
            Help improve DungeonMind! Shake your device at any time to send
            feedback quickly.
          </Text>

          <Pressable style={styles.feedbackButton} onPress={handleSendFeedback}>
            <Text style={styles.feedbackButtonText}>Send Feedback</Text>
          </Pressable>

          <Pressable style={styles.analyticsButton} onPress={handleExportAnalytics}>
            <Text style={styles.analyticsButtonText}>
              Export session data (without personal data)
            </Text>
          </Pressable>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>

          <Pressable style={styles.exportButton} onPress={handleExport}>
            <Text style={styles.exportButtonText}>
              Export all data
            </Text>
          </Pressable>

          <Pressable style={styles.deleteButton} onPress={handleDeleteAll}>
            <Text style={styles.deleteButtonText}>Delete all data</Text>
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
  sectionHint: {
    fontSize: 13,
    color: colors.muted,
    fontStyle: 'italic',
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  feedbackButton: {
    backgroundColor: colors.purple,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.accent,
    marginBottom: spacing.md,
  },
  feedbackButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: 'bold',
  },
  analyticsButton: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.purple,
    marginBottom: spacing.sm,
  },
  analyticsButtonText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
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
