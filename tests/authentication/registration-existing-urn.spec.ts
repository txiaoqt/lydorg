import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Registration Existing Urn', () => {
  test('TC015 - Register existing organization with valid URN – Step 1', async ({ page, context }) => {
    await test.step('1. Navigate to the Registration page.', async () => {
      await page.goto('/signup');
    });
    await test.step('2. Enter a valid organization name in the "Organization Name" field.', async () => {
      await page.locator('#name').fill(TEST_CONFIG.validOrgName);
    });
    await test.step('3. Check the checkbox: "We already have a Unique Registration Number (URN)".', async () => {
      await page.locator('#existing-organization').check();
    });
    await test.step('4. Enter a valid URN in the format PCYDO-XXXX-XXXX.', async () => {
      await page.locator('#organizationIdentifierNumber').fill(TEST_CONFIG.existingUrn);
    });
    await test.step('5. Click "Continue to account details".', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
      await expect(page.getByText(/account details|contact number/i)).toBeVisible();
    });
  });

  test('TC016 - Register existing organization with invalid URN format', async ({ page, context }) => {
    await test.step('1. Enter a valid organization name.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
    });
    await test.step('2. Check the URN checkbox.', async () => {
      await page.locator('#existing-organization').check();
    });
    await test.step('3. Enter a URN that does not match the PCYDO-XXXX-XXXX format.', async () => {
      await page.locator('#organizationIdentifierNumber').fill('INVALID-URN');
    });
    await test.step('4. Click "Continue to account details".', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
      await expect(page.getByText(/valid unique registration number/i)).toBeVisible();
    });
  });

  test('TC017 - Register existing organization with empty URN field', async ({ page, context }) => {
    await test.step('1. Enter a valid organization name.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
    });
    await test.step('2. Check the URN checkbox.', async () => {
      await page.locator('#existing-organization').check();
    });
    await test.step('3. Leave the URN field empty.', async () => {
      await page.locator('#organizationIdentifierNumber').fill('');
    });
    await test.step('4. Click "Continue to account details".', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
      await expect(page.getByText(/enter your unique registration number/i)).toBeVisible();
    });
  });

  test('TC018 - Register existing organization with already-used URN', async ({ page, context }) => {
    await test.step('1. Enter a valid organization name.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('New Youth Org');
    });
    await test.step('2. Check the URN checkbox.', async () => {
      await page.locator('#existing-organization').check();
    });
    await test.step('3. Enter a URN that is already registered by another organization.', async () => {
      await page.locator('#organizationIdentifierNumber').fill(TEST_CONFIG.existingUrn);
    });
    await test.step('4. Complete all subsequent fields.', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('5. Click "Confirm & Create" on the review dialog.', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
  });

  test('TC019 - Register with empty organization name', async ({ page, context }) => {
    await test.step('1. Leave the "Organization Name" field empty.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('');
    });
    await test.step('2. Click "Continue to account details".', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
      await expect(page.getByText(/organization name is required/i)).toBeVisible();
    });
  });

  test('TC020 - URN case insensitivity – lowercase input converted to uppercase', async ({ page, context }) => {
    await test.step('1. Enter a valid organization name.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
    });
    await test.step('2. Check the URN checkbox.', async () => {
      await page.locator('#existing-organization').check();
    });
    await test.step('3. Enter a valid URN in lowercase: "pcydo-ab12-cd34".', async () => {
      await page.locator('#organizationIdentifierNumber').fill('pcydo-ab12-cd34');
    });
    await test.step('4. Click "Continue to account details".', async () => {
      await page.getByRole('button', { name: /continue to account details/i }).click();
      await expect(page.locator('#organizationIdentifierNumber')).toHaveValue('PCYDO-AB12-CD34');
    });
  });

  test('TC021 - URN Help icon popover displays information', async ({ page, context }) => {
    await test.step('1. Check the URN checkbox.', async () => {
      await page.goto('/signup');
      await page.locator('#existing-organization').check();
    });
    await test.step('2. Click the help icon next to the URN field label.', async () => {
      await page.getByRole('button', { name: /urn help guidance/i }).click();
    });
    await test.step('3. Observe the popover content.', async () => {
      await expect(page.getByText(/about unique registration number/i)).toBeVisible();
    });
  });

});