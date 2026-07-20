import { shouldDeload } from './deload';
import type { Adjustment, CurrentProgramState, Goal, RecentWeekSummary, WeekExerciseLog, WeekLog, WeekSessionLog } from './types';

/** Share of scheduled sessions that must be skipped in a week before adherence — not volume — becomes the priority fix. */
const ADHERENCE_SKIP_RATIO_THRESHOLD = 0.5;
const MIN_DAYS_PER_WEEK = 2;

function hitTopOfRange(session: WeekSessionLog, exercise: WeekExerciseLog): boolean {
  return session.sets.every((set) => set.reps >= exercise.repRangeMax && set.rir >= exercise.targetRIR);
}

function fellBelowRange(session: WeekSessionLog, exercise: WeekExerciseLog): boolean {
  return session.sets.some((set) => set.reps < exercise.repRangeMin);
}

function groupByMuscleGroup(exercises: WeekExerciseLog[]): Map<string, WeekExerciseLog[]> {
  const groups = new Map<string, WeekExerciseLog[]>();
  for (const exercise of exercises) {
    const group = groups.get(exercise.muscleGroup) ?? [];
    group.push(exercise);
    groups.set(exercise.muscleGroup, group);
  }
  return groups;
}

function evaluateAdherence(weekLogs: WeekLog, program: CurrentProgramState): Adjustment | null {
  const totalDays = weekLogs.days.length;
  if (totalDays === 0) return null;

  const skippedDays = weekLogs.days.filter((day) => !day.completed).length;
  const skipRatio = skippedDays / totalDays;
  if (skipRatio < ADHERENCE_SKIP_RATIO_THRESHOLD) return null;

  const newDaysPerWeek = Math.max(MIN_DAYS_PER_WEEK, program.daysPerWeek - 1);
  return {
    type: 'reduce_days',
    previousValue: program.daysPerWeek,
    newValue: newDaysPerWeek,
    reason: `${skippedDays} van de ${totalDays} geplande sessies deze week overgeslagen. Een kleiner schema dat wel gedaan wordt werkt beter dan vasthouden aan een schema dat blijft liggen: ${program.daysPerWeek} -> ${newDaysPerWeek} dagen per week.`,
  };
}

function evaluateMuscleGroupVolume(weekLogs: WeekLog, goal: Goal): Adjustment[] {
  const adjustments: Adjustment[] = [];

  for (const [muscleGroup, exercises] of groupByMuscleGroup(weekLogs.exercises)) {
    const loggedExercises = exercises.filter((exercise) => exercise.sessions.length > 0);
    if (loggedExercises.length === 0) continue;

    const strugglingExercise = loggedExercises.find((exercise) => exercise.sessions.some((session) => fellBelowRange(session, exercise)));

    if (strugglingExercise) {
      const newSets = Math.max(1, strugglingExercise.currentSets - 1);
      if (newSets === strugglingExercise.currentSets) continue;
      adjustments.push({
        type: 'volume_decrease',
        muscleGroup,
        dayExerciseId: strugglingExercise.dayExerciseId,
        previousValue: strugglingExercise.currentSets,
        newValue: newSets,
        reason: `Reps vielen deze week onder de streef-range bij ${muscleGroup} — een teken dat het volume te hoog is om van te herstellen. Sets terug van ${strugglingExercise.currentSets} naar ${newSets}.`,
      });
      continue;
    }

    const allHitTop = loggedExercises.every((exercise) => exercise.sessions.every((session) => hitTopOfRange(session, exercise)));
    if (goal === 'hypertrophy' && allHitTop) {
      const target = loggedExercises.find((exercise) => exercise.exerciseType === 'compound') ?? loggedExercises[0]!;
      const newSets = target.currentSets + 1;
      adjustments.push({
        type: 'volume_increase',
        muscleGroup,
        dayExerciseId: target.dayExerciseId,
        previousValue: target.currentSets,
        newValue: newSets,
        reason: `Alle sets voor ${muscleGroup} raakten deze week de bovenkant van de rep-range op de streef-RIR. Volume kan omhoog: ${target.currentSets} -> ${newSets} sets.`,
      });
    }
  }

  return adjustments;
}

function evaluateDeload(weekLogs: WeekLog, program: CurrentProgramState): Adjustment | null {
  const hasRecoverySignal = weekLogs.exercises.some((exercise) => exercise.sessions.some((session) => fellBelowRange(session, exercise)));
  const thisWeekSummary: RecentWeekSummary = { weekNumber: weekLogs.weekNumber, wasDeload: false, hasRecoverySignal };
  const decision = shouldDeload([...program.recentWeeks, thisWeekSummary]);
  return decision.shouldDeload ? { type: 'deload', reason: decision.reason } : null;
}

/**
 * Evaluates one full pass through the program's days (a "training week", not
 * necessarily a calendar week) and proposes adjustments. Adherence is
 * checked first: if sessions are structurally being skipped, that's the only
 * adjustment proposed this pass — suggesting more volume when the existing
 * plan isn't even being completed would be tone-deaf coaching. Deload is
 * evaluated independently of adherence (recovery is a separate axis from
 * whether sessions happened at all).
 */
export function evaluateWeek(weekLogs: WeekLog, program: CurrentProgramState, goal: Goal): Adjustment[] {
  const adjustments: Adjustment[] = [];

  const adherenceAdjustment = evaluateAdherence(weekLogs, program);
  if (adherenceAdjustment) {
    adjustments.push(adherenceAdjustment);
  } else {
    adjustments.push(...evaluateMuscleGroupVolume(weekLogs, goal));
  }

  const deloadAdjustment = evaluateDeload(weekLogs, program);
  if (deloadAdjustment) adjustments.push(deloadAdjustment);

  return adjustments;
}
