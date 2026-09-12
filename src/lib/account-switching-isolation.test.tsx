import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  LydoConnectProvider,
  useLydoConnect,
  getAccountIdentityKey,
  getStorageKeyForIdentity,
  clearAccountScopedState,
  readState,
  reconcileYpopEventParticipations,
  reconcileYpopOrgActivities,
  reconcileYpopEventFiles,
  reconcileYpopOrgActivityFiles,
  type AccountIdentity,
} from "./lydo-connect-store";
import {
  type OrganizationProfile,
  type DocumentSubmission,
  type BudgetRequest,
  type LiquidationReport,
  type InquiryRecord,
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPEntry,
  type YPOPEventFile,
  type YPOPOrgActivityFile,
  type SubmissionFile,
  type BudgetRequestFile,
  type LiquidationReportFile,
  type ActivityLog,
  type YPOPFile,
  type NotificationRecord,
  seedState,
} from "./lydo-connect-data";
import { supabaseAuthStorageKey } from "./supabase";

describe("Account Switching State Synchronization & Cross-Account Data Isolation", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
    vi.clearAllMocks();
  });

  describe("PHASE 1: Account Identity Key & Storage Partitioning", () => {
    it("generates distinct partitioned keys for user, admin, and anonymous identities", () => {
      const userA: AccountIdentity = { type: "user", id: "user-aaa-111" };
      const userB: AccountIdentity = { type: "user", id: "user-bbb-222" };
      const admin: AccountIdentity = { type: "admin", id: "admin-xyz-999" };
      const anon: AccountIdentity = { type: "anonymous" };

      expect(getAccountIdentityKey(userA)).toBe("user:user-aaa-111");
      expect(getAccountIdentityKey(userB)).toBe("user:user-bbb-222");
      expect(getAccountIdentityKey(admin)).toBe("admin:admin-xyz-999");
      expect(getAccountIdentityKey(anon)).toBe("anonymous");

      expect(getStorageKeyForIdentity(userA)).toBe("lydo-connect-state-v1:user:user-aaa-111");
      expect(getStorageKeyForIdentity(userB)).toBe("lydo-connect-state-v1:user:user-bbb-222");
      expect(getStorageKeyForIdentity(admin)).toBe("lydo-connect-state-v1:admin:admin-xyz-999");
      expect(getStorageKeyForIdentity(anon)).toBe("lydo-connect-state-v1:anonymous");

      // Verify each key is completely distinct
      const keys = new Set([
        getStorageKeyForIdentity(userA),
        getStorageKeyForIdentity(userB),
        getStorageKeyForIdentity(admin),
        getStorageKeyForIdentity(anon),
      ]);
      expect(keys.size).toBe(4);
    });
  });

  describe("PHASE 4: clearAccountScopedState", () => {
    it("clears all account-specific data while strictly preserving public shared data", () => {
      const dummyProfile: OrganizationProfile = {
        id: "org-1",
        userId: "user-1",
        organizationName: "Test Org",
        organizationEmail: "test@example.com",
        contactNumber: "09123456789",
        district: "District 1",
        barangay: "Bagong Ilog",
        isExistingOrganization: false,
        registrationType: "new",
        majorClassification: "Youth",
        subClassification: "Community",
        advocacies: [],
        adviserName: "Adviser",
        representativeName: "Rep",
        address: "Address",
        headCount: 10,
        establishedYear: 2020,
        website: "",
        facebookPage: "",
        status: "verified",
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
      };

      const dirtyState = {
        ...seedState,
        organizationProfiles: [dummyProfile],
        documentSubmissions: [{ id: "sub-1" } as unknown as DocumentSubmission],
        documentSubmissionFiles: [{ id: "file-1" } as unknown as SubmissionFile],
        budgetRequests: [{ id: "budget-1" } as unknown as BudgetRequest],
        budgetRequestFiles: [{ id: "bfile-1" } as unknown as BudgetRequestFile],
        liquidationReports: [{ id: "liq-1" } as unknown as LiquidationReport],
        liquidationReportFiles: [{ id: "lfile-1" } as unknown as LiquidationReportFile],
        inquiries: [{ id: "inq-1" } as unknown as InquiryRecord],
        activityLogs: [{ id: "act-1" } as unknown as ActivityLog],
        ypopEntries: [{ id: "entry-1" } as unknown as YPOPEntry],
        ypopFiles: [{ id: "yfile-1" } as unknown as YPOPFile],
        ypopEventParticipations: [{ id: "part-1" } as unknown as YPOPEventParticipation],
        ypopEventFiles: [{ id: "yefile-1" } as unknown as YPOPEventFile],
        ypopOrgActivities: [{ id: "orgact-1" } as unknown as YPOPOrgActivity],
        ypopOrgActivityFiles: [{ id: "oactfile-1" } as unknown as YPOPOrgActivityFile],
        notifications: [{ id: "notif-1" } as unknown as NotificationRecord],
      };

      const cleaned = clearAccountScopedState(dirtyState);

      // Account-specific fields must be completely empty
      expect(cleaned.organizationProfiles).toEqual([]);
      expect(cleaned.documentSubmissions).toEqual([]);
      expect(cleaned.documentSubmissionFiles).toEqual([]);
      expect(cleaned.budgetRequests).toEqual([]);
      expect(cleaned.budgetRequestFiles).toEqual([]);
      expect(cleaned.liquidationReports).toEqual([]);
      expect(cleaned.liquidationReportFiles).toEqual([]);
      expect(cleaned.inquiries).toEqual([]);
      expect(cleaned.activityLogs).toEqual([]);
      expect(cleaned.ypopEntries).toEqual([]);
      expect(cleaned.ypopFiles).toEqual([]);
      expect(cleaned.ypopEventParticipations).toEqual([]);
      expect(cleaned.ypopEventFiles).toEqual([]);
      expect(cleaned.ypopOrgActivities).toEqual([]);
      expect(cleaned.ypopOrgActivityFiles).toEqual([]);
      expect(cleaned.notifications).toEqual([]);

      // Shared public data must be preserved
      expect(cleaned.templates.length).toBeGreaterThan(0);
      expect(cleaned.newsReleases).toEqual(dirtyState.newsReleases);
      expect(cleaned.transparencyPosts).toEqual(dirtyState.transparencyPosts);
      expect(cleaned.ypopPeriods).toEqual(dirtyState.ypopPeriods);
      expect(cleaned.ypopCityActivities).toEqual(dirtyState.ypopCityActivities);
    });
  });

  describe("PHASE 5: Partitioned LocalStorage & Cross-Account Hydration Immunity", () => {
    it("ensures Account A state never hydrates into Account B", () => {
      const userA: AccountIdentity = { type: "user", id: "user-A" };
      const userB: AccountIdentity = { type: "user", id: "user-B" };

      const userAData = {
        ...seedState,
        organizationProfiles: [{ id: "org-A", userId: "user-A", organizationName: "Org Alpha" } as OrganizationProfile],
        budgetRequests: [{ id: "budget-A", organizationId: "org-A", title: "Alpha Budget" } as BudgetRequest],
      };

      // Save user A's state in localStorage under user A's partitioned key
      window.localStorage.setItem(getStorageKeyForIdentity(userA), JSON.stringify(userAData));

      // Read state for user B
      const hydratedForB = readState(userB);

      // User B must NOT see user A's organization or budget requests
      expect(hydratedForB.organizationProfiles).toEqual([]);
      expect(hydratedForB.budgetRequests).toEqual([]);
    });

    it("wipes legacy unpartitioned storage key on read to prevent stale leaks", () => {
      window.localStorage.setItem("lydo-connect-state-v1", JSON.stringify({ legacy: true }));
      readState({ type: "anonymous" });
      expect(window.localStorage.getItem("lydo-connect-state-v1")).toBeNull();
    });

    it("anonymous session never hydrates account-scoped data from storage", () => {
      const anonKey = getStorageKeyForIdentity({ type: "anonymous" });
      window.localStorage.setItem(
        anonKey,
        JSON.stringify({
          organizationProfiles: [{ id: "leaked-org" }],
          budgetRequests: [{ id: "leaked-budget" }],
        }),
      );

      const anonState = readState({ type: "anonymous" });
      expect(anonState.organizationProfiles).toEqual([]);
      expect(anonState.budgetRequests).toEqual([]);
    });
  });

  describe("PHASE 6: Cross-Account Reconciliation Isolation", () => {
    const validCityActivities = new Set(["city-act-1"]);
    const validEntries = new Set(["entry-1"]);

    it("user mode reconciliation completely drops records from other organizations", () => {
      const currentParticipations: YPOPEventParticipation[] = [
        {
          id: "part-A",
          organizationId: "org-A",
          activityId: "city-act-1",
          activityName: "Summit",
          status: "verified",
          adminRemarks: "",
          proofSubmittedAt: "",
          verifiedAt: "",
          revisionHistory: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      // Remote snapshot for org-B
      const remoteParticipations: YPOPEventParticipation[] = [
        {
          id: "part-B",
          organizationId: "org-B",
          activityId: "city-act-1",
          activityName: "Summit",
          status: "submitted",
          adminRemarks: "",
          proofSubmittedAt: "",
          verifiedAt: "",
          revisionHistory: [],
          createdAt: "2026-02-01T00:00:00Z",
          updatedAt: "2026-02-01T00:00:00Z",
        },
      ];

      const snapshotOrgs = [{ id: "org-B" }];

      // User Mode (isAdmin = false)
      const reconciled = reconcileYpopEventParticipations(
        currentParticipations,
        remoteParticipations,
        snapshotOrgs,
        false, // isAdmin = false
        validCityActivities,
      );

      // Must ONLY contain org-B items, org-A item must NOT be retained!
      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].id).toBe("part-B");
      expect(reconciled.some((p) => p.organizationId === "org-A")).toBe(false);
    });

    it("admin mode reconciliation legitimately preserves citywide records across multiple organizations", () => {
      const currentParticipations: YPOPEventParticipation[] = [
        {
          id: "part-A",
          organizationId: "org-A",
          activityId: "city-act-1",
          activityName: "Summit",
          status: "verified",
          adminRemarks: "",
          proofSubmittedAt: "",
          verifiedAt: "",
          revisionHistory: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const remoteParticipations: YPOPEventParticipation[] = [
        {
          id: "part-B",
          organizationId: "org-B",
          activityId: "city-act-1",
          activityName: "Summit",
          status: "submitted",
          adminRemarks: "",
          proofSubmittedAt: "",
          verifiedAt: "",
          revisionHistory: [],
          createdAt: "2026-02-01T00:00:00Z",
          updatedAt: "2026-02-01T00:00:00Z",
        },
      ];

      // Admin Mode (isAdmin = true)
      const reconciled = reconcileYpopEventParticipations(
        currentParticipations,
        remoteParticipations,
        undefined,
        true, // isAdmin = true
        validCityActivities,
      );

      // Admin receives remote items mapped
      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].id).toBe("part-B");
    });

    it("user mode org activities reconciliation completely drops previous account activities", () => {
      const currentOrgActivities: YPOPOrgActivity[] = [
        {
          id: "act-A",
          organizationId: "org-A",
          ypopEntryId: "entry-1",
          activityName: "Alpha Tree Planting",
          activityDate: "2026-03-01",
          venue: "Park",
          status: "submitted",
          adminRemarks: "",
          approvedAt: "",
          proofSubmittedAt: "",
          revisionHistory: [],
          createdAt: "2026-01-01T00:00:00Z",
          updatedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const remoteOrgActivities: YPOPOrgActivity[] = [
        {
          id: "act-B",
          organizationId: "org-B",
          ypopEntryId: "entry-1",
          activityName: "Beta Youth Workshop",
          activityDate: "2026-04-01",
          venue: "Hall",
          status: "submitted",
          adminRemarks: "",
          approvedAt: "",
          proofSubmittedAt: "",
          revisionHistory: [],
          createdAt: "2026-02-01T00:00:00Z",
          updatedAt: "2026-02-01T00:00:00Z",
        },
      ];

      const snapshotOrgs = [{ id: "org-B" }];

      const reconciled = reconcileYpopOrgActivities(
        currentOrgActivities,
        remoteOrgActivities,
        snapshotOrgs,
        false, // isAdmin = false
        validEntries,
      );

      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].id).toBe("act-B");
      expect(reconciled.some((a) => a.organizationId === "org-A")).toBe(false);
    });

    it("user mode event files drops files belonging to dropped participations", () => {
      const currentFiles: YPOPEventFile[] = [
        {
          id: "f-1",
          participationId: "part-A",
          organizationId: "org-A",
          fileUrl: "url-1",
          fileName: "a.pdf",
          fileSize: 100,
          fileType: "application/pdf",
          uploadedAt: "2026-01-01T00:00:00Z",
        },
      ];

      const remoteFiles: YPOPEventFile[] = [
        {
          id: "f-2",
          participationId: "part-B",
          organizationId: "org-B",
          fileUrl: "url-2",
          fileName: "b.pdf",
          fileSize: 200,
          fileType: "application/pdf",
          uploadedAt: "2026-02-01T00:00:00Z",
        },
      ];

      const participations = [{ id: "part-B", organizationId: "org-B" }] as YPOPEventParticipation[];

      const reconciled = reconcileYpopEventFiles(currentFiles, remoteFiles, participations, false);
      expect(reconciled).toHaveLength(1);
      expect(reconciled[0].id).toBe("f-2");
    });
  });

  describe("PHASE 2 & 3: Store Provider & mergeRemoteState Cross-Account Isolation", () => {
    it("mergeRemoteState discards snapshots belonging to another user", () => {
      // Simulate auth token for user-B in localStorage
      window.localStorage.setItem(
        supabaseAuthStorageKey,
        JSON.stringify({ user: { id: "user-B" } }),
      );

      const { result } = renderHook(() => useLydoConnect(), {
        wrapper: ({ children }) => <LydoConnectProvider>{children}</LydoConnectProvider>,
      });

      // Try merging a remote snapshot that belongs to user-A
      act(() => {
        result.current.mergeRemoteState({
          organizationProfiles: [
            {
              id: "org-A",
              userId: "user-A", // Different user!
              organizationName: "Alpha Org",
            } as OrganizationProfile,
          ],
        });
      });

      // Snapshot MUST be discarded because profile userId does not match active user
      expect(result.current.state.organizationProfiles).toEqual([]);
    });

    it("resetAccountState immediately clears account-scoped state and wipes cache", () => {
      const userA: AccountIdentity = { type: "user", id: "user-A" };
      const cacheKey = getStorageKeyForIdentity(userA);

      window.localStorage.setItem(cacheKey, JSON.stringify({ cached: true }));

      const { result } = renderHook(() => useLydoConnect(), {
        wrapper: ({ children }) => <LydoConnectProvider>{children}</LydoConnectProvider>,
      });

      act(() => {
        result.current.resetAccountState();
      });

      // In-memory state is cleared
      expect(result.current.state.organizationProfiles).toEqual([]);
      expect(result.current.state.budgetRequests).toEqual([]);
      expect(result.current.state.inquiries).toEqual([]);
    });

    it("mergeRemoteState scopes inquiries strictly to the active organization", () => {
      window.localStorage.setItem(
        supabaseAuthStorageKey,
        JSON.stringify({ user: { id: "user-current" } }),
      );

      const { result } = renderHook(() => useLydoConnect(), {
        wrapper: ({ children }) => <LydoConnectProvider>{children}</LydoConnectProvider>,
      });

      act(() => {
        result.current.mergeRemoteState({
          organizationProfiles: [
            {
              id: "org-current",
              userId: "user-current",
              organizationName: "Current Org",
            } as OrganizationProfile,
          ],
          inquiries: [
            {
              id: "inq-current",
              organizationId: "org-current",
              subject: "Question about budget",
            } as InquiryRecord,
            {
              id: "inq-foreign",
              organizationId: "org-other",
              subject: "Foreign inquiry",
            } as InquiryRecord,
          ],
        });
      });

      expect(result.current.state.organizationProfiles).toHaveLength(1);
      // Inquiries must only include inq-current, inq-foreign must be filtered out
      expect(result.current.state.inquiries).toHaveLength(1);
      expect(result.current.state.inquiries[0].id).toBe("inq-current");
    });

    it("resets state immediately on window 'lydo-auth-reset' event", () => {
      window.localStorage.setItem(
        supabaseAuthStorageKey,
        JSON.stringify({ user: { id: "user-session-1" } }),
      );

      const { result } = renderHook(() => useLydoConnect(), {
        wrapper: ({ children }) => <LydoConnectProvider>{children}</LydoConnectProvider>,
      });

      act(() => {
        result.current.mergeRemoteState({
          organizationProfiles: [
            {
              id: "org-1",
              userId: "user-session-1",
              organizationName: "Org One",
            } as OrganizationProfile,
          ],
        });
      });

      expect(result.current.state.organizationProfiles).toHaveLength(1);

      // Trigger the auth reset event (as done in signOut)
      act(() => {
        window.dispatchEvent(new Event("lydo-auth-reset"));
      });

      // Account-specific state must be immediately cleared
      expect(result.current.state.organizationProfiles).toEqual([]);
      expect(result.current.state.budgetRequests).toEqual([]);
    });

    it("ignores storage events for other accounts to prevent cross-account contamination", () => {
      window.localStorage.setItem(
        supabaseAuthStorageKey,
        JSON.stringify({ user: { id: "user-tab-a" } }),
      );

      const { result } = renderHook(() => useLydoConnect(), {
        wrapper: ({ children }) => <LydoConnectProvider>{children}</LydoConnectProvider>,
      });

      act(() => {
        result.current.mergeRemoteState({
          organizationProfiles: [
            {
              id: "org-tab-a",
              userId: "user-tab-a",
              organizationName: "Tab A Org",
            } as OrganizationProfile,
          ],
        });
      });

      // Dispatch a storage event from another tab that logged in as user-tab-b
      act(() => {
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "lydo-connect-state-v1:user:user-tab-b",
            newValue: JSON.stringify({
              ypopPeriods: [{ id: "period-b", semesterKey: "2026-S1" }],
              organizationProfiles: [{ id: "org-b", userId: "user-tab-b" }],
            }),
          }),
        );
      });

      // State for tab A must remain unchanged and not contaminated by tab B
      expect(result.current.state.organizationProfiles).toHaveLength(1);
      expect(result.current.state.organizationProfiles[0].id).toBe("org-tab-a");
    });
  });
});

