import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
  SlideOutLeft,
  useReducedMotion,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getDatabase } from '../src/persistence/database';
import { useSettingsStore } from '../src/store/settings-store';
import { trackEvent } from '../src/analytics/analytics-service';
import { colors, spacing, borderRadius, typography } from '../src/ui/theme';

interface OnboardingPage {
  icon: string;
  title: string;
  subtitle: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: '\u{1F9D9}',
    title: 'Your Personal\nAI Dungeon Master',
    subtitle: 'Powered by real D&D 5e rules',
    description:
      'DungeonMind is an AI that runs full tabletop RPG sessions for you. It narrates, improvises NPCs, tracks your stats, rolls dice with real physics, and paints every scene.',
  },
  {
    icon: '\u{2694}\u{FE0F}',
    title: 'No Group Needed',
    subtitle: 'Solo adventures, real mechanics',
    description:
      'No scheduling. No waiting for a DM. Create a character through conversation, pick your world and adventure type, and start playing in under a minute.',
  },
  {
    icon: '\u{1F3AD}',
    title: 'Create Your Hero',
    subtitle: 'Tell the DM who you want to be',
    description:
      'Describe your character in your own words. The AI extracts your D&D stats, generates a portrait, and drops you into an opening scene tailored to your backstory.',
  },
];

export default function OnboardingScreen() {
  const [pageIndex, setPageIndex] = useState(0);
  const router = useRouter();
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const db = useMemo(() => getDatabase(), []);
  const reduceMotion = useReducedMotion();
  // pageIndex is always in range [0, PAGES.length - 1]
  const page = PAGES[pageIndex] as OnboardingPage;
  const isLast = pageIndex === PAGES.length - 1;

  useEffect(() => {
    trackEvent(db, 'onboarding_started');
  }, [db]);

  const advance = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      trackEvent(db, 'onboarding_completed');
      completeOnboarding(db);
      router.replace('/');
    } else {
      setPageIndex((i) => i + 1);
    }
  }, [isLast, completeOnboarding, db, router]);

  const skip = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    trackEvent(db, 'onboarding_skipped', { skipped_at_page: pageIndex });
    completeOnboarding(db);
    router.replace('/');
  }, [completeOnboarding, db, router, pageIndex]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.skipRow}>
        {!isLast ? (
          <Pressable onPress={skip} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip onboarding">
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        ) : (
          <View />
        )}
      </View>

      <Animated.View
        key={pageIndex}
        entering={reduceMotion ? FadeIn.duration(0) : SlideInRight.duration(300)}
        exiting={reduceMotion ? FadeOut.duration(0) : SlideOutLeft.duration(200)}
        style={styles.content}
      >
        <Text style={styles.icon}>{page.icon}</Text>
        <Text style={styles.title}>{page.title}</Text>
        <Text style={styles.subtitle}>{page.subtitle}</Text>
        <Text style={styles.description}>{page.description}</Text>
      </Animated.View>

      <View style={styles.footer}>
        <View style={styles.dots}>
          {PAGES.map((_, i) => (
            <Animated.View
              key={i}
              entering={FadeIn}
              exiting={FadeOut}
              style={[styles.dot, i === pageIndex && styles.dotActive]}
            />
          ))}
        </View>

        <Pressable
          style={styles.button}
          onPress={advance}
          accessibilityRole="button"
          accessibilityLabel={isLast ? 'Begin your adventure' : `Next, page ${String(pageIndex + 1)} of ${String(PAGES.length)}`}
        >
          <Text style={styles.buttonText}>
            {isLast ? 'Begin Your Adventure' : 'Next'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  skipRow: {
    alignItems: 'flex-end',
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  skipText: {
    color: colors.muted,
    fontSize: 16,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.lg,
  },
  title: {
    fontFamily: typography.heading,
    fontSize: 28,
    color: colors.accent,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  description: {
    fontSize: 17,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 340,
  },
  footer: {
    alignItems: 'center',
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  dots: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.muted,
    opacity: 0.4,
  },
  dotActive: {
    backgroundColor: colors.accent,
    opacity: 1,
    width: 24,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: borderRadius.button,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: typography.heading,
    fontSize: 18,
    color: colors.background,
  },
});
