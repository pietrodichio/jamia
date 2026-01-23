---
phase: 06-ui-ux-refactor-for-events-management
plan: 06
subsystem: dashboard-ui
tags: [react, dashboard, ui-redesign, information-architecture, italian-i18n]
requires:
  - 06-01-event-card-design
  - 06-02-event-detail-page
dependencies:
  built_upon:
    - 04-01: Event search API with location-based filtering
    - 04-02: Event listing display components
    - 05-09: Italian localization infrastructure
  provides:
    - Information-first dashboard layout
    - Upcoming events section with preview
    - Personalized event recommendations
    - User activity statistics display
    - Compact action buttons in header
  affects:
    - Future dashboard enhancements will build on this layout
    - Analytics features will integrate with statistics section
tech_stack:
  added:
    - "@/components/dashboard/*": Dashboard-specific components
  patterns:
    - Information-first design: Show data before actions
    - Card-based layout with responsive grid
    - Location-based personalization for recommendations
    - Query aggregation for statistics display
key_files:
  created:
    - apps/web/src/components/dashboard/UpcomingEventsSection.tsx
    - apps/web/src/components/dashboard/RecommendationsSection.tsx
    - apps/web/src/components/dashboard/StatisticsSection.tsx
    - apps/web/src/components/dashboard/DashboardActions.tsx
  modified:
    - apps/web/src/pages/Dashboard.tsx
decisions:
  - id: DASH-01
    what: Information-first dashboard layout
    why: Users need to see what's happening (events, stats) before seeing actions they can take
    impact: Improved information discovery and reduced cognitive load
    when: 2026-01-23
  - id: DASH-02
    what: Compact action buttons in page header
    why: Actions should be accessible but not dominant in the interface
    impact: Cleaner layout with better visual hierarchy
    when: 2026-01-23
  - id: DASH-03
    what: Location-based recommendations section
    why: Personalized event discovery based on user's saved location
    impact: Helps users discover relevant nearby events without manual search
    when: 2026-01-23
  - id: DASH-04
    what: Preserve legacy jam management section
    why: Existing jam features still needed while event features are being adopted
    impact: Backward compatibility maintained, gradual migration path
    when: 2026-01-23
  - id: DASH-05
    what: Statistics show aggregated events (owned + co-organized)
    why: Users care about total events they're involved with, not just owned
    impact: More accurate representation of user's event activity
    when: 2026-01-23
metrics:
  duration: 4 min
  completed: 2026-01-23
---

# Phase 6 Plan 6: Dashboard Redesign with Information-First Layout Summary

**One-liner:** Redesigned dashboard with information-first approach showing upcoming events, personalized recommendations, and statistics before actions.

## What Was Built

Transformed the dashboard from action-oriented to information-oriented design, helping users immediately see what's happening with their events and discover nearby activities.

### Components Created

1. **UpcomingEventsSection** - Displays user's next 5 upcoming events
   - Queries owned and co-organized events via API
   - Filters for future events only (starts_at > now)
   - Sorts by date (earliest first)
   - Shows "Vedi tutti" link to filtered events list
   - Empty state encourages event creation
   - Responsive card grid layout

2. **RecommendationsSection** - Personalized nearby event suggestions
   - Fetches user profile to get saved location (lat/lng)
   - Searches events within 50km radius
   - Filters out user's own events
   - Prompts for location setup if not configured
   - Displays up to 5 recommended events
   - Empty state shows when no nearby events exist

3. **StatisticsSection** - User activity metrics display
   - Shows 3 metric cards: events created, participants managed, events attended
   - Aggregates owned + co-organized events for total
   - Queries participants across all jams owned by user
   - Events attended is placeholder for future enhancement
   - Clean design with icons and bold numbers
   - Loading states for all metrics

4. **DashboardActions** - Compact action button group
   - Three action buttons: Crea Evento, Scopri Eventi, Calendario
   - Small size (size="sm") for header placement
   - Uses dashboard translation namespace
   - Links to /events/new, /discover, /discover?view=calendar

### Dashboard Page Redesigned

- Information-first layout hierarchy:
  1. Page header with "Bacheca" title and compact actions
  2. Statistics section (full width at top)
  3. Upcoming events section
  4. Recommendations section
  5. Legacy jam management (preserved for backward compatibility)

- Responsive layout:
  - Desktop: sections in appropriate widths
  - Mobile: single column stack
  - Max width container (max-w-7xl)
  - Consistent spacing (py-8, gap-6)

- Header redesign:
  - Title: "Bacheca" with Italian greeting
  - Actions positioned top-right (compact)
  - Profile and sign-out buttons also in header

## Technical Decisions

### Query Strategy
- Separate queries for owned and co-organized events (cache efficiency)
- Merge and process client-side (avoids complex backend query)
- Filter, sort, and limit in component logic
- Stale time of 2-5 minutes (balance freshness vs. request volume)

### Personalization Approach
- Location-based recommendations use user profile location
- Graceful degradation: prompt to set location if missing
- Radius of 50km as default (reasonable nearby range)
- Filter out user's own events from recommendations

### Statistics Aggregation
- Count events instead of fetching full data (performance)
- Participants query by owner_id (across all jams)
- Events attended placeholder (future feature, requires attendance tracking)

### Backward Compatibility
- Legacy jam management section preserved below new sections
- Border separator clearly divides new from legacy
- Gradual migration path as users adopt event features

## Deviations from Plan

### Auto-fixed Issues

None - plan executed exactly as written.

## Next Phase Readiness

### Carries Forward
- Dashboard layout foundation for future enhancements
- Component structure supports additional sections
- Statistics framework ready for more metrics
- Recommendation logic can be extended with filtering

### Integration Points
- Future analytics features will integrate with StatisticsSection
- Notification system will connect to UpcomingEventsSection
- Advanced recommendation algorithms can replace simple location-based search

### No Blockers
All required infrastructure in place:
- Event API endpoints functional
- Italian translations loaded
- Profile location data accessible
- EventCard component reusable across sections

## Files Changed

**Created:**
- `apps/web/src/components/dashboard/UpcomingEventsSection.tsx` (107 lines)
- `apps/web/src/components/dashboard/RecommendationsSection.tsx` (125 lines)
- `apps/web/src/components/dashboard/StatisticsSection.tsx` (132 lines)
- `apps/web/src/components/dashboard/DashboardActions.tsx` (41 lines)

**Modified:**
- `apps/web/src/pages/Dashboard.tsx` (+119 lines, -86 lines)
  - Added new section components
  - Reorganized layout to information-first
  - Preserved legacy jam management
  - Updated header with compact actions

**Total:** 4 files created, 1 modified

## Commits

1. **5538fc8** - `feat(06-06): create UpcomingEventsSection component`
   - Query and display user's upcoming events
   - "Vedi tutti" link and empty state CTA

2. **baeb647** - `feat(06-06): create RecommendationsSection and StatisticsSection`
   - Location-based recommendations with 50km radius
   - Statistics with 3 metrics (events, participants, attended)
   - Location setup prompt for recommendations

3. **a1a6217** - `feat(06-06): redesign Dashboard with information-first layout`
   - DashboardActions component with compact buttons
   - Dashboard page reorganization
   - Information-first hierarchy: stats, upcoming, recommendations
   - Legacy jam section preserved

## Verification Results

✅ **Truth 1:** Dashboard shows information first (statistics, events, recommendations) before actions
✅ **Truth 2:** Upcoming events section displays next 3-5 events (up to 5) with "Vedi tutti" link
✅ **Truth 3:** Recommendations section shows nearby events based on user's saved location (50km radius)
✅ **Truth 4:** Statistics section displays event counts (owned + co-organized) and participants managed

**Build verification:** ✅ Build succeeds without errors (3.40s)

## What's Next

**Immediate next steps (Phase 6 continuation):**
- Plan 06-07: Additional UI/UX refinements
- Plan 06-08: Mobile responsiveness improvements
- Plan 06-09: Loading states and error handling polish
- Plan 06-10: Final Phase 6 integration and testing

**Future enhancements:**
- Advanced recommendation algorithm (interest-based, not just location)
- Event attendance tracking for "events attended" metric
- Recent activity feed section
- Push notifications for upcoming events
- Dashboard customization (drag-drop sections)

---

**Phase:** 06-ui-ux-refactor-for-events-management
**Plan:** 06
**Completed:** 2026-01-23
**Duration:** 4 minutes
**Status:** ✅ Complete
