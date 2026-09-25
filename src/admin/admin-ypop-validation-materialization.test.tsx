import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminPortal from "./AdminPortal";
import { LydoConnectProvider, reconcileYpopEntries } from "@/lib/lydo-connect-store";
import { adminCreateYpopEntryInSupabase } from "@/lib/lydo-connect-supabase";
import { supabase } from "@/lib/supabase";
import type { YPOPEntry, YPOPPeriod, YPOPEventParticipation, OrganizationProfile, YPOPCityActivity } from "@/types";

// Mock supabase
vi.mock("@/lib/supabase", () => {
  const rpcMock = vi.fn();
  const fromMock = vi.fn();
  return {
    supabase: {
      rpc: rpcMock,
      from: fromMock,
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
      permissionCodes: ["ypop_submissions_review", "budget_requests_review"],
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
    permissionCodes: ["ypop_submissions_review"],
  }),
  writeAdminSession: vi.fn(),
}));

const mockOrg: OrganizationProfile = {
  id: "4b68e0d4-7935-430b-9dfc-3e3c631e8093",
  userId: "user-1",
  organizationName: "Pasig Youth Advocates",
  barangay: "San Nicolas",
  district: "District 1",
  majorClassification: "Community-Based Youth Organization",
  classification: "Community-Based Youth Organization",
  contactNumber: "09171234567",
  email: "pya@pasig.gov.ph",
  status: "verified",
  registrationStatus: "verified",
  accreditationStatus: "accredited",
  complianceStatus: "compliant",
  points: 100,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  referenceId: "ORG-PASIG-001",
};

const mockPeriod: YPOPPeriod = {
  id: "period-1",
  semesterKey: "S2-2026-08-31-A4",
  semesterLabel: "2026 Second Semester",
  validationDeadline: "2026-12-15T00:00:00.000Z",
  status: "open",
  orgLedTiers: [],
  createdAt: "2026-08-31T00:00:00.000Z",
  updatedAt: "2026-08-31T00:00:00.000Z",
};

const mockCityActivity: YPOPCityActivity = {
  id: "act-1",
  semesterKey: "S2-2026-08-31-A4",
  name: "Youth Leadership Summit",
  date: "2026-09-15",
  startDate: "2026-09-15",
  endDate: "2026-09-15",
  venue: "Pasig Sports Center",
  category: "mandatory",
  points: 4,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

const mockParticipation: YPOPEventParticipation = {
  id: "part-1",
  organizationId: "4b68e0d4-7935-430b-9dfc-3e3c631e8093",
  activityId: "act-1",
  activityName: "Youth Leadership Summit",
  activityDate: "2026-09-15",
  venue: "Pasig Sports Center",
  status: "pending_verification",
  adminRemarks: "",
  joinedAt: "2026-09-15T08:00:00.000Z",
  revisionHistory: [],
  createdAt: "2026-09-15T08:00:00.000Z",
  updatedAt: "2026-09-15T08:00:00.000Z",
};

describe("YPOP Admin Validation Materialization & Store Reconciliation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("adminCreateYpopEntryInSupabase transmits the sessionToken via admin_create_ypop_entry RPC", async () => {
    (supabase!.rpc as any).mockImplementation(async (fnName: string, args: any) => {
      if (fnName === "admin_create_ypop_entry") {
        return {
          data: [
            {
              id: "persisted-entry-uuid-999",
              organization_id: args._organization_id,
              semester: args._semester,
              semester_label: args._semester_label,
              points_earned: args._points_earned ?? 0,
              points_required: args._points_required ?? 70,
              total_points: args._total_points ?? 100,
              status: args._status ?? "under_review",
              admin_remarks: args._admin_remarks ?? "",
              submission_note: args._submission_note ?? "",
              validation_deadline: args._validation_deadline ?? "2026-12-15T00:00:00.000Z",
              submitted_at: args._submitted_at ?? "2026-09-24T12:00:00.000Z",
              validated_at: null,
              revision_history: [],
              org_led_project_count: 0,
              city_led_attendance: [],
              created_at: "2026-09-24T12:00:00.000Z",
              updated_at: "2026-09-24T12:00:00.000Z",
            },
          ],
          error: null,
        };
      }
      return { data: null, error: new Error(`Unhandled RPC: ${fnName}`) };
    });

    const result = await adminCreateYpopEntryInSupabase({
      organizationId: "4b68e0d4-7935-430b-9dfc-3e3c631e8093",
      submittedBy: "",
      semester: "S2-2026-08-31-A4",
      semesterLabel: "2026 Second Semester",
      pointsEarned: 0,
      pointsRequired: 70,
      totalPoints: 100,
      status: "under_review",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-12-15T00:00:00.000Z",
      submittedAt: "2026-09-24T12:00:00.000Z",
      validatedAt: "",
      revisionHistory: [],
      orgLedProjectCount: 0,
      cityLedAttendance: [],
    });

    expect(supabase!.rpc).toHaveBeenCalledWith("admin_create_ypop_entry", expect.objectContaining({
      _session_token: "valid-admin-session-token-12345",
      _organization_id: "4b68e0d4-7935-430b-9dfc-3e3c631e8093",
      _semester: "S2-2026-08-31-A4",
      _semester_label: "2026 Second Semester",
    }));

    expect(result.id).toBe("persisted-entry-uuid-999");
    expect(result.organizationId).toBe("4b68e0d4-7935-430b-9dfc-3e3c631e8093");
    expect(result.status).toBe("under_review");
  });

  it("reconcileYpopEntries preserves active virtual entries during targeted refresh until replaced by remote entries", () => {
    const validSemesterKeys = new Set(["S2-2026-08-31-A4"]);
    const virtualEntry: YPOPEntry = {
      id: "virtual-S2-2026-08-31-A4-org-1",
      organizationId: "4b68e0d4-7935-430b-9dfc-3e3c631e8093",
      semester: "S2-2026-08-31-A4",
      semesterLabel: "2026 Second Semester",
      pointsEarned: 0,
      pointsRequired: 70,
      totalPoints: 100,
      status: "draft",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-12-15T00:00:00.000Z",
      submittedAt: "",
      validatedAt: "",
      revisionHistory: [],
      orgLedProjectCount: 0,
      cityLedAttendance: [],
      createdAt: "2026-09-24T12:00:00.000Z",
      updatedAt: "2026-09-24T12:00:00.000Z",
      _isVirtual: true,
    };

    const currentEntries: YPOPEntry[] = [virtualEntry];
    const remoteEntries: YPOPEntry[] = [];

    const reconciled = reconcileYpopEntries(currentEntries, remoteEntries, validSemesterKeys);
    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].id).toBe("virtual-S2-2026-08-31-A4-org-1");

    // When remote returns the persisted canonical entry
    const persistedEntry: YPOPEntry = {
      id: "canonical-db-uuid-123",
      organizationId: "4b68e0d4-7935-430b-9dfc-3e3c631e8093",
      semester: "S2-2026-08-31-A4",
      semesterLabel: "2026 Second Semester",
      pointsEarned: 0,
      pointsRequired: 70,
      totalPoints: 100,
      status: "under_review",
      adminRemarks: "",
      submissionNote: "",
      validationDeadline: "2026-12-15T00:00:00.000Z",
      submittedAt: "2026-09-24T12:00:00.000Z",
      validatedAt: "",
      revisionHistory: [],
      orgLedProjectCount: 0,
      cityLedAttendance: [],
      createdAt: "2026-09-24T12:00:00.000Z",
      updatedAt: "2026-09-24T12:00:00.000Z",
    };

    const nextReconciled = reconcileYpopEntries([persistedEntry], [persistedEntry], validSemesterKeys);
    expect(nextReconciled).toHaveLength(1);
    expect(nextReconciled[0].id).toBe("canonical-db-uuid-123");
  });
});
