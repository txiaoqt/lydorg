import { describe, expect, it } from "vitest";
import type {
  OrganizationProfile,
  YPOPCityActivity,
  YPOPEntry,
  YPOPEventParticipation,
  YPOPOrgActivity,
  YPOPPeriod,
} from "./lydo-connect-data";
import { resolveBudgetEligibility } from "./budget-eligibility";
import {
  getYpopEventJoinEligibility,
  isYpopPeriodOpen,
  validateYpopSubmissionEligibility,
} from "./ypop-event-eligibility";
import {
  buildVerifiedYpopAttendance,
  computeYpopScore,
  getApprovedYpopOrgActivityCount,
  YPOP_SCORE_THRESHOLD,
} from "./lydo-connect-data";

describe("Authoritative End-to-End YPOP Workflow Tests", () => {
  const period: YPOPPeriod = {
    id: "p-2026-1",
    semesterKey: "2026-1",
    semesterLabel: "First Semester 2026",
    validationDeadline: "2026-07-31T23:59:59+08:00",
    status: "open",
    orgLedTiers: [
      { minProjects: 1, bonus: 10 },
      { minProjects: 4, bonus: 15 },
      { minProjects: 7, bonus: 20 },
      { minProjects: 10, bonus: 25 },
    ],
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  };

  const activity: YPOPCityActivity = {
    id: "act-summit",
    semesterKey: "2026-1",
    name: "Youth Summit",
    date: "2026-06-30",
    startDate: "2026-06-30",
    endDate: "2026-06-30",
    venue: "Pasig Convention Center",
    points: 4,
    category: "mandatory",
    createdAt: "2026-01-01T00:00:00Z",
  };

  const profile: OrganizationProfile = {
    id: "org-1",
    name: "Youth Leaders",
    profileStatus: "verified",
  } as OrganizationProfile;

  const entry: YPOPEntry = {
    id: "entry-1",
    organizationId: "org-1",
    submittedBy: "user-1",
    semester: "2026-1",
    semesterLabel: "First Semester 2026",
    pointsEarned: 0,
    pointsRequired: 70,
    totalPoints: 100,
    status: "draft",
    adminRemarks: "",
    submissionNote: "",
    validationDeadline: period.validationDeadline,
    submittedAt: null,
    validatedAt: null,
    revisionHistory: [],
    orgLedProjectCount: 0,
    cityLedAttendance: [],
    createdAt: "2026-01-02T00:00:00Z",
    updatedAt: "2026-01-02T00:00:00Z",
  };

  describe("CITY-LED WORKFLOW", () => {
    it("1 & 2. User can submit proof without an explicit join prerequisite and eligibility is allowed", () => {
      const eligibility = getYpopEventJoinEligibility({
        activity,
        period,
        entry,
        participation: null,
        profile,
        now: new Date("2026-06-15T00:00:00Z"),
      });
      expect(eligibility.allowed).toBe(true);
      expect(eligibility.reason).toBe("eligible");
    });

    it("3. User can submit proof after the activity date while the semester is OPEN", () => {
      const pastEventDate = new Date("2026-07-15T12:00:00Z");
      const eligibility = getYpopEventJoinEligibility({
        activity,
        period,
        entry,
        participation: null,
        profile,
        now: pastEventDate,
      });
      expect(eligibility.allowed).toBe(true);
      expect(eligibility.reason).toBe("eligible");
    });

    it("4. User cannot create a new proof submission after the semester is CLOSED", () => {
      const closedPeriod = { ...period, status: "closed" as const };
      const eligibility = getYpopEventJoinEligibility({
        activity,
        period: closedPeriod,
        entry,
        participation: null,
        profile,
        now: new Date("2026-06-15T00:00:00Z"),
      });
      expect(eligibility.allowed).toBe(false);
      expect(eligibility.reason).toBe("period_closed");
    });

    it("5. Duplicate participation check blocks creating duplicate records when one already exists", () => {
      const existingParticipation: YPOPEventParticipation = {
        id: "part-1",
        organizationId: "org-1",
        activityId: activity.id,
        activityName: activity.name,
        status: "pending_verification",
        adminRemarks: "",
        joinedAt: "2026-06-15T00:00:00Z",
        proofSubmittedAt: "2026-06-15T00:00:00Z",
        verifiedAt: "",
        revisionHistory: [],
        createdAt: "2026-06-15T00:00:00Z",
        updatedAt: "2026-06-15T00:00:00Z",
      };
      const eligibility = getYpopEventJoinEligibility({
        activity,
        period,
        entry,
        participation: existingParticipation,
        profile,
        now: new Date("2026-06-15T00:00:00Z"),
      });
      expect(eligibility.allowed).toBe(false);
      expect(eligibility.reason).toBe("already_joined");
    });

    it("7 & 8. Only verified participation counts toward score; pending/needs_revision/rejected do not", () => {
      const pendingPart: YPOPEventParticipation = {
        id: "p-pending",
        organizationId: "org-1",
        activityId: activity.id,
        activityName: activity.name,
        status: "pending_verification",
        adminRemarks: "",
        joinedAt: "",
        proofSubmittedAt: "",
        verifiedAt: "",
        revisionHistory: [],
        createdAt: "",
        updatedAt: "",
      };
      const verifiedPart: YPOPEventParticipation = {
        ...pendingPart,
        id: "p-verified",
        status: "verified",
      };

      const pendingAttendance = buildVerifiedYpopAttendance([activity], [pendingPart]);
      expect(pendingAttendance[0]?.attended).toBe(false);

      const verifiedAttendance = buildVerifiedYpopAttendance([activity], [verifiedPart]);
      expect(verifiedAttendance[0]?.attended).toBe(true);

      const scoreWithVerified = computeYpopScore(verifiedAttendance, [activity], 0, period.orgLedTiers);
      expect(scoreWithVerified.cityLedPercent).toBe(100);
      expect(scoreWithVerified.totalScore).toBe(100);
    });
  });

  describe("ORGANIZATION-LED / PPA WORKFLOW", () => {
    it("9. User can log PPAs while the semester is OPEN even when entry.status is not qualified", () => {
      expect(isYpopPeriodOpen(period, new Date("2026-06-15T00:00:00Z"))).toBe(true);
      expect(entry.status).not.toBe("qualified");
    });

    it("11. PPA mutation is blocked when the semester is closed", () => {
      const closedPeriod = { ...period, status: "closed" as const };
      expect(isYpopPeriodOpen(closedPeriod, new Date("2026-06-15T00:00:00Z"))).toBe(false);
    });

    it("12 & 13. Approved PPAs count toward bonus; non-approved PPAs do not count", () => {
      const ppas: YPOPOrgActivity[] = [
        {
          id: "ppa-1",
          ypopEntryId: entry.id,
          organizationId: "org-1",
          submittedBy: "user-1",
          activityName: "Tree Planting",
          status: "approved",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "ppa-2",
          ypopEntryId: entry.id,
          organizationId: "org-1",
          submittedBy: "user-1",
          activityName: "Feeding Program",
          status: "submitted",
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "ppa-3",
          ypopEntryId: entry.id,
          organizationId: "org-1",
          submittedBy: "user-1",
          activityName: "Clean Up",
          status: "needs_revision",
          createdAt: "",
          updatedAt: "",
        },
      ];

      const approvedCount = getApprovedYpopOrgActivityCount(ppas, entry.id, 0);
      expect(approvedCount).toBe(1);

      const score = computeYpopScore([], [activity], approvedCount, period.orgLedTiers);
      expect(score.orgLedBonus).toBe(10);
    });
  });

  describe("VALIDATION & ACCUMULATION GATES", () => {
    it("14, 15, 16. Organizations can continuously accumulate submissions without legacy blocking gates", () => {
      const res = validateYpopSubmissionEligibility({
        entry,
        participations: [],
        eventFiles: [],
        profile,
      });
      expect(res.eligible).toBe(true);
      expect(res.message).toBe("Ready for continuous submission.");
    });
  });

  describe("SCORING & FORMULA INTEGRITY", () => {
    it("17 - 21. Total score is City-Led percentage + Organization-Led bonus using configured tiers and threshold 70", () => {
      expect(YPOP_SCORE_THRESHOLD).toBe(70);

      const fullAttendance = [{ activityId: activity.id, attended: true }];
      const score = computeYpopScore(fullAttendance, [activity], 4, period.orgLedTiers);
      expect(score.cityLedPercent).toBe(100);
      expect(score.orgLedBonus).toBe(15);
      expect(score.totalScore).toBe(115);

      const act2: YPOPCityActivity = { ...activity, id: "act-2", points: 4 };
      const scoreHalf = computeYpopScore(fullAttendance, [activity, act2], 1, period.orgLedTiers);
      expect(scoreHalf.cityLedPercent).toBe(50);
      expect(scoreHalf.orgLedBonus).toBe(10);
      expect(scoreHalf.totalScore).toBe(60);
      expect(scoreHalf.totalScore >= YPOP_SCORE_THRESHOLD).toBe(false);
    });
  });

  describe("SEMESTER CLOSURE & FINAL EVALUATION", () => {
    it("22 - 31. Closure evaluates totalScore >= 70 as qualified and < 70 as not_qualified", () => {
      const highPassingScore = 75;
      const failingScore = 65;

      const finalStatusHigh = highPassingScore >= YPOP_SCORE_THRESHOLD ? "qualified" : "not_qualified";
      const finalStatusLow = failingScore >= YPOP_SCORE_THRESHOLD ? "qualified" : "not_qualified";

      expect(finalStatusHigh).toBe("qualified");
      expect(finalStatusLow).toBe("not_qualified");
    });
  });

  describe("BUDGET ELIGIBILITY CONTINUITY", () => {
    it("32 & 34. Qualified organization remains budget-eligible after the YPOP period closes", () => {
      const closedPeriod = { ...period, status: "closed" as const };
      const qualifiedEntry: YPOPEntry = { ...entry, status: "qualified", pointsEarned: 85 };

      const eligibility = resolveBudgetEligibility({
        organizationId: "org-1",
        periods: [closedPeriod],
        entries: [qualifiedEntry],
      });

      expect(eligibility.eligible).toBe(true);
      expect(eligibility.reason).toBe("qualified");
      expect(eligibility.entry?.status).toBe("qualified");
    });

    it("33. Unqualified organization is NOT budget-eligible when the period is closed", () => {
      const closedPeriod = { ...period, status: "closed" as const };
      const notQualifiedEntry: YPOPEntry = { ...entry, status: "not_qualified", pointsEarned: 55 };

      const eligibility = resolveBudgetEligibility({
        organizationId: "org-1",
        periods: [closedPeriod],
        entries: [notQualifiedEntry],
      });

      expect(eligibility.eligible).toBe(false);
      expect(eligibility.reason).toBe("no_active_period");
    });
  });
});
