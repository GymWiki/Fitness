import { buildCardioSessionTypes, CARDIO_BASELINE_BY_GOAL } from './cardioBaseline';
import { MOVEMENT_SLOTS } from './exercises';
import { getRepScheme, getWeightIncrementKg } from './repSchemes';
import { TEMPLATE_DAY_ARCHETYPES, selectTemplateKey, type DayArchetype } from './templates';
import type { GeneratedCardioSession, GeneratedDay, GeneratedExercise, GeneratedProgram, Goal, IntakeAnswers, TemplateKey } from './types';

const CARDIO_SESSION_NAME: Record<GeneratedCardioSession['sessionType'], string> = {
  zone2: 'Zone 2 cardio',
  interval: 'Interval training',
};

const MIN_DAYS_PER_WEEK = 2;
const MAX_DAYS_PER_WEEK = 6;

const TEMPLATE_LABELS: Record<TemplateKey, string> = {
  full_body_3x: 'Full Body',
  upper_lower_4x: 'Upper/Lower Split',
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
 * Dedicated cardio days appended after the strength days, per the goal's
 * baseline in `cardioBaseline.ts` — the single place that config lives.
 * Each cardio session gets its own day (own `program_days` row once
 * persisted) rather than being tacked onto a lifting day, so it shows up
 * as its own clear entry in the schema and rotation.
 */
function buildCardioDays(startingDayOrder: number, goal: Goal): GeneratedDay[] {
  const baseline = CARDIO_BASELINE_BY_GOAL[goal];
  const sessionTypes = buildCardioSessionTypes(baseline.sessionsPerWeek);

  return sessionTypes.map((sessionType, index) => {
    const name = CARDIO_SESSION_NAME[sessionType];
    const session: GeneratedCardioSession = {
      exerciseOrder: 1,
      exerciseName: name,
      sessionType,
      durationMinutes: baseline.minutesPerSession,
    };
    return {
      dayOrder: startingDayOrder + index,
      name,
      exercises: [],
      cardioSessions: [session],
    };
  });
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

export function generateProgram(intake: IntakeAnswers): GeneratedProgram {
  if (intake.daysPerWeek < MIN_DAYS_PER_WEEK || intake.daysPerWeek > MAX_DAYS_PER_WEEK) {
    throw new Error(`daysPerWeek must be between ${MIN_DAYS_PER_WEEK} and ${MAX_DAYS_PER_WEEK}, got ${intake.daysPerWeek}.`);
  }

  const templateKey = selectTemplateKey(intake.daysPerWeek);
  const strengthDays = buildProgramDays(templateKey, intake);
  const cardioDays = buildCardioDays(strengthDays.length + 1, intake.goal);
  return {
    templateKey,
    name: `${TEMPLATE_LABELS[templateKey]} (${intake.daysPerWeek}x per week)`,
    goal: intake.goal,
    days: [...strengthDays, ...cardioDays],
  };
}
