import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Profile } from './profile';

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

// Imported after the mocks so switchGoal's (and programs.ts's/profile.tsx's) internal `import ... from './db'`/`'./id'` resolve to the mocks above.
const { switchGoal } = await import('./switchGoal');

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

const profile: Profile = {
  id: 'local',
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

describe('switchGoal', () => {
  beforeEach(() => {
    idCounter = 0;
    mockDb.runAsync.mockReset();
    mockDb.withTransactionAsync.mockReset().mockImplementation(async (fn: () => Promise<unknown>) => fn());
  });

  it('inserts the new program before archiving the old one, and logs a goal_changed adjustment on the new program', async () => {
    await switchGoal(profile, 'strong_powerful');

    const programInsertIndex = findIndex('insert into programs');
    const programArchiveIndex = findIndex("update programs set status = 'archived'");
    expect(programInsertIndex).toBeGreaterThanOrEqual(0);
    expect(programArchiveIndex).toBeGreaterThan(programInsertIndex);

    // The new program's id (the very first id generated) must be excluded from the archive update.
    const archiveCall = calls()[programArchiveIndex]!;
    expect(archiveCall.params).toEqual(['id-0']);

    const profileUpdateIndex = findIndex('update profiles set');
    expect(profileUpdateIndex).toBeGreaterThan(programArchiveIndex);
    const profileUpdateCall = calls()[profileUpdateIndex]!;
    expect(profileUpdateCall.sql).toContain('target_physique = ?');
    expect(profileUpdateCall.sql).toContain('goal = ?');
    expect(profileUpdateCall.params).toContain('strong_powerful');
    expect(profileUpdateCall.params).toContain('strength');

    const adjustmentIndex = findIndex('insert into program_adjustments');
    const adjustmentCall = calls()[adjustmentIndex]!;
    expect(adjustmentCall.sql).toContain("'goal_changed'");
    expect(adjustmentCall.params[1]).toBe('id-0'); // program_id
    expect(adjustmentCall.params[2]).toContain('hypertrofie');
    expect(adjustmentCall.params[2]).toContain('kracht');
  });

  it('schemawissel naar een gebalanceerd doel (kracht + cardio) slaagt zonder fout (regressietest progression_rule)', async () => {
    // 'balanced_general' -> goal 'mixed', which generates both strength AND cardio day_exercises
    // rows in the same insert batch — exactly the mixed-kind batch that originally triggered the
    // progression_rule NOT NULL violation.
    await expect(switchGoal(profile, 'balanced_general')).resolves.toBeUndefined();

    const exerciseRows = calls().filter((c) => c.sql.includes('insert into day_exercises'));
    expect(exerciseRows.length).toBeGreaterThan(0);
    for (const call of exerciseRows) {
      const progressionRule = call.params[call.params.length - 2];
      expect(progressionRule).toBeDefined();
      expect(progressionRule).not.toBeNull();
    }
  });

  it('clears the future calendar schedule (planned/rest, from today) after archiving the old program', async () => {
    await switchGoal(profile, 'strong_powerful');

    const programArchiveIndex = findIndex("update programs set status = 'archived'");
    const scheduleDeleteIndex = findIndex('delete from scheduled_sessions');
    expect(scheduleDeleteIndex).toBeGreaterThan(programArchiveIndex);

    const deleteCall = calls()[scheduleDeleteIndex]!;
    expect(deleteCall.sql).toContain("status in ('planned', 'rest')");
    expect(deleteCall.sql).toContain('scheduled_date >= ?');
  });

  it('schemawissel behoudt logs: never archives the old program if creating the new one fails', async () => {
    mockDb.runAsync.mockImplementation(async (sql: string) => {
      if (sql.includes('insert into program_days')) {
        throw new Error('permission denied for table program_days');
      }
      return { changes: 0, lastInsertRowId: 0 };
    });

    await expect(switchGoal(profile, 'strong_powerful')).rejects.toThrow(/Nieuw programma aanmaken/);

    // The old program must still be active: the archive step is never reached when program creation fails partway.
    expect(findIndex("update programs set status = 'archived'")).toBe(-1);
  });
});
