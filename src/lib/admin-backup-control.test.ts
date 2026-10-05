// Pure Edge handler tests: all session/DB/GitHub dependencies are mocked.
import { describe, expect, it, vi } from "vitest";
import { createBackupControlHandler, hasBackupAccess, normalizeRun, permissionForAction, type AdminIdentity } from "../../supabase/functions/admin-backup-control/control";

// jsdom lacks the Edge runtime's static timeout helper; no real timers/network are needed here.
Object.defineProperty(AbortSignal, "timeout", { configurable: true, value: vi.fn(() => new AbortController().signal) });

const environment: Record<string, string> = { GITHUB_BACKUP_TOKEN: "fake-github-token", GITHUB_BACKUP_REPOSITORY: "example/backup-repo",
  GITHUB_BACKUP_WORKFLOW: "ytrace-backup.yml", GITHUB_BACKUP_REF: "main", GITHUB_BACKUP_DISPATCH_ENABLED: "true" };
const rawRun = (changes = {}) => ({ id: 12, run_number: 3, workflow_id: 5, status: "completed", conclusion: "success",
  event: "workflow_dispatch", head_branch: "main", head_sha: "a".repeat(40), repository: { full_name: "example/backup-repo" },
  created_at: "2026-10-05T04:00:00Z", updated_at: "2026-10-05T04:05:00Z", html_url: "https://evil.invalid/fake-github-token", token: "fake-github-token", ...changes });
const admin: AdminIdentity = { id: "mock-admin", roleCode: "super_admin", permissionCodes: [] };
function setup(options: { admin?: AdminIdentity | null; env?: Record<string, string>; response?: (url: string, init?: RequestInit) => Response } = {}) {
  const audit = vi.fn().mockResolvedValue("recorded"), guard = vi.fn().mockResolvedValue({ acquired: true, busy: false });
  const authorize = vi.fn().mockResolvedValue("admin" in options ? options.admin : admin);
  const fetch = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const value = String(url);
    if (options.response) return options.response(value, init);
    if (value.endsWith("/dispatches")) return Response.json({ workflow_run_id: 12, token: "fake-github-token" });
    if (value.includes("/runs?")) return Response.json({ workflow_runs: value.includes("event=") ? [rawRun()] : [] });
    if (value.endsWith("/runs/12")) return Response.json(rawRun());
    return Response.json({ id: 5, path: ".github/workflows/ytrace-backup.yml", state: "active" });
  });
  const handler = createBackupControlHandler({ env: name => (options.env ?? environment)[name], authorize, guard, audit, fetch });
  const call = (action: string, extra = {}) => handler(new Request("https://edge.invalid", { method: "POST", body: JSON.stringify({ action, session_token: "fake-admin-session", ...extra }) }));
  return { call, handler, fetch, guard, audit, authorize };
}
describe("backup control security", () => {
  it("selects permissions by action and preserves the super-admin bypass", () => {
    expect(permissionForAction("dispatch")).toBe("backup_recovery_manage");
    expect(permissionForAction("get_run")).toBe("backup_recovery_view");
    expect(hasBackupAccess(admin, "dispatch")).toBe(true);
    expect(hasBackupAccess({ ...admin, roleCode: "admin", permissionCodes: ["backup_recovery_view"] }, "dispatch")).toBe(false);
  });
  it("rejects invalid sessions and insufficient permissions without GitHub access", async () => {
    for (const identity of [null, { ...admin, roleCode: "admin", permissionCodes: [] }]) {
      const s = setup({ admin: identity });
      expect((await s.call("list_runs")).status).toBe(identity ? 403 : 401);
      expect(s.fetch).not.toHaveBeenCalled();
    }
  });
  it("requires view independently of manage and rejects browser authorization/target overrides", async () => {
    const s = setup({ admin: { ...admin, roleCode: "admin", permissionCodes: ["backup_recovery_manage"] } });
    expect((await s.call("list_runs")).status).toBe(403);
    expect((await s.call("dispatch", { role: "super_admin", repository: "other/repo" })).status).toBe(400);
    expect(s.fetch).not.toHaveBeenCalled();
  });
  it("returns one sanitized missing-configuration message and blocks dispatch unless explicitly enabled", async () => {
    for (const key of ["GITHUB_BACKUP_TOKEN", "GITHUB_BACKUP_REPOSITORY", "GITHUB_BACKUP_WORKFLOW", "GITHUB_BACKUP_REF"]) {
      const s = setup({ env: { ...environment, [key]: "" } }), result = await s.call("list_runs");
      expect(result.status).toBe(503);
      const text = await result.text();
      expect(text).toContain("Backup service is not configured"); expect(text).not.toContain(key);
      expect(s.fetch).not.toHaveBeenCalled();
    }
    const s = setup({ env: { ...environment, GITHUB_BACKUP_DISPATCH_ENABLED: "" } });
    expect((await s.call("dispatch")).status).toBe(503);
    expect(s.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
  it("normalizes only displayable metadata and constructs a trusted run link", async () => {
    const s = setup(), result = await s.call("list_runs");
    const data = await result.json();
    expect(data.runs[0].htmlUrl).toBe("https://github.com/example/backup-repo/actions/runs/12");
    expect(JSON.stringify(data)).not.toContain("fake-github-token");
    expect(data.runs[0].token).toBeUndefined();
    expect(s.fetch.mock.calls[0][1]?.headers).toMatchObject({ "X-GitHub-Api-Version": "2026-03-10" });
  });
  it("get_run checks repository, workflow, manual event and production ref", async () => {
    expect((await setup().call("get_run", { run_id: 12 })).status).toBe(200);
    const config = { repository: "example/backup-repo", ref: "main" };
    for (const changes of [{ repository: { full_name: "other/repo" } }, { workflow_id: 6 }, { head_branch: "unreviewed" }, { event: "push" }]) {
      expect(() => normalizeRun(rawRun(changes), config, 5)).toThrow();
    }
    const s = setup();
    expect((await s.call("get_run", { run_id: "../dispatches" })).status).toBe(400);
    expect(s.fetch).not.toHaveBeenCalled();
  });
  it.each(["queued", "in_progress", "waiting", "requested", "pending"])("blocks an existing %s run without dispatching or logging success", async status => {
    const s = setup({ response: url => url.includes(`status=${status}&`) ? Response.json({ workflow_runs: [rawRun({ status })] }) :
      url.includes("/runs?") ? Response.json({ workflow_runs: [] }) : Response.json({ id: 5, path: ".github/workflows/ytrace-backup.yml", state: "active" }) });
    const result = await s.call("dispatch");
    expect(result.status).toBe(409); expect((await result.json()).error).toBe("A backup is already in progress.");
    expect(s.audit).not.toHaveBeenCalled(); expect(s.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
    expect(s.guard).toHaveBeenCalledWith("fake-admin-session", "release", expect.any(String));
  });
  it("uses the durable lease to reject concurrent requests before dispatch", async () => {
    const s = setup(); s.guard.mockResolvedValue({ acquired: false });
    expect((await s.call("dispatch")).status).toBe(409);
    expect(s.audit).not.toHaveBeenCalled(); expect(s.fetch.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });
  it("dispatches only server configuration, logs safe identifiers, and keeps the visibility lease", async () => {
    const s = setup(), result = await s.call("dispatch");
    expect(result.status).toBe(202); expect(await result.json()).toEqual({ accepted: true, runId: 12, auditStatus: "recorded" });
    const post = s.fetch.mock.calls.find(([, init]) => init?.method === "POST");
    expect(post?.[0]).toBe("https://api.github.com/repos/example/backup-repo/actions/workflows/ytrace-backup.yml/dispatches");
    expect(JSON.parse(String(post?.[1]?.body))).toEqual({ ref: "main" });
    expect(s.audit).toHaveBeenCalledWith("fake-admin-session", { github_run_id: 12, workflow: "ytrace-backup.yml", trigger_source: "admin_backup_recovery" });
    expect(s.guard.mock.calls.some(([, action]) => action === "release")).toBe(false);
  });
  it("does not label failed dispatch as successful or return upstream exception details", async () => {
    const s = setup({ response: (url, init) => init?.method === "POST" ? new Response("fake-github-token", { status: 403 }) :
      url.includes("/runs?") ? Response.json({ workflow_runs: [] }) : Response.json({ id: 5, path: ".github/workflows/ytrace-backup.yml", state: "active" }) });
    const result = await s.call("dispatch"); expect(result.status).toBe(502);
    expect(await result.text()).not.toContain("fake-github-token"); expect(s.audit).not.toHaveBeenCalled();
    expect(s.guard).toHaveBeenCalledWith("fake-admin-session", "release", expect.any(String));
  });
  it("keeps accepted dispatch successful when audit logging fails", async () => {
    const s = setup(); s.audit.mockRejectedValue(new Error("private exception"));
    expect(await (await s.call("dispatch")).json()).toEqual({ accepted: true, runId: 12, auditStatus: "unavailable" });
  });
  it("retains the lease after ambiguous POST failures and never retries a dispatch", async () => {
    const s = setup(); s.fetch.mockImplementation(async (url, init) => {
      if (init?.method === "POST") throw new Error("fake-github-token");
      return String(url).includes("/runs?") ? Response.json({ workflow_runs: [] }) : Response.json({ id: 5, path: ".github/workflows/ytrace-backup.yml", state: "active" });
    });
    const result = await s.call("dispatch"); expect((await result.json()).code).toBe("dispatch_uncertain");
    expect(s.fetch.mock.calls.filter(([, init]) => init?.method === "POST")).toHaveLength(1);
    expect(s.guard.mock.calls.some(([, action]) => action === "release")).toBe(false);
    expect(s.audit).not.toHaveBeenCalled();
  });
  it("supports preflight and sanitized invalid-method/body responses", async () => {
    const s = setup();
    expect((await s.handler(new Request("https://edge.invalid", { method: "OPTIONS" }))).status).toBe(204);
    expect((await s.handler(new Request("https://edge.invalid"))).status).toBe(405);
    expect((await s.handler(new Request("https://edge.invalid", { method: "POST", body: "not-json" }))).status).toBe(400);
  });
});
