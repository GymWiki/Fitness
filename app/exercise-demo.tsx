import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { ModalHeader } from '@/components/ModalHeader';
import { fetchExerciseMedia, type ExerciseMedia } from '@/lib/exerciseMedia';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

/**
 * Demonstration (start/end-position photos) + short "Let op" form cues for
 * one exercise, reached from the Progressie tab and Schema day detail.
 * `exerciseName`/`muscleGroup` come in as params from whichever screen
 * already has that data — this screen only adds the demo content on top,
 * see src/lib/exerciseMedia.ts. Exercises without a curated match (roughly
 * a third of the catalog — see migration 0007's notes) show a plain
 * fallback instead of a crash or a mismatched photo.
 */
export default function ExerciseDemoScreen() {
  const params = useLocalSearchParams<{ name?: string; muscleGroup?: string }>();
  const exerciseName = typeof params.name === 'string' ? params.name : undefined;
  const muscleGroup = typeof params.muscleGroup === 'string' ? params.muscleGroup : undefined;

  const [media, setMedia] = useState<ExerciseMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseName) {
      setError('Geen oefening opgegeven.');
      setIsLoading(false);
      return;
    }
    fetchExerciseMedia(exerciseName)
      .then(setMedia)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon demonstratie niet laden.'))
      .finally(() => setIsLoading(false));
  }, [exerciseName]);

  return (
    <View style={styles.container}>
      <ModalHeader title={exerciseName ?? 'Oefening'} subtitle={muscleGroup ?? undefined} />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && media && (
          <>
            <View style={styles.mediaRow}>
              {media.mediaUrls.map((url) => (
                <Image key={url} source={{ uri: url }} style={styles.mediaImage} resizeMode="cover" />
              ))}
            </View>

            <Card style={styles.tipsCard}>
              <Text style={styles.tipsTitle}>Let op</Text>
              {media.tips.map((tip) => (
                <View key={tip} style={styles.tipRow}>
                  <Text style={styles.tipBullet}>•</Text>
                  <Text style={styles.tipText}>{tip}</Text>
                </View>
              ))}
            </Card>

            <Text style={styles.attribution}>
              Media: {media.sourceName} ({media.sourceLicense})
            </Text>
          </>
        )}

        {!isLoading && !error && !media && (
          <Card style={styles.fallbackCard}>
            <Text style={typography.bodyStrong}>{exerciseName}</Text>
            {muscleGroup && <Text style={styles.fallbackMuscleGroup}>{muscleGroup}</Text>}
            <Text style={styles.fallbackBody}>Demonstratie nog niet beschikbaar voor deze oefening.</Text>
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  mediaImage: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  tipsCard: {
    gap: spacing.sm,
  },
  tipsTitle: {
    ...typography.bodyStrong,
  },
  tipRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  tipBullet: {
    color: colors.accent,
    fontSize: 14,
    lineHeight: 20,
  },
  tipText: {
    flex: 1,
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  attribution: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  fallbackCard: {
    gap: spacing.xs,
  },
  fallbackMuscleGroup: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  fallbackBody: {
    color: colors.textTertiary,
    fontSize: 14,
    marginTop: spacing.xs,
  },
});
