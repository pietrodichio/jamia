# External Integrations

**Analysis Date:** 2026-01-20

## APIs & External Services

**Email Service:**
- Resend - Transactional email delivery for participant notifications
  - SDK/Client: `resend` (v6.3.0)
  - Auth: `RESEND_API_KEY`
  - Implementation: `jamia-be/src/email/email.service.ts`
  - Features: Participant confirmations, promotions, removals, custom HTML emails with retry logic

**Messaging:**
- Telegram Bot API - Real-time notifications to jam managers
  - SDK/Client: Native fetch API (no SDK)
  - Auth: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME`
  - Implementation: `jamia-be/src/telegram/telegram.service.ts`
  - Features: Account linking, participant notifications, webhook/polling support
  - Polling: `jamia-be/src/telegram/telegram.poller.ts`
  - Controller: `jamia-be/src/telegram/telegram.controller.ts`

## Data Storage

**Databases:**
- Supabase (PostgreSQL 17)
  - Connection: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
  - Client: `@supabase/supabase-js` (v2.76.0)
  - Factory: `jamia-be/src/config/supabase.config.ts`
  - Schema: `public` schema
  - Migrations: `jamia-be/supabase/migrations/`
  - Local dev: Supabase CLI with local instance (port 54321 API, 54322 DB, 54323 Studio)

**File Storage:**
- Local filesystem only (no external file storage detected)

**Caching:**
- None detected

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: JWT-based authentication
  - Guard: `jamia-be/src/auth/supabase-auth.guard.ts`
  - Verification: Uses `jsonwebtoken` to verify tokens with `SUPABASE_JWT_SECRET`
  - User context: Extracts user ID, email, role from JWT payload
  - Authorization: Super admin flag from `profiles.is_super_admin` column
  - Decorator: `@User()` decorator in `jamia-be/src/auth/user.decorator.ts`

## Monitoring & Observability

**Error Tracking:**
- None (uses console.error logging)

**Logs:**
- NestJS Logger service
- Console output for errors, warnings, and info
- Examples: Email service, Telegram service, auth guard all use Logger

## CI/CD & Deployment

**Hosting:**
- Not specified in codebase

**CI Pipeline:**
- Not detected

## Environment Configuration

**Required env vars:**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_SERVICE_KEY` - Service role key for server-side operations
- `SUPABASE_ANON_KEY` - Anonymous key for client operations
- `SUPABASE_JWT_SECRET` - Secret for JWT token verification
- `RESEND_API_KEY` - Resend email service API key
- `RESEND_FROM_EMAIL` - Sender email address (format: "Name <email@domain.com>")
- `TELEGRAM_BOT_TOKEN` - Telegram bot authentication token
- `TELEGRAM_BOT_USERNAME` - Bot username for deep links
- `TELEGRAM_POLLING` - Enable polling mode for local dev (true/false)
- `FRONTEND_BASE_URL` - Frontend application URL for generating links
- `PORT` - Server port (optional, defaults to 8088)
- `NODE_ENV` - Environment mode ('local' loads .env.local, else .env)

**Secrets location:**
- Local: `.env` or `.env.local` (gitignored, example: `.env.local.example`)
- Production: Environment variables (deployment platform)

## Webhooks & Callbacks

**Incoming:**
- Telegram webhook endpoint: `jamia-be/src/telegram/telegram.controller.ts`
  - POST `/telegram/webhook` - Receives Telegram updates
  - Alternative: Polling mode via `telegram.poller.ts` for local development

**Outgoing:**
- Telegram Bot API: `https://api.telegram.org/bot{token}/sendMessage`
  - Used for sending direct messages to users
  - HTML parse mode enabled
- Resend API: Email dispatch via Resend SDK
  - Single and batch email sending with retry/backoff

## Cross-Origin Resource Sharing

**CORS Configuration:**
- Enabled in `jamia-be/src/main.ts`
- Allowed origins:
  - `http://localhost:5173` (Vite dev server)
  - `http://localhost:3000` (alternative frontend port)
  - `http://localhost:8080` (alternative frontend port)
  - `https://jamia.app` (production)
  - `https://www.jamia.app` (production www)
- Credentials: Enabled

## Database Features

**Supabase Configuration:**
- Auto-refresh tokens: Disabled (server-side client)
- Session persistence: Disabled (stateless)
- Schema: `public`
- Tables: `profiles`, `jams`, `participants`, `telegram_link_tokens`, audit tables
- Row Level Security: Managed via migrations
- Local development: Full local stack via Supabase CLI
  - API: http://127.0.0.1:54321
  - Studio UI: http://127.0.0.1:54323
  - PostgreSQL: postgresql://postgres:postgres@127.0.0.1:54322/postgres
  - Email testing: Inbucket on port 54324

---

*Integration audit: 2026-01-20*
