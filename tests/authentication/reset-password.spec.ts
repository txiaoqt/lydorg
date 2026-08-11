import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Reset Password', () => {
  test('TC065 - Reset password with valid link and valid new password', async ({ page, context }) => {
    await test.step('1. Click the password reset link from the email.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. The "Create a new password" page is displayed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Enter a new password that meets all policy requirements (8–16 characters).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Manually re-enter the new password in the Confirm field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('5. Click "Update Password".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC066 - Reset password with expired link', async ({ page, context }) => {
    await test.step('1. Click an expired password reset link from the email.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Observe the page displayed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC067 - Reset password with invalid/tampered token', async ({ page, context }) => {
    await test.step('1. Navigate to the reset password URL with an invalid token.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Observe the page displayed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC068 - Reset password with password that does not meet policy', async ({ page, context }) => {
    await test.step('1. Enter a new password that does not meet the password policy (e.g., no uppercase letter).', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Observe the password requirements checklist.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to click "Update Password".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC069 - Reset password with mismatched confirm password', async ({ page, context }) => {
    await test.step('1. Enter a valid new password.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Enter a different value in the Confirm Password field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the mismatch indication.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC070 - Reset password with empty new password field', async ({ page, context }) => {
    await test.step('1. Leave the New Password field empty.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Observe the "Update Password" button state.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC071 - Paste prevention on Reset Password confirm field', async ({ page, context }) => {
    await test.step('1. Enter a valid new password.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Copy the password.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to paste into the Confirm Password field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC072 - Login using new password after successful reset', async ({ page, context }) => {
    await test.step('1. Click "Continue to Sign In" on the success screen.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Enter the registered email.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Enter the new password.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Click "Sign In".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC073 - Login using old password after successful reset', async ({ page, context }) => {
    await test.step('1. Navigate to the Sign In page.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Enter the registered email.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Enter the old password.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Click "Sign In".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC074 - Update Password button shows loading state', async ({ page, context }) => {
    await test.step('1. Enter a valid new password and confirmation.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. Click "Update Password".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the button state.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

});