import { addDaysIso, buildScheduleDates, distributeSessions, type CardioSessionInput, type StrengthDayInput, type Weekday } from '@fitness/adaptation-planner';
import { isHeavyLowerBodyDay, type Goal } from '@fitness/program-generator';
import { todayLocalDateString } from './dates';
import { getAllAsync, getFirstAsync, runAsync } from './db';
import { generateId } from './id';

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
 * Regenerates the rolling ~2-week schedule for the active program. No-ops
 * entirely when `preferred_weekdays` hasn't been set (skipped onboarding
 * step) — every UI piece that reads the schedule is built to fall back to
 * the pre-existing day-count rotation when this produces nothing, so calling
 * it is always safe even then.
 *
 * Idempotent and cheap to call on every dashboard/schema focus: it first
 * sweeps overdue `planned` rows to `missed` (a day that's passed without a
 * logged session just lapses — the schedule keeps its fixed weekdays rather
 * than drifting sessions forward, which is the one clear, predictable rule
 * for a missed day per the design brief), then only inserts whatever
 * calendar days between "wherever the window currently ends" and "today +
 * 2 weeks" don't have a row yet.
 */
export async function ensureScheduledWindow(): Promise<void> {
  const today = todayLocalDateString();

  await runAsync(`update scheduled_sessions set status = 'missed' where status = 'planned' and scheduled_date < ?`, [today]);

  const profileRow = await getFirstAsync<{ preferred_weekdays: string | null }>('select preferred_weekdays from profiles where id = ?', ['local']);
  const preferredWeekdays = profileRow?.preferred_weekdays ? (JSON.parse(profileRow.preferred_weekdays) as number[]) : null;
  if (!preferredWeekdays || preferredWeekdays.length === 0) return;

  const programRow = await getFirstAsync<{ id: string; goal: Goal }>(
    `select id, goal from programs where status = 'active' order by started_at desc limit 1`,
  );
  if (!programRow) return;

  const dayRows = await getAllAsync<{ id: string }>('select id from program_days where program_id = ? and is_active = 1', [programRow.id]);
  if (dayRows.length === 0) return;

  const strengthDays: StrengthDayInput[] = [];
  const cardioSessions: CardioSessionInput[] = [];
  for (const day of dayRows) {
    const exercises = await getAllAsync<DayExerciseForScheduling>(
      'select kind, exercise_type, muscle_group from day_exercises where program_day_id = ?',
      [day.id],
    );
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
  const weekPlan = distributeSessions(strengthDays, cardioSessions, programRow.goal, validWeekdays ? (preferredWeekdays as Weekday[]) : undefined);

  const maxRow = await getFirstAsync<{ scheduled_date: string }>('select scheduled_date from scheduled_sessions order by scheduled_date desc limit 1');

  const windowEnd = addDaysIso(today, WINDOW_DAYS - 1);
  const existingMax = maxRow?.scheduled_date;
  const rangeStart = existingMax && existingMax >= today ? addDaysIso(existingMax, 1) : today;
  if (rangeStart > windowEnd) return;

  const plan = buildScheduleDates(weekPlan, rangeStart, windowEnd);
  const now = new Date().toISOString();
  for (const entry of plan) {
    await runAsync(
      `insert into scheduled_sessions (id, program_id, scheduled_date, program_day_id, status, created_at)
       values (?, ?, ?, ?, ?, ?)
       on conflict (scheduled_date) do nothing`,
      [generateId(), programRow.id, entry.date, entry.programDayId, entry.programDayId ? 'planned' : 'rest', now],
    );
  }
}

/** Scheduled sessions between two dates (inclusive), oldest first — the single source both the dashboard and the schema page read from. */
export async function fetchScheduledSessions(fromDate: string, toDate: string): Promise<ScheduledSessionRow[]> {
  const rows = await getAllAsync<{
    id: string;
    scheduled_date: string;
    status: ScheduledSessionStatus;
    program_day_id: string | null;
    day_order: number | null;
    day_name: string | null;
  }>(
    `select ss.id, ss.scheduled_date, ss.status, ss.program_day_id, pd.day_order as day_order, pd.name as day_name
     from scheduled_sessions ss
     left join program_days pd on pd.id = ss.program_day_id
     where ss.scheduled_date >= ? and ss.scheduled_date <= ?
     order by ss.scheduled_date asc`,
    [fromDate, toDate],
  );

  return rows.map((row) => ({
    id: row.id,
    date: row.scheduled_date,
    status: row.status,
    programDayId: row.program_day_id,
    programDayName: row.day_name,
    programDayOrder: row.day_order,
  }));
}
