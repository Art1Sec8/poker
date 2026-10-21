import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    include: ['src/**/__tests__/**/*.test.ts'],
    // Run in a single forked process with no parallelism so the runner never
    // depends on multi-worker spawn/IPC, which times out in sandboxed/CI envs.
    // (Vitest 4 API: fileParallelism:false + maxWorkers:1 forces one worker;
    // `poolOptions.forks.singleFork` was removed in v4.)
    pool: 'forks',
    fileParallelism: false,
    maxWorkers: 1,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
