-- Fix ambiguous column reference "tags" in search_events_by_location function
-- The parameter name "tags" conflicts with the column "e.tags"
-- Rename parameters to use filter_ prefix to avoid ambiguity

-- Drop the old function signature
DROP FUNCTION IF EXISTS public.search_events_by_location(
  DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT[], TEXT[], TEXT[], UUID
);

-- Recreate the function with renamed parameters to avoid column name conflicts
CREATE OR REPLACE FUNCTION public.search_events_by_location(
  search_lng DOUBLE PRECISION,
  search_lat DOUBLE PRECISION,
  radius_meters INTEGER DEFAULT 50000,
  event_types TEXT[] DEFAULT NULL,
  date_from TIMESTAMPTZ DEFAULT NULL,
  date_to TIMESTAMPTZ DEFAULT NULL,
  keyword TEXT DEFAULT NULL,
  filter_tags TEXT[] DEFAULT NULL,
  filter_accommodation TEXT[] DEFAULT NULL,
  filter_food TEXT[] DEFAULT NULL,
  filter_teacher_id UUID DEFAULT NULL
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
    -- Filter by keyword search if provided (uses GIN index on search_vector)
    AND (
      keyword IS NULL OR
      e.search_vector @@ plainto_tsquery('english', keyword)
    )
    -- Filter by tags using GIN index (AND logic - event must have ALL specified tags)
    AND (filter_tags IS NULL OR e.tags @> filter_tags)
    -- Filter by accommodation options using GIN index
    AND (filter_accommodation IS NULL OR e.accommodation_options @> filter_accommodation)
    -- Filter by food options using GIN index
    AND (filter_food IS NULL OR e.food_options @> filter_food)
    -- Filter by teacher if specified
    AND (
      filter_teacher_id IS NULL OR
      EXISTS (
        SELECT 1 FROM public.event_teachers et
        WHERE et.event_id = e.id AND et.user_id = filter_teacher_id
      )
    )
  ORDER BY distance_meters ASC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.search_events_by_location(
  DOUBLE PRECISION, DOUBLE PRECISION, INTEGER, TEXT[], TIMESTAMPTZ, TIMESTAMPTZ, TEXT, TEXT[], TEXT[], TEXT[], UUID
) IS
'Searches events by location with multiple filter options.
Parameters renamed with filter_ prefix to avoid column name conflicts.';
