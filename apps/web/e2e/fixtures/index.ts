import { test as base, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { DiscoverPage } from '../pages/DiscoverPage';
import { ALICE_AUTH_STATE, BOB_AUTH_STATE } from '../constants';

/**
 * Custom test fixtures for Jamia E2E tests.
 *
 * Provides:
 * - authPage: AuthPage POM instance
 * - discoverPage: DiscoverPage POM instance
 * - autoMockGoogleMaps: Automatically mocks Google Maps API requests
 */

// Re-export auth state paths from constants
export { ALICE_AUTH_STATE, BOB_AUTH_STATE };

interface Fixtures {
  authPage: AuthPage;
  discoverPage: DiscoverPage;
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

  // DiscoverPage POM instance
  discoverPage: async ({ page }, use) => {
    await use(new DiscoverPage(page));
  },
});

export { expect } from '@playwright/test';
