// Local UAT only: no production network, business mutations, traces, or credential logs.
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const STAGING = 'zroudsvpswqsjlyttkjf';
export const ORIGIN = `https://${STAGING}.supabase.co`;
export function sanitizeText(value) {
  return String(value).replace(/https?:\/\/\S+/g, '[REDACTED_URL]')
    .replace(/(?:token=)?eyJ[A-Za-z0-9_.-]+/g, '[REDACTED_TOKEN]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]')
    .replace(/\b[A-Za-z0-9_-]{80,}(?:\.[A-Za-z0-9_-]+)*/g, '[REDACTED_LONG_VALUE]');
}
export function allowedRequest(raw, method = 'GET') {
  const u = new URL(raw);
  // Chrome's built-in PDF viewer assets are internal, not network egress.
  if (u.protocol === 'chrome-extension:' && u.hostname === 'mhjfbmdgcfjbbpaeojofohoefgiehjai') return method === 'GET';
  if (u.protocol === 'chrome:' && u.hostname === 'resources') return method === 'GET';
  if (['127.0.0.1', 'localhost'].includes(u.hostname)) return ['http:', 'https:', 'ws:', 'wss:'].includes(u.protocol);
  if (u.hostname !== `${STAGING}.supabase.co` || !['https:', 'wss:'].includes(u.protocol)) return false;
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (method !== 'POST') return false;
  if (/^\/auth\/v1\/(token|logout)$/.test(u.pathname)) return true;
  if (u.pathname.startsWith('/storage/v1/object/sign/')) return true;
  if (u.pathname === '/functions/v1/admin-storage-access') return true;
  if (!u.pathname.startsWith('/rest/v1/rpc/')) return false;
  const rpc = u.pathname.split('/').pop();
  if (['authenticate_admin_account', 'revoke_admin_session_token', 'admin_refresh_session'].includes(rpc)) return true;
  return /^(get_|list_|fetch_|load_|validate_|check_|resolve_|user_get_|admin_get_|public_|is_|can_)/.test(rpc)
    && !/(or_create|ensure|prepare|reset|restore|seed|delete|approve|update|set_|record_)/.test(rpc);
}
export function endpoint(raw) {
  const u = new URL(raw);
  return u.pathname.startsWith('/storage/') ? u.pathname.split('/').slice(0, 5).join('/') + '/[redacted]'
    : u.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27,}/gi, ':id');
}
export async function openHarness(root, browser, base = 'http://127.0.0.1:4173', options = {}) {
  const env = {};
  for (const line of (await readFile(resolve(root, '.env.staging.local'), 'utf8')).split(/\r?\n/)) {
    const m = line.match(/^\s*(YTRACE_STAGING_[A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  if (env.YTRACE_STAGING_PROJECT_REF !== STAGING || env.YTRACE_STAGING_SUPABASE_URL?.replace(/\/$/, '') !== ORIGIN) throw Error('Staging configuration mismatch');
  const fixtures = JSON.parse(await readFile(resolve(root, '.ytrace-staging-fixtures.local'), 'utf8'));
  const orgC = JSON.parse(await readFile(resolve(root, '.ytrace-org-c-registration-revision.local'), 'utf8'));
  if (fixtures.projectRef !== STAGING || orgC.projectRef !== STAGING) throw Error('Fixture project mismatch');
  const audit = options.audit ?? { projectRef: STAGING, startedAt: new Date().toISOString(), browserVersion: browser?.version?.() ?? 'unknown', checks: [], http: [], blocked: [], errors: [], console: { error: 0, warning: 0, sanitizedSamples: [] }, websockets: [] };
  const h = { env, fixtures, orgC, audit, phase: 'setup', browser };
  const context = options.context ?? await browser.newContext({ viewport: { width: 1365, height: 900 }, serviceWorkers: options.serviceWorkers ?? 'block', acceptDownloads: true });
  h.context = context;
  await context.route('**/*', async route => {
    const req = route.request();
    if (options.allowServiceWorkerProbe && req.url() === options.allowServiceWorkerProbe) return route.continue();
    if (allowedRequest(req.url(), req.method())) return route.continue();
    audit.blocked.push({ phase: h.phase, endpoint: endpoint(req.url()), method: req.method(), production: new URL(req.url()).hostname.includes('mqqaykksadotbrghbexz') });
    return route.abort();
  });
  await context.routeWebSocket('**/*', ws => {
    if (allowedRequest(ws.url())) { audit.websockets.push({ phase: h.phase, staging: new URL(ws.url()).hostname === `${STAGING}.supabase.co` }); ws.connectToServer(); }
    else { audit.blocked.push({ phase: h.phase, websocket: true, production: new URL(ws.url()).hostname.includes('mqqaykksadotbrghbexz') }); ws.close(); }
  });
  context.on('response', r => {
    if (new URL(r.url()).hostname === `${STAGING}.supabase.co`) audit.http.push({ phase: h.phase, method: r.request().method(), endpoint: endpoint(r.url()), status: r.status() });
  });
  context.on('page', p => {
    p.on('pageerror', e => audit.errors.push({ phase: h.phase, name: e.name, message: sanitizeText(e.message).slice(0, 180) }));
    p.on('console', m => {
      if (m.type() === 'error') audit.console.error++;
      if (m.type() === 'warning') audit.console.warning++;
      if ((m.type() === 'error' || m.type() === 'warning') && audit.console.sanitizedSamples.length < 12) {
        audit.console.sanitizedSamples.push({ phase: h.phase, type: m.type(), message: sanitizeText(m.text()).slice(0, 180) });
      }
    });
  });
  h.page = options.page ?? context.pages()[0] ?? await context.newPage();
  h.go = async route => { await h.page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 60000 }); await h.page.waitForTimeout(1400); };
  h.mark = (name, status, details = {}) => { audit.checks.push({ name, status, ...details }); };
  h.save = async () => {
    const dir = resolve(root, 'docs/staging-validation/2026-10-11/final-browser-uat');
    await mkdir(dir, { recursive: true });
    const label = audit.runLabel ?? 'browser-evidence';
    if (!/^[a-z0-9-]{1,60}$/.test(label)) throw Error('Invalid evidence label');
    await writeFile(resolve(dir, label + '.json'), JSON.stringify(audit, null, 2), { flag: 'wx' });
  };
  return h;
}
