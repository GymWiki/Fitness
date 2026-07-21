import type { NutritionTargets } from '@fitness/nutrition-engine';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { BarcodeIcon, SearchIcon, StarIcon, TrashIcon } from '@/components/icons';
import { NutrientProgressBar } from '@/components/NutrientProgressBar';
import { useAuth } from '@/lib/auth';
import { deleteFoodLog, fetchFoodLogsForDate, fetchRecentFoodLogs, logFood, summarizeDay, type FoodLogEntry } from '@/lib/foodLogs';
import { fetchFavorites, type FoodFavorite } from '@/lib/foodFavorites';
import { fetchMeasurementHistory } from '@/lib/measurements';
import { computeUserNutritionTargets } from '@/lib/nutritionTargets';
import { useProfile } from '@/lib/profile';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

export default function NutritionScreen() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [todayLogs, setTodayLogs] = useState<FoodLogEntry[]>([]);
  const [recent, setRecent] = useState<FoodLogEntry[]>([]);
  const [favorites, setFavorites] = useState<FoodFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quickLogId, setQuickLogId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!session || !profile) return;
    setIsLoading(true);
    setError(null);
    const results = await Promise.allSettled([
      fetchMeasurementHistory(session.user.id),
      fetchFoodLogsForDate(session.user.id, new Date()),
      fetchRecentFoodLogs(session.user.id),
      fetchFavorites(session.user.id),
    ]);
    const [measurementsResult, todayResult, recentResult, favoritesResult] = results;

    if (measurementsResult.status === 'fulfilled') {
      const latest = measurementsResult.value[measurementsResult.value.length - 1] ?? null;
      setTargets(computeUserNutritionTargets(profile, latest));
    }
    if (todayResult.status === 'fulfilled') setTodayLogs(todayResult.value);
    if (recentResult.status === 'fulfilled') setRecent(recentResult.value);
    if (favoritesResult.status === 'fulfilled') setFavorites(favoritesResult.value);

    if (results.every((result) => result.status === 'rejected')) {
      setError('Kon je voedingsdata niet laden.');
    }
    setIsLoading(false);
  }, [session, profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function handleQuickLogRecent(entry: FoodLogEntry) {
    if (!session || quickLogId) return;
    setQuickLogId(entry.id);
    try {
      await logFood(session.user.id, {
        barcode: entry.barcode ?? undefined,
        customName: entry.barcode ? undefined : entry.name,
        quantityGrams: entry.quantityGrams,
        calories: entry.calories,
        proteinGrams: entry.proteinGrams,
        carbsGrams: entry.carbsGrams,
        fatGrams: entry.fatGrams,
      });
      await load();
    } finally {
      setQuickLogId(null);
    }
  }

  async function handleQuickLogFavorite(favorite: FoodFavorite) {
    if (!session || quickLogId) return;
    setQuickLogId(favorite.id);
    try {
      await logFood(session.user.id, {
        barcode: favorite.barcode ?? undefined,
        customName: favorite.barcode ? undefined : favorite.label,
        quantityGrams: 100,
        calories: Math.round(favorite.caloriesPer100g),
        proteinGrams: favorite.proteinPer100g,
        carbsGrams: favorite.carbsPer100g,
        fatGrams: favorite.fatPer100g,
      });
      await load();
    } finally {
      setQuickLogId(null);
    }
  }

  async function handleDelete(id: string) {
    await deleteFoodLog(id);
    await load();
  }

  const summary = summarizeDay(todayLogs);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Voeding</Text>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && (
          <>
            {targets ? (
              <Card style={styles.summaryCard} elevated>
                <Text style={styles.sectionTitle}>Vandaag</Text>
                <NutrientProgressBar label="Calorieën" current={summary.calories} target={targets.calories} unit=" kcal" size="large" />
                <View style={styles.macroBarGroup}>
                  <NutrientProgressBar label="Eiwit" current={summary.proteinGrams} target={targets.proteinGrams} unit="g" />
                  <NutrientProgressBar label="Koolhydraten" current={summary.carbsGrams} target={targets.carbGrams} unit="g" />
                  <NutrientProgressBar label="Vet" current={summary.fatGrams} target={targets.fatGrams} unit="g" />
                </View>
                <Text style={styles.disclaimer}>
                  Richtlijn op basis van je lichaamsmetingen en trainingsdoel, geen medisch advies.
                </Text>
              </Card>
            ) : (
              <Card style={styles.summaryCard}>
                <Text style={styles.body}>
                  Log eerst een lichaamsmeting (gewicht, lengte) en vul geslacht/geboortejaar in bij Profiel om een
                  calorie- en eiwitdoel te zien.
                </Text>
              </Card>
            )}

            <View style={styles.quickActionsRow}>
              <Pressable style={styles.quickAction} onPress={() => router.push('/food-scan')}>
                <BarcodeIcon size={20} color={colors.accent} />
                <Text style={styles.quickActionText}>Scannen</Text>
              </Pressable>
              <Pressable style={styles.quickAction} onPress={() => router.push('/food-search')}>
                <SearchIcon size={20} color={colors.accent} />
                <Text style={styles.quickActionText}>Zoeken</Text>
              </Pressable>
            </View>

            {recent.length > 0 && (
              <>
                <Text style={styles.sectionTitleSpaced}>Recent gelogd</Text>
                <View style={styles.chipScrollRow}>
                  {recent.map((entry) => (
                    <Pressable
                      key={entry.id}
                      style={styles.quickLogChip}
                      onPress={() => handleQuickLogRecent(entry)}
                      disabled={quickLogId === entry.id}
                    >
                      {quickLogId === entry.id ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <>
                          <Text style={styles.quickLogChipName} numberOfLines={1}>
                            {entry.name}
                          </Text>
                          <Text style={styles.quickLogChipDetail}>{entry.calories} kcal</Text>
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            {favorites.length > 0 && (
              <>
                <Text style={styles.sectionTitleSpaced}>Favorieten</Text>
                <View style={styles.chipScrollRow}>
                  {favorites.map((favorite) => (
                    <Pressable
                      key={favorite.id}
                      style={styles.quickLogChip}
                      onPress={() => handleQuickLogFavorite(favorite)}
                      disabled={quickLogId === favorite.id}
                    >
                      {quickLogId === favorite.id ? (
                        <ActivityIndicator size="small" color={colors.accent} />
                      ) : (
                        <>
                          <View style={styles.favoriteChipHeader}>
                            <StarIcon size={12} color={colors.warning} filled />
                            <Text style={styles.quickLogChipName} numberOfLines={1}>
                              {favorite.label}
                            </Text>
                          </View>
                          <Text style={styles.quickLogChipDetail}>{Math.round(favorite.caloriesPer100g)} kcal/100g</Text>
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
              </>
            )}

            <Text style={styles.sectionTitleSpaced}>Vandaag gelogd</Text>
            {todayLogs.length === 0 ? (
              <EmptyState title="Nog niets gelogd vandaag" body="Scan een barcode of zoek een product om je eerste maaltijd toe te voegen." />
            ) : (
              todayLogs.map((entry) => (
                <Card key={entry.id} style={styles.logRow}>
                  <View style={styles.logTextColumn}>
                    <Text style={styles.logName}>{entry.name}</Text>
                    <Text style={styles.logDetail}>
                      {Math.round(entry.quantityGrams)}g · {entry.calories} kcal · {entry.proteinGrams}g eiwit
                    </Text>
                  </View>
                  <Pressable onPress={() => handleDelete(entry.id)} hitSlop={8}>
                    <TrashIcon size={18} color={colors.textTertiary} />
                  </Pressable>
                </Card>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xxl,
    paddingTop: 48,
    gap: spacing.sm,
  },
  title: {
    ...typography.display,
    marginBottom: spacing.md,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  macroBarGroup: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.heading,
  },
  sectionTitleSpaced: {
    ...typography.heading,
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  disclaimer: {
    color: colors.textTertiary,
    fontSize: 11,
    marginTop: spacing.xs,
  },
  quickActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  quickAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.lg,
  },
  quickActionText: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  chipScrollRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickLogChip: {
    minWidth: 120,
    maxWidth: 160,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  favoriteChipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickLogChipName: {
    color: colors.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  quickLogChipDetail: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logTextColumn: {
    flex: 1,
  },
  logName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  logDetail: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 2,
  },
});
