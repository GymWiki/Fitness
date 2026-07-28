'use client';

import type { Adjustment } from '@fitness/adaptation-planner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ModalHeader } from '@/components/ModalHeader';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { useAuth } from '@/lib/auth/AuthProvider';
import { applyWeekReview, fetchWeekReview, type WeekReview } from '@/lib/weekReview';
import { typography } from '@/theme/typography';

function titleFor(adjustment: Adjustment, review: WeekReview): string {
  const exerciseName = adjustment.dayExerciseId ? review.exerciseNamesById.get(adjustment.dayExerciseId) : undefined;
  return adjustmentTitle(adjustment.type, exerciseName);
}

export default function WeekReviewPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [review, setReview] = useState<WeekReview | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchWeekReview(session.user.id)
      .then((result) => {
        setReview(result);
        if (result) setSelectedIndexes(new Set(result.adjustments.map((_, index) => index)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon week-overzicht niet laden.'))
      .finally(() => setIsLoading(false));
  }, [session]);

  function toggle(index: number) {
    setSelectedIndexes((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function confirm() {
    if (!review) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const chosenAdjustments = review.adjustments.filter((_, index) => selectedIndexes.has(index));
      await applyWeekReview(review, chosenAdjustments);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon aanpassingen niet opslaan.');
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <p className="text-center text-[15px] text-danger">{error}</p>
        <Button variant="secondary" onClick={() => router.back()}>
          Terug
        </Button>
      </div>
    );
  }

  if (!review) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6">
        <EmptyState title="Nog geen week klaar" body="Er staat momenteel geen week-overzicht klaar om te bekijken." />
        <Button variant="secondary" onClick={() => router.back()}>
          Terug
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <ModalHeader
        title={`Week ${review.weekNumber} voltooid`}
        right={
          <Link href="/adjustment-history" className="self-start text-sm font-semibold text-accent">
            Bekijk eerdere aanpassingen
          </Link>
        }
      />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 px-6 py-6">
        {review.adjustments.length === 0 ? (
          <EmptyState title="Geen aanpassingen nodig" body="Alles binnen het schema deze week — ga zo door!" />
        ) : (
          <>
            <p className="mb-2 text-[15px] leading-[21px] text-text-secondary">
              Vink aan wat je wilt toepassen voor komende week. Alles staat standaard aan.
            </p>
            {review.adjustments.map((adjustment, index) => {
              const isSelected = selectedIndexes.has(index);
              return (
                <Card key={index} className={`flex flex-col gap-1 ${isSelected ? 'border-accent' : ''}`} onClick={() => toggle(index)}>
                  <div className="flex items-center justify-between">
                    <p className={`${typography.heading} shrink`}>{titleFor(adjustment, review)}</p>
                    <span className={`ml-3 text-lg font-bold ${isSelected ? 'text-accent' : 'text-transparent'}`}>✓</span>
                  </div>
                  {adjustment.previousValue !== undefined && adjustment.newValue !== undefined && (
                    <p className="text-[15px] font-bold text-accent">
                      {adjustment.previousValue} → {adjustment.newValue}
                    </p>
                  )}
                  <p className="text-sm leading-5 text-text-secondary">{adjustment.explanation}</p>
                </Card>
              );
            })}
          </>
        )}
      </div>

      <div className="mx-auto w-full max-w-2xl border-t border-border p-6">
        <Button onClick={confirm} loading={isSubmitting}>
          Bevestigen
        </Button>
      </div>
    </div>
  );
}
