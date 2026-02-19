# Phase 12 Plan 04: Discovery and Jam E2E Tests Summary

Event discovery and jam participation E2E tests with GitHub Actions CI workflow.

## Completed Tasks

### Task 1: Discovery and Jam Participation E2E Tests
- Created `DiscoverPage` POM with locators and methods for event discovery
- Added `discovery.spec.ts` with 4 tests:
  - Page loads and shows seeded events
  - Can filter events by type
  - Can search events by keyword
  - Shows empty state when no events match filters
- Added `jam-participation.spec.ts` with 3 tests:
  - Can view jam details page
  - Can join a jam and cancel participation
  - Shows correct state for authenticated non-owner user
- Added jam seed data to `seed.sql` for E2E tests
- Updated fixtures to export `DiscoverPage` and auth state constants
- Fixed playwright config to use port 3000 (matching vite.config.ts)

### Task 2: GitHub Actions CI Workflow
- Created `.github/workflows/playwright.yml` triggered on push to main
- Installs only Chromium browser (free tier friendly)
- Starts Supabase and NestJS backend with local environment variables
- Uploads HTML report as artifact for debugging failures
- 30-minute timeout to prevent runaway CI costs

## Key Files

### Created
- `apps/web/e2e/pages/DiscoverPage.ts` (182 lines) - Page Object Model for discover page
- `apps/web/e2e/tests/discovery.spec.ts` (111 lines) - Event discovery E2E tests
- `apps/web/e2e/tests/jam-participation.spec.ts` (132 lines) - Jam participation E2E tests
- `.github/workflows/playwright.yml` (64 lines) - CI workflow for Playwright

### Modified
- `apps/web/e2e/fixtures/index.ts` - Added DiscoverPage fixture export
- `apps/web/supabase/seed.sql` - Added jam test data
- `apps/web/playwright.config.ts` - Fixed base URL to port 3000

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Use URL params for location in discover tests | Bypasses IP location fetch which doesn't work in test environment |
| Bob's auth state for jam participation tests | Avoids ownership conflicts (Bob is not owner of seeded jams) |
| Added jam seed data | Required for jam participation tests since seed.sql only had events |
| Port 3000 in playwright config | Matches vite.config.ts server port setting |
| curl loop for backend health check | More reliable than wait-on in CI |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Port mismatch in playwright.config.ts**
- **Found during:** Task 1 verification
- **Issue:** Playwright config expected port 8080 but vite.config.ts uses port 3000
- **Fix:** Updated playwright.config.ts baseURL and webServer.url to port 3000
- **Commit:** 9bc6db7

**2. [Rule 2 - Missing Critical] No jam seed data**
- **Found during:** Task 1
- **Issue:** seed.sql only had events, no legacy jams for participation tests
- **Fix:** Added jam seed data to seed.sql (Jam Test Milano, Jam Test Firenze)
- **Commit:** 9bc6db7

## Notes for Next Phase

### Test Execution
- Tests are designed to work in CI with fresh database
- Local execution requires:
  1. Backend running on port 8080 with local Supabase env vars
  2. Frontend (Vite) running on port 3000
  3. Supabase running with seeded data
- Use `SKIP_DB_RESET=true` to skip database reset when running locally

### CI Workflow
- Workflow triggers only on push to main (not PRs) to stay within free tier
- Backend uses local Supabase credentials embedded in workflow
- Consider adding PR trigger with appropriate rate limiting in future

## Commits

| Hash | Message |
|------|---------|
| 9bc6db7 | test(12-04): add discovery and jam participation E2E tests |
| be77085 | ci(12-04): add GitHub Actions workflow for Playwright E2E tests |

## Duration

~25 minutes
