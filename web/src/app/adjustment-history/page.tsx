'use client';

import { useEffect, useState } from 'react';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { fetchAdjustmentHistory, type AdjustmentHistoryEntry } from '@/lib/adjustmentHistory';
import { useAuth } from '@/lib/auth/AuthProvider';
import { formatShortDate } from '@/lib/dates';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ModalHeader } from '@/components/ModalHeader';
import { typography } from '@/theme/typography';

function groupByWeek(entries: AdjustmentHistoryEntry[]): Array<[number, AdjustmentHistoryEntry[]]> {
  const groups = new Map<number, AdjustmentHistoryEntry[]>();
  for (const entry of entries) {
    const group = groups.get(entry.weekNumber) ?? [];
    group.push(entry);
    groups.set(entry.weekNumber, group);
  }
  return [...groups.entries()].sort((a, b) => b[0] - a[0]);
}

export default function AdjustmentHistoryPage() {
  const { session } = useAuth();

  const [entries, setEntries] = useState<AdjustmentHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    fetchAdjustmentHistory(session.user.id)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon geschiedenis niet laden.'))
      .finally(() => setIsLoading(false));
  }, [session]);

  return (
    <div className="min-h-screen bg-background">
      <ModalHeader title="Aanpassingsgeschiedenis" subtitle="Alles wat je schema automatisch heeft laten meegroeien, en waarom." />
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-6">
        {isLoading && (
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {!isLoading && error && <p className="text-[15px] text-danger">{error}</p>}

        {!isLoading && !error && entries.length === 0 && (
          <EmptyState title="Nog geen aanpassingen" body="Zodra je een trainingsweek afrondt, verschijnt hier wat er is veranderd en waarom." />
        )}

        {!isLoading &&
          !error &&
          groupByWeek(entries).map(([weekNumber, weekEntries]) => (
            <div key={weekNumber} className="mb-4 flex flex-col gap-2">
              <p className={typography.label}>Week {weekNumber}</p>
              {weekEntries.map((entry) => (
                <Card key={entry.id} className="flex flex-col gap-1">
                  <div className="flex items-start justify-between">
                    <p className={`${typography.bodyStrong} shrink`}>{adjustmentTitle(entry.type, entry.exerciseName)}</p>
                    <p className={`${typography.caption} ml-3`}>{formatShortDate(entry.createdAt)}</p>
                  </div>
                  {entry.previousValue !== null && entry.newValue !== null && (
                    <p className="text-[15px] font-bold text-accent">
                      {entry.previousValue} → {entry.newValue}
                    </p>
                  )}
                  <p className="text-sm leading-5 text-text-secondary">{entry.explanation}</p>
                </Card>
              ))}
            </div>
          ))}
      </div>
    </div>
  );
}
