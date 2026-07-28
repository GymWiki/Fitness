'use client';

import type { RecoveryCurve, RecoveryCurvePoint, RecoveryEstimate } from '@fitness/progression-engine';
import { useEffect, useState } from 'react';
import { recoveryColor } from '@/lib/recoveryColor';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { colors } from '@/theme/colors';

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

/** Builds a closed polygon tracing the curve across `points`, closed along the baseline — i.e. the filled area between the line and baseline for that stretch. */
function areaPoints(points: RecoveryCurvePoint[], baselineY: number, hoursToX: (h: number) => number, levelToY: (l: number) => number): string {
  if (points.length === 0) return '';
  const curvePart = points.map((point) => `${hoursToX(point.hoursFromSession)},${levelToY(point.level)}`);
  const last = points[points.length - 1]!;
  const first = points[0]!;
  return [...curvePart, `${hoursToX(last.hoursFromSession)},${baselineY}`, `${hoursToX(first.hoursFromSession)},${baselineY}`].join(' ');
}

/**
 * Illustrative supercompensation curve for one muscle group — one smooth
 * line through four phases (dip below baseline, back up, peak above
 * baseline, decay back down), with the area under/over baseline filled to
 * make the "loss" (dip) and "gain" (supercompensation window) regions
 * visually distinct. Renders `generateRecoveryCurve`'s output as-is; every
 * number on this chart (including the "now" dot) comes straight from that
 * curve, never a separate calculation, so it can't contradict the
 * ring/tap-card for the same muscle group.
 */
export function RecoveryCurveChart({ curve, estimate, width }: { curve: RecoveryCurve; estimate: RecoveryEstimate; width: number }) {
  const reducedMotion = useReducedMotion();
  const [isFaded, setIsFaded] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    // Triggers the fade-back-in transition on muscle-group change — intentional, not a render-time sync.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsFaded(true);
    const timer = setTimeout(() => setIsFaded(false), 20);
    return () => clearTimeout(timer);
  }, [curve.muscleGroup, reducedMotion]);

  const maxHours = Math.max(curve.now.hoursFromSession, ...curve.points.map((point) => point.hoursFromSession));
  const levels = [...curve.points.map((point) => point.level), curve.now.level, curve.baseline];
  const minLevel = Math.min(...levels) - LEVEL_PADDING;
  const maxLevel = Math.max(...levels) + LEVEL_PADDING;
  const levelRange = maxLevel - minLevel || 1;

  const hoursToX = (hours: number) => PADDING_X + (maxHours === 0 ? 0 : (hours / maxHours) * (width - PADDING_X * 2));
  const levelToY = (level: number) => CHART_HEIGHT - PADDING_Y - ((level - minLevel) / levelRange) * (CHART_HEIGHT - PADDING_Y * 2);
  const baselineY = levelToY(curve.baseline);

  const dipPoints = curve.points.filter((point) => point.hoursFromSession <= curve.windowStartHours);
  const gainSolidPoints = curve.points.filter((point) => point.hoursFromSession >= curve.windowStartHours && point.hoursFromSession <= curve.peakHours);
  const gainFadePoints = curve.points.filter((point) => point.hoursFromSession >= curve.peakHours && point.hoursFromSession <= curve.decayEndHours);

  const segments = buildSegments(curve.points);
  const nowX = hoursToX(curve.now.hoursFromSession);
  const nowY = levelToY(curve.now.level);
  const nowColor = recoveryColor(estimate);
  const labelBelow = nowY < CHART_HEIGHT / 2;
  const EDGE_ZONE = 40;
  const nowLabelAnchor = nowX < EDGE_ZONE ? 'start' : nowX > width - EDGE_ZONE ? 'end' : 'middle';
  const nowLabelX = nowLabelAnchor === 'start' ? PADDING_X : nowLabelAnchor === 'end' ? width - PADDING_X : nowX;
  const baselineLabelAnchor = nowLabelAnchor === 'end' ? 'start' : 'end';
  const baselineLabelX = baselineLabelAnchor === 'start' ? PADDING_X : width - PADDING_X;

  return (
    <div
      className={`rounded-xl border border-border bg-surface p-2 transition-opacity duration-200 ${isFaded ? 'opacity-30' : 'opacity-100'}`}
    >
      <svg width={width} height={CHART_HEIGHT}>
        <defs>
          <linearGradient id="gainFade" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={colors.accent} stopOpacity={0.22} />
            <stop offset="100%" stopColor={colors.accent} stopOpacity={0} />
          </linearGradient>
        </defs>
        {dipPoints.length > 1 && <polygon points={areaPoints(dipPoints, baselineY, hoursToX, levelToY)} fill={colors.warningMuted} />}
        {gainSolidPoints.length > 1 && <polygon points={areaPoints(gainSolidPoints, baselineY, hoursToX, levelToY)} fill={colors.accentMuted} />}
        {gainFadePoints.length > 1 && <polygon points={areaPoints(gainFadePoints, baselineY, hoursToX, levelToY)} fill="url(#gainFade)" />}
        <line x1={PADDING_X} y1={baselineY} x2={width - PADDING_X} y2={baselineY} stroke={colors.border} strokeWidth={1} strokeDasharray="4,4" />
        <text x={baselineLabelX} y={baselineY - 4} fontSize={10} fill={colors.textTertiary} textAnchor={baselineLabelAnchor}>
          basislijn
        </text>
        {segments.map((segment, index) => (
          <polyline
            key={index}
            points={segment.map((point) => `${hoursToX(point.hoursFromSession)},${levelToY(point.level)}`).join(' ')}
            fill="none"
            stroke={colorForPoint(segment[segment.length - 1]!, curve)}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
        <circle cx={nowX} cy={nowY} r={5} fill={nowColor} stroke={colors.background} strokeWidth={2} />
        <text x={nowLabelX} y={labelBelow ? nowY + 18 : nowY - 12} fontSize={11} fontWeight={700} fill={nowColor} textAnchor={nowLabelAnchor}>
          Jij zit hier
        </text>
      </svg>
    </div>
  );
}
