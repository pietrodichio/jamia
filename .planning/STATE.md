# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-20)

**Core value:** Dual-purpose platform - manage jam participants + discover acroyoga events
**Current focus:** Phase 3: Event Foundation

## Current Position

Phase: 3 of 5 (Event Foundation)
Plan: 3 of TBD in current phase
Status: In progress
Last activity: 2026-01-21 — Completed 03-03-PLAN.md

Progress: [████▓░░░░░] 44%

## Performance Metrics

**Velocity:**
- Total plans completed: 8
- Average duration: 2 min
- Total execution time: 0.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 1. Monorepo Migration | 4/4 | 17 min | 4 min |
| 2. Open Source Preparation | 2/3 | 3 min | 2 min |
| 3. Event Foundation | 2/TBD | 4 min | 2 min |

**Recent Trend:**
- Last 5 plans: 02-02 (1 min), 02-03 (2 min), 03-01 (2 min), 03-03 (2 min)
- Trend: Phase 3 tasks highly efficient - consistent 2-min execution

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
- Owner-only permissions for co-organizer management (co-organizers can edit events but not manage co-organizers)
- Nested routes under /events/:eventId/organizers for RESTful sub-resource pattern

### Pending Todos

None yet.

### Blockers/Concerns

None yet.

## Session Continuity

Last session: 2026-01-21T11:22:26Z
Stopped at: Completed 03-03-PLAN.md
Resume file: None
