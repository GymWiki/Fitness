import type { Physique } from './physique';

/**
 * Presentation-only "training profile" stats shown on the streeffysiek
 * picker — a character-select-style preview of what each goal trains
 * toward, not a promise about the outcome. Pure configuration: nothing
 * here feeds the generator, the progression engines, or the adaptation
 * planner. Keep it a single source of truth so the numbers can be tuned
 * without touching any training logic.
 */
export interface PhysiqueStats {
  kracht: number;
  spiermassa: number;
  uithouding: number;
  snelheid: number;
  lenigheid: number;
}

export const STAT_LABELS: Record<keyof PhysiqueStats, string> = {
  kracht: 'Kracht',
  spiermassa: 'Spiermassa',
  uithouding: 'Uithouding',
  snelheid: 'Snelheid',
  lenigheid: 'Lenigheid',
};

export const STAT_MAX = 5;

export const PHYSIQUE_STATS: Record<Physique, PhysiqueStats> = {
  muscular_athletic: { kracht: 3, spiermassa: 5, uithouding: 2, snelheid: 2, lenigheid: 2 },
  lean_defined: { kracht: 2, spiermassa: 3, uithouding: 4, snelheid: 3, lenigheid: 3 },
  strong_powerful: { kracht: 5, spiermassa: 4, uithouding: 1, snelheid: 2, lenigheid: 2 },
  fit_enduring: { kracht: 2, spiermassa: 2, uithouding: 5, snelheid: 4, lenigheid: 3 },
  balanced_general: { kracht: 3, spiermassa: 3, uithouding: 3, snelheid: 3, lenigheid: 3 },
};
