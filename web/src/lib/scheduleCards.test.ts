import { describe, expect, it } from 'vitest';
import { buildWeekCards } from './scheduleCards';
import type { ScheduledSessionRow } from './schedule';

function row(overrides: Partial<ScheduledSessionRow> = {}): ScheduledSessionRow {
  return {
    id: 'row-1',
    date: '2026-07-20',
    status: 'planned',
    programDayId: 'day-1',
    programDayName: 'Push A',
    programDayOrder: 1,
    programDayKind: 'strength',
    ...overrides,
  };
}

describe('buildWeekCards', () => {
  const monday = new Date(2026, 6, 20); // a Monday

  it('returns exactly 7 days, Monday through Sunday', () => {
    const cards = buildWeekCards([], monday, monday);
    expect(cards).toHaveLength(7);
    expect(cards.map((card) => card.dateIso)).toEqual([
      '2026-07-20',
      '2026-07-21',
      '2026-07-22',
      '2026-07-23',
      '2026-07-24',
      '2026-07-25',
      '2026-07-26',
    ]);
  });

  it('maps each status straight through from the matching row', () => {
    const rows = [
      row({ date: '2026-07-20', status: 'done' }),
      row({ date: '2026-07-21', status: 'planned' }),
      row({ date: '2026-07-22', status: 'missed' }),
      row({ date: '2026-07-23', status: 'rest', programDayId: null, programDayName: null, programDayKind: null }),
    ];
    const cards = buildWeekCards(rows, monday, monday);
    expect(cards[0]!.status).toBe('done');
    expect(cards[1]!.status).toBe('planned');
    expect(cards[2]!.status).toBe('missed');
    expect(cards[3]!.status).toBe('rest');
  });

  it('falls back to rest for a day with no matching row, same convention as scheduleToWeekStrip', () => {
    const cards = buildWeekCards([], monday, monday);
    expect(cards.every((card) => card.status === 'rest')).toBe(true);
    expect(cards.every((card) => card.programDayKind === null)).toBe(true);
  });

  it('marks exactly one day as isToday, regardless of status', () => {
    const wednesday = new Date(2026, 6, 22);
    const rows = [row({ date: '2026-07-22', status: 'missed' })];
    const cards = buildWeekCards(rows, monday, wednesday);
    const todayCards = cards.filter((card) => card.isToday);
    expect(todayCards).toHaveLength(1);
    expect(todayCards[0]!.dateIso).toBe('2026-07-22');
    expect(todayCards[0]!.status).toBe('missed');
  });

  it('carries programDayName and programDayKind through for a training day', () => {
    const rows = [row({ date: '2026-07-21', status: 'planned', programDayName: 'Zone 2 cardio', programDayKind: 'cardio' })];
    const cards = buildWeekCards(rows, monday, monday);
    expect(cards[1]!.programDayName).toBe('Zone 2 cardio');
    expect(cards[1]!.programDayKind).toBe('cardio');
  });

  it('builds the following week when weekStart is 7 days later', () => {
    const nextMonday = new Date(2026, 6, 27);
    const cards = buildWeekCards([], nextMonday, monday);
    expect(cards[0]!.dateIso).toBe('2026-07-27');
    expect(cards[6]!.dateIso).toBe('2026-08-02');
    expect(cards.every((card) => !card.isToday)).toBe(true);
  });
});
