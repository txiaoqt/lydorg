import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import * as fs from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { readBootstrapIdentityJournal, withExclusiveBootstrapLock } from "./bootstrap-initial-super-admin-safety.mjs";
import {
  inspectBootstrapStatePaths,
  STAGING_BOOTSTRAP_STATE_DIR_NAME,
} from "./bootstrap-initial-super-admin-state-paths.mjs";

const JOURNAL_CONTEXT = {
  projectRef: "zroudsvpswqsjlyttkjf",
  email: "ytrace-staging-super-admin@example.invalid",
  marker: "ytrace-initial-super-admin-v1",
};

function journal(userId = "recorded-synthetic-user-id", marker = JOURNAL_CONTEXT.marker) {
  return JSON.stringify({ ...JOURNAL_CONTEXT, marker, userId });
}

async function sandbox() {
  const root = await mkdtemp(join(tmpdir(), "ytrace-bootstrap-path-test-"));
  const profileDirectory = join(root, "profile");
  const processTempDirectory = join(root, "process-temp");
  const canonicalDirectory = resolve(profileDirectory, "AppData", "Local", "Temp", STAGING_BOOTSTRAP_STATE_DIR_NAME);
  const alternateDirectory = resolve(processTempDirectory, STAGING_BOOTSTRAP_STATE_DIR_NAME);
  await mkdir(dirname(canonicalDirectory), { recursive: true });
  await mkdir(processTempDirectory, { recursive: true });
  return {
    root,
    profileDirectory,
    processTempDirectory,
    canonicalDirectory,
    alternateDirectory,
    inspect(options = {}) {
      return inspectBootstrapStatePaths({
        profileDirectory,
        processTempDirectory,
        ...options,
      });
    },
    async dispose() {
      await rm(root, { recursive: true, force: true });
    },
  };
}

test("the canonical state path is stable when TMP/TEMP select a different directory", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal());
    const result = box.inspect({ processTempDirectory: join(box.root, "other-temp-root") });
    assert.equal(result.safe, true);
    assert.equal(result.stateDirectory, box.canonicalDirectory);
    assert.equal(result.alternateHasState, false);
    assert.equal(result.relation, "alternate-has-no-state");
  } finally {
    await box.dispose();
  }
});

test("case-variant Windows paths are reconciled by physical directory identity", async (t) => {
  if (process.platform !== "win32") return t.skip("Windows filesystem identity required");
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal());
    const caseVariantParent = dirname(box.canonicalDirectory).toUpperCase();
    const result = box.inspect({ processTempDirectory: caseVariantParent });
    assert.equal(result.safe, true);
    assert.equal(result.stateDirectory, box.canonicalDirectory);
    assert.equal(result.relation, "physical-alias");
    assert.equal(result.journalRelation, "single-physical-journal");
  } finally {
    await box.dispose();
  }
});

test("a mocked Windows junction alias points to one physical journal", async () => {
  const box = await sandbox();
  const junctionParent = join(box.root, "junction-temp");
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal());
    const aliasDirectory = resolve(junctionParent, STAGING_BOOTSTRAP_STATE_DIR_NAME);
    const aliasJournal = join(aliasDirectory, "auth-identity.json");
    const fileSystem = {
      lstatSync(filePath) {
        const candidate = resolve(filePath);
        if (candidate === aliasDirectory) return fs.lstatSync(box.canonicalDirectory);
        if (candidate === aliasJournal) return fs.lstatSync(join(box.canonicalDirectory, "auth-identity.json"));
        return fs.lstatSync(filePath);
      },
      statSync(filePath, options) {
        if (resolve(filePath) === aliasDirectory) return fs.statSync(box.canonicalDirectory, options);
        return fs.statSync(filePath, options);
      },
      readFileSync(filePath, encoding) {
        if (resolve(filePath) === aliasJournal) return fs.readFileSync(join(box.canonicalDirectory, "auth-identity.json"), encoding);
        return fs.readFileSync(filePath, encoding);
      },
    };
    const result = box.inspect({ processTempDirectory: junctionParent, fileSystem });
    assert.equal(result.safe, true);
    assert.equal(result.relation, "physical-alias");
    assert.equal(result.journalRelation, "single-physical-journal");
  } finally {
    await box.dispose();
  }
});

test("distinct directories with equivalent journals are reported but never merged", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await mkdir(box.alternateDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal());
    await writeFile(join(box.alternateDirectory, "auth-identity.json"), journal());
    const result = box.inspect();
    assert.equal(result.safe, false);
    assert.equal(result.reason, "independent_state_directories");
    assert.equal(result.journalRelation, "equivalent");
    assert.equal(await readFile(join(box.canonicalDirectory, "auth-identity.json"), "utf8"), journal());
    assert.equal(await readFile(join(box.alternateDirectory, "auth-identity.json"), "utf8"), journal());
  } finally {
    await box.dispose();
  }
});

test("distinct directories with conflicting journals fail closed without exposing the IDs", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await mkdir(box.alternateDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal("record-a"));
    await writeFile(join(box.alternateDirectory, "auth-identity.json"), journal("record-b"));
    const result = box.inspect();
    assert.equal(result.safe, false);
    assert.equal(result.reason, "independent_state_directories");
    assert.equal(result.journalRelation, "conflicting");
    assert.equal(JSON.stringify(result).includes("record-a"), false);
    assert.equal(JSON.stringify(result).includes("record-b"), false);
  } finally {
    await box.dispose();
  }
});

test("an incomplete second state directory is not adopted", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await mkdir(box.alternateDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal());
    await writeFile(join(box.alternateDirectory, "bootstrap.lock"), "stale lock metadata");
    const result = box.inspect();
    assert.equal(result.safe, false);
    assert.equal(result.reason, "independent_state_directories");
    assert.equal(result.journalRelation, "one-sided-or-missing");
  } finally {
    await box.dispose();
  }
});

test("malformed journal copies are classified invalid and remain untouched", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await mkdir(box.alternateDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), "{invalid");
    await writeFile(join(box.alternateDirectory, "auth-identity.json"), journal());
    const result = box.inspect();
    assert.equal(result.safe, false);
    assert.equal(result.journalRelation, "invalid");
    assert.equal(await readFile(join(box.canonicalDirectory, "auth-identity.json"), "utf8"), "{invalid");
  } finally {
    await box.dispose();
  }
});

test("unreadable journal copies fail closed", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await mkdir(box.alternateDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal());
    await writeFile(join(box.alternateDirectory, "auth-identity.json"), journal());
    const unreadablePath = join(box.alternateDirectory, "auth-identity.json");
    const fileSystem = {
      lstatSync: fs.lstatSync,
      statSync: fs.statSync,
      readFileSync(filePath, encoding) {
        if (resolve(filePath) === resolve(unreadablePath)) {
          const error = new Error("redacted");
          error.code = "EACCES";
          throw error;
        }
        return fs.readFileSync(filePath, encoding);
      },
    };
    const result = box.inspect({ fileSystem });
    assert.equal(result.safe, false);
    assert.equal(result.journalRelation, "unreadable");
  } finally {
    await box.dispose();
  }
});

test("missing Windows filesystem identity fails closed when an alternate state exists", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await mkdir(box.alternateDirectory, { recursive: true });
    await writeFile(join(box.canonicalDirectory, "auth-identity.json"), journal());
    await writeFile(join(box.alternateDirectory, "auth-identity.json"), journal());
    const fileSystem = {
      lstatSync: fs.lstatSync,
      statSync(filePath, options) {
        const stat = fs.statSync(filePath, options);
        return { dev: 0, ino: 0, isDirectory: () => stat.isDirectory() };
      },
      readFileSync: fs.readFileSync,
    };
    const result = box.inspect({ fileSystem });
    assert.equal(result.safe, false);
    assert.equal(result.reason, "filesystem_identity_unavailable");
    assert.equal(result.journalRelation, "equivalent");
  } finally {
    await box.dispose();
  }
});

test("interrupted recovery uses the one canonical recorded journal without a lock", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    const journalPath = join(box.canonicalDirectory, "auth-identity.json");
    await writeFile(journalPath, journal());
    const result = box.inspect();
    assert.equal(result.safe, true);
    assert.equal(result.stateDirectory, box.canonicalDirectory);
    assert.equal(result.canonicalHasState, true);
    assert.equal(result.alternateHasState, false);
    assert.deepEqual(await readBootstrapIdentityJournal(journalPath, JOURNAL_CONTEXT), {
      ...JOURNAL_CONTEXT,
      userId: "recorded-synthetic-user-id",
    });
  } finally {
    await box.dispose();
  }
});

test("a journal with the wrong marker is not accepted for recovery", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    const journalPath = join(box.canonicalDirectory, "auth-identity.json");
    await writeFile(journalPath, journal("recorded-synthetic-user-id", "wrong-marker"));
    await assert.rejects(readBootstrapIdentityJournal(journalPath, JOURNAL_CONTEXT), /does not match this project/);
  } finally {
    await box.dispose();
  }
});

test("a stale canonical lock blocks and remains in place", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    const lockPath = join(box.canonicalDirectory, "bootstrap.lock");
    const lockContents = JSON.stringify({ pid: 12345, startedAt: "2026-10-09T00:00:00.000Z" });
    await writeFile(lockPath, lockContents);
    const result = box.inspect();
    assert.equal(result.safe, true);
    assert.equal(result.stateDirectory, box.canonicalDirectory);
    await assert.rejects(withExclusiveBootstrapLock(lockPath, async () => "must-not-run"), /already running/);
    assert.equal(await readFile(lockPath, "utf8"), lockContents);
  } finally {
    await box.dispose();
  }
});

test("canonical path does not follow a distinct TMP/TEMP directory containing state", async () => {
  const box = await sandbox();
  try {
    await mkdir(box.canonicalDirectory, { recursive: true });
    await mkdir(box.alternateDirectory, { recursive: true });
    await writeFile(join(box.alternateDirectory, "auth-identity.json"), journal());
    const result = box.inspect();
    assert.equal(result.safe, false);
    assert.equal(result.reason, "independent_state_directories");
  } finally {
    await box.dispose();
  }
});
