import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Use happy-dom for all tests (supports both browser APIs and file system)
    environment: 'happy-dom',

    // Global test utilities (keep false to avoid magic globals)
    globals: false,

    setupFiles: ['tests/setup/browser.setup.ts'],

    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.ts'],
      exclude: ['dist/**', 'tests/**', 'src/workbox-config.cts'],
    },

    // Test file patterns - ONLY unit tests (integration tests require _book/ build)
    include: ['tests/unit/**/*.test.ts'],

    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
