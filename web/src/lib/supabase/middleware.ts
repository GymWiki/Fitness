import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from './env';

// Reachable without a session. /reset-password is deliberately NOT here —
// it needs the recovery session created by /auth/callback, so a fully
// anonymous visit should still bounce to /login like any other route.
const PUBLIC_PATHS = ['/login', '/auth/callback'];

/**
 * Refreshes the Supabase session cookie on every request so Server
 * Components always see a non-expired user, and gates non-public routes on
 * having a session — the Next.js equivalent of the Expo app's
 * `Stack.Protected` guards, moved from the client-side navigator into the
 * proxy (Next 16's middleware).
 *
 * Fails open — without env vars configured this is a no-op pass-through
 * rather than a 500, so a misconfigured deploy doesn't take the whole site
 * down.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  let env: { url: string; anonKey: string };
  try {
    env = getSupabaseEnv();
  } catch {
    return response;
  }

  const supabase = createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (!user && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return response;
}
