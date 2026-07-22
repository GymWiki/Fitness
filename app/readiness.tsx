import { ALL_MUSCLE_GROUPS } from '@fitness/program-generator';
import { generateRecoveryCurve, type RecoveryEstimate, type RecoveryStatus } from '@fitness/progression-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ModalHeader } from '@/components/ModalHeader';
import { MuscleRecoveryRing } from '@/components/MuscleRecoveryRing';
import { RecoveryCurveChart } from '@/components/RecoveryCurveChart';
import { useAuth } from '@/lib/auth';
import { fetchActiveProgram, type ActiveProgram } from '@/lib/programs';
import { compareMuscleRecoveryPriority, describeMuscleRecoveryTap } from '@/lib/recoveryReadiness';
import { fetchAllMuscleGroupRecoveryEstimates } from '@/lib/recovery';
import { STATUS_COLOR, STATUS_LABEL } from '@/lib/recoveryLabels';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

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
  const { width: windowWidth } = useWindowDimensions();
  const [estimates, setEstimates] = useState<Map<string, RecoveryEstimate>>(new Map());
  const [program, setProgram] = useState<ActiveProgram | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [curveMuscleGroupOverride, setCurveMuscleGroupOverride] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError(null);
    try {
      const [nextEstimates, activeProgram] = await Promise.all([
        fetchAllMuscleGroupRecoveryEstimates(session.user.id),
        fetchActiveProgram(session.user.id),
      ]);
      setEstimates(nextEstimates);
      setProgram(activeProgram);
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

  // "Readiness zegt: klaar" moet direct naar de bijbehorende training kunnen leiden in plaats
  // van de gebruiker zelf naar Schema te laten zoeken — de eerste actieve programmadag die deze
  // spiergroep traint, ongeacht of dat een kracht- of cardio-dag is.
  function trainingDayIdForMuscleGroup(muscleGroup: string): string | null {
    return program?.days.find((day) => day.exercises.some((exercise) => exercise.muscleGroup === muscleGroup))?.id ?? null;
  }
  const canStartTrainingForStatus = (status: RecoveryStatus) => status === 'ready' || status === 'window_closing';

  // Defaults to the muscle group closest to (or already in) its window — same
  // sort `sortedMuscleGroups` already uses — so the curve always shows
  // something meaningful before the user taps anything. A tapped ring
  // overrides this, but closing the tap-card doesn't blank the curve back out.
  const curveMuscleGroup = curveMuscleGroupOverride ?? sortedMuscleGroups[0]?.[0] ?? null;
  const curveEstimate = curveMuscleGroup ? estimates.get(curveMuscleGroup) : undefined;
  const curve = curveMuscleGroup && curveEstimate ? generateRecoveryCurve(curveMuscleGroup, curveEstimate) : null;
  const curveTapInfo = curveMuscleGroup && curveEstimate ? describeMuscleRecoveryTap(curveMuscleGroup, curveEstimate) : null;
  const chartWidth = Math.min(windowWidth - 80, 480);

  return (
    <View style={styles.container}>
      <ModalHeader title="Readiness" />

      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} />
        </View>
      )}

      {!isLoading && error && <Text style={styles.error}>{error}</Text>}

      {!isLoading && !error && sortedMuscleGroups.length === 0 && (
        <View style={styles.emptyWrap}>
          <EmptyState
            title="Nog geen hersteldata"
            body="Log je eerste training om hier per spiergroep te zien wanneer je klaar bent voor de volgende sessie."
          />
        </View>
      )}

      {!isLoading && !error && sortedMuscleGroups.length > 0 && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.grid}>
            {sortedMuscleGroups.map(([muscleGroup, estimate]) => (
              <View key={muscleGroup} style={styles.gridTile}>
                <MuscleRecoveryRing
                  muscleGroup={muscleGroup}
                  estimate={estimate}
                  onPress={() => {
                    setSelectedMuscleGroup(muscleGroup);
                    setCurveMuscleGroupOverride(muscleGroup);
                  }}
                />
              </View>
            ))}
          </View>

          {curve && curveEstimate && curveTapInfo && (
            <View style={styles.curveSection}>
              <Text style={styles.curveTitle}>Herstelcurve — {curveTapInfo.muscleGroup}</Text>
              <RecoveryCurveChart curve={curve} estimate={curveEstimate} width={chartWidth} />
              <Text style={[styles.curveStatus, { color: STATUS_COLOR[curveEstimate.status] }]}>{curveTapInfo.statusLabel}</Text>
              <Text style={styles.curveExplanation}>{curveTapInfo.explanation}</Text>
              <Text style={styles.curveDisclaimer}>
                Dit is een geïllustreerd, vereenvoudigd model, geen exacte meting.{' '}
                <Text style={styles.curveDisclaimerLink} onPress={() => router.push({ pathname: '/faq', params: { openId: 'supercompensatie' } })}>
                  Meer uitleg in de FAQ →
                </Text>
              </Text>
            </View>
          )}

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
              {selectedEstimate &&
                canStartTrainingForStatus(selectedEstimate.status) &&
                (() => {
                  const dayId = trainingDayIdForMuscleGroup(tapInfo.muscleGroup);
                  return dayId ? (
                    <Pressable onPress={() => router.push(`/workout/${dayId}`)}>
                      <Text style={styles.tapCardStartLink}>Start training →</Text>
                    </Pressable>
                  ) : null;
                })()}
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
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingHorizontal: spacing.xxl,
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
  curveSection: {
    gap: spacing.xs,
  },
  curveTitle: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  curveStatus: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  curveExplanation: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  curveDisclaimer: {
    color: colors.textTertiary,
    fontSize: 11,
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  curveDisclaimerLink: {
    color: colors.accent,
    fontWeight: '600',
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
  tapCardStartLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
});
