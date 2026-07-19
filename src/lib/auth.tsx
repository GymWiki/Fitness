import type { Session } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { supabase } from './supabase';

interface AuthContextValue {
  session: Session | null;
  isLoading: boolean;
  signInWithMagicLink: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Parses a Supabase auth redirect URL and, if it carries tokens or a PKCE code, establishes the session. */
async function createSessionFromUrl(url: string): Promise<void> {
  const { queryParams } = Linking.parse(url);
  const code = typeof queryParams?.code === 'string' ? queryParams.code : undefined;
  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    return;
  }

  const hashParams = new URLSearchParams(url.split('#')[1] ?? '');
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      createSessionFromUrl(url);
    });

    Linking.getInitialURL().then((url) => {
      if (url) createSessionFromUrl(url);
    });

    return () => {
      authListener.subscription.unsubscribe();
      linkingSubscription.remove();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      signInWithMagicLink: async (email: string) => {
        const redirectTo = Linking.createURL('auth/callback');
        const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectTo } });
        return { error: error?.message ?? null };
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
