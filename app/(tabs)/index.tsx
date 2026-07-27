import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Card } from '@/components/Card';
import { ProgressSummaryCard } from '@/components/ProgressSummaryCard';
import { ReadinessCard } from '@/components/ReadinessCard';
import { TrainingTodayCard } from '@/components/TrainingTodayCard';
import { WeekOverview } from '@/components/WeekOverview';
import { useProfile } from '@/lib/profile';
import { fetchWeekReview, type WeekReview } from '@/lib/weekReview';
import { colors } from '@/theme/colors';
import { layout } from '@/theme/layout';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

// Above this width the summary cards show as a 2x2 grid instead of a single stacked column.
const WIDE_LAYOUT_BREAKPOINT = 700;

export default function TodayScreen() {
  const { profile } = useProfile();
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const [weekReview, setWeekReview] = useState<WeekReview | null>(null);

  // The pending-week-review prompt is the one thing on this screen that isn't a per-card
  // summary — it's a one-off actionable alert from the adaptation planner, so it keeps its
  // own tiny fetch here rather than being forced into one of the cards below.
  const loadWeekReview = useCallback(async () => {
    try {
      setWeekReview(await fetchWeekReview());
    } catch {
      setWeekReview(null);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadWeekReview();
    }, [loadWeekReview]),
  );

  const firstName = profile?.displayName?.split(' ')[0];
  const isWideLayout = windowWidth >= WIDE_LAYOUT_BREAKPOINT;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Vandaag</Text>
          {firstName ? <Text style={styles.greeting}>Hoi {firstName}</Text> : null}
        </View>
      </View>

      <WeekOverview />

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
          <TrainingTodayCard />
        </View>
        <View style={isWideLayout ? styles.cardSlotWide : styles.cardSlotFull}>
          <ProgressSummaryCard />
        </View>
        <View style={isWideLayout ? styles.cardSlotWide : styles.cardSlotFull}>
          <ReadinessCard />
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
  content: {
    padding: spacing.xxl,
    paddingTop: layout.tabScreenPaddingTop,
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
