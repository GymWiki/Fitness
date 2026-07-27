import type { TemplateKey } from './types';

export interface DayArchetype {
  name: string;
  slotIds: string[];
  variant: 'A' | 'B';
}

const FULL_BODY_SLOT_IDS = ['squat', 'hinge', 'horizontalPush', 'horizontalPull', 'verticalPush', 'core'];
const UPPER_SLOT_IDS = ['horizontalPush', 'horizontalPull', 'verticalPush', 'verticalPull', 'biceps', 'triceps'];
const LOWER_SLOT_IDS = ['squat', 'hinge', 'quadIsolation', 'hamstringIsolation', 'calf', 'core'];
const PUSH_SLOT_IDS = ['horizontalPush', 'verticalPush', 'triceps', 'core'];
const PULL_SLOT_IDS = ['horizontalPull', 'verticalPull', 'biceps', 'core'];
const LEGS_SLOT_IDS = ['squat', 'hinge', 'quadIsolation', 'hamstringIsolation', 'calf'];

/**
 * The archetype list per template is shorter than most `daysPerWeek` values
 * that pick that template; `buildProgramDays` cycles through it with modulo,
 * so e.g. 5x upper/lower becomes Upper A, Lower A, Upper B, Lower B, Upper A.
 */
export const TEMPLATE_DAY_ARCHETYPES: Record<TemplateKey, DayArchetype[]> = {
  full_body_3x: [
    { name: 'Full Body A', slotIds: FULL_BODY_SLOT_IDS, variant: 'A' },
    { name: 'Full Body B', slotIds: FULL_BODY_SLOT_IDS, variant: 'B' },
  ],
  upper_lower_4x: [
    { name: 'Bovenlichaam A', slotIds: UPPER_SLOT_IDS, variant: 'A' },
    { name: 'Onderlichaam A', slotIds: LOWER_SLOT_IDS, variant: 'A' },
    { name: 'Bovenlichaam B', slotIds: UPPER_SLOT_IDS, variant: 'B' },
    { name: 'Onderlichaam B', slotIds: LOWER_SLOT_IDS, variant: 'B' },
  ],
  push_pull_legs_6x: [
    { name: 'Push A', slotIds: PUSH_SLOT_IDS, variant: 'A' },
    { name: 'Pull A', slotIds: PULL_SLOT_IDS, variant: 'A' },
    { name: 'Benen A', slotIds: LEGS_SLOT_IDS, variant: 'A' },
    { name: 'Push B', slotIds: PUSH_SLOT_IDS, variant: 'B' },
    { name: 'Pull B', slotIds: PULL_SLOT_IDS, variant: 'B' },
    { name: 'Benen B', slotIds: LEGS_SLOT_IDS, variant: 'B' },
  ],
};

/**
 * 3 days or fewer favours full-body frequency per muscle group; 4-5 has room
 * for a real upper/lower split; 6-7 switches to a Push/Pull/Legs split so a
 * high-frequency week still separates push, pull and leg volume instead of
 * repeating an upper/lower split an awkward number of times.
 */
export function selectTemplateKey(daysPerWeek: number): TemplateKey {
  if (daysPerWeek <= 3) return 'full_body_3x';
  if (daysPerWeek <= 5) return 'upper_lower_4x';
  return 'push_pull_legs_6x';
}
