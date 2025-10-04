import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom for all tests (supports both browser APIs and file system)
    environment: 'happy-dom',

    // Global test utilities (keep false to avoid magic globals)
    globals: false,

    // Setup files for browser mocks
    setupFiles: ['tests/setup/browser.setup.ts'],

    // Coverage configuration
    coverage: {
      exclude: ['dist/**', 'tests/**', 'src/workbox-config.ts'],
      include: ['src/**/*.ts'],
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      thresholds: {
        branches: 70,
        functions: 70,
        lines: 70,
        statements: 70,
      },
    },

    // Test file patterns - ONLY integration tests
    include: ['tests/integration/**/*.test.ts'],

    // Timeouts
    hookTimeout: 10_000,
    testTimeout: 10_000,
  },
});
