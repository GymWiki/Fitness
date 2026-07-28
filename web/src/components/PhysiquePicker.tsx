'use client';

import { SelectableCard } from '@/components/SelectableCard';
import { StatBars } from '@/components/StatBars';
import { PHYSIQUE_OPTIONS, type Physique } from '@/lib/physique';
import { PHYSIQUE_STATS } from '@/lib/physiqueStats';

/**
 * The one streeffysiek-keuzescherm — game-style stat-bar cards — shared by
 * onboarding, the profile edit form, and the schema "ander doel kiezen"
 * flow, so all three always look and behave identically.
 */
export function PhysiquePicker({ selected, onSelect }: { selected: Physique | null; onSelect: (physique: Physique) => void }) {
  return (
    <div>
      {PHYSIQUE_OPTIONS.map((option) => (
        <SelectableCard
          key={option.value}
          label={option.label}
          description={option.description}
          selected={selected === option.value}
          onClick={() => onSelect(option.value)}
        >
          <StatBars stats={PHYSIQUE_STATS[option.value]} selected={selected === option.value} />
        </SelectableCard>
      ))}
      <p className="mt-1 text-xs leading-[17px] text-text-tertiary">
        De balken tonen waar het schema op traint, niet een belofte over hoe je eruit komt te zien.
      </p>
    </div>
  );
}
