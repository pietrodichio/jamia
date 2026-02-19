---
phase: 12-e2e-testing
plan: 01
subsystem: testing
tags: [playwright, e2e, testing, infrastructure]

dependency-graph:
  requires: [10-frontend-testing, 11-backend-tests]
  provides: [playwright-config, auth-setup, db-reset, fixtures, auth-pom]
  affects: [12-02, 12-03, 12-04]

tech-stack:
  added: [@playwright/test]
  patterns: [setup-projects, page-object-model, auto-fixtures]

key-files:
  created:
    - apps/web/playwright.config.ts
    - apps/web/e2e/setup/db.setup.ts
    - apps/web/e2e/setup/auth.setup.ts
    - apps/web/e2e/fixtures/index.ts
    - apps/web/e2e/pages/AuthPage.ts
  modified:
    - apps/web/package.json
    - apps/web/.gitignore
    - pnpm-lock.yaml

decisions:
  - id: esm-dirname-polyfill
    context: Project uses type:module (ESM)
    choice: Use fileURLToPath(import.meta.url) pattern for __dirname
    rationale: ESM does not provide __dirname by default, polyfill required

metrics:
  duration: 4 min
  completed: 2026-02-19
---

# Phase 12 Plan 01: Playwright Infrastructure Summary

Playwright E2E testing foundation with config, setup projects, fixtures, and AuthPage POM

## What Was Built

### Playwright Configuration
- Sequential execution (workers: 1, fullyParallel: false) per CONTEXT decisions
- Three projects with dependency chain: db-reset -> auth-setup -> mobile-chromium
- iPhone 14 viewport for mobile-first testing
- Italian locale (it-IT) for proper text matching
- CI vs local reporter configuration

### Setup Projects
1. **db-reset**: Runs `supabase db reset --yes` which applies migrations and seeds
2. **auth-setup**: Authenticates alice and bob via Supabase REST API, saves storageState

### Custom Fixtures
- AuthPage POM with Italian label locators (Email, Password, Nome, Conferma Password)
- Auto Google Maps API mock prevents third-party failures
- Exports test, expect, and auth state paths for use in specs

### Scripts Added
- `test:e2e`: Run Playwright tests
- `test:e2e:ui`: Run with UI mode
- `test:e2e:headed`: Run in headed browser

## Key Implementation Details

### Auth Setup via REST API
```typescript
// POST to Supabase auth endpoint
const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY },
  body: JSON.stringify({ email, password }),
});
// Set localStorage key for Supabase auth
await page.evaluate((sessionData) => {
  localStorage.setItem('sb-fuddhnsjxumqhdquvchx-auth-token', JSON.stringify(sessionData));
}, session);
// Save storageState for reuse
await page.context().storageState({ path: statePath });
```

### Google Maps Auto-Mock
```typescript
autoMockGoogleMaps: [
  async ({ page }, use) => {
    await page.route('**/maps.googleapis.com/**', (route) => {
      route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify({ predictions: [], status: 'ZERO_RESULTS' }) });
    });
    await use();
  },
  { auto: true },
],
```

## Commits

| Hash | Message |
|------|---------|
| 5b28644 | feat(12-01): set up Playwright E2E infrastructure with config and setup projects |
| ca021d7 | feat(12-01): add custom fixtures with AuthPage POM and Google Maps mock |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] ESM __dirname not defined**
- **Found during:** Task 1 verification
- **Issue:** `__dirname is not defined in ES module scope` error when running `playwright test --list`
- **Fix:** Added `fileURLToPath(import.meta.url)` polyfill to playwright.config.ts, auth.setup.ts, and db.setup.ts
- **Files modified:** apps/web/playwright.config.ts, apps/web/e2e/setup/auth.setup.ts, apps/web/e2e/setup/db.setup.ts

## Next Phase Readiness

Ready for Wave 2 E2E test specs:
- 12-02: Auth flow tests (login, signup, logout)
- 12-03: Event discovery tests (search, filter, calendar)
- 12-04: Event creation tests (wizard flow)

All infrastructure is in place:
- Database reset works via supabase db reset
- Alice and Bob storageState files will be generated on first run
- Google Maps is auto-mocked globally
- AuthPage POM ready for auth tests
