import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";
import {
  downloadPwaDocument,
  getPwaDocumentFilename,
  openPwaDocumentInNewTab,
} from "@/lib/pwa-renewal-document-actions";

vi.mock("@/lib/lydo-connect-supabase", () => ({
  resolveSupabaseFileUrl: vi.fn(),
}));

const originalCreateObjectUrl = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectUrl = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

describe("PWA renewal document actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolveSupabaseFileUrl).mockResolvedValue("https://staging.invalid/storage/file.pdf?token=secret");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("%PDF-test", { status: 200 })));
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn(() => "blob:renewal-test") });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: vi.fn() });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    if (originalCreateObjectUrl) Object.defineProperty(URL, "createObjectURL", originalCreateObjectUrl);
    else delete (URL as typeof URL & { createObjectURL?: typeof URL.createObjectURL }).createObjectURL;
    if (originalRevokeObjectUrl) Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectUrl);
    else delete (URL as typeof URL & { revokeObjectURL?: typeof URL.revokeObjectURL }).revokeObjectURL;
  });

  it("preserves the authoritative original filename and never derives a name from a signed query", () => {
    expect(getPwaDocumentFilename(
      "https://staging.invalid/object/opaque.pdf?token=eyJhbGciOiJub25lIn0.secret",
      "Renewal Application 2026.pdf",
    )).toBe("Renewal Application 2026.pdf");
    expect(getPwaDocumentFilename(
      "https://staging.invalid/object/Quarterly%20Report.pdf?token=eyJhbGciOiJub25lIn0.secret#fragment",
    )).toBe("Quarterly Report.pdf");
  });

  it("uses a neutral fallback when the URL has no safe pathname filename", () => {
    expect(getPwaDocumentFilename("?token=secret")).toBe("Renewal document.pdf");
  });

  it("downloads the resolved bytes with the original filename and cleans up the object URL", async () => {
    vi.useFakeTimers();
    let dispatchedFilename = "";
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      dispatchedFilename = this.download;
    });
    await downloadPwaDocument("storage://liquidation-report-files/renewal/file", "Original renewal.pdf");

    expect(resolveSupabaseFileUrl).toHaveBeenCalledWith("storage://liquidation-report-files/renewal/file");
    expect(fetch).toHaveBeenCalledWith("https://staging.invalid/storage/file.pdf?token=secret");
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalledTimes(1);
    expect(dispatchedFilename).toBe("Original renewal.pdf");
    expect(document.querySelector('a[download="Original renewal.pdf"]')).toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:renewal-test");
  });

  it("handles invalid or expired signed URLs without exposing the URL in its error", async () => {
    vi.mocked(resolveSupabaseFileUrl).mockResolvedValueOnce("");
    await expect(downloadPwaDocument("storage://private/missing.pdf", "Missing.pdf"))
      .rejects.toThrow("Unable to download this document");
    expect(fetch).not.toHaveBeenCalled();

    vi.mocked(resolveSupabaseFileUrl).mockResolvedValueOnce("https://staging.invalid/storage/file.pdf?token=secret");
    vi.mocked(fetch).mockResolvedValueOnce(new Response("expired", { status: 403 }));
    await expect(downloadPwaDocument("storage://private/expired.pdf", "Expired.pdf"))
      .rejects.toThrow("Unable to download this document");
  });

  it("opens in a separate tab and clears its opener before loading the signed file", async () => {
    const popup = { opener: window, location: { replace: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    await openPwaDocumentInNewTab("storage://private/renewal.pdf");
    expect(window.open).toHaveBeenCalledWith("about:blank", "_blank");
    expect(popup.opener).toBeNull();
    expect(popup.location.replace).toHaveBeenCalledWith("https://staging.invalid/storage/file.pdf?token=secret");
    expect(popup.close).not.toHaveBeenCalled();
  });

  it("closes the blank tab and reports a safe failure when the signed URL cannot be resolved", async () => {
    const popup = { opener: window, location: { replace: vi.fn() }, close: vi.fn() };
    vi.spyOn(window, "open").mockReturnValue(popup as unknown as Window);
    vi.mocked(resolveSupabaseFileUrl).mockResolvedValueOnce("");
    await expect(openPwaDocumentInNewTab("storage://private/missing.pdf"))
      .rejects.toThrow("Unable to open this document");
    expect(popup.close).toHaveBeenCalledTimes(1);
    expect(popup.location.replace).not.toHaveBeenCalled();
  });
});
