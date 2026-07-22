import { fetchWithCache } from './offlineCache';
import { supabase } from './supabase';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Total weight × reps logged across all strength sets in the last 7 days. */
export async function fetchWeeklyVolume(userId: string): Promise<number> {
  return fetchWithCache(`weekly_volume:${userId}`, () => fetchWeeklyVolumeFromNetwork(userId));
}

async function fetchWeeklyVolumeFromNetwork(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - WEEK_MS).toISOString();
  const { data: workoutRows, error: workoutsError } = await supabase
    .from('workouts')
    .select('id')
    .eq('user_id', userId)
    .gte('performed_at', cutoff);
  if (workoutsError) throw workoutsError;
  const workoutIds = (workoutRows ?? []).map((row) => row.id);
  if (workoutIds.length === 0) return 0;

  const { data: setRows, error: setsError } = await supabase.from('set_logs').select('weight_kg, reps').in('workout_id', workoutIds);
  if (setsError) throw setsError;

  return (setRows ?? []).reduce((total, row) => total + row.weight_kg * row.reps, 0);
}

const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** Number of workouts logged in the last 30 days. */
export async function fetchMonthlyWorkoutCount(userId: string): Promise<number> {
  return fetchWithCache(`monthly_workout_count:${userId}`, () => fetchMonthlyWorkoutCountFromNetwork(userId));
}

async function fetchMonthlyWorkoutCountFromNetwork(userId: string): Promise<number> {
  const cutoff = new Date(Date.now() - MONTH_MS).toISOString();
  const { count, error } = await supabase
    .from('workouts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('performed_at', cutoff);
  if (error) throw error;
  return count ?? 0;
}

/**
 * Every workout's `performed_at`, as `Date`s — the raw material for the
 * dashboard's streak (`streak.ts`) and week-strip (`weekStrip.ts`), which
 * both need actual calendar dates rather than the epoch-week buckets
 * `fetchLongestStreak` below uses for its own, different "longest streak
 * ever" metric. Cached as ISO strings (`fetchWithCache` round-trips through
 * `JSON.stringify`/`parse`, which wouldn't revive `Date` instances on a
 * cache-fallback read) and only converted to `Date` after the cache layer.
 */
export async function fetchWorkoutDates(userId: string): Promise<Date[]> {
  const isoDates = await fetchWithCache(`workout_dates:${userId}`, () => fetchWorkoutDatesFromNetwork(userId));
  return isoDates.map((iso) => new Date(iso));
}

async function fetchWorkoutDatesFromNetwork(userId: string): Promise<string[]> {
  const { data, error } = await supabase.from('workouts').select('performed_at').eq('user_id', userId);
  if (error) throw error;
  return (data ?? []).map((row) => row.performed_at as string);
}

function weekBucket(iso: string): number {
  return Math.floor(Date.parse(iso) / WEEK_MS);
}

/** Longest run of consecutive training weeks (at least one workout each week) the user has ever had. */
export async function fetchLongestStreak(userId: string): Promise<number> {
  return fetchWithCache(`longest_streak:${userId}`, () => fetchLongestStreakFromNetwork(userId));
}

async function fetchLongestStreakFromNetwork(userId: string): Promise<number> {
  const { data, error } = await supabase.from('workouts').select('performed_at').eq('user_id', userId).order('performed_at', { ascending: true });
  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const weekBuckets = [...new Set(data.map((row) => weekBucket(row.performed_at)))].sort((a, b) => a - b);

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
