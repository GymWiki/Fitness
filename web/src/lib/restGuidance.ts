import type { Goal } from '@fitness/program-generator';

/**
 * Rest-between-sets guidance shown on the workout screen — a guideline, never
 * an enforced timer. Matches the "Wetenschap"-FAQ's `rust-tussen-sets` entry:
 * exact rest duration matters little for hypertrophy, but longer rest
 * (~2-3 min) measurably helps strength. Goals where lifting isn't the primary
 * focus (endurance/fat_loss) default to the hypertrophy guidance since
 * maximizing strength-per-set isn't the priority there either.
 */
export const REST_GUIDANCE_BY_GOAL: Record<Goal, string> = {
  strength: 'Rust ~2-3 min tussen sets — bij kracht helpt langere rust aantoonbaar.',
  hypertrophy: 'Rust 60-90 sec tussen sets is prima voor spiergroei — de exacte duur is minder cruciaal.',
  mixed: 'Rust 60-90 sec, en wat langer op je zwaarste sets.',
  endurance: 'Rust 60-90 sec tussen sets is prima voor spiergroei — de exacte duur is minder cruciaal.',
  fat_loss: 'Rust 60-90 sec tussen sets is prima voor spiergroei — de exacte duur is minder cruciaal.',
};

export function restGuidanceFor(goal: Goal): string {
  return REST_GUIDANCE_BY_GOAL[goal];
}
