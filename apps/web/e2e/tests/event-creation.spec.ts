import { test, expect } from '../fixtures';
import { CreateEventPage } from '../pages/CreateEventPage';

/**
 * Event Creation E2E Tests
 *
 * These tests verify the event creation wizard works correctly for:
 * - Jam events (4-step flow)
 * - Class events (5-step flow with teachers)
 * - Form validation
 *
 * Tests run authenticated as alice (storageState from playwright.config.ts).
 * Google Maps is mocked via fixtures to prevent third-party API failures.
 */

test.describe('Event Creation - Jam', () => {
  test('creates a jam event through full wizard', async ({ page }) => {
    const createEventPage = new CreateEventPage(page);

    // Step 1: Navigate to create event
    await createEventPage.goto();

    // Select Jam type
    await createEventPage.selectEventType('jam');

    // Fill basic info (title and location)
    await createEventPage.fillBasicInfo({
      title: 'Test Jam E2E',
      location: 'Parco della Musica, Roma',
    });

    // Advance to Step 2: Schedule
    await createEventPage.goToNextStep();

    // Fill schedule (select date and time)
    await createEventPage.fillSchedule({ startTime: '15:00' });

    // Advance to Step 3: Image
    await createEventPage.goToNextStep();

    // Skip image upload (optional)
    await createEventPage.skipImageStep();

    // Now on Step 4: Preview (for jam, this is the final step)
    // Verify title is shown in preview
    const previewTitle = await createEventPage.getPreviewTitle();
    expect(previewTitle).toBe('Test Jam E2E');

    // Submit the event
    await createEventPage.submitEvent();

    // Wait for navigation to event detail page
    await page.waitForURL(/\/events\/[a-f0-9-]+/);

    // Verify event detail page shows the event title
    const eventTitle = page.locator('h1');
    await expect(eventTitle).toContainText('Test Jam E2E');
  });
});

test.describe('Event Creation - Class', () => {
  test('creates a class event with teachers step', async ({ page }) => {
    const createEventPage = new CreateEventPage(page);

    // Step 1: Navigate to create event
    await createEventPage.goto();

    // Select Class type (this enables the teachers step)
    await createEventPage.selectEventType('class');

    // Fill basic info
    await createEventPage.fillBasicInfo({
      title: 'Test Class E2E',
      location: 'Studio Yoga Milano',
    });

    // Advance to Step 2: Schedule
    await createEventPage.goToNextStep();

    // Fill schedule
    await createEventPage.fillSchedule({ startTime: '18:00' });

    // Advance to Step 3: Image
    await createEventPage.goToNextStep();

    // Skip image upload
    await createEventPage.skipImageStep();

    // Step 4: Teachers (only for class/workshop/convention)
    // Verify we're on the teachers step by checking for the teachers heading
    const teachersHeading = page.getByRole('heading', { name: 'Insegnanti' });
    await expect(teachersHeading).toBeVisible();

    // Skip teachers (optional step)
    await createEventPage.skipTeachersStep();

    // Now on Step 5: Preview
    // Verify title is shown in preview
    const previewTitle = await createEventPage.getPreviewTitle();
    expect(previewTitle).toBe('Test Class E2E');

    // Submit the event
    await createEventPage.submitEvent();

    // Wait for navigation to event detail page
    await page.waitForURL(/\/events\/[a-f0-9-]+/);

    // Verify event detail page shows the event title
    const eventTitle = page.locator('h1');
    await expect(eventTitle).toContainText('Test Class E2E');
  });
});

test.describe('Event Creation - Validation', () => {
  test('shows validation error when title is empty', async ({ page }) => {
    const createEventPage = new CreateEventPage(page);

    // Navigate to create event
    await createEventPage.goto();

    // Select Jam type
    await createEventPage.selectEventType('jam');

    // DO NOT fill title - leave it empty
    // Fill only location
    await createEventPage.fillBasicInfo({
      title: '', // Empty title
      location: 'Roma',
    });

    // Try to advance to next step
    await createEventPage.goToNextStep();

    // The wizard should validate and show an error
    // It should NOT advance to the next step
    // Check that we're still on the same step by verifying the title field is visible
    await expect(createEventPage.titleInput).toBeVisible();

    // Check for validation error message
    // The form uses Zod validation which shows "Campo obbligatorio" or minLength message
    const hasError = await createEventPage.hasValidationError();

    // If hasValidationError doesn't find it, check for error text directly
    if (!hasError) {
      // Look for any error indication - could be aria-invalid or error text
      const titleInputInvalid = await createEventPage.titleInput.getAttribute('aria-invalid');
      expect(titleInputInvalid === 'true' || hasError).toBeTruthy();
    }
  });

  test('validates required fields before advancing steps', async ({ page }) => {
    const createEventPage = new CreateEventPage(page);

    // Navigate to create event
    await createEventPage.goto();

    // Without selecting event type, try to advance
    // The default type is 'jam', so we need to check if title validation works

    // Clear any default and try to proceed
    await createEventPage.titleInput.fill('');

    // Try to advance
    await createEventPage.goToNextStep();

    // Should stay on step 1 due to validation
    // The title field should still be visible
    await expect(createEventPage.titleInput).toBeVisible();
  });
});
