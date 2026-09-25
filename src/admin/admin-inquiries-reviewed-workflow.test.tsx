import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { InquiriesTable } from "@/admin/components/InquiriesTable";
import { InquiryDetailDrawer } from "@/admin/components/InquiryDetailDrawer";
import { ReplyEmailDialog } from "@/admin/components/ReplyEmailDialog";
import AdminPortal from "@/admin/AdminPortal";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import { MemoryRouter } from "react-router-dom";
import type { InquiryRecord } from "@/lib/lydo-connect-data";

// Mock auth hook
vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({
    isAuthenticated: true,
    isInitialized: true,
    isPasswordRecoverySession: false,
    role: "admin",
    user: {
      id: "admin-1",
      email: "admin@pasig.gov.ph",
      displayName: "Pasig Admin",
      roleCode: "super_admin",
      permissionCodes: ["inquiries_management"],
    },
    signOut: vi.fn(),
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock admin-auth session reading
vi.mock("@/lib/admin-auth", () => ({
  ADMIN_SESSION_STORAGE_KEY: "lydo_admin_session_v1",
  ADMIN_SESSION_CHANGE_EVENT: "lydo-admin-session-change",
  readAdminSession: () => ({
    id: "admin-1",
    username: "superadmin",
    email: "admin@pasig.gov.ph",
    displayName: "Super Admin",
    sessionToken: "valid-admin-session-token-12345",
    expiresAt: new Date(Date.now() + 86400000).toISOString(),
    roleCode: "super_admin",
    permissionCodes: ["inquiries_management"],
  }),
  writeAdminSession: vi.fn(),
}));

const mockPendingInquiry: InquiryRecord = {
  id: "inq-pending-1",
  organizationId: "org-1",
  organizationName: "Pasig Youth Council",
  submitterName: "Juan Dela Cruz",
  email: "juan@pasigyouth.org",
  subject: "Inquiry Regarding YPOP Guidelines",
  description: "Can we submit additional documents after the initial deadline?",
  status: "pending_review",
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-20T10:00:00.000Z",
};

const mockReviewedInquiry: InquiryRecord = {
  id: "inq-reviewed-1",
  organizationId: "org-2",
  organizationName: "San Joaquin Youth Alliance",
  submitterName: "Maria Santos",
  email: "maria@sjya.org",
  subject: "Accreditation Renewal Query",
  description: "Where do we upload the notarized list of officers?",
  status: "reviewed",
  createdAt: "2026-09-18T14:00:00.000Z",
  updatedAt: "2026-09-19T09:00:00.000Z",
  adminRemarks: "Advised to upload via the Accreditation Renewal workspace.",
};

const mockClosedInquiry: InquiryRecord = {
  id: "inq-closed-1",
  organizationId: "org-3",
  organizationName: "Pinagbuhatan Leaders",
  submitterName: "Pedro Reyes",
  email: "pedro@leaders.org",
  subject: "General Budget Question",
  description: "Resolved on-site during office consultation.",
  status: "closed",
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-16T11:00:00.000Z",
};

describe("Admin Inquiries Workflow — Reviewed Terminology and Action Availability", { timeout: 30000 }, () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("TEST 1: InquiriesTable renders StatusPill as 'Reviewed' (and never 'Responded')", () => {
    render(
      <InquiriesTable
        inquiries={[mockPendingInquiry, mockReviewedInquiry, mockClosedInquiry]}
        getReferenceCode={(inq) => `INQ-${inq.id}`}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onSelectInquiry={vi.fn()}
        onMarkReviewed={vi.fn()}
      />
    );

    expect(screen.getAllByText("Pending Review").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Reviewed").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Closed").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Responded")).not.toBeInTheDocument();
    expect(screen.queryByText("Mark as Responded")).not.toBeInTheDocument();
  });

  it("TEST 2: Reviewed inquiry does NOT display 'Reply via Email' button in table row", () => {
    render(
      <InquiriesTable
        inquiries={[mockReviewedInquiry]}
        getReferenceCode={(inq) => `INQ-${inq.id}`}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onSelectInquiry={vi.fn()}
        onMarkReviewed={vi.fn()}
      />
    );

    expect(screen.getByText("Accreditation Renewal Query")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Reply via Email/i })).not.toBeInTheDocument();
  });

  it("TEST 3: Pending inquiry displays 'Reply via Email' button in table row", () => {
    render(
      <InquiriesTable
        inquiries={[mockPendingInquiry]}
        getReferenceCode={(inq) => `INQ-${inq.id}`}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onSelectInquiry={vi.fn()}
        onMarkReviewed={vi.fn()}
      />
    );

    expect(screen.getByText("Inquiry Regarding YPOP Guidelines")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Reply via Email/i })).toBeInTheDocument();
  });

  it("TEST 4: ReplyEmailDialog renders 'Open Email & Mark as Reviewed' and 'Mark as Reviewed'", () => {
    const onMarkReviewedMock = vi.fn();
    render(
      <ReplyEmailDialog
        open={true}
        onOpenChange={vi.fn()}
        email="juan@pasigyouth.org"
        subject="Inquiry Regarding YPOP Guidelines"
        organizationName="Pasig Youth Council"
        onMarkReviewed={onMarkReviewedMock}
        inquiryStatus="pending_review"
      />
    );

    expect(screen.getByRole("button", { name: /Open Email & Mark as Reviewed/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Mark as Reviewed$/i })).toBeInTheDocument();
    expect(screen.queryByText(/Mark as Responded/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Mark as Reviewed$/i }));
    expect(onMarkReviewedMock).toHaveBeenCalledTimes(1);
  });

  it("TEST 5: ReplyEmailDialog guards against already-reviewed inquiry", () => {
    const onMarkReviewedMock = vi.fn();
    render(
      <ReplyEmailDialog
        open={true}
        onOpenChange={vi.fn()}
        email="maria@sjya.org"
        subject="Accreditation Renewal Query"
        organizationName="San Joaquin Youth Alliance"
        onMarkReviewed={onMarkReviewedMock}
        inquiryStatus="reviewed"
      />
    );

    expect(
      screen.getByText(/This inquiry has already been marked as Reviewed/i)
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Open Email & Mark as Reviewed/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Mark as Reviewed$/i })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Close/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("TEST 6: Status tabs in InquiriesTable contain All Status, Pending Review, Reviewed, Closed and NO Responded tab", () => {
    render(
      <InquiriesTable
        inquiries={[]}
        getReferenceCode={(inq) => `INQ-${inq.id}`}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onSelectInquiry={vi.fn()}
        onMarkReviewed={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "All Status" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pending Review" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reviewed" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Closed" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Responded/i })).not.toBeInTheDocument();
  });

  it("TEST 7: AdminPortal dashboard renders StatsCard 'REVIEWED' instead of 'RESPONDED'", () => {
    const statePayload = {
      inquiries: [mockPendingInquiry, mockReviewedInquiry, mockClosedInquiry],
    };

    render(
      <MemoryRouter initialEntries={["/admin/inquiries"]}>
        <LydoConnectProvider initialState={statePayload as any}>
          <AdminPortal section="inquiries" />
        </LydoConnectProvider>
      </MemoryRouter>
    );

    expect(screen.getByText("TOTAL INQUIRIES")).toBeInTheDocument();
    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(screen.getByText("REVIEWED")).toBeInTheDocument();
    expect(screen.getByText("CLOSED")).toBeInTheDocument();
    expect(screen.queryByText("RESPONDED")).not.toBeInTheDocument();
  });

  it("TEST 8: Reply via Email opens external compose URL with encoded recipient and subject", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    const onMarkReviewedMock = vi.fn();

    render(
      <ReplyEmailDialog
        open={true}
        onOpenChange={vi.fn()}
        email="juan@pasigyouth.org"
        subject="Inquiry Regarding YPOP Guidelines"
        organizationName="Pasig Youth Council"
        onMarkReviewed={onMarkReviewedMock}
        inquiryStatus="pending_review"
      />
    );

    const openEmailBtn = screen.getByRole("button", { name: /Open Email & Mark as Reviewed/i });
    fireEvent.click(openEmailBtn);

    expect(openSpy).toHaveBeenCalledWith(
      expect.stringContaining("https://mail.google.com/mail/?view=cm&fs=1&to=juan%40pasigyouth.org&su=Re%3A%20Inquiry%20Regarding%20YPOP%20Guidelines"),
      "_blank",
      "noopener,noreferrer"
    );
    expect(onMarkReviewedMock).toHaveBeenCalledTimes(1);
    openSpy.mockRestore();
  });

  it("TEST 9: Delete inquiry button remains visible and callable for both pending and reviewed inquiries", () => {
    const onDeleteMock = vi.fn();
    render(
      <InquiriesTable
        inquiries={[mockPendingInquiry, mockReviewedInquiry]}
        getReferenceCode={(inq) => `INQ-${inq.id}`}
        searchValue=""
        onSearchChange={vi.fn()}
        statusFilter="all"
        onStatusFilterChange={vi.fn()}
        onSelectInquiry={vi.fn()}
        onMarkReviewed={vi.fn()}
        onDeleteInquiry={onDeleteMock}
      />
    );

    const deleteButtons = screen.getAllByRole("button", { name: /Delete Inquiry/i });
    expect(deleteButtons.length).toBe(2);

    fireEvent.click(deleteButtons[1]); // Click delete on reviewed inquiry
    expect(onDeleteMock).toHaveBeenCalledWith(mockReviewedInquiry);
  });

  it("TEST 10: InquiryDetailDrawer hides ReplyEmailButton for Reviewed inquiries and shows it for Pending", () => {
    const onReplyEmailMock = vi.fn();

    // 1. Render drawer for Reviewed inquiry
    const { rerender } = render(
      <InquiryDetailDrawer
        inquiry={mockReviewedInquiry}
        referenceCode="INQ-002"
        onOpenChange={vi.fn()}
        onUpdateStatus={vi.fn()}
        onReplyEmail={onReplyEmailMock}
        onDeleteInquiry={vi.fn()}
        saving={false}
      />
    );

    expect(screen.queryByRole("button", { name: /Reply via Email/i })).not.toBeInTheDocument();

    // 2. Rerender drawer for Pending inquiry
    rerender(
      <InquiryDetailDrawer
        inquiry={mockPendingInquiry}
        referenceCode="INQ-001"
        onOpenChange={vi.fn()}
        onUpdateStatus={vi.fn()}
        onReplyEmail={onReplyEmailMock}
        onDeleteInquiry={vi.fn()}
        saving={false}
      />
    );

    const replyBtn = screen.getByRole("button", { name: /Reply via Email/i });
    expect(replyBtn).toBeInTheDocument();
    fireEvent.click(replyBtn);
    expect(onReplyEmailMock).toHaveBeenCalledTimes(1);
  });
});
