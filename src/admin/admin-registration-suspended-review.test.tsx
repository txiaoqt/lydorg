import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import React from "react";
import { UrnReviewPanel } from "./components/UrnReviewPanel";
import { StatusPill } from "./components/RegistrationsTable";
import type { OrganizationProfile } from "@/lib/lydo-connect-data";
import * as lydoSupabase from "@/lib/lydo-connect-supabase";

import { writeAdminSession } from "@/lib/admin-auth";

// Mock Supabase
vi.mock("@/lib/supabase", () => {
  return {
    supabase: {
      auth: {
        getSession: vi.fn(),
      },
      from: vi.fn(),
      rpc: vi.fn(),
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn().mockResolvedValue({ error: null }),
          remove: vi.fn().mockResolvedValue({ error: null }),
        })),
      },
    },
    supabaseUrl: "https://mock.supabase.co",
    isSupabaseConfigured: () => true,
  };
});

describe("Admin Registration Review for Permanently Suspended Organizations", () => {
  const suspendedProfile: OrganizationProfile = {
    id: "org-suspended-1",
    userId: "user-suspended-1",
    organizationName: "Suspended Youth Org",
    organizationEmail: "suspended@pasig.gov.ph",
    contactNumber: "09123456789",
    district: "District 1",
    barangay: "Kapitolyo",
    majorClassification: "Community-Based",
    subClassification: "Youth Organization",
    pcyNumber: "PCY-1234",
    referenceId: "REF-SUSPENDED-01",
    profileStatus: "suspended_inactive",
    isExistingOrganization: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    verifiedAt: null,
    urn: null,
    urnReviewStatus: "pending",
  };

  const activePendingProfile: OrganizationProfile = {
    id: "org-pending-1",
    userId: "user-pending-1",
    organizationName: "Active Pending Youth Org",
    organizationEmail: "active@pasig.gov.ph",
    contactNumber: "09123456789",
    district: "District 2",
    barangay: "Maybunga",
    majorClassification: "School-Based",
    subClassification: "Student Council",
    pcyNumber: "PCY-5678",
    referenceId: "REF-ACTIVE-01",
    profileStatus: "pending_review",
    isExistingOrganization: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
    verifiedAt: null,
    urn: null,
    urnReviewStatus: "pending",
  };

  const suspendedUrnProfile: OrganizationProfile = {
    ...suspendedProfile,
    registrationType: "existing_urn",
    urn: "URN-2026-9999",
    urnReviewStatus: "pending",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    writeAdminSession({
      id: "admin-1",
      username: "admin",
      email: "admin@pasig.gov.ph",
      displayName: "Administrator",
      sessionToken: "valid-session-token",
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    });
  });

  describe("StatusPill Component", () => {
    it("renders Suspended pill for suspended_inactive status with correct styling", () => {
      render(<StatusPill status="suspended_inactive" />);
      const pill = screen.getByText("Suspended");
      expect(pill).toBeDefined();
      expect(pill.className).toContain("text-icon-danger-secondary");
      expect(pill.className).toContain("bg-danger-subtle");
    });

    it("renders Pending Review pill for pending_review status", () => {
      render(<StatusPill status="pending_review" />);
      const pill = screen.getByText("Pending Review");
      expect(pill).toBeDefined();
    });
  });

  describe("UrnReviewPanel for Suspended Organizations", () => {
    it("displays read-only notice banner and hides decision buttons when organization is suspended", () => {
      const onBack = vi.fn();
      const onReviewed = vi.fn();

      render(
        <UrnReviewPanel
          profile={suspendedUrnProfile}
          onBack={onBack}
          onReviewed={onReviewed}
        />,
      );

      expect(
        screen.getByText(
          "Review actions are unavailable because this organization account is permanently suspended.",
        ),
      ).toBeDefined();

      // Action buttons should NOT be present
      expect(screen.queryByText("Verify URN")).toBeNull();
      expect(screen.queryByText("Needs Correction")).toBeNull();
      expect(screen.queryByText("Reject URN")).toBeNull();
    });

    it("renders interactive buttons when organization is pending review", () => {
      const pendingUrnProfile: OrganizationProfile = {
        ...activePendingProfile,
        registrationType: "existing_urn",
        urn: "URN-2026-1111",
        urnReviewStatus: "pending",
      };

      render(
        <UrnReviewPanel
          profile={pendingUrnProfile}
          onBack={vi.fn()}
          onReviewed={vi.fn()}
        />,
      );

      expect(screen.getByText("Verify URN")).toBeDefined();
      expect(screen.getByText("Needs Correction")).toBeDefined();
      expect(screen.getByText("Reject URN")).toBeDefined();
      expect(
        screen.queryByText(
          "Review actions are unavailable because this organization account is permanently suspended.",
        ),
      ).toBeNull();
    });
  });

  describe("Backend RPC Guard for Suspended Organizations", () => {
    it("propagates error when backend rejects review decision mutation for suspended organization", async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: null,
        error: { message: "This organization account is permanently suspended. Review actions cannot be performed." },
      });

      const { supabase } = await import("@/lib/supabase");
      // @ts-expect-error mock rpc
      supabase.rpc = mockRpc;

      await expect(
        lydoSupabase.updateDocumentSubmissionFileReviewInSupabase({
          fileId: "file-suspended-1",
          status: "approved_green",
        }),
      ).rejects.toThrow("This organization account is permanently suspended. Review actions cannot be performed.");
    });
  });
});
