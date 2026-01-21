# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Dual-purpose platform - manage jam participants + discover acroyoga events
**Current focus:** Phase 4: Event Discovery (in progress)

## Current Position

Phase: 4 of 5 (Event Discovery) - IN PROGRESS
Plan: 5 of 7 in Phase 4 complete (04-01, 04-02, 04-03, 04-04, 04-05)
Status: Database foundation, API search endpoint, frontend hooks, filter UI, and calendar view complete
Last activity: 2026-01-21 — Completed 04-05-PLAN.md (Calendar View)

Progress: [███████████████░░░] 89% (16/18 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 16
- Average duration: 2 min
- Total execution time: 0.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Monorepo Migration | 4/4 | 17 min | 4 min |
| 2. Open Source Preparation | 3/3 | 3 min | 1 min |
| 3. Event Foundation | 4/4 | 8 min | 2 min |
| 4. Event Discovery | 5/7 | 11 min | 2 min |

**Recent Trend:**
- Last 5 plans: 04-02 (3 min), 04-03 (2 min), 04-04 (2 min), 04-05 (2 min)
- Trend: Consistent 2 minute execution velocity across Phase 4

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-21T16:54:54Z
Stopped at: Completed 04-05-PLAN.md - Calendar View
Resume file: None
Next: Continue Phase 4 with remaining plans (04-06 and 04-07)
