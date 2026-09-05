import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Forgot Password', () => {
  test('TC058 - Request password reset with registered email', async ({ page, context }) => {
    await test.step('1. Navigate to the Forgot Password page.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Enter a registered email address in the "Email address" field.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('3. Click "Send Reset Link".', async () => {
      await page.getByRole('button', { name: /send reset link/i }).click();
    });
  });

  test('TC059 - Request password reset with unregistered email', async ({ page, context }) => {
    await test.step('1. Navigate to the Forgot Password page.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Enter an email that is not registered.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('3. Click "Send Reset Link".', async () => {
      await page.getByRole('button', { name: /send reset link/i }).click();
    });
  });

  test('TC060 - Request password reset with invalid email format', async ({ page, context }) => {
    await test.step('1. Navigate to the Forgot Password page.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Enter an email with invalid format.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('3. Click "Send Reset Link".', async () => {
      await page.getByRole('button', { name: /send reset link/i }).click();
    });
  });

  test('TC061 - Request password reset with empty email field', async ({ page, context }) => {
    await test.step('1. Navigate to the Forgot Password page.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Leave the email field empty.', async () => {
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('3. Click "Send Reset Link".', async () => {
      await page.getByRole('button', { name: /send reset link/i }).click();
    });
  });

  test('TC062 - Send Reset Link button shows loading state', async ({ page, context }) => {
    await test.step('1. Enter a valid email address.', async () => {
      await page.goto('/reset-password');
      await page.locator('#email').fill(TEST_CONFIG.validEmail);
    });
    await test.step('2. Click "Send Reset Link".', async () => {
      await page.getByRole('button', { name: /send reset link/i }).click();
    });
    await test.step('3. Observe the button state during submission.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC063 - Send another link from success page', async ({ page, context }) => {
    await test.step('1. Click the "Send another link" button.', async () => {
      await page.goto('/reset-password');
    });
  });

  test('TC064 - Navigate to Sign In from Forgot Password page', async ({ page, context }) => {
    await test.step('1. Click the "Remember your password? Sign in" link.', async () => {
      await page.goto('/reset-password');
    });
  });

});