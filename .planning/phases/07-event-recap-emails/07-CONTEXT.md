# Phase 7: Email Preferences - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can manage their email digest preferences (weekly/monthly) via a settings UI on the profile page, backed by database storage and API. This phase covers the preference infrastructure only — actual email sending is Phase 8, adoption/growth UX is Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Preference Options
- Two frequency options only: **Weekly** (Monday morning) or **Monthly** (1st of the month)
- No location filtering — digest shows all upcoming events Italy-wide
- No event type filtering — all event types included (jam, class, workshop, convention)
- Keep it simple to maximize adoption

### Settings UI Placement
- Integrate into existing ProfileSetup page (`apps/web/src/pages/ProfileSetup.tsx`)
- Separate card with heading ("Notifiche Email" or similar) — visually distinct section
- UI pattern: toggle (on/off) + radio group (Weekly/Monthly) when enabled
- Auto-save on change with toast confirmation — no explicit save button

### Data Model
- Track `last_digest_sent_at` timestamp per user for scheduling accuracy and debugging
- Store unsubscribe token (UUID) per user for one-click email unsubscribe (RFC 8058 compliance, email deliverability)
- Claude's Discretion: whether to add columns to `profiles` table or create a separate `email_preferences` table
- Claude's Discretion: whether preference API extends existing profile endpoints or uses standalone endpoints

### Opt-in/out Behavior
- **New users:** Ask during signup with pre-checked toggle (opt-out pattern). Default frequency: Monthly
- **Existing users:** Default to opted-out (no surprise emails). Show one-time prompt on next login to encourage opt-in
- One-click unsubscribe from email via token-based endpoint (no login required)

### Testing
- API endpoints must have tests (unit/integration tests for preference CRUD operations)

### Claude's Discretion
- Storage approach: columns on profiles vs separate table
- API design: extend profile API vs standalone endpoints
- Exact card styling within ProfileSetup
- Toast message content for auto-save confirmation
- Signup form integration approach (where in the flow the digest toggle appears)

</decisions>

<specifics>
## Specific Ideas

- The existing prompt for existing users (one-time login banner) is a Phase 9 concern for implementation, but Phase 7 needs the data model to support the "has_seen_digest_prompt" or equivalent flag
- Monthly default for new users — less intrusive starting point, they can upgrade to weekly

</specifics>

<deferred>
## Deferred Ideas

- Location-based digest filtering — future enhancement once adoption is established
- Event type filtering in digest preferences — future enhancement to keep initial version simple
- The actual one-time login prompt UI for existing users — Phase 9 (Email Adoption & Growth UX)

</deferred>

---

*Phase: 07-event-recap-emails*
*Context gathered: 2026-02-10*
