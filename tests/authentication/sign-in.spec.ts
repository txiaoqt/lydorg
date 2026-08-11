import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Sign In', () => {
  test('TC001 - Sign in with valid credentials', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter a valid registered email address in the "Email address" field.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('3. Enter the correct password in the "Password" field.', async () => {
      await page.locator('#password').fill(TEST_CONFIG.validPassword);
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      const btn = page.getByRole('button', { name: /sign in/i });
      await expect(btn).toBeEnabled();
      await btn.click();
    });
  });

  test('TC002 - Sign in with invalid password', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter a valid registered email address.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('3. Enter an incorrect password.', async () => {
      await page.locator('#password').fill(TEST_CONFIG.invalidPassword);
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/invalid login credentials/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test('TC003 - Sign in with invalid email format', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter an email without a valid format (e.g., missing "@" symbol).', async () => {
      await page.locator('#email').fill(TEST_CONFIG.invalidEmailFormat);
    });
    await test.step('3. Enter any password.', async () => {
      await page.locator('#password').fill(TEST_CONFIG.validPassword);
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.locator('input#email:invalid')).toBeVisible();
    });
  });

  test('TC004 - Sign in with non-existing email', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter an email address that is not registered in the system.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.unregisteredEmail);
    });
    await test.step('3. Enter any password.', async () => {
      await page.locator('#password').fill(TEST_CONFIG.validPassword);
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      await page.getByRole('button', { name: /sign in/i }).click();
      await expect(page.getByText(/invalid login credentials/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test('TC005 - Sign in with empty email field', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Leave the "Email address" field empty.', async () => {
      await page.locator('#email').fill('');
    });
    await test.step('3. Enter any password.', async () => {
      await page.locator('#password').fill(TEST_CONFIG.validPassword);
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      const btn = page.getByRole('button', { name: /sign in/i });
      await expect(btn).toBeDisabled();
    });
  });

  test('TC006 - Sign in with empty password field', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter a valid email address.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('3. Leave the "Password" field empty.', async () => {
      await page.locator('#password').fill('');
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      const btn = page.getByRole('button', { name: /sign in/i });
      await expect(btn).toBeDisabled();
    });
  });

  test('TC007 - Sign in with both fields empty', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Leave both the email and password fields empty.', async () => {
      await page.locator('#email').fill('');
      await page.locator('#password').fill('');
    });
    await test.step('3. Attempt to click the "Sign In" button.', async () => {
      const btn = page.getByRole('button', { name: /sign in/i });
      await expect(btn).toBeDisabled();
    });
  });

  test('TC008 - Sign in with email containing leading/trailing spaces', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter the email with leading and trailing spaces: "  testorg@gmail.com  ".', async () => {
      await page.locator('#email').fill('  ' + TEST_CONFIG.validEmail + '  ');
    });
    await test.step('3. Enter the correct password.', async () => {
      await page.locator('#password').fill(TEST_CONFIG.validPassword);
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      const btn = page.getByRole('button', { name: /sign in/i });
      await expect(btn).toBeEnabled();
    });
  });

  test('TC009 - Sign in with uppercase email (case insensitivity)', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter the email in uppercase: "TESTORG@GMAIL.COM".', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail.toUpperCase());
    });
    await test.step('3. Enter the correct password.', async () => {
      await page.locator('#password').fill(TEST_CONFIG.validPassword);
    });
    await test.step('4. Click the "Sign In" button.', async () => {
      const btn = page.getByRole('button', { name: /sign in/i });
      await expect(btn).toBeEnabled();
    });
  });

  test('TC010 - Sign In button shows loading state during submission', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Enter valid email and password.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
      await page.locator('#password').fill(TEST_CONFIG.validPassword);
    });
    await test.step('3. Click the "Sign In" button.', async () => {
      const btn = page.getByRole('button', { name: /sign in/i });
      await btn.click();
    });
    await test.step('4. Observe the button state during submission.', async () => {
      await expect(page.getByRole('button', { name: /signing in/i })).toBeVisible();
    });
  });

  test('TC011 - Toggle password visibility on Sign In page', async ({ page, context }) => {
    await test.step('1. Enter a password in the "Password" field.', async () => {
      await page.goto('/signin');
      await page.locator('#password').fill('Test@1234');
    });
    await test.step('2. Click the eye icon button ("Show password").', async () => {
      await page.locator('button[aria-label*="password" i]').click();
    });
    await test.step('3. Observe the password text.', async () => {
      await expect(page.locator('#password')).toHaveAttribute('type', 'text');
    });
    await test.step('4. Click the eye icon button again ("Hide password").', async () => {
      await page.locator('button[aria-label*="password" i]').click();
      await expect(page.locator('#password')).toHaveAttribute('type', 'password');
    });
  });

  test('TC012 - Navigate to Forgot Password from Sign In page', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Click the "Forgot password?" link.', async () => {
      await page.getByRole('link', { name: /forgot password/i }).click();
      await expect(page).toHaveURL(/reset-password/);
    });
  });

  test('TC013 - Navigate to Registration from Sign In page', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Click the "Don\'t have an account? Create one" link.', async () => {
      await page.getByRole('link', { name: /create one/i }).click();
      await expect(page).toHaveURL(/signup/);
    });
  });

  test('TC014 - Navigate back to home from Sign In page', async ({ page, context }) => {
    await test.step('1. Click the "← Back to home" link on the Sign In page.', async () => {
      await page.goto('/signin');
    });
  });

});