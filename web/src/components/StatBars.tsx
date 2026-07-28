'use client';

import { useEffect, useState } from 'react';
import { STAT_LABELS, STAT_MAX, type PhysiqueStats } from '@/lib/physiqueStats';
import { useReducedMotion } from '@/lib/useReducedMotion';

const STAT_KEYS: Array<keyof PhysiqueStats> = ['kracht', 'spiermassa', 'uithouding', 'snelheid', 'lenigheid'];

function StatBar({ label, value, accent, delayMs }: { label: string; value: number; accent: boolean; delayMs: number }) {
  const percent = (value / STAT_MAX) * 100;
  const reducedMotion = useReducedMotion();
  const [filled, setFilled] = useState(reducedMotion);

  useEffect(() => {
    // Resets the fill so the delayed-timeout re-animation below is visible
    // (a "locked in" cue when `accent`/selection changes) — intentional,
    // not a render-time state sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilled(false);
    if (reducedMotion) {
      setFilled(true);
      return;
    }
    const timer = setTimeout(() => setFilled(true), delayMs);
    return () => clearTimeout(timer);
    // Re-fills whenever this card becomes the selected one, as a small "locked in" cue.
  }, [accent, reducedMotion, delayMs]);

  return (
    <div className="flex items-center gap-2">
      <span className="w-[68px] text-[11px] text-text-secondary">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${accent ? 'bg-accent' : 'bg-text-tertiary'}`}
          style={{ width: filled ? `${percent}%` : '0%' }}
        />
      </div>
      <span className="w-[26px] text-right text-[11px] text-text-secondary">
        {value}/{STAT_MAX}
      </span>
    </div>
  );
}

/** Character-select-style stat bars for a streeffysiek's training profile — presentation only. */
export function StatBars({ stats, selected }: { stats: PhysiqueStats; selected: boolean }) {
  return (
    <div className="mt-3 flex flex-col gap-1">
      {STAT_KEYS.map((key, index) => (
        <StatBar key={key} label={STAT_LABELS[key]} value={stats[key]} accent={selected} delayMs={index * 60} />
      ))}
    </div>
  );
}
