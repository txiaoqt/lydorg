import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { PortalDocumentDrawer } from "./PortalDocumentDrawer";
import { calculateRevisionDeadline } from "@/lib/revision-deadline";

describe("PortalDocumentDrawer 5-Day Resubmission Notice & Countdown", () => {
  beforeEach(() => {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as any;

    window.innerWidth = 1280;
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes("min-width: 1024px"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  const baseFile = {
    id: "doc-1",
    name: "Certificate_of_Registration.pdf",
    fileName: "Certificate_of_Registration.pdf",
    originalName: "Certificate_of_Registration.pdf",
    fileUrl: "https://example.com/cert.pdf",
    fileSize: 204800,
    uploadedAt: "2026-09-20T10:00:00Z",
  };

  it("1. Renders active 5-day resubmission window with dynamic countdown and enabled upload button when fresh", () => {
    // Current time is now, deadline is 5 days + 5 mins later
    const now = new Date();
    const deadline = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString();

    const file = {
      ...baseFile,
      adminStatus: "needs_revision",
      adminRemarks: "Please provide the notarized version with complete signatures.",
      revisionRequestedAt: now.toISOString(),
      revisionDueAt: deadline,
      revisionLocked: false,
    };

    render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={file as any}
        documentTypeName="Certificate of Registration"
        previewUrl="https://example.com/cert.pdf"
        onReplaceFile={vi.fn()}
      />
    );

    // Verify headline and notice card
    expect(screen.getByText("Resubmission window")).toBeInTheDocument();
    expect(screen.getByText("5 days remaining to resubmit")).toBeInTheDocument();
    expect(
      screen.getByText(
        /Please submit your revised document before the deadline. Once the 5-day resubmission period ends, this submission will be locked and can only be reopened by a PCYDO administrator./i
      )
    ).toBeInTheDocument();

    // Verify Admin Remarks
    expect(
      screen.getByText(
        /"Please provide the notarized version with complete signatures."/i
      )
    ).toBeInTheDocument();

    // Verify upload button is active
    const uploadBtn = screen.getByRole("button", { name: /Upload Revised File/i });
    expect(uploadBtn).toBeInTheDocument();
    expect(uploadBtn).not.toBeDisabled();
  });

  it("2. Renders dynamic remaining days (e.g. 2 days remaining) with expiring-soon style", () => {
    // 2 days remaining (due in 48 hours + 1 hour)
    const now = new Date();
    const dueAt = new Date(now.getTime() + 49 * 60 * 60 * 1000).toISOString();

    const file = {
      ...baseFile,
      adminStatus: "needs_revision",
      adminRemarks: "Page 2 is blurry.",
      revisionDueAt: dueAt,
      revisionLocked: false,
    };

    render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={file as any}
        documentTypeName="Constitution and By-Laws"
        previewUrl="https://example.com/cert.pdf"
        onReplaceFile={vi.fn()}
      />
    );

    expect(screen.getByText("Resubmission window")).toBeInTheDocument();
    expect(screen.getByText("2 days remaining to resubmit")).toBeInTheDocument();

    const noticeCard = screen.getByTestId("revision-notice-card");
    expect(noticeCard.getAttribute("data-notice-state")).toBe("expiring-soon");

    const uploadBtn = screen.getByRole("button", { name: /Upload Revised File/i });
    expect(uploadBtn).not.toBeDisabled();
  });

  it("3. Renders singular '1 day remaining to resubmit' when exactly 1 day is left", () => {
    const now = new Date();
    const dueAt = new Date(now.getTime() + 25 * 60 * 60 * 1000).toISOString();

    const file = {
      ...baseFile,
      adminStatus: "needs_revision",
      revisionDueAt: dueAt,
      revisionLocked: false,
    };

    render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={file as any}
        documentTypeName="Directory of Officers"
        previewUrl="https://example.com/cert.pdf"
        onReplaceFile={vi.fn()}
      />
    );

    expect(screen.getByText("1 day remaining to resubmit")).toBeInTheDocument();
  });

  it("4. Renders locked/expired notice and disabled button when 5-day period has ended", () => {
    // Expired 2 days ago
    const pastDueAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    const file = {
      ...baseFile,
      adminStatus: "needs_revision",
      adminRemarks: "Missing signatures on page 3.",
      revisionDueAt: pastDueAt,
      revisionLocked: true,
      revisionLockedAt: pastDueAt,
    };

    render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={file as any}
        documentTypeName="Directory of Officers"
        previewUrl="https://example.com/cert.pdf"
        onReplaceFile={vi.fn()}
      />
    );

    expect(screen.getByText("Resubmission period ended")).toBeInTheDocument();
    expect(screen.getByText("Locked")).toBeInTheDocument();
    expect(
      screen.getByText(
        /The 5-day resubmission period has ended. This submission is now locked. Contact the PCYDO administrator if you need the submission to be reopened./i
      )
    ).toBeInTheDocument();

    const noticeCard = screen.getByTestId("revision-notice-card");
    expect(noticeCard.getAttribute("data-notice-state")).toBe("expired");

    // Button must be disabled and reflect locked status
    const lockedBtn = screen.getByRole("button", { name: /Revision Expired \(Locked\)/i });
    expect(lockedBtn).toBeInTheDocument();
    expect(lockedBtn).toBeDisabled();
  });

  it("5. Renders reopened/unlocked notice and enables resubmission when admin unlocked", () => {
    const pastDueAt = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const unlockedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();

    const file = {
      ...baseFile,
      adminStatus: "needs_revision",
      adminRemarks: "Please correct and re-upload as requested.",
      revisionDueAt: pastDueAt,
      revisionLocked: false,
      revisionUnlockedAt: unlockedAt,
      revisionUnlockedBy: "admin-user-id",
    };

    render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={file as any}
        documentTypeName="Financial Report"
        previewUrl="https://example.com/cert.pdf"
        onReplaceFile={vi.fn()}
      />
    );

    expect(screen.getByText("Resubmission window reopened")).toBeInTheDocument();
    expect(screen.getByText("Unlocked by Admin")).toBeInTheDocument();
    expect(
      screen.getByText(
        /This submission has been unlocked by a PCYDO administrator. You may now upload your corrected document and resubmit./i
      )
    ).toBeInTheDocument();

    const noticeCard = screen.getByTestId("revision-notice-card");
    expect(noticeCard.getAttribute("data-notice-state")).toBe("unlocked");

    const uploadBtn = screen.getByRole("button", { name: /Upload Revised File/i });
    expect(uploadBtn).toBeInTheDocument();
    expect(uploadBtn).not.toBeDisabled();
  });

  it("6. Does NOT render revision notice when document is approved, submitted, or draft", () => {
    const approvedFile = {
      ...baseFile,
      adminStatus: "approved",
      status: "approved",
    };

    const { rerender } = render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={approvedFile as any}
        documentTypeName="Approved Certificate"
        previewUrl="https://example.com/cert.pdf"
      />
    );

    expect(screen.queryByTestId("revision-notice-card")).not.toBeInTheDocument();
    expect(screen.queryByText(/Resubmission window/i)).not.toBeInTheDocument();

    // Draft
    const draftFile = {
      ...baseFile,
      adminStatus: "draft",
    };
    rerender(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={draftFile as any}
        documentTypeName="Draft Document"
        previewUrl="https://example.com/cert.pdf"
      />
    );
    expect(screen.queryByTestId("revision-notice-card")).not.toBeInTheDocument();

    // Under Review / Submitted
    const underReviewFile = {
      ...baseFile,
      adminStatus: "submitted",
    };
    rerender(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={underReviewFile as any}
        documentTypeName="Under Review Document"
        previewUrl="https://example.com/cert.pdf"
      />
    );
    expect(screen.queryByTestId("revision-notice-card")).not.toBeInTheDocument();
  });

  it("7. Renders 4 days, 3 days, hours, and minutes dynamically", () => {
    const now = new Date();

    // 4 days
    const due4Days = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000 + 10000).toISOString();
    const { rerender } = render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={{ ...baseFile, adminStatus: "needs_revision", revisionDueAt: due4Days, revisionLocked: false } as any}
        documentTypeName="Doc"
        previewUrl="https://example.com/cert.pdf"
      />
    );
    expect(screen.getByText("4 days remaining to resubmit")).toBeInTheDocument();

    // 3 days
    const due3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000 + 10000).toISOString();
    rerender(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={{ ...baseFile, adminStatus: "needs_revision", revisionDueAt: due3Days, revisionLocked: false } as any}
        documentTypeName="Doc"
        previewUrl="https://example.com/cert.pdf"
      />
    );
    expect(screen.getByText("3 days remaining to resubmit")).toBeInTheDocument();

    // 8 hours
    const due8Hours = new Date(now.getTime() + 8 * 60 * 60 * 1000 + 10000).toISOString();
    rerender(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={{ ...baseFile, adminStatus: "needs_revision", revisionDueAt: due8Hours, revisionLocked: false } as any}
        documentTypeName="Doc"
        previewUrl="https://example.com/cert.pdf"
      />
    );
    expect(screen.getByText("8 hours remaining to resubmit")).toBeInTheDocument();

    // 30 minutes
    const due30Mins = new Date(now.getTime() + 30 * 60 * 1000 + 10000).toISOString();
    rerender(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={{ ...baseFile, adminStatus: "needs_revision", revisionDueAt: due30Mins, revisionLocked: false } as any}
        documentTypeName="Doc"
        previewUrl="https://example.com/cert.pdf"
      />
    );
    expect(screen.getByText("30 minutes remaining to resubmit")).toBeInTheDocument();
  });

  it("8. Renders Admin Review Rejection notice without countdown when status is rejected", () => {
    const file = {
      ...baseFile,
      adminStatus: "rejected",
      adminRemarks: "The submitted file is completely ineligible.",
    };

    render(
      <PortalDocumentDrawer
        open={true}
        onOpenChange={vi.fn()}
        mode="attached"
        file={file as any}
        documentTypeName="Rejected Document"
        previewUrl="https://example.com/cert.pdf"
      />
    );

    expect(screen.getByText("Admin Review Rejection")).toBeInTheDocument();
    expect(screen.getByText(/"The submitted file is completely ineligible."/i)).toBeInTheDocument();
    expect(screen.queryByText(/Resubmission window/i)).not.toBeInTheDocument();
  });
});
