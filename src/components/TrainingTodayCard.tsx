import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { fetchActiveProgram, type ActiveProgram, type ActiveProgramDay } from '@/lib/programs';
import { ensureScheduledWindow, fetchScheduledSessions, type ScheduledSessionRow } from '@/lib/schedule';
import { todayLocalDateString } from '@/lib/dates';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { CalendarIcon } from './icons';
import { DashboardCardShell } from './DashboardCardShell';

/** "borst" | "borst en rug" | "borst, rug en schouders" — natural Dutch list join, not a comma-only dump. */
function joinWithEn(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} en ${items[items.length - 1]}`;
}

function describeDay(day: ActiveProgramDay): string {
  const muscleGroups = [...new Set(day.exercises.map((exercise) => exercise.muscleGroup).filter((mg): mg is string => !!mg))];
  const exerciseCount = day.exercises.length;
  const exerciseLabel = exerciseCount === 1 ? 'oefening' : 'oefeningen';
  return muscleGroups.length > 0 ? `${exerciseCount} ${exerciseLabel} · ${joinWithEn(muscleGroups.map((mg) => mg.toLowerCase()))}` : `${exerciseCount} ${exerciseLabel}`;
}

export function TrainingTodayCard({ userId }: { userId: string }) {
  const router = useRouter();
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  // undefined = no calendar schedule available (older account, or fetch failed) -> fall back to the day-count rotation.
  const [scheduledToday, setScheduledToday] = useState<ScheduledSessionRow | null | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setProgram(await fetchActiveProgram(userId));
    } catch {
      setError('Kon je training niet laden.');
      setIsLoading(false);
      return;
    }
    try {
      await ensureScheduledWindow(userId);
      const today = todayLocalDateString();
      const rows = await fetchScheduledSessions(userId, today, today);
      setScheduledToday(rows[0] ?? null);
    } catch {
      setScheduledToday(undefined); // calendar planning unavailable right now — fall back silently, this section never blocks on it
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const hasSchedule = scheduledToday !== undefined;
  const isRestDayScheduled = hasSchedule && scheduledToday?.status === 'rest';
  const isDoneToday = hasSchedule && scheduledToday?.status === 'done';
  const scheduledDay = scheduledToday?.programDayId ? (program?.days.find((day) => day.id === scheduledToday.programDayId) ?? null) : null;
  const rotationFallbackDay = program?.days.find((day) => day.dayOrder === program.nextDayOrder) ?? null;
  const todayDay = hasSchedule ? scheduledDay : rotationFallbackDay;

  // On a rest day (or once the calendar plan runs out) there's no specific day to open — the CTA
  // always has somewhere useful to go instead of silently doing nothing when tapped.
  const ctaLabel = todayDay ? (isDoneToday ? 'Bekijk workout' : 'Start workout') : 'Naar schema';

  return (
    <DashboardCardShell
      title="Training vandaag"
      icon={<CalendarIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onPress={() => router.push(todayDay ? `/workout/${todayDay.id}` : '/(tabs)/schema')}
      ctaLabel={ctaLabel}
    >
      {todayDay ? (
        <>
          {isDoneToday && <Text style={styles.doneBadge}>Getraind vandaag ✓</Text>}
          <Text style={styles.dayName}>
            Dag {todayDay.dayOrder}: {todayDay.name}
          </Text>
          <Text style={styles.detail}>{describeDay(todayDay)}</Text>
        </>
      ) : isRestDayScheduled ? (
        <Text style={styles.detail}>Rustdag — zo gepland in je schema. Geniet ervan.</Text>
      ) : (
        <Text style={styles.detail}>
          {program ? 'Geen training gepland — geniet van je rustdag.' : 'Nog geen actief programma. Rond de intake af om te starten.'}
        </Text>
      )}
    </DashboardCardShell>
  );
}

const styles = StyleSheet.create({
  doneBadge: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  dayName: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
  },
  detail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: -spacing.xs,
  },
});
