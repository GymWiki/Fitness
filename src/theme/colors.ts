/** Dark-first palette; this is a gym-use app so dark is the default, not an afterthought. */
export const colors = {
  background: '#0B0F14',
  surface: '#151B23',
  surfaceElevated: '#1B222C',
  border: '#232B36',
  borderStrong: '#2E3947',
  textPrimary: '#F5F7FA',
  textSecondary: '#9AA5B1',
  textTertiary: '#6B7684',
  accent: '#4ADE80',
  accentMuted: 'rgba(74, 222, 128, 0.14)',
  warning: '#FBBF24',
  warningMuted: 'rgba(251, 191, 36, 0.14)',
  danger: '#F87171',
  dangerMuted: 'rgba(248, 113, 113, 0.14)',
  /** Neutral brand blue reserved for nutrient-progress bars — deliberately not accent/warning/danger, which already carry the body diagram's recovery-status meaning (ready/window closing/recovering) and would be confusing reused for an unrelated "how much have I eaten" meter. */
  progress: '#60A5FA',
  progressMuted: 'rgba(96, 165, 250, 0.14)',
} as const;
