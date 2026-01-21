---
phase: 04-event-discovery
plan: 06
subsystem: ui
tags: [react, react-query, event-detail, haversine, date-fns, shadcn-ui]

# Dependency graph
requires:
  - phase: 04-02
    provides: Search API endpoint with EventWithOrganizer response
  - phase: 04-03
    provides: useEventFilters hook for URL-based filter state
provides:
  - EventDetail page with comprehensive event information display
  - getEvent API method for single event fetch with organizer details
  - Client-side distance calculation from search location
  - Route /events/:eventId for deep linking to events
  - Navigation flow completion (List/Calendar -> EventDetail)
affects: [04-07, phase-05]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client-side haversine distance calculation for display
    - EventWithOrganizer type usage for organizer information
    - useParams for route parameter extraction
    - React Query query key pattern ['events', eventId]

key-files:
  created:
    - apps/web/src/pages/EventDetail.tsx
  modified:
    - apps/web/src/api/events.api.ts
    - apps/web/src/App.tsx

key-decisions:
  - "Client-side distance calculation is for display only (authoritative distance from backend search results)"
  - "Back navigation goes to /calendar (not /discover) as primary event view"
  - "Badge variants match event types: jam=default, class=secondary, workshop=outline, convention=destructive"
  - "EventWithOrganizer type provides organizer details without additional API call"

patterns-established:
  - "Event detail pages fetch full event with organizer info in single query"
  - "Distance shown only when search location exists in URL params"
  - "External links and Google Maps links open in new tab"
  - "Loading/error/not-found states with helpful messages and navigation"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 04 Plan 06: Event Detail Page Summary

**EventDetail page with full event information, organizer details, distance calculation, and shareable URLs**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T16:57:49Z
- **Completed:** 2026-01-21T17:00:44Z
- **Tasks:** 3
- **Files modified:** 3

## Accomplishments
- Created getEvent API method returning EventWithOrganizer with full organizer information
- Built EventDetail page displaying all event fields (title, type, dates, location, description, price, links, organizer)
- Added /events/:eventId route for deep linking and shareability
- Implemented client-side distance calculation when search location present
- Completed navigation flow from list/calendar views to detail page

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getEvent method to events API client** - `9827c26` (feat)
2. **Task 2: Create EventDetail page component** - `8f95783` (feat)
3. **Task 3: Add route and update EventCard with navigation** - `bf2d971` (feat)

## Files Created/Modified
- `apps/web/src/api/events.api.ts` - Added getEvent method accepting eventId, returning EventWithOrganizer
- `apps/web/src/pages/EventDetail.tsx` - Event detail page with comprehensive information display, distance calculation, organizer card
- `apps/web/src/App.tsx` - Added /events/:eventId route (public, no auth required)

## Decisions Made

**Client-side distance calculation approach**
- **Decision:** Calculate distance client-side using haversine formula when search location exists
- **Rationale:** Display-only convenience for users. Authoritative distance comes from backend search results (using PostGIS ST_Distance). Client calculation provides context when navigating directly via URL without going through search.
- **Implementation:** Simple haversine function with Earth radius 6371km

**Back navigation to /calendar**
- **Decision:** "Back to Calendar" link instead of "Back to discover" or dynamic back navigation
- **Rationale:** Calendar is currently the primary event view. DiscoverEvents (list view) was just created in parallel plan. Calendar is established entry point.
- **Impact:** May want to make dynamic based on referrer in future

**EventWithOrganizer type usage**
- **Decision:** Use EventWithOrganizer type (includes organizer details) instead of base Event type
- **Rationale:** Backend GET /events/:id already returns organizer details from Phase 3 implementation. No additional API call needed.
- **Benefit:** Single query provides all detail page information

**Badge variant mapping for event types**
- **Decision:** Consistent badge variants across list and detail views (jam=default, class=secondary, workshop=outline, convention=destructive)
- **Rationale:** Visual consistency. EventCard already uses this mapping, maintaining same convention.

## Deviations from Plan

None - plan executed exactly as written.

**Note:** Plan Task 3 mentioned updating EventCard with navigation. EventCard already had navigation implemented (created in parallel plan 04-07). Verified navigation working in both EventCard (line 16-17 handleClick) and CalendarView (line 99 onSelectEvent).

## Issues Encountered

None - all planned functionality implemented successfully.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready:**
- Event detail page fully functional at /events/:eventId
- Deep linking works (shareable URLs)
- Navigation from calendar and list views complete
- All event information displayed (dates, location, description, price, links, organizer)
- Distance from search point shown when applicable
- Loading/error states handled gracefully

**For Phase 5 (Event Management):**
- Event detail foundation ready for "Edit" and "Delete" buttons (for event owners)
- Can add co-organizer management UI
- Can add event status badges (draft/published/archived)

**For Future Enhancement:**
- Dynamic back navigation based on referrer (currently hardcoded to /calendar)
- City search integration (deferred to Phase 5) will enable better location context
- Event photo/image upload could enhance detail page

---
*Phase: 04-event-discovery*
*Completed: 2026-01-21*
