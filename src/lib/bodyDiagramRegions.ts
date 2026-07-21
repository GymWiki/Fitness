import type { RecoveryEstimate } from '@fitness/progression-engine';
import { STATUS_LABEL } from './recoveryLabels';

export type BodyDiagramView = 'front' | 'back';

interface RegionRect {
  type: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rx: number;
}

interface RegionCircle {
  type: 'circle';
  cx: number;
  cy: number;
  r: number;
}

export type RegionShape = RegionRect | RegionCircle;

export interface MuscleGroupRegion {
  muscleGroup: string;
  view: BodyDiagramView;
  /** Usually two shapes (bilateral: left + right), sometimes one (e.g. torso muscles). */
  shapes: RegionShape[];
}

/**
 * Placeholder-quality region geometry over a simple, generic androgynous
 * silhouette (viewBox 0 0 200 420) — recognizable body zones, not
 * anatomically sculpted paths. Swap for a nicer illustration later; the
 * region list itself (which muscle group goes on which view) should stay
 * stable since it's driven by `ALL_MUSCLE_GROUPS`.
 *
 * Front/back split follows the app's own muscle-group vocabulary
 * (program-generator's MOVEMENT_SLOTS): the compound "hinge" movement
 * (deadlift-family) is tagged 'Bilspieren/Hamstrings' while the isolation
 * hamstring curl is tagged plain 'Hamstrings' — two distinct data-model
 * groups that anatomically overlap. Rather than merging them (which would
 * require combining two independent recovery estimates into one color,
 * i.e. new logic), they get two adjacent, separately-tappable regions on
 * the back view: the glute/upper-hamstring area and the lower-hamstring
 * area.
 */
export const MUSCLE_GROUP_REGIONS: MuscleGroupRegion[] = [
  // --- Front ---
  { muscleGroup: 'Borst', view: 'front', shapes: [{ type: 'rect', x: 66, y: 68, width: 68, height: 36, rx: 12 }] },
  { muscleGroup: 'Core', view: 'front', shapes: [{ type: 'rect', x: 74, y: 108, width: 52, height: 54, rx: 10 }] },
  {
    muscleGroup: 'Schouders',
    view: 'front',
    shapes: [
      { type: 'circle', cx: 52, cy: 72, r: 16 },
      { type: 'circle', cx: 148, cy: 72, r: 16 },
    ],
  },
  {
    muscleGroup: 'Biceps',
    view: 'front',
    shapes: [
      { type: 'rect', x: 40, y: 88, width: 20, height: 55, rx: 10 },
      { type: 'rect', x: 140, y: 88, width: 20, height: 55, rx: 10 },
    ],
  },
  {
    muscleGroup: 'Benen',
    view: 'front',
    shapes: [
      { type: 'rect', x: 68, y: 196, width: 28, height: 90, rx: 12 },
      { type: 'rect', x: 104, y: 196, width: 28, height: 90, rx: 12 },
    ],
  },
  // --- Back ---
  { muscleGroup: 'Rug', view: 'back', shapes: [{ type: 'rect', x: 66, y: 68, width: 68, height: 90, rx: 12 }] },
  {
    muscleGroup: 'Triceps',
    view: 'back',
    shapes: [
      { type: 'rect', x: 40, y: 88, width: 20, height: 55, rx: 10 },
      { type: 'rect', x: 140, y: 88, width: 20, height: 55, rx: 10 },
    ],
  },
  { muscleGroup: 'Bilspieren/Hamstrings', view: 'back', shapes: [{ type: 'rect', x: 64, y: 166, width: 72, height: 34, rx: 12 }] },
  {
    muscleGroup: 'Hamstrings',
    view: 'back',
    shapes: [
      { type: 'rect', x: 68, y: 200, width: 28, height: 86, rx: 12 },
      { type: 'rect', x: 104, y: 200, width: 28, height: 86, rx: 12 },
    ],
  },
  {
    muscleGroup: 'Kuiten',
    view: 'back',
    shapes: [
      { type: 'rect', x: 70, y: 290, width: 24, height: 76, rx: 10 },
      { type: 'rect', x: 106, y: 290, width: 24, height: 76, rx: 10 },
    ],
  },
];

export function regionsForView(view: BodyDiagramView): MuscleGroupRegion[] {
  return MUSCLE_GROUP_REGIONS.filter((region) => region.view === view);
}

export interface RegionTapInfo {
  muscleGroup: string;
  statusLabel: string;
  explanation: string;
}

/**
 * Formats the content for the tap card, pulled directly from the current
 * `RecoveryEstimate` — always the live, current explanation, never a
 * stale/cached copy. Pure so it's testable without rendering anything.
 */
export function describeRegionTap(muscleGroup: string, estimate: RecoveryEstimate): RegionTapInfo {
  return {
    muscleGroup,
    statusLabel: STATUS_LABEL[estimate.status],
    explanation: estimate.explanation,
  };
}
