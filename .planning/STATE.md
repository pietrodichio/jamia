# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Dual-purpose platform - manage jam participants + discover acroyoga events
**Current focus:** Milestone v1 - Phase 6 planning

## Current Position

Phase: 6 of 6 (UI/UX Refactor for Events Management) - IN PROGRESS
Plan: 4 of 10 in Phase 6 complete (06-01, 06-02, 06-03, 06-04)
Status: Phase 6 in progress - Unified discovery view and home page redesign complete
Last activity: 2026-01-23 — Completed 06-03-PLAN.md (Unified discovery view and home page redesign)

Progress: [██████████░] 97% (30/31 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 30
- Average duration: 3 min
- Total execution time: 1.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Monorepo Migration | 4/4 | 17 min | 4 min |
| 2. Open Source Preparation | 3/3 | 3 min | 1 min |
| 3. Event Foundation | 4/4 | 8 min | 2 min |
| 4. Event Discovery | 7/7 | 15 min | 2 min |
| 5. Event Enhancements | 10/10 | 65 min | 7 min |
| 6. UI/UX Refactor | 4/10 | 14 min | 4 min |

**Recent Trend:**
- Last 5 plans: 06-01 (6 min), 06-02 (2 min), 06-03 (3 min), 06-04 (3 min)
- Trend: Phase 6 UI components and unified discovery experience

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- Turborepo for monorepo (industry standard, supports selective deployment)
- Geolocation + manual search for location (covers local users and travelers)
- Crowdsourced events without approval (lower barrier, trust community)
- Only jams are managed, other events are listings only (keeps scope focused)
- Use @jamia/ namespace prefix for all workspace packages (prevents conflicts)
- Placeholder types in packages/types (real types extracted in Plan 03)
- Git subtree for repository migration (preserves full history and author attribution)
- Interfaces not classes in shared types (types-only, no runtime code)
- Backend DTOs implement shared interfaces (maintains class-validator decorators)
- Jest moduleNameMapper for workspace imports (resolves @jamia/types in tests)
- Railway watchPaths for selective deployment (native monorepo support)
- Netlify ignore command with git diff (workaround for selective deployment)
- Turborepo filter in deployment builds (build only target app)
- Single root README instead of app-level READMEs (monorepo best practice)
- Explicit .env.example references in setup instructions (addresses OSS-02)
- Document monorepo commands at root level (pnpm install, pnpm --filter)
- Disable blank issues to force template use (improves issue quality)
- Link to GitHub Discussions for questions (keeps issues for actionable items)
- Use markdown templates over YAML forms (simpler, more flexible)
- Document repository settings in version control (maintainer continuity)
- Single events table with type discriminator instead of separate tables per type
- Mirror jam_managers pattern for event_organizers (proven authorization model)
- Regular columns instead of JSONB for type-specific data (better queryability)
- Event status enum (draft/published/archived) matching jams pattern
- Single CreateEventDto with @IsIn type validation for all 4 event types
- UpdateEventDto uses PartialType for consistency with NestJS patterns
- Delete restricted to owner only (not co-organizers) for safety
- Super admin bypass implemented at service level for all authorization checks
- Owner-only permissions for co-organizer management (co-organizers can edit events but not manage co-organizers)
- Nested routes under /events/:eventId/organizers for RESTful sub-resource pattern
- Mirror backend DTOs exactly in frontend types (type consistency across boundary)
- Separate API client files per resource for focused imports (events.api.ts, event-organizers.api.ts)
- Use replace: true in setSearchParams to avoid polluting browser history
- Convert radius from km (UI-friendly) to meters (API expectation) in API client
- Store all filter state in URL params for bookmarkability and shareability
- Use geography(POINT, 4326) instead of geometry for accurate spherical distance calculations
- Use GENERATED ALWAYS AS for search_vector instead of trigger-based approach
- Add trigger to automatically maintain location_geo from lat/lng changes
- Use ST_DWithin for radius filtering before ST_Distance for sorting (leverages spatial index)
- Default radius of 50km for location searches
- @Public() decorator pattern for selective route authentication bypass
- Reflector-based metadata check in guard for public routes
- Search endpoint positioned before :id route to prevent conflicts
- @Query() decorator for GET query parameter validation
- Native HTML date inputs instead of Calendar component (simpler, universal browser support)
- 300ms debounce delay for keyword search (industry standard)
- Manual coordinate entry alongside geolocation (supports users who deny permission)
- Radius selector with predefined options (better UX than free-form input)
- City search deferred to Phase 5 (requires geocoding service)
- Use date-fns localizer for react-big-calendar (date-fns already in project)
- Store full event data in calendar event resource property (enables easy detail navigation)
- Set explicit height on calendar container (required for react-big-calendar rendering)
- Defer DiscoverEvents view toggle integration until plan 04-04 executes
- Distance formatting threshold: < 1 km instead of 0.X km for readability
- React Query enabled only when lat/lng filters present (prevents unnecessary API calls)
- Empty state guidance: "Set your location" when filters missing
- Event type badge variants: differentiate types visually (jam=default, class=secondary, workshop=outline, convention=destructive)
- Description truncation: 150 characters with ellipsis for list preview
- Loading skeleton count: 3 placeholder cards to indicate content loading
- Client-side distance calculation is for display only (authoritative distance from backend search results)
- Back navigation goes to /calendar (not /discover) as primary event view
- EventWithOrganizer type provides organizer details without additional API call
- Junction table pattern for teachers over ARRAY column (better bidirectional query performance)
- Teachers are display-only metadata with no special permissions beyond event authorization
- RLS policy allows anyone to view teachers but only owners/co-organizers can manage
- Store RRULE string with separate recurrence_dtstart column (RRULE alone doesn't include base datetime)
- Use event_occurrences table for exceptions instead of EXDATE format (better queryability)
- Add parent_event_id for series splitting pattern (enables 'edit future events' functionality)
- Partial filtered indexes on recurrence columns (only index non-NULL values for efficiency)
- Check constraint ensures recurrence_rule and recurrence_dtstart are set together
- PostgreSQL ARRAY columns instead of many-to-many junction tables for tag filtering (3-5x faster)
- GIN indexes enable fast @> (contains) and && (overlaps) operators on ARRAY columns
- Empty array defaults ('{}') eliminate need for NULL checks in WHERE clauses
- Document suggested tag values in column comments for consistency
- rrule.js library for RFC 5545 RRULE parsing and validation
- 1000 occurrence limit prevents infinite series performance issues
- Upsert pattern for event_occurrences ensures idempotent exception updates
- Series splitting creates new event with parent_event_id link for audit trail
- Application-level sync for managed jams instead of database triggers (maintainability)
- Sync only managed+published jams to events (share-by-link jams excluded)
- Non-throwing sync methods ensure jam CRUD operations always succeed
- Extended RPC function for tag filtering instead of direct queries (preserves PostGIS optimization)
- Transform decorator handles both array and comma-separated query param formats
- NULL-safe filter parameters where NULL means no filtering (not 'match NULL values')
- DROP old function signature before CREATE OR REPLACE to avoid PostgreSQL overloading
- Visibility changes (managed→share-by-link) automatically delete event listing
- source_jam_id foreign key with ON DELETE CASCADE ensures automatic cleanup
- Teacher profile navigation via /teachers/:teacherId route pattern
- Teacher selection UI uses Supabase profile search with name filter
- Teacher filter in main search UI deferred as optional enhancement
- EditEvent integration deferred until EditEvent page is created
- TagFilter provides 10 predefined options matching backend schema (ensures data integrity)
- AmenityFilters separates accommodation and food into distinct sections (independent filtering)
- URLSearchParams.append pattern for multi-select filters (bookmarkable URLs)
- Empty arrays omitted from API calls to avoid filtering on empty criteria
- rrule.js library for RRULE generation and parsing (RFC 5545 compliant, toText() for human-readable descriptions)
- Auto-update RRULE via useEffect in RecurrenceEditor (cleaner than setTimeout callbacks)
- Show first 5 occurrences in EventDetail with 90-day range (balances UX and performance)
- Dialog pattern for OccurrenceEditor with radio selection for edit scope
- CreateEvent and EditEvent pages with RecurrenceEditor integration (missing critical functionality auto-added)
- Supabase Storage transformations for image optimization over Cloudinary/imgix (no third-party cost)
- Italian date formatting with date-fns locale (dd MMMM yyyy, HH:mm format)
- Remove distance display from event cards per Phase 6 CONTEXT.md
- CSS Grid with auto-rows-fr for equal height cards in grid layout
- Responsive srcSet with 400w/800w variants for mobile/desktop optimization
- Default image quality 80 for optimal balance between size and quality
- react-i18next for Italian localization (industry standard, namespace organization)
- date-fns Italian locale (it) for all date/time formatting throughout app
- Shadcn DatePicker with Italian locale replaces native HTML date inputs
- Namespace-organized translations: common, events, forms, dashboard (lazy loading support)
- shouldUnregister: true in useEventWizard for conditional field cleanup (prevents hidden fields in submission)
- trigger() validation before step navigation (validates only current step fields)
- Backward navigation allowed without validation (better UX for multi-step forms)
- Step field mapping in stepFields object for maintainable wizard validation
- Airbnb-style home page with marketing hero + event preview grid (improves discovery UX)
- Unified /discover view with grid/calendar toggle via URL parameter (seamless view switching, bookmarkable)
- /calendar route redirects to /discover?view=calendar (backward compatibility)
- Marketing namespace for translations (logical separation, lazy loading)

### Roadmap Evolution

- Phase 6 added: UI/UX refactor for events management

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-23T07:55:03Z
Stopped at: Completed 06-03-PLAN.md
Resume file: None
Next: Continue Phase 6 execution (plan 06-05 or beyond)
