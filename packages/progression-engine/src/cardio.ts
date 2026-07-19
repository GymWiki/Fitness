import type {
  CardioDistributionAdvice,
  CardioLog,
  IntervalAdvice,
  IntervalProgressionConfig,
  Zone2Advice,
  Zone2ProgressionConfig,
} from './types';

const DEFAULT_TARGET_ZONE2_RATIO = 0.8;
const ZONE2_STEP_PERCENT = 7.5;
const ZONE2_DELOAD_PERCENT = 20;

function toPercent(ratio: number): number {
  return Math.round(ratio * 1000) / 10;
}

/**
 * Polarized (80/20) training distribution check.
 *
 * Looks at whichever window of cardio logs the caller passes in (typically
 * the last 7-14 days) and recommends the session type that pulls the
 * zone2/intensive split back towards the target ratio.
 */
export function getCardioDistributionAdvice(
  recentLogs: CardioLog[],
  targetZone2Ratio = DEFAULT_TARGET_ZONE2_RATIO,
): CardioDistributionAdvice {
  const totalMinutes = recentLogs.reduce((sum, log) => sum + log.durationMinutes, 0);

  if (totalMinutes === 0) {
    return {
      recommendedType: 'zone2',
      zone2Ratio: 0,
      targetZone2Ratio,
      explanation:
        'Nog geen cardio gelogd in deze periode. Begin met een rustige zone 2 sessie om de basis te leggen.',
    };
  }

  const zone2Minutes = recentLogs
    .filter((log) => log.type === 'zone2')
    .reduce((sum, log) => sum + log.durationMinutes, 0);
  const zone2Ratio = zone2Minutes / totalMinutes;

  if (zone2Ratio < targetZone2Ratio) {
    return {
      recommendedType: 'zone2',
      zone2Ratio,
      targetZone2Ratio,
      explanation: `Nu ${toPercent(zone2Ratio)}% zone 2 versus streef ${toPercent(targetZone2Ratio)}%. Volgende sessie is een rustige zone 2 sessie om de balans te herstellen.`,
    };
  }

  return {
    recommendedType: 'interval',
    zone2Ratio,
    targetZone2Ratio,
    explanation: `Nu ${toPercent(zone2Ratio)}% zone 2 versus streef ${toPercent(targetZone2Ratio)}%, dus er is ruimte voor een intensieve intervalsessie.`,
  };
}

/**
 * Zone 2 duration progression: +5-10% per step while RPE and heart rate stay
 * normal at the same pace, with a deload every `cycleLengthWeeks` weeks
 * (default 3 weeks up, 1 week back).
 */
export function getZone2Advice(
  currentDurationMinutes: number,
  config: Zone2ProgressionConfig,
  lastSession: CardioLog,
  baseline: { rpe: number; avgHeartRate?: number },
): Zone2Advice {
  if (config.weekInCycle >= config.cycleLengthWeeks) {
    const deloadDuration = Math.round(currentDurationMinutes * (1 - ZONE2_DELOAD_PERCENT / 100));
    return {
      action: 'deload',
      durationMinutes: deloadDuration,
      durationChangePercent: -ZONE2_DELOAD_PERCENT,
      explanation: `Week ${config.weekInCycle} van ${config.cycleLengthWeeks} is een deload-week: duur terug naar ${deloadDuration} minuten om te herstellen voor de volgende cyclus.`,
    };
  }

  const rpeTooHigh = lastSession.rpe > baseline.rpe;
  const heartRateTooHigh =
    baseline.avgHeartRate !== undefined &&
    lastSession.avgHeartRate !== undefined &&
    lastSession.avgHeartRate > baseline.avgHeartRate;

  if (rpeTooHigh || heartRateTooHigh) {
    return {
      action: 'maintain',
      durationMinutes: currentDurationMinutes,
      durationChangePercent: 0,
      explanation: rpeTooHigh
        ? `RPE (${lastSession.rpe}) lag hoger dan normaal (${baseline.rpe}) op hetzelfde tempo, dus de duur blijft ${currentDurationMinutes} minuten.`
        : `Gemiddelde hartslag (${lastSession.avgHeartRate}) lag hoger dan normaal (${baseline.avgHeartRate}) op hetzelfde tempo, dus de duur blijft ${currentDurationMinutes} minuten.`,
    };
  }

  const newDuration = Math.round(currentDurationMinutes * (1 + ZONE2_STEP_PERCENT / 100));
  return {
    action: 'increase_duration',
    durationMinutes: newDuration,
    durationChangePercent: ZONE2_STEP_PERCENT,
    explanation: `RPE en hartslag waren normaal, dus de zone 2 duur gaat ${ZONE2_STEP_PERCENT}% omhoog: ${currentDurationMinutes} -> ${newDuration} minuten.`,
  };
}

/**
 * Interval progression: increase rounds first, then tempo once the round
 * ceiling is reached. Never both in the same step.
 */
export function getIntervalAdvice(
  currentRounds: number,
  currentTempoLevel: number,
  config: IntervalProgressionConfig,
  lastSession: CardioLog,
  baselineRPE: number,
): IntervalAdvice {
  if (lastSession.rpe > baselineRPE) {
    return {
      action: 'maintain',
      rounds: currentRounds,
      tempoLevel: currentTempoLevel,
      explanation: `RPE (${lastSession.rpe}) lag hoger dan normaal (${baselineRPE}), dus rondes en tempo blijven gelijk.`,
    };
  }

  if (currentRounds < config.maxRoundsBeforeTempoIncrease) {
    const newRounds = currentRounds + 1;
    return {
      action: 'increase_rounds',
      rounds: newRounds,
      tempoLevel: currentTempoLevel,
      explanation: `RPE was normaal, dus volgende sessie 1 ronde extra: ${currentRounds} -> ${newRounds}. Tempo blijft gelijk.`,
    };
  }

  const newTempoLevel = currentTempoLevel + 1;
  return {
    action: 'increase_tempo',
    rounds: currentRounds,
    tempoLevel: newTempoLevel,
    explanation: `Maximum van ${config.maxRoundsBeforeTempoIncrease} rondes bereikt, dus nu het tempo omhoog: niveau ${currentTempoLevel} -> ${newTempoLevel}. Rondes blijven gelijk.`,
  };
}
