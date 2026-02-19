# Phase 12: E2E Testing - Research

**Researched:** 2026-02-19
**Domain:** Playwright E2E testing — browser automation, auth state, Supabase integration, mobile emulation, CI/CD
**Confidence:** HIGH (Playwright official docs verified, version confirmed via npm registry)

---

## Summary

Phase 12 adds Playwright-based E2E tests for critical user flows against a real local Supabase instance. The context decisions are clear: Chromium only, iPhone 14 mobile viewport as primary, DB reset between tests, sequential CI execution on main branch only.

Playwright 1.58.2 is the current stable version. It installs as a standalone testing framework separate from Vitest/Jest — this is the right approach since E2E tests need a real browser, not jsdom. The Playwright stack for this project is: `@playwright/test` (the only package needed), plus `playwright` CLI for browser installation.

The critical architectural decision is WHERE to place tests. This project should place E2E tests in a dedicated `e2e/` directory at the repo root or inside `apps/web/e2e/` — separate from the Vitest unit tests in `apps/web/src/`. E2E tests operate at the HTTP level against the full running app and Supabase, not at the component level.

The most important pattern for this project is **Supabase auth via storageState**: rather than UI-based login for every test, a `auth.setup.ts` project authenticates via Supabase REST API once and saves the session to a file. Other tests load that file via `storageState`. This is critical because DB reset between tests destroys sessions — the setup project must run AFTER the DB reset, not before.

The DB reset strategy (reset before each test) is expensive but reliable. In practice, "before each test" in Playwright terms means running `npx supabase db reset --yes` in a `beforeEach` hook via `execSync`, which takes ~5-15 seconds per test. Given Chromium-only + sequential execution, total test suite runtime should be manageable. A global setup that resets once per test FILE (not per test) is a reasonable middle ground for large files.

**Primary recommendation:** Place E2E tests in `apps/web/e2e/`, use `playwright.config.ts` with a Chromium-only project configured with iPhone 14 device emulation, implement auth via Supabase REST API + storageState, use global setup for DB reset (per-file), and the page object model pattern for maintainability.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @playwright/test | 1.58.2 | Test runner, browser automation, assertions | Official Playwright package; includes everything (runner, API, assertions, fixtures) |
| playwright | 1.58.2 | Browser binaries (installed via CLI) | Required browsers: Chromium only per decisions |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| dotenv | already in web devDeps | Load env vars in playwright.config.ts | Load SUPABASE_URL, API_URL for test setup |
| child_process (built-in) | Node.js built-in | Run `supabase db reset` in setup | DB reset between tests |
| @supabase/supabase-js | already in web deps | REST API auth in setup project | Create Supabase session without UI |

### No New Test Framework
Playwright is **separate from Vitest**. Do NOT add Playwright to `vitest.config.ts` or use it as a Vitest provider. Playwright has its own `playwright.config.ts` and its own test runner invoked with `pnpm playwright test`.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Playwright | Cypress | Playwright has better mobile emulation, faster execution, built-in mobile devices API |
| UI-based auth login | Supabase REST API auth | UI login is slow and breaks with DB resets; REST API auth is faster and more reliable |
| Per-test DB reset | Per-file DB reset | Per-test is slower but pristine; per-file is faster but requires careful test ordering |
| iPhone 14 via devices API | Custom viewport | `devices['iPhone 14']` includes correct user agent, touch events, pixel ratio — more accurate emulation |

**Installation (from `apps/web/`):**
```bash
pnpm add -D @playwright/test
npx playwright install chromium
```

Or from root:
```bash
pnpm --filter @jamia/web add -D @playwright/test
cd apps/web && npx playwright install chromium
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── playwright.config.ts          # Playwright config (separate from vitest.config.ts)
├── e2e/
│   ├── fixtures/
│   │   └── index.ts              # Custom fixtures (authenticated page, etc.)
│   ├── pages/                    # Page Object Models
│   │   ├── AuthPage.ts
│   │   ├── DashboardPage.ts
│   │   ├── CreateEventPage.ts
│   │   ├── DiscoverPage.ts
│   │   └── JamDetailsPage.ts
│   ├── setup/
│   │   ├── auth.setup.ts         # Auth setup project — runs after DB reset
│   │   └── db.setup.ts           # DB reset setup project — runs first
│   └── tests/
│       ├── auth.spec.ts          # Authentication flow tests
│       ├── event-creation.spec.ts # Event creation wizard tests
│       ├── discovery.spec.ts     # Event discovery/search tests
│       └── jam-participation.spec.ts # Jam join/cancel/waitlist tests
├── .auth/
│   └── alice.json                # Saved auth state (gitignored)
├── playwright-report/            # HTML reports (gitignored)
└── test-results/                 # Artifacts (gitignored)
```

**Add to `apps/web/.gitignore`:**
```
.auth/
playwright-report/
test-results/
```

### Pattern 1: playwright.config.ts — Core Configuration

**What:** Central configuration file for all Playwright settings
**When to use:** Always — one config file controls everything

```typescript
// apps/web/playwright.config.ts
// Source: https://playwright.dev/docs/test-configuration (official docs)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Test directory
  testDir: './e2e/tests',

  // Run tests sequentially (required for DB reset approach)
  fullyParallel: false,
  workers: 1,

  // Fail fast in CI
  forbidOnly: !!process.env.CI,

  // No retries (DB reset makes each test pristine)
  retries: 0,

  // Reporters: HTML for local, dot for CI
  reporter: process.env.CI
    ? [['dot'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['html', { open: 'on-failure' }]],

  // Shared settings for all tests
  use: {
    // Base URL — Vite dev server
    baseURL: 'http://localhost:8080',

    // Capture artifacts on failure
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // Projects (browsers + auth states)
  projects: [
    // ---- Setup: DB reset first ----
    {
      name: 'db-reset',
      testMatch: /db\.setup\.ts/,
    },

    // ---- Setup: Auth (runs after DB reset, saves session) ----
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      dependencies: ['db-reset'],
    },

    // ---- Main: Mobile (iPhone 14) — primary per decisions ----
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 14'],
      },
      dependencies: ['auth-setup'],
    },
  ],

  // Start Vite dev server before tests
  webServer: {
    command: 'pnpm dev:web',  // or 'vite' from apps/web
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

**Note on webServer command:** The `pnpm dev:web` command must start ONLY the frontend (not Supabase or backend). Supabase must already be running when tests start. In CI, Supabase is started separately before the test run.

### Pattern 2: DB Reset Setup Project

**What:** Runs `supabase db reset` once before all tests
**When to use:** This is the global teardown/setup that resets DB state

```typescript
// apps/web/e2e/setup/db.setup.ts
// Source: Playwright project dependencies pattern + supabase CLI
import { test as setup } from '@playwright/test';
import { execSync } from 'child_process';
import path from 'path';

setup('reset database', async () => {
  console.log('[DB Setup] Resetting Supabase database...');

  // Run from apps/web directory where supabase config lives
  const webDir = path.resolve(__dirname, '../../');

  try {
    execSync('npx supabase db reset --yes', {
      cwd: webDir,
      stdio: 'inherit',
      timeout: 60_000,  // 60 second timeout for db reset
    });
    console.log('[DB Setup] Database reset complete.');
  } catch (error) {
    console.error('[DB Setup] Database reset failed:', error);
    throw error;
  }
});
```

**IMPORTANT:** The DB reset includes the seed.sql which creates test users (alice, bob, charlie, diana). After reset, those users exist and auth.setup.ts can use them.

### Pattern 3: Auth Setup via Supabase REST API

**What:** Authenticates test users via REST API (not UI) and saves storageState
**When to use:** Must run after db-reset, before main tests

```typescript
// apps/web/e2e/setup/auth.setup.ts
// Source: https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test
// + Playwright storageState docs
import { test as setup, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

const SUPABASE_URL = 'http://127.0.0.1:54421';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
// Note: This is the local dev anon key — not a secret, safe to hardcode

// Auth state file location
const AUTH_DIR = path.resolve(__dirname, '../../.auth');
export const ALICE_AUTH_STATE = path.join(AUTH_DIR, 'alice.json');

setup('authenticate as alice', async ({ page }) => {
  // Ensure .auth directory exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  // Sign in via Supabase REST API — faster and more reliable than UI login
  const response = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        email: 'alice@example.com',
        password: 'password123',
      }),
    }
  );

  expect(response.ok).toBeTruthy();
  const session = await response.json();

  // Inject the session into browser localStorage
  // Supabase stores auth token at key: sb-{projectRef}-auth-token
  // Local project ref from config.toml: fuddhnsjxumqhdquvchx
  await page.goto('/');
  await page.evaluate((data) => {
    localStorage.setItem(
      `sb-fuddhnsjxumqhdquvchx-auth-token`,
      JSON.stringify({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_at: Math.floor(Date.now() / 1000) + data.expires_in,
        token_type: 'bearer',
        user: data.user,
      })
    );
  }, session);

  // Save storage state (includes localStorage with auth token)
  await page.context().storageState({ path: ALICE_AUTH_STATE });
});
```

**The localStorage key** is `sb-{projectRef}-auth-token`. The project ref comes from `apps/web/supabase/config.toml`: `project_id = "fuddhnsjxumqhdquvchx"`. So the key is `sb-fuddhnsjxumqhdquvchx-auth-token`.

### Pattern 4: Using Auth State in Tests

**What:** Tests start already authenticated without running through login UI
**When to use:** All tests that require an authenticated user

```typescript
// In playwright.config.ts projects section — mobile-chromium project
{
  name: 'mobile-chromium',
  use: {
    ...devices['iPhone 14'],
    storageState: 'apps/web/.auth/alice.json',  // All tests start authenticated as alice
  },
  dependencies: ['auth-setup'],
},

// For tests that need NO auth (e.g., auth flow tests themselves):
// Don't use storageState — start fresh
// Override in test file with test.use({ storageState: { cookies: [], origins: [] } })
```

### Pattern 5: Page Object Model (POM)

**What:** Classes that encapsulate page interactions, reducing test code duplication
**When to use:** Any flow with more than 3-4 steps; all flows in this phase qualify

```typescript
// apps/web/e2e/pages/AuthPage.ts
// Source: https://playwright.dev/docs/pom (official docs)
import { type Page, type Locator, expect } from '@playwright/test';

export class AuthPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupToggle: Locator;
  readonly nameInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.getByLabel('Email');
    this.passwordInput = page.getByLabel('Password');
    this.loginButton = page.getByRole('button', { name: 'Accedi' });
    this.signupToggle = page.getByRole('button', { name: /Non hai un account/ });
    this.nameInput = page.getByLabel('Nome');
    this.confirmPasswordInput = page.getByLabel('Conferma Password');
    this.registerButton = page.getByRole('button', { name: 'Registrati' });
  }

  async goto() {
    await this.page.goto('/auth');
  }

  async signIn(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async signUp(name: string, email: string, password: string) {
    await this.signupToggle.click();
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);
    await this.registerButton.click();
  }
}
```

```typescript
// apps/web/e2e/pages/CreateEventPage.ts
import { type Page, type Locator } from '@playwright/test';

export class CreateEventPage {
  readonly page: Page;
  readonly nextButton: Locator;
  readonly submitButton: Locator;

  constructor(page: Page) {
    this.page = page;
    // Use getByRole with name matching Italian UI text
    this.nextButton = page.getByRole('button', { name: /Avanti|Continua/i });
    this.submitButton = page.getByRole('button', { name: /Pubblica|Crea/i });
  }

  async goto() {
    await this.page.goto('/create-event');
  }

  async selectEventType(type: 'jam' | 'class' | 'workshop' | 'convention') {
    // Event type cards are clickable — find by text
    await this.page.getByText(type, { exact: false }).first().click();
    await this.nextButton.click();
  }

  async fillSchedule(opts: {
    title: string;
    date: string;     // format: DD/MM/YYYY
    time: string;     // format: HH:MM
  }) {
    await this.page.getByLabel(/Titolo/i).fill(opts.title);
    // Date and time fields as needed
    await this.nextButton.click();
  }
}
```

### Pattern 6: Custom Fixtures for Auth

**What:** Custom fixture that provides authenticated page for tests needing auth
**When to use:** Tests where you need to vary auth state per test

```typescript
// apps/web/e2e/fixtures/index.ts
// Source: https://playwright.dev/docs/test-fixtures (official docs)
import { test as base, type Page } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { ALICE_AUTH_STATE } from '../setup/auth.setup';

type Fixtures = {
  authenticatedPage: Page;
  authPage: AuthPage;
};

export const test = base.extend<Fixtures>({
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },

  // Provides a page pre-loaded with alice's auth state
  authenticatedPage: async ({ browser }, use) => {
    const context = await browser.newContext({
      storageState: ALICE_AUTH_STATE,
      ...require('@playwright/test').devices['iPhone 14'],
    });
    const page = await context.newPage();
    await use(page);
    await context.close();
  },
});

export { expect } from '@playwright/test';
```

### Pattern 7: Test Structure for a Flow

**What:** How to write a complete test for a user flow
**When to use:** All E2E tests in this phase

```typescript
// apps/web/e2e/tests/auth.spec.ts
import { test, expect } from '../fixtures';
// OR import directly from @playwright/test if not using custom fixtures
// import { test, expect } from '@playwright/test';

// Clear auth state for auth tests — these test auth flow, not post-auth state
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication flows', () => {
  test('sign in with existing account redirects to dashboard', async ({ page }) => {
    await page.goto('/auth');

    // Use label-based locators — most resilient
    await page.getByLabel('Email').fill('alice@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Accedi' }).click();

    // Wait for navigation
    await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });
  });

  test('sign in with wrong password shows error', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel('Email').fill('alice@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Accedi' }).click();

    // Error should appear — check for Italian error text
    await expect(page.getByText(/Invalid login credentials/i)).toBeVisible();
  });
});
```

### Pattern 8: Per-Test DB Reset Strategy

The context decision is "reset DB before each test." This is the most reliable but slowest approach. In Playwright with sequential execution, the practical approach is:

**Option A — DB reset in global setup only (per test file run):**
The `db.setup.ts` project runs ONCE before all tests start. This is fast but means tests can pollute each other.

**Option B — Per-test reset via `beforeEach` in each test file:**
```typescript
// apps/web/e2e/tests/event-creation.spec.ts
import { execSync } from 'child_process';
import path from 'path';

const webDir = path.resolve(__dirname, '../../../');

test.beforeEach(async () => {
  execSync('npx supabase db reset --yes', {
    cwd: webDir,
    stdio: 'pipe',
    timeout: 60_000,
  });
});
```

**Recommendation:** Start with Option A (per-run global reset) for speed. If tests are flaky due to state pollution, add per-test reset to specific failing test files. The auth state file must be regenerated after each DB reset (add auth setup after db reset in the setup chain).

**Practical timing:** `supabase db reset` takes ~10-20 seconds. With ~15 tests, per-test reset = 2.5-5 minutes added. Per-run reset = negligible. Start with per-run.

### Pattern 9: Handling Google Maps in Tests

The `ProfileSetup` page and event creation use Google Maps autocomplete. This is a third-party integration that MUST be mocked in E2E tests.

```typescript
// Mock Google Maps API in playwright.config.ts or per-test
// Route all Google Maps requests to a static mock response

// In test or fixture:
await page.route('**/maps.googleapis.com/**', route => {
  route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ predictions: [], status: 'ZERO_RESULTS' }),
  });
});
```

**Alternative:** Set `VITE_GOOGLE_MAPS_API_KEY` to empty string in test env. The `useGoogleMaps` hook should gracefully degrade when the key is missing.

### Pattern 10: Locator Priority Hierarchy

Based on Playwright official docs, use this priority order:
1. `page.getByRole('button', { name: 'Accedi' })` — preferred; most resilient
2. `page.getByLabel('Email')` — for form inputs with labels
3. `page.getByPlaceholder('tua@email.it')` — for inputs without labels
4. `page.getByText('Bentornato')` — for text content
5. `page.getByTestId('submit-button')` — last resort; requires adding `data-testid` to components

**For this codebase:** The app uses Italian text. Locators should match actual Italian UI strings or use `{ name: /pattern/i }` for case-insensitive partial matches.

### Anti-Patterns to Avoid

- **Running Playwright tests alongside Vitest in the same config:** Keep completely separate — different commands, different configs, different reporters.
- **Auth via UI login for every test:** Each UI login takes 2-5 seconds and can be flaky. Use Supabase REST API + storageState.
- **Using `page.waitForTimeout(2000)`:** Playwright has auto-waiting. Use `await expect(locator).toBeVisible()` instead.
- **CSS class selectors:** `page.locator('.btn-primary')` breaks when styles change. Use role-based selectors.
- **Capturing screenshots manually:** Configure `screenshot: 'only-on-failure'` in `playwright.config.ts` — automatic on failure.
- **Forgetting `test.use({ storageState: {...} })` for auth tests:** Auth flow tests must clear storageState or they start already logged in.
- **Using `workers > 1` with shared DB:** Parallel workers hitting the same Supabase instance with DB resets cause catastrophic test failures.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Browser automation | Custom puppeteer wrappers | `@playwright/test` page API | Playwright has auto-waiting, network interception, mobile emulation built-in |
| Mobile viewport config | Manual viewport setting | `devices['iPhone 14']` from Playwright | Includes correct user agent, touch support, pixel ratio — not just size |
| Auth state persistence | Manual cookie/localStorage management | Playwright `storageState` | Saves and loads complete browser context state reliably |
| Test isolation | Global `beforeEach` that restores everything | Playwright test projects with `dependencies` | Clean dependency chain: db-reset → auth-setup → tests |
| Wait for element | `waitForTimeout` | `expect(locator).toBeVisible()` | Auto-waits with configurable timeout, retries until success or timeout |
| Trace/screenshot collection | Manual file writes | `use.screenshot: 'only-on-failure'`, `use.trace: 'on-first-retry'` | Playwright collects artifacts automatically on failure |
| API calls in tests | Axios in test files | `page.route()` to intercept OR let real API run | E2E tests hit real API (that's the point); only mock third-party (Google Maps) |

**Key insight:** The value of E2E tests is that they run against the REAL system. Don't mock the NestJS API or Supabase — they're the thing being tested. Only mock external dependencies (Google Maps, email delivery).

---

## Common Pitfalls

### Pitfall 1: Auth State Lost After DB Reset

**What goes wrong:** DB reset deletes auth.users records. The session tokens saved in `.auth/alice.json` are now invalid. Tests get redirected to `/auth` instead of running authenticated flows.
**Why it happens:** `supabase db reset` truncates `auth.users` and re-seeds. The storageState file has a JWT referencing a user that no longer exists.
**How to avoid:** The setup project dependency chain MUST be: `db-reset` → `auth-setup` → tests. The auth setup runs AFTER the DB reset, creating fresh sessions against the fresh users. Never use old storageState files across DB resets.
**Warning signs:** Tests always redirect to `/auth` page; authenticated tests start on the login page.

### Pitfall 2: `supabase db reset` Hangs Without TTY

**What goes wrong:** `execSync('npx supabase db reset --yes')` hangs forever in CI.
**Why it happens:** Supabase CLI may check for confirmation even with `--yes` flag if stdin is a TTY. In CI there's no TTY.
**How to avoid:** Pass `stdio: 'pipe'` (not `'inherit'`) in `execSync` options for CI. Use `--yes` flag. Or set env var `SUPABASE_CLI_TIMEOUT=120`.
**Warning signs:** Setup step never completes; workflow times out at the DB reset step.

### Pitfall 3: Supabase localStorage Key Mismatch

**What goes wrong:** Session is written to localStorage but Supabase client doesn't read it — user is not authenticated.
**Why it happens:** The localStorage key is `sb-{projectRef}-auth-token` where `projectRef` comes from `supabase/config.toml`'s `project_id`. If you get this wrong, the session is stored at the wrong key.
**How to avoid:** Verify the project ID: `apps/web/supabase/config.toml` has `project_id = "fuddhnsjxumqhdquvchx"`. The key is `sb-fuddhnsjxumqhdquvchx-auth-token`.
**Warning signs:** `localStorage.getItem('sb-fuddhnsjxumqhdquvchx-auth-token')` is null after auth setup; page shows as unauthenticated.

### Pitfall 4: Google Maps Requests Breaking Tests

**What goes wrong:** Profile setup and event creation tests hang or fail because Google Maps API isn't available in test environment.
**Why it happens:** `useGoogleMaps` hook loads Google Maps API and autocomplete requests are made. Without a valid API key or network access in CI, the component gets stuck loading.
**How to avoid:** In `playwright.config.ts`, add a route handler for all Google Maps requests returning empty predictions. Or set `VITE_GOOGLE_MAPS_API_KEY=''` in test env and ensure the hook degrades gracefully.
**Warning signs:** Event creation or profile setup tests time out at location/city input steps.

### Pitfall 5: Vite Dev Server Not Ready When Tests Start

**What goes wrong:** Tests start before Vite has compiled and the dev server is up; navigation to `/auth` fails with connection refused.
**Why it happens:** `webServer` in `playwright.config.ts` waits for the `url` to respond, but only checks it once. If Vite hasn't compiled yet, the check may pass for the server's 404 handler even before React is ready.
**How to avoid:** Set `webServer.timeout: 120_000` and `reuseExistingServer: !process.env.CI`. In CI, ensure `pnpm build` or a warm-up request is done. Use `webServer.url` pointing to a specific route that only works after React loads.
**Warning signs:** Tests fail immediately with "Failed to load" or React error boundary on first navigation.

### Pitfall 6: Mobile Touch Events Not Working

**What goes wrong:** Tapping UI elements on mobile viewport doesn't trigger click handlers.
**Why it happens:** Using `devices['iPhone 14']` from Playwright sets `hasTouch: true` but some React event handlers use `onClick` which should handle touch — this is usually fine. The issue is with Radix UI components that check for `onPointerDown`. In Playwright's Chromium with touch emulation, pointer events are dispatched correctly.
**How to avoid:** Use `locator.tap()` instead of `locator.click()` for mobile tests where touch behavior matters. In most cases `click()` works correctly with Chromium's touch emulation.
**Warning signs:** Radix UI dropdowns, date pickers, or modals don't open when tapped.

### Pitfall 7: Backend Not Running During Tests

**What goes wrong:** E2E tests test the full stack but the NestJS backend isn't started — API calls return 500/connection refused.
**Why it happens:** `webServer` in `playwright.config.ts` only starts the Vite dev server, not the NestJS backend or Supabase.
**How to avoid:** The `webServer` config can accept an array of commands: start both Vite and NestJS. OR ensure the pre-test setup script (or CI workflow) starts all services before running Playwright. The simplest approach: have a single `pnpm dev:all` script that starts both, and configure `webServer` to use it.
**Warning signs:** API calls return 500 or ERR_CONNECTION_REFUSED for `localhost:3000` requests.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Complete playwright.config.ts

```typescript
// apps/web/playwright.config.ts
// Source: https://playwright.dev/docs/test-configuration (official docs)
import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,    // Sequential — required with DB reset approach
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['html', { open: 'on-failure' }], ['list']],

  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    // Default locale for the app
    locale: 'it-IT',
  },

  projects: [
    // Step 1: Reset DB (runs once before everything)
    {
      name: 'db-reset',
      testMatch: /db\.setup\.ts/,
    },
    // Step 2: Authenticate (runs after DB reset, saves session)
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      dependencies: ['db-reset'],
    },
    // Step 3: Run tests on iPhone 14 (primary per context decisions)
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 14'],
        storageState: path.join(__dirname, '.auth/alice.json'),
      },
      dependencies: ['auth-setup'],
    },
  ],

  // Start Vite dev server (assumes backend is already running or started externally)
  webServer: {
    command: 'pnpm dev',          // Starts all services including backend
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

### Auth Flow Test (no storageState)

```typescript
// apps/web/e2e/tests/auth.spec.ts
import { test, expect } from '@playwright/test';

// Auth tests start unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Authentication - Sign In', () => {
  test('signs in with valid credentials and lands on dashboard', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel('Email').fill('alice@example.com');
    await page.getByLabel('Password').fill('password123');
    await page.getByRole('button', { name: 'Accedi' }).click();

    // Wait for redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 10_000 });
    // Check dashboard loaded
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/auth');

    await page.getByLabel('Email').fill('alice@example.com');
    await page.getByLabel('Password').fill('wrongpassword');
    await page.getByRole('button', { name: 'Accedi' }).click();

    // Supabase returns "Invalid login credentials" error
    await expect(
      page.getByText(/Invalid login credentials|credenziali/i)
    ).toBeVisible({ timeout: 5_000 });

    // Should NOT navigate away from /auth
    await expect(page).toHaveURL('/auth');
  });
});

test.describe('Authentication - Sign Up', () => {
  test('registers new user and redirects to email confirmation', async ({ page }) => {
    await page.goto('/auth');

    // Switch to signup mode
    await page.getByRole('button', { name: /Non hai un account/i }).click();

    await page.getByLabel('Nome').fill('Test User');
    await page.getByLabel('Email').fill(`test-${Date.now()}@example.com`);
    // Use specific label match to distinguish Password from Conferma Password
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByLabel('Conferma Password').fill('password123');
    await page.getByRole('button', { name: 'Registrati' }).click();

    // After signup, should redirect to email confirmation
    await expect(page).toHaveURL('/email-confirmation', { timeout: 10_000 });
  });
});
```

### Event Creation Flow Test

```typescript
// apps/web/e2e/tests/event-creation.spec.ts
import { test, expect } from '@playwright/test';
// storageState comes from playwright.config.ts (alice.json) — no override needed

test('creates a jam event through the wizard', async ({ page }) => {
  await page.goto('/create-event');

  // Wait for wizard to load
  await expect(page.getByText(/Crea.*evento/i)).toBeVisible();

  // Step 1: Event type
  // Click on "Jam" card
  await page.getByText('jam', { exact: false }).first().click();
  await page.getByRole('button', { name: /Avanti|Continua/i }).click();

  // Step 2: Schedule
  await page.getByLabel(/Titolo/i).fill('Test Jam Playwright');
  // Navigate to next step (date/location fills would be complex — focus on title)
  await page.getByRole('button', { name: /Avanti|Continua/i }).click();

  // Step 3: Image (skip)
  await page.getByRole('button', { name: /Avanti|Salta/i }).click();

  // Step 4: Preview / Submit
  await expect(page.getByText('Test Jam Playwright')).toBeVisible();
  await page.getByRole('button', { name: /Pubblica|Crea/i }).click();

  // After successful creation, navigate to event detail
  await expect(page).toHaveURL(/\/events\//, { timeout: 15_000 });
});
```

### GitHub Actions Workflow

```yaml
# .github/workflows/playwright.yml
# Source: https://playwright.dev/docs/ci-intro (official docs)
name: Playwright E2E Tests

on:
  push:
    branches: [main]

jobs:
  e2e-tests:
    name: E2E Tests (Chromium)
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 10

      - uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers (Chromium only)
        run: pnpm --filter @jamia/web exec playwright install chromium --with-deps

      - name: Start Supabase
        working-directory: apps/web
        run: npx supabase start

      - name: Build and run backend in background
        run: pnpm --filter @jamia/backend start:prod &
        # OR if no build step: pnpm --filter @jamia/backend start:dev &

      - name: Run Playwright tests
        working-directory: apps/web
        run: pnpm exec playwright test
        env:
          CI: true
          VITE_SUPABASE_URL: http://127.0.0.1:54421
          VITE_SUPABASE_PUBLISHABLE_KEY: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
          VITE_API_URL: http://localhost:3000
          VITE_GOOGLE_MAPS_API_KEY: ''  # Disable Google Maps in CI

      - name: Upload test report
        uses: actions/upload-artifact@v4
        if: ${{ !cancelled() }}
        with:
          name: playwright-report
          path: apps/web/playwright-report/
          retention-days: 30
```

**Note on `pnpm test:e2e` script:** Add to `apps/web/package.json`:
```json
"scripts": {
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:e2e:headed": "playwright test --headed"
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Cypress | Playwright | 2022-2024 | Playwright has better mobile emulation, no same-origin restrictions, faster |
| UI login for every test | `storageState` reuse | Playwright 1.20+ | Major speed improvement; login once per test run not per test |
| `globalSetup` for db init | Project dependencies | Playwright 1.31+ | Full tracing + Playwright fixtures available in setup |
| `page.waitForSelector()` | `expect(locator).toBeVisible()` | Playwright 1.14+ | Auto-retrying assertions are more stable |
| `page.click()` | `page.getByRole().click()` | Playwright 1.18+ | Semantic locators survive DOM restructuring |
| WebKit for iOS | Chromium with device emulation | Current recommendation | Real iOS requires Xcode; Chromium emulation is sufficient for web testing |

**Deprecated/outdated:**
- `page.waitForNavigation()`: Deprecated in Playwright 1.26; use `await page.goto()` with waitUntil option, or `await expect(page).toHaveURL(...)`.
- `page.$()` / `page.$$()`: Replaced by `page.locator()` API. Don't use old $ selectors.
- CSS class-based selectors: Fragile against UI refactoring. Use role/label/text selectors.

---

## Flow-Specific Notes

Based on codebase analysis of the critical flows:

### Authentication Flow
- Auth page at `/auth` has login/signup toggle on the SAME page (not separate routes)
- Sign up sends email confirmation → `/email-confirmation` page
- Sign in redirects to `/dashboard` if email is confirmed
- Auth uses Supabase directly (not via NestJS API) — this is correct for E2E tests
- Google OAuth is present but CANNOT be tested in Playwright E2E (requires browser popup)

### Event Creation Flow
- 4 steps for jams, 5 steps for class/workshop/convention (teachers step added)
- Step 3 (image) can be skipped
- Auto-saves as draft via `useAutoSave` hook
- Final submission may update draft (if auto-save ran) or create fresh event
- Tests must handle wizard navigation: "Avanti" button advances, "Indietro" goes back

### Event Discovery Flow
- `/discover` renders `UnifiedEventView` which has grid/calendar toggle
- `UnifiedFilters` component — location, type, radius filters
- Location search uses Google Maps API — MUST be mocked
- Results are shown via `EventCardGrid` component

### Jam Participation Flow
- Jams are at `/jam/:id` route
- `BookingSection` has Join/Cancel buttons
- Waitlist logic in `JamDetailsLayout`
- This flow requires a jam with `manage_participants = true` and capacity set

---

## Open Questions

1. **Backend startup in webServer config**
   - What we know: `playwright.config.ts` `webServer` starts Vite. The NestJS backend must also be running for API calls.
   - What's unclear: Whether to start both in `webServer` array, or require manual start, or use a CI service.
   - Recommendation: Add `webServer` as an array with both Vite and NestJS start commands. Local: `reuseExistingServer: true` assumes both are running. CI: start both in workflow.

2. **DB reset granularity (per test vs per file vs per run)**
   - What we know: User decision is "reset DB before each test." But per-test reset with `supabase db reset` takes 10-20 seconds per test.
   - What's unclear: Whether 15 tests × 15 seconds = 3.75 minutes of reset time is acceptable.
   - Recommendation: Implement per-run reset (in `db.setup.ts`) first. Add per-file reset to specific test files if state pollution becomes an issue. Document the decision in the config.

3. **Seeded users email confirmation state**
   - What we know: `seed.sql` creates test users. But Supabase may not mark them as `email_confirmed` unless the seed explicitly sets `email_confirmed_at`.
   - What's unclear: Whether alice/bob/charlie have `email_confirmed_at` set in the current seed.
   - Recommendation: Check `apps/web/supabase/seed.sql` — if `email_confirmed_at` is not set, add it. Auth tests that sign in as alice will redirect to `/email-confirmation` instead of `/dashboard` if not confirmed.

4. **Google Maps dependency in ProfileSetup and EventScheduleStep**
   - What we know: `useGoogleMaps` hook is used in ProfileSetup for city autocomplete and in event creation for location.
   - What's unclear: Whether the hook gracefully degrades (shows plain input) when API key is empty.
   - Recommendation: Before writing E2E tests for these flows, check `useGoogleMaps` hook behavior with empty key. If it throws or hangs, add `page.route()` mock for Google APIs globally in `playwright.config.ts` `use.extraHTTPHeaders` or per-test.

5. **Jam participation test data**
   - What we know: Jam tests need a jam with specific properties (managed participants, capacity set).
   - What's unclear: Whether the current seed creates jams with these properties.
   - Recommendation: Extend `seed.sql` with specific test jams that have predictable IDs, capacity limits, and managed participants. Tests can then navigate directly to `/jam/{known-id}`.

---

## Sources

### Primary (HIGH confidence)
- `npm view @playwright/test version` → 1.58.2 (verified directly)
- https://playwright.dev/docs/test-configuration — Official playwright.config.ts reference
- https://playwright.dev/docs/auth — Official authentication patterns (storageState, setup projects)
- https://playwright.dev/docs/emulation — Official mobile device emulation (devices API)
- https://playwright.dev/docs/pom — Official Page Object Model pattern
- https://playwright.dev/docs/best-practices — Official selector and isolation guidance
- https://playwright.dev/docs/test-global-setup-teardown — Official setup/teardown patterns (project dependencies)
- https://playwright.dev/docs/ci-intro — Official GitHub Actions workflow
- `apps/web/supabase/config.toml` — Project ref `fuddhnsjxumqhdquvchx` for localStorage key
- `apps/web/src/integrations/supabase/client.ts` — `flowType: "pkce"` and localStorage storage config

### Secondary (MEDIUM confidence)
- https://mokkapps.de/blog/login-at-supabase-via-rest-api-in-playwright-e2e-test — Supabase REST API auth pattern; localStorage key format verified against supabase-js source behavior
- https://playwright.dev/docs/ci — GitHub Actions workflow YAML structure

### Tertiary (LOW confidence)
- WebSearch result on Supabase + Playwright DB reset patterns — multiple sources agree on `supabase db reset` approach in setup; not from official Playwright docs
- WebSearch result on pnpm + Playwright monorepo CI — pnpm/action-setup@v4 recommendation; not from official Playwright docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Playwright 1.58.2 verified via npm registry; no competing framework involved
- Architecture: HIGH — Project dependencies pattern, storageState, POM all from official Playwright docs
- Auth via REST API: MEDIUM — Core approach from official Playwright auth docs; Supabase-specific localStorage key verified from codebase (config.toml project_id)
- Pitfalls: HIGH for DB-reset/auth-state interaction (logical analysis of the systems), MEDIUM for Google Maps issues (from codebase analysis), MEDIUM for localStorage key mismatch (verified from config.toml)

**Research date:** 2026-02-19
**Valid until:** 2026-05-19 (Playwright releases frequently but maintains API stability; check for version updates if @playwright/test is not pinned)
