import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Line as SvgLine, Polyline } from 'react-native-svg';
import { fetchExerciseHistory, type HistorySession } from '@/lib/history';
import { colors } from '@/theme/colors';

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

const CHART_HEIGHT = 160;
const CHART_PADDING_X = 8;
const CHART_PADDING_Y = 20;

function WeightChart({ sessions, width }: { sessions: HistorySession[]; width: number }) {
  const points = useMemo(() => sessions.map((session) => ({ date: session.performedAt, weightKg: topSetWeight(session) })), [sessions]);

  const minWeight = Math.min(...points.map((p) => p.weightKg));
  const maxWeight = Math.max(...points.map((p) => p.weightKg));
  const weightRange = maxWeight - minWeight || 1;

  const scaledPoints = points.map((point, index) => {
    const x =
      points.length === 1
        ? width / 2
        : CHART_PADDING_X + (index / (points.length - 1)) * (width - CHART_PADDING_X * 2);
    const y =
      CHART_HEIGHT -
      CHART_PADDING_Y -
      ((point.weightKg - minWeight) / weightRange) * (CHART_HEIGHT - CHART_PADDING_Y * 2);
    return { x, y };
  });

  const polylinePoints = scaledPoints.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <View style={styles.chartCard}>
      <View style={styles.chartWeightRow}>
        <Text style={styles.chartWeightLabel}>{maxWeight} kg</Text>
        <Text style={styles.chartWeightLabel}>{minWeight} kg</Text>
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

export default function ExerciseHistoryScreen() {
  const params = useLocalSearchParams<{ dayExerciseId: string; exerciseName?: string }>();
  const dayExerciseId = typeof params.dayExerciseId === 'string' ? params.dayExerciseId : undefined;
  const exerciseName = typeof params.exerciseName === 'string' ? params.exerciseName : 'Oefening';
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();

  const [history, setHistory] = useState<HistorySession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!dayExerciseId) {
      setError('Geen oefening opgegeven.');
      setIsLoading(false);
      return;
    }
    fetchExerciseHistory(dayExerciseId)
      .then(setHistory)
      .catch((err) => setError(err instanceof Error ? err.message : 'Kon historie niet laden.'))
      .finally(() => setIsLoading(false));
  }, [dayExerciseId]);

  const chartWidth = Math.min(windowWidth - 80, 480);
  const sessionsNewestFirst = [...history].reverse();

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

        {!isLoading && !error && history.length === 0 && (
          <Text style={styles.body}>Nog geen sessies gelogd voor deze oefening.</Text>
        )}

        {!isLoading && !error && history.length > 0 && (
          <>
            <WeightChart sessions={history} width={chartWidth} />

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
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  chartWeightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  chartWeightLabel: {
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
