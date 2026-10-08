import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PwaDocumentManager } from "./PwaDocumentPages";

const mocks = vi.hoisted(() => ({ batch: vi.fn(), preview: vi.fn(), toast: vi.fn() }));
vi.mock("@/lib/lydo-connect-supabase", () => ({
  submitOrganizationDocumentsBatchToSupabase: mocks.batch,
  resolveSupabaseFileUrl: mocks.preview,
  removeOrganizationDocumentFromSupabase: vi.fn(),
  replaceOrganizationDocumentFileInSupabase: vi.fn(),
}));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));

function file(name: string) {
  const content = "%PDF-1.4";
  const result = new File([content], name, { type: "application/pdf" });
  Object.defineProperty(result, "slice", { value: (start?: number, end?: number) => ({ arrayBuffer: async () => new TextEncoder().encode(content.slice(start, end)).buffer }) });
  return result;
}
const success = (index: number) => ({ documentTypeId: `db-${index}`, documentTypeName: index ? "Form" : "Constitution", fileName: index ? "Form.pdf" : "Constitution.pdf", success: true, submissionId: "submission", file: { id: `saved-${index}`, documentTypeId: `db-${index}`, submissionId: "submission", adminStatus: "draft", fileUrl: `storage://organization-documents/saved-${index}.pdf` } });

describe("PWA registration upload feedback and Retry Failed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(navigator, "connection", { value: undefined, configurable: true });
  });
  it("shows progress, preserves successful files, retries only failures and retains saved metadata for finalization", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const data = {
      requiredTemplates: [{ id: "doc-0", databaseId: "db-0", name: "Constitution" }, { id: "doc-1", databaseId: "db-1", name: "Form" }],
      documentFiles: [], submission: { id: "submission", status: "draft" },
      refreshDocuments: vi.fn().mockRejectedValue(new Error("Refresh unavailable")),
    };
    let finish: (result: unknown) => void = () => {};
    mocks.batch.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { container, rerender } = render(<MemoryRouter><PwaDocumentManager data={data as never} /></MemoryRouter>);
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file("Constitution.pdf"), file("Form.pdf")] } });
    fireEvent.click(screen.getByLabelText("Optimize for slow/mobile connection"));
    expect(screen.getByText(/documents will upload one at a time/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit Selected Files" }));
    const confirm = await screen.findByRole("dialog");
    fireEvent.click(within(confirm).getByRole("button", { name: "Submit for Review" }));
    await waitFor(() => expect(mocks.batch).toHaveBeenCalledOnce());
    const options = mocks.batch.mock.calls[0][0];
    expect(options.slowMode).toBe(true);
    act(() => options.onProgress(1, { phase: "uploading", percent: 68 }));
    expect(screen.getByText("68%")).toBeInTheDocument();
    expect(screen.getByLabelText("Form.pdf upload progress")).toHaveAttribute("value", "68");
    expect(screen.getByRole("checkbox")).toBeDisabled();
    expect(screen.getAllByRole("button", { name: "Remove" }).every((button) => button.hasAttribute("disabled"))).toBe(true);
    const failed = { ...success(1), success: false, error: "Review finalization failed" };
    await act(async () => finish({ results: [success(0), failed], successCount: 1, failureCount: 1 }));
    expect(screen.getByText("1 submitted, 1 failed.")).toBeInTheDocument();
    expect(screen.queryByText("Constitution.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("Form.pdf")).toBeInTheDocument();
    expect(mocks.preview).not.toHaveBeenCalled();
    expect(data.refreshDocuments).toHaveBeenCalledOnce();

    // The first attempt may have submitted files before parent status saving failed.
    data.submission.status = "under_admin_review";
    rerender(<MemoryRouter><PwaDocumentManager data={data as never} /></MemoryRouter>);
    mocks.batch.mockResolvedValueOnce({ results: [success(1)], successCount: 1, failureCount: 0 });
    const retry = screen.getByRole("button", { name: "Retry Failed" });
    fireEvent.click(retry); fireEvent.click(retry);
    await waitFor(() => expect(screen.getByText("2 submitted.")).toBeInTheDocument());
    expect(mocks.batch).toHaveBeenCalledTimes(2);
    expect(mocks.batch.mock.calls[1][0].documents).toHaveLength(1);
    expect(mocks.batch.mock.calls[1][0].documents[0]).toMatchObject({ documentTypeId: "db-1", file: { name: "Form.pdf" }, retryResult: { file: { id: "saved-1" }, submissionId: "submission" } });
    expect(screen.queryByRole("button", { name: "Retry Failed" })).not.toBeInTheDocument();
    expect(mocks.preview).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
