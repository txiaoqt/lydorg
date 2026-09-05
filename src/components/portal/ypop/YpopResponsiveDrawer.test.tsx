import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
});
