import { getAllAsync, getFirstAsync } from './db';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Total weight × reps logged across all strength sets in the last 7 days. */
export async function fetchWeeklyVolume(): Promise<number> {
  const cutoff = new Date(Date.now() - WEEK_MS).toISOString();
  const workoutRows = await getAllAsync<{ id: string }>('select id from workouts where performed_at >= ?', [cutoff]);
  const workoutIds = workoutRows.map((row) => row.id);
  if (workoutIds.length === 0) return 0;

  const setRows = await getAllAsync<{ weight_kg: number; reps: number }>(
    `select weight_kg, reps from set_logs where workout_id in (${workoutIds.map(() => '?').join(',')})`,
    workoutIds,
  );
  return setRows.reduce((total, row) => total + row.weight_kg * row.reps, 0);
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** Number of workouts logged in the last 30 days. */
export async function fetchMonthlyWorkoutCount(): Promise<number> {
  const cutoff = new Date(Date.now() - MONTH_MS).toISOString();
  const row = await getFirstAsync<{ count: number }>('select count(*) as count from workouts where performed_at >= ?', [cutoff]);
  return row?.count ?? 0;
}

/**
 * Every workout's `performed_at`, as `Date`s — the raw material for the
 * dashboard's streak (`streak.ts`) and week-strip (`weekStrip.ts`), which
 * both need actual calendar dates rather than the epoch-week buckets
 * `fetchLongestStreak` below uses for its own, different "longest streak
 * ever" metric.
 */
export async function fetchWorkoutDates(): Promise<Date[]> {
  const rows = await getAllAsync<{ performed_at: string }>('select performed_at from workouts');
  return rows.map((row) => new Date(row.performed_at));
}

function weekBucket(iso: string): number {
  return Math.floor(Date.parse(iso) / WEEK_MS);
}

/** Longest run of consecutive training weeks (at least one workout each week) ever logged. */
export async function fetchLongestStreak(): Promise<number> {
  const rows = await getAllAsync<{ performed_at: string }>('select performed_at from workouts order by performed_at asc');
  if (rows.length === 0) return 0;

  const weekBuckets = [...new Set(rows.map((row) => weekBucket(row.performed_at)))].sort((a, b) => a - b);

  let longest = 1;
  let current = 1;
  for (let i = 1; i < weekBuckets.length; i++) {
    if (weekBuckets[i] === weekBuckets[i - 1]! + 1) {
      current += 1;
    } else {
      current = 1;
    }
    longest = Math.max(longest, current);
  }
  return longest;
}
