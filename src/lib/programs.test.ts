import { generateProgram, type Goal, type IntakeAnswers } from '@fitness/program-generator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: mockSupabase }));

// Imported after the mock so programs.ts's internal `import { supabase } from './supabase'` resolves to mockSupabase.
const { assertProgressionRules, defaultProgressionRuleFor, insertProgramStructure } = await import('./programs');

interface CallEntry {
  table: string;
  op: string;
  args: unknown[];
}

/**
 * Minimal fluent mock of the supabase-js query builder (same pattern as
 * switchGoal.test.ts). The `day_exercises` branch simulates the real
 * Postgres NOT NULL constraint on `progression_rule` — a row missing it
 * fails with the exact 23502 error the live bug produced — so this test
 * actually exercises the bug's failure mode, not just a happy-path mock.
 */
function createMockSupabase() {
  const calls: CallEntry[] = [];

  function respond(table: string, localCalls: CallEntry[]): { data: unknown; error: unknown } {
    const insertCall = localCalls.find((c) => c.op === 'insert');
    if (!insertCall) return { data: null, error: null };

    if (table === 'programs') return { data: { id: 'new-program-id' }, error: null };
    if (table === 'program_days') {
      const rows = insertCall.args[0] as Array<{ day_order: number }>;
      return { data: rows.map((row, i) => ({ id: `day-${i}`, day_order: row.day_order })), error: null };
    }
    if (table === 'day_exercises') {
      const rows = insertCall.args[0] as Array<{ exercise_name: string; progression_rule?: unknown }>;
      const missing = rows.find((row) => row.progression_rule === null || row.progression_rule === undefined);
      if (missing) {
        return {
          data: null,
          error: {
            message: `null value in column "progression_rule" of relation "day_exercises" violates not-null constraint`,
            code: '23502',
          },
        };
      }
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }

  function makeChain(table: string) {
    const localCalls: CallEntry[] = [];
    const chain: Record<string, unknown> = {};
    for (const method of ['insert', 'select', 'single']) {
      chain[method] = (...args: unknown[]) => {
        const entry = { table, op: method, args };
        calls.push(entry);
        localCalls.push(entry);
        return chain;
      };
    }
    chain.then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve(respond(table, localCalls));
    return chain;
  }

  return { from: vi.fn((table: string) => makeChain(table)), calls };
}

function intake(goal: Goal): IntakeAnswers {
  return { goal, experienceLevel: 'intermediate', daysPerWeek: 4, equipment: 'gym' };
}

const ALL_GOALS: Goal[] = ['hypertrophy', 'strength', 'endurance', 'fat_loss', 'mixed'];

describe('insertProgramStructure', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  it.each(ALL_GOALS)('inserts a full schema for goal %s without violating progression_rule NOT NULL', async (goal) => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    const program = generateProgram(intake(goal));
    await expect(insertProgramStructure('user-1', program)).resolves.toBe('new-program-id');

    const exerciseInsertCall = mock.calls.find((c) => c.table === 'day_exercises' && c.op === 'insert')!;
    const rows = exerciseInsertCall.args[0] as Array<{ progression_rule?: unknown }>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.progression_rule).toBeDefined();
      expect(row.progression_rule).not.toBeNull();
    }
  });

  it('reproduces and rejects the original bug: a mixed batch with one row missing progression_rule fails with 23502', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    const table = mock.from('day_exercises') as unknown as {
      insert: (rows: unknown[]) => Promise<{ data: unknown; error: { code: string } | null }>;
    };
    const result = await table.insert([
      { exercise_name: 'Bench press', progression_rule: { weightIncrementKg: 2.5 } },
      { exercise_name: 'Zone 2 cardio' }, // progression_rule omitted, exactly like the original bug
    ]);
    expect(result.error?.code).toBe('23502');
  });
});

describe('defaultProgressionRuleFor', () => {
  it('gives strength exercises a weightIncrementKg-based rule', () => {
    const rule = defaultProgressionRuleFor({ kind: 'strength', weightIncrementKg: 2.5 });
    expect(rule).toEqual({ weightIncrementKg: 2.5 });
  });

  it('gives cardio exercises a polarized rule, never an empty/undefined one', () => {
    const zone2 = defaultProgressionRuleFor({ kind: 'cardio_duration', sessionType: 'zone2' });
    const interval = defaultProgressionRuleFor({ kind: 'cardio_interval', sessionType: 'interval' });
    expect(zone2).toEqual({ type: 'polarized', sessionType: 'zone2' });
    expect(interval).toEqual({ type: 'polarized', sessionType: 'interval' });
  });
});

describe('assertProgressionRules', () => {
  it('throws a clear, named error when a row is missing progression_rule (regression guard)', () => {
    const rows = [
      { exercise_name: 'Bench press', progression_rule: { weightIncrementKg: 2.5 } },
      { exercise_name: 'Zone 2 cardio', progression_rule: undefined },
    ];
    expect(() => assertProgressionRules(rows)).toThrow(/Zone 2 cardio/);
  });

  it('does not throw when every row has a progression_rule', () => {
    const rows = [
      { exercise_name: 'Bench press', progression_rule: { weightIncrementKg: 2.5 } },
      { exercise_name: 'Zone 2 cardio', progression_rule: { type: 'polarized', sessionType: 'zone2' } },
    ];
    expect(() => assertProgressionRules(rows)).not.toThrow();
  });
});
