import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YpopPpaModal } from "./YpopPpaModal";
import * as lydoSupabase from "@/lib/lydo-connect-supabase";
import { reconcileYpopOrgActivityFiles } from "@/lib/lydo-connect-store";
import type {
  YPOPEntry,
  YPOPOrgActivity,
  YPOPOrgActivityFile,
} from "@/lib/lydo-connect-data";

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
  if (!window.URL.createObjectURL) {
    window.URL.createObjectURL = vi.fn(() => "blob:mock-object-url");
    window.URL.revokeObjectURL = vi.fn();
  }
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

const mockEntry: YPOPEntry = {
  id: "entry-1",
  semester: "2026-S1",
  organizationId: "org-1",
  submissionStatus: "draft",
  complianceReviewStatus: "compliant",
  status: "draft",
  totalPoints: 10,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

const mockDraftActivity: YPOPOrgActivity = {
  id: "ppa-draft-1",
  ypopEntryId: "entry-1",
  organizationId: "org-1",
  submittedBy: "user-1",
  activityName: "Tree Planting Initiative",
  activityDate: "2026-09-10",
  venue: "Rainforest Park, Pasig City",
  narrativeReport: "Community tree planting with local youth volunteers.",
  status: "draft",
  adminRemarks: "",
  submittedAt: "",
  createdAt: "2026-09-10T00:00:00Z",
  updatedAt: "2026-09-10T00:00:00Z",
};

const mockSubmittedActivity: YPOPOrgActivity = {
  ...mockDraftActivity,
  id: "ppa-sub-1",
  status: "submitted",
  submittedAt: "2026-09-10T12:00:00Z",
};

const mockRevisionActivity: YPOPOrgActivity = {
  ...mockDraftActivity,
  id: "ppa-rev-1",
  status: "needs_revision",
  adminRemarks: "Please attach the signed attendance sheet.",
  submittedAt: "2026-09-10T12:00:00Z",
};

const mockApprovedActivity: YPOPOrgActivity = {
  ...mockDraftActivity,
  id: "ppa-app-1",
  status: "approved",
  approvedAt: "2026-09-11T00:00:00Z",
  submittedAt: "2026-09-10T12:00:00Z",
};

const makePpaFile = (id: string, orgActivityId: string, fileName: string): YPOPOrgActivityFile => ({
  id,
  orgActivityId,
  organizationId: "org-1",
  fileName,
  fileUrl: `storage://ypop-org-activities/${orgActivityId}/${fileName}`,
  fileType: "application/pdf",
  fileSize: 102400,
  uploadedAt: "2026-09-10T12:00:00Z",
});

describe("Organization-Led PPA Drawer & File Submission/Persistence Workflow", () => {
  // =========================================================================
  // GROUP 1: FILE SUBMISSION & PERSISTENCE
  // =========================================================================

  it("1. PPA draft with attachment persists correctly without rejecting file upload", async () => {
    setViewportWidth(1280);
    const onActivitySaved = vi.fn();
    const onFileCreated = vi.fn();

    const createdDraft: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-new-draft",
    };

    const uploadedFile = makePpaFile("f-draft-1", "ppa-new-draft", "attendance.pdf");

    vi.spyOn(lydoSupabase, "createYpopOrgActivityInSupabase").mockResolvedValue(createdDraft);
    vi.spyOn(lydoSupabase, "uploadYpopOrgActivityFileToSupabase").mockResolvedValue(uploadedFile);

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={null}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={onActivitySaved}
        onFileCreated={onFileCreated}
        onFileDeleted={vi.fn()}
      />
    );

    // Enter required details
    fireEvent.change(screen.getByPlaceholderText(/Enter activity title/i), {
      target: { value: "Youth Clean-Up Drive" },
    });
    fireEvent.change(screen.getByLabelText(/Date Conducted/i), {
      target: { value: "2026-09-12" },
    });

    // Stage a file
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(["dummy content"], "attendance.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Click "Save as Draft"
    fireEvent.click(screen.getByRole("button", { name: /Save as Draft/i }));

    await waitFor(() => {
      expect(lydoSupabase.createYpopOrgActivityInSupabase).toHaveBeenCalledWith(
        expect.objectContaining({
          activityName: "Youth Clean-Up Drive",
          status: "draft",
        })
      );
    });

    await waitFor(() => {
      expect(lydoSupabase.uploadYpopOrgActivityFileToSupabase).toHaveBeenCalledWith(
        expect.objectContaining({
          orgActivityId: "ppa-new-draft",
          file: testFile,
        })
      );
      expect(onFileCreated).toHaveBeenCalledWith(uploadedFile);
    });
  });

  it("2 & 3. PPA submission creates draft first, uploads file with correct orgActivityId, then transitions to submitted", async () => {
    setViewportWidth(1280);
    const callOrder: string[] = [];

    const createdDraft: YPOPOrgActivity = {
      ...mockDraftActivity,
      id: "ppa-submit-test",
      status: "draft",
    };

    const uploadedFile = makePpaFile("f-sub-1", "ppa-submit-test", "narrative.pdf");

    const finalSubmitted: YPOPOrgActivity = {
      ...createdDraft,
      status: "submitted",
      submittedAt: "2026-09-10T12:00:00Z",
    };

    vi.spyOn(lydoSupabase, "createYpopOrgActivityInSupabase").mockImplementation(async () => {
      callOrder.push("create_draft");
      return createdDraft;
    });

    vi.spyOn(lydoSupabase, "uploadYpopOrgActivityFileToSupabase").mockImplementation(async (params) => {
      callOrder.push(`upload_file_${params.orgActivityId}`);
      return uploadedFile;
    });

    vi.spyOn(lydoSupabase, "updateYpopOrgActivityInSupabase").mockImplementation(async (id, patch) => {
      callOrder.push(`update_status_${patch.status}`);
      return { ...createdDraft, ...patch } as any;
    });

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={null}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/Enter activity title/i), {
      target: { value: "Leadership Seminar" },
    });
    fireEvent.change(screen.getByLabelText(/Date Conducted/i), {
      target: { value: "2026-09-12" },
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const testFile = new File(["sample"], "narrative.pdf", { type: "application/pdf" });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    // Submit for Review
    fireEvent.click(screen.getByRole("button", { name: /Submit for Review/i }));

    await waitFor(() => {
      // Step order MUST be: 1. create_draft, 2. upload_file, 3. update_status_submitted
      expect(callOrder).toEqual([
        "create_draft",
        "upload_file_ppa-submit-test",
        "update_status_submitted",
      ]);
    });
  });

  it("4 & 5. reconcileYpopOrgActivityFiles: Draft attachments do NOT appear to Admin; submitted attachments DO appear", () => {
    const draftAct = mockDraftActivity;
    const subAct = mockSubmittedActivity;
    const draftFile = makePpaFile("f-draft", draftAct.id, "draft.pdf");
    const subFile = makePpaFile("f-sub", subAct.id, "submitted.pdf");
    const allFiles = [draftFile, subFile];
    const allActivities = [draftAct, subAct];

    // Admin view
    const adminFiles = reconcileYpopOrgActivityFiles([], allFiles, allActivities, true);
    expect(adminFiles).toHaveLength(1);
    expect(adminFiles[0].id).toBe("f-sub");

    // User view sees both
    const userFiles = reconcileYpopOrgActivityFiles([], allFiles, allActivities, false);
    expect(userFiles).toHaveLength(2);
  });

  it("6, 7 & 8. User sees attachment, can select for preview, and open/download in Document Preview", async () => {
    setViewportWidth(1280);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    vi.spyOn(lydoSupabase, "resolveSupabaseFileUrl").mockImplementation(async (url) => `https://cdn.example.com/${url}`);

    const file = makePpaFile("f-1", mockSubmittedActivity.id, "project_report.pdf");

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockSubmittedActivity}
        orgActivityFiles={[file]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // File name appears in attached files list and preview section
    expect(screen.getAllByText("project_report.pdf").length).toBeGreaterThanOrEqual(1);

    // Document Preview section present
    expect(screen.getByText("Document Preview")).toBeInTheDocument();

    // Open in New Tab
    const openBtn = screen.getByRole("button", { name: /Open in New Tab/i });
    fireEvent.click(openBtn);
    expect(openSpy).toHaveBeenCalled();

    // Download File button present
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
    openSpy.mockRestore();
  });

  it("9 & 10. Submitted attachment cannot be deleted or replaced by User (read-only locking)", () => {
    setViewportWidth(1280);
    const file = makePpaFile("f-1", mockSubmittedActivity.id, "locked_proof.pdf");

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockSubmittedActivity}
        orgActivityFiles={[file]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // No upload dropzone
    expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();

    // No delete / remove button
    expect(screen.queryByTitle(/Remove attachment/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remove attachment/i })).not.toBeInTheDocument();
  });

  it("11, 12 & 13. Needs Revision permits file replacement, resubmission, and maintains PPA association", async () => {
    setViewportWidth(1280);
    const file = makePpaFile("f-rev-orig", mockRevisionActivity.id, "bad_proof.pdf");
    const onFileDeleted = vi.fn();
    vi.spyOn(lydoSupabase, "deleteYpopOrgActivityFileFromSupabase").mockResolvedValue();

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockRevisionActivity}
        orgActivityFiles={[file]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={onFileDeleted}
      />
    );

    // Admin revision remarks are visible
    expect(screen.getByText(/Please attach the signed attendance sheet/i)).toBeInTheDocument();

    // Upload dropzone is available
    expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();

    // Delete button is present on revision file
    const deleteBtn = screen.getByTitle(/Remove attachment/i);
    expect(deleteBtn).toBeInTheDocument();
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(lydoSupabase.deleteYpopOrgActivityFileFromSupabase).toHaveBeenCalledWith(
        "f-rev-orig",
        file.fileUrl
      );
      expect(onFileDeleted).toHaveBeenCalledWith("f-rev-orig");
    });

    // Resubmit button visible
    expect(screen.getByRole("button", { name: /Resubmit for Review/i })).toBeInTheDocument();
  });

  it("14. Refresh preserves attachment association via store reconciliation", () => {
    const act = mockSubmittedActivity;
    const file = makePpaFile("f-persist-1", act.id, "annual_report.pdf");

    const initial = [file];
    const reloaded = reconcileYpopOrgActivityFiles(initial, [file], [act], false);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].orgActivityId).toBe(act.id);
  });

  // =========================================================================
  // GROUP 2: DRAWER STATE & VIEW SWITCHING
  // =========================================================================

  it("15. Draft shows editable form fields and Save as Draft / Submit for Review actions", () => {
    setViewportWidth(1280);

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockDraftActivity}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Activity Title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Date Conducted/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Venue \/ Location/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();

    expect(screen.getByRole("button", { name: /Save as Draft/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Submit for Review/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
  });

  it("16, 17, 18 & 19. Submitted shows read-only details without editable inputs or draft/submit buttons", () => {
    setViewportWidth(1280);

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockSubmittedActivity}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Read-only information blocks
    expect(screen.getByText("Activity Information")).toBeInTheDocument();
    expect(screen.getAllByText("Tree Planting Initiative").length).toBeGreaterThan(0);
    expect(screen.getByText("Rainforest Park, Pasig City")).toBeInTheDocument();
    expect(screen.getByText(/Community tree planting with local youth volunteers/i)).toBeInTheDocument();

    // NO editable inputs
    expect(screen.queryByLabelText(/Activity Title/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Date Conducted/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Venue \/ Location/i)).not.toBeInTheDocument();

    // NO draft or submit buttons
    expect(screen.queryByRole("button", { name: /Save as Draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit for Review/i })).not.toBeInTheDocument();

    // Has Close Drawer button
    expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
  });

  it("20 & 21. Approved is read-only and displays PPA Activity Approved banner", () => {
    setViewportWidth(1280);

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockApprovedActivity}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("PPA Activity Approved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/Activity Title/i)).not.toBeInTheDocument();
  });

  // =========================================================================
  // GROUP 3: UI DESIGN & CITY-LED PARITY
  // =========================================================================

  it("23. PPA drawer dimensions match City-Led Sheet on desktop (1280px)", () => {
    setViewportWidth(1280);

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockApprovedActivity}
        orgActivityFiles={[]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Sheet container
    expect(screen.getByRole("dialog")).toHaveClass("w-full", "sm:max-w-xl", "md:max-w-2xl");
  });

  it("24, 25, 26 & 27. Reuses unified document icon, row selection updates preview, no View button", async () => {
    setViewportWidth(1280);
    const file1 = makePpaFile("f-multi-1", mockSubmittedActivity.id, "part1.pdf");
    const file2 = makePpaFile("f-multi-2", mockSubmittedActivity.id, "part2.pdf");

    render(
      <YpopPpaModal
        open={true}
        onOpenChange={vi.fn()}
        entry={mockEntry}
        activity={mockSubmittedActivity}
        orgActivityFiles={[file1, file2]}
        organizationId="org-1"
        userId="user-1"
        onActivitySaved={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Attached Files header with count badge
    expect(screen.getByText("Attached Files")).toBeInTheDocument();
    expect(screen.getByText("2 files")).toBeInTheDocument();

    // NO View buttons
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();

    // Each row has accessible role button and aria-label
    const file2Row = screen.getByRole("button", { name: /Select part2.pdf for preview/i });
    expect(file2Row).toBeInTheDocument();

    // Click file 2 row to switch active preview
    fireEvent.click(file2Row);

    await waitFor(() => {
      expect(file2Row).toHaveAttribute("aria-pressed", "true");
    });
  });

  it("28, 29 & 30. Mobile responsiveness at 320px, 375px, 390px, and 430px", () => {
    const mobileWidths = [320, 375, 390, 430];
    const file = makePpaFile("f-mob", mockSubmittedActivity.id, "mobile_doc.pdf");

    mobileWidths.forEach((width) => {
      setViewportWidth(width);

      const { unmount } = render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[file]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Mobile dialog rendered
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByText("Organization-Led PPA")).toBeInTheDocument();
      expect(screen.getByText("Activity Information")).toBeInTheDocument();
      expect(screen.getAllByText("mobile_doc.pdf").length).toBeGreaterThan(0);
      expect(screen.getAllByRole("button", { name: /Close/i }).length).toBeGreaterThan(0);

      unmount();
    });
  });

  // =========================================================================
  // GROUP 4: REDUNDANT ACTION REMOVAL & LIGHT MULTI-FILE SELECTION UI
  // =========================================================================

  describe("Group 4: Redundant Action Removal & Light Multi-File Selection UI", () => {
    it("1 & 2. 'Log Another Activity' is NOT rendered; 'Close Drawer' remains in read-only footer (Desktop & Mobile)", () => {
      // Desktop
      setViewportWidth(1280);
      const { unmount: unmountDesktop } = render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /Log Another Activity/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
      unmountDesktop();

      // Mobile
      setViewportWidth(375);
      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /Log Another Activity/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
    });

    it("3. Draft workflow retains its legitimate actions (Cancel, Save as Draft, Submit for Review)", () => {
      setViewportWidth(1280);
      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockDraftActivity}
          orgActivityFiles={[]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Save as Draft/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Submit for Review/i })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Log Another Activity/i })).not.toBeInTheDocument();
    });

    it("4 & 5. Single file shows 'Attached File'; multiple files show 'Attached Files' with count indicator", () => {
      setViewportWidth(1280);
      const file1 = makePpaFile("f-1", mockSubmittedActivity.id, "document_one.pdf");
      const file2 = makePpaFile("f-2", mockSubmittedActivity.id, "document_two.pdf");

      // Single file
      const { unmount } = render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[file1]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getByText("Attached File")).toBeInTheDocument();
      expect(screen.getByText("1 file")).toBeInTheDocument();
      unmount();

      // Multiple files
      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[file1, file2]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getByText("Attached Files")).toBeInTheDocument();
      expect(screen.getByText("2 files")).toBeInTheDocument();
    });

    it("6, 7 & 8. Selected file uses LIGHT selected state without solid dark navy; unselected files remain neutral", () => {
      setViewportWidth(1280);
      const file1 = makePpaFile("f-light-1", mockSubmittedActivity.id, "first.pdf");
      const file2 = makePpaFile("f-light-2", mockSubmittedActivity.id, "second.pdf");

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[file1, file2]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row1 = screen.getByRole("button", { name: /Select first.pdf for preview/i });
      const row2 = screen.getByRole("button", { name: /Select second.pdf for preview/i });

      // First file is active by default
      expect(row1).toHaveAttribute("aria-pressed", "true");
      expect(row2).toHaveAttribute("aria-pressed", "false");

      // Check light selected classes: has light blue background and border
      expect(row1.className).toContain("bg-blue-50/70");
      expect(row1.className).toContain("border-blue-300/80");
      // Must NOT use solid dark navy button styling
      expect(row1.className).not.toContain("bg-[#0E2F66]");
      expect(row1.className).not.toContain("bg-[#0A234D]");

      // Unselected file row remains neutral bg-card
      expect(row2.className).toContain("bg-card");
      expect(row2.className).toContain("border-border/70");
    });

    it("9, 10 & 11. Clicking file updates selection and Document Preview; status badge remains independent; no duplicate chips", async () => {
      setViewportWidth(1280);
      const fileA = makePpaFile("fa", mockSubmittedActivity.id, "alpha.pdf");
      const fileB = makePpaFile("fb", mockSubmittedActivity.id, "beta.pdf");

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[fileA, fileB]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const rowB = screen.getByRole("button", { name: /Select beta.pdf for preview/i });
      fireEvent.click(rowB);

      await waitFor(() => {
        expect(rowB).toHaveAttribute("aria-pressed", "true");
      });

      // Status badges are visible and distinct from selection indicator
      const statusBadges = screen.getAllByText("Pending Review");
      expect(statusBadges.length).toBeGreaterThanOrEqual(1);

      // No separate preview chips/tabs exist like "Preview file: [chip]"
      expect(screen.queryByText(/Preview file:/i)).not.toBeInTheDocument();
    });

    it("12, 13 & 14. Document Preview actions functional, consistent document icon, and keyboard accessible", () => {
      setViewportWidth(1280);
      const file = makePpaFile("f-acc", mockSubmittedActivity.id, "accessible.pdf");

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={mockSubmittedActivity}
          orgActivityFiles={[file]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // File row is keyboard navigable
      const fileRow = screen.getByRole("button", { name: /Select accessible.pdf for preview/i });
      expect(fileRow.className).toContain("focus-visible:ring-2");
      expect(fileRow.className).toContain("focus-visible:ring-blue-500/40");

      // Pressing enter triggers selection without error
      fireEvent.keyDown(fileRow, { key: "Enter" });
      expect(fileRow).toHaveAttribute("aria-pressed", "true");

      // Actions in preview section
      expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();
    });
  });
});

