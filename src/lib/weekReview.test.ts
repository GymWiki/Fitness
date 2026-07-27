import type { CurrentProgramState } from '@fitness/adaptation-planner';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { todayLocalDateString } from './dates';
import type { WeekReview } from './weekReview';

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

// Imported after the mocks so weekReview.ts's internal `import ... from './db'`/`'./id'` resolve to the mocks above.
const { applyWeekReview } = await import('./weekReview');

interface CallEntry {
  sql: string;
  params: unknown[];
}

function calls(): CallEntry[] {
  return mockDb.runAsync.mock.calls.map((call): CallEntry => ({ sql: call[0] as string, params: call[1] as unknown[] }));
}

function findIndex(sqlSubstring: string): number {
  return calls().findIndex((c) => c.sql.includes(sqlSubstring));
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
    idCounter = 0;
    mockDb.runAsync.mockReset().mockResolvedValue({ changes: 0, lastInsertRowId: 0 });
  });

  it('clears strictly-future planned/rest scheduled_sessions for the program, never past or today', async () => {
    await applyWeekReview(review, []);

    const deleteIndex = findIndex('delete from scheduled_sessions');
    expect(deleteIndex).toBeGreaterThanOrEqual(0);

    const deleteCall = calls()[deleteIndex]!;
    expect(deleteCall.sql).toContain('program_id = ?');
    expect(deleteCall.sql).toContain("status in ('planned', 'rest')");
    expect(deleteCall.sql).toContain('scheduled_date > ?');
    // gt (strictly greater than), not gte — today itself must be untouched, only what's strictly after it.
    expect(deleteCall.params).toEqual(['program-1', todayLocalDateString()]);
  });

  it('advances the week counter before clearing the schedule (order matters: a failed clear must not silently skip the week advance)', async () => {
    await applyWeekReview(review, []);

    const weekIndex = findIndex('update programs set current_week_number');
    const clearIndex = findIndex('delete from scheduled_sessions');
    expect(weekIndex).toBeGreaterThanOrEqual(0);
    expect(clearIndex).toBeGreaterThan(weekIndex);
  });
});
