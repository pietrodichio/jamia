-- Add location_city column to events table
-- This stores the city name extracted from location data for display and filtering
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS location_city TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.events.location_city IS 
  'City name extracted from location data, used for display and filtering purposes';
