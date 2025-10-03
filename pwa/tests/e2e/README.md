# E2E Test Suite

End-to-end tests for PWA functionality using Playwright.

## Quick Start

```bash
# Build PWA artifacts (required before E2E tests)
make render-pwa

# Run E2E tests
npm run test:e2e          # Headless mode
npm run test:e2e:ui       # Visual test runner (recommended for development)
npm run test:e2e:headed   # See browser during tests
```

## Test Structure

Tests follow the **Page Object Model** pattern with Playwright fixtures:

```
pwa/tests/e2e/
├── specs/                    # Test files
│   ├── manifest.spec.ts      # Web App Manifest validation
│   ├── install.spec.ts       # Install prompts, engagement tracking
│   ├── service-worker.spec.ts # SW registration, lifecycle, precaching
│   ├── offline.spec.ts       # Offline capabilities, indicators
│   └── caching.spec.ts       # Workbox strategies, cache persistence
├── pages/                    # Page objects
│   ├── base-page.ts          # Common functionality
│   ├── home-page.ts          # Erstizeitung-specific
│   └── pwa-page.ts           # PWA-specific (SW, manifest, caching)
├── helpers/                  # Utilities
│   └── pwa-helpers.ts        # goOffline, goOnline, waitForServiceWorkerActive
└── fixtures/                 # Auto-inject page objects
    └── pwa-fixtures.ts

pwa/playwright.config.ts      # Configuration (browsers, timeouts, reporters)
```

## Page Objects

**BasePage**: Common page operations (navigation, element queries)
**HomePage**: Erstizeitung-specific (offline indicator, install button)
**PWAPage**: PWA features (service worker, manifest, caching)

All page objects are auto-injected via fixtures:

```typescript
test('example', async ({ homePage, pwaPage }) => {
  await homePage.navigateToHome();
  const manifest = await pwaPage.getManifest();
});
```

## Common Pattern Example

**Offline testing flow:**

```typescript
import { goOffline, waitForServiceWorkerActive } from '../helpers/pwa-helpers';

await waitForServiceWorkerActive(page);
await homePage.reload(); // Cache content
await goOffline(context);
```

See spec files for detailed examples—each test includes inline comments explaining the AAA pattern and PWA-specific considerations.

## Debugging

**UI Mode (Recommended):**

```bash
npm run test:e2e:ui
```

- Time-travel debugging
- Visual test runner
- Watch mode

**Trace Viewer:**

```bash
# After test fails, view trace
npx playwright show-trace trace.zip
```

## Further Reading

- [TESTING.md](../../TESTING.md) - Complete testing philosophy and E2E best practices
- [README.md](../../README.md) - PWA integration overview and architecture
- [Playwright Docs](https://playwright.dev/docs/intro)
