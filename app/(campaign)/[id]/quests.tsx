import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useCampaignStore } from '../../../src/store/campaign-store';
import { useRepository } from '../../../src/persistence/hooks/use-repository';
import type { QuestLog } from '../../../src/persistence/repositories/quest-log-repository';
import { colors, spacing, typography } from '../../../src/ui/theme';

export default function QuestsScreen() {
  const repos = useRepository();
  const selectedCampaign = useCampaignStore((s) => s.getSelectedCampaign());
  const [quests, setQuests] = useState<QuestLog[]>([]);

  useEffect(() => {
    if (!selectedCampaign) return;
    setQuests(repos.questLogs.getByCampaignId(selectedCampaign.id));
  }, [selectedCampaign, repos]);

  const activeQuests = quests.filter((q) => q.status === 'active');
  const completedQuests = quests.filter((q) => q.status !== 'active');

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Quest Journal</Text>

        {activeQuests.length === 0 && completedQuests.length === 0 && (
          <Text style={styles.emptyText}>No quests recorded yet.</Text>
        )}

        {activeQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active</Text>
            {activeQuests.map((quest) => (
              <View key={quest.id} style={styles.questCard}>
                <Text style={styles.questTitle}>{quest.title}</Text>
                <Text style={styles.questDescription}>{quest.description}</Text>
              </View>
            ))}
          </View>
        )}

        {completedQuests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedQuests.map((quest) => (
              <View key={quest.id} style={[styles.questCard, styles.questCardCompleted]}>
                <Text style={styles.questTitle}>
                  {quest.status === 'completed' ? '\u2713 ' : '\u2717 '}
                  {quest.title}
                </Text>
                <Text style={styles.questDescription}>{quest.description}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxl },
  heading: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '700',
    fontFamily: typography.heading,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: typography.body,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  section: { marginBottom: spacing.lg },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
    fontFamily: typography.heading,
    marginBottom: spacing.sm,
  },
  questCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  questCardCompleted: { opacity: 0.6 },
  questTitle: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '600',
    fontFamily: typography.heading,
    marginBottom: 4,
  },
  questDescription: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: typography.body,
  },
});
