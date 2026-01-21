---
phase: 04-event-discovery
plan: 02
subsystem: api
tags: [nestjs, dto, class-validator, rest-api, geospatial, authentication]

# Dependency graph
requires:
  - phase: 04-event-discovery
    provides: PostGIS RPC function search_events_by_location from 04-01
  - phase: 03-event-foundation
    provides: EventsService and EventsController patterns, DTO validation approach
provides:
  - SearchEventsDto with comprehensive parameter validation
  - EventsService.searchEvents method calling PostGIS RPC function
  - Public GET /events/search REST endpoint
  - @Public() decorator pattern for unauthenticated routes
affects: [04-03-frontend-search, 04-04-calendar-view]

# Tech tracking
tech-stack:
  added: []
  patterns: [public-decorator-pattern, query-param-validation, public-rest-endpoints]

key-files:
  created:
    - apps/backend/src/events/dto/search-events.dto.ts
    - apps/backend/src/auth/public.decorator.ts
  modified:
    - apps/backend/src/events/events.service.ts
    - apps/backend/src/events/events.controller.ts
    - apps/backend/src/auth/supabase-auth.guard.ts

key-decisions:
  - "@Public() decorator pattern for selective route authentication bypass"
  - "Reflector-based metadata check in guard for public routes"
  - "Search endpoint positioned before :id route to prevent conflicts"
  - "@Query() decorator for GET query parameter validation"
  - "Default radius 50000 meters applied in service if not provided"

patterns-established:
  - "Public route pattern: @Public() decorator with Reflector metadata check in guard"
  - "DTO validation for query params: @Type(() => Number) for numeric string conversion"
  - "RPC parameter mapping: DTO field names to RPC argument names"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 04 Plan 02: Search API Endpoint Summary

**REST API endpoint for location-based event search with validation, calling PostGIS RPC function via Supabase, with public access via @Public() decorator pattern**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T16:47:39Z
- **Completed:** 2026-01-21T16:50:33Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments

- Created SearchEventsDto with class-validator constraints for all search parameters
- Added searchEvents method to EventsService calling PostGIS RPC function
- Implemented public GET /events/search endpoint with proper route ordering
- Established @Public() decorator pattern for unauthenticated route access

## Task Commits

Each task was committed atomically:

1. **Task 1: Create SearchEventsDto with validation** - `a2470a5` (feat)
2. **Task 2: Add searchEvents method to EventsService** - `b615431` (feat)
3. **Task 3: Add search endpoint to EventsController** - `34608e6` (feat)

**Plan metadata:** (will be committed separately)

## Files Created/Modified

- `apps/backend/src/events/dto/search-events.dto.ts` - Validates location params (lng, lat), optional filters (radius, types, dateFrom, dateTo, keyword) with class-validator decorators
- `apps/backend/src/auth/public.decorator.ts` - SetMetadata decorator for marking routes as public
- `apps/backend/src/auth/supabase-auth.guard.ts` - Enhanced with Reflector to check IS_PUBLIC_KEY metadata, bypassing authentication for public routes
- `apps/backend/src/events/events.service.ts` - Added searchEvents method mapping DTO to RPC function parameters
- `apps/backend/src/events/events.controller.ts` - Added @Public() @Get('search') endpoint positioned before :id route

## Decisions Made

1. **@Public() decorator pattern**: Implemented standard NestJS pattern for selective authentication bypass. Uses SetMetadata with IS_PUBLIC_KEY constant, checked via Reflector in guard. Cleaner than moving guards to method level or creating separate controllers.

2. **Guard enhancement via Reflector**: Modified SupabaseAuthGuard to inject Reflector and check getAllAndOverride for IS_PUBLIC_KEY metadata before enforcing authentication. Returns true immediately if public, maintaining existing auth logic for protected routes.

3. **Route ordering**: Positioned /events/search before /events/:id to prevent 'search' being interpreted as an id parameter. Standard NestJS practice for specific routes before parameterized routes.

4. **Query parameter type conversion**: Used @Type(() => Number) decorator for numeric query params (lng, lat, radius). Query params arrive as strings; class-transformer converts them before validation.

5. **Service-level defaults**: Applied default radius of 50000 meters in EventsService if not provided by DTO. Keeps DTO validation focused on constraints, service focused on business logic.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added @Public() decorator pattern for unauthenticated routes**
- **Found during:** Task 3 (Adding search endpoint)
- **Issue:** Controller has class-level @UseGuards(SupabaseAuthGuard), but plan requires "NO authentication guard needed" for public event search. Without mechanism to bypass guard, search would require authentication, blocking anonymous users from discovering events (violates LOC-01 requirement).
- **Fix:** Created @Public() decorator using SetMetadata with IS_PUBLIC_KEY constant. Modified SupabaseAuthGuard to inject Reflector and check for public metadata before enforcing authentication. Applied @Public() to search endpoint.
- **Files modified:** apps/backend/src/auth/public.decorator.ts (created), apps/backend/src/auth/supabase-auth.guard.ts, apps/backend/src/events/events.controller.ts
- **Verification:** TypeScript compilation succeeds, guard now supports mixed authentication requirements
- **Committed in:** 34608e6 (Task 3 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Auto-fix essential for public event search requirement. Standard NestJS pattern for mixed authentication, no scope creep. Without this, anonymous users couldn't search events.

## Issues Encountered

None - all tasks completed as planned with one critical auto-fix for public access.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for frontend integration:**
- GET /events/search endpoint available at backend
- Public access enabled (no authentication required)
- Query parameter validation enforces constraints
- Returns events with distance_meters field for "X km away" display
- All filters functional: location + radius, types, dateFrom, dateTo, keyword

**API contract:**
```
GET /events/search?lng=-122.4194&lat=37.7749&radius=50000&types=jam,class&dateFrom=2026-01-21&dateTo=2026-12-31&keyword=beginner
```

**Response format:**
```json
[
  {
    "id": "uuid",
    "type": "jam",
    "title": "Event Title",
    "location_text": "Location Name",
    "location_lat": 37.7749,
    "location_lng": -122.4194,
    "starts_at": "2026-01-25T10:00:00Z",
    "ends_at": "2026-01-25T12:00:00Z",
    "status": "published",
    "distance_meters": 1234.56,
    "...": "all other event fields"
  }
]
```

**Key integration points for frontend:**
- Use existing API client pattern (e.g., events.api.ts)
- Convert radius from km (UI) to meters (API) in client
- Handle query param serialization for arrays (types)
- Parse distance_meters for display

**No blockers identified.**

---
*Phase: 04-event-discovery*
*Completed: 2026-01-21*
