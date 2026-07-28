import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseEnv } from './env';

/**
 * Refreshes the Supabase session cookie on every request so Server
 * Components always see a non-expired user. Route protection (redirecting
 * unauthenticated requests) is added in Fase 2 once there's a real login
 * route to redirect to.
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

  await supabase.auth.getUser();

  return response;
}
