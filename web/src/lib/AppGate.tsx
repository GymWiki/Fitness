'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useProfile } from '@/lib/profile';

const AUTH_ROUTES = ['/login', '/reset-password'];

/**
 * The Next.js equivalent of the Expo app's root `Stack.Protected` gate
 * ordering (session -> profile -> onboarding -> app). Route *access*
 * (redirecting anonymous requests) is proxy.ts's job (Fase 2); this only
 * handles the session->profile->onboarding branch, which needs the client
 * session/profile state that only becomes available after hydration.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const { session, isLoading: isAuthLoading, isPasswordRecovery } = useAuth();
  const { profile, isLoading: isProfileLoading } = useProfile();
  const pathname = usePathname();
  const router = useRouter();

  const isAuthRoute = AUTH_ROUTES.includes(pathname) || pathname.startsWith('/auth/');
  const isOnboardingRoute = pathname === '/onboarding';

  useEffect(() => {
    if (isAuthLoading || isPasswordRecovery || isAuthRoute) return;
    if (!session) return; // proxy.ts already redirects this case to /login
    if (isProfileLoading) return;

    if (!profile && !isOnboardingRoute) {
      router.replace('/onboarding');
    } else if (profile && isOnboardingRoute) {
      router.replace('/');
    }
  }, [isAuthLoading, isPasswordRecovery, isAuthRoute, session, isProfileLoading, profile, isOnboardingRoute, router]);

  const isGateLoading =
    !isAuthRoute && !isPasswordRecovery && (isAuthLoading || (session && isProfileLoading));

  if (isGateLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-accent" />
      </div>
    );
  }

  return <>{children}</>;
}
