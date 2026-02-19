import type { Page, Locator } from '@playwright/test';

/**
 * Page Object Model for the Auth page (/auth).
 * Handles login, signup, and password reset interactions.
 */
export class AuthPage {
  readonly page: Page;

  // Locators
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly signupLink: Locator;
  readonly nameInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly registerButton: Locator;
  readonly loginLink: Locator;

  constructor(page: Page) {
    this.page = page;

    // Email input is the same for login and signup
    this.emailInput = page.getByLabel('Email');

    // Password input - use exact match to distinguish from confirm
    this.passwordInput = page.getByLabel('Password', { exact: true });

    // Login mode elements
    this.loginButton = page.getByRole('button', { name: /Accedi/i });
    this.signupLink = page.getByText(/Non hai un account\?/i);

    // Signup mode elements
    this.nameInput = page.getByLabel(/Nome/i);
    this.confirmPasswordInput = page.getByLabel(/Conferma Password/i);
    this.registerButton = page.getByRole('button', { name: /Registrati/i });
    this.loginLink = page.getByText(/Hai già un account\?/i);
  }

  /**
   * Navigate to the auth page.
   */
  async goto(): Promise<void> {
    await this.page.goto('/auth');
  }

  /**
   * Sign in with email and password.
   */
  async signIn(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * Sign up with name, email, and password.
   */
  async signUp(name: string, email: string, password: string): Promise<void> {
    // Switch to signup mode
    await this.signupLink.click();

    // Fill signup form
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(password);

    // Submit
    await this.registerButton.click();
  }
}
