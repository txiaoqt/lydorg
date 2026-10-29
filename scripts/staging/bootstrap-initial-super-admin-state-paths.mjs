/**
 * Canonical local state path and duplicate-state guard for the one-time
 * Y-TRACE staging Super Admin bootstrap. The profile Temp path is stable
 * across PowerShell, Node, and Codex process TMP/TEMP overrides. Node's
 * os.tmpdir() is inspected only as a legacy/alias candidate; it is never used
 * as the write location.
 */
import * as fs from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join, resolve } from "node:path";

export const STAGING_BOOTSTRAP_STATE_DIR_NAME = "ytrace-staging-bootstrap-zroudsvpswqsjlyttkjf";

const JOURNAL_FILE = "auth-identity.json";
const LOCK_FILE = "bootstrap.lock";
const EXPECTED_JOURNAL = {
  projectRef: "zroudsvpswqsjlyttkjf",
  email: "ytrace-staging-super-admin@example.invalid",
  marker: "ytrace-initial-super-admin-v1",
};
const JOURNAL_KEYS = ["email", "marker", "projectRef", "userId"];

function entryExists(filePath, fileSystem) {
  try {
    fileSystem.lstatSync(filePath);
    return true;
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return false;
    throw new Error("Could not safely inspect the local staging bootstrap state paths.");
  }
}

function directoryIdentity(directory, fileSystem) {
  let stat;
  try {
    // stat follows case aliases, symlinks, and Windows junctions. On Windows,
    // Node exposes the volume and file index as dev/ino.
    stat = fileSystem.statSync(directory, { bigint: true });
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return null;
    throw new Error("Could not safely inspect the local staging bootstrap state paths.");
  }
  if (!stat.isDirectory()) return null;
  const bigIntIdentity = typeof stat.dev === "bigint" && typeof stat.ino === "bigint";
  const numberIdentity = Number.isSafeInteger(stat.dev) && Number.isSafeInteger(stat.ino);
  if (bigIntIdentity) {
    if (stat.dev < 0n || stat.ino <= 0n) return null;
  } else if (!numberIdentity || stat.dev < 0 || stat.ino <= 0) {
    return null;
  }
  return `${stat.dev}:${stat.ino}`;
}

function inspectArtifacts(directory, fileSystem) {
  const journalPath = join(directory, JOURNAL_FILE);
  const lockPath = join(directory, LOCK_FILE);
  return {
    journalPath,
    lockPath,
    journal: entryExists(journalPath, fileSystem),
    lock: entryExists(lockPath, fileSystem),
  };
}

function journalSnapshot(journalPath, fileSystem) {
  try {
    const parsed = JSON.parse(fileSystem.readFileSync(journalPath, "utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { status: "invalid" };
    const keys = Object.keys(parsed).sort();
    if (keys.length !== JOURNAL_KEYS.length || keys.some((key, index) => key !== JOURNAL_KEYS[index]) ||
        parsed.projectRef !== EXPECTED_JOURNAL.projectRef ||
        parsed.email !== EXPECTED_JOURNAL.email ||
        parsed.marker !== EXPECTED_JOURNAL.marker ||
        typeof parsed.userId !== "string" || parsed.userId.length === 0) {
      return { status: "invalid" };
    }
    // The ID remains in memory solely for same/different comparison. It is
    // never included in the returned forensic summary or printed by callers.
    return { status: "valid", userId: parsed.userId };
  } catch (error) {
    if (error?.code === "ENOENT" || error?.code === "ENOTDIR") return { status: "missing" };
    if (error instanceof SyntaxError) return { status: "invalid" };
    return { status: "unreadable" };
  }
}

function compareJournalCopies(canonicalArtifacts, alternateArtifacts, fileSystem) {
  if (!canonicalArtifacts.journal || !alternateArtifacts.journal) return "one-sided-or-missing";
  const canonical = journalSnapshot(canonicalArtifacts.journalPath, fileSystem);
  const alternate = journalSnapshot(alternateArtifacts.journalPath, fileSystem);
  if (canonical.status === "unreadable" || alternate.status === "unreadable") return "unreadable";
  if (canonical.status !== "valid" || alternate.status !== "valid") return "invalid";
  return canonical.userId === alternate.userId ? "equivalent" : "conflicting";
}

/**
 * Inspect profile-temp and the process temp candidate without changing either.
 * A state-bearing alternate path is accepted only when Windows file identity
 * proves it is the same physical directory as the canonical location.
 */
export function inspectBootstrapStatePaths({
  profileDirectory = homedir(),
  processTempDirectory = tmpdir(),
  fileSystem = fs,
} = {}) {
  if (typeof profileDirectory !== "string" || profileDirectory.length === 0 ||
      typeof processTempDirectory !== "string" || processTempDirectory.length === 0) {
    return { safe: false, reason: "state_path_unavailable" };
  }

  const canonicalDirectory = resolve(profileDirectory, "AppData", "Local", "Temp", STAGING_BOOTSTRAP_STATE_DIR_NAME);
  const alternateDirectory = resolve(processTempDirectory, STAGING_BOOTSTRAP_STATE_DIR_NAME);
  let canonicalArtifacts;
  let alternateArtifacts;
  try {
    canonicalArtifacts = inspectArtifacts(canonicalDirectory, fileSystem);
    alternateArtifacts = inspectArtifacts(alternateDirectory, fileSystem);
  } catch {
    return { safe: false, reason: "state_path_unreadable" };
  }

  const canonicalHasState = canonicalArtifacts.journal || canonicalArtifacts.lock;
  const alternateHasState = alternateArtifacts.journal || alternateArtifacts.lock;
  if (canonicalDirectory === alternateDirectory) {
    return {
      safe: true,
      stateDirectory: canonicalDirectory,
      relation: "same-path",
      canonicalHasState,
      alternateHasState,
      journalRelation: canonicalArtifacts.journal ? "single-physical-journal" : "none",
    };
  }

  if (!alternateHasState) {
    let relation = "alternate-has-no-state";
    try {
      const canonicalId = directoryIdentity(canonicalDirectory, fileSystem);
      const alternateId = directoryIdentity(alternateDirectory, fileSystem);
      if (canonicalId && alternateId && canonicalId === alternateId) relation = "physical-alias-with-no-independent-state";
    } catch {
      // The alternate has no journal or lock, so it cannot redirect recovery
      // state. Do not select it or write there.
    }
    return {
      safe: true,
      stateDirectory: canonicalDirectory,
      relation,
      canonicalHasState,
      alternateHasState,
      journalRelation: canonicalArtifacts.journal ? "single-physical-journal" : "none",
    };
  }

  let canonicalId;
  let alternateId;
  try {
    canonicalId = directoryIdentity(canonicalDirectory, fileSystem);
    alternateId = directoryIdentity(alternateDirectory, fileSystem);
  } catch {
    return {
      safe: false,
      reason: "filesystem_identity_unavailable",
      canonicalHasState,
      alternateHasState,
      journalRelation: compareJournalCopies(canonicalArtifacts, alternateArtifacts, fileSystem),
    };
  }
  if (!canonicalId || !alternateId) {
    return {
      safe: false,
      reason: "filesystem_identity_unavailable",
      canonicalHasState,
      alternateHasState,
      journalRelation: compareJournalCopies(canonicalArtifacts, alternateArtifacts, fileSystem),
    };
  }
  if (canonicalId === alternateId) {
    return {
      safe: true,
      stateDirectory: canonicalDirectory,
      relation: "physical-alias",
      canonicalHasState,
      alternateHasState,
      journalRelation: "single-physical-journal",
    };
  }

  return {
    safe: false,
    reason: "independent_state_directories",
    canonicalHasState,
    alternateHasState,
    journalRelation: compareJournalCopies(canonicalArtifacts, alternateArtifacts, fileSystem),
  };
}

export function requireCanonicalBootstrapStateDirectory(options) {
  const result = inspectBootstrapStatePaths(options);
  if (!result.safe) {
    const message = result.reason === "independent_state_directories"
      ? "Independent staging bootstrap state directories exist; manual review is required."
      : "Could not safely resolve the canonical staging bootstrap state directory.";
    throw new Error(message);
  }
  return result.stateDirectory;
}
