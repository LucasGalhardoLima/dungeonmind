import { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { CampaignCard } from '../src/ui/CampaignCard';
import { useCampaignStore } from '../src/store/campaign-store';
import { colors, spacing, borderRadius } from '../src/ui/theme';

const FREE_TIER_ACTIVE_LIMIT = 1;

export default function CampaignHub() {
  const campaigns = useCampaignStore((s) => s.campaigns);
  const [freeTierWarning, setFreeTierWarning] = useState(false);

  const activeCampaigns = campaigns
    .filter((c) => c.status === 'active')
    .sort(
      (a, b) =>
        new Date(b.last_played_at).getTime() -
        new Date(a.last_played_at).getTime(),
    );

  const handleNewCampaign = () => {
    if (activeCampaigns.length >= FREE_TIER_ACTIVE_LIMIT) {
      setFreeTierWarning(true);
      return;
    }

    setFreeTierWarning(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(campaign)/new/world');
  };

  const handleCampaignPress = (id: string) => {
    router.push(`/(campaign)/${id}/session`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>DungeonMind</Text>
          <Text style={styles.subtitle}>Suas Aventuras</Text>
        </View>

        {activeCampaigns.length === 0 ? (
          /* Empty State */
          <View style={styles.emptyState}>
            <Text style={styles.emptyMessage}>Nenhuma aventura ativa</Text>
            <Text style={styles.emptyHint}>
              Sua primeira história aguarda...
            </Text>
          </View>
        ) : (
          /* Campaign List */
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeCampaigns.map((campaign) => (
              <View key={campaign.id} style={styles.cardWrapper}>
                <CampaignCard
                  id={campaign.id}
                  name={campaign.name}
                  world={campaign.world}
                  adventureType={campaign.adventure_type}
                  sessionCount={campaign.session_count}
                  lastPlayedAt={campaign.last_played_at}
                  thumbnailPath={campaign.thumbnail_path}
                  onPress={handleCampaignPress}
                />
              </View>
            ))}
          </ScrollView>
        )}

        {/* Free Tier Warning */}
        {freeTierWarning && (
          <View style={styles.warningContainer}>
            <Text style={styles.warningText}>
              Você já tem uma campanha ativa. Arquive ou finalize a campanha
              atual para iniciar uma nova.
            </Text>
          </View>
        )}

        {/* New Campaign Button */}
        <View style={styles.buttonContainer}>
          <Pressable onPress={handleNewCampaign} style={styles.newCampaignButton}>
            <Text style={styles.newCampaignButtonText}>Nova Campanha</Text>
          </Pressable>
        </View>
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
    paddingHorizontal: spacing.lg,
  },
  header: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.accent,
    fontFamily: 'SpaceMono',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  emptyMessage: {
    fontSize: 18,
    color: colors.muted,
    textAlign: 'center',
  },
  emptyHint: {
    fontSize: 14,
    color: colors.muted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.md,
  },
  cardWrapper: {
    marginBottom: 0,
  },
  warningContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.chip,
    borderWidth: 1,
    borderColor: colors.danger,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  warningText: {
    color: colors.danger,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  buttonContainer: {
    paddingVertical: spacing.md,
  },
  newCampaignButton: {
    backgroundColor: colors.accent,
    borderRadius: borderRadius.button,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newCampaignButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
