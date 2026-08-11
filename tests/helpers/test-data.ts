/**
 * Y-TRACE Authentication Module Test Data Configuration
 * Uses environment variables with safe defaults.
 */

export const TEST_CONFIG = {
  baseUrl: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173',
  validEmail: process.env.TEST_AUTH_EMAIL || 'testorg@gmail.com',
  validPassword: process.env.TEST_AUTH_PASSWORD || 'Test@1234',
  invalidPassword: 'WrongPass!99',
  invalidEmailFormat: 'testorgexample.com',
  unregisteredEmail: 'unregistered999@gmail.com',
  existingUrn: process.env.TEST_EXISTING_URN || 'PCYDO-AB12-CD34',
  invalidUrn: 'INVALID-URN',
  usedUrn: 'PCYDO-AB12-CD34',
  validOrgName: 'Kapitolyo Youth Council',
  validContactNumber: '09123456789',
  validDistrict: 'District I',
  validBarangay: 'Kapitolyo',
  facebookUrl: 'https://facebook.com/KapitolyoYouth',
  newPassword: 'NewSecure@789',
  shortPassword: 'Ab1!',
};
