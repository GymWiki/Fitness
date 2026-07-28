import { StyleSheet, Text, View } from 'react-native';
import { addDays, startOfIsoWeek } from '@/lib/dateWeek';
import { toLocalDateString } from '@/lib/dates';
import { calculateStreak } from '@/lib/streak';
import { fetchActiveProgram } from '@/lib/programs';
import { fetchWorkoutDates } from '@/lib/progressStats';
import { ensureScheduledWindow, fetchScheduledSessions } from '@/lib/schedule';
import { computeWeekStrip, scheduleToWeekStrip, type WeekStripDay } from '@/lib/weekStrip';
import { useCachedData } from '@/lib/useCachedData';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
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
    <View style={styles.dayColumn} accessibilityLabel={`${dayLabel}${day.isToday ? ' (vandaag)' : ''}: ${STATUS_LABELS[day.status]}`}>
      <Text style={styles.dayLabel}>{dayLabel}</Text>
      <View
        style={[
          styles.dot,
          day.status === 'done' && styles.dotDone,
          day.status === 'missed' && styles.dotMissed,
          day.status === 'rest' && styles.dotRest,
          day.isToday && styles.dotToday,
        ]}
      >
        {day.status === 'missed' && <Text style={styles.missedMark}>×</Text>}
      </View>
    </View>
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
 * refocus repaints instantly from the last-known result instead of
 * blanking out while it refetches.
 */
export function WeekOverview({ userId }: { userId: string }) {
  // Keyed by today's date so a stale cache from a previous day can never paint over "today".
  const { data } = useCachedData(`week_overview:${userId}:${toLocalDateString(new Date())}`, () => loadWeekOverviewData(userId));

  if (!data || data.weekStrip.length === 0) return null;
  const { streak, weekStrip } = data;

  return (
    <View style={styles.container}>
      {streak !== null && streak > 0 && (
        <View style={styles.streakRow}>
          <FlameIcon size={18} color={colors.warning} />
          <Text style={styles.streakText}>
            {streak} {streak === 1 ? 'week' : 'weken'} op rij getraind
          </Text>
        </View>
      )}
      <View style={styles.stripRow}>
        {weekStrip.map((day) => (
          <StripDot key={day.date.toDateString()} day={day} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  streakText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  stripRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayColumn: {
    alignItems: 'center',
    gap: 4,
  },
  dayLabel: {
    color: colors.textTertiary,
    fontSize: 11,
  },
  dot: {
    width: 20,
    height: 20,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dotRest: {
    backgroundColor: 'transparent',
    borderColor: colors.border,
    width: 8,
    height: 8,
    marginVertical: 6,
  },
  dotMissed: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  dotToday: {
    borderColor: colors.textPrimary,
    borderWidth: 2,
  },
  missedMark: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
});
