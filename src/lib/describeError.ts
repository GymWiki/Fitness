interface SupabaseErrorLike {
  message: string;
  code?: string;
  hint?: string;
  details?: string;
}

function isSupabaseErrorLike(value: unknown): value is SupabaseErrorLike {
  return typeof value === 'object' && value !== null && 'message' in value;
}

/**
 * Turns a thrown Supabase/Postgrest error into the most actionable string
 * available. `hint` is Postgres's own suggested fix (e.g. the exact GRANT
 * to run for an RLS violation, or which column you probably meant) and is
 * easy to lose if only `.message` ever gets surfaced — this is exactly what
 * hid the real cause behind a generic "kon niet wisselen van schema"
 * message before. Always logs the full raw error too. Falls back to
 * `fallback` only when nothing at all could be extracted (e.g. a thrown
 * plain string with no message).
 */
export function describeError(err: unknown, fallback: string): string {
  console.error(err);
  if (isSupabaseErrorLike(err)) {
    const parts = [err.message];
    if (err.hint) parts.push(`Hint: ${err.hint}`);
    if (err.code) parts.push(`(${err.code})`);
    return parts.filter(Boolean).join(' ');
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}
