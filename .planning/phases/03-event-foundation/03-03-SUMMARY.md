---
phase: 03-event-foundation
plan: 03
subsystem: api
tags: [nestjs, co-organizers, authorization, rest-api, event-management]

# Dependency graph
requires:
  - phase: 03-event-foundation
    plan: 01
    provides: Events and event_organizers database tables with RLS policies
  - phase: 01-monorepo-migration
    provides: Monorepo structure with backend NestJS application
  - phase: existing
    provides: Proven ManagersService pattern for co-manager authorization
provides:
  - EventOrganizersService for co-organizer management business logic
  - REST endpoints for adding/removing/listing event co-organizers
  - EventOrganizersModule integrated with EventsModule and AppModule
affects: [03-04, event-authorization, event-editing-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Mirror proven ManagersService pattern for co-organizer management
    - Nested RESTful routes for sub-resources (/events/:eventId/organizers)
    - Super admin bypass pattern in all authorization checks
    - Owner-only permissions for co-organizer management (co-organizers can't add others)

key-files:
  created:
    - apps/backend/src/event-organizers/event-organizers.service.ts
    - apps/backend/src/event-organizers/event-organizers.controller.ts
    - apps/backend/src/event-organizers/event-organizers.module.ts
  modified:
    - apps/backend/src/events/events.module.ts
    - apps/backend/src/app.module.ts

key-decisions:
  - "Mirror ManagersService pattern exactly for production-tested validation logic"
  - "Owner-only permissions for add/remove (co-organizers can edit events but not manage co-organizers)"
  - "Nested routes under /events/:eventId/organizers for RESTful sub-resource pattern"
  - "Include all critical validations: owner !== co-organizer, user exists, no duplicates"

patterns-established:
  - "Co-organizer authorization: Owner OR super admin can add/remove co-organizers"
  - "Access control: Owner OR co-organizer OR super admin can view co-organizer list"
  - "Audit logging: Log organizer_added and organizer_removed actions with metadata"
  - "Module integration: EventOrganizersModule imported in both EventsModule (feature co-location) and AppModule (routes)"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 3 Plan 3: Event Co-Organizers API Summary

**Co-organizer management API mirroring proven ManagersService pattern with owner-only permissions and nested REST endpoints**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T11:20:05Z
- **Completed:** 2026-01-21T11:22:26Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- EventOrganizersService with add/get/remove methods mirroring ManagersService validation patterns
- REST endpoints with nested routes (POST/GET/DELETE /events/:eventId/organizers)
- All critical validations implemented (owner !== co-organizer, user exists, no duplicates)
- Super admin bypass in all authorization checks
- Audit logging for add/remove actions
- Module wiring complete with integration into EventsModule and AppModule

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EventOrganizersService mirroring ManagersService** - `012abe0` (feat)
2. **Task 2: Create EventOrganizersController with REST endpoints** - `f6b867f` (feat)
3. **Task 3: Wire EventOrganizersModule and integrate with EventsModule** - `d68ff60` (feat)

## Files Created/Modified
- `apps/backend/src/event-organizers/event-organizers.service.ts` - Co-organizer management business logic with owner/admin authorization
- `apps/backend/src/event-organizers/event-organizers.controller.ts` - REST endpoints for co-organizer CRUD operations
- `apps/backend/src/event-organizers/event-organizers.module.ts` - Feature module exporting EventOrganizersService
- `apps/backend/src/events/events.module.ts` - Updated to import EventOrganizersModule for feature co-location
- `apps/backend/src/app.module.ts` - Updated to import EventOrganizersModule for route registration

## Decisions Made

**1. Mirror ManagersService pattern exactly**
- Proven pattern from jam_managers already in production
- All validation logic tested and reliable
- Consistent authorization approach across platform

**2. Owner-only permissions for add/remove**
- Only event owner (or super admin) can add/remove co-organizers
- Co-organizers can edit events but not manage other co-organizers
- Prevents permission escalation issues

**3. Nested RESTful routes**
- `/events/:eventId/organizers` pattern clearly shows sub-resource relationship
- Standard REST convention for resources belonging to parent
- Intuitive API design for frontend consumption

**4. All critical validations included**
- Owner cannot add themselves as co-organizer (prevents confusion)
- User existence check before adding (prevents dangling references)
- Duplicate check (prevents same user added twice)
- Super admin bypass FIRST in all authorization (consistent privilege model)

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - backend compiled successfully with all modules properly wired.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for:**
- Event editing UI with co-organizer support
- Authorization checks in EventsService (can use EventOrganizersService.getCoOrganizers)
- Co-organizer management UI in event dashboard

**API endpoints available:**
- `GET /events/:eventId/organizers` - List co-organizers (owner/co-organizer/admin access)
- `POST /events/:eventId/organizers` - Add co-organizer (owner/admin only)
- `DELETE /events/:eventId/organizers/:organizerId` - Remove co-organizer (owner/admin only)

**Authorization model:**
- Owner + co-organizers + super admins can view co-organizers
- Only owner + super admins can add/remove co-organizers
- All endpoints protected by SupabaseAuthGuard
- Audit trail logged for add/remove actions

**No blockers or concerns.**

---
*Phase: 03-event-foundation*
*Completed: 2026-01-21*
