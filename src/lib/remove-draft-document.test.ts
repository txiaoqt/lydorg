import { beforeEach, describe, expect, it, vi } from "vitest";
import { supabase } from "./supabase";
import { removeOrganizationDocumentFromSupabase } from "./lydo-connect-supabase";

vi.mock("./supabase", () => ({
  supabase: {
    auth: { getSession: vi.fn() },
    from: vi.fn(),
    storage: { from: vi.fn(() => ({ remove: vi.fn().mockResolvedValue({ error: null }) })) },
  },
  supabaseUrl: "https://mock.supabase.co",
  isSupabaseConfigured: () => true,
}));

// Chainable query stub: every builder method returns itself; awaiting or .single() resolves to `result`.
const query = (result: unknown, onUpdate?: (payload: unknown) => void) => {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "in", "is", "order", "limit", "delete"]) q[m] = () => q;
  q.update = (payload: unknown) => { onUpdate?.(payload); return q; };
  q.single = q.maybeSingle = () => Promise.resolve(result);
  q.then = (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve);
  return q;
};

const setup = (submission: Record<string, unknown>) => {
  const updates: unknown[] = [];
  const deleted = vi.fn();
  vi.mocked(supabase!.auth.getSession).mockResolvedValue({ data: { session: { user: { id: "user-1" } } } } as never);
  vi.mocked(supabase!.from).mockImplementation(((table: string) => {
    if (table === "organization_profiles") return query({ data: { id: "org-1", user_id: "user-1", profile_status: "pending" }, error: null });
    if (table === "document_submissions") return query({ data: { id: "sub-1", ...submission }, error: null }, (p) => updates.push(p));
    if (table === "document_submission_files") {
      const q = query({ data: { id: "file-1", submission_id: "sub-1", file_url: "", admin_status: "draft" }, error: null });
      q.delete = () => { deleted(); return query({ error: null }); };
      // remaining sibling still under review after the draft is removed
      q.select = (cols: string) => (cols === "admin_status" ? query({ data: [{ admin_status: "under_admin_review" }], error: null }) : q);
      return q;
    }
    throw new Error(`unexpected table ${table}`);
  }) as never);
  return { updates, deleted };
};

describe("removeOrganizationDocumentFromSupabase", () => {
  beforeEach(() => vi.clearAllMocks());

  it("deletes a registration draft while a sibling document is under review", async () => {
    const { updates, deleted } = setup({ status: "under_admin_review", submission_scope: "registration", renewal_id: null });
    await removeOrganizationDocumentFromSupabase("file-1");
    expect(deleted).toHaveBeenCalledOnce();
    // only org-writable columns; review fields are server controlled
    expect(Object.keys(updates[0] as object).sort()).toEqual(["status", "updated_at", "user_confirmed"]);
  });

  it("keeps the submission-level lock for renewal packets", async () => {
    const { deleted } = setup({ status: "under_admin_review", submission_scope: "renewal", renewal_id: "ren-1" });
    await expect(removeOrganizationDocumentFromSupabase("file-1")).rejects.toThrow(/under admin review/);
    expect(deleted).not.toHaveBeenCalled();
  });
});
