-- Add direct foreign key from jam_managers.user_id to profiles.id
-- This enables PostgREST to resolve the relationship for queries like:
-- supabase.from('jam_managers').select('*, profiles(*)')

-- First, add the FK constraint (both point to same auth.users.id, so this is safe)
ALTER TABLE jam_managers
  ADD CONSTRAINT jam_managers_user_id_profiles_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Also fix added_by if it needs to reference profiles
ALTER TABLE jam_managers
  ADD CONSTRAINT jam_managers_added_by_profiles_fkey 
  FOREIGN KEY (added_by) REFERENCES profiles(id) ON DELETE CASCADE;

COMMENT ON CONSTRAINT jam_managers_user_id_profiles_fkey ON jam_managers IS 
  'Enables PostgREST to join jam_managers with profiles for manager details';
