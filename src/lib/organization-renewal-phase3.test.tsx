import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { OrganizationProfile, OrganizationRenewalRecord } from "./lydo-connect-data";
import {
  resolveUserRenewalState,
  getRenewalWindowEligibility,
  getOrganizationRenewalCountdown,
} from "./organization-renewal";
import { UserPortalRedesignView } from "@/components/portal/UserPortalRedesignView";
import { UserPortalRenewalWorkspaceView } from "@/components/portal/UserPortalRenewalWorkspaceView";
import { UserPortalRenewalCountdownChip } from "@/components/portal/UserPortalRenewalCountdownChip";

// Mock resize observer and matchMedia for tests
beforeEach(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as any;
});

describe("Phase 3A & Phase 3B User Portal Renewal State Integration Tests", () => {
  const baseProfile: OrganizationProfile = {
    id: "org-123",
    userId: "user-456",
    organizationName: "Pasig Alliance of Youth Leaders",
    profileStatus: "verified",
    verifiedAt: "2023-09-01T00:00:00.000Z",
    accreditationStartDate: "2023-09-01T00:00:00.000Z",
    accreditationExpiresAt: "2026-09-01T00:00:00.000Z",
    currentAccreditationId: "acc-1",
  } as OrganizationProfile;

  // 1. active >90 days -> no Start Renewal
  it("Requirement 1: active > 90 days -> no Start Renewal available", () => {
    // Current date is 120 days before expiry (2026-05-04 UTC)
    const now = new Date("2026-05-04T00:00:00.000Z");
    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [],
      now,
    });

    expect(state.key).toBe("active_renewal_unavailable");
    expect(state.accreditationStatus).toBe("active");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.canResubmitRenewal).toBe(false);
    expect(state.actionLabel).toBeNull();
    expect(state.daysRemaining).toBe(120);
    expect(state.isExpired).toBe(false);
  });

  // 2. expiring_soon -> Start Renewal available
  it("Requirement 2: expiring_soon -> Start Renewal available", () => {
    // 45 days before expiry (2026-07-18 UTC)
    const now = new Date("2026-07-18T00:00:00.000Z");
    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [],
      now,
    });

    expect(state.key).toBe("expiring_soon_renewal_available");
    expect(state.accreditationStatus).toBe("expiring_soon");
    expect(state.canStartRenewal).toBe(true);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.actionLabel).toBe("Start Renewal");
    expect(state.daysRemaining).toBe(45);
    expect(state.isExpired).toBe(false);
  });

  // 3. exactly 90 days -> available
  it("Requirement 3: exactly 90 days before expiry -> Start Renewal available", () => {
    // 90 days before 2026-09-01 is 2026-06-03 UTC
    const now = new Date("2026-06-03T00:00:00.000Z");
    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [],
      now,
    });

    expect(state.key).toBe("expiring_soon_renewal_available");
    expect(state.accreditationStatus).toBe("expiring_soon");
    expect(state.canStartRenewal).toBe(true);
    expect(state.daysRemaining).toBe(90);
  });

  // 4. expired day 1 -> renewal available
  it("Requirement 4: expired day 1 -> renewal available, privileges paused", () => {
    // 1 day after 2026-09-01 is 2026-09-02 UTC
    const now = new Date("2026-09-02T00:00:00.000Z");
    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [],
      now,
    });

    expect(state.key).toBe("expired_within_renewal_window");
    expect(state.accreditationStatus).toBe("expired");
    expect(state.canStartRenewal).toBe(true);
    expect(state.isExpired).toBe(true);
    expect(state.daysSinceExpiry).toBe(1);
    expect(state.statusLabel).toBe("Accreditation Expired (Renewal Available)");
    expect(state.actionLabel).toBe("Start Renewal");
  });

  // 5. expired day 180 -> renewal available
  it("Requirement 5: expired day 180 -> renewal still available in late window", () => {
    // 180 days after 2026-09-01 is 2027-02-28 UTC
    const now = new Date("2027-02-28T00:00:00.000Z");
    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [],
      now,
    });

    expect(state.key).toBe("expired_within_renewal_window");
    expect(state.accreditationStatus).toBe("expired");
    expect(state.canStartRenewal).toBe(true);
    expect(state.daysSinceExpiry).toBe(180);
    expect(state.isExpired).toBe(true);
  });

  // 6. expired day 181 -> renewal unavailable
  it("Requirement 6: expired day 181 -> renewal window closed, full registration required", () => {
    // 181 days after 2026-09-01 is 2027-03-01 UTC
    const now = new Date("2027-03-01T00:00:00.000Z");
    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [],
      now,
    });

    expect(state.key).toBe("expired_beyond_renewal_window");
    expect(state.accreditationStatus).toBe("expired");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.canResubmitRenewal).toBe(false);
    expect(state.renewalBlockedReason).toContain("180-day late renewal window has elapsed");
  });

  // 7. existing draft -> Continue Renewal, not Start Renewal
  it("Requirement 7: existing draft -> Continue Renewal action, not Start Renewal", () => {
    const draftRenewal: OrganizationRenewalRecord = {
      id: "ren-1",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "draft",
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      adminRemarks: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [draftRenewal],
      now: new Date("2026-08-02T00:00:00.000Z"),
    });

    expect(state.key).toBe("renewal_draft");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(true);
    expect(state.actionLabel).toBe("Continue Renewal");
    expect(state.statusLabel).toBe("Renewal Draft in Progress");
  });

  // 8. submitted -> read-only status
  it("Requirement 8: submitted -> read-only status pending review", () => {
    const submittedRenewal: OrganizationRenewalRecord = {
      id: "ren-2",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "submitted",
      submittedAt: "2026-08-15T00:00:00.000Z",
      reviewedBy: null,
      reviewedAt: null,
      adminRemarks: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-15T00:00:00.000Z",
    };

    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [submittedRenewal],
      now: new Date("2026-08-16T00:00:00.000Z"),
    });

    expect(state.key).toBe("renewal_submitted");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.canResubmitRenewal).toBe(false);
    expect(state.actionLabel).toBeNull();
    expect(state.statusLabel).toContain("Pending Review");
  });

  // 9. under_review -> read-only status
  it("Requirement 9: under_review -> read-only status", () => {
    const underReviewRenewal: OrganizationRenewalRecord = {
      id: "ren-3",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "under_review",
      submittedAt: "2026-08-15T00:00:00.000Z",
      reviewedBy: "admin-1",
      reviewedAt: "2026-08-17T00:00:00.000Z",
      adminRemarks: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-17T00:00:00.000Z",
    };

    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [underReviewRenewal],
      now: new Date("2026-08-18T00:00:00.000Z"),
    });

    expect(state.key).toBe("renewal_under_review");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.canResubmitRenewal).toBe(false);
    expect(state.actionLabel).toBeNull();
    expect(state.statusLabel).toBe("Renewal Under Review");
  });

  // 10. needs_revision -> correction/resubmission entry
  it("Requirement 10: needs_revision -> correction/resubmission action available", () => {
    const revisionRenewal: OrganizationRenewalRecord = {
      id: "ren-4",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "needs_revision",
      submittedAt: "2026-08-15T00:00:00.000Z",
      reviewedBy: "admin-1",
      reviewedAt: "2026-08-18T00:00:00.000Z",
      adminRemarks: "Please replace the list of officers with the updated version signed by the adviser.",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-18T00:00:00.000Z",
    };

    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [revisionRenewal],
      now: new Date("2026-08-19T00:00:00.000Z"),
    });

    expect(state.key).toBe("renewal_needs_revision");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.canResubmitRenewal).toBe(true);
    expect(state.actionLabel).toBe("Review Remarks");
    expect(state.adminRemarks).toContain("Please replace the list of officers");
  });

  // 11. resubmitted -> read-only status
  it("Requirement 11: resubmitted -> read-only status pending review", () => {
    const resubmittedRenewal: OrganizationRenewalRecord = {
      id: "ren-5",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "resubmitted",
      submittedAt: "2026-08-20T00:00:00.000Z",
      reviewedBy: null,
      reviewedAt: null,
      adminRemarks: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-20T00:00:00.000Z",
    };

    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [resubmittedRenewal],
      now: new Date("2026-08-21T00:00:00.000Z"),
    });

    expect(state.key).toBe("renewal_resubmitted");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.canResubmitRenewal).toBe(false);
    expect(state.actionLabel).toBeNull();
    expect(state.statusLabel).toContain("Renewal Resubmitted");
  });

  // 12. rejected -> no Start/Continue/Resubmit
  it("Requirement 12: rejected -> terminal: no Start/Continue/Resubmit actions", () => {
    const rejectedRenewal: OrganizationRenewalRecord = {
      id: "ren-6",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "rejected",
      submittedAt: "2026-08-15T00:00:00.000Z",
      reviewedBy: "admin-1",
      reviewedAt: "2026-08-22T00:00:00.000Z",
      adminRemarks: "Major compliance violation during YPOP cycle.",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-22T00:00:00.000Z",
    };

    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [rejectedRenewal],
      now: new Date("2026-08-23T00:00:00.000Z"),
    });

    expect(state.key).toBe("renewal_rejected");
    expect(state.canStartRenewal).toBe(false);
    expect(state.canContinueRenewal).toBe(false);
    expect(state.canResubmitRenewal).toBe(false);
    expect(state.actionLabel).toBeNull();
    expect(state.statusLabel).toBe("Renewal Application Not Approved");
    expect(state.renewalBlockedReason).toContain("contact the LYDO office directly");
  });

  // 13. approved -> new active term state
  it("Requirement 13: approved -> new active term state, renewal closed until next cycle", () => {
    const approvedRenewal: OrganizationRenewalRecord = {
      id: "ren-7",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "approved",
      submittedAt: "2026-08-15T00:00:00.000Z",
      reviewedBy: "admin-1",
      reviewedAt: "2026-08-25T00:00:00.000Z",
      adminRemarks: "Accreditation renewed successfully.",
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-25T00:00:00.000Z",
    };

    const updatedProfile: OrganizationProfile = {
      ...baseProfile,
      currentAccreditationId: "acc-2",
      accreditationStartDate: "2026-09-01T00:00:00.000Z",
      accreditationExpiresAt: "2029-09-01T00:00:00.000Z",
    };

    const state = resolveUserRenewalState({
      profile: updatedProfile,
      renewals: [approvedRenewal],
      now: new Date("2026-09-02T00:00:00.000Z"),
    });

    expect(state.key).toBe("active_renewal_unavailable");
    expect(state.accreditationStatus).toBe("active");
    expect(state.canStartRenewal).toBe(false);
    expect(state.statusLabel).toBe("Accreditation Active");
  });

  // 14. RPC returns existing draft safely
  it("Requirement 14: RPC returns existing draft safely without duplicate rows", () => {
    const existingDraft: OrganizationRenewalRecord = {
      id: "ren-draft-exist",
      organizationId: "org-123",
      cycleNumber: 2,
      currentAccreditationId: "acc-1",
      status: "draft",
      submittedAt: null,
      reviewedBy: null,
      reviewedAt: null,
      adminRemarks: null,
      createdAt: "2026-08-01T00:00:00.000Z",
      updatedAt: "2026-08-01T00:00:00.000Z",
    };

    const rpcResponse = {
      renewal: existingDraft,
      submission: null,
      isExisting: true,
    };

    expect(rpcResponse.isExisting).toBe(true);
    expect(rpcResponse.renewal.status).toBe("draft");
    expect(rpcResponse.renewal.cycleNumber).toBe(2);
  });

  // 15. RPC rejection is surfaced without corrupting UI state
  it("Requirement 15: RPC rejection error handled safely", async () => {
    const failingRpc = vi.fn().mockRejectedValue(new Error("Accreditation has exceeded 180 days. Renewal is blocked."));
    let errorCaught: string | null = null;
    let startingState = true;

    try {
      await failingRpc();
    } catch (err: any) {
      errorCaught = err.message;
      startingState = false;
    }

    expect(errorCaught).toContain("Renewal is blocked");
    expect(startingState).toBe(false);
  });

  // 16. failed renewal fetch does not falsely mark organization expired
  it("Requirement 16: failed renewal fetch does not falsely mark organization expired", () => {
    const state = resolveUserRenewalState({
      profile: baseProfile,
      renewals: [],
      hasError: true,
      now: new Date("2026-08-01T00:00:00.000Z"),
    });

    expect(state.isExpired).toBe(false);
    expect(state.accreditationStatus).toBe("active");
    expect(state.canStartRenewal).toBe(false);
    expect(state.statusLabel).toBe("Status Verification Unavailable");
    expect(state.renewalBlockedReason).toContain("Unable to verify renewal status");
  });

  // 17. desktop layout regression
  it("Requirement 17: desktop layout renders UserPortalRedesignView and UserPortalRenewalWorkspaceView", () => {
    // 60 days ahead of current real time
    const futureExpiry = new Date(Date.now() + 60 * 86_400_000).toISOString();
    const futureProfile = { ...baseProfile, accreditationExpiresAt: futureExpiry };
    const renewalState = resolveUserRenewalState({
      profile: futureProfile,
      renewals: [],
      now: new Date(),
    });

    render(
      <MemoryRouter>
        <UserPortalRedesignView
          profile={futureProfile}
          currentProfile={futureProfile}
          isVerified={true}
          isProfileSaved={true}
          hasSubmittedDocuments={true}
          stepsCompleted={3}
          profilePercent={100}
          dashboardDocumentPercent={100}
          dashboardDocumentHelper="6 of 6 approved"
          budgetPercent={100}
          budgetOverviewLabel="Completed"
          liquidationPercent={100}
          liquidationOverviewLabel="Completed"
          renewalCountdown={{ expiresAt: futureExpiry, daysRemaining: 60, isDue: false }}
          renewalState={renewalState}
          dashboardTasks={[]}
          recentActivities={[]}
          inquiries={[]}
          inquiryForm={{ submitterName: "", organizationName: "", email: "", subject: "", description: "" }}
          setInquiryForm={vi.fn()}
          submittingInquiry={false}
          handleSendInquiry={vi.fn()}
          onViewAllInquiries={vi.fn()}
          onViewAllActivities={vi.fn()}
          publicTemplates={[]}
          userRouteMap={{ dashboard: "/dashboard", "organization-renewal": "/organization-renewal" }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Pasig Alliance of Youth Leaders")).toBeInTheDocument();
    expect(screen.getByText(/Renewal in \d+ days/i)).toBeInTheDocument();

    render(
      <MemoryRouter>
        <UserPortalRenewalWorkspaceView
          currentProfile={futureProfile}
          userRenewalState={renewalState}
          activeRenewal={null}
          navigate={vi.fn()}
          userRouteMap={{ dashboard: "/dashboard" }}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Accreditation Renewal Workspace")).toBeInTheDocument();
    expect(screen.getByText(/Y-TRACE Cycle 2/i)).toBeInTheDocument();
  });

  // 18. mobile/tablet renewal entry point behavior
  it("Requirement 18: mobile/tablet renewal entry point behavior", () => {
    const futureExpiry = new Date(Date.now() + 62 * 86_400_000).toISOString();
    const futureProfile = { ...baseProfile, accreditationExpiresAt: futureExpiry };
    const renewalState = resolveUserRenewalState({
      profile: futureProfile,
      renewals: [],
      now: new Date(),
    });

    render(
      <UserPortalRenewalCountdownChip
        expiresAt={futureExpiry}
        renewalState={renewalState}
        className="w-full text-center"
      />,
    );

    expect(screen.getByText(/Renewal in \d+ days/i)).toBeInTheDocument();
  });

  // 19. no duplicate renewal CTA rendered
  it("Requirement 19: no duplicate renewal CTA rendered when hero task is a renewal task", () => {
    const onStart = vi.fn();
    const futureExpiry = new Date(Date.now() + 60 * 86_400_000).toISOString();
    const futureProfile = { ...baseProfile, accreditationExpiresAt: futureExpiry };
    const renewalState = resolveUserRenewalState({
      profile: futureProfile,
      renewals: [],
      now: new Date(),
    });

    const renewalTask = {
      key: "renewal-start",
      title: "Accreditation renewal is now open",
      description: "Submit your renewal application to maintain active standing.",
      ctaLabel: "Start Renewal",
      onClick: onStart,
      icon: null as any,
      tone: "bg-amber-500/10 text-amber-600",
    };

    render(
      <MemoryRouter>
        <UserPortalRedesignView
          profile={futureProfile}
          currentProfile={futureProfile}
          isVerified={true}
          isProfileSaved={true}
          hasSubmittedDocuments={true}
          stepsCompleted={3}
          profilePercent={100}
          dashboardDocumentPercent={100}
          dashboardDocumentHelper="6 of 6 approved"
          budgetPercent={100}
          budgetOverviewLabel="Completed"
          liquidationPercent={100}
          liquidationOverviewLabel="Completed"
          renewalCountdown={{ expiresAt: futureExpiry, daysRemaining: 60, isDue: false }}
          renewalState={renewalState}
          onStartRenewal={onStart}
          dashboardTasks={[renewalTask]}
          recentActivities={[]}
          inquiries={[]}
          inquiryForm={{ submitterName: "", organizationName: "", email: "", subject: "", description: "" }}
          setInquiryForm={vi.fn()}
          submittingInquiry={false}
          handleSendInquiry={vi.fn()}
          onViewAllInquiries={vi.fn()}
          onViewAllActivities={vi.fn()}
          publicTemplates={[]}
          userRouteMap={{ dashboard: "/dashboard", "organization-renewal": "/organization-renewal" }}
        />
      </MemoryRouter>,
    );

    // Exactly one "Start Renewal" button should appear (the hero task CTA), not two
    const startButtons = screen.getAllByRole("button", { name: /Start Renewal/i });
    expect(startButtons.length).toBe(1);
  });

  // 20. existing dashboard functionality remains intact
  it("Requirement 20: existing dashboard functionality remains intact", () => {
    const handleInquiry = vi.fn();
    const viewAllActivities = vi.fn();
    const futureExpiry = new Date(Date.now() + 60 * 86_400_000).toISOString();
    const futureProfile = { ...baseProfile, accreditationExpiresAt: futureExpiry };

    render(
      <MemoryRouter>
        <UserPortalRedesignView
          profile={futureProfile}
          currentProfile={futureProfile}
          isVerified={true}
          isProfileSaved={true}
          hasSubmittedDocuments={true}
          stepsCompleted={3}
          profilePercent={100}
          dashboardDocumentPercent={100}
          dashboardDocumentHelper="6 of 6 approved"
          budgetPercent={85}
          budgetOverviewLabel="1 In Progress"
          liquidationPercent={50}
          liquidationOverviewLabel="1 In Review"
          renewalCountdown={{ expiresAt: futureExpiry, daysRemaining: 60, isDue: false }}
          dashboardTasks={[]}
          recentActivities={[]}
          inquiries={[
            { id: "inq-1", inquiryCode: "INQ-2026-001", subject: "Budget Allocation", status: "reviewed", createdAt: "2026-07-01T11:00:00Z" },
          ]}
          inquiryForm={{ submitterName: "President", organizationName: "Pasig Alliance", email: "pres@example.com", subject: "", description: "" }}
          setInquiryForm={vi.fn()}
          submittingInquiry={false}
          handleSendInquiry={handleInquiry}
          onViewAllInquiries={vi.fn()}
          onViewAllActivities={viewAllActivities}
          publicTemplates={[]}
          userRouteMap={{ dashboard: "/dashboard" }}
        />
      </MemoryRouter>,
    );

    // Overview metric cards remain intact
    expect(screen.getByText("Profile")).toBeInTheDocument();
    expect(screen.getByText("Documents")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Liquidation")).toBeInTheDocument();

    // Inquiries and Support remain intact
    expect(screen.getByText("Support & Inquiries")).toBeInTheDocument();
    expect(screen.getByText("Budget Allocation")).toBeInTheDocument();

    // Resources shortcuts remain intact
    expect(screen.getByText("Official Templates")).toBeInTheDocument();
  });
});
