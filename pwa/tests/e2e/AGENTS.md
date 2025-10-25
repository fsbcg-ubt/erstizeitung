# E2E Testing - LLM Agent Instructions

LLM-specific automation rules for E2E testing in the Erstizeitung PWA project. This file contains ONLY deterministic requirements and agent-specific patterns for Playwright tests.

---

## Documentation References

**REQUIRED: Consult these documents for complete context**

### README.md (pwa/tests/e2e/)

- **Quick Start** → Build commands, test commands
- **Test Structure** → Directory layout, Page Object Model
- **Common Patterns** → Offline testing, SW validation, manifest checks

### TESTING.md (pwa/)

- **E2E Testing Section** → When to use E2E vs unit tests
- **Core Principles** → Test behavior, no branching, functional coverage
- **E2E Best Practices** → SW timing, fixtures, state cleanup
- **Page Objects** → BasePage, HomePage, PWAPage usage
- **Debugging** → UI mode, trace viewer, headed mode

### playwright.config.ts (pwa/)

- **Configuration** → Browser setup, timeouts, reporters
- **Projects** → Chromium, Firefox, WebKit, mobile viewports

---

## LLM Automation Requirements

### 1. Prerequisites Check (REQUIRED)

**Before writing or running E2E tests, ALWAYS verify in this order:**

```bash
# REQUIRED: Install dependencies
npm install

# REQUIRED: Install Playwright browsers (if not already installed)
npx playwright install --with-deps chromium firefox webkit

# REQUIRED: Build PWA artifacts
make render-pwa         # Creates _book/ directory with PWA

# Then run E2E tests
npm run test:e2e        # Headless
npm run test:e2e:ui     # Visual test runner (recommended for development)
```

**E2E tests REQUIRE built PWA artifacts in `../_book/`. Unit tests do NOT.**

---

### 2. Fixture Usage (MANDATORY)

**REQUIRED: Always import test and expect from pwa-fixtures, NOT @playwright/test**

```typescript
// CORRECT: Import from pwa-fixtures for auto-injected page objects
import { test, expect } from '../fixtures/pwa-fixtures';

test('example', async ({ page, context, homePage, pwaPage }) => {
  await homePage.navigateToHome();
  const manifest = await pwaPage.getManifest();
});

// NEVER: Import from @playwright/test directly
import { test, expect } from '@playwright/test'; // ❌ FORBIDDEN
```

**Available fixtures (auto-injected):**

- `page`: Playwright Page object
- `context`: Playwright BrowserContext object
- `basePage`: Common page operations
- `homePage`: Erstizeitung-specific operations
- `pwaPage`: PWA-specific operations (SW, manifest, caching)

**NEVER manually instantiate page objects:**

```typescript
// FORBIDDEN
const homePage = new HomePage(page); // ❌ Use auto-injected fixture
```

---

### 3. Service Worker Timing (CRITICAL)

**REQUIRED: Wait for service worker activation + reload before testing PWA features**

```typescript
import { waitForServiceWorkerActive } from '../helpers/pwa-helpers';

// CORRECT: Wait for SW + reload before offline/caching tests
test('loads cached content offline', async ({ context, homePage, page }) => {
  await homePage.navigateToHome();
  await waitForServiceWorkerActive(page); // ✅ REQUIRED
  await homePage.reload(); // ✅ REQUIRED: Populate cache

  await goOffline(context);
  await homePage.reload();

  await expect(homePage.page.locator('main')).toBeVisible();
});

// NEVER: Skip SW wait or reload for PWA features
test('loads cached content offline', async ({ context, homePage }) => {
  await homePage.navigateToHome();
  // Missing waitForServiceWorkerActive() ❌
  // Missing reload() ❌
  await goOffline(context);
  await homePage.reload();
  // Test will fail - cache not populated
});
```

**When SW wait + reload is REQUIRED:**

- Offline functionality tests
- Caching strategy tests
- Service worker lifecycle tests
- Install prompt tests (after engagement tracking)

**When SW wait is NOT required:**

- Manifest validation tests
- Basic navigation tests
- DOM element presence tests

---

### 4. Helper Functions (REQUIRED)

**ALWAYS use helpers from `pwa-helpers.ts` instead of direct API calls**

```typescript
import {
  goOffline,
  goOnline,
  waitForServiceWorkerActive,
  clearPWAState,
  simulateBeforeInstallPrompt,
  setEngagementData,
  triggerOfflineEvent,
  triggerOnlineEvent,
} from '../helpers/pwa-helpers';

// CORRECT: Use helper functions
await goOffline(context);
await waitForServiceWorkerActive(page);
await clearPWAState(page);

// NEVER: Direct API calls
await context.setOffline(true); // ❌ Use goOffline(context)
await page.waitForFunction(() => navigator.serviceWorker.controller !== null); // ❌ Use waitForServiceWorkerActive(page)
```

---

### 5. Test Structure (AAA Pattern)

**REQUIRED: Structure all tests using Arrange-Act-Assert with clear comments**

```typescript
test('displays offline indicator when going offline', async ({
  context,
  homePage,
}) => {
  // Arrange: Start online
  await homePage.navigateToHome();
  await waitForServiceWorkerActive(homePage.page);

  // Act: Go offline
  await goOffline(context);
  await triggerOfflineEvent(homePage.page);

  // Assert: Offline indicator appears
  await homePage.waitForOfflineIndicator();
  await homePage.verifyOfflineMessage();
});
```

---

### 6. State Management (REQUIRED)

**When to clear PWA state:**

```typescript
import { clearPWAState } from '../helpers/pwa-helpers';

// REQUIRED: Clear state for install prompt tests
test.beforeEach(async ({ page, homePage }) => {
  await homePage.navigateToHome();
  await clearPWAState(page); // Clears SW, caches, localStorage, sessionStorage
});

// REQUIRED: Clear state when testing fresh installations
test('shows install button after engagement', async ({ page, homePage }) => {
  await clearPWAState(page); // Fresh state
  await setEngagementData(page, 2, 30_000);
  await simulateBeforeInstallPrompt(page);
  // ...
});
```

**When NOT to clear state:**

- Tests that depend on cached content
- Tests validating cache persistence
- Sequential tests verifying state transitions

---

### 7. Network State Management (REQUIRED)

**ALWAYS use context-level helpers for network state**

```typescript
import { goOffline, goOnline } from '../helpers/pwa-helpers';

// CORRECT: Use context-level helpers
test('handles online-offline transitions', async ({ context, homePage }) => {
  await goOffline(context);
  await triggerOfflineEvent(homePage.page);

  await goOnline(context);
  await triggerOnlineEvent(homePage.page);
});

// NEVER: Mix context and page-level operations
await context.setOffline(true); // ❌ Use goOffline(context)
await page.evaluate(() => (navigator.onLine = false)); // ❌ Use goOffline(context)
```

---

### 8. Forbidden Patterns (NEVER DO)

```typescript
// NEVER: Import from @playwright/test directly
import { test, expect } from '@playwright/test'; // ❌ Use '../fixtures/pwa-fixtures'

// NEVER: Manually instantiate page objects
const homePage = new HomePage(page); // ❌ Use fixtures

// NEVER: Skip SW wait + reload for PWA features
await goOffline(context); // ❌ Missing waitForServiceWorkerActive() and reload()
await homePage.reload();

// NEVER: Direct API calls instead of helpers
await context.setOffline(true); // ❌ Use goOffline(context)
await page.evaluate(() => globalThis.dispatchEvent(new Event('offline'))); // ❌ Use triggerOfflineEvent(page)

// NEVER: Test implementation details
expect(serviceWorkerInternalState).toBe('cached'); // ❌ Test user-visible behavior

// NEVER: Use test.only or test.skip without explicit user request
test.only('example', async () => {}); // ❌ Remove before commit
test.skip('example', async () => {}); // ❌ Only if user requests

// NEVER: Forget to reload after SW activation
await waitForServiceWorkerActive(page);
await goOffline(context); // ❌ Missing reload to populate cache
```

---

### 9. Edge Cases (E2E-Specific)

**ALWAYS test these PWA scenarios in E2E:**

| Category                       | Required Test Cases                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------- |
| **Offline/Online Transitions** | Online → offline → online cycles; Offline at page load; Multiple pages cached      |
| **Service Worker Lifecycle**   | Registration on first visit; Update detection; Activation after update             |
| **Install Prompt**             | Engagement threshold; User accepts; User dismisses; Prompt after engagement        |
| **Manifest Validation**        | All required properties; Icon sizes; Theme color; Shortcuts; BASE_PATH replacement |
| **Cache Persistence**          | Content loads offline; Multiple pages cached; Cache survives page reload           |

**NEVER test in E2E:**

- Unit-level logic (use Vitest for src/ modules)
- Implementation details (internal cache keys, SW state names)
- Exhaustive permutations (test representative cases)

---

## Troubleshooting

### Common E2E Failures → Solutions

| Error                             | Cause                             | Fix                                                       |
| --------------------------------- | --------------------------------- | --------------------------------------------------------- |
| "Connection refused"              | `_book/` not built                | Run `make render-pwa`                                     |
| "Service worker not found"        | Build artifacts missing           | Verify `_book/service-worker.js` exists                   |
| "Executable doesn't exist"        | Playwright browsers not installed | Run `npx playwright install --with-deps`                  |
| "Element not found" after offline | Missing SW wait or reload         | Add `waitForServiceWorkerActive()` + `reload()`           |
| "Install button not visible"      | LocalStorage not cleared          | Use `clearPWAState(page)` in `beforeEach`                 |
| Test timeout                      | SW registration too slow          | Increase timeout in `playwright.config.ts`                |
| "Cache match failed"              | URL normalization issue           | Use `pwaPage.isURLCached()` instead of direct cache.match |

---

## Quick Checklist (Pre-Submit)

Before finalizing E2E test code, verify:

- [ ] `npm install` completed
- [ ] Playwright browsers installed (`npx playwright install --with-deps`)
- [ ] `make render-pwa` built artifacts successfully
- [ ] Imported `test` and `expect` from `../fixtures/pwa-fixtures`
- [ ] Used fixtures for page objects (never manual instantiation)
- [ ] `waitForServiceWorkerActive()` before PWA feature tests
- [ ] `reload()` after SW activation to populate cache
- [ ] Used helper functions from `pwa-helpers.ts`
- [ ] AAA pattern with clear comments
- [ ] `clearPWAState()` when fresh state required
- [ ] Test names describe user scenarios, not implementation
- [ ] No `test.only` or `test.skip` left in code
- [ ] Tests pass in all browsers (Chromium, Firefox, WebKit)

---

**For complete E2E testing guidance, see [TESTING.md](../../TESTING.md#e2e-testing-with-playwright)**
