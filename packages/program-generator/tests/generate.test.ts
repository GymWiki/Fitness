import { describe, expect, it } from 'vitest';
import { generateProgram } from '../src/generate';
import { selectTemplateKey } from '../src/templates';
import type { IntakeAnswers } from '../src/types';

function intake(overrides: Partial<IntakeAnswers> = {}): IntakeAnswers {
  return {
    goal: 'hypertrophy',
    experienceLevel: 'intermediate',
    daysPerWeek: 3,
    equipment: 'gym',
    ...overrides,
  };
}

describe('selectTemplateKey', () => {
  it('picks full body for 2-3 days per week', () => {
    expect(selectTemplateKey(2)).toBe('full_body_3x');
    expect(selectTemplateKey(3)).toBe('full_body_3x');
  });

  it('picks upper/lower for 4+ days per week', () => {
    expect(selectTemplateKey(4)).toBe('upper_lower_4x');
    expect(selectTemplateKey(6)).toBe('upper_lower_4x');
  });
});

describe('generateProgram', () => {
  it('rejects daysPerWeek outside the 2-6 range', () => {
    expect(() => generateProgram(intake({ daysPerWeek: 1 }))).toThrow();
    expect(() => generateProgram(intake({ daysPerWeek: 7 }))).toThrow();
  });

  it('builds one day per requested day-per-week, in order, starting at 1', () => {
    const program = generateProgram(intake({ daysPerWeek: 3 }));
    expect(program.days).toHaveLength(3);
    expect(program.days.map((d) => d.dayOrder)).toEqual([1, 2, 3]);
  });

  it('cycles full-body A/B days for a 2-day week', () => {
    const program = generateProgram(intake({ daysPerWeek: 2 }));
    expect(program.templateKey).toBe('full_body_3x');
    expect(program.days.map((d) => d.name)).toEqual(['Full Body A', 'Full Body B']);
  });

  it('gives every full-body day the same set of movement patterns, each exactly once', () => {
    const program = generateProgram(intake({ daysPerWeek: 3 }));
    for (const day of program.days) {
      const muscleGroups = day.exercises.map((e) => e.muscleGroup);
      expect(new Set(muscleGroups).size).toBe(muscleGroups.length);
      expect(day.exercises).toHaveLength(6);
    }
  });

  it('builds a real upper/lower split for 4 days per week', () => {
    const program = generateProgram(intake({ daysPerWeek: 4, goal: 'strength' }));
    expect(program.templateKey).toBe('upper_lower_4x');
    expect(program.days.map((d) => d.name)).toEqual([
      'Bovenlichaam A',
      'Onderlichaam A',
      'Bovenlichaam B',
      'Onderlichaam B',
    ]);
  });

  it('cycles upper/lower archetypes with modulo for a 5-day week instead of repeating verbatim', () => {
    const program = generateProgram(intake({ daysPerWeek: 5 }));
    expect(program.days.map((d) => d.name)).toEqual([
      'Bovenlichaam A',
      'Onderlichaam A',
      'Bovenlichaam B',
      'Onderlichaam B',
      'Bovenlichaam A',
    ]);
  });

  it('every exercise has a positive set count and a valid, ordered rep range', () => {
    const program = generateProgram(intake({ daysPerWeek: 4, goal: 'endurance' }));
    for (const day of program.days) {
      for (const exercise of day.exercises) {
        expect(exercise.sets).toBeGreaterThan(0);
        expect(exercise.repRangeMin).toBeGreaterThan(0);
        expect(exercise.repRangeMax).toBeGreaterThanOrEqual(exercise.repRangeMin);
        expect(exercise.targetRIR).toBeGreaterThanOrEqual(0);
        expect(exercise.weightIncrementKg).toBeGreaterThan(0);
      }
    }
  });

  it('gives beginners more RIR reserve and advanced lifters less, relative to intermediate', () => {
    const beginner = generateProgram(intake({ experienceLevel: 'beginner' })).days[0]!.exercises[0]!;
    const intermediate = generateProgram(intake({ experienceLevel: 'intermediate' })).days[0]!.exercises[0]!;
    const advanced = generateProgram(intake({ experienceLevel: 'advanced' })).days[0]!.exercises[0]!;

    expect(beginner.targetRIR).toBe(intermediate.targetRIR + 1);
    expect(advanced.targetRIR).toBe(intermediate.targetRIR - 1);
  });

  it('swaps exercise names by equipment while keeping the same structure', () => {
    const gym = generateProgram(intake({ equipment: 'gym' }));
    const bodyweight = generateProgram(intake({ equipment: 'bodyweight' }));

    expect(gym.days[0]!.exercises[0]!.exerciseName).not.toBe(bodyweight.days[0]!.exercises[0]!.exerciseName);
    expect(gym.days[0]!.exercises.map((e) => e.muscleGroup)).toEqual(
      bodyweight.days[0]!.exercises.map((e) => e.muscleGroup),
    );
  });

  it('uses a larger weight increment for gym compound barbell-style lifts than isolation work', () => {
    const program = generateProgram(intake({ equipment: 'gym', daysPerWeek: 4 }));
    const compound = program.days[0]!.exercises.find((e) => e.exerciseType === 'compound')!;
    const isolation = program.days[0]!.exercises.find((e) => e.exerciseType === 'isolation')!;
    expect(compound.weightIncrementKg).toBeGreaterThan(isolation.weightIncrementKg);
  });

  it('names the program with the template label and the actual requested frequency', () => {
    const program = generateProgram(intake({ daysPerWeek: 5 }));
    expect(program.name).toBe('Upper/Lower Split (5x per week)');
  });
});
