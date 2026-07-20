import type { Adjustment } from '@fitness/adaptation-planner';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { adjustmentTitle } from '@/lib/adjustmentLabels';
import { useAuth } from '@/lib/auth';
import { colors } from '@/theme/colors';
import { applyWeekReview, fetchWeekReview, type WeekReview } from '@/lib/weekReview';

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
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  if (!review) {
    return (
      <View style={styles.centered}>
        <Text style={styles.body}>Nog geen week klaar om te bekijken.</Text>
        <Pressable style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.closeButton}>Sluiten</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>Week {review.weekNumber} voltooid</Text>
        <Pressable onPress={() => router.push('/adjustment-history')}>
          <Text style={styles.historyLink}>Bekijk eerdere aanpassingen</Text>
        </Pressable>

        {review.adjustments.length === 0 ? (
          <Text style={styles.body}>Geen aanpassingen nodig deze week — alles binnen het schema. Ga zo door!</Text>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Vink aan wat je wilt toepassen voor komende week. Alles staat standaard aan.
            </Text>
            {review.adjustments.map((adjustment, index) => {
              const isSelected = selectedIndexes.has(index);
              return (
                <Pressable
                  key={index}
                  style={[styles.card, isSelected && styles.cardSelected]}
                  onPress={() => toggle(index)}
                >
                  <View style={styles.cardHeaderRow}>
                    <Text style={styles.cardTitle}>{titleFor(adjustment, review)}</Text>
                    <Text style={[styles.cardCheck, isSelected && styles.cardCheckSelected]}>
                      {isSelected ? '✓' : ''}
                    </Text>
                  </View>
                  {adjustment.previousValue !== undefined && adjustment.newValue !== undefined && (
                    <Text style={styles.cardValues}>
                      {adjustment.previousValue} → {adjustment.newValue}
                    </Text>
                  )}
                  <Text style={styles.cardReason}>{adjustment.explanation}</Text>
                </Pressable>
              );
            })}
          </>
        )}
      </ScrollView>

      <View style={styles.nav}>
        <Pressable style={styles.primaryButton} onPress={confirm} disabled={isSubmitting}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.background} />
          ) : (
            <Text style={styles.primaryButtonText}>Bevestigen</Text>
          )}
        </Pressable>
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
    gap: 16,
    padding: 24,
  },
  content: {
    padding: 24,
    paddingTop: 32,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  closeButton: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  title: {
    color: colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  historyLink: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  error: {
    color: colors.danger,
    fontSize: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
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
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    flexShrink: 1,
  },
  cardCheck: {
    color: 'transparent',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 12,
  },
  cardCheckSelected: {
    color: colors.accent,
  },
  cardValues: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 6,
  },
  cardReason: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  nav: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  secondaryButton: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: colors.accent,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.background,
    fontSize: 16,
    fontWeight: '700',
  },
});
