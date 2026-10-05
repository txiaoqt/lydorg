import { readAdminSession, expireAdminSession } from "@/lib/admin-auth";
import { supabase } from "@/lib/supabase";

export type BackupRun = {
  id: number; runNumber: number; status: string; conclusion: string | null; event: string;
  createdAt: string; updatedAt: string; htmlUrl: string; headSha: string; headBranch: string;
};
export type BackupRunsResult = { runs: BackupRun[]; activeBackup: boolean; requestPending: boolean; dispatchEnabled: boolean };
export type BackupRequestResult = { accepted: true; runId: number | null; auditStatus: "recorded" | "disabled" | "unavailable" };

const safeErrors: Record<string, string> = {
  not_configured: "Backup service is not configured.",
  dispatch_disabled: "Backup requests are not enabled yet. The first manual workflow must be validated.",
  forbidden: "You do not have permission to perform this backup action.",
  unauthorized: "Your admin session is invalid or expired. Please sign in again.",
  active_backup: "A backup is already in progress.",
  workflow_unavailable: "The backup workflow is not available yet. Contact a Super Admin.",
  github_unavailable: "GitHub backup status is unavailable. Please try refreshing later.",
  control_unavailable: "Backup service is unavailable. Please try refreshing later.",
  dispatch_uncertain: "The backup request outcome could not be confirmed. Refresh status before trying again.",
  run_not_found: "This backup run could not be found.",
};
export class BackupControlError extends Error {
  constructor(public code: string) { super(safeErrors[code] ?? safeErrors.control_unavailable); }
}

async function invoke(action: string, payload: Record<string, unknown> = {}, signal?: AbortSignal): Promise<Record<string, unknown>> {
  const session = readAdminSession();
  if (!session?.sessionToken) throw new BackupControlError("unauthorized");
  if (!supabase) throw new BackupControlError("not_configured");
  try {
    const { data, error } = await supabase.functions.invoke("admin-backup-control", {
      body: { action, session_token: session.sessionToken, ...payload }, signal,
    });
    let body = data;
    if (error) {
      const context = (error as { context?: unknown }).context;
      try { body = context instanceof Response ? await context.clone().json() : null; } catch { body = null; }
      const code = typeof body?.code === "string" && safeErrors[body.code] ? body.code : "control_unavailable";
      if (code === "unauthorized") expireAdminSession(session.sessionToken);
      throw new BackupControlError(code);
    }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new BackupControlError("control_unavailable");
    return body;
  } catch (error) {
    if (error instanceof BackupControlError) throw error;
    throw new BackupControlError(action === "dispatch" ? "dispatch_uncertain" : "control_unavailable");
  }
}

function displayRun(value: unknown): BackupRun {
  const run = value as BackupRun;
  if (!run || !Number.isSafeInteger(run.id) || run.id <= 0 || !Number.isSafeInteger(run.runNumber) ||
      !/^[a-f0-9]{40}$/i.test(run.headSha) || !Number.isFinite(Date.parse(run.createdAt)) ||
      !Number.isFinite(Date.parse(run.updatedAt)) || run.event !== "workflow_dispatch") throw new BackupControlError("control_unavailable");
  let url: URL;
  try { url = new URL(run.htmlUrl); } catch { throw new BackupControlError("control_unavailable"); }
  if (url.origin !== "https://github.com" || url.username || url.password || url.search || url.hash ||
      !new RegExp(`^/[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+/actions/runs/${run.id}$`).test(url.pathname)) throw new BackupControlError("control_unavailable");
  const statuses = ["queued", "in_progress", "requested", "waiting", "pending", "completed"];
  const conclusions = ["success", "failure", "cancelled", "timed_out", "action_required", "neutral", "skipped", "stale", "startup_failure"];
  return { id: run.id, runNumber: run.runNumber, status: statuses.includes(run.status) ? run.status : "unknown",
    conclusion: conclusions.includes(run.conclusion ?? "") ? run.conclusion : null, event: "workflow_dispatch",
    createdAt: run.createdAt, updatedAt: run.updatedAt, htmlUrl: url.href, headSha: run.headSha,
    headBranch: typeof run.headBranch === "string" && /^[A-Za-z0-9_./-]{1,200}$/.test(run.headBranch) ? run.headBranch : "" };
}

export async function fetchBackupRuns(signal?: AbortSignal): Promise<BackupRunsResult> {
  const result = await invoke("list_runs", {}, signal);
  if (!Array.isArray(result.runs)) throw new BackupControlError("control_unavailable");
  return { runs: result.runs.map(displayRun), activeBackup: result.activeBackup === true,
    requestPending: result.requestPending === true, dispatchEnabled: result.dispatchEnabled === true };
}
export async function fetchBackupRun(runId: number, signal?: AbortSignal): Promise<BackupRun> {
  if (!Number.isSafeInteger(runId) || runId <= 0) throw new BackupControlError("run_not_found");
  return displayRun((await invoke("get_run", { run_id: runId }, signal)).run);
}
export async function requestBackup(): Promise<BackupRequestResult> {
  const result = await invoke("dispatch");
  if (result.accepted !== true) throw new BackupControlError("dispatch_uncertain");
  return { accepted: true, runId: Number.isSafeInteger(result.runId) && Number(result.runId) > 0 ? Number(result.runId) : null,
    auditStatus: result.auditStatus === "recorded" || result.auditStatus === "disabled" ? result.auditStatus : "unavailable" };
}
export const isBackupActive = (run: { status: string }) => ["queued", "in_progress", "requested", "waiting", "pending"].includes(run.status);
export function backupStatusLabel(run: { status: string; conclusion: string | null }) {
  if (run.status === "in_progress") return "Backup in progress";
  if (isBackupActive(run)) return "Queued";
  if (run.status !== "completed") return "Status unavailable";
  if (run.conclusion === "success") return "Verified Backup";
  if (run.conclusion === "cancelled") return "Cancelled";
  if (["failure", "timed_out", "startup_failure", "action_required"].includes(run.conclusion ?? "")) return "Failed";
  return run.conclusion === "skipped" ? "Skipped" : "Not verified";
}
