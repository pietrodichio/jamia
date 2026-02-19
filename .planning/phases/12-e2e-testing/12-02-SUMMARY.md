---
phase: 12-e2e-testing
plan: 02
subsystem: testing
tags: [playwright, e2e, authentication, auth-flow]

dependency-graph:
  requires: [12-01]
  provides: [auth-e2e-tests]
  affects: [12-03, 12-04]

tech-stack:
  added: []
  patterns: [empty-storage-state, toast-assertion, url-wait-pattern]

key-files:
  created:
    - apps/web/e2e/tests/auth.spec.ts
  modified:
    - apps/web/vite.config.ts

decisions:
  - id: empty-storage-state
    context: Auth tests must start without authentication
    choice: Use storageState with empty cookies and origins
    rationale: Ensures clean slate for each test without pre-authenticated sessions

  - id: toast-error-first
    context: Error toasts appear in multiple DOM elements (toast content + aria-live region)
    choice: Use exact match with .first() selector
    rationale: Avoids strict mode violation when multiple elements match error text

  - id: flexible-dashboard-check
    context: Dashboard may redirect to profile-setup or email-confirmation based on user state
    choice: Check for any protected route instead of strictly dashboard
    rationale: Sign-in success is proven by redirect away from /auth to any protected route

  - id: vite-strict-port
    context: Playwright config expects port 3000, Vite may auto-increment if port in use
    choice: Add strictPort: true to vite.config.ts
    rationale: Ensures consistent port for E2E test infrastructure

metrics:
  duration: 12 min
  completed: 2026-02-19
---

# Phase 12 Plan 02: Authentication E2E Tests Summary

Authentication E2E test suite with 6 test cases covering sign-in, sign-up, errors, and route protection

## What Was Built

### Test Coverage

**Sign In Tests (3 cases):**
- Valid credentials: Signs in and redirects to protected route (dashboard/profile-setup/email-confirmation)
- Invalid credentials: Shows "Invalid login credentials" error, stays on /auth
- Non-existent email: Shows "Invalid login credentials" error, stays on /auth

**Sign Up Tests (2 cases):**
- New user: Registers and redirects to /email-confirmation with confirmation page
- Existing email: Shows "User already registered" error, stays on /auth

**Route Protection (1 case):**
- Unauthenticated access to /dashboard redirects to /auth

### Test Patterns Used

1. **Empty storageState**: `test.use({ storageState: { cookies: [], origins: [] } })` ensures tests start unauthenticated
2. **AuthPage POM**: Uses `authPage.signIn()` and `authPage.signUp()` methods for clean interaction code
3. **Toast assertions**: Uses `exact: true` with `.first()` to handle duplicate error text in DOM
4. **URL wait pattern**: Uses `page.waitForURL()` with predicate for flexible redirect checking

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed vite port conflict**
- **Found during:** Test execution
- **Issue:** Vite auto-incremented port when 3000 was in use, breaking Playwright config
- **Fix:** Added `strictPort: true` to vite.config.ts
- **Files modified:** apps/web/vite.config.ts
- **Commit:** ba4465f

**2. [Rule 1 - Bug] Fixed strict mode violations on error locators**
- **Found during:** Test execution
- **Issue:** Error text appeared in both toast content and aria-live region, causing multiple matches
- **Fix:** Used `{ exact: true }` and `.first()` selectors
- **Files modified:** apps/web/e2e/tests/auth.spec.ts
- **Commit:** ba4465f

**3. [Rule 2 - Missing Critical] Made dashboard check flexible**
- **Found during:** Test execution
- **Issue:** Dashboard redirects to profile-setup for users without phone, breaking strict /dashboard check
- **Fix:** Changed to check for any protected route after sign-in success
- **Files modified:** apps/web/e2e/tests/auth.spec.ts
- **Commit:** ba4465f

## Verification

```bash
# All 9 tests pass (including 3 setup tests)
cd apps/web && SKIP_DB_RESET=true pnpm exec playwright test auth.spec.ts --project=mobile-chromium
# Output: 9 passed (8.3s)
```

## Commit

- `ba4465f`: test(12-02): add authentication E2E tests

## Next Phase Readiness

Phase 12 Plan 03 (Event Discovery Tests) can proceed - auth test patterns established.
