import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  upload: vi.fn(),
  insert: vi.fn(),
  remove: vi.fn(),
  uploadError: null as { message: string } | null,
}));

vi.mock("./supabase", () => ({
  supabaseUrl: "https://fixture.invalid",
  supabaseAuthStorageKey: "fixture-auth",
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { user: { id: "owner" } } }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    storage: {
      from: (bucket: string) => ({
        upload: (...args: unknown[]) => mock.upload(bucket, ...args),
        remove: mock.remove,
      }),
    },
    from: (table: string) => {
      let payload: Record<string, unknown> | null = null;
      const response = () => ({
        data: payload
          ? { id: "fixture-file", ...payload }
          : table === "organization_profiles"
            ? { id: "fixture-org", user_id: "owner", is_suspended: false }
            : { id: "fixture-parent", status: "draft", revision_locked: false },
        error: null,
      });
      const query: any = {
        select: () => query,
        eq: () => query,
        insert: (value: Record<string, unknown>) => {
          payload = value;
          mock.insert(table, value);
          return query;
        },
        single: async () => response(),
        maybeSingle: async () => response(),
        then: (resolve: (value: unknown) => void) => Promise.resolve({ data: [], error: null }).then(resolve),
      };
      return query;
    },
  },
}));

import {
  createLiquidationReportFileInSupabase,
  uploadBudgetRequestFileToSupabase,
  uploadYpopFileToSupabase,
} from "./lydo-connect-supabase";

const parent = "11111111-1111-4111-8111-111111111111";
const pdf = () => ({
  name: "Synthetic attachment.pdf",
  type: "application/pdf",
  size: 16,
  slice: () => ({ arrayBuffer: async () => new TextEncoder().encode("%PDF-").buffer }),
}) as unknown as File;

const workflows = [
  { name: "budget", bucket: "budget-request-files", table: "budget_request_files", run: () => uploadBudgetRequestFileToSupabase(parent, pdf()) },
  { name: "liquidation", bucket: "liquidation-report-files", table: "liquidation_report_files", run: () => createLiquidationReportFileInSupabase({ liquidationReportId: parent, file: pdf() }) },
  { name: "YPOP", bucket: "ypop-files", table: "ypop_files", run: () => uploadYpopFileToSupabase({ entryId: parent, organizationId: "fixture-org", file: pdf() }) },
];

beforeEach(() => {
  vi.clearAllMocks();
  mock.uploadError = null;
  mock.upload.mockImplementation(async () => ({ error: mock.uploadError }));
});
afterEach(() => vi.restoreAllMocks());

describe("Parent-linked owner uploads (mocked client)", () => {
  for (const workflow of workflows) {
    it(`${workflow.name} creates unique INSERT-only objects and preserves the parent path`, async () => {
      vi.spyOn(Date, "now").mockReturnValue(1791799200000);
      await workflow.run();
      await workflow.run();
      expect(mock.upload).toHaveBeenCalledTimes(2);
      expect(mock.upload.mock.calls[0][1]).not.toBe(mock.upload.mock.calls[1][1]);
      for (const [bucket, objectPath, , options] of mock.upload.mock.calls) {
        expect(bucket).toBe(workflow.bucket);
        expect(objectPath).toMatch(new RegExp(`^${parent}/[0-9]+-[0-9a-f-]{36}-Synthetic-attachment\\.pdf$`));
        expect(options).toEqual({ upsert: false, contentType: "application/pdf" });
      }
      expect(mock.insert).toHaveBeenCalledTimes(2);
      expect(mock.insert.mock.calls[0][0]).toBe(workflow.table);
      expect(mock.insert.mock.calls[0][1].file_url).toBe(`storage://${workflow.bucket}/${mock.upload.mock.calls[0][1]}`);
      expect(mock.remove).not.toHaveBeenCalled();
    });

    it(`${workflow.name} stops on Storage denial without linking metadata or deleting evidence`, async () => {
      mock.uploadError = { message: "Storage access denied" };
      await expect(workflow.run()).rejects.toThrow("Storage access denied");
      expect(mock.insert).not.toHaveBeenCalled();
      expect(mock.remove).not.toHaveBeenCalled();
    });
  }
});
