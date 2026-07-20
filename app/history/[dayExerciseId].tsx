import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line as SvgLine, Polyline } from 'react-native-svg';
import { fetchCardioHistory, fetchExerciseHistory, type CardioHistoryEntry, type HistorySession } from '@/lib/history';
import { colors } from '@/theme/colors';

const CARDIO_TYPE_LABELS: Record<CardioHistoryEntry['type'], string> = {
  zone2: 'Zone 2',
  interval: 'Interval',
};

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}-${month}`;
}

/** Heaviest set of a session — the number that matters for "did I get stronger", ignoring lighter back-off sets. */
function topSetWeight(session: HistorySession): number {
  return Math.max(...session.sets.map((set) => set.weightKg));
}

interface ChartPoint {
  date: string;
  value: number;
}

const CHART_HEIGHT = 160;
const CHART_PADDING_X = 8;
const CHART_PADDING_Y = 20;

/** Small, dependency-free line chart (react-native-svg only) for a single numeric series over time. */
function LineChart({ points, width, unit }: { points: ChartPoint[]; width: number; unit: string }) {
  const minValue = Math.min(...points.map((p) => p.value));
  const maxValue = Math.max(...points.map((p) => p.value));
  const valueRange = maxValue - minValue || 1;

  const scaledPoints = points.map((point, index) => {
    const x = points.length === 1 ? width / 2 : CHART_PADDING_X + (index / (points.length - 1)) * (width - CHART_PADDING_X * 2);
    const y = CHART_HEIGHT - CHART_PADDING_Y - ((point.value - minValue) / valueRange) * (CHART_HEIGHT - CHART_PADDING_Y * 2);
    return { x, y };
  });

  const polylinePoints = scaledPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartValueRow}>
        <Text style={styles.chartValueLabel}>
          {maxValue}
          {unit}
        </Text>
        <Text style={styles.chartValueLabel}>
          {minValue}
          {unit}
        </Text>
      </View>
      <Svg width={width} height={CHART_HEIGHT}>
        <SvgLine
          x1={CHART_PADDING_X}
          y1={CHART_HEIGHT - CHART_PADDING_Y}
          x2={width - CHART_PADDING_X}
          y2={CHART_HEIGHT - CHART_PADDING_Y}
          stroke={colors.border}
          strokeWidth={1}
        />
        {scaledPoints.length > 1 && <Polyline points={polylinePoints} fill="none" stroke={colors.accent} strokeWidth={2} />}
        {scaledPoints.map((point, index) => (
          <Circle key={index} cx={point.x} cy={point.y} r={4} fill={colors.accent} />
        ))}
      </Svg>
      <View style={styles.chartDateRow}>
        <Text style={styles.chartDateLabel}>{formatShortDate(points[0]!.date)}</Text>
        {points.length > 1 && <Text style={styles.chartDateLabel}>{formatShortDate(points[points.length - 1]!.date)}</Text>}
      </View>
    </View>
  );
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
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  chartValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartValueLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chartDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  chartDateLabel: {
    color: colors.textSecondary,
    fontSize: 12,
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
