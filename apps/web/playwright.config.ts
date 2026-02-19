import { defineConfig, devices } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Playwright configuration for Jamia E2E tests.
 *
 * Projects are executed in dependency order:
 * 1. db-reset: Reset Supabase database
 * 2. auth-setup: Authenticate test users via REST API
 * 3. mobile-chromium: Run tests on iPhone 14 viewport
 */
export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['html', { open: 'on-failure' }], ['list']],
  use: {
    baseURL: 'http://localhost:8080',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    locale: 'it-IT',
  },
  projects: [
    {
      name: 'db-reset',
      testMatch: /db\.setup\.ts/,
      testDir: './e2e/setup',
    },
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      testDir: './e2e/setup',
      dependencies: ['db-reset'],
    },
    {
      name: 'mobile-chromium',
      use: {
        ...devices['iPhone 14'],
        storageState: path.join(__dirname, '.auth/alice.json'),
      },
      dependencies: ['auth-setup'],
    },
  ],
  webServer: {
    command: 'pnpm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
