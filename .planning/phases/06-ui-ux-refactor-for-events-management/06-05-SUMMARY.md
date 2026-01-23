---
phase: 06-ui-ux-refactor-for-events-management
plan: 05
subsystem: ui
tags: [react, react-hook-form, wizard, auto-save, supabase, use-debounce, italian]

# Dependency graph
requires:
  - phase: 06-04
    provides: Unified discovery view and home page redesign
provides:
  - Unified event creation wizard merging jams and events
  - Conditional field components (JamParticipantFields, ExternalRegistrationFields)
  - Draft auto-save with debounced Supabase upserts
  - Single /create-event route replacing separate creation flows
affects: [06-06, 06-07, event-creation, dashboard-integration]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useAutoSave hook with debounced Supabase upserts for draft persistence
    - Conditional field rendering based on event type and manageParticipants flag
    - Wizard navigation with step-by-step validation using trigger()
    - Auto-save status indicator showing saving/saved/error feedback

key-files:
  created:
    - apps/web/src/components/forms/event/JamParticipantFields.tsx
    - apps/web/src/components/forms/event/ExternalRegistrationFields.tsx
    - apps/web/src/hooks/useAutoSave.ts
  modified:
    - apps/web/src/pages/CreateEvent.tsx
    - apps/web/src/hooks/useEventWizard.ts
    - apps/web/src/components/forms/event/EventTypeStep.tsx
    - apps/web/src/components/forms/event/EventScheduleStep.tsx
    - apps/web/src/App.tsx

key-decisions:
  - "useAutoSave with 1000ms debounce and upsert pattern to avoid duplicate draft records"
  - "Conditional fields render only when type and manageParticipants conditions met (using watch)"
  - "/create-jam redirects to /create-event for backward compatibility"
  - "Auto-save creates drafts as user types; submission publishes to status='published'"
  - "Jam capacity/visibility NOT sent to events table (jam management features separate)"

patterns-established:
  - "Pattern: useAutoSave hook - debounce form data, upsert to table with status='draft', track draftId for subsequent saves"
  - "Pattern: Conditional field components - watch form fields, return null if conditions not met, self-register/unregister"
  - "Pattern: Wizard with auto-save - watch() entire form, pass to useAutoSave, display status indicator in header"
  - "Pattern: Draft publishing - if draftId exists, updateMutation with status='published'; else createMutation"

# Metrics
duration: 5min
completed: 2026-01-23
---

# Phase 06 Plan 05: Unified Event Creation with Wizard and Auto-Save Summary

**Three-step wizard merges jam and event creation with conditional fields, draft auto-save, and Italian-localized UI**

## Performance

- **Duration:** 5 min
- **Started:** 2026-01-23T07:56:21Z
- **Completed:** 2026-01-23T08:01:30Z
- **Tasks:** 3
- **Files modified:** 8

## Accomplishments
- Unified creation wizard with three steps (Type + Info, Schedule + Details, Preview)
- Conditional field components adapt UI based on event type and participant management choice
- Draft auto-save creates background saves every 1 second as user fills form
- Single /create-event route replaces separate CreateJam and CreateEvent pages
- Auto-save status indicator provides real-time feedback (Salvataggio.../Salvato/Errore)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create conditional field components for unified flow** - `f4e27e9` (feat)
2. **Task 2: Implement draft auto-save hook** - `baeb647` (feat)
3. **Task 3: Integrate wizard and conditional fields in CreateEvent page** - `fcc426d` (feat)

## Files Created/Modified

### Created
- `apps/web/src/components/forms/event/JamParticipantFields.tsx` - Capacity, visibility (public/private), and roles checkboxes for managed jams
- `apps/web/src/components/forms/event/ExternalRegistrationFields.tsx` - External link and custom CTA text for non-managed events
- `apps/web/src/hooks/useAutoSave.ts` - Debounced auto-save hook with Supabase upsert, returns saveStatus and draftId

### Modified
- `apps/web/src/pages/CreateEvent.tsx` - Redesigned with wizard, auto-save integration, conditional field rendering, and step navigation
- `apps/web/src/hooks/useEventWizard.ts` - Added manageParticipants, capacity, visibility, roles, externalLink, ctaText to schema and default values
- `apps/web/src/components/forms/event/EventTypeStep.tsx` - Added manageParticipants checkbox (jam only) and JamParticipantFields integration
- `apps/web/src/components/forms/event/EventScheduleStep.tsx` - Added ExternalRegistrationFields integration for non-managed events
- `apps/web/src/App.tsx` - Redirected /create-jam to /create-event, removed duplicate /events/new route

## Decisions Made

**1. useAutoSave with 1000ms debounce and upsert pattern**
- **Rationale:** 1 second delay balances responsiveness and API efficiency. Upsert with onConflict: 'id' prevents duplicate draft records.
- **Implementation:** useDebounce from use-debounce library (already in project), track draftId state for subsequent saves.

**2. Conditional field components using watch() for self-contained logic**
- **Rationale:** Each component watches its own conditions (type, manageParticipants) and returns null when not applicable. Cleaner than prop drilling.
- **Implementation:** JamParticipantFields renders only if type === 'jam' AND manageParticipants === true. ExternalRegistrationFields renders inverse condition.

**3. /create-jam redirects to /create-event for backward compatibility**
- **Rationale:** Users may have bookmarked /create-jam. Redirect ensures no broken links.
- **Implementation:** Navigate component in App.tsx routes /create-jam → /create-event with replace flag.

**4. Draft auto-save creates records; submission publishes**
- **Rationale:** Auto-save preserves work-in-progress without requiring user action. Submission changes status from 'draft' to 'published'.
- **Implementation:** useAutoSave upserts with status='draft'. handleSubmit checks draftId: if exists, updateMutation with status='published'; else createMutation.

**5. Jam capacity/visibility NOT sent to events table**
- **Rationale:** Those fields belong to jam management system (separate from event listings). Events table only stores listing data.
- **Implementation:** CreateEvent submission excludes capacity/visibility from eventData DTO. Added comment explaining managed jams use separate system.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components compiled and integrated successfully.

## User Setup Required

None - no external service configuration required. Auto-save uses existing Supabase connection.

## Next Phase Readiness

- Unified creation flow complete and ready for user testing
- /create-event route available, /create-jam backward compatible
- Auto-save provides safety net for form data
- Conditional fields demonstrate jam vs non-jam creation paths
- Ready for dashboard integration and event detail enhancements in subsequent plans

---
*Phase: 06-ui-ux-refactor-for-events-management*
*Completed: 2026-01-23*
