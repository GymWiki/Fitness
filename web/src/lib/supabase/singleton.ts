import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from './client';

/**
 * Lazy browser-client singleton so the many ported `src/lib` modules (which
 * originally did `import { supabase } from './supabase'` against Expo's
 * eagerly-created singleton) can keep that same import shape here.
 *
 * Must stay lazy: `createClient()` reads NEXT_PUBLIC_ env vars and throws if
 * they're missing, and this module is imported (transitively) by 'use
 * client' screens that Next.js server-renders once during `next build`'s
 * static prerendering. Nothing in those screens touches `supabase.*`
 * synchronously during render — only from inside useEffect/event handlers,
 * which run in the browser post-hydration — so a Proxy that defers
 * construction until the first actual property access never fires during
 * that server-side prerender pass.
 */
let client: SupabaseClient | null = null;
function getClient(): SupabaseClient {
  if (!client) client = createClient();
  return client;
}

export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient() as object, prop, receiver);
  },
});
