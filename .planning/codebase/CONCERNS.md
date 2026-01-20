# Codebase Concerns

**Analysis Date:** 2026-01-20

## Tech Debt

**Large Service Files:**
- Issue: ParticipantsService (1,399 lines) and JamsService (855 lines) have grown excessively large, indicating poor separation of concerns
- Files: `jamia-be/src/participants/participants.service.ts`, `jamia-be/src/jams/jams.service.ts`
- Impact: Difficult to maintain, test, and understand. High risk of bugs when modifying functionality
- Fix approach: Extract related functionality into dedicated service classes (e.g., NotificationService for participant notifications, PermissionService for access checks)

**Console.* Usage Instead of Logger:**
- Issue: Multiple files use console.log/error/warn instead of NestJS Logger, making production debugging harder
- Files: `jamia-be/src/auth/supabase-auth.guard.ts` (lines 38, 54-55, 73, 79), `jamia-be/src/jams/jams.service.ts` (lines 716, 724), `jamia-be/src/managers/managers.service.ts` (line 191), `jamia-be/src/audit/audit.service.ts` (line 43), `jamia-be/src/profiles/profiles.service.ts` (line 25), `jamia-be/src/participants/participants.service.ts` (line 180)
- Impact: Inconsistent logging, no log levels filtering, harder to track in production
- Fix approach: Replace all console.* calls with this.logger.* calls using injected Logger instance

**Frontend Console Errors:**
- Issue: Error handling in frontend uses console.error extensively rather than proper error tracking
- Files: `jamia-fe/src/pages/Profile.tsx`, `jamia-fe/src/pages/AcceptInvite.tsx`, `jamia-fe/src/pages/AuthCallback.tsx`, `jamia-fe/src/pages/Dashboard.tsx`
- Impact: Production errors not tracked, debugging relies on manual user reports
- Fix approach: Integrate error tracking service (Sentry, LogRocket) and centralize error handling

**Weak Type Safety:**
- Issue: Extensive use of `any` types and `Record<string, any>` throughout backend
- Files: `jamia-be/src/participants/participants.service.ts` (lines 149, 172, 1180), `jamia-be/src/jams/jams.service.ts` (line 133), `jamia-be/src/managers/managers.service.ts` (lines 202, 258, 289)
- Impact: Runtime errors not caught at compile time, harder to refactor safely
- Fix approach: Define proper TypeScript interfaces for all data structures, enable strict mode

**Silent Error Swallowing:**
- Issue: Many error handlers return empty arrays/objects/null without logging or rethrowing
- Files: `jamia-be/src/email/email.service.ts` (lines 412, 417, 431, 440, 448), `jamia-be/src/participants/participants.service.ts` (multiple locations with return null), `jamia-fe/src/pages/Dashboard.tsx` (line 142 returns {} on error)
- Impact: Failures go unnoticed, making debugging production issues extremely difficult
- Fix approach: Always log errors before returning fallback values, consider error boundaries

**Hardcoded Italian Locale:**
- Issue: Email templates and date formatting hardcoded to Italian ('it-IT', 'Europe/Rome')
- Files: `jamia-be/src/email/email.service.ts` (line 420-424)
- Impact: Cannot support international users without code changes
- Fix approach: Make locale configurable per user/jam, extract text to translation files

**Linter Rule Suppression:**
- Issue: Biome linter rules being ignored without clear justification
- Files: `jamia-fe/src/components/jams/JamForm.tsx` (line 233: useExhaustiveDependencies), `jamia-fe/src/components/JamHeader.tsx` (lines 1, 205: react/no-danger)
- Impact: Potential bugs from missing useEffect dependencies, XSS risks from dangerouslySetInnerHTML
- Fix approach: Address root causes rather than suppressing warnings; properly sanitize HTML content

## Known Bugs

**Placeholder Data in Jam Cloning:**
- Symptoms: Cloned jams have ends_at set to "2 hours from now" as placeholder
- Files: `jamia-be/src/jams/jams.service.ts` (line 582)
- Trigger: Cloning a jam
- Workaround: User must manually edit cloned jam end time

**Console.warn in Production Code:**
- Symptoms: Failed profile fetches logged as warnings rather than errors
- Files: `jamia-be/src/participants/participants.service.ts` (line 180)
- Trigger: Database query failure when fetching participant profiles
- Workaround: None - silent failure returns empty profiles

## Security Considerations

**JWT Secret Configuration:**
- Risk: JWT secret required for authentication but error handling could expose configuration issues
- Files: `jamia-be/src/auth/supabase-auth.guard.ts` (lines 36-40)
- Current mitigation: Throws error if missing, but logs to console exposing configuration state
- Recommendations: Remove console.error exposing configuration details, fail fast on startup if secret missing

**Direct Supabase Client Usage:**
- Risk: No request-level connection pooling or query sanitization layer
- Files: All service files inject SUPABASE_CLIENT directly
- Current mitigation: Supabase client handles parameterization
- Recommendations: Consider repository pattern for better query auditability and testing

**Environment Variable Exposure:**
- Risk: Frontend references backend API via environment variables that could be misconfigured
- Files: `jamia-fe/src/integrations/supabase/client.ts`, `jamia-fe/src/api/client.ts`
- Current mitigation: Variables must be set at build time
- Recommendations: Add runtime validation that required env vars are present and valid

**Email HTML Injection:**
- Risk: Custom email feature allows HTML content without clear sanitization boundaries
- Files: `jamia-be/src/email/email.service.ts` (sendCustomEmail method)
- Current mitigation: Frontend uses DOMPurify for sanitization
- Recommendations: Add server-side HTML sanitization as defense-in-depth

**Password in Frontend Schema:**
- Risk: Password handled in plain form schema on frontend
- Files: `jamia-fe/src/pages/Auth.tsx` (lines 25, 32-33)
- Current mitigation: Only sent to Supabase Auth over HTTPS
- Recommendations: Ensure all auth flows use secure connections, consider adding password strength requirements

## Performance Bottlenecks

**N+1 Query Pattern in Participants:**
- Problem: Profile fetching for participants happens in separate query after participant fetch
- Files: `jamia-be/src/participants/participants.service.ts` (lines 172-180)
- Cause: Sequential database queries instead of JOIN or batch fetch
- Improvement path: Use Supabase's .select() with join syntax to fetch profiles in single query

**Batch Manager Fetch Fallback:**
- Problem: Batch manager fetch silently fails and returns empty object
- Files: `jamia-fe/src/pages/Dashboard.tsx` (lines 136-143)
- Cause: Network error or permission issue
- Improvement path: Show user feedback on failure, implement retry logic

**Large Component Files:**
- Problem: JamDetailsLayout (627 lines) and JamForm (525 lines) are complex and hard to optimize
- Files: `jamia-fe/src/pages/jam-details/JamDetailsLayout.tsx`, `jamia-fe/src/components/jams/JamForm.tsx`
- Cause: Too many responsibilities in single component
- Improvement path: Split into smaller components, extract hooks for business logic

## Fragile Areas

**Email Service Graceful Degradation:**
- Files: `jamia-be/src/email/email.service.ts`
- Why fragile: If Resend API key missing or invalid, service silently disables all email functionality
- Safe modification: Always check this.enabled before calling email methods; add feature flag checking at caller level
- Test coverage: Email service itself lacks dedicated test file

**Telegram Service Optional Dependency:**
- Files: `jamia-be/src/telegram/telegram.service.ts`, `jamia-be/src/telegram/telegram.poller.ts`
- Why fragile: Telegram bot is optional but deeply integrated into participant workflows
- Safe modification: Check if telegram service is enabled before dispatching notifications
- Test coverage: No dedicated test coverage for Telegram integration

**Participant State Machine:**
- Files: `jamia-be/src/participants/participants.service.ts`
- Why fragile: Complex state transitions (waiting → participant, participant → cancelled) with auto-promotion logic
- Safe modification: Always verify current state before transitions, log all state changes
- Test coverage: Covered by participants.service.spec.ts but file is very large (likely over 1000 lines)

**Authentication Guard Super Admin Check:**
- Files: `jamia-be/src/auth/supabase-auth.guard.ts` (lines 60-82)
- Why fragile: Super admin check happens on every authenticated request, database error silently degrades to non-admin
- Safe modification: Cache super admin status per session, fail loudly if database query fails
- Test coverage: No dedicated test file for auth guard

## Scaling Limits

**RPC Function Dependency:**
- Current capacity: Two RPC calls to `is_owner_or_manager` function
- Limit: Database function must exist in Supabase; no fallback logic
- Scaling path: Move permission checking to application layer with caching, or ensure function is part of migrations

**Single Region Assumption:**
- Current capacity: Timezone hardcoded to 'Europe/Rome'
- Limit: Cannot handle users or jams in different timezones
- Scaling path: Store timezone per jam and per user, format dates dynamically

**Email Service Rate Limits:**
- Current capacity: Unknown - depends on Resend tier
- Limit: Bulk jam emails could hit rate limits
- Scaling path: Implement email queuing with rate limiting, batch sending

## Dependencies at Risk

**Deprecated Types Package:**
- Risk: @types/dompurify marked as deprecated in pnpm-lock.yaml
- Impact: Type definitions may become outdated or incorrect
- Migration plan: DOMPurify provides its own types - remove @types/dompurify dependency

**Multiple TypeScript Versions:**
- Risk: Backend uses TypeScript 5.7.3, frontend uses 5.8.3
- Impact: Potential type inconsistencies if sharing types between projects
- Migration plan: Align both projects to same TypeScript version, consider monorepo setup

**Biome Version Mismatch:**
- Risk: Backend uses Biome 2.2.4, frontend uses 2.3.8
- Impact: Different linting/formatting rules between projects
- Migration plan: Update backend to match frontend version

## Missing Critical Features

**Email Retry Mechanism:**
- Problem: Email sending failures are logged but not retried
- Blocks: Reliable notification delivery to participants
- Files: `jamia-be/src/email/email.service.ts`

**Frontend Error Boundary:**
- Problem: No global error boundary to catch React component crashes
- Blocks: Graceful degradation when UI components fail
- Files: Frontend lacks error boundary implementation

**API Request Retry Logic:**
- Problem: Network failures cause silent data fetch failures
- Blocks: Reliable data loading in poor network conditions
- Files: `jamia-fe/src/api/client.ts`

**Audit Log Viewing:**
- Problem: Audit logs are written but no UI to view them
- Blocks: Debugging user actions and compliance requirements
- Files: `jamia-be/src/audit/audit.service.ts` creates logs with no consumer

## Test Coverage Gaps

**No E2E Tests:**
- What's not tested: User flows, authentication flows, jam booking flows
- Files: No E2E test directory exists
- Risk: Breaking changes in critical user journeys go undetected
- Priority: High

**Frontend Component Tests Missing:**
- What's not tested: All frontend components (React components have no .test or .spec files)
- Files: `jamia-fe/src/components/*`, `jamia-fe/src/pages/*`
- Risk: UI regressions and component-level logic bugs
- Priority: Medium

**Backend Test Coverage Ratio:**
- What's tested: 6 .spec.ts files for 39 source files (15% coverage)
- Files: Tests exist for `participants.service.ts`, `jams.service.ts`, `managers.service.ts`, `profiles.service.ts`, `audit.service.ts`, `app.controller.ts`
- Risk: Most services (email, telegram, health, auth) completely untested
- Priority: High

**Auth Guard Not Tested:**
- What's not tested: JWT verification, super admin checks, token expiration
- Files: `jamia-be/src/auth/supabase-auth.guard.ts`
- Risk: Authentication bypass vulnerabilities
- Priority: Critical

**Email Service Not Tested:**
- What's not tested: Email template generation, error handling, configuration validation
- Files: `jamia-be/src/email/email.service.ts`
- Risk: Broken notification delivery going unnoticed
- Priority: High

---

*Concerns audit: 2026-01-20*
