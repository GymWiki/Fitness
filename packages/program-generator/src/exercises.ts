import type { EquipmentType, ExerciseType } from './types';

/**
 * A movement slot is a role in a day (e.g. "squat pattern"), not a single
 * exercise: the concrete exercise depends on available equipment, and the
 * A/B variant exists so a 2nd/3rd pass through the same slot in a week isn't
 * always the exact same lift.
 */
export interface MovementSlot {
  id: string;
  muscleGroup: string;
  exerciseType: ExerciseType;
  variants: {
    A: Record<EquipmentType, string>;
    B: Record<EquipmentType, string>;
  };
}

export const MOVEMENT_SLOTS: Record<string, MovementSlot> = {
  squat: {
    id: 'squat',
    muscleGroup: 'Benen',
    exerciseType: 'compound',
    variants: {
      A: { gym: 'Barbell Squat', home_dumbbells: 'Dumbbell Goblet Squat', bodyweight: 'Bodyweight Squat' },
      B: { gym: 'Leg Press', home_dumbbells: 'Dumbbell Lunge', bodyweight: 'Bulgarian Split Squat' },
    },
  },
  hinge: {
    id: 'hinge',
    muscleGroup: 'Bilspieren/Hamstrings',
    exerciseType: 'compound',
    variants: {
      A: { gym: 'Barbell Deadlift', home_dumbbells: 'Dumbbell Romanian Deadlift', bodyweight: 'Single-Leg Glute Bridge' },
      B: { gym: 'Barbell Romanian Deadlift', home_dumbbells: 'Dumbbell Single-Leg RDL', bodyweight: 'Nordic Curl (geassisteerd)' },
    },
  },
  horizontalPush: {
    id: 'horizontalPush',
    muscleGroup: 'Borst',
    exerciseType: 'compound',
    variants: {
      A: { gym: 'Barbell Bench Press', home_dumbbells: 'Dumbbell Bench Press', bodyweight: 'Push-up' },
      B: { gym: 'Incline Dumbbell Press', home_dumbbells: 'Incline Dumbbell Press', bodyweight: 'Decline Push-up' },
    },
  },
  horizontalPull: {
    id: 'horizontalPull',
    muscleGroup: 'Rug',
    exerciseType: 'compound',
    variants: {
      A: { gym: 'Seated Cable Row', home_dumbbells: 'Dumbbell Bent-Over Row', bodyweight: 'Inverted Row' },
      B: { gym: 'Chest-Supported Row', home_dumbbells: 'Single-Arm Dumbbell Row', bodyweight: 'Towel Rows' },
    },
  },
  verticalPush: {
    id: 'verticalPush',
    muscleGroup: 'Schouders',
    exerciseType: 'compound',
    variants: {
      A: { gym: 'Barbell Overhead Press', home_dumbbells: 'Dumbbell Shoulder Press', bodyweight: 'Pike Push-up' },
      B: { gym: 'Machine Shoulder Press', home_dumbbells: 'Seated Dumbbell Press', bodyweight: 'Handstand Hold Push-up' },
    },
  },
  verticalPull: {
    id: 'verticalPull',
    muscleGroup: 'Rug',
    exerciseType: 'compound',
    variants: {
      A: { gym: 'Lat Pulldown', home_dumbbells: 'Dumbbell Pullover', bodyweight: 'Pull-up' },
      B: { gym: 'Pull-up (geassisteerd indien nodig)', home_dumbbells: 'Resistance Band Pulldown', bodyweight: 'Chin-up' },
    },
  },
  biceps: {
    id: 'biceps',
    muscleGroup: 'Biceps',
    exerciseType: 'isolation',
    variants: {
      A: { gym: 'Barbell Curl', home_dumbbells: 'Dumbbell Curl', bodyweight: 'Chin-up (biceps-focus)' },
      B: { gym: 'Cable Curl', home_dumbbells: 'Dumbbell Hammer Curl', bodyweight: 'Doortway Isometric Curl' },
    },
  },
  triceps: {
    id: 'triceps',
    muscleGroup: 'Triceps',
    exerciseType: 'isolation',
    variants: {
      A: { gym: 'Cable Triceps Pushdown', home_dumbbells: 'Dumbbell Overhead Extension', bodyweight: 'Close-Grip Push-up' },
      B: { gym: 'Skull Crusher', home_dumbbells: 'Dumbbell Kickback', bodyweight: 'Bench Dip' },
    },
  },
  quadIsolation: {
    id: 'quadIsolation',
    muscleGroup: 'Benen',
    exerciseType: 'isolation',
    variants: {
      A: { gym: 'Leg Extension', home_dumbbells: 'Dumbbell Step-up', bodyweight: 'Walking Lunge' },
      B: { gym: 'Hack Squat', home_dumbbells: 'Dumbbell Front Rack Lunge', bodyweight: 'Sissy Squat' },
    },
  },
  hamstringIsolation: {
    id: 'hamstringIsolation',
    muscleGroup: 'Hamstrings',
    exerciseType: 'isolation',
    variants: {
      A: { gym: 'Lying Leg Curl', home_dumbbells: 'Dumbbell Stiff-Leg Deadlift', bodyweight: 'Glute Bridge' },
      B: { gym: 'Seated Leg Curl', home_dumbbells: 'Dumbbell Good Morning', bodyweight: 'Hamstring Walkout' },
    },
  },
  calf: {
    id: 'calf',
    muscleGroup: 'Kuiten',
    exerciseType: 'isolation',
    variants: {
      A: { gym: 'Standing Calf Raise', home_dumbbells: 'Dumbbell Calf Raise', bodyweight: 'Single-Leg Calf Raise' },
      B: { gym: 'Seated Calf Raise', home_dumbbells: 'Dumbbell Seated Calf Raise', bodyweight: 'Calf Raise op trede' },
    },
  },
  core: {
    id: 'core',
    muscleGroup: 'Core',
    exerciseType: 'isolation',
    variants: {
      A: { gym: 'Cable Crunch', home_dumbbells: 'Weighted Plank', bodyweight: 'Plank' },
      B: { gym: 'Hanging Leg Raise', home_dumbbells: 'Dumbbell Russian Twist', bodyweight: 'Hollow Body Hold' },
    },
  },
};

/**
 * Candidate exercise names a user could swap into a schema slot: every A/B
 * variant, across every movement slot, that targets the same muscle group
 * and is available with the given equipment — minus whatever's already
 * there. Used by the Schema tab's "vervang oefening" action so a swap always
 * stays within the same muscle target instead of accidentally turning a leg
 * day exercise into a biceps exercise.
 */
export function candidateExercisesForMuscleGroup(
  muscleGroup: string,
  equipment: EquipmentType,
  excludeName?: string,
): string[] {
  const names = new Set<string>();
  for (const slot of Object.values(MOVEMENT_SLOTS)) {
    if (slot.muscleGroup !== muscleGroup) continue;
    for (const variant of Object.values(slot.variants)) {
      names.add(variant[equipment]);
    }
  }
  if (excludeName) names.delete(excludeName);
  return [...names].sort();
}
