import type { RecoveryEstimate } from '@fitness/progression-engine';
import { STATUS_LABEL } from './recoveryLabels';

export type BodyDiagramView = 'front' | 'back';

interface RegionPath {
  type: 'path';
  /** SVG path data in the shared 200x460 viewBox (see BodyDiagram.tsx). */
  d: string;
}

export type RegionShape = RegionPath;

export interface MuscleGroupRegion {
  muscleGroup: string;
  view: BodyDiagramView;
  /** Usually two shapes (bilateral: left + right), sometimes one (e.g. torso muscles). */
  shapes: RegionShape[];
}

/**
 * Placeholder-quality region geometry over a simple, generic androgynous
 * silhouette (viewBox 0 0 200 420) — recognizable body zones, not
 * anatomically-shaped (bezier-curve) path panels instead of plain
 * rects/circles — an original illustration authored for this app (not a
 * traced/adapted stock asset, see PROJECT.md for the licensing reasoning),
 * over the shared 200x460 silhouette drawn in `BodyDiagram.tsx`'s
 * `BodyOutline`. The region list itself (which muscle group goes on which
 * view) stays stable since it's driven by `ALL_MUSCLE_GROUPS`.
 *
 * Front/back split follows the app's own muscle-group vocabulary
 * (program-generator's MOVEMENT_SLOTS): the compound "hinge" movement
 * (deadlift-family) is tagged 'Bilspieren/Hamstrings' while the isolation
 * hamstring curl is tagged plain 'Hamstrings' — two distinct data-model
 * groups that anatomically overlap. Rather than merging them (which would
 * require combining two independent recovery estimates into one color,
 * i.e. new logic), they get two adjacent, separately-tappable regions on
 * the back view: the glute/upper-hamstring area and the lower-hamstring
 * area. Likewise `Biceps` (front) and `Triceps` (back) intentionally share
 * the same upper-arm coordinates — they're the same physical limb segment
 * seen from opposite sides, not two different arm regions.
 */
export const MUSCLE_GROUP_REGIONS: MuscleGroupRegion[] = [
  // --- Front ---
  {
    muscleGroup: 'Borst',
    view: 'front',
    shapes: [
      {
        type: 'path',
        d: 'M100,72 C118,70 132,76 133,92 C134,104 124,112 111,112 C104,112 100,108 100,102 C100,108 96,112 89,112 C76,112 66,104 67,92 C68,76 82,70 100,72 Z',
      },
    ],
  },
  {
    muscleGroup: 'Core',
    view: 'front',
    shapes: [
      {
        type: 'path',
        d: 'M86,116 C86,113 92,111 100,111 C108,111 114,113 114,116 L113,168 C113,176 106,181 100,181 C94,181 87,176 87,168 Z',
      },
    ],
  },
  {
    muscleGroup: 'Schouders',
    view: 'front',
    shapes: [
      { type: 'path', d: 'M140,70 C147,68 153,71 152,80 C151,88 145,92 138,90 C133,88 132,80 134,74 C136,71 138,70 140,70 Z' },
      { type: 'path', d: 'M60,70 C53,68 47,71 48,80 C49,88 55,92 62,90 C67,88 68,80 66,74 C64,71 62,70 60,70 Z' },
    ],
  },
  {
    muscleGroup: 'Biceps',
    view: 'front',
    shapes: [
      {
        type: 'path',
        d: 'M146,96 C137,98 134,104 135,114 L138,144 C139,150 143,154 149,153 C155,152 158,146 157,140 L153,110 C152,102 150,98 146,96 Z',
      },
      {
        type: 'path',
        d: 'M54,96 C63,98 66,104 65,114 L62,144 C61,150 57,154 51,153 C45,152 42,146 43,140 L47,110 C48,102 50,98 54,96 Z',
      },
    ],
  },
  {
    muscleGroup: 'Benen',
    view: 'front',
    shapes: [
      {
        type: 'path',
        d: 'M69,210 C68,230 70,260 74,290 C75,298 82,302 90,300 C97,298 99,290 98,280 L96,214 C96,208 92,205 82,205 C75,205 70,207 69,210 Z',
      },
      {
        type: 'path',
        d: 'M131,210 C132,230 130,260 126,290 C125,298 118,302 110,300 C103,298 101,290 102,280 L104,214 C104,208 108,205 118,205 C125,205 130,207 131,210 Z',
      },
    ],
  },
  // --- Back ---
  {
    muscleGroup: 'Rug',
    view: 'back',
    shapes: [{ type: 'path', d: 'M100,66 L124,74 L130,96 L120,150 C112,158 88,158 80,150 L70,96 L76,74 Z' }],
  },
  {
    muscleGroup: 'Triceps',
    view: 'back',
    shapes: [
      {
        type: 'path',
        d: 'M146,96 C137,98 134,104 135,114 L138,144 C139,150 143,154 149,153 C155,152 158,146 157,140 L153,110 C152,102 150,98 146,96 Z',
      },
      {
        type: 'path',
        d: 'M54,96 C63,98 66,104 65,114 L62,144 C61,150 57,154 51,153 C45,152 42,146 43,140 L47,110 C48,102 50,98 54,96 Z',
      },
    ],
  },
  {
    muscleGroup: 'Bilspieren/Hamstrings',
    view: 'back',
    shapes: [
      {
        type: 'path',
        d: 'M70,180 C68,192 68,202 72,210 C80,218 120,218 128,210 C132,202 132,192 130,180 C122,172 78,172 70,180 Z',
      },
    ],
  },
  {
    muscleGroup: 'Hamstrings',
    view: 'back',
    shapes: [
      {
        type: 'path',
        d: 'M69,216 C68,236 70,262 74,288 C75,296 82,300 90,298 C97,296 99,288 98,278 L96,220 C96,214 92,211 82,211 C75,211 70,213 69,216 Z',
      },
      {
        type: 'path',
        d: 'M131,216 C132,236 130,262 126,288 C125,296 118,300 110,298 C103,296 101,288 102,278 L104,220 C104,214 108,211 118,211 C125,211 130,213 131,216 Z',
      },
    ],
  },
  {
    muscleGroup: 'Kuiten',
    view: 'back',
    shapes: [
      { type: 'path', d: 'M74,312 C72,326 73,342 77,356 C79,364 88,364 90,356 C93,344 93,326 90,312 C87,306 78,306 74,312 Z' },
      { type: 'path', d: 'M126,312 C128,326 127,342 123,356 C121,364 112,364 110,356 C107,344 107,326 110,312 C113,306 122,306 126,312 Z' },
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
