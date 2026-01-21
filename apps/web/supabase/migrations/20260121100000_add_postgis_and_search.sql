-- Enable PostGIS extension for geospatial queries
-- This provides ST_Distance, ST_DWithin, and other spatial functions
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add geography column for accurate spherical distance calculations
-- Using geography(POINT, 4326) instead of geometry for accurate distances
-- SRID 4326 is WGS84 (standard for latitude/longitude coordinates)
ALTER TABLE public.events
  ADD COLUMN location_geo geography(POINT, 4326);

-- Populate geography column from existing lat/lng coordinates
-- ST_MakePoint takes (longitude, latitude) - note the order!
-- ST_SetSRID sets the spatial reference system (4326 = WGS84)
UPDATE public.events
SET location_geo = ST_SetSRID(
  ST_MakePoint(location_lng, location_lat),
  4326
)::geography
WHERE location_lat IS NOT NULL AND location_lng IS NOT NULL;

-- Create spatial index using GIST for efficient radius queries
-- This enables fast ST_DWithin queries for location-based search
CREATE INDEX idx_events_location_geo
  ON public.events USING GIST (location_geo);

-- Add check constraint to ensure location_geo is set when coordinates exist
-- This maintains data integrity between coordinate columns and geography column
ALTER TABLE public.events
  ADD CONSTRAINT chk_location_geo_consistency
  CHECK (
    (location_lat IS NULL AND location_lng IS NULL AND location_geo IS NULL)
    OR (location_lat IS NOT NULL AND location_lng IS NOT NULL AND location_geo IS NOT NULL)
  );

-- Create trigger function to automatically update location_geo when lat/lng changes
CREATE OR REPLACE FUNCTION public.update_location_geo()
RETURNS TRIGGER AS $$
BEGIN
  -- If lat/lng are both set, update geography column
  IF NEW.location_lat IS NOT NULL AND NEW.location_lng IS NOT NULL THEN
    NEW.location_geo := ST_SetSRID(
      ST_MakePoint(NEW.location_lng, NEW.location_lat),
      4326
    )::geography;
  ELSE
    -- If either is NULL, clear geography column
    NEW.location_geo := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically maintain location_geo
CREATE TRIGGER trg_events_update_location_geo
  BEFORE INSERT OR UPDATE OF location_lat, location_lng
  ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_location_geo();

-- Add full-text search column using tsvector with GENERATED column
-- This automatically updates when title or description changes
-- Using 'english' for stemming and stop word removal
ALTER TABLE public.events
  ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector('english',
      coalesce(title, '') || ' ' ||
      coalesce(description, '')
    )
  ) STORED;

-- Create GIN index on search_vector for fast full-text queries
-- GIN index is essential for tsvector query performance (sub-5ms searches)
CREATE INDEX idx_events_search_vector
  ON public.events USING GIN (search_vector);

-- Create RPC function for geospatial event search with multiple filters
-- This function combines location-based queries with type, date, and keyword filtering
-- Using STABLE for query planning optimization (function doesn't modify data)
CREATE OR REPLACE FUNCTION public.search_events_by_location(
  search_lng DOUBLE PRECISION,
  search_lat DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000,
  event_types TEXT[] DEFAULT NULL,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL,
  keyword TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  owner_id UUID,
  type TEXT,
  title TEXT,
  description TEXT,
  location_text TEXT,
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_place_id TEXT,
  gmaps_link TEXT,
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  price TEXT,
  external_link TEXT,
  organizer_contact TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  distance_meters DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.owner_id,
    e.type,
    e.title,
    e.description,
    e.location_text,
    e.location_lat,
    e.location_lng,
    e.location_place_id,
    e.gmaps_link,
    e.starts_at,
    e.ends_at,
    e.price,
    e.external_link,
    e.organizer_contact,
    e.status::TEXT,
    e.created_at,
    e.updated_at,
    ST_Distance(
      e.location_geo,
      ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography
    ) as distance_meters
  FROM public.events e
  WHERE e.status = 'published'
    -- Use ST_DWithin for radius filtering (leverages spatial index)
    AND (
      search_lng IS NULL OR search_lat IS NULL OR
      ST_DWithin(
        e.location_geo,
        ST_SetSRID(ST_MakePoint(search_lng, search_lat), 4326)::geography,
        radius_meters
      )
    )
    -- Filter by event types if provided
    AND (event_types IS NULL OR e.type = ANY(event_types))
    -- Filter by date range if provided
    AND (date_from IS NULL OR e.starts_at >= date_from)
    AND (date_to IS NULL OR e.starts_at <= date_to)
    -- Filter by keyword search if provided
    AND (
      keyword IS NULL OR
      e.search_vector @@ plainto_tsquery('english', keyword)
    )
  ORDER BY distance_meters ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;
