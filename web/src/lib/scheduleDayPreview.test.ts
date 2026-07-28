import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./programs', () => ({ fetchProgramDayWithExercises: vi.fn() }));
vi.mock('./history', () => ({ fetchExerciseHistory: vi.fn(), fetchCardioHistory: vi.fn() }));
vi.mock('@fitness/progression-engine', () => ({
  getStrengthAdvice: vi.fn(),
  computeWeeklyDistribution: vi.fn(),
  adviseNextCardioType: vi.fn(),
  adviseCardioProgression: vi.fn(),
}));

const { fetchProgramDayWithExercises } = await import('./programs');
const { fetchExerciseHistory, fetchCardioHistory } = await import('./history');
const { getStrengthAdvice, computeWeeklyDistribution, adviseNextCardioType, adviseCardioProgression } = await import('@fitness/progression-engine');
const { fetchSchedulePreview } = await import('./scheduleDayPreview');

// `adviseCardioProgression` is overloaded (Zone2Advice for 'zone2', IntervalAdvice for 'interval');
// vi.mocked's inferred type collapses that to a single signature, so this test drives the mock
// through a loosely-typed handle instead of fighting the overload for each call shape.
const mockAdviseCardioProgression = adviseCardioProgression as unknown as { mockReturnValueOnce: (value: unknown) => void };

const restRow = {
  id: 'row-rest',
  date: '2026-07-20',
  status: 'rest' as const,
  programDayId: null,
  programDayName: null,
  programDayOrder: null,
  programDayKind: null,
};

const strengthRow = {
  id: 'row-strength',
  date: '2026-07-20',
  status: 'planned' as const,
  programDayId: 'day-1',
  programDayName: 'Push A',
  programDayOrder: 1,
  programDayKind: 'strength' as const,
};

const cardioRow = {
  id: 'row-cardio',
  date: '2026-07-21',
  status: 'planned' as const,
  programDayId: 'day-2',
  programDayName: 'Zone 2 cardio',
  programDayOrder: 4,
  programDayKind: 'cardio' as const,
};

describe('fetchSchedulePreview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a rest preview without fetching anything for a row with no program day', async () => {
    const result = await fetchSchedulePreview('user-1', restRow, 'mixed');
    expect(result).toEqual({ type: 'rest' });
    expect(fetchProgramDayWithExercises).not.toHaveBeenCalled();
  });

  it('returns null when the scheduled program day no longer exists', async () => {
    vi.mocked(fetchProgramDayWithExercises).mockResolvedValueOnce(null);
    const result = await fetchSchedulePreview('user-1', strengthRow, 'mixed');
    expect(result).toBeNull();
  });

  it('builds a strength preview with advice when exercise history exists', async () => {
    vi.mocked(fetchProgramDayWithExercises).mockResolvedValueOnce({
      id: 'day-1',
      name: 'Push A',
      exercises: [
        {
          id: 'ex-1',
          exerciseOrder: 1,
          exerciseName: 'Barbell Bench Press',
          muscleGroup: 'Borst',
          kind: 'strength',
          exerciseType: 'compound',
          sets: 4,
          repRangeMin: 6,
          repRangeMax: 10,
          targetRIR: 2,
          weightIncrementKg: 2.5,
        },
      ],
    });
    vi.mocked(fetchExerciseHistory).mockResolvedValueOnce([{ workoutId: 'w-1', performedAt: '2026-07-13', sets: [{ setOrder: 1, weightKg: 60, reps: 8, rir: 2 }] }]);
    vi.mocked(getStrengthAdvice).mockReturnValueOnce({
      action: 'increase_weight',
      weightKg: 62.5,
      weightChangePercent: 4,
      targetReps: { min: 6, max: 10 },
      targetRIR: 2,
      explanation: 'Vorige keer ruim binnen bereik.',
    });

    const result = await fetchSchedulePreview('user-1', strengthRow, 'mixed');

    expect(result).toEqual({
      type: 'training',
      programDayName: 'Push A',
      exercises: [
        {
          kind: 'strength',
          exerciseName: 'Barbell Bench Press',
          sets: 4,
          repRangeMin: 6,
          repRangeMax: 10,
          targetRIR: 2,
          adviceWeightKg: 62.5,
          adviceExplanation: 'Vorige keer ruim binnen bereik.',
        },
      ],
    });
  });

  it('leaves advice null when the exercise has no history yet', async () => {
    vi.mocked(fetchProgramDayWithExercises).mockResolvedValueOnce({
      id: 'day-1',
      name: 'Push A',
      exercises: [
        {
          id: 'ex-1',
          exerciseOrder: 1,
          exerciseName: 'Barbell Bench Press',
          muscleGroup: 'Borst',
          kind: 'strength',
          exerciseType: 'compound',
          sets: 4,
          repRangeMin: 6,
          repRangeMax: 10,
          targetRIR: 2,
          weightIncrementKg: 2.5,
        },
      ],
    });
    vi.mocked(fetchExerciseHistory).mockResolvedValueOnce([]);

    const result = await fetchSchedulePreview('user-1', strengthRow, 'mixed');

    expect(result?.type).toBe('training');
    if (result?.type === 'training') {
      expect(result.exercises[0]).toMatchObject({ adviceWeightKg: null, adviceExplanation: null });
    }
    expect(getStrengthAdvice).not.toHaveBeenCalled();
  });

  it('builds a cardio preview from the recommended type and progression advice', async () => {
    vi.mocked(fetchProgramDayWithExercises).mockResolvedValueOnce({
      id: 'day-2',
      name: 'Zone 2 cardio',
      exercises: [
        {
          id: 'ex-2',
          exerciseOrder: 1,
          exerciseName: 'Zone 2 cardio',
          muscleGroup: null,
          kind: 'cardio_duration',
          exerciseType: null,
          sets: null,
          repRangeMin: null,
          repRangeMax: null,
          targetRIR: null,
          weightIncrementKg: 1.25,
        },
      ],
    });
    vi.mocked(fetchCardioHistory).mockResolvedValueOnce([]);
    const distribution = { windowDays: 10, lowMinutes: 40, highMinutes: 0, totalMinutes: 40, intensePercent: 0 };
    vi.mocked(computeWeeklyDistribution).mockReturnValueOnce(distribution);
    vi.mocked(adviseNextCardioType).mockReturnValueOnce({
      recommendedType: 'zone2',
      targetZone2Percent: 80,
      explanation: 'Nog geen zone 2 deze week.',
      distribution,
    });
    mockAdviseCardioProgression.mockReturnValueOnce({
      action: 'maintain',
      durationMinutes: 25,
      durationChangePercent: 0,
      explanation: 'Bouw rustig op.',
    });

    const result = await fetchSchedulePreview('user-1', cardioRow, 'endurance');

    expect(result).toEqual({
      type: 'training',
      programDayName: 'Zone 2 cardio',
      exercises: [
        {
          kind: 'cardio',
          exerciseName: 'Zone 2 cardio',
          sessionType: 'zone2',
          durationMinutes: 25,
          explanation: 'Nog geen zone 2 deze week. Bouw rustig op.',
        },
      ],
    });
  });
});
