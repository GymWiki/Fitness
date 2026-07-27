import type { Goal } from '@fitness/progression-engine';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ModalHeader } from '@/components/ModalHeader';
import { useAuth } from '@/lib/auth';
import { useProfile } from '@/lib/profile';
import { fetchScheduledSessions, type ScheduledSessionRow } from '@/lib/schedule';
import { fetchSchedulePreview, type SchedulePreview, type SchedulePreviewExercise } from '@/lib/scheduleDayPreview';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const SHORT_WEEKDAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']; // Date.getDay(): 0 = Sunday.

function formatTitle(dateIso: string): string {
  const [year, month, day] = dateIso.split('-').map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return `${SHORT_WEEKDAY_LABELS[date.getDay()]} ${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`;
}

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

export default function ScheduleDayPreviewScreen() {
  const params = useLocalSearchParams<{ date: string }>();
  const date = typeof params.date === 'string' ? params.date : undefined;
  const router = useRouter();
  const { session } = useAuth();
  const { profile } = useProfile();
  const goal: Goal = profile?.goal ?? 'mixed';

  const [row, setRow] = useState<ScheduledSessionRow | null>(null);
  const [preview, setPreview] = useState<SchedulePreview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!session || !date) {
      setLoadError('Geen datum opgegeven.');
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const rows = await fetchScheduledSessions(session.user.id, date, date);
        const found = rows[0] ?? null;
        if (!found) {
          if (!cancelled) setLoadError('Geen geplande dag gevonden voor deze datum.');
          return;
        }
        if (!cancelled) setRow(found);

        const result = await fetchSchedulePreview(session.user.id, found, goal);
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
  }, [session, date, goal]);

  const title = date ? formatTitle(date) : 'Trainingsdag';

  return (
    <View style={styles.container}>
      <ModalHeader title={title} />

      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && loadError && <Text style={styles.error}>{loadError}</Text>}

        {!isLoading && !loadError && preview?.type === 'rest' && (
          <Card style={styles.restCard}>
            <Text style={typography.bodyStrong}>Rustdag</Text>
            <Text style={styles.exerciseTarget}>Rust is onderdeel van je plan — geniet ervan, morgen gaat het weer verder.</Text>
          </Card>
        )}

        {!isLoading && !loadError && preview?.type === 'training' && (
          <>
            <Text style={styles.programDayName}>{preview.programDayName}</Text>
            {preview.exercises.map((exercise, index) => (
              <ExercisePreviewRow key={`${exercise.exerciseName}-${index}`} exercise={exercise} />
            ))}
          </>
        )}
      </ScrollView>

      {!isLoading && !loadError && row?.programDayId && (
        <View style={styles.actionRow}>
          <Button onPress={() => router.push(`/workout/${row.programDayId}`)}>{row.status === 'done' ? 'Bekijk resultaat' : 'Start training'}</Button>
        </View>
      )}
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
    gap: spacing.sm,
  },
  loadingRow: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
  programDayName: {
    ...typography.heading,
    marginBottom: spacing.xs,
  },
  exerciseCard: {
    gap: spacing.xs,
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
    padding: spacing.xxl,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
