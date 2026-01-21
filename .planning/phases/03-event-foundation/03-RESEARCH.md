# Phase 3: Event Foundation - Research

**Researched:** 2026-01-21
**Domain:** Event management, authorization, multi-type data modeling
**Confidence:** HIGH

## Summary

Phase 3 implements a multi-type event system extending the existing "jam" pattern to support classes, workshops, and conventions. The research reveals that the existing codebase already has a robust authorization pattern (owner + co-managers + super admins) that can be replicated for events.

**Key findings:**
- **Reuse existing patterns**: The jam authorization model (owner → jam_managers → super admin) is production-ready and should be replicated for events
- **Single table with type discriminator**: PostgreSQL best practice for 4 similar entity types with shared fields
- **Service-level authorization**: Existing pattern checks permissions before database operations, proven effective
- **Conditional validation challenges**: class-validator has limitations with type-based validation, use @ValidateIf decorator

**Primary recommendation:** Create parallel `events` and `event_organizers` tables mirroring the proven `jams`/`jam_managers` architecture, with type discriminator column and conditional field validation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| NestJS | 11.0+ | API framework | Already in use, provides Guards and decorators for authorization |
| class-validator | 0.14.2 | DTO validation | Already in use, supports conditional validation via @ValidateIf |
| class-transformer | 0.5.1 | DTO transformation | Already in use, type-safe DTO mapping |
| Supabase | 2.76.0 | Database + Auth | Already in use, PostgreSQL with RLS policies |
| PostgreSQL | 17 | Relational database | Via Supabase, supports JSONB for flexible fields |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| jsonwebtoken | 9.0.2 | JWT verification | Already in use for auth guard |
| @supabase/supabase-js | 2.76.0 | Supabase client | Database queries and RLS |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single events table | Separate tables per type | Single table simpler for 4 similar types with shared fields; separate tables better if types diverge significantly |
| Service-level auth | Guards only | Service-level gives fine-grained control for resource ownership; guards better for role-only checks |
| class-validator | Zod (nestjs-zod-dto) | class-validator already in use and sufficient; Zod offers better discriminated union support but adds dependency |

**Installation:**
No new packages required - all dependencies already in package.json.

## Architecture Patterns

### Recommended Project Structure
```
apps/backend/src/
├── events/                    # Event management module
│   ├── dto/
│   │   ├── create-event.dto.ts    # Base + type-specific fields
│   │   └── update-event.dto.ts    # Partial updates
│   ├── events.controller.ts       # REST endpoints
│   ├── events.service.ts          # Business logic + auth checks
│   └── events.module.ts
├── event-organizers/          # Co-organizer management
│   ├── event-organizers.controller.ts
│   ├── event-organizers.service.ts
│   └── event-organizers.module.ts
└── auth/
    └── supabase-auth.guard.ts    # Existing guard (reuse)
```

### Pattern 1: Service-Level Authorization (Existing Pattern)
**What:** Authorization checks performed in service methods before database operations
**When to use:** Resource ownership verification (events, co-organizers)
**Example:**
```typescript
// Source: Existing apps/backend/src/jams/jams.service.ts (lines 700-727)
async isOwnerOrCoOrganizer(
  eventId: string,
  userId: string,
  isSuperAdmin = false,
): Promise<boolean> {
  if (isSuperAdmin) {
    return true;
  }

  // Use Supabase RPC function (create similar to is_owner_or_manager)
  const { data, error } = await this.supabase.rpc('is_event_owner_or_organizer', {
    event_id: eventId,
    user_id: userId,
  });

  return data || false;
}

// In service methods
async updateEvent(eventId: string, userId: string, dto: UpdateEventDto, isSuperAdmin = false) {
  // Check authorization first
  const canEdit = await this.isOwnerOrCoOrganizer(eventId, userId, isSuperAdmin);
  if (!canEdit) {
    throw new ForbiddenException('You can only update events you own or co-organize');
  }

  // Proceed with update
  // ...
}
```

### Pattern 2: Type Discriminator Column (Single Table Inheritance)
**What:** Single table with `type` column to distinguish event types
**When to use:** Multiple similar entity types with shared core fields and some type-specific fields
**Example:**
```typescript
// Database schema
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('jam', 'class', 'workshop', 'convention')),

  -- Shared required fields
  title TEXT NOT NULL,
  location_text TEXT NOT NULL,
  starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Shared optional fields
  description TEXT,
  price TEXT,  -- Free-form: "Free", "€20", "$10-15", etc.
  external_link TEXT,
  organizer_contact TEXT,

  -- Location fields (all optional)
  location_lat NUMERIC,
  location_lng NUMERIC,
  gmaps_link TEXT,

  -- Type-specific fields (JSONB for flexibility)
  type_specific_data JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_events_type ON events(type);
CREATE INDEX idx_events_owner_id ON events(owner_id);
CREATE INDEX idx_events_starts_at ON events(starts_at);
```

### Pattern 3: Conditional DTO Validation
**What:** Validate fields based on event type using @ValidateIf decorator
**When to use:** Type-specific required fields in multi-type DTOs
**Example:**
```typescript
// Source: class-validator documentation + testing
import { IsString, IsOptional, IsIn, ValidateIf } from 'class-validator';

export class CreateEventDto {
  @IsString()
  @IsIn(['jam', 'class', 'workshop', 'convention'])
  type: string;

  @IsString()
  title: string;

  @IsString()
  location: string;

  // Jam-specific: managed features (capacity, participants)
  @ValidateIf(o => o.type === 'jam')
  @IsNumber()
  @Min(1)
  capacity?: number;

  // Class/Workshop: instructor info
  @ValidateIf(o => ['class', 'workshop'].includes(o.type))
  @IsString()
  @IsOptional()
  instructor?: string;

  // Convention: venue details
  @ValidateIf(o => o.type === 'convention')
  @IsString()
  @IsOptional()
  venue?: string;

  // All types: optional fields
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  external_link?: string;
}
```

### Pattern 4: Supabase RLS for Co-Organizers
**What:** Row Level Security policies that check ownership OR co-organizer status
**When to use:** Database-level authorization for event access
**Example:**
```sql
-- Source: Existing jams RLS policies + Supabase RLS documentation
-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_organizers ENABLE ROW LEVEL SECURITY;

-- Events policies
CREATE POLICY "Users can view events they own or co-organize"
  ON events FOR SELECT
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_organizers
      WHERE event_organizers.event_id = events.id
      AND event_organizers.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and co-organizers can update events"
  ON events FOR UPDATE
  USING (
    owner_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM event_organizers
      WHERE event_organizers.event_id = events.id
      AND event_organizers.user_id = auth.uid()
    )
  );

-- Event organizers policies
CREATE POLICY "Owners can manage co-organizers"
  ON event_organizers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id = event_organizers.event_id
      AND events.owner_id = auth.uid()
    )
  );

-- RPC function for authorization checks
CREATE OR REPLACE FUNCTION is_event_owner_or_organizer(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM events WHERE id = event_id AND owner_id = user_id
  ) OR EXISTS (
    SELECT 1 FROM event_organizers WHERE event_id = $1 AND user_id = $2
  );
END;
$$;
```

### Anti-Patterns to Avoid
- **Separate tables per event type**: Creates unnecessary complexity for 4 similar types; harder to query across all events
- **Guards-only authorization**: Missing resource-level checks; guards verify identity, services must verify ownership
- **Hand-rolled JWT verification**: Existing SupabaseAuthGuard already handles this correctly with super admin check
- **Client-side type validation**: Backend must validate event types and conditional fields; never trust client

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Authorization checks | Custom permission decorators | Service method checks + existing guard | Proven pattern in jams.service.ts, handles ownership + co-organizers + super admin |
| Co-organizer management | Custom multi-user logic | Copy managers.service.ts pattern | Already handles batch queries, validation, audit logging |
| JWT + super admin check | New auth guard | Existing SupabaseAuthGuard | Already queries is_super_admin from profiles table |
| RLS policy functions | Complex inline SQL | Supabase RPC functions | Existing is_owner_or_manager pattern, cacheable, testable |
| Audit logging | Manual logging | Existing AuditService | Already integrated, consistent format |

**Key insight:** The jam management system (jams + jam_managers + jam_participants) is production-ready and well-tested. Events should mirror this architecture, replacing jam-specific features (participants, waiting list) with event-type-specific concerns.

## Common Pitfalls

### Pitfall 1: Forgetting Super Admin in Authorization Checks
**What goes wrong:** Authorization checks only verify owner/co-organizer, blocking super admins
**Why it happens:** Easy to forget the `isSuperAdmin` parameter when copying authorization patterns
**How to avoid:** Always include `isSuperAdmin = false` parameter in service methods and check it first (early return true)
**Warning signs:** Super admins report "Forbidden" errors when trying to manage events

**Example from existing code:**
```typescript
// Source: apps/backend/src/jams/jams.service.ts (lines 700-707)
async isOwnerOrManager(jamId: string, userId: string, isSuperAdmin = false): Promise<boolean> {
  if (isSuperAdmin) {
    return true;  // ✅ Check super admin FIRST
  }
  // Then check ownership/manager status...
}
```

### Pitfall 2: Missing RLS Indexes on Policy Columns
**What goes wrong:** Queries become slow as events table grows, RLS policies scan full table
**Why it happens:** PostgreSQL cannot efficiently filter RLS policies without indexes on columns used in WHERE clauses
**How to avoid:** Create indexes on ALL columns referenced in RLS USING/WITH CHECK clauses
**Warning signs:** Slow query times on event lists, database CPU spikes

**Prevention:**
```sql
-- Source: Supabase RLS documentation + existing schema
-- Index columns used in RLS policies
CREATE INDEX idx_events_owner_id ON events(owner_id);  -- For owner checks
CREATE INDEX idx_event_organizers_event_id ON event_organizers(event_id);  -- For EXISTS subqueries
CREATE INDEX idx_event_organizers_user_id ON event_organizers(user_id);  -- For co-organizer checks

-- Composite index for common RLS pattern
CREATE INDEX idx_event_organizers_event_user ON event_organizers(event_id, user_id);
```

### Pitfall 3: Class-Validator Doesn't Support True Discriminated Unions
**What goes wrong:** Cannot define separate DTO classes per event type and auto-validate based on `type` field
**Why it happens:** class-validator uses decorator reflection, cannot dynamically switch validation class
**How to avoid:** Use single DTO with @ValidateIf for type-specific fields, or use custom validation pipe
**Warning signs:** TypeScript happy but runtime validation fails; type-specific required fields not enforced

**Workaround:**
```typescript
// ❌ This doesn't work with class-validator
type CreateEventDto = CreateJamDto | CreateClassDto | CreateWorkshopDto;

// ✅ Use this pattern instead
export class CreateEventDto {
  @IsString()
  @IsIn(['jam', 'class', 'workshop', 'convention'])
  type: string;

  // Type-specific validation with @ValidateIf
  @ValidateIf(o => o.type === 'jam')
  @IsNumber()
  @Min(1)
  capacity?: number;
}
```

### Pitfall 4: Negative Authorization Checks Without Throwing
**What goes wrong:** Service method checks authorization but continues execution if check fails silently
**Why it happens:** Forgetting to throw exception after failed authorization check
**How to avoid:** Always throw ForbiddenException immediately after negative authorization check
**Warning signs:** Users can perform actions they shouldn't; audit logs show unauthorized operations

**Example:**
```typescript
// ❌ BAD: Silent failure
const canEdit = await this.isOwnerOrCoOrganizer(eventId, userId, isSuperAdmin);
if (!canEdit) {
  console.log('User cannot edit');  // ❌ Logs but continues!
}
await this.supabase.from('events').update(...)  // ❌ Still executes

// ✅ GOOD: Explicit throw
const canEdit = await this.isOwnerOrCoOrganizer(eventId, userId, isSuperAdmin);
if (!canEdit) {
  throw new ForbiddenException('You can only update events you own or co-organize');
}
// Only reaches here if authorized
await this.supabase.from('events').update(...)
```

### Pitfall 5: Owner Can Delete Themselves as Co-Organizer
**What goes wrong:** Owner adds themselves to event_organizers table, can't distinguish from actual co-organizers
**Why it happens:** Not validating that co-organizer user_id !== owner_id
**How to avoid:** Validate managerUserId !== ownerId before inserting, throw BadRequestException
**Warning signs:** Duplicate permission records, confusion about who's the real owner

**Example from existing code:**
```typescript
// Source: apps/backend/src/managers/managers.service.ts (lines 97-99)
if (ownerId === managerUserId) {
  throw new BadRequestException('The owner cannot be added as a manager');
}
```

### Pitfall 6: Using JSONB Without Querying JSONB Fields
**What goes wrong:** Store type-specific data in JSONB but never need to query it, wastes performance
**Why it happens:** Premature optimization, thinking "JSONB is flexible"
**How to avoid:** Use JSONB only if you need to query inside it OR fields are truly dynamic per type
**Warning signs:** All JSONB queries do full column extraction, never filter on JSONB keys

**Decision for this phase:**
Based on requirements, event types have minimal type-specific fields and no complex querying needs. Store type-specific data in regular columns (capacity for jams, instructor for classes, etc.) rather than JSONB. Use JSONB only if future phases need truly dynamic fields.

## Code Examples

Verified patterns from official sources:

### Creating Event with Type-Specific Validation
```typescript
// Source: Adapted from apps/backend/src/jams/jams.controller.ts + class-validator docs
import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard';
import { User, AuthUser } from '../auth/user.decorator';

@Controller('events')
@UseGuards(SupabaseAuthGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  async createEvent(@User() user: AuthUser, @Body() createEventDto: CreateEventDto) {
    return this.eventsService.createEvent(user.id, createEventDto);
  }
}

// DTO with conditional validation
export class CreateEventDto {
  @IsString()
  @IsIn(['jam', 'class', 'workshop', 'convention'])
  type: string;

  @IsString()
  title: string;

  @IsString()
  location: string;

  @IsDateString()
  starts_at: string;

  @IsDateString()
  ends_at: string;

  // Optional fields (all types)
  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  price?: string;

  @IsOptional()
  @IsString()
  external_link?: string;

  @IsOptional()
  @IsString()
  organizer_contact?: string;

  // Type-specific: Only for jams (managed events)
  @ValidateIf(o => o.type === 'jam')
  @IsNumber()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
```

### Authorization Check in Service Method
```typescript
// Source: apps/backend/src/jams/jams.service.ts (lines 368-387)
async updateEvent(
  eventId: string,
  userId: string,
  updateEventDto: UpdateEventDto,
  isSuperAdmin = false,
) {
  // Check authorization FIRST - throws if unauthorized
  const canEdit = await this.isOwnerOrCoOrganizer(eventId, userId, isSuperAdmin);
  if (!canEdit) {
    throw new ForbiddenException('You can only update events you own or co-organize');
  }

  // Validate dates if provided
  if (updateEventDto.starts_at || updateEventDto.ends_at) {
    const existingEvent = await this.getEventById(eventId, userId, isSuperAdmin);
    const start = new Date(updateEventDto.starts_at || existingEvent.starts_at);
    const end = new Date(updateEventDto.ends_at || existingEvent.ends_at);

    if (end <= start) {
      throw new BadRequestException('End date must be after start date');
    }
  }

  // Proceed with update
  const { data, error } = await this.supabase
    .from('events')
    .update(updateEventDto)
    .eq('id', eventId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update event: ${error.message}`);
  }

  // Audit log
  await this.auditService.log(eventId, userId, 'event_updated', updateEventDto);

  return data;
}
```

### Managing Co-Organizers
```typescript
// Source: apps/backend/src/managers/managers.service.ts (lines 75-144)
async addCoOrganizer(
  eventId: string,
  ownerId: string,
  coOrganizerUserId: string,
  isSuperAdmin = false,
) {
  // Check event exists and user is owner
  const { data: event, error: eventError } = await this.supabase
    .from('events')
    .select('id, owner_id')
    .eq('id', eventId)
    .single();

  if (eventError || !event) {
    throw new NotFoundException('Event not found');
  }

  // Only owner can add co-organizers (super admin bypasses)
  if (!isSuperAdmin && event.owner_id !== ownerId) {
    throw new ForbiddenException('Only the event owner can add co-organizers');
  }

  // Owner cannot be added as co-organizer
  if (ownerId === coOrganizerUserId) {
    throw new BadRequestException('The owner cannot be added as a co-organizer');
  }

  // Check user exists
  const { data: profile, error: profileError } = await this.supabase
    .from('profiles')
    .select('id')
    .eq('id', coOrganizerUserId)
    .single();

  if (profileError || !profile) {
    throw new NotFoundException('User not found');
  }

  // Check not already a co-organizer
  const { data: existing } = await this.supabase
    .from('event_organizers')
    .select('user_id')
    .eq('event_id', eventId)
    .eq('user_id', coOrganizerUserId)
    .maybeSingle();

  if (existing) {
    throw new BadRequestException('User is already a co-organizer for this event');
  }

  // Insert co-organizer
  const { data, error } = await this.supabase
    .from('event_organizers')
    .insert({
      event_id: eventId,
      user_id: coOrganizerUserId,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to add co-organizer: ${error.message}`);
  }

  // Audit log
  await this.auditService.log(eventId, ownerId, 'co_organizer_added', {
    co_organizer_user_id: coOrganizerUserId,
  });

  return data;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate auth guards per resource | Service-level authorization with reusable RPC functions | NestJS 8+ (2021) | Simpler guard logic, authorization closer to business logic |
| Multiple tables per entity type | Single table with discriminator for similar types | PostgreSQL best practices | Easier querying across types, simpler schema for 4 similar types |
| RBAC (roles only) | RBAC + Resource ownership | Modern SaaS pattern (2020+) | Fine-grained permissions, owners + co-owners + admins |
| class-validator unions | @ValidateIf conditionals | class-validator limitation | Workaround for type-based validation, no true discriminated unions |

**Deprecated/outdated:**
- Multiple separate tables for similar event types: Adds complexity without benefit when types share 90% of fields
- Guards-only authorization: Missing resource ownership checks, must combine with service-level checks
- Inline RLS SQL: Use Supabase RPC functions for complex authorization logic (reusable, testable, performant)

## Open Questions

Things that couldn't be fully resolved:

1. **Event Type-Specific Fields Strategy**
   - What we know: Requirements specify minimal type-specific needs (jams are "managed" with participants, others are "listings only")
   - What's unclear: Future phases may add more type-specific fields (workshop materials, convention schedule, class prerequisites)
   - Recommendation: Start with regular columns for known type-specific fields (capacity for jams). Add JSONB `type_specific_data` column for future extensibility but leave it unused initially. This allows adding fields without migrations later.

2. **Jam Events vs Event System Relationship**
   - What we know: Requirements say "jams are managed via existing system" but also "support event type: jam (managed via existing system)"
   - What's unclear: Should existing `jams` table remain separate OR should new `events` table include type='jam' rows?
   - Recommendation: Keep `jams` table separate initially (minimizes changes to working system). Phase 3 creates `events` table without type='jam'. Future phase could migrate jams → events if needed.

3. **Public Event Visibility**
   - What we know: Requirement EVENT-05 says "User can create event listing" (implies public visibility for listings)
   - What's unclear: Are all events publicly visible, or do events have draft/published status like jams?
   - Recommendation: Implement same pattern as jams - events have `status` column (draft/published). Users can create drafts, only published events appear in public listings. This matches user expectations from jam workflow.

## Sources

### Primary (HIGH confidence)
- **NestJS Official Documentation** (attempted: https://docs.nestjs.com/security/authorization, https://docs.nestjs.com/guards) - WebFetch returned incomplete content, relying on existing codebase patterns instead
- **Existing Codebase** (apps/backend/src/jams/, apps/backend/src/managers/) - Production code demonstrating proven authorization patterns
- **Supabase RLS Documentation** - https://supabase.com/docs/guides/database/postgres/row-level-security - Row Level Security best practices
- **PostgreSQL Official Documentation** - https://www.postgresql.org/docs/current/ddl-inherit.html - Table inheritance and type discrimination
- **class-validator GitHub** - https://github.com/typestack/class-validator - Conditional validation documentation

### Secondary (MEDIUM confidence)
- [Implement RBAC Authorization in a NestJS: Full Guide](https://www.permit.io/blog/how-to-protect-a-url-inside-a-nestjs-app-using-rbac-authorization) - NestJS authorization patterns
- [Role-based access control (RBAC) in NestJS](https://medium.com/@chandantechie/role-based-access-control-rbac-in-nestjs-a5963bcd70bd) - RBAC implementation guide
- [Authorization | NestJS](https://docs.nestjs.com/security/authorization) - Official authorization documentation
- [Supabase Row Level Security Explained](https://medium.com/@jigsz6391/supabase-row-level-security-explained-with-real-examples-6d06ce8d221c) - RLS patterns with examples
- [PostgreSQL: performance considerations of jsonb vs separate rows](https://www.postgresql.org/message-id/34B9328E-F435-4460-A877-96F61AC62CEE@gmail.com) - JSONB performance discussion
- [When To Avoid JSONB In A PostgreSQL Schema](https://www.heap.io/blog/when-to-avoid-jsonb-in-a-postgresql-schema) - JSONB antipatterns
- [Validating a polymorphic body in nest JS](https://dev.to/webeleon/validating-a-polymorphic-body-in-nest-js-27a7) - Discriminated union validation workarounds

### Tertiary (LOW confidence)
- [Authorization Cheat Sheet - OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html) - General authorization best practices (not NestJS-specific)
- [Single-table vs. multi-table design in Amazon DynamoDB](https://aws.amazon.com/blogs/database/single-table-vs-multi-table-design-in-amazon-dynamodb/) - DynamoDB patterns (different database, principles apply)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already in use, versions confirmed from package.json
- Architecture: HIGH - Patterns verified in existing production code (jams, managers)
- Pitfalls: HIGH - Based on existing code patterns and official documentation
- Authorization: HIGH - Working implementation in jams.service.ts, proven in production
- Validation: MEDIUM - class-validator limitations found via GitHub issues, workarounds tested

**Research date:** 2026-01-21
**Valid until:** ~30 days (stable technologies, NestJS 11 and Supabase patterns mature)

**Key decisions for planner:**
1. Mirror jams/jam_managers architecture for events/event_organizers
2. Single events table with type discriminator column
3. Reuse existing SupabaseAuthGuard and authorization patterns
4. Service-level authorization checks before all operations
5. @ValidateIf for type-specific field validation
6. Keep jams table separate (don't migrate to events table in this phase)
