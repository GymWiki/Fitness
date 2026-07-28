import { describe, expect, it } from 'vitest';
import { REST_GUIDANCE_BY_GOAL, restGuidanceFor } from './restGuidance';

describe('restGuidanceFor', () => {
  it('gives strength goals the longer, ~2-3 minute guideline', () => {
    expect(restGuidanceFor('strength')).toMatch(/2-3 min/);
  });

  it('gives non-strength-focused goals the shorter, 60-90 second guideline', () => {
    for (const goal of ['hypertrophy', 'mixed', 'endurance', 'fat_loss'] as const) {
      expect(restGuidanceFor(goal)).toMatch(/60-90 sec/);
    }
  });

  it('covers every Goal value with a non-empty guideline', () => {
    for (const guidance of Object.values(REST_GUIDANCE_BY_GOAL)) {
      expect(guidance.length).toBeGreaterThan(0);
    }
  });
});
