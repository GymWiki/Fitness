'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ChevronRightIcon, InfoIcon } from '@/components/icons';
import { StatTile } from '@/components/StatTile';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { fetchAdjustmentHistory, type AdjustmentHistoryEntry } from '@/lib/adjustmentHistory';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatShortDate } from '@/lib/dates';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { fetchLongestStreak, fetchMonthlyWorkoutCount, fetchWeeklyVolume } from '@/lib/progressStats';
import { colors } from '@/theme/colors';
import { typography } from '@/theme/typography';

const ADJUSTMENT_PREVIEW_COUNT = 3;

export default function ProgressPage() {
  const { session } = useAuth();

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

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch, same as useCachedData
    load();
  }, [load]);

  const exercises = program?.days.flatMap((day) => day.exercises) ?? [];

  return (
    <div className="min-h-screen bg-background px-6 pb-6" style={{ paddingTop: 52 }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <h1 className="mb-2 text-[28px] font-bold text-text-primary">Progressie</h1>

        {isLoading && (
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {!isLoading && error && <p className="text-sm text-danger">{error}</p>}

        {!isLoading && !error && (
          <>
            <div className="mb-4 flex gap-2">
              <StatTile label="Volume deze week" value={weeklyVolume !== null ? `${Math.round(weeklyVolume).toLocaleString('nl-NL')} kg` : '–'} />
              <StatTile label="Trainingen deze maand" value={monthlyWorkouts !== null ? String(monthlyWorkouts) : '–'} />
              <StatTile label="Langste streak" value={longestStreak !== null ? `${longestStreak} wk` : '–'} />
            </div>

            <p className={`${typography.heading} mb-2 mt-4`}>Per oefening</p>
            {exercises.length === 0 && <EmptyState title="Nog geen oefeningen" body="Zodra je programma actief is, zie je hier per oefening je ontwikkeling." />}
            {exercises.map((exercise) => (
              <div key={exercise.id} className="mb-2 flex items-center rounded-xl border border-border bg-surface px-4 py-3">
                <Link
                  href={`/history/${exercise.id}?${new URLSearchParams({ exerciseName: exercise.exerciseName, kind: exercise.kind }).toString()}`}
                  className="flex flex-1 items-center justify-between"
                >
                  <span className="text-[15px] font-semibold text-text-primary">{exercise.exerciseName}</span>
                  <ChevronRightIcon size={18} color={colors.textSecondary} />
                </Link>
                <Link
                  href={`/exercise-demo?${new URLSearchParams({ name: exercise.exerciseName, muscleGroup: exercise.muscleGroup ?? '' }).toString()}`}
                  className="ml-3 p-1"
                  aria-label={`Demonstratie: ${exercise.exerciseName}`}
                >
                  <InfoIcon size={18} color={colors.textSecondary} />
                </Link>
              </div>
            ))}

            <div className="flex items-center justify-between">
              <p className={`${typography.heading} mt-4`}>Aanpassingsgeschiedenis</p>
              <Link href="/adjustment-history" className="mt-4 text-[13px] font-semibold text-accent">
                Bekijk alles
              </Link>
            </div>
            {adjustments.length === 0 && (
              <EmptyState title="Nog geen aanpassingen" body="Zodra je een trainingsweek afrondt, verschijnt hier wat er is veranderd en waarom." />
            )}
            {adjustments.slice(0, ADJUSTMENT_PREVIEW_COUNT).map((entry) => (
              <Card key={entry.id} className="mb-2 flex flex-col gap-1">
                <div className="flex items-start justify-between">
                  <p className="shrink text-[15px] font-bold text-text-primary">{adjustmentTitle(entry.type, entry.exerciseName)}</p>
                  <p className="ml-3 text-xs text-text-secondary">{formatShortDate(entry.createdAt)}</p>
                </div>
                <p className="text-[13px] leading-[19px] text-text-secondary">{entry.explanation}</p>
              </Card>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
