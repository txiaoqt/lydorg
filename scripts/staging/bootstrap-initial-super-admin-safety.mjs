import { spawnSync } from "node:child_process";
import { open, mkdir, readFile, unlink } from "node:fs/promises";
import { dirname } from "node:path";

const BOOTSTRAP_SCRIPT_NAME = "bootstrap-initial-super-admin.mjs";
export const BOOTSTRAP_ZERO_BUSINESS_TABLES = Object.freeze([
  "activity_announcements",
  "activity_logs",
  "admin_portal_change_versions",
  "admin_ypop_deletion_jobs",
  "annual_budget_allocations",
  "budget_request_files",
  "budget_requests",
  "compliance_remarks",
  "disclosure_documents",
  "document_submission_files",
  "document_submissions",
  "events",
  "inquiries",
  "liquidation_report_files",
  "liquidation_reports",
  "move_applications",
  "move_files",
  "news_releases",
  "notifications",
  "organization_accreditations",
  "organization_contacts",
  "organization_profiles",
  "organization_reference_counters",
  "organization_renewals",
  "organization_urn_counters",
  "organizations",
  "policy_versions",
  "transparency_posts",
  "urn_review_history",
  "user_policy_acceptance",
  "user_profiles",
  "user_roles",
  "ypop_city_activities",
  "ypop_entries",
  "ypop_event_files",
  "ypop_event_participations",
  "ypop_files",
  "ypop_org_activities",
  "ypop_org_activity_files",
  "ypop_submission_deletion_receipts",
  "yorp_sample_document_assets",
]);
const WINDOWS_NODE_PROCESS_INVENTORY = String.raw`$ErrorActionPreference = 'Stop'
$source = @'
using System;
using System.Runtime.InteropServices;
public static class YTraceWindowsCommandLine {
    [DllImport("shell32.dll", SetLastError = true)]
    private static extern IntPtr CommandLineToArgvW(string commandLine, out int argc);
    [DllImport("kernel32.dll", SetLastError = true)]
    private static extern IntPtr LocalFree(IntPtr memory);
    public static string[] Parse(string commandLine) {
        int argc;
        IntPtr argv = CommandLineToArgvW(commandLine, out argc);
        if (argv == IntPtr.Zero) throw new System.ComponentModel.Win32Exception();
        try {
            string[] result = new string[argc];
            for (int i = 0; i < argc; i++) {
                IntPtr item = Marshal.ReadIntPtr(argv, i * IntPtr.Size);
                result[i] = Marshal.PtrToStringUni(item);
            }
            return result;
        } finally {
            LocalFree(argv);
        }
    }
}
'@
try {
    Add-Type -TypeDefinition $source -ErrorAction Stop
    $processes = @(Get-CimInstance -Namespace 'root\cimv2' -ClassName Win32_Process -Filter "Name = 'node.exe'" -ErrorAction Stop)
    $inventory = @(foreach ($process in $processes) {
        $line = $process.CommandLine
        $accessible = -not [string]::IsNullOrWhiteSpace($line)
        $isBootstrap = $null
        if ($accessible) {
            try {
                $arguments = [YTraceWindowsCommandLine]::Parse([string]$line)
                $isBootstrap = $false
                foreach ($argument in $arguments) {
                    if ([IO.Path]::GetFileName($argument).Equals('${BOOTSTRAP_SCRIPT_NAME}', [StringComparison]::OrdinalIgnoreCase)) {
                        $isBootstrap = $true
                        break
                    }
                }
            } catch {
                $accessible = $false
                $isBootstrap = $null
            }
        }
        $started = $process.CreationDate
        if ($started -is [datetime]) { $started = $started.ToString('o') }
        [PSCustomObject]@{
            processId = $process.ProcessId
            parentProcessId = $process.ParentProcessId
            startTime = [string]$started
            executablePath = $process.ExecutablePath
            commandLineAccessible = $accessible
            isBootstrapCommand = $isBootstrap
        }
    })
    if ($inventory.Count -eq 0) {
        [Console]::Out.WriteLine('[]')
    } else {
        [Console]::Out.WriteLine((ConvertTo-Json -InputObject $inventory -Depth 3 -Compress))
    }
} catch {
    [Console]::Error.WriteLine('Windows Node.js process inspection failed.')
    exit 1
}`;

const STANDARD_EMAIL_APP_METADATA_KEYS = new Set([
  "provider",
  "providers",
  "ytrace_bootstrap",
]);
const STANDARD_EMAIL_USER_METADATA_KEYS = new Set(["email_verified"]);
const BOOTSTRAP_STAGING_PROJECT_REF = "zroudsvpswqsjlyttkjf";

function metadataObject(value) {
  if (value == null) return {};
  if (typeof value === "object" && !Array.isArray(value)) return value;
  fail("The Auth identity metadata has an invalid shape.");
}

function fail(message) {
  throw new Error(message);
}

/**
 * Read a sanitized snapshot of local node.exe processes on Windows. Raw
 * command-line arguments stay inside PowerShell and are never returned/logged;
 * only a boolean indicating whether one parsed argument invokes this script is
 * returned. Failure to inspect any command line is handled fail-closed below.
 */
export function inspectWindowsNodeProcessInventory({ run = spawnSync, platform = process.platform } = {}) {
  if (platform !== "win32") {
    fail("Could not safely inspect local Node.js processes; refusing to bootstrap.");
  }

  let result;
  try {
    result = run("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", WINDOWS_NODE_PROCESS_INVENTORY], {
      encoding: "utf8",
      timeout: 10_000,
      windowsHide: true,
    });
  } catch {
    fail("Could not safely inspect local Node.js processes; refusing to bootstrap.");
  }

  if (result?.error || result?.status !== 0 || typeof result.stdout !== "string") {
    fail("Could not safely inspect local Node.js processes; refusing to bootstrap.");
  }

  try {
    const parsed = JSON.parse(result.stdout.trim());
    const processes = Array.isArray(parsed) ? parsed : [parsed];
    if (processes.some((item) => !item || typeof item !== "object" || Array.isArray(item))) {
      fail("Could not safely inspect local Node.js processes; refusing to bootstrap.");
    }
    return processes;
  } catch {
    fail("Could not safely inspect local Node.js processes; refusing to bootstrap.");
  }
}

/**
 * Ignore unrelated Node.js work, reject a real competing bootstrap, and fail
 * closed whenever a local process cannot be classified. The current process is
 * excluded by PID; the atomic file lock still closes same-user start races.
 */
export function assertNoCompetingBootstrap(nodeProcesses, ownProcessId = process.pid) {
  if (!Array.isArray(nodeProcesses)) {
    fail("Could not safely inspect local Node.js processes; refusing to bootstrap.");
  }

  const competing = [];
  const unknown = [];
  let unrelatedCount = 0;
  for (const item of nodeProcesses) {
    const processId = Number(item?.processId);
    if (!item || typeof item !== "object" || !Number.isSafeInteger(processId) || processId <= 0) {
      unknown.push(item);
      continue;
    }
    if (processId === Number(ownProcessId)) continue;
    if (item.commandLineAccessible !== true || typeof item.isBootstrapCommand !== "boolean") {
      unknown.push(item);
      continue;
    }
    if (item.isBootstrapCommand) competing.push(item);
    else unrelatedCount += 1;
  }

  if (competing.length > 0) {
    fail("A competing Y-TRACE initial Admin bootstrap process is running; refusing to proceed.");
  }
  if (unknown.length > 0) {
    fail("Could not safely classify one or more local Node.js processes; refusing to bootstrap.");
  }
  return { competingCount: 0, unrelatedCount };
}

/** Validate the stricter, read-only preflight for the one-time staging account. */
export function assertBootstrapPreflightState(state) {
  if (!state || typeof state !== "object") fail("Bootstrap preflight state is incomplete.");
  const {
    adminAccounts,
    superAdminRoles,
    authUserCount,
    authIdentityCount,
    adminSessionCount,
    businessRecordCounts,
    bucketsReady,
    localNodeProcesses,
    ownProcessId = process.pid,
    lockPresent,
    journalPresent,
  } = state;

  if (!Array.isArray(adminAccounts) || adminAccounts.length !== 1) {
    fail("Expected exactly one pending synthetic Super Admin account.");
  }
  const account = adminAccounts[0];
  if (account?.username !== "staging-super-admin" ||
      account?.email !== "ytrace-staging-super-admin@example.invalid" ||
      account?.display_name !== "Y-TRACE Staging Super Admin" ||
      account?.is_active !== true || account?.is_password_set !== false ||
      account?.role_id == null) {
    fail("The existing Admin row is not the exact pending staging Super Admin account.");
  }

  if (!Array.isArray(superAdminRoles) || superAdminRoles.length !== 1 ||
      superAdminRoles[0]?.code !== "super_admin" || superAdminRoles[0]?.id !== account.role_id ||
      !Array.isArray(superAdminRoles[0]?.permission_codes) ||
      !superAdminRoles[0].permission_codes.includes("administrators_management") ||
      !superAdminRoles[0].permission_codes.includes("system_settings_manage")) {
    fail("The pending account is not assigned to the existing authorized super_admin role.");
  }

  if (authUserCount !== 0 || authIdentityCount !== 0 || adminSessionCount !== 0) {
    fail("Unexpected staging Auth users, identities, or Admin sessions exist.");
  }
  if (!businessRecordCounts || typeof businessRecordCounts !== "object" || Array.isArray(businessRecordCounts) ||
      Object.keys(businessRecordCounts).length !== BOOTSTRAP_ZERO_BUSINESS_TABLES.length ||
      BOOTSTRAP_ZERO_BUSINESS_TABLES.some((table) => businessRecordCounts[table] !== 0)) {
    fail("Unexpected staging business records exist or a required table count is missing.");
  }
  if (bucketsReady !== true) fail("The staging Storage bucket inventory is not clean and ready.");
  if (lockPresent !== false) fail("A local staging bootstrap lock exists or could not be checked.");
  if (journalPresent !== false) fail("A local bootstrap identity journal exists or could not be checked.");
  const processCheck = assertNoCompetingBootstrap(localNodeProcesses, ownProcessId);

  return {
    pendingSuperAdminCount: 1,
    authUserCount: 0,
    authIdentityCount: 0,
    adminSessionCount: 0,
    businessTableCount: BOOTSTRAP_ZERO_BUSINESS_TABLES.length,
    bucketsReady: true,
    localCompetingBootstrapCount: processCheck.competingCount,
    unrelatedLocalNodeProcessCount: processCheck.unrelatedCount,
    localLockPresent: false,
    identityJournalPresent: false,
  };
}

/**
 * Validate the one Auth identity against its locally recorded ID, exact staging
 * project, and service-controlled bootstrap marker. Supabase Auth writes
 * user_metadata.email_verified=true when its Admin create-user request confirms
 * the email. Accept only that single documented field and only alongside the
 * authoritative confirmed-email timestamp. Never use user_metadata for access
 * control; it is user-editable after a user can sign in.
 */
export function assertBootstrapAuthIdentity(user, {
  expectedProjectRef,
  actualProjectRef,
  expectedUserId,
  expectedEmail,
  expectedMarker,
}) {
  if (expectedProjectRef !== BOOTSTRAP_STAGING_PROJECT_REF ||
      actualProjectRef !== BOOTSTRAP_STAGING_PROJECT_REF ||
      expectedProjectRef !== actualProjectRef) {
    fail("The Auth identity belongs to a different Supabase project.");
  }
  if (!user || typeof user !== "object" || !expectedUserId || user.id !== expectedUserId) {
    fail("The Auth identity does not match the recorded staging user ID.");
  }
  if (String(user.email ?? "").toLowerCase() !== expectedEmail.toLowerCase()) {
    fail("The Auth identity email does not match the synthetic staging account.");
  }
  if (!user.email_confirmed_at && !user.confirmed_at) {
    fail("The synthetic Auth identity is not confirmed.");
  }
  if (user.is_anonymous === true || user.deleted_at || user.is_sso_user === true ||
      (Array.isArray(user.factors) && user.factors.length > 0)) {
    fail("The Auth identity is not in the expected active lifecycle state.");
  }
  if (user.banned_until) {
    const bannedUntil = Date.parse(user.banned_until);
    if (!Number.isFinite(bannedUntil) || bannedUntil > Date.now()) {
      fail("The Auth identity is not in the expected active lifecycle state.");
    }
  }

  if (!Array.isArray(user.identities) || user.identities.length !== 1 ||
      user.identities[0]?.provider !== "email" || user.identities[0]?.user_id !== user.id) {
    fail("The Auth identity has unexpected linked sign-in identities.");
  }

  const appMetadata = metadataObject(user.app_metadata);
  const userMetadata = metadataObject(user.user_metadata);
  if (appMetadata.ytrace_bootstrap !== expectedMarker) {
    fail("The Auth identity bootstrap marker does not match.");
  }
  if (Object.keys(appMetadata).some((key) => !STANDARD_EMAIL_APP_METADATA_KEYS.has(key))) {
    fail("The Auth identity has unrecognized app metadata.");
  }
  if (Object.hasOwn(appMetadata, "provider") && appMetadata.provider !== "email") {
    fail("The Auth identity has an unexpected provider.");
  }
  if (Object.hasOwn(appMetadata, "providers") &&
      (!Array.isArray(appMetadata.providers) || appMetadata.providers.length !== 1 || appMetadata.providers[0] !== "email")) {
    fail("The Auth identity has unexpected provider metadata.");
  }
  if (Object.keys(userMetadata).some((key) => !STANDARD_EMAIL_USER_METADATA_KEYS.has(key)) ||
      Object.keys(userMetadata).length !== 1 || userMetadata.email_verified !== true) {
    fail("The Auth identity has unexpected user metadata.");
  }
  return user;
}

/**
 * Auth Admin list endpoints may omit linked identity details. Before recovery,
 * fetch the exact listed user's detail record and require its ID/email to match
 * the inventory row, then apply the unchanged strict identity guard.
 */
export function assertBootstrapAuthUserDetailsMatch(listedUser, detailedUser, identityOptions) {
  if (!listedUser || !detailedUser || typeof listedUser !== "object" || typeof detailedUser !== "object" ||
      !listedUser.id || listedUser.id !== detailedUser.id ||
      String(listedUser.email ?? "").toLowerCase() !== String(detailedUser.email ?? "").toLowerCase()) {
    fail("The detailed Auth identity does not match the staging Auth inventory.");
  }
  return assertBootstrapAuthIdentity(detailedUser, identityOptions);
}

/** Synchronous by design: inventory validation cannot accidentally return a truthy Promise. */
export function findRecordedBootstrapAuthUser(users, identityOptions) {
  if (!Array.isArray(users)) fail("Could not verify the staging Auth-user inventory.");
  if (users.length === 0) return null;
  if (users.length !== 1) fail("Unexpected staging Auth users exist; refusing to alter any identity.");
  if (!identityOptions?.expectedUserId) {
    fail("An Auth identity exists without a recorded staging user ID; manual review is required.");
  }
  return assertBootstrapAuthIdentity(users[0], identityOptions);
}

/** Create a fresh identity or recover only the exact identity recorded locally. */
export async function prepareBootstrapAuthIdentity({
  users,
  identityOptions,
  authAdmin,
  makeTemporaryPassword,
  recordUserId,
  reuseOnly = false,
}) {
  if (!Array.isArray(users)) fail("Could not verify the staging Auth-user inventory.");
  if (users.length > 1) fail("Unexpected staging Auth users exist; refusing to alter any identity.");
  if (reuseOnly && (users.length !== 1 || !identityOptions?.expectedUserId)) {
    fail("Controlled continuation requires the existing journal-recorded Auth identity.");
  }

  const temporaryPassword = makeTemporaryPassword();
  if (users.length === 0) {
    if (identityOptions.expectedUserId) {
      fail("The recorded staging Auth identity is missing; refusing to create a replacement.");
    }
    const created = await authAdmin.createUser({
      email: identityOptions.expectedEmail,
      password: temporaryPassword,
      email_confirm: true,
      app_metadata: { ytrace_bootstrap: identityOptions.expectedMarker },
    });
    if (created.error || !created.data?.user?.id) {
      fail("Could not create the pre-confirmed synthetic staging Auth identity.");
    }
    // Record the server-returned ID immediately. If later metadata validation
    // fails, the next run still cannot adopt or delete another user's account.
    await recordUserId(created.data.user.id);
    const identity = assertBootstrapAuthIdentity(created.data.user, {
      ...identityOptions,
      expectedUserId: created.data.user.id,
    });
    return { user: identity, temporaryPassword, created: true };
  }

  const identity = findRecordedBootstrapAuthUser(users, identityOptions);
  const rotated = await authAdmin.updateUserById(identity.id, { password: temporaryPassword });
  if (rotated.error) fail("Could not rotate the recorded synthetic temporary Auth password.");
  return { user: identity, temporaryPassword, created: false };
}

export async function activateAndCleanupBootstrapIdentity({
  userClient,
  user,
  expectedUserId,
  username,
  adminAccountId,
  email,
  temporaryPassword,
  adminPassword,
  verifyNormalAdminLogin,
  assertCleanupEligibility,
  cleanup,
  onStep = () => {},
}) {
  if (typeof verifyNormalAdminLogin !== "function" || typeof assertCleanupEligibility !== "function" || typeof cleanup !== "function") {
    fail("Required post-activation safety checks were not supplied.");
  }
  let activationError;
  try {
    const login = await userClient.auth.signInWithPassword({ email, password: temporaryPassword });
    if (login.error || login.data?.user?.id !== expectedUserId) {
      fail("The synthetic identity could not establish the Auth session needed for password activation.");
    }
    onStep("Existing temporary Auth identity authentication");
    const activation = await userClient.rpc("set_initial_admin_password", { _new_password: adminPassword });
    const row = Array.isArray(activation.data) ? activation.data[0] : null;
    if (activation.error || row?.username !== username || row?.id !== adminAccountId) {
      fail("The existing set_initial_admin_password activation flow failed for the expected staging account.");
    }
    onStep("Admin password activation through set_initial_admin_password");
  } catch (error) {
    activationError = error instanceof Error ? error : new Error("Staging password activation failed.");
  }

  if (!activationError) {
    try {
      await verifyNormalAdminLogin();
      await assertCleanupEligibility(user);
    } catch (error) {
      activationError = error instanceof Error ? error : new Error("Post-activation safety checks failed.");
    }
  }

  // Always revoke the temporary Auth session before deciding whether the caller
  // may proceed to deletion. A failed login, permission, eligibility, or revoke
  // check leaves the recorded identity available for manual recovery.
  // This Auth identity is created solely for initial password activation.
  // Revoke its server-side refresh sessions before deleting it; local-only
  // sign-out would clear this client while leaving refresh tokens usable.
  const signedOut = await userClient.auth.signOut({ scope: "global" });
  if (signedOut.error) fail("Could not end the temporary synthetic Auth session.");
  onStep("Temporary Auth global session revocation");
  if (activationError) throw activationError;
  await cleanup(user);
  onStep("Exact recorded temporary Auth identity deletion");
}

export async function removeVerifiedBootstrapAuthIdentity({
  user,
  identityOptions,
  assertNoAssociations,
  deleteUser,
}) {
  assertBootstrapAuthIdentity(user, identityOptions);
  await assertNoAssociations(user.id);
  const result = await deleteUser(user.id);
  if (result?.error) fail("Could not remove the verified synthetic staging Auth identity.");
}

/**
 * Cross-process lock for this Windows user and staging project. A stale lock is
 * deliberately not auto-removed: confirm no bootstrap process is running first.
 */
export async function withExclusiveBootstrapLock(lockPath, callback) {
  await mkdir(dirname(lockPath), { recursive: true });
  let lock;
  try {
    lock = await open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code === "EEXIST") fail("Another staging Admin bootstrap is already running or left a lock for manual review.");
    throw error;
  }

  try {
    await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
    return await callback();
  } finally {
    await lock.close();
    await unlink(lockPath).catch((error) => {
      if (error?.code !== "ENOENT") throw error;
    });
  }
}

/** The journal stores only a staging Auth UUID and identity labels, never secrets. */
export async function readBootstrapIdentityJournal(filePath, expectedContext) {
  let raw;
  try {
    raw = await readFile(filePath, "utf8");
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
  let state;
  try { state = JSON.parse(raw); } catch { fail("The local staging bootstrap journal is malformed; manual review is required."); }
  if (state?.projectRef !== expectedContext.projectRef ||
      state?.email !== expectedContext.email ||
      state?.marker !== expectedContext.marker ||
      typeof state?.userId !== "string" || !state.userId) {
    fail("The local staging bootstrap journal does not match this project and synthetic identity.");
  }
  return state;
}

export async function writeBootstrapIdentityJournal(filePath, context, userId) {
  if (typeof userId !== "string" || !userId) fail("Cannot record an invalid staging Auth user ID.");
  await mkdir(dirname(filePath), { recursive: true });
  const state = { ...context, userId };
  let handle;
  try {
    handle = await open(filePath, "wx", 0o600);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    const existing = await readBootstrapIdentityJournal(filePath, context);
    if (existing.userId === userId) return;
    fail("A different Auth user ID is already recorded for this staging bootstrap.");
  }
  try {
    await handle.writeFile(JSON.stringify(state, null, 2), "utf8");
  } finally {
    await handle.close();
  }
}

export async function clearBootstrapIdentityJournal(filePath, context, expectedUserId) {
  const current = await readBootstrapIdentityJournal(filePath, context);
  if (!current) return;
  if (current.userId !== expectedUserId) fail("Refusing to clear a journal for a different Auth user ID.");
  await unlink(filePath);
}
