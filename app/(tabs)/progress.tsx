import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ChevronRightIcon } from '@/components/icons';
import { StatTile } from '@/components/StatTile';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { fetchAdjustmentHistory, type AdjustmentHistoryEntry } from '@/lib/adjustmentHistory';
import { useAuth } from '@/lib/auth';
import { formatShortDate } from '@/lib/dates';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { fetchLongestStreak, fetchMonthlyWorkoutCount, fetchWeeklyVolume } from '@/lib/progressStats';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const ADJUSTMENT_PREVIEW_COUNT = 3;

export default function ProgressScreen() {
  const { session } = useAuth();
  const router = useRouter();

  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [weeklyVolume, setWeeklyVolume] = useState<number | null>(null);
  const [monthlyWorkouts, setMonthlyWorkouts] = useState<number | null>(null);
  const [longestStreak, setLongestStreak] = useState<number | null>(null);
  const [adjustments, setAdjustments] = useState<AdjustmentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    const userId = session.user.id;
    const results = await Promise.allSettled([
      fetchActiveProgram(userId),
      fetchWeeklyVolume(userId),
      fetchMonthlyWorkoutCount(userId),
      fetchLongestStreak(userId),
      fetchAdjustmentHistory(userId),
    ]);
    const [programResult, volumeResult, monthlyResult, streakResult, adjustmentsResult] = results;

    if (programResult.status === 'fulfilled') setProgram(programResult.value);
    if (volumeResult.status === 'fulfilled') setWeeklyVolume(volumeResult.value);
    if (monthlyResult.status === 'fulfilled') setMonthlyWorkouts(monthlyResult.value);
    if (streakResult.status === 'fulfilled') setLongestStreak(streakResult.value);
    if (adjustmentsResult.status === 'fulfilled') setAdjustments(adjustmentsResult.value);

    if (results.every((result) => result.status === 'rejected')) {
      setError('Kon je progressie niet laden.');
    }
    setIsLoading(false);
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const exercises = program?.days.flatMap((day) => day.exercises) ?? [];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Progressie</Text>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && (
          <>
            <View style={styles.statsRow}>
              <StatTile label="Volume deze week" value={weeklyVolume !== null ? `${Math.round(weeklyVolume).toLocaleString('nl-NL')} kg` : '–'} />
              <StatTile label="Trainingen deze maand" value={monthlyWorkouts !== null ? String(monthlyWorkouts) : '–'} />
              <StatTile label="Langste streak" value={longestStreak !== null ? `${longestStreak} wk` : '–'} />
            </View>

            <Text style={styles.sectionTitle}>Per oefening</Text>
            {exercises.length === 0 && <EmptyState title="Nog geen oefeningen" body="Zodra je programma actief is, zie je hier per oefening je ontwikkeling." />}
            {exercises.map((exercise) => (
              <Pressable
                key={exercise.id}
                style={styles.exerciseLinkRow}
                onPress={() =>
                  router.push({ pathname: '/history/[dayExerciseId]', params: { dayExerciseId: exercise.id, exerciseName: exercise.exerciseName, kind: exercise.kind } })
                }
              >
                <Text style={styles.exerciseLinkText}>{exercise.exerciseName}</Text>
                <ChevronRightIcon size={18} color={colors.textSecondary} />
              </Pressable>
            ))}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Aanpassingsgeschiedenis</Text>
              <Pressable onPress={() => router.push('/adjustment-history')}>
                <Text style={styles.sectionLink}>Bekijk alles</Text>
              </Pressable>
            </View>
            {adjustments.length === 0 && (
              <EmptyState title="Nog geen aanpassingen" body="Zodra je een trainingsweek afrondt, verschijnt hier wat er is veranderd en waarom." />
            )}
            {adjustments.slice(0, ADJUSTMENT_PREVIEW_COUNT).map((entry) => (
              <Card key={entry.id} style={styles.adjustmentCard}>
                <View style={styles.adjustmentHeaderRow}>
                  <Text style={styles.adjustmentTitle}>{adjustmentTitle(entry.type, entry.exerciseName)}</Text>
                  <Text style={styles.adjustmentDate}>{formatShortDate(entry.createdAt)}</Text>
                </View>
                <Text style={styles.adjustmentExplanation}>{entry.explanation}</Text>
              </Card>
            ))}
          </>
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
    paddingTop: 48,
    gap: spacing.sm,
  },
  title: {
    ...typography.display,
    marginBottom: spacing.md,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.heading,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  exerciseLinkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  exerciseLinkText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  adjustmentCard: {
    marginBottom: spacing.sm,
    gap: spacing.xs,
  },
  adjustmentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  adjustmentTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    flexShrink: 1,
  },
  adjustmentDate: {
    color: colors.textSecondary,
    fontSize: 12,
    marginLeft: spacing.md,
  },
  adjustmentExplanation: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
});
