import type { Adjustment } from '@fitness/adaptation-planner';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { ModalHeader } from '@/components/ModalHeader';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/colors';
import { applyWeekReview, fetchWeekReview, type WeekReview } from '@/lib/weekReview';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

function titleFor(adjustment: Adjustment, review: WeekReview): string {
  const exerciseName = adjustment.dayExerciseId ? review.exerciseNamesById.get(adjustment.dayExerciseId) : undefined;
  return adjustmentTitle(adjustment.type, exerciseName);
}

export default function WeekReviewScreen() {
  const router = useRouter();
  const { session } = useAuth();

  const [review, setReview] = useState<WeekReview | null>(null);
  const [selectedIndexes, setSelectedIndexes] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetchWeekReview(session.user.id)
      .then((result) => {
        setReview(result);
        if (result) setSelectedIndexes(new Set(result.adjustments.map((_, index) => index)));
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon week-overzicht niet laden.'))
      .finally(() => setIsLoading(false));
  }, [session]);

  function toggle(index: number) {
    setSelectedIndexes((previous) => {
      const next = new Set(previous);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  async function confirm() {
    if (!review) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const chosenAdjustments = review.adjustments.filter((_, index) => selectedIndexes.has(index));
      await applyWeekReview(review, chosenAdjustments);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kon aanpassingen niet opslaan.');
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>{error}</Text>
        <Button variant="secondary" onPress={() => router.back()}>
          Terug
        </Button>
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.centered}>
        <EmptyState title="Nog geen week klaar" body="Er staat momenteel geen week-overzicht klaar om te bekijken." />
        <Button variant="secondary" onPress={() => router.back()}>
          Terug
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ModalHeader
        title={`Week ${review.weekNumber} voltooid`}
        right={
          <Pressable onPress={() => router.push('/adjustment-history')} hitSlop={8} style={styles.historyLinkWrap}>
            <Text style={styles.historyLink}>Bekijk eerdere aanpassingen</Text>
          </Pressable>
        }
      />
      <ScrollView contentContainerStyle={styles.content}>
        {review.adjustments.length === 0 ? (
          <EmptyState title="Geen aanpassingen nodig" body="Alles binnen het schema deze week — ga zo door!" />
        ) : (
          <>
            <Text style={[typography.bodySecondary, styles.subtitle]}>
              Vink aan wat je wilt toepassen voor komende week. Alles staat standaard aan.
            </Text>
            {review.adjustments.map((adjustment, index) => {
              const isSelected = selectedIndexes.has(index);
              return (
                <Card key={index} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => toggle(index)}>
                  <View style={styles.cardHeaderRow}>
                    <Text style={[typography.heading, styles.cardTitle]}>{titleFor(adjustment, review)}</Text>
                    <Text style={[styles.cardCheck, isSelected && styles.cardCheckSelected]}>{isSelected ? '✓' : ''}</Text>
                  </View>
                  {adjustment.previousValue !== undefined && adjustment.newValue !== undefined && (
                    <Text style={styles.cardValues}>
                      {adjustment.previousValue} → {adjustment.newValue}
                    </Text>
                  )}
                  <Text style={[typography.bodySecondary, styles.cardReason]}>{adjustment.explanation}</Text>
                </Card>
              );
            })}
          </>
        )}
      </ScrollView>

      <View style={styles.nav}>
        <Button onPress={confirm} loading={isSubmitting}>
          Bevestigen
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.xxl,
  },
  content: {
    padding: spacing.xxl,
    gap: spacing.md,
  },
  historyLinkWrap: {
    alignSelf: 'flex-start',
  },
  historyLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    gap: spacing.xs,
  },
  cardSelected: {
    borderColor: colors.accent,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: {
    flexShrink: 1,
  },
  cardCheck: {
    color: 'transparent',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: spacing.md,
  },
  cardCheckSelected: {
    color: colors.accent,
  },
  cardValues: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  cardReason: {
    fontSize: 14,
    lineHeight: 20,
  },
  nav: {
    padding: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
