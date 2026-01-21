# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Dual-purpose platform - manage jam participants + discover acroyoga events
**Current focus:** Phase 4: Event Discovery (in progress)

## Current Position

Phase: 4 of 5 (Event Discovery) - IN PROGRESS
Plan: 2 of 7 in Phase 4 complete (04-01, 04-03)
Status: Database foundation and frontend hooks complete
Last activity: 2026-01-21 — Completed 04-01-PLAN.md (PostGIS and Search Foundation)

Progress: [█████████████░░░░░] 72% (13/18 plans complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 13
- Average duration: 2 min
- Total execution time: 0.4 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Monorepo Migration | 4/4 | 17 min | 4 min |
| 2. Open Source Preparation | 3/3 | 3 min | 1 min |
| 3. Event Foundation | 4/4 | 8 min | 2 min |
| 4. Event Discovery | 2/7 | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 03-03 (2 min), 03-04 (2 min), 04-01 (2 min), 04-03 (2 min)
- Trend: Consistent 2-minute execution velocity across Phase 3 and Phase 4

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

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-21T16:44:24Z
Stopped at: Completed 04-01-PLAN.md - PostGIS and Search Foundation
Resume file: None
Next: Continue Phase 4 with remaining plans (04-02, 04-04 through 04-07)
