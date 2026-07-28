'use client';

import { CARDIO_BASELINE_BY_GOAL } from '@fitness/program-generator';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalHeader } from '@/components/ModalHeader';
import { PhysiquePicker } from '@/components/PhysiquePicker';
import { useAuth } from '@/lib/auth/AuthProvider';
import { describeError } from '@/lib/describeError';
import { GOAL_LABELS, goalForPhysique, type Physique } from '@/lib/physique';
import { useProfile } from '@/lib/profile';
import { switchGoal } from '@/lib/switchGoal';

export default function SwitchGoalPage() {
  const router = useRouter();
  const { session } = useAuth();
  const { profile, refresh } = useProfile();
  const currentPhysique = profile?.targetPhysique ?? null;

  const [selected, setSelected] = useState<Physique | null>(currentPhysique);
  const [isSwitching, setIsSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanged = selected !== null && selected !== currentPhysique;

  function handleSelect(physique: Physique) {
    setSelected(physique);
    setError(null);
  }

  async function handleConfirm() {
    if (!session || !profile || !selected || !hasChanged) return;
    setIsSwitching(true);
    setError(null);
    try {
      await switchGoal(session.user.id, profile, selected);
      await refresh();
      router.back();
    } catch (err) {
      setError(describeError(err, 'Kon niet wisselen van schema.'));
      setIsSwitching(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <ModalHeader
        title="Ander doel kiezen"
        subtitle="Je huidige streeffysiek is gemarkeerd. Kies een nieuw doel om over te stappen naar een ander schema."
      />
      <div className="mx-auto flex max-w-2xl flex-col gap-2 px-6 py-6">
        <PhysiquePicker selected={selected} onSelect={handleSelect} />

        {hasChanged && selected && (
          <Card elevated className="mb-8 mt-2 flex flex-col gap-2 border-accent">
            <p className="text-[17px] font-bold text-text-primary">We maken een nieuw {GOAL_LABELS[goalForPhysique(selected)]}-schema.</p>
            <p className="text-sm leading-5 text-text-secondary">
              Je trainingshistorie, grafieken en lichaamsmetingen blijven gewoon bewaard. Je huidige schema wordt
              gearchiveerd, niet verwijderd.
            </p>
            <p className="text-sm leading-5 text-text-secondary">
              Het schema bevat ook {CARDIO_BASELINE_BY_GOAL[goalForPhysique(selected)].sessionsPerWeek}{' '}
              cardiosessie{CARDIO_BASELINE_BY_GOAL[goalForPhysique(selected)].sessionsPerWeek === 1 ? '' : 's'} per
              week voor je hart- en vaatgezondheid.
            </p>
            {error ? <p className="text-[13px] text-danger">{error}</p> : null}
            <div className="mt-2">
              <Button onClick={handleConfirm} loading={isSwitching}>
                Bevestigen
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
