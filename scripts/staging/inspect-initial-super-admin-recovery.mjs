/**
 * Read-only inspection for the one interrupted initial Super Admin bootstrap.
 * Only the exact Y-TRACE staging project is accepted. Never prints IDs,
 * email addresses, metadata values, credentials, tokens, or raw API errors.
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  assertBootstrapAuthIdentity,
  assertNoCompetingBootstrap,
  inspectWindowsNodeProcessInventory,
  readBootstrapIdentityJournal,
} from "./bootstrap-initial-super-admin-safety.mjs";
import { inspectBootstrapStatePaths } from "./bootstrap-initial-super-admin-state-paths.mjs";

const STAGING_REF = "zroudsvpswqsjlyttkjf";
const STAGING_URL = `https://${STAGING_REF}.supabase.co`;
const PRODUCTION_REF = "mqqaykksadotbrghbexz";
const ADMIN_USERNAME = "staging-super-admin";
const ADMIN_EMAIL = "ytrace-staging-super-admin@example.invalid";
const ADMIN_DISPLAY_NAME = "Y-TRACE Staging Super Admin";
const MARKER = "ytrace-initial-super-admin-v1";
const JOURNAL_CONTEXT = { projectRef: STAGING_REF, email: ADMIN_EMAIL, marker: MARKER };

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
  console.error(`READ-ONLY INSPECTION BLOCKED: ${message}`);
  process.exit(1);
}

function required(name) {
  const value = process.env[name];
  if (!value) stop(`missing required staging environment variable ${name}`);
  return value;
}

const suppliedUrl = required("YTRACE_STAGING_SUPABASE_URL").replace(/\/$/, "");
const suppliedRef = required("YTRACE_STAGING_PROJECT_REF");
const serviceRoleKey = required("YTRACE_STAGING_SERVICE_ROLE_KEY");
const anonKey = required("YTRACE_STAGING_ANON_KEY");
if (suppliedRef === PRODUCTION_REF || suppliedRef !== STAGING_REF || suppliedUrl !== STAGING_URL) {
  stop("exact staging project verification failed; no request was sent");
}

const stagingHostname = new URL(STAGING_URL).hostname;
const productionHostname = new URL(`https://${PRODUCTION_REF}.supabase.co`).hostname;
const nativeFetch = globalThis.fetch.bind(globalThis);
const stagingOnlyFetch = async (input, init) => {
  const rawUrl = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let hostname = "";
  try { hostname = new URL(rawUrl).hostname.toLowerCase(); } catch { /* Auth/PostgREST uses absolute URLs. */ }
  if (hostname === productionHostname || hostname !== stagingHostname) {
    throw new Error("read-only recovery inspector blocked a non-staging host");
  }
  try {
    return await nativeFetch(input, init);
  } catch {
    throw new Error("staging-only read request failed");
  }
};
const service = createClient(STAGING_URL, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  global: { fetch: stagingOnlyFetch, headers: { "X-Client-Info": "ytrace-staging-bootstrap-readonly-inspector/1.0" } },
});

async function listAllAuthUsers() {
  const users = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 100 });
    if (error) stop("staging Auth inventory could not be read");
    const rows = data?.users ?? [];
    users.push(...rows);
    if (rows.length < 100) return users;
  }
}

async function countReference(table, column, userId) {
  const { count, error } = await service.from(table).select(column, { count: "exact", head: true }).eq(column, userId);
  if (error || !Number.isInteger(count)) stop("application ownership references could not be verified");
  return count;
}

async function main() {
  // Validate the supplied public key against the staging Auth service before
  // any continuation can rotate a temporary password or activate the Admin.
  const settings = await stagingOnlyFetch(`${STAGING_URL}/auth/v1/settings`, { headers: { apikey: anonKey } });
  if (!settings.ok) stop("the supplied anon key was not accepted by the staging Auth service");
  const statePaths = inspectBootstrapStatePaths();
  if (!statePaths.safe) stop("independent local bootstrap state directories exist or filesystem identity is unavailable; manual review is required");
  const stateDir = statePaths.stateDirectory;
  const journalPath = join(stateDir, "auth-identity.json");
  const lockPath = join(stateDir, "bootstrap.lock");
  const journal = await readBootstrapIdentityJournal(journalPath, JOURNAL_CONTEXT);
  const users = await listAllAuthUsers();
  const targetUsers = users.filter((user) => String(user.email ?? "").toLowerCase() === ADMIN_EMAIL);
  if (users.length !== 1 || targetUsers.length !== 1) {
    stop("Auth inventory does not contain exactly the one expected staging identity");
  }
  const listedUser = targetUsers[0];
  const { data: detailData, error: detailError } = await service.auth.admin.getUserById(listedUser.id);
  if (detailError || !detailData?.user) stop("the exact staging Auth identity detail could not be read");
  const user = detailData.user;
  if (user.id !== listedUser.id || String(user.email ?? "").toLowerCase() !== String(listedUser.email ?? "").toLowerCase()) {
    stop("the detailed Auth identity does not match the staging Auth inventory");
  }
  assertBootstrapAuthIdentity(user, {
    expectedProjectRef: STAGING_REF, actualProjectRef: suppliedRef,
    expectedUserId: journal?.userId, expectedEmail: ADMIN_EMAIL, expectedMarker: MARKER,
  });
  const identityList = Array.isArray(user.identities) ? user.identities : [];
  const identity = identityList.length === 1 ? identityList[0] : null;
  const userMetadata = user.user_metadata && typeof user.user_metadata === "object" && !Array.isArray(user.user_metadata)
    ? user.user_metadata
    : null;
  const appMetadata = user.app_metadata && typeof user.app_metadata === "object" && !Array.isArray(user.app_metadata)
    ? user.app_metadata
    : null;

  const { data: accounts, error: accountError } = await service.from("admin_accounts")
    .select("username, email, display_name, role_id, is_active, is_password_set").limit(2);
  if (accountError || !Array.isArray(accounts)) stop("pending Admin account could not be verified");
  const account = accounts.length === 1 ? accounts[0] : null;
  let roleMatches = false;
  if (account) {
    const { data: roles, error: roleError } = await service.from("roles")
      .select("id, code, permission_codes").eq("code", "super_admin").limit(2);
    roleMatches = !roleError && roles?.length === 1 && roles[0].id === account.role_id &&
      Array.isArray(roles[0].permission_codes) &&
      roles[0].permission_codes.includes("administrators_management") &&
      roles[0].permission_codes.includes("system_settings_manage");
  }

  const { data: profiles, error: profileError } = await service.from("user_profiles")
    .select("user_id, email, full_name, display_name, contact_number").eq("user_id", user.id).limit(2);
  if (profileError || !Array.isArray(profiles)) stop("Auth-triggered profile could not be checked");
  const profileMatches = profiles.length === 1 && profiles[0].user_id === user.id &&
    profiles[0].email === ADMIN_EMAIL && profiles[0].full_name === "" &&
    profiles[0].display_name === "" && profiles[0].contact_number == null;

  const { data: youthRoles, error: youthRoleError } = await service.from("roles").select("id").eq("code", "youth").limit(2);
  const { data: userRoles, error: userRoleError } = await service.from("user_roles")
    .select("role_id, assigned_by").eq("user_id", user.id).limit(3);
  if (youthRoleError || userRoleError || !Array.isArray(youthRoles) || !Array.isArray(userRoles)) {
    stop("Auth-triggered role associations could not be checked");
  }
  const expectedYouthRole = youthRoles.length === 1 && userRoles.length === 1 &&
    userRoles[0].role_id === youthRoles[0].id && userRoles[0].assigned_by == null;
  const noUserRoles = youthRoles.length === 0 && userRoles.length === 0;
  const defaultRoleMatches = expectedYouthRole || noUserRoles;

  const ownershipReferences = [];
  for (const [table, column] of AUTH_USER_REFERENCE_COLUMNS) {
    ownershipReferences.push({ table, column, count: await countReference(table, column, user.id) });
  }
  const { count: adminSessionCount, error: sessionsError } = await service.from("admin_sessions")
    .select("id", { count: "exact", head: true });
  if (sessionsError || !Number.isInteger(adminSessionCount)) stop("Admin session inventory could not be read");

  const userMetaKeys = userMetadata ? Object.keys(userMetadata).sort() : [];
  const appMetaKeys = appMetadata ? Object.keys(appMetadata).sort() : [];
  const identityData = identity?.identity_data && typeof identity.identity_data === "object" && !Array.isArray(identity.identity_data)
    ? identity.identity_data
    : {};
  const linkedIdentityMatches = !!identity && identity.provider === "email" && identity.user_id === user.id &&
    identityData.email === ADMIN_EMAIL && identityData.sub === user.id;
  const userEmailVerified = userMetadata?.email_verified === true;
  const otherUserMetadataValuesAbsent = userMetadata != null && Object.keys(userMetadata).length === 1 && userEmailVerified;
  const appMetadataMatches = !!appMetadata && appMetadata.ytrace_bootstrap === MARKER &&
    Object.keys(appMetadata).every((key) => ["provider", "providers", "ytrace_bootstrap"].includes(key)) &&
    (!Object.hasOwn(appMetadata, "provider") || appMetadata.provider === "email") &&
    (!Object.hasOwn(appMetadata, "providers") ||
      (Array.isArray(appMetadata.providers) && appMetadata.providers.length === 1 && appMetadata.providers[0] === "email"));
  const accountMatches = accounts.length === 1 && account?.username === ADMIN_USERNAME &&
    account?.email === ADMIN_EMAIL && account?.display_name === ADMIN_DISPLAY_NAME &&
    account?.is_active === true && account?.is_password_set === false && roleMatches;
  const processCheck = assertNoCompetingBootstrap(inspectWindowsNodeProcessInventory(), process.pid);
  if (!journal || journal.userId !== user.id || !linkedIdentityMatches || !otherUserMetadataValuesAbsent ||
      !appMetadataMatches || !accountMatches || !profileMatches || !defaultRoleMatches ||
      adminSessionCount !== 0 || ownershipReferences.some((entry) => entry.count !== 0) || existsSync(lockPath)) {
    stop("one or more required recovery preconditions failed; no write was attempted");
  }

  console.log(`Target project: ${STAGING_REF} (exact URL/ref verified; production excluded)`);
  console.log(`Auth users: ${users.length}; expected synthetic user count: ${targetUsers.length}`);
  console.log(`Journal: ${journal ? "present and context-valid" : "missing"}; recorded ID matches Auth ID: ${journal?.userId === user.id}`);
  console.log(`Synthetic email match: ${String(user.email ?? "").toLowerCase() === ADMIN_EMAIL.toLowerCase()}`);
  console.log(`App bootstrap marker/provider envelope valid: ${appMetadataMatches}; app metadata keys: ${appMetaKeys.join(",")}`);
  console.log(`User metadata keys: ${userMetaKeys.join(",") || "(none)"}; email_verified boolean true: ${userEmailVerified}; no other user metadata fields: ${otherUserMetadataValuesAbsent}`);
  console.log(`Email confirmed: ${!!(user.email_confirmed_at || user.confirmed_at)}; created_at: ${user.created_at ?? "missing"}`);
  console.log(`Linked email identity count: ${identityList.length}; provider and user link match: ${linkedIdentityMatches}; identity created_at: ${identity?.created_at ?? "missing"}`);
  console.log(`Identity email_verified is false: ${identityData.email_verified === false}; phone_verified is false: ${identityData.phone_verified === false}; identity metadata keys: ${Object.keys(identityData).sort().join(",")}`);
  console.log(`Pending Admin row and existing super_admin permissions match: ${accountMatches}`);
  console.log(`Expected Auth-triggered profile: ${profileMatches}; expected default role association: ${defaultRoleMatches}`);
  console.log(`Admin sessions: ${adminSessionCount}`);
  console.log(`Auth-user ownership references (must all be zero): ${ownershipReferences.map((entry) => `${entry.table}.${entry.column}=${entry.count}`).join(", ")}`);
  console.log(`Local bootstrap lock present: ${existsSync(lockPath)}; local recorded-ID journal present: ${existsSync(journalPath)}`);
  console.log(`Local state path: one canonical profile-temp directory; process-temp relationship: ${statePaths.relation}; alternate temp state: ${statePaths.alternateHasState ? "present" : "absent"}`);
  console.log(`Competing bootstrap processes: ${processCheck.competingCount}; safely unrelated Node processes: ${processCheck.unrelatedCount}`);
  console.log("Recovery preflight: PASS (all required guards enforced).");
  console.log("Mode: read-only. No Auth, database, Storage, password, session, or policy write was attempted.");
}

main().catch(() => stop("sanitized read-only inspection failed; no write was attempted"));
