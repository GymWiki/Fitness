import { describe, expect, it } from 'vitest';
import { buildCardioSessionTypes, CARDIO_BASELINE_BY_GOAL, weeklyCardioMinutes } from '../src/cardioBaseline';
import type { Goal } from '../src/types';

describe('buildCardioSessionTypes', () => {
  it('returns nothing for 0 or negative sessions', () => {
    expect(buildCardioSessionTypes(0)).toEqual([]);
    expect(buildCardioSessionTypes(-1)).toEqual([]);
  });

  it('starts a single-session week with zone2, never a hard interval cold', () => {
    expect(buildCardioSessionTypes(1)).toEqual(['zone2']);
  });

  it('introduces interval work once a second session is added', () => {
    expect(buildCardioSessionTypes(2)).toEqual(['zone2', 'interval']);
  });

  it('approximates a polarized split at 3 sessions: two easy, one hard', () => {
    const sessions = buildCardioSessionTypes(3);
    expect(sessions).toHaveLength(3);
    expect(sessions.filter((s) => s === 'zone2')).toHaveLength(2);
    expect(sessions.filter((s) => s === 'interval')).toHaveLength(1);
  });

  it('keeps a single hard session and fills the rest with zone2 beyond 3 sessions', () => {
    const sessions = buildCardioSessionTypes(5);
    expect(sessions).toHaveLength(5);
    expect(sessions.filter((s) => s === 'interval')).toHaveLength(1);
    expect(sessions.filter((s) => s === 'zone2')).toHaveLength(4);
  });
});

describe('weeklyCardioMinutes', () => {
  it('multiplies sessions per week by minutes per session for every goal', () => {
    for (const goal of Object.keys(CARDIO_BASELINE_BY_GOAL) as Goal[]) {
      const baseline = CARDIO_BASELINE_BY_GOAL[goal];
      expect(weeklyCardioMinutes(goal)).toBe(baseline.sessionsPerWeek * baseline.minutesPerSession);
    }
  });
});
