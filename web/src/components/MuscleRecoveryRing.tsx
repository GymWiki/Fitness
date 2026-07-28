import type { RecoveryEstimate } from '@fitness/progression-engine';
import { recoveryColor } from '@/lib/recoveryColor';
import { recoveryReadinessPercent, recoveryRingLabel } from '@/lib/recoveryReadiness';
import { RecoveryRing } from './RecoveryRing';

interface MuscleRecoveryRingProps {
  muscleGroup: string;
  estimate: RecoveryEstimate;
  /** Omit when this tile sits inside another element that already handles the click (e.g. the compact dashboard card, whose whole `Card` navigates onward). */
  onClick?: () => void;
  size?: number;
}

/**
 * One tile in the readiness grid: ring + muscle group name + status label.
 * Color is never the only signal — the status label is always shown as
 * text alongside the ring, same accessibility rule as the earlier
 * body-diagram illustration it replaces.
 */
const COMPACT_THRESHOLD = 48;

export function MuscleRecoveryRing({ muscleGroup, estimate, onClick, size = 64 }: MuscleRecoveryRingProps) {
  const color = recoveryColor(estimate);
  const percent = recoveryReadinessPercent(estimate);
  const label = recoveryRingLabel(estimate);
  const isCompact = size <= COMPACT_THRESHOLD;
  const widthStyle = isCompact ? { width: Math.max(size, 52) } : { width: '100%' as const };

  const content = (
    <>
      <RecoveryRing percent={percent} color={color} size={size} />
      <p className={`truncate text-center font-semibold text-text-primary ${isCompact ? 'text-[10px]' : 'text-xs'}`}>{muscleGroup}</p>
      <p className={`truncate text-center font-semibold ${isCompact ? 'text-[9px]' : 'text-[11px]'}`} style={{ color }}>
        {label}
      </p>
    </>
  );

  if (!onClick) {
    return (
      <div className="flex flex-col items-center gap-1" style={widthStyle} aria-label={`${muscleGroup}: ${label}`}>
        {content}
      </div>
    );
  }

  return (
    <button type="button" className="flex flex-col items-center gap-1" style={widthStyle} onClick={onClick} aria-label={`${muscleGroup}: ${label}`}>
      {content}
    </button>
  );
}
