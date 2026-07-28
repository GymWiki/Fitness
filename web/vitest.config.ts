import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@fitness/progression-engine': path.resolve(__dirname, 'src/lib/engines/progression-engine/src/index.ts'),
      '@fitness/adaptation-planner': path.resolve(__dirname, 'src/lib/engines/adaptation-planner/src/index.ts'),
      '@fitness/program-generator': path.resolve(__dirname, 'src/lib/engines/program-generator/src/index.ts'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
