# Roadmap: Jamia v1

## Overview

Jamia evolves from a jam management tool into a dual-purpose platform: manage jam participants AND discover all acroyoga events. This roadmap transforms the existing monolith into a monorepo, prepares for open source contributions, then adds crowdsourced event directory capabilities while maintaining backward compatibility with existing jam management.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Monorepo Migration** - Restructure into Turborepo with selective deployment
- [x] **Phase 2: Open Source Preparation** - Documentation and contribution infrastructure
- [x] **Phase 3: Event Foundation** - Core event types, creation, and management
- [ ] **Phase 4: Event Discovery** - Location-based search, filtering, and views
- [ ] **Phase 5: Event Enhancements** - Recurring events, teachers, and jam integration

## Phase Details

### Phase 1: Monorepo Migration
**Goal**: Codebase is restructured into Turborepo with independent frontend and backend deployments
**Depends on**: Nothing (first phase)
**Requirements**: MONO-01, MONO-02, MONO-03, MONO-04, MONO-05, MONO-06, MONO-07
**Success Criteria** (what must be TRUE):
  1. Frontend and backend exist as separate workspaces in Turborepo
  2. Shared types package compiles and is consumed by both apps
  3. All existing tests pass in monorepo structure
  4. Frontend deploys to Netlify independently when only frontend changes
  5. Backend deploys to Railway independently when only backend changes
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Initialize monorepo structure and shared types package
- [x] 01-02-PLAN.md — Migrate repositories preserving git history
- [x] 01-03-PLAN.md — Wire shared types and verify tests pass
- [x] 01-04-PLAN.md — Configure selective deployment for Netlify and Railway

### Phase 2: Open Source Preparation
**Goal**: Repository is ready for external contributors with clear documentation and guidelines
**Depends on**: Phase 1
**Requirements**: OSS-01, OSS-02, OSS-03, OSS-04, OSS-05, OSS-06, OSS-07, OSS-08, OSS-09
**Success Criteria** (what must be TRUE):
  1. New contributor can set up local development environment following README
  2. Repository has LICENSE, CODE_OF_CONDUCT, and CONTRIBUTING files
  3. GitHub issues and PRs have templates that guide submission format
  4. Environment setup is documented with .env.example files for both apps
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Create core OSS documentation (LICENSE, CODE_OF_CONDUCT, CONTRIBUTING)
- [x] 02-02-PLAN.md — Create root README with monorepo setup instructions
- [x] 02-03-PLAN.md — Create GitHub issue and PR templates

### Phase 3: Event Foundation
**Goal**: Users can create and manage all event types with proper permissions
**Depends on**: Phase 2
**Requirements**: EVENT-01, EVENT-02, EVENT-03, EVENT-04, EVENT-05, EVENT-06, EVENT-07, EVENT-08, EVENT-09, EVENT-10
**Success Criteria** (what must be TRUE):
  1. User can create events of type jam, class, workshop, or convention
  2. User can add required fields (title, location, dates, type) and optional fields (price, description, link)
  3. User can edit and delete events they created
  4. User can add co-organizers who can also edit the event
  5. Super admins can edit any event
**Plans**: 4 plans

Plans:
- [x] 03-01-PLAN.md — Database schema for events and event_organizers with RLS
- [x] 03-02-PLAN.md — Events backend with CRUD operations and authorization
- [x] 03-03-PLAN.md — Event organizers backend for co-organizer management
- [x] 03-04-PLAN.md — Frontend API layer with type-safe event clients

### Phase 4: Event Discovery
**Goal**: Users can find events by location, date, type, and filters in list or calendar view
**Depends on**: Phase 3
**Requirements**: LOC-01, LOC-02, LOC-03, LOC-04, LOC-05, FILTER-01, FILTER-02, FILTER-03, FILTER-04, FILTER-05, FILTER-06, VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06
**Success Criteria** (what must be TRUE):
  1. User can search events by city name or current location (geolocation)
  2. Search results show events sorted by distance with configurable radius
  3. User can filter events by type, date range, tags, accommodation, and food
  4. User can view events in list view (sorted by date) or calendar view
  5. User can view full event details including distance from search point
  6. User can search events by keyword in title or description
**Plans**: 6 plans

Plans:
- [ ] 04-01-PLAN.md — PostGIS database with geography column, spatial indexes, and search RPC function
- [ ] 04-02-PLAN.md — Backend search API with location/filter endpoint
- [ ] 04-03-PLAN.md — Frontend search infrastructure (hooks for geolocation, filters, URL params)
- [ ] 04-04-PLAN.md — Event list view with filters and keyword search
- [ ] 04-05-PLAN.md — Calendar view with react-big-calendar
- [ ] 04-06-PLAN.md — Event detail page with distance display

### Phase 5: Event Enhancements
**Goal**: Events support recurring patterns, teacher associations, and managed jams appear in directory
**Depends on**: Phase 4
**Requirements**: RECUR-01, RECUR-02, RECUR-03, RECUR-04, RECUR-05, TEACH-01, TEACH-02, TEACH-03, TEACH-04, JAM-01, JAM-02, JAM-03, JAM-04, JAM-05
**Success Criteria** (what must be TRUE):
  1. User can create recurring event with frequency and end date, generating separate occurrences
  2. User can cancel or edit single occurrence without affecting other occurrences
  3. User can edit all future occurrences in a series at once
  4. User can add existing users as teachers for classes/workshops/conventions, viewable on event page
  5. Public managed jams automatically appear in event directory and stay in sync with jam data
  6. Share-by-link jams do not appear in directory
**Plans**: TBD

Plans:
- [ ] TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Migration | 4/4 | Complete | 2026-01-20 |
| 2. Open Source Preparation | 3/3 | Complete | 2026-01-21 |
| 3. Event Foundation | 4/4 | Complete | 2026-01-21 |
| 4. Event Discovery | 0/6 | Not started | - |
| 5. Event Enhancements | 0/TBD | Not started | - |
