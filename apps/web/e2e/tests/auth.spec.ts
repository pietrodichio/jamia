import { test, expect } from '../fixtures';

/**
 * Authentication E2E tests.
 *
 * These tests run against local Supabase with seeded test users.
 * All tests start unauthenticated (empty storageState).
 */

// Start all auth tests unauthenticated
test.use({ storageState: { cookies: [], origins: [] } });

test.describe('Sign In', () => {
  test('signs in with valid credentials and redirects to dashboard', async ({ authPage, page }) => {
    await authPage.goto();

    // Sign in with seeded user
    await authPage.signIn('alice@example.com', 'password123');

    // Wait for successful sign in toast - this proves authentication succeeded
    await expect(page.getByText('Accesso effettuato!', { exact: true })).toBeVisible({ timeout: 15_000 });

    // After sign-in, user is redirected away from /auth
    // The URL changes from /auth to /dashboard (or possibly /profile-setup for first-time users)
    // We wait for navigation away from /auth
    await page.waitForURL((url) => !url.pathname.includes('/auth'), { timeout: 15_000 });

    // Verify we're on a protected route (dashboard, profile-setup, or email-confirmation)
    // This proves the sign-in flow worked and app is showing authenticated content
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|profile-setup|email-confirmation)/);
  });

  test('shows error for invalid credentials', async ({ authPage, page }) => {
    await authPage.goto();

    // Sign in with wrong password
    await authPage.signIn('alice@example.com', 'wrongpassword');

    // Supabase returns "Invalid login credentials" error
    // This appears in a toast notification (use first() to handle multiple matching elements)
    await expect(page.getByText('Invalid login credentials', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    // Should stay on auth page
    await expect(page).toHaveURL(/\/auth/);
  });

  test('shows error for non-existent email', async ({ authPage, page }) => {
    await authPage.goto();

    // Sign in with non-existent user
    await authPage.signIn('nonexistent@example.com', 'password123');

    // Supabase returns "Invalid login credentials" for non-existent users too
    await expect(page.getByText('Invalid login credentials', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    // Should stay on auth page
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Sign Up', () => {
  test('registers new user and shows confirmation page', async ({ authPage, page }) => {
    await authPage.goto();

    // Generate unique email
    const uniqueEmail = `test-${Date.now()}@example.com`;

    // Sign up using AuthPage POM
    await authPage.signUp('Test User', uniqueEmail, 'password123');

    // Wait for redirect to email confirmation page
    await expect(page).toHaveURL(/\/email-confirmation/, { timeout: 15_000 });

    // Verify confirmation page content
    await expect(page.getByRole('heading', { name: /Conferma la tua email/i })).toBeVisible();
  });

  test('shows error for existing email', async ({ authPage, page }) => {
    await authPage.goto();

    // Try to sign up with already registered email
    await authPage.signUp('Alice Duplicate', 'alice@example.com', 'password123');

    // Supabase returns "User already registered" error
    await expect(page.getByText('User already registered', { exact: true }).first()).toBeVisible({ timeout: 10_000 });

    // Should stay on auth page (not redirect to confirmation)
    await expect(page).toHaveURL(/\/auth/);
  });
});

test.describe('Route Protection', () => {
  test('redirects unauthenticated user from /dashboard to /auth', async ({ page }) => {
    // Navigate directly to protected route
    await page.goto('/dashboard');

    // Should redirect to auth page
    await expect(page).toHaveURL(/\/auth/, { timeout: 15_000 });

    // Auth page content should be visible
    await expect(page.getByRole('heading', { name: /Jamia/i })).toBeVisible();
  });
});
