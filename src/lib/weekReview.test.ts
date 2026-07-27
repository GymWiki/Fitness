import type { CurrentProgramState } from '@fitness/adaptation-planner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayLocalDateString } from './dates';
import type { WeekReview } from './weekReview';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: mockSupabase }));

// Imported after the mock so weekReview.ts's internal `import { supabase } from './supabase'` resolves to mockSupabase.
const { applyWeekReview } = await import('./weekReview');

interface CallEntry {
  op: string;
  args: unknown[];
}

/** Same fluent-mock pattern as programs.test.ts/switchGoal.test.ts, extended with delete/in/gt for the new schedule-cleanup call. */
function createMockSupabase() {
  const calls: CallEntry[] = [];

  function makeChain(table: string) {
    const chain: Record<string, unknown> = {};
    for (const method of ['update', 'insert', 'delete', 'select', 'eq', 'in', 'gt', 'single']) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ op: `${table}.${method}`, args });
        return chain;
      };
    }
    chain.then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve({ data: null, error: null });
    return chain;
  }

  return { from: vi.fn(makeChain), calls };
}

const program: CurrentProgramState = {
  daysPerWeek: 1,
  isDeloadWeek: false,
  recentWeeks: [],
  days: [{ programDayId: 'day-1', dayOrder: 1, exercises: [] }],
};

const review: WeekReview = {
  programId: 'program-1',
  weekNumber: 3,
  goal: 'hypertrophy',
  program,
  adjustments: [],
  exerciseNamesById: new Map(),
  dayNamesById: new Map(),
};

describe('applyWeekReview', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  it('clears strictly-future planned/rest scheduled_sessions for the program, never past or today', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    await applyWeekReview(review, []);

    const deleteCall = mock.calls.find((c) => c.op === 'scheduled_sessions.delete');
    expect(deleteCall).toBeDefined();

    const scheduledSessionsCalls = mock.calls.filter((c) => c.op.startsWith('scheduled_sessions.'));
    expect(scheduledSessionsCalls).toContainEqual({ op: 'scheduled_sessions.eq', args: ['program_id', 'program-1'] });
    expect(scheduledSessionsCalls).toContainEqual({ op: 'scheduled_sessions.in', args: ['status', ['planned', 'rest']] });

    const gtCall = scheduledSessionsCalls.find((c) => c.op === 'scheduled_sessions.gt')!;
    expect(gtCall.args[0]).toBe('scheduled_date');
    // gt (strictly greater than), not gte — today itself must be untouched, only what's strictly after it.
    expect(gtCall.args[1]).toBe(todayLocalDateString());
  });

  it('advances the week counter before clearing the schedule (order matters: a failed clear must not silently skip the week advance)', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    await applyWeekReview(review, []);

    const weekIndex = mock.calls.findIndex((c) => c.op === 'programs.update');
    const clearIndex = mock.calls.findIndex((c) => c.op === 'scheduled_sessions.delete');
    expect(weekIndex).toBeGreaterThanOrEqual(0);
    expect(clearIndex).toBeGreaterThan(weekIndex);
  });
});
