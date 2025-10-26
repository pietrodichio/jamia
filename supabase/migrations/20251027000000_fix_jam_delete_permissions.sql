-- Fix jam deletion permissions to allow managers
-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Owners and admins can delete jams" ON public.jams;

-- Create new policy that includes managers
CREATE POLICY "Owners, managers and admins can delete jams"
  ON public.jams FOR DELETE
  TO authenticated
  USING (
    auth.uid() = owner_id 
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jam_managers
      WHERE jam_managers.jam_id = jams.id
        AND jam_managers.user_id = auth.uid()
    )
  );

-- Also update the update policy to be consistent
DROP POLICY IF EXISTS "Owners and admins can update jams" ON public.jams;

CREATE POLICY "Owners, managers and admins can update jams"
  ON public.jams FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id 
    OR public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.jam_managers
      WHERE jam_managers.jam_id = jams.id
        AND jam_managers.user_id = auth.uid()
    )
  );
