/**
 * Seed script for creating test events
 * Run with: npx tsx supabase/seed-events.ts
 *
 * Prerequisites: Run seed-users.ts first to create the test users.
 */

import { createClient } from '@supabase/supabase-js';
import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const envCandidates = [
  process.env.SUPABASE_ENV_FILE,
  resolve(process.cwd(), '.env.development.local'),
  resolve(process.cwd(), '.env.production'),
  resolve(process.cwd(), '.env'),
].filter(Boolean) as string[];

for (const envPath of envCandidates) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: false });
  }
}

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54421';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
  throw new Error(
    'Missing SUPABASE_SERVICE_KEY. Set it in .env.development.local, .env.production, or pass SUPABASE_ENV_FILE.',
  );
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Italian cities with real coordinates
const locations = {
  milan: {
    text: 'Centro Sportivo XXV Aprile, Via Cimabue 24, Milano',
    lat: 45.4642,
    lng: 9.1900,
  },
  rome: {
    text: 'Parco della Caffarella, Via della Caffarella, Roma',
    lat: 41.8719,
    lng: 12.5210,
  },
  florence: {
    text: 'Parco delle Cascine, Piazzale delle Cascine, Firenze',
    lat: 43.7696,
    lng: 11.2355,
  },
  turin: {
    text: 'Parco del Valentino, Corso Massimo d\'Azeglio, Torino',
    lat: 45.0553,
    lng: 7.6869,
  },
  bologna: {
    text: 'Giardini Margherita, Via Castiglione, Bologna',
    lat: 44.4831,
    lng: 11.3547,
  },
  naples: {
    text: 'Villa Comunale, Via Caracciolo, Napoli',
    lat: 40.8318,
    lng: 14.2472,
  },
  venice: {
    text: 'Parco San Giuliano, Via San Giuliano, Mestre',
    lat: 45.4654,
    lng: 12.2630,
  },
  genoa: {
    text: 'Parco di Nervi, Via Capolungo, Genova',
    lat: 44.3849,
    lng: 9.0444,
  },
};

// Helper to create dates relative to today
function daysFromNow(days: number, hour: number = 10, minute: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

// Test events data
const testEvents = [
  // === JAMS ===
  {
    type: 'jam',
    title: 'Jam domenicale al parco',
    description: 'Jam aperta a tutti i livelli! Portate un tappetino e tanta voglia di volare. Cerchio di benvenuto alle 10:30.',
    location: locations.milan,
    starts_at: daysFromNow(3, 10, 0),
    ends_at: daysFromNow(3, 13, 0),
    price: 'Gratuito',
    tags: ['beginner-friendly', 'outdoor', 'free', 'mat-required'],
    ownerEmail: 'charlie@example.com',
  },
  {
    type: 'jam',
    title: 'Jam serale Roma',
    description: 'Jam settimanale ogni mercoledì sera. Riscaldamento guidato, poi pratica libera. Livello intermedio consigliato.',
    location: locations.rome,
    starts_at: daysFromNow(5, 19, 0),
    ends_at: daysFromNow(5, 22, 0),
    price: '5€',
    tags: ['intermediate', 'indoor', 'paid', 'mat-required'],
    ownerEmail: 'bob@example.com',
  },
  {
    type: 'jam',
    title: 'AcroYoga al tramonto',
    description: 'Jam speciale al tramonto sulla spiaggia. Perfetta per praticare con vista mare. Principianti benvenuti!',
    location: locations.naples,
    starts_at: daysFromNow(7, 17, 30),
    ends_at: daysFromNow(7, 20, 30),
    price: 'Gratuito',
    tags: ['beginner-friendly', 'outdoor', 'free'],
    ownerEmail: 'diana@example.com',
  },
  {
    type: 'jam',
    title: 'Jam tecnica avanzata',
    description: 'Sessione dedicata a washing machines, icarian e pops avanzati. Solo praticanti con esperienza.',
    location: locations.florence,
    starts_at: daysFromNow(10, 15, 0),
    ends_at: daysFromNow(10, 18, 0),
    price: '10€',
    tags: ['advanced', 'indoor', 'paid', 'mat-required'],
    ownerEmail: 'alice@example.com',
  },

  // === CLASSES ===
  {
    type: 'class',
    title: 'Corso Base AcroYoga',
    description: 'Corso di 8 settimane per principianti assoluti. Imparerai le basi: bird, throne, front plank e molto altro. Ogni lezione include riscaldamento yoga e stretching finale.',
    location: locations.milan,
    starts_at: daysFromNow(2, 19, 0),
    ends_at: daysFromNow(2, 21, 0),
    price: '120€ (ciclo completo) / 20€ drop-in',
    external_link: 'https://example.com/corso-base',
    tags: ['beginner-friendly', 'indoor', 'paid', 'series', 'mat-required'],
    ownerEmail: 'charlie@example.com',
  },
  {
    type: 'class',
    title: 'Lezione di Icarian',
    description: 'Approfondimento sulle tecniche icarian: pops, whips e combinazioni. Prerequisito: padronanza delle basi L-base.',
    location: locations.bologna,
    starts_at: daysFromNow(4, 18, 30),
    ends_at: daysFromNow(4, 20, 30),
    price: '25€',
    tags: ['intermediate', 'indoor', 'paid', 'mat-required'],
    ownerEmail: 'alice@example.com',
  },
  {
    type: 'class',
    title: 'AcroYoga per coppie',
    description: 'Lezione speciale per coppie che vogliono scoprire l\'AcroYoga insieme. Nessuna esperienza richiesta, solo voglia di divertirsi!',
    location: locations.turin,
    starts_at: daysFromNow(6, 11, 0),
    ends_at: daysFromNow(6, 13, 0),
    price: '30€ a coppia',
    tags: ['beginner-friendly', 'indoor', 'paid', 'bring-partner'],
    ownerEmail: 'diana@example.com',
  },
  {
    type: 'class',
    title: 'Standing Acro Workshop',
    description: 'Focus su standing acrobatics: hand to hand, foot to hand, standing washing machines. Richiesta buona forma fisica.',
    location: locations.rome,
    starts_at: daysFromNow(8, 10, 0),
    ends_at: daysFromNow(8, 13, 0),
    price: '35€',
    tags: ['advanced', 'indoor', 'paid', 'mat-required'],
    ownerEmail: 'bob@example.com',
  },

  // === WORKSHOPS ===
  {
    type: 'workshop',
    title: 'Weekend di Inversioni',
    description: 'Due giorni intensivi dedicati alle inversioni: handstand, forearm stand e tutte le varianti in partner acrobatics. Include pranzo vegetariano.',
    location: locations.florence,
    starts_at: daysFromNow(14, 9, 0),
    ends_at: daysFromNow(15, 18, 0),
    price: '150€',
    external_link: 'https://example.com/inversioni-weekend',
    tags: ['intermediate', 'indoor', 'paid', 'mat-required', 'pasti-inclusi'],
    ownerEmail: 'charlie@example.com',
  },
  {
    type: 'workshop',
    title: 'Thai Massage & AcroYoga',
    description: 'Combina il meglio di due mondi: tecniche di thai massage integrate con il therapeutic flying. Perfetto per chi vuole esplorare il lato terapeutico dell\'AcroYoga.',
    location: locations.genoa,
    starts_at: daysFromNow(21, 10, 0),
    ends_at: daysFromNow(21, 18, 0),
    price: '80€',
    tags: ['beginner-friendly', 'indoor', 'paid'],
    ownerEmail: 'alice@example.com',
  },
  {
    type: 'workshop',
    title: 'AcroYoga Flow Intensivo',
    description: 'Workshop intensivo di 3 giorni per imparare a creare sequenze fluide. Dal beginner al intermediate flow. Alloggio in ostello incluso.',
    location: locations.venice,
    starts_at: daysFromNow(28, 9, 0),
    ends_at: daysFromNow(30, 17, 0),
    price: '250€ (tutto incluso)',
    tags: ['intermediate', 'indoor', 'paid', 'mat-required', 'series', 'pasti-inclusi', 'alloggio-incluso'],
    ownerEmail: 'bob@example.com',
  },

  // === CONVENTIONS ===
  {
    type: 'convention',
    title: 'AcroYoga Italia Festival 2026',
    description: 'Il più grande raduno di AcroYoga in Italia! 4 giorni di workshop, jam, spettacoli e tanto altro. Oltre 20 insegnanti da tutta Europa. Camping disponibile.',
    location: locations.bologna,
    starts_at: daysFromNow(60, 10, 0),
    ends_at: daysFromNow(63, 18, 0),
    price: 'Da 180€ (early bird) a 280€',
    external_link: 'https://example.com/festival-2026',
    tags: ['beginner-friendly', 'intermediate', 'advanced', 'outdoor', 'indoor', 'paid', 'mat-required'],
    ownerEmail: 'charlie@example.com',
  },
  {
    type: 'convention',
    title: 'AcroYoga Summer Camp',
    description: 'Una settimana immersi nella natura praticando AcroYoga. Lezioni mattutine, jam pomeridiane, falò serali. Esperienza indimenticabile!',
    location: locations.florence,
    starts_at: daysFromNow(90, 9, 0),
    ends_at: daysFromNow(96, 16, 0),
    price: '450€ tutto incluso',
    external_link: 'https://example.com/summer-camp',
    tags: ['beginner-friendly', 'intermediate', 'outdoor', 'paid', 'mat-required', 'pasti-inclusi', 'alloggio-incluso'],
    ownerEmail: 'alice@example.com',
  },

  // === PAST EVENTS (for testing history) ===
  {
    type: 'jam',
    title: 'Jam di Capodanno',
    description: 'Iniziamo l\'anno nuovo praticando insieme! Jam speciale con brindisi finale.',
    location: locations.milan,
    starts_at: daysFromNow(-20, 11, 0),
    ends_at: daysFromNow(-20, 14, 0),
    price: 'Gratuito',
    tags: ['beginner-friendly', 'indoor', 'free'],
    ownerEmail: 'charlie@example.com',
  },
  {
    type: 'class',
    title: 'Introduzione all\'AcroYoga',
    description: 'Lezione introduttiva per chi non ha mai provato AcroYoga. Scopri le basi in un ambiente sicuro e divertente.',
    location: locations.rome,
    starts_at: daysFromNow(-10, 18, 0),
    ends_at: daysFromNow(-10, 20, 0),
    price: '15€',
    tags: ['beginner-friendly', 'indoor', 'paid'],
    ownerEmail: 'bob@example.com',
  },
];

async function seedEvents() {
  console.log('🌱 Seeding test events...\n');

  // First, get all test users to map emails to IDs
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email')
    .in('email', ['alice@example.com', 'bob@example.com', 'charlie@example.com', 'diana@example.com']);

  if (profilesError) {
    console.error('❌ Error fetching profiles:', profilesError.message);
    console.log('\n⚠️  Make sure to run seed-users.ts first!');
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.error('❌ No test users found. Run seed-users.ts first!');
    process.exit(1);
  }

  const emailToId = new Map(profiles.map(p => [p.email, p.id]));
  console.log(`✓ Found ${profiles.length} test users\n`);

  // Check for existing events to avoid duplicates
  const { data: existingEvents } = await supabase
    .from('events')
    .select('title')
    .limit(1);

  if (existingEvents && existingEvents.length > 0) {
    console.log('ℹ️  Events already exist in database. Skipping to avoid duplicates.');
    console.log('   To re-seed, run: npx supabase db reset --yes && npx tsx supabase/seed-users.ts && npx tsx supabase/seed-events.ts');
    process.exit(0);
  }

  let created = 0;
  let errors = 0;

  for (const event of testEvents) {
    const ownerId = emailToId.get(event.ownerEmail);

    if (!ownerId) {
      console.error(`  ✗ Owner not found: ${event.ownerEmail}`);
      errors++;
      continue;
    }

    const eventData = {
      owner_id: ownerId,
      type: event.type,
      title: event.title,
      description: event.description,
      location_text: event.location.text,
      location_lat: event.location.lat,
      location_lng: event.location.lng,
      starts_at: event.starts_at.toISOString(),
      ends_at: event.ends_at.toISOString(),
      price: event.price,
      external_link: event.external_link || null,
      tags: event.tags || [],
      status: 'published', // All seed events are published
    };

    const { error } = await supabase.from('events').insert(eventData);

    if (error) {
      console.error(`  ✗ ${event.title}: ${error.message}`);
      errors++;
    } else {
      console.log(`  ✓ ${event.type.padEnd(10)} ${event.title}`);
      created++;
    }
  }

  console.log(`\n✅ Event seeding complete!`);
  console.log(`   Created: ${created}`);
  if (errors > 0) {
    console.log(`   Errors: ${errors}`);
  }

  console.log('\n📊 Events by type:');
  const byType = testEvents.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`);
  });

  console.log('\n📍 Events by city:');
  const byCity = testEvents.reduce((acc, e) => {
    const city = e.location.text.split(',').pop()?.trim() || 'Unknown';
    acc[city] = (acc[city] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  Object.entries(byCity).forEach(([city, count]) => {
    console.log(`   ${city}: ${count}`);
  });

  process.exit(errors > 0 ? 1 : 0);
}

seedEvents().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
