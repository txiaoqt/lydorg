// Server-only control logic. Dependencies are injected so local tests never need credentials/network.
export type BackupAction = "list_runs" | "get_run" | "dispatch";
export type AdminIdentity = { id: string; roleCode: string; permissionCodes: string[] };
export type BackupRun = {
  id: number; runNumber: number; status: string; conclusion: string | null; event: string;
  createdAt: string; updatedAt: string; htmlUrl: string; headSha: string; headBranch: string;
};
type Config = { token: string; repository: string; workflow: string; ref: string; dispatchEnabled: boolean };
type Dependencies = {
  env: (name: string) => string | undefined;
  authorize: (sessionToken: string) => Promise<AdminIdentity | null>;
  guard: (sessionToken: string, operation: string, leaseId?: string) => Promise<Record<string, unknown>>;
  audit: (sessionToken: string, metadata: Record<string, unknown>) => Promise<"recorded" | "disabled" | "unavailable">;
  fetch: typeof fetch;
};
export const ACTIVE_STATUSES = ["queued", "in_progress", "requested", "waiting", "pending"];
export const permissionForAction = (action: BackupAction) => action === "dispatch" ? "backup_recovery_manage" : "backup_recovery_view";
export const hasBackupAccess = (admin: AdminIdentity, action: BackupAction) =>
  admin.roleCode === "super_admin" || admin.permissionCodes.includes(permissionForAction(action));
export const isActiveRun = (run: { status: string }) => ACTIVE_STATUSES.includes(run.status);
const messages: Record<string, string> = {
  invalid_request: "Invalid backup request.", unauthorized: "Your admin session is invalid or expired. Please sign in again.",
  forbidden: "You do not have permission to perform this backup action.",
  not_configured: "Backup service is not configured.", dispatch_disabled: "Backup requests are not enabled yet. The first manual workflow must be validated.",
  github_unavailable: "GitHub backup status is unavailable. Please try refreshing later.",
  workflow_unavailable: "The backup workflow is not available. The reviewed manual workflow must exist on the default branch.",
  run_not_found: "This backup run could not be found.", active_backup: "A backup is already in progress.",
  control_unavailable: "Backup request coordination is unavailable. Please try again later.",
  dispatch_uncertain: "The backup request outcome could not be confirmed. Refresh status before trying again.",
};
class ControlError extends Error {
  constructor(public code: string, public status: number) { super(messages[code]); }
}
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const positiveId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
const safeDate = (value: unknown) => typeof value === "string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : "";

export function readBackupConfig(env: Dependencies["env"]): Config {
  const token = env("GITHUB_BACKUP_TOKEN")?.trim(), repository = env("GITHUB_BACKUP_REPOSITORY")?.trim();
  const workflow = env("GITHUB_BACKUP_WORKFLOW")?.trim(), ref = env("GITHUB_BACKUP_REF")?.trim();
  if (!token || !repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || repository.split("/").some(part => part === "." || part === "..") ||
      !workflow || !/^[A-Za-z0-9_-]+\.ya?ml$/.test(workflow) || !ref || ref.length > 200 ||
      /[\s~^:?*[\\]/.test(ref) || ref.includes("..") || ref.startsWith("-") || ref.endsWith("/")) {
    throw new ControlError("not_configured", 503);
  }
  return { token, repository, workflow, ref, dispatchEnabled: env("GITHUB_BACKUP_DISPATCH_ENABLED") === "true" };
}

export function normalizeRun(value: unknown, config: Pick<Config, "repository" | "ref">, workflowId: number): BackupRun {
  const run = record(value), repository = record(run.repository);
  if (!positiveId(run.id) || !positiveId(run.run_number) || run.workflow_id !== workflowId ||
      typeof repository.full_name !== "string" || repository.full_name.toLowerCase() !== config.repository.toLowerCase() ||
      run.event !== "workflow_dispatch" || run.head_branch !== config.ref ||
      typeof run.head_sha !== "string" || !/^[a-f0-9]{40}$/i.test(run.head_sha) || !safeDate(run.created_at) || !safeDate(run.updated_at)) {
    throw new ControlError("run_not_found", 404);
  }
  const status = [...ACTIVE_STATUSES, "completed"].includes(String(run.status)) ? String(run.status) : "unknown";
  const conclusions = ["success", "failure", "cancelled", "timed_out", "action_required", "neutral", "skipped", "stale", "startup_failure"];
  // Construct the link from validated identifiers; never relay an upstream URL.
  return { id: run.id, runNumber: run.run_number, status,
    conclusion: conclusions.includes(String(run.conclusion)) ? String(run.conclusion) : null,
    event: "workflow_dispatch", createdAt: safeDate(run.created_at), updatedAt: safeDate(run.updated_at),
    htmlUrl: `https://github.com/${config.repository}/actions/runs/${run.id}`,
    headSha: run.head_sha.toLowerCase(), headBranch: config.ref };
}

const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json", "Cache-Control": "no-store" };
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers });

async function requestText(req: Request) {
  if (!req.body) throw new ControlError("invalid_request", 400);
  const reader = req.body.getReader(), chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 8192) {
        await reader.cancel();
        throw new ControlError("invalid_request", 400);
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export function createBackupControlHandler(deps: Dependencies) {
  return async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
    if (req.method !== "POST") return response({ code: "invalid_request", error: messages.invalid_request }, 405);
    try {
      const text = await requestText(req);
      let body: Record<string, unknown>;
      try { body = record(JSON.parse(text)); } catch { throw new ControlError("invalid_request", 400); }
      const action = body.action;
      if (!["list_runs", "get_run", "dispatch"].includes(String(action)) ||
          Object.keys(body).some(key => !["action", "session_token", "run_id"].includes(key)) ||
          (action === "get_run" && !positiveId(body.run_id))) throw new ControlError("invalid_request", 400);
      if (typeof body.session_token !== "string" || !body.session_token || body.session_token.length > 512) throw new ControlError("unauthorized", 401);
      const token = body.session_token;
      const admin = await deps.authorize(token);
      if (!admin) throw new ControlError("unauthorized", 401);
      if (!hasBackupAccess(admin, action as BackupAction)) throw new ControlError("forbidden", 403);
      const config = readBackupConfig(deps.env);
      const base = `https://api.github.com/repos/${config.repository}`;
      let postAttempted = false, postExplicitlyRejected = false;
      async function github(route: string, data?: unknown): Promise<unknown> {
        if (data) postAttempted = true;
        let result: Response;
        try {
          result = await deps.fetch(`${base}${route}`, { method: data ? "POST" : "GET", redirect: "error",
            signal: AbortSignal.timeout(15_000), headers: { Accept: "application/vnd.github+json", Authorization: `Bearer ${config.token}`,
              "X-GitHub-Api-Version": "2026-03-10", ...(data ? { "Content-Type": "application/json" } : {}) },
            ...(data ? { body: JSON.stringify(data) } : {}) });
        } catch { throw new ControlError(data ? "dispatch_uncertain" : "github_unavailable", 502); }
        if (!result.ok) {
          if (data && result.status >= 400 && result.status < 500) postExplicitlyRejected = true;
          throw new ControlError(data && !postExplicitlyRejected ? "dispatch_uncertain" : result.status === 404 ? "workflow_unavailable" : "github_unavailable", 502);
        }
        if (result.status === 204) return {};
        try { return await result.json(); } catch { throw new ControlError(data ? "dispatch_uncertain" : "github_unavailable", 502); }
      }
      const workflowRoute = `/actions/workflows/${encodeURIComponent(config.workflow)}`;
      const workflow = record(await github(workflowRoute));
      if (!positiveId(workflow.id) || workflow.path !== `.github/workflows/${config.workflow}` || workflow.state !== "active") throw new ControlError("workflow_unavailable", 503);
      const workflowId = workflow.id;
      if (action === "get_run") {
        const run = normalizeRun(await github(`/actions/runs/${body.run_id}`), config, workflowId);
        return response({ run });
      }
      async function activeBackupExists() {
        // Query each active status directly; a long history cannot hide an older queued run.
        for (const status of ACTIVE_STATUSES) {
          const result = record(await github(`${workflowRoute}/runs?status=${status}&per_page=1`));
          if (!Array.isArray(result.workflow_runs)) throw new ControlError("github_unavailable", 502);
          if (result.workflow_runs.length) return true;
        }
        return false;
      }
      if (action === "list_runs") {
        const result = record(await github(`${workflowRoute}/runs?event=workflow_dispatch&branch=${encodeURIComponent(config.ref)}&per_page=25`));
        if (!Array.isArray(result.workflow_runs)) throw new ControlError("github_unavailable", 502);
        const runs = result.workflow_runs.map(run => normalizeRun(run, config, workflowId));
        const active = runs.some(isActiveRun) || await activeBackupExists();
        const lease = await deps.guard(token, active ? "observe" : "read");
        return response({ runs, activeBackup: active, requestPending: !active && lease.busy === true, dispatchEnabled: config.dispatchEnabled });
      }
      if (!config.dispatchEnabled) throw new ControlError("dispatch_disabled", 503);
      const leaseId = crypto.randomUUID();
      let acquired: Record<string, unknown>;
      try { acquired = await deps.guard(token, "claim", leaseId); }
      catch { throw new ControlError("control_unavailable", 503); }
      if (acquired.acquired !== true) throw new ControlError("active_backup", 409);
      try {
        if (await activeBackupExists()) throw new ControlError("active_backup", 409);
        const dispatch = record(await github(`${workflowRoute}/dispatches`, { ref: config.ref }));
        const runId = positiveId(dispatch.workflow_run_id) ? dispatch.workflow_run_id : null;
        let auditStatus: "recorded" | "disabled" | "unavailable" = "unavailable";
        try { auditStatus = await deps.audit(token, { ...(runId ? { github_run_id: runId } : {}), workflow: config.workflow, trigger_source: "admin_backup_recovery" }); } catch { /* Accepted dispatch must never become a retryable failure because auditing failed. */ }
        return response({ accepted: true, runId, auditStatus }, 202);
      } finally {
        // Keep the lease after accepted/ambiguous dispatch until an active run is observed or 10 minutes elapse.
        if (!postAttempted || postExplicitlyRejected) {
          try { await deps.guard(token, "release", leaseId); } catch { /* Expiry remains fail-closed. */ }
        }
      }
    } catch (error) {
      if (error instanceof ControlError) return response({ code: error.code, error: messages[error.code] }, error.status);
      return response({ code: "control_unavailable", error: messages.control_unavailable }, 503);
    }
  };
}
