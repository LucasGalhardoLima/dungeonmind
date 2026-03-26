import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams, router } from 'expo-router';
import { useCampaignStore } from '../../../src/store/campaign-store';
import { useSessionStore } from '../../../src/store/session-store';
import { useRepository } from '../../../src/persistence/hooks/use-repository';
import { getDatabase } from '../../../src/persistence/database';
import { recordSessionStart } from '../../../src/feedback/session-analytics';
import { addBreadcrumb } from '../../../src/feedback/sentry';
import { NarrativeLoading } from '../../../src/ui/NarrativeLoading';
import { colors } from '../../../src/ui/theme';

export default function CampaignLayout() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isReady, setIsReady] = useState(false);

  const repos = useRepository();

  const selectCampaign = useCampaignStore((s) => s.selectCampaign);
  const setActiveSession = useSessionStore((s) => s.setActiveSession);
  const setRecentExchanges = useSessionStore((s) => s.setRecentExchanges);
  const setCurrentSceneImagePath = useSessionStore(
    (s) => s.setCurrentSceneImagePath
  );

  useEffect(() => {
    return () => {
      useSessionStore.getState().reset();
    };
  }, []);

  useEffect(() => {
    if (!id) return;

    selectCampaign(id);

    // Load campaign data from SQLite
    const campaign = repos.campaigns.getById(id);
    if (!campaign) return;

    // Check if character creation was completed
    const characters = repos.characters.getByCampaignId(id);
    if (characters.length === 0) {
      // No character yet — redirect to character creation
      router.replace({
        pathname: '/(campaign)/create-character',
        params: {
          campaignId: id,
          world: campaign.world,
          adventureType: campaign.adventure_type,
        },
      });
      return;
    }

    // Load or create an active session
    let session = repos.sessions.getLatest(id);
    if (!session || session.ended_at !== null) {
      session = repos.sessions.create({
        campaign_id: id,
        summary: null,
        summary_generated_at: null,
        ended_at: null,
        is_multiplayer: false,
      });
    }
    setActiveSession(session);

    // Record session analytics start
    try {
      const db = getDatabase();
      recordSessionStart(db, session.id, id, session.started_at);
      addBreadcrumb('session', `Session started: ${session.id}`);
    } catch {
      // Analytics recording failure is non-critical
    }

    // Load recent exchanges (last 20)
    const exchanges = repos.exchanges.getRecent(id, 20);

    // Seed the opening hook as the first DM exchange for brand-new campaigns.
    // The hook is already player-selected narrative prose — no AI call needed.
    let finalExchanges = exchanges;
    if (exchanges.length === 0 && campaign.opening_hook.trim().length > 0) {
      const hookExchange = repos.exchanges.create({
        session_id: session.id,
        campaign_id: id,
        role: 'dm',
        content: campaign.opening_hook,
        metadata: JSON.stringify({ trigger: 'campaign_start' }),
        sequence: 0,
      });
      finalExchanges = [hookExchange];
    }

    setRecentExchanges(finalExchanges);

    // Load latest scene image path
    const latestScene = repos.sceneImages.getLatest(id);
    setCurrentSceneImagePath(latestScene?.image_path ?? null);

    setIsReady(true);
  }, [
    id,
    repos,
    selectCampaign,
    setActiveSession,
    setRecentExchanges,
    setCurrentSceneImagePath,
  ]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <NarrativeLoading message="Resuming your adventure..." />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen name="session" options={{ title: 'Session' }} />
      <Stack.Screen
        name="character"
        options={{
          title: 'Character',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'History',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="quests"
        options={{
          title: 'Quests',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
