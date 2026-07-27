import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: mockSupabase }));

// Imported after the mock so schedule.ts's internal `import { supabase } from './supabase'` resolves to mockSupabase.
const { ensureScheduledWindow, fetchScheduledSessions } = await import('./schedule');

interface CallEntry {
  op: string;
  args: unknown[];
}

interface ResolvedChain {
  table: string;
  calls: CallEntry[];
}

interface MockConfig {
  preferredWeekdays: number[] | null;
  activeProgram: { id: string; goal: string } | null;
  dayRows: Array<{ id: string; day_exercises: Array<{ kind: string; exercise_type: string | null; muscle_group: string | null }> }>;
  existingMaxDate?: string;
  scheduledSessionsSelectRows?: unknown[];
}

/**
 * Minimal fluent mock of the supabase-js query builder (same spirit as
 * programs.test.ts/switchGoal.test.ts), extended with the read-only methods
 * `ensureScheduledWindow` chains (order/limit/maybeSingle/update/lt/upsert).
 * Every resolved chain (i.e. every awaited `.from(...)` call) is recorded in
 * `resolvedChains` with its own call list, so a test can find e.g. "the
 * chain that did an update on scheduled_sessions" and inspect exactly which
 * filters it applied, without the chains bleeding into each other.
 */
function createMockSupabase(config: MockConfig) {
  const resolvedChains: ResolvedChain[] = [];

  function respond(table: string, calls: CallEntry[]): { data: unknown; error: unknown } {
    const hasMaybeSingle = calls.some((c) => c.op === 'maybeSingle');

    if (table === 'profiles') {
      return { data: { preferred_weekdays: config.preferredWeekdays }, error: null };
    }
    if (table === 'programs') {
      return { data: config.activeProgram, error: null };
    }
    if (table === 'program_days') {
      return { data: config.dayRows, error: null };
    }
    if (table === 'scheduled_sessions') {
      const hasUpdate = calls.some((c) => c.op === 'update');
      const hasUpsert = calls.some((c) => c.op === 'upsert');
      if (hasUpdate) return { data: null, error: null }; // the missed-sweep
      if (hasUpsert) return { data: null, error: null }; // the window fill
      if (hasMaybeSingle) return { data: config.existingMaxDate ? { scheduled_date: config.existingMaxDate } : null, error: null }; // max-date lookup
      return { data: config.scheduledSessionsSelectRows ?? [], error: null }; // fetchScheduledSessions
    }
    return { data: null, error: null };
  }

  function makeChain(table: string) {
    const calls: CallEntry[] = [];
    const chain: Record<string, unknown> = {};
    for (const method of ['select', 'eq', 'order', 'limit', 'maybeSingle', 'update', 'lt', 'gte', 'lte', 'upsert']) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ op: method, args });
        return chain;
      };
    }
    chain.then = (resolve: (value: { data: unknown; error: unknown }) => void) => {
      resolvedChains.push({ table, calls });
      resolve(respond(table, calls));
    };
    return chain;
  }

  return { from: vi.fn(makeChain), resolvedChains };
}

const strengthDay = (id: string, muscleGroup = 'Borst') => ({
  id,
  day_exercises: [{ kind: 'strength', exercise_type: 'compound', muscle_group: muscleGroup }],
});

describe('ensureScheduledWindow', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 20)); // a Monday
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('no-ops entirely when preferred_weekdays is not set (backward compat for existing accounts)', async () => {
    const mock = createMockSupabase({ preferredWeekdays: null, activeProgram: null, dayRows: [] });
    mockSupabase.from.mockImplementation(mock.from);

    await ensureScheduledWindow('user-1');

    expect(mock.resolvedChains.some((c) => c.table === 'programs')).toBe(false);
    expect(mock.resolvedChains.some((c) => c.table === 'scheduled_sessions' && c.calls.some((call) => call.op === 'upsert'))).toBe(false);
  });

  it('generates a fresh 2-week window with sessions exactly on the preferred weekdays (ma/wo/vr)', async () => {
    const mock = createMockSupabase({
      preferredWeekdays: [1, 3, 5], // ma/wo/vr
      activeProgram: { id: 'program-1', goal: 'mixed' },
      dayRows: [strengthDay('day-a'), strengthDay('day-b'), strengthDay('day-c')],
    });
    mockSupabase.from.mockImplementation(mock.from);

    await ensureScheduledWindow('user-1');

    const upsertChain = mock.resolvedChains.find((c) => c.table === 'scheduled_sessions' && c.calls.some((call) => call.op === 'upsert'))!;
    const upsertCall = upsertChain.calls.find((call) => call.op === 'upsert')!;
    const rows = upsertCall.args[0] as Array<{ scheduled_date: string; program_day_id: string | null; status: string }>;

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
    const mock = createMockSupabase({ preferredWeekdays: null, activeProgram: null, dayRows: [] });
    mockSupabase.from.mockImplementation(mock.from);

    await ensureScheduledWindow('user-1');

    const sweepChain = mock.resolvedChains.find((c) => c.table === 'scheduled_sessions' && c.calls.some((call) => call.op === 'update'))!;
    expect(sweepChain).toBeDefined();
    const updateCall = sweepChain.calls.find((call) => call.op === 'update')!;
    expect(updateCall.args[0]).toEqual({ status: 'missed' });
    expect(sweepChain.calls).toContainEqual({ op: 'eq', args: ['status', 'planned'] });
    expect(sweepChain.calls).toContainEqual({ op: 'lt', args: ['scheduled_date', '2026-07-20'] });
  });

  it('only fills the gap forward from the existing window end, never re-inserting already-scheduled dates', async () => {
    const mock = createMockSupabase({
      preferredWeekdays: [1, 3, 5],
      activeProgram: { id: 'program-1', goal: 'mixed' },
      dayRows: [strengthDay('day-a'), strengthDay('day-b'), strengthDay('day-c')],
      existingMaxDate: '2026-07-25', // window already extends 5 days out
    });
    mockSupabase.from.mockImplementation(mock.from);

    await ensureScheduledWindow('user-1');

    const upsertChain = mock.resolvedChains.find((c) => c.table === 'scheduled_sessions' && c.calls.some((call) => call.op === 'upsert'))!;
    const rows = upsertChain.calls.find((call) => call.op === 'upsert')!.args[0] as Array<{ scheduled_date: string }>;
    expect(rows[0]!.scheduled_date).toBe('2026-07-26');
    expect(rows[rows.length - 1]!.scheduled_date).toBe('2026-08-02'); // today (07-20) + 13 days
  });

  it('does nothing when the window is already fully generated', async () => {
    const mock = createMockSupabase({
      preferredWeekdays: [1, 3, 5],
      activeProgram: { id: 'program-1', goal: 'mixed' },
      dayRows: [strengthDay('day-a'), strengthDay('day-b'), strengthDay('day-c')],
      existingMaxDate: '2026-08-02', // already covers today + 13 days
    });
    mockSupabase.from.mockImplementation(mock.from);

    await ensureScheduledWindow('user-1');

    expect(mock.resolvedChains.some((c) => c.table === 'scheduled_sessions' && c.calls.some((call) => call.op === 'upsert'))).toBe(false);
  });
});

describe('fetchScheduledSessions', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  it('maps rows to the ScheduledSessionRow shape, including the joined program day name/order', async () => {
    const mock = createMockSupabase({
      preferredWeekdays: null,
      activeProgram: null,
      dayRows: [],
      scheduledSessionsSelectRows: [
        { id: 'row-1', scheduled_date: '2026-07-20', status: 'planned', program_day_id: 'day-a', program_days: { day_order: 1, name: 'Full Body A' } },
        { id: 'row-2', scheduled_date: '2026-07-21', status: 'rest', program_day_id: null, program_days: null },
      ],
    });
    mockSupabase.from.mockImplementation(mock.from);

    const rows = await fetchScheduledSessions('user-1', '2026-07-20', '2026-07-26');

    expect(rows).toEqual([
      { id: 'row-1', date: '2026-07-20', status: 'planned', programDayId: 'day-a', programDayName: 'Full Body A', programDayOrder: 1 },
      { id: 'row-2', date: '2026-07-21', status: 'rest', programDayId: null, programDayName: null, programDayOrder: null },
    ]);
  });
});
