import { describe, expect, it } from 'vitest';
import { ALL_MUSCLE_GROUPS, candidateExercisesForMuscleGroup, isHeavyLowerBodyDay, MOVEMENT_SLOTS } from '../src/exercises';

describe('candidateExercisesForMuscleGroup', () => {
  it('returns every gym variant that targets the same muscle group', () => {
    const candidates = candidateExercisesForMuscleGroup('Borst', 'gym');
    expect(candidates).toContain('Barbell Bench Press');
    expect(candidates).toContain('Incline Dumbbell Press');
  });

  it('excludes the current exercise when given', () => {
    const candidates = candidateExercisesForMuscleGroup('Borst', 'gym', 'Barbell Bench Press');
    expect(candidates).not.toContain('Barbell Bench Press');
    expect(candidates).toContain('Incline Dumbbell Press');
  });

  it('never returns an exercise from a different muscle group', () => {
    const candidates = candidateExercisesForMuscleGroup('Borst', 'gym');
    expect(candidates).not.toContain('Barbell Squat');
    expect(candidates).not.toContain('Barbell Curl');
  });

  it('respects the requested equipment', () => {
    const candidates = candidateExercisesForMuscleGroup('Borst', 'bodyweight');
    expect(candidates).toContain('Push-up');
    expect(candidates).not.toContain('Barbell Bench Press');
  });

  it('returns no duplicates even when multiple slots share a muscle group', () => {
    const candidates = candidateExercisesForMuscleGroup('Rug', 'gym');
    expect(new Set(candidates).size).toBe(candidates.length);
  });

  it('returns an empty list for an unknown muscle group', () => {
    expect(candidateExercisesForMuscleGroup('Onbekend', 'gym')).toEqual([]);
  });

  it('is derived from MOVEMENT_SLOTS, not a separate hardcoded list', () => {
    const chestSlotNames = new Set<string>();
    for (const slot of Object.values(MOVEMENT_SLOTS)) {
      if (slot.muscleGroup !== 'Borst') continue;
      chestSlotNames.add(slot.variants.A.gym);
      chestSlotNames.add(slot.variants.B.gym);
    }
    expect(new Set(candidateExercisesForMuscleGroup('Borst', 'gym'))).toEqual(chestSlotNames);
  });
});

describe('ALL_MUSCLE_GROUPS', () => {
  it('lists every distinct muscle group used across MOVEMENT_SLOTS, with no duplicates', () => {
    const expected = new Set(Object.values(MOVEMENT_SLOTS).map((slot) => slot.muscleGroup));
    expect(new Set(ALL_MUSCLE_GROUPS)).toEqual(expected);
    expect(ALL_MUSCLE_GROUPS.length).toBe(expected.size);
  });
});

describe('isHeavyLowerBodyDay', () => {
  it('is true for a day with a compound squat', () => {
    expect(isHeavyLowerBodyDay([{ exerciseType: 'compound', muscleGroup: 'Benen' }])).toBe(true);
  });

  it('is true for a day with a compound hinge lift', () => {
    expect(isHeavyLowerBodyDay([{ exerciseType: 'compound', muscleGroup: 'Bilspieren/Hamstrings' }])).toBe(true);
  });

  it('is false for isolation leg work only (e.g. leg extension day)', () => {
    expect(isHeavyLowerBodyDay([{ exerciseType: 'isolation', muscleGroup: 'Benen' }])).toBe(false);
  });

  it('is false for an upper-body day', () => {
    expect(
      isHeavyLowerBodyDay([
        { exerciseType: 'compound', muscleGroup: 'Borst' },
        { exerciseType: 'compound', muscleGroup: 'Rug' },
      ]),
    ).toBe(false);
  });

  it('is false for an empty (e.g. cardio-only) day', () => {
    expect(isHeavyLowerBodyDay([])).toBe(false);
  });

  it('handles a null muscleGroup (cardio exercises) without throwing', () => {
    expect(isHeavyLowerBodyDay([{ exerciseType: null, muscleGroup: null }])).toBe(false);
  });
});
