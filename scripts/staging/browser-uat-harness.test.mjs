import test from 'node:test';
import assert from 'node:assert/strict';
import { allowedRequest, endpoint, ORIGIN, sanitizeText } from './browser-uat-harness.mjs';
test('production, foreign projects, redirects and websocket hosts fail closed', () => {
  for (const u of ['https://mqqaykksadotbrghbexz.supabase.co/rest/v1/a', 'wss://mqqaykksadotbrghbexz.supabase.co/realtime/v1', 'https://other.supabase.co', 'https://zroudsvpswqsjlyttkjf.supabase.co.evil.invalid', 'http://zroudsvpswqsjlyttkjf.supabase.co']) assert.equal(allowedRequest(u), false);
});
test('read-only staging workflows and normal authentication remain accessible', () => {
  for (const [p, m] of [['/rest/v1/organization_profiles','GET'], ['/auth/v1/token','POST'], ['/auth/v1/logout','POST'], ['/rest/v1/rpc/authenticate_admin_account','POST'], ['/rest/v1/rpc/get_admin_permission_context','POST'], ['/storage/v1/object/sign/organization-documents/a','POST'], ['/functions/v1/admin-storage-access','POST']]) assert.equal(allowedRequest(ORIGIN+p,m),true);
});
test('business mutations and mail operations cannot run during browser UAT', () => {
  for (const p of ['/auth/v1/invite','/auth/v1/recover','/auth/v1/otp','/rest/v1/document_submission_files','/rest/v1/rpc/admin_approve_renewal','/rest/v1/rpc/admin_get_or_create_renewal_test_account','/rest/v1/rpc/user_replace_document_submission_file']) assert.equal(allowedRequest(ORIGIN+p,'POST'),false);
  assert.equal(allowedRequest(ORIGIN+'/storage/v1/object/organization-documents/a','DELETE'),false);
});
test('evidence removes signed URL queries and object paths',()=> {
  assert.equal(endpoint(ORIGIN+'/storage/v1/object/sign/private/a/b?token=secret'),'/storage/v1/object/sign/[redacted]');
});
test('only the built-in Chrome PDF extension may load internal viewer assets',()=> {
  assert.equal(allowedRequest('chrome-extension://mhjfbmdgcfjbbpaeojofohoefgiehjai/main.js'),true);
  assert.equal(allowedRequest('chrome-extension://other/main.js'),false);
  assert.equal(allowedRequest('chrome://resources/js/assert.js'),true);
  assert.equal(allowedRequest('chrome://settings/'),false);
});
test('UI-derived signed tokens and URLs are redacted before console evidence',()=> {
  const input='Preview token=eyJexample.payload.signature https://private.invalid/a?token=example';
  const output=sanitizeText(input);
  assert.equal(output.includes('eyJ'),false);
  assert.equal(output.includes('https://'),false);
  assert.equal(sanitizeText('contact user@example.invalid').includes('user@example.invalid'),false);
});
