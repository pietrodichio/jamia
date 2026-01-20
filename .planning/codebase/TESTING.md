# Testing Patterns

**Analysis Date:** 2026-01-20

## Test Framework

**Runner:**
- Jest 30.0.0
- Config: `jamia-be/package.json` (inline) and `jamia-be/test/jest-e2e.json`

**Assertion Library:**
- Jest (built-in matchers like `expect`, `toBe`, `toMatchObject`, `toHaveLength`)

**Run Commands:**
```bash
npm test                 # Run all unit tests
npm run test:watch       # Watch mode
npm run test:cov         # Coverage report
npm run test:e2e         # E2E tests
npm run test:debug       # Debug mode with inspector
```

## Test File Organization

**Location:**
- Co-located with source files (e.g., `jamia-be/src/jams/jams.service.spec.ts` next to `jams.service.ts`)
- E2E tests in separate `test/` directory (e.g., `jamia-be/test/*.e2e-spec.ts`)

**Naming:**
- Unit tests: `*.spec.ts` (e.g., `jams.service.spec.ts`, `participants.service.spec.ts`)
- E2E tests: `*.e2e-spec.ts` (e.g., `app.e2e-spec.ts`)

**Structure:**
```
jamia-be/
├── src/
│   ├── jams/
│   │   ├── jams.service.ts
│   │   └── jams.service.spec.ts        # Co-located unit test
│   ├── participants/
│   │   ├── participants.service.ts
│   │   └── participants.service.spec.ts
│   └── test-utils/
│       └── supabase-mock.ts             # Shared test utilities
└── test/
    └── jest-e2e.json                    # E2E config
```

## Test Structure

**Suite Organization:**
```typescript
describe('JamsService', () => {
  const auditService = { log: jest.fn() };
  const emailService = { sendCustomEmail: jest.fn() };

  beforeEach(() => {
    auditService.log = jest.fn().mockResolvedValue(undefined);
    emailService.sendCustomEmail = jest.fn().mockResolvedValue(undefined);
  });

  it('enrols the owner as participant when creating a jam', async () => {
    // Test implementation
  });

  describe('getPublishedJams', () => {
    it('returns published jams with participant counts', async () => {
      // Nested describe for method-specific tests
    });

    it('returns empty array when no published jams exist', async () => {
      // Another test case
    });
  });
});
```

**Patterns:**
- Top-level `describe` per service/class
- Nested `describe` blocks for specific methods (e.g., `describe('getPublishedJams', () => {...})`)
- `beforeEach` for test setup/reset
- Test names describe expected behavior (e.g., "returns published jams with participant counts")
- AAA pattern: Arrange (setup mock), Act (call service), Assert (verify results)

## Mocking

**Framework:** Jest (built-in)

**Patterns:**

**Mock Dependencies:**
```typescript
const auditService = { log: jest.fn() };
const emailService = { sendCustomEmail: jest.fn() };

beforeEach(() => {
  auditService.log = jest.fn().mockResolvedValue(undefined);
  emailService.sendCustomEmail = jest.fn().mockResolvedValue(undefined);
});
```

**Mock Supabase Client:**
Uses custom `createSupabaseMock` utility from `jamia-be/src/test-utils/supabase-mock.ts`:

```typescript
const supabase = createSupabaseMock({
  jams: [
    {
      response: {
        data: { id: 'jam-1', name: 'Morning Jam', status: 'published' },
        error: null,
      },
    },
  ],
  jam_participants: [
    {
      response: { data: null, error: null },
      selectResponse: { data: null, error: null },
    },
  ],
});
```

**Mock RPC calls:**
```typescript
(supabase.client as any).rpc = jest
  .fn()
  .mockResolvedValue({ data: true, error: null });
```

**Capture insert payloads:**
```typescript
const jamInsertPayloads: unknown[] = [];
const supabase = createSupabaseMock({
  jams: [
    {
      response: { data: { id: 'jam-create' }, error: null },
      onInsert: (payload) => jamInsertPayloads.push(payload),
    },
  ],
});
```

**What to Mock:**
- External services (Supabase client, email service, audit service)
- NestJS dependencies injected via constructor
- Database responses (data/error objects)
- RPC function calls

**What NOT to Mock:**
- The service under test itself
- DTOs and data structures
- Type definitions
- Helper functions being tested

## Fixtures and Factories

**Test Data:**
Inline test data defined within tests (no separate fixture files):

```typescript
const supabase = createSupabaseMock({
  jams: [
    {
      response: {
        data: [
          {
            id: 'jam-1',
            name: 'Morning Jam',
            status: 'published',
            starts_at: '2024-01-01T10:00:00Z',
            jam_participants: [
              { id: 'p1', state: 'participant' },
              { id: 'p2', state: 'participant' },
            ],
          },
        ],
        error: null,
      },
    },
  ],
});
```

**Location:**
- `jamia-be/src/test-utils/supabase-mock.ts` - Shared Supabase mock factory
- No centralized fixture files; data defined per-test for clarity

## Coverage

**Requirements:** None enforced (no coverage thresholds in config)

**View Coverage:**
```bash
npm run test:cov
```

**Output Directory:**
- `jamia-be/coverage/` (configured in `package.json`: `"coverageDirectory": "../coverage"`)

**Collected From:**
- All `**/*.(t|j)s` files in the `src/` directory (configured in `package.json`)

## Test Types

**Unit Tests:**
- Scope: Individual service methods in isolation
- Approach: Mock all dependencies, test service logic
- Example: `jamia-be/src/jams/jams.service.spec.ts` tests `JamsService` methods
- Coverage: Service layer (controllers, services, DTOs)
- 6 test files found: `jams.service.spec.ts`, `participants.service.spec.ts`, `managers.service.spec.ts`, `audit.service.spec.ts`, `app.controller.spec.ts`, `profiles.service.spec.ts`

**Integration Tests:**
- Not detected in current codebase

**E2E Tests:**
- Framework: Jest with `test/jest-e2e.json` config
- Scope: Full application flow through HTTP endpoints
- Config: `rootDir: "."`, `testRegex: ".e2e-spec.ts$"`
- No e2e test files found in repository (configured but not implemented)

## Common Patterns

**Async Testing:**
```typescript
it('returns published jams with participant counts', async () => {
  const supabase = createSupabaseMock({ /* ... */ });
  const service = new JamsService(supabase.client, auditService as any, emailService as any);

  const result = await service.getPublishedJams();

  expect(result).toHaveLength(2);
  expect(result[0].participant_count).toBe(2);
});
```

**Error Testing:**
```typescript
it('throws NotFoundException when jam does not exist', async () => {
  const supabase = createSupabaseMock({
    jams: [
      {
        response: {
          data: null,
          error: { message: 'Not found' },
        },
      },
    ],
  });

  const service = new JamsService(supabase.client, auditService as any, emailService as any);

  await expect(service.getJamById('non-existent')).rejects.toBeInstanceOf(
    NotFoundException,
  );
});
```

**Permission Testing:**
```typescript
it('allows owner to view draft jam', async () => {
  const supabase = createSupabaseMock({
    jams: [
      {
        response: {
          data: { id: 'jam-1', status: 'draft', owner_id: 'owner-1' },
          error: null,
        },
      },
    ],
  });
  (supabase.client as any).rpc = jest
    .fn()
    .mockResolvedValue({ data: true, error: null });

  const service = new JamsService(supabase.client, auditService as any, emailService as any);

  const result = await service.getJamById('jam-1', 'owner-1');

  expect(result.id).toBe('jam-1');
  expect(result.status).toBe('draft');
});
```

**Spy Console for Error Logging:**
```typescript
it('returns false when RPC call fails', async () => {
  const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
  const supabase = createSupabaseMock({});
  (supabase.client as any).rpc = jest
    .fn()
    .mockResolvedValue({ data: null, error: { message: 'RPC error' } });

  const service = new JamsService(supabase.client, auditService as any, emailService as any);

  const result = await service.isManagerOrOwner('jam-1', 'user-1', false);

  expect(result).toBe(false);
  expect(consoleSpy).toHaveBeenCalled();

  consoleSpy.mockRestore();
});
```

## Test Utility: Supabase Mock

**Location:** `jamia-be/src/test-utils/supabase-mock.ts`

**Purpose:** Provides configurable mock for Supabase client supporting query chaining

**Usage:**
```typescript
import { createSupabaseMock } from '../test-utils/supabase-mock';

const supabase = createSupabaseMock({
  tableName: [
    {
      response: { data: {...}, error: null },      // Default response
      selectResponse: { data: {...}, error: null }, // Response for .select()
      insertResponse: { data: {...}, error: null }, // Response for .insert()
      updateResponse: { data: {...}, error: null }, // Response for .update()
      onSelect: (fields, options) => {},            // Callback on .select()
      onInsert: (payload) => {},                    // Callback on .insert()
      onUpdate: (payload) => {},                    // Callback on .update()
    },
    // Multiple configs for sequential calls to same table
  ],
});
```

**Features:**
- Supports method chaining (`.select().eq().in().order().single()`)
- Sequential call tracking (multiple configs for same table)
- Callbacks to capture operation payloads
- Mock auth admin methods
- Mock RPC calls

## Jest Configuration

**Unit Tests (package.json):**
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": "src",
  "testRegex": ".*\\.spec\\.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "collectCoverageFrom": ["**/*.(t|j)s"],
  "coverageDirectory": "../coverage",
  "testEnvironment": "node"
}
```

**E2E Tests (test/jest-e2e.json):**
```json
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  }
}
```

## Frontend Testing

**Status:** Not implemented

**Evidence:**
- No test files found in `jamia-fe/src/`
- No testing framework configured in `jamia-fe/package.json`
- Vite config present (`vite.config.ts`) but no Vitest configuration

---

*Testing analysis: 2026-01-20*
