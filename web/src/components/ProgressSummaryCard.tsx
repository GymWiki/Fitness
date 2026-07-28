'use client';

import { useRouter } from 'next/navigation';
import { fetchMonthlyWorkoutCount, fetchWeeklyVolume } from '@/lib/progressStats';
import { todayLocalDateString } from '@/lib/dates';
import { useCachedData } from '@/lib/useCachedData';
import { colors } from '@/theme/colors';
import { DashboardCardShell } from './DashboardCardShell';
import { TrendingUpIcon } from './icons';
import { StatTile } from './StatTile';

interface ProgressSummaryData {
  weeklyVolume: number;
  monthlyWorkouts: number;
}

async function loadProgressSummaryData(userId: string): Promise<ProgressSummaryData> {
  const [weeklyVolume, monthlyWorkouts] = await Promise.all([fetchWeeklyVolume(userId), fetchMonthlyWorkoutCount(userId)]);
  return { weeklyVolume, monthlyWorkouts };
}

export function ProgressSummaryCard({ userId }: { userId: string }) {
  const router = useRouter();
  const { data, isLoading, error } = useCachedData(`progress_summary:${userId}:${todayLocalDateString()}`, () => loadProgressSummaryData(userId));

  return (
    <DashboardCardShell
      title="Progressie"
      icon={<TrendingUpIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onClick={() => router.push('/progress')}
      ctaLabel="Bekijk Progressie"
    >
      <div className="flex gap-2">
        <StatTile label="Volume deze week" value={data ? `${Math.round(data.weeklyVolume).toLocaleString('nl-NL')} kg` : '–'} />
        <StatTile label="Trainingen deze maand" value={data ? String(data.monthlyWorkouts) : '–'} />
      </div>
    </DashboardCardShell>
  );
}
