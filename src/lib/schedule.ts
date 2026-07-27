import { addDaysIso, buildScheduleDates, distributeSessions, type CardioSessionInput, type StrengthDayInput, type Weekday } from '@fitness/adaptation-planner';
import { isHeavyLowerBodyDay } from '@fitness/program-generator';
import { todayLocalDateString } from './dates';
import { supabase } from './supabase';

/** Rolling window length: today plus 13 more days = 2 full weeks including today. */
const WINDOW_DAYS = 14;

export type ScheduledSessionStatus = 'planned' | 'done' | 'missed' | 'rest';

export interface ScheduledSessionRow {
  id: string;
  /** yyyy-mm-dd. */
  date: string;
  status: ScheduledSessionStatus;
  programDayId: string | null;
  programDayName: string | null;
  programDayOrder: number | null;
}

interface DayExerciseForScheduling {
  kind: 'strength' | 'cardio_duration' | 'cardio_interval';
  exercise_type: string | null;
  muscle_group: string | null;
}

/**
 * Regenerates the rolling ~2-week schedule for a user's active program.
 * No-ops entirely for accounts that haven't set `preferred_weekdays`
 * (existing accounts, or anyone who skipped the onboarding step) — every UI
 * piece that reads the schedule is built to fall back to the pre-existing
 * day-count rotation when this produces nothing, so calling it is always
 * safe even for those accounts.
 *
 * Idempotent and cheap to call on every dashboard/schema focus: it first
 * sweeps overdue `planned` rows to `missed` (a day that's passed without a
 * logged session just lapses — the schedule keeps its fixed weekdays rather
 * than drifting sessions forward, which is the one clear, predictable rule
 * for a missed day per the design brief), then only inserts whatever
 * calendar days between "wherever the window currently ends" and "today +
 * 2 weeks" don't have a row yet.
 */
export async function ensureScheduledWindow(userId: string): Promise<void> {
  const today = todayLocalDateString();

  const { error: sweepError } = await supabase
    .from('scheduled_sessions')
    .update({ status: 'missed' })
    .eq('user_id', userId)
    .eq('status', 'planned')
    .lt('scheduled_date', today);
  if (sweepError) throw sweepError;

  const { data: profileRow, error: profileError } = await supabase.from('profiles').select('preferred_weekdays').eq('id', userId).maybeSingle();
  if (profileError) throw profileError;
  const preferredWeekdays = (profileRow?.preferred_weekdays ?? null) as number[] | null;
  if (!preferredWeekdays || preferredWeekdays.length === 0) return;

  const { data: programRow, error: programError } = await supabase
    .from('programs')
    .select('id, goal')
    .eq('user_id', userId)
    .eq('status', 'active')
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (programError) throw programError;
  if (!programRow) return;

  const { data: dayRows, error: daysError } = await supabase
    .from('program_days')
    .select('id, day_exercises (kind, exercise_type, muscle_group)')
    .eq('program_id', programRow.id)
    .eq('is_active', true);
  if (daysError) throw daysError;
  if (!dayRows || dayRows.length === 0) return;

  const strengthDays: StrengthDayInput[] = [];
  const cardioSessions: CardioSessionInput[] = [];
  for (const day of dayRows) {
    const exercises = (day.day_exercises ?? []) as DayExerciseForScheduling[];
    const hasStrength = exercises.some((exercise) => exercise.kind === 'strength');
    const hasCardio = exercises.some((exercise) => exercise.kind === 'cardio_duration' || exercise.kind === 'cardio_interval');
    if (hasStrength) {
      strengthDays.push({
        id: day.id,
        name: '',
        isHeavyLowerBody: isHeavyLowerBodyDay(exercises.map((exercise) => ({ exerciseType: exercise.exercise_type, muscleGroup: exercise.muscle_group }))),
      });
    } else if (hasCardio) {
      const isHigh = exercises.some((exercise) => exercise.kind === 'cardio_interval');
      cardioSessions.push({ id: day.id, intensity: isHigh ? 'high' : 'low' });
    }
  }
  if (strengthDays.length === 0 && cardioSessions.length === 0) return;

  const validWeekdays = preferredWeekdays.every((weekday) => weekday >= 1 && weekday <= 7);
  const weekPlan = distributeSessions(
    strengthDays,
    cardioSessions,
    programRow.goal,
    validWeekdays ? (preferredWeekdays as Weekday[]) : undefined,
  );

  const { data: maxRow, error: maxError } = await supabase
    .from('scheduled_sessions')
    .select('scheduled_date')
    .eq('user_id', userId)
    .order('scheduled_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (maxError) throw maxError;

  const windowEnd = addDaysIso(today, WINDOW_DAYS - 1);
  const existingMax = maxRow?.scheduled_date as string | undefined;
  const rangeStart = existingMax && existingMax >= today ? addDaysIso(existingMax, 1) : today;
  if (rangeStart > windowEnd) return;

  const plan = buildScheduleDates(weekPlan, rangeStart, windowEnd);
  const rows = plan.map((entry) => ({
    user_id: userId,
    program_id: programRow.id,
    scheduled_date: entry.date,
    program_day_id: entry.programDayId,
    status: entry.programDayId ? ('planned' as const) : ('rest' as const),
  }));

  const { error: insertError } = await supabase.from('scheduled_sessions').upsert(rows, { onConflict: 'user_id,scheduled_date', ignoreDuplicates: true });
  if (insertError) throw insertError;
}

/** Scheduled sessions for a user between two dates (inclusive), oldest first — the single source both the dashboard and the schema page read from. */
export async function fetchScheduledSessions(userId: string, fromDate: string, toDate: string): Promise<ScheduledSessionRow[]> {
  const { data, error } = await supabase
    .from('scheduled_sessions')
    .select('id, scheduled_date, status, program_day_id, program_days (day_order, name)')
    .eq('user_id', userId)
    .gte('scheduled_date', fromDate)
    .lte('scheduled_date', toDate)
    .order('scheduled_date', { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => {
    const day = row.program_days as unknown as { day_order: number; name: string } | null;
    return {
      id: row.id,
      date: row.scheduled_date,
      status: row.status,
      programDayId: row.program_day_id,
      programDayName: day?.name ?? null,
      programDayOrder: day?.day_order ?? null,
    };
  });
}
