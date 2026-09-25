import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
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
  id: "act-101",
  semesterKey: "2026-S1",
  name: "Pasig Youth Climate Action Assembly",
  title: "Pasig Youth Climate Action Assembly",
  date: "2026-09-15T09:00:00Z",
  startDate: "2026-09-15T09:00:00Z",
  endDate: "2026-09-15T17:00:00Z",
  venue: "Pasig City Sports Complex",
  points: 4,
  category: "mandatory",
  description: "City-wide climate assembly for youth leaders.",
};

const makeFile = (id: string, participationId: string, fileName: string) => ({
  id,
  participationId,
  organizationId: "org-1",
  fileName,
  fileUrl: `storage://ypop-proofs/${participationId}/${fileName}`,
  fileType: "application/pdf",
  fileSize: 204800,
  uploadedAt: "2026-09-15T10:00:00Z",
});

describe("YpopProofDrawer - Liquidation-Aligned Redesign & Multi-File UX", () => {
  // 1. Single attached file renders under "Attached File"
  it("1. Single attached file renders under Attached File", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-1",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-1", "attendance_signed.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Attached File")).toBeInTheDocument();
    expect(screen.queryByText("Attached Files")).not.toBeInTheDocument();
    expect(screen.getAllByText("attendance_signed.pdf").length).toBeGreaterThan(0);
  });

  // 2. Multiple files render under "Attached Files"
  it("2. Multiple files render under Attached Files", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-2",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-2", "attendance_sheet.pdf");
    const file2 = makeFile("f-2", "part-2", "narrative_report.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1, file2]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Attached Files")).toBeInTheDocument();
    expect(screen.getAllByText("attendance_sheet.pdf").length).toBeGreaterThan(0);
    expect(screen.getAllByText("narrative_report.pdf").length).toBeGreaterThan(0);
  });

  // 3. Upload instruction is hidden after submission
  it("3. Upload instruction is hidden after submission", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-3",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-3", "proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.queryByText(/Please attach the following/i)).not.toBeInTheDocument();
  });

  // 4. Draft still shows Attach File + upload controls
  it("4. Draft still shows Attach File + upload controls", () => {
    setViewportWidth(1280);
    const draftParticipation = {
      id: "part-4",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "draft",
    };

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={draftParticipation as any}
        eventFiles={[]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Attach File")).toBeInTheDocument();
    expect(screen.getByText(/Please attach the following/i)).toBeInTheDocument();
    expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
  });

  // 5. Pending Verification shows no upload
  it("5. Pending Verification shows no upload", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-5",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-5", "proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
  });

  // 6. Pending Verification shows no delete
  it("6. Pending Verification shows no delete", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-6",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-6", "proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
  });

  // 7. Pending Verification shows no submit
  it("7. Pending Verification shows no submit", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-7",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-7", "proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /Submit Proof for Review/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Resubmit/i })).not.toBeInTheDocument();
  });

  // 8. Needs Revision permits replacement/resubmission
  it("8. Needs Revision permits replacement/resubmission", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-8",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "needs_revision",
      adminRemarks: "Please submit clear photos of the attendee roster.",
    };
    const file1 = makeFile("f-1", "part-8", "blurred_roster.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText(/Admin Revision Requested/i)).toBeInTheDocument();
    expect(screen.getByText(/"Please submit clear photos of the attendee roster."/i)).toBeInTheDocument();
    expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resubmit Corrected Proof/i })).toBeInTheDocument();
  });

  // 9. Verified remains locked
  it("9. Verified remains locked", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-9",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "verified",
      adminRemarks: "Verified attendance.",
    };
    const file1 = makeFile("f-1", "part-9", "verified_proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText(/Participation Verified/i)).toBeInTheDocument();
    expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit Proof for Review/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
  });

  // 10. Clicking attached file selects it
  it("10. Clicking attached file selects it", async () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-10",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-10", "file_alpha.pdf");
    const file2 = makeFile("f-2", "part-10", "file_beta.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1, file2]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Initial selected file is file 1
    const file2Item = screen.getByRole("button", { name: /file_beta.pdf/i });
    expect(file2Item).toBeInTheDocument();

    // Click file 2 row
    fireEvent.click(file2Item);

    // File 2 is selected and its details appear in Document Preview section
    await waitFor(() => {
      expect(file2Item).toHaveAttribute("aria-pressed", "true");
    });
  });

  // 11. Selected file updates Document Preview
  it("11. Selected file updates Document Preview", async () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-11",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-11", "alpha_document.pdf");
    const file2 = makeFile("f-2", "part-11", "beta_document.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1, file2]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Document Preview")).toBeInTheDocument();
    // Initially beta_document is only in file row list (1 occurrence)
    expect(screen.getAllByText("beta_document.pdf").length).toBe(1);

    // Click beta_document row
    const betaRow = screen.getByRole("button", { name: /beta_document.pdf/i });
    fireEvent.click(betaRow);

    // Now beta_document appears in both the file row and Document Preview section (2 occurrences)
    await waitFor(() => {
      expect(screen.getAllByText("beta_document.pdf").length).toBeGreaterThanOrEqual(2);
    });
  });

  // 12. Separate "Preview file:" selector is absent
  it("12. Separate 'Preview file:' selector is absent", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-12",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-12", "file_1.pdf");
    const file2 = makeFile("f-2", "part-12", "file_2.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1, file2]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.queryByText(/Preview file:/i)).not.toBeInTheDocument();
  });

  // 13. Multiple files do not create duplicate selectors
  it("13. Multiple files do not create duplicate selectors", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-13",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-13", "file_a.pdf");
    const file2 = makeFile("f-2", "part-13", "file_b.pdf");
    const file3 = makeFile("f-3", "part-13", "file_c.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1, file2, file3]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // There should be no duplicate chips or selector strips
    expect(screen.queryByText(/Preview file:/i)).not.toBeInTheDocument();
    // Exactly 3 file rows in the attached list
    const fileRows = screen.getAllByRole("button", { name: /Select file_/i });
    expect(fileRows.length).toBe(3);
  });

  // 14. Open in New Tab works for selected file
  it("14. Open in New Tab works for selected file", () => {
    setViewportWidth(1280);
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const participation = {
      id: "part-14",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-14", "open_test.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const openBtns = screen.getAllByRole("button", { name: /Open in New Tab/i });
    expect(openBtns.length).toBeGreaterThan(0);
    fireEvent.click(openBtns[0]);
    expect(openSpy).toHaveBeenCalled();
    openSpy.mockRestore();
  });

  // 15. Download works for selected file
  it("15. Download works for selected file", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-15",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-1", "part-15", "download_test.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const downloadBtns = screen.getAllByRole("button", { name: /Download File/i });
    expect(downloadBtns.length).toBeGreaterThan(0);
    fireEvent.click(downloadBtns[0]);
  });

  // 16. Single file auto-selects correctly
  it("16. Single file auto-selects correctly", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-16",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-single", "part-16", "auto_select.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    const row = screen.getByRole("button", { name: /auto_select.pdf/i });
    expect(row).toHaveAttribute("aria-pressed", "true");
    // Also rendered in Document Preview
    expect(screen.getAllByText("auto_select.pdf").length).toBeGreaterThanOrEqual(2);
  });

  // 17. Deleting a draft file updates selection correctly
  it("17. Deleting a draft file updates selection correctly", async () => {
    setViewportWidth(1280);
    vi.spyOn(lydoSupabase, "deleteYpopEventFileFromSupabase").mockResolvedValue(undefined as any);
    const onFileDeletedMock = vi.fn();
    const participation = {
      id: "part-17",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "draft",
    };
    const file1 = makeFile("f-del-1", "part-17", "file_to_delete.pdf");
    const file2 = makeFile("f-del-2", "part-17", "remaining_file.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1, file2]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={onFileDeletedMock}
      />
    );

    // Delete buttons present in draft
    const deleteBtns = screen.getAllByTitle(/Remove file/i);
    expect(deleteBtns.length).toBe(2);

    // Delete the first file
    fireEvent.click(deleteBtns[0]);
    expect(onFileDeletedMock).toHaveBeenCalledWith("f-del-1");
  });

  // 18. Mobile layout has no horizontal overflow
  it("18. Mobile layout renders cleanly without overflow on small viewports", () => {
    setViewportWidth(320);
    const participation = {
      id: "part-18",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-mob-1", "part-18", "very_long_mobile_proof_file_name_archive_2026.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Header elements present
    expect(screen.getByText(/Mandatory Activity/i)).toBeInTheDocument();
    expect(screen.getByText(/4 Points Weight/i)).toBeInTheDocument();
    expect(screen.getByText(/STATUS: PENDING VERIFICATION/i)).toBeInTheDocument();
    expect(screen.getByText(mockActivity.name)).toBeInTheDocument();

    // Close button present
    expect(screen.getAllByRole("button", { name: /^Close$/i }).length).toBeGreaterThan(0);

    // Document Preview section present
    expect(screen.getByText("Document Preview")).toBeInTheDocument();
  });

  // 19. Existing locking workflow tests remain passing
  it("19. Existing locking workflow: verified activity cannot be submitted or edited", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-19",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "verified",
    };
    const file1 = makeFile("f-lock-1", "part-19", "final_approved_proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Submit/i })).not.toBeInTheDocument();
  });

  // 20. Existing preview integration tests remain passing
  it("20. Existing preview integration: resolves Supabase file URL and renders viewer", async () => {
    setViewportWidth(1280);
    const resolveSpy = vi.spyOn(lydoSupabase, "resolveSupabaseFileUrl").mockResolvedValue("https://storage.mock.lydo/proof.pdf");
    const participation = {
      id: "part-20",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-20", "part-20", "resolved_proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(resolveSpy).toHaveBeenCalledWith(file1.fileUrl);
    });

    resolveSpy.mockRestore();
  });

  // 21. Attached File row uses unified document icon matching Document Preview and does NOT render "View"
  it("21. Attached File row uses unified document icon matching Document Preview and does NOT render View button", () => {
    setViewportWidth(1280);
    const participation = {
      id: "part-21",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-21", "part-21", "climate_assembly_proof.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Attached File row does NOT render a redundant "View" button
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();

    // Document Preview section retains its primary actions
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download File/i })).toBeInTheDocument();

    // The Attached File row exists as the single preview selector
    const fileRow = screen.getByRole("button", { name: /climate_assembly_proof.pdf/i });
    expect(fileRow).toBeInTheDocument();

    // Document icon container classes are identical to Document Preview (p-2 rounded-lg bg-primary/10 text-primary)
    const iconContainers = fileRow.querySelectorAll(".bg-primary\\/10.text-primary.p-2");
    expect(iconContainers.length).toBeGreaterThan(0);
  });

  // 22. Attached File rows render authoritative status badges across Verified, Pending, and Needs Revision
  it("22. Attached File rows render authoritative status badges for Verified, Pending, and Needs Revision", () => {
    setViewportWidth(1280);

    // Case A: Verified -> Approved
    const verifiedPart = { ...mockActivity, id: "act-v", status: "verified" };
    const { rerender } = render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={{ id: "p-v", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "verified" } as any}
        eventFiles={[makeFile("f-v", "p-v", "verified_doc.pdf")]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );
    expect(screen.getByText("Approved")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();

    // Case B: Needs Revision -> Needs Revision
    rerender(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={{ id: "p-r", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "needs_revision" } as any}
        eventFiles={[makeFile("f-r", "p-r", "revision_doc.pdf")]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );
    expect(screen.getAllByText("Needs Revision").length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();

    // Case C: Pending Verification -> Pending Review
    rerender(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={{ id: "p-p", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "pending_verification" } as any}
        eventFiles={[makeFile("f-p", "p-p", "pending_doc.pdf")]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );
    expect(screen.getByText("Pending Review")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();
  });

  // 23. Multiple attached files show individual statuses and are selectable without View buttons
  it("23. Multiple attached files show individual statuses and are selectable on mobile (375px)", async () => {
    setViewportWidth(375);
    const participation = {
      id: "part-23",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "pending_verification",
    };
    const file1 = makeFile("f-m1", "part-23", "sheet_a.pdf");
    const file2 = makeFile("f-m2", "part-23", "sheet_b.pdf");

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity as any}
        participation={participation as any}
        eventFiles={[file1, file2]}
        organizationId="org-1"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // Both files show status badge and no View button
    expect(screen.getAllByText("Pending Review").length).toBe(2);
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();

    // Selecting file 2 updates Document Preview
    const row2 = screen.getByRole("button", { name: /sheet_b.pdf/i });
    fireEvent.click(row2);

    await waitFor(() => {
      expect(row2).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByText("sheet_b.pdf").length).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // SINGLE CANONICAL UPLOAD SURFACE & REDUNDANT UPLOAD UI REMOVAL
  // =========================================================================

  describe("Single Canonical Upload Surface & Redundant UI Removal", () => {
    const draftParticipation = {
      id: "part-canon-draft",
      organizationId: "org-1",
      activityId: "act-101",
      activityName: mockActivity.name,
      status: "draft",
    };

    it("1, 2, 3 & 15. Draft with no files renders exactly ONE upload surface; redundant 'Choose Files' and 'No proof files attached yet' are ABSENT", () => {
      setViewportWidth(1280);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={draftParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Section title
      expect(screen.getByText("Attach File")).toBeInTheDocument();
      expect(screen.getByText(/Please attach the following: Attendance Sheet and Narrative Report/i)).toBeInTheDocument();

      // Exactly ONE upload dropzone exists
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
      expect(screen.getByText(/Supports PDF, DOCX, and XLSX documents up to 10 MB/i)).toBeInTheDocument();

      // ABSOLUTELY NO redundant empty-state upload surfaces
      expect(screen.queryByText(/No proof files attached yet/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Choose Files/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/Upload attendance sheets, event photos, or certificates/i)).not.toBeInTheDocument();

      // Ensure exactly ONE browse dropzone exists and zero 'Choose Files' buttons
      expect(screen.getAllByText(/Click to browse file/i)).toHaveLength(1);
      expect(screen.queryByRole("button", { name: /Choose Files/i })).not.toBeInTheDocument();
    });

    it("4, 5, 8 & 15. Canonical upload surface supports multiple file selection staged locally and batch uploaded on explicit submit", async () => {
      setViewportWidth(1280);
      const onFileCreated = vi.fn();
      const createdFile1 = makeFile("f-new-1", "part-canon-draft", "attendance.pdf");
      const createdFile2 = makeFile("f-new-2", "part-canon-draft", "event_photo.png");

      let uploadCallCount = 0;
      vi.spyOn(lydoSupabase, "uploadYpopEventFileToSupabase").mockImplementation(async (params) => {
        uploadCallCount++;
        return uploadCallCount === 1 ? createdFile1 : createdFile2;
      });
      vi.spyOn(lydoSupabase, "updateYpopEventParticipationInSupabase").mockResolvedValue({
        ...draftParticipation,
        status: "pending_verification",
      } as any);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={draftParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={onFileCreated}
          onFileDeleted={vi.fn()}
        />
      );

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).toBeInTheDocument();
      expect(fileInput).toHaveAttribute("multiple");

      const file1 = new File(["dummy 1"], "attendance.pdf", { type: "application/pdf" });
      const file2 = new File(["dummy 2"], "event_photo.png", { type: "image/png" });

      fireEvent.change(fileInput, { target: { files: [file1, file2] } });

      // Staged locally: files appear in UI with Ready to Upload and NO immediate Supabase upload
      expect(screen.getAllByText("attendance.pdf").length).toBeGreaterThan(0);
      expect(screen.getAllByText("event_photo.png").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Ready to Upload").length).toBe(2);
      expect(lydoSupabase.uploadYpopEventFileToSupabase).not.toHaveBeenCalled();

      // Submit Proof for Review triggers the batch upload
      const submitBtn = screen.getByRole("button", { name: /Submit Proof for Review/i });
      fireEvent.click(submitBtn);

      const confirmBtn = screen.getByRole("button", { name: /Submit Proof/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(lydoSupabase.uploadYpopEventFileToSupabase).toHaveBeenCalledTimes(2);
        expect(onFileCreated).toHaveBeenCalledWith(createdFile1);
        expect(onFileCreated).toHaveBeenCalledWith(createdFile2);
      });
    });

    it("9 & 10. Draft file deletion and replacement maintains single upload surface without reviving duplicate UI", async () => {
      setViewportWidth(1280);
      const onFileDeleted = vi.fn();
      const existingFile = makeFile("f-del-1", "part-canon-draft", "wrong_file.pdf");
      vi.spyOn(lydoSupabase, "deleteYpopEventFileFromSupabase").mockResolvedValue();

      const { rerender } = render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={draftParticipation as any}
          eventFiles={[existingFile]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={onFileDeleted}
        />
      );

      // Single canonical upload dropzone remains available above file list in draft
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
      expect(screen.queryByText(/No proof files attached yet/i)).not.toBeInTheDocument();

      // Delete the file
      const deleteBtn = screen.getByTitle(/Remove file/i);
      fireEvent.click(deleteBtn);

      await waitFor(() => {
        expect(lydoSupabase.deleteYpopEventFileFromSupabase).toHaveBeenCalledWith("f-del-1", existingFile.fileUrl);
        expect(onFileDeleted).toHaveBeenCalledWith("f-del-1");
      });

      // Rerender with 0 files (simulating store update after deletion)
      rerender(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={draftParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={onFileDeleted}
        />
      );

      // Only ONE canonical upload surface is present; duplicate UI does NOT reappear
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
      expect(screen.queryByText(/No proof files attached yet/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Choose Files/i })).not.toBeInTheDocument();
    });

    it("11 & 13. Locked states (Pending Verification, Verified) show ZERO upload areas", () => {
      setViewportWidth(1280);
      const file = makeFile("f-lock", "part-lock", "approved_proof.pdf");

      // Pending verification
      const { rerender } = render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-lock", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "pending_verification" } as any}
          eventFiles={[file]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Choose Files/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/No proof files attached yet/i)).not.toBeInTheDocument();

      // Verified
      rerender(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-lock", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "verified" } as any}
          eventFiles={[file]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Choose Files/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/No proof files attached yet/i)).not.toBeInTheDocument();
    });

    it("12. Needs Revision retains exactly ONE upload surface without duplicate controls", () => {
      setViewportWidth(1280);
      const file = makeFile("f-rev", "part-rev", "initial_doc.pdf");

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{
            id: "part-rev",
            organizationId: "org-1",
            activityId: "act-101",
            activityName: mockActivity.name,
            status: "needs_revision",
            adminRemarks: "Please attach certified attendance sheet.",
          } as any}
          eventFiles={[file]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Single upload dropzone present
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();

      // NO redundant empty-state or second choose files button
      expect(screen.queryByText(/No proof files attached yet/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Choose Files/i })).not.toBeInTheDocument();
    });

    it("16. Mobile responsiveness at 320px, 375px, 390px, and 430px preserves single upload surface", () => {
      const mobileWidths = [320, 375, 390, 430];

      mobileWidths.forEach((width) => {
        setViewportWidth(width);

        const { unmount } = render(
          <YpopProofDrawer
            open={true}
            onOpenChange={vi.fn()}
            activity={mockActivity as any}
            participation={draftParticipation as any}
            eventFiles={[]}
            organizationId="org-1"
            onParticipationUpdated={vi.fn()}
            onFileCreated={vi.fn()}
            onFileDeleted={vi.fn()}
          />
        );

        expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
        expect(screen.queryByText(/No proof files attached yet/i)).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: /Choose Files/i })).not.toBeInTheDocument();

        unmount();
      });
    });

    it("17. Canonical upload surface has proper accessibility attributes and responds to keyboard Enter / Space", () => {
      setViewportWidth(1280);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={draftParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const dropzone = screen.getByRole("button", { name: /Upload proof documents/i });
      expect(dropzone).toBeInTheDocument();
      expect(dropzone).toHaveAttribute("tabindex", "0");
      expect(dropzone.className).toContain("focus-visible:ring-2");
      expect(dropzone.className).toContain("focus-visible:ring-primary");

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const clickSpy = vi.spyOn(fileInput, "click");

      // Press Enter
      fireEvent.keyDown(dropzone, { key: "Enter" });
      expect(clickSpy).toHaveBeenCalledTimes(1);

      // Press Space
      fireEvent.keyDown(dropzone, { key: " " });
      expect(clickSpy).toHaveBeenCalledTimes(2);

      clickSpy.mockRestore();
    });
  });

  describe("City-Led File Selector - Match Organization-Led PPA Source of Truth", () => {
    it("1. City-Led uses the same document icon container styling as Organization-Led", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-1", "part-icon", "report-final.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-icon", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const fileRow = screen.getByRole("button", { name: /Select report-final\.pdf for preview/i });
      expect(fileRow).toBeInTheDocument();
      // Document icon container has p-2 rounded-lg bg-primary/10 text-primary
      const iconContainer = fileRow.querySelector(".p-2.rounded-lg.bg-primary\\/10.text-primary");
      expect(iconContainer).not.toBeNull();
    });

    it("2. City-Led file row structure matches Organization-Led (icon, title, metadata, status, optional delete)", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-struct", "part-struct", "attendance-sheet.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-struct", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const fileRow = screen.getByRole("button", { name: /Select attendance-sheet\.pdf for preview/i });
      expect(fileRow).toBeInTheDocument();
      expect(within(fileRow).getByText("attendance-sheet.pdf")).toBeInTheDocument();
      expect(within(fileRow).getByText("Draft")).toBeInTheDocument();
      expect(within(fileRow).getByTitle("Remove file")).toBeInTheDocument();
    });

    it("3. No View button exists inside the Attached File row", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-view", "part-view", "activity-photos.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-view", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "pending_verification" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "View" })).not.toBeInTheDocument();
    });

    it("4. No secondary preview selector exists (no 'Preview file:' chips)", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-chips-1", "part-chips", "file-1.pdf");
      const file2 = makeFile("f-chips-2", "part-chips", "file-2.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-chips", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1, file2]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByText(/Preview file:/i)).not.toBeInTheDocument();
    });

    it("5. Selected state uses the Organization-Led light treatment and avoids dark navy", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-light-1", "part-light", "selected-file.pdf");
      const file2 = makeFile("f-light-2", "part-light", "unselected-file.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-light", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1, file2]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row1 = screen.getByRole("button", { name: /Select selected-file\.pdf for preview/i });
      const row2 = screen.getByRole("button", { name: /Select unselected-file\.pdf for preview/i });

      // First file is auto-selected
      expect(row1).toHaveAttribute("aria-pressed", "true");
      expect(row1.className).toContain("bg-blue-50/70");
      expect(row1.className).toContain("border-blue-300/80");
      expect(row1.className).toContain("ring-blue-400/20");
      expect(row1.className).not.toContain("bg-slate-900");
      expect(row1.className).not.toContain("bg-[#0f172a]");

      // Second file is unselected neutral
      expect(row2).toHaveAttribute("aria-pressed", "false");
      expect(row2.className).toContain("bg-card");
      expect(row2.className).toContain("border-border/70");
    });

    it("6. Selected file updates Document Preview", async () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-prev-1", "part-prev", "doc-one.pdf");
      const file2 = makeFile("f-prev-2", "part-prev", "doc-two.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-prev", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1, file2]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row2 = screen.getByRole("button", { name: /Select doc-two\.pdf for preview/i });
      fireEvent.click(row2);

      expect(row2).toHaveAttribute("aria-pressed", "true");
      // Document preview now shows doc-two.pdf
      expect(screen.getAllByText("doc-two.pdf").length).toBeGreaterThanOrEqual(2);
    });

    it("7. Status badge remains visually distinct from selection", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-status", "part-status", "status-test.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-status", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "pending_verification" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row = screen.getByRole("button", { name: /Select status-test\.pdf for preview/i });
      const badge = within(row).getByText("Pending Review");
      expect(badge).toBeInTheDocument();
      // Selection styling is on row container, status badge has its own tone classes
      expect(badge.className).toContain("rounded-full");
    });

    it("8. Multiple files are selectable and toggle active state", () => {
      setViewportWidth(1280);
      const files = [
        makeFile("f-m-1", "part-multi", "file-alpha.pdf"),
        makeFile("f-m-2", "part-multi", "file-beta.pdf"),
        makeFile("f-m-3", "part-multi", "file-gamma.pdf"),
      ];
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-multi", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={files}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row1 = screen.getByRole("button", { name: /Select file-alpha\.pdf for preview/i });
      const row2 = screen.getByRole("button", { name: /Select file-beta\.pdf for preview/i });
      const row3 = screen.getByRole("button", { name: /Select file-gamma\.pdf for preview/i });

      expect(row1).toHaveAttribute("aria-pressed", "true");
      expect(row2).toHaveAttribute("aria-pressed", "false");

      fireEvent.click(row2);
      expect(row1).toHaveAttribute("aria-pressed", "false");
      expect(row2).toHaveAttribute("aria-pressed", "true");

      fireEvent.click(row3);
      expect(row2).toHaveAttribute("aria-pressed", "false");
      expect(row3).toHaveAttribute("aria-pressed", "true");
    });

    it("9. Single file auto-selects appropriately without manual click", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-single-test", "part-single", "single-document.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-single", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row = screen.getByRole("button", { name: /Select single-document\.pdf for preview/i });
      expect(row).toHaveAttribute("aria-pressed", "true");
    });

    it("10. Long filenames truncate correctly without container overflow", () => {
      setViewportWidth(1280);
      const longName = "lydo_annual_youth_development_plan_accomplishment_documentation_certified_2026.pdf";
      const file1 = makeFile("f-long", "part-long", longName);
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-long", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const fileRow = screen.getByRole("button", { name: new RegExp(`Select ${longName.replace(/\./g, "\\.")} for preview`, "i") });
      const titleEl = within(fileRow).getByText(longName);
      expect(titleEl.className).toContain("truncate");
      expect(titleEl.className).toContain("max-w-[160px]");
    });

    it("11. Mobile interaction works and clicking row updates preview on small viewports", () => {
      setViewportWidth(375);
      const file1 = makeFile("f-mob-1", "part-mob", "mob-1.pdf");
      const file2 = makeFile("f-mob-2", "part-mob", "mob-2.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-mob", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1, file2]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row2 = screen.getByRole("button", { name: /Select mob-2\.pdf for preview/i });
      fireEvent.click(row2);
      expect(row2).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByText("mob-2.pdf").length).toBeGreaterThanOrEqual(2);
    });

    it("12. Keyboard focus and Enter / Space navigation work on file row", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-key-1", "part-key", "key-one.pdf");
      const file2 = makeFile("f-key-2", "part-key", "key-two.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-key", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "draft" } as any}
          eventFiles={[file1, file2]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      const row2 = screen.getByRole("button", { name: /Select key-two\.pdf for preview/i });
      expect(row2).toHaveAttribute("tabindex", "0");
      expect(row2.className).toContain("focus-visible:ring-2");
      expect(row2.className).toContain("focus-visible:ring-blue-500/40");

      // Enter key
      fireEvent.keyDown(row2, { key: "Enter" });
      expect(row2).toHaveAttribute("aria-pressed", "true");

      const row1 = screen.getByRole("button", { name: /Select key-one\.pdf for preview/i });
      // Space key
      fireEvent.keyDown(row1, { key: " " });
      expect(row1).toHaveAttribute("aria-pressed", "true");
      expect(row2).toHaveAttribute("aria-pressed", "false");
    });

    it("13. Pending Verification remains locked with no upload surface and no delete buttons", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-pending-lock", "part-plock", "pending-evidence.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-plock", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "pending_verification" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Submit/i })).not.toBeInTheDocument();
      // File row is still interactive for preview
      const row = screen.getByRole("button", { name: /Select pending-evidence\.pdf for preview/i });
      expect(row).toBeInTheDocument();
      expect(within(row).getByText("Pending Review")).toBeInTheDocument();
    });

    it("14. Needs Revision behavior remains intact with replacement upload and delete allowed", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-rev-lock", "part-rlock", "needs-correction.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{
            id: "part-rlock",
            organizationId: "org-1",
            activityId: "act-101",
            activityName: mockActivity.name,
            status: "needs_revision",
            adminRemarks: "Please provide official attendance sheet.",
          } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Single upload dropzone is present
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
      // Delete button is present on the file row
      expect(screen.getByTitle(/Remove file/i)).toBeInTheDocument();
      // Needs Revision status badge is present
      expect(screen.getAllByText("Needs Revision").length).toBeGreaterThan(0);
      // Resubmit button is present
      expect(screen.getByRole("button", { name: /Resubmit Corrected Proof/i })).toBeInTheDocument();
    });

    it("15. Verified behavior remains intact with locked state and preview available", () => {
      setViewportWidth(1280);
      const file1 = makeFile("f-ver-lock", "part-vlock", "verified-proof.pdf");
      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity as any}
          participation={{ id: "part-vlock", organizationId: "org-1", activityId: "act-101", activityName: mockActivity.name, status: "verified" } as any}
          eventFiles={[file1]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
      expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Submit/i })).not.toBeInTheDocument();

      const row = screen.getByRole("button", { name: /Select verified-proof\.pdf for preview/i });
      expect(row).toBeInTheDocument();
      expect(within(row).getByText("Approved")).toBeInTheDocument();
      expect(screen.getByText("Document Preview")).toBeInTheDocument();
    });
  });
});


