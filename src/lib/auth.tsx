import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  // True from the moment a password-recovery link's session lands (Supabase's `PASSWORD_RECOVERY`
  // auth event) until a new password is successfully set. A recovery session is a real, valid
  // session — without this flag the root layout's `session`-based gate would route straight past
  // the reset screen into the app instead of prompting for a new password first.
  isPasswordRecovery: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession);
      if (event === 'PASSWORD_RECOVERY') setIsPasswordRecovery(true);
      if (event === 'SIGNED_OUT') setIsPasswordRecovery(false);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      isPasswordRecovery,
      signInWithPassword: async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      // Requires "Confirm email" to be turned off in the Supabase project's Auth settings —
      // otherwise this returns without a session and the user is stuck until they click a confirmation link.
      signUpWithPassword: async (email: string, password: string) => {
        const { error } = await supabase.auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      // On web, redirect back to wherever the app is currently being served from (dev server today,
      // whatever production host later — never a hardcoded URL). `typeof window` (rather than
      // `Platform.OS === 'web'`) sidesteps importing 'react-native' here, which this module
      // otherwise has no need for and which vitest's plain Node test environment can't parse (its
      // untranspiled Flow syntax). On native there's no `window`, and no deep-link handler wired up
      // for the recovery link either, so it's left unset: Supabase then falls back to the project's
      // configured Site URL, which opens the same web app in the device's browser — the reset flow
      // below works there too, no native-specific code needed.
      requestPasswordReset: async (email: string) => {
        const redirectTo = typeof window !== 'undefined' ? window.location.origin : undefined;
        const { error } = await supabase.auth.resetPasswordForEmail(email, redirectTo ? { redirectTo } : undefined);
        return { error: error?.message ?? null };
      },
      updatePassword: async (newPassword: string) => {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (!error) setIsPasswordRecovery(false);
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
        setIsPasswordRecovery(false);
      },
    }),
    [session, isLoading, isPasswordRecovery],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
