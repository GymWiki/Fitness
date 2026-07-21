import { ALL_MUSCLE_GROUPS } from '@fitness/program-generator';
import type { RecoveryEstimate } from '@fitness/progression-engine';
import { describe, expect, it } from 'vitest';
import { describeRegionTap, MUSCLE_GROUP_REGIONS, regionsForView } from './bodyDiagramRegions';

function estimate(overrides: Partial<RecoveryEstimate>): RecoveryEstimate {
  return {
    status: 'ready',
    hoursSinceSession: 50,
    windowStartHours: 48,
    windowEndHours: 96,
    explanation: 'default explanation',
    ...overrides,
  };
}

describe('MUSCLE_GROUP_REGIONS', () => {
  it('has exactly one region per muscle group the generator actually uses — never drifts out of sync', () => {
    const regionGroups = MUSCLE_GROUP_REGIONS.map((region) => region.muscleGroup);
    expect(new Set(regionGroups)).toEqual(new Set(ALL_MUSCLE_GROUPS));
    expect(regionGroups.length).toBe(ALL_MUSCLE_GROUPS.length);
  });

  it('every region has at least one shape', () => {
    for (const region of MUSCLE_GROUP_REGIONS) {
      expect(region.shapes.length).toBeGreaterThan(0);
    }
  });

  it('splits every muscle group across front and back with no overlap and no gaps', () => {
    const front = regionsForView('front').map((r) => r.muscleGroup);
    const back = regionsForView('back').map((r) => r.muscleGroup);
    expect(new Set(front).size).toBe(front.length);
    expect(new Set(back).size).toBe(back.length);
    expect(front.filter((g) => back.includes(g))).toEqual([]);
    expect(new Set([...front, ...back])).toEqual(new Set(ALL_MUSCLE_GROUPS));
  });

  it('front and back views each show at least one muscle group (both views are actually populated)', () => {
    expect(regionsForView('front').length).toBeGreaterThan(0);
    expect(regionsForView('back').length).toBeGreaterThan(0);
  });
});

describe('describeRegionTap', () => {
  it('reports the current status label and explanation for a recovering muscle group', () => {
    const info = describeRegionTap('Borst', estimate({ status: 'recovering', explanation: 'Nog aan het herstellen.' }));
    expect(info.muscleGroup).toBe('Borst');
    expect(info.statusLabel).toBe('Herstellend');
    expect(info.explanation).toBe('Nog aan het herstellen.');
  });

  it('reports "Hersteld" for a ready muscle group', () => {
    const info = describeRegionTap('Rug', estimate({ status: 'ready', explanation: 'Het venster is open.' }));
    expect(info.statusLabel).toBe('Hersteld');
    expect(info.explanation).toBe('Het venster is open.');
  });

  it('reports the window-closing label distinctly from ready', () => {
    const info = describeRegionTap('Benen', estimate({ status: 'window_closing', explanation: 'Bijna dicht.' }));
    expect(info.statusLabel).toBe('Venster sluit');
    expect(info.statusLabel).not.toBe('Hersteld');
  });

  it('reports the window-passed label for an old session', () => {
    const info = describeRegionTap('Kuiten', estimate({ status: 'window_passed', explanation: 'Venster voorbij.' }));
    expect(info.statusLabel).toBe('Venster voorbij');
  });

  it('reports "Klaar om te starten" when there is no prior session', () => {
    const info = describeRegionTap('Triceps', estimate({ status: 'no_data', hoursSinceSession: null, explanation: 'Nog geen sessie.' }));
    expect(info.statusLabel).toBe('Klaar om te starten');
    expect(info.explanation).toBe('Nog geen sessie.');
  });

  it('always reflects the passed-in estimate, never a stale/cached one', () => {
    const first = describeRegionTap('Borst', estimate({ status: 'recovering', explanation: 'Eerste' }));
    const second = describeRegionTap('Borst', estimate({ status: 'ready', explanation: 'Tweede' }));
    expect(first.explanation).toBe('Eerste');
    expect(second.explanation).toBe('Tweede');
    expect(first.statusLabel).not.toBe(second.statusLabel);
  });
});
