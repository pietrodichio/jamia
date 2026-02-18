---
phase: 10-frontend-testing-infrastructure
plan: 01
subsystem: testing
tags: [vitest, react-testing-library, msw, jsdom, testing-infrastructure]

# Dependency graph
requires: []
provides:
  - Vitest 3.2.4 configured with jsdom environment and globals
  - renderWithProviders utility with QueryClient (retry:false) + MemoryRouter
  - MSW 2.x server with default event API and ipapi.co handlers
  - Global test setup with jest-dom matchers, Radix UI shims, react-i18next mock
  - pnpm test/test:run/test:coverage scripts
affects:
  - 10-frontend-testing-infrastructure/10-02 (all component tests depend on this infrastructure)
  - 11-backend-integration-tests (different setup, but sets testing patterns)
  - 12-e2e-testing (different setup)

# Tech tracking
tech-stack:
  added:
    - vitest@3.2.4
    - "@vitest/coverage-v8@3.2.4"
    - "@testing-library/react"
    - "@testing-library/user-event"
    - "@testing-library/jest-dom"
    - msw@2.x
    - jsdom
    - vite-tsconfig-paths
  patterns:
    - Standalone vitest.config.ts (not mergeConfig) when vite.config.ts exports a function
    - renderWithProviders with fresh QueryClient per test for isolation
    - MSW 2.x http/HttpResponse syntax (not legacy rest syntax)
    - Biome domains.test for Vitest globals recognition
    - retry:false + staleTime:Infinity on test QueryClient prevents timeouts

key-files:
  created:
    - apps/web/vitest.config.ts
    - apps/web/src/test/setup.ts
    - apps/web/src/test/render-utils.tsx
    - apps/web/src/test/msw-handlers.ts
    - apps/web/src/test/msw-server.ts
  modified:
    - apps/web/package.json
    - apps/web/tsconfig.app.json
    - apps/web/biome.json
    - pnpm-lock.yaml

key-decisions:
  - "Pin vitest to 3.2.4 (not latest 4.x) - Vitest 4.x requires Vite 6+, project uses Vite 5.4.x"
  - "Standalone vitest.config.ts instead of mergeConfig - vite.config.ts exports a function which mergeConfig cannot handle"
  - "retry:false + staleTime:Infinity on test QueryClient - prevents 30s+ test timeouts from React Query retries"
  - "MSW 2.x http/HttpResponse syntax - breaking change from MSW 1.x rest syntax"
  - "react-i18next global mock returning translation keys as values - enables testing without i18n setup"
  - "Biome domains.test:recommended - enables Vitest globals (describe, it, expect, vi) without lint errors"

patterns-established:
  - "Test files at src/test/ for infrastructure, co-located tests at src/**/*.test.tsx for components"
  - "renderWithProviders for any component test needing React Query or routing context"
  - "createTestQueryClient for tests that need direct query client access"
  - "MSW handler overrides per test via server.use() for custom scenarios"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 10 Plan 01: Frontend Testing Infrastructure Setup Summary

**Vitest 3.2.4 + React Testing Library + MSW 2.x infrastructure with jsdom, renderWithProviders, Radix UI shims, and react-i18next mock**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-18T20:59:48Z
- **Completed:** 2026-02-18T21:02:12Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Vitest 3.2.4 installed and configured with jsdom environment, globals, and coverage via v8
- Test utilities created: renderWithProviders (QueryClient + MemoryRouter), MSW server with event API and ipapi.co handlers
- Global setup file configures jest-dom matchers, MSW lifecycle, Radix UI browser API shims, matchMedia mock, and react-i18next global mock
- Biome configured to recognize Vitest globals without lint errors
- Smoke test confirmed end-to-end infrastructure works

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies and configure build tools** - `9a1b534` (chore)
2. **Task 2: Create test utilities (setup, render, MSW)** - `b3ef429` (feat)

## Files Created/Modified
- `apps/web/vitest.config.ts` - Standalone Vitest config with jsdom, globals, setup file reference, coverage
- `apps/web/src/test/setup.ts` - Global setup: jest-dom, MSW lifecycle, Radix UI shims, matchMedia, react-i18next mock
- `apps/web/src/test/render-utils.tsx` - renderWithProviders + createTestQueryClient utilities
- `apps/web/src/test/msw-handlers.ts` - Default MSW 2.x handlers for events API and ipapi.co
- `apps/web/src/test/msw-server.ts` - MSW Node.js server instance
- `apps/web/package.json` - Added test/test:run/test:coverage scripts; devDependencies updated
- `apps/web/tsconfig.app.json` - Added vitest/globals and @testing-library/jest-dom types
- `apps/web/biome.json` - Added domains.test:recommended for Vitest globals
- `pnpm-lock.yaml` - Lock file updated with new dependencies

## Decisions Made
- Pin vitest to 3.2.4 (not v4) because Vitest 4.x requires Vite 6+ and this project uses Vite 5.4.x
- Standalone vitest.config.ts: vite.config.ts uses `defineConfig(({ mode }) => ...)` (function), `mergeConfig` expects an object - standalone config with duplicate react-swc plugin is correct approach
- MSW 2.x uses `http`/`HttpResponse` imports (not legacy `rest`/`ctx` from 1.x)
- `retry: false` + `staleTime: Infinity` on test QueryClient prevents React Query's default 3 retries with exponential backoff from causing 30s+ test timeouts
- Global react-i18next mock returns translation keys as values - allows testing component structure without requiring i18n initialization

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All testing infrastructure in place - Plan 02 can immediately write component tests
- renderWithProviders available for all component tests
- MSW handlers can be extended per test with server.use()
- Biome will not flag Vitest globals in test files

---
*Phase: 10-frontend-testing-infrastructure*
*Completed: 2026-02-18*
