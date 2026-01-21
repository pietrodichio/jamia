-- Expand jam permissions to include managers alongside owners and admins

-- Allow managers to view jams (including drafts) they help manage
DROP POLICY IF EXISTS "Anyone can view published jams" ON public.jams;
DROP POLICY IF EXISTS "Public jams are viewable by everyone" ON public.jams;
CREATE POLICY "Anyone can view published jams"
  ON public.jams FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    OR public.is_owner_or_manager(id, auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Allow managers to update jams
DROP POLICY IF EXISTS "Owners and admins can update jams" ON public.jams;
DROP POLICY IF EXISTS "Owners, managers and admins can update jams" ON public.jams;
CREATE POLICY "Owners, managers and admins can update jams"
  ON public.jams FOR UPDATE
  TO authenticated
  USING (
    public.is_owner_or_manager(id, auth.uid())
    OR public.is_admin(auth.uid())
  )
  WITH CHECK (
    public.is_owner_or_manager(id, auth.uid())
    OR public.is_admin(auth.uid())
  );

-- Allow managers to delete jams (matches owner permissions)
DROP POLICY IF EXISTS "Owners and admins can delete jams" ON public.jams;
DROP POLICY IF EXISTS "Owners, managers and admins can delete jams" ON public.jams;
CREATE POLICY "Owners, managers and admins can delete jams"
  ON public.jams FOR DELETE
  TO authenticated
  USING (
    public.is_owner_or_manager(id, auth.uid())
    OR public.is_admin(auth.uid())
  );
