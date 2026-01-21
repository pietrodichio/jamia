---
phase: 04-event-discovery
plan: 07
subsystem: ui
tags: [react, react-query, react-router, shadcn, event-discovery, search]

# Dependency graph
requires:
  - phase: 04-03
    provides: useEventFilters hook and eventsApi.searchEvents
  - phase: 04-04
    provides: LocationSearch, KeywordSearch, EventFilters components
  - phase: 04-05
    provides: Calendar view component pattern
provides:
  - EventCard component for displaying events with distance
  - EventList component with React Query integration
  - DiscoverEvents page composing search/filter UI
  - /discover route for public event discovery
affects: [04-06-event-detail-page, future-event-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Distance formatting (meters to km with < 1 km threshold)
    - React Query enabled query based on filter presence
    - Event list sorted by distance (backend responsibility)
    - Empty state messages for various scenarios
    - Loading skeletons matching card layout

key-files:
  created:
    - apps/web/src/components/events/EventCard.tsx
    - apps/web/src/components/events/EventList.tsx
    - apps/web/src/pages/DiscoverEvents.tsx
  modified:
    - apps/web/src/App.tsx

key-decisions:
  - "Distance formatted as km with < 1 km threshold for nearby events"
  - "React Query enabled only when lat/lng filters present"
  - "Empty state prompts user to set location if not configured"
  - "Event cards clickable to navigate to detail page (created in 04-06)"
  - "Event type badges use variant styling (jam=default, class=secondary, workshop=outline, convention=destructive)"
  - "Loading skeleton shows 3 placeholder cards matching final layout"
  - "Error toast on query failure with alert fallback"

patterns-established:
  - "EventCard: Consistent event display with distance, date, type badge, truncated description"
  - "EventList: React Query pattern with enabled conditional on filter state"
  - "DiscoverEvents: Two-column responsive layout (sidebar filters + main content)"
  - "Distance formatting: meters -> km with 1 decimal, < 1 km special case"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 04 Plan 07: Event Discovery Page with List View Summary

**Complete event discovery interface with location-based search, multi-filter UI, and distance-sorted event list**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T17:51:13Z
- **Completed:** 2026-01-21T17:53:30Z
- **Tasks:** 2
- **Files modified:** 4 (2 created components, 1 created page, 1 route modification)

## Accomplishments

- EventCard component displays events with formatted distance, type badges, and full event details
- EventList component integrates React Query with conditional enabling based on location filters
- DiscoverEvents page composes all search/filter components into cohesive responsive layout
- /discover route added as public (no auth) for event discovery

## Task Commits

Each task was committed atomically:

1. **Task 1: Create EventCard and EventList components** - `eda251a` (feat)
2. **Task 2: Create DiscoverEvents page and add route** - `a4bb014` (feat)

**Plan metadata:** (to be committed after summary)

## Files Created/Modified

- `apps/web/src/components/events/EventCard.tsx` - Individual event display with distance, type badge, date, description, price
- `apps/web/src/components/events/EventList.tsx` - React Query-powered list with loading/error/empty states
- `apps/web/src/pages/DiscoverEvents.tsx` - Main discovery page with two-column layout (filters sidebar + event list)
- `apps/web/src/App.tsx` - Added /discover route (public access)

## Decisions Made

1. **Distance formatting threshold**: Display "< 1 km away" for events under 1 km instead of "0.X km" - more readable
2. **Conditional query enabling**: Only run search query when location (lat/lng) is set - prevents unnecessary API calls
3. **Empty state guidance**: Show "Set your location" message when filters missing instead of generic empty state
4. **Event type badge variants**: Differentiate event types visually (jam=default, class=secondary, workshop=outline, convention=destructive)
5. **Description truncation**: 150 characters with ellipsis for preview in list view
6. **Loading skeleton count**: Show 3 placeholder cards to indicate content loading without jarring layout shift

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all components built successfully, TypeScript compilation passed, integration with existing hooks and API client worked as expected.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for plan 04-06 (Event Detail Page):**
- EventCard includes navigation to `/events/:id` on click
- Event detail page can display full event information
- Pattern established for event display UI

**Phase 4 nearly complete:**
- Only 04-06 remaining (event detail page with organizer info)
- All search and filter infrastructure operational
- Both list and calendar views functional
- Public discovery interface accessible at /discover

**Future enhancements (Phase 5):**
- City/address search instead of coordinate entry (requires geocoding service)
- Map view showing event locations
- Event categories/tags for more granular filtering

---
*Phase: 04-event-discovery*
*Completed: 2026-01-21*
