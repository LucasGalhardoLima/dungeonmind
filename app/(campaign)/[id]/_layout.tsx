import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCampaignStore } from '../../../src/store/campaign-store';
import { useSessionStore } from '../../../src/store/session-store';
import { useRepository } from '../../../src/persistence/hooks/use-repository';
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

    // Load characters for this campaign
    repos.characters.getByCampaignId(id);

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

    // Load recent exchanges (last 20)
    const exchanges = repos.exchanges.getRecent(id, 20);
    setRecentExchanges(exchanges);

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
        <NarrativeLoading message="Retomando sua aventura..." />
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
      <Stack.Screen name="session" options={{ title: 'Sessão' }} />
      <Stack.Screen
        name="character"
        options={{
          title: 'Personagem',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="history"
        options={{
          title: 'Histórico',
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
