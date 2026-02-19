-- Seed data for local development
-- This file is run automatically when using `supabase db reset`

-- ============================================
-- Create Test Users (auth.users + auth.identities)
-- ============================================
-- Use SQL-only seeding so no manual scripts are required.
-- Based on the same auth.users + auth.identities pattern used in project-acro-sicily.

DO $$
DECLARE
  instance_id_val uuid;
BEGIN
  BEGIN
    SELECT id INTO instance_id_val FROM auth.instances LIMIT 1;
    IF instance_id_val IS NULL THEN
      instance_id_val := '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;
  EXCEPTION
    WHEN undefined_table THEN
      instance_id_val := '00000000-0000-0000-0000-000000000000'::uuid;
    WHEN OTHERS THEN
      instance_id_val := '00000000-0000-0000-0000-000000000000'::uuid;
  END;

  INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    last_sign_in_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role,
    aud,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change,
    phone,
    phone_confirmed_at
  )
  VALUES
    (
      '11111111-1111-4111-8111-111111111111',
      instance_id_val,
      'alice@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Alice Anderson"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '+39 333 1234567',
      NULL
    ),
    (
      '22222222-2222-4222-8222-222222222222',
      instance_id_val,
      'bob@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Bob Builder"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '+39 333 2345678',
      NULL
    ),
    (
      '33333333-3333-4333-8333-333333333333',
      instance_id_val,
      'charlie@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Charlie Chen"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      '+39 333 3456789',
      NULL
    ),
    (
      '44444444-4444-4444-8444-444444444444',
      instance_id_val,
      'diana@example.com',
      crypt('password123', gen_salt('bf')),
      NOW(),
      NOW(),
      NOW(),
      NOW(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Diana Davis"}'::jsonb,
      false,
      'authenticated',
      'authenticated',
      '',
      '',
      '',
      '',
      NULL,
      NULL
    )
  ON CONFLICT (id) DO UPDATE
  SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = NOW(),
    updated_at = NOW(),
    last_sign_in_at = NOW();

  INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  )
  VALUES
    (
      gen_random_uuid(),
      '11111111-1111-4111-8111-111111111111',
      jsonb_build_object('sub', '11111111-1111-4111-8111-111111111111', 'email', 'alice@example.com'),
      'email',
      'alice@example.com',
      NOW(),
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '22222222-2222-4222-8222-222222222222',
      jsonb_build_object('sub', '22222222-2222-4222-8222-222222222222', 'email', 'bob@example.com'),
      'email',
      'bob@example.com',
      NOW(),
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '33333333-3333-4333-8333-333333333333',
      jsonb_build_object('sub', '33333333-3333-4333-8333-333333333333', 'email', 'charlie@example.com'),
      'email',
      'charlie@example.com',
      NOW(),
      NOW(),
      NOW()
    ),
    (
      gen_random_uuid(),
      '44444444-4444-4444-8444-444444444444',
      jsonb_build_object('sub', '44444444-4444-4444-8444-444444444444', 'email', 'diana@example.com'),
      'email',
      'diana@example.com',
      NOW(),
      NOW(),
      NOW()
    )
  ON CONFLICT (provider, provider_id) DO UPDATE
  SET
    identity_data = EXCLUDED.identity_data,
    user_id = EXCLUDED.user_id,
    updated_at = NOW();
END $$;

-- ============================================
-- Seed Profiles
-- ============================================

INSERT INTO public.profiles (
  id,
  email,
  first_name,
  last_name,
  phone,
  bio,
  city,
  main_role,
  is_super_admin,
  verified
)
VALUES
  (
    '11111111-1111-4111-8111-111111111111',
    'alice@example.com',
    'Alice',
    'Anderson',
    '+39 333 1234567',
    'Experienced base with 5 years of AcroYoga. Love teaching and spotting beginners!',
    'Milan',
    'base',
    false,
    true
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    'bob@example.com',
    'Bob',
    'Builder',
    '+39 333 2345678',
    'Flyer loving inversions and pops. Always up for a challenge!',
    'Rome',
    'flyer',
    false,
    true
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    'charlie@example.com',
    'Charlie',
    'Chen',
    '+39 333 3456789',
    'Base and flyer, depending on my partner. Organizing jams since 2020.',
    'Florence',
    'both',
    true,
    true
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    'diana@example.com',
    'Diana',
    'Davis',
    NULL,
    'New to AcroYoga but learning fast! Looking for patient partners.',
    'Turin',
    'both',
    false,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  first_name = EXCLUDED.first_name,
  last_name = EXCLUDED.last_name,
  phone = EXCLUDED.phone,
  bio = EXCLUDED.bio,
  city = EXCLUDED.city,
  main_role = EXCLUDED.main_role,
  is_super_admin = EXCLUDED.is_super_admin,
  verified = EXCLUDED.verified;

-- ============================================
-- Seed Events
-- ============================================

INSERT INTO public.events (
  id,
  owner_id,
  type,
  title,
  description,
  location_text,
  location_lat,
  location_lng,
  starts_at,
  ends_at,
  price,
  external_link,
  tags,
  status
)
VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '33333333-3333-4333-8333-333333333333',
    'jam',
    'Jam domenicale al parco',
    'Jam aperta a tutti i livelli! Portate un tappetino e tanta voglia di volare. Cerchio di benvenuto alle 10:30.',
    'Centro Sportivo XXV Aprile, Milano',
    45.4642,
    9.1900,
    date_trunc('day', now()) + interval '3 days' + interval '10 hours',
    date_trunc('day', now()) + interval '3 days' + interval '13 hours',
    'Gratuito',
    NULL,
    ARRAY['beginner-friendly', 'outdoor', 'free', 'mat-required'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000002',
    '22222222-2222-4222-8222-222222222222',
    'jam',
    'Jam serale Roma',
    'Jam settimanale ogni mercoledì sera. Riscaldamento guidato, poi pratica libera. Livello intermedio consigliato.',
    'Parco della Caffarella, Roma',
    41.8719,
    12.5210,
    date_trunc('day', now()) + interval '5 days' + interval '19 hours',
    date_trunc('day', now()) + interval '5 days' + interval '22 hours',
    '5€',
    NULL,
    ARRAY['intermediate', 'indoor', 'paid', 'mat-required'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000003',
    '44444444-4444-4444-8444-444444444444',
    'jam',
    'AcroYoga al tramonto',
    'Jam speciale al tramonto sulla spiaggia. Perfetta per praticare con vista mare. Principianti benvenuti!',
    'Villa Comunale, Napoli',
    40.8318,
    14.2472,
    date_trunc('day', now()) + interval '7 days' + interval '17 hours 30 minutes',
    date_trunc('day', now()) + interval '7 days' + interval '20 hours 30 minutes',
    'Gratuito',
    NULL,
    ARRAY['beginner-friendly', 'outdoor', 'free'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000004',
    '11111111-1111-4111-8111-111111111111',
    'jam',
    'Jam tecnica avanzata',
    'Sessione dedicata a washing machines, icarian e pops avanzati. Solo praticanti con esperienza.',
    'Parco delle Cascine, Firenze',
    43.7696,
    11.2355,
    date_trunc('day', now()) + interval '10 days' + interval '15 hours',
    date_trunc('day', now()) + interval '10 days' + interval '18 hours',
    '10€',
    NULL,
    ARRAY['advanced', 'indoor', 'paid', 'mat-required'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000005',
    '33333333-3333-4333-8333-333333333333',
    'class',
    'Corso Base AcroYoga',
    'Corso di 8 settimane per principianti assoluti. Imparerai le basi: bird, throne, front plank e molto altro. Ogni lezione include riscaldamento yoga e stretching finale.',
    'Centro Sportivo XXV Aprile, Milano',
    45.4642,
    9.1900,
    date_trunc('day', now()) + interval '2 days' + interval '19 hours',
    date_trunc('day', now()) + interval '2 days' + interval '21 hours',
    '120€ (ciclo completo) / 20€ drop-in',
    'https://example.com/corso-base',
    ARRAY['beginner-friendly', 'indoor', 'paid', 'series', 'mat-required'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000006',
    '11111111-1111-4111-8111-111111111111',
    'class',
    'Lezione di Icarian',
    'Approfondimento sulle tecniche icarian: pops, whips e combinazioni. Prerequisito: padronanza delle basi L-base.',
    'Giardini Margherita, Bologna',
    44.4831,
    11.3547,
    date_trunc('day', now()) + interval '4 days' + interval '18 hours 30 minutes',
    date_trunc('day', now()) + interval '4 days' + interval '20 hours 30 minutes',
    '25€',
    NULL,
    ARRAY['intermediate', 'indoor', 'paid', 'mat-required'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000007',
    '44444444-4444-4444-8444-444444444444',
    'class',
    'AcroYoga per coppie',
    'Lezione speciale per coppie che vogliono scoprire l''AcroYoga insieme. Nessuna esperienza richiesta, solo voglia di divertirsi!',
    'Parco del Valentino, Torino',
    45.0553,
    7.6869,
    date_trunc('day', now()) + interval '6 days' + interval '11 hours',
    date_trunc('day', now()) + interval '6 days' + interval '13 hours',
    '30€ a coppia',
    NULL,
    ARRAY['beginner-friendly', 'indoor', 'paid', 'bring-partner'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000008',
    '22222222-2222-4222-8222-222222222222',
    'class',
    'Standing Acro Workshop',
    'Focus su standing acrobatics: hand to hand, foot to hand, standing washing machines. Richiesta buona forma fisica.',
    'Parco della Caffarella, Roma',
    41.8719,
    12.5210,
    date_trunc('day', now()) + interval '8 days' + interval '10 hours',
    date_trunc('day', now()) + interval '8 days' + interval '13 hours',
    '35€',
    NULL,
    ARRAY['advanced', 'indoor', 'paid', 'mat-required'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000009',
    '33333333-3333-4333-8333-333333333333',
    'workshop',
    'Weekend di Inversioni',
    'Due giorni intensivi dedicati alle inversioni: handstand, forearm stand e tutte le varianti in partner acrobatics. Include pranzo vegetariano.',
    'Parco delle Cascine, Firenze',
    43.7696,
    11.2355,
    date_trunc('day', now()) + interval '14 days' + interval '9 hours',
    date_trunc('day', now()) + interval '15 days' + interval '18 hours',
    '150€',
    'https://example.com/inversioni-weekend',
    ARRAY['intermediate', 'indoor', 'paid', 'mat-required', 'pasti-inclusi'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000010',
    '11111111-1111-4111-8111-111111111111',
    'workshop',
    'Thai Massage & AcroYoga',
    'Combina il meglio di due mondi: tecniche di thai massage integrate con il therapeutic flying. Perfetto per chi vuole esplorare il lato terapeutico dell''AcroYoga.',
    'Parco di Nervi, Genova',
    44.3849,
    9.0444,
    date_trunc('day', now()) + interval '21 days' + interval '10 hours',
    date_trunc('day', now()) + interval '21 days' + interval '18 hours',
    '80€',
    NULL,
    ARRAY['beginner-friendly', 'indoor', 'paid'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000011',
    '22222222-2222-4222-8222-222222222222',
    'workshop',
    'AcroYoga Flow Intensivo',
    'Workshop intensivo di 3 giorni per imparare a creare sequenze fluide. Dal beginner al intermediate flow. Alloggio in ostello incluso.',
    'Parco San Giuliano, Mestre',
    45.4654,
    12.2630,
    date_trunc('day', now()) + interval '28 days' + interval '9 hours',
    date_trunc('day', now()) + interval '30 days' + interval '17 hours',
    '250€ (tutto incluso)',
    NULL,
    ARRAY['intermediate', 'indoor', 'paid', 'mat-required', 'series', 'pasti-inclusi', 'alloggio-incluso'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000012',
    '33333333-3333-4333-8333-333333333333',
    'convention',
    'AcroYoga Italia Festival 2026',
    'Il più grande raduno di AcroYoga in Italia! 4 giorni di workshop, jam, spettacoli e tanto altro. Oltre 20 insegnanti da tutta Europa. Camping disponibile.',
    'Giardini Margherita, Bologna',
    44.4831,
    11.3547,
    date_trunc('day', now()) + interval '60 days' + interval '10 hours',
    date_trunc('day', now()) + interval '63 days' + interval '18 hours',
    'Da 180€ (early bird) a 280€',
    'https://example.com/festival-2026',
    ARRAY['beginner-friendly', 'intermediate', 'advanced', 'outdoor', 'indoor', 'paid', 'mat-required'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000013',
    '11111111-1111-4111-8111-111111111111',
    'convention',
    'AcroYoga Summer Camp',
    'Una settimana immersi nella natura praticando AcroYoga. Lezioni mattutine, jam pomeridiane, falò serali. Esperienza indimenticabile!',
    'Parco delle Cascine, Firenze',
    43.7696,
    11.2355,
    date_trunc('day', now()) + interval '90 days' + interval '9 hours',
    date_trunc('day', now()) + interval '96 days' + interval '16 hours',
    '450€ tutto incluso',
    'https://example.com/summer-camp',
    ARRAY['beginner-friendly', 'intermediate', 'outdoor', 'paid', 'mat-required', 'pasti-inclusi', 'alloggio-incluso'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000014',
    '33333333-3333-4333-8333-333333333333',
    'jam',
    'Jam di Capodanno',
    'Iniziamo l''anno nuovo praticando insieme! Jam speciale con brindisi finale.',
    'Centro Sportivo XXV Aprile, Milano',
    45.4642,
    9.1900,
    date_trunc('day', now()) + interval '-20 days' + interval '11 hours',
    date_trunc('day', now()) + interval '-20 days' + interval '14 hours',
    'Gratuito',
    NULL,
    ARRAY['beginner-friendly', 'indoor', 'free'],
    'published'
  ),
  (
    '20000000-0000-0000-0000-000000000015',
    '22222222-2222-4222-8222-222222222222',
    'class',
    'Introduzione all''AcroYoga',
    'Lezione introduttiva per chi non ha mai provato AcroYoga. Scopri le basi in un ambiente sicuro e divertente.',
    'Parco della Caffarella, Roma',
    41.8719,
    12.5210,
    date_trunc('day', now()) + interval '-10 days' + interval '18 hours',
    date_trunc('day', now()) + interval '-10 days' + interval '20 hours',
    '15€',
    NULL,
    ARRAY['beginner-friendly', 'indoor', 'paid'],
    'published'
  )
ON CONFLICT (id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  type = EXCLUDED.type,
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  location_text = EXCLUDED.location_text,
  location_lat = EXCLUDED.location_lat,
  location_lng = EXCLUDED.location_lng,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  price = EXCLUDED.price,
  external_link = EXCLUDED.external_link,
  tags = EXCLUDED.tags,
  status = EXCLUDED.status;

-- ============================================
-- Seed Legacy Jams (for jam participation E2E tests)
-- ============================================

INSERT INTO public.jams (
  id,
  owner_id,
  name,
  location_text,
  gmaps_link,
  starts_at,
  ends_at,
  description,
  capacity,
  desired_bases_min,
  desired_bases_max,
  desired_flyers_min,
  desired_flyers_max,
  status,
  auto_promote,
  public_participants
)
VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    '11111111-1111-4111-8111-111111111111',
    'Jam Test Milano',
    'Centro Sportivo XXV Aprile, Milano',
    'https://goo.gl/maps/example1',
    date_trunc('day', now()) + interval '5 days' + interval '10 hours',
    date_trunc('day', now()) + interval '5 days' + interval '13 hours',
    'Jam di test per E2E. Alice è owner, Bob può partecipare.',
    20,
    4,
    8,
    4,
    8,
    'published',
    true,
    true
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    '33333333-3333-4333-8333-333333333333',
    'Jam Test Firenze',
    'Parco delle Cascine, Firenze',
    'https://goo.gl/maps/example2',
    date_trunc('day', now()) + interval '7 days' + interval '15 hours',
    date_trunc('day', now()) + interval '7 days' + interval '18 hours',
    'Jam di test organizzata da Charlie.',
    15,
    3,
    6,
    3,
    6,
    'published',
    false,
    true
  )
ON CONFLICT (id) DO UPDATE SET
  owner_id = EXCLUDED.owner_id,
  name = EXCLUDED.name,
  location_text = EXCLUDED.location_text,
  gmaps_link = EXCLUDED.gmaps_link,
  starts_at = EXCLUDED.starts_at,
  ends_at = EXCLUDED.ends_at,
  description = EXCLUDED.description,
  capacity = EXCLUDED.capacity,
  desired_bases_min = EXCLUDED.desired_bases_min,
  desired_bases_max = EXCLUDED.desired_bases_max,
  desired_flyers_min = EXCLUDED.desired_flyers_min,
  desired_flyers_max = EXCLUDED.desired_flyers_max,
  status = EXCLUDED.status,
  auto_promote = EXCLUDED.auto_promote,
  public_participants = EXCLUDED.public_participants;
