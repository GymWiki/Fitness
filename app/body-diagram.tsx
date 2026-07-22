import type { RecoveryEstimate } from '@fitness/progression-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { BodyDiagram } from '@/components/BodyDiagram';
import { useAuth } from '@/lib/auth';
import { fetchAllMuscleGroupRecoveryEstimates } from '@/lib/recovery';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

/**
 * Full-screen version of the compact "Readiness"-card on the dashboard —
 * same `BodyDiagram` component, same tap-per-muscle-group interaction, just
 * without the dashboard's space constraints. Own data fetch (not passed
 * down from the dashboard) so this screen also works when opened directly
 * (e.g. a future deep link) without depending on dashboard state.
 */
export default function BodyDiagramScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [estimates, setEstimates] = useState<Map<string, RecoveryEstimate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      setEstimates(await fetchAllMuscleGroupRecoveryEstimates(session.user.id));
    } catch {
      setError('Kon je herstelstatus niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Lichaam</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.closeButton}>Sluiten</Text>
        </Pressable>
      </View>

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && !error && (
        <ScrollView contentContainerStyle={styles.content}>
          <BodyDiagram estimatesByMuscleGroup={estimates} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xxl,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.title,
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
    marginHorizontal: spacing.xxl,
  },
  content: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.xxl,
    alignItems: 'center',
  },
});
