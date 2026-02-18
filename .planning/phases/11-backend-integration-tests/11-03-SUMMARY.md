---
phase: 11-backend-integration-tests
plan: 03
subsystem: testing
tags: [nestjs, supertest, jest, controller-testing, integration-testing, nested-routes, e2e]

# Dependency graph
requires:
  - phase: 11-01
    provides: createTestApp pattern with ValidationPipe, SupabaseAuthGuard override, supertest integration

provides:
  - EventOrganizersController integration tests covering nested route /events/:eventId/organizers
  - Expanded e2e test with afterEach teardown, /health smoke test, ValidationPipe setup
  - Pre-existing test bug fixes: jams.service.spec (missing eventsService), events.service.spec (missing profiles mock), participants.service.spec (wrong mock ordering)

affects:
  - phase-12-e2e-testing

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Nested route controller test pattern: all supertest paths use /events/:eventId/organizers prefix
    - 204 No Content verification: expect({}) for empty body on DELETE
    - E2e test teardown: afterEach app.close() to prevent Jest from hanging

key-files:
  created:
    - apps/backend/src/event-organizers/event-organizers.controller.spec.ts
  modified:
    - apps/backend/test/app.e2e-spec.ts
    - apps/backend/src/jams/jams.service.spec.ts
    - apps/backend/src/events/events.service.spec.ts
    - apps/backend/src/participants/participants.service.spec.ts

key-decisions:
  - "Test 204 No Content by expecting empty body ({}) not status alone - supertest parses empty response body as empty object"
  - "E2e tests require running Supabase instance - acceptable for now, noted in comments"
  - "Pre-existing test failures fixed as Rule 1 (Bug) deviations - all spectific to mock mismatch with service evolution"

patterns-established:
  - "Nested route testing: supertest paths mirror @Controller decorator prefix exactly"
  - "E2e test has afterEach app.close() - always include to prevent Jest from hanging"
  - "profiles mock required in events.service.spec when getEventById is called internally"

# Metrics
duration: 7min
completed: 2026-02-18
---

# Phase 11 Plan 03: EventOrganizersController Tests + E2E Expansion Summary

**EventOrganizersController integration tests for nested /events/:eventId/organizers route (16 tests), expanded e2e test with proper teardown, and fixed 3 pre-existing test suites (58 tests total now pass)**

## Performance

- **Duration:** 7 min
- **Started:** 2026-02-18T22:02:16Z
- **Completed:** 2026-02-18T22:10:05Z
- **Tasks:** 2 planned + 3 bug fixes (deviation)
- **Files modified:** 5

## Accomplishments
- 16 EventOrganizersController tests covering GET/POST/DELETE on nested /events/:eventId/organizers route
- Proper HTTP status codes: 201 Created (POST), 204 No Content (DELETE)
- DTO validation: missing userId → 400, non-string userId → 400
- Error propagation: ForbiddenException → 403, NotFoundException → 404
- E2e test expanded: afterEach teardown, /health smoke test, ValidationPipe matching production
- Full test suite now passes: 216 tests across 13 suites (was 208/216 before)

## Task Commits

Each task was committed atomically:

1. **Task 1: Write EventOrganizersController integration tests** - `511ed3f` (test)
2. **Task 2: Expand e2e test + fix pre-existing failures** - `2e6e817` (test)

**Plan metadata:** (committed with SUMMARY.md)

## Files Created/Modified
- `apps/backend/src/event-organizers/event-organizers.controller.spec.ts` - 16-test suite for nested organizer route
- `apps/backend/test/app.e2e-spec.ts` - Added afterEach, /health test, ValidationPipe
- `apps/backend/src/jams/jams.service.spec.ts` - Fixed missing eventsService 4th constructor arg (40 calls)
- `apps/backend/src/events/events.service.spec.ts` - Added profiles mock to updateEvent/deleteEvent tests (7 tests)
- `apps/backend/src/participants/participants.service.spec.ts` - Fixed mock ordering for promote-from-waitinglist flow

## Decisions Made
- Test 204 No Content by verifying empty response body `expect({})` - supertest parses empty body as empty object, status alone not sufficient
- E2e tests noted as requiring running Supabase instance - commented in file, acceptable for now, no mocking to keep full-stack verification
- AddCoOrganizerDto defined inline in controller file (not dto/), imported implicitly via controller under test

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fix jams.service.spec.ts: missing eventsService as 4th constructor arg**
- **Found during:** Task 2 (running full test suite after e2e changes)
- **Issue:** JamsService constructor takes 4 params (supabase, auditService, emailService, eventsService) but the spec passed only 3. TypeScript allows this since extra params are optional at runtime. eventsService became undefined, causing `Cannot read properties of undefined (reading 'syncJamUpdate')` in 5 tests.
- **Fix:** Added `const eventsService = { createEventFromJam, syncJamUpdate, deleteEventFromJam }` to describe block and `eventsService as any` as 4th arg to all 40 `new JamsService(...)` calls
- **Files modified:** apps/backend/src/jams/jams.service.spec.ts
- **Verification:** All 40 jams service tests pass
- **Committed in:** 2e6e817 (Task 2 commit)

**2. [Rule 1 - Bug] Fix events.service.spec.ts: missing profiles mock in updateEvent/deleteEvent tests**
- **Found during:** Task 2 (running full test suite)
- **Issue:** `getEventById` (called internally by `updateEvent` and `deleteEvent`) queries `profiles` table for organizer details. The tests set up `events` mocks but not `profiles` mocks, causing `No mock configuration for table "profiles" call #1` errors in 7 tests.
- **Fix:** Added `profiles: [{ response: { data: { id, first_name, last_name }, error: null } }]` to all affected test mocks. Also added `status: 'published'` or `status: 'draft'` to event data where missing (required for proper visibility checks in getEventById).
- **Files modified:** apps/backend/src/events/events.service.spec.ts
- **Verification:** All 14 events service tests pass
- **Committed in:** 2e6e817 (Task 2 commit)

**3. [Rule 1 - Bug] Fix participants.service.spec.ts: incorrect mock ordering for promote-from-waitinglist flow**
- **Found during:** Task 2 (running full test suite)
- **Issue:** The "promotes the first waiting participant" test had extra mock entries for queries that never execute when `telegram_chat_id` is null. The "Telegram notification jam query" and "getJamParticipantCount (count query)" mocks were consuming mock slots before the actual promote-update mock, causing `insertedUpdates` to remain empty.
- **Fix:** Removed spurious mock entries (Telegram notification jam query, count query, extra profiles) that only execute in the `if (chatId)` branch which is skipped when telegram_chat_id is null. Restructured jams mock from 3 entries to 2, jam_participants from 6 to 5, profiles from 3 to 1.
- **Files modified:** apps/backend/src/participants/participants.service.spec.ts
- **Verification:** All 13 participants service tests pass
- **Committed in:** 2e6e817 (Task 2 commit)

---

**Total deviations:** 3 auto-fixed (3x Rule 1 - Bug)
**Impact on plan:** All fixes corrected pre-existing spec failures that were missed when service code evolved (eventsService dependency added, getEventById gained profiles query, cancelParticipation gained conditional telegram branch). No scope creep.

## Issues Encountered
- None during planned task execution. Pre-existing failures were discovered and fixed as Rule 1 deviations.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Phase 11 complete: all 3 plans done (infrastructure, EmailPreferences/Profiles controllers, EventOrganizers controller + e2e)
- 216 backend tests pass across 13 suites with zero failures
- Ready for Phase 12: E2E Testing with Playwright for critical user flows

---
*Phase: 11-backend-integration-tests*
*Completed: 2026-02-18*
