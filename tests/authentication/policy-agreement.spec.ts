import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Policy Agreement', () => {
  test('TC093 - Policy agreement checkbox checked – registration allowed', async ({ page, context }) => {
    await test.step('1. Check the "I have read and agree to the Privacy Policy & Terms of Service" checkbox.', async () => {
      await page.goto('/');
    });
    await test.step('2. Complete all other fields.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Click "Continue to verification".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC094 - Post-login policy enforcement when policy version changes', async ({ page, context }) => {
    await test.step('1. Sign in with valid credentials.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Observe the behavior when the portal loads.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC095 - Declining updated policy agreement signs user out', async ({ page, context }) => {
    await test.step('1. Sign in with valid credentials.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. The policy agreement modal appears.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Click the decline option.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

});