import type { RecoveryEstimate } from '@fitness/progression-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { RecoveryIndicator } from '@/components/RecoveryIndicator';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useAuth } from '@/lib/auth';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { useProfile } from '@/lib/profile';
import { fetchRecoveryEstimate } from '@/lib/recovery';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { fetchWeekReview, type WeekReview } from '@/lib/weekReview';

/** "borst" | "borst en rug" | "borst, rug en schouders" — natural Dutch list join, not a comma-only dump. */
function joinWithEn(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

export default function TodayScreen() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const syncStatus = useSyncStatus();
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [weekReview, setWeekReview] = useState<WeekReview | null>(null);
  const [recoveryByMuscleGroup, setRecoveryByMuscleGroup] = useState<Map<string, RecoveryEstimate>>(new Map());
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

    // Recovery indicators are a nice-to-have on top of the day plan, not a blocker: computed
    // separately so a failure here never keeps the rest of "Vandaag" from showing.
    const activeProgram = programResult.status === 'fulfilled' ? programResult.value : null;
    const nextDay = activeProgram?.days.find((day) => day.dayOrder === activeProgram.nextDayOrder) ?? null;
    const muscleGroups = [...new Set((nextDay?.exercises ?? []).map((exercise) => exercise.muscleGroup).filter((mg): mg is string => !!mg))];
    if (muscleGroups.length === 0) {
      setRecoveryByMuscleGroup(new Map());
      return;
    }
    try {
      const estimates = await Promise.all(muscleGroups.map((mg) => fetchRecoveryEstimate(session.user.id, mg)));
      setRecoveryByMuscleGroup(new Map(muscleGroups.map((mg, index) => [mg, estimates[index]!])));
    } catch {
      setRecoveryByMuscleGroup(new Map());
    }
  }, [session]);

  // Herlaadt bij elke focus, zodat het net-gelogde workout meteen de volgende dag verschuift.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const todayDay = program?.days.find((day) => day.dayOrder === program.nextDayOrder) ?? null;
  const firstName = profile?.displayName?.split(' ')[0];

  const readyMuscleGroups = todayDay
    ? [...new Set(todayDay.exercises.map((exercise) => exercise.muscleGroup).filter((mg): mg is string => !!mg))].filter(
        (mg) => recoveryByMuscleGroup.get(mg)?.status === 'ready',
      )
    : [];

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

      {!isLoading && !error && readyMuscleGroups.length > 0 && (
        <Card style={styles.recoveryBannerCard}>
          <Text style={styles.recoveryBannerTitle}>
            Je {joinWithEn(readyMuscleGroups.map((mg) => mg.toLowerCase()))} {readyMuscleGroups.length === 1 ? 'is' : 'zijn'} hersteld
          </Text>
          <Text style={styles.recoveryBannerBody}>Nu trainen bouwt door op je vooruitgang.</Text>
          <Pressable onPress={() => router.push({ pathname: '/faq', params: { openId: 'supercompensatie' } })}>
            <Text style={styles.recoveryBannerLink}>Waarom laat de app dit zien? →</Text>
          </Pressable>
        </Card>
      )}

      {!isLoading && !error && program && todayDay && (
        <Card style={styles.dayCard} elevated>
          <Text style={styles.programName}>{program.name}</Text>
          <Text style={styles.dayName}>
            Dag {todayDay.dayOrder}: {todayDay.name}
          </Text>
          {todayDay.exercises.map((exercise) => {
            const recovery = exercise.muscleGroup ? recoveryByMuscleGroup.get(exercise.muscleGroup) : undefined;
            return (
              <View key={exercise.id} style={styles.exerciseRow}>
                <View style={styles.exerciseHeaderRow}>
                  <Text style={styles.exerciseName}>{exercise.exerciseName}</Text>
                  {recovery && <RecoveryIndicator status={recovery.status} />}
                </View>
                <Text style={styles.exerciseDetail}>
                  {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps · RIR {exercise.targetRIR}
                </Text>
              </View>
            );
          })}
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
  recoveryBannerCard: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  recoveryBannerTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  recoveryBannerBody: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  recoveryBannerLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
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
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
