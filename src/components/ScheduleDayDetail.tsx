import type { Goal } from '@fitness/progression-engine';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '@/lib/useReducedMotion';
import type { ScheduledSessionRow } from '@/lib/schedule';
import { fetchSchedulePreview, type SchedulePreview, type SchedulePreviewExercise } from '@/lib/scheduleDayPreview';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';
import { Button } from './Button';
import { Card } from './Card';

function ExercisePreviewRow({ exercise }: { exercise: SchedulePreviewExercise }) {
  if (exercise.kind === 'strength') {
    return (
      <Card style={styles.exerciseCard}>
        <Text style={typography.bodyStrong}>{exercise.exerciseName}</Text>
        <Text style={styles.exerciseTarget}>
          {exercise.sets}× {exercise.repRangeMin}-{exercise.repRangeMax} reps · RIR {exercise.targetRIR}
        </Text>
        {exercise.adviceWeightKg !== null ? (
          <Text style={styles.adviceLine}>
            Advies: {exercise.adviceWeightKg} kg — {exercise.adviceExplanation}
          </Text>
        ) : (
          <Text style={styles.adviceLineMuted}>Nog geen historie voor deze oefening.</Text>
        )}
      </Card>
    );
  }

  return (
    <Card style={styles.exerciseCard}>
      <Text style={typography.bodyStrong}>{exercise.exerciseName}</Text>
      <Text style={styles.exerciseTarget}>
        {exercise.sessionType === 'zone2' ? 'Zone 2' : 'Interval'} · circa {exercise.durationMinutes} min
      </Text>
      <Text style={styles.adviceLine}>{exercise.explanation}</Text>
    </Card>
  );
}

/**
 * Inline info section for the day selected in `WeekCardRow`, rendered
 * directly below it on the Schema page — replaces the old
 * `/schedule-day/[date]` modal so switching days never leaves the page.
 * Re-fetches whenever the selection changes; a short fade (skipped under
 * reduced motion) softens that swap instead of the content just popping in.
 */
export function ScheduleDayDetail({
  userId,
  dateIso,
  row,
  goal,
}: {
  userId: string;
  dateIso: string;
  row: ScheduledSessionRow | null;
  goal: Goal;
}) {
  const router = useRouter();
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setLoadError(null);
    (async () => {
      try {
        if (!row) {
          if (!cancelled) setPreview({ type: 'rest' });
          return;
        }
        const result = await fetchSchedulePreview(userId, row, goal);
        if (cancelled) return;
        if (!result) {
          setLoadError('Kon deze dag niet laden.');
          return;
        }
        setPreview(result);
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Kon deze dag niet laden.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- row's identity churns on every parent refetch; only its content matters here.
  }, [userId, dateIso, row?.id, row?.programDayId, row?.status, goal]);

  useEffect(() => {
    if (isLoading) return;
    if (reducedMotion) {
      fade.setValue(1);
      return;
    }
    fade.setValue(0.3);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [dateIso, isLoading, reducedMotion, fade]);

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.accent} size="small" />
        </View>
      )}

      {!isLoading && loadError && <Text style={styles.error}>{loadError}</Text>}

      {!isLoading && !loadError && preview && (
        <Animated.View style={{ opacity: fade }}>
          {preview.type === 'rest' && (
            <Card style={styles.restCard}>
              <Text style={typography.bodyStrong}>Rustdag</Text>
              <Text style={styles.exerciseTarget}>Rust is onderdeel van je plan — geniet ervan, morgen gaat het weer verder.</Text>
            </Card>
          )}

          {preview.type === 'training' && (
            <>
              <Text style={styles.programDayName}>{preview.programDayName}</Text>
              {preview.exercises.map((exercise, index) => (
                <ExercisePreviewRow key={`${exercise.exerciseName}-${index}`} exercise={exercise} />
              ))}
            </>
          )}

          {row?.programDayId && (
            <View style={styles.actionRow}>
              <Button onPress={() => router.push(`/workout/${row.programDayId}`)}>
                {row.status === 'done' ? 'Bekijk resultaat' : 'Start training'}
              </Button>
            </View>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  loadingRow: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 14,
  },
  programDayName: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  exerciseCard: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  exerciseTarget: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  adviceLine: {
    color: colors.textPrimary,
    fontSize: 13,
    lineHeight: 19,
  },
  adviceLineMuted: {
    color: colors.textTertiary,
    fontSize: 13,
  },
  restCard: {
    gap: spacing.xs,
  },
  actionRow: {
    marginTop: spacing.sm,
  },
});
