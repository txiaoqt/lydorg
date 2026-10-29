import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  activateAndCleanupBootstrapIdentity,
  assertBootstrapPreflightState,
  assertNoCompetingBootstrap,
  assertBootstrapAuthIdentity,
  assertBootstrapAuthUserDetailsMatch,
  BOOTSTRAP_ZERO_BUSINESS_TABLES,
  clearBootstrapIdentityJournal,
  findRecordedBootstrapAuthUser,
  inspectWindowsNodeProcessInventory,
  prepareBootstrapAuthIdentity,
  readBootstrapIdentityJournal,
  removeVerifiedBootstrapAuthIdentity,
  withExclusiveBootstrapLock,
  writeBootstrapIdentityJournal,
} from "./bootstrap-initial-super-admin-safety.mjs";

const context = {
  expectedProjectRef: "zroudsvpswqsjlyttkjf",
  actualProjectRef: "zroudsvpswqsjlyttkjf",
  expectedUserId: "staging-auth-user-id",
  expectedEmail: "ytrace-staging-super-admin@example.invalid",
  expectedMarker: "ytrace-initial-super-admin-v1",
};

function pendingBootstrapPreflight(overrides = {}) {
  return {
    adminAccounts: [{
      username: "staging-super-admin",
      email: "ytrace-staging-super-admin@example.invalid",
      display_name: "Y-TRACE Staging Super Admin",
      is_active: true,
      is_password_set: false,
      role_id: "super-admin-role-id",
    }],
    superAdminRoles: [{
      id: "super-admin-role-id",
      code: "super_admin",
      permission_codes: ["administrators_management", "system_settings_manage"],
    }],
    authUserCount: 0,
    authIdentityCount: 0,
    adminSessionCount: 0,
    businessRecordCounts: Object.fromEntries(BOOTSTRAP_ZERO_BUSINESS_TABLES.map((table) => [table, 0])),
    bucketsReady: true,
    localNodeProcesses: [],
    ownProcessId: 999,
    lockPresent: false,
    journalPresent: false,
    ...overrides,
  };
}

function authUser(overrides = {}) {
  return {
    id: context.expectedUserId,
    email: context.expectedEmail,
    email_confirmed_at: "2026-10-10T00:00:00.000Z",
    app_metadata: {
      provider: "email",
      providers: ["email"],
      ytrace_bootstrap: context.expectedMarker,
    },
    identities: [{ id: "email-identity-id", identity_id: "email-identity-id", user_id: context.expectedUserId, provider: "email" }],
    // GoTrue's Admin create-user flow writes email_verified=true when
    // email_confirm is requested; the bootstrap request itself omits this.
    user_metadata: { email_verified: true },
    ...overrides,
  };
}

test("accepts the expected marker and documented email-provider app metadata", () => {
  assert.equal(assertBootstrapAuthIdentity(authUser(), context).id, context.expectedUserId);
});

test("continuation-only preparation never creates an identity when recovery state is absent", async () => {
  let writes = 0;
  const options = {
    reuseOnly: true, users: [], identityOptions: context,
    authAdmin: { createUser: async () => { writes += 1; }, updateUserById: async () => { writes += 1; } },
    makeTemporaryPassword: () => { writes += 1; return "unused"; },
    recordUserId: async () => { writes += 1; },
  };
  await assert.rejects(prepareBootstrapAuthIdentity(options), /requires the existing journal-recorded/);
  await assert.rejects(prepareBootstrapAuthIdentity({ ...options, users: [authUser()], identityOptions: { ...context, expectedUserId: undefined } }), /requires the existing journal-recorded/);
  assert.equal(writes, 0);
});

test("continuation-only preparation reuses exactly the verified existing identity", async () => {
  const updated = [];
  const result = await prepareBootstrapAuthIdentity({
    reuseOnly: true, users: [authUser()], identityOptions: context,
    authAdmin: {
      createUser: async () => { assert.fail("must never create another identity"); },
      updateUserById: async (id) => { updated.push(id); return { error: null }; },
    },
    makeTemporaryPassword: () => "synthetic-test-only-temporary-password",
    recordUserId: async () => { assert.fail("must not overwrite recovery evidence"); },
  });
  assert.equal(result.created, false);
  assert.deepEqual(updated, [context.expectedUserId]);
});

test("uses a full Auth detail record when the user inventory omits identities", () => {
  const detailed = authUser();
  const listed = { ...detailed };
  delete listed.identities;
  assert.equal(assertBootstrapAuthUserDetailsMatch(listed, detailed, context).id, context.expectedUserId);
  assert.throws(() => assertBootstrapAuthUserDetailsMatch(listed, authUser({ id: "different-user-id" }), context), /does not match the staging Auth inventory/);
  assert.throws(() => assertBootstrapAuthUserDetailsMatch({ ...listed, email: "other@example.invalid" }, detailed, context), /does not match the staging Auth inventory/);
  assert.throws(() => assertBootstrapAuthUserDetailsMatch(listed, authUser({ identities: [] }), context), /unexpected linked sign-in identities/);
});

test("accepts an empty app-metadata provider envelope with the exact marker", () => {
  assert.doesNotThrow(() => assertBootstrapAuthIdentity(authUser({
    app_metadata: { ytrace_bootstrap: context.expectedMarker },
  }), context));
});

test("accepts only Supabase's generated email_verified user metadata", () => {
  assert.doesNotThrow(() => assertBootstrapAuthIdentity(authUser({
    user_metadata: { email_verified: true },
  }), context));
  assert.throws(() => assertBootstrapAuthIdentity(authUser({ user_metadata: {} }), context), /user metadata/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({ user_metadata: { email_verified: false } }), context), /user metadata/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({ email_confirmed_at: null, confirmed_at: null }), context), /not confirmed/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    user_metadata: { email_verified: true, phone_verified: false },
  }), context), /user metadata/);
});

test("rejects wrong project, wrong email, missing marker, and mismatched recorded ID", () => {
  assert.throws(() => assertBootstrapAuthIdentity(authUser(), {
    ...context,
    actualProjectRef: "mqqaykksadotbrghbexz",
  }), /different Supabase project/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser(), {
    ...context,
    expectedProjectRef: "mqqaykksadotbrghbexz",
    actualProjectRef: "mqqaykksadotbrghbexz",
  }), /different Supabase project/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser(), {
    ...context,
    expectedEmail: "other@example.invalid",
  }), /email does not match/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({ app_metadata: {
    provider: "email",
    providers: ["email"],
  } }), context), /bootstrap marker/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser(), {
    ...context,
    expectedUserId: "different-recorded-id",
  }), /recorded staging user ID/);
});

test("requires exactly one matching email identity", () => {
  assert.throws(() => assertBootstrapAuthIdentity(authUser({ identities: [
    ...authUser().identities,
    { id: "second-id", user_id: context.expectedUserId, provider: "google" },
  ] }), context), /linked sign-in identities/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({ identities: undefined }), context), /linked sign-in identities/);
});

test("rejects an unrecognized bootstrap identity and unsafe metadata", () => {
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    app_metadata: { ytrace_bootstrap: "other-marker" },
  }), context), /marker/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    user_metadata: { full_name: "unexpected" },
  }), context), /user metadata/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    app_metadata: { ...authUser().app_metadata, provider: "google" },
  }), context), /unexpected provider/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    app_metadata: { ...authUser().app_metadata, unexpected: true },
  }), context), /unrecognized app metadata/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    app_metadata: { ...authUser().app_metadata, role: "super_admin" },
  }), context), /unrecognized app metadata/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    app_metadata: { ...authUser().app_metadata, permissions: ["administrators_management"] },
  }), context), /unrecognized app metadata/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({ user_metadata: "invalid" }), context), /invalid shape/);
  assert.throws(() => assertBootstrapAuthIdentity(authUser({
    identities: [{ id: "linked-id", identity_id: "linked-id", user_id: context.expectedUserId, provider: "google" }],
  }), context), /linked sign-in identities/);
});

test("accepts exactly the pending staging Super Admin and empty operational baseline", () => {
  assert.deepEqual(assertBootstrapPreflightState(pendingBootstrapPreflight()), {
    pendingSuperAdminCount: 1,
    authUserCount: 0,
    authIdentityCount: 0,
    adminSessionCount: 0,
    businessTableCount: BOOTSTRAP_ZERO_BUSINESS_TABLES.length,
    bucketsReady: true,
    localCompetingBootstrapCount: 0,
    unrelatedLocalNodeProcessCount: 0,
    localLockPresent: false,
    identityJournalPresent: false,
  });
});

test("matches the existing role when its database ID is numeric", () => {
  const state = pendingBootstrapPreflight();
  state.adminAccounts[0].role_id = 7;
  state.superAdminRoles[0].id = 7;
  assert.equal(assertBootstrapPreflightState(state).pendingSuperAdminCount, 1);
});

test("bootstrap preflight rejects extra or activated Admin accounts", () => {
  assert.throws(() => assertBootstrapPreflightState(pendingBootstrapPreflight({
    adminAccounts: [
      ...pendingBootstrapPreflight().adminAccounts,
      { ...pendingBootstrapPreflight().adminAccounts[0], username: "unexpected-admin" },
    ],
  })), /exactly one pending synthetic Super Admin/);
  assert.throws(() => assertBootstrapPreflightState(pendingBootstrapPreflight({
    adminAccounts: [{ ...pendingBootstrapPreflight().adminAccounts[0], is_password_set: true }],
  })), /not the exact pending staging Super Admin/);
});

test("bootstrap preflight rejects a mismatched super_admin role assignment", () => {
  assert.throws(() => assertBootstrapPreflightState(pendingBootstrapPreflight({
    superAdminRoles: [{
      id: "different-role-id",
      code: "super_admin",
      permission_codes: ["administrators_management", "system_settings_manage"],
    }],
  })), /not assigned to the existing authorized super_admin role/);
});

test("bootstrap preflight requires zero Auth, session, and business records", () => {
  for (const [key, value] of [
    ["authUserCount", 1],
    ["authIdentityCount", 1],
    ["adminSessionCount", 1],
    ["businessRecordCounts", { ...pendingBootstrapPreflight().businessRecordCounts, organizations: 1 }],
    ["businessRecordCounts", Object.fromEntries(BOOTSTRAP_ZERO_BUSINESS_TABLES.slice(1).map((table) => [table, 0]))],
  ]) {
    assert.throws(() => assertBootstrapPreflightState(pendingBootstrapPreflight({ [key]: value })));
  }
});

test("bootstrap preflight refuses Storage drift, a local lock, a journal, or a competing script", () => {
  for (const overrides of [
    { bucketsReady: false },
    { lockPresent: true },
    { journalPresent: true },
    { localNodeProcesses: [{ processId: 222, commandLineAccessible: true, isBootstrapCommand: true }] },
  ]) {
    assert.throws(() => assertBootstrapPreflightState(pendingBootstrapPreflight(overrides)));
  }
});

test("classifies multiple unrelated Node.js processes as safe", () => {
  const processes = [
    { processId: 101, parentProcessId: 1, startTime: "2026-10-10T10:00:00.000Z", executablePath: "C:\\Program Files\\nodejs\\node.exe", commandLineAccessible: true, isBootstrapCommand: false },
    { processId: 102, parentProcessId: 1, startTime: "2026-10-10T10:01:00.000Z", executablePath: "C:\\Program Files\\nodejs\\node.exe", commandLineAccessible: true, isBootstrapCommand: false },
    { processId: 103, parentProcessId: 1, startTime: "2026-10-10T10:02:00.000Z", executablePath: "C:\\Codex\\cua_node\\node.exe", commandLineAccessible: true, isBootstrapCommand: false },
  ];
  assert.deepEqual(assertNoCompetingBootstrap(processes, 999), { competingCount: 0, unrelatedCount: 3 });
});

test("blocks one process invoking the staging bootstrap", () => {
  assert.throws(() => assertNoCompetingBootstrap([
    { processId: 101, parentProcessId: 1, startTime: "2026-10-10T10:00:00.000Z", executablePath: "C:\\Program Files\\nodejs\\node.exe", commandLineAccessible: true, isBootstrapCommand: true },
  ], 999), /competing Y-TRACE initial Admin bootstrap/);
});

test("fails closed when a Node.js command line is inaccessible", () => {
  assert.throws(() => assertNoCompetingBootstrap([
    { processId: 101, parentProcessId: 1, startTime: null, executablePath: null, commandLineAccessible: false, isBootstrapCommand: null },
  ], 999), /safely classify/);
});

test("does not classify the current bootstrap process as a competitor", () => {
  assert.deepEqual(assertNoCompetingBootstrap([
    { processId: 999, parentProcessId: 1, startTime: null, executablePath: null, commandLineAccessible: false, isBootstrapCommand: null },
  ], 999), { competingCount: 0, unrelatedCount: 0 });
});

test("process inspection fails closed when the Windows inventory is unavailable", () => {
  assert.throws(() => inspectWindowsNodeProcessInventory({
    platform: "win32",
    run: () => ({ error: new Error("unavailable"), status: null, stdout: "" }),
  }), /safely inspect local Node.js processes/);
});

test("rejects an ID mismatch and duplicate Auth users before any mutation", () => {
  assert.throws(() => findRecordedBootstrapAuthUser([authUser()], {
    ...context,
    expectedUserId: "different-recorded-id",
  }), /recorded staging user ID/);
  assert.throws(() => findRecordedBootstrapAuthUser([authUser(), authUser({ id: "second-id" })], context), /Unexpected staging Auth users/);
});

test("missing Auth identity returns null from read-only inventory validation", () => {
  assert.equal(findRecordedBootstrapAuthUser([], context), null);
});

test("missing journal refuses to adopt an existing Auth identity", () => {
  const { expectedUserId: _discarded, ...withoutId } = context;
  assert.throws(() => findRecordedBootstrapAuthUser([authUser()], withoutId), /without a recorded staging user ID/);
});

test("fresh creation records the returned user ID before returning the identity", async () => {
  const events = [];
  const createdUser = authUser({ app_metadata: { ytrace_bootstrap: context.expectedMarker } });
  const result = await prepareBootstrapAuthIdentity({
    users: [],
    identityOptions: { ...context, expectedUserId: null },
    authAdmin: {
      async createUser(options) {
        events.push("create");
        assert.equal(options.email, context.expectedEmail);
        assert.equal(options.email_confirm, true);
        assert.equal(options.app_metadata.ytrace_bootstrap, context.expectedMarker);
        assert.equal(Object.hasOwn(options, "user_metadata"), false);
        return { data: { user: createdUser }, error: null };
      },
      async updateUserById() { assert.fail("fresh creation must not rotate a user"); },
    },
    makeTemporaryPassword: () => "ephemeral-test-password",
    async recordUserId(id) { events.push(`record:${id}`); },
  });
  assert.deepEqual(events, ["create", `record:${context.expectedUserId}`]);
  assert.equal(result.created, true);
  assert.equal(result.user.id, context.expectedUserId);
});

test("a failed createUser response stops before recording or cleanup", async () => {
  let recordCalled = false;
  await assert.rejects(prepareBootstrapAuthIdentity({
    users: [],
    identityOptions: { ...context, expectedUserId: null },
    authAdmin: { async createUser() { return { data: { user: null }, error: { message: "redacted" } }; } },
    makeTemporaryPassword: () => "ephemeral-test-password",
    async recordUserId() { recordCalled = true; },
  }), /Could not create the pre-confirmed/);
  assert.equal(recordCalled, false);
});

test("a created user with unexpected metadata is journaled but not activated or deleted", async () => {
  const events = [];
  const badUser = authUser({ user_metadata: { unexpected: true } });
  await assert.rejects(prepareBootstrapAuthIdentity({
    users: [],
    identityOptions: { ...context, expectedUserId: null },
    authAdmin: { async createUser() { events.push("create"); return { data: { user: badUser }, error: null }; } },
    makeTemporaryPassword: () => "ephemeral-test-password",
    async recordUserId(id) { events.push(`record:${id}`); },
  }), /unexpected user metadata/);
  assert.deepEqual(events, ["create", `record:${context.expectedUserId}`]);
});

test("retries an interrupted bootstrap only for the exact recorded identity", async () => {
  let rotatedId = null;
  let created = false;
  const result = await prepareBootstrapAuthIdentity({
    users: [authUser()],
    identityOptions: context,
    authAdmin: {
      async createUser() { created = true; throw new Error("must not create duplicate"); },
      async updateUserById(id, attributes) {
        rotatedId = id;
        assert.equal(attributes.password, "new-ephemeral-password");
        return { data: { user: authUser() }, error: null };
      },
    },
    makeTemporaryPassword: () => "new-ephemeral-password",
    async recordUserId() { assert.fail("recovery must not rewrite the recorded ID"); },
  });
  assert.equal(result.created, false);
  assert.equal(rotatedId, context.expectedUserId);
  assert.equal(created, false);

  await assert.rejects(prepareBootstrapAuthIdentity({
    users: [authUser()],
    identityOptions: { ...context, expectedUserId: "wrong-id" },
    authAdmin: { async updateUserById() { assert.fail("mismatched identity must not be mutated"); } },
    makeTemporaryPassword: () => "unused",
    async recordUserId() {},
  }), /recorded staging user ID/);
});

test("activation failure signs out and never calls cleanup", async () => {
  const calls = [];
  const passwords = {};
  await assert.rejects(activateAndCleanupBootstrapIdentity({
    userClient: {
      auth: {
        async signInWithPassword({ password }) { calls.push("sign-in"); passwords.temporary = password; return { data: { user: { id: context.expectedUserId } }, error: null }; },
        async signOut(options) { assert.deepEqual(options, { scope: "global" }); calls.push("sign-out"); return { error: null }; },
      },
      async rpc(name, args) {
        calls.push(name);
        passwords.admin = args._new_password;
        return { data: null, error: { message: "redacted" } };
      },
    },
    user: authUser(),
    expectedUserId: context.expectedUserId,
    username: "staging-super-admin",
    adminAccountId: "pending-admin-row",
    email: context.expectedEmail,
    temporaryPassword: "temporary-test-password",
    adminPassword: "admin-test-password",
    async verifyNormalAdminLogin() { calls.push("verify-admin-login"); },
    async assertCleanupEligibility(user) { assert.equal(user.id, context.expectedUserId); calls.push("cleanup-eligibility"); },
    async cleanup() { calls.push("cleanup"); },
  }), /set_initial_admin_password activation flow failed/);
  assert.deepEqual(calls, ["sign-in", "set_initial_admin_password", "sign-out"]);
  assert.equal(passwords.temporary, "temporary-test-password");
  assert.equal(passwords.admin, "admin-test-password");
});

test("cleanup starts only after activation, Admin verification, eligibility checks, and temporary-session revocation", async () => {
  const calls = [];
  await activateAndCleanupBootstrapIdentity({
    userClient: {
      auth: {
        async signInWithPassword({ password }) {
          calls.push(`sign-in:${password}`);
          return { data: { user: { id: context.expectedUserId } }, error: null };
        },
        async signOut(options) { assert.deepEqual(options, { scope: "global" }); calls.push("sign-out"); return { error: null }; },
      },
      async rpc(name, args) {
        calls.push(`${name}:${args._new_password}`);
        return { data: [{ username: "staging-super-admin", id: "pending-admin-row" }], error: null };
      },
    },
    user: authUser(),
    expectedUserId: context.expectedUserId,
    username: "staging-super-admin",
    adminAccountId: "pending-admin-row",
    email: context.expectedEmail,
    temporaryPassword: "temporary-test-password",
    adminPassword: "admin-test-password",
    async verifyNormalAdminLogin() { calls.push("verify-admin-login"); },
    async assertCleanupEligibility(user) { assert.equal(user.id, context.expectedUserId); calls.push("cleanup-eligibility"); },
    async cleanup() { calls.push("cleanup"); },
  });
  assert.deepEqual(calls, [
    "sign-in:temporary-test-password",
    "set_initial_admin_password:admin-test-password",
    "verify-admin-login",
    "cleanup-eligibility",
    "sign-out",
    "cleanup",
  ]);
});

test("post-activation verification failure revokes the temporary session and preserves identity for recovery", async () => {
  const calls = [];
  await assert.rejects(activateAndCleanupBootstrapIdentity({
    userClient: {
      auth: {
        async signInWithPassword() { calls.push("sign-in"); return { data: { user: { id: context.expectedUserId } }, error: null }; },
        async signOut(options) { assert.deepEqual(options, { scope: "global" }); calls.push("sign-out"); return { error: null }; },
      },
      async rpc() { calls.push("activate"); return { data: [{ username: "staging-super-admin", id: "pending-admin-row" }], error: null }; },
    },
    user: authUser(),
    expectedUserId: context.expectedUserId,
    username: "staging-super-admin",
    adminAccountId: "pending-admin-row",
    email: context.expectedEmail,
    temporaryPassword: "temporary-test-password",
    adminPassword: "admin-test-password",
    async verifyNormalAdminLogin() { calls.push("verify-admin-login"); throw new Error("verification rejected"); },
    async assertCleanupEligibility() { calls.push("cleanup-eligibility"); },
    async cleanup() { calls.push("cleanup"); },
  }), /verification rejected/);
  assert.deepEqual(calls, ["sign-in", "activate", "verify-admin-login", "sign-out"]);
});

test("cleanup rejection and identity mismatch fail before deleteUser", async () => {
  let deleteCalled = false;
  await assert.rejects(removeVerifiedBootstrapAuthIdentity({
    user: authUser(),
    identityOptions: { ...context, expectedUserId: "other-id" },
    async assertNoAssociations() { assert.fail("identity guard runs first"); },
    async deleteUser() { deleteCalled = true; return { error: null }; },
  }), /recorded staging user ID/);
  await assert.rejects(removeVerifiedBootstrapAuthIdentity({
    user: authUser({ app_metadata: { ytrace_bootstrap: "unrecognized-marker" } }),
    identityOptions: context,
    async assertNoAssociations() { assert.fail("metadata guard runs first"); },
    async deleteUser() { deleteCalled = true; return { error: null }; },
  }), /bootstrap marker/);
  await assert.rejects(removeVerifiedBootstrapAuthIdentity({
    user: authUser(),
    identityOptions: context,
    async assertNoAssociations() { throw new Error("associated data guard"); },
    async deleteUser() { deleteCalled = true; return { error: null }; },
  }), /associated data guard/);
  assert.equal(deleteCalled, false);
});

test("existing organization ownership blocks temporary identity cleanup", async () => {
  let deleteCalled = false;
  await assert.rejects(removeVerifiedBootstrapAuthIdentity({
    user: authUser(),
    identityOptions: context,
    async assertNoAssociations(userId) {
      assert.equal(userId, context.expectedUserId);
      const organizationProfileCount = 1;
      if (organizationProfileCount !== 0) throw new Error("The shadow identity is associated with organization data; refusing cleanup.");
    },
    async deleteUser() { deleteCalled = true; return { error: null }; },
  }), /associated with organization data/);
  assert.equal(deleteCalled, false);
});

test("cleanup deletes only after identity and association guards pass", async () => {
  let deletedId = null;
  await removeVerifiedBootstrapAuthIdentity({
    user: authUser(),
    identityOptions: context,
    async assertNoAssociations(id) { assert.equal(id, context.expectedUserId); },
    async deleteUser(id) { deletedId = id; return { error: null }; },
  });
  assert.equal(deletedId, context.expectedUserId);
  await assert.rejects(removeVerifiedBootstrapAuthIdentity({
    user: authUser(),
    identityOptions: context,
    async assertNoAssociations() {},
    async deleteUser() { return { error: { message: "redacted" } }; },
  }), /Could not remove the verified synthetic staging Auth identity/);
});

test("journal stores and clears only the same staging identity", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ytrace-bootstrap-test-"));
  const file = join(dir, "identity.json");
  const journalContext = { projectRef: "zroudsvpswqsjlyttkjf", email: context.expectedEmail, marker: context.expectedMarker };
  try {
    await writeBootstrapIdentityJournal(file, journalContext, context.expectedUserId);
    assert.deepEqual(await readBootstrapIdentityJournal(file, journalContext), { ...journalContext, userId: context.expectedUserId });
    await assert.rejects(clearBootstrapIdentityJournal(file, journalContext, "different-id"), /different Auth user ID/);
    await clearBootstrapIdentityJournal(file, journalContext, context.expectedUserId);
    assert.equal(await readBootstrapIdentityJournal(file, journalContext), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("same-script concurrent invocations are serialized by the local staging lock", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ytrace-bootstrap-lock-test-"));
  const lockPath = join(dir, "bootstrap.lock");
  let releaseFirst;
  let markEntered;
  const firstEntered = new Promise((resolve) => { markEntered = resolve; });
  const gate = new Promise((resolve) => { releaseFirst = resolve; });
  const first = withExclusiveBootstrapLock(lockPath, async () => {
    markEntered();
    await gate;
    return "completed";
  });
  try {
    await firstEntered;
    await assert.rejects(withExclusiveBootstrapLock(lockPath, async () => "must-not-run"), /already running/);
    releaseFirst();
    assert.equal(await first, "completed");
  } finally {
    releaseFirst();
    await rm(dir, { recursive: true, force: true });
  }
});

test("a stale lock is preserved and blocks startup", async () => {
  const dir = await mkdtemp(join(tmpdir(), "ytrace-bootstrap-stale-lock-test-"));
  const lockPath = join(dir, "bootstrap.lock");
  const staleLock = JSON.stringify({ pid: 45678, startedAt: "2026-10-09T00:00:00.000Z" });
  try {
    await writeFile(lockPath, staleLock, "utf8");
    await assert.rejects(withExclusiveBootstrapLock(lockPath, async () => "must-not-run"), /already running/);
    assert.equal(await readFile(lockPath, "utf8"), staleLock);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
