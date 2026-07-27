import { generateProgram, type IntakeAnswers } from '@fitness/program-generator';
import { todayLocalDateString } from './dates';
import { runAsync } from './db';
import { generateId } from './id';
import { GOAL_LABELS, goalForPhysique, type Physique } from './physique';
import { insertProgramStructure } from './programs';
import { updateProfile, type Profile } from './profile';

/**
 * Re-throws with a stage prefix so a failure immediately says WHICH step
 * broke (new program insert vs. archiving the old one vs. profile update vs.
 * adjustment log) — narrowing down between causes without guessing.
 */
async function withStage<T>(stage: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const wrapped = new Error(`${stage}: ${err instanceof Error ? err.message : String(err)}`);
    throw wrapped;
  }
}

/**
 * Switches the active goal/schema: generates a new program for the new
 * physique/goal (from already-known days-per-week/experience/equipment —
 * nothing is re-asked), inserts it, THEN archives whatever program(s) were
 * active. Deliberately in that order and not the reverse: if program
 * generation or insertion fails partway, the old program stays active rather
 * than leaving no active program at all. Nothing is ever deleted — the old
 * program's days/exercises/workouts/set_logs/cardio_logs all stay exactly
 * where they are, just under a program whose status is no longer 'active',
 * which is what keeps history and the "Progressie" charts intact after
 * switching.
 */
export async function switchGoal(profile: Profile, newPhysique: Physique): Promise<void> {
  const newGoal = goalForPhysique(newPhysique);
  const oldGoal = profile.goal;

  const intake: IntakeAnswers = {
    goal: newGoal,
    experienceLevel: profile.experienceLevel,
    daysPerWeek: profile.daysPerWeek,
    equipment: profile.equipment,
  };
  const program = generateProgram(intake);

  const newProgramId = await withStage('Nieuw programma aanmaken', () => insertProgramStructure(program));

  await withStage('Oud programma archiveren', () =>
    runAsync(`update programs set status = 'archived' where status = 'active' and id != ?`, [newProgramId]),
  );

  // The old program's future calendar plan no longer applies — clears it
  // (today included, since a goal switch replaces the whole schema
  // immediately, not prospectively like a weekly adjustment) so
  // `ensureScheduledWindow` can freely regenerate the same date range for
  // the new program without colliding with the old program's rows on the
  // scheduled_date unique constraint. Already-completed/missed days stay
  // untouched — those are history, not planning.
  await withStage('Toekomstige planning opschonen', () =>
    runAsync(`delete from scheduled_sessions where status in ('planned', 'rest') and scheduled_date >= ?`, [todayLocalDateString()]),
  );

  await withStage('Profiel bijwerken', () => updateProfile({ targetPhysique: newPhysique, goal: newGoal }));

  // Logged on the new program so it surfaces immediately as its first entry in the adjustment/progress timeline.
  // The adaptation planner's own volume/deload tracking resets for free here too: it derives everything from
  // program_adjustments scoped to the active program's id, and this new program starts with none of those.
  await withStage('Aanpassing loggen', () =>
    runAsync(
      `insert into program_adjustments (id, program_id, day_exercise_id, adjustment_type, previous_value, new_value, reason, effective_at, week_number, is_deload, created_at)
       values (?, ?, null, 'goal_changed', null, null, ?, ?, 1, 0, ?)`,
      [generateId(), newProgramId, `Doel gewijzigd van ${GOAL_LABELS[oldGoal]} naar ${GOAL_LABELS[newGoal]}.`, todayLocalDateString(), new Date().toISOString()],
    ),
  );
}
