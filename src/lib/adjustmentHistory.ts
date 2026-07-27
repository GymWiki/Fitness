import type { AdjustmentType } from '@fitness/adaptation-planner';
import { getAllAsync, getFirstAsync } from './db';

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

/** Every automatic adjustment ever made to the active program, newest first — the "why did my schedule change" history. */
export async function fetchAdjustmentHistory(): Promise<AdjustmentHistoryEntry[]> {
  const programRow = await getFirstAsync<{ id: string }>(`select id from programs where status = 'active' order by started_at desc limit 1`);
  if (!programRow) return [];

  const rows = await getAllAsync<{
    id: string;
    week_number: number;
    adjustment_type: AdjustmentType;
    day_exercise_id: string | null;
    previous_value: string | null;
    new_value: string | null;
    reason: string;
    is_deload: number;
    created_at: string;
  }>(
    `select id, week_number, adjustment_type, day_exercise_id, previous_value, new_value, reason, is_deload, created_at
     from program_adjustments where program_id = ? order by week_number desc, created_at desc`,
    [programRow.id],
  );
  if (rows.length === 0) return [];

  const dayExerciseIds = [...new Set(rows.map((row) => row.day_exercise_id).filter((id): id is string => id !== null))];
  const exerciseRows =
    dayExerciseIds.length === 0
      ? []
      : await getAllAsync<{ id: string; exercise_name: string }>(
          `select id, exercise_name from day_exercises where id in (${dayExerciseIds.map(() => '?').join(',')})`,
          dayExerciseIds,
        );
  const exerciseNameById = new Map(exerciseRows.map((row) => [row.id, row.exercise_name]));

  return rows.map((row) => ({
    id: row.id,
    weekNumber: row.week_number,
    type: row.adjustment_type,
    exerciseName: row.day_exercise_id ? (exerciseNameById.get(row.day_exercise_id) ?? null) : null,
    previousValue: row.previous_value !== null ? (JSON.parse(row.previous_value) as number) : null,
    newValue: row.new_value !== null ? (JSON.parse(row.new_value) as number) : null,
    explanation: row.reason,
    isDeload: row.is_deload === 1,
    createdAt: row.created_at,
  }));
}
