import type { NutritionTargets } from '@fitness/nutrition-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { checkProteinShortfall } from '@/lib/proteinSignal';
import { fetchFoodLogsForDate, summarizeDay } from '@/lib/foodLogs';
import { fetchMeasurementHistory } from '@/lib/measurements';
import { describeNutrientProgress } from '@/lib/nutrientProgress';
import { computeUserNutritionTargets } from '@/lib/nutritionTargets';
import { useProfile } from '@/lib/profile';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { DashboardCardShell } from './DashboardCardShell';
import { UtensilsIcon } from './icons';
import { NutrientProgressBar } from './NutrientProgressBar';

export function NutritionSummaryCard({ userId }: { userId: string }) {
  const router = useRouter();
  const { profile } = useProfile();
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [caloriesEaten, setCaloriesEaten] = useState(0);
  const [proteinEaten, setProteinEaten] = useState(0);
  const [hasProteinShortfall, setHasProteinShortfall] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    setIsLoading(true);
    setError(null);
    try {
      const [measurements, todayLogs] = await Promise.all([fetchMeasurementHistory(userId), fetchFoodLogsForDate(userId, new Date())]);
      const latest = measurements[measurements.length - 1] ?? null;
      const computedTargets = computeUserNutritionTargets(profile, latest);
      setTargets(computedTargets);
      const summary = summarizeDay(todayLogs);
      setCaloriesEaten(summary.calories);
      setProteinEaten(summary.proteinGrams);
      setHasProteinShortfall(computedTargets ? await checkProteinShortfall(userId, profile, latest) : false);
    } catch {
      setError('Kon je voeding niet laden.');
    } finally {
      setIsLoading(false);
    }
  }, [userId, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const proteinProgress = targets ? describeNutrientProgress(proteinEaten, targets.proteinGrams, 'g') : null;

  return (
    <DashboardCardShell
      title="Voeding"
      icon={<UtensilsIcon size={18} color={colors.accent} />}
      isLoading={isLoading}
      error={error}
      onPress={() => router.push('/(tabs)/nutrition')}
      ctaLabel="Naar Voeding"
    >
      {targets ? (
        <>
          <NutrientProgressBar label="Calorieën" current={caloriesEaten} target={targets.calories} unit=" kcal" size="large" />
          {proteinProgress && <Text style={styles.proteinLine}>Eiwit: {proteinProgress.remainingLabel}</Text>}
          {hasProteinShortfall && <Text style={styles.shortfallLine}>Eiwitinname blijft al een paar dagen achter</Text>}
        </>
      ) : (
        <Text style={styles.detail}>Log een lichaamsmeting en vul je profiel aan om een voedingsdoel te zien.</Text>
      )}
    </DashboardCardShell>
  );
}

const styles = StyleSheet.create({
  detail: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  proteinLine: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  shortfallLine: {
    color: colors.warning,
    fontSize: 12,
    marginTop: spacing.xs,
  },
});
