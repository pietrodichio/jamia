---
phase: 10-frontend-testing-infrastructure
plan: 02
subsystem: testing
tags: [vitest, react-testing-library, msw, hooks, component-tests, fake-timers]

# Dependency graph
requires:
  - 10-01 (Vitest + RTL + MSW infrastructure, renderWithProviders, createTestQueryClient, MSW server)
provides:
  - EventCard component test with 15 cases (rendering, navigation, conditional UI)
  - useEventFilters hook test with 9 cases (URL param reading/updating/clearing)
  - useIpLocation hook test with 3 cases (React Query + MSW integration, error handling)
  - useDebounce hook test with 5 cases (fake timers, timer reset on rapid changes)
  - Four reusable testing patterns as templates for future tests
affects:
  - 11-backend-integration-tests (component/hook patterns documented as reference)
  - 12-e2e-testing (establishes what unit/integration covers, what E2E should focus on)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "vi.mock at module level for utility dependencies (image-utils, event-gradient, event-badges)"
    - "vi.mock react-router-dom to spy on useNavigate in component tests"
    - "MemoryRouter wrapper for hooks using useSearchParams (no QueryClient needed)"
    - "QueryClientProvider wrapper for hooks using useQuery (createTestQueryClient, retry:false)"
    - "server.use() per-test MSW override for error scenarios"
    - "vi.useFakeTimers() + act(() => vi.advanceTimersByTime()) for setTimeout-based hooks"
    - "renderHook with initialProps + rerender for testing hook behavior on prop changes"

key-files:
  created:
    - apps/web/src/components/events/EventCard.test.tsx
    - apps/web/src/hooks/useEventFilters.test.ts
    - apps/web/src/hooks/useIpLocation.test.ts
    - apps/web/src/hooks/useDebounce.test.ts
  modified: []

key-decisions:
  - "Mock image-utils, event-gradient, event-badges at module level - prevents Supabase storage calls in tests, keeps tests focused on component behavior"
  - "Mock useNavigate via vi.mock react-router-dom spread - allows navigation assertion without full route setup"
  - "MemoryRouter (no QueryClient) for useEventFilters - hook only uses useSearchParams, not React Query"
  - "Separate QueryClientProvider wrapper per test for useIpLocation - fresh client avoids query cache pollution"
  - "server.use() override for error test - MSW afterEach resets handlers, so override is scoped to that test only"
  - "vi.useFakeTimers in beforeEach with vi.useRealTimers in afterEach - prevents timer leaks between tests"

patterns-established:
  - "Component test: vi.mock utility deps + vi.mock router navigate + renderWithProviders + userEvent.setup()"
  - "URL-param hook test: MemoryRouter wrapper (no QueryClient) + renderHook + act for state updates"
  - "React Query hook test: createTestQueryClient wrapper + renderHook + waitFor for async assertions"
  - "Timer hook test: vi.useFakeTimers + renderHook initialProps/rerender + act(vi.advanceTimersByTime)"

# Metrics
duration: 4min
completed: 2026-02-18
---

# Phase 10 Plan 02: Critical Component and Hook Tests Summary

**32 tests across 4 files establishing component rendering, URL-param hook, React Query + MSW, and fake-timer testing patterns**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-18T21:06:27Z
- **Completed:** 2026-02-18T21:10:00Z
- **Tasks:** 2
- **Files created:** 4

## Accomplishments

- EventCard component test (15 tests): title, type badge labels (Jam/Lezione/Workshop/Convention), location display with city and text fallback, Italian date format, click navigation via mocked useNavigate, gradient vs image rendering, teacher avatars present/absent/undefined
- useEventFilters hook test (9 tests): default values from empty URL, reading existing query/radius/types/tags, updateFilter string and array variants, empty value removal, clearFilters, setTags
- useIpLocation hook test (3 tests): success with Roma coordinates, isApproximate flag, API error via server.use() MSW override
- useDebounce hook test (5 tests): immediate initial value, no update before delay, update after delay, timer reset on rapid changes, numeric values
- Full suite runs in under 4 seconds; coverage report generates without errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Write EventCard component test** - `620dac1` (test)
2. **Task 2: Write hook tests (useEventFilters, useIpLocation, useDebounce)** - `6e2b33e` (test)

## Files Created

- `apps/web/src/components/events/EventCard.test.tsx` - 174 lines, 15 tests, component rendering pattern
- `apps/web/src/hooks/useEventFilters.test.ts` - 133 lines, 9 tests, URL-param hook pattern
- `apps/web/src/hooks/useIpLocation.test.ts` - 62 lines, 3 tests, React Query + MSW pattern
- `apps/web/src/hooks/useDebounce.test.ts` - 96 lines, 5 tests, fake timers pattern

## Decisions Made

- Mock `@/lib/image-utils`, `@/lib/event-gradient`, `@/lib/event-badges` at module level: prevents Supabase storage calls, keeps component tests focused on rendering logic
- Mock `useNavigate` via `vi.mock('react-router-dom', async () => { ... })` with spread of actual module: enables navigation assertion (`mockNavigate.called`) without requiring a full routing setup with Routes
- `useEventFilters` test uses `MemoryRouter` wrapper only (no QueryClient): hook only reads/writes URL params via `useSearchParams`, no React Query involved
- Separate `createTestQueryClient()` wrapper per `useIpLocation` test: fresh QueryClient ensures no cache leakage between tests
- `server.use()` for error test override in `useIpLocation`: MSW's `afterEach(() => server.resetHandlers())` in global setup ensures the override only applies to that single test
- `vi.useFakeTimers()` in `beforeEach` / `vi.useRealTimers()` in `afterEach`: scopes fake timers to each test to prevent leaking into other test files

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None.

## Next Phase Readiness

- Phase 10 complete - all testing infrastructure and initial test suite in place
- Four testing patterns documented as templates for future test development
- Phase 11 (Backend Integration Tests) can begin: controller tests via supertest, DTO validation
- Phase 12 (E2E Testing) can begin: Playwright setup for critical user flows

---
*Phase: 10-frontend-testing-infrastructure*
*Completed: 2026-02-18*
