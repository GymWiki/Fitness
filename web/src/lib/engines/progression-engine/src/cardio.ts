import type {
  CardioLog,
  CardioSessionType,
  CardioTypeAdvice,
  Goal,
  IntervalAdvice,
  WeeklyCardioDistribution,
  Zone2Advice,
} from './types';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DEFAULT_WINDOW_DAYS = 10;

/**
 * Zone2 share the distribution should aim for, per goal. 80/20 is the
 * physiological default (polarized training research); it shifts slightly
 * for goals where cardio isn't the main event: `strength`/`hypertrophy`
 * lean more conservative to protect recovery for lifting, `fat_loss` allows
 * a bit more intensity for the extra caloric burn without abandoning the
 * polarized principle entirely.
 */
const TARGET_ZONE2_PERCENT_BY_GOAL: Record<Goal, number> = {
  hypertrophy: 80,
  strength: 85,
  endurance: 80,
  fat_loss: 70,
  mixed: 80,
};

/** Zone2 duration step size per session, in percent. Lower for goals where cardio is supplementary, not primary. */
const ZONE2_STEP_PERCENT_BY_GOAL: Record<Goal, number> = {
  hypertrophy: 5,
  strength: 5,
  endurance: 10,
  fat_loss: 8.5,
  mixed: 7.5,
};

/** Rounds ceiling before tempo is allowed to increase instead, per goal. */
const MAX_ROUNDS_BY_GOAL: Record<Goal, number> = {
  hypertrophy: 6,
  strength: 5,
  endurance: 10,
  fat_loss: 8,
  mixed: 6,
};

const ZONE2_CYCLE_LENGTH_SESSIONS = 4; // 3 opbouw-sessies + 1 terug-sessie
const ZONE2_DELOAD_PERCENT = 20;
const ZONE2_STARTING_DURATION_MINUTES = 20;
const INTERVAL_STARTING_ROUNDS = 4; // bijv. Noorse 4x4

function average(numbers: number[]): number {
  return numbers.reduce((sum, n) => sum + n, 0) / numbers.length;
}

function roundPercent(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Aggregates a trailing window of cardio logs into low/high minutes and the
 * intense share. The window is anchored on `referenceDate` (defaults to
 * "now" at the call site) rather than reading the clock internally, so the
 * function itself stays pure and deterministic for testing.
 */
export function computeWeeklyDistribution(
  logs: CardioLog[],
  windowDays: number = DEFAULT_WINDOW_DAYS,
  referenceDate: Date = new Date(),
): WeeklyCardioDistribution {
  const windowStart = referenceDate.getTime() - windowDays * MS_PER_DAY;
  const windowLogs = logs.filter((log) => new Date(log.date).getTime() > windowStart);

  const lowMinutes = windowLogs.filter((log) => log.type === 'zone2').reduce((sum, log) => sum + log.durationMinutes, 0);
  const highMinutes = windowLogs.filter((log) => log.type === 'interval').reduce((sum, log) => sum + log.durationMinutes, 0);
  const totalMinutes = lowMinutes + highMinutes;
  const intensePercent = totalMinutes === 0 ? 0 : roundPercent((highMinutes / totalMinutes) * 100);

  return { windowDays, lowMinutes, highMinutes, totalMinutes, intensePercent };
}

/**
 * Recommends the session type that pulls the polarized (80/20) distribution
 * back towards the goal-dependent target, avoiding the "grey zone" of
 * moderate-intensity work that's too hard to recover from and too easy to
 * drive an aerobic or VO2max adaptation.
 */
export function adviseNextCardioType(distribution: WeeklyCardioDistribution, goal: Goal): CardioTypeAdvice {
  const targetZone2Percent = TARGET_ZONE2_PERCENT_BY_GOAL[goal];

  if (distribution.totalMinutes === 0) {
    return {
      recommendedType: 'zone2',
      distribution,
      targetZone2Percent,
      explanation: `Nog geen cardio gelogd in de afgelopen ${distribution.windowDays} dagen. Begin met een rustige zone 2 sessie om de basis te leggen.`,
    };
  }

  const zone2Percent = roundPercent(100 - distribution.intensePercent);

  if (zone2Percent < targetZone2Percent) {
    return {
      recommendedType: 'zone2',
      distribution,
      targetZone2Percent,
      explanation: `Nu ${zone2Percent}% zone 2 versus streef ${targetZone2Percent}% over de afgelopen ${distribution.windowDays} dagen. Volgende sessie is zone 2 om de balans te herstellen.`,
    };
  }

  return {
    recommendedType: 'interval',
    distribution,
    targetZone2Percent,
    explanation: `Nu ${zone2Percent}% zone 2 versus streef ${targetZone2Percent}% over de afgelopen ${distribution.windowDays} dagen, dus er is ruimte voor een intensieve intervalsessie.`,
  };
}

function computeZone2Progression(sessions: CardioLog[], goal: Goal): Zone2Advice {
  const zone2Sessions = sessions.filter((session) => session.type === 'zone2');

  if (zone2Sessions.length === 0) {
    return {
      action: 'maintain',
      durationMinutes: ZONE2_STARTING_DURATION_MINUTES,
      durationChangePercent: 0,
      explanation: `Nog geen zone 2 sessies gelogd. Start met een comfortabel tempo van ongeveer ${ZONE2_STARTING_DURATION_MINUTES} minuten en bouw van daaruit op.`,
    };
  }

  const last = zone2Sessions[zone2Sessions.length - 1]!;

  // 4th session of the cycle (3 build + 1 back) is a deload, regardless of RPE/heart rate.
  if (zone2Sessions.length % ZONE2_CYCLE_LENGTH_SESSIONS === 0) {
    const deloadDuration = Math.round(last.durationMinutes * (1 - ZONE2_DELOAD_PERCENT / 100));
    return {
      action: 'deload',
      durationMinutes: deloadDuration,
      durationChangePercent: -ZONE2_DELOAD_PERCENT,
      explanation: `Dit is sessie ${zone2Sessions.length} van de opbouwcyclus (3 op, 1 terug): duur terug naar ${deloadDuration} minuten om te herstellen voor de volgende cyclus.`,
    };
  }

  const priorSessions = zone2Sessions.slice(0, -1);
  if (priorSessions.length === 0) {
    return {
      action: 'maintain',
      durationMinutes: last.durationMinutes,
      durationChangePercent: 0,
      explanation: `Eerste zone 2 sessie gelogd (${last.durationMinutes} minuten). Nog geen vergelijkingsmateriaal, dus volgende keer hetzelfde tempo en dezelfde duur.`,
    };
  }

  const baselineRPE = average(priorSessions.map((session) => session.rpe));
  const priorWithHeartRate = priorSessions.filter((session) => session.avgHeartRate !== undefined);
  const baselineHeartRate =
    priorWithHeartRate.length > 0 ? average(priorWithHeartRate.map((session) => session.avgHeartRate!)) : undefined;

  const rpeTooHigh = last.rpe > baselineRPE;
  const heartRateTooHigh = baselineHeartRate !== undefined && last.avgHeartRate !== undefined && last.avgHeartRate > baselineHeartRate;

  if (rpeTooHigh || heartRateTooHigh) {
    return {
      action: 'maintain',
      durationMinutes: last.durationMinutes,
      durationChangePercent: 0,
      explanation: rpeTooHigh
        ? `RPE (${last.rpe}) lag hoger dan je gemiddelde (${roundPercent(baselineRPE)}) op hetzelfde tempo, dus de duur blijft ${last.durationMinutes} minuten.`
        : `Gemiddelde hartslag (${last.avgHeartRate}) lag hoger dan je gemiddelde (${Math.round(baselineHeartRate!)}) op hetzelfde tempo, dus de duur blijft ${last.durationMinutes} minuten.`,
    };
  }

  const stepPercent = ZONE2_STEP_PERCENT_BY_GOAL[goal];
  const newDuration = Math.round(last.durationMinutes * (1 + stepPercent / 100));
  return {
    action: 'increase_duration',
    durationMinutes: newDuration,
    durationChangePercent: stepPercent,
    explanation: `RPE en hartslag waren normaal, dus de zone 2 duur gaat ${stepPercent}% omhoog: ${last.durationMinutes} -> ${newDuration} minuten.`,
  };
}

/**
 * Tempo isn't a logged field (no pace/tempo column in the data model) — it's
 * derived from the round-count history instead: every time rounds dropped
 * back down right after hitting that era's ceiling, that's read as a tempo
 * bump having happened (rounds reset so the lifter can rebuild at the new
 * pace). Starts at level 1.
 */
function deriveTempoLevel(intervalSessions: CardioLog[], maxRounds: number): number {
  let tempoLevel = 1;
  let previousRounds: number | undefined;

  for (const session of intervalSessions) {
    const rounds = session.rounds ?? INTERVAL_STARTING_ROUNDS;
    if (previousRounds !== undefined && previousRounds >= maxRounds && rounds < previousRounds) {
      tempoLevel += 1;
    }
    previousRounds = rounds;
  }

  return tempoLevel;
}

function computeIntervalProgression(sessions: CardioLog[], goal: Goal): IntervalAdvice {
  const intervalSessions = sessions.filter((session) => session.type === 'interval');
  const maxRounds = MAX_ROUNDS_BY_GOAL[goal];

  if (intervalSessions.length === 0) {
    return {
      action: 'maintain',
      rounds: INTERVAL_STARTING_ROUNDS,
      tempoLevel: 1,
      explanation: `Nog geen intervalsessies gelogd. Start met ${INTERVAL_STARTING_ROUNDS} rondes (bijv. Noorse 4x4: 4 min hard / 3 min rustig) op een instaptempo.`,
    };
  }

  const last = intervalSessions[intervalSessions.length - 1]!;
  const currentRounds = last.rounds ?? INTERVAL_STARTING_ROUNDS;
  const currentTempoLevel = deriveTempoLevel(intervalSessions, maxRounds);

  const priorSessions = intervalSessions.slice(0, -1);
  const baselineRPE = priorSessions.length > 0 ? average(priorSessions.map((session) => session.rpe)) : undefined;
  const priorWithHeartRate = priorSessions.filter((session) => session.avgHeartRate !== undefined);
  const baselineHeartRate =
    priorWithHeartRate.length > 0 ? average(priorWithHeartRate.map((session) => session.avgHeartRate!)) : undefined;

  const rpeTooHigh = baselineRPE !== undefined && last.rpe > baselineRPE;
  const heartRateTooHigh = baselineHeartRate !== undefined && last.avgHeartRate !== undefined && last.avgHeartRate > baselineHeartRate;

  if (rpeTooHigh || heartRateTooHigh) {
    return {
      action: 'maintain',
      rounds: currentRounds,
      tempoLevel: currentTempoLevel,
      explanation: rpeTooHigh
        ? `RPE (${last.rpe}) lag hoger dan je gemiddelde (${roundPercent(baselineRPE!)}), dus rondes en tempo blijven gelijk.`
        : `Gemiddelde hartslag (${last.avgHeartRate}) lag hoger dan je gemiddelde (${Math.round(baselineHeartRate!)}), dus rondes en tempo blijven gelijk.`,
    };
  }

  if (currentRounds < maxRounds) {
    const newRounds = currentRounds + 1;
    return {
      action: 'increase_rounds',
      rounds: newRounds,
      tempoLevel: currentTempoLevel,
      explanation: `RPE en hartslag waren normaal, dus volgende sessie 1 ronde extra: ${currentRounds} -> ${newRounds}. Tempo blijft gelijk.`,
    };
  }

  const newTempoLevel = currentTempoLevel + 1;
  return {
    action: 'increase_tempo',
    rounds: INTERVAL_STARTING_ROUNDS,
    tempoLevel: newTempoLevel,
    explanation: `Maximum van ${maxRounds} rondes bereikt, dus nu het tempo omhoog (niveau ${currentTempoLevel} -> ${newTempoLevel}) en rondes terug naar ${INTERVAL_STARTING_ROUNDS} om op het nieuwe tempo op te bouwen.`,
  };
}

export function adviseCardioProgression(lastSessions: CardioLog[], type: 'zone2', goal: Goal): Zone2Advice;
export function adviseCardioProgression(lastSessions: CardioLog[], type: 'interval', goal: Goal): IntervalAdvice;
export function adviseCardioProgression(
  lastSessions: CardioLog[],
  type: CardioSessionType,
  goal: Goal,
): Zone2Advice | IntervalAdvice {
  return type === 'zone2' ? computeZone2Progression(lastSessions, goal) : computeIntervalProgression(lastSessions, goal);
}
