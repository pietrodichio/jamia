-- Add recurrence columns to events table for recurring event support
-- Using iCalendar RRULE format (RFC 5545) for recurrence patterns
-- Columns are nullable - NULL indicates a non-recurring event
ALTER TABLE public.events
  ADD COLUMN recurrence_rule TEXT,
  ADD COLUMN recurrence_dtstart TIMESTAMPTZ,
  ADD COLUMN recurrence_until TIMESTAMPTZ,
  ADD COLUMN parent_event_id UUID REFERENCES public.events(id) ON DELETE CASCADE;

-- Create filtered index on recurrence_rule for recurring event queries
-- Using partial index (WHERE recurrence_rule IS NOT NULL) for efficiency
CREATE INDEX idx_events_recurrence_rule
  ON public.events(recurrence_rule)
  WHERE recurrence_rule IS NOT NULL;

-- Create index on parent_event_id for series splitting lookups
CREATE INDEX idx_events_parent_event_id
  ON public.events(parent_event_id)
  WHERE parent_event_id IS NOT NULL;

-- Add comments documenting recurrence columns
COMMENT ON COLUMN public.events.recurrence_rule IS 'iCalendar RRULE string (RFC 5545) defining recurrence pattern. NULL for non-recurring events. Example: FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE;UNTIL=20261231T100000Z';
COMMENT ON COLUMN public.events.recurrence_dtstart IS 'Base start datetime for recurring series. Required when recurrence_rule is set. Used by rrule.js to generate occurrence dates.';
COMMENT ON COLUMN public.events.recurrence_until IS 'Series end date. NULL means series continues indefinitely (should enforce reasonable limits in application).';
COMMENT ON COLUMN public.events.parent_event_id IS 'Links to original series when series is split via "edit future events" operation. NULL for original series or non-recurring events.';

-- Add check constraint to ensure recurrence fields are set together
-- Either all NULL (non-recurring) or recurrence_rule + dtstart are set
ALTER TABLE public.events
  ADD CONSTRAINT chk_recurrence_consistency
  CHECK (
    (recurrence_rule IS NULL AND recurrence_dtstart IS NULL AND recurrence_until IS NULL)
    OR (recurrence_rule IS NOT NULL AND recurrence_dtstart IS NOT NULL)
  );

-- Create event_occurrences table for tracking exceptions (modified/canceled individual occurrences)
-- This stores deviations from the parent series recurrence pattern
CREATE TABLE public.event_occurrences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  original_start TIMESTAMPTZ NOT NULL,
  is_cancelled BOOLEAN DEFAULT FALSE,

  -- Override fields (NULL = use parent event's value)
  -- When displaying occurrences, check for exception first, then fall back to parent
  override_title TEXT,
  override_location_text TEXT,
  override_location_lat NUMERIC,
  override_location_lng NUMERIC,
  override_starts_at TIMESTAMPTZ,
  override_ends_at TIMESTAMPTZ,
  override_description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure only one exception per occurrence (event + original date)
  UNIQUE(event_id, original_start)
);

-- Create indexes on event_occurrences for efficient lookups
CREATE INDEX idx_event_occurrences_event_id
  ON public.event_occurrences(event_id);

CREATE INDEX idx_event_occurrences_original_start
  ON public.event_occurrences(original_start);

-- Create composite index for common query pattern (get exceptions for event in date range)
CREATE INDEX idx_event_occurrences_event_date
  ON public.event_occurrences(event_id, original_start);

-- Add comment documenting event_occurrences table purpose
COMMENT ON TABLE public.event_occurrences IS 'Stores modified or canceled individual occurrences of recurring events. Each row represents a deviation from the parent series RRULE pattern. Query this table to merge exceptions with generated occurrences when displaying recurring events.';
COMMENT ON COLUMN public.event_occurrences.original_start IS 'The original scheduled start time from the RRULE pattern. Used to match exceptions to generated occurrences.';
COMMENT ON COLUMN public.event_occurrences.is_cancelled IS 'If TRUE, this occurrence is canceled and should not be displayed. If FALSE, use override fields for modified occurrence.';

-- Enable RLS on event_occurrences table
ALTER TABLE public.event_occurrences ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_occurrences (mirror events table patterns)
-- Anyone can view occurrences for published events they can see
CREATE POLICY "Anyone can view occurrences for published events"
  ON public.event_occurrences FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_occurrences.event_id
        AND (
          events.status = 'published'
          OR events.owner_id = auth.uid()
          OR public.is_event_owner_or_organizer(events.id, auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

-- Owners and co-organizers can create exceptions (modify/cancel occurrences)
CREATE POLICY "Owners and co-organizers can create occurrences"
  ON public.event_occurrences FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_occurrences.event_id
        AND (
          events.owner_id = auth.uid()
          OR public.is_event_owner_or_organizer(events.id, auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

-- Owners and co-organizers can update exceptions
CREATE POLICY "Owners and co-organizers can update occurrences"
  ON public.event_occurrences FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_occurrences.event_id
        AND (
          events.owner_id = auth.uid()
          OR public.is_event_owner_or_organizer(events.id, auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );

-- Owners and co-organizers can delete exceptions (restore occurrence to series default)
CREATE POLICY "Owners and co-organizers can delete occurrences"
  ON public.event_occurrences FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_occurrences.event_id
        AND (
          events.owner_id = auth.uid()
          OR public.is_event_owner_or_organizer(events.id, auth.uid())
          OR public.is_admin(auth.uid())
        )
    )
  );
