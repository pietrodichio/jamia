# Phase 1: Monorepo Migration - Research

**Researched:** 2026-01-20
**Domain:** Monorepo tooling, Turborepo, pnpm workspaces, selective deployment
**Confidence:** HIGH

## Summary

Monorepo migration from separate jamia-fe and jamia-be repositories to a unified Turborepo-based monorepo requires coordination across build tooling, deployment platforms, and git history preservation. The standard approach uses Turborepo with pnpm workspaces, placing applications in `apps/` and shared packages in `packages/`.

The critical challenge is maintaining independent deployments on Netlify (frontend) and Railway (backend) while introducing shared code. Railway has native monorepo support with watch paths that automatically prevent unnecessary rebuilds. Netlify requires custom ignore commands to achieve selective deployment.

Git history preservation is achievable through `git subtree` or `git merge --allow-unrelated-histories`, with both repositories merged into subdirectories while maintaining full commit history.

**Primary recommendation:** Use Turborepo with pnpm workspaces, preserve git history via git merge with subdirectory restructuring, configure Railway watch paths and Netlify ignore commands for selective deployment, and place environment variables in individual app directories to prevent leakage.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Turborepo | Latest (2.x) | Monorepo build orchestrator | Industry standard for JS/TS monorepos, caching, parallel execution, owned by Vercel |
| pnpm | 10.x | Package manager | Already in use, best monorepo support with workspaces, efficient disk usage |
| TypeScript | 5.7.3+ | Type system | Already in use, essential for shared types package |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| git-filter-repo | Latest | Git history manipulation | If complex history cleanup needed (brew install git-filter-repo) |
| eslint-config-turbo | Latest | Environment variable linting | Detect undeclared env vars in turbo.json |
| vite-tsconfig-paths | Latest | Vite path resolution | Enable TypeScript path aliases in Vite (frontend) |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Turborepo | Nx | More features but heavier, overkill for simple monorepo |
| Turborepo | Lerna | Deprecated/archived, no longer maintained |
| pnpm | Yarn workspaces | Works but pnpm already in use, migration cost not justified |
| git subtree | git filter-repo | More powerful but complex, unnecessary for simple 2-repo merge |

**Installation:**
```bash
# Add Turborepo
pnpm add turbo -Dw

# Add environment variable linting (optional but recommended)
pnpm add eslint-config-turbo -Dw

# Add vite-tsconfig-paths for frontend (if using path aliases)
cd apps/web && pnpm add vite-tsconfig-paths -D
```

## Architecture Patterns

### Recommended Project Structure
```
jamia/                          # Root monorepo
├── apps/
│   ├── web/                    # Frontend (Vite + React)
│   │   ├── src/
│   │   ├── public/
│   │   ├── package.json
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── .env.local          # Frontend-specific env vars
│   └── backend/                # Backend (NestJS)
│       ├── src/
│       ├── test/
│       ├── supabase/
│       ├── package.json
│       ├── nest-cli.json
│       ├── tsconfig.json
│       └── .env.local          # Backend-specific env vars
├── packages/
│   ├── types/                  # Shared TypeScript types
│   │   ├── src/
│   │   │   ├── index.ts        # Main exports
│   │   │   ├── jam.ts          # Jam types
│   │   │   ├── participant.ts  # Participant types
│   │   │   └── profile.ts      # Profile types
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── eslint-config/          # Shared ESLint config (optional)
│       └── package.json
├── turbo.json                  # Turborepo pipeline config
├── pnpm-workspace.yaml         # Workspace definition
├── package.json                # Root package.json
├── tsconfig.base.json          # Base TypeScript config
└── .gitignore
```

### Pattern 1: Workspace Package References
**What:** Reference local packages using `workspace:*` protocol
**When to use:** Any time an app needs to import from a shared package
**Example:**
```json
// apps/web/package.json
{
  "name": "@jamia/web",
  "dependencies": {
    "@jamia/types": "workspace:*"
  }
}

// apps/backend/package.json
{
  "name": "@jamia/backend",
  "dependencies": {
    "@jamia/types": "workspace:*"
  }
}
```

### Pattern 2: Shared Types Package with Exports
**What:** Create internal package with multiple entrypoints for tree-shaking
**When to use:** Sharing TypeScript types and interfaces across apps
**Example:**
```json
// packages/types/package.json
{
  "name": "@jamia/types",
  "version": "0.0.0",
  "exports": {
    ".": {
      "types": "./src/index.ts",
      "default": "./src/index.ts"
    },
    "./jam": {
      "types": "./src/jam.ts",
      "default": "./src/jam.ts"
    },
    "./participant": {
      "types": "./src/participant.ts",
      "default": "./src/participant.ts"
    }
  }
}
```

### Pattern 3: Turborepo Pipeline with Dependencies
**What:** Define task dependencies so shared packages build before apps
**When to use:** Always - ensures correct build order
**Example:**
```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**", ".next/**", "!.next/cache/**"]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```
**Note:** `^build` means "build all dependencies first"

### Pattern 4: Selective Deployment Configuration
**What:** Configure platform-specific settings to deploy only changed apps
**When to use:** Always - prevents unnecessary deploys

**Railway (apps/backend):**
```toml
# railway.toml (at root)
[build]
builder = "NIXPACKS"
buildCommand = "pnpm build --filter=@jamia/backend"

[deploy]
startCommand = "cd apps/backend && pnpm start:prod"
watchPaths = ["/apps/backend/**", "/packages/**"]
```

**Netlify (apps/web):**
```toml
# netlify.toml (at root)
[build]
  base = "/"
  command = "pnpm build --filter=@jamia/web"
  publish = "apps/web/dist"

[build.environment]
  NODE_VERSION = "22"
  NPM_FLAGS = "--version" # Prevent npm usage

[[build.processing]]
  skip_processing = false

[build]
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF apps/web packages"
```

### Pattern 5: Environment Variable Isolation
**What:** Place .env files in app directories, not root
**When to use:** Always - prevents variable leakage
**Example:**
```
# DON'T: Root .env (variables leak to all apps)
jamia/.env

# DO: App-specific .env files
jamia/apps/web/.env.local
jamia/apps/backend/.env.local
```

### Pattern 6: Git History Preservation
**What:** Use git merge with allow-unrelated-histories to preserve commit history
**When to use:** During initial migration from separate repos
**Example:**
```bash
# Initialize new monorepo
mkdir jamia-monorepo && cd jamia-monorepo
git init
git commit --allow-empty -m "Initial commit"

# Add frontend
git remote add frontend ../jamia-fe
git fetch frontend
git merge frontend/main --allow-unrelated-histories --no-commit
# Move files to apps/web
mkdir -p apps/web
git mv * apps/web/ 2>/dev/null || true
git commit -m "Merge frontend repository"

# Add backend
git remote add backend ../jamia-be
git fetch backend
git merge backend/main --allow-unrelated-histories --no-commit
# Move files to apps/backend
mkdir -p apps/backend
git mv * apps/backend/ 2>/dev/null || true
git commit -m "Merge backend repository"
```

### Anti-Patterns to Avoid
- **Root .env file:** Environment variables leak across apps, breaks isolation
- **Deep package nesting:** Turborepo doesn't support `apps/**` or `packages/**` glob patterns
- **Relative imports across packages:** Use workspace dependencies instead (breaks when refactoring)
- **Squashing migration commits:** Loses all git history from original repos
- **Using tsconfig paths without build:** Vite/NestJS need plugins to resolve paths at runtime
- **Ignoring Turborepo cache:** Commit `.turbo` to .gitignore but configure remote cache for CI
- **Mixed package managers:** Stick to pnpm, mixing causes lockfile conflicts

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Task orchestration | Custom build scripts with dependencies | Turborepo pipeline | Handles parallel execution, caching, dependency resolution |
| Monorepo package linking | Manual symlinks or copy scripts | pnpm workspace protocol | Automatic, handles updates, supports publishing |
| Build caching | Custom hash-based cache system | Turborepo remote cache | Handles inputs/outputs, shareable across CI/team |
| Selective CI builds | Custom git diff scripts for each platform | Railway watch paths + Netlify ignore | Platform-native, maintained, reliable |
| TypeScript path resolution | Custom Vite/NestJS plugins | vite-tsconfig-paths (Vite) + tsconfig-paths (NestJS) | Battle-tested, handles edge cases |
| Environment variable validation | Manual checks in code | eslint-config-turbo + turbo.json env declarations | Catches issues at build time, not runtime |
| Git history merging | Manual commit copying | git merge --allow-unrelated-histories | Preserves full history, attribution, bisect capability |

**Key insight:** Monorepo tooling has matured significantly. Hand-rolling solutions for caching, task orchestration, or selective deployment introduces bugs and maintenance burden. Turborepo and platform-native features solve these problems comprehensively.

## Common Pitfalls

### Pitfall 1: Losing Git History During Migration
**What goes wrong:** Using naive approach (copy files, new commit) loses all history, git blame, git bisect capability
**Why it happens:** Temptation to "start fresh" without understanding git merge tools
**How to avoid:** Use `git merge --allow-unrelated-histories` or `git subtree add` to preserve full commit history
**Warning signs:** `git log` shows only one commit after migration, original contributors not attributed

### Pitfall 2: Environment Variable Leakage
**What goes wrong:** Backend secrets (SUPABASE_SERVICE_KEY) accessible to frontend build, frontend env vars to backend
**Why it happens:** Placing .env at root, not declaring vars in turbo.json
**How to avoid:**
- Place .env files in `apps/web/.env.local` and `apps/backend/.env.local`
- Declare all env vars in turbo.json `globalEnv` or task-specific `env`
- Use `eslint-config-turbo` to detect undeclared variables
**Warning signs:** Backend builds failing in CI, frontend accidentally using backend-only variables

### Pitfall 3: Broken Selective Deployment
**What goes wrong:** Shared package changes don't trigger app rebuilds, or all apps rebuild on any change
**Why it happens:** Incorrect Railway watch paths or Netlify ignore commands
**How to avoid:**
- Railway: Set watch paths to `["/apps/backend/**", "/packages/**"]`
- Netlify: Use ignore command checking both app and packages directories
- Test by making changes to shared package and verifying both apps rebuild
**Warning signs:** Frontend deploys without new shared types, backend doesn't rebuild after types change

### Pitfall 4: TypeScript Path Resolution Failures
**What goes wrong:** `import { JamDto } from '@jamia/types'` works in IDE but fails at runtime
**Why it happens:** TypeScript doesn't transpile path aliases, Vite/Node don't resolve them by default
**How to avoid:**
- For types-only: Direct TypeScript imports work (no build step)
- For Vite: Add `vite-tsconfig-paths` plugin
- For NestJS: Already uses `tsconfig-paths` via ts-node
- Prefer workspace dependencies over path aliases
**Warning signs:** Build succeeds but runtime errors with "Cannot find module"

### Pitfall 5: Turborepo Cache Invalidation Issues
**What goes wrong:** Code changes but old cached outputs used, causing stale builds
**Why it happens:** Missing files in `inputs` or `outputs` configuration
**How to avoid:**
- Include .env files in `inputs` if they affect builds
- Specify all output directories in `outputs` (dist, .next, build)
- Use `turbo run build --force` to bypass cache when debugging
**Warning signs:** Changes not reflected in build output, inconsistent behavior between local and CI

### Pitfall 6: Package.json Name Conflicts
**What goes wrong:** Workspace packages have same name, causing resolution ambiguity
**Why it happens:** Not using namespaced package names
**How to avoid:**
- Use `@jamia/` prefix for all packages
- `@jamia/web`, `@jamia/backend`, `@jamia/types`
- Never use plain names like `web` or `types`
**Warning signs:** pnpm warnings about duplicate packages, wrong package resolved

### Pitfall 7: Monorepo CI Timeouts
**What goes wrong:** First `pnpm install` in monorepo takes 5+ minutes, hits workflow timeout
**Why it happens:** Installing all dependencies for all packages, no cache configured
**How to avoid:**
- Use platform-specific pnpm caching (Netlify cache plugin, Railway build cache)
- For Railway: pnpm install happens automatically, enable build cache
- For Netlify: Use Netlify pnpm cache plugin or manual cache configuration
- Use `--filter` flags to install only needed dependencies
**Warning signs:** CI builds timing out on install step, inconsistent build times

### Pitfall 8: Nested Package Structure Errors
**What goes wrong:** Turborepo errors with "nested packages not supported"
**Why it happens:** Creating structure like `packages/ui/components` where both have package.json
**How to avoid:**
- Keep packages flat: `packages/ui`, `packages/components` (separate)
- Or use grouped globs: `packages/ui/*` but no package.json in `packages/ui/`
- Never have package.json at both `packages/a` and `packages/a/b`
**Warning signs:** Turborepo fails to detect packages, unexpected workspace resolution

## Code Examples

Verified patterns from official sources:

### Root Package.json Setup
```json
// Source: https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository
{
  "name": "jamia-monorepo",
  "private": true,
  "scripts": {
    "build": "turbo run build",
    "dev": "turbo run dev",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "turbo run format"
  },
  "devDependencies": {
    "turbo": "latest"
  },
  "packageManager": "pnpm@10.22.0",
  "engines": {
    "node": ">=22"
  }
}
```

### pnpm-workspace.yaml
```yaml
# Source: https://pnpm.io/workspaces
packages:
  - 'apps/*'
  - 'packages/*'
```

### Shared Types Package Configuration
```json
// Source: https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package
// packages/types/package.json
{
  "name": "@jamia/types",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": {
      "types": "./src/index.ts"
    },
    "./jam": {
      "types": "./src/jam.ts"
    },
    "./participant": {
      "types": "./src/participant.ts"
    },
    "./profile": {
      "types": "./src/profile.ts"
    }
  },
  "devDependencies": {
    "typescript": "^5.7.3"
  }
}
```

### Shared Types Implementation
```typescript
// Source: Jamia requirements + TypeScript best practices
// packages/types/src/jam.ts
export interface CreateJamDto {
  name: string;
  description?: string;
  location: string;
  starts_at: string;
  ends_at?: string;
  max_participants?: number;
  is_public: boolean;
}

export interface JamResponse {
  id: string;
  name: string;
  description: string | null;
  location: string;
  starts_at: string;
  ends_at: string | null;
  max_participants: number | null;
  participant_count: number;
  status: 'draft' | 'published' | 'cancelled';
  is_public: boolean;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

// packages/types/src/index.ts
export * from './jam';
export * from './participant';
export * from './profile';
```

### Turborepo Configuration
```json
// Source: https://turborepo.dev/docs/reference/configuration
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [
        "dist/**",
        ".next/**",
        "!.next/cache/**",
        "build/**"
      ]
    },
    "dev": {
      "dependsOn": ["^build"],
      "cache": false,
      "persistent": true
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "lint": {
      "cache": false
    },
    "format": {
      "cache": false
    }
  },
  "globalEnv": [
    "NODE_ENV"
  ]
}
```

### Netlify Configuration for Monorepo
```toml
# Source: https://docs.netlify.com/build/configure-builds/monorepos/
# netlify.toml
[build]
  base = "/"
  command = "pnpm build --filter=@jamia/web"
  publish = "apps/web/dist"
  ignore = "git diff --quiet $CACHED_COMMIT_REF $COMMIT_REF apps/web packages"

[build.environment]
  NODE_VERSION = "22"
```

### Railway Configuration for Monorepo
```toml
# Source: https://docs.railway.com/guides/monorepo
# railway.toml (place in root)
[build]
builder = "NIXPACKS"
buildCommand = "pnpm install && pnpm build --filter=@jamia/backend"

[deploy]
startCommand = "cd apps/backend && pnpm start:prod"
watchPaths = ["/apps/backend/**", "/packages/**"]
```

### Using Shared Types in Frontend
```typescript
// Source: Turborepo internal package usage pattern
// apps/web/src/api/jams.api.ts
import type { CreateJamDto, JamResponse } from '@jamia/types/jam';
import axios from 'axios';

export const createJam = async (data: CreateJamDto): Promise<JamResponse> => {
  const response = await axios.post('/api/jams', data);
  return response.data;
};
```

### Using Shared Types in Backend
```typescript
// Source: NestJS + shared types pattern
// apps/backend/src/jams/dto/create-jam.dto.ts
import type { CreateJamDto as ICreateJamDto } from '@jamia/types/jam';
import { IsString, IsOptional, IsBoolean, IsInt, IsDateString } from 'class-validator';

export class CreateJamDto implements ICreateJamDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  location: string;

  @IsDateString()
  starts_at: string;

  @IsOptional()
  @IsDateString()
  ends_at?: string;

  @IsOptional()
  @IsInt()
  max_participants?: number;

  @IsBoolean()
  is_public: boolean;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Lerna for monorepos | Turborepo/Nx | 2022-2024 | Lerna archived, Turborepo is lighter and faster with better caching |
| npm/yarn workspaces only | pnpm workspaces + Turborepo | 2021-2023 | pnpm more efficient, Turborepo adds caching and task orchestration |
| Manual git subtree | git merge --allow-unrelated-histories | 2020+ | Simpler workflow for simple migrations, fewer steps |
| Root .env files | App-specific .env files | 2023-2024 | Turborepo strict mode, security best practices |
| tsconfig paths everywhere | workspace: protocol | 2023-2024 | Better build performance, less configuration |
| Custom CI selective builds | Platform-native (Railway watch paths, Netlify ignore) | 2023-2025 | More reliable, less maintenance |

**Deprecated/outdated:**
- **Lerna:** Archived in 2022, no longer maintained, use Turborepo or Nx instead
- **Yarn 1.x workspaces:** Use yarn 3+ berry or switch to pnpm
- **git-filter-repo for simple merges:** Overkill for 2-repo migration, use git merge
- **Bolt/Rush:** Less popular, smaller ecosystem than Turborepo
- **Global tsconfig paths:** Use workspace dependencies for shared packages

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase migrations consolidation**
   - What we know: Both repos have `supabase/` directories with migrations
   - What's unclear: Whether migrations should be merged, kept separate, or moved to root
   - Recommendation: Keep migrations in `apps/backend/supabase/` initially, migrate to root `supabase/` later if needed (not required for phase 1)

2. **Testing strategy for monorepo**
   - What we know: Backend has Jest tests, frontend has no tests
   - What's unclear: Whether to run tests at root level or per-package
   - Recommendation: Keep tests per-package (`cd apps/backend && pnpm test`), use Turborepo to run all (`turbo test`)

3. **Biome configuration sharing**
   - What we know: Both apps use Biome with separate configs
   - What's unclear: Whether to create shared `@jamia/eslint-config` package
   - Recommendation: Start with separate configs in each app, extract to shared package only if configs need to stay 100% identical (not phase 1 requirement)

4. **Node version consistency enforcement**
   - What we know: Backend uses Node 22.9.0, need to ensure frontend uses same
   - What's unclear: How to enforce in monorepo
   - Recommendation: Add `.nvmrc` and `engines` field to root package.json, both platforms honor it

## Sources

### Primary (HIGH confidence)
- [Turborepo Official Docs](https://turborepo.dev/docs) - Introduction, features, package manager support
- [Turborepo - Structuring a Repository](https://turborepo.dev/docs/crafting-your-repository/structuring-a-repository) - Recommended structure, nesting constraints
- [Turborepo - Creating an Internal Package](https://turborepo.dev/docs/crafting-your-repository/creating-an-internal-package) - Package.json configuration, exports
- [Turborepo - Configuring Tasks](https://turborepo.dev/docs/crafting-your-repository/configuring-tasks) - Pipeline configuration, dependsOn
- [Turborepo - Using Environment Variables](https://turborepo.dev/docs/crafting-your-repository/using-environment-variables) - Env var management, isolation, strict mode
- [Railway Docs - Deploying a Monorepo](https://docs.railway.com/guides/monorepo) - Watch paths, root directory, automatic detection
- [pnpm Workspaces](https://pnpm.io/workspaces) - Workspace protocol, configuration
- [Netlify - Ignore Builds](https://docs.netlify.com/build/configure-builds/ignore-builds/) - Ignore command configuration, exit codes

### Secondary (MEDIUM confidence)
- [Netlify - Monorepos](https://docs.netlify.com/build/configure-builds/monorepos/) - Base directory, package directory, automatic detection
- [Medium - Merging Multiple Repositories Into a Monorepo Using Git Subtree](https://medium.com/@andrejkurocenko/merging-multiple-repositories-into-a-monorepo-using-git-subtree-without-losing-history-0c019046498e) - Git history preservation (Nov 2025)
- [Medium - A Step by Step Guide to Adding Turborepo to an Existing Project](https://medium.com/front-end-weekly/a-step-by-step-guide-to-adding-turborepo-to-an-existing-project-7453239d5d9f) - Migration steps
- [pnpm - Working with TypeScript](https://pnpm.io/typescript) - TypeScript + pnpm workspaces
- [LogRocket - Managing Full Stack Monorepo with pnpm](https://blog.logrocket.com/managing-full-stack-monorepo-pnpm/) - Shared types pattern

### Tertiary (LOW confidence)
- [Netlify Community Forums - Monorepo configurations](https://answers.netlify.com/) - User reports of ignore command issues, inconsistent behavior flagged for validation
- [Railway Help Station - Turborepo discussions](https://station.railway.com/) - Community discussions on monorepo deployment
- Various GitHub discussions on Turborepo and monorepo tooling

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Turborepo, pnpm, TypeScript are industry standard, verified via official docs
- Architecture: HIGH - All patterns from official Turborepo/pnpm/platform documentation
- Pitfalls: MEDIUM-HIGH - Combination of official docs warnings + community-reported issues, most verifiable
- Deployment: MEDIUM - Railway docs clear (HIGH), Netlify ignore command has community-reported inconsistencies (MEDIUM)
- Git migration: MEDIUM - Multiple approaches documented, but specific workflow needs project testing

**Research date:** 2026-01-20
**Valid until:** ~30 days (Turborepo is stable, but deployment platform features evolve monthly)

## Notes for Planner

1. **Migration can be incremental:** Turborepo can be added to existing structure first, then restructure to apps/packages
2. **Test deployments early:** Both Netlify and Railway configurations should be tested with dummy commits to verify selective deployment works
3. **Shared types is simplest shared package:** Start with types only, don't over-engineer shared UI components in phase 1
4. **pnpm already in use:** No package manager migration needed, just add workspace configuration
5. **Git history is critical:** User values existing commit history (managed jam functionality must continue working), use merge not copy
6. **Environment variables need audit:** SUPABASE_SERVICE_KEY must never be in frontend build, verify isolation
7. **Phase 1 is foundation:** Focus on working monorepo + deployments, defer advanced optimization (remote cache, shared configs)
