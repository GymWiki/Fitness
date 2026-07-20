import type { EquipmentType, ExerciseType, ExperienceLevel, Goal } from './types';

export interface RepScheme {
  sets: number;
  repRangeMin: number;
  repRangeMax: number;
  targetRIR: number;
}

/**
 * Base sets/reps/RIR by goal and movement role, tuned for an intermediate
 * lifter. `experienceLevel` shifts the RIR afterwards (see `adjustRIRForExperience`).
 */
const BASE_SCHEMES: Record<Goal, Record<ExerciseType, RepScheme>> = {
  hypertrophy: {
    compound: { sets: 4, repRangeMin: 8, repRangeMax: 12, targetRIR: 1 },
    isolation: { sets: 3, repRangeMin: 10, repRangeMax: 15, targetRIR: 1 },
  },
  strength: {
    compound: { sets: 5, repRangeMin: 3, repRangeMax: 6, targetRIR: 2 },
    isolation: { sets: 3, repRangeMin: 8, repRangeMax: 12, targetRIR: 1 },
  },
  endurance: {
    compound: { sets: 3, repRangeMin: 12, repRangeMax: 15, targetRIR: 2 },
    isolation: { sets: 2, repRangeMin: 15, repRangeMax: 20, targetRIR: 2 },
  },
  fat_loss: {
    compound: { sets: 3, repRangeMin: 10, repRangeMax: 15, targetRIR: 1 },
    isolation: { sets: 3, repRangeMin: 12, repRangeMax: 15, targetRIR: 1 },
  },
  mixed: {
    compound: { sets: 4, repRangeMin: 8, repRangeMax: 12, targetRIR: 2 },
    isolation: { sets: 3, repRangeMin: 10, repRangeMax: 15, targetRIR: 1 },
  },
};

const MIN_RIR = 0;
const MAX_RIR = 4;

/**
 * Beginners train with more reserve (easier to self-assess, safer while
 * technique is still developing); advanced lifters push closer to failure.
 * Intermediate uses the base scheme's RIR unchanged.
 */
function adjustRIRForExperience(baseRIR: number, experienceLevel: ExperienceLevel): number {
  const delta = experienceLevel === 'beginner' ? 1 : experienceLevel === 'advanced' ? -1 : 0;
  return Math.min(MAX_RIR, Math.max(MIN_RIR, baseRIR + delta));
}

const GYM_BARBELL_INCREMENT_KG = 2.5;
const DEFAULT_INCREMENT_KG = 1.25;

/** Barbell lifts in a commercial gym load in pairs of plates; everything else moves in smaller steps. */
function weightIncrementFor(equipment: EquipmentType, exerciseType: ExerciseType): number {
  if (equipment === 'gym' && exerciseType === 'compound') return GYM_BARBELL_INCREMENT_KG;
  return DEFAULT_INCREMENT_KG;
}

export function getRepScheme(
  goal: Goal,
  exerciseType: ExerciseType,
  experienceLevel: ExperienceLevel,
): RepScheme {
  const base = BASE_SCHEMES[goal][exerciseType];
  return { ...base, targetRIR: adjustRIRForExperience(base.targetRIR, experienceLevel) };
}

export function getWeightIncrementKg(equipment: EquipmentType, exerciseType: ExerciseType): number {
  return weightIncrementFor(equipment, exerciseType);
}
