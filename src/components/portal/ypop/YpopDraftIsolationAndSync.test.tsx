import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { YpopProofDrawer } from "./YpopProofDrawer";
import { UserPortalYPOPWorkspaceView } from "@/components/portal/UserPortalYPOPWorkspaceView";
import {
  reconcileYpopEventFiles,
} from "@/lib/lydo-connect-store";
import * as lydoSupabase from "@/lib/lydo-connect-supabase";
import type {
  YPOPEventFile,
  YPOPEventParticipation,
  YPOPCityActivity,
  YPOPEntry,
  YPOPPeriod,
  OrganizationProfile,
} from "@/lib/lydo-connect-data";

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
  window.innerWidth = 1280;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes("min-width: 1024px"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  cleanup();
});

describe("YPOP Draft File Isolation, File Deletion Sync, and Validation Remarks Verification", () => {
  const mockActivity: YPOPCityActivity = {
    id: "act-101",
    semesterKey: "2026-S1",
    name: "Youth Community Clean-Up",
    date: "2026-04-15T00:00:00Z",
    startDate: "2026-04-15",
    endDate: "2026-04-15",
    venue: "Pasig Riverbank",
    category: "mandatory",
    points: 4,
    createdAt: "2026-04-01T00:00:00Z",
  };

  const draftParticipation: YPOPEventParticipation = {
    id: "part-draft-1",
    organizationId: "org-101",
    activityId: "act-101",
    activityName: "Youth Community Clean-Up",
    activityDate: "2026-04-15",
    venue: "Pasig Riverbank",
    status: "draft",
    adminRemarks: "",
    joinedAt: "2026-04-10T00:00:00Z",
    proofSubmittedAt: "",
    verifiedAt: "",
    createdAt: "2026-04-10T00:00:00Z",
    updatedAt: "2026-04-10T00:00:00Z",
  };

  const pendingParticipation: YPOPEventParticipation = {
    ...draftParticipation,
    id: "part-pending-1",
    status: "pending_verification",
    proofSubmittedAt: "2026-04-16T10:00:00Z",
  };

  const revisionParticipation: YPOPEventParticipation = {
    ...draftParticipation,
    id: "part-rev-1",
    status: "needs_revision",
    adminRemarks: "Please provide a clearer attendance sheet.",
  };

  const verifiedParticipation: YPOPEventParticipation = {
    ...draftParticipation,
    id: "part-ver-1",
    status: "verified",
    verifiedAt: "2026-04-20T10:00:00Z",
  };

  const draftFile: YPOPEventFile = {
    id: "file-draft-1",
    participationId: "part-draft-1",
    organizationId: "org-101",
    fileName: "draft-proof.pdf",
    fileUrl: "storage://ypop-files/part-draft-1/draft-proof.pdf",
    fileType: "application/pdf",
    uploadedAt: "2026-04-15T12:00:00Z",
  };

  const pendingFile: YPOPEventFile = {
    id: "file-pending-1",
    participationId: "part-pending-1",
    organizationId: "org-101",
    fileName: "submitted-proof.pdf",
    fileUrl: "storage://ypop-files/part-pending-1/submitted-proof.pdf",
    fileType: "application/pdf",
    uploadedAt: "2026-04-16T10:00:00Z",
  };

  // =========================================================================
  // TEST 1 — DRAFT FILE IS USER-ONLY
  // =========================================================================
  it("TEST 1: Draft participation proof file is user-only and MUST NOT appear in Admin", () => {
    const allFiles = [draftFile];
    const allParticipations = [draftParticipation];

    // Admin synchronization MUST filter out draft files
    const adminFiles = reconcileYpopEventFiles([], allFiles, allParticipations, true);
    expect(adminFiles).toHaveLength(0);
    expect(adminFiles.some((f) => f.id === draftFile.id)).toBe(false);

    // User synchronization MUST retain the draft file
    const userFiles = reconcileYpopEventFiles([], allFiles, allParticipations, false);
    expect(userFiles).toHaveLength(1);
    expect(userFiles[0].id).toBe(draftFile.id);
  });

  // =========================================================================
  // TEST 2 — SUBMITTED FILE APPEARS TO ADMIN
  // =========================================================================
  it("TEST 2: Submitted file (pending_verification) appears to both User and Admin", () => {
    const allFiles = [pendingFile];
    const allParticipations = [pendingParticipation];

    // Admin receives submitted file
    const adminFiles = reconcileYpopEventFiles([], allFiles, allParticipations, true);
    expect(adminFiles).toHaveLength(1);
    expect(adminFiles[0].id).toBe(pendingFile.id);

    // User also sees the submitted file
    const userFiles = reconcileYpopEventFiles([], allFiles, allParticipations, false);
    expect(userFiles).toHaveLength(1);
    expect(userFiles[0].id).toBe(pendingFile.id);
  });

  // =========================================================================
  // TEST 3 — DRAFT DELETE ONE CLICK
  // =========================================================================
  it("TEST 3: Deleting a draft file completes on ONE single click with immediate local and backend sync", async () => {
    const deleteSupabaseSpy = vi.spyOn(lydoSupabase, "deleteYpopEventFileFromSupabase").mockResolvedValue(undefined);
    const onFileDeletedMock = vi.fn();

    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity}
        participation={draftParticipation}
        eventFiles={[draftFile]}
        organizationId="org-101"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={onFileDeletedMock}
      />
    );

    // Verify file is rendered initially
    expect(screen.getAllByText("draft-proof.pdf").length).toBeGreaterThan(0);

    // Click delete once
    const deleteBtn = screen.getByTitle(/Remove file/i);
    fireEvent.click(deleteBtn);

    // onFileDeleted is called immediately on the first click (atomic optimistic removal)
    expect(onFileDeletedMock).toHaveBeenCalledTimes(1);
    expect(onFileDeletedMock).toHaveBeenCalledWith(draftFile.id);

    // deleteYpopEventFileFromSupabase is called with fileId and fileUrl
    await waitFor(() => {
      expect(deleteSupabaseSpy).toHaveBeenCalledWith(draftFile.id, draftFile.fileUrl);
    });

    deleteSupabaseSpy.mockRestore();
  });

  // =========================================================================
  // TEST 4 — DRAFT DELETE DOES NOT REAPPEAR
  // =========================================================================
  it("TEST 4: Deleted draft file does NOT reappear on subsequent User or Admin sync", () => {
    // Before delete, user had draftFile
    const initialFiles = [draftFile];
    const participations = [draftParticipation];

    // File is deleted on backend; remote snapshot has 0 files
    const remoteFilesAfterDelete: YPOPEventFile[] = [];

    // User sync after deletion:
    // Since participations covers "part-draft-1", remote is authoritative for this participation.
    const userSyncedFiles = reconcileYpopEventFiles([], remoteFilesAfterDelete, participations, false);
    expect(userSyncedFiles).toHaveLength(0);

    // Admin sync after deletion:
    const adminSyncedFiles = reconcileYpopEventFiles([], remoteFilesAfterDelete, participations, true);
    expect(adminSyncedFiles).toHaveLength(0);
  });

  // =========================================================================
  // TEST 5 — UPLOAD WITHOUT SUBMIT
  // =========================================================================
  it("TEST 5: Uploading without submit remains Draft in User UI and is excluded from Admin data", () => {
    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity}
        participation={draftParticipation}
        eventFiles={[draftFile]}
        organizationId="org-101"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // User sees file with Draft badge
    expect(screen.getAllByText("draft-proof.pdf").length).toBeGreaterThan(0);
    expect(screen.getByText("Draft")).toBeInTheDocument();
    // User sees Submit button
    expect(screen.getByRole("button", { name: /Submit Proof for Review/i })).toBeInTheDocument();

    // Admin dataset check: draft files are isolated
    const adminVisibleFiles = reconcileYpopEventFiles([], [draftFile], [draftParticipation], true);
    expect(adminVisibleFiles).toHaveLength(0);
  });

  // =========================================================================
  // TEST 6 — UPLOAD THEN SUBMIT
  // =========================================================================
  it("TEST 6: After submission, status transitions to pending_verification, file appears to Admin, and User is locked", () => {
    cleanup();
    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity}
        participation={pendingParticipation}
        eventFiles={[pendingFile]}
        organizationId="org-101"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // User UI is locked:
    // No submit button
    expect(screen.queryByRole("button", { name: /Submit Proof for Review/i })).not.toBeInTheDocument();
    // No upload dropzone
    expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
    // No delete button
    expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
    // Preview remains available in Document Preview and status badge is shown
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByText("Pending Review")).toBeInTheDocument();

    // Admin data check: now appears in Admin
    const adminVisibleFiles = reconcileYpopEventFiles([], [pendingFile], [pendingParticipation], true);
    expect(adminVisibleFiles).toHaveLength(1);
    expect(adminVisibleFiles[0].id).toBe(pendingFile.id);
  });

  // =========================================================================
  // TEST 7 — NEEDS REVISION
  // =========================================================================
  it("TEST 7: Needs revision state allows user replacement and resubmission while Admin can see submitted file", () => {
    const revisionFile: YPOPEventFile = {
      ...pendingFile,
      id: "file-rev-1",
      participationId: revisionParticipation.id,
      fileName: "revised-proof.pdf",
    };

    cleanup();
    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity}
        participation={revisionParticipation}
        eventFiles={[revisionFile]}
        organizationId="org-101"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // User can replace/resubmit
    expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Resubmit Corrected Proof/i })).toBeInTheDocument();
    expect(screen.getByText("Needs Revision")).toBeInTheDocument();

    // Admin sees the revision file
    const adminVisibleFiles = reconcileYpopEventFiles([], [revisionFile], [revisionParticipation], true);
    expect(adminVisibleFiles).toHaveLength(1);
    expect(adminVisibleFiles[0].id).toBe("file-rev-1");
  });

  // =========================================================================
  // TEST 8 — VERIFIED
  // =========================================================================
  it("TEST 8: Verified participation is read-only (no upload/delete/submit, preview only) and visible to Admin", () => {
    const verifiedFile: YPOPEventFile = {
      ...pendingFile,
      id: "file-ver-1",
      participationId: verifiedParticipation.id,
      fileName: "verified-proof.pdf",
    };

    cleanup();
    render(
      <YpopProofDrawer
        open={true}
        onOpenChange={vi.fn()}
        activity={mockActivity}
        participation={verifiedParticipation}
        eventFiles={[verifiedFile]}
        organizationId="org-101"
        onParticipationUpdated={vi.fn()}
        onFileCreated={vi.fn()}
        onFileDeleted={vi.fn()}
      />
    );

    // User UI is strictly read-only
    expect(screen.queryByRole("button", { name: /Submit Proof for Review/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Click to browse file/i)).not.toBeInTheDocument();
    expect(screen.queryByTitle(/Remove file/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^View$/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open in New Tab/i })).toBeInTheDocument();
    expect(screen.getByText("Approved")).toBeInTheDocument();

    // Admin sees the verified file
    const adminVisibleFiles = reconcileYpopEventFiles([], [verifiedFile], [verifiedParticipation], true);
    expect(adminVisibleFiles).toHaveLength(1);
    expect(adminVisibleFiles[0].id).toBe("file-ver-1");
  });

  // =========================================================================
  // TEST 9 — REMOVE GLOBAL VALIDATION REMARKS
  // =========================================================================
  it("TEST 9: Redundant global Validation Remarks banner is NOT rendered in User YPOP Workspace", () => {
    cleanup();
    const period: YPOPPeriod = {
      id: "period-1",
      semesterKey: "2026-S1",
      semesterLabel: "2026 First Semester",
      validationDeadline: "2026-06-30T00:00:00Z",
      status: "open",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    const entry: YPOPEntry = {
      id: "entry-1",
      organizationId: "org-101",
      submittedBy: "user-1",
      semester: "2026-S1",
      semesterLabel: "2026 First Semester",
      pointsEarned: 40,
      pointsRequired: 70,
      totalPoints: 100,
      status: "not_qualified",
      adminRemarks: "Evaluation concluded: mandatory criteria not met.",
      submissionNote: "",
      validationDeadline: "2026-06-30T00:00:00Z",
      submittedAt: "2026-05-01T00:00:00Z",
      validatedAt: "2026-05-10T00:00:00Z",
      revisionHistory: [],
      createdAt: "2026-05-01T00:00:00Z",
      updatedAt: "2026-05-10T00:00:00Z",
    };

    const profile: OrganizationProfile = {
      id: "org-101",
      referenceId: "REF-101",
      userId: "user-1",
      organizationName: "Test Org",
      organizationEmail: "test@example.com",
      contactNumber: "",
      district: "",
      barangay: "",
      isExistingOrganization: false,
      organizationIdentifierNumber: "",
      registrationType: "new_registration",
      urn: "",
      urnNormalized: "",
      urnReviewStatus: "verified",
      urnAdminRemarks: "",
      urnReviewedBy: "",
      urnReviewedAt: "",
      verificationMethod: "online",
      majorClassification: "Youth Organization",
      subClassification: "community-based",
      advocacies: [],
      adviserName: "",
      representativeName: "",
      address: "",
      facebookPageUrl: "",
      profileStatus: "verified",
      verifiedAt: "2026-01-01T00:00:00Z",
      internalNotes: "",
      yorpRegisteredYear: 2026,
      yorpRenewedYear: null,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };

    render(
      <UserPortalYPOPWorkspaceView
        initialSemesterKey="2026-S1"
        currentProfile={profile}
        ypopPeriods={[period]}
        ypopEntries={[entry]}
        ypopCityActivities={[mockActivity]}
        ypopEventParticipations={[draftParticipation]}
        ypopEventFiles={[]}
        ypopOrgActivities={[]}
        ypopOrgActivityFiles={[]}
        navigate={vi.fn()}
        userRouteMap={{}}
        formatShortPortalDate={(d) => d}
      />
    );

    // Global "Validation Remarks" banner must NOT be rendered in workspace
    expect(screen.queryByText("Validation Remarks")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/This validation submission was evaluated and closed by the LYDO Admin./i)
    ).not.toBeInTheDocument();
    // Underlying remark data is preserved
    expect(entry.adminRemarks).toBe("Evaluation concluded: mandatory criteria not met.");
  });

  // =========================================================================
  // TEST 10 — USER/ADMIN FILE PARITY LIFECYCLE
  // =========================================================================
  it("TEST 10: Complete lifecycle maintains User/Admin parity across draft -> submit -> revision -> resubmit -> verified", () => {
    const partId = "lifecycle-part-1";
    const actId = "act-101";
    const orgId = "org-101";

    // Step 1: Draft upload
    let part: YPOPEventParticipation = {
      id: partId,
      organizationId: orgId,
      activityId: actId,
      activityName: "Activity 1",
      activityDate: "2026-05-01",
      venue: "Venue",
      status: "draft",
      adminRemarks: "",
      joinedAt: "2026-05-01T00:00:00Z",
      proofSubmittedAt: "",
      verifiedAt: "",
      createdAt: "2026-05-01T00:00:00Z",
      updatedAt: "2026-05-01T00:00:00Z",
    };
    let files: YPOPEventFile[] = [
      {
        id: "file-initial-1",
        participationId: partId,
        organizationId: orgId,
        fileName: "proof-v1.pdf",
        fileUrl: "storage://ypop-files/part/proof-v1.pdf",
        fileType: "application/pdf",
        uploadedAt: "2026-05-01T00:00:00Z",
      },
    ];

    // Admin CANNOT see draft file
    expect(reconcileYpopEventFiles([], files, [part], true)).toHaveLength(0);
    // User CAN see draft file
    expect(reconcileYpopEventFiles([], files, [part], false)).toHaveLength(1);

    // Step 2: User submits
    part = { ...part, status: "pending_verification", proofSubmittedAt: "2026-05-02T00:00:00Z" };
    // Admin CAN now see the submitted file
    expect(reconcileYpopEventFiles([], files, [part], true)).toHaveLength(1);
    // User still sees the file
    expect(reconcileYpopEventFiles([], files, [part], false)).toHaveLength(1);

    // Step 3: Admin requests revision
    part = { ...part, status: "needs_revision", adminRemarks: "Needs clearer photos" };
    // Admin CAN see files under needs_revision
    expect(reconcileYpopEventFiles([], files, [part], true)).toHaveLength(1);

    // User replaces file
    files = [
      {
        id: "file-revised-2",
        participationId: partId,
        organizationId: orgId,
        fileName: "proof-v2-clear.pdf",
        fileUrl: "storage://ypop-files/part/proof-v2-clear.pdf",
        fileType: "application/pdf",
        uploadedAt: "2026-05-03T00:00:00Z",
      },
    ];
    expect(reconcileYpopEventFiles([], files, [part], false)).toHaveLength(1);
    expect(reconcileYpopEventFiles([], files, [part], false)[0].fileName).toBe("proof-v2-clear.pdf");

    // Step 4: User resubmits
    part = { ...part, status: "pending_verification" };
    const adminResubmittedFiles = reconcileYpopEventFiles([], files, [part], true);
    expect(adminResubmittedFiles).toHaveLength(1);
    expect(adminResubmittedFiles[0].fileName).toBe("proof-v2-clear.pdf");

    // Step 5: Admin verifies
    part = { ...part, status: "verified", verifiedAt: "2026-05-04T00:00:00Z" };
    const adminVerifiedFiles = reconcileYpopEventFiles([], files, [part], true);
    expect(adminVerifiedFiles).toHaveLength(1);
    expect(adminVerifiedFiles[0].fileName).toBe("proof-v2-clear.pdf");

    const userVerifiedFiles = reconcileYpopEventFiles([], files, [part], false);
    expect(userVerifiedFiles).toHaveLength(1);
    expect(userVerifiedFiles[0].fileName).toBe("proof-v2-clear.pdf");
  });
});
