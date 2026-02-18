// apps/backend/src/email-preferences/email-preferences.controller.spec.ts
// Patterns from: docs.nestjs.com/fundamentals/testing (verified)

import type { ExecutionContext, ValidationError } from "@nestjs/common";
import {
  BadRequestException,
  type INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { EmailPreferencesController } from "./email-preferences.controller";
import { EmailPreferencesService } from "./email-preferences.service";

// ---------------------------------------------------------------------------
// Mock service — jest.fn() for every method the controller calls
// ---------------------------------------------------------------------------
const mockEmailPreferencesService = {
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
  unsubscribeByToken: jest.fn(),
};

// ---------------------------------------------------------------------------
// Mock user
// ---------------------------------------------------------------------------
const mockUser = {
  id: "user-1",
  email: "alice@example.com",
  role: "authenticated",
  isSuperAdmin: false,
};

// ---------------------------------------------------------------------------
// Test app factory — replicates main.ts ValidationPipe exactly
// ---------------------------------------------------------------------------
async function createTestApp(userOverride = mockUser): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [EmailPreferencesController],
    providers: [{ provide: EmailPreferencesService, useValue: mockEmailPreferencesService }],
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

  // Replicate main.ts ValidationPipe exactly — required for DTO validation tests
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors: ValidationError[]) => {
        const formattedErrors: Record<string, string> = {};
        errors.forEach((error) => {
          const firstKey = Object.keys(error?.constraints || {})[0];
          formattedErrors[error.property] = error.constraints?.[firstKey] ?? "";
        });
        return new BadRequestException(formattedErrors);
      },
    }),
  );

  await app.init();
  return app;
}

// ---------------------------------------------------------------------------
// Main test suite — authenticated as mockUser by default
// ---------------------------------------------------------------------------
describe("EmailPreferencesController", () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /email-preferences (authenticated)
  // -------------------------------------------------------------------------
  describe("GET /email-preferences (authenticated)", () => {
    it("returns 200 with user preferences", async () => {
      const mockPrefs = {
        user_id: "user-1",
        digest_enabled: true,
        digest_frequency: "weekly",
        product_updates_enabled: false,
      };
      mockEmailPreferencesService.getPreferences.mockResolvedValue(mockPrefs);

      const response = await request(app.getHttpServer()).get("/email-preferences");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPrefs);
    });

    it("passes user.id to getPreferences", async () => {
      mockEmailPreferencesService.getPreferences.mockResolvedValue({});

      await request(app.getHttpServer()).get("/email-preferences");

      expect(mockEmailPreferencesService.getPreferences).toHaveBeenCalledWith("user-1");
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /email-preferences (authenticated)
  // -------------------------------------------------------------------------
  describe("PATCH /email-preferences (authenticated)", () => {
    it("returns 200 for valid payload with digest_enabled and digest_frequency", async () => {
      const updatedPrefs = {
        user_id: "user-1",
        digest_enabled: true,
        digest_frequency: "weekly",
      };
      mockEmailPreferencesService.updatePreferences.mockResolvedValue(updatedPrefs);

      const response = await request(app.getHttpServer())
        .patch("/email-preferences")
        .send({ digest_enabled: true, digest_frequency: "weekly" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedPrefs);
    });

    it("passes user.id and dto to updatePreferences", async () => {
      mockEmailPreferencesService.updatePreferences.mockResolvedValue({});

      await request(app.getHttpServer())
        .patch("/email-preferences")
        .send({ digest_enabled: true, digest_frequency: "monthly" });

      expect(mockEmailPreferencesService.updatePreferences).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ digest_enabled: true, digest_frequency: "monthly" }),
      );
    });

    it("returns 400 for invalid digest_frequency value", async () => {
      const response = await request(app.getHttpServer())
        .patch("/email-preferences")
        .send({ digest_enabled: true, digest_frequency: "hourly" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("digest_frequency");
    });

    it("returns 200 for boolean-only update (frequency is optional)", async () => {
      mockEmailPreferencesService.updatePreferences.mockResolvedValue({
        user_id: "user-1",
        digest_enabled: false,
      });

      const response = await request(app.getHttpServer())
        .patch("/email-preferences")
        .send({ digest_enabled: false });

      expect(response.status).toBe(200);
    });
  });

  // -------------------------------------------------------------------------
  // POST /email-preferences/unsubscribe/:token (public)
  // -------------------------------------------------------------------------
  describe("POST /email-preferences/unsubscribe/:token (public)", () => {
    it("returns 201 with success message for valid token", async () => {
      mockEmailPreferencesService.unsubscribeByToken.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer()).post(
        "/email-preferences/unsubscribe/valid-token-abc123",
      );

      expect(response.status).toBe(201);
      expect(response.body).toEqual({ message: "Unsubscribed successfully" });
    });

    it("calls unsubscribeByToken with the token param", async () => {
      mockEmailPreferencesService.unsubscribeByToken.mockResolvedValue(undefined);

      await request(app.getHttpServer()).post("/email-preferences/unsubscribe/my-test-token");

      expect(mockEmailPreferencesService.unsubscribeByToken).toHaveBeenCalledWith("my-test-token");
    });

    it("returns 404 when token is not found", async () => {
      mockEmailPreferencesService.unsubscribeByToken.mockRejectedValue(
        new NotFoundException("Invalid unsubscribe token"),
      );

      const response = await request(app.getHttpServer()).post(
        "/email-preferences/unsubscribe/bad-token",
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Invalid unsubscribe token");
    });
  });

  // -------------------------------------------------------------------------
  // GET /email-preferences/unsubscribe/:token (public)
  // -------------------------------------------------------------------------
  describe("GET /email-preferences/unsubscribe/:token (public)", () => {
    it("returns 200 with success message for valid token", async () => {
      mockEmailPreferencesService.unsubscribeByToken.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer()).get(
        "/email-preferences/unsubscribe/valid-token-abc123",
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ message: "Unsubscribed successfully" });
    });

    it("calls unsubscribeByToken with the token param", async () => {
      mockEmailPreferencesService.unsubscribeByToken.mockResolvedValue(undefined);

      await request(app.getHttpServer()).get("/email-preferences/unsubscribe/another-token");

      expect(mockEmailPreferencesService.unsubscribeByToken).toHaveBeenCalledWith("another-token");
    });

    it("returns 404 when token is not found", async () => {
      mockEmailPreferencesService.unsubscribeByToken.mockRejectedValue(
        new NotFoundException("Invalid unsubscribe token"),
      );

      const response = await request(app.getHttpServer()).get(
        "/email-preferences/unsubscribe/bad-token",
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Invalid unsubscribe token");
    });
  });
});

// ---------------------------------------------------------------------------
// Unauthorized access — guard returns false → NestJS returns 403
// Note: When overriding with canActivate: () => false, the @Public() decorator
// metadata is NOT checked by the mock guard. This means even @Public() routes
// will be blocked. This is expected behavior for the test guard override.
// In production, the real SupabaseAuthGuard checks the Reflector for @Public().
// ---------------------------------------------------------------------------
describe("EmailPreferencesController (unauthorized access)", () => {
  let unauthApp: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EmailPreferencesController],
      providers: [{ provide: EmailPreferencesService, useValue: mockEmailPreferencesService }],
    })
      .overrideGuard(SupabaseAuthGuard)
      .useValue({ canActivate: () => false }) // Deny all — guard returns false → 403
      .compile();

    unauthApp = module.createNestApplication();
    await unauthApp.init();
  });

  afterEach(async () => {
    await unauthApp.close();
  });

  it("returns 403 when guard denies GET /email-preferences", async () => {
    const response = await request(unauthApp.getHttpServer()).get("/email-preferences");

    expect(response.status).toBe(403);
    expect(mockEmailPreferencesService.getPreferences).not.toHaveBeenCalled();
  });

  it("returns 403 when guard denies PATCH /email-preferences", async () => {
    const response = await request(unauthApp.getHttpServer())
      .patch("/email-preferences")
      .send({ digest_enabled: true });

    expect(response.status).toBe(403);
    expect(mockEmailPreferencesService.updatePreferences).not.toHaveBeenCalled();
  });
});
