# Phase 8: Event Recap Email Engine - Research

**Researched:** 2026-02-10
**Domain:** Scheduled email digests with NestJS cron jobs, React Email templates, and Resend delivery
**Confidence:** HIGH

## Summary

This phase builds a scheduled email digest system that sends curated event lists to subscribed users. The technical stack consists of three well-established components: **@nestjs/schedule** for cron-based scheduling (integrated into the existing NestJS backend), **React Email** for component-based email templates, and **Resend API** for delivery (already in use).

The architecture is straightforward: a cron job runs at scheduled times (Monday 10 AM CET for weekly, 1st of month 10 AM CET for monthly), queries subscribed users from the email_preferences table, curates events into two sections (upcoming and new), renders personalized email templates via React Email, and sends via Resend batch API with rate limiting.

Key technical considerations include: timezone handling (Europe/Rome for CET with automatic DST), Resend's 2 req/sec rate limit requiring batching (100 emails per batch), RFC 8058 compliance for one-click unsubscribe (List-Unsubscribe-Post header), and multipart email format (HTML + plain text) for deliverability.

**Primary recommendation:** Use @nestjs/schedule with @Cron decorators for scheduling, React Email with Tailwind for templates, batch sending with 100-email chunks and 500ms delays between batches to respect Resend's rate limits, and wrap each user's email in try-catch to continue processing if one fails.

## Standard Stack

The established libraries/tools for scheduled email digests in NestJS:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @nestjs/schedule | 6.1.1 | Cron job scheduling in NestJS | Official NestJS module, integrates with framework lifecycle, supports timezone-aware cron |
| @react-email/components | 1.0.7 | Email template components | Industry standard for React-based email templates, 829K weekly downloads, tested across email clients |
| @react-email/render | Latest | Render React to HTML/text | Official rendering utility, supports both HTML and plain text output |
| resend | 6.3.0 | Email delivery API | Already in use, modern API, excellent deliverability, built-in RFC 8058 support |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/cron | Latest | TypeScript types for cron | Development only, provides type safety for cron expressions |
| @react-email/tailwind | Latest | Tailwind CSS in emails | Styling email components with familiar Tailwind syntax |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @nestjs/schedule | @nestjs/bull + Redis | Bull provides job queues with retry logic and persistence, but adds Redis dependency and complexity; overkill unless you need distributed job processing |
| React Email | MJML or Handlebars | MJML is email-specific but less familiar; Handlebars is simpler but less powerful; React Email leverages existing React knowledge |
| Resend batch API | Individual API calls | Individual calls are simpler but hit rate limits quickly; batch API required for bulk sending |

**Installation:**
```bash
# Backend dependencies
npm install --save @nestjs/schedule @react-email/components @react-email/render @react-email/tailwind
npm install --save-dev @types/cron

# Note: resend already installed (v6.3.0)
```

## Architecture Patterns

### Recommended Module Structure
```
apps/backend/src/
├── digest/                     # New digest module
│   ├── digest.module.ts        # Module with ScheduleModule import
│   ├── digest.service.ts       # Core business logic (curation, rendering)
│   ├── digest.scheduler.ts     # Cron handlers with @Cron decorators
│   ├── templates/              # React Email templates
│   │   ├── WeeklyDigest.tsx    # Weekly digest template
│   │   ├── MonthlyDigest.tsx   # Monthly digest template
│   │   └── components/         # Shared email components
│   │       ├── EventCard.tsx   # Event display card
│   │       ├── EmailHeader.tsx # Header with logo
│   │       └── EmailFooter.tsx # Footer with unsubscribe
│   └── dto/                    # DTOs for curation logic
│       └── curated-events.dto.ts
├── email/                      # Existing email service
│   └── email.service.ts        # Update with digest support
└── email-preferences/          # Existing from Phase 7
    └── email-preferences.service.ts
```

### Pattern 1: Cron Job with Error Isolation
**What:** Each user's email is wrapped in try-catch to prevent one failure from stopping the batch
**When to use:** Bulk operations where individual failures shouldn't block others
**Example:**
```typescript
// Source: https://medium.com/@nageshadhavbncoe/implementing-cron-jobs-for-email-and-sms-notifications-in-nestjs-with-prisma-and-postgresql-534974fa8840
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DigestScheduler {
  private readonly logger = new Logger(DigestScheduler.name);

  constructor(
    private readonly digestService: DigestService,
    private readonly emailPreferencesService: EmailPreferencesService,
  ) {}

  @Cron('0 10 * * 1', {
    name: 'weekly-digest',
    timeZone: 'Europe/Rome',
  })
  async sendWeeklyDigests() {
    this.logger.log('[DigestScheduler] Starting weekly digest send');

    const users = await this.emailPreferencesService.getSubscribedUsers('weekly');

    for (const user of users) {
      try {
        await this.digestService.sendDigestToUser(user, 'weekly');
      } catch (error) {
        this.logger.error(
          `[DigestScheduler] Failed to send digest to user ${user.id}: ${error.message}`
        );
        // Continue to next user
      }
    }

    this.logger.log(`[DigestScheduler] Weekly digest complete: ${users.length} users processed`);
  }
}
```

### Pattern 2: Event Curation with Deduplication
**What:** Query upcoming and new events separately, then remove duplicates
**When to use:** Email digests with multiple sections that might overlap
**Example:**
```typescript
// PostgreSQL-based curation query pattern
async curateEventsForUser(
  userId: string,
  lastDigestSentAt: Date | null
): Promise<CuratedEvents> {
  const now = new Date();

  // Query 1: Upcoming events (sorted by start date, soonest first)
  const upcomingEvents = await this.supabase
    .from('events')
    .select('*')
    .eq('status', 'published')
    .in('type', ['convention', 'workshop', 'jam'])
    .gte('starts_at', now.toISOString())
    .order('starts_at', { ascending: true })
    .limit(9); // 3 per type max

  // Query 2: New events (sorted by creation date, newest first)
  const newEvents = lastDigestSentAt
    ? await this.supabase
        .from('events')
        .select('*')
        .eq('status', 'published')
        .in('type', ['convention', 'workshop', 'jam'])
        .gte('created_at', lastDigestSentAt.toISOString())
        .order('created_at', { ascending: false })
        .limit(9)
    : { data: [] };

  // Deduplicate: remove events in newEvents that appear in upcomingEvents
  const upcomingIds = new Set(upcomingEvents.data?.map(e => e.id) || []);
  const deduplicatedNew = newEvents.data?.filter(e => !upcomingIds.has(e.id)) || [];

  return {
    upcoming: this.groupByType(upcomingEvents.data || [], 3),
    new: this.groupByType(deduplicatedNew, 3),
  };
}
```

### Pattern 3: Batch Sending with Rate Limiting
**What:** Split large recipient lists into 100-email chunks with delays
**When to use:** Resend batch API calls (2 req/sec limit, 100 emails per batch max)
**Example:**
```typescript
// Source: https://dalenguyen.medium.com/mastering-email-rate-limits-a-deep-dive-into-resend-api-and-cloud-run-debugging-f1b97c995904
async sendBatchDigests(
  emails: Array<{ to: string; html: string; text: string; subject: string }>
): Promise<void> {
  const BATCH_SIZE = 100;
  const DELAY_BETWEEN_BATCHES = 500; // 500ms to stay under 2 req/sec

  const chunks = this.chunkArray(emails, BATCH_SIZE);

  for (const chunk of chunks) {
    await this.resend.batch.send(
      chunk.map(email => ({
        from: this.fromEmail,
        to: [email.to],
        subject: email.subject,
        html: email.html,
        text: email.text,
        headers: {
          'List-Unsubscribe': `<https://jamia.app/unsubscribe?token=${email.token}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      }))
    );

    await this.sleep(DELAY_BETWEEN_BATCHES);
  }
}

private chunkArray<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

private sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

### Pattern 4: React Email Template Structure
**What:** Standard email component hierarchy with Tailwind styling
**When to use:** All email templates
**Example:**
```tsx
// Source: https://react.email/docs/components/container
import { Html, Head, Body, Container, Section, Text, Img, Link, Tailwind } from '@react-email/components';

export function WeeklyDigest({ events, user, unsubscribeToken }) {
  return (
    <Html>
      <Head />
      <Tailwind>
        <Body className="bg-gray-50 font-sans">
          <Container className="mx-auto py-8 px-4 max-w-[600px]">
            {/* Header */}
            <Section className="text-center mb-8">
              <Img
                src="https://jamia.app/logo.png"
                alt="Jamia"
                width="120"
                className="mx-auto"
              />
            </Section>

            {/* Upcoming Events Section */}
            <Section className="mb-8">
              <Text className="text-2xl font-bold mb-4">Prossimi eventi</Text>
              {events.upcoming.conventions.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </Section>

            {/* Footer with unsubscribe */}
            <Section className="text-center text-gray-600 text-sm mt-8 pt-4 border-t">
              <Text>
                Ricevi questa email perché sei iscritto a Jamia.{' '}
                <Link href={`https://jamia.app/unsubscribe?token=${unsubscribeToken}`}>
                  Annulla iscrizione
                </Link>
                {' · '}
                <Link href="https://jamia.app/settings/email">
                  Gestisci preferenze
                </Link>
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
```

### Pattern 5: Rendering to HTML and Plain Text
**What:** Use @react-email/render to generate both formats
**When to use:** Before sending emails (deliverability best practice)
**Example:**
```typescript
// Source: https://react.email/docs/utilities/render
import { render } from '@react-email/render';
import { WeeklyDigest } from './templates/WeeklyDigest';

async renderDigest(
  events: CuratedEvents,
  user: User,
  frequency: 'weekly' | 'monthly'
): Promise<{ html: string; text: string }> {
  const Template = frequency === 'weekly' ? WeeklyDigest : MonthlyDigest;

  const html = await render(
    <Template
      events={events}
      user={user}
      unsubscribeToken={user.unsubscribe_token}
    />
  );

  const text = await render(
    <Template
      events={events}
      user={user}
      unsubscribeToken={user.unsubscribe_token}
    />,
    { plainText: true }
  );

  return { html, text };
}
```

### Anti-Patterns to Avoid
- **Running queries inside the loop:** Pre-fetch all users before the loop, don't query per user
- **Not handling timezone in cron:** Always specify `timeZone: 'Europe/Rome'` in @Cron options or you'll run at UTC time
- **Sending without plain text version:** Always include both HTML and plain text for deliverability
- **Not wrapping in try-catch:** One failed email will stop the entire batch
- **Using external CSS files in emails:** Email clients strip external stylesheets; inline all styles

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML to plain text conversion | Custom regex/parser | @react-email/render with `{ plainText: true }` | Email clients have quirks (ASCII chars, link formatting, spacing); React Email handles them |
| Email client compatibility | Manual table layouts | React Email components (Container, Section, etc.) | Tested across Gmail, Outlook, Apple Mail; handles Outlook's Word rendering engine limitations |
| Cron timezone handling | Manual UTC offset calculations | @Cron decorator with `timeZone: 'Europe/Rome'` | Handles DST automatically; manual offsets break twice per year |
| Rate limiting & retries | Custom delay loops | Resend SDK's built-in retry with exponential backoff | Already implemented in existing EmailService (retryWithBackoff method) |
| Unsubscribe compliance | Custom header implementation | Resend headers + Phase 7 token endpoints | RFC 8058 requires specific header format; Gmail/Yahoo enforce it for deliverability |
| Email template styling | Writing inline CSS | React Email + Tailwind component | Tailwind classes auto-convert to inline styles; handles rem → px conversion for compatibility |

**Key insight:** Email is deceptively complex. What works in a browser often breaks in email clients. Outlook uses Microsoft Word's rendering engine, Gmail strips external CSS, Apple Mail has different dark mode than Gmail. React Email abstracts these edge cases; building from scratch means rediscovering every quirk the hard way.

## Common Pitfalls

### Pitfall 1: Cron Expression Timezone Confusion
**What goes wrong:** Cron job runs at the wrong time (UTC instead of CET/CEST)
**Why it happens:** Default cron runs in UTC; forgetting `timeZone` option means 10 AM becomes midnight/1 AM UTC depending on DST
**How to avoid:** Always specify `timeZone: 'Europe/Rome'` in @Cron options, which automatically handles CET/CEST transitions
**Warning signs:** Job runs at unexpected times, or times shift by an hour twice per year
**Example:**
```typescript
// WRONG: Runs at 10 AM UTC (11 AM/12 PM CET depending on DST)
@Cron('0 10 * * 1')

// CORRECT: Runs at 10 AM Europe/Rome time (handles DST automatically)
@Cron('0 10 * * 1', { timeZone: 'Europe/Rome' })
```

### Pitfall 2: Resend Rate Limit Exceeded (429 Errors)
**What goes wrong:** API returns 429 Too Many Requests, emails fail to send
**Why it happens:** Resend enforces 2 requests/second across all endpoints; sending 200 individual emails in a loop hits this instantly
**How to avoid:** Use batch API (max 100 emails per request) + 500ms delay between batches
**Warning signs:** Seeing 429 errors in logs, emails not being delivered, rate_limit_exceeded exceptions
**Rate limit details:**
- 2 requests per second per team (strict)
- Batch endpoint counts as 1 request for up to 100 emails
- Also quota limits (daily/monthly) that return 429 with different error message

### Pitfall 3: Daylight Saving Time Job Duplication/Skipping
**What goes wrong:** When clocks change, job runs twice (fall back) or skips (spring forward)
**Why it happens:** The 2 AM hour happens twice in fall or skips in spring; cron jobs scheduled in that window behave unpredictably
**How to avoid:** Schedule jobs outside DST transition windows (10 AM is safe; 2-3 AM is dangerous)
**Warning signs:** Missing digest emails once per year (spring) or duplicate digests once per year (fall)

### Pitfall 4: Email Client Dark Mode Breaking Design
**What goes wrong:** Logos disappear on dark backgrounds, CTA buttons become invisible, text unreadable
**Why it happens:** Gmail, Outlook, Apple Mail each have proprietary dark mode algorithms that invert colors unpredictably
**How to avoid:**
- Use transparent PNGs with dark borders for logos (not white backgrounds)
- Avoid pure white text (use light gray like `#f3f4f6`)
- Test dark mode in Gmail, Apple Mail, Outlook
- Use explicit text colors on buttons, don't rely on background contrast
**Warning signs:** User complaints about "can't read email" or "buttons invisible"

### Pitfall 5: Gmail Clipping Emails Over 102 KB
**What goes wrong:** Email gets truncated with "[Message clipped] View entire message" link, unsubscribe footer disappears
**Why it happens:** Gmail clips HTML emails larger than 102 KB; React Email renders can be verbose with inline styles
**How to avoid:**
- Limit events per digest (18 max as per context)
- Use smaller images (thumbnails, not full-size)
- Avoid embedding large data URIs
- Monitor rendered HTML size in logs
**Warning signs:** Gmail shows clipping message, unsubscribe links not visible, compliance violations

### Pitfall 6: Outlook Rendering Broken Layouts
**What goes wrong:** Rounded corners appear square, background images missing, responsive design breaks
**Why it happens:** Outlook uses Microsoft Word's rendering engine (not a browser), doesn't support modern CSS
**How to avoid:**
- Use React Email's Container/Section components (tested for Outlook)
- Avoid `border-radius`, `background-image` on individual elements
- Don't rely on media queries for responsiveness
- Test in Outlook desktop (Windows) specifically
**Warning signs:** User reports "email looks broken" (specifically Outlook users)

### Pitfall 7: Empty Digest Sending
**What goes wrong:** Users receive emails that say "No events this week" or completely empty templates
**Why it happens:** Not checking if curated events are empty before rendering/sending
**How to avoid:** Check `events.upcoming.length + events.new.length > 0` before rendering; skip users with no events
**Warning signs:** Low engagement, user complaints about "useless emails", unsubscribe spike

### Pitfall 8: Not Updating last_digest_sent_at
**What goes wrong:** Same events appear in "new events" section every week/month
**Why it happens:** Forgetting to update `last_digest_sent_at` timestamp after successful send
**How to avoid:** Update timestamp immediately after Resend confirms delivery (in success callback)
**Warning signs:** Users report "seeing the same events over and over"

### Pitfall 9: Cron Job Memory Leaks
**What goes wrong:** NestJS app memory grows unbounded over days/weeks, eventually crashes
**Why it happens:** Holding references to large result sets (event arrays, user lists) that don't get garbage collected
**How to avoid:**
- Process users in batches, release references between batches
- Don't store cron results in class properties
- Use streaming queries for large datasets
**Warning signs:** Memory usage grows over time, app crashes after several days

### Pitfall 10: Missing List-Unsubscribe-Post Header
**What goes wrong:** Gmail/Yahoo mark emails as spam, deliverability plummets
**Why it happens:** RFC 8058 compliance is now enforced by major providers (2026); missing the header triggers spam filters
**How to avoid:**
```typescript
headers: {
  'List-Unsubscribe': '<https://jamia.app/unsubscribe?token=xxx>',
  'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click', // REQUIRED
}
```
**Warning signs:** High spam complaint rate, emails going to spam folder, deliverability reports show header issues

## Code Examples

Verified patterns from official sources:

### Weekly Cron Job (Every Monday at 10 AM CET)
```typescript
// Source: https://docs.nestjs.com/techniques/task-scheduling
import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class DigestScheduler {
  @Cron('0 10 * * 1', {
    name: 'weekly-digest',
    timeZone: 'Europe/Rome',
  })
  async sendWeeklyDigests() {
    // Job logic here
  }
}
```

### Monthly Cron Job (First Day of Month at 10 AM CET)
```typescript
@Cron('0 10 1 * *', {
  name: 'monthly-digest',
  timeZone: 'Europe/Rome',
})
async sendMonthlyDigests() {
  // Job logic here
}
```

### Module Setup with ScheduleModule
```typescript
// Source: https://docs.nestjs.com/techniques/task-scheduling
import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { DigestScheduler } from './digest.scheduler';
import { DigestService } from './digest.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // Initialize scheduler
  ],
  providers: [DigestScheduler, DigestService],
})
export class DigestModule {}
```

### Rendering React Email to HTML and Plain Text
```typescript
// Source: https://react.email/docs/utilities/render
import { render } from '@react-email/render';

const html = await render(<WeeklyDigest {...props} />);
const text = await render(<WeeklyDigest {...props} />, { plainText: true });
```

### Resend Batch Send with RFC 8058 Headers
```typescript
// Source: https://resend.com/docs/api-reference/emails/send-batch-emails
await resend.batch.send([
  {
    from: 'Jamia <digest@jamia.app>',
    to: ['user@example.com'],
    subject: 'I tuoi eventi questa settimana',
    html: htmlContent,
    text: textContent,
    headers: {
      'List-Unsubscribe': '<https://jamia.app/unsubscribe?token=abc123>',
      'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
    },
  },
  // ... up to 100 emails
]);
```

### Event Curation Query (Upcoming Events)
```typescript
// PostgreSQL query via Supabase client
const { data: upcomingEvents } = await supabase
  .from('events')
  .select('id, type, title, starts_at, ends_at, location_city, image_url')
  .eq('status', 'published')
  .in('type', ['convention', 'workshop', 'jam'])
  .gte('starts_at', new Date().toISOString())
  .order('starts_at', { ascending: true })
  .limit(9); // Will be grouped by type (3 max per type)
```

### Event Curation Query (New Events)
```typescript
const { data: newEvents } = await supabase
  .from('events')
  .select('id, type, title, starts_at, ends_at, location_city, image_url, created_at')
  .eq('status', 'published')
  .in('type', ['convention', 'workshop', 'jam'])
  .gte('created_at', lastDigestSentAt.toISOString())
  .order('created_at', { ascending: false })
  .limit(9);
```

### Grouping Events by Type with Priority
```typescript
function groupByType(events: Event[], maxPerType: number) {
  const typeOrder = ['convention', 'workshop', 'jam'];
  const grouped = {
    conventions: [],
    workshops: [],
    jams: [],
  };

  for (const type of typeOrder) {
    const eventsOfType = events.filter(e => e.type === type);
    if (type === 'convention') grouped.conventions = eventsOfType.slice(0, maxPerType);
    if (type === 'workshop') grouped.workshops = eventsOfType.slice(0, maxPerType);
    if (type === 'jam') grouped.jams = eventsOfType.slice(0, maxPerType);
  }

  return grouped;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cron package directly | @nestjs/schedule wrapper | NestJS 7+ (2020) | Lifecycle integration, better DX with decorators |
| MJML for email templates | React Email | 2022-2023 | Leverage React knowledge, better type safety, component reusability |
| Individual email sends | Batch API | Resend launch (2023) | Handle rate limits properly, fewer API calls |
| mailto: only for unsubscribe | HTTPS + List-Unsubscribe-Post | RFC 8058 enforcement (2024-2025) | Gmail/Yahoo compliance required for deliverability |
| HTML-only emails | Multipart HTML + plain text | Always recommended, enforced by modern ESPs | Better deliverability, accessibility, spam score |
| UTC-only cron | Timezone-aware cron | @nestjs/schedule 1.0+ (2021) | Automatic DST handling, schedule in local time |

**Deprecated/outdated:**
- **External/embedded CSS in email templates:** Email clients strip it; React Email auto-inlines styles
- **Running cron jobs outside NestJS lifecycle:** Old pattern with separate cron processes; @nestjs/schedule integrates with app lifecycle
- **Manual HTML string concatenation for emails:** Error-prone, no client testing; React Email components are tested across clients
- **node-cron directly:** @nestjs/schedule wraps it with better DX and NestJS integration

## Open Questions

Things that couldn't be fully resolved:

1. **Optimal batch size vs. delay trade-off**
   - What we know: Resend allows 100 emails/batch, 2 req/sec max
   - What's unclear: Exact optimal batch size and delay for 500-1000 users (100 emails + 500ms delay is safe but conservative)
   - Recommendation: Start with 100 emails per batch + 500ms delay; monitor Resend dashboard for rate limit hits; can reduce delay to 250ms if no issues appear

2. **Plain text rendering quality from React Email**
   - What we know: React Email supports `{ plainText: true }` option
   - What's unclear: How well it handles complex layouts (multiple sections, nested components)
   - Recommendation: Test rendered plain text output manually before launch; existing EmailService has `buildPlainTextBody` fallback if needed

3. **Email size monitoring strategy**
   - What we know: Gmail clips at 102 KB
   - What's unclear: Average size of rendered digest HTML with 18 events
   - Recommendation: Log HTML size in bytes after rendering in development; add warning if >80 KB; implement event limiting if needed

4. **Cron job execution overlap handling**
   - What we know: Weekly job runs Mondays 10 AM, monthly runs 1st of month 10 AM
   - What's unclear: What happens if both run same day (first Monday of month)
   - Recommendation: Check digest frequency in each cron handler; monthly should skip if last send was <7 days ago (prevents duplicate sends)

5. **Dark mode testing coverage**
   - What we know: Gmail, Outlook, Apple Mail each have different dark mode algorithms
   - What's unclear: Extent of testing needed, priority level
   - Recommendation: Manual testing in Gmail (primary), Apple Mail (secondary), Outlook (tertiary); document edge cases but don't block on perfect dark mode support

## Sources

### Primary (HIGH confidence)
- @nestjs/schedule npm package: https://www.npmjs.com/package/@nestjs/schedule
- NestJS Task Scheduling docs: https://docs.nestjs.com/techniques/task-scheduling
- React Email documentation: https://react.email
- React Email render utility: https://react.email/docs/utilities/render
- React Email Tailwind component: https://react.email/docs/components/tailwind
- Resend batch email API: https://resend.com/docs/api-reference/emails/send-batch-emails
- Resend rate limits: https://resend.com/docs/api-reference/rate-limit

### Secondary (MEDIUM confidence)
- [NestJS cron job best practices (Medium, 2025)](https://bhargavacharyb.medium.com/mastering-background-cron-jobs-in-nestjs-the-complete-guide-cd0f41bb6b31)
- [Implementing cron jobs for email notifications in NestJS (Medium)](https://medium.com/@nageshadhavbncoe/implementing-cron-jobs-for-email-and-sms-notifications-in-nestjs-with-prisma-and-postgresql-534974fa8840)
- [Mastering email rate limits with Resend API (Medium)](https://dalenguyen.medium.com/mastering-email-rate-limits-a-deep-dive-into-resend-api-and-cloud-run-debugging-f1b97c995904)
- [RFC 8058 compliance (Mailgun)](https://www.mailgun.com/blog/deliverability/what-is-rfc-8058/)
- [List-Unsubscribe header implementation (Mailtrap)](https://mailtrap.io/blog/list-unsubscribe-header/)
- [Plain text vs HTML email best practices (Moosend, 2026)](https://moosend.com/blog/html-vs-plain-text-email/)
- [Email design mistakes (Inbox Monster)](https://inboxmonster.com/blog/common-email-design-mistakes)
- [Gmail and Yahoo bulk sender requirements (2026)](https://emailwarmup.com/blog/gmail-and-yahoo-bulk-sender-requirements/)
- [Cron timezone handling (Google Cloud Scheduler docs)](https://cloud.google.com/scheduler/docs/configuring/cron-job-schedules)

### Tertiary (LOW confidence - marked for validation)
- Specific 2026 email design trends - general guidance only
- Optimal batch sizes for Resend - need to validate empirically
- Dark mode algorithm details - documented behaviors but proprietary implementations

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official packages, well-documented, actively maintained
- Architecture: HIGH - Verified patterns from official NestJS docs and React Email examples
- Pitfalls: MEDIUM - Based on real-world blog posts and community experiences, some extrapolated from existing EmailService code
- Curation logic: HIGH - Standard PostgreSQL patterns, verified against existing events schema
- Rate limiting: MEDIUM - Resend docs confirm 2 req/sec and 100 batch limit, optimal strategy requires empirical testing

**Research date:** 2026-02-10
**Valid until:** 2026-03-12 (30 days - stable technology stack)
