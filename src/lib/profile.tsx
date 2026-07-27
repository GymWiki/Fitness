import type { EquipmentType, ExperienceLevel, Goal } from '@fitness/program-generator';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Physique } from './physique';
import { getFirstAsync, runAsync } from './db';

export type Gender = 'male' | 'female' | 'other';

export interface Profile {
  id: string;
  goal: Goal;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  equipment: EquipmentType;
  displayName: string | null;
  targetPhysique: Physique | null;
  gender: Gender | null;
  birthYear: number | null;
  targetWeightKg: number | null;
  /** 1 (Monday) .. 7 (Sunday), length always equal to daysPerWeek when set. Null for accounts that haven't chosen fixed training days yet — the calendar schedule falls back to the day-count rotation for those. */
  preferredWeekdays: number[] | null;
}

interface ProfileRow {
  id: string;
  goal: Goal;
  experience_level: ExperienceLevel;
  days_per_week: number;
  equipment: EquipmentType;
  display_name: string | null;
  target_physique: Physique | null;
  gender: Gender | null;
  birth_year: number | null;
  target_weight_kg: number | null;
  preferred_weekdays: string | null;
}

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    goal: row.goal,
    experienceLevel: row.experience_level,
    daysPerWeek: row.days_per_week,
    equipment: row.equipment,
    displayName: row.display_name,
    targetPhysique: row.target_physique,
    gender: row.gender,
    birthYear: row.birth_year,
    targetWeightKg: row.target_weight_kg,
    preferredWeekdays: row.preferred_weekdays ? (JSON.parse(row.preferred_weekdays) as number[]) : null,
  };
}

export interface ProfileUpdate {
  goal?: Goal;
  experienceLevel?: ExperienceLevel;
  daysPerWeek?: number;
  equipment?: EquipmentType;
  displayName?: string | null;
  targetPhysique?: Physique | null;
  gender?: Gender | null;
  birthYear?: number | null;
  targetWeightKg?: number | null;
  preferredWeekdays?: number[] | null;
}

/** There is exactly one profile row on a device — this app has no accounts. */
const LOCAL_PROFILE_ID = 'local';

async function fetchLocalProfile(): Promise<Profile | null> {
  const row = await getFirstAsync<ProfileRow>('select * from profiles where id = ?', [LOCAL_PROFILE_ID]);
  return row ? fromRow(row) : null;
}

/** Partial update to the local profile row — used by the Profiel tab's edit form. */
export async function updateProfile(update: ProfileUpdate): Promise<void> {
  const sets: string[] = [];
  const params: Array<string | number | null> = [];
  if (update.goal !== undefined) {
    sets.push('goal = ?');
    params.push(update.goal);
  }
  if (update.experienceLevel !== undefined) {
    sets.push('experience_level = ?');
    params.push(update.experienceLevel);
  }
  if (update.daysPerWeek !== undefined) {
    sets.push('days_per_week = ?');
    params.push(update.daysPerWeek);
  }
  if (update.equipment !== undefined) {
    sets.push('equipment = ?');
    params.push(update.equipment);
  }
  if (update.displayName !== undefined) {
    sets.push('display_name = ?');
    params.push(update.displayName);
  }
  if (update.targetPhysique !== undefined) {
    sets.push('target_physique = ?');
    params.push(update.targetPhysique);
  }
  if (update.gender !== undefined) {
    sets.push('gender = ?');
    params.push(update.gender);
  }
  if (update.birthYear !== undefined) {
    sets.push('birth_year = ?');
    params.push(update.birthYear);
  }
  if (update.targetWeightKg !== undefined) {
    sets.push('target_weight_kg = ?');
    params.push(update.targetWeightKg);
  }
  if (update.preferredWeekdays !== undefined) {
    sets.push('preferred_weekdays = ?');
    params.push(update.preferredWeekdays === null ? null : JSON.stringify(update.preferredWeekdays));
  }
  if (sets.length === 0) return;
  sets.push('updated_at = ?');
  params.push(new Date().toISOString());

  await runAsync(`update profiles set ${sets.join(', ')} where id = ?`, [...params, LOCAL_PROFILE_ID]);
}

interface ProfileContextValue {
  profile: Profile | null;
  /** True while the local profile is being (re)loaded. */
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load() {
    setIsLoading(true);
    try {
      setProfile(await fetchLocalProfile());
    } catch {
      // Fase 1: geen recovery-UI voor dit pad, alleen niet crashen. De intake-flow
      // laat de gebruiker het opnieuw proberen via een normale profile-insert.
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo<ProfileContextValue>(() => ({ profile, isLoading, refresh: load }), [profile, isLoading]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
}
