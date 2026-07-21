import path from 'node:path';
import { defineConfig } from 'vitest/config';

/**
 * Scoped to pure, framework-free app-layer modules only (src/lib
 * files that don't import react-native or the Supabase client) — the rest
 * of the app has no test harness (no Supabase mocking), same as the
 * packages/* convention: pure logic gets tests, I/O glue doesn't.
 * The `@/*` alias mirrors tsconfig.json's `paths` mapping — needed here too
 * because Vitest resolves modules independently of the TS compiler.
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
