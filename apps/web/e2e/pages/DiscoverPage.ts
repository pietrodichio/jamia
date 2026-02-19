import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Discover page (/discover).
 * Handles event discovery, filtering, and search interactions.
 */
export class DiscoverPage {
  readonly page: Page;

  // Locators
  readonly pageTitle: Locator;
  readonly eventCards: Locator;
  readonly loadingSkeletons: Locator;
  readonly errorState: Locator;
  readonly retryButton: Locator;

  // Search bar (mobile drawer trigger)
  readonly mobileSearchTrigger: Locator;
  readonly mobileSearchDrawer: Locator;
  readonly keywordInput: Locator;

  // Filters
  readonly typeFilterButton: Locator;
  readonly tagFilterButton: Locator;
  readonly clearFiltersButton: Locator;

  // Empty state
  readonly emptyState: Locator;

  constructor(page: Page) {
    this.page = page;

    // Page structure
    this.pageTitle = page.getByRole('heading', { level: 1 });
    // Event cards are Card components with cursor-pointer (clickable cards in grid)
    // Each card contains event title, type badge, location, etc.
    this.eventCards = page.locator('.grid > div:has(.cursor-pointer)');
    this.loadingSkeletons = page.locator('.animate-pulse');
    this.errorState = page.getByText(/errore nel caricamento/i);
    this.retryButton = page.getByRole('button', { name: /riprova/i });

    // Mobile search - the drawer trigger button (has search icon and chevron)
    this.mobileSearchTrigger = page.locator('button').filter({ hasText: /cerca eventi/i });
    this.mobileSearchDrawer = page.locator('[role="dialog"]');
    this.keywordInput = page.getByPlaceholder(/cosa cerchi/i);

    // Filters - MultiSelect triggers
    this.typeFilterButton = page.getByRole('button', { name: /tipo di evento/i });
    this.tagFilterButton = page.getByRole('button', { name: /tag/i });
    this.clearFiltersButton = page.getByRole('button', { name: /cancella tutto/i });

    // Empty state
    this.emptyState = page.getByText(/nessun evento/i);
  }

  /**
   * Navigate to the discover page with location params.
   * Uses Rome coordinates with 500km radius to find all seeded Italian events.
   */
  async goto(): Promise<void> {
    // Navigate with location params to ensure events load
    // Rome coordinates, 500km radius covers all of Italy
    await this.page.goto('/discover?lat=41.9028&lng=12.4964&radius=500000');
  }

  /**
   * Navigate to discover page without location (for testing empty states).
   */
  async gotoWithoutLocation(): Promise<void> {
    await this.page.goto('/discover');
  }

  /**
   * Wait for events to load (skeletons disappear and cards appear).
   */
  async waitForEventsToLoad(): Promise<void> {
    // Wait for loading to finish (skeletons disappear)
    await this.loadingSkeletons.first().waitFor({ state: 'detached', timeout: 30_000 });

    // Wait for at least one event card OR empty state
    await Promise.race([
      this.eventCards.first().waitFor({ state: 'visible', timeout: 30_000 }),
      this.emptyState.waitFor({ state: 'visible', timeout: 30_000 }),
    ]);
  }

  /**
   * Get all visible event cards.
   */
  getEventCards(): Locator {
    return this.eventCards;
  }

  /**
   * Get the count of visible event cards.
   */
  async getEventCardCount(): Promise<number> {
    return await this.eventCards.count();
  }

  /**
   * Filter events by type using the MultiSelect.
   * @param type - Event type to filter by (jam, class, workshop, convention)
   */
  async filterByType(type: string): Promise<void> {
    // Click the type filter button to open dropdown
    await this.typeFilterButton.click();

    // Select the type from the dropdown
    // MultiSelect uses checkboxes with type labels
    const typeLabels: Record<string, string> = {
      jam: 'Jam',
      class: 'Lezione',
      workshop: 'Workshop',
      convention: 'Convention',
    };

    const label = typeLabels[type.toLowerCase()] || type;
    await this.page.getByRole('option', { name: label }).click();

    // Close dropdown by clicking outside
    await this.page.keyboard.press('Escape');

    // Wait for filtered results to load
    await this.page.waitForTimeout(500);
  }

  /**
   * Search events by keyword (mobile uses drawer).
   * @param keyword - Search term
   */
  async searchKeyword(keyword: string): Promise<void> {
    // On mobile, need to open the search drawer first
    const isMobile = await this.mobileSearchTrigger.isVisible();

    if (isMobile) {
      await this.mobileSearchTrigger.click();
      await this.mobileSearchDrawer.waitFor({ state: 'visible' });

      // Type in the drawer's keyword input
      const drawerKeywordInput = this.page.locator('[role="dialog"] input[type="search"]');
      await drawerKeywordInput.fill(keyword);

      // Click search button
      await this.page.getByRole('button', { name: /cerca/i }).click();
    } else {
      // Desktop: directly type in search input
      const desktopSearchInput = this.page.locator('input[type="search"]').first();
      await desktopSearchInput.fill(keyword);
    }

    // Wait for search results to update
    await this.page.waitForTimeout(500);
  }

  /**
   * Clear all active filters.
   */
  async clearFilters(): Promise<void> {
    if (await this.clearFiltersButton.isVisible()) {
      await this.clearFiltersButton.click();
      await this.page.waitForTimeout(500);
    }
  }

  /**
   * Check if an event with the given title is visible.
   * @param title - Event title to search for
   */
  async hasEventWithTitle(title: string): Promise<boolean> {
    const eventWithTitle = this.page.getByText(title, { exact: false });
    return await eventWithTitle.isVisible();
  }

  /**
   * Click on an event card to navigate to its details.
   * @param index - Index of the event card (0-based)
   */
  async clickEventCard(index: number = 0): Promise<void> {
    await this.eventCards.nth(index).click();
  }
}
