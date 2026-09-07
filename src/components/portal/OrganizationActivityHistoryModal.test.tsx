import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  OrganizationActivityHistoryModal,
  normalizeActivityTitle,
  formatEventTimestamp,
  formatGroupDateHeader,
  getActivityMarker,
} from "./OrganizationActivityHistoryModal";

describe("OrganizationActivityHistoryModal Component & Timeline", () => {
  const mockActivities = [
    {
      id: "act-1",
      message: "Marked Tadz As Verified On AUGUST 6, 2026.",
      timestamp: "2026-08-06T03:33:00Z",
    },
    {
      id: "act-2",
      message: "Marked Tadz As Verified On JUNE 5, 2026.",
      timestamp: "2026-06-05T19:59:00Z",
    },
    {
      id: "act-3",
      message: "Profile Updated",
      timestamp: "2026-06-05T13:38:00Z",
      note: "Updated organization adviser and primary contact details.",
    },
    {
      id: "act-4",
      message: "submitted_batch_document_review",
      timestamp: "2026-06-01T10:00:00Z",
    },
    {
      id: "act-5",
      message: "needs_revision",
      timestamp: "2026-05-20T08:30:00Z",
      note: "Barangay endorsement missing official dry seal.",
    },
  ];

  it("renders modal with institutional header and official audit trail badge when open=true", () => {
    const handleOpenChange = vi.fn();
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={handleOpenChange}
        activities={mockActivities}
      />
    );

    expect(screen.getByText("Official Audit Trail")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Organization Activity History" })).toBeInTheDocument();
    expect(
      screen.getByText(/Complete chronological timeline of verification reviews/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/5 recorded events · Official Y-TRACE Record/i)).toBeInTheDocument();
  });

  it("does not render dialog content when open=false", () => {
    render(
      <OrganizationActivityHistoryModal
        open={false}
        onOpenChange={vi.fn()}
        activities={mockActivities}
      />
    );

    expect(screen.queryByText("Organization Activity History")).not.toBeInTheDocument();
  });

  it("groups activities by date in uppercase editorial headers with chronological rail", () => {
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={mockActivities}
      />
    );

    // Date headers rendered in uppercase
    expect(screen.getByText("AUGUST 6, 2026")).toBeInTheDocument();
    expect(screen.getByText("JUNE 5, 2026")).toBeInTheDocument();
    expect(screen.getByText("JUNE 1, 2026")).toBeInTheDocument();
    expect(screen.getByText("MAY 20, 2026")).toBeInTheDocument();
  });

  it("normalizes activity titles and strips redundant 'On [Date]' suffixes", () => {
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={mockActivities}
      />
    );

    // Stripped of redundant "On AUGUST 6, 2026." since date is already in section header
    const verifiedTitles = screen.getAllByText("Marked Tadz As Verified");
    expect(verifiedTitles.length).toBe(2);

    expect(screen.getByText("Profile Updated")).toBeInTheDocument();
    expect(screen.getByText("Batch Documents Submitted")).toBeInTheDocument();
    expect(screen.getByText("Revision Requested")).toBeInTheDocument();
  });

  it("renders timestamps and notes accurately", () => {
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={mockActivities}
      />
    );

    // Formatted timestamps
    expect(screen.getByText(/Aug 6, 2026 ·/i)).toBeInTheDocument();
    expect(screen.getByText(/Jun 5, 2026 ·/i)).toBeInTheDocument();

    // Notes
    expect(screen.getByText("Updated organization adviser and primary contact details.")).toBeInTheDocument();
    expect(screen.getByText("Barangay endorsement missing official dry seal.")).toBeInTheDocument();
  });

  it("renders a calm institutional empty state when activities array is empty", () => {
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={[]}
        emptyDescription="No administrative changes recorded for this organization yet."
      />
    );

    expect(screen.getByText("No activity recorded yet")).toBeInTheDocument();
    expect(
      screen.getByText("No administrative changes recorded for this organization yet.")
    ).toBeInTheDocument();
    expect(screen.getByText(/0 recorded events/i)).toBeInTheDocument();
  });

  it("calls onOpenChange(false) when clicking the footer Close button or header X button", () => {
    const handleOpenChange = vi.fn();
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={handleOpenChange}
        activities={mockActivities}
      />
    );

    const closeButtons = screen.getAllByRole("button", { name: /Close/i });
    expect(closeButtons.length).toBeGreaterThanOrEqual(1);
    fireEvent.click(closeButtons[0]);
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders accurately for a single event with singular event count", () => {
    const singleActivity = [
      {
        id: "act-single",
        message: "Marked Tadz As Verified",
        timestamp: "2026-08-06T03:33:00Z",
      },
    ];

    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={singleActivity}
      />
    );

    expect(screen.getByText("1 event")).toBeInTheDocument();
    expect(screen.getByText(/1 recorded event · Official Y-TRACE Record/i)).toBeInTheDocument();
    expect(screen.getByText("Marked Tadz As Verified")).toBeInTheDocument();
  });

  it("renders long histories with multiple chronological date groups and distinct timestamps for repeated actions", () => {
    const longActivities = [
      { id: "h-1", message: "Marked Tadz As Verified", timestamp: "2026-08-06T10:00:00Z" },
      { id: "h-2", message: "Marked Tadz As Verified", timestamp: "2026-08-06T08:00:00Z" },
      { id: "h-3", message: "Profile Updated", timestamp: "2026-07-20T14:30:00Z" },
      { id: "h-4", message: "Document Uploaded", timestamp: "2026-07-15T09:15:00Z" },
      { id: "h-5", message: "Marked Tadz As Verified", timestamp: "2026-06-05T19:59:00Z" },
      { id: "h-6", message: "Marked Tadz As Verified", timestamp: "2026-06-05T13:28:00Z" },
    ];

    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={longActivities}
      />
    );

    expect(screen.getByText("6 events")).toBeInTheDocument();
    expect(screen.getByText(/6 recorded events · Official Y-TRACE Record/i)).toBeInTheDocument();
    expect(screen.getByText("AUGUST 6, 2026")).toBeInTheDocument();
    expect(screen.getByText("JULY 20, 2026")).toBeInTheDocument();
    expect(screen.getByText("JULY 15, 2026")).toBeInTheDocument();
    expect(screen.getByText("JUNE 5, 2026")).toBeInTheDocument();

    const verifiedEvents = screen.getAllByText("Marked Tadz As Verified");
    expect(verifiedEvents.length).toBe(4);
  });

  it("calls onOpenChange(false) when pressing Escape key", () => {
    const handleOpenChange = vi.fn();
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={handleOpenChange}
        activities={mockActivities}
      />
    );

    fireEvent.keyDown(document.activeElement || document, { key: "Escape", code: "Escape" });
    expect(handleOpenChange).toHaveBeenCalledWith(false);
  });

  it("renders structurally centered vertical connector line and timeline marker column", () => {
    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={mockActivities}
      />
    );

    // Timeline connector line elements exist within date groups
    const connectorLines = document.querySelectorAll(".w-px.bg-border\\/70");
    expect(connectorLines.length).toBeGreaterThan(0);
    connectorLines.forEach((line) => {
      // Anchored to horizontal 12px (left-3 = 0.75rem = 12px) with -translate-x-1/2
      expect(line.className).toContain("left-3");
      expect(line.className).toContain("-translate-x-1/2");
      expect(line.className).toContain("top-0");
      expect(line.className).toContain("bottom-0");
    });

    // Marker columns occupy fixed-width w-6 column (1.5rem = 24px, centered at 12px)
    const markerColumns = document.querySelectorAll(".w-6.shrink-0");
    expect(markerColumns.length).toBe(mockActivities.length);
    markerColumns.forEach((col) => {
      expect(col.className).toContain("flex");
      expect(col.className).toContain("items-center");
      expect(col.className).toContain("justify-center");
    });

    // Event content containers use flex-1 min-w-0 to prevent layout shifts on varying widths
    const contentColumns = document.querySelectorAll(".space-y-0\\.5.flex-1.min-w-0");
    expect(contentColumns.length).toBe(mockActivities.length);
  });

  it("maintains fixed marker column coordinate regardless of long title or timestamp length", () => {
    const variableLengthActivities = [
      {
        id: "short-1",
        message: "Short",
        timestamp: "2026-08-06T03:33:00Z",
      },
      {
        id: "very-long-2",
        message:
          "Very Long Activity Title Description Marking The Sangguniang Kabataan Federation Youth Organization Council As Fully Verified and Legally Compliant With Every City Ordinance And Requirement",
        timestamp: "2026-08-06T03:33:00Z",
        note: "Extremely detailed administrative compliance note providing granular historical context regarding documentary validation and official dry seal verification.",
      },
    ];

    render(
      <OrganizationActivityHistoryModal
        open={true}
        onOpenChange={vi.fn()}
        activities={variableLengthActivities}
      />
    );

    const markerCols = document.querySelectorAll(".w-6.shrink-0");
    expect(markerCols.length).toBe(2);

    // Both short and long items have identical fixed column width class
    markerCols.forEach((col) => {
      expect(col.classList.contains("w-6")).toBe(true);
      expect(col.classList.contains("shrink-0")).toBe(true);
    });
  });

  describe("Helper Functions", () => {
    it("normalizeActivityTitle strips trailing date and formats actions", () => {
      expect(normalizeActivityTitle("Marked Pasig Youth Council As Verified On AUGUST 6, 2026."))
        .toBe("Marked Pasig Youth Council As Verified");
      expect(normalizeActivityTitle("profile_updated")).toBe("Profile Updated");
      expect(normalizeActivityTitle("approved_documents")).toBe("Documents Approved");
      expect(normalizeActivityTitle("needs_revision")).toBe("Revision Requested");
    });

    it("formatGroupDateHeader formats dates into uppercase format", () => {
      expect(formatGroupDateHeader("2026-08-06T10:00:00Z")).toBe("AUGUST 6, 2026");
      expect(formatGroupDateHeader("2026-01-15T10:00:00Z")).toBe("JANUARY 15, 2026");
      expect(formatGroupDateHeader(null)).toBe("RECENT ACTIVITY");
    });

    it("formatEventTimestamp formats readable timestamps", () => {
      const ts = formatEventTimestamp("2026-08-06T03:33:00Z");
      expect(ts).toMatch(/Aug 6, 2026 · \d+:\d+ (AM|PM)/);
    });

    it("getActivityMarker provides subtle semantic markers", () => {
      expect(getActivityMarker("Verified").dotClassName).toContain("bg-emerald-600");
      expect(getActivityMarker("needs_revision").dotClassName).toContain("bg-amber-600");
      expect(getActivityMarker("Profile Updated").dotClassName).toContain("bg-primary");
      expect(getActivityMarker("Document Uploaded").dotClassName).toContain("bg-sky-600");
      expect(getActivityMarker("Budget Request Released").dotClassName).toContain("bg-indigo-600");
    });
  });
});
