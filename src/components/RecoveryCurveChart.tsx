import type { RecoveryCurve, RecoveryCurvePoint, RecoveryEstimate } from '@fitness/progression-engine';
import { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';
import Svg, { Line as SvgLine, Polyline, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { recoveryColor } from '@/lib/recoveryColor';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

const CHART_HEIGHT = 160;
const PADDING_X = 12;
const PADDING_Y = 16;
const LEVEL_PADDING = 6;

function colorForPoint(point: RecoveryCurvePoint, curve: RecoveryCurve): string {
  return recoveryColor({
    status: point.status,
    hoursSinceSession: point.hoursFromSession,
    windowStartHours: curve.windowStartHours,
    windowEndHours: curve.windowEndHours,
    explanation: '',
  });
}

/** Groups consecutive same-status points into runs, each run starting with the previous run's last point so the polylines connect without a visible gap. */
function buildSegments(points: RecoveryCurvePoint[]): RecoveryCurvePoint[][] {
  const runs: RecoveryCurvePoint[][] = [];
  for (const point of points) {
    const lastRun = runs[runs.length - 1];
    if (lastRun && lastRun[lastRun.length - 1]!.status === point.status) {
      lastRun.push(point);
    } else {
      runs.push(lastRun ? [lastRun[lastRun.length - 1]!, point] : [point]);
    }
  }
  return runs;
}

/**
 * Illustrative supercompensation curve for one muscle group — dip, rise,
 * peak (shaded = the supercompensation window), gradual decay. Renders
 * `generateRecoveryCurve`'s output as-is; every number on this chart
 * (including the "now" dot) comes straight from that curve, never a
 * separate calculation, so it can't contradict the ring/tap-card for the
 * same muscle group.
 */
export function RecoveryCurveChart({ curve, estimate, width }: { curve: RecoveryCurve; estimate: RecoveryEstimate; width: number }) {
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fade.setValue(0.3);
    Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, [curve.muscleGroup, fade]);

  const maxHours = Math.max(curve.now.hoursFromSession, ...curve.points.map((point) => point.hoursFromSession));
  const levels = [...curve.points.map((point) => point.level), curve.now.level, curve.baseline];
  const minLevel = Math.min(...levels) - LEVEL_PADDING;
  const maxLevel = Math.max(...levels) + LEVEL_PADDING;
  const levelRange = maxLevel - minLevel || 1;

  const hoursToX = (hours: number) => PADDING_X + (maxHours === 0 ? 0 : (hours / maxHours) * (width - PADDING_X * 2));
  const levelToY = (level: number) => CHART_HEIGHT - PADDING_Y - ((level - minLevel) / levelRange) * (CHART_HEIGHT - PADDING_Y * 2);

  const segments = buildSegments(curve.points);
  const nowX = hoursToX(curve.now.hoursFromSession);
  const nowY = levelToY(curve.now.level);
  const nowColor = recoveryColor(estimate);
  const labelBelow = nowY < CHART_HEIGHT / 2;
  const EDGE_ZONE = 40;
  const nowLabelAnchor = nowX < EDGE_ZONE ? 'start' : nowX > width - EDGE_ZONE ? 'end' : 'middle';
  const nowLabelX = nowLabelAnchor === 'start' ? PADDING_X : nowLabelAnchor === 'end' ? width - PADDING_X : nowX;
  // Keep the baseline label on whichever edge the "now" label isn't using, so they can never collide.
  const baselineLabelAnchor = nowLabelAnchor === 'end' ? 'start' : 'end';
  const baselineLabelX = baselineLabelAnchor === 'start' ? PADDING_X : width - PADDING_X;

  return (
    <Animated.View style={[styles.card, { opacity: fade }]}>
      <Svg width={width} height={CHART_HEIGHT}>
        <Rect
          x={hoursToX(curve.windowStartHours)}
          y={0}
          width={Math.max(0, hoursToX(curve.windowEndHours) - hoursToX(curve.windowStartHours))}
          height={CHART_HEIGHT}
          fill={colors.accentMuted}
        />
        <SvgLine
          x1={PADDING_X}
          y1={levelToY(curve.baseline)}
          x2={width - PADDING_X}
          y2={levelToY(curve.baseline)}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="4,4"
        />
        <SvgText x={baselineLabelX} y={levelToY(curve.baseline) - 4} fontSize={10} fill={colors.textTertiary} textAnchor={baselineLabelAnchor}>
          basislijn
        </SvgText>
        {segments.map((segment, index) => (
          <Polyline
            key={index}
            points={segment.map((point) => `${hoursToX(point.hoursFromSession)},${levelToY(point.level)}`).join(' ')}
            fill="none"
            stroke={colorForPoint(segment[segment.length - 1]!, curve)}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <Circle cx={nowX} cy={nowY} r={5} fill={nowColor} stroke={colors.background} strokeWidth={2} />
        <SvgText x={nowLabelX} y={labelBelow ? nowY + 18 : nowY - 12} fontSize={11} fontWeight="700" fill={nowColor} textAnchor={nowLabelAnchor}>
          Jij zit hier
        </SvgText>
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.sm,
  },
});
