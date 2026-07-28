import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { ScheduleCardDay } from '@/lib/scheduleCards';
import { colors } from '@/theme/colors';
import { radii } from '@/theme/radii';
import { spacing } from '@/theme/spacing';
import { DumbbellIcon, HeartIcon, MoonIcon } from './icons';

const SHORT_WEEKDAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']; // Date.getDay(): 0 = Sunday.

export const SCHEDULE_DAY_CARD_WIDTH = 76;
const SCHEDULE_DAY_CARD_GAP = spacing.sm;
/** Distance from one card's left edge to the next — what the row snaps to. */
export const SCHEDULE_DAY_CARD_STRIDE = SCHEDULE_DAY_CARD_WIDTH + SCHEDULE_DAY_CARD_GAP;

function formatShortWeekdayDate(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${SHORT_WEEKDAY_LABELS[date.getDay()]} ${day}/${month}`;
}

function TypeIcon({ kind, color }: { kind: ScheduleCardDay['programDayKind']; color: string }) {
  if (kind === 'strength') return <DumbbellIcon size={20} color={color} />;
  if (kind === 'cardio') return <HeartIcon size={20} color={color} />;
  return <MoonIcon size={20} color={color} />;
}

/**
 * One day in the horizontal week-card row on the Schema page. Status is
 * conveyed by more than color alone (per the app's contrast/shape
 * accessibility pass elsewhere): 'done' fills the card in accent, 'missed'
 * gets a dedicated corner cross mark (never the same visual as 'rest'), and
 * a small dot next to the date marks 'today' regardless of selection state.
 * Tapping a card selects it (thick accent border) instead of navigating —
 * the info section below the row re-renders for whichever day is selected.
 */
export function ScheduleDayCard({ day, isSelected, onPress }: { day: ScheduleCardDay; isSelected: boolean; onPress: () => void }) {
  const label = day.programDayName ?? 'Rust';
  const iconColor = day.status === 'done' ? colors.accent : day.status === 'missed' ? colors.danger : colors.textSecondary;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        day.status === 'done' && styles.cardDone,
        day.status === 'missed' && styles.cardMissed,
        isSelected && styles.cardSelected,
        pressed && styles.cardPressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      accessibilityLabel={`${formatShortWeekdayDate(day.date)}${day.isToday ? ' (vandaag)' : ''}: ${label}, ${day.status}`}
    >
      <View style={styles.dateRow}>
        <Text style={styles.date}>{formatShortWeekdayDate(day.date)}</Text>
        {day.isToday && <View style={styles.todayDot} />}
      </View>
      <View style={styles.iconWrap}>
        <TypeIcon kind={day.programDayKind} color={iconColor} />
        {day.status === 'missed' && (
          <View style={styles.missedBadge}>
            <Text style={styles.missedBadgeText}>×</Text>
          </View>
        )}
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCHEDULE_DAY_CARD_WIDTH,
    minHeight: 92,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    gap: spacing.xs,
  },
  cardDone: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  cardMissed: {
    backgroundColor: colors.dangerMuted,
    borderColor: colors.danger,
  },
  cardSelected: {
    borderWidth: 3,
    borderColor: colors.accent,
  },
  cardPressed: {
    opacity: 0.7,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  date: {
    color: colors.textTertiary,
    fontSize: 11,
    fontWeight: '600',
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.textPrimary,
  },
  iconWrap: {
    marginVertical: spacing.xs,
  },
  missedBadge: {
    position: 'absolute',
    top: -4,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: radii.pill,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missedBadgeText: {
    color: colors.background,
    fontSize: 11,
    fontWeight: '700',
    lineHeight: 12,
  },
  label: {
    color: colors.textPrimary,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
});
