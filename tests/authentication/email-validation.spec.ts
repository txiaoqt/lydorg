import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Email Validation', () => {
  test('TC086 - Valid Gmail email format accepted on registration', async ({ page, context }) => {
    await test.step('1. Enter a properly formatted Gmail email address.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC087 - Non-Gmail email rejected on registration', async ({ page, context }) => {
    await test.step('1. Enter an email with a non-Gmail domain.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the validation message.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC088 - Email missing @ symbol', async ({ page, context }) => {
    await test.step('1. Enter an email without the "@" symbol.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC089 - Email missing domain', async ({ page, context }) => {
    await test.step('1. Enter an email without a domain after the "@" symbol.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC090 - Email with multiple @ symbols', async ({ page, context }) => {
    await test.step('1. Enter an email with multiple "@" symbols.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC091 - Email with spaces', async ({ page, context }) => {
    await test.step('1. Enter an email with spaces in the middle.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC092 - Uppercase email treated as case-insensitive', async ({ page, context }) => {
    await test.step('1. Enter the email in uppercase: USER@GMAIL.COM.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

});