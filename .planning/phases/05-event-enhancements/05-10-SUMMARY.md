---
phase: 05-event-enhancements
plan: 10
subsystem: ui
tags: [react, url-filters, multi-select, tag-filtering, amenities]

# Dependency graph
requires:
  - phase: 05-06
    provides: Search API with tag and amenity filtering via GIN indexes
  - phase: 04-03
    provides: URL-based filter pattern and useEventFilters hook
provides:
  - TagFilter component for skill level and attribute filtering
  - AmenityFilters component for accommodation and food options
  - Extended useEventFilters hook with tag array management
  - Integrated filter UI in DiscoverEvents page
affects: [event-discovery-ux, user-bookmarkable-searches]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Multi-select filter components with URL synchronization
    - Array parameter management via URLSearchParams.getAll/append
    - Controlled checkbox groups with toggle pattern

key-files:
  created:
    - apps/web/src/components/events/TagFilter.tsx
    - apps/web/src/components/events/AmenityFilters.tsx
  modified:
    - apps/web/src/hooks/useEventFilters.ts
    - apps/web/src/pages/DiscoverEvents.tsx
    - apps/web/src/components/events/EventList.tsx
    - apps/web/src/api/events.api.ts

key-decisions:
  - "TagFilter component provides 10 predefined tag options matching backend schema"
  - "AmenityFilters separates accommodation (6 options) and food (8 options) into distinct sections"
  - "Array parameters use URLSearchParams.append pattern for multiple values"
  - "Empty arrays omitted from API calls (undefined) to avoid filtering on empty criteria"

patterns-established:
  - "Multi-select URL filter pattern: getAll('param') + append for each value"
  - "Controlled checkbox component: selectedItems array + onChange(newArray) handler"
  - "Filter integration: extend hook, create component, integrate in page, update API call"

# Metrics
duration: 3min
completed: 2026-01-21
---

# Phase 5 Plan 10: Tag and Amenity Filter UI Summary

**Multi-select tag, accommodation, and food filtering with URL persistence for bookmarkable event searches**

## Performance

- **Duration:** 3 min
- **Started:** 2026-01-21T19:56:33Z
- **Completed:** 2026-01-21T19:59:38Z
- **Tasks:** 4
- **Files modified:** 6 (2 created, 4 modified)

## Accomplishments

- Extended useEventFilters hook with tags, accommodationOptions, foodOptions getters and setters
- Created TagFilter component with 10 tag options (skill levels, attributes, pricing)
- Created AmenityFilters component with accommodation (6 options) and food (8 options) filters
- Integrated both filter components into DiscoverEvents page sidebar
- Extended searchEvents API client to pass tag and amenity parameters
- Updated EventList to include new filters in React Query key and API call

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend useEventFilters hook for tag arrays** - `732dc1d` (feat)
2. **Task 2: Create TagFilter component** - `c830825` (feat)
3. **Task 3: Create AmenityFilters component** - `ef9b736` (feat)
4. **Task 4: Integrate filters into DiscoverEvents page** - `0ddd038` (feat)

## Files Created/Modified

- `apps/web/src/hooks/useEventFilters.ts` - Added tags, accommodationOptions, foodOptions state with dedicated setters
- `apps/web/src/components/events/TagFilter.tsx` - Checkbox group for 10 tag options with toggle behavior
- `apps/web/src/components/events/AmenityFilters.tsx` - Dual checkbox groups for accommodation and food filters
- `apps/web/src/pages/DiscoverEvents.tsx` - Integrated TagFilter and AmenityFilters into sidebar
- `apps/web/src/components/events/EventList.tsx` - Extended query to include tag/amenity filters
- `apps/web/src/api/events.api.ts` - Added tags, accommodation_options, food_options to searchEvents signature

## Decisions Made

**1. Ten predefined tag options in TagFilter**
- Matches tag values documented in migration 05-03 comments
- Covers skill levels (beginner-friendly, intermediate, advanced)
- Includes attributes (indoor, outdoor, free, paid, mat-required, bring-partner, drop-in)
- Fixed list ensures consistency with backend validation
- Trade-off: Cannot create custom tags, but ensures data integrity

**2. Separate AmenityFilters for accommodation and food**
- Six accommodation options (hotel, hostel, camping, dormitory, homestay, included)
- Eight food options (meals, dietary preferences)
- Separated into distinct sections with independent handlers
- Enables filtering on either dimension independently
- Better UX than combined multi-select

**3. URLSearchParams.append pattern for array parameters**
- Uses searchParams.getAll('tag') to retrieve array
- Uses newParams.append('tag', value) for each selected tag
- Results in URL like `?tag=beginner-friendly&tag=outdoor`
- Follows pattern established in Phase 4 for type filtering
- Enables bookmarkable and shareable filtered searches

**4. Omit empty arrays from API calls**
- `tags.length > 0 ? tags : undefined` before passing to API
- Prevents sending empty array parameters to backend
- Backend Transform decorator handles comma-separated or array formats
- Cleaner API calls and query strings

## Deviations from Plan

None - plan executed exactly as written. Created TagFilter and AmenityFilters components, extended useEventFilters hook, integrated into DiscoverEvents page, and verified compilation.

## Issues Encountered

None - all components built and integrated smoothly following established patterns.

## User Setup Required

None - frontend-only changes. Filter components integrate with existing search API from plan 05-06.

## Next Phase Readiness

**Ready for user testing:**
- Tag filtering UI complete with 10 checkbox options
- Accommodation filtering (6 options) for multi-day events
- Food filtering (8 options) including dietary preferences
- All filter selections persist in URL for bookmarking
- React Query cache invalidation on filter changes
- Integration with GIN-indexed backend queries (sub-10ms performance)

**User flow:**
1. Navigate to /discover
2. Set location (geolocation or manual)
3. Select tags: "beginner-friendly", "outdoor", etc.
4. Select accommodation: "camping", "included", etc.
5. Select food options: "vegan", "lunch", etc.
6. URL updates automatically: `?lat=...&lng=...&tag=outdoor&accommodation=camping`
7. Event list filters in real-time
8. Refresh page or share URL - filters persist

**Performance characteristics:**
- GIN index queries: <10ms on 10,000+ events (from 05-06)
- Frontend: Instant checkbox toggle, debounced API calls
- React Query: 30s cache, automatic refetch on filter change
- URL updates use replace: true to avoid polluting browser history

**No blockers identified.**

---
*Phase: 05-event-enhancements*
*Completed: 2026-01-21*
