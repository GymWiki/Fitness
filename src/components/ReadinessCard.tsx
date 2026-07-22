import type { RecoveryEstimate } from '@fitness/progression-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { fetchAllMuscleGroupRecoveryEstimates } from '@/lib/recovery';
import { colors } from '@/theme/colors';
import { CheckIcon } from './icons';
import { DashboardCardShell } from './DashboardCardShell';

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

  const readyCount = estimates ? [...estimates.values()].filter((estimate) => estimate.status === 'ready').length : 0;

  return (
    <DashboardCardShell
      title="Readiness"
      icon={<CheckIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onPress={() => router.push('/body-diagram')}
      ctaLabel="Bekijk lichaam"
    >
      <Text style={styles.detail}>
        {readyCount > 0 ? `${readyCount} spiergroep${readyCount === 1 ? '' : 'en'} klaar om te trainen` : 'Nog geen spiergroep in het optimale venster'}
      </Text>
    </DashboardCardShell>
  );
}

const styles = StyleSheet.create({
  detail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
});
