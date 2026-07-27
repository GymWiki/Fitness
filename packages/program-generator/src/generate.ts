import { buildCardioSessionTypes, CARDIO_BASELINE_BY_GOAL } from './cardioBaseline';
import { isHeavyLowerBodyDay, MOVEMENT_SLOTS } from './exercises';
import { getRepScheme, getWeightIncrementKg } from './repSchemes';
import { TEMPLATE_DAY_ARCHETYPES, selectTemplateKey, type DayArchetype } from './templates';
import type { GeneratedCardioSession, GeneratedDay, GeneratedExercise, GeneratedProgram, Goal, IntakeAnswers, TemplateKey } from './types';

const CARDIO_SESSION_NAME: Record<GeneratedCardioSession['sessionType'], string> = {
  zone2: 'Zone 2 cardio',
  interval: 'Interval training',
};

const MIN_DAYS_PER_WEEK = 2;
const MAX_DAYS_PER_WEEK = 7;

/**
 * Weekly ceiling on active days (strength + standalone cardio combined) so a
 * calendar week always keeps at least one full rest day.
 */
const MAX_ACTIVE_DAYS_PER_WEEK = 6;

/**
 * At this strength frequency and above there's no slot left for a standalone
 * cardio day within `MAX_ACTIVE_DAYS_PER_WEEK` — cardio always merges onto an
 * existing strength day instead.
 */
const HIGH_STRENGTH_FREQUENCY = 5;

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  full_body_3x: 'Full Body',
  upper_lower_4x: 'Upper/Lower Split',
  push_pull_legs_6x: 'Push/Pull/Legs',
};

function buildExercise(archetype: DayArchetype, slotId: string, exerciseOrder: number, intake: IntakeAnswers): GeneratedExercise {
  const slot = MOVEMENT_SLOTS[slotId];
  if (!slot) throw new Error(`Unknown movement slot: ${slotId}`);

  const repScheme = getRepScheme(intake.goal, slot.exerciseType, intake.experienceLevel);
  return {
    exerciseOrder,
    exerciseName: slot.variants[archetype.variant][intake.equipment],
    muscleGroup: slot.muscleGroup,
    exerciseType: slot.exerciseType,
    sets: repScheme.sets,
    repRangeMin: repScheme.repRangeMin,
    repRangeMax: repScheme.repRangeMax,
    targetRIR: repScheme.targetRIR,
    weightIncrementKg: getWeightIncrementKg(intake.equipment, slot.exerciseType),
  };
}

function buildDay(archetype: DayArchetype, dayOrder: number, intake: IntakeAnswers): GeneratedDay {
  return {
    dayOrder,
    name: archetype.name,
    exercises: archetype.slotIds.map((slotId, index) => buildExercise(archetype, slotId, index + 1, intake)),
    cardioSessions: [],
  };
}

/**
 * Cycles the template's day archetypes to fill `daysPerWeek` days. Templates
 * have fewer archetypes than the highest `daysPerWeek` that can select them
 * (e.g. upper/lower has 4 archetypes but covers 4, 5 and 6 days/week), so a
 * 5- or 6-day week repeats earlier archetypes rather than inventing new ones.
 */
function buildProgramDays(templateKey: TemplateKey, intake: IntakeAnswers): GeneratedDay[] {
  const archetypes = TEMPLATE_DAY_ARCHETYPES[templateKey];
  return Array.from({ length: intake.daysPerWeek }, (_, index) => {
    const archetype = archetypes[index % archetypes.length]!;
    return buildDay(archetype, index + 1, intake);
  });
}

function buildCardioSessions(goal: Goal): GeneratedCardioSession[] {
  const baseline = CARDIO_BASELINE_BY_GOAL[goal];
  return buildCardioSessionTypes(baseline.sessionsPerWeek).map((sessionType) => ({
    exerciseOrder: 1,
    exerciseName: CARDIO_SESSION_NAME[sessionType],
    sessionType,
    durationMinutes: baseline.minutesPerSession,
  }));
}

/**
 * Appends a cardio session onto an existing strength day (short, after the
 * lifting) rather than giving it its own day. Rotates across the days that
 * aren't a heavy lower-body day where possible — same interference logic as
 * the calendar-level scheduling, applied here since a merged session can't
 * be moved to a different calendar day later.
 */
function mergeCardioIntoStrengthDays(strengthDays: GeneratedDay[], sessions: GeneratedCardioSession[]): void {
  const lightDays = strengthDays.filter((day) => !isHeavyLowerBodyDay(day.exercises));
  const rotation = lightDays.length > 0 ? lightDays : strengthDays;

  sessions.forEach((session, index) => {
    const target = rotation[index % rotation.length]!;
    target.cardioSessions.push({ ...session, exerciseOrder: target.exercises.length + target.cardioSessions.length + 1 });
  });
}

function buildStandaloneCardioDays(sessions: GeneratedCardioSession[]): GeneratedDay[] {
  return sessions.map((session) => ({ dayOrder: 0, name: session.exerciseName, exercises: [], cardioSessions: [session] }));
}

/**
 * Spreads `secondary` items evenly through `primary` (e.g. 2 cardio days
 * across 4 strength days lands them roughly at positions 2 and 4, not both
 * tacked on at the end) so the resulting order reads as one integrated
 * rotation instead of two back-to-back blocks.
 */
function interleaveEvenly<T>(primary: T[], secondary: T[]): T[] {
  if (secondary.length === 0) return [...primary];

  const result: T[] = [];
  const ratio = primary.length / secondary.length;
  let primaryIndex = 0;
  secondary.forEach((item, index) => {
    const takeUntil = Math.round((index + 1) * ratio);
    while (primaryIndex < takeUntil) {
      result.push(primary[primaryIndex]!);
      primaryIndex++;
    }
    result.push(item);
  });
  while (primaryIndex < primary.length) {
    result.push(primary[primaryIndex]!);
    primaryIndex++;
  }
  return result;
}

export function generateProgram(intake: IntakeAnswers): GeneratedProgram {
  if (intake.daysPerWeek < MIN_DAYS_PER_WEEK || intake.daysPerWeek > MAX_DAYS_PER_WEEK) {
    throw new Error(`daysPerWeek must be between ${MIN_DAYS_PER_WEEK} and ${MAX_DAYS_PER_WEEK}, got ${intake.daysPerWeek}.`);
  }

  const templateKey = selectTemplateKey(intake.daysPerWeek);
  const strengthDays = buildProgramDays(templateKey, intake);
  const cardioSessions = buildCardioSessions(intake.goal);

  const standaloneSlots =
    intake.daysPerWeek >= HIGH_STRENGTH_FREQUENCY ? 0 : Math.max(0, MAX_ACTIVE_DAYS_PER_WEEK - intake.daysPerWeek);
  const standaloneSessions = cardioSessions.slice(0, standaloneSlots);
  const mergedSessions = cardioSessions.slice(standaloneSlots);

  mergeCardioIntoStrengthDays(strengthDays, mergedSessions);
  const standaloneCardioDays = buildStandaloneCardioDays(standaloneSessions);

  const days = interleaveEvenly(strengthDays, standaloneCardioDays).map((day, index) => ({ ...day, dayOrder: index + 1 }));

  return {
    templateKey,
    name: `${TEMPLATE_LABELS[templateKey]} (${intake.daysPerWeek}x per week)`,
    goal: intake.goal,
    days,
  };
}
