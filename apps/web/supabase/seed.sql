-- Seed data for local development
-- This file is run automatically when using `supabase db reset`

-- ============================================
-- Create Test Users
-- ============================================
-- IMPORTANT: Users MUST be created via Admin API for authentication to work.
-- Direct SQL inserts with crypt() produce hashes incompatible with GoTrue.
--
-- Run after database reset:
--   cd apps/web
--   npx tsx supabase/seed-users.ts
--
-- See SEEDING.md for details.

-- ============================================
-- Summary
-- ============================================

DO $$ BEGIN
  RAISE NOTICE 'Database schema initialized.';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Create test users';
  RAISE NOTICE '  Run: npx tsx supabase/seed-users.ts';
  RAISE NOTICE '';
  RAISE NOTICE 'This will create 4 test users:';
  RAISE NOTICE '  - alice@example.com (password: password123) - Base';
  RAISE NOTICE '  - bob@example.com (password: password123) - Flyer';
  RAISE NOTICE '  - charlie@example.com (password: password123) - Both (Super Admin)';
  RAISE NOTICE '  - diana@example.com (password: password123) - Both';
  RAISE NOTICE '';
  RAISE NOTICE 'Open Supabase Studio: http://127.0.0.1:54323';
END $$;
