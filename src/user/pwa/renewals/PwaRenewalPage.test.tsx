import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PWA_DOCUMENT_PREVIEW_EVENT } from "@/lib/pwa-document-preview";
import { PwaRenewalPage } from "./PwaRenewalPage";

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  openInNewTab: vi.fn(),
  workspaceProps: null as null | Record<string, any>,
  toast: vi.fn(),
}));

vi.mock("@/lib/pwa-renewal-document-actions", () => ({
  downloadPwaDocument: mocks.download,
  getPwaDocumentFilename: (reference: string, name?: string) => name || "Renewal document.pdf",
  openPwaDocumentInNewTab: mocks.openInNewTab,
}));
vi.mock("@/hooks/use-toast", () => ({ toast: mocks.toast }));
vi.mock("../hooks/usePwaNavigation", () => ({ usePwaNavigation: () => ({ go: vi.fn() }) }));
vi.mock("@/components/portal/UserPortalRenewalWorkspaceView", () => ({
  UserPortalRenewalWorkspaceView: (props: Record<string, any>) => {
    mocks.workspaceProps = props;
    return <div>
      <button onClick={() => props.openPreview("https://staging.invalid/file.pdf?token=signed-secret", "Authoritative renewal.pdf")}>Preview renewal</button>
      <button onClick={() => props.openFile("https://staging.invalid/file.pdf?token=signed-secret", "Authoritative renewal.pdf")}>Download File</button>
      <button onClick={() => props.openInNewTab("https://staging.invalid/file.pdf?token=signed-secret")}>Open in New Tab</button>
    </div>;
  },
}));

const data = {
  renewals: [{ id: "renewal-1", status: "approved" }],
  renewalState: { activeRenewal: { id: "renewal-1", status: "approved" }, statusLabel: "Approved" },
  renewalsLoading: false,
  renewalsError: null,
  refreshRenewals: vi.fn(),
  profile: { id: "synthetic-org" },
} as any;

afterEach(() => {
  mocks.workspaceProps = null;
  mocks.download.mockReset();
  mocks.openInNewTab.mockReset();
  mocks.toast.mockReset();
});

describe("PWA renewal document action wiring", () => {
  it("opens exactly one preview with the authoritative filename, not signed query text", () => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    render(<PwaRenewalPage data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Preview renewal" }));
    const preview = dispatch.mock.calls
      .map(([event]) => event)
      .find((event) => event.type === PWA_DOCUMENT_PREVIEW_EVENT) as CustomEvent | undefined;
    expect(preview?.detail).toEqual({
      reference: "https://staging.invalid/file.pdf?token=signed-secret",
      title: "Authoritative renewal.pdf",
    });
    expect(dispatch.mock.calls.filter(([event]) => event.type === PWA_DOCUMENT_PREVIEW_EVENT)).toHaveLength(1);
    expect(preview?.detail.title).not.toContain("signed-secret");
  });

  it("routes Download File to the download operation and not the preview", () => {
    render(<PwaRenewalPage data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Download File" }));
    expect(mocks.download).toHaveBeenCalledWith(
      "https://staging.invalid/file.pdf?token=signed-secret",
      "Authoritative renewal.pdf",
    );
    expect(mocks.openInNewTab).not.toHaveBeenCalled();
  });

  it("routes Open in New Tab to its own operation", () => {
    render(<PwaRenewalPage data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Open in New Tab" }));
    expect(mocks.openInNewTab).toHaveBeenCalledWith("https://staging.invalid/file.pdf?token=signed-secret");
    expect(mocks.download).not.toHaveBeenCalled();
  });

  it("shows a safe user-facing message on download failure", async () => {
    mocks.download.mockRejectedValueOnce(new Error("raw signed URL must not escape"));
    render(<PwaRenewalPage data={data} />);
    fireEvent.click(screen.getByRole("button", { name: "Download File" }));
    await vi.waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({
      title: "Unable to download document",
      description: "This file could not be downloaded. Check your connection and try again.",
    })));
    expect(mocks.toast.mock.calls[0][0].description).not.toContain("signed URL");
  });
});
