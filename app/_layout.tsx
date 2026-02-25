import '../global.css';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getDatabase } from '../src/persistence/database';
import {
  RepositoryContext,
  createRepositories,
} from '../src/persistence/hooks/use-repository';
import { useCampaignStore } from '../src/store/campaign-store';
import { useSettingsStore } from '../src/store/settings-store';
import { NarrativeLoading } from '../src/ui/NarrativeLoading';
import { OfflineFallback } from '../src/ui/OfflineFallback';
import { colors } from '../src/ui/theme';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
    },
  },
});

export default function RootLayout() {
  const [appReady, setAppReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const connectivityTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkConnectivity = useCallback(() => {
    fetch('https://ai-gateway.vercel.sh', { method: 'HEAD' })
      .then(() => setIsOffline(false))
      .catch(() => setIsOffline(true));
  }, []);

  useEffect(() => {
    checkConnectivity();
    connectivityTimer.current = setInterval(checkConnectivity, 30_000);
    return () => {
      if (connectivityTimer.current) {
        clearInterval(connectivityTimer.current);
      }
    };
  }, [checkConnectivity]);

  // GeistPixel is the primary heading font. SpaceMono as fallback until
  // the actual GeistPixel OTF is added to assets/fonts/.
  const [fontsLoaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    // TODO: Replace with GeistPixel.otf once the font file is obtained
    // GeistPixel: require('../assets/fonts/GeistPixel.otf'),
  });

  const db = useMemo(() => getDatabase(), []);
  const repos = useMemo(() => createRepositories(db), [db]);

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const settingsLoaded = useSettingsStore((s) => s.isLoaded);
  const playerId = useSettingsStore((s) => s.getPlayerId);

  const hydrateCampaigns = useCampaignStore((s) => s.hydrate);
  const campaignsLoaded = useCampaignStore((s) => s.isLoaded);

  useEffect(() => {
    hydrateSettings(db);
  }, [db, hydrateSettings]);

  useEffect(() => {
    const id = playerId();
    if (settingsLoaded && id) {
      hydrateCampaigns(repos, id);
    }
  }, [settingsLoaded, playerId, repos, hydrateCampaigns]);

  useEffect(() => {
    if (fontsLoaded && settingsLoaded && campaignsLoaded) {
      setAppReady(true);
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, settingsLoaded, campaignsLoaded]);

  if (!appReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style="light" />
        <NarrativeLoading message="Preparando sua aventura..." />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <RepositoryContext.Provider value={repos}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'fade',
          }}
        >
          <Stack.Screen name="(campaign)" options={{ animation: 'fade' }} />
          <Stack.Screen
            name="settings"
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
            }}
          />
        </Stack>
        <OfflineFallback
          isOffline={isOffline}
          onRetry={checkConnectivity}
        />
      </RepositoryContext.Provider>
    </QueryClientProvider>
  );
}
