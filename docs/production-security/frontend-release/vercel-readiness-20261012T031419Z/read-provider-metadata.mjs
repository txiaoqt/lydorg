import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';

// Read-only provider evidence. The official CLI owns authentication; this script
// never opens credential files and never persists raw provider responses.
const team = 'toffs-projects-81b2ce10';
const adminId = 'prj_J36xqAUQELX8NttCaFFInsxcCEaI';
const userId = 'prj_ywvIWJbULZOdCMtrt6JPcMqguA2N';
const deploymentId = 'dpl_3xkY2hTr9ght98vNXqrjZTtrEPCQ';
const hash = value => createHash('sha256').update(value).digest('hex');
const pick = (value, keys) => Object.fromEntries(keys.filter(k => value?.[k] !== undefined).map(k => [k, value[k]]));
const settingKeys = ['framework', 'nodeVersion', 'rootDirectory', 'outputDirectory'];
function settings(p) {
  const result = pick(p, settingKeys);
  for (const k of ['buildCommand', 'installCommand', 'devCommand', 'commandForIgnoringBuildStep']) {
    if (p?.[k] === undefined) continue;
    const value = p[k];
    result[k] = value === null || ['npm run build', 'npm install', 'npm ci', 'npm run dev'].includes(value)
      ? value : { nonstandardCommand: true, sha256: hash(String(value)) };
  }
  return result;
}
function project(p) {
  return {
    ...pick(p, ['id', 'name', 'accountId', 'createdAt', 'updatedAt', 'gitForkProtection', 'gitComments', 'autoAssignCustomDomains', 'autoExposeSystemEnvs', 'gitDeploymentEnabled']),
    settings: settings(p),
    git: pick(p.link, ['type', 'org', 'repo', 'repoId', 'productionBranch', 'createdAt', 'updatedAt']),
    productionTarget: p.targets?.production ? deployment(p.targets.production) : null,
    deployHookCount: Array.isArray(p.link?.deployHooks) ? p.link.deployHooks.length : null,
    environmentNamesInProjectResponse: Array.isArray(p.env) ? p.env.map(e => e.key).sort() : [],
    functionConfigPresent: p.functions !== undefined,
    routeConfigPresent: p.routes !== undefined,
  };
}
function safeRoutes(routes) {
  if (!Array.isArray(routes)) return null;
  return routes.map(r => ({
    ...pick(r, ['src', 'handle', 'status', 'continue', 'check', 'override', 'methods']),
    destination: typeof r.dest === 'string' && !r.dest.includes('?') && !r.dest.includes('#') ? r.dest : undefined,
    headerNames: Object.keys(r.headers ?? {}).sort(),
    csp: r.headers?.['Content-Security-Policy'] ?? r.headers?.['content-security-policy'],
  }));
}
function deployment(p) {
  return {
    ...pick(p, ['id', 'name', 'url', 'readyState', 'status', 'target', 'source', 'createdAt', 'ready', 'buildingAt', 'projectId', 'teamId', 'version', 'aliasAssigned', 'aliasFinal', 'isRollbackCandidate', 'isInConcurrentBuildsQueue', 'regions', 'deploymentHostname']),
    alias: p.alias,
    sourceIdentity: pick(p.meta, ['githubCommitSha', 'githubCommitRef', 'githubRepo', 'githubOrg', 'githubDeployment', 'gitCommitSha', 'gitCommitRef']),
    projectSettings: settings(p.projectSettings),
    builds: Array.isArray(p.builds) ? p.builds.map(b => pick(b, ['src', 'use', 'runtime', 'readyState'])) : null,
    functions: p.functions ? Object.entries(p.functions).map(([path, cfg]) => ({ path, ...pick(cfg, ['runtime', 'memory', 'maxDuration', 'regions']) })) : null,
    routes: safeRoutes(p.routes),
    routeCount: Array.isArray(p.routes) ? p.routes.length : null,
  };
}
function publicValueCheck(e) {
  if (!e.target?.includes('production')) return undefined;
  if (!['VITE_DEPLOY_SURFACE', 'VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PUBLISHABLE_KEY'].includes(e.key)) return undefined;
  // decrypt=false. Encrypted/sensitive values remain unverified, never decrypted.
  if (!['plain', 'system'].includes(e.type)) return { valueVerification: 'NOT VERIFIED (not requested in plaintext)' };
  const value = String(e.value ?? '');
  if (e.key === 'VITE_DEPLOY_SURFACE') return { matchesAdmin: value === 'admin' };
  if (e.key === 'VITE_SUPABASE_URL') return { matchesProductionOrigin: value === 'https://mqqaykksadotbrghbexz.supabase.co' };
  if (value.startsWith('sb_publishable_')) return { keyClass: 'publishable', projectBinding: 'NOT VERIFIED from key alone' };
  try {
    const claims = JSON.parse(Buffer.from(value.split('.')[1], 'base64url').toString());
    return { keyClass: claims.role === 'anon' ? 'anon JWT' : 'UNEXPECTED', matchesProductionProject: claims.ref === 'mqqaykksadotbrghbexz' };
  } catch { return { keyClass: 'NOT VERIFIED' }; }
}
function environments(p) {
  return {
    variables: (p.envs ?? []).map(e => ({
      ...pick(e, ['key', 'type', 'target', 'gitBranch', 'createdAt', 'updatedAt']),
      publicValueCheck: publicValueCheck(e),
    })).sort((a, b) => a.key.localeCompare(b.key)),
    pagination: pick(p.pagination, ['count', 'next', 'prev']),
  };
}
function domains(p) {
  return { domains: (p.domains ?? []).map(d => pick(d, ['name', 'apexName', 'projectId', 'gitBranch', 'redirect', 'redirectStatusCode', 'verified', 'createdAt', 'updatedAt'])), pagination: pick(p.pagination, ['count', 'next']) };
}
function read(endpoint) {
  if (!/^\/v(?:9\/projects|10\/projects|13\/deployments)\//.test(endpoint)) throw Error('READ_ENDPOINT_NOT_ALLOWLISTED');
  const command = `& 'C:\\Program Files\\nodejs\\npm.cmd' exec --yes --package=vercel@63.1.2 --registry=https://registry.npmjs.org -- vercel api '${endpoint}' --method GET --raw --scope ${team} --no-color`;
  return new Promise(resolve => {
    const child = spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', command], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '', oversized = false;
    const timeout = setTimeout(() => child.kill(), 90000);
    child.stdout.on('data', c => { if (out.length + c.length > 10_000_000) { oversized = true; child.kill(); } else out += c; });
    child.stderr.on('data', c => { if (err.length < 10000) err += c; });
    child.on('error', () => { clearTimeout(timeout); resolve({ status: 'BLOCKED', reason: 'CLI_PROCESS_UNAVAILABLE' }); });
    child.on('close', code => {
      clearTimeout(timeout);
      if (code !== 0 || oversized) return resolve({ status: 'BLOCKED', reason: oversized ? 'RESPONSE_LIMIT' : 'CLI_READ_FAILED', exitCode: code, authenticationRequired: /login|credentials|unauthoriz/i.test(err) });
      try { resolve({ status: 'PASS', raw: JSON.parse(out) }); }
      catch { resolve({ status: 'BLOCKED', reason: 'CLI_RESPONSE_NOT_JSON' }); }
      out = ''; err = '';
    });
  });
}
const requests = [
  ['adminProject', `/v9/projects/${adminId}`, project],
  ['organizationProject', `/v9/projects/${userId}`, project],
  ['productionDeployment', `/v13/deployments/${deploymentId}`, deployment],
  ['productionEnvironmentMetadata', `/v10/projects/${adminId}/env?decrypt=false`, environments],
  ['adminDomains', `/v9/projects/${adminId}/domains`, domains],
];
const evidence = { capturedAt: new Date().toISOString(), mode: 'GET only; official CLI 63.1.2; decrypt=false; whitelist output; no raw response persistence' };
const results = await Promise.allSettled(requests.map(async ([label, path, sanitize]) => {
  const result = await read(path);
  return [label, result.status === 'PASS' ? { status: 'PASS', evidence: sanitize(result.raw) } : result];
}));
for (let i = 0; i < results.length; i++) {
  const result = results[i];
  if (result.status === 'fulfilled') evidence[result.value[0]] = result.value[1];
  else evidence[requests[i][0]] = { status: 'BLOCKED', reason: 'SANITIZER_FAILED' };
}
await writeFile(new URL('./provider-metadata.sanitized.json', import.meta.url), JSON.stringify(evidence, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify(evidence, null, 2));
