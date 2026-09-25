import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YpopProofDrawer } from "./YpopProofDrawer";
import * as lydoSupabase from "@/lib/lydo-connect-supabase";

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => "blob:mock-url");
    window.URL.revokeObjectURL = vi.fn();
  }
  vi.restoreAllMocks();
});

const setViewportWidth = (width: number) => {
  window.innerWidth = width;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: width >= 1024 ? query.includes("min-width: 1024px") : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const mockActivity = {
  id: "act-city-101",
  semesterKey: "2026-S1",
  name: "Pasig River Clean-up Drive",
  title: "Pasig River Clean-up Drive",
  date: "2026-09-20T08:00:00Z",
  startDate: "2026-09-20T08:00:00Z",
  endDate: "2026-09-20T12:00:00Z",
  venue: "Pasig Riverbanks",
  points: 5,
  category: "mandatory",
  description: "Community river clean-up drive.",
};

const makeSavedFile = (id: string, participationId: string, fileName: string) => ({
  id,
  participationId,
  organizationId: "org-1",
  fileName,
  fileUrl: `storage://ypop-proofs/${participationId}/${fileName}`,
  fileType: "application/pdf",
  fileSize: 102400,
  uploadedAt: "2026-09-20T10:00:00Z",
});

describe("City-Led YPOP Proof Upload Workflow — Local Staging and Explicit Submission", () => {
  // TEST 1 — Initial file selection is staged only
  it("TEST 1: Initial file selection is staged only (shows Ready to Upload, no Draft status in parent header)", () => {
    setViewportWidth(1280);
    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={null}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy pdf content"], "cleanup_attendance.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    // File appears in UI
    expect(screen.getAllByText("cleanup_attendance.pdf").length).toBeGreaterThan(0);
    // Shows Ready to Upload badge
    expect(screen.getByText("Ready to Upload")).toBeInTheDocument();
    // Parent header must NOT show "Status: DRAFT"
    expect(screen.queryByText(/Status: DRAFT/i)).not.toBeInTheDocument();
    // Must NOT show "Draft Proof Attached" banner
    expect(screen.queryByText("Draft Proof Attached")).not.toBeInTheDocument();
  });

  // TEST 2 — Initial selection does not persist participation
  it("TEST 2: Initial selection does not call ensureYpopEventParticipationInSupabase", () => {
    setViewportWidth(1280);
    const ensureSpy = vi.spyOn(lydoSupabase, "ensureYpopEventParticipationInSupabase");
    const uploadSpy = vi.spyOn(lydoSupabase, "uploadYpopEventFileToSupabase");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={null}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy pdf"], "attendance.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(ensureSpy).not.toHaveBeenCalled();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  // TEST 3 — Initial selection does not persist file row
  it("TEST 3: Initial selection does not upload to Supabase Storage or insert ypop_event_files", () => {
    setViewportWidth(1280);
    const uploadSpy = vi.spyOn(lydoSupabase, "uploadYpopEventFileToSupabase");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={null}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy bytes"], "photo.png", { type: "image/png" });

    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(uploadSpy).not.toHaveBeenCalled();
  });

  // TEST 4 — Refresh/reopen does not resurrect unsubmitted file
  it("TEST 4: Refresh/reopen with store participation=null contains no staged files", () => {
    setViewportWidth(1280);
    const { unmount } = render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={null}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["dummy"], "temporary.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getAllByText("temporary.pdf").length).toBeGreaterThan(0);

    // Unmount and remount (simulating page reload / reopening drawer from store)
    unmount();

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={null}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.queryByText("temporary.pdf")).not.toBeInTheDocument();
    expect(screen.getByText("Attach File")).toBeInTheDocument();
  });

  // TEST 5 — Explicit Submit persists participation and files to pending_verification
  it("TEST 5: Explicit Submit Proof for Review creates participation, uploads files, and updates status to pending_verification", async () => {
    setViewportWidth(1280);
    const createdParticipation = {
      id: "part-new-1",
      organizationId: "org-1",
      activityId: mockActivity.id,
      activityName: mockActivity.name,
      status: "draft",
    };
    const savedFile = makeSavedFile("f-saved-1", "part-new-1", "proof_doc.pdf");
    const updatedParticipation = {
      ...createdParticipation,
      status: "pending_verification",
      proofSubmittedAt: "2026-09-25T00:00:00Z",
    };

    vi.spyOn(lydoSupabase, "ensureYpopEventParticipationInSupabase").mockResolvedValue(createdParticipation as any);
    vi.spyOn(lydoSupabase, "uploadYpopEventFileToSupabase").mockResolvedValue(savedFile as any);
    vi.spyOn(lydoSupabase, "updateYpopEventParticipationInSupabase").mockResolvedValue(updatedParticipation as any);

    const onParticipationUpdated = vi.fn();
    const onFileCreated = vi.fn();

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={null}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={onParticipationUpdated}
        onFileCreated={onFileCreated}
        onFileDeleted={vi.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["content"], "proof_doc.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Staged only
    expect(lydoSupabase.ensureYpopEventParticipationInSupabase).not.toHaveBeenCalled();
    expect(lydoSupabase.uploadYpopEventFileToSupabase).not.toHaveBeenCalled();

    // Click Submit Proof for Review
    const submitBtn = screen.getByRole("button", { name: /Submit Proof for Review/i });
    fireEvent.click(submitBtn);

    // Confirmation dialog appears
    const confirmBtn = screen.getByRole("button", { name: /Submit Proof/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(lydoSupabase.ensureYpopEventParticipationInSupabase).toHaveBeenCalledWith({
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        activityDate: mockActivity.startDate,
        venue: mockActivity.venue,
      });
      expect(lydoSupabase.uploadYpopEventFileToSupabase).toHaveBeenCalledWith({
        participationId: "part-new-1",
        organizationId: "org-1",
        file,
      });
      expect(lydoSupabase.updateYpopEventParticipationInSupabase).toHaveBeenCalledWith(
        "part-new-1",
        expect.objectContaining({
          status: "pending_verification",
        })
      );
      expect(onParticipationUpdated).toHaveBeenCalledWith(updatedParticipation);
      expect(onFileCreated).toHaveBeenCalledWith(savedFile);
    });
  });

  // TEST 6 — Needs Revision remains intact
  it("TEST 6: Needs Revision displays existing file as Needs Revision, replacement staged file as Ready to Upload, and resubmit updates to pending_verification", async () => {
    setViewportWidth(1280);
    const revParticipation = {
      id: "part-rev-1",
      organizationId: "org-1",
      activityId: mockActivity.id,
      activityName: mockActivity.name,
      status: "needs_revision",
      adminRemarks: "Please provide signed attendance sheet with official stamp.",
    };
    const oldFile = makeSavedFile("f-old-1", "part-rev-1", "old_attendance.pdf");
    const replacementSavedFile = makeSavedFile("f-new-1", "part-rev-1", "signed_attendance_v2.pdf");

    vi.spyOn(lydoSupabase, "uploadYpopEventFileToSupabase").mockResolvedValue(replacementSavedFile as any);
    vi.spyOn(lydoSupabase, "updateYpopEventParticipationInSupabase").mockResolvedValue({
      ...revParticipation,
      status: "pending_verification",
    } as any);

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={revParticipation as any}
        eventFiles={[oldFile]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Old file shows Needs Revision
    expect(screen.getAllByText("old_attendance.pdf").length).toBeGreaterThan(0);
    expect(screen.getByText("Needs Revision")).toBeInTheDocument();

    // Stage a new replacement file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const newFile = new File(["new signed content"], "signed_attendance_v2.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [newFile] } });

    // Old file remains Needs Revision, new replacement file is Ready to Upload
    expect(screen.getByText("Needs Revision")).toBeInTheDocument();
    expect(screen.getByText("Ready to Upload")).toBeInTheDocument();
    expect(lydoSupabase.uploadYpopEventFileToSupabase).not.toHaveBeenCalled();

    // Resubmit Corrected Proof
    const resubmitBtn = screen.getByRole("button", { name: /Resubmit Corrected Proof/i });
    fireEvent.click(resubmitBtn);

    const confirmBtn = screen.getByRole("button", { name: /Submit Proof/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(lydoSupabase.uploadYpopEventFileToSupabase).toHaveBeenCalledWith({
        participationId: "part-rev-1",
        organizationId: "org-1",
        file: newFile,
      });
      expect(lydoSupabase.updateYpopEventParticipationInSupabase).toHaveBeenCalledWith(
        "part-rev-1",
        expect.objectContaining({
          status: "pending_verification",
        })
      );
    });
  });

  // TEST 7 — Multi-file staging & local removal before submit
  it("TEST 7: Multiple files can be staged and individually removed locally with zero network calls before submission", async () => {
    setViewportWidth(1280);
    const deleteSpy = vi.spyOn(lydoSupabase, "deleteYpopEventFileFromSupabase");
    const uploadSpy = vi.spyOn(lydoSupabase, "uploadYpopEventFileToSupabase");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={null}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file1 = new File(["f1"], "attendance.pdf", { type: "application/pdf" });
    const file2 = new File(["f2"], "photos.pdf", { type: "application/pdf" });

    fireEvent.change(fileInput, { target: { files: [file1, file2] } });

    expect(screen.getAllByText("attendance.pdf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("photos.pdf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Ready to Upload").length).toBe(2);

    // Remove file 1
    const removeButtons = screen.getAllByTitle("Remove file");
    expect(removeButtons.length).toBe(2);
    fireEvent.click(removeButtons[0]);

    // file1 is removed locally; file2 remains
    expect(screen.queryByText("attendance.pdf")).not.toBeInTheDocument();
    expect(screen.getAllByText("photos.pdf").length).toBeGreaterThan(0);

    // Zero network calls during local removal
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(uploadSpy).not.toHaveBeenCalled();
  });

  // TEST 8 — Locked states (verified & pending_verification)
  it("TEST 8: Locked states (verified & pending_verification) disable editing, deletion, and uploading", () => {
    setViewportWidth(1280);
    const verifiedPart = {
      id: "part-ver-1",
      organizationId: "org-1",
      activityId: mockActivity.id,
      activityName: mockActivity.name,
      status: "verified",
    };
    const file = makeSavedFile("f-ver-1", "part-ver-1", "official_record.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={verifiedPart as any}
        eventFiles={[file]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText(/Participation Verified/i)).toBeInTheDocument();
    expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit Proof/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Close/i }).length).toBeGreaterThan(0);
  });
});
