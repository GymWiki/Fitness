import type { EquipmentType, ExperienceLevel, Goal } from '@fitness/program-generator';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useAuth } from './auth';
import { supabase } from './supabase';

export interface Profile {
  id: string;
  goal: Goal;
  experienceLevel: ExperienceLevel;
  daysPerWeek: number;
  equipment: EquipmentType;
}

interface ProfileRow {
  id: string;
  goal: Goal;
  experience_level: ExperienceLevel;
  days_per_week: number;
  equipment: EquipmentType;
}

function fromRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    goal: row.goal,
    experienceLevel: row.experience_level,
    daysPerWeek: row.days_per_week,
    equipment: row.equipment,
  };
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
