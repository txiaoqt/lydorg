import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Registration New Urn', () => {
  test('TC022 - Register new organization with auto-generated URN – Step 1', async ({ page, context }) => {
    await test.step('1. Navigate to the Registration page.', async () => {
      await page.goto('/signup');
    });
    await test.step('2. Enter a valid organization name.', async () => {
      await page.locator('#name').fill('Bagong Araw Youth Association');
    });
    await test.step('3. Leave the URN checkbox unchecked.', async () => {
      await expect(page.locator('#existing-organization')).not.toBeChecked();
    });
    await test.step('4. Observe the information callout below the registration type section.', async () => {
      await expect(page.getByText(/A URN will be assigned to your organization/i)).toBeVisible();
    });
    await test.step('5. Click "Continue to account details".', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
  });

  test('TC023 - Verify auto-generated URN callout text is displayed when checkbox unchecked', async ({ page, context }) => {
    await test.step('1. Navigate to the Registration page.', async () => {
      await page.goto('/signup');
    });
    await test.step('2. Ensure the URN checkbox is unchecked.', async () => {
      await expect(page.locator('#existing-organization')).not.toBeChecked();
    });
    await test.step('3. Observe the information displayed in the registration type area.', async () => {
      await expect(page.getByText(/A URN will be assigned to your organization/i)).toBeVisible();
    });
  });

  test('TC024 - Toggle URN checkbox shows/hides appropriate fields', async ({ page, context }) => {
    await test.step('1. Initially leave the URN checkbox unchecked – observe the URN callout.', async () => {
      await page.goto('/signup');
      await expect(page.getByText(/A URN will be assigned to your organization/i)).toBeVisible();
    });
    await test.step('2. Check the URN checkbox – observe the URN input field appears.', async () => {
      await page.locator('#existing-organization').check();
      await expect(page.locator('#organizationIdentifierNumber')).toBeVisible();
    });
    await test.step('3. Uncheck the URN checkbox – observe the input field disappears and callout returns.', async () => {
      await page.locator('#existing-organization').uncheck();
      await expect(page.getByText(/A URN will be assigned to your organization/i)).toBeVisible();
    });
  });

});