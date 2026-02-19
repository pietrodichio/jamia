import { test, expect, BOB_AUTH_STATE } from '../fixtures';

/**
 * Jam Participation E2E tests.
 *
 * Tests the jam details page and participation flow:
 * - Viewing jam details
 * - Joining a jam
 * - Cancelling participation
 *
 * Uses bob's auth state to avoid ownership conflicts.
 * Bob is a Flyer, not an owner of seeded jams.
 *
 * Seeded jams (from seed.sql):
 * - 30000000-0000-0000-0000-000000000001: "Jam Test Milano" - owned by Alice
 * - 30000000-0000-0000-0000-000000000002: "Jam Test Firenze" - owned by Charlie
 */

test.use({ storageState: BOB_AUTH_STATE });

// Known jam ID from seed.sql (owned by Alice, Bob can participate)
const TEST_JAM_ID = '30000000-0000-0000-0000-000000000001';
const TEST_JAM_NAME = 'Jam Test Milano';

test.describe('Jam Details', () => {
  test('can view jam details page', async ({ page }) => {
    // Navigate to the seeded jam
    await page.goto(`/jam/${TEST_JAM_ID}`);

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify jam title is visible
    await expect(page.getByText(TEST_JAM_NAME)).toBeVisible({ timeout: 15_000 });

    // Verify location is visible
    await expect(page.getByText(/centro sportivo xxv aprile|milano/i)).toBeVisible();

    // Verify some jam details are present (date, capacity info, etc.)
    // The jam header shows participant info
    await expect(page.locator('text=/\\d+ partecipant|capacit|persone/i')).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Jam Participation Flow', () => {
  test('can join a jam and then cancel participation', async ({ page }) => {
    // Navigate to the seeded jam (owned by Alice, Bob can join)
    await page.goto(`/jam/${TEST_JAM_ID}`);

    // Wait for the page to load fully
    await page.waitForLoadState('networkidle');

    // Wait for the jam details to render
    await expect(page.getByText(TEST_JAM_NAME)).toBeVisible({ timeout: 15_000 });

    // The booking section should show "Prenota il tuo posto" button
    // (Bob is authenticated and not the owner)
    const bookButton = page.getByRole('button', { name: /prenota il tuo posto/i });

    // Check if Bob is already a participant (from previous test run)
    const isAlreadyParticipant = await page.getByText(/sei iscritto a questa jam|sei in lista d'attesa/i).isVisible().catch(() => false);

    if (isAlreadyParticipant) {
      // Bob is already participating - cancel first to reset state
      const cancelButton = page.getByRole('button', { name: /annulla partecipazione/i });
      await cancelButton.click();

      // Confirm cancellation in dialog
      const confirmButton = page.getByRole('button', { name: /conferma/i });
      if (await confirmButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await confirmButton.click();
      }

      // Wait for cancellation to complete
      await expect(bookButton).toBeVisible({ timeout: 10_000 });
    }

    // Now join the jam
    await expect(bookButton).toBeVisible({ timeout: 10_000 });
    await bookButton.click();

    // Wait for the join request to complete
    // Should show participation confirmation banner
    await expect(
      page.getByText(/sei iscritto a questa jam|sei in lista d'attesa|prenotazione confermata/i)
    ).toBeVisible({ timeout: 15_000 });

    // Now cancel participation
    const cancelButton = page.getByRole('button', { name: /annulla partecipazione/i });
    await expect(cancelButton).toBeVisible({ timeout: 10_000 });
    await cancelButton.click();

    // Confirm cancellation in dialog
    // The dialog has "Conferma" and "Annulla" (as in cancel the dialog, not the participation)
    const confirmCancelButton = page.locator('[role="dialog"]').getByRole('button', { name: /conferma|annulla partecipazione/i }).first();
    if (await confirmCancelButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmCancelButton.click();
    }

    // Wait for cancellation to complete - booking button should reappear
    await expect(bookButton).toBeVisible({ timeout: 15_000 });

    // Verify toast message appeared (optional - may be transient)
    // Toast messages: "Prenotazione annullata"
  });

  test('shows correct state for authenticated non-owner user', async ({ page }) => {
    // Navigate to jam
    await page.goto(`/jam/${TEST_JAM_ID}`);

    // Wait for page load
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(TEST_JAM_NAME)).toBeVisible({ timeout: 15_000 });

    // Bob should see either the booking button OR the participation banner
    // (depends on current participation state)
    const hasBookButton = await page.getByRole('button', { name: /prenota il tuo posto/i }).isVisible().catch(() => false);
    const hasParticipationBanner = await page.getByText(/sei iscritto a questa jam|sei in lista d'attesa/i).isVisible().catch(() => false);

    // At least one should be visible for authenticated non-owner
    expect(hasBookButton || hasParticipationBanner).toBeTruthy();

    // Owner actions should NOT be visible (Edit, Delete buttons)
    const hasEditButton = await page.getByRole('button', { name: /modifica/i }).isVisible().catch(() => false);
    const hasDeleteButton = await page.getByRole('button', { name: /elimina/i }).isVisible().catch(() => false);

    // Bob is not the owner, so these should be hidden
    // Note: Some buttons might be in a dropdown menu, so we check the main visible buttons
    expect(hasEditButton).toBeFalsy();
    expect(hasDeleteButton).toBeFalsy();
  });
});
