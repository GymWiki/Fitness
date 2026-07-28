import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/supabase/singleton', () => ({ supabase: mockSupabase }));

// Imported after the mock so schemaEditor.ts's internal `import { supabase } from '@/lib/supabase/singleton'` resolves to mockSupabase.
const { addExercise } = await import('./schemaEditor');

interface CallEntry {
  op: string;
  args: unknown[];
}

/** Minimal fluent mock of the supabase-js query builder — same pattern as programs.test.ts/switchGoal.test.ts. */
function createMockSupabase() {
  const calls: CallEntry[] = [];

  function makeChain() {
    const chain: Record<string, unknown> = {};
    for (const method of ['insert', 'eq']) {
      chain[method] = (...args: unknown[]) => {
        calls.push({ op: method, args });
        return chain;
      };
    }
    chain.then = (resolve: (value: { data: unknown; error: unknown }) => void) => resolve({ data: null, error: null });
    return chain;
  }

  return { from: vi.fn(() => makeChain()), calls };
}

describe('addExercise', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  it('inserts a strength row with a defined progression_rule (never NULL, matching the NOT NULL constraint)', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    await addExercise('day-1', 3, {
      exerciseName: 'Barbell Curl',
      muscleGroup: 'Biceps',
      exerciseType: 'isolation',
      sets: 3,
      repRangeMin: 10,
      repRangeMax: 15,
      targetRIR: 1,
      weightIncrementKg: 1.25,
    });

    const insertCall = mock.calls.find((c) => c.op === 'insert')!;
    const row = insertCall.args[0] as Record<string, unknown>;
    expect(row.progression_rule).toEqual({ weightIncrementKg: 1.25 });
    expect(row.kind).toBe('strength');
  });

  it('appends after the existing exercises (exercise_order = nextExerciseOrder) rather than always starting at 1', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    await addExercise('day-1', 4, {
      exerciseName: 'Cable Crunch',
      muscleGroup: 'Core',
      exerciseType: 'isolation',
      sets: 3,
      repRangeMin: 12,
      repRangeMax: 15,
      targetRIR: 1,
      weightIncrementKg: 1.25,
    });

    const insertCall = mock.calls.find((c) => c.op === 'insert')!;
    const row = insertCall.args[0] as { exercise_order: number; program_day_id: string };
    expect(row.exercise_order).toBe(4);
    expect(row.program_day_id).toBe('day-1');
  });

  it('carries the muscle group and exercise type through, so isHeavyLowerBodyDay stays accurate after a manual add', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    await addExercise('day-1', 5, {
      exerciseName: 'Barbell Squat',
      muscleGroup: 'Benen',
      exerciseType: 'compound',
      sets: 4,
      repRangeMin: 6,
      repRangeMax: 10,
      targetRIR: 2,
      weightIncrementKg: 2.5,
    });

    const insertCall = mock.calls.find((c) => c.op === 'insert')!;
    const row = insertCall.args[0] as { muscle_group: string; exercise_type: string };
    expect(row.muscle_group).toBe('Benen');
    expect(row.exercise_type).toBe('compound');
  });
});
