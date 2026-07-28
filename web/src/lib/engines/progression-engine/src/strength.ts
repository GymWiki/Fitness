import type { StrengthAdvice, StrengthExerciseConfig, StrengthSessionLog } from './types';

const COMPOUND_INCREMENT_PERCENT = 5;
const ISOLATION_INCREMENT_PERCENT = 2.5;
const DELOAD_DECREMENT_PERCENT = 10;
const DEFAULT_WEIGHT_INCREMENT_KG = 1.25;

export function roundToIncrement(weightKg: number, incrementKg = DEFAULT_WEIGHT_INCREMENT_KG): number {
  const rounded = Math.round(weightKg / incrementKg) * incrementKg;
  return Math.round(rounded * 100) / 100;
}

/** All sets reached the top of the rep range at or beyond the target RIR. */
function hitTopOfRange(session: StrengthSessionLog, config: StrengthExerciseConfig): boolean {
  return session.sets.every((set) => set.reps >= config.repRangeMax && set.rir >= config.targetRIR);
}

/** At least one set fell short of the bottom of the rep range. */
function fellBelowRange(session: StrengthSessionLog, config: StrengthExerciseConfig): boolean {
  return session.sets.some((set) => set.reps < config.repRangeMin);
}

function incrementPercentFor(config: StrengthExerciseConfig): number {
  return config.exerciseType === 'compound' ? COMPOUND_INCREMENT_PERCENT : ISOLATION_INCREMENT_PERCENT;
}

/**
 * Double progression with RIR autoregulation.
 *
 * - Hit the top of the rep range on every set, at or beyond the target RIR -> increase weight.
 * - Otherwise the range hasn't been maxed out yet -> same weight, chase more reps.
 * - Two consecutive sessions that fell below the bottom of the range -> deload the weight.
 *
 * `sessionHistory` must be ordered oldest to newest; only the two most recent
 * sessions influence the decision.
 */
export function getStrengthAdvice(
  config: StrengthExerciseConfig,
  currentWeightKg: number,
  sessionHistory: StrengthSessionLog[],
): StrengthAdvice {
  const targetReps = { min: config.repRangeMin, max: config.repRangeMax };
  const weightIncrementKg = config.weightIncrementKg ?? DEFAULT_WEIGHT_INCREMENT_KG;

  if (sessionHistory.length === 0) {
    return {
      action: 'maintain',
      weightKg: currentWeightKg,
      weightChangePercent: 0,
      targetReps,
      targetRIR: config.targetRIR,
      explanation: `Nog geen sessies gelogd voor deze oefening. Start op ${currentWeightKg} kg en werk naar ${config.repRangeMax} reps toe met RIR ${config.targetRIR}.`,
    };
  }

  const lastSession = sessionHistory[sessionHistory.length - 1]!;

  if (hitTopOfRange(lastSession, config)) {
    const incrementPercent = incrementPercentFor(config);
    const newWeight = roundToIncrement(currentWeightKg * (1 + incrementPercent / 100), weightIncrementKg);
    return {
      action: 'increase_weight',
      weightKg: newWeight,
      weightChangePercent: incrementPercent,
      targetReps,
      targetRIR: config.targetRIR,
      explanation: `Alle sets bereikten ${config.repRangeMax} reps met RIR ${config.targetRIR} of hoger, dus volgende sessie ${incrementPercent}% erbij: ${currentWeightKg} kg -> ${newWeight} kg.`,
    };
  }

  const previousSession = sessionHistory.length >= 2 ? sessionHistory[sessionHistory.length - 2]! : undefined;
  const lastFellBelow = fellBelowRange(lastSession, config);
  const previousFellBelow = previousSession ? fellBelowRange(previousSession, config) : false;

  if (lastFellBelow && previousFellBelow) {
    const newWeight = roundToIncrement(currentWeightKg * (1 - DELOAD_DECREMENT_PERCENT / 100), weightIncrementKg);
    return {
      action: 'decrease_weight',
      weightKg: newWeight,
      weightChangePercent: -DELOAD_DECREMENT_PERCENT,
      targetReps,
      targetRIR: config.targetRIR,
      explanation: `Twee sessies op rij onder de ${config.repRangeMin} reps, dus het gewicht gaat ${DELOAD_DECREMENT_PERCENT}% omlaag: ${currentWeightKg} kg -> ${newWeight} kg, om de reps-range weer haalbaar te maken.`,
    };
  }

  return {
    action: 'maintain',
    weightKg: currentWeightKg,
    weightChangePercent: 0,
    targetReps,
    targetRIR: config.targetRIR,
    explanation: `Nog niet alle sets bereikten ${config.repRangeMax} reps met RIR ${config.targetRIR}. Zelfde gewicht (${currentWeightKg} kg), focus op meer herhalingen per set.`,
  };
}
