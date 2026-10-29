import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

// Only public static frontend resources. No browser state, Supabase HTTP calls,
// production account/session requests or Vercel credential access.
const origin = 'https://y-trace-admin.vercel.app';
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
async function get(path, limit) {
  if (!['/', '/admin/settings'].includes(path) && !/^\/assets\/[\w.-]+\.js$/.test(path)) throw Error('PUBLIC_PATH_NOT_ALLOWED');
  const response = await fetch(origin + path, { redirect: 'error', signal: AbortSignal.timeout(30000) });
  if (!response.ok || Number(response.headers.get('content-length')) > limit) throw Error('STATIC_RESPONSE_NOT_ALLOWED');
  const reader = response.body.getReader();
  const chunks = []; let length = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    length += value.length;
    if (length > limit) { await reader.cancel(); throw Error('STATIC_RESPONSE_LIMIT'); }
    chunks.push(Buffer.from(value));
  }
  return { bytes: Buffer.concat(chunks), headers: response.headers, status: response.status };
}
const evidence = { capturedAt: new Date().toISOString(), mode: 'public static GET only; bodies in memory; no decrypted provider environment values' };
try {
  const root = await get('/', 1000000);
  const nested = await get('/admin/settings', 1000000);
  const safeHeaderNames = ['content-security-policy', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'cross-origin-resource-policy', 'permissions-policy'];
  evidence.shell = { status: root.status, bytes: root.bytes.length, sha256: sha256(root.bytes), spaRoute: { status: nested.status, sameHTML: root.bytes.equals(nested.bytes) }, headers: Object.fromEntries(safeHeaderNames.map(k => [k, root.headers.get(k)])) };
  const assets = [...root.bytes.toString().matchAll(/<script\b[^>]*\bsrc="(\/assets\/[\w.-]+\.js)"/g)].map(m => m[1]);
  if (assets.length < 1 || assets.length > 4) throw Error('UNEXPECTED_SCRIPT_COUNT');
  evidence.scripts = [];
  for (const asset of assets) {
    const { bytes, status } = await get(asset, 20000000);
    const text = bytes.toString();
    const keys = [...new Set(text.match(/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g) ?? [])];
    let matchingAnon = 0, serviceRole = 0;
    for (const key of keys) {
      try {
        const claims = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString());
        if (claims.role === 'anon' && claims.ref === 'mqqaykksadotbrghbexz') matchingAnon++;
        if (claims.role === 'service_role') serviceRole++;
      } catch { /* no token or parse details in evidence */ }
    }
    evidence.scripts.push({ path: asset, status, bytes: bytes.length, sha256: sha256(bytes), productionOriginPresent: text.includes('https://mqqaykksadotbrghbexz.supabase.co'), stagingOriginPresent: text.includes('https://zroudsvpswqsjlyttkjf.supabase.co'), matchingPublicAnonJWTs: matchingAnon, serviceRoleJWTPresent: serviceRole > 0, secretKeyPatternPresent: /sb_secret_[A-Za-z0-9_-]{10,}/.test(text), gatewayNamePresent: text.includes('admin-storage-access') });
  }
  evidence.status = 'PASS';
} catch {
  evidence.status = 'BLOCKED'; evidence.reason = 'PUBLIC_STATIC_READ_OR_SHAPE_CHECK_FAILED';
}
const metadataPath = new URL('./provider-metadata.sanitized.json', import.meta.url);
const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
for (const key of ['adminProject', 'organizationProject']) if (metadata[key]?.evidence?.git) delete metadata[key].evidence.git.gitCredentialId;
await writeFile(metadataPath, JSON.stringify(metadata, null, 2) + '\n');
await writeFile(new URL('./public-build.sanitized.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(evidence, null, 2));
