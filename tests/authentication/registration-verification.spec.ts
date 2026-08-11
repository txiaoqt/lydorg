import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Registration Verification', () => {
  test('TC050 - Verification page displays after successful registration', async ({ page, context }) => {
    await test.step('1. Complete the registration form with all valid data.', async () => {
      await page.goto('/signup');
    });
    await test.step('2. Click "Confirm & Create" on the review dialog.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the page displayed after successful submission.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC051 - Enter valid 6-digit OTP code', async ({ page, context }) => {
    await test.step('1. Enter the correct 6-digit verification code in the OTP input slots.', async () => {
      await page.goto('/');
    });
    await test.step('2. Click "Verify and Continue".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC052 - Enter invalid OTP code', async ({ page, context }) => {
    await test.step('1. Enter an incorrect 6-digit OTP code.', async () => {
      await page.goto('/');
    });
    await test.step('2. Click "Verify and Continue".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC053 - Enter expired OTP code', async ({ page, context }) => {
    await test.step('1. Wait for the OTP code to expire.', async () => {
      await page.goto('/');
    });
    await test.step('2. Enter the expired 6-digit code.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Click "Verify and Continue".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC054 - Verify and Continue button disabled with incomplete OTP', async ({ page, context }) => {
    await test.step('1. Enter fewer than 6 digits in the OTP input.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the "Verify and Continue" button state.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC055 - Resend verification code', async ({ page, context }) => {
    await test.step('1. Click the "Send a new code" button.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the result.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC056 - Resend code cooldown prevents rapid resending', async ({ page, context }) => {
    await test.step('1. Click "Send a new code" to resend the code.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the button immediately after.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to click the button again during the countdown period.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC057 - Password field appears if verification page is refreshed', async ({ page, context }) => {
    await test.step('1. Complete registration and arrive at the verification page.', async () => {
      await page.goto('/signup');
    });
    await test.step('2. Refresh the browser page.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the form fields.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

});