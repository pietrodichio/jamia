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
- [x] **Phase 4: Event Discovery** - Location-based search, filtering, and views
- [x] **Phase 5: Event Enhancements** - Recurring events, teachers, jam integration, and advanced filters
- [x] **Phase 6: UI/UX Refactor for Events Management** - Improve user experience and interface for event management features
- [x] **Phase 6.1: Event Creation Flow Fixes (INSERTED)** - Fix critical gaps in event creation wizard discovered during Phase 6 execution
- [x] **Phase 6.2: Dashboard Refactor (INSERTED)** - Separate dashboard into participations/discovery and event management sections
- [x] **Phase 6.3: Location UX Improvements (INSERTED)** - Smart location detection and city search for event discovery
- [x] **Phase 6.4: Unified Search Bar (INSERTED)** - Eventbrite-style combined keyword and location search
- [x] **Phase 7: Email Preferences** - Database, API, and settings UI for user email digest preferences
- [x] **Phase 8: Event Recap Email Engine** - Scheduled sending, email templates, content curation, and Resend integration
- [x] **Phase 9: Email Adoption & Growth UX** - Onboarding flows, nudges, smart defaults to maximize email subscription rates
- [ ] **Phase 10: Frontend Testing Infrastructure** - Set up Vitest + React Testing Library, test critical components and custom hooks
- [ ] **Phase 11: Backend Integration Tests** - Controller tests via supertest, API endpoint validation, DTO validation testing
- [ ] **Phase 12: E2E Testing** - Playwright setup with tests for event creation, discovery, jam participation, and auth flows

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
**Goal**: Users can find events by location, date, type, and keyword in list or calendar view
**Depends on**: Phase 3
**Requirements**: LOC-02, LOC-03, LOC-04, LOC-05, FILTER-01, FILTER-02, FILTER-06, VIEW-01, VIEW-02, VIEW-03, VIEW-04, VIEW-05, VIEW-06
**Success Criteria** (what must be TRUE):
  1. User can search events using current location (browser geolocation) or manual lat/lng coordinates
  2. Search results show events sorted by distance with configurable radius
  3. User can filter events by type and date range
  4. User can view events in list view (sorted by distance) or calendar view
  5. User can view full event details including distance from search point
  6. User can search events by keyword in title or description
**Deferred to Phase 5**: LOC-01 (city name geocoding), FILTER-03 (tags), FILTER-04 (accommodation), FILTER-05 (food)
**Plans**: 7 plans

Plans:
- [x] 04-01-PLAN.md — PostGIS database with geography column, spatial indexes, and search RPC function
- [x] 04-02-PLAN.md — Backend search API with location/filter endpoint
- [x] 04-03-PLAN.md — Frontend search infrastructure (hooks for geolocation, filters, URL params)
- [x] 04-04-PLAN.md — Filter and search UI components
- [x] 04-05-PLAN.md — Calendar view with react-big-calendar
- [x] 04-06-PLAN.md — Event detail page with distance display
- [x] 04-07-PLAN.md — Event list view and page assembly

### Phase 5: Event Enhancements
**Goal**: Events support recurring patterns, teacher associations, jam integration, and advanced filters
**Depends on**: Phase 4
**Requirements**: RECUR-01, RECUR-02, RECUR-03, RECUR-04, RECUR-05, TEACH-01, TEACH-02, TEACH-03, TEACH-04, JAM-01, JAM-02, JAM-03, JAM-04, JAM-05, FILTER-03, FILTER-04, FILTER-05
**Deferred from Phase 5**: LOC-01 (city name geocoding via API)
**Success Criteria** (what must be TRUE):
  1. User can create recurring event with frequency and end date, generating separate occurrences
  2. User can cancel or edit single occurrence without affecting other occurrences
  3. User can edit all future occurrences in a series at once
  4. User can add existing users as teachers for classes/workshops/conventions, viewable on event page
  5. Public managed jams automatically appear in event directory and stay in sync with jam data
  6. Share-by-link jams do not appear in directory
  7. User can filter events by tags, accommodation options, and food options
**Plans**: 10 plans

**Note on LOC-01 deferral**: Research findings (05-RESEARCH.md) explicitly recommend starting with manual lat/lng input and deferring geocoding API integration to avoid costs until usage patterns are known. Phase 5 provides the infrastructure (tags, advanced filters) but intentionally excludes geocoding service integration. LOC-01 will be addressed in a future phase once:
- User search patterns are established
- Budget for geocoding API is allocated
- Choice between Nominatim (free, rate-limited) vs Mapbox/Google (paid, scalable) can be made with data

Plans:
- [x] 05-01-PLAN.md — Recurring events database (RRULE columns, event_occurrences table)
- [x] 05-02-PLAN.md — Teachers database (event_teachers junction table)
- [x] 05-03-PLAN.md — Advanced filters database (ARRAY columns with GIN indexes)
- [x] 05-04-PLAN.md — Recurring events backend (service methods, RRULE validation)
- [x] 05-05-PLAN.md — Teachers backend (CRUD for event_teachers, authorization)
- [x] 05-06-PLAN.md — Advanced filters backend (extend search API with tag filters)
- [x] 05-07-PLAN.md — Managed jam integration backend (application-level sync)
- [x] 05-08-PLAN.md — Recurring events frontend (RecurrenceEditor, occurrence generation)
- [x] 05-09-PLAN.md — Teachers frontend (TeacherSelect, display on event detail)
- [x] 05-10-PLAN.md — Advanced filters frontend (TagFilter, AmenityFilters components)

### Phase 6: UI/UX Refactor for Events Management

**Goal**: Italian localization, unified discovery experience, smart creation wizard, and information-rich dashboard
**Depends on**: Phase 5
**Plans**: 7 plans

Plans:
- [ ] 06-01-PLAN.md — Italian localization setup + shadcn date pickers with Italian locale
- [ ] 06-02-PLAN.md — Event card grid components (Airbnb-style) with view toggle
- [ ] 06-03-PLAN.md — Home page redesign + unified discovery view (grid/calendar merge)
- [ ] 06-04-PLAN.md — Event creation wizard (three-step: type/basic, schedule/details, preview)
- [ ] 06-05-PLAN.md — Unified jam/event creation flow with conditional fields and auto-save
- [ ] 06-06-PLAN.md — Dashboard redesign (information-oriented with upcoming events, recommendations, statistics)
- [ ] 06-07-PLAN.md — Event detail page enhancements (hero layout, teachers, calendar export, share)

**Details:**
- All UI text in Italian (user-generated content can be any language)
- Italian date/time formats: dd/MM/yyyy and 24-hour time (14:30)
- Home page (/) shows events + marketing content (Airbnb-style)
- Merge /calendar and /discover into single unified view with toggle
- Three-step wizard: Type+Basic → Schedule+Details → Preview
- Unified creation flow: single interface for managed jams and simple event listings
- After selecting "Jam" type, ask: "Do you want to manage participants?" (Yes/No)
- External registration links with customizable CTA buttons
- Dashboard displays: upcoming events, recommended nearby events, statistics
- Event detail with hero image, organizer visibility logic, teachers display, calendar export

### Phase 6.1: Event Creation Flow Fixes (INSERTED)

**Goal:** Fix critical gaps in event creation wizard discovered during Phase 6 execution
**Depends on:** Phase 6
**Plans:** 6 plans

Plans:
- [x] 06.1-01-PLAN.md — Extract reusable components (DescriptionEditor, LocationInput, DateTimePicker)
- [x] 06.1-02-PLAN.md — Fix wizard infrastructure (WizardStepIndicator spacing, EventPreviewStep null-safety)
- [x] 06.1-03-PLAN.md — Enhance EventTypeStep with rich text and location autocomplete
- [x] 06.1-04-PLAN.md — Enhance EventScheduleStep with DateTimePicker and RecurrenceEditor
- [x] 06.1-05-PLAN.md — Add image upload step with compression
- [x] 06.1-06-PLAN.md — Add teacher selection step for class/workshop/convention types

**Details:**
Issues addressed:
- WizardStepIndicator layout and spacing consistency (Plan 02)
- Rich text editor for event description (Plans 01, 03)
- Google Maps location picker integration (Plans 01, 03)
- Multi-select tags component (verified in Plan 03)
- Recurring event support for classes (Plan 04)
- Event preview fixes (undefined values, missing date/time display) (Plan 02)
- Date/time validation improvements with auto-fill logic (Plans 01, 04)
- Image upload capability with compression (Plan 05)
- Teacher management in creation flow (Plan 06)

### Phase 6.2: Dashboard Refactor (INSERTED)

**Goal:** Reorganize dashboard into two distinct sections for clearer user workflows
**Depends on:** Phase 6.1
**Plans:** 3 plans

Plans:
- [x] 06.2-01-PLAN.md — Dashboard tabs infrastructure with URL sync
- [x] 06.2-02-PLAN.md — Event Management tab with jam/event management
- [x] 06.2-03-PLAN.md — Participations tab with discovery and participations

**Details:**
Dashboard refactor with two main sections:

**Section 1: Participations & Event Discovery**
- Events user is participating in
- Event discovery and recommendations
- Upcoming events in user's area

**Section 2: Event Management**
- Create new events
- Edit existing events
- View and manage draft events
- Event statistics and analytics

### Phase 6.3: Location UX Improvements (INSERTED)

**Goal:** Improve location detection UX with auto-detect, IP fallback, and city search for trip planning
**Depends on:** Phase 6.2
**Plans:** 3 plans

Plans:
- [x] 06.3-01-PLAN.md — IP location auto-detection and geolocation permission hooks
- [x] 06.3-02-PLAN.md — City search with Google Places autocomplete
- [x] 06.3-03-PLAN.md — Context-aware empty states with actionable guidance

**Details:**
Location UX improvements addressing discovery friction:

**Auto-detection:**
- IP-based location fetched silently on discovery page mount (no permission prompt)
- GPS upgrade available via explicit user action (button click)
- Visual indicator distinguishing approximate vs precise location

**City/Place Search:**
- Google Places autocomplete restricted to cities for trip planning
- Reuses existing Google Maps integration from event creation
- Selection applies coordinates to URL-based filter state

**Temporary vs Profile Location:**
- Search location is temporary (URL params only)
- Does not modify user's profile location
- City name displayed when using city search

**Better Empty States:**
- Context-aware messaging: no location vs no results vs filters too restrictive
- Actionable CTAs: set location, expand radius, clear filters
- Skeleton loading states instead of generic text

### Phase 6.4: Unified Search Bar (INSERTED)

**Goal:** Create Eventbrite-style unified search bar combining keyword and location search
**Depends on:** Phase 6.3
**Plans:** 2 plans

Plans:
- [x] 06.4-01-PLAN.md — UnifiedSearchBar desktop component with IP prefill, GPS, city autocomplete
- [x] 06.4-02-PLAN.md — Mobile drawer pattern and UnifiedEventView integration

**Details:**
Unified search bar with Eventbrite-style UX:

**Structure:**
- Single component: `[🔍 Keyword] | [📍 Location] [🔵 Search Button]`
- Vertical divider between keyword and location inputs
- Circular search button triggers location-based search

**Location Behavior:**
- Default: IP-based location prefilled with "(approssimativa)" indicator
- "Use current location" option triggers GPS browser permission
- Autocomplete: cities, countries, regions, provinces, neighborhoods (NOT addresses/zip codes)
- Display: Always show city name (e.g., "Milano")

**Search Triggers:**
- Keyword: Real-time with debounce + Enter key
- Location: Only on search button click (selection doesn't auto-search)

**Mobile:**
- Stack inputs vertically
- Modal/sheet pattern for search interface

### Phase 7: Email Preferences

**Goal:** Users can manage their email digest preferences (weekly/monthly) via a settings UI backed by database storage and API
**Depends on:** Phase 6.4
**Plans:** 3 plans

Plans:
- [x] 07-01-PLAN.md — Database migration for email_preferences table with RLS, triggers, and backfill
- [x] 07-02-PLAN.md — Shared types and NestJS backend module with CRUD and unsubscribe endpoints
- [x] 07-03-PLAN.md — Frontend API client, EmailPreferencesCard component, and ProfileSetup integration

**Details:**
- Database migration for email preference storage (frequency: weekly/monthly, opt-in status, location for digest)
- Backend API for preference CRUD operations
- Frontend settings UI for frequency selection
- Users can choose: weekly digest (sent Monday) or monthly digest (sent 1st of month)

### Phase 8: Event Recap Email Engine

**Goal:** Scheduled email digests deliver curated upcoming events to subscribed users via Resend
**Depends on:** Phase 7
**Plans:** 3 plans

Plans:
- [x] 08-01-PLAN.md — Digest module setup with event curation service
- [x] 08-02-PLAN.md — React Email templates and rendering
- [x] 08-03-PLAN.md — Digest scheduler, batch delivery, and unsubscribe page

**Details:**
- NestJS cron scheduler (@nestjs/schedule) for weekly (Monday 10AM CET) and monthly (1st 10AM CET) digest sends
- React Email templates matching Jamia branding with two sections: "Prossimi eventi" and "Nuovi eventi"
- Event curation: conventions, workshops, jams only (no classes), max 3 per type per section, dedup across sections
- Batch delivery with per-user error isolation, rate limiting, and RFC 8058 compliance headers
- Frontend unsubscribe confirmation page at /unsubscribe

### Phase 9: Email Adoption & Growth UX

**Goal:** Maximize email subscription rates through smart defaults, onboarding integration, and nudge patterns for both new and existing users
**Depends on:** Phase 8
**Plans:** 1 plan

Plans:
- [x] 09-01-PLAN.md — Dashboard nudge banner with one-click opt-in and backend has_seen_digest_prompt flag

**Details:**
- **New users:** Smart defaults during signup via ProfileSetup auto-save (already implemented in Phase 7)
- **Existing users:** Dismissible dashboard banner with one-click opt-in to monthly digest
- Backend sets `has_seen_digest_prompt: true` on any preference update to prevent re-nudging
- localStorage persistence for banner dismissal state
- Mobile-first responsive banner design

### Phase 10: Frontend Testing Infrastructure

**Goal:** Establish comprehensive frontend testing with Vitest and React Testing Library, covering critical components and custom hooks
**Depends on:** Phase 9
**Plans:** 2 plans

Plans:
- [ ] 10-01-PLAN.md — Install Vitest 3.2.4 + RTL + MSW, create test infrastructure (config, setup, utilities)
- [ ] 10-02-PLAN.md — Write EventCard component test and hook tests (useEventFilters, useIpLocation, useDebounce)

**Details:**
- Set up Vitest + React Testing Library testing infrastructure
- Test critical components (forms, search, event cards)
- Test custom hooks with React Query integration
- Establish testing patterns and utilities for future development

### Phase 11: Backend Integration Tests

**Goal:** Add controller-level and API endpoint testing to complement existing service unit tests
**Depends on:** Phase 10
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 11 to break down)

**Details:**
- Controller tests using supertest for HTTP request/response validation
- API endpoint testing with authentication and authorization scenarios
- DTO validation testing (class-validator decorators)
- Expand e2e test coverage beyond current "hello world" boilerplate

### Phase 12: E2E Testing

**Goal:** Implement end-to-end tests for critical user flows using Playwright
**Depends on:** Phase 11
**Plans:** 0 plans

Plans:
- [ ] TBD (run /gsd:plan-phase 12 to break down)

**Details:**
- Set up Playwright testing framework with test database
- Event creation flow (wizard steps, form validation, submission)
- Event discovery/search flow (location, filters, results)
- Jam participation flow (join, cancel, waitlist)
- Authentication flows (sign up, sign in, profile setup)
- Cross-browser testing configuration

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5 → 6 → 6.1 → 6.2 → 6.3 → 6.4 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Monorepo Migration | 4/4 | Complete | 2026-01-20 |
| 2. Open Source Preparation | 3/3 | Complete | 2026-01-21 |
| 3. Event Foundation | 4/4 | Complete | 2026-01-21 |
| 4. Event Discovery | 7/7 | Complete | 2026-01-21 |
| 5. Event Enhancements | 10/10 | Complete | 2026-01-21 |
| 6. UI/UX Refactor for Events Management | 7/7 | Complete | 2026-01-23 |
| 6.1. Event Creation Flow Fixes (INSERTED) | 6/6 | Complete | 2026-01-24 |
| 6.2. Dashboard Refactor (INSERTED) | 3/3 | Complete | 2026-01-25 |
| 6.3. Location UX Improvements (INSERTED) | 3/3 | Complete | 2026-01-29 |
| 6.4. Unified Search Bar (INSERTED) | 2/2 | Complete | 2026-01-29 |
| 7. Email Preferences | 3/3 | Complete | 2026-02-10 |
| 8. Event Recap Email Engine | 3/3 | Complete | 2026-02-10 |
| 9. Email Adoption & Growth UX | 1/1 | Complete | 2026-02-10 |
| 10. Frontend Testing Infrastructure | 0/2 | Not Started | — |
| 11. Backend Integration Tests | 0/0 | Not Started | — |
| 12. E2E Testing | 0/0 | Not Started | — |
