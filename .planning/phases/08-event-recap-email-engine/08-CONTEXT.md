# Phase 8: Event Recap Email Engine - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Scheduled email digests deliver curated upcoming events to subscribed users via Resend. This phase builds the scheduler, email templates, content curation logic, and delivery infrastructure. User preference management was completed in Phase 7. Adoption/growth UX is Phase 9.

</domain>

<decisions>
## Implementation Decisions

### Email content & curation
- **Excluded event types:** Classes are excluded from digests. Only conventions, workshops, and jams are included.
- **Two macro sections per email:**
  1. **Prossimi eventi** (Upcoming events) — next events happening, sorted by event date (soonest first), max 3 per type
  2. **Nuovi eventi** (New events) — events created since user's last digest (`last_digest_sent_at`), sorted by creation date (newest first), max 3 per type
- **Type priority within each section:** Conventions first, then workshops, then jams
- **Max events per email:** 3 per type per section = up to 18 total (3 types × 3 events × 2 sections), though typically fewer
- **Deduplication:** Events appearing in "Nuovi eventi" must NOT also appear in "Prossimi eventi"
- **New event detection:** Based on `last_digest_sent_at` from `email_preferences` table (set by Phase 7)
- **Empty digest:** Skip sending entirely if no events match (no "nothing new" emails)
- **Event card info:** Image thumbnail, title, date, city, link to event page on Jamia

### Scheduling & delivery
- **Scheduler:** NestJS cron job using `@nestjs/schedule` with `@Cron` decorator — runs inside the existing backend process
- **Send times:** 10:00 AM CET for both weekly (Monday) and monthly (1st of month)
- **Failure handling:** Log the error, skip that user, continue sending to remaining users
- **Rate limiting:** Claude's Discretion — decide based on Resend API limits

### Email template design
- **Rendering approach:** React Email — build templates as React components, render to HTML
- **Style:** Match the homepage branding and aesthetic of Jamia
- **Header:** Minimal — just the Jamia logo, no banner
- **Content format:** Both HTML and plain text versions (deliverability best practice)

### Unsubscribe & compliance
- **Unsubscribe page:** Simple confirmation landing page — "Hai annullato l'iscrizione" with link back to Jamia. No preference editing on unsubscribe page.
- **Email footer:** Extended — unsubscribe link + explanation text ("Ricevi questa email perché sei iscritto a Jamia") + link to manage preferences on Jamia
- **Sender domain:** Custom domain (e.g. digest@jamia.app) — requires DNS configuration with Resend
- **Tracking:** Open tracking only via Resend built-in (no click tracking pixels)
- **RFC 8058:** List-Unsubscribe and List-Unsubscribe-Post headers (Phase 7 built the token-based endpoints)

### Claude's Discretion
- Rate limiting strategy for bulk sends (based on Resend API limits)
- Exact email layout spacing and typography details
- Plain text formatting approach
- Cron expression specifics for timezone handling
- Batch processing approach for querying users

</decisions>

<specifics>
## Specific Ideas

- Email should feel like the Jamia homepage — same branding, same aesthetic
- Two clear sections in every email: "Prossimi eventi" and "Nuovi eventi" — each showing conventions first, then workshops, then jams
- Within each type group in "Nuovi eventi", newest-created events appear first
- Keep it focused: no classes, only events that matter for community discovery (conventions, workshops, jams)
- 5-8 events total is the ideal sweet spot — enough to be useful, not overwhelming

</specifics>

<deferred>
## Deferred Ideas

- Location-based event filtering in digests — future enhancement once user location preferences are established
- Event type filtering in digest preferences — future enhancement
- Click tracking analytics — keep it privacy-first for now
- Preference editing page from unsubscribe link — could be Phase 9

</deferred>

---

*Phase: 08-event-recap-email-engine*
*Context gathered: 2026-02-10*
