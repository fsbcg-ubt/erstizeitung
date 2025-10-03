# PWA Testing - LLM Agent Instructions

LLM-specific automation rules for writing tests in the Erstizeitung PWA project. This file contains ONLY deterministic requirements and agent-specific patterns. For general testing principles, consult the documentation references below.

---

## Documentation References

**REQUIRED: Consult these documents for complete context**

### README.md

- **Installation** → Prerequisites (Node.js, Docker, Make)
- **Configuration** → BASE_PATH setup, manifest customization
- **Testing Commands** → `npm test`, `npm run serve`, test types

### TESTING.md

- **Core Principles** → Test behavior not implementation, no branching in tests
- **Mocking Guidelines** → When to mock, available mocks, mock hierarchy
- **Coverage Strategy** → Functional coverage over code coverage, meaningful edge cases
- **Best Practices** → AAA pattern, async/timers, naming conventions
- **Anti-Patterns** → What NOT to do

### CONTRIBUTING.md

- **Code Comments** → Explain why, not what
- **Comment Guidelines** → When to write comments, what to avoid
- **Review Checklist** → Pre-commit comment validation

---

## LLM Automation Requirements

### 1. Prerequisites Check (REQUIRED)

**Before writing or running tests, verify:**

```bash
# ALWAYS run in this order:
npm ci                  # Install dependencies
npm run build          # Compile TypeScript
make render-pwa        # Build PWA artifacts (integration tests only)
```

**Integration tests REQUIRE built artifacts in `../_book/`**. Unit tests do NOT.

---

### 2. Test Type Decision Tree

```
Does the test need built PWA artifacts?
├─ YES → Integration test (tests/integration/)
│         Requires: make render-pwa
│         Tests: Build output, injected HTML, real files
│
└─ NO  → Unit test (tests/unit/)
          Requires: npm run build only
          Tests: Single module, mocked dependencies
```

**File naming:**

- Source: `src/module-name.ts`
- Unit test: `tests/unit/module-name.test.ts`
- Integration test: `tests/integration/feature-name.test.ts`

---

### 3. Mandatory Test Structure (NON-NEGOTIABLE)

**REQUIRED: Every test file MUST include this exact `beforeEach` block:**

```typescript
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

describe('module-name', () => {
  beforeEach(() => {
    // REQUIRED: Reset all modules (prevents test pollution)
    vi.resetModules();

    // REQUIRED: Clear DOM (if test manipulates DOM)
    document.body.innerHTML = '';

    // REQUIRED: Clear storage (if test uses localStorage)
    localStorage.clear();
  });

  test('scenario description', async () => {
    // REQUIRED: Use dynamic imports for modules under test
    await import('../../src/module-name');

    // Arrange → Act → Assert
  });
});
```

**If using timers, add:**

```typescript
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers(); // REQUIRED: Prevents timer leaks
});
```

---

### 4. Import Rules (REQUIRED)

**Static imports (test utilities only):**

```typescript
import { describe, test, expect, beforeEach, vi } from 'vitest';
```

**Dynamic imports (modules under test):**

```typescript
test('scenario', async () => {
  await import('../../src/module-name'); // Enables clean module state
});
```

**Path resolution from test files:**

- From `tests/unit/`: `../../src/module-name`
- From `tests/integration/`: `../../src/module-name`

**WHY:** Dynamic imports + `vi.resetModules()` ensure each test gets a fresh module instance, preventing state pollution between tests.

---

### 5. Test Splitting Rules (REQUIRED)

**ALWAYS split a test if it contains:**

1. Branching logic (`if/else`, `switch`, ternary operators)
2. More than 3 assertions testing different outcomes
3. Multiple unrelated concerns (DOM + localStorage + network)

**Exception:** Use `test.each` ONLY for identical logic with different inputs:

```typescript
// CORRECT: Same validation logic, different inputs
test.each([
  { input: '', expected: '' },
  { input: '/app', expected: '/app' },
  { input: '/app/', expected: '/app' }, // Boundary case
])('validates $input', ({ input, expected }) => {
  expect(validate(input)).toBe(expected);
});

// INCORRECT: Different code paths (use separate tests)
test.each([
  { online: true, message: 'Online' },
  { online: false, message: 'Offline' },
])('shows $message', ({ online, message }) => {
  // Split into: test('shows online message') and test('shows offline message')
});
```

---

### 6. Edge Cases (REQUIRED Testing)

**ALWAYS test these PWA-specific scenarios:**

| Category                     | Required Test Cases                                                                                       |
| ---------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Service Worker Lifecycle** | pending → installing → activated; updatefound with null worker; multiple update cycles                    |
| **Install Prompt**           | User accepts (`outcome: 'accepted'`); User dismisses (`outcome: 'dismissed'`); Event fires multiple times |
| **Offline Handling**         | Online → offline → online transitions; Offline at page load                                               |
| **API Failures**             | `navigator.serviceWorker.register` throws (network/quota errors)                                          |
| **Race Conditions**          | `registration.installing = null` (async state transitions)                                                |
| **Data Corruption**          | Invalid JSON in localStorage; Missing required fields                                                     |
| **Missing APIs**             | `delete navigator.serviceWorker` (older browsers)                                                         |

**NEVER test:**

- Arbitrary boundaries ("exactly 47 characters")
- Hypothetical scenarios not reachable in app
- Enum exhaustion when behavior is identical

---

### 7. Pre-Configured Mocks (Available)

**Automatically available from `tests/setup/browser.setup.ts`:**

```typescript
// localStorage (use directly)
localStorage.setItem('key', 'value');

// Service Worker
navigator.serviceWorker.register = vi.fn().mockResolvedValue(mockRegistration);

// Online/Offline state
Object.defineProperty(navigator, 'onLine', {
  value: false,
  configurable: true,
});
globalThis.dispatchEvent(new Event('offline'));

// Install prompt
import { createBeforeInstallPromptEvent } from '../setup/browser.setup';
const event = createBeforeInstallPromptEvent('accepted');
window.dispatchEvent(event);
```

---

### 8. Forbidden Patterns (NEVER DO)

```typescript
// NEVER: Test implementation details
test('calls createIndicator', () => {
  const spy = vi.spyOn(module, 'createIndicator');
  action();
  expect(spy).toHaveBeenCalled(); // Breaks on refactoring
});

// NEVER: Forget module reset
describe('module', () => {
  test('test1', async () => {
    await import('../../src/module'); // No vi.resetModules()!
  });
});

// NEVER: Leak timers
test('delays action', () => {
  vi.useFakeTimers();
  setTimeout(() => action(), 1000);
  // Missing vi.useRealTimers() in afterEach!
});

// NEVER: Branch in tests
test('handles multiple scenarios', () => {
  if (condition) {
    expect(a).toBe(b);
  } else {
    expect(c).toBe(d); // Split into separate tests
  }
});
```

---

### 9. Coverage Validation (REQUIRED)

**Thresholds (enforced by CI):**

- All metrics: 70% (lines, functions, branches, statements)

**Validation command:**

```bash
npm run test:coverage
```

**Strategy:**

1. Test use cases, not lines of code
2. Prioritize: Happy path → Error handling → Boundaries → State transitions
3. Avoid redundant tests covering identical code paths

**Coverage reports:** `coverage/index.html`

---

## Troubleshooting

### Common Failures → Solutions

| Error                               | Cause                            | Fix                                              |
| ----------------------------------- | -------------------------------- | ------------------------------------------------ |
| "Module already imported"           | Missing `vi.resetModules()`      | Add to `beforeEach`                              |
| "Timer leaked"                      | Missing `vi.useRealTimers()`     | Add to `afterEach`                               |
| "localStorage is not defined"       | Setup not initialized            | Verify `setupFiles` in `vitest.config.ts`        |
| "Coverage below threshold"          | Insufficient functional coverage | Review `coverage/index.html`, add use case tests |
| "Test passes alone, fails in suite" | Shared mutable state             | Check `beforeEach` cleanup, avoid globals        |

### Integration Test Failures

**Error:** Test can't find files in `../_book/`

**Solution:**

```bash
make render-pwa  # Build artifacts FIRST
npm test         # Then run tests
```

---

## Quick Checklist (Pre-Submit)

Before finalizing test code, verify:

- [ ] `vi.resetModules()` in `beforeEach`
- [ ] Dynamic imports (`await import()`) for modules under test
- [ ] `vi.useRealTimers()` in `afterEach` (if using fake timers)
- [ ] No branching logic in tests (use `test.each` or split)
- [ ] Test names describe scenarios, not implementation
- [ ] Only meaningful edge cases tested
- [ ] Integration tests require `make render-pwa` first

---

**For complete testing guidance, see [TESTING.md](TESTING.md)**
