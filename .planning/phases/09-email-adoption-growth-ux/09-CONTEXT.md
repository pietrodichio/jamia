# Phase 9: Email Adoption & Growth UX - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Maximize email digest subscription rates through smart defaults for new users during onboarding and nudge patterns for existing users. This phase modifies the existing ProfileSetup flow and adds a dashboard banner component. It does NOT add new email features, change digest content, or modify the email sending infrastructure (those are Phase 8).

</domain>

<decisions>
## Implementation Decisions

### New user onboarding
- Digest option shown during ProfileSetup (existing flow, already has EmailPreferencesCard from Phase 7)
- Toggle is **pre-enabled by default** (opt-out approach) -- user must explicitly turn it off
- Default frequency: **monthly**
- Brief explanatory text alongside the toggle (e.g., "Riceverai un riepilogo mensile degli eventi su Jamia") -- do NOT mention location-based events (digest is not location-based)
- **Auto-save on profile completion** -- when user finishes ProfileSetup, the pre-enabled digest preference is persisted automatically

### Existing user nudges
- **Dashboard only** -- inline banner at the top of the dashboard page
- Banner is **dismissible permanently** -- once closed, never shows again
- Dismissed state stored in **localStorage** (simple, browser-only, good enough for a nudge)
- **One-click opt-in** from the banner -- button enables digest immediately with toast confirmation (defaults to monthly)
- No link to settings needed -- one-click action is sufficient
- **Mobile-first design** -- banner must work well on small screens

### Opt-in strategy
- Existing users (signed up before Phase 7) stay with **disabled/no preferences** -- they must opt in via the dashboard nudge or settings
- No backfill of existing users with digest enabled
- One-click opt-in always defaults to **monthly** frequency
- **No analytics tracking** -- no dismiss/opt-in counts

### Trigger points & timing
- Dashboard banner appears **immediately** on first visit after feature deploys
- Banner only targets users **without email_preferences row** (never configured) -- users who explicitly disabled digest are not nudged
- **Dashboard banner is the only nudge point** -- no toasts on event pages or other locations
- ProfileSetup auto-save is the only new-user trigger

### Claude's Discretion
- Exact banner copy/messaging (Italian)
- Banner visual design (colors, icons, layout within mobile-first constraint)
- Toast confirmation message after one-click opt-in
- How to detect "no preferences" state (API check vs query on dashboard load)

</decisions>

<specifics>
## Specific Ideas

- Mobile-first is critical -- majority of users access from mobile devices
- Banner should be simple and non-intrusive -- single dismiss action, single opt-in action
- Explanatory text should be accurate -- digest sends curated events across the platform, NOT location-specific events

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 09-email-adoption-growth-ux*
*Context gathered: 2026-02-10*
