import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";
import { YpopProofDrawer } from "./YpopProofDrawer";
import { YpopPpaModal } from "./YpopPpaModal";

beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
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

describe("YPOP Responsive Drawer/Modal Standardization", () => {
  const mockCityActivity = {
    id: "act-1",
    semesterKey: "2026-S1",
    name: "Pasig Youth Leadership Summit",
    title: "Pasig Youth Leadership Summit",
    date: "2026-08-20T00:00:00Z",
    venue: "Pasig City Hall",
    points: 4,
    category: "mandatory",
    description: "Leadership development workshop for youth organization officers.",
  };

  const mockVerifiedParticipation = {
    id: "part-1",
    organizationId: "org-1",
    activityId: "act-1",
    activityName: "Pasig Youth Leadership Summit",
    status: "verified",
    joinedAt: "2026-08-20T00:00:00Z",
    adminRemarks: "Verified attendance sheet.",
  };

  const mockRevisionParticipation = {
    id: "part-2",
    organizationId: "org-1",
    activityId: "act-1",
    activityName: "Pasig Youth Leadership Summit",
    status: "needs_revision",
    joinedAt: "2026-08-20T00:00:00Z",
    adminRemarks: "Please provide signed attendance sheet.",
  };

  const mockDraftParticipation = {
    id: "part-draft-1",
    organizationId: "org-1",
    activityId: "act-1",
    activityName: "Pasig Youth Leadership Summit",
    status: "draft",
    joinedAt: "2026-08-20T00:00:00Z",
    proofSubmittedAt: "",
    adminRemarks: "",
  };

  const mockEventFiles = [
    {
      id: "efile-1",
      participationId: "part-draft-1",
      organizationId: "org-1",
      fileName: "attendance_sheet.pdf",
      fileUrl: "storage://ypop-files/part-draft-1/attendance_sheet.pdf",
      fileType: "application/pdf",
      uploadedAt: "2026-08-20T01:00:00Z",
    },
  ];

  const mockEntry = {
    id: "entry-1",
    organizationId: "org-1",
    semester: "2026-S1",
    pointsEarned: 75,
    cityLedPoints: 75,
    orgBonusPoints: 0,
    status: "qualified",
  };

  const mockApprovedPpa = {
    id: "org-act-1",
    ypopEntryId: "entry-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    activityName: "Tree Planting Drive",
    activityDate: "2026-08-15",
    venue: "Rainforest Park",
    narrativeReport: "Planted 100 seedlings with youth volunteers.",
    status: "approved",
  };

  const mockDraftPpa = {
    id: "org-act-2",
    ypopEntryId: "entry-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    activityName: "Youth Health Forum",
    activityDate: "2026-08-22",
    venue: "Barangay San Antonio Gym",
    narrativeReport: "Health education forum.",
    status: "draft",
  };

  const mockPpaFiles = [
    {
      id: "org-file-1",
      orgActivityId: "org-act-1",
      organizationId: "org-1",
      fileName: "RegistrationCertificate_PasigYouth.pdf",
      fileUrl: "storage://ypop-files/org-act-1/RegistrationCertificate_PasigYouth.pdf",
      fileType: "application/pdf",
      uploadedAt: "2026-08-20T01:00:00Z",
    },
  ];

  const mockDraftFiles = [
    {
      id: "org-file-2",
      orgActivityId: "org-act-2",
      organizationId: "org-1",
      fileName: "AttendanceSheet_PasigYouth.pdf",
      fileUrl: "storage://ypop-files/org-act-2/AttendanceSheet_PasigYouth.pdf",
      fileType: "application/pdf",
      uploadedAt: "2026-08-20T01:00:00Z",
    },
  ];

  // -------------------------------------------------------------
  // A. CITY-LED ACTIVITY DETAILS / PROOF (Read-Only)
  // -------------------------------------------------------------
  describe("A. City-Led Activity Details (Read-Only)", () => {
    it("renders Desktop Right-Side Drawer (Sheet) on Desktop (1280px)", () => {
      setViewportWidth(1280);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={mockVerifiedParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Desktop Sheet contains Close Drawer button
      expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
      // Displays activity title
      expect(screen.getByText("Pasig Youth Leadership Summit")).toBeInTheDocument();
      // Displays category and status
      expect(screen.getByText(/Mandatory Activity/i)).toBeInTheDocument();
      expect(screen.getByText(/Participation Verified/i)).toBeInTheDocument();
    });

    it("renders Centered Modal Dialog on Tablet (768px)", () => {
      setViewportWidth(768);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={mockVerifiedParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Mobile/Tablet Dialog contains Close, NOT Close Drawer
      expect(screen.getAllByRole("button", { name: /^Close$/i }).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /Close Drawer/i })).not.toBeInTheDocument();
    });

    it("renders Centered Modal Dialog on Phone (375px)", () => {
      setViewportWidth(375);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={mockVerifiedParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getAllByRole("button", { name: /^Close$/i }).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /Close Drawer/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // B. CITY-LED ATTENDANCE PROOF SUBMISSION (Editable)
  // -------------------------------------------------------------
  describe("B. City-Led Attendance Proof Submission (Editable)", () => {
    it("renders Desktop Right-Side Drawer (Sheet) on Desktop (1280px) with file upload", () => {
      setViewportWidth(1280);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={mockRevisionParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Cancel button
      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      // Submission action button
      expect(screen.getByRole("button", { name: /Resubmit Corrected Proof/i })).toBeInTheDocument();
      // File upload dropzone
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
      // Admin remarks banner
      expect(screen.getByText(/Please provide signed attendance sheet/i)).toBeInTheDocument();
    });

    it("renders Centered Modal Dialog on Phone (375px) with all actions intact", () => {
      setViewportWidth(375);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={mockRevisionParticipation as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Resubmit Corrected Proof/i })).toBeInTheDocument();
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
    });

    it("renders Draft state with Draft Proof Attached banner, Draft file badge, and Submit Proof for Review button", () => {
      setViewportWidth(1280);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={mockDraftParticipation as any}
          eventFiles={mockEventFiles as any}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Check for Draft callout banner
      expect(screen.getByText(/Draft Proof Attached/i)).toBeInTheDocument();
      // Check for Draft badge on the uploaded file
      expect(screen.getByText(/^Draft$/i)).toBeInTheDocument();
      // Check for Submit Proof for Review button
      expect(screen.getByRole("button", { name: /Submit Proof for Review/i })).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // B.2. CITY-LED ACTIVITY DRAWER PHONE RESPONSIVENESS (320px - 430px)
  // -------------------------------------------------------------
  describe("B.2. City-Led Activity Drawer Phone Responsiveness (320px, 375px, 390px, 430px)", () => {
    const phoneWidths = [320, 375, 390, 430];

    const longTitleActivity = {
      id: "act-long",
      semesterKey: "2026-S1",
      name: "Comprehensive Inter-Barangay Disaster Risk Reduction & Management Youth Training and Certification Workshop 2026",
      title: "Comprehensive Inter-Barangay Disaster Risk Reduction & Management Youth Training and Certification Workshop 2026",
      date: "2026-09-01T00:00:00Z",
      venue: "Pasig City Sports Complex Main Arena, Caruncho Avenue, Barangay San Nicolas, Pasig City",
      points: 2,
      category: "partnership",
      description: "Disaster preparedness training with multi-stakeholder participation.",
    };

    const mockMultipleFiles = [
      {
        id: "file-1",
        participationId: "part-pending-1",
        organizationId: "org-1",
        fileName: "RegistrationCertificate_PasigYouth_OfficialCopy.pdf",
        fileUrl: "https://example.com/file-1.pdf",
        fileType: "application/pdf",
        uploadedAt: "2026-09-01T01:00:00Z",
      },
      {
        id: "file-2",
        participationId: "part-pending-1",
        organizationId: "org-1",
        fileName: "Attendance_Sheet_Session_Morning_Signed.docx",
        fileUrl: "https://example.com/file-2.docx",
        fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        uploadedAt: "2026-09-01T01:10:00Z",
      },
    ];

    const pendingParticipation = {
      id: "part-pending-1",
      organizationId: "org-1",
      activityId: "act-long",
      activityName: longTitleActivity.name,
      status: "pending_verification",
      joinedAt: "2026-09-01T00:00:00Z",
      adminRemarks: "",
    };

    phoneWidths.forEach((width) => {
      it(`renders mobile drawer correctly at ${width}px without collisions or overflow`, () => {
        cleanup();
        setViewportWidth(width);
        const onOpenChangeMock = vi.fn();

        render(
          <YpopProofDrawer
            open={true}
            onOpenChange={onOpenChangeMock}
            activity={longTitleActivity as any}
            participation={pendingParticipation as any}
            eventFiles={mockMultipleFiles as any}
            organizationId="org-1"
            onParticipationUpdated={vi.fn()}
            onFileCreated={vi.fn()}
            onFileDeleted={vi.fn()}
          />
        );

        // 1. Pinned Header Elements
        expect(screen.getByText(/Partnership Activity/i)).toBeInTheDocument();
        expect(screen.getByText(/2 Points Weight/i)).toBeInTheDocument();
        expect(screen.getByText(/STATUS: PENDING VERIFICATION/i)).toBeInTheDocument();
        expect(screen.getByText(longTitleActivity.name)).toBeInTheDocument();
        expect(screen.getByText(/Pasig City Sports Complex/i)).toBeInTheDocument();

        // 2. Top-right dedicated close button
        const closeBtn = screen.getByRole("button", { name: /^Close$/i });
        expect(closeBtn).toBeInTheDocument();

        // 3. Informational Banner
        expect(screen.getByText(/Awaiting Admin Validation/i)).toBeInTheDocument();
        expect(screen.getByText(/Proof documents have been submitted and are under review/i)).toBeInTheDocument();

        // 4. Remarks textarea
        expect(screen.getByLabelText(/Remarks \(Optional\)/i)).toBeInTheDocument();

        // 5. Upload dropzone
        expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();

        // 6. Attachment rows with View action
        const viewBtns = screen.getAllByRole("button", { name: /^View$/i });
        expect(viewBtns.length).toBe(2);

        // 7. Pinned Footer buttons
        expect(screen.getByRole("button", { name: /^Cancel$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Submit Proof for Review/i })).toBeInTheDocument();
      });
    });

    it("renders all status callout variants properly on phone viewport (375px)", () => {
      cleanup();
      setViewportWidth(375);

      // 1. Verified state
      const { rerender } = render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={{ ...mockVerifiedParticipation, status: "verified" } as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );
      expect(screen.getByText(/Participation Verified/i)).toBeInTheDocument();

      // 2. Needs Revision state with admin remarks
      rerender(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={{ ...mockRevisionParticipation, status: "needs_revision", adminRemarks: "Fix signature on sheet" } as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );
      expect(screen.getByText(/Admin Revision Requested/i)).toBeInTheDocument();
      expect(screen.getByText(/"Fix signature on sheet"/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Resubmit Corrected Proof/i })).toBeInTheDocument();

      // 3. Rejected state
      rerender(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={{ ...mockRevisionParticipation, status: "rejected", adminRemarks: "Unaccredited event" } as any}
          eventFiles={[]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );
      expect(screen.getByText(/Participation Rejected/i)).toBeInTheDocument();
      expect(screen.getByText(/"Unaccredited event"/i)).toBeInTheDocument();
    });

    it("verifies file actions: View opens file and Delete removes attachment on phone (390px)", async () => {
      cleanup();
      setViewportWidth(390);
      const onFileDeletedMock = vi.fn();
      const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockCityActivity as any}
          participation={pendingParticipation as any}
          eventFiles={mockMultipleFiles as any}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={onFileDeletedMock}
        />
      );

      // Click View on first file
      const viewBtns = screen.getAllByRole("button", { name: /^View$/i });
      fireEvent.click(viewBtns[0]);
      await waitFor(() => {
        expect(openSpy).toHaveBeenCalled();
      });

      // Click Delete on first file
      const deleteBtns = screen.getAllByTitle(/Remove file/i);
      expect(deleteBtns.length).toBe(2);
      fireEvent.click(deleteBtns[0]);

      openSpy.mockRestore();
    });

    it("DESKTOP UI PRESERVED: YES (Desktop right-side Sheet rendered at 1280px, 1440px, 1920px)", () => {
      [1280, 1440, 1920].forEach((desktopWidth) => {
        cleanup();
        setViewportWidth(desktopWidth);

        render(
          <YpopProofDrawer
            open={true}
            onOpenChange={vi.fn()}
            activity={mockCityActivity as any}
            participation={mockDraftParticipation as any}
            eventFiles={mockEventFiles as any}
            organizationId="org-1"
            onParticipationUpdated={vi.fn()}
            onFileCreated={vi.fn()}
            onFileDeleted={vi.fn()}
          />
        );

        // In desktop mode, SheetClose button "Cancel" is rendered
        expect(screen.getByRole("button", { name: /^Cancel$/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Submit Proof for Review/i })).toBeInTheDocument();
        // Displays title and category
        expect(screen.getByText("Pasig Youth Leadership Summit")).toBeInTheDocument();
        expect(screen.getByText(/Mandatory Activity/i)).toBeInTheDocument();
      });
    });
  });

  // -------------------------------------------------------------
  // C. ORGANIZATION-LED PPA DETAILS / VIEW (Read-Only)
  // -------------------------------------------------------------
  describe("C. Organization-Led PPA Details (Read-Only)", () => {
    it("renders Desktop Right-Side Drawer (Sheet) on Desktop (1280px)", () => {
      setViewportWidth(1280);

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry as any}
          activity={mockApprovedPpa as any}
          orgActivityFiles={[]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Desktop Sheet contains Close Drawer button
      expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Log Another Activity/i })).toBeInTheDocument();
      expect(screen.getByText("Organization-Led Activity Details")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Tree Planting Drive")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Rainforest Park")).toBeInTheDocument();
    });

    it("renders Centered Modal Dialog on Tablet (768px)", () => {
      setViewportWidth(768);

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry as any}
          activity={mockApprovedPpa as any}
          orgActivityFiles={[]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Mobile/Tablet Dialog contains Close, NOT Close Drawer
      expect(screen.getAllByRole("button", { name: /^Close$/i }).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /Close Drawer/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Log Another Activity/i })).toBeInTheDocument();
    });

    it("renders Centered Modal Dialog on Phone (375px)", () => {
      setViewportWidth(375);

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry as any}
          activity={mockApprovedPpa as any}
          orgActivityFiles={[]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getAllByRole("button", { name: /^Close$/i }).length).toBeGreaterThan(0);
      expect(screen.queryByRole("button", { name: /Close Drawer/i })).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // D. ORGANIZATION-LED PPA CREATE / EDIT (Editable)
  // -------------------------------------------------------------
  describe("D. Organization-Led PPA Create / Edit (Editable)", () => {
    it("renders Desktop Right-Side Drawer (Sheet) on Desktop (1280px) with draft & submit actions", () => {
      setViewportWidth(1280);

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry as any}
          activity={mockDraftPpa as any}
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
      expect(screen.getByText("Edit Organization-Led Activity (PPA)")).toBeInTheDocument();
      expect(screen.getByDisplayValue("Youth Health Forum")).toBeInTheDocument();
      expect(screen.getByText(/Click to browse file/i)).toBeInTheDocument();
    });

    it("renders Centered Modal Dialog on Phone (375px) for creating new PPA", () => {
      setViewportWidth(375);

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry as any}
          activity={null}
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
      expect(screen.getByText("Log Organization-led Activities")).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/Enter activity title/i)).toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // E. ORGANIZATION-LED PPA MOBILE PHONE RESPONSIVENESS & DESKTOP REGRESSION
  // -------------------------------------------------------------
  describe("E. Organization-Led PPA Mobile Phone Responsiveness & Desktop Regression", () => {
    const phoneWidths = [320, 375, 390, 430];

    phoneWidths.forEach((width) => {
      it(`renders mobile drawer hierarchy, non-colliding header, and scrollable body at ${width}px`, () => {
        setViewportWidth(width);

        render(
          <YpopPpaModal
            open={true}
            onOpenChange={vi.fn()}
            entry={mockEntry as any}
            activity={mockApprovedPpa as any}
            orgActivityFiles={mockPpaFiles as any}
            organizationId="org-1"
            userId="user-1"
            onActivitySaved={vi.fn()}
            onFileCreated={vi.fn()}
            onFileDeleted={vi.fn()}
          />
        );

        // Header context and status are distinct and present
        expect(screen.getByText("Organization-Led PPA")).toBeInTheDocument();
        expect(screen.getByText(/Status: APPROVED/i)).toBeInTheDocument();
        expect(screen.getByText("Organization-Led Activity Details")).toBeInTheDocument();
        expect(screen.getByText("Record activities initiated and conducted by the organization.")).toBeInTheDocument();

        // Close button in header is accessible
        expect(screen.getAllByRole("button", { name: /^Close$/i }).length).toBeGreaterThan(0);

        // Supporting documents and file details are accessible without horizontal cutoff
        expect(screen.getByText("Supporting Documents")).toBeInTheDocument();
        expect(screen.getByText("RegistrationCertificate_PasigYouth.pdf")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /View/i })).toBeInTheDocument();

        // Pinned footer buttons
        expect(screen.getByRole("button", { name: /Log Another Activity/i })).toBeInTheDocument();
      });

      it(`renders editable mobile form with proper field labels and actions at ${width}px`, () => {
        setViewportWidth(width);

        render(
          <YpopPpaModal
            open={true}
            onOpenChange={vi.fn()}
            entry={mockEntry as any}
            activity={mockDraftPpa as any}
            orgActivityFiles={mockDraftFiles as any}
            organizationId="org-1"
            userId="user-1"
            onActivitySaved={vi.fn()}
            onFileCreated={vi.fn()}
            onFileDeleted={vi.fn()}
          />
        );

        // Header
        expect(screen.getByText("Organization-Led PPA")).toBeInTheDocument();
        expect(screen.getByText(/Status: DRAFT/i)).toBeInTheDocument();
        expect(screen.getByText("Edit Organization-Led Activity (PPA)")).toBeInTheDocument();

        // Form sections
        expect(screen.getByText("Activity Details")).toBeInTheDocument();
        expect(screen.getByText("Activity Description")).toBeInTheDocument();
        expect(screen.getByText("Supporting Documents")).toBeInTheDocument();

        // Fields
        expect(screen.getByLabelText(/Activity Title/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Date Conducted/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Venue \/ Location/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();

        // Upload and attachments
        expect(screen.getByText("Click to browse file")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Remove attachment/i })).toBeInTheDocument();

        // Footer actions
        expect(screen.getByRole("button", { name: /Cancel/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Save as Draft/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Submit for Review/i })).toBeInTheDocument();
      });
    });

    const desktopWidths = [1280, 1440, 1920];
    desktopWidths.forEach((width) => {
      it(`preserves approved Desktop Right-Side Drawer (Sheet) UI at ${width}px`, () => {
        setViewportWidth(width);

        render(
          <YpopPpaModal
            open={true}
            onOpenChange={vi.fn()}
            entry={mockEntry as any}
            activity={mockApprovedPpa as any}
            orgActivityFiles={mockPpaFiles as any}
            organizationId="org-1"
            userId="user-1"
            onActivitySaved={vi.fn()}
            onFileCreated={vi.fn()}
            onFileDeleted={vi.fn()}
          />
        );

        // Desktop explicitly renders "Close Drawer" (SheetClose)
        expect(screen.getByRole("button", { name: /Close Drawer/i })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: /Log Another Activity/i })).toBeInTheDocument();
        expect(screen.getByText("Organization-Led Activity Details")).toBeInTheDocument();
        expect(screen.getByText("RegistrationCertificate_PasigYouth.pdf")).toBeInTheDocument();
      });
    });
  });
});
