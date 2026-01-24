-- Fix event_teachers.user_id to reference profiles instead of auth.users
-- This allows proper joins in Supabase queries

-- Drop the existing foreign key constraint
ALTER TABLE public.event_teachers
  DROP CONSTRAINT IF EXISTS event_teachers_user_id_fkey;

-- Add new foreign key referencing profiles
ALTER TABLE public.event_teachers
  ADD CONSTRAINT event_teachers_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Add comment explaining the change
COMMENT ON CONSTRAINT event_teachers_user_id_fkey ON public.event_teachers IS
  'References profiles(id) for easier Supabase joins. Since profiles.id = auth.users.id, this maintains referential integrity.';
