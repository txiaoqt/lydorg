import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteAdminBudgetRequestsInSupabase } from "./lydo-connect-supabase";
import * as adminAuth from "./admin-auth";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: mocks.rpc, storage: { from: vi.fn() } },
  supabaseUrl: "https://vitest.invalid",
}));

const session = { id: "admin-1", username: "admin", email: "admin@example.test", displayName: "Admin", sessionToken: "token-1", expiresAt: new Date(Date.now() + 3600000).toISOString(), roleCode: "super_admin" };

describe("Admin budget request deletion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(adminAuth, "readAdminSession").mockReturnValue(session as ReturnType<typeof adminAuth.readAdminSession>);
  });

  it("deletes the selected requests through the admin RPC", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { success: true, deleted_count: 2, deleted_ids: ["a", "b"] }, error: null });
    await expect(deleteAdminBudgetRequestsInSupabase(["a", "b"])).resolves.toEqual({ deletedCount: 2, deletedRequestIds: ["a", "b"] });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_bulk_delete_budget_requests", { _session_token: "token-1", _request_ids: ["a", "b"] });
  });

  it("surfaces a refused deletion instead of reporting success", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { success: false, error: "Admin account is not authorized." }, error: null });
    await expect(deleteAdminBudgetRequestsInSupabase(["a"])).rejects.toThrow("Admin account is not authorized.");
  });

  it("does nothing for an empty selection", async () => {
    await expect(deleteAdminBudgetRequestsInSupabase([])).resolves.toEqual({ deletedCount: 0 });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
