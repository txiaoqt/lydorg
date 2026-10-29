#!/usr/bin/env node
/**
 * Read-only preflight for Y-TRACE synthetic Storage validation.
 *
 * This script never reads .env files and never mutates Supabase. Run it only
 * with the dedicated staging service-role key in the process environment.
 */
import { createClient } from "@supabase/supabase-js";

const STAGING_REF = "zroudsvpswqsjlyttkjf";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const PRODUCTION_REF = "mqqaykksadotbrghbexz";
const EXPECTED_BUCKETS = new Map([
  ["organization-documents", false],
  ["budget-request-files", false],
  ["liquidation-report-files", false],
  ["ypop-files", false],
  ["move-files", false],
  ["template-files", false],
  ["news-release-images", true],
  ["brand-logo", true],
  ["registration-seed-file", true],
  ["transparency-attachments", true],
]);
const ZERO_BASELINE_TABLES = [
  "organization_profiles",
  "admin_accounts",
  "budget_requests",
  "liquidation_reports",
];

function fail(message) {
  console.error(`BLOCKED: ${message}`);
  process.exit(1);
}

const url = process.env.YTRACE_STAGING_SUPABASE_URL;
const ref = process.env.YTRACE_STAGING_PROJECT_REF;
const serviceRoleKey = process.env.YTRACE_STAGING_SERVICE_ROLE_KEY;
if (!url || !ref || !serviceRoleKey) {
  fail("Set YTRACE_STAGING_SUPABASE_URL, YTRACE_STAGING_PROJECT_REF, and YTRACE_STAGING_SERVICE_ROLE_KEY in this terminal. The script does not load .env files.");
}
if (ref === PRODUCTION_REF || ref !== STAGING_REF || url.replace(/\/$/, "") !== STAGING_URL) {
  fail("Target must match the exact ytrace-staging URL and project reference. No request was made.");
}

const client = createClient(STAGING_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { headers: { "X-Client-Info": "ytrace-staging-preflight/1.0" } },
});

async function countAuthUsers() {
  let page = 1;
  let total = 0;
  const perPage = 200;
  while (true) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error("Could not read Auth user count.");
    const users = data?.users ?? [];
    total += users.length;
    if (users.length < perPage) return total;
    page += 1;
  }
}

async function countObjects(bucket) {
  let count = 0;
  let visitedPrefixes = 0;
  const pending = [""];
  while (pending.length) {
    const prefix = pending.pop();
    if (prefix.split("/").filter(Boolean).length > 20 || ++visitedPrefixes > 1000) {
      throw new Error(`Object inventory bound exceeded in ${bucket}.`);
    }
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await client.storage.from(bucket).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Could not inventory Storage bucket ${bucket}.`);
      const entries = data ?? [];
      for (const entry of entries) {
        const child = prefix ? `${prefix}/${entry.name}` : entry.name;
        const isFolder = entry.id == null && entry.metadata == null;
        if (isFolder) pending.push(child);
        else if (++count > 10_000) throw new Error(`Object inventory bound exceeded in ${bucket}.`);
      }
      if (entries.length < 100) break;
    }
  }
  return count;
}

async function countPublicRows(table) {
  const endpoint = `${STAGING_URL}/rest/v1/${table}?select=id`;
  const response = await fetch(endpoint, {
    method: "HEAD",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!response.ok) throw new Error(`Could not read baseline row count for ${table}.`);
  const match = response.headers.get("content-range")?.match(/\/(\d+)$/);
  if (!match) throw new Error(`No exact row count returned for ${table}.`);
  return Number(match[1]);
}

try {
  const { data: buckets, error: bucketError } = await client.storage.listBuckets();
  if (bucketError) throw new Error("Could not list staging Storage buckets.");
  const actual = new Map((buckets ?? []).map((bucket) => [bucket.name, bucket]));
  const bucketResults = [];
  for (const [name, expectedPublic] of EXPECTED_BUCKETS) {
    const bucket = actual.get(name);
    if (!bucket) {
      bucketResults.push({ name, result: "MISSING" });
      continue;
    }
    const settingsMatch = bucket.public === expectedPublic &&
      (bucket.fileSizeLimit == null) && (bucket.allowedMimeTypes == null);
    const objects = await countObjects(name);
    bucketResults.push({ name, result: settingsMatch ? "OK" : "SETTINGS_MISMATCH", public: bucket.public, objects });
  }

  const unexpectedBuckets = [...actual.keys()].filter((name) => !EXPECTED_BUCKETS.has(name));
  const authUsers = await countAuthUsers();
  const baselineCounts = {};
  for (const table of ZERO_BASELINE_TABLES) baselineCounts[table] = await countPublicRows(table);

  console.log(`Target: ${STAGING_REF} (verified exact staging endpoint)`);
  console.log(`Expected buckets: ${EXPECTED_BUCKETS.size}; actual buckets: ${actual.size}`);
  console.table(bucketResults);
  console.log(`Unexpected buckets: ${unexpectedBuckets.length}`);
  console.log(`Auth users: ${authUsers}`);
  console.log("Application baseline row counts:", baselineCounts);
  console.log("Read-only preflight only: policies, migration history, and Edge Function status require the separate authorized SQL/control-plane review.");

  const bucketsPass = actual.size === EXPECTED_BUCKETS.size && bucketResults.every((row) => row.result === "OK" && row.objects === 0) && unexpectedBuckets.length === 0;
  const cleanBaseline = authUsers === 0 && Object.values(baselineCounts).every((count) => count === 0);
  if (!bucketsPass || !cleanBaseline) process.exitCode = 2;
} catch {
  // SDK/HTTP errors are deliberately not printed; they can contain request details.
  fail("A staging preflight request failed. Check project access and retry; no values or credentials were logged.");
}
