import { generateProgram, type IntakeAnswers } from '@fitness/program-generator';
import { GOAL_LABELS, goalForPhysique, type Physique } from './physique';
import { insertProgramStructure } from './programs';
import { updateProfile, type Profile } from './profile';
import { supabase } from './supabase';

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

  const newProgramId = await insertProgramStructure(userId, program);

  const { error: archiveError } = await supabase
    .from('programs')
    .update({ status: 'archived' })
    .eq('user_id', userId)
    .eq('status', 'active')
    .neq('id', newProgramId);
  if (archiveError) throw archiveError;

  await updateProfile(userId, { targetPhysique: newPhysique, goal: newGoal });

  // Logged on the new program so it surfaces immediately as its first entry in the adjustment/progress timeline.
  // The adaptation planner's own volume/deload tracking resets for free here too: it derives everything from
  // program_adjustments scoped to the active program's id, and this new program starts with none of those.
  const { error: adjustmentError } = await supabase.from('program_adjustments').insert({
    program_id: newProgramId,
    day_exercise_id: null,
    adjustment_type: 'goal_changed',
    previous_value: null,
    new_value: null,
    reason: `Doel gewijzigd van ${GOAL_LABELS[oldGoal]} naar ${GOAL_LABELS[newGoal]}.`,
    week_number: 1,
    is_deload: false,
  });
  if (adjustmentError) throw adjustmentError;
}
