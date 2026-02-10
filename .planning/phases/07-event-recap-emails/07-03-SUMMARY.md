---
phase: 07-event-recap-emails
plan: 03
subsystem: ui
tags: [react, tanstack-query, react-i18next, shadcn-ui, email-preferences]

# Dependency graph
requires:
  - phase: 07-02
    provides: Email preferences backend API with GET/PATCH endpoints
provides:
  - Frontend API client for email preferences
  - EmailPreferencesCard component with Switch and RadioGroup
  - ProfileSetup page integration with email preferences
  - Italian translations for email preferences UI

affects: [Phase 8 (email engine adoption), user onboarding flows]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Self-contained card components with independent React Query data fetching
    - Opt-out email preference pattern (pre-checked toggle for new users)
    - Optimistic UI updates with local state before API response

key-files:
  created:
    - apps/web/src/api/email-preferences.api.ts
    - apps/web/src/components/settings/EmailPreferencesCard.tsx
  modified:
    - apps/web/src/pages/ProfileSetup.tsx
    - apps/web/src/locales/it/common.json

key-decisions:
  - "Self-contained EmailPreferencesCard manages own data fetching and mutations independently of profile form"
  - "New user detection based on phone field presence (phone is required, null = incomplete profile)"
  - "Optimistic local state for new users (show toggle ON before API response)"
  - "Auto-save defaults for new users on mount (digest_enabled: true, frequency: monthly)"
  - "Always send both digest_enabled and digest_frequency together to prevent race conditions"

patterns-established:
  - "Independent settings cards pattern: separate React Query flows, not part of form submission"
  - "Opt-out email preference UX: pre-checked toggle for new users, explicit opt-in for returning users"
  - "Translation namespace usage: common namespace for shared settings UI text"

# Metrics
duration: 2min
completed: 2026-02-10
---

# Phase 7 Plan 3: Email Preferences UI Summary

**Frontend email digest preferences with self-contained settings card, opt-out pattern for new users, and ProfileSetup integration**

## Performance

- **Duration:** 2 min
- **Started:** 2026-02-10T17:30:05Z
- **Completed:** 2026-02-10T17:32:23Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- API client mirrors backend email-preferences endpoints (GET, PATCH)
- EmailPreferencesCard component with Switch for digest toggle and RadioGroup for frequency selection
- Integrated into ProfileSetup page as separate card below profile form
- Opt-out pattern for new users (pre-checked toggle, auto-save on mount)
- Italian translations for all email preference UI text
- React Query handles data fetching, mutations, and cache invalidation
- Toast feedback on save success/error

## Task Commits

Each task was committed atomically:

1. **Task 1: Create API client and EmailPreferencesCard component** - `d8671c5` (feat)
2. **Task 2: Integrate EmailPreferencesCard into ProfileSetup page** - `20126c0` (feat)

## Files Created/Modified
- `apps/web/src/api/email-preferences.api.ts` - API client with getPreferences and updatePreferences methods
- `apps/web/src/components/settings/EmailPreferencesCard.tsx` - Self-contained settings card with Switch and conditional RadioGroup
- `apps/web/src/pages/ProfileSetup.tsx` - Added userId/isNewUser state, wrapped cards in container, conditionally render EmailPreferencesCard
- `apps/web/src/locales/it/common.json` - Added emailPreferences namespace with Italian translations

## Decisions Made

1. **Self-contained card pattern:** EmailPreferencesCard manages its own React Query data fetching and mutations, completely independent of the profile form submission flow. This ensures email preferences can be updated without affecting profile save logic.

2. **New user detection:** Detect new users by checking if `profile.phone` is null (phone is required field, so null = never completed profile setup). This enables the opt-out pattern for first-time users.

3. **Optimistic UI for new users:** Show toggle as ON by default (optimistic local state) even before API response, then auto-save `{ digest_enabled: true, digest_frequency: 'monthly' }` on mount. This implements the opt-out pattern requirement from CONTEXT.md.

4. **Race condition prevention:** Always send both `digest_enabled` and `digest_frequency` together in update mutations (as documented in RESEARCH.md Pitfall 3). This prevents partial updates causing inconsistent state.

5. **ProfileSetup layout:** Wrap both cards in container div with `space-y-6` instead of modifying the profile form. EmailPreferencesCard only renders after userId is available (after auth check completes).

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components compiled successfully, translations valid JSON, build passed on first attempt.

## User Setup Required

None - no external service configuration required. The email preferences UI connects to the existing backend API endpoints from Plan 07-02.

## Next Phase Readiness

Email preferences frontend complete. Ready for:
- **Phase 8 Plan 1:** Email template design and HTML generation
- **Phase 8 Plan 2:** Scheduled digest job using email preferences data
- User adoption/growth UX enhancements (onboarding flows, nudges)

All user-facing preference controls are now in place. The digest scheduler in Phase 8 can query users with `digest_enabled=true` and respect their `digest_frequency` preference.

---
*Phase: 07-event-recap-emails*
*Completed: 2026-02-10*
