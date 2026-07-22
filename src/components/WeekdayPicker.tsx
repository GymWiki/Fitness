import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { typography } from '@/theme/typography';

const WEEKDAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Ma' },
  { value: 2, label: 'Di' },
  { value: 3, label: 'Wo' },
  { value: 4, label: 'Do' },
  { value: 5, label: 'Vr' },
  { value: 6, label: 'Za' },
  { value: 7, label: 'Zo' },
];

interface WeekdayPickerProps {
  selected: number[];
  /** How many days need to be picked — normally the profile's daysPerWeek. */
  requiredCount: number;
  onChange: (next: number[]) => void;
}

/** Fixed weekday picker (ma-zo) used to set the calendar schedule's training days — shared by onboarding and Profiel so the two never drift in behavior. */
export function WeekdayPicker({ selected, requiredCount, onChange }: WeekdayPickerProps) {
  function toggle(value: number) {
    if (selected.includes(value)) {
      onChange(selected.filter((day) => day !== value));
    } else if (selected.length < requiredCount) {
      onChange([...selected, value].sort((a, b) => a - b));
    }
  }

  return (
    <View>
      <View style={styles.row}>
        {WEEKDAY_OPTIONS.map((option) => {
          const isSelected = selected.includes(option.value);
          return (
            <Pressable
              key={option.value}
              hitSlop={6}
              style={[styles.chip, isSelected && styles.chipSelected]}
              onPress={() => toggle(option.value)}
            >
              <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.counter}>
        {selected.length} van {requiredCount} dagen gekozen
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.accentMuted,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  chipTextSelected: {
    color: colors.accent,
  },
  counter: {
    ...typography.caption,
    marginTop: spacing.sm,
  },
});
