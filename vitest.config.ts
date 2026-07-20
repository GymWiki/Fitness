import { defineConfig } from 'vitest/config';

/**
 * Scoped to pure, framework-free app-layer modules only (src/lib
 * files that don't import react-native or the Supabase client) — the rest
 * of the app has no test harness (no Supabase mocking), same as the
 * packages/* convention: pure logic gets tests, I/O glue doesn't.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
