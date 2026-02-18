# Phase 10: Frontend Testing Infrastructure - Research

**Researched:** 2026-02-18
**Domain:** Frontend testing — Vitest, React Testing Library, MSW, React Query testing patterns
**Confidence:** HIGH (core stack verified via npm registry + official docs)

---

## Summary

Phase 10 establishes a frontend testing foundation from zero — the `apps/web/` directory has no testing infrastructure at all (no Vitest, no RTL, no test files). The research focused on the correct stack for this exact project setup: React 18 + Vite 5.4.x + TanStack Query v5 + React Hook Form + Zod + react-i18next + Shadcn/ui (Radix UI primitives).

**Critical version constraint discovered:** Vitest 4.x requires Vite 6+. This project uses Vite 5.4.x. The correct choice is **Vitest 3.2.4** (latest in the v3 line, supports Vite 5.x through 7.x). Using Vitest 4 would force an unrelated Vite upgrade that is out of scope for this phase.

The standard pattern for React+Vite testing in 2025 is: Vitest (framework) + jsdom (DOM environment) + @testing-library/react (component rendering) + @testing-library/user-event v14 (interaction simulation) + @testing-library/jest-dom (DOM matchers) + MSW 2.x (API mocking). This combination is verified across official documentation and production codebases.

**Primary recommendation:** Install Vitest 3.2.4 with React Testing Library 16.x, use MSW 2.x for API mocking, create a `src/test/` utilities directory with shared wrappers for React Query and i18n, and write tests co-located as `ComponentName.test.tsx` alongside source files.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| vitest | 3.2.4 | Test runner, framework, mocking | Native ESM, reuses Vite config, no Babel needed, Jest-compatible API |
| jsdom | latest | DOM environment for Node.js tests | More complete browser emulation than happy-dom; needed for Radix UI |
| @testing-library/react | 16.3.2 | Component rendering and querying | Standard React testing approach; queries by accessibility role |
| @testing-library/user-event | 14.6.1 | Realistic user interaction simulation | Fires complete event chains (critical for Radix UI components) |
| @testing-library/jest-dom | 6.9.1 | DOM assertion matchers | `toBeInTheDocument`, `toHaveValue`, etc. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| msw | 2.12.10 | HTTP request interception | Testing components/hooks that call backend API |
| @vitest/coverage-v8 | 3.2.4 | Code coverage reports | Run with `vitest run --coverage` |
| vite-tsconfig-paths | latest | Resolves `@/` path alias in tests | Required since project uses `@/*` alias |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| jsdom | happy-dom | happy-dom is faster but less complete; Radix UI needs PointerEvent and ResizeObserver shims that work better with jsdom |
| MSW | vi.mock API calls | MSW intercepts at network level; vi.mock is tighter coupling to implementation |
| Vitest 4.x | (this project can't use it) | Requires Vite 6+; project is on Vite 5.4.x — stay on Vitest 3.x |
| @vitest/coverage-v8 | @vitest/coverage-istanbul | v8 is faster; since Vitest 3.2.0 it uses AST remapping for accuracy equal to Istanbul |

**Installation (from `apps/web/`):**
```bash
pnpm add -D vitest@3.2.4 jsdom @testing-library/react @testing-library/user-event @testing-library/jest-dom msw @vitest/coverage-v8@3.2.4 vite-tsconfig-paths
```

---

## Architecture Patterns

### Recommended Project Structure
```
apps/web/
├── vitest.config.ts          # Vitest config (extends vite.config.ts)
├── src/
│   ├── test/                 # Shared test utilities
│   │   ├── setup.ts          # Global test setup (jest-dom, global mocks)
│   │   ├── render-utils.tsx  # Custom render with all providers
│   │   ├── msw-handlers.ts   # Default MSW request handlers
│   │   └── msw-server.ts     # MSW server setup
│   ├── components/
│   │   ├── events/
│   │   │   ├── EventCard.tsx
│   │   │   └── EventCard.test.tsx   # Co-located test file
│   │   └── forms/
│   │       └── SomeForm.test.tsx
│   └── hooks/
│       ├── useEventFilters.ts
│       └── useEventFilters.test.ts
```

**Co-location:** Tests live next to the source file they test (e.g., `EventCard.test.tsx` beside `EventCard.tsx`). This is the standard React Testing Library guidance and matches the backend's `.spec.ts` convention.

### Pattern 1: Vitest Configuration

**What:** Separate `vitest.config.ts` that extends the existing `vite.config.ts` using `mergeConfig`
**When to use:** Always — keeps test config isolated from production build config

```typescript
// apps/web/vitest.config.ts
// Source: https://vitest.dev/guide/ (official docs, verified)
import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [tsconfigPaths()],
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/components/ui/**', 'src/test/**', 'src/**/*.d.ts'],
      },
    },
  })
);
```

Note: `vite.config.ts` exports a function `({ mode }) => ...`, so use `mergeConfig` carefully. The `tsconfigPaths()` plugin resolves `@/` imports in test files.

### Pattern 2: Global Test Setup File

**What:** A single `src/test/setup.ts` that runs before every test file
**When to use:** Always — configures jest-dom matchers, MSW server, and Radix UI browser API shims

```typescript
// apps/web/src/test/setup.ts
// Sources: @testing-library/jest-dom docs, luisball.com Radix UI testing guide
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from './msw-server';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// MSW setup
beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Radix UI browser API shims (required for jsdom)
// Source: https://www.luisball.com/blog/using-radixui-with-react-testing-library
window.PointerEvent = MouseEvent as typeof PointerEvent;

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLElement.prototype, 'hasPointerCapture', {
  writable: true,
  value: vi.fn(),
});

Object.defineProperty(HTMLElement.prototype, 'releasePointerCapture', {
  writable: true,
  value: vi.fn(),
});

// Mock matchMedia (not in jsdom)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});
```

### Pattern 3: Custom Render with All Providers

**What:** A `renderWithProviders` utility that wraps components with all required context providers
**When to use:** Any component test that uses React Query, Router, or i18n

```typescript
// apps/web/src/test/render-utils.tsx
// Sources: RTL docs (testing-library.com), TkDodo's React Query testing guide
import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Create fresh QueryClient for each test — critical for isolation
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,           // Prevents timeout from 3 automatic retries
        staleTime: Infinity,    // Prevents background refetches during tests
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface WrapperOptions {
  initialEntries?: string[];  // For React Router location
}

export function renderWithProviders(
  ui: React.ReactElement,
  options: WrapperOptions & Omit<RenderOptions, 'wrapper'> = {}
) {
  const { initialEntries = ['/'], ...renderOptions } = options;
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={initialEntries}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    );
  }

  return {
    queryClient,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
}
```

**i18n strategy:** Use vi.mock for react-i18next (see Pattern 5) rather than wrapping with I18nextProvider. This is faster and avoids loading real translation files in unit tests.

### Pattern 4: React Query Hook Testing

**What:** Using `renderHook` from RTL with a QueryClient wrapper
**When to use:** Testing custom hooks that call `useQuery`, `useMutation`, etc.

```typescript
// Source: TkDodo's "Testing React Query" (tkdodo.eu/blog/testing-react-query)
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTestQueryClient } from '@/test/render-utils';

function createWrapper() {
  const queryClient = createTestQueryClient();
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

describe('useIpLocation', () => {
  it('returns location on success', async () => {
    // MSW handler intercepts the actual HTTP call
    const { result } = renderHook(() => useIpLocation(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeDefined();
  });
});
```

**CRITICAL:** `result.current` must NOT be destructured — the properties are reactive:
```typescript
// ❌ WRONG — loses reactivity
const { data, isLoading } = result.current;

// ✅ CORRECT — access via result.current after waitFor
await waitFor(() => expect(result.current.isSuccess).toBe(true));
expect(result.current.data).toBeDefined();
```

### Pattern 5: Mocking react-i18next

**What:** Global vi.mock for react-i18next that returns translation keys as values
**When to use:** All component tests — configure in setup file or per-test

```typescript
// In src/test/setup.ts OR at top of test file
// Source: https://react.i18next.com/misc/testing (official docs)
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,          // Returns key as value (e.g., "events.title")
    i18n: {
      changeLanguage: () => new Promise(() => {}),
      language: 'it',
      ready: true,
    },
  }),
  Trans: ({ children }: { children: React.ReactNode }) => children,
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));
```

**Why return key as value:** Test assertions target translation keys (`expect(screen.getByText('events.title'))`). This decouples tests from the actual Italian translation strings, so translation changes don't break tests.

### Pattern 6: MSW Request Handlers

**What:** MSW 2.x server with default handlers that mirror the actual API
**When to use:** Integration tests — component tests that interact with React Query

```typescript
// apps/web/src/test/msw-handlers.ts
// Source: https://mswjs.io/docs/getting-started (official MSW 2.x docs)
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('http://localhost:3000/events', () => {
    return HttpResponse.json([
      {
        id: 'event-1',
        title: 'Test Jam',
        type: 'jam',
        starts_at: '2026-03-01T10:00:00Z',
        ends_at: '2026-03-01T12:00:00Z',
        location_text: 'Roma',
      },
    ]);
  }),

  http.post('http://localhost:3000/events', () => {
    return HttpResponse.json({ id: 'new-event-id' }, { status: 201 });
  }),
];

// apps/web/src/test/msw-server.ts
import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';
export const server = setupServer(...handlers);
```

**Override per test:**
```typescript
it('shows error state', async () => {
  server.use(
    http.get('http://localhost:3000/events', () => {
      return HttpResponse.json({ message: 'Server Error' }, { status: 500 });
    })
  );
  // ... test error handling
});
```

### Pattern 7: Form Testing (React Hook Form + Zod)

**What:** Test forms by simulating user interactions, then asserting on submission
**When to use:** Any form component

```typescript
// Source: https://claritydev.net/blog/testing-react-hook-form-with-react-testing-library
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '@/test/render-utils';

describe('EventForm', () => {
  it('submits valid data', async () => {
    const user = userEvent.setup();   // Always call setup() — v14 requirement
    const onSubmit = vi.fn();

    renderWithProviders(<EventForm onSubmit={onSubmit} />);

    await user.type(screen.getByRole('textbox', { name: /titolo/i }), 'My Jam');
    await user.click(screen.getByRole('button', { name: /salva/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'My Jam' })
      );
    });
  });

  it('shows validation errors for empty required fields', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();

    renderWithProviders(<EventForm onSubmit={onSubmit} />);

    await user.click(screen.getByRole('button', { name: /salva/i }));

    await waitFor(() => {
      expect(screen.getByText(/titolo è obbligatorio/i)).toBeInTheDocument();
    });
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

### Pattern 8: Radix UI / Shadcn Components

**What:** Testing Radix-based components requires `userEvent` (not `fireEvent`) + browser API shims
**When to use:** Any test involving Dialog, Dropdown, Select, Popover, Sheet

```typescript
// Source: https://www.luisball.com/blog/using-radixui-with-react-testing-library
// GitHub: github.com/radix-ui/primitives/discussions/2012
describe('EventFilters', () => {
  it('toggles event type checkbox', async () => {
    const user = userEvent.setup();

    renderWithProviders(<EventFilters />);

    const jamCheckbox = screen.getByRole('checkbox', { name: /jam/i });
    await user.click(jamCheckbox);  // Must use userEvent, not fireEvent

    expect(jamCheckbox).toBeChecked();
  });
});
```

**Why userEvent not fireEvent:** Radix UI listens for `onPointerDown`. `fireEvent.click` only fires the click event. `userEvent.click` fires the complete pointer event chain that Radix expects.

### Pattern 9: Package.json Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:run": "vitest run",
    "test:ui": "vitest --ui",
    "coverage": "vitest run --coverage"
  }
}
```

### Pattern 10: TypeScript Config for Tests

Add to `tsconfig.app.json` to enable jest-dom types:
```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  }
}
```

### Anti-Patterns to Avoid

- **Shared QueryClient between tests:** Create a fresh `QueryClient` per test. Shared state causes test pollution.
- **`fireEvent` on Radix components:** Always use `userEvent.setup()` + `await user.click()`. Radix needs the full pointer event chain.
- **Destructuring `result.current`:** The destructured values are frozen snapshots. Access via `result.current.property` after `waitFor`.
- **Not setting `retry: false`:** Default React Query retries 3 times with exponential backoff — tests will time out waiting for retries on error states.
- **Mocking modules instead of using MSW:** `vi.mock` tightly couples tests to implementation. MSW mocks at network level, matching real usage.
- **Testing translation values (Italian strings):** Test translation keys instead. Italian string changes shouldn't break tests.
- **Putting `userEvent.setup()` outside `it()` blocks:** Call `userEvent.setup()` at the start of each test, not in `beforeEach`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| React context wrapper for tests | Manual `<QueryClientProvider>` in each test | `renderWithProviders` utility | DRY — set up once in `src/test/render-utils.tsx` |
| HTTP mocking | `vi.mock` on axios/fetch | MSW 2.x | Network-level interception, reusable across tools, catches real request structure |
| DOM matchers | Custom assertion functions | `@testing-library/jest-dom` | `toBeInTheDocument`, `toHaveValue`, `toBeDisabled`, etc. are all covered |
| User interaction simulation | `fireEvent` | `@testing-library/user-event` | Fires complete browser event chains including pointer events |
| Coverage instrumentation | Manual NYC/c8 setup | `@vitest/coverage-v8` | Built-in Vitest integration |
| Path alias resolution | Manual alias config in vitest.config | `vite-tsconfig-paths` plugin | Auto-reads tsconfig.json paths, stays in sync |

**Key insight:** Every "I'll just mock this quickly" instinct in testing leads to brittle tests that break when implementation changes. MSW + RTL's accessibility-first queries produce tests that survive refactors.

---

## Common Pitfalls

### Pitfall 1: Vitest 4 Won't Install with Vite 5

**What goes wrong:** `pnpm add vitest` installs v4.x which requires Vite 6. You get peer dependency errors or broken types.
**Why it happens:** Vitest 4.0.0 changed its Vite dependency from `^5.0.0 || ^6.0.0` (v3 range) to `^6.0.0 || ^7.0.0`.
**How to avoid:** Pin to `vitest@3.2.4` and `@vitest/coverage-v8@3.2.4` explicitly. Do not use latest/caret without a version pin.
**Warning signs:** `ERR_PEER_DEPENDENCY` or TypeScript errors about missing Vite internals.

### Pitfall 2: React Query Retries Cause Test Timeouts

**What goes wrong:** Tests testing error states hang for 30+ seconds or time out.
**Why it happens:** Default React Query config retries 3 times with exponential backoff (1s, 2s, 4s). Error state isn't reached until all retries are exhausted.
**How to avoid:** Set `retry: false` in `createTestQueryClient()`. This is configured once in `render-utils.tsx`, applying to all tests automatically.
**Warning signs:** Tests pass when run alone but time out in CI; error-state tests take much longer than success-state tests.

### Pitfall 3: Radix UI Interactions Fail Silently

**What goes wrong:** `fireEvent.click(trigger)` doesn't open Radix dropdowns, dialogs, or popovers.
**Why it happens:** Radix UI listens for `onPointerDown`, not `onClick`. jsdom doesn't have `PointerEvent`. `fireEvent` only dispatches the exact event you specify.
**How to avoid:** (1) Add `window.PointerEvent = MouseEvent as typeof PointerEvent` in `setup.ts`. (2) Use `await user.click()` from `userEvent.setup()`, which fires the full event chain.
**Warning signs:** Component renders without error but state never changes after click; no assertion failures, just incorrect state.

### Pitfall 4: `@/` Imports Fail in Tests

**What goes wrong:** Tests import `@/components/...` and get `Failed to resolve import '@/components'`.
**Why it happens:** Vitest doesn't automatically inherit Vite's `resolve.alias` unless the config is properly merged, and `tsconfigPaths` plugin must be added separately.
**How to avoid:** Use `mergeConfig(viteConfig, ...)` in `vitest.config.ts` AND add `tsconfigPaths()` plugin. Both are required.
**Warning signs:** `Error: Failed to resolve import "@/test/render-utils"`.

### Pitfall 5: `result.current` Destructuring in Hook Tests

**What goes wrong:** Test asserts on stale values that never update.
**Why it happens:** `const { data } = result.current` captures the value at that point in time. After `waitFor`, `result.current.data` has the new value, but the destructured `data` variable is frozen.
**How to avoid:** Always access `result.current.property` — never destructure outside assertions.
**Warning signs:** `waitFor` callback succeeds but assertion immediately after it fails.

### Pitfall 6: Biome Flagging Test Globals

**What goes wrong:** Biome lint errors for undefined `describe`, `it`, `vi`, `expect` in test files.
**Why it happens:** Biome 2.x has a `test` domain that auto-enables when Vitest is in `package.json`. Without it, globals are unknown.
**How to avoid:** With Biome 2.x (the project already uses 2.3.8), just add vitest to devDependencies — Biome auto-detects it. You can also explicitly enable the domain in `biome.json`:
```json
{
  "linter": {
    "domains": { "test": "recommended" }
  }
}
```
Also add test files to Biome's `files.includes`:
```json
{
  "files": {
    "includes": ["src/**/*.{ts,tsx,js,jsx}", "src/**/*.{test,spec}.{ts,tsx}"]
  }
}
```
**Warning signs:** Biome errors like `Undeclared variable: describe` in test files.

### Pitfall 7: vite.config.ts Default Export is a Function

**What goes wrong:** `mergeConfig(viteConfig, ...)` fails when `viteConfig` is a function `({ mode }) => config`.
**Why it happens:** `apps/web/vite.config.ts` uses `export default defineConfig(({ mode }) => ({ ... }))` — a function, not an object.
**How to avoid:** In `vitest.config.ts`, either (a) pass a mode string when importing: `const config = (await import('./vite.config')).default({ mode: 'test' })`, or (b) restructure to extract a `sharedConfig` object that both `vite.config.ts` and `vitest.config.ts` import.
**Warning signs:** TypeScript error "argument of type 'UserConfigFn' is not assignable to parameter of type 'UserConfig'".

---

## Code Examples

Verified patterns from official sources:

### Complete vitest.config.ts

```typescript
// apps/web/vitest.config.ts
// Source: vitest.dev/guide/ + vitest.dev/config/
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

// Don't use mergeConfig if vite.config.ts exports a function
// Instead, define a standalone Vitest config that re-applies needed Vite plugins
export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/components/ui/**',   // Shadcn/ui components (vendored)
        'src/test/**',            // Test utilities
        'src/**/*.d.ts',
        'src/main.tsx',
      ],
    },
  },
});
```

### MSW Handler for Events API

```typescript
// apps/web/src/test/msw-handlers.ts
// Source: https://mswjs.io/docs/getting-started (MSW 2.x official docs)
import { http, HttpResponse } from 'msw';
import type { Event } from '@jamia/types/event';

const mockEvent: Event = {
  id: 'test-event-1',
  title: 'Test Jam Roma',
  type: 'jam',
  starts_at: '2026-03-01T10:00:00Z',
  ends_at: '2026-03-01T12:00:00Z',
  location_text: 'Roma, Italia',
  status: 'published',
  owner_id: 'user-1',
};

export const handlers = [
  http.get('*/events/search', () => {
    return HttpResponse.json([{ ...mockEvent, distance_meters: 1000 }]);
  }),
  http.get('*/events/:id', ({ params }) => {
    return HttpResponse.json({ ...mockEvent, id: params.id as string });
  }),
  http.post('*/events', () => {
    return HttpResponse.json(mockEvent, { status: 201 });
  }),
];
```

### EventCard Component Test

```typescript
// apps/web/src/components/events/EventCard.test.tsx
import { screen } from '@testing-library/react';
import { renderWithProviders } from '@/test/render-utils';
import { EventCard } from './EventCard';
import type { Event } from '@jamia/types/event';

const mockEvent: Event = {
  id: 'event-1',
  title: 'Jam Domenicale',
  type: 'jam',
  starts_at: '2026-03-01T10:00:00Z',
  ends_at: '2026-03-01T12:00:00Z',
  location_text: 'Roma',
  status: 'published',
  owner_id: 'user-1',
};

describe('EventCard', () => {
  it('renders event title and type badge', () => {
    renderWithProviders(<EventCard event={mockEvent} />);

    expect(screen.getByText('Jam Domenicale')).toBeInTheDocument();
    expect(screen.getByText('Jam')).toBeInTheDocument();
  });

  it('renders location', () => {
    renderWithProviders(<EventCard event={mockEvent} />);
    expect(screen.getByText(/Roma/i)).toBeInTheDocument();
  });

  it('navigates to event detail on click', async () => {
    const { user } = { user: userEvent.setup() };
    // Note: useNavigate is mocked via MemoryRouter in renderWithProviders
    renderWithProviders(<EventCard event={mockEvent} />);

    const card = screen.getByRole('article'); // or appropriate role
    await user.click(card);
    // Assert navigation via URL check in MemoryRouter
  });
});
```

### Hook Test with React Query

```typescript
// apps/web/src/hooks/useEventFilters.test.ts
// Source: renderHook from @testing-library/react (verified docs)
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useEventFilters } from './useEventFilters';

function wrapper({ children }: { children: React.ReactNode }) {
  return <MemoryRouter>{children}</MemoryRouter>;
}

describe('useEventFilters', () => {
  it('returns default filter values', () => {
    const { result } = renderHook(() => useEventFilters(), { wrapper });

    expect(result.current.filters.query).toBe('');
    expect(result.current.filters.radius).toBe('50');
    expect(result.current.filters.types).toEqual([]);
  });

  it('updates filter via updateFilter', () => {
    const { result } = renderHook(() => useEventFilters(), { wrapper });

    act(() => {
      result.current.updateFilter('query', 'acro yoga');
    });

    expect(result.current.filters.query).toBe('acro yoga');
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jest + Babel for React | Vitest (native ESM) | 2022–2024 | No Babel config, native TypeScript, 2-5x faster |
| `@testing-library/react-hooks` | `renderHook` from `@testing-library/react` | RTL v13 (2022) | `renderHook` is now built-in, separate package deprecated |
| MSW 1.x (`rest.get`) | MSW 2.x (`http.get` + `HttpResponse`) | MSW 2.0 (2023) | Breaking API change; new syntax is more explicit |
| `userEvent.click()` without setup | `userEvent.setup()` then `user.click()` | user-event v14 | v14 default is async; `setup()` is required for proper event simulation |
| `fireEvent` for interactions | `userEvent` | Ongoing | `userEvent` fires complete browser event chains |

**Deprecated/outdated:**
- `@testing-library/react-hooks`: Deprecated since RTL 13; `renderHook` is now in `@testing-library/react` directly.
- MSW 1.x `rest.*` handlers: Replaced by `http.*` + `HttpResponse` in MSW 2.x.
- `userEvent.click()` (direct, without setup): Works but discouraged; v14 requires `userEvent.setup()` for proper async behavior.

---

## Open Questions

1. **vite.config.ts function export compatibility**
   - What we know: `vite.config.ts` exports `defineConfig(({ mode }) => ...)` — a function
   - What's unclear: The best way to share config between vite and vitest — `mergeConfig` may not work cleanly with a function export
   - Recommendation: Define the vitest config standalone (re-specifying the react plugin and alias) rather than trying to merge with vite.config.ts. The duplication is small and avoids fragility.

2. **Google Maps API mock in tests**
   - What we know: `UnifiedSearchBar` uses `useGoogleMaps` which calls `import.meta.env.VITE_GOOGLE_MAPS_API_KEY`
   - What's unclear: Whether to mock at the hook level or provide a test env key
   - Recommendation: Mock `useGoogleMaps` hook via `vi.mock` in tests that need it; don't test the actual Google Maps integration in unit tests.

3. **Supabase client in frontend tests**
   - What we know: Some components import `supabase` client directly for auth state
   - What's unclear: Whether to mock the Supabase client globally in `setup.ts` or per-test
   - Recommendation: Add a global `vi.mock('@supabase/supabase-js')` in `setup.ts` that returns stubs for auth methods. Authenticated state can be controlled per-test.

4. **Test coverage target thresholds**
   - What we know: No prior frontend tests exist; starting from 0%
   - What's unclear: What percentage is a reasonable first target
   - Recommendation: Do NOT enforce thresholds in Phase 10. Establish infrastructure and write tests for critical paths. Phase 11/12 can introduce thresholds once a baseline exists.

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm info vitest`, `npm info vitest@3`, `npm info vitest@4`) — Version compatibility matrix confirmed directly
- npm registry (`npm info @testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `msw`) — Current versions
- https://vitest.dev/guide/ — Vitest 4.0.17 official getting started, configuration patterns
- https://vitest.dev/guide/coverage.html — Coverage configuration, v8 provider setup
- https://mswjs.io/docs/getting-started — MSW 2.x official setup (http + HttpResponse API)
- https://react.i18next.com/misc/testing — Official react-i18next testing guide (vi.mock pattern)
- https://biomejs.dev/linter/domains/ — Biome test domain auto-detection for Vitest

### Secondary (MEDIUM confidence)
- https://tkdodo.eu/blog/testing-react-query — TkDodo (React Query maintainer) on testing patterns; `retry: false`, `createWrapper`, `renderHook` — authoritative for React Query specifics
- https://claritydev.net/blog/testing-react-hook-form-with-react-testing-library — React Hook Form testing patterns; verified against RTL docs
- https://www.luisball.com/blog/using-radixui-with-react-testing-library — Radix UI browser API shims (PointerEvent, ResizeObserver); verified against radix-ui/primitives GitHub issues
- https://testing-library.com/docs/react-testing-library/setup — RTL custom render pattern

### Tertiary (LOW confidence)
- WebSearch results on Biome + Vitest globals auto-detection — partially verified via biomejs.dev docs
- WebSearch results on happy-dom vs jsdom — recommendation for jsdom is based on multiple consistent sources but not from a single authoritative source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All package versions verified via npm registry; Vite 5 / Vitest 3 compatibility confirmed from dependency manifests
- Architecture: HIGH — Patterns from official RTL docs, TkDodo (React Query maintainer), and official MSW docs
- Pitfalls: HIGH for Vite/Vitest version issue (directly verified), HIGH for React Query retries (from TkDodo), MEDIUM for Radix UI shims (from community source verified via GitHub issues)

**Research date:** 2026-02-18
**Valid until:** 2026-04-18 (stable ecosystem; Vitest/RTL/MSW are mature; check Vitest version constraint if Vite is upgraded)
