-- Create event_teachers junction table for many-to-many teacher associations
-- Teachers are display-only metadata with no special permissions
CREATE TABLE public.event_teachers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT,  -- Optional role descriptor (e.g., "lead instructor", "assistant"). Display only, does not affect permissions.
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, user_id)  -- One user can be teacher on event only once
);

-- Create indexes for bidirectional queries
CREATE INDEX idx_event_teachers_event_id ON public.event_teachers(event_id);
CREATE INDEX idx_event_teachers_user_id ON public.event_teachers(user_id);

-- Add comment documentation
COMMENT ON TABLE public.event_teachers IS 'Many-to-many junction table linking events to teacher/instructor profiles. Teachers are display-only metadata with no special permissions.';
COMMENT ON COLUMN public.event_teachers.role IS 'Optional role descriptor (e.g., "lead instructor", "assistant"). Display only, does not affect permissions.';

-- Enable RLS
ALTER TABLE public.event_teachers ENABLE ROW LEVEL SECURITY;

-- Anyone can view teacher associations
CREATE POLICY "Anyone can view event teachers"
  ON public.event_teachers FOR SELECT
  TO authenticated
  USING (true);

-- Only event owner/co-organizers can manage teachers
CREATE POLICY "Event owners can manage teachers"
  ON public.event_teachers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.events
      WHERE events.id = event_teachers.event_id
      AND (
        events.owner_id = auth.uid()
        OR public.is_event_owner_or_organizer(events.id, auth.uid())
        OR public.is_admin(auth.uid())
      )
    )
  );
