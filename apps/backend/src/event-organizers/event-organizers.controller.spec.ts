// apps/backend/src/event-organizers/event-organizers.controller.spec.ts
// Patterns from: docs.nestjs.com/fundamentals/testing (verified)
// Nested route: @Controller('events/:eventId/organizers')

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
import { EventOrganizersController } from "./event-organizers.controller";
import { EventOrganizersService } from "./event-organizers.service";

// ---------------------------------------------------------------------------
// Mock service — jest.fn() for every method the controller calls
// ---------------------------------------------------------------------------
const mockEventOrganizersService = {
  getCoOrganizers: jest.fn(),
  addCoOrganizer: jest.fn(),
  removeCoOrganizer: jest.fn(),
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

const mockAdminUser = {
  id: "admin-1",
  email: "charlie@example.com",
  role: "authenticated",
  isSuperAdmin: true,
};

// ---------------------------------------------------------------------------
// Test app factory — replicates main.ts ValidationPipe exactly
// ---------------------------------------------------------------------------
async function createTestApp(userOverride = mockUser): Promise<INestApplication> {
  const module: TestingModule = await Test.createTestingModule({
    controllers: [EventOrganizersController],
    providers: [
      { provide: EventOrganizersService, useValue: mockEventOrganizersService },
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
describe("EventOrganizersController", () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /events/:eventId/organizers (authenticated)
  // -------------------------------------------------------------------------
  describe("GET /events/:eventId/organizers (authenticated)", () => {
    it("returns 200 with co-organizers list", async () => {
      const mockOrganizers = [
        {
          id: "org-1",
          event_id: "event-1",
          user_id: "user-2",
          profiles: { id: "user-2", first_name: "Bob", last_name: "Smith" },
        },
      ];
      mockEventOrganizersService.getCoOrganizers.mockResolvedValue(mockOrganizers);

      const response = await request(app.getHttpServer()).get(
        "/events/event-1/organizers",
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockOrganizers);
    });

    it("passes eventId, user.id, and user.isSuperAdmin to service", async () => {
      mockEventOrganizersService.getCoOrganizers.mockResolvedValue([]);

      await request(app.getHttpServer()).get("/events/event-1/organizers");

      expect(mockEventOrganizersService.getCoOrganizers).toHaveBeenCalledWith(
        "event-1",    // eventId from URL param
        "user-1",     // user.id from mockUser
        false,        // user.isSuperAdmin from mockUser
      );
    });

    it("returns 403 when service throws ForbiddenException", async () => {
      mockEventOrganizersService.getCoOrganizers.mockRejectedValue(
        new ForbiddenException(
          "You do not have permission to view co-organizers for this event",
        ),
      );

      const response = await request(app.getHttpServer()).get(
        "/events/event-1/organizers",
      );

      expect(response.status).toBe(403);
    });

    it("returns 404 when service throws NotFoundException (event not found)", async () => {
      mockEventOrganizersService.getCoOrganizers.mockRejectedValue(
        new NotFoundException("Event not found"),
      );

      const response = await request(app.getHttpServer()).get(
        "/events/nonexistent/organizers",
      );

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Event not found");
    });
  });

  // -------------------------------------------------------------------------
  // POST /events/:eventId/organizers (authenticated)
  // -------------------------------------------------------------------------
  describe("POST /events/:eventId/organizers (authenticated)", () => {
    it("returns 201 Created with valid payload", async () => {
      const newOrganizer = {
        id: "org-1",
        event_id: "event-1",
        user_id: "user-2",
        added_by: "user-1",
      };
      mockEventOrganizersService.addCoOrganizer.mockResolvedValue(newOrganizer);

      const response = await request(app.getHttpServer())
        .post("/events/event-1/organizers")
        .send({ userId: "user-2" });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newOrganizer);
    });

    it("passes eventId, user.id, userId from body, and user.isSuperAdmin to service", async () => {
      mockEventOrganizersService.addCoOrganizer.mockResolvedValue({ id: "org-1" });

      await request(app.getHttpServer())
        .post("/events/event-1/organizers")
        .send({ userId: "user-2" });

      expect(mockEventOrganizersService.addCoOrganizer).toHaveBeenCalledWith(
        "event-1",  // eventId from URL param
        "user-1",   // user.id from mockUser (ownerId)
        "user-2",   // body.userId (coOrganizerUserId)
        false,      // user.isSuperAdmin from mockUser
      );
    });

    it("returns 400 when userId field is missing", async () => {
      const response = await request(app.getHttpServer())
        .post("/events/event-1/organizers")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("userId");
    });

    it("returns 400 when userId is not a string (e.g., number)", async () => {
      const response = await request(app.getHttpServer())
        .post("/events/event-1/organizers")
        .send({ userId: 123 });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("userId");
    });

    it("returns 404 when service throws NotFoundException (event not found)", async () => {
      mockEventOrganizersService.addCoOrganizer.mockRejectedValue(
        new NotFoundException("Event not found"),
      );

      const response = await request(app.getHttpServer())
        .post("/events/event-1/organizers")
        .send({ userId: "user-2" });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Event not found");
    });

    it("returns 403 when service throws ForbiddenException", async () => {
      mockEventOrganizersService.addCoOrganizer.mockRejectedValue(
        new ForbiddenException("Only the event owner can add co-organizers"),
      );

      const response = await request(app.getHttpServer())
        .post("/events/event-1/organizers")
        .send({ userId: "user-2" });

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /events/:eventId/organizers/:organizerId (authenticated)
  // -------------------------------------------------------------------------
  describe("DELETE /events/:eventId/organizers/:organizerId (authenticated)", () => {
    it("returns 204 No Content on success", async () => {
      mockEventOrganizersService.removeCoOrganizer.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer()).delete(
        "/events/event-1/organizers/org-1",
      );

      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
    });

    it("passes eventId, organizerId, user.id, and user.isSuperAdmin to service", async () => {
      mockEventOrganizersService.removeCoOrganizer.mockResolvedValue(undefined);

      await request(app.getHttpServer()).delete(
        "/events/event-1/organizers/org-1",
      );

      expect(mockEventOrganizersService.removeCoOrganizer).toHaveBeenCalledWith(
        "event-1",  // eventId from URL param
        "org-1",    // organizerId from URL param
        "user-1",   // user.id from mockUser
        false,      // user.isSuperAdmin from mockUser
      );
    });

    it("returns 404 when service throws NotFoundException", async () => {
      mockEventOrganizersService.removeCoOrganizer.mockRejectedValue(
        new NotFoundException("Event not found"),
      );

      const response = await request(app.getHttpServer()).delete(
        "/events/event-1/organizers/nonexistent",
      );

      expect(response.status).toBe(404);
    });

    it("returns 403 when service throws ForbiddenException", async () => {
      mockEventOrganizersService.removeCoOrganizer.mockRejectedValue(
        new ForbiddenException("Only the event owner can remove co-organizers"),
      );

      const response = await request(app.getHttpServer()).delete(
        "/events/event-1/organizers/org-1",
      );

      expect(response.status).toBe(403);
    });
  });
});

// ---------------------------------------------------------------------------
// Super admin context — verifies isSuperAdmin is propagated correctly
// ---------------------------------------------------------------------------
describe("EventOrganizersController (as super admin)", () => {
  let adminApp: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    adminApp = await createTestApp(mockAdminUser);
  });

  afterEach(async () => {
    await adminApp.close();
  });

  it("GET /events/:eventId/organizers passes isSuperAdmin=true to service", async () => {
    mockEventOrganizersService.getCoOrganizers.mockResolvedValue([]);

    await request(adminApp.getHttpServer()).get("/events/event-1/organizers");

    expect(mockEventOrganizersService.getCoOrganizers).toHaveBeenCalledWith(
      "event-1",
      "admin-1",
      true, // isSuperAdmin=true from mockAdminUser
    );
  });

  it("DELETE /events/:eventId/organizers/:organizerId passes isSuperAdmin=true to service", async () => {
    mockEventOrganizersService.removeCoOrganizer.mockResolvedValue(undefined);

    await request(adminApp.getHttpServer()).delete(
      "/events/event-1/organizers/org-1",
    );

    expect(mockEventOrganizersService.removeCoOrganizer).toHaveBeenCalledWith(
      "event-1",
      "org-1",
      "admin-1",
      true, // isSuperAdmin=true from mockAdminUser
    );
  });
});
