-- Add new audit actions
ALTER TYPE public.audit_action ADD VALUE 'manager_added';
ALTER TYPE public.audit_action ADD VALUE 'manager_removed';
ALTER TYPE public.audit_action ADD VALUE 'cloned';

-- Create jam_managers table
CREATE TABLE public.jam_managers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  jam_id UUID NOT NULL REFERENCES public.jams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(jam_id, user_id)
);

-- Create index for performance
CREATE INDEX idx_jam_managers_jam_user ON public.jam_managers(jam_id, user_id);
CREATE INDEX idx_jam_managers_user ON public.jam_managers(user_id);

-- Enable RLS
ALTER TABLE public.jam_managers ENABLE ROW LEVEL SECURITY;

-- RLS policies for jam_managers
CREATE POLICY "Owners and managers can view jam managers"
  ON public.jam_managers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jams
      WHERE jams.id = jam_managers.jam_id
        AND (jams.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.jam_managers
          WHERE jam_managers.jam_id = jams.id
            AND jam_managers.user_id = auth.uid()
        ))
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Owners and managers can add managers"
  ON public.jam_managers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.jams
      WHERE jams.id = jam_managers.jam_id
        AND (jams.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.jam_managers
          WHERE jam_managers.jam_id = jams.id
            AND jam_managers.user_id = auth.uid()
        ))
    ) OR public.is_admin(auth.uid())
  );

CREATE POLICY "Owners and managers can remove managers"
  ON public.jam_managers FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jams
      WHERE jams.id = jam_managers.jam_id
        AND (jams.owner_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.jam_managers
          WHERE jam_managers.jam_id = jams.id
            AND jam_managers.user_id = auth.uid()
        ))
    ) OR public.is_admin(auth.uid())
  );

-- Function to check if user is owner or manager of a jam
CREATE OR REPLACE FUNCTION public.is_owner_or_manager(jam_id UUID, user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.jams
    WHERE jams.id = is_owner_or_manager.jam_id
      AND (jams.owner_id = is_owner_or_manager.user_id OR EXISTS (
        SELECT 1 FROM public.jam_managers
        WHERE jam_managers.jam_id = jams.id
          AND jam_managers.user_id = is_owner_or_manager.user_id
      ))
  );
$$;
