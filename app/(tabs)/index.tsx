import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Card } from '@/components/Card';
import { NutritionSummaryCard } from '@/components/NutritionSummaryCard';
import { ProgressSummaryCard } from '@/components/ProgressSummaryCard';
import { ReadinessCard } from '@/components/ReadinessCard';
import { SyncStatusBadge } from '@/components/SyncStatusBadge';
import { TrainingTodayCard } from '@/components/TrainingTodayCard';
import { WeekOverview } from '@/components/WeekOverview';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { useSyncStatus } from '@/lib/useSyncStatus';
import { fetchWeekReview, type WeekReview } from '@/lib/weekReview';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

// Above this width the four summary cards show as a 2x2 grid instead of a single stacked column.
const WIDE_LAYOUT_BREAKPOINT = 700;

export default function TodayScreen() {
  const { session } = useAuth();
  const { profile } = useProfile();
  const router = useRouter();
  const syncStatus = useSyncStatus();
  const { width: windowWidth } = useWindowDimensions();
  const [weekReview, setWeekReview] = useState<WeekReview | null>(null);

  // The pending-week-review prompt is the one thing on this screen that isn't a per-card
  // summary — it's a one-off actionable alert from the adaptation planner, so it keeps its
  // own tiny fetch here rather than being forced into one of the four cards below.
  const loadWeekReview = useCallback(async () => {
    if (!session) return;
    try {
      setWeekReview(await fetchWeekReview(session.user.id));
    } catch {
      setWeekReview(null);
    }
  }, [session]);

  useFocusEffect(
    useCallback(() => {
      loadWeekReview();
    }, [loadWeekReview]),
  );

  const firstName = profile?.displayName?.split(' ')[0];
  const isWideLayout = windowWidth >= WIDE_LAYOUT_BREAKPOINT;

  if (!session) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vandaag</Text>
          {firstName ? <Text style={styles.greeting}>Hoi {firstName}</Text> : null}
        </View>
        <SyncStatusBadge status={syncStatus} />
      </View>

      <WeekOverview userId={session.user.id} />

      {weekReview && (
        <Pressable onPress={() => router.push('/week-review')}>
          <Card style={styles.weekReviewCard}>
            <Text style={styles.weekReviewTitle}>Week {weekReview.weekNumber} voltooid</Text>
            <Text style={styles.weekReviewBody}>
              {weekReview.adjustments.length > 0
                ? `${weekReview.adjustments.length} voorgestelde aanpassing${weekReview.adjustments.length === 1 ? '' : 'en'} — bekijk en bevestig`
                : 'Bekijk je week-overzicht'}
            </Text>
          </Card>
        </Pressable>
      )}

      <View style={[styles.cardsGrid, isWideLayout && styles.cardsGridWide]}>
        <View style={isWideLayout ? styles.cardSlotWide : styles.cardSlotFull}>
          <TrainingTodayCard userId={session.user.id} />
        </View>
        <View style={isWideLayout ? styles.cardSlotWide : styles.cardSlotFull}>
          <NutritionSummaryCard userId={session.user.id} />
        </View>
        <View style={isWideLayout ? styles.cardSlotWide : styles.cardSlotFull}>
          <ProgressSummaryCard userId={session.user.id} />
        </View>
        <View style={isWideLayout ? styles.cardSlotWide : styles.cardSlotFull}>
          <ReadinessCard userId={session.user.id} />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.xxl,
    paddingTop: 48,
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
  },
  greeting: {
    ...typography.bodySecondary,
    marginTop: 2,
  },
  weekReviewCard: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekReviewTitle: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
  weekReviewBody: {
    color: colors.background,
    fontSize: 14,
    marginTop: 2,
    opacity: 0.85,
  },
  cardsGrid: {
    gap: spacing.md,
  },
  cardsGridWide: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cardSlotFull: {
    width: '100%',
  },
  cardSlotWide: {
    width: '48%',
  },
});
