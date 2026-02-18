---
phase: 11-backend-integration-tests
plan: 01
subsystem: testing
tags: [jest, nestjs, supertest, biome, controller-tests, integration-tests, class-validator]

# Dependency graph
requires:
  - phase: 10-frontend-testing-infrastructure
    provides: Biome domains.test pattern for Jest globals in spec files
provides:
  - EventsController integration test suite with createTestApp factory
  - Biome test domain enabled for backend spec files
  - jest-e2e.json moduleNameMapper for @jamia/types
  - Controller test pattern: overrideGuard + ValidationPipe replication
affects:
  - 11-02-email-preferences-tests
  - 11-03-event-organizers-tests
  - 12-e2e-testing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - createTestApp factory with overrideGuard(SupabaseAuthGuard) and ValidationPipe
    - Service mock at module scope with jest.fn() for each controller-called method
    - User injection via canActivate mock setting request.user directly
    - Per-describe-block app lifecycle (beforeEach create, afterEach close)

key-files:
  created:
    - apps/backend/src/events/events.controller.spec.ts
  modified:
    - apps/backend/biome.json
    - apps/backend/test/jest-e2e.json

key-decisions:
  - "Co-locate controller specs as *.controller.spec.ts beside controller file (matches existing service spec convention)"
  - "overrideGuard(SupabaseAuthGuard) class reference (no parentheses) matches @UseGuards(SupabaseAuthGuard) class reference"
  - "canActivate mock sets request.user directly so @User() decorator reads test user without code changes"
  - "Replicate main.ts exceptionFactory exactly in test app — required for DTO validation tests to return property-keyed errors"
  - "jest.clearAllMocks() in beforeEach prevents mock state leaking between tests"
  - "await app.close() in afterEach prevents Jest process hang from open server handle"
  - "canActivate: () => false returns 403 (not 401) — NestJS behavior when guard returns false without throwing"
  - "Biome domains.test:recommended placed inside linter block alongside rules"

patterns-established:
  - "Pattern: createTestApp(userOverride?) factory function — reusable across all controller spec files"
  - "Pattern: mockAdminUser with isSuperAdmin:true for admin context tests"
  - "Pattern: separate describe block with canActivate:()=>false for unauthorized access tests"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 11 Plan 01: Backend Controller Test Infrastructure Summary

**NestJS EventsController integration tests via supertest with overrideGuard pattern, ValidationPipe replication, and Biome test domain for 23 passing test cases**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T21:55:15Z
- **Completed:** 2026-02-18T21:57:31Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Established the createTestApp factory pattern for all future controller tests: Test.createTestingModule with service mock + overrideGuard(SupabaseAuthGuard) + ValidationPipe replication from main.ts
- Wrote 23 test cases covering EventsController: public endpoints (search, public, :id), authenticated CRUD (create, draft, update, publish, delete, my-events, co-organized), DTO validation (type enum, required dates, whitelist stripping), error propagation (404, 403), and unauthorized access (403)
- Fixed Biome config to recognize Jest globals (describe, it, expect, jest) in spec files via domains.test:recommended
- Fixed jest-e2e.json with moduleNameMapper for @jamia/types so e2e tests can resolve workspace imports

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix infrastructure (Biome test domain + jest-e2e moduleNameMapper)** - `d8beb70` (chore)
2. **Task 2: Write EventsController integration tests** - `3775c23` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/backend/src/events/events.controller.spec.ts` - EventsController integration tests (494 lines, 23 test cases)
- `apps/backend/biome.json` - Added domains.test:recommended for Jest global recognition
- `apps/backend/test/jest-e2e.json` - Added moduleNameMapper for @jamia/types resolution in e2e tests

## Decisions Made

- `overrideGuard(SupabaseAuthGuard)` without parentheses — matches the class reference used in `@UseGuards(SupabaseAuthGuard)` on the controller; parentheses would create an instance and the override would fail silently
- Replicate ValidationPipe exceptionFactory from main.ts exactly in test app — without it, DTO validation tests return 201 instead of 400 because global pipes from main.ts are not inherited by test applications
- `canActivate: () => false` returns 403 (not 401) — NestJS intercepts false-returning guards and returns 403 Forbidden; to get 401 you must throw UnauthorizedException
- Biome `domains.test:recommended` placed inside `linter` block alongside `rules` — this is the correct schema position based on Biome 2.2.4 spec
- jest-e2e.json rootDir is `.` (the `test/` directory), so `../../` in moduleNameMapper reaches the monorepo root

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatter fixes applied to controller spec**

- **Found during:** Task 2 verification (Biome check)
- **Issue:** Initial controller spec used single quotes, missing type-only imports, and unsorted imports — all Biome style violations
- **Fix:** Ran `npx biome check --write` to auto-apply all safe fixes (double quotes, import type keywords, sorted imports)
- **Files modified:** apps/backend/src/events/events.controller.spec.ts
- **Verification:** `npx biome check` reports no errors
- **Committed in:** `3775c23` (Task 2 commit, file staged after fix)

---

**Total deviations:** 1 auto-fixed (Rule 1 - style/formatting)
**Impact on plan:** Auto-fix necessary for Biome compliance. No scope creep. All 23 tests still pass after formatting.

## Issues Encountered

None - plan executed as written. Pre-existing failures in `events.service.spec.ts` and `jams.service.spec.ts` (13 tests) confirmed to exist before this plan via git stash verification — not caused by this plan's changes.

## Next Phase Readiness

- Controller test pattern established: createTestApp factory, guard override, ValidationPipe replication, mock service at module scope
- Plans 11-02 and 11-03 can follow identical pattern for EmailPreferencesController and EventOrganizersController
- Biome test domain now active for all backend spec files
- jest-e2e.json ready for e2e tests involving @jamia/types imports

---
*Phase: 11-backend-integration-tests*
*Completed: 2026-02-18*
