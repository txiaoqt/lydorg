import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestPwaDocumentPreview } from "@/lib/pwa-document-preview";
import { PwaDocumentPreviewHost } from "./PwaDocumentPreview";

const mocks = vi.hoisted(() => ({
  authListener: null as null | ((event: string, session: any) => void),
  unsubscribe: vi.fn(),
  resolve: vi.fn(),
}));

vi.mock("@/lib/lydo-connect-supabase", () => ({
  resolveSupabaseFileUrl: mocks.resolve,
}));
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: (callback: (event: string, session: any) => void) => {
        mocks.authListener = callback;
        return { data: { subscription: { unsubscribe: mocks.unsubscribe } } };
      },
    },
  },
}));
vi.mock("@/components/portal/PortalDocumentPreviewModal", () => ({
  PortalDocumentPreviewModal: (props: { open: boolean; previewTitle: string; previewUrl: string; previewEmptyMessage: string }) =>
    props.open ? <section><h2>{props.previewTitle}</h2><p>{props.previewUrl || props.previewEmptyMessage}</p></section> : null,
}));

describe("PWA private document preview lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.authListener = null;
  });
  afterEach(() => { vi.restoreAllMocks(); });

  it("clears the prior private preview on logout and direct account switching", async () => {
    mocks.resolve.mockResolvedValue("https://staging.invalid/private/org-a.pdf?token=private");
    render(<PwaDocumentPreviewHost />);
    act(() => { requestPwaDocumentPreview("storage://private/org-a.pdf", "Org A document.pdf"); });
    expect(await screen.findByText("https://staging.invalid/private/org-a.pdf?token=private")).toBeInTheDocument();

    act(() => { mocks.authListener?.("INITIAL_SESSION", { user: { id: "organization-a" } }); });
    act(() => { mocks.authListener?.("SIGNED_IN", { user: { id: "organization-b" } }); });
    expect(screen.queryByText("https://staging.invalid/private/org-a.pdf?token=private")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Org A document.pdf" })).toBeNull();
    expect(mocks.unsubscribe).not.toHaveBeenCalled();
  });

  it("recovers cleanly from a failed preview when the next document resolves", async () => {
    mocks.resolve.mockResolvedValueOnce("").mockResolvedValueOnce("https://staging.invalid/private/next.pdf");
    render(<PwaDocumentPreviewHost />);
    act(() => { requestPwaDocumentPreview("storage://private/missing.pdf", "Missing.pdf"); });
    expect(await screen.findByText("This file could not be loaded. Check your connection and try again.")).toBeInTheDocument();

    act(() => { requestPwaDocumentPreview("storage://private/next.pdf", "Next renewal.pdf"); });
    expect(await screen.findByText("https://staging.invalid/private/next.pdf")).toBeInTheDocument();
    expect(screen.queryByText("This file could not be loaded. Check your connection and try again.")).toBeNull();
  });
});
