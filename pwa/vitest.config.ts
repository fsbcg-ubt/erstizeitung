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
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['dist/**', 'tests/**', 'src/workbox-config.ts'],
    },

    // Test file patterns - ONLY unit tests (integration tests require _book/ build)
    include: ['tests/unit/**/*.test.ts'],

    // Timeouts
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
