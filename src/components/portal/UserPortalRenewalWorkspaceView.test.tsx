import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { OrganizationProfile, OrganizationRenewalRecord, SubmissionFile, TemplateRecord } from "@/lib/lydo-connect-data";
import * as api from "@/lib/lydo-connect-supabase";
import { toast } from "@/hooks/use-toast";
import { UserPortalRenewalWorkspaceView } from "./UserPortalRenewalWorkspaceView";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));
vi.mock("./PortalDocumentDrawer", () => ({ PortalDocumentDrawer: () => null }));
vi.mock("./EndorsementGuidelinesModal", () => ({ EndorsementGuidelinesModal: () => null }));
vi.mock("@/lib/lydo-connect-supabase", () => ({
  fetchRenewalPacketInSupabase: vi.fn(),
  fetchRenewalRequiredDocumentTypesInSupabase: vi.fn(),
  subscribeToRenewalPacketChangesInSupabase: vi.fn(() => vi.fn()),
  userStartOrGetRenewalDraftInSupabase: vi.fn(),
  uploadRenewalDocumentFileInSupabase: vi.fn(),
  replaceRenewalDocumentFileInSupabase: vi.fn(),
  resolveSupabaseFileUrl: vi.fn(),
  userSubmitRenewalInSupabase: vi.fn(),
  userSubmitAdditionalRenewalDocumentsInSupabase: vi.fn(),
  userResubmitRenewalInSupabase: vi.fn(),
}));

const renewal: OrganizationRenewalRecord = {
  id: "renewal-1", organizationId: "org-1", cycleNumber: 2,
  currentAccreditationId: "accreditation-1", status: "needs_revision",
  submittedAt: "2026-10-01T00:00:00Z", reviewedAt: null, reviewedBy: null,
  adminRemarks: "Please correct the signature.",
  createdAt: "2026-10-01T00:00:00Z", updatedAt: "2026-10-01T00:00:00Z",
};
const requirement = {
  id: "constitution", databaseId: "constitution", name: "Constitution and By-Laws",
  isRequired: true, isActive: true, sortOrder: 1,
} as TemplateRecord;
const flagged: SubmissionFile = {
  id: "file-1", submissionId: "submission-1", documentTypeId: requirement.id,
  fileName: "original.pdf", fileUrl: "https://example.com/original.pdf",
  fileType: "application/pdf", fileSize: 100, validationStatus: "correct",
  adminStatus: "needs_revision", adminRemarks: "Please correct the signature.", revisionHistory: [],
};
const submission = { id: "submission-1", organizationId: "org-1", renewalId: renewal.id, status: "needs_revision" };
const packet = { submission, files: [flagged] } as Awaited<ReturnType<typeof api.fetchRenewalPacketInSupabase>>;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

async function startCorrection() {
  render(<UserPortalRenewalWorkspaceView
    currentProfile={{ id: "org-1", organizationName: "Youth Organization" } as OrganizationProfile}
    activeRenewal={renewal} userRenewalState={null} navigate={vi.fn()} userRouteMap={{}}
  />);
  const upload = screen.getByRole("button", { name: "Upload Multiple Documents" });
  await waitFor(() => expect(upload).toBeEnabled());
  fireEvent.click(upload);
  const input = document.querySelector('input[type="file"][multiple]') as HTMLInputElement;
  await act(async () => {
    fireEvent.change(input, { target: { files: [new File(["%PDF-1.4 corrected"], `${requirement.name}.pdf`, { type: "application/pdf" })] } });
  });
  await screen.findByText("Ready", { exact: true });
  fireEvent.click(screen.getByRole("button", { name: "Submit Selected for Review" }));
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Submit Corrections" }));
  });
}

describe("Renewal correction upload feedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(api.fetchRenewalRequiredDocumentTypesInSupabase).mockResolvedValue([requirement]);
    vi.mocked(api.fetchRenewalPacketInSupabase).mockResolvedValue(packet);
  });
  afterEach(cleanup);

  it("keeps processing feedback when its saved file becomes Under Review and closes before refresh completes", async () => {
    const resubmit = deferred<Awaited<ReturnType<typeof api.userResubmitRenewalInSupabase>>>();
    const refresh = deferred<typeof packet>();
    const saved = { ...flagged, adminStatus: "submitted" as const, adminRemarks: null };
    vi.mocked(api.replaceRenewalDocumentFileInSupabase).mockResolvedValue(saved);
    vi.mocked(api.userResubmitRenewalInSupabase).mockReturnValue(resubmit.promise);
    vi.mocked(api.fetchRenewalPacketInSupabase).mockResolvedValueOnce(packet).mockReturnValue(refresh.promise);

    await startCorrection();
    await waitFor(() => expect(api.userResubmitRenewalInSupabase).toHaveBeenCalled());
    expect(screen.getByText("Processing 1 file…")).toBeInTheDocument();
    expect(screen.queryByText("Error", { exact: true })).not.toBeInTheDocument();
    expect(screen.queryByText("This requirement is under review and cannot be re-uploaded.")).not.toBeInTheDocument();

    await act(async () => resubmit.resolve({ success: true, renewalId: renewal.id, resubmittedAt: "2026-10-03T00:00:00Z" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Renewal submitted for review" }));
    await act(async () => refresh.resolve({ ...packet, files: [saved] }));
  });

  it("keeps a failed replacement visible for retry with the actual error", async () => {
    vi.mocked(api.replaceRenewalDocumentFileInSupabase).mockRejectedValue(new Error("Replacement upload failed."));
    await startCorrection();
    expect(await screen.findByText("Replacement upload failed.")).toBeInTheDocument();
    expect(screen.getByText("Error", { exact: true })).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(api.userResubmitRenewalInSupabase).not.toHaveBeenCalled();
  });
});
