import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), session: vi.fn(), expire: vi.fn() }));
vi.mock("@/lib/supabase", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("@/lib/admin-auth", () => ({ readAdminSession: mocks.session, expireAdminSession: mocks.expire }));
import { BackupControlError, fetchBackupRun, fetchBackupRuns, requestBackup } from "./admin-backup-recovery";
beforeEach(() => { vi.clearAllMocks(); mocks.session.mockReturnValue({ sessionToken: "fake-admin-token" }); });
describe("backup frontend transport", () => {
  it("only invokes the Edge function with the custom session and action", async () => {
    mocks.invoke.mockResolvedValue({ data: { runs: [], dispatchEnabled: false }, error: null });
    expect(await fetchBackupRuns()).toEqual({ runs: [], activeBackup: false, requestPending: false, dispatchEnabled: false });
    expect(mocks.invoke).toHaveBeenCalledWith("admin-backup-control", { body: { action: "list_runs", session_token: "fake-admin-token" }, signal: undefined });
  });
  it("normalizes HTTP errors by approved code, never by upstream message", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ code: "not_configured", error: "fake-github-token" }), { status: 503 }) } });
    await expect(fetchBackupRuns()).rejects.toThrow("Backup service is not configured.");
  });
  it("expires only the matching session on authoritative unauthorized", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: { context: Response.json({ code: "unauthorized" }, { status: 401 }) } });
    await expect(fetchBackupRuns()).rejects.toBeInstanceOf(BackupControlError);
    expect(mocks.expire).toHaveBeenCalledWith("fake-admin-token");
  });
  it("fails before invocation without a session or for malformed IDs", async () => {
    mocks.session.mockReturnValue(null); await expect(fetchBackupRuns()).rejects.toThrow("sign in again");
    await expect(fetchBackupRun(-1)).rejects.toThrow("could not be found"); expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it("does not replay an uncertain dispatch and returns only safe accepted fields", async () => {
    mocks.invoke.mockRejectedValue(new Error("fake-github-token")); await expect(requestBackup()).rejects.toThrow("outcome could not be confirmed");
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    mocks.invoke.mockResolvedValue({ data: { accepted: true, runId: 12, auditStatus: "recorded", token: "fake-github-token" }, error: null });
    expect(await requestBackup()).toEqual({ accepted: true, runId: 12, auditStatus: "recorded" });
  });
});
