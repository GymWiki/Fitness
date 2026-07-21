import { describe, expect, it } from 'vitest';
import { CARDIO_BASELINE_BY_GOAL, weeklyCardioMinutes } from '../src/cardioBaseline';
import { generateProgram } from '../src/generate';
import { selectTemplateKey } from '../src/templates';
import type { GeneratedDay, Goal, IntakeAnswers } from '../src/types';

function intake(overrides: Partial<IntakeAnswers> = {}): IntakeAnswers {
  return {
    goal: 'hypertrophy',
    experienceLevel: 'intermediate',
    daysPerWeek: 3,
    equipment: 'gym',
    ...overrides,
  };
}

function strengthDays(days: GeneratedDay[]): GeneratedDay[] {
  return days.filter((day) => day.exercises.length > 0);
}

function cardioDays(days: GeneratedDay[]): GeneratedDay[] {
  return days.filter((day) => day.cardioSessions.length > 0);
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

  it('builds one strength day per requested day-per-week, in order, starting at 1, with cardio days appended after', () => {
    const program = generateProgram(intake({ daysPerWeek: 3 }));
    const strength = strengthDays(program.days);
    expect(strength).toHaveLength(3);
    expect(strength.map((d) => d.dayOrder)).toEqual([1, 2, 3]);

    const cardio = cardioDays(program.days);
    expect(cardio.length).toBeGreaterThan(0);
    // dayOrder keeps counting up without gaps or overlap with the strength days.
    expect(cardio.map((d) => d.dayOrder)).toEqual(cardio.map((_, i) => 4 + i));
  });

  it('cycles full-body A/B days for a 2-day week, with a cardio day after them', () => {
    const program = generateProgram(intake({ daysPerWeek: 2 }));
    expect(program.templateKey).toBe('full_body_3x');
    expect(strengthDays(program.days).map((d) => d.name)).toEqual(['Full Body A', 'Full Body B']);
    expect(cardioDays(program.days).length).toBeGreaterThan(0);
  });

  it('gives every full-body day the same set of movement patterns, each exactly once', () => {
    const program = generateProgram(intake({ daysPerWeek: 3 }));
    for (const day of strengthDays(program.days)) {
      const muscleGroups = day.exercises.map((e) => e.muscleGroup);
      expect(new Set(muscleGroups).size).toBe(muscleGroups.length);
      expect(day.exercises).toHaveLength(6);
    }
  });

  it('builds a real upper/lower split for 4 days per week', () => {
    const program = generateProgram(intake({ daysPerWeek: 4, goal: 'strength' }));
    expect(program.templateKey).toBe('upper_lower_4x');
    expect(strengthDays(program.days).map((d) => d.name)).toEqual([
      'Bovenlichaam A',
      'Onderlichaam A',
      'Bovenlichaam B',
      'Onderlichaam B',
    ]);
  });

  it('cycles upper/lower archetypes with modulo for a 5-day week instead of repeating verbatim', () => {
    const program = generateProgram(intake({ daysPerWeek: 5 }));
    expect(strengthDays(program.days).map((d) => d.name)).toEqual([
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

  describe('cardio baseline per goal (bugfix: cardio was missing from every schema, not just mixed)', () => {
    function totalCardioMinutesFor(goal: Goal): number {
      const program = generateProgram(intake({ goal, daysPerWeek: 3 }));
      return cardioDays(program.days).reduce(
        (sum, day) => sum + day.cardioSessions.reduce((daySum, session) => daySum + session.durationMinutes, 0),
        0,
      );
    }

    it('mixed gets a substantial, balanced cardio component: 1-2 sessions per week', () => {
      const program = generateProgram(intake({ goal: 'mixed', daysPerWeek: 3 }));
      const cardio = cardioDays(program.days);
      expect(cardio.length).toBeGreaterThanOrEqual(1);
      expect(cardio.length).toBeLessThanOrEqual(2);
      // Every cardio session actually made it into a day_exercise-shaped session, not an empty day.
      for (const day of cardio) {
        expect(day.cardioSessions.length).toBeGreaterThan(0);
      }
    });

    it('hypertrophy and strength get a small, non-zero cardio base (interference-conscious)', () => {
      for (const goal of ['hypertrophy', 'strength'] as const) {
        const program = generateProgram(intake({ goal, daysPerWeek: 4 }));
        const cardio = cardioDays(program.days);
        expect(cardio.length).toBeGreaterThan(0);
        expect(totalCardioMinutesFor(goal)).toBeLessThan(totalCardioMinutesFor('mixed'));
      }
    });

    it('fat_loss and endurance keep cardio as the dominant component (no regression vs. the intended design)', () => {
      for (const goal of ['fat_loss', 'endurance'] as const) {
        expect(totalCardioMinutesFor(goal)).toBeGreaterThan(totalCardioMinutesFor('mixed'));
        expect(totalCardioMinutesFor(goal)).toBeGreaterThanOrEqual(weeklyCardioMinutes(goal));
      }
    });

    it('every goal has a positive cardio baseline (health-baseline requirement) and the config lives in one table', () => {
      for (const goal of Object.keys(CARDIO_BASELINE_BY_GOAL) as Goal[]) {
        expect(CARDIO_BASELINE_BY_GOAL[goal].sessionsPerWeek).toBeGreaterThan(0);
        expect(CARDIO_BASELINE_BY_GOAL[goal].minutesPerSession).toBeGreaterThan(0);
      }
    });

    it('cardio days never carry strength exercises and vice versa', () => {
      const program = generateProgram(intake({ goal: 'mixed', daysPerWeek: 4 }));
      for (const day of program.days) {
        const isCardioDay = day.cardioSessions.length > 0;
        const isStrengthDay = day.exercises.length > 0;
        expect(isCardioDay && isStrengthDay).toBe(false);
        expect(isCardioDay || isStrengthDay).toBe(true);
      }
    });
  });
});
