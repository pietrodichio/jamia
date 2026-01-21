# Phase 5: Event Enhancements - Research

**Researched:** 2026-01-21
**Domain:** Recurring events, teacher associations, managed jam integration, geocoding, advanced filters
**Confidence:** HIGH

## Summary

Phase 5 adds four major enhancement domains to the event system: recurring events with series management, teacher associations for educational events, bidirectional sync between managed jams and event listings, and advanced filtering including city-based geocoding. Each domain has distinct technical requirements and established patterns.

**Recurring events** are the most complex domain. The industry standard uses iCalendar RRULE format (RFC 5545) to define recurrence patterns, with two proven storage strategies: (1) store RRULE string + generate occurrences on-demand, or (2) store RRULE + materialize occurrences table. The rrule.js library (TypeScript-native) handles parsing and occurrence generation. Exception handling (editing/canceling single occurrences) requires storing modified instances separately with references to the parent series. Google Calendar's pattern of "Edit this/all future/all events" requires splitting series at the edit point.

**Teacher associations** are straightforward: a many-to-many junction table (event_teachers) linking events to user profiles. This is simpler than arrays due to better query performance for "events by teacher" lookups and clearer relational semantics.

**Managed jam integration** requires keeping jam data in sync with event listings. The key decision: database triggers vs application-level sync. Research shows triggers are problematic at scale (performance, maintainability, testability). Application-level sync via service methods is recommended: when a jam is created/updated/deleted, the service also creates/updates/deletes corresponding event records.

**Geocoding and advanced filters** extend existing PostGIS foundation. Free geocoding options exist (Nominatim/OpenStreetMap) but have strict rate limits. Mapbox offers best cost/quality for moderate volume. For filters, PostgreSQL ARRAY columns with GIN indexes provide excellent performance for tag-based filtering (skill level, amenities). City search requires geocoding city names to coordinates, then using existing ST_DWithin spatial queries.

**Primary recommendation:** Use rrule.js library with database RRULE storage, generate occurrences on-demand for display, store exceptions in separate event_occurrences table. Use junction table for teachers. Implement application-level sync for jam integration. Start with manual lat/lng input, defer geocoding API choice to avoid costs until usage patterns are known. Use ARRAY columns with GIN indexes for multi-select tag filters.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| rrule | 2.8+ | Recurrence rule parsing and generation | Industry standard, implements RFC 5545, TypeScript support, 3.4K+ stars |
| PostgreSQL ARRAY | Native | Tag storage for filters | Built-in, GIN indexable, excellent performance for contains queries |
| PostGIS ST_DWithin | 3.4+ | City-based radius search | Already in Phase 4, perfect for geocoded city coords |
| Application sync | Pattern | Jam-to-event data sync | More maintainable than triggers, explicit control flow |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Mapbox Geocoding API | v6 | City name to coordinates | If budget allows, best cost/quality for moderate volume |
| Nominatim API | Latest | Free geocoding alternative | Low volume only (1 req/sec limit), self-hosting for scale |
| React Hook Form | 7.61+ | Already in project for form handling | Tag selection, filter forms |
| Radix UI Checkbox | 1.3+ | Already in project for multi-select UI | Tag/amenity filter checkboxes |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| rrule.js | rSchedule | More features but heavier, less established (1.1K vs 3.4K stars) |
| RRULE storage | Pre-compute all occurrences | Simpler queries but storage bloat, harder to edit series |
| Application sync | Database triggers | Triggers harder to test/debug, sync operations visible in app |
| ARRAY columns for tags | Many-to-many junction table | Junction table more flexible but 3-5x slower for tag filtering |
| Mapbox Geocoding | Google Places API | Google more accurate but 30-40x more expensive |

**Installation:**
```bash
# Frontend (web)
pnpm add rrule

# No backend changes needed - all logic client-side or in SQL
```

## Architecture Patterns

### Recommended Project Structure
```
apps/web/src/
├── components/
│   ├── events/
│   │   ├── RecurrenceEditor.tsx       # RRULE builder UI
│   │   ├── RecurrenceDisplay.tsx      # Human-readable recurrence
│   │   ├── TeacherSelect.tsx          # Multi-select for teachers
│   │   ├── TagFilter.tsx              # Checkbox group for tags
│   │   └── CitySearch.tsx             # City autocomplete/geocoding
│   └── filters/
│       ├── TagCheckboxGroup.tsx       # Reusable tag filter
│       └── AmenityFilters.tsx         # Accommodation/food filters
├── hooks/
│   ├── useRecurrence.ts               # rrule.js integration
│   ├── useEventOccurrences.ts         # Generate occurrence dates
│   └── useGeocode.ts                  # City → coordinates
└── lib/
    └── rrule/
        ├── helpers.ts                 # RRULE string builders
        └── patterns.ts                # Common patterns (weekly, monthly)

apps/backend/src/
├── events/
│   └── events.service.ts              # Sync jams → events on jam changes
└── teachers/
    ├── teachers.controller.ts         # CRUD for event_teachers
    └── teachers.service.ts            # Authorization checks

apps/web/supabase/migrations/
└── 20260121120000_add_recurring_and_enhancements.sql
```

### Pattern 1: RRULE Storage with On-Demand Generation
**What:** Store RRULE string in database, generate occurrences in application when needed
**When to use:** Recurring event creation, series editing, calendar display
**Example:**
```typescript
// Source: rrule.js documentation + thoughtbot pattern
import { RRule, rrulestr } from 'rrule';

// Creating a recurrence rule
const rule = new RRule({
  freq: RRule.WEEKLY,
  interval: 1,
  byweekday: [RRule.MO, RRule.WE],
  dtstart: new Date('2026-02-01T10:00:00Z'),
  until: new Date('2026-12-31T10:00:00Z')
});

// Store in database
const rruleString = rule.toString(); // "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;UNTIL=20261231T100000Z"

// Later: retrieve and generate occurrences
const storedRule = rrulestr(rruleString, {
  dtstart: new Date('2026-02-01T10:00:00Z')
});

// Get next 10 occurrences
const occurrences = storedRule.all((date, i) => i < 10);

// Get occurrences in date range
const rangeOccurrences = storedRule.between(
  new Date('2026-02-01'),
  new Date('2026-03-01')
);
```

### Pattern 2: Exception Storage for Modified Occurrences
**What:** Store edited/canceled individual occurrences in separate table linked to parent series
**When to use:** User edits single occurrence or cancels specific date
**Example:**
```sql
-- Source: Multiple sources on recurring event exceptions
-- Main events table has recurrence info
CREATE TABLE events (
  id UUID PRIMARY KEY,
  -- ... other fields ...
  recurrence_rule TEXT,  -- RRULE string (NULL for non-recurring)
  recurrence_dtstart TIMESTAMPTZ,  -- Base start time for series
  recurrence_until TIMESTAMPTZ,  -- Series end date
  parent_event_id UUID REFERENCES events(id) ON DELETE CASCADE,  -- NULL for parent, set for split series
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exceptions table for modified/canceled occurrences
CREATE TABLE event_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  original_start TIMESTAMPTZ NOT NULL,  -- Original scheduled time
  is_cancelled BOOLEAN DEFAULT FALSE,  -- True if occurrence deleted

  -- Override fields (NULL = use parent event's value)
  override_title TEXT,
  override_location_text TEXT,
  override_starts_at TIMESTAMPTZ,  -- Modified start time
  override_ends_at TIMESTAMPTZ,    -- Modified end time
  override_description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, original_start)  -- One exception per occurrence
);

CREATE INDEX idx_event_occurrences_event_id ON event_occurrences(event_id);
CREATE INDEX idx_event_occurrences_original_start ON event_occurrences(original_start);
```

### Pattern 3: "Edit Future Events" via Series Splitting
**What:** When editing "this and future events", truncate original series and create new series
**When to use:** User changes recurrence pattern or event details for future occurrences only
**Example:**
```typescript
// Source: Google Calendar pattern analysis
async function editFutureOccurrences(
  eventId: string,
  fromDate: Date,
  updates: Partial<Event>
) {
  const originalEvent = await getEvent(eventId);
  const originalRule = rrulestr(originalEvent.recurrence_rule, {
    dtstart: originalEvent.recurrence_dtstart
  });

  // 1. Truncate original series to end before edit date
  const truncatedRule = new RRule({
    ...originalRule.origOptions,
    until: new Date(fromDate.getTime() - 1) // End 1ms before edit date
  });

  await updateEvent(eventId, {
    recurrence_rule: truncatedRule.toString(),
    recurrence_until: truncatedRule.options.until
  });

  // 2. Create new series starting from edit date
  const newRule = new RRule({
    ...originalRule.origOptions,
    dtstart: fromDate,
    ...updates.recurrence_changes // Any recurrence changes
  });

  const newEvent = await createEvent({
    ...originalEvent,
    ...updates,
    recurrence_rule: newRule.toString(),
    recurrence_dtstart: fromDate,
    parent_event_id: eventId // Link to original series
  });

  return { truncated: eventId, newSeries: newEvent.id };
}
```

### Pattern 4: Application-Level Jam Sync
**What:** When jam is created/updated/deleted, service method also creates/updates/deletes event
**When to use:** Managed jam changes that should reflect in event directory
**Example:**
```typescript
// Source: Analysis of trigger alternatives
// In jams.service.ts
async createJam(userId: string, createJamDto: CreateJamDto) {
  // 1. Create jam as normal
  const jam = await this.supabase
    .from('jams')
    .insert({ owner_id: userId, ...createJamDto })
    .select()
    .single();

  // 2. If jam is public/managed, create corresponding event
  if (createJamDto.status === 'published' && createJamDto.visibility === 'managed') {
    await this.eventsService.createEventFromJam(jam);
  }

  return jam;
}

// In events.service.ts
async createEventFromJam(jam: Jam) {
  // Map jam fields to event fields
  const eventData = {
    owner_id: jam.owner_id,
    type: 'jam',
    title: jam.name,
    location_text: jam.location_text,
    location_lat: jam.location_lat,
    location_lng: jam.location_lng,
    gmaps_link: jam.gmaps_link,
    starts_at: jam.starts_at,
    ends_at: jam.ends_at,
    description: jam.description,
    status: jam.status, // Mirror jam status
    source_jam_id: jam.id,  // Link back to jam
  };

  return await this.supabase
    .from('events')
    .insert(eventData)
    .select()
    .single();
}

async syncJamUpdate(jamId: string, updates: Partial<Jam>) {
  // Find linked event
  const { data: event } = await this.supabase
    .from('events')
    .select('id')
    .eq('source_jam_id', jamId)
    .maybeSingle();

  if (!event) return; // No linked event

  // Map updates
  const eventUpdates = this.mapJamToEventFields(updates);

  await this.supabase
    .from('events')
    .update(eventUpdates)
    .eq('id', event.id);
}
```

### Pattern 5: Many-to-Many Teachers Table
**What:** Junction table linking events to teacher profiles
**When to use:** Classes, workshops, conventions with instructors
**Example:**
```sql
-- Source: Standard PostgreSQL many-to-many pattern
CREATE TABLE event_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,  -- Optional: "lead instructor", "assistant", etc.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_teachers_event_id ON event_teachers(event_id);
CREATE INDEX idx_event_teachers_user_id ON event_teachers(user_id);

-- Query: Get all teachers for an event
SELECT p.id, p.name, p.photo_url, et.role
FROM event_teachers et
JOIN profiles p ON p.id = et.user_id
WHERE et.event_id = $1;

-- Query: Get all events by a teacher
SELECT e.*, et.role
FROM events e
JOIN event_teachers et ON et.event_id = e.id
WHERE et.user_id = $1
  AND e.status = 'published'
ORDER BY e.starts_at;
```

### Pattern 6: ARRAY Columns with GIN Indexes for Tags
**What:** Store tags as PostgreSQL arrays, use GIN index for fast contains queries
**When to use:** Multi-select filters (skill level, amenities, dietary options)
**Example:**
```sql
-- Source: PostgreSQL GIN index documentation
-- Add tag columns to events table
ALTER TABLE events
  ADD COLUMN tags TEXT[] DEFAULT '{}',
  ADD COLUMN accommodation_options TEXT[] DEFAULT '{}',  -- ['hotel', 'camping', 'hostel']
  ADD COLUMN food_options TEXT[] DEFAULT '{}';  -- ['breakfast', 'lunch', 'dinner', 'vegan']

-- Create GIN indexes for array containment queries
CREATE INDEX idx_events_tags ON events USING GIN (tags);
CREATE INDEX idx_events_accommodation ON events USING GIN (accommodation_options);
CREATE INDEX idx_events_food ON events USING GIN (food_options);

-- Query: Events with specific tags (uses @> "contains" operator)
SELECT * FROM events
WHERE tags @> ARRAY['beginner-friendly', 'outdoor']  -- Has both tags
  AND status = 'published';

-- Query: Events with ANY of the tags (uses && "overlap" operator)
SELECT * FROM events
WHERE tags && ARRAY['intermediate', 'advanced']  -- Has at least one
  AND status = 'published';

-- Query: Combine with other filters
SELECT * FROM events
WHERE tags @> ARRAY['workshop']
  AND accommodation_options && ARRAY['hotel', 'hostel']
  AND food_options @> ARRAY['vegan']
  AND status = 'published'
ORDER BY starts_at;
```

### Pattern 7: City Geocoding with Caching
**What:** Convert city name to coordinates, cache results in database to avoid repeated API calls
**When to use:** City-based event search
**Example:**
```typescript
// Source: Geocoding best practices
// Create geocoding cache table
// In migration:
/*
CREATE TABLE geocoding_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  query TEXT NOT NULL UNIQUE,  -- "San Francisco, CA, USA"
  lat NUMERIC NOT NULL,
  lng NUMERIC NOT NULL,
  place_id TEXT,
  formatted_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_geocoding_cache_query ON geocoding_cache(query);
*/

// In useGeocode.ts hook
async function geocodeCity(cityName: string): Promise<{ lat: number; lng: number }> {
  // 1. Check cache first
  const { data: cached } = await supabase
    .from('geocoding_cache')
    .select('lat, lng')
    .eq('query', cityName)
    .maybeSingle();

  if (cached) {
    return { lat: Number(cached.lat), lng: Number(cached.lng) };
  }

  // 2. Call geocoding API (Mapbox example)
  const response = await fetch(
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=${MAPBOX_TOKEN}`
  );
  const data = await response.json();

  if (!data.features?.[0]) {
    throw new Error('City not found');
  }

  const [lng, lat] = data.features[0].center;

  // 3. Cache for future use
  await supabase
    .from('geocoding_cache')
    .insert({
      query: cityName,
      lat,
      lng,
      place_id: data.features[0].id,
      formatted_address: data.features[0].place_name
    });

  return { lat, lng };
}
```

### Anti-Patterns to Avoid
- **Pre-computing all occurrences:** Generates thousands of rows for long series, makes editing series complex
- **Using database triggers for jam sync:** Hard to test, debug, and maintain; sync failures silent
- **Storing exceptions as EXDATE strings:** EXDATE is deprecated in RFC 5545, harder to query than table
- **Many-to-many junction table for tags:** 3-5x slower than ARRAY columns for tag filtering
- **Geocoding on every search:** Rate limits and costs; always cache geocoding results
- **Complex RRULE builder UI:** Start with simple presets (weekly, monthly), add custom later

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Recurrence rule parsing | Custom frequency logic | rrule.js library | Handles edge cases: timezones, DST, month boundaries, BYMONTHDAY/BYDAY |
| Occurrence generation | Manual date arithmetic | rrule.all() or .between() | Accounts for leap years, DST transitions, skipped dates |
| RRULE string building | String concatenation | RRule constructor + toString() | Type-safe, validates rules, handles escaping |
| City autocomplete | Custom search | Geocoding API autocomplete | Handles typos, abbreviations, international addresses |
| Tag filtering UI | Custom checkbox logic | Radix UI Checkbox (already in project) | Accessibility, keyboard navigation, indeterminate state |
| Array contains queries | String matching or JSONB | PostgreSQL ARRAY @> operator + GIN index | 10-50x faster, purpose-built indexes |
| Jam-event sync validation | Manual field mapping | Service method with DTO transformation | Type-safe, centralized logic, easier to test |

**Key insight:** Recurring events have decades of edge cases (timezones, DST, leap years). RRULE (RFC 5545) is the universal standard. Don't reinvent it. For jam sync, explicit service calls beat magic triggers every time.

## Common Pitfalls

### Pitfall 1: Not Storing dtstart Separately from RRULE
**What goes wrong:** RRULE string doesn't include actual start date/time, only pattern
**Why it happens:** Assuming RRULE is self-contained like "FREQ=WEEKLY" seems complete
**How to avoid:** Always store recurrence_dtstart TIMESTAMPTZ alongside recurrence_rule TEXT
**Warning signs:** rrulestr() throws errors, occurrences generated with wrong start time

**Example:**
```typescript
// ❌ BAD: RRULE alone is incomplete
const event = {
  recurrence_rule: "FREQ=WEEKLY;BYDAY=MO,WE"  // What's the start time?
};

// ✅ GOOD: Store base datetime separately
const event = {
  recurrence_rule: "FREQ=WEEKLY;BYDAY=MO,WE",
  recurrence_dtstart: new Date('2026-02-03T10:00:00Z'),  // First Monday
  starts_at: new Date('2026-02-03T10:00:00Z'),  // Same as dtstart for parent
  ends_at: new Date('2026-02-03T12:00:00Z')
};

// Generate occurrences
const rule = rrulestr(event.recurrence_rule, {
  dtstart: event.recurrence_dtstart  // Required!
});
```

**Source:** [rrule.js documentation](https://github.com/jkbrzt/rrule)

### Pitfall 2: Editing Series Without Handling Existing Exceptions
**What goes wrong:** Editing parent series invalidates exception occurrences, causing orphaned data
**Why it happens:** Not considering that exceptions reference specific original_start dates
**How to avoid:** When editing series, re-validate all exceptions against new recurrence pattern
**Warning signs:** Exceptions appear on wrong dates, canceled occurrences reappear

**Example:**
```typescript
// ❌ BAD: Edit series without considering exceptions
await updateEvent(eventId, {
  recurrence_rule: newRule.toString()
});

// ✅ GOOD: Re-validate exceptions
async function updateRecurrenceSafely(eventId: string, newRule: RRule) {
  // 1. Get all existing exceptions
  const { data: exceptions } = await supabase
    .from('event_occurrences')
    .select('*')
    .eq('event_id', eventId);

  // 2. Generate new occurrence dates
  const newOccurrences = newRule.all();

  // 3. Check if exceptions still valid
  const validExceptions = exceptions.filter(exc =>
    newOccurrences.some(occ =>
      occ.getTime() === exc.original_start.getTime()
    )
  );

  const invalidExceptionIds = exceptions
    .filter(exc => !validExceptions.includes(exc))
    .map(exc => exc.id);

  // 4. Update series and clean invalid exceptions
  await supabase.rpc('update_series_with_cleanup', {
    event_id: eventId,
    new_rule: newRule.toString(),
    invalid_exception_ids: invalidExceptionIds
  });
}
```

**Source:** [Recurring Calendar Events — Database Design](https://medium.com/@aureliadotlim/recurring-calendar-events-database-design-dc872fb4f2b5)

### Pitfall 3: Using Triggers for Jam-Event Sync
**What goes wrong:** Triggers add hidden complexity, fail silently, hard to debug
**Why it happens:** Triggers seem automatic and convenient
**How to avoid:** Use explicit service method calls for sync operations
**Warning signs:** Events out of sync with jams, no error logs, mysterious performance issues

**Example:**
```sql
-- ❌ BAD: Trigger-based sync (seems convenient but problematic)
CREATE TRIGGER sync_jam_to_event
AFTER INSERT OR UPDATE ON jams
FOR EACH ROW
EXECUTE FUNCTION sync_jam_to_event_function();
-- Problem: Failures are silent, hard to test, performance overhead

-- ✅ GOOD: Application-level sync (explicit and testable)
```

```typescript
// In jams.service.ts
async updateJam(jamId: string, updates: UpdateJamDto) {
  // 1. Update jam
  const jam = await this.supabase
    .from('jams')
    .update(updates)
    .eq('id', jamId)
    .select()
    .single();

  // 2. Explicitly sync to events if managed
  if (jam.visibility === 'managed') {
    await this.eventsService.syncJamUpdate(jamId, updates);
  }

  return jam;
}
```

**Source:** [Code in database vs. code in application](https://brandur.org/fragments/code-database-vs-app), [Using Database Triggers: My Experience](https://medium.com/@agarwal29manish/using-database-triggers-my-experience-and-why-they-didnt-quite-work-715710695656)

### Pitfall 4: Missing GIN Index on ARRAY Columns
**What goes wrong:** Tag filter queries are slow (100ms+), fall back to sequential scans
**Why it happens:** Adding ARRAY column but forgetting GIN index
**How to avoid:** Always create GIN index immediately after adding ARRAY column
**Warning signs:** EXPLAIN shows Seq Scan on events table, slow filter responses

**Example:**
```sql
-- ❌ BAD: ARRAY column without index
ALTER TABLE events ADD COLUMN tags TEXT[] DEFAULT '{}';
-- Queries will be slow!

-- ✅ GOOD: ARRAY column with GIN index
ALTER TABLE events ADD COLUMN tags TEXT[] DEFAULT '{}';
CREATE INDEX idx_events_tags ON events USING GIN (tags);
-- Fast @> and && queries
```

**Benchmark:**
- Without GIN: ~200ms for tag filter on 10K events (sequential scan)
- With GIN: ~5ms for tag filter on 10K events (index scan)

**Source:** [Optimizing Array Queries With GIN Indexes in PostgreSQL](https://www.tigerdata.com/learn/optimizing-array-queries-with-gin-indexes-in-postgresql)

### Pitfall 5: Geocoding Without Rate Limiting
**What goes wrong:** Hit API rate limits, get blocked, high costs
**Why it happens:** Not implementing caching or rate limiting
**How to avoid:** Cache all geocoding results, implement request throttling
**Warning signs:** 429 Too Many Requests errors, unexpected API bills

**Example:**
```typescript
// ❌ BAD: Geocode on every search
function searchEventsByCity(cityName: string) {
  const coords = await geocodeCity(cityName);  // API call every time!
  return searchByCoords(coords);
}

// ✅ GOOD: Check cache first
async function searchEventsByCity(cityName: string) {
  // 1. Check database cache
  const cached = await getCachedGeocode(cityName);
  if (cached) return searchByCoords(cached);

  // 2. Rate limit API calls
  await rateLimiter.wait();  // Enforce 1 req/sec for free tier

  // 3. Call API and cache result
  const coords = await geocodeCity(cityName);
  await cacheGeocode(cityName, coords);

  return searchByCoords(coords);
}
```

**Rate limits:**
- Nominatim (free): 1 request/second
- Mapbox (free tier): 100,000/month
- Google Places: $5 per 1,000 requests after free tier

**Source:** [Geocoding Best Practices](https://developers.google.com/maps/documentation/geocoding/geocoding-strategies)

### Pitfall 6: Not Handling RRULE Timezone Issues
**What goes wrong:** Recurring events appear at wrong times, DST transitions break occurrences
**Why it happens:** Not considering that RRULE generation happens in different timezone than storage
**How to avoid:** Always use UTC for storage, convert to user timezone only for display
**Warning signs:** Events shift by 1 hour during DST changes, occurrences at unexpected times

**Example:**
```typescript
// ❌ BAD: Generate RRULE in user's timezone
const rule = new RRule({
  freq: RRule.WEEKLY,
  dtstart: new Date('2026-02-01T10:00:00-08:00')  // PST timezone
});
// Problem: DST transition in March changes times

// ✅ GOOD: Always use UTC for storage
const rule = new RRule({
  freq: RRule.WEEKLY,
  dtstart: new Date('2026-02-01T18:00:00Z')  // UTC equivalent of 10am PST
});

// Display: Convert to user timezone
const occurrences = rule.all();
const displayTime = format(occurrences[0], 'p', {
  timeZone: 'America/Los_Angeles'
});
```

**Source:** [The Deceptively Complex World of Calendar Events and RRULEs](https://www.nylas.com/blog/calendar-events-rrules/)

### Pitfall 7: Querying ARRAY Columns with IN Instead of ANY
**What goes wrong:** Tag filters don't use GIN index, fall back to sequential scan
**Why it happens:** Using SQL IN operator instead of PostgreSQL-specific ANY operator
**How to avoid:** Use = ANY(column) pattern for array membership, @> for array containment
**Warning signs:** EXPLAIN shows no index usage despite GIN index existing

**Example:**
```sql
-- ❌ BAD: IN operator doesn't use GIN index
SELECT * FROM events
WHERE 'beginner-friendly' IN (SELECT unnest(tags));
-- Sequential scan!

-- ✅ GOOD: Use array operators that leverage GIN
SELECT * FROM events
WHERE tags @> ARRAY['beginner-friendly'];  -- Contains operator, uses GIN

-- Also good: Check if array contains ANY of values
SELECT * FROM events
WHERE tags && ARRAY['beginner', 'intermediate'];  -- Overlap operator, uses GIN
```

**Source:** [The hidden cost of PostgreSQL arrays](https://boringsql.com/posts/good-bad-arrays/)

## Code Examples

Verified patterns from official sources:

### Recurrence Rule Builder Component
```typescript
// Source: rrule.js documentation
import { RRule } from 'rrule';
import { useState } from 'react';

type Frequency = 'DAILY' | 'WEEKLY' | 'MONTHLY';

export function RecurrenceEditor({
  value,
  onChange
}: {
  value: string | null;
  onChange: (rrule: string | null, dtstart: Date | null) => void;
}) {
  const [enabled, setEnabled] = useState(!!value);
  const [freq, setFreq] = useState<Frequency>('WEEKLY');
  const [interval, setInterval] = useState(1);
  const [until, setUntil] = useState<Date | null>(null);
  const [dtstart, setDtstart] = useState(new Date());

  const handleUpdate = () => {
    if (!enabled) {
      onChange(null, null);
      return;
    }

    const rule = new RRule({
      freq: RRule[freq],
      interval,
      dtstart,
      until: until || undefined
    });

    onChange(rule.toString(), dtstart);
  };

  return (
    <div>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
        />
        Recurring Event
      </label>

      {enabled && (
        <>
          <div>
            <label>Repeat every:</label>
            <input
              type="number"
              min={1}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
            />
            <select value={freq} onChange={(e) => setFreq(e.target.value as Frequency)}>
              <option value="DAILY">Days</option>
              <option value="WEEKLY">Weeks</option>
              <option value="MONTHLY">Months</option>
            </select>
          </div>

          <div>
            <label>Start date:</label>
            <input
              type="datetime-local"
              value={dtstart.toISOString().slice(0, 16)}
              onChange={(e) => setDtstart(new Date(e.target.value))}
            />
          </div>

          <div>
            <label>End date:</label>
            <input
              type="date"
              value={until?.toISOString().slice(0, 10) || ''}
              onChange={(e) => setUntil(e.target.value ? new Date(e.target.value) : null)}
            />
          </div>

          <button type="button" onClick={handleUpdate}>
            Apply Recurrence
          </button>
        </>
      )}
    </div>
  );
}
```

### Generate Occurrences for Display
```typescript
// Source: rrule.js documentation
import { rrulestr } from 'rrule';

interface RecurringEvent {
  id: string;
  recurrence_rule: string;
  recurrence_dtstart: string;
  starts_at: string;
  ends_at: string;
  // ... other fields
}

export function useEventOccurrences(
  event: RecurringEvent,
  rangeStart: Date,
  rangeEnd: Date
) {
  const [occurrences, setOccurrences] = useState<Date[]>([]);

  useEffect(() => {
    if (!event.recurrence_rule) {
      // Non-recurring: just the single event
      setOccurrences([new Date(event.starts_at)]);
      return;
    }

    try {
      const rule = rrulestr(event.recurrence_rule, {
        dtstart: new Date(event.recurrence_dtstart)
      });

      // Generate occurrences in range
      const dates = rule.between(rangeStart, rangeEnd, true);

      setOccurrences(dates);
    } catch (error) {
      console.error('Invalid RRULE:', error);
      setOccurrences([]);
    }
  }, [event, rangeStart, rangeEnd]);

  return occurrences;
}
```

### Merge Exceptions into Occurrence List
```typescript
// Source: Pattern from recurring event research
interface EventOccurrence {
  id?: string;  // Only for exceptions
  event_id: string;
  original_start: Date;
  is_cancelled: boolean;
  // Override fields
  override_title?: string;
  override_starts_at?: Date;
  override_ends_at?: Date;
}

export function mergeOccurrencesWithExceptions(
  baseEvent: RecurringEvent,
  generatedOccurrences: Date[],
  exceptions: EventOccurrence[]
): Array<EventOccurrence & { computed: boolean }> {
  const exceptionMap = new Map(
    exceptions.map(exc => [exc.original_start.getTime(), exc])
  );

  return generatedOccurrences
    .map(occDate => {
      const exception = exceptionMap.get(occDate.getTime());

      if (exception?.is_cancelled) {
        return null;  // Filter out canceled
      }

      return {
        event_id: baseEvent.id,
        original_start: occDate,
        is_cancelled: false,
        computed: !exception,  // True if generated, false if exception
        // Use exception overrides if present, otherwise base event
        override_title: exception?.override_title,
        override_starts_at: exception?.override_starts_at || occDate,
        override_ends_at: exception?.override_ends_at ||
          new Date(occDate.getTime() + (
            new Date(baseEvent.ends_at).getTime() -
            new Date(baseEvent.starts_at).getTime()
          ))
      };
    })
    .filter(Boolean);  // Remove nulls (canceled)
}
```

### Teacher Multi-Select Component
```typescript
// Source: Radix UI patterns + existing project
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery } from '@tanstack/react-query';

export function TeacherSelect({
  eventId,
  value = [],
  onChange
}: {
  eventId: string;
  value: string[];
  onChange: (teacherIds: string[]) => void;
}) {
  // Search users (could add autocomplete)
  const { data: users } = useQuery({
    queryKey: ['users', 'search'],
    queryFn: () => supabase.from('profiles').select('id, name, photo_url')
  });

  const toggleTeacher = (userId: string) => {
    const newValue = value.includes(userId)
      ? value.filter(id => id !== userId)
      : [...value, userId];
    onChange(newValue);
  };

  return (
    <div>
      <label>Teachers/Instructors</label>
      {users?.map(user => (
        <label key={user.id} className="flex items-center gap-2">
          <Checkbox
            checked={value.includes(user.id)}
            onCheckedChange={() => toggleTeacher(user.id)}
          />
          <img src={user.photo_url} alt="" className="w-8 h-8 rounded-full" />
          <span>{user.name}</span>
        </label>
      ))}
    </div>
  );
}
```

### Tag Filter with GIN Index Query
```typescript
// Source: PostgreSQL GIN index patterns
import { Checkbox } from '@/components/ui/checkbox';
import { useSearchParams } from 'react-router-dom';

const TAG_OPTIONS = [
  { value: 'beginner-friendly', label: 'Beginner Friendly' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
  { value: 'outdoor', label: 'Outdoor' },
  { value: 'indoor', label: 'Indoor' },
  { value: 'free', label: 'Free' },
  { value: 'paid', label: 'Paid' },
];

export function TagFilter() {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedTags = searchParams.getAll('tag');

  const toggleTag = (tag: string) => {
    const newParams = new URLSearchParams(searchParams);

    if (selectedTags.includes(tag)) {
      // Remove tag
      newParams.delete('tag');
      selectedTags.filter(t => t !== tag).forEach(t => newParams.append('tag', t));
    } else {
      // Add tag
      newParams.append('tag', tag);
    }

    setSearchParams(newParams, { replace: true });
  };

  return (
    <div>
      <h3>Tags</h3>
      {TAG_OPTIONS.map(({ value, label }) => (
        <label key={value} className="flex items-center gap-2">
          <Checkbox
            checked={selectedTags.includes(value)}
            onCheckedChange={() => toggleTag(value)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}

// In useEventSearch.ts
export function useEventSearch() {
  const [searchParams] = useSearchParams();
  const selectedTags = searchParams.getAll('tag');

  return useQuery({
    queryKey: ['events', 'search', selectedTags],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'published');

      // Use @> operator for array containment with GIN index
      if (selectedTags.length > 0) {
        query = query.contains('tags', selectedTags);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });
}
```

### City Geocoding with Cache
```typescript
// Source: Geocoding best practices
import { useState } from 'react';
import { useDebounce } from 'use-debounce';

export function CitySearch({ onSelect }: {
  onSelect: (coords: { lat: number; lng: number }) => void
}) {
  const [query, setQuery] = useState('');
  const [debouncedQuery] = useDebounce(query, 500);

  const { data: suggestions, isLoading } = useQuery({
    queryKey: ['geocode', debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return [];

      // Check cache first
      const { data: cached } = await supabase
        .from('geocoding_cache')
        .select('*')
        .ilike('query', `${debouncedQuery}%`)
        .limit(5);

      if (cached && cached.length > 0) {
        return cached;
      }

      // Call Mapbox Geocoding API (example)
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(debouncedQuery)}.json?` +
        `types=place&access_token=${import.meta.env.VITE_MAPBOX_TOKEN}`
      );
      const data = await response.json();

      // Cache results
      const results = data.features.map((f: any) => ({
        query: f.place_name,
        lat: f.center[1],
        lng: f.center[0],
        formatted_address: f.place_name
      }));

      if (results.length > 0) {
        await supabase.from('geocoding_cache').insert(results);
      }

      return results;
    },
    enabled: debouncedQuery.length >= 3
  });

  return (
    <div>
      <input
        type="text"
        placeholder="Search city..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {isLoading && <div>Loading...</div>}
      {suggestions && (
        <ul>
          {suggestions.map((suggestion) => (
            <li
              key={suggestion.formatted_address}
              onClick={() => onSelect({
                lat: Number(suggestion.lat),
                lng: Number(suggestion.lng)
              })}
            >
              {suggestion.formatted_address}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom recurrence logic | RRULE (RFC 5545) standard | iCalendar spec 1998, widely adopted 2000s | Universal format, library support, interoperability |
| Pre-compute all occurrences | Store RRULE + generate on-demand | Modern approach ~2015+ | Reduced storage, easier series editing, better performance |
| Database triggers for sync | Application-level sync | Modern best practice 2020+ | Testable, debuggable, explicit control flow |
| Many-to-many for tags | PostgreSQL ARRAY with GIN | PostgreSQL 9.1+ (2011) added GIN for arrays | 3-5x faster queries, simpler schema |
| Google Maps Geocoding | Multiple providers (Mapbox, Nominatim) | 2018+ as costs rose | Free options for low volume, better pricing tiers |
| EXDATE/EXRULE for exceptions | Separate exceptions table | Modern implementation pattern | Easier to query, modify, display |

**Deprecated/outdated:**
- **EXRULE:** Deprecated in RFC 5545 (current iCalendar spec), use EXDATE or exception tables instead
- **Trigger-based sync:** Problematic at scale, modern practice favors explicit service methods
- **Pre-computing occurrences:** Storage bloat, complex updates, better to generate on-demand
- **String-based tag storage:** VARCHAR with LIKE queries, superseded by ARRAY with GIN indexes

## Open Questions

Things that couldn't be fully resolved:

1. **Geocoding Service Choice**
   - What we know: Nominatim free but rate-limited (1 req/sec), Mapbox $0.75/1000, Google $5/1000
   - What's unclear: Expected search volume, budget allocation
   - Recommendation: Start with manual lat/lng input only (no geocoding API costs). Add geocoding in later iteration once usage patterns known. If needed, start with Nominatim for low volume, upgrade to Mapbox if exceeding limits.

2. **Recurrence UI Complexity**
   - What we know: Full RRULE supports complex patterns (BYMONTHDAY, BYDAY, BYSETPOS)
   - What's unclear: How complex should initial UI be? Simple presets vs full builder?
   - Recommendation: Start with simple presets (daily, weekly, monthly, custom interval + end date). Add advanced patterns (specific weekdays, monthly by day-of-month) in later iteration based on user feedback.

3. **Jam Sync Timing**
   - What we know: Application sync is better than triggers
   - What's unclear: Should sync be synchronous (block jam save until event synced) or async (queue)?
   - Recommendation: Start synchronous (simpler, immediate consistency). If performance issues arise, move to async job queue.

4. **Teacher Permissions**
   - What we know: Requirements say "Teachers have no special permissions (display only)"
   - What's unclear: Should teachers be notified when added? Can they remove themselves?
   - Recommendation: Teachers are display-only metadata. No notifications, no self-removal. Keep simple. Reconsider if user feedback requests teacher features.

5. **Occurrence Limit**
   - What we know: Google Calendar limits recurring events to 730 occurrences
   - What's unclear: Should we enforce a similar limit?
   - Recommendation: Enforce 1000 occurrence limit (covers ~2 years of daily events). Prevents performance issues with infinite series, forces users to set reasonable end dates.

## Sources

### Primary (HIGH confidence)
- [rrule.js GitHub](https://github.com/jkbrzt/rrule) - TypeScript library, API documentation
- [iCalendar RFC 5545 RRULE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-3-recurrence-rule.html) - Official recurrence rule spec
- [iCalendar EXDATE](https://icalendar.org/iCalendar-RFC-5545/3-8-5-1-exception-date-times.html) - Exception dates specification
- [PostgreSQL GIN Indexes](https://www.postgresql.org/docs/current/gin.html) - Official GIN index documentation
- [Thoughtbot: Recurring Events and PostgreSQL](https://thoughtbot.com/blog/recurring-events-and-postgresql) - Database schema patterns
- [Google Calendar Recurring Events API](https://developers.google.com/workspace/calendar/api/guides/recurringevents) - Industry standard patterns

### Secondary (MEDIUM confidence)
- [Recurring Calendar Events — Database Design](https://medium.com/@aureliadotlim/recurring-calendar-events-database-design-dc872fb4f2b5) - Exception handling patterns
- [Again and Again! Managing Recurring Events In a Data Model](https://www.red-gate.com/blog/again-and-again-managing-recurring-events-in-a-data-model) - Data modeling approaches
- [Optimizing Array Queries With GIN Indexes](https://www.tigerdata.com/learn/optimizing-array-queries-with-gin-indexes-in-postgresql) - GIN performance details
- [The hidden cost of PostgreSQL arrays](https://boringsql.com/posts/good-bad-arrays/) - Array vs junction table tradeoffs
- [Mapbox vs Google Maps API 2026](https://radar.com/blog/mapbox-vs-google-maps-api) - Geocoding service comparison
- [Code in database vs application](https://brandur.org/fragments/code-database-vs-app) - Trigger vs application logic
- [Using Database Triggers: My Experience](https://medium.com/@agarwal29manish/using-database-triggers-my-experience-and-why-they-didnt-quite-work-715710695656) - Why triggers are problematic
- [Nominatim OpenStreetMap](https://nominatim.org/) - Free geocoding API
- [The Deceptively Complex World of Calendar Events and RRULEs](https://www.nylas.com/blog/calendar-events-rrules/) - RRULE complexity analysis

### Tertiary (LOW confidence)
- [Managing Recurring Events in Node.js with rrule](https://blog.cybermindworks.com/post/managing-recurring-events-in-node-js-with-rrule) - Implementation examples
- [Postgres Array vs Join benchmark](https://shon.github.io/blog/postgres-array-performance/) - Performance benchmarks (older, 2015)

## Metadata

**Confidence breakdown:**
- Recurring events: HIGH - RRULE is RFC standard, rrule.js is mature library with official docs
- Teacher associations: HIGH - Standard many-to-many pattern, well-documented
- Jam integration: HIGH - Application-level sync is documented best practice vs triggers
- Geocoding: MEDIUM - Service comparison current but pricing/features change frequently
- Tag filters: HIGH - PostgreSQL ARRAY + GIN is official feature with performance docs

**Research date:** 2026-01-21
**Valid until:** ~2026-03-21 (60 days - geocoding services change frequently, core patterns stable)

**Key decisions for planner:**
1. Use rrule.js library for RRULE parsing and generation
2. Store RRULE string + dtstart in database, generate occurrences on-demand
3. Use event_occurrences table for exceptions (edited/canceled single occurrences)
4. Implement "edit future" via series splitting (truncate original, create new series)
5. Use many-to-many event_teachers junction table
6. Application-level sync for jam→event (not triggers)
7. Use PostgreSQL ARRAY columns with GIN indexes for tags/amenities
8. Defer geocoding API choice - start with manual lat/lng input
9. Use existing PostGIS ST_DWithin for city-based radius search
10. Enforce 1000 occurrence limit for recurring series
