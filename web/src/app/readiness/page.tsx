'use client';

import { ALL_MUSCLE_GROUPS } from '@fitness/program-generator';
import { generateRecoveryCurve, type RecoveryEstimate, type RecoveryStatus } from '@fitness/progression-engine';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ModalHeader } from '@/components/ModalHeader';
import { MuscleRecoveryRing } from '@/components/MuscleRecoveryRing';
import { RecoveryCurveChart } from '@/components/RecoveryCurveChart';
import { useAuth } from '@/lib/auth/AuthProvider';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { compareMuscleRecoveryPriority, describeMuscleRecoveryTap } from '@/lib/recoveryReadiness';
import { fetchAllMuscleGroupRecoveryEstimates } from '@/lib/recovery';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/recoveryLabels';
import { useWindowWidth } from '@/lib/useWindowWidth';

const LEGEND_STATUSES: RecoveryStatus[] = ['recovering', 'window_closing', 'ready', 'window_passed', 'no_data'];

/**
 * Full readiness grid — Apple Watch-style rings, one per muscle group,
 * sorted "most ready to train" first via `compareMuscleRecoveryPriority`.
 */
export default function ReadinessPage() {
  const router = useRouter();
  const { session } = useAuth();
  const windowWidth = useWindowWidth();
  const [estimates, setEstimates] = useState<Map<string, RecoveryEstimate>>(new Map());
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [curveMuscleGroupOverride, setCurveMuscleGroupOverride] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const [nextEstimates, activeProgram] = await Promise.all([
        fetchAllMuscleGroupRecoveryEstimates(session.user.id),
        fetchActiveProgram(session.user.id),
      ]);
      setEstimates(nextEstimates);
      setProgram(activeProgram);
    } catch {
      setError('Kon je herstelstatus niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch, same as useCachedData
    load();
  }, [load]);

  const sortedMuscleGroups = useMemo(
    () =>
      [...ALL_MUSCLE_GROUPS]
        .map((muscleGroup): [string, RecoveryEstimate] | null => {
          const estimate = estimates.get(muscleGroup);
          return estimate ? [muscleGroup, estimate] : null;
        })
        .filter((entry): entry is [string, RecoveryEstimate] => entry !== null)
        .sort(compareMuscleRecoveryPriority),
    [estimates],
  );

  const selectedEstimate = selectedMuscleGroup ? estimates.get(selectedMuscleGroup) : undefined;
  const tapInfo = useMemo(
    () => (selectedMuscleGroup && selectedEstimate ? describeMuscleRecoveryTap(selectedMuscleGroup, selectedEstimate) : null),
    [selectedMuscleGroup, selectedEstimate],
  );

  function trainingDayIdForMuscleGroup(muscleGroup: string): string | null {
    return program?.days.find((day) => day.exercises.some((exercise) => exercise.muscleGroup === muscleGroup))?.id ?? null;
  }
  const canStartTrainingForStatus = (status: RecoveryStatus) => status === 'ready' || status === 'window_closing';

  const curveMuscleGroup = curveMuscleGroupOverride ?? sortedMuscleGroups[0]?.[0] ?? null;
  const curveEstimate = curveMuscleGroup ? estimates.get(curveMuscleGroup) : undefined;
  const curve = useMemo(
    () => (curveMuscleGroup && curveEstimate ? generateRecoveryCurve(curveMuscleGroup, curveEstimate) : null),
    [curveMuscleGroup, curveEstimate],
  );
  const curveTapInfo = useMemo(
    () => (curveMuscleGroup && curveEstimate ? describeMuscleRecoveryTap(curveMuscleGroup, curveEstimate) : null),
    [curveMuscleGroup, curveEstimate],
  );
  const chartWidth = Math.min(windowWidth - 80, 480);

  return (
    <div className="min-h-screen bg-background">
      <ModalHeader title="Readiness" />

      {isLoading && (
        <div className="mt-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
        </div>
      )}

      {!isLoading && error && <p className="mx-6 text-sm text-danger">{error}</p>}

      {!isLoading && !error && sortedMuscleGroups.length === 0 && (
        <div className="px-6">
          <EmptyState
            title="Nog geen hersteldata"
            body="Log je eerste training om hier per spiergroep te zien wanneer je klaar bent voor de volgende sessie."
          />
        </div>
      )}

      {!isLoading && !error && sortedMuscleGroups.length > 0 && (
        <div className="mx-auto flex max-w-2xl flex-col gap-4 px-6 pb-6">
          <div className="flex flex-wrap justify-between gap-y-4">
            {sortedMuscleGroups.map(([muscleGroup, estimate]) => (
              <div key={muscleGroup} className="flex w-[31%] flex-col items-center">
                <MuscleRecoveryRing
                  muscleGroup={muscleGroup}
                  estimate={estimate}
                  onClick={() => {
                    setSelectedMuscleGroup(muscleGroup);
                    setCurveMuscleGroupOverride(muscleGroup);
                  }}
                />
              </div>
            ))}
          </div>

          {curve && curveEstimate && curveTapInfo && (
            <div className="flex flex-col gap-1">
              <p className="text-[15px] font-bold text-text-primary">Herstelcurve — {curveTapInfo.muscleGroup}</p>
              <RecoveryCurveChart curve={curve} estimate={curveEstimate} width={chartWidth} />
              <p className="mt-1 text-[13px] font-bold" style={{ color: STATUS_COLOR[curveEstimate.status] }}>
                {curveTapInfo.statusLabel}
              </p>
              <p className="text-[13px] leading-[19px] text-text-secondary">{curveTapInfo.explanation}</p>
              <p className="mt-1 text-[11px] leading-4 text-text-tertiary">
                Dit is een geïllustreerd, vereenvoudigd model, geen exacte meting.{' '}
                <Link href="/faq?openId=supercompensatie" className="font-semibold text-accent">
                  Meer uitleg in de FAQ →
                </Link>
              </p>
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3">
            {LEGEND_STATUSES.map((status) => (
              <div key={status} className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLOR[status] }} />
                <span className="text-[11px] text-text-secondary">{STATUS_LABEL[status]}</span>
              </div>
            ))}
          </div>

          {tapInfo && (
            <Card elevated className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <p className="text-base font-bold text-text-primary">{tapInfo.muscleGroup}</p>
                <button type="button" className="text-[13px] font-semibold text-text-secondary" onClick={() => setSelectedMuscleGroup(null)}>
                  Sluiten
                </button>
              </div>
              <p className="text-[13px] font-bold" style={{ color: selectedEstimate ? STATUS_COLOR[selectedEstimate.status] : undefined }}>
                {tapInfo.statusLabel}
              </p>
              <p className="text-[13px] leading-[19px] text-text-secondary">{tapInfo.explanation}</p>
              {selectedEstimate &&
                canStartTrainingForStatus(selectedEstimate.status) &&
                (() => {
                  const dayId = trainingDayIdForMuscleGroup(tapInfo.muscleGroup);
                  return dayId ? (
                    <button
                      type="button"
                      className="mt-1 text-left text-sm font-bold text-accent"
                      onClick={() => router.push(`/workout/${dayId}`)}
                    >
                      Start training →
                    </button>
                  ) : null;
                })()}
              <button
                type="button"
                className="mt-1 text-left text-[13px] font-semibold text-accent"
                onClick={() => {
                  setSelectedMuscleGroup(null);
                  router.push('/faq?openId=supercompensatie');
                }}
              >
                Waarom laat de app dit zien? →
              </button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
