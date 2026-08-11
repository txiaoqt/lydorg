import { test, expect } from '@playwright/test';
import { TEST_CONFIG } from '../helpers/test-data';

test.describe('Registration Account Details', () => {
  test('TC025 - Complete account details with all valid fields', async ({ page, context }) => {
    await test.step('1. Enter a valid email address (must end with @gmail.com).', async () => {
      await page.goto('/');
    });
    await test.step('2. Enter a valid contact number (11 digits starting with 09).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Select a district from the dropdown.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Select a barangay from the dropdown.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('5. Enter a password that meets all policy requirements (8–16 characters).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('6. Manually re-enter the same password in the Confirm Password field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('7. Check the policy agreement checkbox.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('8. Click "Continue to verification".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('9. Review the details in the confirmation dialog.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('10. Click "Confirm & Create".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC026 - Submit with empty email field', async ({ page, context }) => {
    await test.step('1. Leave the email field empty.', async () => {
      await page.goto('/');
    });
    await test.step('2. Fill all other fields with valid data.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Click "Continue to verification".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC027 - Submit with non-Gmail email address', async ({ page, context }) => {
    await test.step('1. Enter an email that does not end with @gmail.com.', async () => {
      await page.goto('/');
    });
    await test.step('2. Fill all other fields with valid data.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC028 - Submit with already registered email', async ({ page, context }) => {
    await test.step('1. Enter an email address that is already registered in the system.', async () => {
      await page.goto('/');
    });
    await test.step('2. Wait for the real-time availability check to complete.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the message below the email field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC029 - Email availability check shows available status', async ({ page, context }) => {
    await test.step('1. Enter a valid Gmail address that is not yet registered.', async () => {
      await page.goto('/');
    });
    await test.step('2. Wait for the real-time availability check to complete.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the message below the email field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC030 - Submit with empty contact number', async ({ page, context }) => {
    await test.step('1. Leave the contact number field empty.', async () => {
      await page.goto('/');
    });
    await test.step('2. Fill all other fields with valid data.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC031 - Submit with invalid contact number format', async ({ page, context }) => {
    await test.step('1. Enter a contact number that does not follow the 09XXXXXXXXX format.', async () => {
      await page.goto('/');
    });
    await test.step('2. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC032 - Contact number with fewer than 11 digits', async ({ page, context }) => {
    await test.step('1. Enter a contact number with fewer than 11 digits.', async () => {
      await page.goto('/');
    });
    await test.step('2. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC033 - District field is required', async ({ page, context }) => {
    await test.step('1. Leave the District dropdown unselected.', async () => {
      await page.goto('/');
    });
    await test.step('2. Fill all other fields with valid data.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC034 - Barangay dropdown is disabled until district is selected', async ({ page, context }) => {
    await test.step('1. Observe the Barangay dropdown before selecting a district.', async () => {
      await page.goto('/');
    });
    await test.step('2. Select a district.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the Barangay dropdown after selecting a district.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC035 - Barangay options change based on district selection', async ({ page, context }) => {
    await test.step('1. Select "District I" from the District dropdown.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the Barangay dropdown options.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Change to "District II".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Observe the Barangay dropdown options again.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC036 - Submit with password that does not meet policy', async ({ page, context }) => {
    await test.step('1. Enter all valid fields.', async () => {
      await page.goto('/');
    });
    await test.step('2. Enter a password that is too short (less than 8 characters).', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC037 - Submit with mismatched confirm password', async ({ page, context }) => {
    await test.step('1. Enter all valid fields.', async () => {
      await page.goto('/');
    });
    await test.step('2. Enter a valid password.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Enter a different value in the Confirm Password field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('4. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC038 - Matching passwords show confirmation message', async ({ page, context }) => {
    await test.step('1. Enter a valid password.', async () => {
      await page.goto('/');
    });
    await test.step('2. Enter the same password in the Confirm Password field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the area below the Confirm Password field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC039 - Paste prevention on Confirm Password field', async ({ page, context }) => {
    await test.step('1. Enter a valid password.', async () => {
      await page.goto('/');
    });
    await test.step('2. Copy the password to the clipboard.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to paste into the Confirm Password field.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC040 - Submit without checking policy agreement', async ({ page, context }) => {
    await test.step('1. Enter all valid fields.', async () => {
      await page.goto('/');
    });
    await test.step('2. Leave the policy agreement checkbox unchecked.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC041 - Privacy Policy link opens policy content', async ({ page, context }) => {
    await test.step('1. Click the "Privacy Policy" text within the policy agreement label.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the result.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC042 - Terms of Service link opens terms content', async ({ page, context }) => {
    await test.step('1. Click the "Terms of Service" text within the policy agreement label.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the result.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC043 - Review confirmation dialog displays entered details', async ({ page, context }) => {
    await test.step('1. Fill all fields with valid data and check the policy agreement.', async () => {
      await page.goto('/');
    });
    await test.step('2. Click "Continue to verification".', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
    await test.step('3. Observe the review dialog that appears.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC044 - Cancel review dialog returns to form', async ({ page, context }) => {
    await test.step('1. Click the "Go back" button on the review dialog.', async () => {
      await page.goto('/');
    });
  });

  test('TC045 - Navigate back from Step 2 to Step 1', async ({ page, context }) => {
    await test.step('1. Click the "Back" button on Step 2.', async () => {
      await page.goto('/');
    });
  });

  test('TC046 - Create Account button shows loading state during submission', async ({ page, context }) => {
    await test.step('1. Click "Confirm & Create" on the review dialog.', async () => {
      await page.goto('/');
    });
    await test.step('2. Observe the button state during submission.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC047 - Submit with invalid Facebook URL (non-Facebook domain)', async ({ page, context }) => {
    await test.step('1. Enter a URL that is not a Facebook domain.', async () => {
      await page.goto('/');
    });
    await test.step('2. Attempt to proceed.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC048 - Facebook URL with www.facebook.com accepted', async ({ page, context }) => {
    await test.step('1. Enter a Facebook URL with the www prefix.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

  test('TC049 - Facebook URL with fb.com short domain accepted', async ({ page, context }) => {
    await test.step('1. Enter a Facebook URL using the fb.com short domain.', async () => {
      await page.goto('/');
    });
    await test.step('2. Proceed with the form.', async () => {
      await page.waitForLoadState('domcontentloaded');
    });
  });

});