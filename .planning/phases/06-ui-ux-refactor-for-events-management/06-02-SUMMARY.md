---
phase: 06-ui-ux-refactor-for-events-management
plan: 02
subsystem: ui
tags: [react, tailwind, supabase-storage, responsive-design, i18n, italian, airbnb-style]

# Dependency graph
requires:
  - phase: 03-event-foundation
    provides: Event types, EventWithOrganizer interface
  - phase: 04-event-discovery
    provides: Event discovery UI patterns
  - phase: 05-event-enhancements
    provides: Extended event data (teachers, recurrence, tags)
provides:
  - Responsive event card grid layout (1/2/3 columns)
  - Airbnb-style EventCard with hero image optimization
  - Italian date formatting in event cards
  - View toggle component for grid/calendar switching
  - Supabase image transformation utilities
affects: [06-03, 06-04, 06-05, unified-discovery-page, event-detail-pages]

# Tech tracking
tech-stack:
  added:
    - Supabase Storage image transformations API
  patterns:
    - Image optimization with Supabase render endpoint
    - Responsive images with srcSet (400w/800w variants)
    - Italian locale date formatting (dd MMMM yyyy, HH:mm)
    - CSS Grid responsive layout (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
    - Card hover effects (shadow-lg, image scale transform)

key-files:
  created:
    - apps/web/src/lib/image-utils.ts
    - apps/web/src/components/events/EventCardGrid.tsx
    - apps/web/src/components/events/ViewToggle.tsx
  modified:
    - apps/web/src/components/events/EventCard.tsx

key-decisions:
  - "Supabase Storage transformations for image optimization (vs Cloudinary/imgix)"
  - "Italian locale for all date formatting (dd MMMM yyyy, HH:mm format)"
  - "Remove distance display from cards per CONTEXT.md decision"
  - "CSS Grid with auto-rows-fr for equal height cards"
  - "Default image quality 80 for optimal balance"
  - "Responsive srcSet with 400w/800w variants for mobile/desktop"

patterns-established:
  - "Image optimization: getOptimizedImageUrl(bucket, path, options) pattern"
  - "Responsive srcSet: getResponsiveSrcSet(bucket, path, widths, quality)"
  - "Italian date formatting: format(date, 'dd MMMM yyyy, HH:mm', { locale: it })"
  - "Card grid: grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-fr"
  - "View toggle: Button variant switching (default/outline) for active/inactive"

# Metrics
duration: 2min
completed: 2026-01-23
---

# Phase 6 Plan 02: Event Card Components Summary

**Responsive Airbnb-style event cards with Supabase image optimization, Italian date formatting, and grid/calendar view toggle**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-23T07:40:58Z
- **Completed:** 2026-01-23T07:43:06Z
- **Tasks:** 3/3 completed
- **Files modified:** 4 (1 refactored, 3 created)
- **Commits:** 3 atomic task commits

## Accomplishments

- Created reusable image optimization utilities with Supabase Storage transformations
- Refactored EventCard to Airbnb-style hero image layout with Italian locale dates
- Built responsive EventCardGrid (1/2/3 columns) and ViewToggle components
- Implemented responsive images with srcSet for mobile/desktop optimization
- Applied Italian formatting (dd MMMM yyyy, HH:mm) to all event dates

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Supabase image optimization utility** - `bdeb632` (feat)
   - Created apps/web/src/lib/image-utils.ts
   - getOptimizedImageUrl helper with width/height/quality/resize options
   - getResponsiveSrcSet for responsive image srcSet generation

2. **Task 2: Create Airbnb-style EventCard component** - `6e6c6ef` (refactor)
   - Refactored apps/web/src/components/events/EventCard.tsx
   - Hero image with Supabase optimization (400w/800w srcSet)
   - Italian date formatting (dd MMMM yyyy, HH:mm)
   - Event type badge in top-right corner
   - Removed distance display per CONTEXT.md

3. **Task 3: Create EventCardGrid and ViewToggle components** - `d647276` (feat)
   - Created apps/web/src/components/events/EventCardGrid.tsx
   - Created apps/web/src/components/events/ViewToggle.tsx
   - Responsive grid: 1 column (mobile), 2 (tablet), 3 (desktop)
   - Italian labels: "Griglia" (grid), "Calendario" (calendar)

## Files Created/Modified

**Created:**
- `apps/web/src/lib/image-utils.ts` - Supabase Storage image transformation utilities (98 lines)
- `apps/web/src/components/events/EventCardGrid.tsx` - Responsive grid layout (24 lines)
- `apps/web/src/components/events/ViewToggle.tsx` - Grid/calendar view toggle (39 lines)

**Modified:**
- `apps/web/src/components/events/EventCard.tsx` - Airbnb-style card with hero image (130 lines, complete refactor)

## Decisions Made

**1. Supabase Storage transformations for image optimization**
- Rationale: Already in tech stack, no third-party cost, on-the-fly optimization
- Alternative: Cloudinary/imgix would add cost and complexity
- Result: getOptimizedImageUrl constructs Supabase render endpoint URLs

**2. Italian date formatting with date-fns locale**
- Rationale: CONTEXT.md requires Italian UI, date-fns already installed
- Format: dd MMMM yyyy, HH:mm (e.g., "22 gennaio 2026, 14:30")
- Result: All event cards display Italian dates consistently

**3. Remove distance display from cards**
- Rationale: CONTEXT.md explicitly states "Distance from user NOT shown on cards"
- Old card showed distance_meters, new card removed this
- Result: Cleaner card design, consistent with CONTEXT.md vision

**4. CSS Grid with auto-rows-fr for equal height cards**
- Rationale: Ensures all cards in a row have same height (cleaner grid)
- Alternative: Flexbox would require explicit height management
- Result: Professional grid layout with consistent card heights

**5. Responsive srcSet with 400w/800w variants**
- Rationale: Optimize for mobile (400px cards) and desktop (800px+ screens)
- Uses sizes attribute: "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
- Result: Browser downloads appropriate image size for screen

**6. Default image quality 80**
- Rationale: Optimal balance between file size and visual quality
- Lower quality (60-70) shows artifacts, higher (90+) increases file size
- Result: Fast loading with good visual quality

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added image_url field handling in EventCard**
- **Found during:** Task 2 (EventCard refactor)
- **Issue:** Event type doesn't guarantee image_url field exists (optional in schema)
- **Fix:** Added fallback to placeholder image (/placeholder-event.jpg) when image_url undefined
- **Files modified:** apps/web/src/components/events/EventCard.tsx
- **Verification:** TypeScript compiles without errors, card handles missing images gracefully
- **Committed in:** 6e6c6ef (Task 2 commit)

**2. [Rule 2 - Missing Critical] Added error handling for date formatting**
- **Found during:** Task 2 (EventCard date display)
- **Issue:** Invalid date strings could crash format() function
- **Fix:** Wrapped format() in try-catch, returns original string if parsing fails
- **Files modified:** apps/web/src/components/events/EventCard.tsx
- **Verification:** Component handles invalid dates without crashing
- **Committed in:** 6e6c6ef (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 missing critical)
**Impact on plan:** Both auto-fixes necessary for robustness. No scope creep.

## Issues Encountered

None. All tasks executed as planned.

## User Setup Required

None - no external service configuration required.

## Technical Notes

**Image URL handling:**
- Current implementation assumes image_url may contain either:
  - Full Supabase URL (starts with 'http')
  - Filename only (will be passed to Supabase transformation)
- This flexibility accommodates both migration paths and direct uploads

**Breakpoints:**
- Mobile: 0-767px (1 column)
- Tablet: 768px-1023px (2 columns)
- Desktop: 1024px+ (3 columns)

**Card hover effects:**
- Shadow: hover:shadow-lg transition-shadow
- Image: group-hover:scale-105 transition-transform duration-300
- Creates subtle Airbnb-like interaction feedback

**Italian locale:**
- Already configured in apps/web/src/locales/i18n.ts
- date-fns Italian locale imported: `import { it } from 'date-fns/locale/it'`
- Format examples:
  - "22 gennaio 2026, 14:30" (full date/time)
  - "gennaio" not "January" (localized month names)

## Next Phase Readiness

**Ready for integration:**
- EventCardGrid and ViewToggle ready for use in unified discovery page (Plan 06-03)
- EventCard ready for use in event detail pages (Plan 06-04)
- Image optimization utilities available for all future image displays

**Dependencies satisfied:**
- EventWithOrganizer type from @jamia/types/event (Phase 3)
- Italian i18n setup already complete
- Supabase Storage configured with VITE_SUPABASE_URL

**No blockers.**

---
*Phase: 06-ui-ux-refactor-for-events-management*
*Completed: 2026-01-23*
