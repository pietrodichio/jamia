-- Seed data for local development
-- This file is run automatically when using `supabase db reset`

-- Note: Supabase local dev doesn't create default auth users automatically
-- You'll need to sign up through the app to create users
-- This seed file only creates sample data that doesn't require specific user IDs

-- For now, this file is intentionally minimal
-- Add sample data here after you've created test users through the app

DO $$ BEGIN
  RAISE NOTICE 'Seed file executed. Create test users through the app signup flow first.';
END $$;
