# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Dual-purpose platform - manage jam participants + discover acroyoga events
**Current focus:** Phase 5: Event Enhancements (next up)

## Current Position

Phase: 5 of 5 (Event Enhancements) - IN PROGRESS
Plan: 9 of ? in Phase 5 complete (05-01, 05-02, 05-03, 05-04, 05-05, 05-06, 05-07, 05-08, 05-10)
Status: Building event enhancements - recurring events UI complete
Last activity: 2026-01-21 — Completed 05-08-PLAN.md

Progress: [████████░░] 80% (4/5 phases complete, Phase 5 started)

## Performance Metrics

**Velocity:**
- Total plans completed: 27
- Average duration: 3 min
- Total execution time: 1.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Monorepo Migration | 4/4 | 17 min | 4 min |
| 2. Open Source Preparation | 3/3 | 3 min | 1 min |
| 3. Event Foundation | 4/4 | 8 min | 2 min |
| 4. Event Discovery | 7/7 | 15 min | 2 min |
| 5. Event Enhancements | 9/? | 79 min | 8 min |

**Recent Trend:**
- Last 5 plans: 05-05 (14 min), 05-06 (11 min), 05-07 (9 min), 05-08 (9 min), 05-10 (3 min)
- Trend: Phase 5 averaging 8 minutes (complex database schema, recurring events, teachers, filters, sync, UI)

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
- TagFilter provides 10 predefined options matching backend schema (ensures data integrity)
- AmenityFilters separates accommodation and food into distinct sections (independent filtering)
- URLSearchParams.append pattern for multi-select filters (bookmarkable URLs)
- Empty arrays omitted from API calls to avoid filtering on empty criteria
- rrule.js library for RRULE generation and parsing (RFC 5545 compliant, toText() for human-readable descriptions)
- Auto-update RRULE via useEffect in RecurrenceEditor (cleaner than setTimeout callbacks)
- Show first 5 occurrences in EventDetail with 90-day range (balances UX and performance)
- Dialog pattern for OccurrenceEditor with radio selection for edit scope
- CreateEvent and EditEvent pages with RecurrenceEditor integration (missing critical functionality auto-added)

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-21T19:59:38Z
Stopped at: Completed 05-08-PLAN.md and 05-10-PLAN.md (recurring events UI, tag and amenity filter UI)
Resume file: None
Next: Continue Phase 5 planning and execution (geocoding service integration, etc.)
