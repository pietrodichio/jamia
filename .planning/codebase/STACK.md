# Technology Stack

**Analysis Date:** 2026-01-20

## Languages

**Primary:**
- TypeScript 5.7.3 - All backend source code
- JavaScript - Runtime target ES2023

**Secondary:**
- SQL - Database migrations and seed data in `jamia-be/supabase/migrations/`

## Runtime

**Environment:**
- Node.js v22.9.0

**Package Manager:**
- pnpm 10.22.0
- Lockfile: present (`jamia-be/pnpm-lock.yaml`)

## Frameworks

**Core:**
- NestJS 11.0.1 - Primary backend framework
- Express (via @nestjs/platform-express 11.0.1) - HTTP server

**Testing:**
- Jest 30.0.0 - Test runner and framework
- ts-jest 29.2.5 - TypeScript support for Jest
- Supertest 7.0.0 - HTTP assertions for e2e tests

**Build/Dev:**
- TypeScript Compiler 5.7.3 - Transpilation
- ts-node 10.9.2 - TypeScript execution for development
- tsconfig-paths 4.2.0 - Path mapping resolution
- Biome 2.2.4 - Linting and formatting
- NestJS CLI 11.0.0 - Project scaffolding and build

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.76.0 - Database client and authentication (used throughout all services)
- @nestjs/config 4.0.2 - Environment configuration management
- jsonwebtoken 9.0.2 - JWT verification for Supabase auth tokens
- resend 6.3.0 - Email delivery service integration
- class-validator 0.14.2 - DTO validation
- class-transformer 0.5.1 - DTO transformation

**Infrastructure:**
- reflect-metadata 0.2.2 - Required for NestJS decorators
- rxjs 7.8.1 - Reactive programming utilities

## Configuration

**Environment:**
- Configuration via `.env` files (production) or `.env.local` (local development)
- Managed by @nestjs/config with ConfigService
- Key configs required:
  - `SUPABASE_URL` - Supabase API URL
  - `SUPABASE_SERVICE_KEY` - Service role key for admin operations
  - `SUPABASE_ANON_KEY` - Public anon key
  - `SUPABASE_JWT_SECRET` - JWT verification secret
  - `RESEND_API_KEY` - Email service API key
  - `RESEND_FROM_EMAIL` - Sender email address
  - `TELEGRAM_BOT_TOKEN` - Telegram bot authentication
  - `TELEGRAM_BOT_USERNAME` - Bot username for deep linking
  - `FRONTEND_BASE_URL` - Frontend URL for email/notification links
  - `PORT` - Application port (default: 8088)
  - `NODE_ENV` - Environment mode ('local' or production)

**Build:**
- `jamia-be/tsconfig.json` - TypeScript compiler configuration
- `jamia-be/nest-cli.json` - NestJS build settings
- `jamia-be/biome.json` - Code formatting and linting rules

## Platform Requirements

**Development:**
- Node.js v22+ (preferably v22.9.0)
- pnpm v10+ for package management
- Supabase CLI for local database development
- PostgreSQL 17 (via Supabase local instance)

**Production:**
- Node.js v22+ runtime
- Supabase hosted instance (PostgreSQL 17)
- Resend account for email delivery
- Telegram Bot API access
- Environment supporting Express server on configurable port

---

*Stack analysis: 2026-01-20*
