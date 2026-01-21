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
