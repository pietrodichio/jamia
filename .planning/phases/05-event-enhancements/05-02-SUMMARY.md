---
phase: 05-event-enhancements
plan: 02
subsystem: database
tags: [supabase, postgresql, rls, many-to-many, teachers, events]

# Dependency graph
requires:
  - phase: 03-event-foundation
    provides: Events table and authorization patterns
provides:
  - event_teachers junction table for many-to-many teacher associations
  - Indexes for efficient bidirectional queries (events by teacher, teachers by event)
  - RLS policies for teacher association authorization
affects: [05-03, event-api, event-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Many-to-many junction table pattern for teacher associations

key-files:
  created:
    - apps/web/supabase/migrations/20260121120100_add_event_teachers.sql
  modified: []

key-decisions:
  - "Junction table pattern for teachers over ARRAY column (better bidirectional query performance)"
  - "Teachers are display-only metadata with no special permissions beyond event authorization"
  - "RLS policy allows anyone to view teachers but only owners/co-organizers can manage"

patterns-established:
  - "Teacher association pattern: many-to-many with optional role field for display purposes"
  - "Authorization reuses existing is_event_owner_or_organizer function"

# Metrics
duration: 7min
completed: 2026-01-21
---

# Phase 5 Plan 2: Event Teachers Database Schema Summary

**Many-to-many teacher associations with junction table, bidirectional indexes, and RLS authorization**

## Performance

- **Duration:** 7 min
- **Started:** 2026-01-21T19:17:55Z
- **Completed:** 2026-01-21T19:24:51Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- event_teachers junction table created for many-to-many teacher associations
- Indexes added for efficient bidirectional queries (event_id, user_id)
- RLS policies enable public viewing with owner/co-organizer management
- Optional role field for display purposes (e.g., "lead instructor", "assistant")

## Task Commits

Each task was committed atomically:

1. **Task 1: Create event_teachers junction table** - `0ecb82b` (feat)

## Files Created/Modified
- `apps/web/supabase/migrations/20260121120100_add_event_teachers.sql` - Junction table for event-teacher associations with RLS policies

## Decisions Made

**1. Junction table over ARRAY column**
- Better query performance for bidirectional lookups (events by teacher, teachers by event)
- Follows established PostgreSQL patterns from event_organizers table
- Enables optional metadata fields like role descriptor

**2. Teachers as display-only metadata**
- No special permissions granted to teachers (they're not organizers)
- Teachers can be associated by event owners/co-organizers
- Anyone can view teacher associations (public data)

**3. Reuse existing authorization function**
- Leverages is_event_owner_or_organizer for consistency
- Includes super admin bypass pattern established in Phase 3

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Initial file creation issue:** Write tool indicated success but file wasn't created on first attempt. Second Write operation succeeded and migration was applied successfully. This appears to be a transient filesystem issue that resolved on retry.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- API endpoints for managing teacher associations (CRUD operations)
- Frontend UI for teacher selection and display
- Integration with event creation/edit forms

**Database foundation complete:**
- Table structure mirrors proven patterns from event_organizers
- Indexes optimize both query directions (events→teachers, teachers→events)
- RLS policies enforce proper authorization
- Optional role field supports display variations without schema changes

**No blockers or concerns.**

---
*Phase: 05-event-enhancements*
*Completed: 2026-01-21*
