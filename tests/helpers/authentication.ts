import { Page, expect } from '@playwright/test';

export async function navigateToSignIn(page: Page) {
  await page.goto('/signin');
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
}

export async function navigateToSignUp(page: Page) {
  await page.goto('/signup');
  await expect(page.getByRole('heading', { name: /create organization account/i })).toBeVisible();
}

export async function navigateToForgotPassword(page: Page) {
  await page.goto('/reset-password');
}

export async function fillSignInForm(page: Page, email: string, pass: string) {
  if (email) {
    await page.getByLabel(/email address/i).fill(email);
  }
  if (pass) {
    await page.getByLabel(/password/i).fill(pass);
  }
}
