---
phase: 03-event-foundation
plan: 01
subsystem: database
tags: [supabase, postgresql, rls, authorization, events, migrations]

# Dependency graph
requires:
  - phase: 01-monorepo-migration
    provides: Monorepo structure with apps/web containing Supabase setup
  - phase: 02-open-source-preparation
    provides: Existing database migrations with jams and jam_managers patterns
provides:
  - Events and event_organizers database tables with RLS policies
  - Authorization function is_event_owner_or_organizer for permission checks
  - Multi-type event system foundation (jam, class, workshop, convention)
affects: [03-02, 03-03, event-api, event-frontend]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single table with type discriminator for similar entity types
    - Service-level authorization with SECURITY DEFINER functions
    - RLS policies checking owner OR co-organizer status

key-files:
  created:
    - apps/web/supabase/migrations/20260121000000_create_events_tables.sql
  modified: []

key-decisions:
  - "Single events table with type discriminator instead of separate tables per type"
  - "Mirror jam_managers pattern for event_organizers (proven authorization model)"
  - "Regular columns instead of JSONB for type-specific data (better queryability)"
  - "Event status enum (draft/published/archived) matching jams pattern"

patterns-established:
  - "Authorization function pattern: is_event_owner_or_organizer checks owner_id OR EXISTS in organizers"
  - "RLS policy pattern: published visible to all, owner/organizers can manage, admins override all"
  - "Co-organizer table pattern: unique(event_id, user_id), added_by audit trail"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 3 Plan 1: Events Database Schema Summary

**Multi-type events system with type discriminator, co-organizer support, and RLS policies mirroring proven jams architecture**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T10:16:50Z
- **Completed:** 2026-01-21T10:18:26Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments
- Events table created with type discriminator supporting 4 event types (jam, class, workshop, convention)
- Event_organizers table established for co-organizer management with audit trail
- Complete RLS policy suite (7 policies total) with authorization function for permission checks
- All indexes created for RLS performance optimization

## Task Commits

Each task was committed atomically:

1. **Task 1: Create events table with type discriminator and all required fields** - `d8fbb2b` (feat)
2. **Task 2: Create event_organizers table mirroring jam_managers pattern** - `31d6690` (feat)
3. **Task 3: Create RLS policies and authorization function** - `74be87d` (feat)

## Files Created/Modified
- `apps/web/supabase/migrations/20260121000000_create_events_tables.sql` - Complete events system schema with tables, indexes, RLS policies, and authorization function

## Decisions Made

**1. Single table with type discriminator instead of separate tables**
- All 4 event types share 90% of fields (title, location, dates, description, price)
- Single table simplifies queries across all event types
- Type-specific fields added as optional columns (better queryability than JSONB)

**2. Mirror jam_managers authorization pattern**
- Proven pattern already in production for jams
- Owner + co-organizers + super admins authorization hierarchy
- Reuses existing is_admin() function, adds new is_event_owner_or_organizer()

**3. Status enum matching jams pattern**
- Draft/published/archived workflow matches user expectations from jams
- RLS policy allows viewing published events OR owned/co-organized events
- Consistent experience across jams and events

**4. Regular columns instead of JSONB for type-specific data**
- Research showed type-specific needs are minimal and known
- Regular columns perform better for queries and indexes
- Can add JSONB later if truly dynamic fields needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - migration file created successfully with all components verified.

## User Setup Required

None - no external service configuration required. Migration will be applied when deployed to Supabase.

## Next Phase Readiness

**Ready for:**
- Plan 03-02: Event API implementation (backend service + DTOs)
- Plan 03-03: Event frontend (create/edit/list events)

**Database foundation complete:**
- Tables created with proper foreign keys and constraints
- RLS policies enable secure multi-user access
- Authorization function ready for service-level checks
- Indexes in place for performance

**No blockers or concerns.**

---
*Phase: 03-event-foundation*
*Completed: 2026-01-21*
