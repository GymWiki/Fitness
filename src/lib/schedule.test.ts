import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockDb = vi.hoisted(() => ({
  execAsync: vi.fn(),
  runAsync: vi.fn(),
  getAllAsync: vi.fn(),
  getFirstAsync: vi.fn(),
  withTransactionAsync: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));
vi.mock('./db', () => mockDb);

let idCounter = 0;
vi.mock('./id', () => ({ generateId: vi.fn(() => `id-${idCounter++}`) }));

// Imported after the mocks so schedule.ts's internal `import ... from './db'`/`'./id'` resolve to the mocks above.
const { ensureScheduledWindow, fetchScheduledSessions } = await import('./schedule');

interface CallEntry {
  sql: string;
  params: unknown[];
}

interface MockConfig {
  preferredWeekdays: number[] | null;
  activeProgram: { id: string; goal: string } | null;
  dayRows: Array<{ id: string; day_exercises: Array<{ kind: string; exercise_type: string | null; muscle_group: string | null }> }>;
  existingMaxDate?: string;
  scheduledSessionsSelectRows?: unknown[];
}

/**
 * Configures the mocked `./db` primitives to answer schedule.ts's raw SQL
 * queries by matching substrings in the SQL text (the same "dispatch on the
 * SQL shape" approach as the old fluent-Postgrest mocks, just without the
 * chain — every call to `runAsync`/`getAllAsync`/`getFirstAsync` is a single,
 * directly-inspectable (sql, params) pair now).
 */
function configureDbMock(config: MockConfig) {
  const runAsyncCalls: CallEntry[] = [];

  mockDb.runAsync.mockImplementation(async (sql: string, params: unknown[] = []) => {
    runAsyncCalls.push({ sql, params });
    return { changes: 0, lastInsertRowId: 0 };
  });

  mockDb.getFirstAsync.mockImplementation(async (sql: string) => {
    if (sql.includes('from profiles')) {
      return { preferred_weekdays: config.preferredWeekdays ? JSON.stringify(config.preferredWeekdays) : null };
    }
    if (sql.includes("from programs where status = 'active'")) {
      return config.activeProgram;
    }
    if (sql.includes('from scheduled_sessions order by scheduled_date desc')) {
      return config.existingMaxDate ? { scheduled_date: config.existingMaxDate } : null;
    }
    return null;
  });

  mockDb.getAllAsync.mockImplementation(async (sql: string, params: unknown[] = []) => {
    if (sql.includes('from program_days where program_id')) {
      return config.dayRows.map((day) => ({ id: day.id }));
    }
    if (sql.includes('from day_exercises where program_day_id')) {
      const day = config.dayRows.find((d) => d.id === params[0]);
      return day ? day.day_exercises : [];
    }
    if (sql.includes('from scheduled_sessions ss')) {
      return config.scheduledSessionsSelectRows ?? [];
    }
    return [];
  });

  return { runAsyncCalls };
}

const strengthDay = (id: string, muscleGroup = 'Borst') => ({
  id,
  day_exercises: [{ kind: 'strength', exercise_type: 'compound', muscle_group: muscleGroup }],
});

describe('ensureScheduledWindow', () => {
  beforeEach(() => {
    idCounter = 0;
    mockDb.runAsync.mockReset();
    mockDb.getFirstAsync.mockReset();
    mockDb.getAllAsync.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20)); // a Monday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no-ops entirely when preferred_weekdays is not set (backward compat for existing accounts)', async () => {
    const { runAsyncCalls } = configureDbMock({ preferredWeekdays: null, activeProgram: null, dayRows: [] });

    await ensureScheduledWindow();

    expect(mockDb.getFirstAsync.mock.calls.some(([sql]) => (sql as string).includes('from programs'))).toBe(false);
    expect(runAsyncCalls.some((c) => c.sql.includes('insert into scheduled_sessions'))).toBe(false);
  });

  it('generates a fresh 2-week window with sessions exactly on the preferred weekdays (ma/wo/vr)', async () => {
    const { runAsyncCalls } = configureDbMock({
      preferredWeekdays: [1, 3, 5], // ma/wo/vr
      activeProgram: { id: 'program-1', goal: 'mixed' },
      dayRows: [strengthDay('day-a'), strengthDay('day-b'), strengthDay('day-c')],
    });

    await ensureScheduledWindow();

    const insertCalls = runAsyncCalls.filter((c) => c.sql.includes('insert into scheduled_sessions'));
    const rows = insertCalls.map((c) => ({
      scheduled_date: c.params[2] as string,
      program_day_id: c.params[3] as string | null,
      status: c.params[4] as string,
    }));

    expect(rows).toHaveLength(14); // today + 13 days

    const trainingRows = rows.filter((row) => row.program_day_id !== null);
    for (const row of trainingRows) {
      const [year, month, day] = row.scheduled_date.split('-').map(Number) as [number, number, number];
      const jsWeekday = new Date(year, month - 1, day).getDay(); // local calendar date, never parse 'yyyy-mm-dd' as UTC (shifts a day near midnight)
      expect([1, 3, 5]).toContain(jsWeekday === 0 ? 7 : jsWeekday);
      expect(row.status).toBe('planned');
    }
    expect(trainingRows).toHaveLength(6); // 2 weeks * 3 training days

    const restRows = rows.filter((row) => row.program_day_id === null);
    expect(restRows.every((row) => row.status === 'rest')).toBe(true);
  });

  it('sweeps overdue planned rows to missed before touching anything else', async () => {
    const { runAsyncCalls } = configureDbMock({ preferredWeekdays: null, activeProgram: null, dayRows: [] });

    await ensureScheduledWindow();

    expect(runAsyncCalls[0]!.sql).toContain("set status = 'missed'");
    expect(runAsyncCalls[0]!.sql).toContain("status = 'planned'");
    expect(runAsyncCalls[0]!.sql).toContain('scheduled_date < ?');
    expect(runAsyncCalls[0]!.params).toEqual(['2026-07-20']);
  });

  it('only fills the gap forward from the existing window end, never re-inserting already-scheduled dates', async () => {
    const { runAsyncCalls } = configureDbMock({
      preferredWeekdays: [1, 3, 5],
      activeProgram: { id: 'program-1', goal: 'mixed' },
      dayRows: [strengthDay('day-a'), strengthDay('day-b'), strengthDay('day-c')],
      existingMaxDate: '2026-07-25', // window already extends 5 days out
    });

    await ensureScheduledWindow();

    const insertCalls = runAsyncCalls.filter((c) => c.sql.includes('insert into scheduled_sessions'));
    expect(insertCalls[0]!.params[2]).toBe('2026-07-26');
    expect(insertCalls[insertCalls.length - 1]!.params[2]).toBe('2026-08-02'); // today (07-20) + 13 days
  });

  it('does nothing when the window is already fully generated', async () => {
    const { runAsyncCalls } = configureDbMock({
      preferredWeekdays: [1, 3, 5],
      activeProgram: { id: 'program-1', goal: 'mixed' },
      dayRows: [strengthDay('day-a'), strengthDay('day-b'), strengthDay('day-c')],
      existingMaxDate: '2026-08-02', // already covers today + 13 days
    });

    await ensureScheduledWindow();

    expect(runAsyncCalls.some((c) => c.sql.includes('insert into scheduled_sessions'))).toBe(false);
  });
});

describe('fetchScheduledSessions', () => {
  beforeEach(() => {
    mockDb.getAllAsync.mockReset();
  });

  it('maps rows to the ScheduledSessionRow shape, including the joined program day name/order', async () => {
    configureDbMock({
      preferredWeekdays: null,
      activeProgram: null,
      dayRows: [],
      scheduledSessionsSelectRows: [
        { id: 'row-1', scheduled_date: '2026-07-20', status: 'planned', program_day_id: 'day-a', day_order: 1, day_name: 'Full Body A' },
        { id: 'row-2', scheduled_date: '2026-07-21', status: 'rest', program_day_id: null, day_order: null, day_name: null },
      ],
    });

    const rows = await fetchScheduledSessions('2026-07-20', '2026-07-26');

    expect(rows).toEqual([
      { id: 'row-1', date: '2026-07-20', status: 'planned', programDayId: 'day-a', programDayName: 'Full Body A', programDayOrder: 1 },
      { id: 'row-2', date: '2026-07-21', status: 'rest', programDayId: null, programDayName: null, programDayOrder: null },
    ]);
  });
});
