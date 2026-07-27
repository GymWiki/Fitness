import type { RecoveryEstimate } from '@fitness/progression-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { compareMuscleRecoveryPriority } from '@/lib/recoveryReadiness';
import { fetchAllMuscleGroupRecoveryEstimates } from '@/lib/recovery';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { CheckIcon } from './icons';
import { DashboardCardShell } from './DashboardCardShell';
import { MuscleRecoveryRing } from './MuscleRecoveryRing';

const COMPACT_RING_COUNT = 4;
const COMPACT_RING_SIZE = 44;

export function ReadinessCard({ userId }: { userId: string }) {
  const router = useRouter();
  const [estimates, setEstimates] = useState<Map<string, RecoveryEstimate> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setEstimates(await fetchAllMuscleGroupRecoveryEstimates(userId));
    } catch {
      setError('Kon je herstelstatus niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const topMuscleGroups = estimates
    ? [...estimates.entries()].sort(compareMuscleRecoveryPriority).slice(0, COMPACT_RING_COUNT)
    : [];

  return (
    <DashboardCardShell
      title="Readiness"
      icon={<CheckIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onPress={() => router.push('/readiness')}
      ctaLabel="Bekijk volledig overzicht"
    >
      <View style={styles.ringRow}>
        {topMuscleGroups.map(([muscleGroup, estimate]) => (
          <MuscleRecoveryRing key={muscleGroup} muscleGroup={muscleGroup} estimate={estimate} size={COMPACT_RING_SIZE} />
        ))}
      </View>
    </DashboardCardShell>
  );
}

const styles = StyleSheet.create({
  ringRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
});
