# Phase 11: Backend Integration Tests - Research

**Researched:** 2026-02-18
**Domain:** NestJS controller-level integration testing — @nestjs/testing, supertest, Jest, class-validator DTO testing
**Confidence:** HIGH (stack verified from official NestJS docs, GitHub, and live project inspection)

---

## Summary

Phase 11 adds controller-level HTTP integration tests to the NestJS backend. The backend already has service-level unit tests using Jest and a custom `createSupabaseMock` helper. Phase 11 extends this by wiring up NestJS test modules with supertest so that HTTP request routing, guard behavior, DTO validation, and response shapes are all exercised end-to-end — without a real Supabase database.

The standard NestJS integration test pattern uses `Test.createTestingModule()` to bootstrap a lightweight Nest application, `overrideProvider()` to inject mock services, `overrideGuard()` to bypass auth, `app.useGlobalPipes(new ValidationPipe(...))` to replicate main.ts pipe setup, and `supertest` to make HTTP calls against `app.getHttpServer()`. All of this runs within Jest (already the backend test runner) — no new test framework is needed. The project already has `@nestjs/testing@11.1.12` and `supertest@7.2.2` installed as devDependencies.

The key architectural decision is WHERE to co-locate controller tests. The existing unit tests are co-located as `.spec.ts` beside their service files inside `src/`. Controller integration tests should follow the same convention: `events.controller.spec.ts` beside `events.controller.ts`. This keeps the Jest test runner's existing `testRegex: ".*\\.spec\\.ts$"` config working with no changes.

**Primary recommendation:** Use `Test.createTestingModule` with `overrideProvider` for all service mocks, `overrideGuard(SupabaseAuthGuard)` to bypass auth, and a `canActivate` mock that injects `request.user` directly onto the request object. Co-locate controller tests as `*.controller.spec.ts` in the feature module directory. Reuse `createSupabaseMock` only if the controller test directly needs Supabase behavior; otherwise prefer service-level mocks.

---

## Standard Stack

The backend already has all necessary dependencies installed. No new packages are required.

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| jest | 30.2.0 | Test runner | Already the backend test runner; tsconfig, transform, moduleNameMapper all configured |
| ts-jest | 29.4.6 | TypeScript transform for Jest | Already configured in package.json `jest` block |
| @nestjs/testing | 11.1.12 | Test.createTestingModule, overrideProvider, overrideGuard | Official NestJS testing harness; creates in-memory Nest application for tests |
| supertest | 7.0.0+ (7.2.2 installed) | HTTP request simulation against Nest app | Standard way to test HTTP endpoints in Node.js; used in NestJS official docs |
| @types/supertest | 6.0.2 | TypeScript types for supertest | Already installed |
| class-validator | 0.14.3 | DTO validation via decorators | Already installed; same library controllers use |
| class-transformer | 0.5.1 | DTO transformation | Already installed |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @types/jest | 30.0.0 | Jest type definitions | Already installed |

**No new installation needed.** All test dependencies are in `apps/backend/devDependencies`.

---

## Architecture Patterns

### Recommended Project Structure

Controller integration tests co-located beside controller files (matches existing service spec convention):

```
apps/backend/src/
├── events/
│   ├── events.controller.ts
│   ├── events.controller.spec.ts      # NEW — controller integration test
│   ├── events.service.ts
│   ├── events.service.spec.ts         # EXISTING — service unit test
│   └── dto/
│       └── create-event.dto.ts
├── email-preferences/
│   ├── email-preferences.controller.ts
│   ├── email-preferences.controller.spec.ts  # NEW
│   └── email-preferences.service.spec.ts     # EXISTING
├── event-organizers/
│   ├── event-organizers.controller.ts
│   ├── event-organizers.controller.spec.ts   # NEW
│   └── event-organizers.service.spec.ts      # EXISTING
├── profiles/
│   ├── profiles.controller.ts
│   ├── profiles.controller.spec.ts           # NEW
│   └── profiles.service.spec.ts              # EXISTING
└── test-utils/
    └── supabase-mock.ts                      # EXISTING
```

The existing `jest` config in `package.json` already has `"testRegex": ".*\\.spec\\.ts$"` and `"rootDir": "src"` — controller tests placed inside `src/` are automatically discovered. No Jest config changes needed.

### Pattern 1: Controller Test Module Setup

**What:** Bootstrap a focused module with the controller under test, mocked service, and mocked guard
**When to use:** Every controller test file

```typescript
// Source: docs.nestjs.com/fundamentals/testing (verified)
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe, BadRequestException, ValidationError } from '@nestjs/common';
import request from 'supertest';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';

// Minimal mock service — override only methods tested in this file
const mockEventsService = {
  createEvent: jest.fn(),
  searchEvents: jest.fn(),
  getPublicEvents: jest.fn(),
  getEventsByOwner: jest.fn(),
  getEventById: jest.fn(),
  updateEvent: jest.fn(),
  publishEvent: jest.fn(),
  deleteEvent: jest.fn(),
};

// Mock auth user — mirrors what SupabaseAuthGuard sets on request.user
const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  role: 'authenticated',
  isSuperAdmin: false,
};

const mockAdminUser = {
  id: 'admin-1',
  email: 'charlie@example.com',
  role: 'authenticated',
  isSuperAdmin: true,
};

describe('EventsController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Reset mocks between tests
    Object.values(mockEventsService).forEach(fn => fn.mockReset?.());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [
        {
          provide: EventsService,
          useValue: mockEventsService,
        },
      ],
    })
      // Override the guard — inject request.user directly
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;  // Default: regular user
          return true;
        },
      })
      .compile();

    app = module.createNestApplication();

    // CRITICAL: replicate main.ts ValidationPipe exactly
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        exceptionFactory: (errors: ValidationError[]) => {
          const formattedErrors: Record<string, string> = {};
          errors.forEach((error) => {
            const firstKey = Object.keys(error?.constraints || {})[0];
            formattedErrors[error.property] = error.constraints?.[firstKey] ?? '';
          });
          return new BadRequestException(formattedErrors);
        },
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });
});
```

### Pattern 2: Testing Public Endpoints (No Auth)

**What:** Routes marked `@Public()` should be accessible without Authorization header
**When to use:** `GET /events/search`, `GET /events/public`, `GET /events/:id`, `POST /email-preferences/unsubscribe/:token`

```typescript
// Source: Official NestJS testing docs pattern
describe('GET /events/search', () => {
  it('returns events without authentication', async () => {
    const mockResults = [{ id: 'event-1', title: 'Test Jam' }];
    mockEventsService.searchEvents.mockResolvedValue(mockResults);

    const response = await request(app.getHttpServer())
      .get('/events/search')
      .query({ query: 'acro' });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockResults);
    expect(mockEventsService.searchEvents).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'acro' }),
    );
  });
});
```

### Pattern 3: Testing Authenticated Endpoints

**What:** Routes that require auth receive `request.user` from the guard mock
**When to use:** `POST /events`, `PATCH /events/:id`, `GET /events/my-events`, etc.

```typescript
it('creates an event and returns 201', async () => {
  const newEvent = { id: 'event-1', title: 'New Jam', type: 'jam' };
  mockEventsService.createEvent.mockResolvedValue(newEvent);

  const response = await request(app.getHttpServer())
    .post('/events')
    .send({
      type: 'jam',
      title: 'New Jam',
      starts_at: '2026-03-01T10:00:00Z',
      ends_at: '2026-03-01T12:00:00Z',
    });

  expect(response.status).toBe(201);
  expect(mockEventsService.createEvent).toHaveBeenCalledWith(
    'user-1',           // from mockUser.id injected by guard
    expect.objectContaining({ type: 'jam', title: 'New Jam' }),
  );
});
```

### Pattern 4: Testing Different Auth Contexts (Regular vs Admin)

**What:** Override the guard's canActivate per describe block to inject different users
**When to use:** When testing authorization behavior at the controller level

The cleanest approach is to rebuild the module per auth context using `beforeEach` per describe block:

```typescript
describe('as super admin', () => {
  let adminApp: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: mockEventsService }],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({
        canActivate: (context) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockAdminUser;   // isSuperAdmin: true
          return true;
        },
      })
      .compile();

    adminApp = module.createNestApplication();
    // ... setup ValidationPipe
    await adminApp.init();
  });

  afterEach(() => adminApp.close());
});
```

### Pattern 5: Testing Unauthorized Access (401 Response)

**What:** Guard returns false, request should get 401
**When to use:** Verifying that protected routes reject unauthenticated requests

```typescript
describe('unauthorized access', () => {
  let unauthApp: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: mockEventsService }],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => false })   // Deny all
      .compile();

    unauthApp = module.createNestApplication();
    await unauthApp.init();
  });

  afterEach(() => unauthApp.close());

  it('rejects POST /events without auth', async () => {
    const response = await request(unauthApp.getHttpServer())
      .post('/events')
      .send({ title: 'Hack Attempt' });

    expect(response.status).toBe(403);  // NestJS returns 403 when canActivate returns false
  });
});
```

**Note:** When `canActivate` returns `false` (without throwing), NestJS returns **403 Forbidden**, not 401. To get 401, throw `new UnauthorizedException()` from the guard mock.

### Pattern 6: DTO Validation Testing

**What:** Send invalid body, expect 400 with validation error details
**When to use:** Testing class-validator decorators on DTOs

```typescript
describe('POST /events — DTO validation', () => {
  it('returns 400 when type is invalid', async () => {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send({
        type: 'invalid-type',   // Not in: jam, class, workshop, convention
        title: 'Test',
        starts_at: '2026-03-01T10:00:00Z',
        ends_at: '2026-03-01T12:00:00Z',
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('type');  // Custom exceptionFactory format
  });

  it('returns 400 when required dates are missing', async () => {
    const response = await request(app.getHttpServer())
      .post('/events')
      .send({
        type: 'jam',
        title: 'Missing dates',
        // starts_at and ends_at omitted
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('starts_at');
  });

  it('strips unknown fields (whitelist: true)', async () => {
    mockEventsService.createEvent.mockResolvedValue({ id: 'event-1' });

    await request(app.getHttpServer())
      .post('/events')
      .send({
        type: 'jam',
        title: 'Clean Event',
        starts_at: '2026-03-01T10:00:00Z',
        ends_at: '2026-03-01T12:00:00Z',
        hacker_field: 'should_be_stripped',   // whitelist: true removes this
      });

    expect(mockEventsService.createEvent).toHaveBeenCalledWith(
      expect.any(String),
      expect.not.objectContaining({ hacker_field: 'should_be_stripped' }),
    );
  });
});
```

### Pattern 7: Testing Service Error Propagation

**What:** Service throws NestJS exception, verify HTTP response code
**When to use:** Testing that 404/403/400 from service reach the response correctly

```typescript
it('returns 404 when service throws NotFoundException', async () => {
  mockEventsService.getEventById.mockRejectedValue(new NotFoundException('Event not found'));

  const response = await request(app.getHttpServer())
    .get('/events/nonexistent-id');

  expect(response.status).toBe(404);
  expect(response.body.message).toBe('Event not found');
});

it('returns 403 when service throws ForbiddenException', async () => {
  mockEventsService.updateEvent.mockRejectedValue(new ForbiddenException());

  const response = await request(app.getHttpServer())
    .patch('/events/event-1')
    .send({ title: 'New title' });

  expect(response.status).toBe(403);
});
```

### Pattern 8: The overrideGuard and request.user Injection Pattern (Specific to This Project)

**What:** The project's custom `SupabaseAuthGuard` validates a Supabase JWT and sets `request.user`. In tests, bypass the guard and inject a pre-built user object directly.
**Why this project specifically:** Unlike Passport-based guards, `SupabaseAuthGuard` is a custom class. `overrideGuard(SupabaseAuthGuard)` works cleanly because the controller uses `@UseGuards(SupabaseAuthGuard)` with the class reference (not an instance), matching exactly what `overrideGuard` expects.

```typescript
// The guard mock that injects user into request
.overrideGuard(SupabaseAuthGuard)
.useValue({
  canActivate: (context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest();
    request.user = {
      id: 'user-1',
      email: 'alice@example.com',
      role: 'authenticated',
      isSuperAdmin: false,
    };
    return true;
  },
})
```

The `@User()` decorator in controllers reads `request.user` — injecting it in the guard mock makes `@User() user: AuthUser` receive the test user automatically, with no changes to production code.

### Pattern 9: Handling the e2e Test Directory

**What:** The existing `test/` directory has `app.e2e-spec.ts` (the "hello world" boilerplate). Expand it.
**When to use:** For tests that spin up the full `AppModule` rather than a focused feature module.

The existing `test/jest-e2e.json` has no `moduleNameMapper` for `@jamia/types`. Add it before running e2e tests:

```json
// apps/backend/test/jest-e2e.json — update needed
{
  "moduleFileExtensions": ["js", "json", "ts"],
  "rootDir": ".",
  "testEnvironment": "node",
  "testRegex": ".e2e-spec.ts$",
  "transform": {
    "^.+\\.(t|j)s$": "ts-jest"
  },
  "moduleNameMapper": {
    "^@jamia/types/(.*)$": "<rootDir>/../packages/types/src/$1.ts",
    "^@jamia/types$": "<rootDir>/../packages/types/src/index.ts"
  }
}
```

Note: The `rootDir` for e2e is `.` (the `test/` directory), so the path to `packages/types` must go up two levels from the backend root: `<rootDir>/../../../packages/types`.

### Anti-Patterns to Avoid

- **Starting a real NestJS HTTP server:** Don't call `await app.listen(port)` in tests. Use `app.getHttpServer()` without calling `listen()`. Supertest handles binding.
- **Sharing `app` instance across `describe` blocks:** Create and destroy `app` in `beforeEach`/`afterEach`. Shared state causes test pollution via mock state leaking between tests.
- **Not calling `await app.close()` in `afterEach`:** Causes Jest to hang after tests complete (open server handle).
- **Missing `ValidationPipe` in test app:** If you don't call `app.useGlobalPipes(new ValidationPipe(...))` in the test setup, DTO validation is not applied and validation tests return 201 instead of 400.
- **Using `overrideGuard(SupabaseAuthGuard())` (with parentheses):** The controller uses `@UseGuards(SupabaseAuthGuard)` — a class reference, not an instance. The override must match: `overrideGuard(SupabaseAuthGuard)` without parentheses.
- **Testing service logic through controller tests:** Controller integration tests should mock services completely. The service logic is already covered by existing `.service.spec.ts` unit tests.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP request simulation | Manual TCP clients or axios calls in tests | `supertest` (already installed) | supertest integrates directly with Node.js http.Server; NestJS's `getHttpServer()` returns this exact interface |
| Module bootstrapping | Calling `NestFactory.create()` in tests | `Test.createTestingModule().compile().createNestApplication()` | The testing module doesn't start a real HTTP server unless you call `listen()`; no port conflicts |
| Guard bypass | Modifying the actual `SupabaseAuthGuard` | `overrideGuard(SupabaseAuthGuard).useValue(...)` | Clean override, production code untouched |
| Service mocking | Modifying services for test mode | `overrideProvider(EventsService).useValue(mock)` | Each test controls exactly which service responses occur |
| DTO validation testing | Manually instantiating DTOs | Send invalid HTTP body through supertest with `ValidationPipe` active | Tests the actual validation path including `exceptionFactory` format |
| User injection | Creating a test-only auth decorator | Guard mock that sets `request.user` | Exercises the exact same `@User()` decorator that production uses |

**Key insight:** The NestJS testing module is a first-class feature designed for exactly this use case. Every "helper" approach is worse — it either couples tests to internals or loses coverage of the HTTP/routing layer.

---

## Common Pitfalls

### Pitfall 1: ValidationPipe Not Applied in Test App

**What goes wrong:** DTO validation tests return 201 instead of 400. Invalid body gets passed to the service.
**Why it happens:** The global `ValidationPipe` is set up in `main.ts`, but test apps created via `module.createNestApplication()` don't inherit global pipes from `main.ts`. Each test app must configure pipes explicitly.
**How to avoid:** Call `app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, exceptionFactory: ... }))` in `beforeEach` using the exact same config as `main.ts`. Copy-paste the `exceptionFactory` from `main.ts` into a shared `createTestApp` helper function.
**Warning signs:** Sending `{ type: 'invalid' }` to `POST /events` and getting `201` or the service mock being called with the invalid data.

### Pitfall 2: Guard Override Not Matching

**What goes wrong:** `overrideGuard(SupabaseAuthGuard)` doesn't work; the real guard runs and returns 401.
**Why it happens:** The override fails when the reference passed to `overrideGuard()` doesn't match the reference used in `@UseGuards()`. This project uses `@UseGuards(SupabaseAuthGuard)` (class, no call) which means `overrideGuard(SupabaseAuthGuard)` (class, no call) is the correct match.
**How to avoid:** Pass the class itself (no parentheses) to `overrideGuard`. Import `SupabaseAuthGuard` from the same path the controller imports it from.
**Warning signs:** Tests that should pass get `401` or `403` responses unexpectedly.

### Pitfall 3: `request.user` Not Set Causes `@User()` to Return undefined

**What goes wrong:** `@User() user: AuthUser` is `undefined` in the controller, causing `TypeError: Cannot read properties of undefined (reading 'id')`.
**Why it happens:** The `@User()` decorator reads `request.user` which is set by the real guard. When overriding the guard, the mock must explicitly set `request.user`.
**How to avoid:** Always include `request.user = mockUser` in the `canActivate` mock function body (see Pattern 8).
**Warning signs:** `TypeError: Cannot read properties of undefined` in controller test output.

### Pitfall 4: Hanging Jest Process After Tests

**What goes wrong:** Jest reports all tests passed but hangs for 5-30 seconds before exiting, or never exits.
**Why it happens:** `app.getHttpServer()` creates a Node.js `http.Server`. If `await app.close()` is not called in `afterEach`, the server keeps the event loop alive.
**How to avoid:** Always call `await app.close()` in `afterEach`. Use `--forceExit` in `jest` CLI as a fallback during development only.
**Warning signs:** Jest shows "Tests: X passed" but the process doesn't exit.

### Pitfall 5: Mock Service State Leaking Between Tests

**What goes wrong:** A later test asserts that `mockEventsService.createEvent` was called once, but it was actually called twice because the previous test called it.
**Why it happens:** `jest.fn()` mock call history accumulates unless cleared.
**How to avoid:** Call `jest.clearAllMocks()` or reset specific mocks in `beforeEach`. With the module-per-test-file pattern (rebuild in each `beforeEach`), consider using `mockReset()` on each mock function.
**Warning signs:** `expect(mockFn).toHaveBeenCalledTimes(1)` failing intermittently; test order matters.

### Pitfall 6: Missing moduleNameMapper in jest-e2e.json

**What goes wrong:** Running `pnpm test:e2e` fails with `Cannot find module '@jamia/types'`.
**Why it happens:** The e2e Jest config at `test/jest-e2e.json` doesn't inherit the `moduleNameMapper` from the main `package.json` Jest config.
**How to avoid:** Add the same `moduleNameMapper` entries to `test/jest-e2e.json` that are in the main Jest config.
**Warning signs:** `Error: Cannot find module '@jamia/types'` only when running e2e tests, not unit tests.

### Pitfall 7: canActivate Returns false → 403, Not 401

**What goes wrong:** Tests expect 401 from an unauthenticated request but get 403.
**Why it happens:** NestJS intercepts `canActivate() === false` and returns 403 Forbidden. To return 401 Unauthorized, the guard must throw `new UnauthorizedException()`.
**How to avoid:** When testing the "unauthorized" scenario, throw `UnauthorizedException` from the guard mock rather than returning `false`. When testing the "guard passes" scenario, return `true`.
**Warning signs:** `expect(response.status).toBe(401)` fails because NestJS returns 403.

---

## Code Examples

Verified patterns from official sources and codebase analysis:

### Complete EventsController Test File

```typescript
// apps/backend/src/events/events.controller.spec.ts
// Patterns from: docs.nestjs.com/fundamentals/testing (verified)
import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  type ValidationError,
} from '@nestjs/common';
import request from 'supertest';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import type { ExecutionContext } from '@nestjs/common';

const mockEventsService = {
  createEvent: jest.fn(),
  searchEvents: jest.fn(),
  getPublicEvents: jest.fn(),
  getEventsByOwner: jest.fn(),
  getEventsCoOrganized: jest.fn(),
  getEventById: jest.fn(),
  updateEvent: jest.fn(),
  publishEvent: jest.fn(),
  deleteEvent: jest.fn(),
  saveDraftEvent: jest.fn(),
  updateOccurrence: jest.fn(),
  updateFutureOccurrences: jest.fn(),
};

const mockUser = {
  id: 'user-1',
  email: 'alice@example.com',
  role: 'authenticated',
  isSuperAdmin: false,
};

async function createTestApp(userOverride = mockUser): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [EventsController],
    providers: [
      { provide: EventsService, useValue: mockEventsService },
    ],
  })
    .overrideGuard(SupabaseAuthGuard)
    .useValue({
      canActivate: (context: ExecutionContext) => {
        const req = context.switchToHttp().getRequest();
        req.user = userOverride;
        return true;
      },
    })
    .compile();

  const app = module.createNestApplication();
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors: Record<string, string> = {};
        errors.forEach((error) => {
          const firstKey = Object.keys(error?.constraints || {})[0];
          formattedErrors[error.property] = error.constraints?.[firstKey] ?? '';
        });
        return new BadRequestException(formattedErrors);
      },
    }),
  );
  await app.init();
  return app;
}

describe('EventsController', () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /events/search (public)', () => {
    it('returns events without authentication', async () => {
      const mockResults = [{ id: 'event-1', title: 'Test Jam', type: 'jam' }];
      mockEventsService.searchEvents.mockResolvedValue(mockResults);

      const response = await request(app.getHttpServer())
        .get('/events/search')
        .query({ query: 'acro' });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
    });
  });

  describe('POST /events', () => {
    it('creates event with valid payload', async () => {
      const newEvent = { id: 'event-1', title: 'New Jam', type: 'jam' };
      mockEventsService.createEvent.mockResolvedValue(newEvent);

      const response = await request(app.getHttpServer())
        .post('/events')
        .send({
          type: 'jam',
          title: 'New Jam',
          starts_at: '2026-03-01T10:00:00Z',
          ends_at: '2026-03-01T12:00:00Z',
        });

      expect(response.status).toBe(201);
      expect(mockEventsService.createEvent).toHaveBeenCalledWith(
        'user-1',
        expect.objectContaining({ type: 'jam' }),
      );
    });

    it('returns 400 when event type is invalid', async () => {
      const response = await request(app.getHttpServer())
        .post('/events')
        .send({
          type: 'invalid-type',
          title: 'Test',
          starts_at: '2026-03-01T10:00:00Z',
          ends_at: '2026-03-01T12:00:00Z',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('type');
    });
  });

  describe('PATCH /events/:id', () => {
    it('returns 404 when event not found', async () => {
      mockEventsService.updateEvent.mockRejectedValue(
        new NotFoundException('Event not found'),
      );

      const response = await request(app.getHttpServer())
        .patch('/events/nonexistent')
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('returns 403 when user lacks permission', async () => {
      mockEventsService.updateEvent.mockRejectedValue(new ForbiddenException());

      const response = await request(app.getHttpServer())
        .patch('/events/event-1')
        .send({ title: 'Unauthorized' });

      expect(response.status).toBe(403);
    });
  });
});
```

### EmailPreferencesController Test — Unsubscribe (Public) Endpoint

```typescript
// apps/backend/src/email-preferences/email-preferences.controller.spec.ts
describe('POST /email-preferences/unsubscribe/:token (public)', () => {
  it('returns 200 with success message for valid token', async () => {
    mockEmailPreferencesService.unsubscribeByToken.mockResolvedValue({ digest_enabled: false });

    const response = await request(app.getHttpServer())
      .post('/email-preferences/unsubscribe/valid-token-123');

    expect(response.status).toBe(201);  // Note: @Post default is 201 in NestJS
    expect(response.body).toEqual({ message: 'Unsubscribed successfully' });
  });

  it('returns 404 for invalid token', async () => {
    mockEmailPreferencesService.unsubscribeByToken.mockRejectedValue(
      new NotFoundException('Token not found'),
    );

    const response = await request(app.getHttpServer())
      .post('/email-preferences/unsubscribe/bad-token');

    expect(response.status).toBe(404);
  });
});
```

### UpdateEmailPreferencesDto Validation Test

```typescript
describe('PATCH /email-preferences — DTO validation', () => {
  it('returns 400 when digest_frequency is invalid', async () => {
    const response = await request(app.getHttpServer())
      .patch('/email-preferences')
      .send({ digest_frequency: 'hourly' });  // Only 'weekly' | 'monthly' allowed

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('digest_frequency');
  });

  it('returns 200 when all fields are valid', async () => {
    mockEmailPreferencesService.updatePreferences.mockResolvedValue({
      digest_enabled: true,
      digest_frequency: 'weekly',
    });

    const response = await request(app.getHttpServer())
      .patch('/email-preferences')
      .send({ digest_enabled: true, digest_frequency: 'weekly' });

    expect(response.status).toBe(200);
  });
});
```

### Expanding the e2e "Hello World" Test

```typescript
// apps/backend/test/app.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual HTTP server startup in tests | `Test.createTestingModule().compile().createNestApplication()` without `listen()` | NestJS 6+ | No port conflicts; faster test startup |
| Mocking entire modules | `overrideProvider(ServiceClass).useValue(mock)` | NestJS 7+ | More surgical; only override what needs replacing |
| `import * as supertest from 'supertest'` | `import request from 'supertest'` | supertest 6+ with ESM | Default export; cleaner import |
| Separate e2e test directory only | Co-located controller specs + e2e for full-stack | Community convention | Co-located = faster feedback; e2e = smoke tests |

**Deprecated/outdated:**
- `import * as request from 'supertest'`: Works but namespace import style is older. The project's existing e2e test already uses `import request from 'supertest'` (default import) — use that style consistently.
- Full `AppModule` in every test: Importing the full `AppModule` in controller tests starts all modules including DB connections. Prefer focused feature module imports with mocked services for controller tests.

---

## Modules to Test (Priority Order)

Based on the phase description and codebase analysis:

| Module | Controller | Key Scenarios |
|--------|------------|---------------|
| events | EventsController | CRUD endpoints, public vs auth, DTO validation (type enum, date strings), 401/403/404 propagation |
| email-preferences | EmailPreferencesController | GET/PATCH (auth required), unsubscribe POST/GET (public, no auth), DTO validation (boolean, frequency enum) |
| event-organizers | EventOrganizersController | GET/POST/DELETE co-organizers (all auth-gated), AddCoOrganizerDto validation |
| profiles | ProfilesController | GET public profile (public), GET profile (auth), PATCH profile (auth + self-only), UpdateProfileDto validation |
| app.e2e-spec.ts | Full AppModule | Expand "Hello World" boilerplate to include `/health` and smoke-test key public routes |

---

## Open Questions

1. **SupabaseModule initialization in full AppModule e2e tests**
   - What we know: `SupabaseModule` calls `createClient()` on startup, requiring `SUPABASE_URL` and `SUPABASE_SERVICE_KEY` env vars.
   - What's unclear: Whether e2e tests that import full `AppModule` will fail if those env vars are not set.
   - Recommendation: For controller-level tests, import the feature module only with `overrideProvider` for Supabase-dependent services. Reserve full `AppModule` imports for smoke-test e2e only. Set test env vars in a `jest.setup.ts` or in `jest-e2e.json`'s `globals`.

2. **Shared `createTestApp` helper vs per-file setup**
   - What we know: Each controller test module setup is ~20 lines of identical boilerplate.
   - What's unclear: Whether a shared `test-utils/create-controller-test-app.ts` helper is worth the indirection at this phase.
   - Recommendation: Start with per-file setup for clarity. Extract to shared utility only if writing 4+ controller test files with identical patterns.

3. **Biome linting of test files in `src/`**
   - What we know: `biome.json` has `"includes": ["src/**/*.{ts,tsx,js,jsx}", "test/**/*.ts"]`. Controller specs will be co-located in `src/`.
   - What's unclear: Whether Biome's Jest domain auto-detects from `jest` in package.json for the backend (Biome 2.2.4, same as frontend).
   - Recommendation: The backend has its own `biome.json`. If Biome reports undefined globals for `describe`/`it`/`jest`, add `"linter": { "domains": { "test": "recommended" } }` to the backend's `biome.json`.

---

## Sources

### Primary (HIGH confidence)
- `apps/backend/package.json` — Live inspection of installed versions (jest 30, ts-jest 29, @nestjs/testing 11, supertest 7)
- `apps/backend/test/jest-e2e.json` — Existing e2e config structure
- `apps/backend/src/test-utils/supabase-mock.ts` — Existing mock pattern
- `apps/backend/src/auth/supabase-auth.guard.ts` — Guard implementation confirming `@UseGuards(SupabaseAuthGuard)` class reference pattern
- `apps/backend/src/main.ts` — ValidationPipe configuration that must be replicated in tests
- https://github.com/nestjs/docs.nestjs.com/blob/master/content/fundamentals/unit-testing.md — Official NestJS testing patterns (`overrideProvider`, `overrideGuard`, supertest integration)

### Secondary (MEDIUM confidence)
- https://github.com/nestjs/nest/issues/2515 — Confirmed `overrideGuard` behavior: class reference vs instance matters; class reference is correct for this project
- https://engineering.deptagency.com/integration-testing-nestjs-apis-with-a-test-database — `Test.createTestingModule`, supertest, `app.close()` teardown pattern

### Tertiary (LOW confidence)
- WebSearch results on "NestJS overrideGuard canActivate mock" — confirmed pattern matches GitHub issue resolution; not from official docs

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All packages already installed; versions verified from node_modules
- Architecture: HIGH — Official NestJS testing docs + live codebase inspection; existing e2e test confirms supertest import pattern
- Pitfalls: HIGH for ValidationPipe-not-applied (observable from main.ts analysis), HIGH for guard override class-vs-instance (GitHub issue #2515), MEDIUM for canActivate-false=403 (from NestJS internal behavior, not official docs)

**Research date:** 2026-02-18
**Valid until:** 2026-05-18 (NestJS 11 is stable; Jest 30 is latest major; supertest is mature)
