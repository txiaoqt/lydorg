import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPortal from "./AdminPortal";
import { LydoConnectProvider } from "@/lib/lydo-connect-store";
import * as lydoSupabase from "@/lib/lydo-connect-supabase";
import { supabase } from "@/lib/supabase";
import type { YPOPEntry, YPOPPeriod, YPOPEventParticipation, OrganizationProfile, YPOPCityActivity, YPOPEventFile } from "@/types";

// Mock supabase
vi.mock("@/lib/supabase", () => {
  const createQueryBuilder = () => {
    const builder: any = {
      select: vi.fn().mockImplementation(() => builder),
      insert: vi.fn().mockImplementation(() => builder),
      update: vi.fn().mockImplementation(() => builder),
      delete: vi.fn().mockImplementation(() => builder),
      eq: vi.fn().mockImplementation(() => builder),
      in: vi.fn().mockImplementation(() => builder),
      order: vi.fn().mockImplementation(() => builder),
      limit: vi.fn().mockImplementation(() => builder),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: (resolve: any, reject: any) => Promise.resolve({ data: [], error: null }).then(resolve, reject),
    };
    return builder;
  };

  const rpcMock = vi.fn().mockResolvedValue({ data: [], error: null });
  const fromMock = vi.fn().mockImplementation(() => createQueryBuilder());
  return {
    supabase: {
      rpc: rpcMock,
      from: fromMock,
      auth: {
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } },
        }),
        getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      },
    },
    isSupabaseConfigured: () => true,
  };
});

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
      permissionCodes: ["ypop_validation_review", "budget_requests_review"],
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
    permissionCodes: ["ypop_validation_review"],
  }),
  writeAdminSession: vi.fn(),
}));

// Mock lydo-connect-supabase state loaders
vi.mock("@/lib/lydo-connect-supabase", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/lydo-connect-supabase")>();
  return {
    ...actual,
    loadAdminYpopState: vi.fn().mockImplementation(() =>
      Promise.resolve({
        ypopPeriods: [
          {
            id: "period-1",
            semesterKey: "2026-S1",
            semesterLabel: "First Semester 2026",
            status: "open",
            validationDeadline: "2026-10-01T00:00:00Z",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
            orgLedTiers: [],
          },
        ],
        ypopEntries: [
          {
            id: "entry-test-1",
            organizationId: "org-test-1",
            semester: "2026-S1",
            semesterLabel: "First Semester 2026",
            status: "under_review",
            pointsEarned: 20,
            pointsRequired: 70,
            totalPoints: 100,
            adminRemarks: "",
            submissionNote: "",
            validationDeadline: "2026-10-01T00:00:00Z",
            submittedAt: "2026-09-20T00:00:00Z",
            validatedAt: "",
            revisionHistory: [],
            orgLedProjectCount: 0,
            cityLedAttendance: [],
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-09-20T00:00:00Z",
          },
        ],
        ypopCityActivities: [
          {
            id: "city-act-1",
            semesterKey: "2026-S1",
            name: "Barangay Youth Leadership Summit",
            title: "Barangay Youth Leadership Summit",
            date: "2026-09-15T09:00:00Z",
            startDate: "2026-09-15T09:00:00Z",
            endDate: "2026-09-15T17:00:00Z",
            venue: "Pasig City Hall",
            points: 10,
            category: "mandatory",
          },
          {
            id: "city-act-2",
            semesterKey: "2026-S1",
            name: "Pasig Tree Planting Drive",
            title: "Pasig Tree Planting Drive",
            date: "2026-09-18T08:00:00Z",
            startDate: "2026-09-18T08:00:00Z",
            endDate: "2026-09-18T12:00:00Z",
            venue: "Rainforest Park",
            points: 10,
            category: "mandatory",
          },
        ],
        ypopEventParticipations: [
          {
            id: "part-act-1",
            organizationId: "org-test-1",
            activityId: "city-act-1",
            activityName: "Barangay Youth Leadership Summit",
            status: "pending_verification",
            proofSubmittedAt: "2026-09-20T10:00:00Z",
          },
          {
            id: "part-act-2",
            organizationId: "org-test-1",
            activityId: "city-act-2",
            activityName: "Pasig Tree Planting Drive",
            status: "pending_verification",
            proofSubmittedAt: "2026-09-20T11:00:00Z",
          },
        ],
        ypopEventFiles: [
          {
            id: "f-1",
            participationId: "part-act-1",
            organizationId: "org-test-1",
            fileName: "summit_attendance.pdf",
            fileUrl: "storage://ypop-proofs/part-act-1/summit_attendance.pdf",
            uploadedAt: "2026-09-20T10:00:00Z",
          },
          {
            id: "f-2",
            participationId: "part-act-2",
            organizationId: "org-test-1",
            fileName: "tree_planting_photos.pdf",
            fileUrl: "storage://ypop-proofs/part-act-2/tree_planting_photos.pdf",
            uploadedAt: "2026-09-20T11:00:00Z",
          },
        ],
        ypopOrgActivities: [],
        ypopOrgActivityFiles: [],
        organizationProfiles: [
          {
            id: "org-test-1",
            organizationName: "Pasig Youth Council",
            referenceId: "PYC-2026",
            majorClassification: "YOUTH_SERVING",
            email: "pyc@pasig.gov.ph",
            status: "verified",
            registrationStatus: "verified",
            accreditationStatus: "accredited",
            complianceStatus: "compliant",
          },
        ],
      })
    ),
    loadAdminPortalSnapshotState: vi.fn().mockImplementation(() =>
      Promise.resolve(null)
    ),
    loadAdminPortalSupabaseState: vi.fn().mockImplementation(() =>
      Promise.resolve({
        ypopPeriods: [
          {
            id: "period-1",
            semesterKey: "2026-S1",
            semesterLabel: "First Semester 2026",
            status: "open",
            validationDeadline: "2026-10-01T00:00:00Z",
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-01-01T00:00:00Z",
            orgLedTiers: [],
          },
        ],
        ypopEntries: [
          {
            id: "entry-test-1",
            organizationId: "org-test-1",
            semester: "2026-S1",
            semesterLabel: "First Semester 2026",
            status: "under_review",
            pointsEarned: 20,
            pointsRequired: 70,
            totalPoints: 100,
            adminRemarks: "",
            submissionNote: "",
            validationDeadline: "2026-10-01T00:00:00Z",
            submittedAt: "2026-09-20T00:00:00Z",
            validatedAt: "",
            revisionHistory: [],
            orgLedProjectCount: 0,
            cityLedAttendance: [],
            createdAt: "2026-01-01T00:00:00Z",
            updatedAt: "2026-09-20T00:00:00Z",
          },
        ],
        ypopCityActivities: [
          {
            id: "city-act-1",
            semesterKey: "2026-S1",
            name: "Barangay Youth Leadership Summit",
            title: "Barangay Youth Leadership Summit",
            date: "2026-09-15T09:00:00Z",
            startDate: "2026-09-15T09:00:00Z",
            endDate: "2026-09-15T17:00:00Z",
            venue: "Pasig City Hall",
            points: 10,
            category: "mandatory",
          },
          {
            id: "city-act-2",
            semesterKey: "2026-S1",
            name: "Pasig Tree Planting Drive",
            title: "Pasig Tree Planting Drive",
            date: "2026-09-18T08:00:00Z",
            startDate: "2026-09-18T08:00:00Z",
            endDate: "2026-09-18T12:00:00Z",
            venue: "Rainforest Park",
            points: 10,
            category: "mandatory",
          },
        ],
        ypopEventParticipations: [
          {
            id: "part-act-1",
            organizationId: "org-test-1",
            activityId: "city-act-1",
            activityName: "Barangay Youth Leadership Summit",
            status: "pending_verification",
            proofSubmittedAt: "2026-09-20T10:00:00Z",
          },
          {
            id: "part-act-2",
            organizationId: "org-test-1",
            activityId: "city-act-2",
            activityName: "Pasig Tree Planting Drive",
            status: "pending_verification",
            proofSubmittedAt: "2026-09-20T11:00:00Z",
          },
        ],
        ypopEventFiles: [
          {
            id: "f-1",
            participationId: "part-act-1",
            organizationId: "org-test-1",
            fileName: "summit_attendance.pdf",
            fileUrl: "storage://ypop-proofs/part-act-1/summit_attendance.pdf",
            uploadedAt: "2026-09-20T10:00:00Z",
          },
          {
            id: "f-2",
            participationId: "part-act-2",
            organizationId: "org-test-1",
            fileName: "tree_planting_photos.pdf",
            fileUrl: "storage://ypop-proofs/part-act-2/tree_planting_photos.pdf",
            uploadedAt: "2026-09-20T11:00:00Z",
          },
        ],
        ypopOrgActivities: [],
        ypopOrgActivityFiles: [],
        organizationProfiles: [
          {
            id: "org-test-1",
            organizationName: "Pasig Youth Council",
            referenceId: "PYC-2026",
            majorClassification: "YOUTH_SERVING",
            email: "pyc@pasig.gov.ph",
            status: "verified",
            registrationStatus: "verified",
            accreditationStatus: "accredited",
            complianceStatus: "compliant",
          },
        ],
        budgetRequests: [],
        budgetRequestFiles: [],
        liquidationReports: [],
        liquidationReportFiles: [],
        documentSubmissions: [],
        documentSubmissionFiles: [],
        activityLogs: [],
        notifications: [],
        inquiries: [],
        templates: [],
        transparencyPosts: [],
      })
    ),
    loadLydoConnectSupabaseState: vi.fn().mockImplementation(() =>
      Promise.resolve(null)
    ),
  };
});

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
  (supabase as any).auth = {
    onAuthStateChange: vi.fn().mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    }),
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
  };
  (supabase as any).rpc = vi.fn().mockResolvedValue({ data: [], error: null });
});

describe("YPOP Admin Review Decision — Single-Item Request Revision & Authoritative Remark Invariant", { timeout: 30000 }, () => {
  // TEST 9 & 9b: Authoritative persistence layer validates non-empty remark on needs_revision
  it("TEST 9: adminUpdateYpopEventParticipationInSupabase rejects needs_revision when remark is empty", async () => {
    await expect(
      lydoSupabase.adminUpdateYpopEventParticipationInSupabase("part-1", {
        status: "needs_revision",
        adminRemarks: "",
      })
    ).rejects.toThrow(/A non-empty admin remark is required when requesting revision/i);

    await expect(
      lydoSupabase.adminUpdateYpopEventParticipationInSupabase("part-1", {
        status: "needs_revision",
        adminRemarks: "   \n\t  ",
      })
    ).rejects.toThrow(/A non-empty admin remark is required when requesting revision/i);

    await expect(
      lydoSupabase.adminUpdateYpopEventParticipationInSupabase("part-1", {
        status: "needs_revision",
      })
    ).rejects.toThrow(/A non-empty admin remark is required when requesting revision/i);
  });

  it("TEST 9b: adminUpdateYpopOrgActivityInSupabase rejects needs_revision when remark is empty", async () => {
    await expect(
      lydoSupabase.adminUpdateYpopOrgActivityInSupabase("org-act-1", {
        status: "needs_revision",
        adminRemarks: "",
      })
    ).rejects.toThrow(/A non-empty admin remark is required when requesting revision/i);

    await expect(
      lydoSupabase.adminUpdateYpopOrgActivityInSupabase("org-act-1", {
        status: "needs_revision",
        adminRemarks: "  \n  ",
      })
    ).rejects.toThrow(/A non-empty admin remark is required when requesting revision/i);
  });

  // TEST 8: Authoritative persistence succeeds with valid remark
  it("TEST 8: adminUpdateYpopEventParticipationInSupabase accepts valid remark and calls supabase rpc", async () => {
    const mockUpdatedPart = {
      id: "part-1",
      organization_id: "org-1",
      activity_id: "city-1",
      activity_name: "Summit",
      activity_date: "2026-09-15",
      venue: "Pasig",
      status: "needs_revision",
      admin_remarks: "Please provide signed attendance sheet with seal.",
      proof_submitted_at: "2026-09-20T00:00:00Z",
      verified_at: null,
      revision_history: [
        {
          action: "needs_revision",
          adminRemarks: "Please provide signed attendance sheet with seal.",
          changedAt: "2026-09-25T00:00:00Z",
        },
      ],
      created_at: "2026-09-15T00:00:00Z",
      updated_at: "2026-09-25T00:00:00Z",
    };

    const rpcSpy = vi.spyOn(supabase, "rpc").mockResolvedValue({
      data: [mockUpdatedPart],
      error: null,
    } as any);

    const res = await lydoSupabase.adminUpdateYpopEventParticipationInSupabase("part-1", {
      status: "needs_revision",
      adminRemarks: "Please provide signed attendance sheet with seal.",
      revisionHistory: mockUpdatedPart.revision_history as any,
    });

    expect(rpcSpy).toHaveBeenCalledWith("admin_update_ypop_event_participation", expect.objectContaining({
      _participation_id: "part-1",
      _status: "needs_revision",
      _admin_remarks: "Please provide signed attendance sheet with seal.",
    }));
    expect(res.status).toBe("needs_revision");
    expect(res.adminRemarks).toBe("Please provide signed attendance sheet with seal.");
  });

  const mockOrg: OrganizationProfile = {
    id: "org-test-1",
    organizationName: "Pasig Youth Council",
    referenceId: "PYC-2026",
    majorClassification: "YOUTH_SERVING",
    email: "pyc@pasig.gov.ph",
  } as any;

  const mockPeriod: YPOPPeriod = {
    id: "period-1",
    semesterKey: "2026-S1",
    semesterLabel: "First Semester 2026",
    status: "open",
    validationDeadline: "2026-10-01T00:00:00Z",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const mockEntry: YPOPEntry = {
    id: "entry-test-1",
    organizationId: "org-test-1",
    semester: "2026-S1",
    semesterLabel: "First Semester 2026",
    status: "under_review",
    pointsEarned: 20,
    pointsRequired: 70,
    totalPoints: 100,
    adminRemarks: "",
    submissionNote: "",
    validationDeadline: "2026-10-01T00:00:00Z",
    submittedAt: "2026-09-20T00:00:00Z",
    validatedAt: "",
    revisionHistory: [],
    orgLedProjectCount: 0,
    cityLedAttendance: [],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-09-20T00:00:00Z",
  };

  const mockCityActivity1: YPOPCityActivity = {
    id: "city-act-1",
    semesterKey: "2026-S1",
    name: "Barangay Youth Leadership Summit",
    title: "Barangay Youth Leadership Summit",
    date: "2026-09-15T09:00:00Z",
    startDate: "2026-09-15T09:00:00Z",
    endDate: "2026-09-15T17:00:00Z",
    venue: "Pasig City Hall",
    points: 10,
    category: "mandatory",
  };

  const mockCityActivity2: YPOPCityActivity = {
    id: "city-act-2",
    semesterKey: "2026-S1",
    name: "Pasig Tree Planting Drive",
    title: "Pasig Tree Planting Drive",
    date: "2026-09-18T08:00:00Z",
    startDate: "2026-09-18T08:00:00Z",
    endDate: "2026-09-18T12:00:00Z",
    venue: "Rainforest Park",
    points: 10,
    category: "mandatory",
  };

  const mockParticipation1: YPOPEventParticipation = {
    id: "part-act-1",
    organizationId: "org-test-1",
    activityId: "city-act-1",
    activityName: mockCityActivity1.name,
    status: "pending_verification",
    proofSubmittedAt: "2026-09-20T10:00:00Z",
  } as any;

  const mockParticipation2: YPOPEventParticipation = {
    id: "part-act-2",
    organizationId: "org-test-1",
    activityId: "city-act-2",
    activityName: mockCityActivity2.name,
    status: "pending_verification",
    proofSubmittedAt: "2026-09-20T11:00:00Z",
  } as any;

  const mockFile1: YPOPEventFile = {
    id: "f-1",
    participationId: "part-act-1",
    organizationId: "org-test-1",
    fileName: "summit_attendance.pdf",
    fileUrl: "storage://ypop-proofs/part-act-1/summit_attendance.pdf",
    uploadedAt: "2026-09-20T10:00:00Z",
  } as any;

  const mockFile2: YPOPEventFile = {
    id: "f-2",
    participationId: "part-act-2",
    organizationId: "org-test-1",
    fileName: "tree_planting_photos.pdf",
    fileUrl: "storage://ypop-proofs/part-act-2/tree_planting_photos.pdf",
    uploadedAt: "2026-09-20T11:00:00Z",
  } as any;

  const setupAdminStore = () => {
    const payload = {
      organizationProfiles: [mockOrg],
      ypopPeriods: [mockPeriod],
      ypopEntries: [mockEntry],
      ypopCityActivities: [mockCityActivity1, mockCityActivity2],
      ypopEventParticipations: [mockParticipation1, mockParticipation2],
      ypopEventFiles: [mockFile1, mockFile2],
      ypopOrgActivities: [],
      ypopOrgActivityFiles: [],
    };
    const stateStr = JSON.stringify(payload);
    window.localStorage.setItem("lydo-connect-state-v1:admin:admin-1", stateStr);
    window.localStorage.setItem("lydo-connect-state-v1:admin:admin-1:valid-admin-session-token-12345", stateStr);
    return payload;
  };

  it("TEST 1 & 7: Single Request Revision with valid remark shows actual remark in confirmation and submits successfully", async () => {
    vi.spyOn(lydoSupabase, "adminUpdateYpopEventParticipationInSupabase").mockResolvedValue({
      ...mockParticipation1,
      status: "needs_revision",
      adminRemarks: "Please upload the signed attendance sheet.",
    } as any);
    vi.spyOn(lydoSupabase, "adminUpdateYpopEntryInSupabase").mockResolvedValue(mockEntry as any);

    render(
      <MemoryRouter initialEntries={["/admin/ypop-validation"]}>
        <LydoConnectProvider initialState={setupAdminStore() as any}>
          <AdminPortal section="ypop-validation" />
        </LydoConnectProvider>
      </MemoryRouter>
    );

    // Navigate into semester detail
    const submissionsBtn = await screen.findByRole("button", { name: /Submissions/i });
    fireEvent.click(submissionsBtn);

    // Click on organization's Validate button
    const validateBtn = await screen.findByRole("button", { name: /Validate/i });
    fireEvent.click(validateBtn);

    // In entry review view: select first activity checkbox
    await waitFor(() => {
      expect(screen.getByText("Barangay Youth Leadership Summit")).toBeInTheDocument();
    });

    const checkbox1 = screen.getByRole("checkbox", { name: /Select Barangay Youth Leadership Summit/i });
    fireEvent.click(checkbox1);

    // Change decision to Request Revision
    const decisionTrigger = screen.getByRole("combobox");
    fireEvent.click(decisionTrigger);

    const revisionOption = screen.getByRole("option", { name: /Request Revision/i });
    fireEvent.click(revisionOption);

    // Confirm button is initially disabled (empty remark)
    const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
    expect(confirmBtn).toBeDisabled();

    // Type remark
    const textarea = screen.getByPlaceholderText(/Explain what the organization needs to revise/i);
    fireEvent.change(textarea, { target: { value: "Please upload the signed attendance sheet." } });

    // Confirm button is now enabled
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);

    // TEST 7: Confirmation dialog displays the exact remark and NOT "—"
    await waitFor(() => {
      expect(screen.getByText("Confirm Review Decision")).toBeInTheDocument();
    });
    expect(screen.getAllByText("Please upload the signed attendance sheet.").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("—")).not.toBeInTheDocument();

    // Click Submit Review
    const submitReviewBtn = screen.getByRole("button", { name: /Submit Review/i });
    fireEvent.click(submitReviewBtn);

    await waitFor(() => {
      expect(lydoSupabase.adminUpdateYpopEventParticipationInSupabase).toHaveBeenCalledWith(
        "part-act-1",
        expect.objectContaining({
          status: "needs_revision",
          adminRemarks: "Please upload the signed attendance sheet.",
        })
      );
    });
  });

  it("TEST 2 & 3: Missing or whitespace remark keeps Confirm disabled", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/ypop-validation"]}>
        <LydoConnectProvider initialState={setupAdminStore() as any}>
          <AdminPortal section="ypop-validation" />
        </LydoConnectProvider>
      </MemoryRouter>
    );

    // Navigate to entry review
    const submissionsBtn = await screen.findByRole("button", { name: /Submissions/i });
    fireEvent.click(submissionsBtn);

    const validateBtn = await screen.findByRole("button", { name: /Validate/i });
    fireEvent.click(validateBtn);

    await waitFor(() => expect(screen.getByText("Barangay Youth Leadership Summit")).toBeInTheDocument());

    // Select single item
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Barangay Youth Leadership Summit/i }));

    // Switch to Request Revision
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /Request Revision/i }));

    const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText("Revision remark is required.")).toBeInTheDocument();

    // TEST 3: Enter whitespace remark
    const textarea = screen.getByPlaceholderText(/Explain what the organization needs to revise/i);
    fireEvent.change(textarea, { target: { value: "    " } });
    expect(confirmBtn).toBeDisabled();
    expect(screen.getByText("Revision remark is required.")).toBeInTheDocument();
  });

  it("TEST 4 & 5: When multiple items are selected, Request Revision is disabled in dropdown", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/ypop-validation"]}>
        <LydoConnectProvider initialState={setupAdminStore() as any}>
          <AdminPortal section="ypop-validation" />
        </LydoConnectProvider>
      </MemoryRouter>
    );

    const submissionsBtn = await screen.findByRole("button", { name: /Submissions/i });
    fireEvent.click(submissionsBtn);

    const validateBtn = await screen.findByRole("button", { name: /Validate/i });
    fireEvent.click(validateBtn);

    await waitFor(() => expect(screen.getByText("Barangay Youth Leadership Summit")).toBeInTheDocument());

    // Select both items
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Barangay Youth Leadership Summit/i }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Pasig Tree Planting Drive/i }));

    // 2 items selected: Request Revision is disabled in dropdown
    fireEvent.click(screen.getByRole("combobox"));
    const revisionOption = screen.getByRole("option", { name: /Request Revision/i });
    expect(revisionOption).toHaveAttribute("data-disabled");
  });

  it("TEST 6: Select All and other checkboxes are disabled when Request Revision is the active decision", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/ypop-validation"]}>
        <LydoConnectProvider initialState={setupAdminStore() as any}>
          <AdminPortal section="ypop-validation" />
        </LydoConnectProvider>
      </MemoryRouter>
    );

    const submissionsBtn = await screen.findByRole("button", { name: /Submissions/i });
    fireEvent.click(submissionsBtn);

    const validateBtn = await screen.findByRole("button", { name: /Validate/i });
    fireEvent.click(validateBtn);

    await waitFor(() => expect(screen.getByText("Barangay Youth Leadership Summit")).toBeInTheDocument());

    // Select single item and switch to Request Revision
    fireEvent.click(screen.getByRole("checkbox", { name: /Select Barangay Youth Leadership Summit/i }));
    fireEvent.click(screen.getByRole("combobox"));
    fireEvent.click(screen.getByRole("option", { name: /Request Revision/i }));

    // Select all checkbox must be disabled
    const selectAllCheckbox = screen.getByRole("checkbox", { name: /Select all/i });
    expect(selectAllCheckbox).toBeDisabled();

    // Other activity checkbox is disabled to prevent multi-selection
    const checkbox2 = screen.getByRole("checkbox", { name: /Select Pasig Tree Planting Drive/i });
    expect(checkbox2).toBeDisabled();
  });

  it("TEST 13: Approve decision continues to support multi-select", async () => {
    render(
      <MemoryRouter initialEntries={["/admin/ypop-validation"]}>
        <LydoConnectProvider initialState={setupAdminStore() as any}>
          <AdminPortal section="ypop-validation" />
        </LydoConnectProvider>
      </MemoryRouter>
    );

    const submissionsBtn = await screen.findByRole("button", { name: /Submissions/i });
    fireEvent.click(submissionsBtn);

    const validateBtn = await screen.findByRole("button", { name: /Validate/i });
    fireEvent.click(validateBtn);

    await waitFor(() => expect(screen.getByText("Barangay Youth Leadership Summit")).toBeInTheDocument());

    // With Verify/Approve decision: Select all is enabled
    const selectAllCheckbox = screen.getByRole("checkbox", { name: /Select all/i });
    expect(selectAllCheckbox).not.toBeDisabled();

    // Select all
    fireEvent.click(selectAllCheckbox);

    // 2 documents selected
    expect(screen.getByText("2 documents selected.")).toBeInTheDocument();

    // Confirm is enabled without requiring remark
    const confirmBtn = screen.getByRole("button", { name: /^Confirm$/i });
    expect(confirmBtn).not.toBeDisabled();
  });
});
