import { generateProgram, type Goal, type IntakeAnswers } from '@fitness/program-generator';
import { beforeEach, describe, expect, it, vi } from 'vitest';

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

// Imported after the mocks so programs.ts's internal `import ... from './db'`/`'./id'` resolve to the mocks above.
const { assertProgressionRules, defaultProgressionRuleFor, insertProgramStructure } = await import('./programs');

interface CallEntry {
  sql: string;
  params: unknown[];
}

function insertCalls(table: string): CallEntry[] {
  return mockDb.runAsync.mock.calls
    .map((call): CallEntry => ({ sql: call[0] as string, params: call[1] as unknown[] }))
    .filter((call) => call.sql.includes(`insert into ${table}`));
}

function intake(goal: Goal): IntakeAnswers {
  return { goal, experienceLevel: 'intermediate', daysPerWeek: 4, equipment: 'gym' };
}

const ALL_GOALS: Goal[] = ['hypertrophy', 'strength', 'endurance', 'fat_loss', 'mixed'];

describe('insertProgramStructure', () => {
  beforeEach(() => {
    idCounter = 0;
    mockDb.runAsync.mockReset();
    mockDb.withTransactionAsync.mockReset().mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  it.each(ALL_GOALS)('inserts a full schema for goal %s without a missing progression_rule', async (goal) => {
    const program = generateProgram(intake(goal));
    const programId = await insertProgramStructure(program);
    expect(programId).toBe('id-0'); // the program row's own id is generated first

    const exerciseRows = insertCalls('day_exercises');
    expect(exerciseRows.length).toBeGreaterThan(0);
    for (const call of exerciseRows) {
      // progression_rule is the last bound param (see the insert column list in programs.ts) and is
      // always a JSON string, never null/undefined — the exact NOT NULL constraint this insert must satisfy.
      const progressionRule = call.params[call.params.length - 2];
      expect(progressionRule).toBeDefined();
      expect(progressionRule).not.toBeNull();
      expect(() => JSON.parse(progressionRule as string)).not.toThrow();
    }
  });

  it('wraps the whole insert in a single transaction', async () => {
    const program = generateProgram(intake('hypertrophy'));
    await insertProgramStructure(program);
    expect(mockDb.withTransactionAsync).toHaveBeenCalledTimes(1);
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
