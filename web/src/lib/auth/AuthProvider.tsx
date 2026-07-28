'use client';

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { createClient } from '@/lib/supabase/client';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  // True from the moment a password-recovery link's session lands (Supabase's `PASSWORD_RECOVERY`
  // auth event) until a new password is successfully set. A recovery session is a real, valid
  // session — without this flag /reset-password can't tell a genuine recovery visit apart from an
  // already-signed-in user who just navigated to that URL.
  isPasswordRecovery: boolean;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  // Lazily created, browser-only: `createClient()` reads NEXT_PUBLIC_ env vars
  // and throws if they're missing. Building it eagerly in the render body
  // (e.g. via a useState initializer) would also run during Next.js's
  // server-side prerender of this client component, breaking `next build`
  // in environments without Supabase configured. A ref populated from
  // useEffect/handlers — both browser-only, post-hydration — avoids that.
  const clientRef = useRef<SupabaseClient | null>(null);
  function getSupabase(): SupabaseClient {
    if (!clientRef.current) clientRef.current = createClient();
    return clientRef.current;
  }

  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();

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
        const { error } = await getSupabase().auth.signInWithPassword({ email, password });
        return { error: error?.message ?? null };
      },
      // Requires "Confirm email" to be turned off in the Supabase project's Auth settings —
      // otherwise this returns without a session and the user is stuck until they click a confirmation link.
      signUpWithPassword: async (email: string, password: string) => {
        const { error } = await getSupabase().auth.signUp({ email, password });
        return { error: error?.message ?? null };
      },
      // Routes the recovery-link email through /auth/callback, which exchanges the code for a
      // session and forwards to /reset-password — see src/app/auth/callback/route.ts.
      requestPasswordReset: async (email: string) => {
        const redirectTo =
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback?next=/reset-password`
            : undefined;
        const { error } = await getSupabase().auth.resetPasswordForEmail(
          email,
          redirectTo ? { redirectTo } : undefined,
        );
        return { error: error?.message ?? null };
      },
      updatePassword: async (newPassword: string) => {
        const { error } = await getSupabase().auth.updateUser({ password: newPassword });
        if (!error) setIsPasswordRecovery(false);
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await getSupabase().auth.signOut();
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
