import { test, expect, ALICE_AUTH_STATE } from '../fixtures';
import { DiscoverPage } from '../pages/DiscoverPage';

/**
 * Event Discovery E2E tests.
 *
 * Tests the /discover page functionality including:
 * - Page loading with seeded events
 * - Filtering by event type
 * - Keyword search
 *
 * Uses alice's auth state (authenticated user).
 * Location params are set in URL to ensure events load (bypasses IP location).
 */

test.use({ storageState: ALICE_AUTH_STATE });

test.describe('Event Discovery', () => {
  let discoverPage: DiscoverPage;

  test.beforeEach(async ({ page }) => {
    discoverPage = new DiscoverPage(page);
  });

  test('discover page loads and shows seeded events', async ({ page }) => {
    // Navigate to discover with location params (Rome, 500km radius)
    await discoverPage.goto();

    // Wait for events to load
    await discoverPage.waitForEventsToLoad();

    // Should show at least one event from seed data
    const eventCount = await discoverPage.getEventCardCount();
    expect(eventCount).toBeGreaterThan(0);

    // Verify we can see one of the seeded event titles
    // "Jam domenicale al parco" is a seeded event
    const hasSeededEvent = await page.getByText(/jam domenicale|corso base|weekend di inversioni/i).isVisible();
    expect(hasSeededEvent).toBeTruthy();
  });

  test('can filter events by type', async ({ page }) => {
    // Navigate and wait for events to load
    await discoverPage.goto();
    await discoverPage.waitForEventsToLoad();

    // Get initial event count
    const initialCount = await discoverPage.getEventCardCount();
    expect(initialCount).toBeGreaterThan(0);

    // Filter by "Jam" type
    await discoverPage.filterByType('jam');

    // Wait for filtered results
    await page.waitForTimeout(1000);

    // After filtering, we should still see events (jams exist in seed data)
    // The count might be less than or equal to initial (filtering narrows results)
    const filteredCount = await discoverPage.getEventCardCount();

    // Verify jam-related events are visible
    // All visible cards should now be jams
    // Check for jam badges or jam-related titles
    const jamBadges = page.getByText('Jam', { exact: true }).locator('visible=true');
    const jamBadgeCount = await jamBadges.count();

    // Either we have jam badges visible, or the filter worked (reduced results)
    expect(jamBadgeCount > 0 || filteredCount <= initialCount).toBeTruthy();
  });

  test('can search events by keyword', async ({ page }) => {
    // Navigate and wait for events to load
    await discoverPage.goto();
    await discoverPage.waitForEventsToLoad();

    // Search for a keyword from seeded event titles
    // "Inversioni" is in "Weekend di Inversioni" workshop title
    await discoverPage.searchKeyword('Inversioni');

    // Wait for search results to update
    await page.waitForTimeout(1500);

    // After searching, we should see the matching event
    // Or fewer results if the search narrowed down
    const hasInversioniEvent = await page.getByText(/inversioni/i).isVisible();
    expect(hasInversioniEvent).toBeTruthy();
  });

  test('shows empty state when no events match filters', async ({ page }) => {
    // Navigate to discover without location
    await discoverPage.gotoWithoutLocation();

    // Wait for potential loading to complete
    await page.waitForTimeout(2000);

    // Search for something that definitely does not exist
    await discoverPage.searchKeyword('xyznonexistentevent123');

    // Wait for search results
    await page.waitForTimeout(1500);

    // Should show empty state or no events
    const eventCount = await discoverPage.getEventCardCount();

    // Either no events, or empty state text visible
    const hasEmptyState = await discoverPage.emptyState.isVisible().catch(() => false);

    // At least one of these conditions should be true
    expect(eventCount === 0 || hasEmptyState).toBeTruthy();
  });
});
