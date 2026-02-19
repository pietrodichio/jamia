import { test as base, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';

/**
 * Custom test fixtures for Jamia E2E tests.
 *
 * Provides:
 * - authPage: AuthPage POM instance
 * - autoMockGoogleMaps: Automatically mocks Google Maps API requests
 */

interface Fixtures {
  authPage: AuthPage;
}

export const test = base.extend<Fixtures>({
  // Auto-mock Google Maps API to prevent third-party failures
  // This runs automatically for every test
  autoMockGoogleMaps: [
    async ({ page }, use) => {
      await page.route('**/maps.googleapis.com/**', (route) => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            predictions: [],
            status: 'ZERO_RESULTS',
          }),
        });
      });
      await use();
    },
    { auto: true },
  ],

  // AuthPage POM instance
  authPage: async ({ page }, use) => {
    await use(new AuthPage(page));
  },
});

export { expect } from '@playwright/test';
export { ALICE_AUTH_STATE, BOB_AUTH_STATE } from '../setup/auth.setup';
