-- Store structured location data for jams to enable geo searches
ALTER TABLE public.jams
  ADD COLUMN IF NOT EXISTS location JSONB,
  ADD COLUMN IF NOT EXISTS location_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS location_lng DOUBLE PRECISION;

-- Backfill basic description/link into the new JSON column
UPDATE public.jams
SET location = jsonb_build_object(
  'description', location_text,
  'google_maps_url', gmaps_link
)
WHERE location IS NULL;

CREATE INDEX IF NOT EXISTS idx_jams_location_lat_lng
  ON public.jams(location_lat, location_lng);
