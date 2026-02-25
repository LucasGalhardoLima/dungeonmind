import { useState, useEffect } from 'react';
import { View, Text, ScrollView, Pressable, SafeAreaView, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Image } from 'expo-image';
import { useRepository } from '../../../src/persistence/hooks/use-repository';
import { colors, spacing, borderRadius, typography } from '../../../src/ui/theme';
import type { Session, SceneImage } from '../../../src/types/entities';

interface SessionWithImages {
  session: Session;
  images: SceneImage[];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function ChapterCard({
  sessionData,
  chapterNumber,
}: {
  sessionData: SessionWithImages;
  chapterNumber: number;
}) {
  const { session, images } = sessionData;

  return (
    <View style={styles.chapterCard}>
      <Text style={styles.chapterTitle}>
        Cap\u00edtulo {chapterNumber}
      </Text>
      <Text style={styles.chapterDate}>
        {formatDate(session.started_at)}
      </Text>

      {session.summary !== null ? (
        <Text style={styles.summaryText}>{session.summary}</Text>
      ) : (
        <Text style={styles.noSummaryText}>Resumo n\u00e3o dispon\u00edvel</Text>
      )}

      {images.length > 0 ? (
        <View style={styles.imagesContainer}>
          {images.map((image) => (
            <View key={image.id} style={styles.imageWrapper}>
              <Image
                source={{ uri: image.image_path }}
                style={styles.sceneImage}
                contentFit="cover"
              />
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default function SessionHistory() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const repos = useRepository();
  const [sessionsWithImages, setSessionsWithImages] = useState<SessionWithImages[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const sessions = repos.sessions.getByCampaignId(id);
    // Sessions come back DESC from repo; reverse to chronological (oldest first)
    const chronological = [...sessions].reverse();

    const enriched: SessionWithImages[] = chronological.map((session) => ({
      session,
      images: repos.sceneImages.getBySessionId(session.id),
    }));

    setSessionsWithImages(enriched);
    setLoading(false);
  }, [id, repos]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>{'\u2190'}</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Di\u00e1rio de Aventura</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.centered}>
            <Text style={styles.loadingText}>Carregando...</Text>
          </View>
        ) : sessionsWithImages.length === 0 ? (
          <View style={styles.centered}>
            <Text style={styles.emptyText}>
              Sua hist\u00f3ria ainda n\u00e3o come\u00e7ou...
            </Text>
          </View>
        ) : (
          sessionsWithImages.map((sessionData, index) => (
            <ChapterCard
              key={sessionData.session.id}
              sessionData={sessionData}
              chapterNumber={index + 1}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.accent,
    fontSize: 24,
  },
  headerTitle: {
    color: colors.accent,
    fontSize: 18,
    fontFamily: typography.heading,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  loadingText: {
    color: colors.muted,
    fontSize: 16,
    fontFamily: typography.body,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 16,
    fontFamily: typography.body,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  chapterCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.card,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  chapterTitle: {
    color: colors.accent,
    fontSize: 20,
    fontFamily: typography.heading,
    marginBottom: spacing.xs,
  },
  chapterDate: {
    color: colors.muted,
    fontSize: 13,
    fontFamily: typography.body,
    marginBottom: spacing.md,
  },
  summaryText: {
    color: colors.narration,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: typography.body,
  },
  noSummaryText: {
    color: colors.muted,
    fontSize: 14,
    fontFamily: typography.body,
    fontStyle: 'italic',
  },
  imagesContainer: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  imageWrapper: {
    borderRadius: borderRadius.button,
    overflow: 'hidden',
  },
  sceneImage: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.button,
  },
});
