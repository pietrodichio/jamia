---
phase: 09-email-adoption-growth-ux
plan: 01
status: complete
duration: 2 min
commits:
  - bf2b20a feat(09-01): add digest nudge banner for existing users
---

# Plan 09-01 Summary: Dashboard Nudge Banner & Backend Flag Management

## What was done

### Task 1: Backend - has_seen_digest_prompt flag management
- Modified `updatePreferences` in `email-preferences.service.ts` to always include `has_seen_digest_prompt: true` in the update payload
- Changed `.update(dto)` to `.update({ ...dto, has_seen_digest_prompt: true })`
- `unsubscribeByToken` intentionally NOT modified (email unsubscribe shouldn't affect prompt flag)

### Task 2: Frontend - DigestNudgeBanner component + Dashboard integration + translations
- Created self-contained `DigestNudgeBanner.tsx` (97 lines) with:
  - Own React Query data fetching (`['email-preferences']` queryKey, shared with EmailPreferencesCard)
  - Visibility logic: shows only when `digest_enabled === false` AND `has_seen_digest_prompt === false` AND not localStorage-dismissed
  - Synchronous localStorage check in useState initializer (prevents flash)
  - One-click opt-in via useMutation (enables monthly digest, invalidates query, shows toast)
  - Permanent dismiss via localStorage + React state
  - Mobile-first responsive layout (`flex-col sm:flex-row`)
  - Shadcn Alert with Mail icon, Italian text, Attiva CTA, X dismiss button
- Integrated into Dashboard.tsx between header and StatisticsSection
- Added Italian translations to common.json under `digestNudge` namespace

## Verification
- Backend builds successfully
- Frontend builds successfully
- 6/6 must-haves verified by gsd-verifier
