import { test as setup, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Auth setup project.
 * Authenticates test users via Supabase REST API and saves storageState for each.
 */

const SUPABASE_URL = 'http://127.0.0.1:54421';
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

const AUTH_DIR = path.resolve(__dirname, '../../.auth');
export const ALICE_AUTH_STATE = path.join(AUTH_DIR, 'alice.json');
export const BOB_AUTH_STATE = path.join(AUTH_DIR, 'bob.json');

interface SupabaseSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: string;
  user: {
    id: string;
    email: string;
    [key: string]: unknown;
  };
}

/**
 * Authenticate a user via Supabase REST API and save storageState.
 */
async function authenticateUser(
  page: import('@playwright/test').Page,
  email: string,
  password: string,
  statePath: string
): Promise<void> {
  // Create .auth directory if not exists
  if (!fs.existsSync(AUTH_DIR)) {
    fs.mkdirSync(AUTH_DIR, { recursive: true });
  }

  console.log(`[auth.setup] Authenticating ${email}...`);

  // POST to Supabase auth endpoint
  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ email, password }),
  });

  expect(response.ok, `Authentication failed for ${email}: ${response.status}`).toBeTruthy();

  const session: SupabaseSession = await response.json();

  // Navigate to app origin (required to set localStorage on correct origin)
  await page.goto('/');

  // Set localStorage key for Supabase auth
  // The key format is: sb-{project-ref}-auth-token
  // For local dev, project ref is from supabase/config.toml (fuddhnsjxumqhdquvchx)
  await page.evaluate((sessionData) => {
    const storageKey = 'sb-fuddhnsjxumqhdquvchx-auth-token';
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        access_token: sessionData.access_token,
        refresh_token: sessionData.refresh_token,
        expires_at: sessionData.expires_at,
        expires_in: sessionData.expires_in,
        token_type: sessionData.token_type,
        user: sessionData.user,
      })
    );
  }, session);

  // Save storageState (includes localStorage)
  await page.context().storageState({ path: statePath });

  console.log(`[auth.setup] Saved storageState for ${email} to ${statePath}`);
}

setup('authenticate as alice', async ({ page }) => {
  await authenticateUser(page, 'alice@example.com', 'password123', ALICE_AUTH_STATE);
});

setup('authenticate as bob', async ({ page }) => {
  await authenticateUser(page, 'bob@example.com', 'password123', BOB_AUTH_STATE);
});
