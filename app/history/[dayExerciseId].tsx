import { useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { LineChart } from '@/components/LineChart';
import { ModalHeader } from '@/components/ModalHeader';
import { useAuth } from '@/lib/auth';
import { formatShortDate } from '@/lib/dates';
import { fetchCardioHistory, fetchExerciseHistory, type CardioHistoryEntry, type HistorySession } from '@/lib/history';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const CARDIO_TYPE_LABELS: Record<CardioHistoryEntry['type'], string> = {
  zone2: 'Zone 2',
  interval: 'Interval',
};

/** Heaviest set of a session — the number that matters for "did I get stronger", ignoring lighter back-off sets. */
function topSetWeight(session: HistorySession): number {
  return Math.max(...session.sets.map((set) => set.weightKg));
}

function StrengthHistory({ history, chartWidth }: { history: HistorySession[]; chartWidth: number }) {
  const weightPoints = useMemo(
    () => history.map((session) => ({ date: session.performedAt, value: topSetWeight(session) })),
    [history],
  );
  const sessionsNewestFirst = [...history].reverse();

  return (
    <>
      <LineChart points={weightPoints} width={chartWidth} unit=" kg" />

      <View style={styles.sessionList}>
        {sessionsNewestFirst.map((session) => (
          <Card key={session.workoutId} style={styles.sessionCard}>
            <Text style={[typography.bodyStrong, styles.sessionDate]}>{formatShortDate(session.performedAt)}</Text>
            {session.sets.map((set) => (
              <Text key={set.setOrder} style={[typography.bodySecondary, styles.sessionSetLine]}>
                Set {set.setOrder}: {set.weightKg} kg × {set.reps} reps (RIR {set.rir})
              </Text>
            ))}
          </Card>
        ))}
      </View>
    </>
  );
}

function CardioHistory({ history, chartWidth }: { history: CardioHistoryEntry[]; chartWidth: number }) {
  const durationPoints = useMemo(() => history.map((entry) => ({ date: entry.date, value: entry.durationMinutes })), [history]);
  const heartRatePoints = useMemo(
    () =>
      history
        .filter((entry) => entry.avgHeartRate !== undefined)
        .map((entry) => ({ date: entry.date, value: entry.avgHeartRate! })),
    [history],
  );
  const entriesNewestFirst = [...history].reverse();

  return (
    <>
      <LineChart points={durationPoints} width={chartWidth} unit=" min" />

      {heartRatePoints.length > 1 && (
        <>
          <Text style={typography.label}>Gemiddelde hartslag per sessie</Text>
          <LineChart points={heartRatePoints} width={chartWidth} unit=" bpm" />
        </>
      )}

      <View style={styles.sessionList}>
        {entriesNewestFirst.map((entry) => (
          <Card key={entry.id} style={styles.sessionCard}>
            <Text style={[typography.bodyStrong, styles.sessionDate]}>
              {formatShortDate(entry.date)} · {CARDIO_TYPE_LABELS[entry.type]}
            </Text>
            <Text style={[typography.bodySecondary, styles.sessionSetLine]}>
              {entry.durationMinutes} min · RPE {entry.rpe}
              {entry.rounds !== undefined ? ` · ${entry.rounds} rondes` : ''}
              {entry.avgHeartRate !== undefined ? ` · ${entry.avgHeartRate} bpm` : ''}
              {entry.distanceKm !== undefined ? ` · ${entry.distanceKm} km` : ''}
            </Text>
          </Card>
        ))}
      </View>
    </>
  );
}

export default function ExerciseHistoryScreen() {
  const params = useLocalSearchParams<{ dayExerciseId: string; exerciseName?: string; kind?: string }>();
  const { session } = useAuth();
  const dayExerciseId = typeof params.dayExerciseId === 'string' ? params.dayExerciseId : undefined;
  const exerciseName = typeof params.exerciseName === 'string' ? params.exerciseName : undefined;
  const isCardio = params.kind === 'cardio_duration' || params.kind === 'cardio_interval';
  const { width: windowWidth } = useWindowDimensions();

  const [strengthHistory, setStrengthHistory] = useState<HistorySession[]>([]);
  const [cardioHistory, setCardioHistory] = useState<CardioHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isCardio) {
      if (!dayExerciseId) {
        setError('Geen oefening opgegeven.');
        setIsLoading(false);
        return;
      }
      fetchCardioHistory(dayExerciseId)
        .then(setCardioHistory)
        .catch((err) => setError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
        .finally(() => setIsLoading(false));
      return;
    }
    if (!session || !exerciseName) {
      setError('Geen oefening opgegeven.');
      setIsLoading(false);
      return;
    }
    fetchExerciseHistory(session.user.id, exerciseName)
      .then(setStrengthHistory)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
      .finally(() => setIsLoading(false));
  }, [dayExerciseId, exerciseName, isCardio, session]);

  const chartWidth = Math.min(windowWidth - 80, 480);
  const hasHistory = isCardio ? cardioHistory.length > 0 : strengthHistory.length > 0;

  return (
    <View style={styles.container}>
      <ModalHeader title={exerciseName ?? 'Oefening'} subtitle="Historie" />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && !hasHistory && (
          <EmptyState title="Nog geen sessies" body="Log een set of sessie voor deze oefening om hier je voortgang te zien." />
        )}

        {!isLoading &&
          !error &&
          hasHistory &&
          (isCardio ? (
            <CardioHistory history={cardioHistory} chartWidth={chartWidth} />
          ) : (
            <StrengthHistory history={strengthHistory} chartWidth={chartWidth} />
          ))}
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
  sessionList: {
    gap: spacing.md,
  },
  sessionCard: {
    gap: spacing.xs,
  },
  sessionDate: {
    marginBottom: 0,
  },
  sessionSetLine: {
    fontSize: 14,
    lineHeight: 20,
  },
});
