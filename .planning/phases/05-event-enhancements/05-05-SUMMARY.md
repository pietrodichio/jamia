---
phase: 05-event-enhancements
plan: 05
subsystem: api
tags: [nestjs, teachers, event-management, rest-api, authorization]

# Dependency graph
requires:
  - phase: 05-event-enhancements
    plan: 02
    provides: event_teachers database table with RLS policies
  - phase: 03-event-foundation
    plan: 03
    provides: EventOrganizersService pattern for co-resource management
provides:
  - TeachersService for teacher association CRUD operations
  - REST endpoints for managing event teachers under /events/:eventId/teachers
  - Authorization via is_event_owner_or_organizer RPC function
  - Public teacher listing endpoint
affects: [event-frontend, teacher-ui, event-detail-views]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Nested RESTful routes for sub-resources
    - Public endpoint pattern with @Public() decorator
    - Mirror proven service patterns for consistency

key-files:
  created:
    - apps/backend/src/events/teachers/dto/add-teacher.dto.ts
    - apps/backend/src/events/teachers/teachers.service.ts
    - apps/backend/src/events/teachers/teachers.controller.ts
    - apps/backend/src/events/teachers/teachers.module.ts
  modified:
    - apps/backend/src/events/events.module.ts

key-decisions:
  - "Mirror EventOrganizersService pattern for consistency and proven architecture"
  - "Public GET endpoint for teacher listings (RLS handles visibility)"
  - "Owner or co-organizer authorization for add/remove operations"
  - "Super admin bypass in all authorization checks for administrative control"

patterns-established:
  - "Teacher management pattern: Nested routes under parent resource (/events/:eventId/teachers)"
  - "Authorization pattern: Check is_event_owner_or_organizer RPC function before mutations"
  - "Public data pattern: @Public() decorator bypasses auth guard for GET endpoints"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 5 Plan 5: Event Teachers API Summary

**REST API for managing event teacher associations with owner/co-organizer authorization and public listings**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T20:29:11Z
- **Completed:** 2026-01-21T20:31:34Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- TeachersService with addTeacher, removeTeacher, listTeachers methods mirroring EventOrganizersService pattern
- REST endpoints with nested routes (POST/DELETE/GET /events/:eventId/teachers)
- Authorization via is_event_owner_or_organizer RPC function with super admin bypass
- Public teacher listing endpoint using @Public() decorator
- Audit logging for add/remove teacher actions
- Module wiring complete with TeachersModule integrated into EventsModule

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AddTeacherDto** - `f9a0de4` (feat)
2. **Task 2: Create TeachersService** - `a9f1467` (feat)
3. **Task 3: Create TeachersController and module** - `bc340a7` (feat)

## Files Created/Modified
- `apps/backend/src/events/teachers/dto/add-teacher.dto.ts` - DTO with user_id and optional role field
- `apps/backend/src/events/teachers/teachers.service.ts` - CRUD operations with authorization checks
- `apps/backend/src/events/teachers/teachers.controller.ts` - REST endpoints with nested routes
- `apps/backend/src/events/teachers/teachers.module.ts` - Feature module exporting TeachersService
- `apps/backend/src/events/events.module.ts` - Updated to import TeachersModule

## Decisions Made

**1. Mirror EventOrganizersService pattern exactly**
- Proven pattern from event co-organizer management already in production
- Consistent authorization approach across platform
- Familiar code structure reduces cognitive load

**2. Public GET endpoint for teacher listings**
- Anyone can view teacher associations (public event metadata)
- RLS policies handle visibility at database level
- Simplifies frontend implementation (no auth required for display)

**3. Owner or co-organizer authorization for mutations**
- Both event owner and co-organizers can add/remove teachers
- Follows established pattern from is_event_owner_or_organizer RPC function
- Super admin bypass first in all checks (consistent privilege model)

**4. Nested RESTful routes**
- /events/:eventId/teachers pattern clearly shows sub-resource relationship
- Standard REST convention for resources belonging to parent
- Intuitive API design for frontend consumption

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

**Pre-existing compilation errors in events.service.ts**
- Found compilation errors in events.service.ts related to audit actions (cancel_occurrence, update_occurrence, split_recurring_series)
- These errors are NOT related to the TeachersModule implementation
- TeachersModule compiles successfully in isolation (verified with pnpm build before errors appeared)
- These are pre-existing issues from other work in Phase 5
- Does not block teacher management functionality

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Frontend UI for teacher selection and display
- Integration with event creation/edit forms
- Teacher listing on event detail pages

**API endpoints available:**
- `GET /events/:eventId/teachers` - List teachers (public access)
- `POST /events/:eventId/teachers` - Add teacher (owner/co-organizer/admin only)
- `DELETE /events/:eventId/teachers/:teacherId` - Remove teacher (owner/co-organizer/admin only)

**Authorization model:**
- Anyone can view teachers (public endpoint)
- Owner + co-organizers + super admins can add/remove teachers
- POST/DELETE endpoints protected by SupabaseAuthGuard
- Audit trail logged for add/remove actions

**Database integration:**
- Uses event_teachers table from Plan 05-02
- Leverages is_event_owner_or_organizer RPC function
- RLS policies enforce proper visibility and authorization

**No blockers or concerns.**

---
*Phase: 05-event-enhancements*
*Completed: 2026-01-21*
