import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Create Event wizard (/create-event).
 * Handles multi-step event creation flow for jams, classes, workshops, and conventions.
 *
 * Wizard structure:
 * - Step 1: Event type selection + basic info (title, description, location, tags)
 * - Step 2: Schedule (dates, times, price, external registration)
 * - Step 3: Image upload (optional)
 * - Step 4 (jam): Preview + Submit
 * - Step 4 (class/workshop/convention): Teachers selection
 * - Step 5 (class/workshop/convention): Preview + Submit
 */
export class CreateEventPage {
  readonly page: Page;

  // Navigation buttons (Italian labels from locale files)
  readonly nextButton: Locator;
  readonly prevButton: Locator;
  readonly publishButton: Locator;

  // Step 1: Event type selection
  readonly eventTypeSelect: Locator;

  // Step 1: Basic info fields
  readonly titleInput: Locator;
  readonly locationInput: Locator;

  // Step 2: Schedule fields
  readonly startDateButton: Locator;
  readonly startTimeInput: Locator;
  readonly endTimeInput: Locator;

  // Step 3: Image (optional)
  readonly uploadImageButton: Locator;

  // Step 4/5: Preview
  readonly previewTitle: Locator;

  constructor(page: Page) {
    this.page = page;

    // Navigation - using Italian text from common.json
    // "Avanti" = Next, "Indietro" = Back, "Pubblica" = Publish
    this.nextButton = page.getByRole('button', { name: 'Avanti' });
    this.prevButton = page.getByRole('button', { name: 'Indietro' });
    this.publishButton = page.getByRole('button', { name: 'Pubblica' });

    // Event type select - using label from events.json "Tipo di evento"
    this.eventTypeSelect = page.getByRole('combobox');

    // Basic info - using labels from events.json
    // "Titolo" = Title
    this.titleInput = page.getByLabel('Titolo');

    // Location input - using placeholder from LocationInput component
    // "Scrivi il luogo dell'evento"
    this.locationInput = page.getByPlaceholder("Scrivi il luogo dell'evento");

    // Schedule - DateTimePicker uses id="start-time" and id="start-date-button"
    this.startDateButton = page.locator('#start-date-button');
    this.startTimeInput = page.locator('#start-time');
    this.endTimeInput = page.locator('#end-time');

    // Image upload button
    this.uploadImageButton = page.getByRole('button', { name: /Carica immagine/i });

    // Preview - the title in preview step shows as h2
    this.previewTitle = page.locator('h2.text-2xl.font-bold');
  }

  /**
   * Navigate to the create event page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/create-event');
    // Wait for the wizard to be visible
    await this.page.waitForSelector('form');
  }

  /**
   * Select an event type from the dropdown.
   * Types: 'jam', 'class', 'workshop', 'convention'
   */
  async selectEventType(type: 'jam' | 'class' | 'workshop' | 'convention'): Promise<void> {
    // Map type to Italian label from events.json
    const typeLabels: Record<string, string> = {
      jam: 'Jam',
      class: 'Lezione',
      workshop: 'Workshop',
      convention: 'Convention',
    };

    await this.eventTypeSelect.click();
    await this.page.getByRole('option', { name: typeLabels[type] }).click();
  }

  /**
   * Fill basic event info on Step 1.
   * Since Google Maps is mocked, we just type a location string directly.
   */
  async fillBasicInfo(opts: { title: string; location?: string }): Promise<void> {
    await this.titleInput.fill(opts.title);

    if (opts.location) {
      await this.locationInput.fill(opts.location);
    }
  }

  /**
   * Fill schedule info on Step 2.
   * For simplicity, we fill only the time and let the date auto-fill logic use today's date.
   */
  async fillSchedule(opts: { startTime?: string }): Promise<void> {
    // Click the date button to open the calendar popover
    await this.startDateButton.click();

    // Wait for calendar to appear and select a date (click today or a future date)
    // The calendar shows the current month, we'll click today's date or a visible date
    const calendar = this.page.locator('[role="grid"]');
    await calendar.waitFor({ state: 'visible' });

    // Get today's day number and click it (or next available)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayToSelect = tomorrow.getDate().toString();

    // Click on tomorrow's date button in the calendar
    await this.page.locator(`button[name="day"]`).filter({ hasText: new RegExp(`^${dayToSelect}$`) }).first().click();

    // Fill start time
    if (opts.startTime) {
      await this.startTimeInput.fill(opts.startTime);
    }
  }

  /**
   * Advance to the next step in the wizard.
   */
  async goToNextStep(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Go back to the previous step in the wizard.
   */
  async goToPreviousStep(): Promise<void> {
    await this.prevButton.click();
  }

  /**
   * Skip the image step by clicking next without uploading.
   * Image is optional.
   */
  async skipImageStep(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Skip the teachers step (for class/workshop/convention).
   * Teachers are optional.
   */
  async skipTeachersStep(): Promise<void> {
    await this.nextButton.click();
  }

  /**
   * Submit the event (click Publish on the preview step).
   */
  async submitEvent(): Promise<void> {
    await this.publishButton.click();
  }

  /**
   * Get the current step indicator text.
   * Returns the current step number from the wizard indicator.
   */
  async getCurrentStep(): Promise<string> {
    // The WizardStepIndicator shows step circles with numbers
    // Find the active step (has specific styling)
    const activeStep = this.page.locator('[data-state="active"]');
    if (await activeStep.count() > 0) {
      return await activeStep.textContent() || '';
    }
    // Fallback: return empty if not found
    return '';
  }

  /**
   * Get the preview title text.
   * Used to verify the event title is shown correctly in preview.
   */
  async getPreviewTitle(): Promise<string> {
    return await this.previewTitle.textContent() || '';
  }

  /**
   * Check if a validation error message is visible.
   */
  async hasValidationError(): Promise<boolean> {
    // React Hook Form shows errors with FormMessage component
    // These appear as text with destructive styling
    const errorMessages = this.page.locator('[data-slot="form-message"]');
    return (await errorMessages.count()) > 0;
  }

  /**
   * Get all visible validation error messages.
   */
  async getValidationErrors(): Promise<string[]> {
    const errorMessages = this.page.locator('p.text-destructive');
    const count = await errorMessages.count();
    const errors: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await errorMessages.nth(i).textContent();
      if (text) errors.push(text);
    }
    return errors;
  }
}
