-- Seed file for local development
-- This file runs automatically when you run: npm run supabase:reset
-- Creates test data for profiles, jams, participants, and managers

-- ============================================
-- IMPORTANT: Create test users first
-- ============================================
-- Supabase requires users to exist in auth.users before creating profiles
-- You have two options:

-- OPTION 1: Create users via Supabase Studio (Recommended)
-- 1. Open http://127.0.0.1:54323
-- 2. Go to Authentication → Users → Add user
-- 3. Create users with these emails:
--    - alice@example.com (password: password123)
--    - bob@example.com (password: password123)
--    - charlie@example.com (password: password123)
--    - diana@example.com (password: password123)

-- OPTION 2: Insert directly into auth.users (Advanced)
-- Uncomment the following if you want to create auth users programmatically:

INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_super_admin,
  created_at,
  updated_at,
  phone,
  phone_confirmed_at,
  phone_change,
  phone_change_token,
  phone_change_sent_at,
  email_change_token_current,
  email_change_confirm_status,
  banned_until,
  reauthentication_token,
  reauthentication_sent_at,
  is_sso_user,
  deleted_at
) VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'alice@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'bob@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'charlie@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'diana@example.com',
    crypt('password123', gen_salt('bf')),
    NOW(),
    NULL,
    '',
    NULL,
    '',
    NULL,
    '',
    '',
    NULL,
    NOW(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    false,
    NOW(),
    NOW(),
    NULL,
    NULL,
    '',
    '',
    NULL,
    '',
    0,
    NULL,
    '',
    NULL,
    false,
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Seed Profiles
-- ============================================
-- Note: The handle_new_user() trigger automatically creates a profile
-- when a user is created in auth.users. If you created users via Studio,
-- profiles already exist. We use ON CONFLICT to update them with test data.

INSERT INTO profiles (id, email, first_name, last_name, phone, bio, city, main_role, is_super_admin)
VALUES
  (
    '11111111-1111-1111-1111-111111111111',
    'alice@example.com',
    'Alice',
    'Anderson',
    '+39 333 1234567',
    'Experienced base with 5 years of AcroYoga. Love teaching and spotting beginners!',
    'Milan',
    'base',
    false
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'bob@example.com',
    'Bob',
    'Builder',
    '+39 333 2345678',
    'Flyer loving inversions and pops. Always up for a challenge!',
    'Rome',
    'flyer',
    false
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'charlie@example.com',
    'Charlie',
    'Chen',
    '+39 333 3456789',
    'Base and flyer, depending on my partner. Organizing jams since 2020.',
    'Florence',
    'both',
    true  -- Super admin
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    'diana@example.com',
    'Diana',
    'Davis',
    NULL,
    'New to AcroYoga but learning fast! Looking for patient partners.',
    'Turin',
    'both',
    false
  )
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  bio = EXCLUDED.bio,
  city = EXCLUDED.city,
  main_role = EXCLUDED.main_role,
  is_super_admin = EXCLUDED.is_super_admin;

-- ============================================
-- Seed Jams
-- ============================================

INSERT INTO jams (
  id,
  owner_id,
  name,
  description,
  location,
  location_text,
  gmaps_link,
  location_lat,
  location_lng,
  starts_at,
  ends_at,
  capacity,
  desired_bases_min,
  desired_bases_max,
  desired_flyers_min,
  desired_flyers_max,
  auto_promote,
  public_participants,
  status,
  published_at
) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333',  -- Charlie (owner)
    'Sunday Morning Flow',
    'Relaxed Sunday morning acro session. Perfect for all levels. We''ll start with a warm-up, then move into washing machine flows and therapeutic flying.',
    '{"description": "Parco Sempione, Milan", "place_id": "ChIJd9BlNqbGhkcRmvJMNYBKQRs", "latitude": 45.4742, "longitude": 9.1757, "google_maps_url": "https://maps.google.com/?q=Parco+Sempione,+Milan"}',
    'Parco Sempione, Milan',
    'https://maps.google.com/?q=Parco+Sempione,+Milan',
    45.4742,
    9.1757,
    NOW() + INTERVAL '3 days',
    NOW() + INTERVAL '3 days' + INTERVAL '2 hours',
    15,
    3,
    8,
    3,
    8,
    true,
    true,
    'published',
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',  -- Alice (owner)
    'Advanced L-basing Workshop',
    'Focus on advanced L-basing techniques including pops, pitches, and dynamic transitions. Prerequisites: comfortable with foot-to-hand.',
    '{"description": "AcroYoga Rome Studio, Via del Corso 100", "latitude": 41.9028, "longitude": 12.4964}',
    'AcroYoga Rome Studio, Via del Corso 100',
    NULL,
    41.9028,
    12.4964,
    NOW() + INTERVAL '7 days',
    NOW() + INTERVAL '7 days' + INTERVAL '3 hours',
    10,
    4,
    5,
    4,
    5,
    false,  -- No auto-promote (workshop)
    true,
    'published',
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '33333333-3333-3333-3333-333333333333',  -- Charlie (owner)
    'Beginners Welcome Jam',
    'New to AcroYoga? This is the perfect jam for you! We''ll teach basic positions and safety. Experienced acrobats welcome to help spot and teach.',
    '{"description": "Giardino Bardini, Florence", "place_id": "ChIJZ0Z0Z0Z0KhMRQZ0Z0Z0Z0Z0", "latitude": 43.7626, "longitude": 11.2606}',
    'Giardino Bardini, Florence',
    'https://maps.google.com/?q=Giardino+Bardini,+Florence',
    43.7626,
    11.2606,
    NOW() + INTERVAL '10 days',
    NOW() + INTERVAL '10 days' + INTERVAL '2.5 hours',
    20,
    5,
    10,
    5,
    10,
    true,
    true,
    'published',
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '22222222-2222-2222-2222-222222222222',  -- Bob (owner)
    'Evening Beach Acro',
    'Sunset acro session on the beach! Bring water and sun protection. We''ll practice on the sand (softer landings!).',
    '{"description": "Lido di Camaiore Beach, Tuscany"}',
    'Lido di Camaiore Beach, Tuscany',
    NULL,
    NULL,
    NULL,
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days' + INTERVAL '2 hours',
    12,
    0,
    NULL,
    0,
    NULL,
    true,
    false,  -- Participants not public (private group)
    'published',
    NOW()
  ),
  (
    '10000000-0000-0000-0000-000000000005',
    '11111111-1111-1111-1111-111111111111',  -- Alice (owner)
    'Monthly Acro Meetup - DRAFT',
    'Monthly recurring jam for the local community. Location TBD.',
    NULL,
    'Florence City Center',
    NULL,
    NULL,
    NULL,
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days' + INTERVAL '3 hours',
    NULL,
    0,
    NULL,
    0,
    NULL,
    true,
    true,
    'draft',  -- Not published yet
    NULL
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- Seed Jam Participants
-- ============================================

INSERT INTO jam_participants (jam_id, user_id, state, role, joined_at) VALUES
  -- Sunday Morning Flow (15 capacity)
  ('10000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'participant', 'both', NOW() - INTERVAL '2 days'),  -- Owner/organizer
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'participant', 'base', NOW() - INTERVAL '1 day'),
  ('10000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'participant', 'flyer', NOW() - INTERVAL '1 day'),
  ('10000000-0000-0000-0000-000000000001', '44444444-4444-4444-4444-444444444444', 'participant', 'both', NOW() - INTERVAL '12 hours'),
  
  -- Advanced L-basing Workshop (10 capacity, no auto-promote)
  ('10000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'participant', 'base', NOW() - INTERVAL '3 days'),  -- Owner
  ('10000000-0000-0000-0000-000000000002', '33333333-3333-3333-3333-333333333333', 'participant', 'both', NOW() - INTERVAL '2 days'),
  ('10000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'waiting', 'flyer', NOW() - INTERVAL '1 day'),  -- On waiting list
  
  -- Beginners Welcome Jam (20 capacity)
  ('10000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'participant', 'both', NOW() - INTERVAL '5 days'),  -- Owner
  ('10000000-0000-0000-0000-000000000003', '44444444-4444-4444-4444-444444444444', 'participant', 'both', NOW() - INTERVAL '4 days'),
  
  -- Evening Beach Acro (12 capacity)
  ('10000000-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'participant', 'flyer', NOW() - INTERVAL '1 day')  -- Owner
ON CONFLICT (jam_id, user_id) DO NOTHING;

-- ============================================
-- Seed Jam Managers (Co-managers)
-- ============================================

-- Add Alice as a co-manager for Charlie's "Sunday Morning Flow"
INSERT INTO jam_managers (jam_id, manager_id, created_at) VALUES
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', NOW() - INTERVAL '2 days')  -- Alice co-managing Charlie's jam
ON CONFLICT (jam_id, manager_id) DO NOTHING;

-- ============================================
-- Seed Audit Log (Optional - for testing)
-- ============================================

INSERT INTO audit_log (jam_id, user_id, action, metadata) VALUES
  ('10000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'created', '{"jam_name": "Sunday Morning Flow"}'),
  ('10000000-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'published', NULL),
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'joined', '{"state": "participant"}'),
  ('10000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'created', '{"jam_name": "Advanced L-basing Workshop"}'),
  ('10000000-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'published', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- Summary of Test Data
-- ============================================

-- After seeding, you'll have:
-- ✅ 4 test users (Alice, Bob, Charlie, Diana)
-- ✅ Charlie is a super admin
-- ✅ 5 jams (4 published, 1 draft)
-- ✅ Various participants and waiting list members
-- ✅ 1 co-manager relationship
-- ✅ Audit log entries

-- Login credentials (if you used Option 2 to create auth users):
-- Email: alice@example.com   | Password: password123 | Role: Base
-- Email: bob@example.com     | Password: password123 | Role: Flyer
-- Email: charlie@example.com | Password: password123 | Role: Both (Super Admin)
-- Email: diana@example.com   | Password: password123 | Role: Both

-- You can now test:
-- ✅ Joining jams
-- ✅ Waiting lists
-- ✅ Manager permissions
-- ✅ Draft vs published jams
-- ✅ Public vs private participant lists
-- ✅ Location with and without coordinates
