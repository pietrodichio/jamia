# Phase 7: Email Preferences - Research

**Researched:** 2026-02-10
**Domain:** Email preference infrastructure (database, API, frontend settings UI)
**Confidence:** HIGH

## Summary

This phase builds the email digest preference infrastructure: a database schema to store user opt-in/out status, frequency choice, and unsubscribe token; a NestJS API for CRUD operations on these preferences; a frontend settings card on the existing ProfileSetup page; and a public unsubscribe endpoint for one-click email unsubscribe (RFC 8058 compliance).

The codebase already has all the building blocks: profiles table with RLS policies, a `handle_new_user()` trigger for defaults on signup, Shadcn Switch and RadioGroup components, the `useToast` hook for feedback, and Resend with custom header support for `List-Unsubscribe`. The primary design decision is whether to add columns to the `profiles` table or create a separate `email_preferences` table.

**Primary recommendation:** Create a separate `email_preferences` table (1:1 with profiles) for clean separation of concerns, with a dedicated `/email-preferences` NestJS module and standalone API endpoints. This keeps the profiles table focused on identity data and makes the email preference system independently queryable for the Phase 8 email engine.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.x | Backend API framework | Already in use, provides guards, decorators, modules |
| class-validator | 0.14.x | DTO validation | Already in use for all backend DTOs |
| Supabase (PostgreSQL) | 2.76.x | Database + RLS | Already in use, handles auth and row-level security |
| React Hook Form | existing | Form state management | Already in use across app for all forms |
| Shadcn/ui Switch | existing | Toggle on/off | Already installed at `components/ui/switch.tsx` |
| Shadcn/ui RadioGroup | existing | Frequency selection | Already installed at `components/ui/radio-group.tsx` |
| TanStack Query | existing | API state management | Required by project conventions for all API calls |
| Resend | 6.3.x | Email service | Already in use, supports custom `List-Unsubscribe` headers |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | existing | Frontend schema validation | For preference form validation |
| react-i18next | existing | Italian translations | All user-facing text |
| uuid (PostgreSQL native) | built-in | Unsubscribe token generation | `gen_random_uuid()` in migration |
| use-debounce | existing | Debounced auto-save | Already a project dependency via useAutoSave |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Separate table | Columns on profiles | Simpler initially, but couples email concerns to identity; harder to query for digest scheduling in Phase 8 |
| Standalone endpoints | Extend profile PATCH | Less HTTP surface, but mixes profile and preference update semantics; auto-save on preferences becomes tangled with profile saves |
| Switch + RadioGroup | Single select dropdown | Less visual, harder to scan; toggle+radio is more natural for on/off + choice pattern |

**Installation:**
```bash
# No new dependencies needed - all libraries already in project
```

## Architecture Patterns

### Recommended Project Structure

**Backend:**
```
apps/backend/src/
  email-preferences/
    email-preferences.module.ts        # NestJS module
    email-preferences.controller.ts    # REST endpoints
    email-preferences.service.ts       # Business logic
    email-preferences.service.spec.ts  # Unit tests
    dto/
      update-email-preferences.dto.ts  # Validation DTO
      email-preferences-response.dto.ts # Response type (optional)
```

**Frontend:**
```
apps/web/src/
  api/
    email-preferences.api.ts           # API client functions
  components/
    settings/
      EmailPreferencesCard.tsx          # Settings card component
  locales/it/
    common.json                        # Add email preference translations
```

**Shared types:**
```
packages/types/src/
  email-preferences.ts                 # Shared interfaces
```

**Migration:**
```
apps/web/supabase/migrations/
  YYYYMMDDHHMMSS_create_email_preferences.sql
```

### Pattern 1: Separate email_preferences Table (1:1 with profiles)

**What:** A dedicated table with foreign key to profiles.id, storing all email preference fields. Created automatically on user signup via updated trigger.
**When to use:** When preference data has different access patterns than profile data (Phase 8 digest scheduler needs to query opted-in users efficiently).

```sql
-- Source: Codebase pattern from base_schema.sql + super_admin migration
CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  digest_enabled BOOLEAN NOT NULL DEFAULT false,
  digest_frequency TEXT NOT NULL DEFAULT 'monthly'
    CHECK (digest_frequency IN ('weekly', 'monthly')),
  unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
  last_digest_sent_at TIMESTAMPTZ,
  has_seen_digest_prompt BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for Phase 8: efficiently find users who need digests
CREATE INDEX idx_email_preferences_digest_enabled
  ON public.email_preferences(digest_enabled, digest_frequency)
  WHERE digest_enabled = true;

-- Index for unsubscribe token lookup
CREATE UNIQUE INDEX idx_email_preferences_unsubscribe_token
  ON public.email_preferences(unsubscribe_token);

-- RLS policies
ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own email preferences"
  ON public.email_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own email preferences"
  ON public.email_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email preferences"
  ON public.email_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Service role can read all (for digest scheduler in Phase 8)
-- The Supabase service role bypasses RLS by default, so no extra policy needed.
```

### Pattern 2: Auto-Create Preferences on Signup

**What:** Extend the existing `handle_new_user()` trigger to also create an `email_preferences` row with defaults.
**When to use:** Always -- ensures every user has a preference record from day one.

```sql
-- Source: Existing trigger pattern from base_schema.sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, verified)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email_confirmed_at IS NOT NULL
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');

  -- NEW: Create email preferences with defaults
  INSERT INTO public.email_preferences (user_id, digest_enabled, digest_frequency)
  VALUES (NEW.id, false, 'monthly');

  RETURN NEW;
END;
$$;
```

### Pattern 3: Auto-Save Preference Changes (Frontend)

**What:** Use `useMutation` from TanStack Query to save preference changes immediately on toggle/radio change, with toast confirmation. No debounce needed since these are discrete user actions (not continuous typing).
**When to use:** For the Switch and RadioGroup interactions on the ProfileSetup page.

```typescript
// Source: Existing pattern from profiles.api.ts + useAutoSave.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { emailPreferencesApi } from '@/api/email-preferences.api';
import { useToast } from '@/hooks/use-toast';

function useEmailPreferences(userId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const query = useQuery({
    queryKey: ['email-preferences', userId],
    queryFn: () => emailPreferencesApi.getPreferences(),
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: emailPreferencesApi.updatePreferences,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-preferences'] });
      toast({
        title: 'Preferenze salvate',
        description: 'Le tue preferenze email sono state aggiornate.',
      });
    },
    onError: () => {
      toast({
        title: 'Errore',
        description: 'Impossibile salvare le preferenze.',
        variant: 'destructive',
      });
    },
  });

  return { preferences: query.data, isLoading: query.isLoading, updatePreferences: mutation.mutate };
}
```

### Pattern 4: Public Unsubscribe Endpoint (Token-Based, No Auth)

**What:** A `@Public()` endpoint that accepts an unsubscribe token and disables digest for that user. Must handle both GET (render confirmation page or redirect) and POST (RFC 8058 one-click).
**When to use:** For email unsubscribe links and RFC 8058 compliance.

```typescript
// Source: Existing @Public() pattern from profiles.controller.ts
@Public()
@Post('unsubscribe/:token')
async unsubscribeByToken(@Param('token') token: string) {
  await this.emailPreferencesService.unsubscribeByToken(token);
  return { message: 'Unsubscribed successfully' };
}

@Public()
@Get('unsubscribe/:token')
async unsubscribeConfirmation(@Param('token') token: string) {
  await this.emailPreferencesService.unsubscribeByToken(token);
  // Return HTML page or redirect to frontend confirmation page
  return { message: 'Unsubscribed successfully' };
}
```

### Pattern 5: Backfill Existing Users

**What:** A migration step that creates `email_preferences` rows for all existing users who do not have one yet, with `digest_enabled = false` (opted-out by default, as decided in CONTEXT.md).
**When to use:** In the same migration that creates the table.

```sql
-- Backfill existing users with default preferences (opted-out)
INSERT INTO public.email_preferences (user_id, digest_enabled, digest_frequency)
SELECT p.id, false, 'monthly'
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.email_preferences ep WHERE ep.user_id = p.id
);
```

### Anti-Patterns to Avoid

- **Storing preferences in local storage or cookies:** Preferences must be server-side for the digest scheduler (Phase 8) to query them.
- **Using the profile PATCH endpoint for preference updates:** Mixing profile and preference update semantics creates confusion. The profile auto-save in ProfileSetup submits the full form on submit; preference changes should be independent instant mutations.
- **Making unsubscribe require authentication:** RFC 8058 requires that email clients can POST to the unsubscribe URL directly. The endpoint MUST be public with token-based auth only.
- **Using sequential integer IDs for unsubscribe tokens:** Must use UUID to prevent enumeration attacks.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toggle component | Custom checkbox styling | Shadcn Switch (`components/ui/switch.tsx`) | Already installed, accessible, keyboard-navigable |
| Radio buttons | Custom radio styling | Shadcn RadioGroup (`components/ui/radio-group.tsx`) | Already installed, accessible, ARIA-compliant |
| Toast notifications | Custom notification system | Existing `useToast` hook | Already the project standard |
| UUID generation | Custom random string generator | PostgreSQL `gen_random_uuid()` | Cryptographically secure, native, no extension needed |
| Form validation | Manual validation | class-validator (backend) + Zod (frontend) | Already the project standard |
| API auth | Custom token parsing | `SupabaseAuthGuard` + `@Public()` decorator | Already handles JWT extraction and user injection |
| Test mocks | Custom Supabase mock | Existing `createSupabaseMock` utility | Already handles the query builder chain pattern |

**Key insight:** Every piece of this phase is a composition of existing patterns in the codebase. No new libraries or paradigms are needed. The entire risk is in getting the wiring right, not in technology choice.

## Common Pitfalls

### Pitfall 1: Forgetting to Backfill Existing Users
**What goes wrong:** Existing users have no `email_preferences` row. API calls for their preferences return 404 or null, breaking the frontend.
**Why it happens:** Migration creates the table but only the trigger handles new users.
**How to avoid:** Include a backfill INSERT in the migration that creates rows for all existing profiles. Test with existing seed users (alice, bob, charlie, diana).
**Warning signs:** `getPreferences` returns 404 for test users after migration.

### Pitfall 2: Unsubscribe Endpoint Requiring Auth
**What goes wrong:** Email clients (Gmail, Yahoo) cannot POST to the one-click unsubscribe URL because it requires a bearer token. Email deliverability suffers.
**Why it happens:** The controller uses `@UseGuards(SupabaseAuthGuard)` at class level (like ProfilesController).
**How to avoid:** Use `@Public()` decorator on unsubscribe endpoints. Verify by testing with `curl` without auth headers.
**Warning signs:** Unsubscribe link returns 401 when clicked from email.

### Pitfall 3: Race Condition Between Toggle and Radio
**What goes wrong:** User toggles ON, then immediately changes frequency. If the first mutation has not completed, the second one overwrites with stale data (digest_enabled might revert).
**How to avoid:** Use optimistic updates in the mutation, or send both fields together in a single PATCH request. The simplest approach: always send `{ digest_enabled, digest_frequency }` together, never individually.
**Warning signs:** Preferences flicker or revert after rapid changes.

### Pitfall 4: Missing updated_at Trigger
**What goes wrong:** `updated_at` column never changes, making it useless for debugging.
**Why it happens:** PostgreSQL does not auto-update timestamp columns. Existing `update_updated_at()` trigger only applies to `jams` table.
**How to avoid:** Add a trigger for `email_preferences` table using the existing `update_updated_at()` function.
**Warning signs:** `updated_at` always equals `created_at`.

### Pitfall 5: Not Handling the Signup Flow Decision
**What goes wrong:** CONTEXT.md says new users get a pre-checked toggle (opt-out pattern) during signup, but the current Auth.tsx signup flow has no preference step.
**Why it happens:** The signup form is on Auth.tsx, profile completion is on ProfileSetup.tsx. The digest toggle needs to go somewhere in this flow.
**How to avoid:** The best place is ProfileSetup.tsx (which is already the "complete your profile" page shown after signup). Add the EmailPreferencesCard to ProfileSetup as a section below the existing form. For new users, default `digest_enabled = true` and `digest_frequency = 'monthly'` in the UI and save on form submit. The database trigger sets `digest_enabled = false` by default, and the ProfileSetup form submission will update it to `true` if the user leaves the toggle checked.
**Warning signs:** New users never see the digest option.

### Pitfall 6: Unsubscribe Token Regeneration
**What goes wrong:** When a user re-subscribes, the old unsubscribe token may still be cached in previously sent emails. If the token is regenerated on re-subscribe, old email unsubscribe links break.
**How to avoid:** Never regenerate the unsubscribe token. It should be created once and remain constant. If a user unsubscribes and re-subscribes, the same token works for future unsubscribes.
**Warning signs:** Old email unsubscribe links return "token not found" errors.

## Code Examples

### Backend DTO for Email Preferences Update

```typescript
// Source: Existing pattern from update-profile.dto.ts
import { IsBoolean, IsOptional, IsIn } from 'class-validator';

export class UpdateEmailPreferencesDto {
  @IsBoolean()
  @IsOptional()
  digest_enabled?: boolean;

  @IsIn(['weekly', 'monthly'])
  @IsOptional()
  digest_frequency?: 'weekly' | 'monthly';
}
```

### Backend Service Pattern

```typescript
// Source: Existing pattern from profiles.service.ts
@Injectable()
export class EmailPreferencesService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
  ) {}

  async getPreferences(userId: string) {
    const { data, error } = await this.supabase
      .from('email_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      throw new NotFoundException('Email preferences not found');
    }
    return data;
  }

  async updatePreferences(userId: string, dto: UpdateEmailPreferencesDto) {
    const { data, error } = await this.supabase
      .from('email_preferences')
      .update(dto)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update preferences: ${error.message}`);
    }
    return data;
  }

  async unsubscribeByToken(token: string) {
    const { data, error } = await this.supabase
      .from('email_preferences')
      .update({ digest_enabled: false })
      .eq('unsubscribe_token', token)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('Invalid unsubscribe token');
    }
    return data;
  }
}
```

### Backend Controller Pattern

```typescript
// Source: Existing pattern from profiles.controller.ts
@Controller('email-preferences')
@UseGuards(SupabaseAuthGuard)
export class EmailPreferencesController {
  constructor(
    private readonly emailPreferencesService: EmailPreferencesService,
  ) {}

  @Get()
  async getPreferences(@User() user: AuthUser) {
    return this.emailPreferencesService.getPreferences(user.id);
  }

  @Patch()
  async updatePreferences(
    @User() user: AuthUser,
    @Body(new ValidationPipe({ transform: true }))
    dto: UpdateEmailPreferencesDto,
  ) {
    return this.emailPreferencesService.updatePreferences(user.id, dto);
  }

  @Public()
  @Post('unsubscribe/:token')
  async unsubscribeByToken(@Param('token') token: string) {
    await this.emailPreferencesService.unsubscribeByToken(token);
    return { message: 'Unsubscribed successfully' };
  }

  @Public()
  @Get('unsubscribe/:token')
  async unsubscribeConfirmationPage(@Param('token') token: string) {
    await this.emailPreferencesService.unsubscribeByToken(token);
    return { message: 'Unsubscribed successfully' };
  }
}
```

### Frontend API Client Pattern

```typescript
// Source: Existing pattern from profiles.api.ts
import { apiClient, publicApiClient } from './client';
import type { EmailPreferencesResponse, UpdateEmailPreferencesDto } from '@jamia/types/email-preferences';

export const emailPreferencesApi = {
  getPreferences: async (): Promise<EmailPreferencesResponse> => {
    const response = await apiClient.get('/email-preferences');
    return response.data;
  },

  updatePreferences: async (dto: UpdateEmailPreferencesDto): Promise<EmailPreferencesResponse> => {
    const response = await apiClient.patch('/email-preferences', dto);
    return response.data;
  },
};
```

### Frontend Settings Card Pattern

```tsx
// Source: Existing patterns from ProfileSetup.tsx + Switch/RadioGroup components
<Card className="border-primary/10">
  <CardHeader>
    <CardTitle className="text-lg">{t('common:emailPreferences.title')}</CardTitle>
    <CardDescription>{t('common:emailPreferences.description')}</CardDescription>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <Label htmlFor="digest-toggle">{t('common:emailPreferences.digestLabel')}</Label>
      <Switch
        id="digest-toggle"
        checked={digestEnabled}
        onCheckedChange={(checked) => updatePreferences({
          digest_enabled: checked,
          digest_frequency: digestFrequency,
        })}
      />
    </div>
    {digestEnabled && (
      <RadioGroup
        value={digestFrequency}
        onValueChange={(value) => updatePreferences({
          digest_enabled: true,
          digest_frequency: value as 'weekly' | 'monthly',
        })}
      >
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="weekly" id="freq-weekly" />
          <Label htmlFor="freq-weekly">{t('common:emailPreferences.weekly')}</Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="monthly" id="freq-monthly" />
          <Label htmlFor="freq-monthly">{t('common:emailPreferences.monthly')}</Label>
        </div>
      </RadioGroup>
    )}
  </CardContent>
</Card>
```

### Resend List-Unsubscribe Headers (For Phase 8, but token generated in Phase 7)

```typescript
// Source: Resend docs (https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails)
await resend.emails.send({
  from: this.fromEmail,
  to: recipientEmail,
  subject: 'Digest settimanale eventi AcroYoga',
  html: digestHtml,
  text: digestText,
  headers: {
    'List-Unsubscribe': `<https://api.jamia.app/email-preferences/unsubscribe/${unsubscribeToken}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
  },
});
```

### Unit Test Pattern

```typescript
// Source: Existing pattern from profiles.service.spec.ts
import { EmailPreferencesService } from './email-preferences.service';
import { createSupabaseMock } from '../test-utils/supabase-mock';
import { NotFoundException } from '@nestjs/common';

describe('EmailPreferencesService', () => {
  describe('getPreferences', () => {
    it('returns preferences for a user', async () => {
      const supabase = createSupabaseMock({
        email_preferences: [{
          response: {
            data: {
              user_id: 'user-1',
              digest_enabled: true,
              digest_frequency: 'weekly',
              unsubscribe_token: 'token-uuid',
              last_digest_sent_at: null,
              has_seen_digest_prompt: false,
            },
            error: null,
          },
        }],
      });

      const service = new EmailPreferencesService(supabase.client);
      const result = await service.getPreferences('user-1');

      expect(result.digest_enabled).toBe(true);
      expect(result.digest_frequency).toBe('weekly');
    });
  });

  describe('unsubscribeByToken', () => {
    it('disables digest for valid token', async () => {
      const supabase = createSupabaseMock({
        email_preferences: [{
          updateResponse: {
            data: {
              user_id: 'user-1',
              digest_enabled: false,
              digest_frequency: 'weekly',
              unsubscribe_token: 'valid-token',
            },
            error: null,
          },
        }],
      });

      const service = new EmailPreferencesService(supabase.client);
      const result = await service.unsubscribeByToken('valid-token');

      expect(result.digest_enabled).toBe(false);
    });

    it('throws NotFoundException for invalid token', async () => {
      const supabase = createSupabaseMock({
        email_preferences: [{
          updateResponse: {
            data: null,
            error: { message: 'No rows found' },
          },
        }],
      });

      const service = new EmailPreferencesService(supabase.client);

      await expect(service.unsubscribeByToken('invalid')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `uuid_generate_v4()` (extension) | `gen_random_uuid()` (native) | PostgreSQL 13+ | No extension dependency for UUID generation |
| `mailto:` unsubscribe only | HTTPS URL + `List-Unsubscribe-Post` (RFC 8058) | Gmail/Yahoo enforcement Feb 2024 | Required for bulk senders; Resend supports custom headers |
| Settings in user table | Separate settings table | N/A | Better separation for Phase 8 query patterns |

**Deprecated/outdated:**
- Using `uuid-ossp` extension for UUID generation when `gen_random_uuid()` is available natively. The project already has `uuid-ossp` enabled, but the native function is preferred for new code.

## Open Questions

1. **ProfileSetup page as both initial setup AND settings editor**
   - What we know: ProfileSetup.tsx currently serves as the initial profile completion page after signup. The CONTEXT.md decision says to add email preferences here.
   - What's unclear: Is ProfileSetup also the "edit profile" page for returning users, or do they have a separate settings page? Currently it appears to be dual-purpose (loads existing data, allows updates).
   - Recommendation: Treat it as dual-purpose. Add the EmailPreferencesCard below the existing profile form. For new users visiting for the first time, the toggle defaults to ON (pre-checked per CONTEXT.md). For returning users editing their profile, it shows their current preference.

2. **has_seen_digest_prompt flag usage**
   - What we know: CONTEXT.md says Phase 9 will show a one-time prompt for existing users. Phase 7 needs the data model column.
   - What's unclear: Whether Phase 7 should include any UI for this flag or just the column.
   - Recommendation: Phase 7 only adds the column to the database. Phase 9 builds the UI. Do not build the prompt in Phase 7.

3. **Signup flow integration exact placement**
   - What we know: The CONTEXT.md says "Ask during signup with pre-checked toggle." The signup flow is: Auth.tsx (register) -> email confirmation -> ProfileSetup.tsx (complete profile).
   - What's unclear: Whether the toggle should be on Auth.tsx (the actual registration form) or ProfileSetup.tsx (the "complete your profile" step).
   - Recommendation: Place it on ProfileSetup.tsx. Auth.tsx is a minimal registration form (name, email, password). ProfileSetup is where users set their preferences (role, bio, city). Adding the digest toggle here is natural and does not complicate the auth form. On first visit, default the toggle to ON.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `apps/backend/src/profiles/` - Controller, service, DTO, spec patterns
- Codebase analysis: `apps/web/src/pages/ProfileSetup.tsx` - Current UI structure
- Codebase analysis: `apps/web/supabase/migrations/` - Migration patterns, `handle_new_user()` trigger
- Codebase analysis: `apps/backend/src/email/email.service.ts` - Resend integration pattern
- Codebase analysis: `apps/backend/src/test-utils/supabase-mock.ts` - Test utility patterns
- Codebase analysis: `apps/web/src/components/ui/switch.tsx` - Shadcn Switch component available
- Codebase analysis: `apps/web/src/components/ui/radio-group.tsx` - Shadcn RadioGroup available
- Codebase analysis: `packages/types/src/profile.ts` - Shared type patterns
- [Resend docs: Add unsubscribe to transactional emails](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails) - Custom `List-Unsubscribe` header support

### Secondary (MEDIUM confidence)
- [RFC 8058](https://datatracker.ietf.org/doc/html/rfc8058) - One-click unsubscribe specification
- [Supabase UUID docs](https://supabase.com/docs/guides/database/extensions/uuid-ossp) - `gen_random_uuid()` recommendation
- [NestJS validation docs](https://docs.nestjs.com/techniques/validation) - class-validator patterns

### Tertiary (LOW confidence)
- [Database schema design for user settings](https://culttt.com/2015/02/02/storing-user-settings-relational-database) - Separate table recommendation (general best practice, not project-specific)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in the project, no new dependencies
- Architecture: HIGH - All patterns derived from existing codebase analysis, 1:1 mapping to existing patterns
- Pitfalls: HIGH - Based on direct code inspection of existing patterns and RFC compliance requirements
- Data model: MEDIUM - Separate table decision is a recommendation (Claude's Discretion area), well-reasoned but could be done either way

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable domain, no rapidly changing libraries)
