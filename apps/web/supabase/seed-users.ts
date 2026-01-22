/**
 * Seed script for creating test users via Supabase Admin API
 * Run with: npx tsx supabase/seed-users.ts
 *
 * This uses the Admin API to create users with proper password hashing that works with GoTrue.
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://127.0.0.1:54421';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const testUsers = [
  {
    email: 'alice@example.com',
    password: 'password123',
    profile: {
      first_name: 'Alice',
      last_name: 'Anderson',
      phone: '+39 333 1234567',
      bio: 'Experienced base with 5 years of AcroYoga. Love teaching and spotting beginners!',
      city: 'Milan',
      main_role: 'base',
      is_super_admin: false
    }
  },
  {
    email: 'bob@example.com',
    password: 'password123',
    profile: {
      first_name: 'Bob',
      last_name: 'Builder',
      phone: '+39 333 2345678',
      bio: 'Flyer loving inversions and pops. Always up for a challenge!',
      city: 'Rome',
      main_role: 'flyer',
      is_super_admin: false
    }
  },
  {
    email: 'charlie@example.com',
    password: 'password123',
    profile: {
      first_name: 'Charlie',
      last_name: 'Chen',
      phone: '+39 333 3456789',
      bio: 'Base and flyer, depending on my partner. Organizing jams since 2020.',
      city: 'Florence',
      main_role: 'both',
      is_super_admin: true
    }
  },
  {
    email: 'diana@example.com',
    password: 'password123',
    profile: {
      first_name: 'Diana',
      last_name: 'Davis',
      phone: null,
      bio: 'New to AcroYoga but learning fast! Looking for patient partners.',
      city: 'Turin',
      main_role: 'both',
      is_super_admin: false
    }
  }
];

async function seedUsers() {
  console.log('🌱 Seeding test users via Admin API...\n');

  for (const user of testUsers) {
    console.log(`Creating user: ${user.email}...`);

    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users.find(u => u.email === user.email);

      if (existingUser) {
        console.log(`  ℹ️  User already exists: ${user.email}`);

        // Update profile data
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert({
            id: existingUser.id,
            email: user.email,
            first_name: user.profile.first_name,
            last_name: user.profile.last_name,
            phone: user.profile.phone,
            bio: user.profile.bio,
            city: user.profile.city,
            main_role: user.profile.main_role,
            is_super_admin: user.profile.is_super_admin,
          });

        if (profileError) {
          console.error(`  ✗ Error updating profile: ${profileError.message}`);
        } else {
          console.log(`  ✓ Profile updated`);
        }
        continue;
      }

      // Create user via Admin API with email auto-confirmed
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          first_name: user.profile.first_name,
          last_name: user.profile.last_name,
        },
      });

      if (authError) {
        console.error(`  ✗ Error: ${authError.message}`);
        continue;
      }

      console.log(`  ✓ Auth user created (ID: ${authData.user.id})`);

      // Wait a bit for trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 500));

      // Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: authData.user.id,
          email: user.email,
          first_name: user.profile.first_name,
          last_name: user.profile.last_name,
          phone: user.profile.phone,
          bio: user.profile.bio,
          city: user.profile.city,
          main_role: user.profile.main_role,
          is_super_admin: user.profile.is_super_admin,
        });

      if (profileError) {
        console.error(`  ✗ Error updating profile: ${profileError.message}`);
      } else {
        console.log(`  ✓ Profile created/updated`);
      }

    } catch (error: any) {
      console.error(`  ✗ Unexpected error:`, error?.message || error);
    }
  }

  console.log('\n✅ User seeding complete!');
  console.log('\n📋 Test credentials:');
  testUsers.forEach(user => {
    const role = user.profile.is_super_admin ? '(Super Admin)' : '';
    console.log(`  ${user.email} / ${user.password} ${role}`);
  });

  console.log('\n🧪 Testing authentication...\n');

  // Test auth with alice
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'alice@example.com',
    password: 'password123',
  });

  if (error) {
    console.error('❌ Authentication test FAILED:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify Supabase is running: npx supabase status');
    console.log('2. Check users in Studio: http://127.0.0.1:54423');
    console.log('3. Try signing up a new user through your app');
  } else {
    console.log('✅ Authentication test PASSED:', data.user?.email);
    console.log('\nYou can now log in to the app with any of the test accounts above.');
  }

  process.exit(error ? 1 : 0);
}

seedUsers().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
