import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useAuth } from '@/lib/auth';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { useProfile } from '@/lib/profile';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { fetchWeekReview, type WeekReview } from '@/lib/weekReview';

export default function TodayScreen() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const syncStatus = useSyncStatus();
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [weekReview, setWeekReview] = useState<WeekReview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    // Independent: fetchActiveProgram can succeed from cache while offline even if
    // fetchWeekReview (which needs a fresh workout count, so isn't cached) fails —
    // one shouldn't block the other from showing.
    const [programResult, reviewResult] = await Promise.allSettled([
      fetchActiveProgram(session.user.id),
      fetchWeekReview(session.user.id),
    ]);

    if (programResult.status === 'fulfilled') {
      setProgram(programResult.value);
    } else {
      setError(programResult.reason instanceof Error ? programResult.reason.message : 'Kon je programma niet laden.');
    }
    setWeekReview(reviewResult.status === 'fulfilled' ? reviewResult.value : null);
    setIsLoading(false);
  }, [session]);

  // Herlaadt bij elke focus, zodat het net-gelogde workout meteen de volgende dag verschuift.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const todayDay = program?.days.find((day) => day.dayOrder === program.nextDayOrder) ?? null;
  const firstName = profile?.displayName?.split(' ')[0];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vandaag</Text>
          {firstName ? <Text style={styles.greeting}>Hoi {firstName}</Text> : null}
        </View>
        <SyncStatusBadge status={syncStatus} />
      </View>

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && !error && weekReview && (
        <Pressable onPress={() => router.push('/week-review')}>
          <Card style={styles.weekReviewCard}>
            <Text style={styles.weekReviewTitle}>Week {weekReview.weekNumber} voltooid</Text>
            <Text style={styles.weekReviewBody}>
              {weekReview.adjustments.length > 0
                ? `${weekReview.adjustments.length} voorgestelde aanpassing${weekReview.adjustments.length === 1 ? '' : 'en'} — bekijk en bevestig`
                : 'Bekijk je week-overzicht'}
            </Text>
          </Card>
        </Pressable>
      )}

      {!isLoading && !error && program && todayDay && (
        <Card style={styles.dayCard} elevated>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={styles.dayName}>
            Dag {todayDay.dayOrder}: {todayDay.name}
          </Text>
          {todayDay.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseRow}>
              <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
              <Text style={styles.exerciseDetail}>
                {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps · RIR {exercise.targetRIR}
              </Text>
            </View>
          ))}
          <View style={styles.startButtonWrap}>
            <Button onPress={() => router.push(`/workout/${todayDay.id}`)}>Start workout</Button>
          </View>
        </Card>
      )}

      {!isLoading && !error && !program && (
        <EmptyState title="Nog geen actief programma" body="Zodra je de intake afrondt, verschijnt hier je eerstvolgende training." />
      )}
    </ScrollView>
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
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
  },
  greeting: {
    ...typography.bodySecondary,
    marginTop: 2,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },
  weekReviewCard: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
    marginTop: spacing.sm,
  },
  weekReviewTitle: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  weekReviewBody: {
    color: colors.background,
    fontSize: 14,
    marginTop: 2,
    opacity: 0.85,
  },
  dayCard: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  programName: {
    ...typography.label,
  },
  dayName: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  exerciseRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  exerciseName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  exerciseDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
  startButtonWrap: {
    marginTop: spacing.md,
  },
});
