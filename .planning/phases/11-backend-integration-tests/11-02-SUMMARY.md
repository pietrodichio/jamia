---
phase: 11-backend-integration-tests
plan: 02
subsystem: testing
tags: [jest, nestjs, supertest, class-validator, controller-tests, integration-tests, email-preferences, profiles]

# Dependency graph
requires:
  - phase: 11-01
    provides: createTestApp factory pattern, overrideGuard pattern, ValidationPipe replication
provides:
  - EmailPreferencesController integration test suite (14 test cases)
  - ProfilesController integration test suite (15 test cases)
  - Mixed auth pattern tests (public endpoints via @Public decorator alongside authenticated endpoints)
affects:
  - 11-03-event-organizers-tests
  - 12-e2e-testing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Same createTestApp factory pattern from 11-01 applied to EmailPreferencesController and ProfilesController
    - Unauthorized access describe block with canActivate:()=>false for guard denial tests
    - Documents @Public() decorator behavior: test guard override blocks all routes regardless of @Public() metadata

key-files:
  created:
    - apps/backend/src/email-preferences/email-preferences.controller.spec.ts
    - apps/backend/src/profiles/profiles.controller.spec.ts
  modified: []

key-decisions:
  - "@Public() routes blocked when guard override uses canActivate:()=>false — test guard does not check Reflector, so @Public() metadata is ignored; documented in tests"
  - "transform: true in ValidationPipe coerces @Query() params typed as number? — limit query string '5' arrives as numeric 5 at service; assertion updated to match"

patterns-established:
  - "Pattern: document @Public() test guard override behavior inline in describe block comment so future tests know why the sub-test is skipped"
  - "Pattern: use expect.not.objectContaining for whitelist stripping assertions (confirm hacker_field absent)"

# Metrics
duration: 3min
completed: 2026-02-18
---

# Phase 11 Plan 02: EmailPreferencesController and ProfilesController Tests Summary

**EmailPreferencesController (14 tests) and ProfilesController (15 tests) integration tests covering mixed public/auth endpoints, DTO validation, error propagation, and guard denial**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-18T22:01:49Z
- **Completed:** 2026-02-18T22:04:39Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Wrote 14 test cases for EmailPreferencesController: authenticated GET/PATCH preferences, public unsubscribe POST/GET (with valid token and 404 for bad token), DTO validation (invalid digest_frequency returns 400 with property-keyed error), guard denial (403 on authenticated endpoints)
- Wrote 15 test cases for ProfilesController: authenticated search GET/PATCH, public profile GET (with 404 for missing), DTO validation (invalid main_role enum returns 400), whitelist stripping (unknown fields not passed to service), ForbiddenException (403 when updating another user's profile), guard denial (403)
- All 29 new tests pass, zero regressions in existing passing tests

## Task Commits

Each task was committed atomically:

1. **Task 1: Write EmailPreferencesController integration tests** - `5994467` (test)
2. **Task 2: Write ProfilesController integration tests** - `0a4dfda` (test)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `apps/backend/src/email-preferences/email-preferences.controller.spec.ts` - EmailPreferencesController integration tests (294 lines, 14 test cases)
- `apps/backend/src/profiles/profiles.controller.spec.ts` - ProfilesController integration tests (317 lines, 15 test cases)

## Decisions Made

- `@Public()` routes are blocked when guard override uses `canActivate: () => false` — the mock guard does not inject Reflector or check IS_PUBLIC_KEY metadata, so all routes are blocked regardless of decorator. Documented with comment in the unauthorized-access describe blocks. The plan anticipated this and said to skip the sub-test if this is the case.
- `transform: true` in ValidationPipe coerces `@Query()` params typed as `number?` in the controller signature — `limit` query string `"5"` arrives as numeric `5` at the service. Initial assertion used `"5"` (string) and failed; corrected to `5` (number).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Biome formatting applied to email-preferences controller spec**

- **Found during:** Task 1 verification (Biome check)
- **Issue:** Initial controller spec had chained `.post()` and `.get()` calls on separate lines from `request()` — Biome reformatted some to single-line and some to multiline depending on length, and condensed providers array spacing
- **Fix:** Ran `npx biome check --write` to auto-apply all safe formatting fixes
- **Files modified:** apps/backend/src/email-preferences/email-preferences.controller.spec.ts
- **Verification:** `npx biome check` reports no errors after fix; all 14 tests still pass
- **Committed in:** `5994467` (Task 1 commit, file staged after fix)

**2. [Rule 1 - Bug] Fixed incorrect limit type assertion in ProfilesController test**

- **Found during:** Task 2 first test run
- **Issue:** Asserted `limit` would be passed as string `"5"` but `transform: true` in ValidationPipe coerces `@Query('limit') limit?: number` to numeric `5`
- **Fix:** Updated assertion from `"5"` to `5` and added comment explaining the coercion behavior
- **Files modified:** apps/backend/src/profiles/profiles.controller.spec.ts
- **Verification:** Test passes with numeric `5` assertion
- **Committed in:** `0a4dfda` (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 Rule 1 - bug/style fixes)
**Impact on plan:** Both auto-fixes necessary for correctness. No scope creep.

## Issues Encountered

Pre-existing failures in `jams.service.spec.ts` (5 tests), `participants.service.spec.ts`, and `events.service.spec.ts` (confirmed pre-existing before this plan per 11-01 SUMMARY). Not caused by this plan's changes.

## Next Phase Readiness

- EmailPreferencesController and ProfilesController fully covered with 29 test cases
- Pattern remains identical to 11-01: Plan 11-03 (EventOrganizersController) can follow the same createTestApp factory, guard override, and ValidationPipe replication
- All controller spec files are now Biome-compliant (auto-formatted)

---
*Phase: 11-backend-integration-tests*
*Completed: 2026-02-18*
