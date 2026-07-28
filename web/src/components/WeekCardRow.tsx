'use client';

import { useRef, useState } from 'react';
import { addDays, startOfIsoWeek } from '@/lib/dateWeek';
import type { ScheduledSessionRow } from '@/lib/schedule';
import { buildWeekCards } from '@/lib/scheduleCards';
import { ScheduleDayCard, SCHEDULE_DAY_CARD_STRIDE } from './ScheduleDayCard';

/**
 * Horizontal, snap-scrolling week-card row for the top of the Schema page.
 * Presentational: `rows` comes from the same `fetchScheduledSessions` call
 * the Schema page already makes (a week-aligned 14-day range), so there's
 * no second fetch here. Only the "which of the two fetched weeks is shown"
 * toggle is local UI state — which day is selected lives with the caller,
 * since the info section it drives renders outside this row.
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasAutoScrolled = useRef(false);
  const [weekOffset, setWeekOffset] = useState<0 | 1>(0);

  const today = new Date();
  const weekStart = addDays(startOfIsoWeek(today), weekOffset * 7);
  const cards = buildWeekCards(rows, weekStart, today);

  function scrollToToday(node: HTMLDivElement | null) {
    scrollRef.current = node;
    if (!node || hasAutoScrolled.current || weekOffset !== 0) return;
    const todayIndex = cards.findIndex((card) => card.isToday);
    if (todayIndex < 0) return;
    hasAutoScrolled.current = true;
    node.scrollTo({ left: todayIndex * SCHEDULE_DAY_CARD_STRIDE, behavior: 'auto' });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <button
          type="button"
          disabled={weekOffset === 0}
          onClick={() => setWeekOffset(0)}
          className={`text-[13px] font-semibold ${weekOffset === 0 ? 'text-text-tertiary' : 'text-accent'}`}
        >
          ← Vorige week
        </button>
        <span className="text-[13px] font-semibold text-text-secondary">{weekOffset === 0 ? 'Deze week' : 'Volgende week'}</span>
        <button
          type="button"
          disabled={weekOffset === 1}
          onClick={() => setWeekOffset(1)}
          className={`text-[13px] font-semibold ${weekOffset === 1 ? 'text-text-tertiary' : 'text-accent'}`}
        >
          Volgende week →
        </button>
      </div>
      <div ref={scrollToToday} className="flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 pr-4" style={{ scrollbarWidth: 'thin' }}>
        {cards.map((card) => (
          <div key={card.dateIso} className="snap-start">
            <ScheduleDayCard day={card} isSelected={card.dateIso === selectedDateIso} onClick={() => onSelectDay(card.dateIso)} />
          </div>
        ))}
      </div>
    </div>
  );
}
