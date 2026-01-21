---
phase: 04-event-discovery
plan: 03
subsystem: api
tags: [typescript, react, react-router, hooks, geolocation, url-state, axios]

# Dependency graph
requires:
  - phase: 03-04
    provides: Frontend events API layer with type-safe clients
  - phase: 04-02
    provides: Backend search API with location/filter endpoint
provides:
  - useGeolocation hook for browser-based location requests
  - useEventFilters hook for URL-based filter state management
  - searchEvents API client method for location-based event search
  - use-debounce dependency for text search optimization
affects: [event-discovery-ui, event-search, filter-components]

# Tech tracking
tech-stack:
  added: [use-debounce]
  patterns:
    - URL-based filter state for bookmarkable search results
    - Browser Geolocation API hook pattern with loading/error states
    - Query parameter management with replace: true (no history pollution)
    - Radius unit conversion (km UI to meters API)

key-files:
  created:
    - apps/web/src/hooks/useGeolocation.ts
    - apps/web/src/hooks/useEventFilters.ts
  modified:
    - apps/web/src/api/events.api.ts
    - apps/web/package.json

key-decisions:
  - "Use replace: true in setSearchParams to avoid polluting browser history"
  - "Convert radius from km (UI-friendly) to meters (API expectation) in API client"
  - "Store all filter state in URL params for bookmarkability and shareability"

patterns-established:
  - "URL-based filter state using React Router useSearchParams"
  - "Geolocation hook pattern with requestLocation() trigger function"
  - "Array parameter handling via URLSearchParams.getAll() and append()"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 04 Plan 03: Frontend Search Infrastructure Summary

**Browser geolocation hook, URL-based filter management, and type-safe searchEvents API client with radius conversion**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T16:42:42Z
- **Completed:** 2026-01-21T16:44:36Z
- **Tasks:** 3
- **Files modified:** 4

## Accomplishments
- Created useGeolocation hook with browser geolocation API integration
- Built useEventFilters hook managing all search parameters in URL
- Added searchEvents method to events API client with proper parameter mapping
- Installed use-debounce for future text search optimization

## Task Commits

Each task was committed atomically:

1. **Task 1: Install use-debounce and create useGeolocation hook** - `ab9056e` (feat)
2. **Task 2: Create useEventFilters hook with URL state management** - `da8144c` (feat)
3. **Task 3: Add searchEvents method to events API client** - `e2c3b10` (feat)

## Files Created/Modified

### Created
- `apps/web/src/hooks/useGeolocation.ts` - Browser geolocation hook with loading, error, and location states; requestLocation() trigger function; 5-minute cache
- `apps/web/src/hooks/useEventFilters.ts` - URL-based filter state management with support for query, types, dates, location, and radius; clearFilters utility

### Modified
- `apps/web/src/api/events.api.ts` - Added searchEvents method accepting location, radius, types, date range, and keyword; converts radius km to meters
- `apps/web/package.json` - Added use-debounce dependency

## Decisions Made

**1. Use replace: true in setSearchParams**
- Prevents polluting browser history with every filter change
- Follows research pitfall #7 from 04-RESEARCH.md
- Better UX: back button returns to previous page, not previous filter state

**2. Convert radius from km to meters in API client**
- UI/UX uses kilometers (more user-friendly: "50 km radius")
- Backend API expects meters (database PostGIS standard)
- Conversion happens in searchEvents method: `radius * 1000`

**3. Store all filter state in URL parameters**
- Enables bookmarkable search results
- Supports sharing search URLs
- Maintains state across page refreshes
- Follows React Router URL state pattern from research

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Search infrastructure complete, ready for UI components:**
- useGeolocation() provides browser location with permission prompts
- useEventFilters() manages all search parameters in URL
- eventsApi.searchEvents() calls backend with proper parameter mapping
- use-debounce available for text search input optimization

**Frontend can now:**
- Request user's current location via browser API
- Read/write filter state from/to URL parameters
- Search events by location with radius, type, date, and keyword filters
- Display search results with distance from search point

**Next steps:**
- Build filter UI components (event type checkboxes, date pickers, keyword input)
- Build location search UI (geolocation button, manual lat/lng input)
- Integrate hooks with React Query for search data fetching
- Build event list and calendar views

---
*Phase: 04-event-discovery*
*Completed: 2026-01-21*
