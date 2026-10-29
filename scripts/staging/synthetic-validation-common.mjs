import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const REF = 'zroudsvpswqsjlyttkjf';
export const URL = `https://${REF}.supabase.co`;
export const MARKER = 'ytrace-storage-security-20261010-v1';
export const STATE = resolve('.ytrace-staging-fixtures.local');
const reportRun = process.env.YTRACE_STAGING_REPORT_RUN ?? '';
if (reportRun && !/^[a-z0-9-]{1,80}$/.test(reportRun)) throw new Error('Invalid staging report run label');
export const REPORT = resolve('docs/staging-validation/2026-10-10/real-storage-validation', reportRun);
export const evidence = [];
export const results = [];
let context = { actor: 'setup', step: 'preflight' };
const nativeFetch = globalThis.fetch.bind(globalThis);
export function setContext(actor, step) { context = { actor, step }; }
export function requireEnv(name) {
  if (!process.env[name]) throw new Error(`Missing ${name}`);
  return process.env[name];
}
export function verifyTarget() {
  if (requireEnv('YTRACE_STAGING_PROJECT_REF') !== REF || requireEnv('YTRACE_STAGING_SUPABASE_URL').replace(/\/$/, '') !== URL) {
    throw new Error('Exact staging target guard rejected configuration');
  }
}
export async function guardedFetch(input, init) {
  const u = new globalThis.URL(typeof input === 'string' ? input : input instanceof globalThis.URL ? input.href : input.url);
  if (u.origin !== URL) throw new Error('Non-staging network request blocked');
  const snapshot = { ...context };
  const started = Date.now();
  const response = await nativeFetch(input, { ...init, redirect: 'error' });
  // Exclude queries, object names, credentials, bodies, and bearer URLs.
  let endpoint = u.pathname;
  if (endpoint.startsWith('/storage/')) endpoint = endpoint.split('/').slice(0, 6).join('/');
  else endpoint = endpoint.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
  evidence.push({ ...snapshot, method: init?.method ?? input?.method ?? 'GET', endpoint,
    status: response.status, durationMs: Date.now() - started });
  return response;
}
export function client(key = requireEnv('YTRACE_STAGING_ANON_KEY')) {
  verifyTarget();
  return createClient(URL, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: guardedFetch } });
}
export const hash = bytes => createHash('sha256').update(bytes).digest('hex');
export function safeError(error) {
  const code = /^[a-z0-9_-]{1,40}$/i.test(error?.code ?? '') ? error.code : null;
  const message = String(error?.message ?? '');
  const reasons = ['Renewal window is not yet open', 'Organization must have verified profile', 'row-level security',
    'qualified YPOP validation', 'identity review', 'duplicate key', 'violates foreign key', 'violates check constraint',
    'column reference', 'does not exist', 'permission denied', 'invalid input value', 'Expected', 'Missing'];
  return { code, reason: reasons.find(reason => message.toLowerCase().includes(reason.toLowerCase())) ?? 'Sanitized operation failure' };
}
export function record(check, status, details = {}) {
  const row = { check, status, ...details };
  results.push(row);
  console.log(`${status}: ${check}${details.httpStatus != null ? ` (HTTP ${details.httpStatus})` : ''}`);
}
export async function attempt(check, actor, fn) {
  const start = evidence.length;
  setContext(actor, check);
  try {
    const value = await fn();
    record(check, 'PASS', { http: evidence.slice(start) });
    return value;
  } catch (error) {
    record(check, 'BLOCKED', { ...safeError(error), http: evidence.slice(start) });
    return null;
  }
}
export async function ok(promise) {
  const result = await promise;
  if (result.error) throw result.error;
  if (result.data == null) throw new Error('Expected response data');
  return result.data;
}
export async function loadState() {
  const state = JSON.parse(await readFile(STATE, 'utf8'));
  if (state.projectRef !== REF || state.marker !== MARKER) throw new Error('Fixture journal context mismatch');
  return state;
}
export async function saveState(state, create = false) {
  if (state.projectRef !== REF || state.marker !== MARKER) throw new Error('Fixture journal context mismatch');
  if (create) await writeFile(STATE, '', { flag: 'wx', mode: 0o600 });
  if (process.platform === 'win32') {
    // Native tools avoid inheriting incompatible PowerShell 5/7 module paths.
    const systemDirectory = resolve(requireEnv('SystemRoot'), 'System32');
    const who = spawnSync(resolve(systemDirectory, 'whoami.exe'), ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
    const sid = who.stdout?.match(/S-1-5-21-[0-9-]+/)?.[0];
    if (who.status !== 0 || !sid) throw new Error('Could not identify local credential-file owner');
    const secured = spawnSync(resolve(systemDirectory, 'icacls.exe'), [STATE, '/grant:r', `*${sid}:(F)`, '*S-1-5-18:(F)', '*S-1-5-32-544:(F)', '/inheritance:r'],
      { stdio: 'pipe', windowsHide: true });
    if (secured.status !== 0) throw new Error('Could not secure local fixture credential file');
  }
  await writeFile(STATE, JSON.stringify(state, null, 2), { mode: 0o600 });
}
export async function persistReport(name) {
  await mkdir(REPORT, { recursive: true });
  await writeFile(resolve(REPORT, `${name}.json`), JSON.stringify({ projectRef: REF, timestamp: new Date().toISOString(), results, evidence }, null, 2));
}
export async function signInActor(actor, label) {
  setContext(label, 'Normal Auth password login');
  const c = client();
  const data = await ok(c.auth.signInWithPassword({ email: actor.email, password: actor.password }));
  if (data.user?.id !== actor.userId || !data.session?.access_token) throw new Error('Expected recorded Auth identity');
  return c;
}
export async function adminLogin(username, password) {
  const c = client();
  const rows = await ok(c.rpc('authenticate_admin_account', { _username: username, _password: password }));
  if (!rows[0]?.session_token) throw new Error('Expected normal Admin login session');
  return { c, token: rows[0].session_token, adminId: rows[0].admin_id };
}
export async function revokeAdmin(login) {
  if (!login) return;
  const r = await login.c.rpc('revoke_admin_session_token', { _session_token: login.token });
  if (r.error) throw r.error;
}
export function syntheticPdf(label) {
  const text = `SYNTHETIC Y-TRACE STAGING SECURITY TEST ONLY - ${label}`.replace(/[()\\]/g, '_');
  const stream = `BT /F1 10 Tf 30 750 Td (${text}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`];
  let pdf = '%PDF-1.4\n'; const offsets = [0];
  for (let i = 0; i < objects.length; i++) { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf);
}
