import type { AdjustmentType } from '@fitness/adaptation-planner';
import { supabase } from './supabase';

export interface AdjustmentHistoryEntry {
  id: string;
  weekNumber: number;
  type: AdjustmentType;
  exerciseName: string | null;
  previousValue: number | null;
  newValue: number | null;
  explanation: string;
  isDeload: boolean;
  createdAt: string;
}

/**
 * Every automatic adjustment ever made to the user's active program, newest
 * first — the "why did my schedule change" history. RLS scopes this to the
 * owning user via program_adjustments' select policy.
 */
export async function fetchAdjustmentHistory(userId: string): Promise<AdjustmentHistoryEntry[]> {
  const { data: programRow, error: programError } = await supabase
    .from('programs')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (programError) throw programError;
  if (!programRow) return [];

  const { data: rows, error } = await supabase
    .from('program_adjustments')
    .select('id, week_number, adjustment_type, day_exercise_id, previous_value, new_value, reason, is_deload, created_at')
    .eq('program_id', programRow.id)
    .order('week_number', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) throw error;
  if (!rows || rows.length === 0) return [];

  const dayExerciseIds = [...new Set(rows.map((row) => row.day_exercise_id).filter((id): id is string => id !== null))];
  const { data: exerciseRows, error: exercisesError } =
    dayExerciseIds.length === 0
      ? { data: [], error: null }
      : await supabase.from('day_exercises').select('id, exercise_name').in('id', dayExerciseIds);
  if (exercisesError) throw exercisesError;

  const exerciseNameById = new Map((exerciseRows ?? []).map((row) => [row.id, row.exercise_name as string]));

  return rows.map((row) => ({
    id: row.id,
    weekNumber: row.week_number,
    type: row.adjustment_type as AdjustmentType,
    exerciseName: row.day_exercise_id ? (exerciseNameById.get(row.day_exercise_id) ?? null) : null,
    previousValue: row.previous_value as number | null,
    newValue: row.new_value as number | null,
    explanation: row.reason,
    isDeload: row.is_deload,
    createdAt: row.created_at,
  }));
}
