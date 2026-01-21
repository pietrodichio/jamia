# Phase 4: Event Discovery - Research

**Researched:** 2026-01-21
**Domain:** Geospatial search, filtering, and calendar views
**Confidence:** HIGH

## Summary

Event Discovery requires three distinct technical domains: geospatial search (PostGIS), multi-filter UI patterns (URL-based state), and calendar views (react-big-calendar). The standard approach combines PostgreSQL PostGIS for location-based queries, URL search parameters for filter state, and established React calendar libraries.

PostGIS is the industry standard for geospatial queries in PostgreSQL, already available in Supabase. Location searches use `ST_DWithin` for radius filtering and the `<->` operator for distance sorting, both leveraging spatial indexes (GIST) for performance. For text search, PostgreSQL's built-in full-text search with `tsvector` columns and GIN indexes provides sub-5ms query times when properly configured.

Filter state belongs in the URL, not React state. React Router's `useSearchParams` provides the foundation, with nuqs offering type-safe enhancements. Calendar views require react-big-calendar for Google Calendar-style layouts, with date-fns as the localizer (already in the project).

**Primary recommendation:** Enable PostGIS, create geography columns with GIST indexes, use RPC functions for complex geospatial queries, store filter state in URL parameters, and leverage react-big-calendar for calendar view.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PostGIS | 3.4+ | Geospatial queries | Industry standard for PostgreSQL spatial data, built into Supabase |
| react-big-calendar | 1.15+ | Calendar view | Most mature calendar library, Google/Outlook-style interface, 13K+ stars |
| React Router | 6.30+ | URL state management | Already in project, provides useSearchParams hook |
| date-fns | 4.1+ | Date manipulation | Already in project, lightweight, tree-shakeable |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| nuqs | 2.x | Type-safe search params | Complex filter state, type safety needed |
| use-debounce | 10.x | Input debouncing | Text search, reduce API calls |
| react-day-picker | 8.10+ | Date range picker | Already in project, filter by date range |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| react-big-calendar | FullCalendar | More features but heavier, paid for advanced features |
| PostGIS | Custom lat/lng math | Reinventing wheel, misses edge cases, no spatial indexes |
| URL params | React state | Loses bookmarkability, SSR support, shareability |

**Installation:**
```bash
pnpm add react-big-calendar use-debounce
# PostGIS enabled via Supabase dashboard
# Other dependencies already in project
```

## Architecture Patterns

### Recommended Project Structure
```
src/
├── components/
│   ├── events/
│   │   ├── EventList.tsx          # List view component
│   │   ├── EventCalendar.tsx      # Calendar view component
│   │   ├── EventCard.tsx          # Event display card
│   │   └── EventFilters.tsx       # Filter UI controls
│   └── search/
│       ├── LocationSearch.tsx     # City/geolocation input
│       └── KeywordSearch.tsx      # Text search input
├── hooks/
│   ├── useEventFilters.ts         # URL param management
│   ├── useGeolocation.ts          # Browser geolocation
│   └── useEventSearch.ts          # Supabase query logic
└── lib/
    └── supabase/
        └── rpc/
            └── search-events.sql  # Geospatial RPC function
```

### Pattern 1: Geography Column with GIST Index
**What:** Store coordinates as PostGIS geography type, not separate lat/lng columns
**When to use:** All geospatial queries (distance, radius)
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/extensions/postgis
-- Add geography column
ALTER TABLE events
  ADD COLUMN location_geo geography(POINT, 4326);

-- Create spatial index
CREATE INDEX idx_events_location_geo
  ON events USING GIST (location_geo);

-- Populate from existing lat/lng
UPDATE events
SET location_geo = ST_SetSRID(
  ST_MakePoint(location_lng, location_lat),
  4326
)::geography
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;
```

### Pattern 2: RPC Function for Distance Search
**What:** Use Postgres function called via RPC for complex geospatial queries
**When to use:** Distance sorting, radius filtering, combining with other filters
**Example:**
```sql
-- Source: https://supabase.com/docs/guides/database/extensions/postgis
CREATE OR REPLACE FUNCTION search_events_by_location(
  search_lng float,
  search_lat float,
  radius_meters int DEFAULT 50000,
  event_status_filter text DEFAULT 'published'
)
RETURNS TABLE (
  id uuid,
  title text,
  location_text text,
  starts_at timestamptz,
  ends_at timestamptz,
  type text,
  distance_meters float
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.title,
    e.location_text,
    e.starts_at,
    e.ends_at,
    e.type,
    ST_Distance(
      e.location_geo,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) as distance_meters
  FROM events e
  WHERE e.status = event_status_filter::event_status
    AND ST_DWithin(
      e.location_geo,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
      radius_meters
    )
  ORDER BY distance_meters ASC;
END;
$$ LANGUAGE plpgsql STABLE;
```

### Pattern 3: URL-Based Filter State
**What:** Store all filter values in URL search parameters
**When to use:** All filtering UI (location, date, type, tags)
**Example:**
```typescript
// Source: https://reactrouter.com/api/hooks/useSearchParams
import { useSearchParams } from 'react-router-dom';

export function useEventFilters() {
  const [searchParams, setSearchParams] = useSearchParams();

  const filters = {
    query: searchParams.get('query') || '',
    type: searchParams.getAll('type'),
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
    lat: searchParams.get('lat') || '',
    lng: searchParams.get('lng') || '',
    radius: searchParams.get('radius') || '50',
  };

  const updateFilter = (key: string, value: string | string[]) => {
    const newParams = new URLSearchParams(searchParams);

    if (Array.isArray(value)) {
      newParams.delete(key);
      value.forEach(v => newParams.append(key, v));
    } else if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }

    setSearchParams(newParams, { replace: true });
  };

  return { filters, updateFilter };
}
```

### Pattern 4: Full-Text Search with tsvector
**What:** Dedicated tsvector column with GIN index for keyword search
**When to use:** Searching event titles and descriptions
**Example:**
```sql
-- Source: https://www.postgresql.org/docs/current/textsearch-intro.html
-- Add tsvector column
ALTER TABLE events
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '')
    )
  ) STORED;

-- Create GIN index
CREATE INDEX idx_events_search_vector
  ON events USING GIN (search_vector);

-- Query with ranking
SELECT id, title,
  ts_rank(search_vector, query) as rank
FROM events,
  plainto_tsquery('english', 'acro yoga') query
WHERE search_vector @@ query
  AND status = 'published'
ORDER BY rank DESC;
```

### Pattern 5: Calendar Event Adapter
**What:** Transform database events to react-big-calendar format
**When to use:** Calendar view rendering
**Example:**
```typescript
// Source: https://github.com/jquense/react-big-calendar
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { 'en-US': enUS }
});

function EventCalendar({ events }: { events: Event[] }) {
  const calendarEvents = events.map(event => ({
    id: event.id,
    title: event.title,
    start: new Date(event.starts_at),
    end: new Date(event.ends_at),
    resource: event, // Full event data
  }));

  return (
    <Calendar
      localizer={localizer}
      events={calendarEvents}
      startAccessor="start"
      endAccessor="end"
      style={{ height: 600 }}
      views={['month', 'week', 'day']}
    />
  );
}
```

### Anti-Patterns to Avoid
- **Calculating distance in JavaScript:** Use PostGIS on server for accuracy and performance
- **Storing geometry with SRID 4326 instead of geography:** Geometry treats earth as flat, geography accounts for curvature
- **Using ST_Distance without ST_DWithin:** ST_Distance can't leverage spatial indexes for filtering
- **Storing filter state in React state:** Breaks bookmarking, back button, sharing
- **Calculating tsvector on-the-fly:** 50x slower without stored column and GIN index

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Distance calculation | Haversine formula in JS | PostGIS ST_Distance | Handles spheroid vs sphere, SRID transformations, edge cases |
| Calendar UI | Custom month grid | react-big-calendar | Multi-view support, event overlaps, drag-drop, timezone handling |
| Full-text search | LIKE queries or JS filtering | PostgreSQL tsvector | Stemming, ranking, language support, 50x faster |
| Geocoding | Regex parsing addresses | Google Maps/Mapbox API | Handles abbreviations, international formats, ambiguity |
| URL state sync | Custom URLSearchParams wrapper | nuqs library | Type safety, SSR support, validation, parsing |
| Date range picker | Custom calendar widget | react-day-picker | Already in project, accessibility, i18n |

**Key insight:** Geospatial and full-text search have decades of optimized solutions. Custom implementations miss edge cases (dateline wrapping, polar regions, language stemming) and can't match indexed performance.

## Common Pitfalls

### Pitfall 1: Using Geometry Instead of Geography
**What goes wrong:** Distance calculations are wildly inaccurate, especially away from equator
**Why it happens:** SRID 4326 can be used with both geometry and geography types, but geometry treats earth as flat
**How to avoid:** Always use geography(POINT, 4326) type for lat/lng coordinates
**Warning signs:** Distance results that seem wrong, especially for locations at high latitudes

**Source:** [PostGIS Geography Type](http://postgis.net/workshops/postgis-intro/geography.html)

### Pitfall 2: Missing Spatial Index
**What goes wrong:** Geospatial queries are extremely slow (seconds instead of milliseconds)
**Why it happens:** Forgetting to create GIST index after adding geography column
**How to avoid:** Always create GIST index immediately after adding geography column
**Warning signs:** Queries timeout, EXPLAIN shows sequential scan

**Source:** [Supabase PostGIS Documentation](https://supabase.com/docs/guides/database/extensions/postgis)

### Pitfall 3: Not Debouncing Text Search
**What goes wrong:** Database hammered with queries on every keystroke
**Why it happens:** Connecting input onChange directly to search query
**How to avoid:** Use use-debounce library with 300ms delay
**Warning signs:** High database CPU, slow typing experience

**Source:** [Next.js Search Tutorial](https://nextjs.org/learn/dashboard-app/adding-search-and-pagination) (pattern applies to React Router)

### Pitfall 4: Ignoring Timezone Handling
**What goes wrong:** Events appear on wrong day, off-by-one errors
**Why it happens:** Mixing local time, UTC, and database timestamps without care
**How to avoid:** Store all timestamps as timestamptz (UTC), convert to user's timezone only for display
**Warning signs:** Events showing on previous/next day for some users

**Source:** [React Calendar Timezone Best Practices](https://demo.mobiscroll.com/react/calendar/setting-the-picker-timezone)

### Pitfall 5: Wrong Column Order in Composite Indexes
**What goes wrong:** Queries that filter on multiple columns don't use the index
**Why it happens:** Creating index with columns in wrong order for query patterns
**How to avoid:** Put most selective column first, ensure queries reference leftmost columns
**Warning signs:** EXPLAIN shows index not being used despite existing

**Source:** [PostgreSQL Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html)

### Pitfall 6: Geocoding Every Request
**What goes wrong:** Hit rate limits, slow response, high API costs
**Why it happens:** Not caching geocoded coordinates in database
**How to avoid:** Store location_lat, location_lng, location_place_id when geocoding, reuse for identical addresses
**Warning signs:** Slow location search, geocoding API errors

**Source:** [Geocoding Best Practices](https://developers.google.com/maps/documentation/geocoding/geocoding-strategies)

### Pitfall 7: Overwriting All Search Params
**What goes wrong:** Setting one filter clears other filters
**Why it happens:** Creating new URLSearchParams() without reading existing params
**How to avoid:** Always construct new params from existing: `new URLSearchParams(searchParams)`
**Warning signs:** Filters reset when changing one value

**Source:** [React Router useSearchParams](https://reactrouter.com/api/hooks/useSearchParams)

## Code Examples

Verified patterns from official sources:

### Geolocation Hook
```typescript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API
import { useState, useEffect } from 'react';

export function useGeolocation() {
  const [location, setLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const requestLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
      {
        enableHighAccuracy: false, // Faster, good enough for city-level
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  };

  return { location, error, loading, requestLocation };
}
```

### Debounced Search Input
```typescript
// Source: https://github.com/xnimorz/use-debounce
import { useDebouncedCallback } from 'use-debounce';
import { useEventFilters } from './useEventFilters';

export function KeywordSearch() {
  const { filters, updateFilter } = useEventFilters();

  const handleSearch = useDebouncedCallback((term: string) => {
    updateFilter('query', term);
  }, 300);

  return (
    <input
      type="search"
      placeholder="Search events..."
      defaultValue={filters.query}
      onChange={(e) => handleSearch(e.target.value)}
    />
  );
}
```

### Supabase RPC Call
```typescript
// Source: https://supabase.com/docs/guides/database/extensions/postgis
import { supabase } from '@/lib/supabase';

type EventSearchResult = {
  id: string;
  title: string;
  location_text: string;
  starts_at: string;
  ends_at: string;
  type: string;
  distance_meters: number;
};

export async function searchEventsByLocation(
  lng: number,
  lat: number,
  radiusKm: number = 50
) {
  const { data, error } = await supabase
    .rpc<EventSearchResult>('search_events_by_location', {
      search_lng: lng,
      search_lat: lat,
      radius_meters: radiusKm * 1000, // Convert km to meters
      event_status_filter: 'published'
    });

  if (error) throw error;

  // Convert distance to km for display
  return data.map(event => ({
    ...event,
    distance_km: Math.round(event.distance_meters / 1000)
  }));
}
```

### Multi-Select Filter Component
```typescript
// Source: https://reactrouter.com/api/hooks/useSearchParams
import { useEventFilters } from '@/hooks/useEventFilters';

const EVENT_TYPES = [
  { value: 'jam', label: 'Jam' },
  { value: 'class', label: 'Class' },
  { value: 'workshop', label: 'Workshop' },
  { value: 'convention', label: 'Convention' },
];

export function EventTypeFilter() {
  const { filters, updateFilter } = useEventFilters();
  const selectedTypes = filters.type;

  const toggleType = (type: string) => {
    const newTypes = selectedTypes.includes(type)
      ? selectedTypes.filter(t => t !== type)
      : [...selectedTypes, type];

    updateFilter('type', newTypes);
  };

  return (
    <div>
      <h3>Event Type</h3>
      {EVENT_TYPES.map(({ value, label }) => (
        <label key={value}>
          <input
            type="checkbox"
            checked={selectedTypes.includes(value)}
            onChange={() => toggleType(value)}
          />
          {label}
        </label>
      ))}
    </div>
  );
}
```

### Composite Index for Multiple Filters
```sql
-- Source: https://www.postgresql.org/docs/current/indexes-multicolumn.html
-- Index for common query pattern: status + type + date range
CREATE INDEX idx_events_discovery
  ON events (status, type, starts_at)
  WHERE status = 'published';

-- This index supports:
-- WHERE status = 'published' AND type = 'jam'
-- WHERE status = 'published' AND type = 'jam' AND starts_at > '2026-01-01'
-- WHERE status = 'published' (leftmost column only)

-- But NOT:
-- WHERE type = 'jam' (doesn't start with status)
-- WHERE starts_at > '2026-01-01' (doesn't start with status)
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate lat/lng columns | geography(POINT) column | PostGIS 2.0 (2012) | Automatic spheroid calculations, spatial indexes |
| Custom URLSearchParams handling | nuqs library | 2024-2025 | Type-safe, validation, SSR support |
| Client-side filtering | Server-side with URL params | React Router 6+ | Bookmarkable, faster, SEO-friendly |
| Moment.js for dates | date-fns | 2019+ | Tree-shakeable, smaller bundle |
| FullCalendar paid license | react-big-calendar open source | Ongoing | Free for all features, MIT license |

**Deprecated/outdated:**
- **Moment.js**: Maintenance mode since 2020, recommend date-fns or day.js
- **ST_Distance for filtering**: Use ST_DWithin which leverages indexes
- **Geometry type for lat/lng**: Use geography for accurate spherical calculations

## Open Questions

Things that couldn't be fully resolved:

1. **Geocoding Service Choice**
   - What we know: Google Maps is most accurate but expensive ($5/1000 after free tier), Mapbox cheaper but less POI data
   - What's unclear: Project budget for geocoding, expected volume
   - Recommendation: Start with manual lat/lng input only, defer geocoding service choice to Phase 5

2. **Calendar Event Color Coding**
   - What we know: react-big-calendar supports event styling via eventPropGetter
   - What's unclear: Color scheme for event types (jam/class/workshop/convention)
   - Recommendation: Use existing design system colors, let UX decide mapping

3. **Filter Persistence**
   - What we know: URL provides session persistence, localStorage could save user preferences
   - What's unclear: Should user's filter preferences be saved between sessions?
   - Recommendation: URL-only for Phase 4, consider user preferences in later phase

4. **Mobile Map View**
   - What we know: Map view is common alternative to list/calendar for location-based search
   - What's unclear: Is map view in scope for this phase?
   - Recommendation: List and calendar views only for Phase 4, map view is separate feature

## Sources

### Primary (HIGH confidence)
- [Supabase PostGIS Documentation](https://supabase.com/docs/guides/database/extensions/postgis) - Enabling PostGIS, spatial indexes, distance queries
- [PostGIS ST_DWithin](https://postgis.net/docs/ST_DWithin.html) - Radius search function
- [PostGIS ST_Distance](https://postgis.net/docs/ST_Distance.html) - Distance calculations
- [PostgreSQL Full-Text Search](https://www.postgresql.org/docs/current/textsearch-intro.html) - tsvector and GIN indexes
- [React Router useSearchParams](https://reactrouter.com/api/hooks/useSearchParams) - URL state management
- [react-big-calendar GitHub](https://github.com/jquense/react-big-calendar) - Calendar library documentation
- [PostgreSQL Multicolumn Indexes](https://www.postgresql.org/docs/current/indexes-multicolumn.html) - Composite index best practices
- [Geolocation API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API) - Browser geolocation

### Secondary (MEDIUM confidence)
- [Builder.io React Calendar Comparison 2025](https://www.builder.io/blog/best-react-calendar-component-ai) - Library comparison
- [Optimizing PostgreSQL Full-Text Search](https://leapcell.io/blog/optimizing-postgresql-full-text-search-performance) - Performance best practices
- [Mapbox vs Google Maps 2026](https://radar.com/blog/mapbox-vs-google-maps-api) - Geocoding service comparison
- [PostGIS Geography Type](http://postgis.net/workshops/postgis-intro/geography.html) - Geography vs geometry
- [Google Geocoding Best Practices](https://developers.google.com/maps/documentation/geocoding/geocoding-strategies) - Rate limits and caching
- [nuqs Documentation](https://nuqs.dev/) - Type-safe search params

### Tertiary (LOW confidence)
- [Medium: React Router searchParams filtering](https://cgarethc.medium.com/using-react-router-searchparams-to-manage-filter-state-for-a-list-e515e8e50166) - Community pattern
- [Aurora Scharff: Advanced filtering](https://aurorascharff.no/posts/managing-advanced-search-param-filtering-next-app-router/) - Next.js patterns (adaptable to React Router)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - PostGIS and react-big-calendar are industry standards with official documentation
- Architecture: HIGH - Verified patterns from official PostgreSQL, Supabase, and React Router docs
- Pitfalls: HIGH - Common issues documented in official sources and technical blogs

**Research date:** 2026-01-21
**Valid until:** ~2026-02-21 (30 days - stable technologies with slow-moving APIs)
