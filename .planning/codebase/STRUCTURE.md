# Codebase Structure

**Analysis Date:** 2026-01-20

## Directory Layout

```
jamia/
├── jamia-be/          # NestJS backend application
│   ├── src/           # Backend source code
│   ├── test/          # E2E tests
│   ├── dist/          # Compiled JavaScript output
│   ├── coverage/      # Test coverage reports
│   └── supabase/      # Database migrations and types
├── jamia-fe/          # React frontend application
│   ├── src/           # Frontend source code
│   ├── public/        # Static assets
│   ├── dist/          # Vite build output
│   └── supabase/      # Supabase type definitions
└── .planning/         # GSD planning documents
    └── codebase/      # Architecture and structure docs
```

## Directory Purposes

**jamia-be/src:**
- Purpose: Backend application source code
- Contains: Controllers, services, modules, DTOs, configuration
- Key files: `main.ts` (entry point), `app.module.ts` (root module)

**jamia-be/src/jams:**
- Purpose: Jam (event) management feature
- Contains: Controllers, services, DTOs, public endpoints
- Key files: `jams.controller.ts`, `jams.service.ts`, `public-jams.controller.ts`

**jamia-be/src/participants:**
- Purpose: Participant and waiting list management
- Contains: Controller, service, DTOs for joining/adding/managing participants
- Key files: `participants.controller.ts`, `participants.service.ts`, `dto/join-jam.dto.ts`

**jamia-be/src/profiles:**
- Purpose: User profile management
- Contains: Controller, service, DTOs for profile CRUD
- Key files: `profiles.controller.ts`, `profiles.service.ts`

**jamia-be/src/managers:**
- Purpose: Jam manager (co-organizer) management
- Contains: Controller, service for adding/removing managers
- Key files: `managers.controller.ts`, `managers.service.ts`

**jamia-be/src/auth:**
- Purpose: Authentication and authorization infrastructure
- Contains: Auth guard, user decorator
- Key files: `supabase-auth.guard.ts`, `user.decorator.ts`

**jamia-be/src/config:**
- Purpose: Application configuration and external service clients
- Contains: Supabase module and client factory
- Key files: `supabase.module.ts`, `supabase.config.ts`

**jamia-be/src/email:**
- Purpose: Email notification service
- Contains: Email service using Resend
- Key files: `email.service.ts`, `email.module.ts`

**jamia-be/src/audit:**
- Purpose: Audit logging for actions
- Contains: Audit service for logging to database
- Key files: `audit.service.ts`, `audit.module.ts`

**jamia-be/src/telegram:**
- Purpose: Telegram bot integration
- Contains: Telegram service for notifications
- Key files: `telegram.service.ts`, `telegram.module.ts`

**jamia-be/src/health:**
- Purpose: Health check endpoint
- Contains: Health controller for monitoring
- Key files: `health.controller.ts`, `health.module.ts`

**jamia-be/src/test-utils:**
- Purpose: Testing utilities and mocks
- Contains: Supabase mock factory
- Key files: `supabase-mock.ts`

**jamia-fe/src:**
- Purpose: Frontend application source code
- Contains: Pages, components, API clients, hooks, styles
- Key files: `main.tsx` (entry point), `App.tsx` (router), `index.css` (global styles)

**jamia-fe/src/pages:**
- Purpose: Top-level route components
- Contains: Page components for each route
- Key files: `Dashboard.tsx`, `CreateJam.tsx`, `Auth.tsx`, `Profile.tsx`

**jamia-fe/src/pages/jam-details:**
- Purpose: Jam detail views with nested routing
- Contains: Layout and sub-pages for jam details
- Key files: `JamDetailsLayout.tsx`, `JamOverviewPage.tsx`, `JamCommunicationPage.tsx`

**jamia-fe/src/components:**
- Purpose: Reusable React components
- Contains: Feature components and UI primitives
- Key files: `JamCard.tsx`, `ParticipantsList.tsx`, `BookingSection.tsx`

**jamia-fe/src/components/ui:**
- Purpose: Base UI components (shadcn/ui)
- Contains: Reusable UI primitives
- Key files: `button.tsx`, `card.tsx`, `dialog.tsx`, `input.tsx`

**jamia-fe/src/components/jams:**
- Purpose: Jam-specific feature components
- Contains: Jam form components and utilities
- Key files: Components related to jam creation/editing

**jamia-fe/src/api:**
- Purpose: Backend API client layer
- Contains: Typed API client functions for each resource
- Key files: `client.ts` (axios config), `jams.api.ts`, `participants.api.ts`, `profiles.api.ts`

**jamia-fe/src/integrations/supabase:**
- Purpose: Supabase client and types
- Contains: Supabase client configuration, database types
- Key files: `client.ts`, `types.ts`

**jamia-fe/src/hooks:**
- Purpose: Custom React hooks
- Contains: Reusable stateful logic
- Key files: `use-toast.ts`, `use-mobile.tsx`, `use-debounce.ts`, `useJamForm.ts`

**jamia-fe/src/lib:**
- Purpose: Utility functions and helpers
- Contains: Shared utilities
- Key files: `utils.ts` (className utility)

## Key File Locations

**Entry Points:**
- `jamia-be/src/main.ts`: Backend HTTP server bootstrap
- `jamia-fe/src/main.tsx`: Frontend React app mount

**Configuration:**
- `jamia-be/src/app.module.ts`: NestJS root module with feature imports
- `jamia-be/nest-cli.json`: NestJS CLI configuration
- `jamia-be/tsconfig.json`: Backend TypeScript config
- `jamia-fe/src/App.tsx`: React Router configuration
- `jamia-fe/vite.config.ts`: Vite build configuration
- `jamia-fe/tsconfig.json`: Frontend TypeScript config
- `jamia-fe/tailwind.config.ts`: Tailwind CSS configuration
- `jamia-be/biome.json`: Backend code formatting config
- `jamia-fe/biome.json`: Frontend code formatting config

**Core Logic:**
- `jamia-be/src/jams/jams.service.ts`: Jam business logic
- `jamia-be/src/participants/participants.service.ts`: Participant management logic
- `jamia-fe/src/api/jams.api.ts`: Frontend jam API client
- `jamia-fe/src/pages/Dashboard.tsx`: Main dashboard with jam lists

**Testing:**
- `jamia-be/test/app.e2e-spec.ts`: E2E tests
- `jamia-be/src/**/*.spec.ts`: Unit tests co-located with source
- `jamia-be/coverage/`: Test coverage reports

## Naming Conventions

**Files (Backend):**
- Controllers: `{resource}.controller.ts` (e.g., `jams.controller.ts`)
- Services: `{resource}.service.ts` (e.g., `jams.service.ts`)
- Modules: `{resource}.module.ts` (e.g., `jams.module.ts`)
- DTOs: `{action}-{resource}.dto.ts` (e.g., `create-jam.dto.ts`)
- Tests: `{resource}.spec.ts` or `{resource}.e2e-spec.ts`
- Guards: `{name}-auth.guard.ts` (e.g., `supabase-auth.guard.ts`)
- Decorators: `{name}.decorator.ts` (e.g., `user.decorator.ts`)

**Files (Frontend):**
- Pages: PascalCase (e.g., `Dashboard.tsx`, `CreateJam.tsx`)
- Components: PascalCase (e.g., `JamCard.tsx`, `ParticipantsList.tsx`)
- Hooks: kebab-case with `use-` prefix (e.g., `use-toast.ts`, `use-mobile.tsx`)
- API modules: kebab-case with `.api.ts` suffix (e.g., `jams.api.ts`)
- Utilities: kebab-case (e.g., `utils.ts`)
- Config: kebab-case (e.g., `client.ts`)

**Directories:**
- Backend: Lowercase, plural for resources (e.g., `jams`, `participants`, `profiles`)
- Backend: Lowercase, singular for infrastructure (e.g., `auth`, `config`, `email`)
- Frontend: Lowercase, plural for collections (e.g., `pages`, `components`, `hooks`)
- Frontend: Lowercase, singular for specific domains (e.g., `api`, `integrations`)

## Where to Add New Code

**New Feature Module (Backend):**
- Primary code: `jamia-be/src/{feature-name}/`
- Create: `{feature}.module.ts`, `{feature}.controller.ts`, `{feature}.service.ts`
- DTOs: `jamia-be/src/{feature-name}/dto/`
- Tests: `jamia-be/src/{feature-name}/{feature}.service.spec.ts`
- Register: Import module in `jamia-be/src/app.module.ts`

**New API Endpoint (Backend):**
- Implementation: Add method to existing controller in `jamia-be/src/{feature}/{feature}.controller.ts`
- Business logic: Add method to service in `jamia-be/src/{feature}/{feature}.service.ts`
- DTO: Create in `jamia-be/src/{feature}/dto/{action}-{resource}.dto.ts` if needed

**New Page (Frontend):**
- Primary code: `jamia-fe/src/pages/{PageName}.tsx`
- Route: Add to `jamia-fe/src/App.tsx` Routes configuration
- Sub-pages: Use directory `jamia-fe/src/pages/{page-name}/` for nested routes

**New Component (Frontend):**
- Feature component: `jamia-fe/src/components/{ComponentName}.tsx`
- UI primitive: `jamia-fe/src/components/ui/{component-name}.tsx`
- Domain-specific: `jamia-fe/src/components/{domain}/{ComponentName}.tsx`

**New API Client Method (Frontend):**
- Implementation: Add method to existing API object in `jamia-fe/src/api/{resource}.api.ts`
- Types: Define interfaces in same file or import from shared types

**New Hook (Frontend):**
- Implementation: `jamia-fe/src/hooks/use-{hook-name}.ts` or `.tsx`
- Pattern: Export named hook function (e.g., `export function useDebounce()`)

**Utilities:**
- Backend shared helpers: `jamia-be/src/{domain}/` (create domain-specific directory)
- Frontend shared helpers: `jamia-fe/src/utils/` or `jamia-fe/src/lib/utils.ts`

**Integration:**
- New external service: Create module in `jamia-be/src/{service-name}/` or `jamia-fe/src/integrations/{service-name}/`

## Special Directories

**jamia-be/dist:**
- Purpose: Compiled JavaScript output from TypeScript
- Generated: Yes (by TypeScript compiler)
- Committed: No

**jamia-be/coverage:**
- Purpose: Test coverage reports
- Generated: Yes (by Jest)
- Committed: No

**jamia-fe/dist:**
- Purpose: Production build output
- Generated: Yes (by Vite)
- Committed: No

**jamia-fe/public:**
- Purpose: Static assets served as-is
- Generated: No
- Committed: Yes

**jamia-be/node_modules:**
- Purpose: Backend npm dependencies
- Generated: Yes (by pnpm)
- Committed: No

**jamia-fe/node_modules:**
- Purpose: Frontend npm dependencies
- Generated: Yes (by pnpm)
- Committed: No

**jamia-be/supabase:**
- Purpose: Database migrations and schema
- Generated: Partially (types generated from schema)
- Committed: Yes

**.planning:**
- Purpose: GSD codebase analysis and planning documents
- Generated: Yes (by GSD commands)
- Committed: Yes

---

*Structure analysis: 2026-01-20*
