import type { Goal } from '@fitness/program-generator';

export type Physique = 'muscular_athletic' | 'lean_defined' | 'strong_powerful' | 'fit_enduring' | 'balanced_general';

export interface PhysiqueOption {
  value: Physique;
  goal: Goal;
  label: string;
  description: string;
}

/**
 * Single source of truth for streeffysiek -> trainingsdoel. The onboarding
 * UI only ever reads from this list/map — never hardcodes a Goal alongside a
 * physique label elsewhere — so the two can't drift apart. Framed as a
 * training-goal choice, not a judgement about anyone's current body.
 */
export const PHYSIQUE_OPTIONS: PhysiqueOption[] = [
  {
    value: 'muscular_athletic',
    goal: 'hypertrophy',
    label: 'Gespierd & atletisch',
    description: 'Spiermassa opbouwen met een hypertrofie-gericht schema.',
  },
  {
    value: 'lean_defined',
    goal: 'fat_loss',
    label: 'Slank & gedefinieerd',
    description: 'Vet verliezen en definitie opbouwen, met behoud van spiermassa.',
  },
  {
    value: 'strong_powerful',
    goal: 'strength',
    label: 'Sterk & krachtig',
    description: 'Zwaarder worden op de basisoefeningen.',
  },
  {
    value: 'fit_enduring',
    goal: 'endurance',
    label: 'Fit & uithoudend',
    description: 'Conditie en cardio-capaciteit centraal, met kracht als basis.',
  },
  {
    value: 'balanced_general',
    goal: 'mixed',
    label: 'Algemene fitheid',
    description: 'Een gebalanceerde mix — geen specifieke piek.',
  },
];

const PHYSIQUE_TO_GOAL: Record<Physique, Goal> = Object.fromEntries(
  PHYSIQUE_OPTIONS.map((option) => [option.value, option.goal]),
) as Record<Physique, Goal>;

export function goalForPhysique(physique: Physique): Goal {
  return PHYSIQUE_TO_GOAL[physique];
}

export function physiqueOption(physique: Physique): PhysiqueOption {
  const option = PHYSIQUE_OPTIONS.find((entry) => entry.value === physique);
  if (!option) throw new Error(`Unknown physique: ${physique}`);
  return option;
}
