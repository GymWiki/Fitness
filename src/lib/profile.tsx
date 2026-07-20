import type { EquipmentType, ExperienceLevel, Goal } from '@fitness/program-generator';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import type { Physique } from './physique';
import { useAuth } from './auth';
import { supabase } from './supabase';

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
}

/** Partial update to an existing profiles row — used by the Profiel tab's edit form. */
export async function updateProfile(userId: string, update: ProfileUpdate): Promise<void> {
  const patch: Record<string, unknown> = {};
  if (update.goal !== undefined) patch.goal = update.goal;
  if (update.experienceLevel !== undefined) patch.experience_level = update.experienceLevel;
  if (update.daysPerWeek !== undefined) patch.days_per_week = update.daysPerWeek;
  if (update.equipment !== undefined) patch.equipment = update.equipment;
  if (update.displayName !== undefined) patch.display_name = update.displayName;
  if (update.targetPhysique !== undefined) patch.target_physique = update.targetPhysique;
  if (update.gender !== undefined) patch.gender = update.gender;
  if (update.birthYear !== undefined) patch.birth_year = update.birthYear;
  if (update.targetWeightKg !== undefined) patch.target_weight_kg = update.targetWeightKg;

  const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
  if (error) throw error;
}

interface ProfileContextValue {
  profile: Profile | null;
  /** True while the profile for the current session is being (re)loaded. */
  isLoading: boolean;
  refresh: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: PropsWithChildren) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  async function load(uid: string) {
    setIsLoading(true);
    const { data, error } = await supabase.from('profiles').select('*').eq('id', uid).maybeSingle();
    if (error) {
      // Fase 1: geen recovery-UI voor dit pad, alleen niet crashen. De intake-flow
      // laat de gebruiker het opnieuw proberen via een normale profile-insert.
      setProfile(null);
    } else {
      setProfile(data ? fromRow(data as ProfileRow) : null);
    }
    setIsLoading(false);
  }

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    load(userId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const value = useMemo<ProfileContextValue>(
    () => ({
      profile,
      isLoading,
      refresh: async () => {
        if (userId) await load(userId);
      },
    }),
    [profile, isLoading, userId],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) throw new Error('useProfile must be used within a ProfileProvider');
  return context;
}
