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

  try {
    execSync('npx supabase db reset --yes', {
      cwd: webDir,
      stdio: 'pipe',
      timeout: 120_000,
    });
    console.log('[db.setup] Database reset completed successfully');
  } catch (error) {
    console.error('[db.setup] Database reset failed:', error);
    throw error;
  }
});
