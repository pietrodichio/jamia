// apps/backend/src/events/events.controller.spec.ts
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
import { EventsController } from "./events.controller";
import { EventsService } from "./events.service";

// ---------------------------------------------------------------------------
// Mock service — jest.fn() for every method the controller calls
// ---------------------------------------------------------------------------
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
    controllers: [EventsController],
    providers: [{ provide: EventsService, useValue: mockEventsService }],
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
describe("EventsController", () => {
  let app: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    app = await createTestApp();
  });

  afterEach(async () => {
    await app.close();
  });

  // -------------------------------------------------------------------------
  // GET /events/search (public)
  // -------------------------------------------------------------------------
  describe("GET /events/search (public)", () => {
    it("returns 200 with search results", async () => {
      const mockResults = [{ id: "event-1", title: "Test Jam", type: "jam" }];
      mockEventsService.searchEvents.mockResolvedValue(mockResults);

      const response = await request(app.getHttpServer())
        .get("/events/search")
        .query({ keyword: "acro", lat: "45.46", lng: "9.19", radius: "50000" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockResults);
      expect(mockEventsService.searchEvents).toHaveBeenCalledTimes(1);
    });

    it("passes query params to service.searchEvents", async () => {
      mockEventsService.searchEvents.mockResolvedValue([]);

      await request(app.getHttpServer())
        .get("/events/search")
        .query({ keyword: "yoga", lat: "41.89", lng: "12.49" });

      expect(mockEventsService.searchEvents).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "yoga" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // GET /events/public (public)
  // -------------------------------------------------------------------------
  describe("GET /events/public (public)", () => {
    it("returns 200 with public events list", async () => {
      const mockEvents = [{ id: "event-1", title: "Public Jam", type: "jam", status: "published" }];
      mockEventsService.getPublicEvents.mockResolvedValue(mockEvents);

      const response = await request(app.getHttpServer()).get("/events/public");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvents);
      expect(mockEventsService.getPublicEvents).toHaveBeenCalledTimes(1);
    });
  });

  // -------------------------------------------------------------------------
  // GET /events/:id (public — passes optional user context)
  // -------------------------------------------------------------------------
  describe("GET /events/:id (public)", () => {
    it("returns 200 with event details", async () => {
      const mockEvent = { id: "event-1", title: "Test Jam", type: "jam" };
      mockEventsService.getEventById.mockResolvedValue(mockEvent);

      const response = await request(app.getHttpServer()).get("/events/event-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockEvent);
    });

    it("passes user id and isSuperAdmin to getEventById", async () => {
      mockEventsService.getEventById.mockResolvedValue({ id: "event-1" });

      await request(app.getHttpServer()).get("/events/event-1");

      expect(mockEventsService.getEventById).toHaveBeenCalledWith(
        "event-1",
        "user-1", // user?.id from mockUser
        false, // user?.isSuperAdmin from mockUser
      );
    });

    it("returns 404 when event does not exist", async () => {
      mockEventsService.getEventById.mockRejectedValue(new NotFoundException("Event not found"));

      const response = await request(app.getHttpServer()).get("/events/nonexistent");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("Event not found");
    });
  });

  // -------------------------------------------------------------------------
  // POST /events (authenticated)
  // -------------------------------------------------------------------------
  describe("POST /events (authenticated)", () => {
    it("creates an event and returns 201", async () => {
      const newEvent = { id: "event-1", title: "New Jam", type: "jam" };
      mockEventsService.createEvent.mockResolvedValue(newEvent);

      const response = await request(app.getHttpServer()).post("/events").send({
        type: "jam",
        title: "New Jam",
        starts_at: "2026-03-01T10:00:00Z",
        ends_at: "2026-03-01T12:00:00Z",
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(newEvent);
      expect(mockEventsService.createEvent).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ type: "jam", title: "New Jam" }),
      );
    });

    it("returns 400 when type is missing", async () => {
      const response = await request(app.getHttpServer()).post("/events").send({
        title: "Missing Type",
        starts_at: "2026-03-01T10:00:00Z",
        ends_at: "2026-03-01T12:00:00Z",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("type");
    });

    it("returns 400 when type is not a valid enum value", async () => {
      const response = await request(app.getHttpServer()).post("/events").send({
        type: "invalid-type",
        title: "Bad Type",
        starts_at: "2026-03-01T10:00:00Z",
        ends_at: "2026-03-01T12:00:00Z",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("type");
    });

    it("returns 400 when starts_at is missing", async () => {
      const response = await request(app.getHttpServer()).post("/events").send({
        type: "jam",
        title: "Missing Date",
        ends_at: "2026-03-01T12:00:00Z",
      });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("starts_at");
    });

    it("strips unknown fields (whitelist: true) before passing to service", async () => {
      mockEventsService.createEvent.mockResolvedValue({ id: "event-1" });

      await request(app.getHttpServer()).post("/events").send({
        type: "jam",
        title: "Clean Event",
        starts_at: "2026-03-01T10:00:00Z",
        ends_at: "2026-03-01T12:00:00Z",
        hacker_field: "should_be_stripped",
      });

      expect(mockEventsService.createEvent).toHaveBeenCalledWith(
        expect.any(String),
        expect.not.objectContaining({ hacker_field: "should_be_stripped" }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // POST /events/draft (authenticated)
  // -------------------------------------------------------------------------
  describe("POST /events/draft (authenticated)", () => {
    it("returns 201 with saved draft", async () => {
      const draftEvent = { id: "draft-1", title: "My Draft", status: "draft" };
      mockEventsService.saveDraftEvent.mockResolvedValue(draftEvent);

      const response = await request(app.getHttpServer()).post("/events/draft").send({
        title: "My Draft",
      });

      expect(response.status).toBe(201);
      expect(response.body).toEqual(draftEvent);
      expect(mockEventsService.saveDraftEvent).toHaveBeenCalledWith(
        "user-1",
        expect.objectContaining({ title: "My Draft" }),
        false, // user.isSuperAdmin from mockUser
      );
    });
  });

  // -------------------------------------------------------------------------
  // GET /events/my-events (authenticated)
  // -------------------------------------------------------------------------
  describe("GET /events/my-events (authenticated)", () => {
    it("returns 200 with user owned events", async () => {
      const myEvents = [{ id: "event-1", owner_id: "user-1", type: "class" }];
      mockEventsService.getEventsByOwner.mockResolvedValue(myEvents);

      const response = await request(app.getHttpServer()).get("/events/my-events");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(myEvents);
      expect(mockEventsService.getEventsByOwner).toHaveBeenCalledWith("user-1");
    });
  });

  // -------------------------------------------------------------------------
  // GET /events/co-organized (authenticated)
  // -------------------------------------------------------------------------
  describe("GET /events/co-organized (authenticated)", () => {
    it("returns 200 with co-organized events", async () => {
      const coEvents = [{ id: "event-2", type: "workshop" }];
      mockEventsService.getEventsCoOrganized.mockResolvedValue(coEvents);

      const response = await request(app.getHttpServer()).get("/events/co-organized");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(coEvents);
      expect(mockEventsService.getEventsCoOrganized).toHaveBeenCalledWith("user-1");
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /events/:id (authenticated)
  // -------------------------------------------------------------------------
  describe("PATCH /events/:id (authenticated)", () => {
    it("returns 200 with updated event", async () => {
      const updatedEvent = { id: "event-1", title: "Updated Title" };
      mockEventsService.updateEvent.mockResolvedValue(updatedEvent);

      const response = await request(app.getHttpServer())
        .patch("/events/event-1")
        .send({ title: "Updated Title" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(updatedEvent);
      expect(mockEventsService.updateEvent).toHaveBeenCalledWith(
        "event-1",
        "user-1",
        expect.objectContaining({ title: "Updated Title" }),
        false, // user.isSuperAdmin from mockUser
      );
    });

    it("returns 404 when event does not exist", async () => {
      mockEventsService.updateEvent.mockRejectedValue(new NotFoundException("Event not found"));

      const response = await request(app.getHttpServer())
        .patch("/events/nonexistent")
        .send({ title: "Updated" });

      expect(response.status).toBe(404);
    });

    it("returns 403 when user lacks permission", async () => {
      mockEventsService.updateEvent.mockRejectedValue(
        new ForbiddenException("You can only update events you own or co-organize"),
      );

      const response = await request(app.getHttpServer())
        .patch("/events/event-1")
        .send({ title: "Unauthorized" });

      expect(response.status).toBe(403);
    });
  });

  // -------------------------------------------------------------------------
  // PATCH /events/:id/publish (authenticated)
  // -------------------------------------------------------------------------
  describe("PATCH /events/:id/publish (authenticated)", () => {
    it("returns 200 with published event", async () => {
      const publishedEvent = { id: "event-1", status: "published" };
      mockEventsService.publishEvent.mockResolvedValue(publishedEvent);

      const response = await request(app.getHttpServer()).patch("/events/event-1/publish");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(publishedEvent);
      expect(mockEventsService.publishEvent).toHaveBeenCalledWith(
        "event-1",
        "user-1",
        false, // user.isSuperAdmin from mockUser
      );
    });
  });

  // -------------------------------------------------------------------------
  // DELETE /events/:id (authenticated)
  // -------------------------------------------------------------------------
  describe("DELETE /events/:id (authenticated)", () => {
    it("returns 200 with deletion confirmation", async () => {
      const deleteResult = { message: "Event deleted successfully" };
      mockEventsService.deleteEvent.mockResolvedValue(deleteResult);

      const response = await request(app.getHttpServer()).delete("/events/event-1");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(deleteResult);
      expect(mockEventsService.deleteEvent).toHaveBeenCalledWith(
        "event-1",
        "user-1",
        false, // user.isSuperAdmin from mockUser
      );
    });

    it("returns 403 when user is not the event owner", async () => {
      mockEventsService.deleteEvent.mockRejectedValue(
        new ForbiddenException("Only the event owner can delete events"),
      );

      const response = await request(app.getHttpServer()).delete("/events/event-1");

      expect(response.status).toBe(403);
    });
  });
});

// ---------------------------------------------------------------------------
// Super admin context — verifies isSuperAdmin is propagated correctly
// ---------------------------------------------------------------------------
describe("EventsController (as super admin)", () => {
  let adminApp: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();
    adminApp = await createTestApp(mockAdminUser);
  });

  afterEach(async () => {
    await adminApp.close();
  });

  it("PATCH /events/:id passes isSuperAdmin=true to service", async () => {
    mockEventsService.updateEvent.mockResolvedValue({ id: "event-1" });

    await request(adminApp.getHttpServer())
      .patch("/events/event-1")
      .send({ title: "Admin Update" });

    expect(mockEventsService.updateEvent).toHaveBeenCalledWith(
      "event-1",
      "admin-1",
      expect.any(Object),
      true, // isSuperAdmin=true from mockAdminUser
    );
  });

  it("DELETE /events/:id passes isSuperAdmin=true to service", async () => {
    mockEventsService.deleteEvent.mockResolvedValue({ message: "Event deleted successfully" });

    await request(adminApp.getHttpServer()).delete("/events/event-1");

    expect(mockEventsService.deleteEvent).toHaveBeenCalledWith(
      "event-1",
      "admin-1",
      true, // isSuperAdmin=true from mockAdminUser
    );
  });
});

// ---------------------------------------------------------------------------
// Unauthorized access — guard returns false → NestJS returns 403
// ---------------------------------------------------------------------------
describe("EventsController (unauthorized access)", () => {
  let unauthApp: INestApplication;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [EventsController],
      providers: [{ provide: EventsService, useValue: mockEventsService }],
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

  it("returns 403 when guard denies POST /events", async () => {
    const response = await request(unauthApp.getHttpServer()).post("/events").send({
      type: "jam",
      title: "Hack Attempt",
      starts_at: "2026-03-01T10:00:00Z",
      ends_at: "2026-03-01T12:00:00Z",
    });

    expect(response.status).toBe(403);
    expect(mockEventsService.createEvent).not.toHaveBeenCalled();
  });
});
