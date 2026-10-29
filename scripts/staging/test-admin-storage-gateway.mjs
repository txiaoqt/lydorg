#!/usr/bin/env node
/** Read-only signing checks against the deployed staging Admin Storage gateway. */
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import { guardedFetch, evidence, setContext, REPORT } from './synthetic-validation-common.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const REF = "zroudsvpswqsjlyttkjf";
const URL = `https://${REF}.supabase.co`;
const PRODUCTION_REF = "mqqaykksadotbrghbexz";
const BUCKETS = new Set([
  "organization-documents", "budget-request-files", "liquidation-report-files",
  "ypop-files", "move-files", "template-files", "news-release-images",
]);
function stop(message) { console.error(`BLOCKED: ${message}`); process.exit(1); }
function required(name) {
  if (!process.env[name]) stop(`Missing required process environment value: ${name}.`);
  return process.env[name];
}

const suppliedUrl = required("YTRACE_STAGING_SUPABASE_URL").replace(/\/$/, "");
const suppliedRef = required("YTRACE_STAGING_PROJECT_REF");
if (suppliedRef === PRODUCTION_REF || suppliedRef !== REF || suppliedUrl !== URL) {
  stop("Refusing any target other than the exact isolated staging project.");
}
const anonKey = required("YTRACE_STAGING_ANON_KEY");
let cases;
try { cases = JSON.parse(required("YTRACE_STAGING_ADMIN_STORAGE_CASES_JSON")); }
catch { stop("YTRACE_STAGING_ADMIN_STORAGE_CASES_JSON must contain sanitized gateway test case definitions."); }
if (!Array.isArray(cases) || !cases.length || cases.length > 50) stop("Supply between 1 and 50 gateway cases.");

for (const [index, testCase] of cases.entries()) {
  if (!testCase || typeof testCase.label !== "string" || testCase.label.length > 100 ||
      typeof testCase.tokenEnv !== "string" || !/^YTRACE_STAGING_ADMIN_TOKEN_[A-Z0-9_]+$/.test(testCase.tokenEnv) ||
      !process.env[testCase.tokenEnv] || !BUCKETS.has(testCase.bucket) ||
      typeof testCase.path !== "string" || !testCase.path || testCase.path.length > 2048 ||
      testCase.path.split("/").some((part) => part === ".." || part === ".") ||
      !["allow", "deny"].includes(testCase.expected) ||
      (testCase.resourceId != null && !/^[0-9a-f-]{36}$/i.test(testCase.resourceId)) ||
      (testCase.fileName != null && (typeof testCase.fileName !== "string" || testCase.fileName.length > 255)) ||
      (testCase.expected === "allow" && !/^[a-f0-9]{64}$/i.test(testCase.sha256 ?? ""))) {
    stop(`Gateway case ${index + 1} is incomplete or invalid.`);
  }
}

const client = createClient(URL, anonKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  global: { fetch: guardedFetch },
});
const results = [];
const denialStatuses = new Set([400, 401, 403, 404]);
for (const testCase of cases) {
  setContext('Admin gateway', testCase.label);
  const cursor = evidence.length;
  const startedAt = Date.now();
  const { data, error } = await client.functions.invoke("admin-storage-access", {
    body: {
      action: "sign",
      bucket: testCase.bucket,
      path: testCase.path,
      resourceId: testCase.resourceId ?? null,
      fileName: testCase.fileName ?? null,
      sessionToken: process.env[testCase.tokenEnv],
    },
  });
  const authorizationMs = Date.now() - startedAt;
  const hasSignedUrl = typeof data?.signedUrl === "string" && Boolean(data.signedUrl);
  const denialStatus = Number(error?.context?.status ?? error?.status) || 0;
  let passed = testCase.expected === "deny" ? !hasSignedUrl && denialStatuses.has(denialStatus) : false;
  let downloadMs = null;
  if (testCase.expected === "allow" && !error && hasSignedUrl) {
    const downloadStartedAt = Date.now();
    try {
      const response = await guardedFetch(data.signedUrl, { redirect: "error" });
      const declaredLength = Number(response.headers.get("content-length") ?? 0);
      if (declaredLength > 10 * 1024 * 1024) throw new Error("oversize");
      const bytes = Buffer.from(await response.arrayBuffer());
      downloadMs = Date.now() - downloadStartedAt;
      const digest = createHash("sha256").update(bytes).digest("hex");
      passed = response.ok && bytes.length <= 10 * 1024 * 1024 && digest === testCase.sha256.toLowerCase();
    } catch {
      passed = false;
    }
  }
  results.push({
    case: testCase.label,
    expected: testCase.expected,
    result: passed ? "PASS" : "FAIL",
    authorizationMs,
    downloadMs,
    http: evidence.slice(cursor),
  });
}

console.table(results.map(({ http, ...row }) => ({ ...row, http: http.map(r => r.status).join(',') })));
await mkdir(REPORT, { recursive: true });
await writeFile(resolve(REPORT, 'admin-signing.json'), JSON.stringify({ projectRef: REF, results, evidence }, null, 2));
console.log(`Cases: ${results.length}; failed: ${results.filter((row) => row.result === "FAIL").length}. Admin tokens and signed URLs were not printed.`);
if (results.some((row) => row.result === "FAIL")) process.exitCode = 2;
