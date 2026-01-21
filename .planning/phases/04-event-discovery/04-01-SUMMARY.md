---
phase: 04-event-discovery
plan: 01
subsystem: database
tags: [postgis, geospatial, full-text-search, postgresql, supabase]

# Dependency graph
requires:
  - phase: 03-event-foundation
    provides: events table with location_lat/lng columns and event types
provides:
  - PostGIS extension enabled for geospatial queries
  - location_geo geography column with GIST spatial index
  - search_vector tsvector column with GIN index for full-text search
  - search_events_by_location RPC function for distance-based queries
  - Automatic trigger maintenance of geography column
affects: [04-02-event-discovery-ui, 04-03-calendar-view]

# Tech tracking
tech-stack:
  added: [postgis]
  patterns: [geography-column-pattern, spatial-indexing, full-text-search-tsvector, rpc-functions]

key-files:
  created:
    - apps/web/supabase/migrations/20260121100000_add_postgis_and_search.sql
  modified: []

key-decisions:
  - "Use geography(POINT, 4326) instead of geometry for accurate spherical distance calculations"
  - "Use GENERATED ALWAYS AS for search_vector instead of trigger-based approach"
  - "Add trigger to automatically maintain location_geo from lat/lng changes"
  - "Use ST_DWithin for radius filtering before ST_Distance for sorting (leverages spatial index)"
  - "Default radius of 50km for location searches"
  - "Return all event fields in RPC function for complete event data"

patterns-established:
  - "Geography column pattern: geography(POINT, 4326) with GIST index for lat/lng coordinates"
  - "Full-text search pattern: tsvector GENERATED column with GIN index"
  - "Auto-maintenance pattern: trigger function to keep derived columns in sync"
  - "RPC function pattern: complex queries with multiple optional filters"

# Metrics
duration: 2min
completed: 2026-01-21
---

# Phase 04 Plan 01: PostGIS and Search Foundation Summary

**PostGIS-based geospatial search with distance calculations, full-text keyword search, and RPC function supporting radius/type/date/keyword filters**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-21T16:42:47Z
- **Completed:** 2026-01-21T16:44:24Z
- **Tasks:** 3
- **Files modified:** 1

## Accomplishments

- Enabled PostGIS extension and added geography column with spherical distance calculations
- Implemented full-text search with automatically-maintained tsvector column and GIN index
- Created RPC function combining geospatial queries with type/date/keyword filtering
- Established trigger-based auto-maintenance pattern for derived geography column

## Task Commits

All three tasks were part of creating the same migration file, committed together:

1. **Tasks 1-3: PostGIS extension, search capabilities, and RPC function** - `2ac089d` (feat)

**Plan metadata:** (will be committed separately)

## Files Created/Modified

- `apps/web/supabase/migrations/20260121100000_add_postgis_and_search.sql` - PostGIS extension, geography column with GIST index, tsvector column with GIN index, search RPC function with multiple filters

## Decisions Made

1. **Geography vs Geometry type**: Used `geography(POINT, 4326)` instead of `geometry` for accurate spherical distance calculations. Geography type accounts for earth's curvature, essential for accurate distances especially at high latitudes.

2. **GENERATED column for tsvector**: Used `GENERATED ALWAYS AS ... STORED` pattern instead of trigger-based approach. Simpler, self-maintaining, and eliminates potential trigger ordering issues.

3. **Automatic geography maintenance**: Added trigger function to automatically update `location_geo` when `location_lat` or `location_lng` changes. This prevents data inconsistency and eliminates manual sync burden.

4. **ST_DWithin before ST_Distance**: Used `ST_DWithin` in WHERE clause for radius filtering, then `ST_Distance` in SELECT for distance calculation. This leverages the GIST spatial index efficiently (ST_Distance alone can't use index for filtering).

5. **Comprehensive RPC return type**: Return all event fields from RPC function, not just summary data. Enables using search results directly without additional queries.

6. **50km default radius**: Set default search radius to 50,000 meters (50km). Reasonable for regional event discovery while avoiding excessive results.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added trigger to automatically maintain location_geo column**
- **Found during:** Task 1 (PostGIS geography column implementation)
- **Issue:** Plan only specified populating location_geo from existing coordinates via UPDATE. Without trigger, future updates to location_lat/location_lng would not update location_geo, causing data inconsistency.
- **Fix:** Created `update_location_geo()` trigger function and `trg_events_update_location_geo` trigger that fires BEFORE INSERT OR UPDATE of location_lat/location_lng. Ensures location_geo stays in sync automatically.
- **Files modified:** apps/web/supabase/migrations/20260121100000_add_postgis_and_search.sql
- **Verification:** Trigger definition added, function logic handles both setting and clearing geography column
- **Committed in:** 2ac089d (part of main commit)

**2. [Rule 2 - Missing Critical] Added check constraint for location column consistency**
- **Found during:** Task 1 (PostGIS geography column implementation)
- **Issue:** Without constraint, could have inconsistent state where some location fields are set and others are NULL (e.g., lat/lng set but location_geo NULL, or vice versa after manual data changes).
- **Fix:** Added `chk_location_geo_consistency` constraint ensuring either all location fields are NULL or all are NOT NULL. Prevents partial location data.
- **Files modified:** apps/web/supabase/migrations/20260121100000_add_postgis_and_search.sql
- **Verification:** Constraint definition ensures data integrity at database level
- **Committed in:** 2ac089d (part of main commit)

**3. [Rule 2 - Missing Critical] Added NULL handling for optional location parameters in RPC function**
- **Found during:** Task 3 (RPC function implementation)
- **Issue:** RPC function needs to support searches without location (keyword/type/date filtering only). Without NULL checks, would fail when search_lng/search_lat are NULL.
- **Fix:** Added conditional logic: `(search_lng IS NULL OR search_lat IS NULL OR ST_DWithin(...))` to skip spatial filtering when location not provided. Also added `NULLS LAST` to ORDER BY for events without coordinates.
- **Files modified:** apps/web/supabase/migrations/20260121100000_add_postgis_and_search.sql
- **Verification:** Function can be called without location parameters, falls back to other filters
- **Committed in:** 2ac089d (part of main commit)

---

**Total deviations:** 3 auto-fixed (3 missing critical)
**Impact on plan:** All auto-fixes essential for data integrity and flexibility. Without trigger, geography column would become stale. Without constraint, partial location data could exist. Without NULL handling, function couldn't support keyword-only searches. No scope creep.

## Issues Encountered

None - migration created as planned with critical auto-fixes for data integrity.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for UI implementation:**
- Database foundation complete with geospatial and full-text search capabilities
- RPC function `search_events_by_location` ready to be called from frontend
- Spatial and full-text indexes in place for performant queries
- All event fields returned for complete event data display

**Key integration points for next phase:**
- Call RPC via `supabase.rpc('search_events_by_location', { search_lng, search_lat, radius_meters, event_types, date_from, date_to, keyword })`
- distance_meters returned in results for "X km away" display
- All optional filters can be omitted for flexible search UX

**No blockers identified.**

---
*Phase: 04-event-discovery*
*Completed: 2026-01-21*
