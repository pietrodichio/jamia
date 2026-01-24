# CLAUDE.md

## Project Overview
Monorepo for Jamia: Italian AcroYoga event management platform. Open-source, no-profit project to foster and grow the AcroYoga community in Italy.

## Stack
- **Runtime**: Node.js 22+, pnpm
- **Backend**: NestJS 11, Supabase (PostgreSQL + PostGIS)
- **Frontend**: React 18 + Vite, TailwindCSS, Shadcn/ui, TanStack Query, React Hook Form, React Router
- **Database**: PostgreSQL (Supabase local), PostGIS for location-based search
- **Auth**: Supabase Auth (GoTrue)
- **i18n**: react-i18next (Italian)

## Structure
```
apps/backend/       # NestJS API (port 3000)
apps/web/           # React + Vite frontend (port 8080)
  ├── src/
  │   ├── api/           # API client functions
  │   ├── components/    # React components
  │   ├── pages/         # Page components (React Router)
  │   ├── hooks/         # Custom React hooks
  │   ├── lib/           # Utilities
  │   └── locales/       # i18n translations (it.json)
  ├── supabase/
  │   ├── migrations/    # SQL migrations
  │   ├── seed-users.ts  # User seeding script
  │   └── seed-events.ts # Event seeding script
packages/types/     # Shared TypeScript types (@jamia/types)
```

## Local Development Setup
```bash
# 1. Install dependencies
pnpm install

# 2. Start Supabase (first time)
cd apps/web
npx supabase start

# 3. Reset database and seed data
npx supabase db reset --yes
SUPABASE_SERVICE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz" npx tsx supabase/seed-users.ts
SUPABASE_SERVICE_KEY="sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz" npx tsx supabase/seed-events.ts

# 4. Start development servers
pnpm run dev   # Runs both backend and frontend
```

**Test Credentials:**
- alice@example.com / password123 (Base)
- bob@example.com / password123 (Flyer)
- charlie@example.com / password123 (Both, Super Admin)
- diana@example.com / password123 (Both)

**Supabase URLs:**
- Studio: http://127.0.0.1:54423
- API: http://127.0.0.1:54421
- DB: postgresql://postgres:postgres@127.0.0.1:54422/postgres

## Commands
```bash
pnpm install                    # Install dependencies
pnpm run dev                    # Start all development servers
pnpm run build                  # Build all packages
pnpm run lint                   # Run linters
pnpm run format                 # Format code

# Supabase commands (from apps/web)
npx supabase status             # Check Supabase status
npx supabase db reset --yes     # Reset database and apply migrations
npx supabase stop               # Stop Supabase
npx supabase start              # Start Supabase
```

## Code Style
- 2-space indentation
- Single quotes for strings
- Semicolons required
- Trailing commas where applicable
- Use TypeScript strict mode
- Named exports preferred (except for page components)

## Key Conventions

### Frontend - API Calls
**CRITICAL: Always use React Query (TanStack Query) for API calls in the frontend.**

```typescript
// ✅ CORRECT - Use React Query for queries
const { data: events, isLoading } = useQuery({
  queryKey: ['events', filters],
  queryFn: () => eventsApi.searchEvents(filters),
});

// ✅ CORRECT - Use React Query for mutations
const mutation = useMutation({
  mutationFn: (dto: CreateEventDto) => eventsApi.createEvent(dto),
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['events'] }),
});

// ❌ WRONG - Direct API calls without React Query
const events = await eventsApi.searchEvents(filters); // Never do this!
```

### Frontend - Component Structure
- UI components in `components/ui/` (Shadcn/ui)
- Feature components in `components/<feature>/`
- Marketing components in `components/marketing/`
- Use React Hook Form for forms with Zod validation
- Use react-i18next for all user-facing text

### Frontend - Translations
```typescript
// Always use translations for user-facing text
const { t } = useTranslation('events');

return <h1>{t('events.title')}</h1>;  // ✅ CORRECT
return <h1>Events</h1>;                 // ❌ WRONG
```

### Backend - NestJS Patterns
- Feature modules: `<feature>.module.ts`, `<feature>.controller.ts`, `<feature>.service.ts`
- DTOs in `dto/` subdirectory with class-validator decorators
- Use guards: `@UseGuards(JwtAuthGuard)` for authentication
- Inject Supabase client: `@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient`

### Backend - Database Access
**NEVER query Supabase directly from frontend for authenticated operations.** Always go through the NestJS API which handles RLS and permissions.

```typescript
// ✅ CORRECT - Backend service
const { data, error } = await this.supabase
  .from('events')
  .select('*')
  .eq('owner_id', userId);

// Frontend can query public data directly
const { data } = await supabase
  .from('events')
  .select('*')
  .eq('status', 'published');  // ✅ OK for public data
```

### Event Types
- **jam**: Casual practice sessions
- **class**: Structured learning sessions
- **workshop**: Short intensive learning (1-3 days)
- **convention**: Large multi-day gatherings (3-7 days)

### Database Tables
- `profiles` - User profiles (references auth.users)
- `events` - All event types with PostGIS location
- `event_teachers` - Many-to-many teachers for events
- `recurring_patterns` - Recurring event definitions
- `occurrence_exceptions` - Modified/cancelled occurrences
- `event_co_organizers` - Co-organizers for events
- `jams` - Legacy jam table (being phased out)
- `jam_participants` - Legacy participants

### Critical Rules
1. **ALWAYS use React Query for frontend API calls** (queries and mutations)
2. Event teachers are display-only metadata with no special permissions
3. Use PostGIS for location queries: `ST_DWithin`, `ST_Distance`
4. Recurring events: Never modify parent event dates directly, use occurrence exceptions
5. All user-facing text must use i18n translations

### Logging
```typescript
private readonly logger = new Logger(ClassName.name);
this.logger.log(`[ClassName] message`);
```

### Error Handling
Use NestJS exceptions: `BadRequestException`, `NotFoundException`, `UnauthorizedException`, `ForbiddenException`

## Adding New Code

| Type | Location |
|------|----------|
| API Feature | `apps/backend/src/<feature>/` |
| React Component | `apps/web/src/components/<feature>/` |
| React Page | `apps/web/src/pages/` |
| API Client | `apps/web/src/api/<feature>.api.ts` |
| Shared Type | `packages/types/src/<feature>.ts` |
| Translation | `apps/web/src/locales/it/<namespace>.json` |
| Migration | `apps/web/supabase/migrations/YYYYMMDDHHMMSS_description.sql` |

## Database Migrations

Create new migration:
```bash
cd apps/web
npx supabase migration new description_of_change
```

Migration naming convention: `YYYYMMDDHHMMSS_description.sql`

Always include:
- Table comments
- Column comments for non-obvious fields
- RLS policies
- Indexes for foreign keys and commonly queried columns

## Testing

Test users are available after seeding:
- Use `charlie@example.com` for super admin tests
- Use `alice@example.com`, `bob@example.com` for regular user tests
- Test events span 8 Italian cities with realistic data

## Key Features

### Location-Based Search
Events use PostGIS for efficient spatial queries:
```sql
-- Search within radius
WHERE ST_DWithin(
  location::geography,
  ST_SetSRID(ST_MakePoint($lng, $lat), 4326)::geography,
  $radius_meters
)
```

### Recurring Events
- Parent event defines pattern (daily, weekly, monthly)
- `occurrence_exceptions` for modifications/cancellations
- Never expose parent event to users, always show occurrences

### Event Filters
- Types: jam, class, workshop, convention
- Tags: beginner-friendly, intermediate, advanced, mat-required, etc.
- Accommodation: camping, hotel, hostel, included, nearby
- Food: breakfast, lunch, dinner, vegan, vegetarian, gluten-free, included

### Teachers
Display-only metadata. Adding a teacher does NOT grant them permissions. Use co-organizers for permission sharing.

## Design System

### Colors (Tailwind)
- `primary` - Brand color for CTAs and highlights
- `secondary` - Supporting color
- `accent` - Accent highlights
- `muted` - Subtle backgrounds

### Components (Shadcn/ui)
- Use existing components from `components/ui/`
- Follow Shadcn/ui patterns for new components
- Maintain consistency with Italian design aesthetics

### Responsive Design
- Mobile-first approach
- Test on mobile, tablet, desktop
- Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`, `xl:`

## Before Committing
```bash
pnpm lint             # Check for linting issues
pnpm format           # Format code (if configured)
```

## Development Guidelines

### Frontend (`apps/web`)
- **ALWAYS use React Query** for API calls - never call API directly
- Use React Hook Form + Zod for forms
- All text must be translated (use `t()` from react-i18next)
- Prefer composition over complex components
- Keep components small and focused

### Backend (`apps/backend`)
- Follow NestJS best practices
- Use Supabase client, respect RLS policies
- Use DTOs for validation
- Log important operations
- Handle errors gracefully

## Useful Resources
- Supabase Docs: https://supabase.com/docs
- PostGIS Docs: https://postgis.net/documentation/
- Shadcn/ui: https://ui.shadcn.com/
- React Query: https://tanstack.com/query/latest
