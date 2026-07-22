import {
  adviseCardioProgression,
  adviseNextCardioType,
  computeWeeklyDistribution,
  getStrengthAdvice,
  type CardioLog,
  type Goal,
  type IntervalAdvice,
  type StrengthAdvice,
  type StrengthExerciseConfig,
  type StrengthSessionLog,
  type Zone2Advice,
} from '@fitness/progression-engine';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useAuth } from '@/lib/auth';
import { formatShortDate } from '@/lib/dates';
import { fetchCardioHistory, fetchExerciseHistory, type CardioHistoryEntry, type HistorySession } from '@/lib/history';
import { generateId } from '@/lib/id';
import { enqueue } from '@/lib/offlineQueue';
import { useProfile } from '@/lib/profile';
import { fetchProgramDayWithExercises, type ProgramDayForWorkout, type WorkoutExercise } from '@/lib/programs';
import { restGuidanceFor } from '@/lib/restGuidance';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const RIR_OPTIONS = [0, 1, 2, 3, 4];

const STRENGTH_ADVICE_LABELS: Record<StrengthAdvice['action'], string> = {
  increase_weight: 'Omhoog',
  maintain: 'Gelijk',
  decrease_weight: 'Omlaag',
};

const STRENGTH_ADVICE_BADGE_COLORS: Record<StrengthAdvice['action'], { backgroundColor: string; textColor: string }> = {
  increase_weight: { backgroundColor: colors.accent, textColor: colors.background },
  maintain: { backgroundColor: colors.surfaceElevated, textColor: colors.textPrimary },
  decrease_weight: { backgroundColor: colors.danger, textColor: colors.background },
};

export default function WorkoutScreen() {
  const params = useLocalSearchParams<{ dayId: string }>();
  const dayId = typeof params.dayId === 'string' ? params.dayId : undefined;
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const goal: Goal = profile?.goal ?? 'mixed';

  const workoutId = useMemo(() => generateId(), []);

  const [day, setDay] = useState<ProgramDayForWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    if (!dayId) {
      setLoadError('Geen trainingsdag opgegeven.');
      setIsLoading(false);
      return;
    }
    fetchProgramDayWithExercises(dayId)
      .then((result) => {
        if (!result) {
          setLoadError('Deze trainingsdag bestaat niet (meer).');
          return;
        }
        setDay(result);
      })
      .catch((err) =>
        setLoadError(
          err instanceof Error
            ? `${err.message} (nog niet eerder offline geladen, dus zonder verbinding niet beschikbaar)`
            : 'Kon workout niet laden.',
        ),
      )
      .finally(() => setIsLoading(false));
  }, [dayId]);

  useEffect(() => {
    if (!session || !day) return;
    enqueue({
      type: 'create_workout',
      payload: { workoutId, userId: session.user.id, programDayId: day.id, performedAt: new Date().toISOString() },
    });
    // Runs once per screen visit: workoutId, session and day are all stable for the lifetime of this screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day]);

  const exercise = day?.exercises[exerciseIndex] ?? null;

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (loadError || !day) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{loadError ?? 'Workout niet gevonden.'}</Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Terug
        </Button>
      </View>
    );
  }

  if (!exercise) {
    return (
      <View style={styles.centered}>
        <EmptyState title="Geen oefeningen" body="Deze trainingsdag heeft nog geen oefeningen om te loggen." />
        <Button variant="secondary" onPress={() => router.back()}>
          Terug
        </Button>
      </View>
    );
  }

  const isCardio = exercise.kind !== 'strength';
  const isLastExercise = exerciseIndex === day.exercises.length - 1;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.closeButtonWrap}>
            <Text style={styles.closeButton}>Sluiten</Text>
          </Pressable>
          <SyncStatusBadge status={syncStatus} />
        </View>

        <Text style={typography.label}>{day.name}</Text>
        <Text style={styles.progress}>
          Oefening {exerciseIndex + 1} van {day.exercises.length}
        </Text>

        <View style={styles.exerciseHeaderRow}>
          <Text style={[typography.title, styles.exerciseName]}>{exercise.exerciseName}</Text>
          <Pressable
            hitSlop={8}
            style={styles.historyLinkWrap}
            onPress={() =>
              router.push({
                pathname: '/history/[dayExerciseId]',
                params: { dayExerciseId: exercise.id, exerciseName: exercise.exerciseName, kind: exercise.kind },
              })
            }
          >
            <Text style={styles.historyLink}>Historie</Text>
          </Pressable>
        </View>

        {isCardio ? (
          <CardioLogger key={exercise.id} exercise={exercise} workoutId={workoutId} goal={goal} />
        ) : (
          <StrengthLogger key={exercise.id} exercise={exercise} workoutId={workoutId} goal={goal} />
        )}
      </ScrollView>

      <View style={styles.nav}>
        <Button variant="ghost" disabled={exerciseIndex === 0} onPress={() => setExerciseIndex(exerciseIndex - 1)}>
          Vorige
        </Button>

        {isLastExercise ? (
          <Button onPress={() => router.back()}>Workout voltooien</Button>
        ) : (
          <Button onPress={() => setExerciseIndex(exerciseIndex + 1)}>Volgende oefening</Button>
        )}
      </View>
    </View>
  );
}

// ---------- Kracht ----------

interface LoggedSet {
  id: string;
  setOrder: number;
  weightKg: number;
  reps: number;
  rir: number;
}

function StrengthLogger({ exercise, workoutId, goal }: { exercise: WorkoutExercise; workoutId: string; goal: Goal }) {
  const { session } = useAuth();
  const [history, setHistory] = useState<HistorySession[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>([]);
  const [weightKg, setWeightKg] = useState(0);
  const [reps, setReps] = useState(exercise.repRangeMax ?? 0);
  const [rir, setRir] = useState(exercise.targetRIR ?? 1);

  useEffect(() => {
    if (!session) return;
    setIsHistoryLoading(true);
    setHistoryError(null);
    fetchExerciseHistory(session.user.id, exercise.exerciseName)
      .then(setHistory)
      .catch((err) => setHistoryError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
      .finally(() => setIsHistoryLoading(false));
  }, [session, exercise.exerciseName]);

  const advice = useMemo<StrengthAdvice | null>(() => {
    if (history.length === 0) return null;
    const config: StrengthExerciseConfig = {
      repRangeMin: exercise.repRangeMin ?? 0,
      repRangeMax: exercise.repRangeMax ?? 0,
      targetRIR: exercise.targetRIR ?? 1,
      exerciseType: exercise.exerciseType ?? 'compound',
      weightIncrementKg: exercise.weightIncrementKg,
    };
    const sessionHistory: StrengthSessionLog[] = history.map((s) => ({
      date: s.performedAt,
      sets: s.sets.map((set) => ({ weightKg: set.weightKg, reps: set.reps, rir: set.rir })),
    }));
    const lastSession = history[history.length - 1]!;
    const currentWeightKg = Math.max(...lastSession.sets.map((set) => set.weightKg));
    return getStrengthAdvice(config, currentWeightKg, sessionHistory);
  }, [exercise, history]);

  useEffect(() => {
    if (advice && loggedSets.length === 0) {
      setWeightKg(advice.weightKg);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [advice]);

  async function logSet() {
    const setOrder = loggedSets.length + 1;
    const setLogId = generateId();
    await enqueue({
      type: 'log_set',
      payload: { setLogId, workoutId, dayExerciseId: exercise.id, setOrder, weightKg, reps, rir },
    });
    setLoggedSets((prev) => [...prev, { id: setLogId, setOrder, weightKg, reps, rir }]);
  }

  return (
    <>
      <Text style={[typography.bodySecondary, styles.target]}>
        Doel: {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps, RIR {exercise.targetRIR}
      </Text>

      <StrengthAdviceCard
        isLoading={isHistoryLoading}
        error={historyError}
        lastSession={history.length > 0 ? history[history.length - 1]! : null}
        advice={advice}
      />

      {loggedSets.length === 0 && (
        <Text style={styles.tip}>Tip: bouw op naar dit gewicht met 1-2 lichtere sets voordat je je eerste werkset logt.</Text>
      )}

      <Stepper label="Gewicht (kg)" value={weightKg} step={exercise.weightIncrementKg} min={0} onChange={setWeightKg} />
      <Stepper label="Herhalingen" value={reps} step={1} min={0} onChange={setReps} />

      <Text style={styles.stepperLabel}>RIR (reps in reserve)</Text>
      <View style={styles.rirRow}>
        {RIR_OPTIONS.map((option) => (
          <Pressable key={option} style={[styles.rirButton, rir === option && styles.rirButtonSelected]} onPress={() => setRir(option)}>
            <Text style={[styles.rirButtonText, rir === option && styles.rirButtonTextSelected]}>{option}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.logButtonWrap}>
        <Button onPress={logSet}>{`Set ${loggedSets.length + 1} loggen`}</Button>
      </View>
      <Text style={styles.tip}>{restGuidanceFor(goal)}</Text>

      {loggedSets.length > 0 && (
        <View style={styles.loggedList}>
          {loggedSets.map((set) => (
            <Text key={set.id} style={styles.loggedLine}>
              Gelogd — Set {set.setOrder}: {set.weightKg} kg × {set.reps} reps (RIR {set.rir})
            </Text>
          ))}
        </View>
      )}
    </>
  );
}

function StrengthAdviceCard({
  isLoading,
  error,
  lastSession,
  advice,
}: {
  isLoading: boolean;
  error: string | null;
  lastSession: HistorySession | null;
  advice: StrengthAdvice | null;
}) {
  const [isExpanded, setIsExpanded] = useState(false);

  if (isLoading) {
    return (
      <Card style={styles.adviceCard}>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.adviceCard}>
        <Text style={styles.error}>{error}</Text>
      </Card>
    );
  }

  if (!lastSession || !advice) {
    return (
      <Card style={styles.adviceCard}>
        <Text style={typography.bodySecondary}>Nog geen historie voor deze oefening. Kies zelf een startgewicht voor de eerste set.</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.adviceCard}>
      <View style={styles.adviceHeaderRow}>
        <Text
          style={[
            styles.adviceBadge,
            {
              backgroundColor: STRENGTH_ADVICE_BADGE_COLORS[advice.action].backgroundColor,
              color: STRENGTH_ADVICE_BADGE_COLORS[advice.action].textColor,
            },
          ]}
        >
          {STRENGTH_ADVICE_LABELS[advice.action]}
        </Text>
        <Text style={styles.adviceWeight}>{advice.weightKg} kg</Text>
      </View>
      <Text style={typography.bodySecondary}>{advice.explanation}</Text>

      <Pressable onPress={() => setIsExpanded((current) => !current)} hitSlop={8} style={styles.whyToggleWrap}>
        <Text style={styles.whyToggle}>{isExpanded ? 'Verberg details' : 'Waarom?'}</Text>
      </Pressable>
      {isExpanded && (
        <Text style={styles.whyDetail}>
          Vergeleken met je laatste sessie ({formatShortDate(lastSession.performedAt)}):{' '}
          {lastSession.sets.map((set) => `${set.weightKg} kg × ${set.reps} (RIR ${set.rir})`).join(', ')}.
        </Text>
      )}
    </Card>
  );
}

// ---------- Cardio ----------

function CardioLogger({ exercise, workoutId, goal }: { exercise: WorkoutExercise; workoutId: string; goal: Goal }) {
  const [history, setHistory] = useState<CardioHistoryEntry[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const [isLogged, setIsLogged] = useState(false);
  const [isWhyExpanded, setIsWhyExpanded] = useState(false);

  const [durationMinutes, setDurationMinutes] = useState(20);
  const [rpe, setRpe] = useState(4);
  const [distanceKm, setDistanceKm] = useState(0);
  const [avgHeartRate, setAvgHeartRate] = useState(0);
  const [rounds, setRounds] = useState(4);

  useEffect(() => {
    setIsHistoryLoading(true);
    setHistoryError(null);
    fetchCardioHistory(exercise.id)
      .then(setHistory)
      .catch((err) => setHistoryError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
      .finally(() => setIsHistoryLoading(false));
  }, [exercise.id]);

  const typeAdvice = useMemo(() => {
    const distribution = computeWeeklyDistribution(history as CardioLog[], 10, new Date());
    return adviseNextCardioType(distribution, goal);
  }, [history, goal]);

  const progressionAdvice = useMemo<Zone2Advice | IntervalAdvice>(() => {
    return typeAdvice.recommendedType === 'zone2'
      ? adviseCardioProgression(history as CardioLog[], 'zone2', goal)
      : adviseCardioProgression(history as CardioLog[], 'interval', goal);
  }, [history, goal, typeAdvice.recommendedType]);

  useEffect(() => {
    if (isHistoryLoading) return;
    setRpe(4);
    setDistanceKm(0);
    setAvgHeartRate(0);
    if (typeAdvice.recommendedType === 'zone2') {
      setDurationMinutes((progressionAdvice as Zone2Advice).durationMinutes);
    } else {
      const newRounds = (progressionAdvice as IntervalAdvice).rounds;
      setRounds(newRounds);
      setDurationMinutes(newRounds * 7); // grove schatting: 7 min/ronde (4 min hard + 3 min rustig) incl. warming-up-marge
    }
    // Alleen opnieuw voorvullen zodra het advies zelf verandert, niet bij elke toetsaanslag van de gebruiker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHistoryLoading, typeAdvice.recommendedType, progressionAdvice]);

  async function logSession() {
    const cardioLogId = generateId();
    await enqueue({
      type: 'log_cardio',
      payload: {
        cardioLogId,
        workoutId,
        dayExerciseId: exercise.id,
        sessionType: typeAdvice.recommendedType,
        durationMinutes,
        rpe,
        distanceKm: distanceKm > 0 ? distanceKm : undefined,
        avgHeartRate: avgHeartRate > 0 ? avgHeartRate : undefined,
        rounds: typeAdvice.recommendedType === 'interval' ? rounds : undefined,
      },
    });
    setIsLogged(true);
  }

  if (isHistoryLoading) {
    return (
      <Card style={styles.adviceCard}>
        <ActivityIndicator color={colors.accent} />
      </Card>
    );
  }

  if (historyError) {
    return (
      <Card style={styles.adviceCard}>
        <Text style={styles.error}>{historyError}</Text>
      </Card>
    );
  }

  const isZone2 = typeAdvice.recommendedType === 'zone2';
  const distribution = typeAdvice.distribution;

  return (
    <>
      <Card style={styles.adviceCard}>
        <Text style={[typography.heading, styles.adviceCardTitle]}>Vandaag: {isZone2 ? 'Zone 2' : 'Interval'}</Text>
        <Text style={typography.bodySecondary}>{typeAdvice.explanation}</Text>
        <Text style={[typography.bodySecondary, styles.adviceExplanationSpaced]}>{progressionAdvice.explanation}</Text>

        <Pressable onPress={() => setIsWhyExpanded((current) => !current)} hitSlop={8} style={styles.whyToggleWrap}>
          <Text style={styles.whyToggle}>{isWhyExpanded ? 'Verberg details' : 'Waarom?'}</Text>
        </Pressable>
        {isWhyExpanded && (
          <Text style={styles.whyDetail}>
            Afgelopen {distribution.windowDays} dagen: {distribution.lowMinutes} min zone 2, {distribution.highMinutes} min interval (
            {distribution.intensePercent}% intensief).
          </Text>
        )}
      </Card>

      {isLogged ? (
        <View style={styles.loggedList}>
          <Text style={styles.loggedLine}>
            Gelogd: {isZone2 ? 'Zone 2' : 'Interval'}, {durationMinutes} min, RPE {rpe}
            {!isZone2 ? `, ${rounds} rondes` : ''}
          </Text>
        </View>
      ) : (
        <>
          {isZone2 ? (
            <Stepper label="Duur (minuten)" value={durationMinutes} step={5} min={5} onChange={setDurationMinutes} />
          ) : (
            <>
              <Stepper label="Rondes" value={rounds} step={1} min={1} onChange={setRounds} />
              <Stepper label="Totale duur (minuten)" value={durationMinutes} step={5} min={5} onChange={setDurationMinutes} />
            </>
          )}

          <Stepper label="RPE (1-10)" value={rpe} step={1} min={1} onChange={(v) => setRpe(Math.min(10, v))} />
          <Stepper label="Gem. hartslag (optioneel)" value={avgHeartRate} step={5} min={0} onChange={setAvgHeartRate} />
          <Stepper label="Afstand in km (optioneel)" value={distanceKm} step={0.5} min={0} onChange={setDistanceKm} />

          <View style={styles.logButtonWrap}>
            <Button onPress={logSession}>Sessie loggen</Button>
          </View>
        </>
      )}
    </>
  );
}

// ---------- Gedeeld ----------

function Stepper({
  label,
  value,
  step,
  min = -Infinity,
  onChange,
}: {
  label: string;
  value: number;
  step: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  const decrement = () => onChange(Math.max(min, Math.round((value - step) * 100) / 100));
  const increment = () => onChange(Math.round((value + step) * 100) / 100);

  return (
    <View style={styles.stepperBlock}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable style={styles.stepperButton} onPress={decrement}>
          <Text style={styles.stepperButtonText}>−</Text>
        </Pressable>
        <Text style={styles.stepperValue}>{value}</Text>
        <Pressable style={styles.stepperButton} onPress={increment}>
          <Text style={styles.stepperButtonText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  closeButtonWrap: {
    minHeight: layout.minTapTarget,
    justifyContent: 'center',
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  progress: {
    color: colors.textSecondary,
    fontSize: 13,
    marginBottom: spacing.sm,
  },
  exerciseHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: spacing.xs,
  },
  exerciseName: {
    flexShrink: 1,
  },
  historyLinkWrap: {
    minHeight: layout.minTapTarget,
    justifyContent: 'center',
  },
  historyLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  target: {
    marginBottom: spacing.lg,
  },
  tip: {
    color: colors.textTertiary,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  adviceCard: {
    marginTop: spacing.lg,
    marginBottom: spacing.xxl,
    gap: spacing.sm,
  },
  adviceCardTitle: {
    marginBottom: 0,
  },
  adviceHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  adviceBadge: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: 8,
    overflow: 'hidden',
  },
  adviceWeight: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
  },
  adviceExplanationSpaced: {
    marginTop: 0,
  },
  whyToggleWrap: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  whyToggle: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  whyDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  stepperBlock: {
    marginBottom: spacing.xxl,
  },
  stepperLabel: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xl,
  },
  stepperButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  stepperValue: {
    color: colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    minWidth: 72,
    textAlign: 'center',
  },
  rirRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.xxl,
  },
  rirButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rirButtonSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  rirButtonText: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  rirButtonTextSelected: {
    color: colors.background,
  },
  logButtonWrap: {
    marginBottom: spacing.lg,
  },
  loggedList: {
    gap: spacing.xs,
  },
  loggedLine: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
