---
phase: 01-monorepo-migration
plan: 04
subsystem: infra
tags: [deployment, railway, netlify, monorepo, selective-deployment]

# Dependency graph
requires:
  - phase: 01-01
    provides: "Turborepo monorepo structure"
  - phase: 01-02
    provides: "Migrated apps in apps/backend and apps/web"
  - phase: 01-03
    provides: "Shared types package wired to both apps"
provides:
  - "Railway configuration with selective deployment for backend"
  - "Netlify configuration with selective deployment for frontend"
  - "Environment variable templates for both platforms"
  - "Monorepo-aware deployment that prevents unnecessary rebuilds"
affects: [deployment, ci-cd, future-platform-configs]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Railway watchPaths for selective monorepo deployment
    - Netlify ignore command using git diff for selective deployment
    - Turborepo filter for building specific apps in deployment

key-files:
  created:
    - railway.toml
    - netlify.toml
    - apps/backend/.env.example
    - apps/web/.env.example
  modified: []

key-decisions:
  - "Railway watchPaths: Native support for monorepo selective deployment"
  - "Netlify ignore command: git diff workaround for selective deployment (lacks native watchPaths)"
  - "Turborepo filter in build commands: Build only target app, not entire monorepo"

patterns-established:
  - "Platform configs at repository root, not in app subdirectories"
  - "Environment variable examples in each app directory"
  - "Selective deployment prevents cross-app rebuild triggers"

# Metrics
duration: 1 min
completed: 2026-01-20
---

# Phase 1 Plan 04: Deployment Configuration Summary

**Railway and Netlify configured for selective monorepo deployment with watchPaths and ignore commands preventing unnecessary rebuilds**

## Performance

- **Duration:** 1 min (automated) + human verification checkpoint
- **Started:** 2026-01-20T18:08:47Z
- **Completed:** 2026-01-20T18:09:04Z (automation) + 2026-01-20T20:39:09Z (verification confirmed)
- **Tasks:** 3 (2 automated, 1 checkpoint)
- **Files modified:** 4

## Accomplishments

- Railway configuration with watchPaths for backend-only rebuilds
- Netlify configuration with ignore command for frontend-only rebuilds
- Environment variable templates documenting required service configs
- Verified selective deployment working correctly via human checkpoint
- Frontend-only changes trigger only Netlify (MONO-04 ✓)
- Backend-only changes trigger only Railway (MONO-05 ✓)
- Both platforms successfully deploy from monorepo (MONO-06, MONO-07 ✓)

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure Railway for monorepo with selective deployment** - `cf3d3f7` (feat)
   - railway.toml with Nixpacks builder and Turborepo filter
   - watchPaths: ["/apps/backend/**", "/packages/**"]
   - apps/backend/.env.example with all required environment variables

2. **Task 2: Configure Netlify for monorepo with selective deployment** - `ef8065f` (feat)
   - netlify.toml with Turborepo filter and publish directory
   - ignore command: git diff checking apps/web and packages changes
   - apps/web/.env.example with Vite environment variables

3. **Task 3: Human verification checkpoint** - (verified)
   - User confirmed selective deployment working as intended
   - All three test scenarios passed (backend-only, frontend-only, shared changes)

**Plan metadata:** Will be committed after SUMMARY creation

## Files Created/Modified

**Railway Configuration:**
- `railway.toml` - Deployment config with Nixpacks builder, Turborepo filter build command, selective watchPaths
- `apps/backend/.env.example` - Environment variables template (Supabase, Resend, Telegram, application settings)

**Netlify Configuration:**
- `netlify.toml` - Deployment config with Turborepo filter, git diff ignore command, Node 22 environment
- `apps/web/.env.example` - Environment variables template (Vite-prefixed Supabase and API base URL)

## Decisions Made

1. **Railway watchPaths approach:** Railway has native monorepo support via watchPaths array. Specifying ["/apps/backend/**", "/packages/**"] ensures backend rebuilds only when those directories change. This is the recommended approach per Railway documentation.

2. **Netlify ignore command approach:** Netlify lacks native watchPaths, so used ignore command with git diff. Command compares $CACHED_COMMIT_REF to $COMMIT_REF, checking if apps/web or packages changed. Exit 0 (no changes) skips build. This is the documented workaround for monorepo selective deployment on Netlify.

3. **Turborepo filter in build commands:** Both platforms use `pnpm build --filter=@jamia/[app]` to build only the target app. This leverages Turborepo's caching and dependency resolution while keeping builds isolated.

4. **Environment variable examples in app directories:** Placed .env.example files in each app directory (not at root) to keep environment configs close to the apps that use them. Backend has more variables (Supabase, Resend, Telegram) while frontend only needs public Supabase keys and API URL.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - configurations created and verified successfully on first attempt.

## User Setup Required

**Deployment platforms require manual configuration.**

To deploy, you'll need to:

**Railway (Backend):**
1. Connect Railway account to GitHub repository
2. Create new project pointing to this repository
3. Set environment variables from apps/backend/.env.example:
   - SUPABASE_URL, SUPABASE_SERVICE_KEY, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET
   - RESEND_API_KEY, RESEND_FROM_EMAIL
   - TELEGRAM_BOT_TOKEN, TELEGRAM_BOT_USERNAME
   - FRONTEND_BASE_URL, PORT, NODE_ENV
4. Verify railway.toml is detected and watchPaths are active

**Netlify (Frontend):**
1. Connect Netlify account to GitHub repository
2. Create new site pointing to this repository
3. Set environment variables from apps/web/.env.example:
   - VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
   - VITE_API_BASE_URL
4. Verify netlify.toml is detected and ignore command works

**Verification:**
- Make backend-only change → only Railway rebuilds
- Make frontend-only change → only Netlify rebuilds
- Make packages/ change → both rebuild

## Next Phase Readiness

**Monorepo migration complete:**
- ✓ Structure established (01-01)
- ✓ Repositories migrated (01-02)
- ✓ Types shared (01-03)
- ✓ Deployments configured (01-04)

**Ready for Phase 02 (Data Management):**
- All infrastructure in place
- Both apps deploying independently
- Shared types prevent drift
- No blockers

**Phase 1 velocity:**
- 4 plans completed
- Average duration: 4 min per plan
- Total phase time: 17 min

---
*Phase: 01-monorepo-migration*
*Completed: 2026-01-20*
