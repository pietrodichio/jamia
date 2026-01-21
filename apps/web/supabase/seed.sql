-- Seed data for local development
-- This file is run automatically when using `supabase db reset`

-- Note: Supabase local dev creates a default user:
-- Email: test@example.com
-- Password: password
-- ID: (varies, but accessible via auth.users)

-- Create test profiles for existing auth users
-- These profiles will be created by the trigger when users sign up,
-- but we can create additional ones for testing

-- Insert sample profiles (matching auth.users that exist in local dev)
INSERT INTO public.profiles (id, first_name, last_name, username, bio, is_admin)
VALUES
  -- Default test user (this ID may vary, adjust after first supabase start)
  (gen_random_uuid(), 'Test', 'User', 'testuser', 'Test user for development', false),
  (gen_random_uuid(), 'Admin', 'User', 'adminuser', 'Admin user for testing permissions', true),
  (gen_random_uuid(), 'Co-Organizer', 'User', 'coorg', 'Co-organizer test user', false)
ON CONFLICT (id) DO NOTHING;

-- Get user IDs for use in seeds (these will be the first 3 profiles created)
DO $$
DECLARE
  test_user_id uuid;
  admin_user_id uuid;
  coorg_user_id uuid;
  test_jam_id uuid;
  test_event_1_id uuid;
  test_event_2_id uuid;
BEGIN
  -- Get the first three user IDs from profiles
  SELECT id INTO test_user_id FROM public.profiles WHERE username = 'testuser' LIMIT 1;
  SELECT id INTO admin_user_id FROM public.profiles WHERE is_admin = true LIMIT 1;
  SELECT id INTO coorg_user_id FROM public.profiles WHERE username = 'coorg' LIMIT 1;

  -- Insert sample jams
  INSERT INTO public.jams (name, owner_id, jam_date, location, description, share_by_link)
  VALUES
    ('Weekly Acroyoga Jam', test_user_id, CURRENT_DATE + INTERVAL '7 days', 'Golden Gate Park, San Francisco', 'Join us for our weekly acroyoga practice in the park!', false),
    ('Private Training Session', coorg_user_id, CURRENT_DATE + INTERVAL '3 days', 'Berkeley Studio', 'Private session for advanced practitioners', true)
  RETURNING id INTO test_jam_id;

  -- Insert sample events
  INSERT INTO public.events (
    title,
    type,
    starts_at,
    ends_at,
    location,
    description,
    price,
    external_link,
    owner_id,
    status
  )
  VALUES
    (
      'Beginner Acroyoga Class',
      'class',
      CURRENT_DATE + INTERVAL '5 days',
      CURRENT_DATE + INTERVAL '5 days' + INTERVAL '2 hours',
      'Mission District Studio, San Francisco, CA',
      'Learn the fundamentals of acroyoga in a supportive environment. No experience necessary!',
      25.00,
      'https://example.com/class',
      test_user_id,
      'published'
    ),
    (
      'Advanced Techniques Workshop',
      'workshop',
      CURRENT_DATE + INTERVAL '14 days',
      CURRENT_DATE + INTERVAL '14 days' + INTERVAL '4 hours',
      'Oakland Community Center, Oakland, CA',
      'Deep dive into advanced washing machine sequences and dynamic transitions.',
      75.00,
      null,
      admin_user_id,
      'published'
    ),
    (
      'Bay Area Acroyoga Convention',
      'convention',
      CURRENT_DATE + INTERVAL '60 days',
      CURRENT_DATE + INTERVAL '62 days',
      'San Francisco Convention Center, CA',
      'Three-day convention featuring world-class teachers, jams, and performances.',
      250.00,
      'https://example.com/convention',
      test_user_id,
      'published'
    ),
    (
      'Draft Event - Not Yet Published',
      'class',
      CURRENT_DATE + INTERVAL '30 days',
      CURRENT_DATE + INTERVAL '30 days' + INTERVAL '1.5 hours',
      'TBD',
      'This event is still being planned',
      null,
      null,
      test_user_id,
      'draft'
    )
  RETURNING id INTO test_event_1_id;

  -- Add co-organizer to the first event
  INSERT INTO public.event_organizers (event_id, user_id, added_by)
  VALUES
    (test_event_1_id, coorg_user_id, test_user_id);

  -- Add jam manager for the first jam
  INSERT INTO public.jam_managers (jam_id, manager_id)
  SELECT id, coorg_user_id
  FROM public.jams
  WHERE owner_id = test_user_id
  LIMIT 1;

  -- Insert sample audit logs
  INSERT INTO public.audit_log (user_id, action, entity_type, entity_id, metadata)
  VALUES
    (test_user_id, 'event_created', 'event', test_event_1_id, '{"type": "class"}'),
    (test_user_id, 'organizer_added', 'event', test_event_1_id, '{"organizer_id": "' || coorg_user_id || '"}'),
    (admin_user_id, 'event_created', 'event', test_event_2_id, '{"type": "workshop"}');

  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE 'Test user ID: %', test_user_id;
  RAISE NOTICE 'Admin user ID: %', admin_user_id;
  RAISE NOTICE 'Co-organizer ID: %', coorg_user_id;
END $$;
