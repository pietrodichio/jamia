# Jamia

A dual-purpose platform for managing acroyoga jam participants and discovering acroyoga events worldwide.

**Status:** Active development | **License:** MIT

## What is Jamia?

Jamia helps acroyoga communities in two ways:

1. **Jam Management:** Organize jams with participant tracking, waiting lists, notifications, and co-organizer management
2. **Event Discovery:** Find acroyoga classes, workshops, conventions, and jams near you with location-based search and filtering

Whether you're organizing a weekly jam or traveling and looking for nearby events, Jamia brings the community together.

## Quick Start

### Prerequisites

- **Node.js:** v22.9.0 or higher (we use v22.9.0)
- **pnpm:** v10.22.0 (enable with `corepack enable` to use project version)
- **Supabase account:** For database and authentication ([sign up free](https://supabase.com))

### Installation

```bash
# Clone repository
git clone <repository-url>
cd jamia

# Install all dependencies (monorepo + workspaces)
pnpm install
```

### Environment Setup

Both apps require environment variables. Copy example files and fill in your values:

**Backend:**
```bash
cp apps/backend/.env.example apps/backend/.env
```

Edit `apps/backend/.env` and add your Supabase credentials, email service (Resend), and Telegram bot configuration. See inline comments in `.env.example` for how to obtain each value.

**Frontend:**
```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and add your Supabase public keys and backend API URL (http://localhost:8088 for local development).

### Supabase Local Development

For local development, you can use Supabase CLI to run a local instance:

**Prerequisites:**
- Docker Desktop installed and running
- Supabase CLI installed: `npm install -g supabase` or `brew install supabase/tap/supabase`

**Start local Supabase:**
```bash
cd apps/backend
pnpm supabase:start
```

This starts a local Supabase instance with:
- Local PostgreSQL database
- Auth service
- Storage service
- Studio UI: http://localhost:54323

**Get local credentials:**
```bash
pnpm supabase:status
```

Copy the credentials from the output and update your `apps/backend/.env` and `apps/web/.env` with the local values:
- `SUPABASE_URL`: API URL from status output
- `SUPABASE_ANON_KEY`: anon key from status output
- `SUPABASE_SERVICE_ROLE_KEY`: service_role key from status output (backend only)

**Manage local database:**
```bash
# Reset database to initial state
pnpm supabase:reset

# Stop local Supabase
pnpm supabase:stop

# Check status
pnpm supabase:status
```

**Alternative: Use cloud Supabase**

If you prefer to use a cloud Supabase project instead of local:
1. Create a project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API
3. Copy URL and keys to your `.env` files
4. Skip the Supabase CLI setup above

### Development

```bash
# Start all apps in development mode (backend + frontend)
pnpm dev

# Or start specific app
pnpm --filter @jamia/backend dev
pnpm --filter @jamia/web dev
```

**Access:**
- Frontend: http://localhost:5173
- Backend: http://localhost:8088

### Testing

```bash
# Run all tests across workspaces
pnpm test

# Run tests for specific app
pnpm --filter @jamia/backend test
pnpm --filter @jamia/web test

# Run tests with coverage
pnpm --filter @jamia/backend test:cov
```

### Code Quality

```bash
# Lint and format with Biome
pnpm lint

# Run linter for specific app
pnpm --filter @jamia/backend lint
```

## Project Structure

This is a monorepo managed by Turborepo with pnpm workspaces:

```
jamia/
├── apps/
│   ├── backend/       # NestJS API server
│   └── web/           # React frontend (Vite)
├── packages/
│   └── types/         # Shared TypeScript types
├── turbo.json         # Turborepo pipeline configuration
└── pnpm-workspace.yaml
```

### Apps

- **apps/backend:** NestJS REST API with Supabase (PostgreSQL), JWT authentication, email notifications (Resend), and Telegram bot integration
- **apps/web:** React SPA with TypeScript, Vite, Tailwind CSS, shadcn/ui components, React Query for data fetching

### Packages

- **packages/types:** Shared TypeScript interfaces consumed by both backend and frontend

## Tech Stack

**Backend:**
- NestJS 11.0
- TypeScript 5.7
- Supabase (PostgreSQL 17 + Auth)
- Resend (email)
- Telegram Bot API

**Frontend:**
- React 18
- TypeScript 5.7
- Vite 6
- Tailwind CSS
- shadcn/ui
- React Query

**Monorepo:**
- Turborepo
- pnpm workspaces

## Deployment

**Backend:** Deployed to [Railway](https://railway.app) with selective deployment (rebuilds only when `apps/backend/` or `packages/` change)

**Frontend:** Deployed to [Netlify](https://netlify.com) with selective deployment (rebuilds only when `apps/web/` or `packages/` change)

See `railway.toml` and `netlify.toml` for deployment configuration.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for:
- Development setup details
- Branching strategy and PR process
- Code style guidelines
- Testing requirements
- Commit message conventions

## Community

- **Code of Conduct:** [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- **Issues:** Report bugs or suggest features via [GitHub Issues](https://github.com/<org>/<repo>/issues)
- **Discussions:** Ask questions or share ideas in [GitHub Discussions](https://github.com/<org>/<repo>/discussions)

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with ❤️ for the acroyoga community
