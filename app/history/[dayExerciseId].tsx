import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { LineChart } from '@/components/LineChart';
import { formatShortDate } from '@/lib/dates';
import { fetchCardioHistory, fetchExerciseHistory, type CardioHistoryEntry, type HistorySession } from '@/lib/history';
import { colors } from '@/theme/colors';

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
          <View key={session.workoutId} style={styles.sessionCard}>
            <Text style={styles.sessionDate}>{formatShortDate(session.performedAt)}</Text>
            {session.sets.map((set) => (
              <Text key={set.setOrder} style={styles.sessionSetLine}>
                Set {set.setOrder}: {set.weightKg} kg × {set.reps} reps (RIR {set.rir})
              </Text>
            ))}
          </View>
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
          <Text style={styles.chartSectionLabel}>Gemiddelde hartslag per sessie</Text>
          <LineChart points={heartRatePoints} width={chartWidth} unit=" bpm" />
        </>
      )}

      <View style={styles.sessionList}>
        {entriesNewestFirst.map((entry) => (
          <View key={entry.id} style={styles.sessionCard}>
            <Text style={styles.sessionDate}>
              {formatShortDate(entry.date)} · {CARDIO_TYPE_LABELS[entry.type]}
            </Text>
            <Text style={styles.sessionSetLine}>
              {entry.durationMinutes} min · RPE {entry.rpe}
              {entry.rounds !== undefined ? ` · ${entry.rounds} rondes` : ''}
              {entry.avgHeartRate !== undefined ? ` · ${entry.avgHeartRate} bpm` : ''}
              {entry.distanceKm !== undefined ? ` · ${entry.distanceKm} km` : ''}
            </Text>
          </View>
        ))}
      </View>
    </>
  );
}

export default function ExerciseHistoryScreen() {
  const params = useLocalSearchParams<{ dayExerciseId: string; exerciseName?: string; kind?: string }>();
  const dayExerciseId = typeof params.dayExerciseId === 'string' ? params.dayExerciseId : undefined;
  const exerciseName = typeof params.exerciseName === 'string' ? params.exerciseName : 'Oefening';
  const isCardio = params.kind === 'cardio_duration' || params.kind === 'cardio_interval';
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [strengthHistory, setStrengthHistory] = useState<HistorySession[]>([]);
  const [cardioHistory, setCardioHistory] = useState<CardioHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dayExerciseId) {
      setError('Geen oefening opgegeven.');
      setIsLoading(false);
      return;
    }
    const fetchHistory = isCardio ? fetchCardioHistory(dayExerciseId).then(setCardioHistory) : fetchExerciseHistory(dayExerciseId).then(setStrengthHistory);
    fetchHistory
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
      .finally(() => setIsLoading(false));
  }, [dayExerciseId, isCardio]);

  const chartWidth = Math.min(windowWidth - 80, 480);
  const hasHistory = isCardio ? cardioHistory.length > 0 : strengthHistory.length > 0;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.closeButton}>Sluiten</Text>
          </Pressable>
        </View>

        <Text style={styles.title}>{exerciseName}</Text>
        <Text style={styles.subtitle}>Historie</Text>

        {isLoading && (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        )}

        {!isLoading && error && <Text style={styles.error}>{error}</Text>}

        {!isLoading && !error && !hasHistory && <Text style={styles.body}>Nog geen sessies gelogd voor deze oefening.</Text>}

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
    padding: 24,
    paddingTop: 32,
    gap: 8,
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
    marginBottom: 16,
  },
  loadingRow: {
    marginTop: 24,
    alignItems: 'center',
  },
  error: {
    color: colors.danger,
    fontSize: 15,
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 21,
  },
  chartSectionLabel: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  sessionList: {
    gap: 12,
  },
  sessionCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
  },
  sessionDate: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  sessionSetLine: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 20,
  },
});
