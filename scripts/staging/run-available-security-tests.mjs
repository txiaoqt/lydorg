#!/usr/bin/env node
/** Executes independent real tests; unavailable organization parents stay BLOCKED. */
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { REF, MARKER, URL, client, requireEnv, verifyTarget, loadState, saveState, ok, attempt, record,
  persistReport, signInActor, adminLogin, revokeAdmin, syntheticPdf, hash, guardedFetch, setContext, evidence } from './synthetic-validation-common.mjs';

verifyTarget();
const state = await loadState();
const service = client(requireEnv('YTRACE_STAGING_SERVICE_ROLE_KEY'));
const anonymous = client();
const sessions = [];
let superLogin, reviewerLogin;
async function insert(c, table, payload) { return ok(c.from(table).insert(payload).select('*').single()); }
async function rpc(name, params) { return ok(superLogin.c.rpc(name, { _session_token: superLogin.token, ...params })); }
async function gateway(body, token = superLogin.token) {
  return ok(superLogin.c.functions.invoke('admin-storage-access', { body: { ...body, sessionToken: token } }));
}
async function test(check, actor, fn) {
  setContext(actor, check); const cursor = evidence.length;
  try { record(check, await fn() ? 'PASS' : 'FAIL', { http: evidence.slice(cursor) }); }
  catch { record(check, 'BLOCKED', { reason: 'Transport or fixture prerequisite failure; no assertion inferred', http: evidence.slice(cursor) }); }
}
async function download(c, ref) {
  const r = await c.storage.from(ref.bucket).download(ref.path);
  return !r.error && r.data && hash(Buffer.from(await r.data.arrayBuffer())) === ref.sha256;
}
async function createPublicAssets() {
  if (state.assetsStarted) throw new Error('Asset initialization was already attempted; no automatic retry');
  state.assetsStarted = true; await saveState(state);
  await attempt('Create active synthetic template using Admin metadata and gateway upload workflows', 'Super Admin', async () => {
    const rows = await rpc('create_admin_template_document', { _name: 'SYNTHETIC Storage Security Validation Template', _description: 'Fictional staging test only',
      _template_description: 'Small synthetic PDF. Do not use as a real form.', _template_scope: 'other' });
    state.templateId = rows[0].id; await saveState(state);
    const grant = await gateway({ action: 'upload', bucket: 'template-files', resourceId: state.templateId, fileName: 'SYNTHETIC-template.pdf' });
    const bytes = syntheticPdf('PUBLIC TEMPLATE');
    await ok(anonymous.storage.from('template-files').uploadToSignedUrl(grant.path, grant.token, bytes, { contentType: 'application/pdf' }));
    state.template = { bucket: 'template-files', path: grant.path, sha256: hash(bytes) }; await saveState(state);
    await rpc('update_admin_template_file_url', { _template_id: state.templateId, _template_url: `storage://template-files/${grant.path}` });
    return true;
  });
  await attempt('Create published synthetic news image using Admin gateway and normal metadata RPC', 'Super Admin', async () => {
    const grant = await gateway({ action: 'upload', bucket: 'news-release-images', fileName: 'SYNTHETIC-news-pixel.png' });
    const bytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jC1sAAAAASUVORK5CYII=', 'base64');
    await ok(anonymous.storage.from('news-release-images').uploadToSignedUrl(grant.path, grant.token, bytes, { contentType: 'image/png' }));
    state.newsImage = { bucket: 'news-release-images', path: grant.path, sha256: hash(bytes) }; await saveState(state);
    const rows = await rpc('create_admin_news_release', { _title: 'SYNTHETIC Storage Security Validation News', _description: 'Fictional staging test only; one-pixel test image.',
      _facebook_post_url: 'https://example.invalid/ytrace-staging', _preview_image_url: `storage://news-release-images/${grant.path}`,
      _date_posted: new Date().toISOString().slice(0, 10), _visibility_status: 'published', _category: null });
    state.newsId = rows[0].id; await saveState(state); return true;
  });
}
async function createReviewer() {
  if (state.reviewer) throw new Error('Reviewer provisioning was already attempted; no automatic retry');
  state.reviewer = { username: 'staging-no-permissions', email: 'ytrace-staging-no-permissions@example.invalid', password: randomBytes(36).toString('base64url') };
  await saveState(state);
  const role = await ok(service.from('roles').select('id,code,permission_codes').eq('code', 'organization_user').single());
  if (role.permission_codes.length !== 0) throw new Error('Expected unchanged existing zero-permission role');
  const rows = await rpc('create_admin_account', { _display_name: 'SYNTHETIC No Permissions Admin', _email: state.reviewer.email,
    _username: state.reviewer.username, _role_id: role.id, _unit_id: null });
  state.reviewer.adminId = rows[0].id; await saveState(state);
  const auth = await ok(service.auth.admin.createUser({ email: state.reviewer.email, password: state.reviewer.password, email_confirm: true,
    app_metadata: { ytrace_security_fixture: MARKER, ytrace_fixture_actor: 'no-permissions-admin-activation' } }));
  state.reviewer.userId = auth.user.id; await saveState(state);
  const c = await signInActor(state.reviewer, 'Synthetic no-permissions Admin activation');
  try {
    const activated = await ok(c.rpc('set_initial_admin_password', { _new_password: state.reviewer.password }));
    if (activated[0]?.id !== state.reviewer.adminId) throw new Error('Expected exact synthetic reviewer activation');
  } finally { await c.auth.signOut({ scope: 'global' }); }
  reviewerLogin = await adminLogin(state.reviewer.username, state.reviewer.password); sessions.push(reviewerLogin);
  const context = await ok(reviewerLogin.c.rpc('get_admin_permission_context', { _session_token: reviewerLogin.token }));
  if (context[0]?.permission_codes?.length !== 0) throw new Error('Expected zero-permission genuine Admin session');
  return true;
}

try {
  superLogin = await adminLogin('staging-super-admin', requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD')); sessions.push(superLogin);
  if (!state.workflowBlocker) throw new Error('Expected reviewed workflow blocker before independent test path');
  for (const [label, actor] of Object.entries(state.actors)) {
    await attempt(`${label}: genuine staging Auth JWT and account identity`, `${label} JWT`, async () => {
      const c = await signInActor(actor, label); await c.auth.signOut({ scope: 'global' }); return true;
    });
  }
  await createPublicAssets();
  await attempt('Provision genuine no-permissions Admin through existing account creation and activation RPCs', 'Super Admin / privileged Auth fixture setup', createReviewer);
  const revoked = await adminLogin('staging-super-admin', requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD')); sessions.push(revoked);
  await revokeAdmin(revoked);
  const expired = await adminLogin('staging-super-admin', requireEnv('YTRACE_STAGING_BOOTSTRAP_PASSWORD')); sessions.push(expired);
  await attempt('Shorten only a genuine synthetic test session expiry (privileged fixture setup)', 'Privileged fixture setup', async () => {
    const rows = await ok(service.from('admin_sessions').update({ expires_at: new Date(Date.now() - 60000).toISOString() })
      .eq('admin_id', expired.adminId).eq('token_hash', hash(expired.token)).is('revoked_at', null).select('id'));
    if (rows.length !== 1) throw new Error('Expected exact genuine test session'); return true;
  });
  for (const [label, login] of [['revoked', revoked], ['expired', expired]]) {
    await test(`${label}: normal session validator denies test session`, 'Admin session RPC', async () => {
      const r = await login.c.rpc('validate_admin_session_token', { _session_token: login.token });
      return !r.error && Array.isArray(r.data) && r.data.length === 0;
    });
  }
  const env = { ...process.env, YTRACE_STAGING_ADMIN_TOKEN_VALID: superLogin.token,
    YTRACE_STAGING_ADMIN_TOKEN_REVOKED: revoked.token, YTRACE_STAGING_ADMIN_TOKEN_EXPIRED: expired.token,
    YTRACE_STAGING_ADMIN_TOKEN_INVALID: 'explicitly-invalid-test-token-' + randomBytes(20).toString('hex') };
  if (reviewerLogin) env.YTRACE_STAGING_ADMIN_TOKEN_UNAUTHORIZED = reviewerLogin.token;
  const cases = [];
  for (const [kind, ref] of [['template', state.template], ['news', state.newsImage]]) {
    if (!ref) { record(`${kind}: signing and content tests`, 'BLOCKED', { reason: 'Asset fixture initialization failed' }); continue; }
    cases.push({ label: `Authorized Admin signs ${kind}; downloaded hash matches`, tokenEnv: 'YTRACE_STAGING_ADMIN_TOKEN_VALID', ...ref, expected: 'allow' });
    for (const suffix of ['INVALID', 'REVOKED', 'EXPIRED', ...(reviewerLogin ? ['UNAUTHORIZED'] : [])]) cases.push({
      label: `${suffix}: ${kind} gateway signing denied`, tokenEnv: `YTRACE_STAGING_ADMIN_TOKEN_${suffix}`, ...ref, expected: 'deny' });
    await test(`Anonymous downloads published ${kind} with matching SHA-256`, 'Anonymous', () => download(anonymous, ref));
    if (kind === 'news') await test('Anonymous public news-image URL renders expected synthetic bytes', 'Anonymous public HTTP', async () => {
      const r = await guardedFetch(`${URL}/storage/v1/object/public/${ref.bucket}/${ref.path}`);
      return r.status === 200 && hash(Buffer.from(await r.arrayBuffer())) === ref.sha256;
    });
    const org = await signInActor(state.actors.A, 'A');
    for (const [label, c] of [['Anonymous', anonymous], ['Organization A JWT', org]]) {
      await test(`${label} cannot INSERT a ${kind} Storage object`, label, async () => {
        const r = await c.storage.from(ref.bucket).upload(`SYNTHETIC-unauthorized-${label.startsWith('Anonymous') ? 'anon' : 'org'}-${kind}.pdf`, syntheticPdf('UNAUTHORIZED WRITE MUST FAIL'), { contentType: 'application/pdf', upsert: false });
        return !!r.error && [400, 401, 403].includes(Number(r.error.statusCode ?? r.error.status));
      });
      await test(`${label} cannot UPDATE the published ${kind} object`, label, async () => {
        const r = await c.storage.from(ref.bucket).update(ref.path, syntheticPdf('UNAUTHORIZED REPLACE MUST FAIL'), { contentType: 'application/pdf' });
        return !!r.error && await download(anonymous, ref);
      });
      await test(`${label} cannot DELETE the published ${kind} object`, label, async () => {
        const r = await c.storage.from(ref.bucket).remove([ref.path]);
        return (r.error != null || r.data?.length === 0) && await download(anonymous, ref);
      });
    }
    await org.auth.signOut({ scope: 'global' });
    if (reviewerLogin) await test(`Genuine no-permissions Admin cannot request ${kind} upload grant`, 'No-permissions Admin', async () => {
      const r = await reviewerLogin.c.functions.invoke('admin-storage-access', { body: { action: 'upload', bucket: ref.bucket,
        resourceId: kind === 'template' ? state.templateId : null, fileName: 'SYNTHETIC-denied.pdf', sessionToken: reviewerLogin.token } });
      return !r.data?.token && Number(r.error?.context?.status) === 403;
    });
  }
  if (state.template) cases.push({ label: 'Valid Admin cannot sign an unbound arbitrary object', tokenEnv: 'YTRACE_STAGING_ADMIN_TOKEN_VALID',
    bucket: 'template-files', path: 'SYNTHETIC-unbound-object.pdf', expected: 'deny' });
  if (cases.length) {
    env.YTRACE_STAGING_ADMIN_STORAGE_CASES_JSON = JSON.stringify(cases);
    const child = spawnSync(process.execPath, ['scripts/staging/test-admin-storage-gateway.mjs'], { env, encoding: 'utf8', windowsHide: true });
    // This reviewed child prints only case labels, HTTP status/timing and totals.
    process.stdout.write(child.stdout ?? '');
    record('Previously prepared real gateway suite execution', child.status === 0 ? 'PASS' : 'FAIL', { exitCode: child.status });
  }
  for (const check of ['Org A/B own-file access and cross-organization isolation', 'Anonymous private organization-file denial',
    'Suspended organization Storage restrictions', 'Registration/renewal upload and lifecycle locks', 'Budget/liquidation/YPOP parent workflows and Storage tests',
    'Authorized Admin signing of private organization documents', 'Private synthetic document download content hashes']) {
    record(check, 'BLOCKED', { reason: state.workflowBlocker });
  }
} catch (error) {
  record('Independent validation prerequisite', 'BLOCKED', { reason: (await import('./synthetic-validation-common.mjs')).safeError(error).reason });
  process.exitCode = 2;
} finally {
  for (const login of sessions) await attempt('Revoke only this run’s custom Admin test session', 'Admin', async () => { await revokeAdmin(login); return true; });
  await persistReport('independent-tests');
}
