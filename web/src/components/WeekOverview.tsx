'use client';

import { addDays, startOfIsoWeek } from '@/lib/dateWeek';
import { toLocalDateString } from '@/lib/dates';
import { calculateStreak } from '@/lib/streak';
import { fetchActiveProgram } from '@/lib/programs';
import { fetchWorkoutDates } from '@/lib/progressStats';
import { ensureScheduledWindow, fetchScheduledSessions } from '@/lib/schedule';
import { computeWeekStrip, scheduleToWeekStrip, type WeekStripDay } from '@/lib/weekStrip';
import { useCachedData } from '@/lib/useCachedData';
import { colors } from '@/theme/colors';
import { FlameIcon } from './icons';

const DAY_LABELS = ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'];

const STATUS_LABELS: Record<WeekStripDay['status'], string> = {
  done: 'getraind',
  missed: 'gemist',
  rest: 'rustdag',
  planned: 'nog te gaan',
};

function StripDot({ day }: { day: WeekStripDay }) {
  const dayLabel = DAY_LABELS[day.date.getDay() === 0 ? 6 : day.date.getDay() - 1];
  return (
    <div className="flex flex-col items-center gap-1" aria-label={`${dayLabel}${day.isToday ? ' (vandaag)' : ''}: ${STATUS_LABELS[day.status]}`}>
      <span className="text-[11px] text-text-tertiary">{dayLabel}</span>
      {day.status === 'rest' ? (
        <div className={`h-2 w-2 rounded-full border border-border bg-transparent ${day.isToday ? 'border-2 border-text-primary' : ''}`} />
      ) : (
        <div
          className={`flex h-5 w-5 items-center justify-center rounded-full border-[1.5px] ${
            day.status === 'done'
              ? 'border-accent bg-accent'
              : day.status === 'missed'
                ? 'border-danger bg-danger-muted'
                : 'border-border'
          } ${day.isToday ? 'border-2 border-text-primary' : ''}`}
        >
          {day.status === 'missed' && <span className="text-[11px] font-bold leading-3 text-danger">×</span>}
        </div>
      )}
    </div>
  );
}

interface WeekOverviewData {
  streak: number | null;
  weekStrip: WeekStripDay[];
}

// Prefers the real calendar schedule (exactly what "Vandaag" and the schema page also
// read) over the workoutDates heuristic, so the strip never shows a second, possibly-
// divergent guess. Falls back silently when no schedule exists yet (older accounts).
async function loadScheduleWeekStrip(userId: string): Promise<WeekStripDay[] | null> {
  try {
    await ensureScheduledWindow(userId);
    const weekStart = startOfIsoWeek(new Date());
    const weekEnd = addDays(weekStart, 6);
    const rows = await fetchScheduledSessions(userId, toLocalDateString(weekStart), toLocalDateString(weekEnd));
    return rows.length > 0 ? scheduleToWeekStrip(rows) : null;
  } catch {
    return null; // fall through to the heuristic below
  }
}

// The schedule fetch doesn't depend on `program`/`workoutDates` (only the heuristic fallback
// does), so all three run concurrently instead of the schedule chain waiting on the first two.
async function loadWeekOverviewData(userId: string): Promise<WeekOverviewData> {
  const [program, workoutDates, scheduleWeekStrip] = await Promise.all([
    fetchActiveProgram(userId),
    fetchWorkoutDates(userId),
    loadScheduleWeekStrip(userId),
  ]);
  const daysPerWeek = program?.days.length ?? 0;
  const streak = calculateStreak(workoutDates, daysPerWeek);
  const weekStrip = scheduleWeekStrip ?? computeWeekStrip(workoutDates, daysPerWeek);
  return { streak, weekStrip };
}

/**
 * Streak line + 7-day week strip for the top of the "Vandaag" dashboard.
 * Self-fetching (own loading/error state) so a slow query here never
 * blocks the four cards below it — same "independent card" treatment as
 * `TrainingTodayCard`/`ReadinessCard`/etc. Uses `useCachedData` so a
 * revisit repaints instantly from the last-known result instead of
 * blanking out while it refetches.
 */
export function WeekOverview({ userId }: { userId: string }) {
  // Keyed by today's date so a stale cache from a previous day can never paint over "today".
  const { data } = useCachedData(`week_overview:${userId}:${toLocalDateString(new Date())}`, () => loadWeekOverviewData(userId));

  if (!data || data.weekStrip.length === 0) return null;
  const { streak, weekStrip } = data;

  return (
    <div className="flex flex-col gap-2">
      {streak !== null && streak > 0 && (
        <div className="flex items-center gap-1">
          <FlameIcon size={18} color={colors.warning} />
          <span className="text-sm font-bold text-text-primary">
            {streak} {streak === 1 ? 'week' : 'weken'} op rij getraind
          </span>
        </div>
      )}
      <div className="flex justify-between">
        {weekStrip.map((day) => (
          <StripDot key={day.date.toDateString()} day={day} />
        ))}
      </div>
    </div>
  );
}
