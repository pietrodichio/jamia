// apps/backend/src/profiles/profiles.controller.spec.ts
// Patterns from: docs.nestjs.com/fundamentals/testing (verified)

import type { ExecutionContext, ValidationError } from "@nestjs/common";
import {
  BadRequestException,
  ForbiddenException,
  type INestApplication,
  NotFoundException,
  ValidationPipe,
} from "@nestjs/common";
import { Test, type TestingModule } from "@nestjs/testing";
import request from "supertest";
import { SupabaseAuthGuard } from "../auth/supabase-auth.guard";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

// ---------------------------------------------------------------------------
// Mock service — jest.fn() for every method the controller calls
// ---------------------------------------------------------------------------
const mockProfilesService = {
  searchUsers: jest.fn(),
  getPublicProfile: jest.fn(),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
};

// ---------------------------------------------------------------------------
// Mock users
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
    controllers: [ProfilesController],
    providers: [{ provide: ProfilesService, useValue: mockProfilesService }],
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
describe("ProfilesController", () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /profiles/search (authenticated)
  // -------------------------------------------------------------------------
  describe("GET /profiles/search (authenticated)", () => {
    it("returns 200 with search results", async () => {
      const mockResults = [
        { id: "user-1", first_name: "Alice", last_name: "Smith" },
        { id: "user-2", first_name: "Bob", last_name: "Jones" },
      ];
      mockProfilesService.searchUsers.mockResolvedValue(mockResults);

      const response = await request(app.getHttpServer())
        .get("/profiles/search")
        .query({ q: "Alice" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
    });

    it("passes query params (q, limit, jamId) to searchUsers", async () => {
      mockProfilesService.searchUsers.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/profiles/search")
        .query({ q: "Bob", limit: "5", jamId: "jam-abc" });

      expect(mockProfilesService.searchUsers).toHaveBeenCalledWith(
        "Bob",
        5, // Note: limit is typed as number? in the controller — transform: true coerces "5" → 5
        "jam-abc",
      );
    });
  });

  // -------------------------------------------------------------------------
  // GET /profiles/public/:id (public)
  // -------------------------------------------------------------------------
  describe("GET /profiles/public/:id (public)", () => {
    it("returns 200 with public profile", async () => {
      const mockProfile = {
        id: "user-2",
        first_name: "Bob",
        main_role: "flyer",
        bio: "AcroYoga flyer",
      };
      mockProfilesService.getPublicProfile.mockResolvedValue(mockProfile);

      const response = await request(app.getHttpServer()).get("/profiles/public/user-2");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
    });

    it("passes id to getPublicProfile", async () => {
      mockProfilesService.getPublicProfile.mockResolvedValue({});

      await request(app.getHttpServer()).get("/profiles/public/user-2");

      expect(mockProfilesService.getPublicProfile).toHaveBeenCalledWith("user-2");
    });

    it("returns 404 when profile is not found", async () => {
      mockProfilesService.getPublicProfile.mockRejectedValue(
        new NotFoundException("Profile not found"),
      );

      const response = await request(app.getHttpServer()).get("/profiles/public/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Profile not found");
    });
  });

  // -------------------------------------------------------------------------
  // GET /profiles/:id (authenticated)
  // -------------------------------------------------------------------------
  describe("GET /profiles/:id (authenticated)", () => {
    it("returns 200 with profile details", async () => {
      const mockProfile = {
        id: "user-1",
        first_name: "Alice",
        email: "alice@example.com",
        main_role: "base",
      };
      mockProfilesService.getProfile.mockResolvedValue(mockProfile);

      const response = await request(app.getHttpServer()).get("/profiles/user-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockProfile);
    });

    it("passes id to getProfile", async () => {
      mockProfilesService.getProfile.mockResolvedValue({});

      await request(app.getHttpServer()).get("/profiles/user-1");

      expect(mockProfilesService.getProfile).toHaveBeenCalledWith("user-1");
    });

    it("returns 404 when profile is not found", async () => {
      mockProfilesService.getProfile.mockRejectedValue(new NotFoundException("Profile not found"));

      const response = await request(app.getHttpServer()).get("/profiles/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Profile not found");
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /profiles/:id (authenticated)
  // -------------------------------------------------------------------------
  describe("PATCH /profiles/:id (authenticated)", () => {
    it("returns 200 for valid payload", async () => {
      const updatedProfile = { id: "user-1", first_name: "Alice", main_role: "base" };
      mockProfilesService.updateProfile.mockResolvedValue(updatedProfile);

      const response = await request(app.getHttpServer())
        .patch("/profiles/user-1")
        .send({ first_name: "Alice", main_role: "base" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedProfile);
    });

    it("passes id, user.id, and dto to updateProfile", async () => {
      mockProfilesService.updateProfile.mockResolvedValue({});

      await request(app.getHttpServer())
        .patch("/profiles/user-1")
        .send({ first_name: "Alice", main_role: "base" });

      expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
        "user-1",
        "user-1", // user.id from mockUser
        expect.objectContaining({ first_name: "Alice", main_role: "base" }),
      );
    });

    it("returns 400 for invalid main_role enum value", async () => {
      const response = await request(app.getHttpServer())
        .patch("/profiles/user-1")
        .send({ main_role: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("main_role");
    });

    it("strips unknown fields (whitelist: true) before passing to service", async () => {
      mockProfilesService.updateProfile.mockResolvedValue({ id: "user-1" });

      await request(app.getHttpServer()).patch("/profiles/user-1").send({
        first_name: "Alice",
        hacker_field: "should_be_stripped",
      });

      expect(mockProfilesService.updateProfile).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.not.objectContaining({ hacker_field: "should_be_stripped" }),
      );
    });

    it("returns 403 when user tries to update another user's profile", async () => {
      mockProfilesService.updateProfile.mockRejectedValue(
        new ForbiddenException("You can only update your own profile"),
      );

      const response = await request(app.getHttpServer())
        .patch("/profiles/other-user-id")
        .send({ first_name: "Hacker" });

      expect(response.status).toBe(403);
    });
  });
});

// ---------------------------------------------------------------------------
// Unauthorized access — guard returns false → NestJS returns 403
// Note: When overriding with canActivate: () => false, the @Public() decorator
// metadata is NOT checked by the mock guard. This means even @Public() routes
// (like GET /profiles/public/:id) will be blocked.
// In production, the real SupabaseAuthGuard checks the Reflector for @Public().
// ---------------------------------------------------------------------------
describe("ProfilesController (unauthorized access)", () => {
  let unauthApp: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProfilesController],
      providers: [{ provide: ProfilesService, useValue: mockProfilesService }],
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

  it("returns 403 when guard denies GET /profiles/search", async () => {
    const response = await request(unauthApp.getHttpServer())
      .get("/profiles/search")
      .query({ q: "Alice" });

    expect(response.status).toBe(403);
    expect(mockProfilesService.searchUsers).not.toHaveBeenCalled();
  });

  it("returns 403 when guard denies PATCH /profiles/:id", async () => {
    const response = await request(unauthApp.getHttpServer())
      .patch("/profiles/user-1")
      .send({ first_name: "Alice" });

    expect(response.status).toBe(403);
    expect(mockProfilesService.updateProfile).not.toHaveBeenCalled();
  });
});
