import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Exchanges a Supabase auth link's `code` for a session and forwards to
 * `next` (defaults to `/`). Used by the password-reset email link — see
 * `requestPasswordReset` in AuthProvider.tsx, which sets
 * `redirectTo=/auth/callback?next=/reset-password`.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login`);
}
