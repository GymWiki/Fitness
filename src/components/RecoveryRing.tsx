import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '@/theme/colors';

interface RecoveryRingProps {
  /** 0-100, from `recoveryReadinessPercent()`. */
  percent: number;
  /** From `recoveryColor()` — the ring never invents its own color logic. */
  color: string;
  size?: number;
  strokeWidth?: number;
}

/**
 * Apple Watch-activity-ring-style circular progress indicator. Pure,
 * presentational, reusable for any muscle group — takes its fill and color
 * as props rather than computing anything itself, so `MuscleRecoveryRing`
 * (and any future caller) stays the single place that maps a
 * `RecoveryEstimate` onto these two numbers.
 */
export function RecoveryRing({ percent, color, size = 64, strokeWidth = 8 }: RecoveryRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, percent));
  const dashOffset = circumference * (1 - clamped / 100);
  const center = size / 2;

  return (
    <View style={[styles.wrap, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Circle cx={center} cy={center} r={radius} stroke={colors.border} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          // Rotate so the ring fills starting from the top (12 o'clock), like Apple's activity rings, not from the default 3 o'clock.
          rotation={-90}
          origin={`${center}, ${center}`}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
