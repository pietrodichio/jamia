---
phase: 08
plan: 03
subsystem: email-delivery
tags: [cron, scheduler, resend, batch-email, unsubscribe, rfc-8058]

dependencies:
  requires: [08-02]
  provides:
    - "Automated digest delivery via cron scheduler"
    - "RFC 8058 compliant unsubscribe headers and flow"
    - "Rate-limited batch email sending"
  affects: []

tech-stack:
  added: []
  patterns:
    - "@Cron decorators for scheduled jobs"
    - "Per-user error isolation in batch processing"
    - "Direct Resend client injection for custom headers"
    - "Standalone unsubscribe confirmation page"

files:
  created:
    - apps/backend/src/digest/digest.scheduler.ts
    - apps/web/src/pages/Unsubscribe.tsx
  modified:
    - apps/backend/src/digest/digest.service.ts
    - apps/backend/src/digest/digest.module.ts
    - apps/web/src/App.tsx
    - apps/web/src/locales/it/common.json

decisions: []

metrics:
  tasks: 3
  commits: 3
  duration: "3 min"
  completed: "2026-02-10"
---

# Phase 8 Plan 03: Digest Scheduler & Batch Delivery Summary

**One-liner:** Cron-based digest delivery with weekly/monthly schedules, RFC 8058 unsubscribe headers, and rate-limited batch sending

## What Was Built

### 1. Batch Email Sending (Task 1)
Added direct Resend integration to DigestService for personalized digest delivery:

- **Direct Resend client injection**: DigestService now initializes its own Resend instance (separate from EmailService) because digests require per-user unsubscribe headers
- **End-to-end user flow**: `sendDigestToUser()` method handles curate → check empty → render → send → update timestamp
- **RFC 8058 headers**: Every digest includes `List-Unsubscribe` and `List-Unsubscribe-Post` headers with per-user unsubscribe tokens
- **Empty digest handling**: Skips sending entirely if no events (prevents "nothing new" emails)
- **Batch processing**: `sendBatchDigests()` iterates users with per-user try-catch for error isolation
- **Rate limiting**: 200ms delay between sends to respect Resend's rate limits
- **Timestamp tracking**: Updates `last_digest_sent_at` after successful send for next curation window

**Key pattern**: Direct Resend access instead of using EmailService because EmailService batch API sends identical content to all recipients, but digests need per-user unsubscribe tokens in headers.

### 2. Cron Scheduler (Task 2)
Created DigestScheduler with automated weekly and monthly digest jobs:

- **Weekly cron job**: `@Cron('0 10 * * 1')` fires every Monday at 10:00 AM Europe/Rome
- **Monthly cron job**: `@Cron('0 10 1 * *')` fires 1st of month at 10:00 AM Europe/Rome
- **Timezone handling**: Both jobs use `timeZone: 'Europe/Rome'` for automatic CET/CEST transitions
- **No duplicate sends**: Weekly queries `frequency='weekly'`, monthly queries `frequency='monthly'` - even if 1st falls on Monday, users only get one email (their chosen frequency)
- **Logging**: Comprehensive logs for start, user counts, and completion summary

**Registered in DigestModule**: Scheduler is automatically instantiated and cron jobs start when app boots.

### 3. Unsubscribe Confirmation Page (Task 3)
Built standalone unsubscribe landing page at `/unsubscribe?token=xxx`:

- **Token-based flow**: Reads token from URL params, calls `POST /email-preferences/unsubscribe/:token`
- **Three states**: Loading spinner → Success confirmation → Error message
- **Success UI**: Green checkmark, "Iscrizione annullata" heading, confirmation message, link back to home
- **Error UI**: Alert icon, error message, link to profile for preference management
- **No auth required**: Public page, anyone with valid token can unsubscribe
- **Italian translations**: All UI text in common.json namespace

**API integration**: Uses same pattern as other clients (`VITE_API_URL` with localhost fallback).

## Technical Decisions

### Why Direct Resend in DigestService?
The existing EmailService uses `resend.batch.send()` which sends identical content to multiple recipients. Digests need per-user customization:
- Personalized unsubscribe tokens in headers
- Per-user event curation based on `last_digest_sent_at`
- Per-user template rendering with first name

Direct Resend access enables `resend.emails.send()` per user with custom headers.

### Why Monday 10 AM CET?
- **Monday morning**: Start of work week, users plan their week
- **10 AM**: After morning routine, before lunch (good email open time)
- **Europe/Rome timezone**: Native Italian timezone handling (CET/CEST automatic)

### Why 200ms delay between sends?
Resend's rate limit is typically 10 req/sec for production. 200ms = 5 req/sec provides safe margin below limit while maintaining reasonable batch completion time (e.g., 100 users = 20 seconds).

## Deviations from Plan

None - plan executed exactly as written.

## Verification Results

All verification criteria passed:

- ✅ Backend builds successfully (`pnpm run build`)
- ✅ Frontend builds successfully (`pnpm run build`)
- ✅ `digest.scheduler.ts` has two `@Cron` decorated methods
- ✅ Both cron jobs specify `timeZone: 'Europe/Rome'`
- ✅ Weekly: `0 10 * * 1` (Monday 10 AM)
- ✅ Monthly: `0 10 1 * *` (1st of month 10 AM)
- ✅ `digest.service.ts` has `sendDigestToUser` and `sendBatchDigests` methods
- ✅ RFC 8058 headers (`List-Unsubscribe`, `List-Unsubscribe-Post`) present in send logic
- ✅ Per-user error isolation in `sendBatchDigests` (try-catch per user)
- ✅ Rate limiting delay (`await this.sleep(200)`)
- ✅ Unsubscribe page renders at `/unsubscribe?token=xxx`
- ✅ DigestScheduler registered in DigestModule providers

## Testing Notes

### Manual Testing Checklist
1. **Scheduler registration**: Start backend, check logs for scheduler initialization
2. **Unsubscribe page**: Visit `/unsubscribe?token=test` → should show loading → error (invalid token)
3. **Digest sending**: Temporarily change cron to `* * * * *` (every minute) to test:
   - Check logs for user counts
   - Verify emails sent to test users
   - Verify `last_digest_sent_at` updates in database
   - Check email headers for `List-Unsubscribe` in received emails
4. **Error isolation**: Break one user's email → verify batch continues for other users

### Production Readiness
- **Environment variables required**:
  - `RESEND_API_KEY`: Must be configured for digest delivery
  - `RESEND_FROM_EMAIL`: Must be valid sender (e.g., "Jamia <digest@jamia.app>")
  - `API_BASE_URL` or `BACKEND_URL`: For unsubscribe link in headers (fallback: https://api.jamia.app)
  - `FRONTEND_BASE_URL`: For frontend links in email (fallback: https://jamia.app)

## Next Phase Readiness

### Phase 8 Complete
All 3 plans complete:
- ✅ 08-01: Event curation service and digest queries
- ✅ 08-02: React Email templates with Italian content
- ✅ 08-03: Scheduler, batch delivery, and unsubscribe page

### What's Enabled
The digest system is now fully functional end-to-end:
1. Users opt in via email preferences (Phase 7)
2. Cron jobs fire weekly/monthly (Phase 8 Plan 03)
3. Events are curated per user (Phase 8 Plan 01)
4. Templates render personalized content (Phase 8 Plan 02)
5. Emails send with RFC 8058 headers (Phase 8 Plan 03)
6. Users can unsubscribe via token link (Phase 7 + Phase 8 Plan 03)

### Suggested Next Phase: Email Adoption & Growth UX
To maximize the value of this email system:
- **Onboarding flow**: Prompt new users to opt in after profile setup
- **Smart defaults**: Pre-select weekly for active users, monthly for casual
- **Nudges**: Remind users about digest in dashboard if disabled
- **Preview**: Let users see sample digest before subscribing
- **Analytics**: Track open rates, click-through rates, unsubscribe rates

### Potential Issues
None identified. System is production-ready pending:
- Resend API key configuration
- Email domain verification in Resend
- DMARC/SPF/DKIM setup for email domain
- Initial user testing to validate curation quality

## Implementation Highlights

### Cron Expression Patterns
```typescript
@Cron('0 10 * * 1', { timeZone: 'Europe/Rome' })  // Weekly
@Cron('0 10 1 * *', { timeZone: 'Europe/Rome' })  // Monthly
```

Format: `minute hour day-of-month month day-of-week`
- `0 10 * * 1`: minute=0, hour=10, any day of month, any month, Monday (1)
- `0 10 1 * *`: minute=0, hour=10, 1st day of month, any month, any day of week

### RFC 8058 Headers
```typescript
headers: {
  'List-Unsubscribe': `<${apiBaseUrl}/email-preferences/unsubscribe/${token}>`,
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
}
```

These headers enable one-click unsubscribe in email clients (Gmail, Apple Mail, etc.) per RFC 8058.

### Error Isolation Pattern
```typescript
for (const user of users) {
  try {
    const result = await sendDigestToUser(user, frequency);
    if (result) sent++;
    else skipped++;
    await sleep(200);  // Rate limiting
  } catch (error) {
    logger.error(`Error sending to ${user.user_id}: ${error.message}`);
    failed++;
    // Continue to next user
  }
}
```

One user's failure doesn't stop the entire batch - critical for production reliability.

## Commits

1. **ef295fa**: `feat(08-03): add batch digest sending with RFC 8058 headers`
   - Added Resend client injection to DigestService
   - Implemented sendDigestToUser() and sendBatchDigests()
   - Per-user error isolation and rate limiting

2. **472d928**: `feat(08-03): create digest scheduler with weekly and monthly cron jobs`
   - Created DigestScheduler with @Cron decorators
   - Weekly (Monday 10 AM) and monthly (1st 10 AM) jobs
   - Registered in DigestModule

3. **2f8f256**: `feat(08-03): create unsubscribe confirmation page`
   - Unsubscribe page at /unsubscribe?token=xxx
   - Success/error states with Italian translations
   - Route registration in App.tsx
