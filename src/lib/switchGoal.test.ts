import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from './profile';

const mockSupabase = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('./supabase', () => ({ supabase: mockSupabase }));

// Imported after the mock so switchGoal's internal `import { supabase } from './supabase'` resolves to mockSupabase.
const { switchGoal } = await import('./switchGoal');

interface CallEntry {
  table: string;
  op: string;
  args: unknown[];
}

/**
 * Minimal fluent mock of the supabase-js query builder. Each `.from(table)`
 * call gets its own chain that records every method call (insert/update/
 * select/eq/neq/single) into both a per-chain and a shared, ordered call
 * log, then resolves via `.then()` like the real (thenable) builder does.
 * `respond` decides what a chain "returns" based on the table and which
 * operation started it — enough to drive switchGoal's real code path
 * without hand-waving away the actual sequence of writes it makes.
 */
function createMockSupabase(overrides: {
  failOn?: (table: string, op: 'insert' | 'update') => { message: string; code: string } | null;
} = {}) {
  const calls: CallEntry[] = [];

  function respond(table: string, localCalls: CallEntry[]): { data: unknown; error: unknown } {
    const insertCall = localCalls.find((c) => c.op === 'insert');
    const updateCall = localCalls.find((c) => c.op === 'update');

    const failure = overrides.failOn?.(table, insertCall ? 'insert' : updateCall ? 'update' : 'insert');
    if (failure) return { data: null, error: failure };

    if (table === 'programs' && insertCall) return { data: { id: 'new-program-id' }, error: null };
    if (table === 'program_days' && insertCall) {
      const rows = insertCall.args[0] as Array<{ day_order: number }>;
      return { data: rows.map((row, i) => ({ id: `day-${i}`, day_order: row.day_order })), error: null };
    }
    if (table === 'day_exercises' && insertCall) {
      // Simulates the real Postgres NOT NULL constraint on progression_rule — a row
      // missing it fails with the exact 23502 the "Nieuw programma aanmaken" bug produced.
      const rows = insertCall.args[0] as Array<{ progression_rule?: unknown }>;
      const missing = rows.find((row) => row.progression_rule === null || row.progression_rule === undefined);
      if (missing) {
        return { data: null, error: { message: 'null value in column "progression_rule" of relation "day_exercises" violates not-null constraint', code: '23502' } };
      }
      return { data: null, error: null };
    }
    return { data: null, error: null };
  }

  function makeChain(table: string) {
    const localCalls: CallEntry[] = [];
    const chain: Record<string, unknown> = {};
    for (const method of ['insert', 'update', 'delete', 'select', 'eq', 'neq', 'in', 'gte', 'single']) {
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

const profile: Profile = {
  id: 'user-1',
  goal: 'hypertrophy',
  experienceLevel: 'intermediate',
  daysPerWeek: 3,
  equipment: 'gym',
  displayName: null,
  targetPhysique: 'muscular_athletic',
  gender: null,
  birthYear: null,
  targetWeightKg: null,
  preferredWeekdays: null,
};

function findIndex(calls: CallEntry[], table: string, op: string): number {
  return calls.findIndex((c) => c.table === table && c.op === op);
}

describe('switchGoal', () => {
  beforeEach(() => {
    mockSupabase.from.mockReset();
  });

  it('inserts the new program before archiving the old one, and logs a goal_changed adjustment on the new program', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    await switchGoal('user-1', profile, 'strong_powerful');

    const programInsertIndex = findIndex(mock.calls, 'programs', 'insert');
    const programArchiveIndex = findIndex(mock.calls, 'programs', 'update');
    expect(programInsertIndex).toBeGreaterThanOrEqual(0);
    expect(programArchiveIndex).toBeGreaterThan(programInsertIndex);

    // The archive update must exclude the just-created program and only touch active ones.
    const archiveChainCalls = mock.calls.filter((c, i) => i >= programArchiveIndex && c.table === 'programs' && i > programInsertIndex);
    expect(archiveChainCalls.some((c) => c.op === 'neq' && c.args[1] === 'new-program-id')).toBe(true);
    expect(archiveChainCalls.some((c) => c.op === 'eq' && c.args[0] === 'status' && c.args[1] === 'active')).toBe(true);

    const profileUpdateIndex = findIndex(mock.calls, 'profiles', 'update');
    expect(profileUpdateIndex).toBeGreaterThan(programArchiveIndex);
    const profileUpdateCall = mock.calls.find((c) => c.table === 'profiles' && c.op === 'update')!;
    expect(profileUpdateCall.args[0]).toMatchObject({ target_physique: 'strong_powerful', goal: 'strength' });

    const adjustmentInsertCall = mock.calls.find((c) => c.table === 'program_adjustments' && c.op === 'insert')!;
    const adjustmentPayload = adjustmentInsertCall.args[0] as { program_id: string; adjustment_type: string; reason: string };
    expect(adjustmentPayload.program_id).toBe('new-program-id');
    expect(adjustmentPayload.adjustment_type).toBe('goal_changed');
    expect(adjustmentPayload.reason).toContain('hypertrofie');
    expect(adjustmentPayload.reason).toContain('kracht');
  });

  it('schemawissel naar een gebalanceerd doel (kracht + cardio) slaagt zonder fout (regressietest progression_rule)', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    // 'balanced_general' -> goal 'mixed', which generates both strength AND cardio
    // day_exercises rows in the same insert batch — exactly the mixed-kind batch that
    // originally triggered the progression_rule NOT NULL violation.
    await expect(switchGoal('user-1', profile, 'balanced_general')).resolves.toBeUndefined();

    const exerciseInsertCall = mock.calls.find((c) => c.table === 'day_exercises' && c.op === 'insert')!;
    const rows = exerciseInsertCall.args[0] as Array<{ progression_rule?: unknown }>;
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row.progression_rule).toBeDefined();
      expect(row.progression_rule).not.toBeNull();
    }
  });

  it('clears the future calendar schedule (planned/rest, from today) after archiving the old program', async () => {
    const mock = createMockSupabase();
    mockSupabase.from.mockImplementation(mock.from);

    await switchGoal('user-1', profile, 'strong_powerful');

    const programArchiveIndex = findIndex(mock.calls, 'programs', 'update');
    const scheduleDeleteIndex = findIndex(mock.calls, 'scheduled_sessions', 'delete');
    expect(scheduleDeleteIndex).toBeGreaterThan(programArchiveIndex);

    const scheduleCalls = mock.calls.filter((c, i) => c.table === 'scheduled_sessions' && i >= scheduleDeleteIndex);
    expect(scheduleCalls.some((c) => c.op === 'eq' && c.args[0] === 'user_id' && c.args[1] === 'user-1')).toBe(true);
    expect(scheduleCalls.some((c) => c.op === 'in' && c.args[0] === 'status' && (c.args[1] as string[]).sort().join(',') === 'planned,rest')).toBe(true);
    expect(scheduleCalls.some((c) => c.op === 'gte' && c.args[0] === 'scheduled_date')).toBe(true);
  });

  it('schemawissel behoudt logs: never archives the old program if creating the new one fails', async () => {
    const mock = createMockSupabase({
      failOn: (table, op) => (table === 'program_days' && op === 'insert' ? { message: 'permission denied for table program_days', code: '42501' } : null),
    });
    mockSupabase.from.mockImplementation(mock.from);

    await expect(switchGoal('user-1', profile, 'strong_powerful')).rejects.toMatchObject({ code: '42501' });

    // The old program must still be active: the archive step is never reached when program creation fails partway.
    expect(findIndex(mock.calls, 'programs', 'update')).toBe(-1);
  });
});
