# Architecture

**Analysis Date:** 2026-01-20

## Pattern Overview

**Overall:** Full-stack monorepo with NestJS backend and React SPA frontend

**Key Characteristics:**
- Separated backend (NestJS/TypeScript) and frontend (React/TypeScript) applications
- RESTful API architecture with JWT authentication
- Supabase as backend-as-a-service for database and auth
- Module-based architecture on backend, component-based on frontend
- Direct HTTP communication between frontend and backend via Axios

## Layers

**Frontend Presentation Layer:**
- Purpose: User interface and routing
- Location: `jamia-fe/src/pages`
- Contains: Page components, route definitions, navigation logic
- Depends on: Components, API layer, Supabase client
- Used by: React Router in `App.tsx`

**Frontend Component Layer:**
- Purpose: Reusable UI components
- Location: `jamia-fe/src/components`
- Contains: Feature components (`jamia-fe/src/components/jams`), UI primitives (`jamia-fe/src/components/ui`)
- Depends on: Hooks, utilities, UI library (shadcn/ui)
- Used by: Pages, other components

**Frontend API Layer:**
- Purpose: HTTP client abstraction and type-safe API calls
- Location: `jamia-fe/src/api`
- Contains: API client configuration, typed endpoints for each resource
- Depends on: Axios, Supabase client for auth token
- Used by: React Query hooks in pages

**Frontend Integration Layer:**
- Purpose: External service integration
- Location: `jamia-fe/src/integrations/supabase`
- Contains: Supabase client configuration, type definitions
- Depends on: Supabase SDK
- Used by: API client, pages, authentication flow

**Backend API Layer:**
- Purpose: HTTP endpoint definitions and request handling
- Location: `jamia-be/src/*/\*.controller.ts`
- Contains: REST controllers with route handlers
- Depends on: Service layer, DTOs, Guards
- Used by: NestJS router

**Backend Service Layer:**
- Purpose: Business logic and data access
- Location: `jamia-be/src/*/\*.service.ts`
- Contains: Domain logic, Supabase queries, data transformations
- Depends on: Supabase client, audit service, email service
- Used by: Controllers

**Backend Module Layer:**
- Purpose: Dependency injection and module organization
- Location: `jamia-be/src/*/\*.module.ts`
- Contains: Feature modules (JamsModule, ParticipantsModule, ProfilesModule, etc.)
- Depends on: Providers, controllers, imported modules
- Used by: AppModule as root module

**Backend Infrastructure Layer:**
- Purpose: Cross-cutting concerns and shared utilities
- Location: `jamia-be/src/config`, `jamia-be/src/auth`, `jamia-be/src/email`, `jamia-be/src/audit`
- Contains: Supabase client config, auth guards, email service, audit logging
- Depends on: External SDKs (Supabase, Resend, JWT)
- Used by: Service layer, controllers via guards

## Data Flow

**User Authentication Flow:**

1. Frontend sends credentials to Supabase auth service
2. Supabase returns JWT token and session
3. Frontend stores session in localStorage (Supabase SDK handles this)
4. Frontend API client attaches JWT to all backend requests via interceptor
5. Backend SupabaseAuthGuard validates JWT using SUPABASE_JWT_SECRET
6. Backend attaches user context to request object
7. Controllers access user via @User() decorator

**CRUD Operation Flow:**

1. Page component triggers API call via React Query mutation/query
2. API layer function (`jamia-fe/src/api/*.api.ts`) calls apiClient with typed payload
3. Axios interceptor adds JWT token from Supabase session
4. Backend controller receives request, guard validates auth
5. Controller delegates to service layer
6. Service performs Supabase database query
7. Service logs action to audit_log table
8. Service returns typed response to controller
9. Controller returns HTTP response
10. Frontend API layer returns typed data
11. React Query updates cache and triggers re-render

**Email Notification Flow:**

1. Service layer calls EmailService with context
2. EmailService uses Resend SDK to send email
3. AuditService logs email action to audit_log

**State Management:**
- Frontend uses React Query for server state (queries and mutations)
- Frontend uses React hooks (useState, useEffect) for local UI state
- Backend uses Supabase as source of truth for all persistent state

## Key Abstractions

**Module (Backend):**
- Purpose: Encapsulate related features with dependency injection
- Examples: `jamia-be/src/jams/jams.module.ts`, `jamia-be/src/participants/participants.module.ts`
- Pattern: NestJS @Module decorator with imports, controllers, providers

**Service (Backend):**
- Purpose: Encapsulate business logic and data access
- Examples: `jamia-be/src/jams/jams.service.ts`, `jamia-be/src/participants/participants.service.ts`
- Pattern: Injectable class with Supabase client injection, methods for CRUD operations

**Guard (Backend):**
- Purpose: Protect routes with authentication/authorization logic
- Examples: `jamia-be/src/auth/supabase-auth.guard.ts`
- Pattern: CanActivate interface, JWT verification, user context enrichment

**DTO (Backend):**
- Purpose: Type-safe request/response contracts with validation
- Examples: `jamia-be/src/jams/dto/create-jam.dto.ts`, `jamia-be/src/participants/dto/join-jam.dto.ts`
- Pattern: Classes with class-validator decorators

**API Client (Frontend):**
- Purpose: Type-safe HTTP communication with backend
- Examples: `jamia-fe/src/api/jams.api.ts`, `jamia-fe/src/api/participants.api.ts`
- Pattern: Object with async methods returning typed promises

**Page Component (Frontend):**
- Purpose: Top-level route components with data fetching
- Examples: `jamia-fe/src/pages/Dashboard.tsx`, `jamia-fe/src/pages/CreateJam.tsx`
- Pattern: React component using React Query hooks, routing logic

## Entry Points

**Frontend Application:**
- Location: `jamia-fe/src/main.tsx`
- Triggers: Browser loads index.html
- Responsibilities: Render React app root, mount to DOM

**Frontend Router:**
- Location: `jamia-fe/src/App.tsx`
- Triggers: Application initialization
- Responsibilities: Route configuration, auth listener setup, provider composition (QueryClient, TooltipProvider, Toasters)

**Backend Application:**
- Location: `jamia-be/src/main.ts`
- Triggers: Node.js process start
- Responsibilities: Bootstrap NestJS app, configure CORS, enable validation pipe, start HTTP server

**Backend Root Module:**
- Location: `jamia-be/src/app.module.ts`
- Triggers: NestFactory.create()
- Responsibilities: Import feature modules, configure global modules (ConfigModule, SupabaseModule)

## Error Handling

**Strategy:** Centralized exception handling with custom error responses

**Patterns:**
- Backend throws NestJS exceptions (NotFoundException, ForbiddenException, BadRequestException)
- ValidationPipe transforms validation errors to custom format in `jamia-be/src/main.ts`
- Frontend Axios interceptor catches 401 errors and redirects to /auth
- Frontend components use try/catch with toast notifications for user feedback
- Audit logging failures are logged but don't fail main operation

## Cross-Cutting Concerns

**Logging:**
- Backend uses NestJS Logger class for structured logging
- Frontend uses console.info/error for debugging
- Audit service logs all significant actions to database

**Validation:**
- Backend uses class-validator decorators on DTOs with global ValidationPipe
- Frontend validates forms using controlled inputs and client-side checks
- Supabase row-level security policies enforce authorization at database level

**Authentication:**
- Supabase handles authentication flow (signup, login, password reset)
- Backend SupabaseAuthGuard validates JWT on all protected routes
- Frontend stores session in localStorage via Supabase SDK
- Frontend API client attaches bearer token via request interceptor

---

*Architecture analysis: 2026-01-20*
