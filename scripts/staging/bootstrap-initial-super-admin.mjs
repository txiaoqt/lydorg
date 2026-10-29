#!/usr/bin/env node
/**
 * Completes the one-time staging-only first Super Admin bootstrap.
 *
 * A single pending admin_accounts row must already exist, created through the
 * explicitly authorized staging control-plane step. This script creates the
 * matching, pre-confirmed shadow Auth identity (no invitation/confirmation
 * email), reuses set_initial_admin_password with its real Auth JWT, removes the
 * temporary shadow identity as the existing Admin invite flow does, and
 * verifies the normal custom Admin login RPC. It never prints credentials or
 * session tokens and never reads a .env file.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import { requireCanonicalBootstrapStateDirectory } from "./bootstrap-initial-super-admin-state-paths.mjs";
import {
  activateAndCleanupBootstrapIdentity,
  assertNoCompetingBootstrap,
  assertBootstrapAuthIdentity,
  assertBootstrapAuthUserDetailsMatch,
  clearBootstrapIdentityJournal,
  inspectWindowsNodeProcessInventory,
  prepareBootstrapAuthIdentity,
  readBootstrapIdentityJournal,
  removeVerifiedBootstrapAuthIdentity,
  withExclusiveBootstrapLock,
  writeBootstrapIdentityJournal,
} from "./bootstrap-initial-super-admin-safety.mjs";

const STAGING_REF = "zroudsvpswqsjlyttkjf";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const PRODUCTION_REF = "mqqaykksadotbrghbexz";
const ADMIN_USERNAME = "staging-super-admin";
const ADMIN_EMAIL = "ytrace-staging-super-admin@example.invalid";
const ADMIN_DISPLAY_NAME = "Y-TRACE Staging Super Admin";
const SHADOW_MARKER = "ytrace-initial-super-admin-v1";
const continuationOnly = process.argv.includes("--continue-recorded");
const JOURNAL_CONTEXT = { projectRef: STAGING_REF, email: ADMIN_EMAIL, marker: SHADOW_MARKER };
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
// Every current public-schema foreign-key reference to auth.users whose delete
// rule can cascade or null a record. Do not delete a shadow Auth row while any
// of these business/audit references exist.
const AUTH_USER_REFERENCE_COLUMNS = [
  ["budget_requests", "submitted_by"],
  ["compliance_remarks", "created_by"],
  ["compliance_remarks", "resolved_by"],
  ["disclosure_documents", "created_by"],
  ["document_submissions", "submitted_by"],
  ["events", "created_by"],
  ["inquiries", "submitted_by"],
  ["liquidation_reports", "submitted_by"],
  ["move_applications", "submitted_by"],
  ["notifications", "user_id"],
  ["organization_profiles", "user_id"],
  ["organizations", "created_by"],
  ["programs", "created_by"],
  ["transparency_posts", "created_by"],
  ["user_policy_acceptance", "user_id"],
  ["user_roles", "assigned_by"],
  ["ypop_entries", "submitted_by"],
  ["ypop_event_participations", "submitted_by"],
  ["ypop_org_activities", "submitted_by"],
];

function stop(message) {
  console.error(`BLOCKED: ${message}`);
  process.exit(1);
}

function required(name) {
  const value = process.env[name];
  if (!value) stop(`Missing ${name}. Set it in this terminal; this script does not read .env files.`);
  return value;
}

const suppliedUrl = required("YTRACE_STAGING_SUPABASE_URL").replace(/\/$/, "");
const suppliedRef = required("YTRACE_STAGING_PROJECT_REF");
const serviceRoleKey = required("YTRACE_STAGING_SERVICE_ROLE_KEY");
const anonKey = required("YTRACE_STAGING_ANON_KEY");
const password = required("YTRACE_STAGING_BOOTSTRAP_PASSWORD");

if (suppliedRef === PRODUCTION_REF || suppliedRef !== STAGING_REF || suppliedUrl !== STAGING_URL) {
  stop("Refusing to run anywhere except the exact authorized staging project.");
}
if (password.length < 14) stop("Choose a staging-only password with at least 14 characters.");

let BOOTSTRAP_STATE_DIR;
try {
  BOOTSTRAP_STATE_DIR = requireCanonicalBootstrapStateDirectory();
} catch {
  stop("Independent staging bootstrap state paths exist or cannot be identified; manual review is required.");
}
const BOOTSTRAP_JOURNAL = join(BOOTSTRAP_STATE_DIR, "auth-identity.json");
const BOOTSTRAP_LOCK = join(BOOTSTRAP_STATE_DIR, "bootstrap.lock");

const stagingHostname = new URL(STAGING_URL).hostname;
const productionHostname = new URL(`https://${PRODUCTION_REF}.supabase.co`).hostname;
const nativeFetch = globalThis.fetch.bind(globalThis);
const stagingOnlyFetch = async (input, init) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let hostname = "";
  try { hostname = new URL(rawUrl).hostname.toLowerCase(); } catch { /* Supabase requests use absolute URLs. */ }
  if (hostname === productionHostname || hostname !== stagingHostname) {
    throw new Error("Bootstrap network guard blocked a non-staging host.");
  }
  return nativeFetch(input, init);
};
const clientOptions = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { fetch: stagingOnlyFetch, headers: { "X-Client-Info": "ytrace-staging-initial-admin-bootstrap/1.0" } },
};
const service = createClient(STAGING_URL, serviceRoleKey, clientOptions);
const userClient = createClient(STAGING_URL, anonKey, clientOptions);
// Keep custom Admin authentication on a clean anon client. The separate
// temporary Auth identity is still signed in while the normal Admin flow is
// verified, and must not become the bearer context for Admin login RPCs.
const adminLoginClient = createClient(STAGING_URL, anonKey, clientOptions);
let currentStage = "bootstrap setup";
const SAFE_FAILURE_MESSAGES = new Set([
  "Bootstrap network guard blocked a non-staging host.",
  "Could not verify the staging Auth-user precondition.",
  "Could not verify the staging Storage bucket inventory.",
  "The staging bucket inventory changed; refusing bootstrap.",
  "A staging bucket is missing or has unexpected settings; refusing bootstrap.",
  "Could not verify the pending staging Admin record.",
  "Expected exactly one staging Admin row; refusing to create or change accounts.",
  "The existing Admin row is not the authorized synthetic bootstrap account.",
  "The existing super_admin role assignment failed verification; no role changes were made.",
  "Unexpected staging Auth users exist; refusing to alter any identity.",
  "The Auth identity does not match the recorded staging user ID.",
  "The Auth identity belongs to a different Supabase project.",
  "The detailed Auth identity does not match the staging Auth inventory.",
  "Could not verify the detailed staging Auth identity.",
  "The Auth identity email does not match the synthetic staging account.",
  "The synthetic Auth identity is not confirmed.",
  "The Auth identity is not in the expected active lifecycle state.",
  "The Auth identity has unexpected linked sign-in identities.",
  "The Auth identity bootstrap marker does not match.",
  "The Auth identity has unrecognized app metadata.",
  "The Auth identity metadata has an invalid shape.",
  "The Auth identity has an unexpected provider.",
  "The Auth identity has unexpected provider metadata.",
  "The Auth identity has unexpected user metadata.",
  "An Auth identity exists without a recorded staging user ID; manual review is required.",
  "The recorded staging Auth identity is missing; refusing to create a replacement.",
  "A local staging Admin bootstrap is already running or left a lock for manual review.",
  "Another staging Admin bootstrap is already running or left a lock for manual review.",
  "A competing Y-TRACE initial Admin bootstrap process is running; refusing to proceed.",
  "Could not safely inspect local Node.js processes; refusing to bootstrap.",
  "Could not safely classify one or more local Node.js processes; refusing to bootstrap.",
  "The local staging bootstrap journal is malformed; manual review is required.",
  "The local staging bootstrap journal does not match this project and synthetic identity.",
  "A different Auth user ID is already recorded for this staging bootstrap.",
  "Refusing to clear a journal for a different Auth user ID.",
  "The synthetic identity could not establish the Auth session needed for password activation.",
  "Required post-activation safety checks were not supplied.",
  "Could not end the temporary synthetic Auth session.",
  "Could not remove the verified synthetic staging Auth identity.",
  "The shadow identity is associated with organization data; refusing cleanup.",
  "The shadow identity is associated with registration data; refusing cleanup.",
  "The shadow identity is associated with existing application data; refusing cleanup.",
  "The shadow identity's Auth-triggered profile does not match the expected synthetic profile.",
  "The shadow identity's Auth-triggered roles do not match the expected default role.",
  "Could not verify whether the shadow identity has application data; refusing cleanup.",
  "The normal Admin authentication RPC rejected the synthetic account.",
  "The normal Admin authentication flow did not return the expected account.",
  "The normal Admin permission-context check failed.",
  "The normal Admin session-validation check failed.",
  "The temporary verification Admin session could not be revoked.",
  "The temporary verification Admin session remained active after logout.",
  "Could not create the pre-confirmed synthetic staging Auth identity.",
  "Could not rotate the recorded synthetic temporary Auth password.",
  "The existing set_initial_admin_password activation flow failed for the expected staging account.",
  "Unexpected Auth users remain after synthetic identity cleanup.",
  "Final staging Admin account verification failed.",
  "Controlled continuation requires the existing journal-recorded Auth identity.",
  "Controlled continuation requires the Admin password to remain unset.",
  "Unexpected active staging Admin sessions exist.",
]);

async function listAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw new Error("Could not verify the staging Auth-user precondition.");
    const pageUsers = data?.users ?? [];
    users.push(...pageUsers);
    if (pageUsers.length < 100) return users;
  }
}

async function requireOk(result, message) {
  if (result.error) throw new Error(message);
  return result.data;
}

async function verifyStagingBuckets() {
  const { data, error } = await service.storage.listBuckets();
  if (error) throw new Error("Could not verify the staging Storage bucket inventory.");
  const actual = new Map((data ?? []).map((bucket) => [bucket.name, bucket]));
  if (actual.size !== EXPECTED_BUCKETS.size) throw new Error("The staging bucket inventory changed; refusing bootstrap.");
  for (const [name, isPublic] of EXPECTED_BUCKETS) {
    const bucket = actual.get(name);
    if (!bucket || bucket.public !== isPublic || bucket.fileSizeLimit != null || bucket.allowedMimeTypes != null) {
      throw new Error("A staging bucket is missing or has unexpected settings; refusing bootstrap.");
    }
  }
}

async function verifyPendingAdmin() {
  const { data: rows, error } = await service
    .from("admin_accounts")
    .select("id, username, email, display_name, role_id, is_active, is_password_set")
    .limit(2);
  if (error) throw new Error("Could not verify the pending staging Admin record.");
  if (rows?.length !== 1) throw new Error("Expected exactly one staging Admin row; refusing to create or change accounts.");
  const account = rows[0];
  if (String(account.username).toLowerCase() !== ADMIN_USERNAME ||
      String(account.email).toLowerCase() !== ADMIN_EMAIL ||
      account.display_name !== ADMIN_DISPLAY_NAME ||
      account.is_active !== true ||
      ![false, true].includes(account.is_password_set)) {
    throw new Error("The existing Admin row is not the authorized synthetic bootstrap account.");
  }

  const { data: roles, error: roleError } = await service
    .from("roles")
    .select("id, code, permission_codes")
    .eq("code", "super_admin")
    .limit(2);
  if (roleError || roles?.length !== 1 || roles[0].id !== account.role_id ||
      !Array.isArray(roles[0].permission_codes) ||
      !roles[0].permission_codes.includes("administrators_management") ||
      !roles[0].permission_codes.includes("system_settings_manage")) {
    throw new Error("The existing super_admin role assignment failed verification; no role changes were made.");
  }
  return account;
}

async function assertShadowIdentityIsDisposable(user, expectedUserId) {
  assertBootstrapAuthIdentity(user, {
    expectedProjectRef: STAGING_REF,
    actualProjectRef: suppliedRef,
    expectedUserId,
    expectedEmail: ADMIN_EMAIL,
    expectedMarker: SHADOW_MARKER,
  });
  const { data: profiles, error: profileError } = await service
    .from("user_profiles")
    .select("user_id, email, full_name, display_name, contact_number")
    .eq("user_id", user.id)
    .limit(2);
  if (profileError || profiles?.length !== 1 || profiles[0].email !== ADMIN_EMAIL ||
      profiles[0].full_name !== "" || profiles[0].display_name !== "" || profiles[0].contact_number != null) {
    throw new Error("The shadow identity's Auth-triggered profile does not match the expected synthetic profile.");
  }

  const { data: youthRoles, error: youthRoleError } = await service
    .from("roles")
    .select("id")
    .eq("code", "youth")
    .limit(2);
  if (youthRoleError || youthRoles?.length > 1) throw new Error("The shadow identity's Auth-triggered roles do not match the expected default role.");
  const { data: userRoles, error: userRoleError } = await service
    .from("user_roles")
    .select("role_id, assigned_by")
    .eq("user_id", user.id)
    .limit(3);
  const hasExpectedYouthRole = youthRoles?.length === 1 && userRoles?.length === 1 &&
    userRoles[0].role_id === youthRoles[0].id && userRoles[0].assigned_by == null;
  if (userRoleError || (youthRoles?.length === 0 && userRoles?.length !== 0) ||
      (youthRoles?.length === 1 && !hasExpectedYouthRole)) {
    throw new Error("The shadow identity's Auth-triggered roles do not match the expected default role.");
  }

  for (const [table, column] of AUTH_USER_REFERENCE_COLUMNS) {
    const { data: references, error } = await service
      .from(table)
      .select(column)
      .eq(column, user.id)
      .limit(1);
    if (error) throw new Error("Could not verify whether the shadow identity has application data; refusing cleanup.");
    if (references?.length) throw new Error("The shadow identity is associated with existing application data; refusing cleanup.");
  }
}

async function removeOnlyOurShadowIdentity(user, expectedUserId) {
  if (!user) return;
  const journal = await readBootstrapIdentityJournal(BOOTSTRAP_JOURNAL, JOURNAL_CONTEXT);
  if (!journal || journal.userId !== expectedUserId) {
    throw new Error("The Auth identity does not match the recorded staging user ID.");
  }
  const detail = await service.auth.admin.getUserById(expectedUserId);
  if (detail.error || !detail.data?.user) throw new Error("Could not verify the detailed staging Auth identity.");
  const currentUser = detail.data.user;
  await removeVerifiedBootstrapAuthIdentity({
    user: currentUser,
    identityOptions: {
      expectedProjectRef: STAGING_REF,
      actualProjectRef: suppliedRef,
      expectedUserId,
      expectedEmail: ADMIN_EMAIL,
      expectedMarker: SHADOW_MARKER,
    },
    assertNoAssociations: (userId) => assertShadowIdentityIsDisposable(currentUser, userId),
    deleteUser: (userId) => service.auth.admin.deleteUser(userId),
  });
}

async function verifyNormalAdminLogin(account) {
  let sessionToken = "";
  try {
    const login = await adminLoginClient.rpc("authenticate_admin_account", {
      _username: ADMIN_USERNAME,
      _password: password,
    });
    if (login.error) throw new Error("The normal Admin authentication RPC rejected the synthetic account.");
    const loginRow = Array.isArray(login.data) ? login.data[0] : null;
    if (!loginRow?.session_token) {
      throw new Error("The normal Admin authentication flow did not return the expected account.");
    }
    sessionToken = loginRow.session_token;
    if (loginRow.admin_id !== account.id) {
      throw new Error("The normal Admin authentication flow did not return the expected account.");
    }
    console.log("PASS: Normal authenticate_admin_account login.");

    const context = await adminLoginClient.rpc("get_admin_permission_context", { _session_token: sessionToken });
    const contextRow = Array.isArray(context.data) ? context.data[0] : null;
    if (context.error || contextRow?.role_code !== "super_admin" ||
        !contextRow.permission_codes?.includes("administrators_management") ||
        !contextRow.permission_codes?.includes("system_settings_manage")) {
      throw new Error("The normal Admin permission-context check failed.");
    }
    console.log("PASS: Existing super_admin role and both required permissions.");

    const validation = await adminLoginClient.rpc("validate_admin_session_token", { _session_token: sessionToken });
    const validationRow = Array.isArray(validation.data) ? validation.data[0] : null;
    if (validation.error || validationRow?.admin_id !== account.id ||
        !validationRow.expires_at || Date.parse(validationRow.expires_at) <= Date.now()) {
      throw new Error("The normal Admin session-validation check failed.");
    }
    console.log("PASS: Normal Admin session validation.");
  } finally {
    if (sessionToken) {
      const revoked = await adminLoginClient.rpc("revoke_admin_session_token", { _session_token: sessionToken });
      if (revoked.error) throw new Error("The temporary verification Admin session could not be revoked.");
      const validation = await adminLoginClient.rpc("validate_admin_session_token", { _session_token: sessionToken });
      if (validation.error || (Array.isArray(validation.data) && validation.data.length > 0)) {
        throw new Error("The temporary verification Admin session remained active after logout.");
      }
      console.log("PASS: Test Admin session revoked and rejected by validation.");
    }
  }
}

async function runBootstrap() {
  currentStage = "Storage inventory verification";
  await verifyStagingBuckets();
  currentStage = "Pending Admin account and role verification";
  const account = await verifyPendingAdmin();
  currentStage = "Staging Auth-user inventory";
  const usersBefore = await listAuthUsers();
  currentStage = "Local staging bootstrap journal verification";
  let journal = await readBootstrapIdentityJournal(BOOTSTRAP_JOURNAL, JOURNAL_CONTEXT);
  if (continuationOnly && (usersBefore.length !== 1 || !journal?.userId)) {
    throw new Error("Controlled continuation requires the existing journal-recorded Auth identity.");
  }
  if (continuationOnly && account.is_password_set !== false) {
    throw new Error("Controlled continuation requires the Admin password to remain unset.");
  }
  if (usersBefore.length === 0 && journal && !account.is_password_set) {
    throw new Error("The recorded staging Auth identity is missing; refusing to create a replacement.");
  }
  if (usersBefore.length === 0 && journal && account.is_password_set) {
    await clearBootstrapIdentityJournal(BOOTSTRAP_JOURNAL, JOURNAL_CONTEXT, journal.userId);
    journal = null;
  }
  currentStage = "Recorded synthetic Auth identity verification";
  const identityOptions = {
    expectedProjectRef: STAGING_REF,
    actualProjectRef: suppliedRef,
    expectedUserId: journal?.userId,
    expectedEmail: ADMIN_EMAIL,
    expectedMarker: SHADOW_MARKER,
  };
  if (usersBefore.length > 1) throw new Error("Unexpected staging Auth users exist; refusing to alter any identity.");
  let shadowUser = null;
  if (usersBefore.length === 1) {
    const listedUser = usersBefore[0];
    if (!journal?.userId) throw new Error("An Auth identity exists without a recorded staging user ID; manual review is required.");
    if (listedUser?.id !== journal.userId) throw new Error("The Auth identity does not match the recorded staging user ID.");
    if (String(listedUser?.email ?? "").toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
      throw new Error("The Auth identity email does not match the synthetic staging account.");
    }
    currentStage = "Detailed recorded Auth identity verification";
    const detail = await service.auth.admin.getUserById(listedUser.id);
    if (detail.error || !detail.data?.user) throw new Error("Could not verify the detailed staging Auth identity.");
    shadowUser = assertBootstrapAuthUserDetailsMatch(listedUser, detail.data.user, identityOptions);
  }
  let shadowPassword = "";
  let recordedUserId = journal?.userId ?? null;

  if (continuationOnly) {
    currentStage = "Pre-activation identity ownership and session verification";
    await assertShadowIdentityIsDisposable(shadowUser, recordedUserId);
    const sessions = await service.from("admin_sessions").select("id", { count: "exact", head: true });
    if (sessions.error || sessions.count !== 0) throw new Error("Unexpected active staging Admin sessions exist.");
    console.log("PASS: Continuation-only identity, journal, pending Admin, ownership, and session guards.");
  }

  if (!account.is_password_set) {
    currentStage = shadowUser ? "Temporary synthetic Auth identity recovery" : "Temporary synthetic Auth identity creation";
    const prepared = await prepareBootstrapAuthIdentity({
      users: shadowUser ? [shadowUser] : [],
      identityOptions: { ...identityOptions, expectedUserId: recordedUserId },
      authAdmin: service.auth.admin,
      makeTemporaryPassword: () => randomBytes(48).toString("base64url"),
      recordUserId: async (userId) => {
        await writeBootstrapIdentityJournal(BOOTSTRAP_JOURNAL, JOURNAL_CONTEXT, userId);
        recordedUserId = userId;
      },
      reuseOnly: continuationOnly,
    });
    shadowUser = prepared.user;
    shadowPassword = prepared.temporaryPassword;
  }

  let normalAdminVerified = false;
  if (!account.is_password_set) {
    currentStage = "Auth login and initial Admin password activation";
    await activateAndCleanupBootstrapIdentity({
      userClient,
      user: shadowUser,
      expectedUserId: recordedUserId,
      username: ADMIN_USERNAME,
      adminAccountId: account.id,
      email: ADMIN_EMAIL,
      temporaryPassword: shadowPassword,
      adminPassword: password,
      onStep: (step) => console.log(`PASS: ${step}.`),
      verifyNormalAdminLogin: async () => {
        currentStage = "Normal Admin login, permissions, and session verification";
        await verifyNormalAdminLogin(account);
        normalAdminVerified = true;
      },
      assertCleanupEligibility: async (user) => {
        currentStage = "Post-activation synthetic identity cleanup eligibility";
        await assertShadowIdentityIsDisposable(user, recordedUserId);
        console.log("PASS: Temporary identity has no business ownership associations.");
      },
      cleanup: async (user) => {
        currentStage = "Temporary Auth identity cleanup";
        await removeOnlyOurShadowIdentity(user, recordedUserId);
      },
    });
  } else if (shadowUser) {
    currentStage = "Normal Admin login, permissions, and session verification";
    await verifyNormalAdminLogin(account);
    normalAdminVerified = true;
    currentStage = "Post-activation synthetic identity cleanup eligibility";
    await assertShadowIdentityIsDisposable(shadowUser, recordedUserId);
    currentStage = "Temporary Auth identity cleanup";
    await removeOnlyOurShadowIdentity(shadowUser, recordedUserId);
  }

  if (shadowUser) {
    currentStage = "Post-cleanup Auth-user verification";
    const remainingUsers = await listAuthUsers();
    if (remainingUsers.length !== 0) throw new Error("Unexpected Auth users remain after synthetic identity cleanup.");
  }

  if (!normalAdminVerified) {
    currentStage = "Normal Admin login, permissions, and session verification";
    await verifyNormalAdminLogin(account);
  }
  currentStage = "Final Admin account verification";
  const { data: finalAccount, error: finalError } = await service
    .from("admin_accounts")
    .select("id, username, email, role_id, is_active, is_password_set")
    .eq("id", account.id)
    .maybeSingle();
  if (finalError || !finalAccount || finalAccount.is_active !== true || finalAccount.is_password_set !== true) {
    throw new Error("Final staging Admin account verification failed.");
  }
  const activeSessions = await service.from("admin_sessions").select("id", { count: "exact", head: true })
    .is("revoked_at", null).gt("expires_at", new Date().toISOString());
  if (activeSessions.error || activeSessions.count !== 0) throw new Error("Unexpected active staging Admin sessions exist.");
  // Keep recovery evidence until every final application check succeeds.
  if (shadowUser) await clearBootstrapIdentityJournal(BOOTSTRAP_JOURNAL, JOURNAL_CONTEXT, recordedUserId);

  console.log(`Target: ${STAGING_REF} (exact staging host verified)`);
  console.log("Synthetic initial Admin account: PASS (existing super_admin role; exactly one account)");
  console.log("Password activation: PASS (existing set_initial_admin_password RPC; Auth identity removed after activation)");
  console.log("Normal Admin login: PASS (authenticate_admin_account, permission context, and session validation)");
  console.log("Verification session: revoked and confirmed invalid; no password or session token was printed.");
  console.log("No invitation, confirmation, or other email was sent.");
}

async function main() {
  await withExclusiveBootstrapLock(BOOTSTRAP_LOCK, async () => {
    assertNoCompetingBootstrap(inspectWindowsNodeProcessInventory(), process.pid);
    // The process inventory is local to this host. Cross-machine races are
    // fenced by Supabase Auth's unique synthetic email: only one createUser can
    // win, and another host cannot adopt the identity without its recorded ID.
    await runBootstrap();
  });
}

main().catch((error) => {
  // Keep transport errors and response payloads out of logs: they can contain
  // request details, Auth metadata, or bearer credentials.
  const safeMessage = error instanceof Error && SAFE_FAILURE_MESSAGES.has(error.message)
    ? error.message
    : "Unexpected failure; detailed error withheld.";
  console.error(`Bootstrap stopped safely at ${currentStage}: ${safeMessage} No credential values were logged.`);
  process.exitCode = 1;
});
