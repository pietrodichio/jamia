-- Create event_status enum
CREATE TYPE public.event_status AS ENUM ('draft', 'published', 'archived');

-- Create events table with type discriminator
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('jam', 'class', 'workshop', 'convention')),

  -- Shared required fields
  title TEXT NOT NULL,
  location_text TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,

  -- Shared optional fields
  description TEXT,
  price TEXT,
  external_link TEXT,
  organizer_contact TEXT,

  -- Location fields (all optional)
  location_lat NUMERIC,
  location_lng NUMERIC,
  location_place_id TEXT,
  gmaps_link TEXT,

  -- Status management
  status public.event_status DEFAULT 'draft',

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for RLS performance
CREATE INDEX idx_events_owner_id ON public.events(owner_id);
CREATE INDEX idx_events_type ON public.events(type);
CREATE INDEX idx_events_status ON public.events(status);
CREATE INDEX idx_events_starts_at ON public.events(starts_at);

-- Add new audit actions for events
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'event_created';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'event_updated';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'event_published';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'event_deleted';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'organizer_added';
ALTER TYPE public.audit_action ADD VALUE IF NOT EXISTS 'organizer_removed';

-- Create event_organizers table (mirrors jam_managers pattern)
CREATE TABLE public.event_organizers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Create indexes for RLS performance
CREATE INDEX idx_event_organizers_event_user ON public.event_organizers(event_id, user_id);
CREATE INDEX idx_event_organizers_user ON public.event_organizers(user_id);

-- Enable RLS on both tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_organizers ENABLE ROW LEVEL SECURITY;

-- Authorization function to check if user is owner or organizer
CREATE OR REPLACE FUNCTION public.is_event_owner_or_organizer(event_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.events
    WHERE events.id = is_event_owner_or_organizer.event_id
      AND (events.owner_id = is_event_owner_or_organizer.user_id OR EXISTS (
        SELECT 1 FROM public.event_organizers
        WHERE event_organizers.event_id = events.id
          AND event_organizers.user_id = is_event_owner_or_organizer.user_id
      ))
  );
$$;

-- Events RLS policies
CREATE POLICY "Anyone can view published events"
  ON public.events FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR owner_id = auth.uid()
    OR is_event_owner_or_organizer(id, auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Users can create events"
  ON public.events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners and co-organizers can update events"
  ON public.events FOR UPDATE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR is_event_owner_or_organizer(id, auth.uid())
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Owners and admins can delete events"
  ON public.events FOR DELETE
  TO authenticated
  USING (
    owner_id = auth.uid()
    OR public.is_admin(auth.uid())
  );

-- Event_organizers RLS policies
CREATE POLICY "Owners and organizers can view organizers"
  ON public.event_organizers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_organizers.event_id
        AND (events.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.event_organizers AS eo
          WHERE eo.event_id = events.id
            AND eo.user_id = auth.uid()
        ))
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Owners and organizers can add organizers"
  ON public.event_organizers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_organizers.event_id
        AND (events.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.event_organizers AS eo
          WHERE eo.event_id = events.id
            AND eo.user_id = auth.uid()
        ))
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Owners and organizers can remove organizers"
  ON public.event_organizers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_organizers.event_id
        AND (events.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.event_organizers AS eo
          WHERE eo.event_id = events.id
            AND eo.user_id = auth.uid()
        ))
    ) OR public.is_admin(auth.uid())
  );
