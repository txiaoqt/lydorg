import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderHook, act } from "@testing-library/react";
import {
  LydoConnectProvider,
  useLydoConnect,
  reconcileYpopEventParticipations,
  reconcileYpopOrgActivities,
  reconcileYpopEntries,
  pickNewerYpopRecord,
  parseIsoTimestamp,
} from "./lydo-connect-store";
import {
  type YPOPEventParticipation,
  type YPOPOrgActivity,
  type YPOPEntry,
  type YPOPCityActivity,
  type YPOPPeriod,
} from "./lydo-connect-data";

describe("YPOP Admin Status Flicker Prevention & Monotonic Synchronization", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
    }
  });
  const mockOrgId = "org-test-001";
  const mockSemesterKey = "S2-2026-09-01-01";
  const mockActivityId = "act-city-001";
  const mockEntryId = "entry-ypop-001";
  const mockOrgActivityId = "act-org-001";

  const validCityActivityIds = new Set([mockActivityId]);
  const validEntryIds = new Set([mockEntryId]);
  const validSemesterKeys = new Set([mockSemesterKey]);

  const baseParticipation: YPOPEventParticipation = {
    id: "part-001",
    activityId: mockActivityId,
    activityName: "City Leadership Summit",
    organizationId: mockOrgId,
    status: "pending_verification",
    adminRemarks: "",
    proofSubmittedAt: "2026-09-06T10:00:00.000Z",
    verifiedAt: "",
    revisionHistory: [],
    createdAt: "2026-09-06T10:00:00.000Z",
    updatedAt: "2026-09-06T10:00:00.000Z",
  };

  const baseOrgActivity: YPOPOrgActivity = {
    id: mockOrgActivityId,
    ypopEntryId: mockEntryId,
    organizationId: mockOrgId,
    activityName: "Community Clean-up",
    activityDate: "2026-09-08",
    venue: "Community Center",
    status: "submitted",
    adminRemarks: "",
    approvedAt: "",
    revisionHistory: [],
    createdAt: "2026-09-08T08:00:00.000Z",
    updatedAt: "2026-09-08T08:00:00.000Z",
  };

  const basePeriod: YPOPPeriod = {
    id: "period-001",
    semesterKey: mockSemesterKey,
    semesterLabel: "2026 Second Semester",
    validationDeadline: "2026-12-31T00:00:00.000Z",
    status: "open",
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
  };

  const baseCityActivity: YPOPCityActivity = {
    id: mockActivityId,
    semesterKey: mockSemesterKey,
    name: "City Leadership Summit",
    category: "mandatory",
    points: 15,
    date: "2026-09-06",
    venue: "City Hall",
    description: "Annual summit",
    createdAt: "2026-09-01T00:00:00.000Z",
  };

  // ── TEST 1 ─────────────────────────────────────────────────────────────
  it("TEST 1 — STALE REMOTE CANNOT OVERWRITE NEWER LOCAL (Verified preserved over stale Pending)", () => {
    const localParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "verified",
      verifiedAt: "2026-09-10T12:05:00.000Z",
      updatedAt: "2026-09-10T12:05:00.000Z", // T2 (Newer local mutation)
    };

    const staleRemoteParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "pending_verification",
      updatedAt: "2026-09-10T12:00:00.000Z", // T1 (Older pre-mutation snapshot)
    };

    const reconciled = reconcileYpopEventParticipations(
      [localParticipation],
      [staleRemoteParticipation],
      undefined,
      true, // Admin mode
      validCityActivityIds,
    );

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].status).toBe("verified");
    expect(reconciled[0].updatedAt).toBe("2026-09-10T12:05:00.000Z");
  });

  // ── TEST 2 ─────────────────────────────────────────────────────────────
  it("TEST 2 — NEWER REMOTE REPLACES OLDER LOCAL", () => {
    const localParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "pending_verification",
      updatedAt: "2026-09-10T12:00:00.000Z", // T1 (Older local state)
    };

    const newerRemoteParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "verified",
      verifiedAt: "2026-09-10T12:05:00.000Z",
      updatedAt: "2026-09-10T12:05:00.000Z", // T2 (Newer remote commit)
    };

    const reconciled = reconcileYpopEventParticipations(
      [localParticipation],
      [newerRemoteParticipation],
      undefined,
      true, // Admin mode
      validCityActivityIds,
    );

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].status).toBe("verified");
    expect(reconciled[0].updatedAt).toBe("2026-09-10T12:05:00.000Z");
  });

  // ── TEST 3 ─────────────────────────────────────────────────────────────
  it("TEST 3 — SAME TIMESTAMP (Deterministic tie-breaking: remote wins)", () => {
    const localParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "pending_verification",
      updatedAt: "2026-09-10T12:00:00.000Z",
    };

    const remoteParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "verified",
      updatedAt: "2026-09-10T12:00:00.000Z", // Equal timestamp
    };

    const reconciled = reconcileYpopEventParticipations(
      [localParticipation],
      [remoteParticipation],
      undefined,
      true,
      validCityActivityIds,
    );

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].status).toBe("verified");
  });

  // ── TEST 4 ─────────────────────────────────────────────────────────────
  it("TEST 4 — MISSING & MALFORMED TIMESTAMPS (Handled safely without error)", () => {
    // 4a. Local has valid timestamp, remote is missing -> local wins
    const localWithTime: YPOPEventParticipation = {
      ...baseParticipation,
      status: "verified",
      updatedAt: "2026-09-10T12:00:00.000Z",
    };
    const remoteNoTime: YPOPEventParticipation = {
      ...baseParticipation,
      status: "pending_verification",
      updatedAt: undefined,
    };
    const result4a = pickNewerYpopRecord(localWithTime, remoteNoTime);
    expect(result4a.status).toBe("verified");

    // 4b. Remote has valid timestamp, local is missing -> remote wins
    const localNoTime: YPOPEventParticipation = {
      ...baseParticipation,
      status: "pending_verification",
      updatedAt: undefined,
    };
    const remoteWithTime: YPOPEventParticipation = {
      ...baseParticipation,
      status: "verified",
      updatedAt: "2026-09-10T12:00:00.000Z",
    };
    const result4b = pickNewerYpopRecord(localNoTime, remoteWithTime);
    expect(result4b.status).toBe("verified");

    // 4c. Both missing -> deterministic fallback to remote
    const localEmptyTime: YPOPEventParticipation = {
      ...baseParticipation,
      status: "pending_verification",
      updatedAt: "",
    };
    const remoteEmptyTime: YPOPEventParticipation = {
      ...baseParticipation,
      status: "verified",
      updatedAt: "",
    };
    const result4c = pickNewerYpopRecord(localEmptyTime, remoteEmptyTime);
    expect(result4c.status).toBe("verified");

    // 4d. Malformed timestamp does not throw and parses safely as 0
    expect(parseIsoTimestamp("invalid-timestamp-string")).toBe(0);
    expect(parseIsoTimestamp(null)).toBe(0);
    expect(parseIsoTimestamp(undefined)).toBe(0);
  });

  // ── TEST 5 ─────────────────────────────────────────────────────────────
  it("TEST 5 — OUT-OF-ORDER REQUESTS (Older in-flight snapshot does not overwrite newer resolved state)", () => {
    const { result } = renderHook(() => useLydoConnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(LydoConnectProvider, null, children),
    });

    // Step 1: Initial state established with verified record at T2
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [
          {
            ...baseParticipation,
            status: "verified",
            updatedAt: "2026-09-10T12:05:00.000Z", // T2
          },
        ],
      });
    });

    expect(result.current.state.ypopEventParticipations[0].status).toBe("verified");

    // Step 2: An older snapshot arriving afterward (T1 = 12:00:00) is merged
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [
          {
            ...baseParticipation,
            status: "pending_verification",
            updatedAt: "2026-09-10T12:00:00.000Z", // Older T1
          },
        ],
      });
    });

    // State remains verified and does not regress to pending_verification
    expect(result.current.state.ypopEventParticipations[0].status).toBe("verified");
    expect(result.current.state.ypopEventParticipations[0].updatedAt).toBe("2026-09-10T12:05:00.000Z");
  });

  // ── TEST 6 ─────────────────────────────────────────────────────────────
  it("TEST 6 — BULK YPOP REVIEW (Status transitions monotonically to Verified without flickering back to Pending)", () => {
    const { result } = renderHook(() => useLydoConnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(LydoConnectProvider, null, children),
    });

    // Seed state with pending verification
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [
          {
            ...baseParticipation,
            status: "pending_verification",
            updatedAt: "2026-09-10T12:00:00.000Z",
          },
        ],
      });
    });

    expect(result.current.state.ypopEventParticipations[0].status).toBe("pending_verification");

    // 1. Admin confirms review -> updateYPOPEventParticipation executes
    const nowIso = "2026-09-10T12:02:00.000Z";
    act(() => {
      result.current.updateYPOPEventParticipation(baseParticipation.id, {
        status: "verified",
        verifiedAt: nowIso,
        updatedAt: nowIso,
      });
    });

    // State is immediately Verified
    expect(result.current.state.ypopEventParticipations[0].status).toBe("verified");

    // 2. Stale background snapshot (dispatched before mutation, containing pending_verification) arrives
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [
          {
            ...baseParticipation,
            status: "pending_verification",
            updatedAt: "2026-09-10T12:00:00.000Z", // Pre-mutation timestamp
          },
        ],
      });
    });

    // MUST NOT revert to pending_verification
    expect(result.current.state.ypopEventParticipations[0].status).toBe("verified");

    // 3. Post-mutation authoritative refresh arrives
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [
          {
            ...baseParticipation,
            status: "verified",
            verifiedAt: nowIso,
            updatedAt: nowIso,
          },
        ],
      });
    });

    // Remains Verified
    expect(result.current.state.ypopEventParticipations[0].status).toBe("verified");
  });

  // ── TEST 7 ─────────────────────────────────────────────────────────────
  it("TEST 7 — SINGLE YPOP REVIEW (Single review flow protected against stale overwrite)", () => {
    const { result } = renderHook(() => useLydoConnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(LydoConnectProvider, null, children),
    });

    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [baseParticipation],
      });
    });

    // Single item review mutation
    const verifiedTime = "2026-09-10T12:03:00.000Z";
    act(() => {
      result.current.updateYPOPEventParticipation(baseParticipation.id, {
        status: "verified",
        verifiedAt: verifiedTime,
        updatedAt: verifiedTime,
      });
    });

    expect(result.current.state.ypopEventParticipations[0].status).toBe("verified");

    // In-flight sync finishes with older status
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [baseParticipation],
      });
    });

    expect(result.current.state.ypopEventParticipations[0].status).toBe("verified");
  });

  // ── TEST 8 ─────────────────────────────────────────────────────────────
  it("TEST 8 — ORG-LED REVIEW (Protection against stale responses for ypopOrgActivities)", () => {
    const localActivity: YPOPOrgActivity = {
      ...baseOrgActivity,
      status: "approved",
      approvedAt: "2026-09-10T12:05:00.000Z",
      updatedAt: "2026-09-10T12:05:00.000Z", // T2
    };

    const staleRemoteActivity: YPOPOrgActivity = {
      ...baseOrgActivity,
      status: "submitted",
      updatedAt: "2026-09-10T12:00:00.000Z", // T1
    };

    const reconciled = reconcileYpopOrgActivities(
      [localActivity],
      [staleRemoteActivity],
      undefined,
      true, // Admin mode
      validEntryIds,
    );

    expect(reconciled).toHaveLength(1);
    expect(reconciled[0].status).toBe("approved");
    expect(reconciled[0].updatedAt).toBe("2026-09-10T12:05:00.000Z");
  });

  // ── TEST 9 ─────────────────────────────────────────────────────────────
  it("TEST 9 — USER REGRESSION (Admin updates propagate correctly to User)", () => {
    const userLocalParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "pending_verification",
      updatedAt: "2026-09-10T12:00:00.000Z", // Older user local state
    };

    const adminUpdatedRemoteParticipation: YPOPEventParticipation = {
      ...baseParticipation,
      status: "verified",
      verifiedAt: "2026-09-10T12:05:00.000Z",
      updatedAt: "2026-09-10T12:05:00.000Z", // Newer remote state from Admin review
    };

    const reconciledForUser = reconcileYpopEventParticipations(
      [userLocalParticipation],
      [adminUpdatedRemoteParticipation],
      [{ id: mockOrgId }],
      false, // User mode
      validCityActivityIds,
    );

    expect(reconciledForUser).toHaveLength(1);
    expect(reconciledForUser[0].status).toBe("verified");
    expect(reconciledForUser[0].verifiedAt).toBe("2026-09-10T12:05:00.000Z");
  });

  // ── TEST 10 ────────────────────────────────────────────────────────────
  it("TEST 10 — SEMESTER DELETION REGRESSION (Deleted YPOP periods and child activities remain removed)", () => {
    const { result } = renderHook(() => useLydoConnect(), {
      wrapper: ({ children }: { children: React.ReactNode }) =>
        React.createElement(LydoConnectProvider, null, children),
    });

    // Establish active period
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [basePeriod],
        ypopCityActivities: [baseCityActivity],
        ypopEventParticipations: [baseParticipation],
      });
    });

    expect(result.current.state.ypopPeriods).toHaveLength(1);
    expect(result.current.state.ypopEventParticipations).toHaveLength(1);

    // Admin deletes the semester
    act(() => {
      result.current.deleteYPOPPeriod(basePeriod.id);
    });

    expect(result.current.state.ypopPeriods).toHaveLength(0);
    expect(result.current.state.ypopCityActivities).toHaveLength(0);
    expect(result.current.state.ypopEventParticipations).toHaveLength(0);

    // A remote snapshot without this period arrives
    act(() => {
      result.current.mergeRemoteState({
        ypopPeriods: [], // Period deleted on server
        ypopCityActivities: [],
        ypopEventParticipations: [baseParticipation], // Stale orphaned participation
      });
    });

    // Remains completely pruned
    expect(result.current.state.ypopPeriods).toHaveLength(0);
    expect(result.current.state.ypopCityActivities).toHaveLength(0);
    expect(result.current.state.ypopEventParticipations).toHaveLength(0);
  });
});
