'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { ProgressSummaryCard } from '@/components/ProgressSummaryCard';
import { ReadinessCard } from '@/components/ReadinessCard';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { TrainingTodayCard } from '@/components/TrainingTodayCard';
import { WeekOverview } from '@/components/WeekOverview';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useProfile } from '@/lib/profile';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { fetchWeekReview, type WeekReview } from '@/lib/weekReview';

export default function TodayPage() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const syncStatus = useSyncStatus();
  const [weekReview, setWeekReview] = useState<WeekReview | null>(null);

  // The pending-week-review prompt is the one thing on this screen that isn't a per-card
  // summary — it's a one-off actionable alert from the adaptation planner, so it keeps its
  // own tiny fetch here rather than being forced into one of the four cards below.
  const loadWeekReview = useCallback(async () => {
    if (!session) return;
    try {
      setWeekReview(await fetchWeekReview(session.user.id));
    } catch {
      setWeekReview(null);
    }
  }, [session]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- mount-time fetch, same as useCachedData
    loadWeekReview();
  }, [loadWeekReview]);

  const firstName = profile?.displayName?.split(' ')[0];

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background px-6 pb-6" style={{ paddingTop: 52 }}>
      <div className="mx-auto flex max-w-3xl flex-col gap-3">
        <div className="mb-2 flex items-start justify-between">
          <div>
            <h1 className="text-[28px] font-bold text-text-primary">Vandaag</h1>
            {firstName ? <p className="mt-0.5 text-[15px] leading-[21px] text-text-secondary">Hoi {firstName}</p> : null}
          </div>
          <SyncStatusBadge status={syncStatus} />
        </div>

        <WeekOverview userId={session.user.id} />

        {weekReview && (
          <Link href="/week-review">
            <Card className="border-accent bg-accent">
              <p className="text-base font-bold text-background">Week {weekReview.weekNumber} voltooid</p>
              <p className="mt-0.5 text-sm text-background/85">
                {weekReview.adjustments.length > 0
                  ? `${weekReview.adjustments.length} voorgestelde aanpassing${weekReview.adjustments.length === 1 ? '' : 'en'} — bekijk en bevestig`
                  : 'Bekijk je week-overzicht'}
              </p>
            </Card>
          </Link>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <TrainingTodayCard userId={session.user.id} />
          <ProgressSummaryCard userId={session.user.id} />
          <ReadinessCard userId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
