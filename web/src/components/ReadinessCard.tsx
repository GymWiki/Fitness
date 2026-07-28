'use client';

import type { RecoveryEstimate } from '@fitness/progression-engine';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';
import { compareMuscleRecoveryPriority } from '@/lib/recoveryReadiness';
import { fetchAllMuscleGroupRecoveryEstimates } from '@/lib/recovery';
import { todayLocalDateString } from '@/lib/dates';
import { useCachedData } from '@/lib/useCachedData';
import { colors } from '@/theme/colors';
import { CheckIcon } from './icons';
import { DashboardCardShell } from './DashboardCardShell';
import { MuscleRecoveryRing } from './MuscleRecoveryRing';

const COMPACT_RING_COUNT = 4;
const COMPACT_RING_SIZE = 44;

/** `Map` doesn't round-trip through `JSON.stringify` (the cache layer's storage format) — cache as entries, rebuild the Map for use. */
async function loadReadinessEntries(userId: string): Promise<Array<[string, RecoveryEstimate]>> {
  const estimates = await fetchAllMuscleGroupRecoveryEstimates(userId);
  return [...estimates.entries()];
}

export function ReadinessCard({ userId }: { userId: string }) {
  const router = useRouter();
  const { data: entries, isLoading, error } = useCachedData(`readiness:${userId}:${todayLocalDateString()}`, () => loadReadinessEntries(userId));
  const estimates = useMemo(() => (entries ? new Map(entries) : null), [entries]);

  const topMuscleGroups = estimates
    ? [...estimates.entries()].sort(compareMuscleRecoveryPriority).slice(0, COMPACT_RING_COUNT)
    : [];

  return (
    <DashboardCardShell
      title="Readiness"
      icon={<CheckIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onClick={() => router.push('/readiness')}
      ctaLabel="Bekijk volledig overzicht"
    >
      <div className="flex justify-between gap-2">
        {topMuscleGroups.map(([muscleGroup, estimate]) => (
          <MuscleRecoveryRing key={muscleGroup} muscleGroup={muscleGroup} estimate={estimate} size={COMPACT_RING_SIZE} />
        ))}
      </div>
    </DashboardCardShell>
  );
}
