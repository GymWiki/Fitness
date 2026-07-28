'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Card } from '@/components/Card';
import { ModalHeader } from '@/components/ModalHeader';
import { fetchExerciseMedia, type ExerciseMedia } from '@/lib/exerciseMedia';
import { typography } from '@/theme/typography';

/**
 * Demonstration (start/end-position photos) + short "Let op" form cues for
 * one exercise, reached from the Progressie tab and Schema day detail.
 * `exerciseName`/`muscleGroup` come in as query params from whichever
 * screen already has that data — this screen only adds the demo content
 * on top, see src/lib/exerciseMedia.ts. Exercises without a curated match
 * show a plain fallback instead of a crash or a mismatched photo.
 */
export default function ExerciseDemoPage() {
  const searchParams = useSearchParams();
  const exerciseName = searchParams.get('name') ?? undefined;
  const muscleGroup = searchParams.get('muscleGroup') ?? undefined;

  const [media, setMedia] = useState<ExerciseMedia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!exerciseName) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('Geen oefening opgegeven.');
      setIsLoading(false);
      return;
    }
    fetchExerciseMedia(exerciseName)
      .then(setMedia)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon demonstratie niet laden.'))
      .finally(() => setIsLoading(false));
  }, [exerciseName]);

  return (
    <div className="min-h-screen bg-background">
      <ModalHeader title={exerciseName ?? 'Oefening'} subtitle={muscleGroup ?? undefined} />
      <div className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-6">
        {isLoading && (
          <div className="mt-6 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
          </div>
        )}

        {!isLoading && error && <p className="text-[15px] text-danger">{error}</p>}

        {!isLoading && !error && media && (
          <>
            <div className="flex gap-2">
              {media.mediaUrls.map((url) => (
                // eslint-disable-next-line @next/next/no-img-element -- external, unknown-domain URLs from a DB table; next/image would need every source domain allow-listed up front.
                <img key={url} src={url} alt={exerciseName} className="aspect-square flex-1 rounded-xl bg-surface object-cover" />
              ))}
            </div>

            <Card className="flex flex-col gap-2">
              <p className={typography.bodyStrong}>Let op</p>
              {media.tips.map((tip) => (
                <div key={tip} className="flex gap-2">
                  <span className="text-sm leading-5 text-accent">•</span>
                  <span className="flex-1 text-sm leading-5 text-text-secondary">{tip}</span>
                </div>
              ))}
            </Card>

            <p className="text-[11px] text-text-tertiary">
              Media: {media.sourceName} ({media.sourceLicense})
            </p>
          </>
        )}

        {!isLoading && !error && !media && (
          <Card className="flex flex-col gap-1">
            <p className={typography.bodyStrong}>{exerciseName}</p>
            {muscleGroup && <p className="text-[13px] text-text-secondary">{muscleGroup}</p>}
            <p className="mt-1 text-sm text-text-tertiary">Demonstratie nog niet beschikbaar voor deze oefening.</p>
          </Card>
        )}
      </div>
    </div>
  );
}
