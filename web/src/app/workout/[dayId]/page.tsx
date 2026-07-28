'use client';

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
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatShortDate } from '@/lib/dates';
import { fetchCardioHistory, fetchExerciseHistory, type CardioHistoryEntry, type HistorySession } from '@/lib/history';
import { generateId } from '@/lib/id';
import { enqueue } from '@/lib/offlineQueue';
import { useProfile } from '@/lib/profile';
import { fetchProgramDayWithExercises, type ProgramDayForWorkout, type WorkoutExercise } from '@/lib/programs';
import { restGuidanceFor } from '@/lib/restGuidance';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { typography } from '@/theme/typography';

const RIR_OPTIONS = [0, 1, 2, 3, 4];

const STRENGTH_ADVICE_LABELS: Record<StrengthAdvice['action'], string> = {
  increase_weight: 'Omhoog',
  maintain: 'Gelijk',
  decrease_weight: 'Omlaag',
};

const STRENGTH_ADVICE_BADGE_CLASSES: Record<StrengthAdvice['action'], string> = {
  increase_weight: 'bg-accent text-background',
  maintain: 'bg-surface-elevated text-text-primary',
  decrease_weight: 'bg-danger text-background',
};

export default function WorkoutPage() {
  const params = useParams<{ dayId: string }>();
  const dayId = typeof params.dayId === 'string' ? params.dayId : undefined;
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const goal: Goal = profile?.goal ?? 'mixed';

  const [workoutId] = useState(() => generateId());

  const [day, setDay] = useState<ProgramDayForWorkout | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const syncStatus = useSyncStatus();

  useEffect(() => {
    if (!dayId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (loadError || !day) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-center text-[15px] text-danger">{loadError ?? 'Workout niet gevonden.'}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Terug
        </Button>
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <EmptyState title="Geen oefeningen" body="Deze trainingsdag heeft nog geen oefeningen om te loggen." />
        <Button variant="secondary" onClick={() => router.back()}>
          Terug
        </Button>
      </div>
    );
  }

  const isCardio = exercise.kind !== 'strength';
  const isLastExercise = exerciseIndex === day.exercises.length - 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-xl flex-1 px-6 py-6">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className="text-[15px] font-semibold text-text-secondary" onClick={() => router.back()}>
            Sluiten
          </button>
          <SyncStatusBadge status={syncStatus} />
        </div>

        <p className={typography.label}>{day.name}</p>
        <p className="mb-2 text-[13px] text-text-secondary">
          Oefening {exerciseIndex + 1} van {day.exercises.length}
        </p>

        <div className="mt-1 flex items-end justify-between gap-2">
          <h1 className="shrink text-[22px] font-bold text-text-primary">{exercise.exerciseName}</h1>
          <button
            type="button"
            className="text-sm font-semibold text-accent"
            onClick={() =>
              router.push(
                `/history/${exercise.id}?${new URLSearchParams({ exerciseName: exercise.exerciseName, kind: exercise.kind }).toString()}`,
              )
            }
          >
            Historie
          </button>
        </div>

        {isCardio ? (
          <CardioLogger key={exercise.id} exercise={exercise} workoutId={workoutId} goal={goal} />
        ) : (
          <StrengthLogger key={exercise.id} exercise={exercise} workoutId={workoutId} goal={goal} />
        )}
      </div>

      <div className="mx-auto flex w-full max-w-xl items-center justify-between border-t border-border p-6">
        <Button variant="ghost" disabled={exerciseIndex === 0} onClick={() => setExerciseIndex(exerciseIndex - 1)}>
          Vorige
        </Button>

        {isLastExercise ? (
          <Button onClick={() => router.back()}>Workout voltooien</Button>
        ) : (
          <Button onClick={() => setExerciseIndex(exerciseIndex + 1)}>Volgende oefening</Button>
        )}
      </div>
    </div>
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
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsHistoryLoading(true);
    setHistoryError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
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
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <p className="mb-4 mt-2 text-[15px] leading-[21px] text-text-secondary">
        Doel: {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps, RIR {exercise.targetRIR}
      </p>

      <StrengthAdviceCard
        isLoading={isHistoryLoading}
        error={historyError}
        lastSession={history.length > 0 ? history[history.length - 1]! : null}
        advice={advice}
      />

      {loggedSets.length === 0 && (
        <p className="mt-2 text-xs text-text-tertiary">Tip: bouw op naar dit gewicht met 1-2 lichtere sets voordat je je eerste werkset logt.</p>
      )}

      <Stepper label="Gewicht (kg)" value={weightKg} step={exercise.weightIncrementKg} min={0} onChange={setWeightKg} />
      <Stepper label="Herhalingen" value={reps} step={1} min={0} onChange={setReps} />

      <p className="mb-2 text-sm font-semibold text-text-secondary">RIR (reps in reserve)</p>
      <div className="mb-8 flex gap-3">
        {RIR_OPTIONS.map((option) => (
          <button
            type="button"
            key={option}
            onClick={() => setRir(option)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border text-base font-bold ${
              rir === option ? 'border-accent bg-accent text-background' : 'border-border bg-surface text-text-primary'
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <Button onClick={logSet}>{`Set ${loggedSets.length + 1} loggen`}</Button>
      </div>
      <p className="mt-2 text-xs text-text-tertiary">{restGuidanceFor(goal)}</p>

      {loggedSets.length > 0 && (
        <div className="mt-4 flex flex-col gap-1">
          {loggedSets.map((set) => (
            <p key={set.id} className="text-sm text-text-secondary">
              Gelogd — Set {set.setOrder}: {set.weightKg} kg × {set.reps} reps (RIR {set.rir})
            </p>
          ))}
        </div>
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
      <Card className="my-4 flex justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="my-4">
        <p className="text-center text-[15px] text-danger">{error}</p>
      </Card>
    );
  }

  if (!lastSession || !advice) {
    return (
      <Card className="my-4">
        <p className="text-[15px] leading-[21px] text-text-secondary">Nog geen historie voor deze oefening. Kies zelf een startgewicht voor de eerste set.</p>
      </Card>
    );
  }

  return (
    <Card className="my-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className={`rounded-lg px-2 py-1 text-xs font-bold uppercase tracking-wide ${STRENGTH_ADVICE_BADGE_CLASSES[advice.action]}`}>
          {STRENGTH_ADVICE_LABELS[advice.action]}
        </span>
        <span className="text-xl font-bold text-text-primary">{advice.weightKg} kg</span>
      </div>
      <p className="text-[15px] leading-[21px] text-text-secondary">{advice.explanation}</p>

      <button type="button" className="self-start text-[13px] font-semibold text-accent" onClick={() => setIsExpanded((current) => !current)}>
        {isExpanded ? 'Verberg details' : 'Waarom?'}
      </button>
      {isExpanded && (
        <p className="text-[13px] leading-[19px] text-text-secondary">
          Vergeleken met je laatste sessie ({formatShortDate(lastSession.performedAt)}):{' '}
          {lastSession.sets.map((set) => `${set.weightKg} kg × ${set.reps} (RIR ${set.rir})`).join(', ')}.
        </p>
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
    /* eslint-disable react-hooks/set-state-in-effect */
    setIsHistoryLoading(true);
    setHistoryError(null);
    /* eslint-enable react-hooks/set-state-in-effect */
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
    /* eslint-disable react-hooks/set-state-in-effect */
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
    /* eslint-enable react-hooks/set-state-in-effect */
    // Alleen opnieuw voorvullen zodra het advies zelf verandert, niet bij elke toetsaanslag van de gebruiker.
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
      <Card className="my-4 flex justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border border-t-accent" />
      </Card>
    );
  }

  if (historyError) {
    return (
      <Card className="my-4">
        <p className="text-center text-[15px] text-danger">{historyError}</p>
      </Card>
    );
  }

  const isZone2 = typeAdvice.recommendedType === 'zone2';
  const distribution = typeAdvice.distribution;

  return (
    <>
      <Card className="my-4 flex flex-col gap-2">
        <p className={typography.heading}>Vandaag: {isZone2 ? 'Zone 2' : 'Interval'}</p>
        <p className="text-[15px] leading-[21px] text-text-secondary">{typeAdvice.explanation}</p>
        <p className="text-[15px] leading-[21px] text-text-secondary">{progressionAdvice.explanation}</p>

        <button type="button" className="self-start text-[13px] font-semibold text-accent" onClick={() => setIsWhyExpanded((current) => !current)}>
          {isWhyExpanded ? 'Verberg details' : 'Waarom?'}
        </button>
        {isWhyExpanded && (
          <p className="text-[13px] leading-[19px] text-text-secondary">
            Afgelopen {distribution.windowDays} dagen: {distribution.lowMinutes} min zone 2, {distribution.highMinutes} min interval (
            {distribution.intensePercent}% intensief).
          </p>
        )}
      </Card>

      {isLogged ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-text-secondary">
            Gelogd: {isZone2 ? 'Zone 2' : 'Interval'}, {durationMinutes} min, RPE {rpe}
            {!isZone2 ? `, ${rounds} rondes` : ''}
          </p>
        </div>
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

          <div className="mb-4">
            <Button onClick={logSession}>Sessie loggen</Button>
          </div>
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
    <div className="mb-8">
      <p className="mb-2 text-sm font-semibold text-text-secondary">{label}</p>
      <div className="flex items-center gap-5">
        <button type="button" onClick={decrement} className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-3xl font-bold text-text-primary">
          −
        </button>
        <span className="min-w-[72px] text-center text-3xl font-bold text-text-primary">{value}</span>
        <button type="button" onClick={increment} className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-3xl font-bold text-text-primary">
          +
        </button>
      </div>
    </div>
  );
}

