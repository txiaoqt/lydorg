import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import ts from "typescript";
import { deleteAdminBudgetRequestsInSupabase } from "./lydo-connect-supabase";
import * as adminAuth from "./admin-auth";
import { BUDGET_DELETION_PAUSED_CODE, BUDGET_DELETION_PAUSED_MESSAGE } from "./admin-budget-deletion-pause";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), storageFrom: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { rpc: mocks.rpc, storage: { from: mocks.storageFrom } },
  supabaseUrl: "https://vitest.invalid",
}));

describe("Admin budget deletion pause", () => {
  beforeEach(() => vi.clearAllMocks());

  it.each(["draft", "submitted", "under_review", "needs_revision", "awaiting_release", "budget_released", "completed", "rejected_red"])(
    "blocks the client for %s records without RPC, Storage, or session access", async (status) => {
      const sessionRead = vi.spyOn(adminAuth, "readAdminSession");
      await expect(deleteAdminBudgetRequestsInSupabase([`synthetic-${status}`])).rejects.toMatchObject({
        code: BUDGET_DELETION_PAUSED_CODE, message: BUDGET_DELETION_PAUSED_MESSAGE,
      });
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.storageFrom).not.toHaveBeenCalled();
      expect(sessionRead).not.toHaveBeenCalled();
    },
  );

  const deletionIdCases = [
    { ids: [] as string[] },
    { ids: ["synthetic-a", "synthetic-b"] },
    { ids: ["synthetic-a", "synthetic-a"] },
  ];

  it.each(deletionIdCases)(
    "never reports a successful or partial deletion for %j", async ({ ids }) => {
      await expect(deleteAdminBudgetRequestsInSupabase(ids)).rejects.toThrow(BUDGET_DELETION_PAUSED_MESSAGE);
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.storageFrom).not.toHaveBeenCalled();
    },
  );

  it("the portable shipped-function fixture is pinned and contains only the reviewed declaration", () => {
    const source = readFileSync("src/test/fixtures/admin-budget-delete-shipped.fixture.txt", "utf8");
    const tree = ts.createSourceFile("shipped.ts", source, ts.ScriptTarget.Latest, true);
    expect(ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).diagnostics ?? []).toHaveLength(0);
    expect(tree.statements).toHaveLength(1);
    const declaration = tree.statements[0];
    expect(ts.isVariableStatement(declaration)).toBe(true);
    expect(createHash("sha256").update(declaration.getText(tree).replace(/\r\n/g, "\n")).digest("hex")).toBe("075a8233f0ffa813df0b1052faf17df454b6f5846eb58e067bfac4767d051302");
  });

  it("the actual previously shipped client handles the server pause before physical cleanup", async () => {
    // Characterize the pinned promoted function using the portable, synthetic-only fixture.
    const source = readFileSync("src/test/fixtures/admin-budget-delete-shipped.fixture.txt", "utf8");
    const tree = ts.createSourceFile("shipped.ts", source, ts.ScriptTarget.Latest, true);
    const declaration = tree.statements.find((statement) => ts.isVariableStatement(statement)
      && statement.declarationList.declarations.some((d) => d.name.getText(tree) === "deleteAdminBudgetRequestsInSupabase"));
    expect(declaration).toBeDefined();
    const js = ts.transpileModule(declaration!.getText(tree), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    const remove = vi.fn();
    const from = vi.fn(() => ({ remove }));
    const rpc = vi.fn().mockResolvedValue({
      data: null, error: { code: "PT409", message: `BUDGET_DELETION_PAUSED: ${BUDGET_DELETION_PAUSED_MESSAGE}` },
    });
    const exports: Record<string, (ids: string[]) => Promise<unknown>> = {};
    new Function("exports", "supabase", "getAuthenticatedAdminSession", js)(
      exports, { rpc, storage: { from } }, () => ({ sessionToken: "LOCAL-FICTIONAL-NOT-A-SESSION" }),
    );
    await expect(exports.deleteAdminBudgetRequestsInSupabase(["synthetic-existing"])).rejects.toThrow(BUDGET_DELETION_PAUSED_MESSAGE);
    expect(rpc).toHaveBeenCalledOnce();
    expect(from).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });

  it("the portal no longer renders the misleading deletion confirmation or calls the deletion helper", () => {
    const portal = readFileSync("src/admin/AdminPortal.tsx", "utf8");
    expect(portal).not.toContain("handleConfirmBudgetRequestsDelete");
    expect(portal).not.toContain("deleteAdminBudgetRequestsInSupabase");
    expect(portal).not.toContain("Associated submission documents will be deleted from secure storage.");
    expect(portal).toContain("openBudgetRequestDetails(requestId)");
  });
});
