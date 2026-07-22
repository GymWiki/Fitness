import { ALL_MUSCLE_GROUPS } from '@fitness/program-generator';
import type { RecoveryEstimate, RecoveryStatus } from '@fitness/progression-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { MuscleRecoveryRing } from '@/components/MuscleRecoveryRing';
import { useAuth } from '@/lib/auth';
import { compareMuscleRecoveryPriority, describeMuscleRecoveryTap } from '@/lib/recoveryReadiness';
import { fetchAllMuscleGroupRecoveryEstimates } from '@/lib/recovery';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/recoveryLabels';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const LEGEND_STATUSES: RecoveryStatus[] = ['recovering', 'window_closing', 'ready', 'window_passed', 'no_data'];

/**
 * Full readiness grid — replaces the earlier anatomical body diagram
 * (see PROJECT.md) with Apple Watch-style rings, one per muscle group,
 * sorted "most ready to train" first via `compareMuscleRecoveryPriority`.
 * Same underlying `estimateRecoveryState` data as before, same tap-card
 * interaction, purely a different visual layer.
 */
export default function ReadinessScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const [estimates, setEstimates] = useState<Map<string, RecoveryEstimate>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

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

  const sortedMuscleGroups = [...ALL_MUSCLE_GROUPS]
    .map((muscleGroup): [string, RecoveryEstimate] | null => {
      const estimate = estimates.get(muscleGroup);
      return estimate ? [muscleGroup, estimate] : null;
    })
    .filter((entry): entry is [string, RecoveryEstimate] => entry !== null)
    .sort(compareMuscleRecoveryPriority);

  const selectedEstimate = selectedMuscleGroup ? estimates.get(selectedMuscleGroup) : undefined;
  const tapInfo = selectedMuscleGroup && selectedEstimate ? describeMuscleRecoveryTap(selectedMuscleGroup, selectedEstimate) : null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Readiness</Text>
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
          <View style={styles.grid}>
            {sortedMuscleGroups.map(([muscleGroup, estimate]) => (
              <View key={muscleGroup} style={styles.gridTile}>
                <MuscleRecoveryRing muscleGroup={muscleGroup} estimate={estimate} onPress={() => setSelectedMuscleGroup(muscleGroup)} />
              </View>
            ))}
          </View>

          <View style={styles.legendRow}>
            {LEGEND_STATUSES.map((status) => (
              <View key={status} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLOR[status] }]} />
                <Text style={styles.legendLabel}>{STATUS_LABEL[status]}</Text>
              </View>
            ))}
          </View>

          {tapInfo && (
            <Card style={styles.tapCard} elevated>
              <View style={styles.tapCardHeaderRow}>
                <Text style={styles.tapCardTitle}>{tapInfo.muscleGroup}</Text>
                <Pressable onPress={() => setSelectedMuscleGroup(null)} hitSlop={8}>
                  <Text style={styles.tapCardClose}>Sluiten</Text>
                </Pressable>
              </View>
              <Text style={[styles.tapCardStatus, { color: selectedEstimate ? STATUS_COLOR[selectedEstimate.status] : colors.textSecondary }]}>
                {tapInfo.statusLabel}
              </Text>
              <Text style={styles.tapCardExplanation}>{tapInfo.explanation}</Text>
              <Pressable
                onPress={() => {
                  setSelectedMuscleGroup(null);
                  router.push({ pathname: '/faq', params: { openId: 'supercompensatie' } });
                }}
              >
                <Text style={styles.tapCardLink}>Waarom laat de app dit zien? →</Text>
              </Pressable>
            </Card>
          )}
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
    gap: spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: spacing.lg,
  },
  gridTile: {
    width: '31%',
    alignItems: 'center',
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: radii.pill,
  },
  legendLabel: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  tapCard: {
    gap: spacing.xs,
  },
  tapCardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tapCardTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  tapCardClose: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  tapCardStatus: {
    fontSize: 13,
    fontWeight: '700',
  },
  tapCardExplanation: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  tapCardLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
});
