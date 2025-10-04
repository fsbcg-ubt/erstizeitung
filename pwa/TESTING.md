# Testing Guide

Testing guidelines for the Erstizeitung PWA implementation.

## Stack

| Component                | Purpose                      |
| ------------------------ | ---------------------------- |
| **Vitest**               | Test runner with ESM support |
| **Happy-DOM**            | Lightweight DOM for Node.js  |
| **TypeScript**           | Type-safe test development   |
| **@testing-library/dom** | DOM testing utilities        |
| **V8 Coverage**          | Coverage analysis            |

Coverage thresholds (lines, functions, branches, statements) are defined in `vitest.config.ts`.

## Quick Start

Minimal test template:

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';

describe('module-name', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
  });

  test('scenario description', async () => {
    await import('../../src/module');
    // Arrange, Act, Assert
  });
});
```

Commands:

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Core Principles

### 1. Test Behavior, Not Implementation

Test observable outcomes. Tests must survive refactoring.

Test:

- DOM content and structure
- User interaction results
- API responses, side effects
- Error messages, accessibility

Don't test:

- Private functions
- Call counts (unless critical)
- Internal state or variable names

```typescript
// Observable behavior
test('displays offline message in German', () => {
  globalThis.dispatchEvent(new Event('offline'));
  expect(document.querySelector('#offline-indicator')?.innerHTML).toContain(
    'Keine Internetverbindung',
  );
});

// Avoid: Implementation details (breaks on refactoring)
test('calls createIndicator', () => {
  const spy = vi.spyOn(module, 'createIndicator');
  globalThis.dispatchEvent(new Event('offline'));
  expect(spy).toHaveBeenCalled();
});
```

### 2. No Branching in Tests

One test = one scenario = one linear path.

Split tests containing `if/else`, `switch`, or loops.

Exception: Use `test.each` for identical logic with different inputs (see examples below).

```typescript
// Avoid branching
for (const scenario of scenarios) {
  expect(result).toBe(expected);
}

// Split into separate tests
test('scenario A', () => {
  /* ... */
});
test('scenario B', () => {
  /* ... */
});
```

### 3. Functional Coverage Over Code Coverage

Test all use cases, not all lines.

Coverage strategy:

1. Happy path (one representative case)
2. Error handling (different error paths)
3. Boundary conditions (empty, null, max values)
4. State transitions (operation sequences)
   ```typescript
   test('processes: pending → installing → activated', async () => {
     expect(worker.state).toBe('installing');
     worker.state = 'activated';
     expect(worker.state).toBe('activated');
   });
   ```

Don't test multiple inputs executing identical code paths.

```typescript
// Redundant
test('accepts /path1', () => expect(validate('/path1')).toBe('/path1'));
test('accepts /path2', () => expect(validate('/path2')).toBe('/path2'));

// Representative + boundaries
test.each([
  { input: '', expected: '' },
  { input: '/app', expected: '/app' },
  { input: '/app/', expected: '/app' }, // Boundary: trailing slash
])('validates $input', ({ input, expected }) => {
  expect(validate(input)).toBe(expected);
});
```

### 4. Meaningful Edge Cases Only

Test edge cases representing actual runtime conditions.

Valid edge cases:

- API failures (network errors, quota)
- Race conditions (async timing)
- Data corruption (invalid JSON, missing fields)
- Browser compatibility (missing APIs)
- Security (injection, invalid input)

Invalid edge cases:

- Arbitrary values ("exactly 47 characters")
- Hypothetical scenarios
- Enum exhaustion when behavior is identical

## Test Quality

Characteristics of well-designed tests:

- Readable: Clear intent, minimal complexity
- Modular: Independent, isolated
- Extensible: Easy to add cases
- Fast: Enable rapid feedback
- Deterministic: Repeatable results
- Maintainable: Survive refactoring

## Mocking

Hierarchy: Real implementations > Stubs > Mocks (last resort)

Mock when:

- Avoiding side effects (database, API, I/O)
- Complex object creation
- Uncontrollable external services

Don't mock:

- Simple objects
- Pure functions
- DOM (use Happy-DOM)

Excessive mocking hides design problems, creates brittle tests, and reduces confidence.

```typescript
// Real implementation
test('validates path', () => {
  expect(validatePath('/app')).toBe('/app');
});

// Mock to avoid side effects
test('handles SW registration failure', async () => {
  navigator.serviceWorker.register = vi
    .fn()
    .mockRejectedValue(new Error('Failed'));
  // Prevents actual registration
});
```

Available mocks (`tests/setup/browser.setup.ts`):

| Mock                               | Usage                                                                              |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| `localStorage`                     | Auto-cleared in `beforeEach`, use directly                                         |
| `navigator.serviceWorker.register` | `navigator.serviceWorker.register = vi.fn().mockResolvedValue(mockRegistration)`   |
| `BeforeInstallPromptEvent`         | Dispatched globally: `window.dispatchEvent(mockPromptEvent)`                       |
| `navigator.onLine`                 | `Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })` |
| Network events                     | `globalThis.dispatchEvent(new Event('offline'))`                                   |

## Running Tests

```bash
npm test              # CI mode
npm run test:watch    # Watch mode
npm run test:ui       # Visual UI
npm run test:coverage # Coverage report
```

Organization:

```
tests/
├── setup/browser.setup.ts      # Global mocks
├── unit/                       # Isolated tests
│   ├── inject-html.test.ts
│   ├── offline-indicator.test.ts
│   ├── register-sw.test.ts
│   └── install-button.test.ts
└── integration/                # Build validation
    └── pwa-build.test.ts       # Requires: make render-pwa
```

## Writing Tests

### Structure (Arrange-Act-Assert)

```typescript
describe('module-name', () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = '';
    localStorage.clear();
  });

  test('does X when Y occurs', () => {
    // Arrange
    const data = { foo: 'bar' };

    // Act
    performAction(data);

    // Assert
    expect(result).toBe(expected);
  });
});
```

### Naming

Use descriptive names explaining the scenario.

Examples: `'displays offline message in German'`, `'guards against null newWorker (race condition)'`

Avoid: `'test1'`, `'it works'`

### Async & Timers

```typescript
// Async
test('triggers install prompt', async () => {
  const spy = vi.spyOn(event, 'prompt');
  document.querySelector('#install-pwa-btn')?.click();
  await vi.runAllTimersAsync();
  expect(spy).toHaveBeenCalled();
});

// Timers
beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('auto-dismisses after 3s', () => {
  triggerEvent();
  vi.advanceTimersByTime(3000);
  expect(element.classList.contains('show')).toBe(false);
});
```

## Coverage

Thresholds: Configured in `vitest.config.ts` (lines, functions, branches, statements)

Excluded: `dist/**`, `tests/**`, `src/workbox-config.ts`

View: `npm run test:coverage && open coverage/index.html`

Focus on functional coverage. High coverage without meaningful tests provides false confidence.

## Best Practices

1. Test behavior, not implementation
2. One test = one path (no branching)
3. Functional coverage > code coverage
4. Prefer real implementations over mocks
5. Test real edge cases, not hypothetical
6. Descriptive test names
7. Clean state between tests
8. Fast, modular, maintainable tests

## Anti-Patterns

- Testing implementation details
- Branching logic in tests
- Redundant tests (identical code paths)
- Hypothetical edge cases
- Excessive mocking
- Vague test names
- Shared mutable state
- Tests breaking on refactoring
- Chasing coverage metrics

## Examples

Behavior testing:

```typescript
test('displays offline message in German', async () => {
  await import('../../src/offline-indicator');
  globalThis.dispatchEvent(new Event('offline'));

  const indicator = document.querySelector('#offline-indicator');
  expect(indicator?.innerHTML).toContain('Keine Internetverbindung');
});
```

Race condition handling:

```typescript
test('guards against null newWorker (race condition)', async () => {
  mockRegistration.installing = null;
  const handler = getUpdateFoundHandler();
  expect(() => handler?.()).not.toThrow();
});
```

Data corruption recovery:

```typescript
test('handles invalid JSON in localStorage', async () => {
  localStorage.setItem('pwa-engagement', 'invalid-json');
  await import('../../src/install-button');

  const data = JSON.parse(localStorage.getItem('pwa-engagement')!);
  expect(data).toHaveProperty('visitCount');
});
```

Service Worker lifecycle:

```typescript
test('activates new worker on updatefound event', async () => {
  const mockWorker = { state: 'installing', addEventListener: vi.fn() };
  mockRegistration.installing = mockWorker;

  mockRegistration.dispatchEvent(new Event('updatefound'));

  expect(mockWorker.addEventListener).toHaveBeenCalledWith(
    'statechange',
    expect.any(Function),
  );
});
```

HTML injection:

```typescript
test('injects element into document body', async () => {
  document.body.innerHTML = '<main></main>';

  await import('../../src/inject-html');

  const injected = document.querySelector('[data-component]');
  expect(injected).toBeTruthy();
  expect(document.body.contains(injected)).toBe(true);
});
```

Error boundary:

```typescript
test('fails gracefully when ServiceWorker API unavailable', async () => {
  delete (navigator as any).serviceWorker;

  await expect(async () => {
    await import('../../src/register-sw');
  }).not.toThrow();

  // No registration attempted
  expect(console.log).toHaveBeenCalledWith(
    expect.stringContaining('not supported'),
  );
});
```

## E2E Testing with Playwright

### Overview

End-to-end (E2E) tests validate PWA behavior in real browsers using Playwright. Unlike unit tests, E2E tests verify the complete user experience including service worker lifecycle, offline capabilities, install prompts, and caching strategies.

### When to Use E2E vs Unit Tests

**Use Unit Tests (Vitest) for:**

- Isolated module logic
- DOM manipulation functions
- Event handlers
- State management
- Mocking external dependencies

**Use E2E Tests (Playwright) for:**

- Service worker registration and lifecycle
- Offline/online transitions
- Install prompt user flows
- Manifest validation
- Caching strategies (NetworkFirst, CacheFirst)
- Cross-browser PWA compatibility
- Real user interactions

### Prerequisites

E2E tests require built PWA artifacts:

```bash
# REQUIRED: Build PWA before running E2E tests
make render-pwa

# Then run E2E tests
npm run test:e2e
```

### Test Commands

```bash
npm run test:e2e          # Run all E2E tests (headless)
npm run test:e2e:ui       # Visual test runner with debugging
npm run test:e2e:headed   # See browser during tests
npm run test:e2e:debug    # Playwright Inspector
npm run test:e2e:report   # View HTML report
```

### Test Structure

E2E tests use the **Page Object Model** pattern with Playwright fixtures:

```typescript
import { test, expect } from '../fixtures/pwa-fixtures';

test('displays cached content offline', async ({
  context,
  homePage,
  pwaPage,
}) => {
  // Arrange: Navigate and cache
  await homePage.navigateToHome();
  await waitForServiceWorkerActive(homePage.page);
  await homePage.reload();

  // Act: Go offline
  await goOffline(context);
  await homePage.reload();

  // Assert: Content still visible
  await expect(homePage.page.locator('main')).toBeVisible();
});
```

### E2E Test Suites

Located in `tests/e2e/specs/`:

| File                     | Coverage                                                     |
| ------------------------ | ------------------------------------------------------------ |
| `offline.spec.ts`        | Offline capabilities, indicators, online/offline transitions |
| `service-worker.spec.ts` | SW registration, activation, precaching, persistence         |
| `install.spec.ts`        | Install prompts, engagement tracking, dismiss behavior       |
| `manifest.spec.ts`       | Web App Manifest validation, icons, shortcuts                |
| `caching.spec.ts`        | Workbox strategies, cache persistence, offline navigation    |

### Applying Core Principles to E2E

The principles from [Core Principles](#core-principles) apply to E2E tests:

1. **Test Behavior, Not Implementation**

   ```typescript
   // Good: Test user-visible behavior
   await homePage.verifyOfflineMessage();

   // Bad: Test implementation details
   expect(serviceWorkerInternalState).toBe('cached');
   ```

2. **No Branching in Tests**
   - Split scenarios into separate E2E tests
   - Use `test.each` for identical flows with different data

3. **Functional Coverage Over Code Coverage**
   - Test real PWA use cases (offline, install, update)
   - Avoid redundant E2E tests (they're slower than unit tests)

4. **Meaningful Edge Cases Only**
   - Network interruptions during page load
   - SW update race conditions
   - Invalid manifest responses
   - Missing browser APIs

### Page Objects

E2E tests use three page objects (auto-injected via fixtures):

**BasePage** (`pages/base-page.ts`)

```typescript
// Common functionality
await basePage.goto('/');
await basePage.waitForElement('#install-pwa-btn');
await basePage.getTextContent('h1');
```

**HomePage** (`pages/home-page.ts`)

```typescript
// Erstizeitung-specific
await homePage.navigateToHome();
await homePage.verifyOfflineMessage();
await homePage.clickInstallButton();
```

**PWAPage** (`pages/pwa-page.ts`)

```typescript
// PWA-specific
await pwaPage.waitForServiceWorkerActive();
const manifest = await pwaPage.getManifest();
await pwaPage.clearAllCaches();
```

### Helper Functions

Common operations in `helpers/pwa-helpers.ts`:

```typescript
import {
  goOffline,
  goOnline,
  waitForServiceWorkerActive,
  clearPWAState,
  simulateBeforeInstallPrompt,
} from '../helpers/pwa-helpers';

// Network control
await goOffline(context);
await goOnline(context);

// Service Worker
await waitForServiceWorkerActive(page);

// Clean state
await clearPWAState(page); // Clears SW, caches, localStorage
```

### E2E Best Practices

1. **Always wait for service worker before PWA tests**

   ```typescript
   await waitForServiceWorkerActive(page);
   await homePage.reload(); // Populate cache
   ```

2. **Use fixtures for page objects (automatic instantiation)**

   ```typescript
   test('...', async ({ homePage, pwaPage }) => {
     // homePage and pwaPage available automatically
   });
   ```

3. **Clear state between tests when needed**

   ```typescript
   test.beforeEach(async ({ page, homePage }) => {
     await homePage.navigateToHome();
     await homePage.clearLocalStorage(); // For install tests
   });
   ```

4. **Test cross-browser (Chromium, Firefox, WebKit)**
   - PWA behavior varies by browser
   - Config in `playwright.config.ts`

5. **Prefer user-facing selectors**

   ```typescript
   // Good: Accessibility-based
   await page.getByRole('button', { name: /installieren/i }).click();

   // Acceptable: Stable ID
   await page.locator('#install-pwa-btn').click();

   // Avoid: Brittle selectors
   await page.locator('.btn.install.primary').click();
   ```

### Debugging E2E Tests

**UI Mode (Recommended):**

```bash
npm run test:e2e:ui
```

- Time-travel debugging
- Visual test runner
- Watch mode

**Trace Viewer:**

```bash
# After test fails on CI, download trace.zip
npx playwright show-trace trace.zip
```

**Headed Mode:**

```bash
npm run test:e2e:headed
```

### CI/CD Integration

E2E tests run in GitHub Actions (`.github/workflows/pull_request.yml`):

```yaml
- name: Build PWA artifacts
  run: make render-pwa

- name: Install Playwright browsers
  run: npx playwright install --with-deps chromium firefox webkit

- name: Run E2E tests
  run: npm run test:e2e

- name: Upload test report
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: playwright-report
    path: playwright-report/
```

### Common E2E Patterns

**Offline Testing:**

```typescript
test('loads cached content when offline', async ({ context, homePage }) => {
  await homePage.navigateToHome();
  await waitForServiceWorkerActive(homePage.page);
  await homePage.reload(); // Cache content

  await goOffline(context);
  await homePage.reload();

  await expect(homePage.page.locator('main')).toBeVisible();
});
```

**Install Prompt Testing:**

```typescript
test('shows install button with engagement', async ({ page, homePage }) => {
  await setEngagementData(page, 2, 30000); // 2 visits, 30s
  await simulateBeforeInstallPrompt(page);
  await page.waitForTimeout(2500); // Button delay

  expect(await homePage.isInstallButtonVisible()).toBe(true);
});
```

**Manifest Validation:**

```typescript
test('manifest has correct theme color', async ({ pwaPage }) => {
  const manifest = await pwaPage.getManifest();
  expect(manifest.theme_color).toBe('#249260'); // Uni Bayreuth green
});
```

### Troubleshooting E2E Tests

| Issue                      | Solution                                                 |
| -------------------------- | -------------------------------------------------------- |
| "Connection refused"       | Run `make render-pwa` to build `_book/`                  |
| SW not found               | Verify `_book/service-worker.js` exists                  |
| Tests timeout              | Increase timeout in `playwright.config.ts`               |
| Install button not visible | Clear localStorage: `await homePage.clearLocalStorage()` |
| Offline tests flaky        | Reload after SW registration to populate cache           |

### Further Reading

- [E2E Test README](tests/e2e/README.md) - Comprehensive E2E documentation
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [PWA Testing Guide](https://web.dev/learn/pwa/testing/)
