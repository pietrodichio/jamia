# Jamia - Acroyoga Event Platform

## What This Is

Jamia is a dual-purpose platform for the acroyoga community: it manages jam participants (booking, waiting lists, notifications) and serves as a crowdsourced directory for discovering all types of acroyoga events (jams, classes, workshops, conventions) by location and date.

## Core Value

Two equally critical capabilities:
1. **For organizers:** Manage your jam's participants with waitlists, notifications, and attendance tracking
2. **For participants:** Discover acroyoga events near you across a fragmented community

## Requirements

### Validated

Existing jam management functionality:

- ✓ User authentication via Supabase Auth — existing
- ✓ Jam creation and editing (name, location, dates, capacity, description) — existing
- ✓ Public jams vs share-by-link jams — existing
- ✓ Participant management (join, cancel, state machine) — existing
- ✓ Waiting list with automatic promotion — existing
- ✓ Owner and manager roles with permissions — existing
- ✓ Email notifications via Resend (confirmations, promotions, removals) — existing
- ✓ Telegram notifications for managers — existing
- ✓ Jam cloning for recurring events — existing
- ✓ Audit logging of actions — existing

### Active

Current development cycle:

**Monorepo Migration:**
- [ ] Turborepo setup with jamia-fe and jamia-be workspaces
- [ ] Shared configuration and dependencies
- [ ] Tests passing in monorepo structure
- [ ] Selective deployment (backend changes don't trigger frontend deploy, vice versa)
- [ ] Netlify deployment for frontend from monorepo
- [ ] Railway deployment for backend from monorepo

**Open Source Preparation:**
- [ ] README with setup instructions (local development, environment setup)
- [ ] CONTRIBUTING.md with contribution guidelines
- [ ] LICENSE file
- [ ] CODE_OF_CONDUCT.md
- [ ] GitHub issue templates
- [ ] GitHub PR templates
- [ ] Repository settings documentation (branch protection, required checks)

**Event Directory & Discovery:**
- [ ] Event types: classes, workshops, conventions (listing only, not managed)
- [ ] Event creation for all types (requires account, crowdsourced)
- [ ] Event data model (start/end dates, location, price, organizer, rich text description, external link)
- [ ] Event tags (skill level, free/paid, yoga mat required, indoor/outdoor, accommodation, food)
- [ ] Event type filtering (jam, class, workshop, convention)
- [ ] Location-based search (geolocation + manual city search)
- [ ] Calendar view of upcoming events
- [ ] List view with filters
- [ ] Search bar (keywords, location, organizer)
- [ ] Recurring events as separate occurrences
- [ ] Event cancellation for single occurrence
- [ ] Teacher associations (add existing users as teachers for classes/workshops/conventions)
- [ ] Organizer permissions (creator can edit, can add co-organizers)
- [ ] Managed jams appear in directory when public
- [ ] Event editing by organizers and super admins

### Out of Scope

Explicitly deferred or excluded:

- Mobile apps — web-only for now
- Monetization or paid features — non-profit community project
- Social features (comments, ratings, discussions on events) — not v1
- Calendar integrations (Google Calendar, iCal export) — future consideration
- Map view for event discovery — defer to v2, use list/calendar views
- Managing complex events (multi-day conventions, recurring classes) via Jamia's tools — only jams are managed, others are listings only
- Event approval/moderation — crowdsourced without approval

## Context

**Problem space:**
The acroyoga community is fragmented across Facebook groups, Instagram, and word-of-mouth. Finding events (especially when traveling) is difficult. Jamia started as a tool to manage jam participants and is expanding to become a central directory for all acroyoga events.

**Existing users:**
People already use Jamia to manage jams with participant tracking, waitlists, and notifications. This functionality must continue working (backward compatibility required).

**Community project:**
Non-profit, community-driven. Expecting code contributions from developers and event data contributions from practitioners.

**Current deployment:**
- Frontend: Netlify (deploys on push to main)
- Backend: Railway (deploys on push to main)
- Database: Supabase hosted PostgreSQL

## Constraints

- **Resources**: Non-profit, solo/community project — no budget, limited time
- **Timeline**: None specified — ship when ready
- **Tech stack**: Locked to current choices (NestJS, React, Supabase, Resend, Telegram) — leverage existing architecture
- **Backward compatibility**: Existing jam management must continue working without disruption
- **Deployment**: Must maintain current simple CI/CD (Netlify for FE, Railway for BE)

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Turborepo for monorepo | Industry standard, good documentation, supports selective deployment | — Pending |
| Geolocation + manual search for location | Covers both local users (one-click) and travelers (planning trips) | — Pending |
| Crowdsourced events without approval | Lower barrier to entry, trust community, iterate on moderation if needed | — Pending |
| Only jams are managed, other events are listings only | Keeps scope focused, managing workshops/conventions is complex (sessions, tickets, etc.) | — Pending |

---
*Last updated: 2026-01-20 after initialization*
