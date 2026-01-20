# Coding Conventions

**Analysis Date:** 2026-01-20

## Naming Patterns

**Files:**
- Backend (NestJS): `kebab-case.{service|controller|module|dto|spec}.ts` (e.g., `jams.service.ts`, `participants.controller.ts`, `create-jam.dto.ts`)
- Frontend (React): `PascalCase.tsx` for components (e.g., `Dashboard.tsx`, `ParticipantsList.tsx`)
- Utilities/Hooks: `kebab-case.ts` (e.g., `use-toast.ts`, `google-maps.ts`)
- DTOs nested in `/dto/` subdirectories with descriptive names (e.g., `join-jam.dto.ts`, `update-role.dto.ts`)

**Functions:**
- Backend: camelCase (e.g., `getPublishedJams`, `createJam`, `ensureOwnerParticipation`)
- Frontend: camelCase (e.g., `useToast`, `genId`, `dispatch`)
- React components: PascalCase (e.g., `App`, `AuthListener`, `Dashboard`)

**Variables:**
- camelCase for general variables (e.g., `jamId`, `userId`, `participantCount`)
- UPPER_SNAKE_CASE for constants (e.g., `TOAST_LIMIT`, `TOAST_REMOVE_DELAY`, `SUPABASE_CLIENT`)

**Types:**
- PascalCase for type/interface names (e.g., `CreateJamDto`, `AuthUser`, `ParticipantRole`, `JamEmailRecipient`)
- Type literals use snake_case for union members matching database values (e.g., `type ParticipantState = 'participant' | 'waiting'`)

## Code Style

**Formatting:**
- Biome (backend: 2.2.4, frontend: 2.3.8)
- Indent: 2 spaces
- Line width: 100 characters
- Command: `biome format --write .`

**Linting:**
- Biome with recommended rules enabled
- Frontend additional rules:
  - `useExhaustiveDependencies`: warn (React hooks dependencies)
  - `useImportType`: off (allows runtime imports)
  - `noDangerouslySetInnerHtml`: warn (security)
- Backend files: `src/**/*.{ts,tsx,js,jsx}`, `test/**/*.ts`
- Frontend files: `src/**/*.{ts,tsx,js,jsx}`, `supabase/**/*.sql`, excludes `!src/components/ui`
- Command: `biome lint .`

## Import Organization

**Order:**
1. External framework imports (e.g., `@nestjs/*`, `react`, `@radix-ui/*`)
2. External library imports (e.g., `@supabase/supabase-js`, `class-validator`)
3. Internal absolute imports using path aliases (e.g., `@/components/ui/toast`, `../config/supabase.config`)
4. Relative imports (e.g., `./jams.service`, `./dto/create-jam.dto`)

**Path Aliases:**
- Frontend: `@/*` maps to `./src/*` (configured in `vite.config.ts` and `tsconfig.json`)
- Backend: No aliases, uses relative imports

**Examples:**

Backend (`jamia-be/src/jams/jams.controller.ts`):
```typescript
import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { JamsService } from './jams.service';
import { CreateJamDto } from './dto/create-jam.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
```

Frontend (`jamia-fe/src/App.tsx`):
```typescript
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Index from "./pages/Index";
```

## Error Handling

**Patterns:**
- Backend: Use NestJS exceptions (`NotFoundException`, `ForbiddenException`, `BadRequestException`)
- Throw errors with descriptive messages (e.g., `throw new NotFoundException('Jam not found')`)
- Supabase errors: Check `error` from response, throw with context (e.g., `throw new Error(\`Failed to fetch jams: ${error.message}\`)`)
- Frontend: Try-catch blocks for async operations, display errors via toast notifications

**Backend example (`jamia-be/src/jams/jams.service.ts`):**
```typescript
if (error || !data) {
  throw new NotFoundException('Jam not found');
}

if (!isOwnerOrManager) {
  throw new ForbiddenException('You can only update jams you own or manage');
}

if (end <= start) {
  throw new BadRequestException('End date must be after start date');
}
```

## Logging

**Framework:** `console` (native)

**Patterns:**
- Backend: `console.error()` for error logging with context (e.g., `console.error('Failed to verify owner/manager permissions', error)`)
- Frontend: `console.info()` for informational messages (e.g., `console.info("[AuthListener] Invite hash detected, redirecting to /accept-invite")`)
- Use template literals for readable messages
- Include error objects for debugging

## Comments

**When to Comment:**
- Complex business logic requiring explanation
- Inline comments for non-obvious code (e.g., `// ! Side effects ! - This could be extracted into a dismissToast() action`)
- Section separators in tests (e.g., `// 1. Get owned jams`, `// 2. Get managed jams`)
- TODO comments are discouraged (not observed in codebase)

**JSDoc/TSDoc:**
- Not widely used in this codebase
- Type annotations via TypeScript are preferred over JSDoc

## Function Design

**Size:**
- Services: Methods range from 10-100 lines, averaging 30-50 lines
- Complex operations broken into private helper methods (e.g., `buildLocationColumns`, `ensureOwnerParticipation`, `getJamEmailRecipients`)
- Controllers: Thin wrappers (5-15 lines) delegating to services

**Parameters:**
- Required parameters first, optional parameters last
- Use DTOs for complex input validation (e.g., `CreateJamDto`, `UpdateJamDto`)
- Include `isSuperAdmin = false` as optional parameter for permission checks
- Type parameters explicitly (e.g., `userId: string`, `jamId: string`)

**Return Values:**
- Backend services: Return data objects or throw exceptions (no nulls)
- Use Promise return types for async operations
- Controllers return service results directly
- Frontend hooks: Return objects with named properties (e.g., `{ toasts, toast, dismiss }`)

## Module Design

**Exports:**
- Backend: Named exports for classes and types (e.g., `export class JamsService`, `export class CreateJamDto`)
- Frontend: Default exports for components (e.g., `export default App`)
- Frontend utilities: Named exports (e.g., `export function cn()`, `export { useToast, toast }`)

**Barrel Files:**
- Not used in this codebase
- Direct imports from specific files

## Validation

**Backend:**
- Use `class-validator` decorators on DTOs (e.g., `@IsString()`, `@IsDateString()`, `@IsOptional()`, `@Min(1)`)
- Use `class-transformer` decorators for type conversion (e.g., `@Type(() => Number)`)
- Nested validation with `@ValidateNested()` and `@Type()` (e.g., `location: JamLocationDto`)
- Global ValidationPipe configured in `main.ts` with `whitelist: true`, `transform: true`

**Example (`jamia-be/src/jams/dto/create-jam.dto.ts`):**
```typescript
export class JamLocationDto {
  @IsString()
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;
}

export class CreateJamDto {
  @IsString()
  name: string;

  @ValidateNested()
  @Type(() => JamLocationDto)
  location: JamLocationDto;

  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
```

## TypeScript Configuration

**Backend (`jamia-be/tsconfig.json`):**
- Strict null checks: enabled
- `noImplicitAny`: false (allows implicit any)
- Decorators: enabled (`emitDecoratorMetadata: true`, `experimentalDecorators: true`)
- Module: nodenext
- Target: ES2023

**Frontend (`jamia-fe/tsconfig.json`):**
- Strict null checks: disabled
- `noImplicitAny`: false
- `allowJs`: true
- `skipLibCheck`: true
- References project structure (split between app and node configs)

## Dependency Injection

**Backend (NestJS):**
- Use `@Injectable()` decorator for services
- Constructor injection with `@Inject()` for custom providers (e.g., `@Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient`)
- Module imports for service dependencies (e.g., `AuditModule`, `EmailModule` imported in `ParticipantsModule`)

**Example (`jamia-be/src/jams/jams.service.ts`):**
```typescript
@Injectable()
export class JamsService {
  constructor(
    @Inject(SUPABASE_CLIENT) private readonly supabase: SupabaseClient,
    private readonly auditService: AuditService,
    private readonly emailService: EmailService,
  ) {}
}
```

## React Patterns

**Hooks:**
- Custom hooks prefixed with `use` (e.g., `useToast`, `useJamForm`, `useMobile`)
- Store hook state in files like `jamia-fe/src/hooks/use-toast.ts`
- Use reducer pattern for complex state (e.g., toast state management)

**Components:**
- Functional components only (no class components)
- Use arrow functions for component definition (e.g., `const App = () => (...)`)
- Props destructured in function parameters
- UI components from shadcn/ui in `src/components/ui/` (excluded from linting)

**State Management:**
- React Query (`@tanstack/react-query`) for server state
- Local reducer pattern for complex UI state
- Module-level state with listeners pattern (see `use-toast.ts`)

---

*Convention analysis: 2026-01-20*
