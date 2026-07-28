import { formatShortDate } from '@/lib/dates';
import { colors } from '@/theme/colors';

export interface ChartPoint {
  date: string;
  value: number;
}

const CHART_HEIGHT = 160;
const CHART_PADDING_X = 8;
const CHART_PADDING_Y = 20;

/** Small, dependency-free line chart for a single numeric series over time. */
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
    <div className="mb-5 rounded-xl border border-border bg-surface p-4">
      <div className="mb-1 flex justify-between">
        <span className="text-xs text-text-secondary">
          {maxValue}
          {unit}
        </span>
        <span className="text-xs text-text-secondary">
          {minValue}
          {unit}
        </span>
      </div>
      <svg width={width} height={CHART_HEIGHT}>
        <line
          x1={CHART_PADDING_X}
          y1={CHART_HEIGHT - CHART_PADDING_Y}
          x2={width - CHART_PADDING_X}
          y2={CHART_HEIGHT - CHART_PADDING_Y}
          stroke={colors.border}
          strokeWidth={1}
        />
        {scaledPoints.length > 1 && <polyline points={polylinePoints} fill="none" stroke={colors.accent} strokeWidth={2} />}
        {scaledPoints.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r={4} fill={colors.accent} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between">
        <span className="text-xs text-text-secondary">{formatShortDate(points[0]!.date)}</span>
        {points.length > 1 && <span className="text-xs text-text-secondary">{formatShortDate(points[points.length - 1]!.date)}</span>}
      </div>
    </div>
  );
}
