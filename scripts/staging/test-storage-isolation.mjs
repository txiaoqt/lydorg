#!/usr/bin/env node
/** Real, read-only Organization A/B and anonymous checks against staging files. */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { guardedFetch, evidence, setContext, REPORT } from './synthetic-validation-common.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REF = "zroudsvpswqsjlyttkjf";
const URL = `https://${REF}.supabase.co`;
const PRODUCTION_REF = "mqqaykksadotbrghbexz";
const PRIVATE_BUCKETS = new Set([
  "organization-documents", "budget-request-files", "liquidation-report-files",
  "ypop-files", "move-files", "template-files",
]);

function stop(message) {
  console.error(`BLOCKED: ${message}`);
  process.exit(1);
}
function required(name) {
  const value = process.env[name];
  if (!value) stop(`Missing required process environment value: ${name}.`);
  return value;
}
function target() {
  const url = required("YTRACE_STAGING_SUPABASE_URL").replace(/\/$/, "");
  const ref = required("YTRACE_STAGING_PROJECT_REF");
  if (ref === PRODUCTION_REF || ref !== REF || url !== URL) stop("Refusing any target other than the exact isolated staging project.");
}
function parseRef(raw) {
  const match = /^storage:\/\/([a-z0-9-]+)\/(.+)$/.exec(raw ?? "");
  if (!match || !PRIVATE_BUCKETS.has(match[1])) throw new Error("invalid-reference");
  const path = match[2];
  if (path.length > 2048 || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error("invalid-reference");
  return { bucket: match[1], path };
}
function parseObjects(name) {
  let parsed;
  try { parsed = JSON.parse(required(name)); } catch { stop(`${name} must be valid JSON containing synthetic staging file references and SHA-256 hashes.`); }
  if (!Array.isArray(parsed) || parsed.length < 1 || parsed.length > 30) stop(`${name} must contain between 1 and 30 file references.`);
  return parsed.map((row) => {
    if (!row || typeof row.storageUri !== "string" || !/^[a-f0-9]{64}$/i.test(row.sha256 ?? "")) stop(`${name} entries need storageUri and a SHA-256 hash.`);
    try { return { ...parseRef(row.storageUri), sha256: row.sha256.toLowerCase() }; }
    catch { stop(`${name} contains a malformed or non-private storage URI.`); }
  });
}
async function readFile(client, ref) {
  const { data, error } = await client.storage.from(ref.bucket).download(ref.path);
  if (error || !data) return { allowed: false, status: Number(error?.statusCode ?? error?.status) || 0 };
  if (data.size > 10 * 1024 * 1024) return { allowed: true, hash: "oversize", status: 200 };
  const bytes = Buffer.from(await data.arrayBuffer());
  return { allowed: true, hash: createHash("sha256").update(bytes).digest("hex"), status: 200 };
}
const denialStatuses = new Set([400, 401, 403, 404]);
const accessDenied = (result) => !result.allowed && denialStatuses.has(result.status);
async function signAndVerify(client, ref, expectedHash) {
  const { data, error } = await client.storage.from(ref.bucket).createSignedUrl(ref.path, 60);
  if (error || !data?.signedUrl) return false;
  // Keep the bearer URL in memory only; do not print it or include it in errors.
  try {
    const response = await guardedFetch(data.signedUrl, { redirect: "error" });
    const declaredLength = Number(response.headers.get("content-length") ?? 0);
    if (!response.ok || declaredLength > 10 * 1024 * 1024) return false;
    const bytes = Buffer.from(await response.arrayBuffer());
    return bytes.length <= 10 * 1024 * 1024 && createHash("sha256").update(bytes).digest("hex") === expectedHash;
  } catch {
    return false;
  }
}

target();
const anonKey = required("YTRACE_STAGING_ANON_KEY");
const orgARefs = parseObjects("YTRACE_STAGING_ORG_A_OBJECTS_JSON");
const orgBRefs = parseObjects("YTRACE_STAGING_ORG_B_OBJECTS_JSON");
const common = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }, global: { fetch: guardedFetch } };
const anonymous = createClient(URL, anonKey, common);
const activeClients = [];
// Validate all inputs before opening either account's session.
const credentials = Object.fromEntries(['A', 'B'].map(suffix => [suffix, {
  email: required(`YTRACE_STAGING_ORG_${suffix}_EMAIL`),
  password: required(`YTRACE_STAGING_ORG_${suffix}_PASSWORD`),
}]));

async function signIn(suffix) {
  const { email, password } = credentials[suffix];
  const client = createClient(URL, anonKey, common);
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.user || !data.session?.access_token) throw new Error(`Organization ${suffix} could not obtain a staging Auth session.`);
  activeClients.push(client);
  return { client, userId: data.user.id };
}

try {
const orgA = await signIn("A");
const orgB = await signIn("B");
if (orgA.userId === orgB.userId) throw new Error("Organization A and B resolved to the same Auth identity.");
const results = [];
setContext('Organization JWT / anonymous', 'Prepared real Storage isolation suite');
let cursor = evidence.length;
let failed = false;
async function check(label, passed) {
  results.push({ check: label, result: passed ? "PASS" : "FAIL", http: evidence.slice(cursor) });
  cursor = evidence.length;
  if (!passed) failed = true;
}

for (const [ownerName, owner, otherName, other, refs] of [
  ["A", orgA, "B", orgB, orgARefs],
  ["B", orgB, "A", orgA, orgBRefs],
]) {
  for (const ref of refs) {
    const own = await readFile(owner.client, ref);
    await check(`Org ${ownerName} reads its synthetic ${ref.bucket} file`, own.allowed && own.hash === ref.sha256);
    await check(`Org ${ownerName} creates a valid signed URL for its synthetic ${ref.bucket} file`, await signAndVerify(owner.client, ref, ref.sha256));

    const crossRead = await readFile(other.client, ref);
    await check(`Org ${otherName} cannot read Org ${ownerName}'s ${ref.bucket} file`, accessDenied(crossRead));
    const crossSign = await other.client.storage.from(ref.bucket).createSignedUrl(ref.path, 60);
    const crossSignStatus = Number(crossSign.error?.statusCode ?? crossSign.error?.status) || 0;
    await check(`Org ${otherName} cannot sign Org ${ownerName}'s ${ref.bucket} file`, !crossSign.data?.signedUrl && denialStatuses.has(crossSignStatus));

    const anonRead = await readFile(anonymous, ref);
    await check(`Anonymous cannot read ${ownerName}'s ${ref.bucket} file`, accessDenied(anonRead));
    const anonSign = await anonymous.storage.from(ref.bucket).createSignedUrl(ref.path, 60);
    const anonSignStatus = Number(anonSign.error?.statusCode ?? anonSign.error?.status) || 0;
    await check(`Anonymous cannot sign ${ownerName}'s ${ref.bucket} file`, !anonSign.data?.signedUrl && denialStatuses.has(anonSignStatus));
  }
}

console.table(results.map(({ http, ...row }) => ({ ...row, http: http.map(r => r.status).join(',') })));
await mkdir(REPORT, { recursive: true });
await writeFile(resolve(REPORT, 'org-isolation.json'), JSON.stringify({ projectRef: REF, results, evidence }, null, 2));
console.log(`Checks: ${results.length}; failed: ${results.filter((row) => row.result === "FAIL").length}. Signed URLs and Auth tokens were not printed.`);
if (failed) process.exitCode = 2;
} finally {
  // Close only sessions opened by this read-only test, including partial login failure.
  for (const client of activeClients) {
    const { error } = await client.auth.signOut({ scope: 'local' });
    if (error) {
      console.error('BLOCKED: Could not close a Storage-isolation test Auth session.');
      process.exitCode = 2;
    }
  }
}
