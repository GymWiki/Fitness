import { generateProgram, type IntakeAnswers } from '@fitness/program-generator';
import { todayLocalDateString } from './dates';
import { GOAL_LABELS, goalForPhysique, type Physique } from './physique';
import { insertProgramStructure } from './programs';
import { updateProfile, type Profile } from './profile';
import { supabase } from './supabase';

/**
 * Re-throws with a stage prefix so a failure immediately says WHICH step
 * broke (new program insert vs. archiving the old one vs. profile update vs.
 * adjustment log) — narrowing down between "migration not applied on this
 * table", "RLS blocks this table", etc. without guessing. Preserves
 * code/hint/details from the original Postgrest error (if any) so
 * `describeError` can still surface them.
 */
async function withStage<T>(stage: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (err) {
    const raw = err as { message?: unknown; code?: unknown; hint?: unknown; details?: unknown } | null;
    const wrapped = new Error(`${stage}: ${raw && typeof raw.message === 'string' ? raw.message : String(err)}`);
    if (raw) {
      if (typeof raw.code === 'string') Object.assign(wrapped, { code: raw.code });
      if (typeof raw.hint === 'string') Object.assign(wrapped, { hint: raw.hint });
      if (typeof raw.details === 'string') Object.assign(wrapped, { details: raw.details });
    }
    throw wrapped;
  }
}

/**
 * Switches the user's active goal/schema: generates a new program for the
 * new physique/goal (from already-known days-per-week/experience/equipment
 * — nothing is re-asked), inserts it, THEN archives whatever program(s)
 * were active. Deliberately in that order and not the reverse: the client
 * can't wrap this in a database transaction, so if program generation or
 * insertion fails partway, the user is left with their old program still
 * active rather than with no active program at all. Nothing is ever
 * deleted — the old program's days/exercises/workouts/set_logs/cardio_logs
 * all stay exactly where they are, just under a program whose status is no
 * longer 'active', which is what keeps history and the "Progressie" charts
 * intact after switching.
 */
export async function switchGoal(userId: string, profile: Profile, newPhysique: Physique): Promise<void> {
  const newGoal = goalForPhysique(newPhysique);
  const oldGoal = profile.goal;

  const intake: IntakeAnswers = {
    goal: newGoal,
    experienceLevel: profile.experienceLevel,
    daysPerWeek: profile.daysPerWeek,
    equipment: profile.equipment,
  };
  const program = generateProgram(intake);

  const newProgramId = await withStage('Nieuw programma aanmaken', () => insertProgramStructure(userId, program));

  await withStage('Oud programma archiveren', async () => {
    const { error } = await supabase
      .from('programs')
      .update({ status: 'archived' })
      .eq('user_id', userId)
      .eq('status', 'active')
      .neq('id', newProgramId);
    if (error) throw error;
  });

  // The old program's future calendar plan no longer applies — clears it
  // (today included, since a goal switch replaces the whole schema
  // immediately, not prospectively like a weekly adjustment) so
  // `ensureScheduledWindow` can freely regenerate the same date range for
  // the new program without colliding with the old program's rows on the
  // (user_id, scheduled_date) unique constraint. Already-completed/missed
  // days stay untouched — those are history, not planning.
  await withStage('Toekomstige planning opschonen', async () => {
    const { error } = await supabase
      .from('scheduled_sessions')
      .delete()
      .eq('user_id', userId)
      .in('status', ['planned', 'rest'])
      .gte('scheduled_date', todayLocalDateString());
    if (error) throw error;
  });

  await withStage('Profiel bijwerken', () => updateProfile(userId, { targetPhysique: newPhysique, goal: newGoal }));

  // Logged on the new program so it surfaces immediately as its first entry in the adjustment/progress timeline.
  // The adaptation planner's own volume/deload tracking resets for free here too: it derives everything from
  // program_adjustments scoped to the active program's id, and this new program starts with none of those.
  await withStage('Aanpassing loggen', async () => {
    const { error } = await supabase.from('program_adjustments').insert({
      program_id: newProgramId,
      day_exercise_id: null,
      adjustment_type: 'goal_changed',
      previous_value: null,
      new_value: null,
      reason: `Doel gewijzigd van ${GOAL_LABELS[oldGoal]} naar ${GOAL_LABELS[newGoal]}.`,
      week_number: 1,
      is_deload: false,
    });
    if (error) throw error;
  });
}
