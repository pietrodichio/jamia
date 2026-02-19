import { test as setup } from '@playwright/test';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Database reset setup project.
 * Runs `supabase db reset --yes` which:
 * 1. Drops and recreates the database
 * 2. Applies all migrations
 * 3. Runs supabase/seed.sql automatically
 */
setup('reset database', async () => {
  const webDir = path.resolve(__dirname, '../../');

  console.log('[db.setup] Starting database reset...');

  // Check if SKIP_DB_RESET env is set (useful for local dev when DB is already seeded)
  if (process.env.SKIP_DB_RESET === 'true') {
    console.log('[db.setup] Skipping database reset (SKIP_DB_RESET=true)');
    return;
  }

  try {
    const result = execSync('npx supabase db reset --yes', {
      cwd: webDir,
      stdio: 'pipe',
      timeout: 120_000,
    });
    console.log('[db.setup] Database reset completed successfully');
    console.log(result.toString());
  } catch (error) {
    // Check if the error is just a storage bucket issue but migrations succeeded
    const errorOutput = (error as { stderr?: Buffer }).stderr?.toString() || '';

    // Case 1: Migrations and seeding succeeded, just storage health check failed
    if (
      errorOutput.includes('Seeding data from supabase/seed.sql') &&
      (errorOutput.includes('storage/v1/bucket') || errorOutput.includes('DatabaseError'))
    ) {
      console.log('[db.setup] Database reset completed (storage health check warning ignored)');
      return;
    }

    // Case 2: Policy already exists - database wasn't fully recreated but data is there
    if (errorOutput.includes('already exists') && errorOutput.includes('policy')) {
      console.log('[db.setup] Database reset skipped (schema already applied)');
      console.log('[db.setup] Run with fresh Supabase instance if tests fail');
      return;
    }

    // Case 3: Seed completed even if there was a partial error
    if (errorOutput.includes('seed.sql') || errorOutput.includes('Seeding')) {
      console.log('[db.setup] Database partially reset, proceeding with tests');
      return;
    }

    console.error('[db.setup] Database reset failed:', error);
    throw error;
  }
});
