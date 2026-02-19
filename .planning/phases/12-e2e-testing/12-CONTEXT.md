# Phase 12: E2E Testing - Context

**Gathered:** 2026-02-19
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement Playwright-based end-to-end tests covering critical user flows: authentication, event creation, event discovery/search, and jam participation. Tests run against real local Supabase for true integration testing. CI runs on main branch with deploy blocking.

</domain>

<decisions>
## Implementation Decisions

### Critical flows priority
- **Authentication first** — sign up, sign in, profile setup, session handling (most critical)
- **Event creation: full coverage** — all event types, form validation, edge cases (drafts, image upload, teachers, recurring events)
- **Jam participation: full flow** — join, cancel, waitlist, capacity limits
- **Discovery: Claude's discretion** — pick what's most likely to catch regressions

### Test data strategy
- **Real Supabase (local)** — tests run against local Supabase with seeded data, true integration testing
- **Reset DB before each test** — pristine state, slower but reliable
- **Test users: both approaches** — seeded accounts (alice, bob, charlie) for most tests, fresh user creation for auth flow tests
- **Complex data: Claude's discretion** — per-scenario choice between extending seeds vs creating in test setup

### Browser/device coverage
- **Chromium only** — keep it fast and focused
- **Mobile priority** — iPhone 14 viewport (390x844) as primary
- **Desktop: Claude's discretion per flow** — some flows mobile-only, some both

### CI integration
- **Trigger: main branch only** — free for public repos (2000 min/month for private)
- **Sequential execution** — one test at a time, simpler with DB reset approach
- **Block deploys on failure** — strict quality gate
- **Local run: pnpm test:e2e** — same setup as CI for local testing
- **Reporting: Claude's discretion** — pick practical failure artifacts

### Claude's Discretion
- Discovery test coverage depth and specific scenarios
- Complex data creation approach per test (seeds vs test setup)
- Desktop viewport inclusion per flow
- Failure reporting artifacts (screenshots, traces, etc.)

</decisions>

<specifics>
## Specific Ideas

- User prioritizes mobile because Italian acroyogis likely discover events on phones
- Cost consciousness for hobby project — GitHub Actions free tier is sufficient
- Authentication is most critical because other flows depend on it

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 12-e2e-testing*
*Context gathered: 2026-02-19*
