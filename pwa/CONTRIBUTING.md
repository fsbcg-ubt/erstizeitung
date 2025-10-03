# Contributing Guidelines

## Code Comments

Comments explain **why**, not **what**. Code shows what it does—comments explain why it does it.

### Write Comments That Explain

**Design decisions:**

```typescript
// Guard against null (race condition fix)
if (!newWorker) return;
```

**Non-obvious behavior:**

```typescript
// Trigger reflow for animation
element.offsetHeight;
```

**Business logic:**

```typescript
// Show if user has 2+ visits OR 30+ seconds engagement
return visitCount >= 2 || totalTime >= 30000;
```

### Don't Write Comments That Repeat Code

**Obvious actions:**

```typescript
// Bad: Clear DOM
document.body.innerHTML = '';

// Bad: Set engagement data
localStorage.setItem('pwa-engagement', data);

// Bad: Fast-forward 3 seconds
vi.advanceTimersByTime(3000);
```

**Self-documenting code:**

```typescript
// Bad: Create dismiss button
const dismissButton = document.createElement('button');

// Bad: Remove button from DOM
button.remove();

// Bad: Check if button exists
if (button) { ... }
```

### Exception: Complex Code

Explain "what" when the code is genuinely hard to parse:

```typescript
// Normalize path: remove trailing slash, handle empty
return basePath?.trim().replace(/\/$/, '') || '';
```

### Review Checklist

Before committing, check each comment:

- [ ] Does it explain **why** or document a gotcha?
- [ ] Would the code be unclear without it?
- [ ] Is it still accurate after recent changes?

If you answer "no" to all three, delete the comment.
