'use client';

import { useParams, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LineChart } from '@/components/LineChart';
import { ModalHeader } from '@/components/ModalHeader';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatShortDate } from '@/lib/dates';
import { fetchCardioHistory, fetchExerciseHistory, type CardioHistoryEntry, type HistorySession } from '@/lib/history';
import { useWindowWidth } from '@/lib/useWindowWidth';
import { typography } from '@/theme/typography';

const CARDIO_TYPE_LABELS: Record<CardioHistoryEntry['type'], string> = {
  zone2: 'Zone 2',
  interval: 'Interval',
};

/** Heaviest set of a session — the number that matters for "did I get stronger", ignoring lighter back-off sets. */
function topSetWeight(session: HistorySession): number {
  return Math.max(...session.sets.map((set) => set.weightKg));
}

function StrengthHistory({ history, chartWidth }: { history: HistorySession[]; chartWidth: number }) {
  const weightPoints = useMemo(
    () => history.map((session) => ({ date: session.performedAt, value: topSetWeight(session) })),
    [history],
  );
  const sessionsNewestFirst = [...history].reverse();

  return (
    <>
      <LineChart points={weightPoints} width={chartWidth} unit=" kg" />

      <div className="flex flex-col gap-3">
        {sessionsNewestFirst.map((session) => (
          <Card key={session.workoutId} className="flex flex-col gap-1">
            <p className={typography.bodyStrong}>{formatShortDate(session.performedAt)}</p>
            {session.sets.map((set) => (
              <p key={set.setOrder} className={`${typography.bodySecondary} text-sm leading-5`}>
                Set {set.setOrder}: {set.weightKg} kg × {set.reps} reps (RIR {set.rir})
              </p>
            ))}
          </Card>
        ))}
      </div>
    </>
  );
}

function CardioHistoryView({ history, chartWidth }: { history: CardioHistoryEntry[]; chartWidth: number }) {
  const durationPoints = useMemo(() => history.map((entry) => ({ date: entry.date, value: entry.durationMinutes })), [history]);
  const heartRatePoints = useMemo(
    () =>
      history
        .filter((entry) => entry.avgHeartRate !== undefined)
        .map((entry) => ({ date: entry.date, value: entry.avgHeartRate! })),
    [history],
  );
  const entriesNewestFirst = [...history].reverse();

  return (
    <>
      <LineChart points={durationPoints} width={chartWidth} unit=" min" />

      {heartRatePoints.length > 1 && (
        <>
          <p className={typography.label}>Gemiddelde hartslag per sessie</p>
          <LineChart points={heartRatePoints} width={chartWidth} unit=" bpm" />
        </>
      )}

      <div className="flex flex-col gap-3">
        {entriesNewestFirst.map((entry) => (
          <Card key={entry.id} className="flex flex-col gap-1">
            <p className={typography.bodyStrong}>
              {formatShortDate(entry.date)} · {CARDIO_TYPE_LABELS[entry.type]}
            </p>
            <p className={`${typography.bodySecondary} text-sm leading-5`}>
              {entry.durationMinutes} min · RPE {entry.rpe}
              {entry.rounds !== undefined ? ` · ${entry.rounds} rondes` : ''}
              {entry.avgHeartRate !== undefined ? ` · ${entry.avgHeartRate} bpm` : ''}
              {entry.distanceKm !== undefined ? ` · ${entry.distanceKm} km` : ''}
            </p>
          </Card>
        ))}
      </div>
    </>
  );
}

export default function ExerciseHistoryPage() {
  const params = useParams<{ dayExerciseId: string }>();
  const searchParams = useSearchParams();
  const { session } = useAuth();
  const dayExerciseId = typeof params.dayExerciseId === 'string' ? params.dayExerciseId : undefined;
  const exerciseName = searchParams.get('exerciseName') ?? undefined;
  const kind = searchParams.get('kind') ?? undefined;
  const isCardio = kind === 'cardio_duration' || kind === 'cardio_interval';
  const windowWidth = useWindowWidth();

  const [strengthHistory, setStrengthHistory] = useState<HistorySession[]>([]);
  const [cardioHistory, setCardioHistory] = useState<CardioHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCardio) {
      if (!dayExerciseId) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setError('Geen oefening opgegeven.');
        setIsLoading(false);
        return;
      }
      fetchCardioHistory(dayExerciseId)
        .then(setCardioHistory)
        .catch((err) => setError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
        .finally(() => setIsLoading(false));
      return;
    }
    if (!session || !exerciseName) {
      setError('Geen oefening opgegeven.');
      setIsLoading(false);
      return;
    }
    fetchExerciseHistory(session.user.id, exerciseName)
      .then(setStrengthHistory)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
      .finally(() => setIsLoading(false));
  }, [dayExerciseId, exerciseName, isCardio, session]);

  const chartWidth = Math.min(windowWidth - 80, 480);
  const hasHistory = isCardio ? cardioHistory.length > 0 : strengthHistory.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <ModalHeader title={exerciseName ?? 'Oefening'} subtitle="Historie" />
      <div className="mx-auto flex max-w-xl flex-col gap-2 px-6 py-6">
        {isLoading && (
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {!isLoading && error && <p className="text-[15px] text-danger">{error}</p>}

        {!isLoading && !error && !hasHistory && (
          <EmptyState title="Nog geen sessies" body="Log een set of sessie voor deze oefening om hier je voortgang te zien." />
        )}

        {!isLoading &&
          !error &&
          hasHistory &&
          (isCardio ? (
            <CardioHistoryView history={cardioHistory} chartWidth={chartWidth} />
          ) : (
            <StrengthHistory history={strengthHistory} chartWidth={chartWidth} />
          ))}
      </div>
    </div>
  );
}
