import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { STAT_LABELS, STAT_MAX, type PhysiqueStats } from '@/lib/physiqueStats';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';

const STAT_KEYS: Array<keyof PhysiqueStats> = ['kracht', 'spiermassa', 'uithouding', 'snelheid', 'lenigheid'];

function StatBar({ label, value, accent, delay }: { label: string; value: number; accent: boolean; delay: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const percent = (value / STAT_MAX) * 100;

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 500, delay, useNativeDriver: false }).start();
    // Re-fills whenever this card becomes the selected one, as a small "locked in" cue.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accent]);

  const width = progress.interpolate({ inputRange: [0, 1], outputRange: ['0%', `${percent}%`] });

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width }, accent && styles.fillAccent]} />
      </View>
      <Text style={styles.value}>
        {value}/{STAT_MAX}
      </Text>
    </View>
  );
}

/** Character-select-style stat bars for a streeffysiek's training profile — presentation only. */
export function StatBars({ stats, selected }: { stats: PhysiqueStats; selected: boolean }) {
  return (
    <View style={styles.container}>
      {STAT_KEYS.map((key, index) => (
        <StatBar key={key} label={STAT_LABELS[key]} value={stats[key]} accent={selected} delay={index * 60} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.md,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 11,
    width: 68,
  },
  track: {
    flex: 1,
    height: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.textTertiary,
  },
  fillAccent: {
    backgroundColor: colors.accent,
  },
  value: {
    color: colors.textSecondary,
    fontSize: 11,
    width: 26,
    textAlign: 'right',
  },
});
