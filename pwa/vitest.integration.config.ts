import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom for all tests (supports both browser APIs and file system)
    environment: 'happy-dom',

    // Global test utilities (keep false to avoid magic globals)
    coverage: {
      exclude: ['dist/**', 'tests/**', 'src/workbox-config.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
    },

    globals: false,

    setupFiles: ['tests/setup/browser.setup.ts'],

    // Test file patterns - ONLY integration tests
    hookTimeout: 10_000,

    include: ['tests/integration/**/*.test.ts'],
    testTimeout: 10_000,
  },
});
