#!/usr/bin/env node
/**
 * Read-only preflight for the one-time Y-TRACE staging Super Admin activation.
 * The general synthetic-staging preflight remains strict about an empty
 * admin_accounts table; this separate check accepts only the one authorized
 * pending account and no Auth/session/business data.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { inspectBootstrapStatePaths } from "./bootstrap-initial-super-admin-state-paths.mjs";
import {
  assertBootstrapPreflightState,
  BOOTSTRAP_ZERO_BUSINESS_TABLES,
  inspectWindowsNodeProcessInventory,
} from "./bootstrap-initial-super-admin-safety.mjs";

const STAGING_REF = "zroudsvpswqsjlyttkjf";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const PRODUCTION_REF = "mqqaykksadotbrghbexz";
const ADMIN_USERNAME = "staging-super-admin";
const ADMIN_EMAIL = "ytrace-staging-super-admin@example.invalid";
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
function fail(message) {
  console.error(`BLOCKED: ${message}`);
  process.exit(1);
}

const url = process.env.YTRACE_STAGING_SUPABASE_URL;
const ref = process.env.YTRACE_STAGING_PROJECT_REF;
const serviceRoleKey = process.env.YTRACE_STAGING_SERVICE_ROLE_KEY;
if (!url || !ref || !serviceRoleKey) {
  fail("Set the staging URL, project reference, and service-role key in this process. No .env file is loaded by this script.");
}
if (ref === PRODUCTION_REF || ref !== STAGING_REF || url.replace(/\/$/, "") !== STAGING_URL) {
  fail("Target must match the exact ytrace-staging URL and project reference. No request was made.");
}

const bootstrapPathInspection = inspectBootstrapStatePaths();
if (!bootstrapPathInspection.safe) {
  fail("Independent staging bootstrap state paths exist or cannot be identified. No request was made.");
}
const BOOTSTRAP_STATE_DIR = bootstrapPathInspection.stateDirectory;

const service = createClient(STAGING_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { headers: { "X-Client-Info": "ytrace-staging-bootstrap-preflight/1.0" } },
});

async function listAuthUsers() {
  const users = [];
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error("Could not read the staging Auth inventory.");
    const batch = data?.users ?? [];
    users.push(...batch);
    if (batch.length < 200) return users;
  }
  throw new Error("Staging Auth inventory exceeded the safe read limit.");
}

async function countObjects(bucket) {
  let count = 0;
  let visitedPrefixes = 0;
  const pending = [""];
  while (pending.length) {
    const prefix = pending.pop();
    if (prefix.split("/").filter(Boolean).length > 20 || ++visitedPrefixes > 1000) {
      throw new Error("Storage object inventory exceeded the safe read limit.");
    }
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await service.storage.from(bucket).list(prefix, {
        limit: 100,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error("Could not read the staging Storage object inventory.");
      const entries = data ?? [];
      for (const entry of entries) {
        const child = prefix ? `${prefix}/${entry.name}` : entry.name;
        const isFolder = entry.id == null && entry.metadata == null;
        if (isFolder) pending.push(child);
        else if (++count > 10_000) throw new Error("Storage object inventory exceeded the safe read limit.");
      }
      if (entries.length < 100) break;
    }
  }
  return count;
}

async function countPublicRows(table) {
  const response = await fetch(`${STAGING_URL}/rest/v1/${table}?select=*`, {
    method: "HEAD",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!response.ok) throw new Error(`Could not read the staging row count for ${table}.`);
  const match = response.headers.get("content-range")?.match(/\/(\d+)$/);
  if (!match) throw new Error(`No exact staging row count was returned for ${table}.`);
  return Number(match[1]);
}

let currentStage = "initial read-only setup";
try {
  currentStage = "Storage bucket inventory and object counts";
  const { data: bucketData, error: bucketError } = await service.storage.listBuckets();
  if (bucketError) throw new Error("Could not read the staging Storage bucket inventory.");
  const actualBuckets = new Map((bucketData ?? []).map((bucket) => [bucket.name, bucket]));
  let bucketsReady = actualBuckets.size === EXPECTED_BUCKETS.size;
  const bucketResults = [];
  for (const [name, expectedPublic] of EXPECTED_BUCKETS) {
    const bucket = actualBuckets.get(name);
    if (!bucket) {
      bucketsReady = false;
      bucketResults.push({ name, result: "MISSING" });
      continue;
    }
    const settingsMatch = bucket.public === expectedPublic &&
      bucket.fileSizeLimit == null && bucket.allowedMimeTypes == null;
    const objects = await countObjects(name);
    const matches = settingsMatch && objects === 0;
    if (!matches) bucketsReady = false;
    bucketResults.push({ name, result: matches ? "OK" : "NOT_READY", public: bucket.public, objects });
  }
  const unexpectedBuckets = [...actualBuckets.keys()].filter((name) => !EXPECTED_BUCKETS.has(name));
  if (unexpectedBuckets.length) bucketsReady = false;

  currentStage = "pending Admin and existing super_admin role verification";
  const { data: accounts, error: accountError } = await service
    .from("admin_accounts")
    .select("username, email, display_name, role_id, is_active, is_password_set")
    .limit(2);
  if (accountError) throw new Error("Could not read the pending staging Admin account.");

  const { data: roles, error: roleError } = await service
    .from("roles")
    .select("id, code, permission_codes")
    .eq("code", "super_admin")
    .limit(2);
  if (roleError) throw new Error("Could not read the existing staging Super Admin role.");

  currentStage = "Auth user and identity inventory";
  const authUsers = await listAuthUsers();
  // Auth Admin's listUsers response includes identities for each user. With no
  // Auth users, the Auth FK invariant also guarantees there are no identities.
  const authIdentityCount = authUsers.reduce((sum, user) => sum + (Array.isArray(user.identities) ? user.identities.length : 0), 0);
  currentStage = "Admin session inventory";
  const adminSessionCount = await countPublicRows("admin_sessions");
  currentStage = "business record inventory";
  const businessRecordCounts = {};
  for (const table of BOOTSTRAP_ZERO_BUSINESS_TABLES) {
    businessRecordCounts[table] = await countPublicRows(table);
  }

  // Check local concurrency state after the remote reads, immediately before
  // making the read-only preflight decision. This is not a distributed lock.
  currentStage = "local process, lock, and journal inspection";
  const nodeProcesses = inspectWindowsNodeProcessInventory();
  const localLockPresent = existsSync(join(BOOTSTRAP_STATE_DIR, "bootstrap.lock"));
  const identityJournalPresent = existsSync(join(BOOTSTRAP_STATE_DIR, "auth-identity.json"));

  const soleAccount = accounts?.length === 1 ? accounts[0] : null;
  const soleRole = roles?.length === 1 ? roles[0] : null;
  console.log("Pending Admin field checks:", {
    rowCountIsOne: accounts?.length === 1,
    usernameMatches: soleAccount?.username === ADMIN_USERNAME,
    emailMatches: soleAccount?.email === ADMIN_EMAIL,
    displayNameMatchesBootstrap: soleAccount?.display_name === "Y-TRACE Staging Super Admin",
    isActive: soleAccount?.is_active === true,
    passwordUnset: soleAccount?.is_password_set === false,
    roleIdPresent: soleAccount?.role_id != null,
    existingSuperAdminRoleMatches: !!soleAccount && !!soleRole && soleRole.code === "super_admin" && soleRole.id === soleAccount.role_id,
  });

  currentStage = "strict bootstrap precondition evaluation";
  const result = assertBootstrapPreflightState({
    adminAccounts: accounts,
    superAdminRoles: roles,
    authUserCount: authUsers.length,
    authIdentityCount,
    adminSessionCount,
    businessRecordCounts,
    bucketsReady,
    localNodeProcesses: nodeProcesses,
    ownProcessId: process.pid,
    lockPresent: localLockPresent,
    journalPresent: identityJournalPresent,
  });

  console.log(`Target: ${STAGING_REF} (exact staging endpoint verified; production excluded)`);
  console.log(`Pending Admin: ${ADMIN_USERNAME} / ${ADMIN_EMAIL} (one, active, password not set)`);
  console.log("Role: existing super_admin role matched; required permission codes present");
  console.log(`Auth users: ${result.authUserCount}; Auth identities: ${result.authIdentityCount}; Admin sessions: ${result.adminSessionCount}`);
  console.log(`Business tables checked: ${result.businessTableCount}; nonzero records: 0`);
  console.log(`Storage buckets: ${bucketResults.length}/10 match expected settings; objects: 0; unexpected buckets: ${unexpectedBuckets.length}`);
  console.table(bucketResults);
  console.log(`Local Node.js processes: ${nodeProcesses.length}; unrelated: ${result.unrelatedLocalNodeProcessCount}; competing: 0; unclassified: 0`);
  console.log(`Local lock present: ${result.localLockPresent}; identity journal present: ${result.identityJournalPresent}`);
  console.log(`Local state path: canonical profile-temp; process-temp relationship: ${bootstrapPathInspection.relation}; alternate temp state: ${bootstrapPathInspection.alternateHasState ? "present" : "absent"}`);
  console.log("Other-machine/operator activity: not observable from this host; one-operator confirmation is required before execution.");
  console.log("Preflight is read-only. No bootstrap or account operation was run.");
} catch (error) {
  // Avoid printing SDK/network details which can contain sensitive context.
  const safeReasons = new Set([
    "Bootstrap preflight state is incomplete.",
    "Expected exactly one pending synthetic Super Admin account.",
    "The existing Admin row is not the exact pending staging Super Admin account.",
    "The pending account is not assigned to the existing authorized super_admin role.",
    "Unexpected staging Auth users, identities, or Admin sessions exist.",
    "Unexpected staging business records exist or a required table count is missing.",
    "The staging Storage bucket inventory is not clean and ready.",
    "A local staging bootstrap lock exists or could not be checked.",
    "A local bootstrap identity journal exists or could not be checked.",
    "A competing Y-TRACE initial Admin bootstrap process is running; refusing to proceed.",
    "Could not safely inspect local Node.js processes; refusing to bootstrap.",
    "Could not safely classify one or more local Node.js processes; refusing to bootstrap.",
  ]);
  const reason = safeReasons.has(error?.message) ? error.message : `check failed at ${currentStage}`;
  fail(`Bootstrap-specific staging preflight did not pass: ${reason} No changes were made.`);
}
