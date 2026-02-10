---
phase: 08-event-recap-email-engine
plan: 01
subsystem: backend-digest
tags: [nestjs, email, cron, react-email, event-curation]
requires: [07-03]
provides:
  - DigestModule with event curation service
  - Event grouping and deduplication logic
  - User subscription query methods
affects: [08-02, 08-03]
tech-stack:
  added: [@nestjs/schedule, @react-email/components, @react-email/render, @react-email/tailwind]
  patterns: [cron-scheduling, event-curation, service-role-client]
key-files:
  created:
    - apps/backend/src/digest/digest.module.ts
    - apps/backend/src/digest/digest.service.ts
    - apps/backend/src/digest/dto/curated-events.dto.ts
  modified:
    - apps/backend/package.json
    - apps/backend/tsconfig.json
    - apps/backend/src/app.module.ts
decisions:
  - title: Group events by type with priority ordering (convention > workshop > jam)
    rationale: Conventions are most important (rare, multi-day), workshops are specialized learning, jams are regular practice
    impact: Email digest presents events in order of importance to community
  - title: Deduplicate events across sections (new section excludes upcoming IDs)
    rationale: Prevents showing same event twice in digest
    impact: Better user experience, cleaner email content
  - title: Max 3 events per type per section
    rationale: Prevents email from being overwhelming, focuses on most relevant events
    impact: Digest remains concise and actionable
  - title: Service role client for digest queries
    rationale: Scheduled jobs run server-side without user context, need to bypass RLS
    impact: DigestService can query all published events regardless of ownership
  - title: JSX support in backend tsconfig
    rationale: React Email templates are .tsx files that require TypeScript JSX compilation
    impact: Backend can compile email templates
duration: 2 min
completed: 2026-02-10
---

# Phase 08 Plan 01: Digest Module Foundation Summary

**One-liner:** Event curation service that queries published events grouped by type (convention > workshop > jam), deduplicates across sections, and provides user subscription methods for scheduled digest emails.

## What Was Built

### DigestModule Foundation
- Registered in AppModule with ScheduleModule.forRoot() for global cron scheduler initialization
- Service role Supabase client for server-side scheduled jobs (bypasses RLS)
- Provides DigestService with event curation and user subscription query methods

### Event Curation Logic
- **curateEventsForUser()** method with two sections:
  - **Upcoming events**: starts_at >= now, sorted by start date ascending
  - **New events**: created_at >= lastDigestSentAt (if exists), sorted by creation date descending
- Deduplication: removes events from new section that appear in upcoming (prevents duplicates)
- **groupByType()** enforces max 3 events per type with priority ordering:
  1. Conventions (most important: rare, multi-day gatherings)
  2. Workshops (specialized learning opportunities)
  3. Jams (regular practice sessions)
- **hasEvents()** checks if curated result contains any events (used to skip empty digests)
- Classes excluded from all queries (not relevant for digest emails)

### User Subscription Methods
- **getSubscribedUsers()** queries email_preferences joined with profiles
  - Filters: digest_enabled = true AND digest_frequency = frequency
  - Returns: user_id, email, first_name, unsubscribe_token, last_digest_sent_at, digest_frequency
  - Uses service role client (bypasses RLS for scheduled jobs)
- **updateLastDigestSentAt()** tracks when digest was last sent to user

### TypeScript DTOs
- **DigestEvent**: Event fields needed for email cards (id, type, title, dates, location, image, created_at)
- **GroupedEvents**: Three arrays by type (conventions, workshops, jams)
- **CuratedEvents**: Two GroupedEvents objects (upcoming, new)
- **SubscribedUser**: User subscription data with unsubscribe token

### Dependencies Installed
- `@nestjs/schedule` - Cron job scheduling
- `@react-email/components` - React Email UI components
- `@react-email/render` - Server-side email rendering
- `@react-email/tailwind` - Tailwind CSS in emails
- JSX support configured in backend tsconfig.json

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

### Event Priority Ordering
**Decision:** Group events with convention > workshop > jam priority
**Rationale:** Conventions are most important (rare, multi-day gatherings), workshops are specialized learning opportunities, jams are regular practice sessions
**Impact:** Email digest presents events in order of importance to community
**Alternatives considered:** Alphabetical, chronological, random

### Deduplication Strategy
**Decision:** Remove events from "new" section that appear in "upcoming"
**Rationale:** Prevents showing same event twice in digest
**Impact:** Better user experience, cleaner email content
**Alternatives considered:** Show in both sections (rejected: redundant), show only in one section (rejected: loses "new" signal)

### Event Limit per Type
**Decision:** Max 3 events per type per section
**Rationale:** Prevents email from being overwhelming, focuses on most relevant events
**Impact:** Digest remains concise and actionable (max 18 events total: 3 types × 2 sections × 3 events)
**Alternatives considered:** No limit (rejected: too long), 5 per type (rejected: still too many)

### Service Role Client
**Decision:** Use service role Supabase client for digest queries
**Rationale:** Scheduled jobs run server-side without user context, need to bypass RLS to query all published events
**Impact:** DigestService can query all published events regardless of ownership
**Alternatives considered:** User-context queries (rejected: no user in scheduled job), public anon key (rejected: limited permissions)

## Next Phase Readiness

### Ready for Plan 08-02 (Email Templates)
- [x] DigestService provides CuratedEvents interface for template rendering
- [x] GroupedEvents structure matches template card layout needs
- [x] DigestEvent includes all fields needed for event cards (image, title, dates, location)
- [x] JSX support configured for React Email templates
- [x] React Email dependencies installed

### Ready for Plan 08-03 (Scheduled Sending)
- [x] getSubscribedUsers() provides user list for scheduler
- [x] curateEventsForUser() generates personalized event lists
- [x] hasEvents() allows skipping empty digests
- [x] updateLastDigestSentAt() tracks send timestamps
- [x] ScheduleModule.forRoot() initializes cron scheduler

### Blockers/Concerns
None. Foundation is solid for building email templates and scheduler.

## Testing Notes

**Manual verification completed:**
- ✓ Backend compiles without errors
- ✓ DigestModule registered in AppModule
- ✓ JSX config present in tsconfig.json
- ✓ All dependencies installed in package.json

**Test scenarios for Plan 08-03:**
- Query with no events should return empty GroupedEvents
- Query with events in both sections should deduplicate correctly
- Query with > 3 events per type should limit to 3
- getSubscribedUsers() should filter by frequency and digest_enabled
- Classes should be excluded from all queries

## Git Commits

**Task 1 - Configure JSX and Install Dependencies** (8f7e6a6)
- Added jsx: "react-jsx" to backend tsconfig.json
- Installed @nestjs/schedule, @react-email/components, @react-email/render, @react-email/tailwind
- Verified backend builds successfully

**Task 2 - Create Digest Module** (c0bf195)
- Created DigestModule with ScheduleModule.forRoot()
- Created DigestService with curation and subscription methods
- Created CuratedEvents DTOs
- Registered DigestModule in AppModule

## Performance Notes

**Execution time:** 2 minutes

**Query optimization considerations:**
- Upcoming events query: indexed on (status, type, starts_at) for fast filtering and sorting
- New events query: indexed on (status, type, created_at) for fast filtering and sorting
- User subscription query: partial index on (digest_enabled=true) reduces scan size
- Limit 9 per query prevents excessive data transfer (will be sliced to 3 per type)

## Open Questions

None. All implementation details resolved during execution.
