import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { fetchMonthlyWorkoutCount, fetchWeeklyVolume } from '@/lib/progressStats';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { DashboardCardShell } from './DashboardCardShell';
import { TrendingUpIcon } from './icons';
import { StatTile } from './StatTile';

export function ProgressSummaryCard({ userId }: { userId: string }) {
  const router = useRouter();
  const [weeklyVolume, setWeeklyVolume] = useState<number | null>(null);
  const [monthlyWorkouts, setMonthlyWorkouts] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [volume, monthly] = await Promise.all([fetchWeeklyVolume(userId), fetchMonthlyWorkoutCount(userId)]);
      setWeeklyVolume(volume);
      setMonthlyWorkouts(monthly);
    } catch {
      setError('Kon je progressie niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <DashboardCardShell
      title="Progressie"
      icon={<TrendingUpIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onPress={() => router.push('/(tabs)/progress')}
      ctaLabel="Bekijk Progressie"
    >
      <View style={styles.statsRow}>
        <StatTile label="Volume deze week" value={weeklyVolume !== null ? `${Math.round(weeklyVolume).toLocaleString('nl-NL')} kg` : '–'} />
        <StatTile label="Trainingen deze maand" value={monthlyWorkouts !== null ? String(monthlyWorkouts) : '–'} />
      </View>
    </DashboardCardShell>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
