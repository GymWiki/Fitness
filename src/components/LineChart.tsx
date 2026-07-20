import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line as SvgLine, Polyline } from 'react-native-svg';
import { formatShortDate } from '@/lib/dates';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

export interface ChartPoint {
  date: string;
  value: number;
}

const CHART_HEIGHT = 160;
const CHART_PADDING_X = 8;
const CHART_PADDING_Y = 20;

/** Small, dependency-free line chart (react-native-svg only) for a single numeric series over time. */
export function LineChart({ points, width, unit }: { points: ChartPoint[]; width: number; unit: string }) {
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

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  chartValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  chartValueLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  chartDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  chartDateLabel: {
    color: colors.textSecondary,
    fontSize: 12,
  },
});
