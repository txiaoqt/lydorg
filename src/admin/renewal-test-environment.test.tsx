import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RenewalTestEnvironmentPanel } from "./components/RenewalTestEnvironmentPanel";
import * as lydoConnectSupabase from "@/lib/lydo-connect-supabase";

vi.mock("@/lib/lydo-connect-supabase", async () => {
  const actual = await vi.importActual<typeof import("@/lib/lydo-connect-supabase")>("@/lib/lydo-connect-supabase");
  return {
    ...actual,
    adminGetOrCreateRenewalTestAccountInSupabase: vi.fn(),
    adminPrepareRenewalTestScenarioInSupabase: vi.fn(),
    adminRestoreRenewalTestScenarioInSupabase: vi.fn(),
    adminResetRenewalTestScenarioInSupabase: vi.fn(),
  };
});

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const mockTestAccountDetails: lydoConnectSupabase.RenewalTestAccountDetails = {
  isNew: false,
  credentials: {
    email: "renewal.test@pasigcity.gov.ph",
    temporaryPassword: "RenewalTest2026!",
  },
  organization: {
    id: "8170959f-2bb8-40ea-8ce8-31deb514de17",
    name: "Y-TRACE Renewal Test Organization",
    email: "renewal.test@pasigcity.gov.ph",
    userId: "9c02f317-700e-4903-888d-c62e5d941f85",
    barangay: "Kapitolyo",
    district: "District 1",
    contactNumber: "09170000000",
    profileStatus: "verified",
    urn: "01-23-999",
    isRenewalTestAccount: true,
  },
  accreditation: {
    id: "a668e983-61f2-4f61-a5ff-2aef58e81621",
    termNumber: 1,
    startDate: "2023-09-28",
    endDate: "2026-10-28",
    certificateUrn: "01-23-999",
    status: "active",
    derivedStatus: "expiring_soon",
  },
  eligibility: {
    canDraft: true,
    canSubmit: true,
    windowStatus: "open",
    daysRemaining: 30,
    expiresAt: "2026-10-28",
  },
  activeRenewal: null,
};

describe("RenewalTestEnvironmentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Renewal Test Environment panel with account details and open window badge", async () => {
    vi.mocked(lydoConnectSupabase.adminGetOrCreateRenewalTestAccountInSupabase).mockResolvedValue(mockTestAccountDetails);

    render(<RenewalTestEnvironmentPanel />);

    await waitFor(() => {
      expect(screen.getByText("Renewal Test Environment")).toBeInTheDocument();
      expect(screen.getByText("Y-TRACE Renewal Test Organization")).toBeInTheDocument();
      expect(screen.getByText("renewal.test@pasigcity.gov.ph")).toBeInTheDocument();
      expect(screen.getByText("RenewalTest2026!")).toBeInTheDocument();
      expect(screen.getByText("Renewal Window OPEN")).toBeInTheDocument();
      expect(screen.getByText("30 days")).toBeInTheDocument();
    });
  });

  it("handles scenario preparation for 60 days ahead", async () => {
    vi.mocked(lydoConnectSupabase.adminGetOrCreateRenewalTestAccountInSupabase).mockResolvedValue(mockTestAccountDetails);
    vi.mocked(lydoConnectSupabase.adminPrepareRenewalTestScenarioInSupabase).mockResolvedValue({
      success: true,
      organizationId: mockTestAccountDetails.organization.id,
      accreditationId: mockTestAccountDetails.accreditation!.id,
      startDate: "2023-09-28",
      endDate: "2026-11-28",
      derivedStatus: "expiring_soon",
      daysRemaining: 60,
      eligibility: {
        canDraft: true,
        canSubmit: true,
        windowStatus: "open",
        daysRemaining: 60,
      },
    });

    render(<RenewalTestEnvironmentPanel />);

    await waitFor(() => {
      expect(screen.getByText("Renewal Test Environment")).toBeInTheDocument();
    });

    const preset60Btn = screen.getByText("60 Days Ahead").closest("button");
    expect(preset60Btn).toBeInTheDocument();
    fireEvent.click(preset60Btn!);

    const applyBtn = screen.getByText("Apply Test Expiration").closest("button");
    expect(applyBtn).toBeInTheDocument();
    fireEvent.click(applyBtn!);

    await waitFor(() => {
      expect(lydoConnectSupabase.adminPrepareRenewalTestScenarioInSupabase).toHaveBeenCalledWith({
        expirationDaysAhead: 60,
        customExpirationDate: undefined,
      });
    });
  });

  it("handles scenario reset to clean Cycle 2 ready state", async () => {
    vi.mocked(lydoConnectSupabase.adminGetOrCreateRenewalTestAccountInSupabase).mockResolvedValue(mockTestAccountDetails);
    vi.mocked(lydoConnectSupabase.adminResetRenewalTestScenarioInSupabase).mockResolvedValue({
      success: true,
      organizationId: mockTestAccountDetails.organization.id,
      termNumber: 1,
      endDate: "2026-10-28",
      derivedStatus: "expiring_soon",
      eligibility: {
        canDraft: true,
        canSubmit: true,
        windowStatus: "open",
        daysRemaining: 30,
      },
    });

    render(<RenewalTestEnvironmentPanel />);

    await waitFor(() => {
      expect(screen.getByText("Renewal Test Environment")).toBeInTheDocument();
    });

    const resetBtn = screen.getByText(/Reset Scenario/i).closest("button");
    expect(resetBtn).toBeInTheDocument();
    fireEvent.click(resetBtn!);

    await waitFor(() => {
      expect(lydoConnectSupabase.adminResetRenewalTestScenarioInSupabase).toHaveBeenCalled();
    });
  });

  it("handles scenario restoration to standard 3-year term", async () => {
    vi.mocked(lydoConnectSupabase.adminGetOrCreateRenewalTestAccountInSupabase).mockResolvedValue(mockTestAccountDetails);
    vi.mocked(lydoConnectSupabase.adminRestoreRenewalTestScenarioInSupabase).mockResolvedValue({
      success: true,
      organizationId: mockTestAccountDetails.organization.id,
      endDate: "2026-09-28",
      derivedStatus: "expiring_soon",
    });

    render(<RenewalTestEnvironmentPanel />);

    await waitFor(() => {
      expect(screen.getByText("Renewal Test Environment")).toBeInTheDocument();
    });

    const restoreBtn = screen.getByText("Restore Pre-Test State").closest("button");
    expect(restoreBtn).toBeInTheDocument();
    fireEvent.click(restoreBtn!);

    await waitFor(() => {
      expect(lydoConnectSupabase.adminRestoreRenewalTestScenarioInSupabase).toHaveBeenCalled();
    });
  });
});
