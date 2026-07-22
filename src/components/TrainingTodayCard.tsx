import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { fetchActiveProgram, type ActiveProgram, type ActiveProgramDay } from '@/lib/programs';
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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setProgram(await fetchActiveProgram(userId));
    } catch {
      setError('Kon je training niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const todayDay = program?.days.find((day) => day.dayOrder === program.nextDayOrder) ?? null;

  return (
    <DashboardCardShell
      title="Training vandaag"
      icon={<CalendarIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onPress={() => (todayDay ? router.push(`/workout/${todayDay.id}`) : undefined)}
      ctaLabel={todayDay ? 'Start workout' : 'Naar schema'}
    >
      {todayDay ? (
        <>
          <Text style={styles.dayName}>
            Dag {todayDay.dayOrder}: {todayDay.name}
          </Text>
          <Text style={styles.detail}>{describeDay(todayDay)}</Text>
        </>
      ) : (
        <Text style={styles.detail}>
          {program ? 'Geen training gepland — geniet van je rustdag.' : 'Nog geen actief programma. Rond de intake af om te starten.'}
        </Text>
      )}
    </DashboardCardShell>
  );
}

const styles = StyleSheet.create({
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
