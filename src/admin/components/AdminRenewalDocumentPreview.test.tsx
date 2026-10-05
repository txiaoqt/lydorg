import React, { useEffect, useState } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SubmissionFile } from "@/lib/lydo-connect-data";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import { AdminRenewalDocumentPreview, preserveOrSelectFirstRenewalReviewFile } from "./AdminRenewalDocumentPreview";

vi.mock("@/lib/lydo-connect-supabase", () => ({
  resolveSupabaseFileUrl: vi.fn(),
}));

const renewalFiles = Array.from({ length: 6 }, (_, index) => ({
  id: `file-${index + 1}`,
  fileUrl: `storage://renewal/${index + 1}.pdf`,
  fileName: `document-${index + 1}.pdf`,
  fileType: "application/pdf",
}) as SubmissionFile);

const PreviewQueueHarness = ({ files }: { files: SubmissionFile[] }) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  useEffect(() => {
    setActiveId((current) => preserveOrSelectFirstRenewalReviewFile(current, files));
  }, [files]);
  const activeFile = files.find((file) => file.id === activeId) ?? null;

  return (
    <>
      {files.map((file) => (
        <button key={file.id} type="button" onClick={() => setActiveId(file.id)}>
          Select {file.id}
        </button>
      ))}
      <AdminRenewalDocumentPreview file={activeFile} title={activeFile?.fileName ?? "Renewal document preview"} />
    </>
  );
};

describe("Admin renewal document preview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveSupabaseFileUrl).mockImplementation(async (url) => `https://signed.example/${url.split("/").pop()}`);
  });

  afterEach(cleanup);

  it("auto-selects the first queue file, resolves it, and renders its signed URL in the iframe", async () => {
    expect(preserveOrSelectFirstRenewalReviewFile(null, renewalFiles)).toBe("file-1");
    render(<PreviewQueueHarness files={renewalFiles} />);

    const iframe = await screen.findByTitle("document-1.pdf");
    await waitFor(() => expect(iframe).toHaveAttribute("src", "https://signed.example/1.pdf#toolbar=0"));
    expect(resolveSupabaseFileUrl).toHaveBeenCalledTimes(1);
    expect(resolveSupabaseFileUrl).toHaveBeenCalledWith(renewalFiles[0].fileUrl);
  });

  it("resolves only the selected file, then only the newly selected file", async () => {
    render(<PreviewQueueHarness files={renewalFiles} />);
    const firstIframe = await screen.findByTitle("document-1.pdf");
    await waitFor(() => expect(firstIframe).toHaveAttribute("src", expect.stringContaining("1.pdf#toolbar=0")));
    expect(resolveSupabaseFileUrl).toHaveBeenCalledTimes(1);
    expect(resolveSupabaseFileUrl).toHaveBeenCalledWith(renewalFiles[0].fileUrl);

    fireEvent.click(screen.getByRole("button", { name: "Select file-2" }));
    const secondIframe = await screen.findByTitle("document-2.pdf");
    await waitFor(() => expect(secondIframe).toHaveAttribute("src", expect.stringContaining("2.pdf#toolbar=0")));
    expect(resolveSupabaseFileUrl).toHaveBeenCalledTimes(2);
    expect(resolveSupabaseFileUrl).toHaveBeenNthCalledWith(2, renewalFiles[1].fileUrl);
  });
});
