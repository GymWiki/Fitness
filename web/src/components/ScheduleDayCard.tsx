import type { ScheduleCardDay } from '@/lib/scheduleCards';
import { colors } from '@/theme/colors';
import { DumbbellIcon, HeartIcon, MoonIcon } from './icons';

const SHORT_WEEKDAY_LABELS = ['Zo', 'Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za']; // Date.getDay(): 0 = Sunday.

export const SCHEDULE_DAY_CARD_WIDTH = 76;
const SCHEDULE_DAY_CARD_GAP = 8;
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
 * conveyed by more than color alone: 'done' fills the card in accent,
 * 'missed' gets a dedicated corner cross mark (never the same visual as
 * 'rest'), and a small dot next to the date marks 'today' regardless of
 * selection state. Clicking a card selects it (thick accent border) instead
 * of navigating — the info section below the row re-renders for whichever
 * day is selected.
 */
export function ScheduleDayCard({ day, isSelected, onClick }: { day: ScheduleCardDay; isSelected: boolean; onClick: () => void }) {
  const label = day.programDayName ?? 'Rust';
  const iconColor = day.status === 'done' ? colors.accent : day.status === 'missed' ? colors.danger : colors.textSecondary;

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      aria-label={`${formatShortWeekdayDate(day.date)}${day.isToday ? ' (vandaag)' : ''}: ${label}, ${day.status}`}
      className={`relative flex shrink-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-opacity hover:opacity-90 active:opacity-70 ${
        day.status === 'done'
          ? 'border-accent bg-accent-muted'
          : day.status === 'missed'
            ? 'border-danger bg-danger-muted'
            : 'border-border bg-surface'
      } ${isSelected ? 'border-[3px] border-accent' : ''}`}
      style={{ width: SCHEDULE_DAY_CARD_WIDTH, minHeight: 92 }}
    >
      <div className="flex items-center gap-[3px]">
        <span className="text-[11px] font-semibold text-text-tertiary">{formatShortWeekdayDate(day.date)}</span>
        {day.isToday && <span className="h-1 w-1 rounded-full bg-text-primary" />}
      </div>
      <div className="relative my-1">
        <TypeIcon kind={day.programDayKind} color={iconColor} />
        {day.status === 'missed' && (
          <div className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger">
            <span className="text-[11px] font-bold leading-3 text-background">×</span>
          </div>
        )}
      </div>
      <p className="line-clamp-2 text-xs font-semibold text-text-primary">{label}</p>
    </button>
  );
}
