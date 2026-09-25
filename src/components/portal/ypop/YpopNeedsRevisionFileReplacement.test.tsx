import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { YpopProofDrawer } from "./YpopProofDrawer";
import { YpopPpaModal } from "./YpopPpaModal";
import * as lydoSupabase from "@/lib/lydo-connect-supabase";
import type {
  YPOPCityActivity,
  YPOPEntry,
  YPOPEventFile,
  YPOPEventParticipation,
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

const mockActivity: YPOPCityActivity = {
  id: "act-climate-101",
  semesterKey: "2026-S1",
  name: "Pasig Youth Climate Assembly",
  title: "Pasig Youth Climate Assembly",
  date: "2026-09-15T09:00:00Z",
  startDate: "2026-09-15T09:00:00Z",
  endDate: "2026-09-15T17:00:00Z",
  venue: "Pasig Sports Complex",
  points: 4,
  category: "mandatory",
  description: "City climate assembly.",
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

describe("YPOP Needs Revision File Replacement UX Suite", () => {
  describe("1. City-Led Activity Workflow", () => {
    it("TEST 1: Existing revision file displays 'Needs Revision', while newly staged replacement displays 'Ready to Upload'", async () => {
      setViewportWidth(1280);
      const participation: YPOPEventParticipation = {
        id: "part-rev-1",
        organizationId: "org-1",
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        status: "needs_revision",
        adminRemarks: "Please upload the official signed attendance document.",
        joinedAt: "2026-09-15T09:00:00Z",
        revisionHistory: [],
        createdAt: "2026-09-15T09:00:00Z",
        updatedAt: "2026-09-15T09:00:00Z",
      };

      const oldFile: YPOPEventFile = {
        id: "file-old-1",
        participationId: "part-rev-1",
        organizationId: "org-1",
        fileName: "Constitution and By-Laws (8).pdf",
        fileUrl: "storage://ypop-files/part-rev-1/old.pdf",
        fileType: "application/pdf",
        fileSize: 150000,
        uploadedAt: "2026-09-15T10:00:00Z",
      };

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity}
          participation={participation}
          eventFiles={[oldFile]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Verify old file renders with "Needs Revision"
      expect(screen.getAllByText("Constitution and By-Laws (8).pdf").length).toBeGreaterThan(0);
      const needsRevBadges = screen.getAllByText(/needs revision/i);
      expect(needsRevBadges.length).toBeGreaterThan(0);

      // User selects a replacement file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const newRawFile = new File(["corrected content"], "Constitution and By-Laws (9).pdf", {
        type: "application/pdf",
      });

      fireEvent.change(fileInput, { target: { files: [newRawFile] } });

      // Verify both files are visible
      expect(screen.getAllByText("Constitution and By-Laws (8).pdf").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Constitution and By-Laws (9).pdf").length).toBeGreaterThan(0);

      // Verify new file displays "Ready to Upload" badge, NOT "Needs Revision"
      expect(screen.getByText("Ready to Upload")).toBeInTheDocument();
    });

    it("TEST 2: Removing the old file places it in pending deletion, hiding it from the active list", async () => {
      setViewportWidth(1280);
      const participation: YPOPEventParticipation = {
        id: "part-rev-2",
        organizationId: "org-1",
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        status: "needs_revision",
        adminRemarks: "Wrong file attached.",
        joinedAt: "2026-09-15T09:00:00Z",
        revisionHistory: [],
        createdAt: "2026-09-15T09:00:00Z",
        updatedAt: "2026-09-15T09:00:00Z",
      };

      const oldFile: YPOPEventFile = {
        id: "file-old-2",
        participationId: "part-rev-2",
        organizationId: "org-1",
        fileName: "Old_Proof.pdf",
        fileUrl: "storage://ypop-files/part-rev-2/old.pdf",
        fileType: "application/pdf",
        fileSize: 120000,
        uploadedAt: "2026-09-15T10:00:00Z",
      };

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity}
          participation={participation}
          eventFiles={[oldFile]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getAllByText("Old_Proof.pdf").length).toBeGreaterThan(0);

      // Click remove on the previous proof
      const removeBtn = screen.getByTitle("Remove file");
      fireEvent.click(removeBtn);

      // Old file should now be hidden from the active list
      expect(screen.queryByText("Old_Proof.pdf")).not.toBeInTheDocument();
    });

    it("TEST 3: Multi-file isolation in City-Led: Removing one file does not affect the other file", async () => {
      setViewportWidth(1280);
      const participation: YPOPEventParticipation = {
        id: "part-rev-3",
        organizationId: "org-1",
        activityId: mockActivity.id,
        activityName: mockActivity.name,
        status: "needs_revision",
        adminRemarks: "Please replace the attendance sheet.",
        joinedAt: "2026-09-15T09:00:00Z",
        revisionHistory: [],
        createdAt: "2026-09-15T09:00:00Z",
        updatedAt: "2026-09-15T09:00:00Z",
      };

      const file1: YPOPEventFile = {
        id: "f-att-1",
        participationId: "part-rev-3",
        organizationId: "org-1",
        fileName: "Attendance_Sheet.pdf",
        fileUrl: "storage://ypop-files/part-rev-3/att.pdf",
        fileType: "application/pdf",
        fileSize: 100000,
        uploadedAt: "2026-09-15T10:00:00Z",
      };

      const file2: YPOPEventFile = {
        id: "f-photo-1",
        participationId: "part-rev-3",
        organizationId: "org-1",
        fileName: "Photo_Proof.pdf",
        fileUrl: "storage://ypop-files/part-rev-3/photo.pdf",
        fileType: "application/pdf",
        fileSize: 200000,
        uploadedAt: "2026-09-15T10:00:00Z",
      };

      render(
        <YpopProofDrawer
          open={true}
          onOpenChange={vi.fn()}
          activity={mockActivity}
          participation={participation}
          eventFiles={[file1, file2]}
          organizationId="org-1"
          onParticipationUpdated={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      expect(screen.getAllByText("Attendance_Sheet.pdf").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Photo_Proof.pdf").length).toBeGreaterThan(0);

      // Find the remove button for Attendance_Sheet.pdf
      const removeBtns = screen.getAllByTitle("Remove file");
      fireEvent.click(removeBtns[0]);

      // Attendance_Sheet is removed, Photo_Proof remains
      expect(screen.queryByText("Attendance_Sheet.pdf")).not.toBeInTheDocument();
      expect(screen.getAllByText("Photo_Proof.pdf").length).toBeGreaterThan(0);
    });
  });

  describe("2. Organization-Led PPA Workflow", () => {
    it("TEST 4: Existing PPA revision file displays 'Needs Revision', while newly staged replacement displays 'Ready to Upload'", async () => {
      setViewportWidth(1280);
      const activity: YPOPOrgActivity = {
        id: "ppa-rev-1",
        ypopEntryId: "entry-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        activityName: "Youth Health Workshop",
        activityDate: "2026-09-10",
        venue: "Barangay Hall",
        narrativeReport: "Conducted health workshop.",
        status: "needs_revision",
        adminRemarks: "Please attach the signed attendance sheet.",
        submittedAt: "2026-09-10T12:00:00Z",
        createdAt: "2026-09-10T00:00:00Z",
        updatedAt: "2026-09-10T00:00:00Z",
      };

      const oldFile: YPOPOrgActivityFile = {
        id: "ppa-f-old-1",
        orgActivityId: "ppa-rev-1",
        organizationId: "org-1",
        fileName: "Constitution and By-Laws (8).pdf",
        fileUrl: "storage://ypop-files/ppa-rev-1/old.pdf",
        fileType: "application/pdf",
        fileSize: 150000,
        uploadedAt: "2026-09-10T12:00:00Z",
      };

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={activity}
          orgActivityFiles={[oldFile]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={vi.fn()}
        />
      );

      // Verify old file renders with "Needs Revision"
      expect(screen.getAllByText("Constitution and By-Laws (8).pdf").length).toBeGreaterThan(0);
      const needsRevBadges = screen.getAllByText(/needs revision/i);
      expect(needsRevBadges.length).toBeGreaterThan(0);

      // User selects a replacement file
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      const newRawFile = new File(["corrected content"], "Constitution and By-Laws (9).pdf", {
        type: "application/pdf",
      });

      fireEvent.change(fileInput, { target: { files: [newRawFile] } });

      // Verify both files are visible
      expect(screen.getAllByText("Constitution and By-Laws (8).pdf").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Constitution and By-Laws (9).pdf").length).toBeGreaterThan(0);

      // Verify new file displays "Ready to Upload" badge, NOT "Needs Revision"
      expect(screen.getByText("Ready to Upload")).toBeInTheDocument();
    });

    it("TEST 5: Removing a saved PPA file in revision mode calls deleteYpopOrgActivityFileFromSupabase and onFileDeleted", async () => {
      setViewportWidth(1280);
      const activity: YPOPOrgActivity = {
        id: "ppa-rev-2",
        ypopEntryId: "entry-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        activityName: "Tree Planting",
        activityDate: "2026-09-10",
        venue: "Rainforest Park",
        narrativeReport: "Tree planting activity.",
        status: "needs_revision",
        adminRemarks: "Old file rejected.",
        submittedAt: "2026-09-10T12:00:00Z",
        createdAt: "2026-09-10T00:00:00Z",
        updatedAt: "2026-09-10T00:00:00Z",
      };

      const oldFile: YPOPOrgActivityFile = {
        id: "ppa-f-old-2",
        orgActivityId: "ppa-rev-2",
        organizationId: "org-1",
        fileName: "Old_PPA_Doc.pdf",
        fileUrl: "storage://ypop-files/ppa-rev-2/old.pdf",
        fileType: "application/pdf",
        fileSize: 120000,
        uploadedAt: "2026-09-10T12:00:00Z",
      };

      const mockDeleteSupabase = vi.spyOn(lydoSupabase, "deleteYpopOrgActivityFileFromSupabase").mockResolvedValue(undefined as any);
      const onFileDeletedMock = vi.fn();

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={activity}
          orgActivityFiles={[oldFile]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={onFileDeletedMock}
        />
      );

      expect(screen.getAllByText("Old_PPA_Doc.pdf").length).toBeGreaterThan(0);

      // Click remove on the previous attachment
      const removeBtn = screen.getByTitle("Remove attachment");
      fireEvent.click(removeBtn);

      await waitFor(() => {
        expect(mockDeleteSupabase).toHaveBeenCalledWith("ppa-f-old-2", oldFile.fileUrl);
        expect(onFileDeletedMock).toHaveBeenCalledWith("ppa-f-old-2");
      });
      mockDeleteSupabase.mockRestore();
    });

    it("TEST 6: Multi-file isolation in PPA: Removing one attachment does not affect the other attachment", async () => {
      setViewportWidth(1280);
      const activity: YPOPOrgActivity = {
        id: "ppa-rev-3",
        ypopEntryId: "entry-1",
        organizationId: "org-1",
        submittedBy: "user-1",
        activityName: "Youth Leadership Summit",
        activityDate: "2026-09-10",
        venue: "City Hall",
        narrativeReport: "Summit activity.",
        status: "needs_revision",
        adminRemarks: "Please update narrative report.",
        submittedAt: "2026-09-10T12:00:00Z",
        createdAt: "2026-09-10T00:00:00Z",
        updatedAt: "2026-09-10T00:00:00Z",
      };

      const file1: YPOPOrgActivityFile = {
        id: "ppa-f-att-1",
        orgActivityId: "ppa-rev-3",
        organizationId: "org-1",
        fileName: "Attendance_Sheet.pdf",
        fileUrl: "storage://ypop-files/ppa-rev-3/att.pdf",
        fileType: "application/pdf",
        fileSize: 100000,
        uploadedAt: "2026-09-10T12:00:00Z",
      };

      const file2: YPOPOrgActivityFile = {
        id: "ppa-f-narr-1",
        orgActivityId: "ppa-rev-3",
        organizationId: "org-1",
        fileName: "Narrative_Report.pdf",
        fileUrl: "storage://ypop-files/ppa-rev-3/narr.pdf",
        fileType: "application/pdf",
        fileSize: 200000,
        uploadedAt: "2026-09-10T12:00:00Z",
      };

      const mockDeleteSupabase = vi.spyOn(lydoSupabase, "deleteYpopOrgActivityFileFromSupabase").mockResolvedValue(undefined as any);
      const onFileDeletedMock = vi.fn();

      render(
        <YpopPpaModal
          open={true}
          onOpenChange={vi.fn()}
          entry={mockEntry}
          activity={activity}
          orgActivityFiles={[file1, file2]}
          organizationId="org-1"
          userId="user-1"
          onActivitySaved={vi.fn()}
          onFileCreated={vi.fn()}
          onFileDeleted={onFileDeletedMock}
        />
      );

      expect(screen.getAllByText("Attendance_Sheet.pdf").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Narrative_Report.pdf").length).toBeGreaterThan(0);

      // Remove Narrative_Report.pdf
      const removeBtns = screen.getAllByTitle("Remove attachment");
      fireEvent.click(removeBtns[1]);

      // Only narrative report is deleted, attendance sheet is NOT deleted
      await waitFor(() => {
        expect(mockDeleteSupabase).toHaveBeenCalledWith("ppa-f-narr-1", file2.fileUrl);
        expect(mockDeleteSupabase).not.toHaveBeenCalledWith("ppa-f-att-1", file1.fileUrl);
        expect(onFileDeletedMock).toHaveBeenCalledWith("ppa-f-narr-1");
      });
      mockDeleteSupabase.mockRestore();
    });
  });
});
