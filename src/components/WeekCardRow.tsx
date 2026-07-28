import { useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { addDays, startOfIsoWeek } from '@/lib/dateWeek';
import type { ScheduledSessionRow } from '@/lib/schedule';
import { buildWeekCards } from '@/lib/scheduleCards';
import { colors } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { ScheduleDayCard, SCHEDULE_DAY_CARD_STRIDE } from './ScheduleDayCard';

/**
 * Horizontal, snap-scrolling week-card row for the top of the Schema page —
 * replaces the old flat "Komende 2 weken" list. Presentational: `rows`
 * comes from the same `fetchScheduledSessions` call the Schema page already
 * makes (now widened to a week-aligned 14-day range), so there's no second
 * fetch here. Only the "which of the two fetched weeks is shown" toggle is
 * local UI state — which day is selected lives with the caller, since the
 * info section it drives renders outside this row.
 */
export function WeekCardRow({
  rows,
  selectedDateIso,
  onSelectDay,
}: {
  rows: ScheduledSessionRow[];
  selectedDateIso: string;
  onSelectDay: (dateIso: string) => void;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const hasAutoScrolled = useRef(false);
  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);

  const today = new Date();
  const weekStart = addDays(startOfIsoWeek(today), weekOffset * 7);
  const cards = buildWeekCards(rows, weekStart, today);

  function scrollToToday() {
    if (hasAutoScrolled.current || weekOffset !== 0) return;
    const todayIndex = cards.findIndex((card) => card.isToday);
    if (todayIndex < 0) return;
    hasAutoScrolled.current = true;
    scrollRef.current?.scrollTo({ x: todayIndex * SCHEDULE_DAY_CARD_STRIDE, animated: false });
  }

  return (
    <View style={styles.container}>
      <View style={styles.navRow}>
        <Pressable disabled={weekOffset === 0} onPress={() => setWeekOffset(0)} hitSlop={8}>
          <Text style={[styles.navLink, weekOffset === 0 && styles.navLinkDisabled]}>← Vorige week</Text>
        </Pressable>
        <Text style={styles.navTitle}>{weekOffset === 0 ? 'Deze week' : 'Volgende week'}</Text>
        <Pressable disabled={weekOffset === 1} onPress={() => setWeekOffset(1)} hitSlop={8}>
          <Text style={[styles.navLink, weekOffset === 1 && styles.navLinkDisabled]}>Volgende week →</Text>
        </Pressable>
      </View>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCHEDULE_DAY_CARD_STRIDE}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={styles.row}
        onLayout={scrollToToday}
      >
        {cards.map((card) => (
          <ScheduleDayCard
            key={card.dateIso}
            day={card}
            isSelected={card.dateIso === selectedDateIso}
            onPress={() => onSelectDay(card.dateIso)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  navLinkDisabled: {
    color: colors.textTertiary,
  },
  navTitle: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  row: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
});
