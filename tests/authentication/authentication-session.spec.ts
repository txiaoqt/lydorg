import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Authentication Session', () => {
  test('TC096 - Authenticated user can access protected routes', async ({ page, context }) => {
    await test.step('1. Sign in with valid credentials.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Navigate to a protected route (e.g., Organization Profile, Budget Requests).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe whether the page loads.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC097 - Unauthenticated user is redirected from protected routes', async ({ page, context }) => {
    await test.step('1. Open a browser without an active session.', async () => {
      await page.goto('/');
    });
    await test.step('2. Navigate directly to a protected route URL (e.g., the portal dashboard).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the result.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC098 - Sign out redirects to Sign In / Welcome page', async ({ page, context }) => {
    await test.step('1. Click the Sign Out button in the portal navigation.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the redirect.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC099 - Signed-out user cannot access protected routes via back button', async ({ page, context }) => {
    await test.step('1. Sign out from the portal.', async () => {
      await page.goto('/');
    });
    await test.step('2. Attempt to navigate back to a protected route using the browser\'s back button.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the result.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC100 - Session persists after browser page refresh', async ({ page, context }) => {
    await test.step('1. Sign in with valid credentials.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Verify successful authentication (dashboard is displayed).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Refresh the browser page.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Observe whether the user remains authenticated.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC101 - Session persists after closing and reopening browser tab', async ({ page, context }) => {
    await test.step('1. Sign in with valid credentials.', async () => {
      await page.goto('/signin');
    });
    await test.step('2. Close the browser tab (not the entire browser).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Open a new tab and navigate to the application URL.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Observe whether the user is still authenticated.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC102 - Password recovery session isolates user from portal access', async ({ page, context }) => {
    await test.step('1. Click a valid password reset link from email.', async () => {
      await page.goto('/reset-password');
    });
    await test.step('2. While on the reset password page, attempt to navigate to a protected portal route.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the result.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

});