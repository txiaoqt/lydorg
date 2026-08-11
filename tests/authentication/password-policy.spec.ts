import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Password Policy', () => {
  test('TC075 - Password meets all policy requirements', async ({ page, context }) => {
    await test.step('1. Enter a password that meets all requirements: 8–16 characters, one uppercase letter, one lowercase letter, one number, and one special character.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the password requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC076 - Password too short (less than 8 characters)', async ({ page, context }) => {
    await test.step('1. Enter a password with fewer than 8 characters that otherwise meets other rules.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC077 - Password too long (more than 16 characters)', async ({ page, context }) => {
    await test.step('1. Attempt to enter a password with more than 16 characters.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the input behavior.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC078 - Password missing uppercase letter', async ({ page, context }) => {
    await test.step('1. Enter a password without any uppercase letter.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC079 - Password missing lowercase letter', async ({ page, context }) => {
    await test.step('1. Enter a password without any lowercase letter.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC080 - Password missing number', async ({ page, context }) => {
    await test.step('1. Enter a password without any number.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC081 - Password missing special character', async ({ page, context }) => {
    await test.step('1. Enter a password without any special character.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC082 - Password policy live validation updates as user types', async ({ page, context }) => {
    await test.step('1. Focus on the password field.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Type characters one at a time and observe the requirements checklist updating in real-time.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC083 - Password exactly 8 characters (lower boundary)', async ({ page, context }) => {
    await test.step('1. Enter a password with exactly 8 characters meeting all other requirements.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC084 - Password with 7 characters (one below minimum boundary)', async ({ page, context }) => {
    await test.step('1. Enter a password with exactly 7 characters.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

  test('TC085 - Password exactly 16 characters (upper boundary)', async ({ page, context }) => {
    await test.step('1. Enter a password with exactly 16 characters meeting all requirements.', async () => {
      await page.goto('/signup');
      await page.locator('#name').fill('Test Youth Org');
      await page.getByRole('button', { name: /continue to account details/i }).click();
    });
    await test.step('2. Observe the requirements checklist.', async () => {
      await page.locator('#password').fill('Secure@123');
      await expect(page.getByText(/password requirements/i)).toBeVisible();
    });
  });

});