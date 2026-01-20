# Requirements: Jamia v1

**Defined:** 2026-01-20
**Core Value:** Dual-purpose platform - manage jam participants + discover acroyoga events

## v1 Requirements

### Monorepo Migration

- [ ] **MONO-01**: Turborepo configured with apps/web and apps/backend workspaces
- [ ] **MONO-02**: Shared types package created and used by both apps
- [ ] **MONO-03**: All existing tests pass in monorepo structure
- [ ] **MONO-04**: Selective deployment - FE changes trigger only Netlify deploy
- [ ] **MONO-05**: Selective deployment - BE changes trigger only Railway deploy
- [ ] **MONO-06**: Netlify deploys frontend successfully from monorepo
- [ ] **MONO-07**: Railway deploys backend successfully from monorepo

### Open Source Documentation

- [ ] **OSS-01**: README.md with project overview and local setup instructions
- [ ] **OSS-02**: Environment variable documentation (.env.example files)
- [ ] **OSS-03**: CONTRIBUTING.md with branching strategy and PR process
- [ ] **OSS-04**: LICENSE file (MIT or Apache 2.0)
- [ ] **OSS-05**: CODE_OF_CONDUCT.md (Contributor Covenant)
- [ ] **OSS-06**: GitHub issue template for bug reports
- [ ] **OSS-07**: GitHub issue template for feature requests
- [ ] **OSS-08**: GitHub PR template with checklist
- [ ] **OSS-09**: Repository settings documentation (branch protection, required checks)

### Event Types & Creation

- [ ] **EVENT-01**: Support event type: jam (managed via existing system)
- [ ] **EVENT-02**: Support event type: class (listing only)
- [ ] **EVENT-03**: Support event type: workshop (listing only)
- [ ] **EVENT-04**: Support event type: convention (listing only)
- [ ] **EVENT-05**: User can create event listing with required fields (title, location, dates, type)
- [ ] **EVENT-06**: User can add optional fields (price, description, external link, organizer contact)
- [ ] **EVENT-07**: User can edit events they created
- [ ] **EVENT-08**: User can delete events they created
- [ ] **EVENT-09**: User can add co-organizers who can also edit the event
- [ ] **EVENT-10**: Super admins can edit any event

### Event Discovery - Location

- [ ] **LOC-01**: User can search events by city name (manual entry)
- [ ] **LOC-02**: User can search events near current location (geolocation)
- [ ] **LOC-03**: Events stored with geocoded coordinates (lat/lng)
- [ ] **LOC-04**: Search returns events sorted by distance from search point
- [ ] **LOC-05**: User can specify search radius (within X km)

### Event Discovery - Filtering

- [ ] **FILTER-01**: User can filter events by event type (jam, class, workshop, convention)
- [ ] **FILTER-02**: User can filter events by date range
- [ ] **FILTER-03**: User can filter by tags (skill level, free/paid, indoor/outdoor, mat required)
- [ ] **FILTER-04**: User can filter by accommodation (for multi-day events)
- [ ] **FILTER-05**: User can filter by food provided (for multi-day events)
- [ ] **FILTER-06**: User can combine multiple filters

### Event Discovery - Views

- [ ] **VIEW-01**: User can browse events in list view sorted by date
- [ ] **VIEW-02**: User can view events in calendar view
- [ ] **VIEW-03**: User can view full event details page
- [ ] **VIEW-04**: Event detail page shows all event information
- [ ] **VIEW-05**: Event detail page shows distance from user (if location search used)
- [ ] **VIEW-06**: User can search events by keyword (title, description)

### Recurring Events

- [ ] **RECUR-01**: User can create recurring event (specify frequency and end date)
- [ ] **RECUR-02**: System generates separate event occurrences
- [ ] **RECUR-03**: User can cancel single occurrence without affecting series
- [ ] **RECUR-04**: User can edit single occurrence without affecting series
- [ ] **RECUR-05**: User can edit all future occurrences in series

### Teachers & Organization

- [ ] **TEACH-01**: User can add existing users as teachers for classes/workshops/conventions
- [ ] **TEACH-02**: Teachers displayed on event detail page
- [ ] **TEACH-03**: User can view all events by a specific teacher
- [ ] **TEACH-04**: Teachers have no special permissions (display only)

### Managed Jams Integration

- [ ] **JAM-01**: Public managed jams automatically appear in event directory
- [ ] **JAM-02**: Share-by-link jams do not appear in directory
- [ ] **JAM-03**: User can upgrade listed jam to managed jam (if they created it)
- [ ] **JAM-04**: Managed jam event listings stay in sync with jam data
- [ ] **JAM-05**: Editing managed jam updates corresponding event listing

## v2 Requirements

Deferred to future releases:

### Discovery Enhancements
- **DISC-01**: Map view of events
- **DISC-02**: Save/bookmark events for later
- **DISC-03**: Event recommendations based on user preferences
- **DISC-04**: Weekly/monthly email digest of nearby events
- **DISC-05**: Export events to calendar (iCal, Google Calendar)

### Social Features
- **SOCIAL-01**: User profiles with bio and social links
- **SOCIAL-02**: Follow favorite organizers
- **SOCIAL-03**: Follow favorite teachers
- **SOCIAL-04**: Notifications for events from followed organizers/teachers

### Quality & Moderation
- **MOD-01**: User can report inappropriate events
- **MOD-02**: Admin dashboard for reviewing reported events
- **MOD-03**: Duplicate event detection
- **MOD-04**: Auto-archive past events

### Advanced Features
- **ADV-01**: Event attendance estimates (for listings)
- **ADV-02**: Event photo galleries
- **ADV-03**: Multi-language support
- **ADV-04**: Mobile apps (iOS, Android)

## Out of Scope

Explicitly excluded from roadmap:

| Feature | Reason |
|---------|--------|
| Built-in ticketing/payments | Complex, liability, PCI compliance - use external services |
| Social features (comments, ratings on events) | Moderation burden, not core value |
| Native messaging between users | Spam vector, organizers can provide contact info |
| Event approval workflow | Kills velocity, trust community instead |
| Managing complex multi-day events | Only jams are fully managed, others are listings |
| Mobile apps | Web-first approach, defer to v2+ |
| Monetization/paid features | Non-profit community project |
| Video uploads | Storage costs, complexity |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| MONO-01 | Phase 1 | Pending |
| MONO-02 | Phase 1 | Pending |
| MONO-03 | Phase 1 | Pending |
| MONO-04 | Phase 1 | Pending |
| MONO-05 | Phase 1 | Pending |
| MONO-06 | Phase 1 | Pending |
| MONO-07 | Phase 1 | Pending |
| OSS-01 | Phase 2 | Pending |
| OSS-02 | Phase 2 | Pending |
| OSS-03 | Phase 2 | Pending |
| OSS-04 | Phase 2 | Pending |
| OSS-05 | Phase 2 | Pending |
| OSS-06 | Phase 2 | Pending |
| OSS-07 | Phase 2 | Pending |
| OSS-08 | Phase 2 | Pending |
| OSS-09 | Phase 2 | Pending |
| EVENT-01 | Phase 3 | Pending |
| EVENT-02 | Phase 3 | Pending |
| EVENT-03 | Phase 3 | Pending |
| EVENT-04 | Phase 3 | Pending |
| EVENT-05 | Phase 3 | Pending |
| EVENT-06 | Phase 3 | Pending |
| EVENT-07 | Phase 3 | Pending |
| EVENT-08 | Phase 3 | Pending |
| EVENT-09 | Phase 3 | Pending |
| EVENT-10 | Phase 3 | Pending |
| LOC-01 | Phase 4 | Pending |
| LOC-02 | Phase 4 | Pending |
| LOC-03 | Phase 4 | Pending |
| LOC-04 | Phase 4 | Pending |
| LOC-05 | Phase 4 | Pending |
| FILTER-01 | Phase 4 | Pending |
| FILTER-02 | Phase 4 | Pending |
| FILTER-03 | Phase 4 | Pending |
| FILTER-04 | Phase 4 | Pending |
| FILTER-05 | Phase 4 | Pending |
| FILTER-06 | Phase 4 | Pending |
| VIEW-01 | Phase 4 | Pending |
| VIEW-02 | Phase 4 | Pending |
| VIEW-03 | Phase 4 | Pending |
| VIEW-04 | Phase 4 | Pending |
| VIEW-05 | Phase 4 | Pending |
| VIEW-06 | Phase 4 | Pending |
| RECUR-01 | Phase 5 | Pending |
| RECUR-02 | Phase 5 | Pending |
| RECUR-03 | Phase 5 | Pending |
| RECUR-04 | Phase 5 | Pending |
| RECUR-05 | Phase 5 | Pending |
| TEACH-01 | Phase 5 | Pending |
| TEACH-02 | Phase 5 | Pending |
| TEACH-03 | Phase 5 | Pending |
| TEACH-04 | Phase 5 | Pending |
| JAM-01 | Phase 5 | Pending |
| JAM-02 | Phase 5 | Pending |
| JAM-03 | Phase 5 | Pending |
| JAM-04 | Phase 5 | Pending |
| JAM-05 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 57 total
- Mapped to phases: 57
- Unmapped: 0

---
*Requirements defined: 2026-01-20*
*Last updated: 2026-01-20 after roadmap creation*
