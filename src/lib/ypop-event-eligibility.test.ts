import { describe, expect, it } from "vitest";
import type { OrganizationProfile, YPOPCityActivity, YPOPPeriod } from "./lydo-connect-data";
import {
  getYpopEventEndAt,
  getYpopEventJoinEligibility,
  isPastYpopActivityDate,
  validateYpopSubmissionEligibility,
  YPOP_TIME_ZONE,
} from "./ypop-event-eligibility";

const activity: YPOPCityActivity = {
  id: "activity",
  semesterKey: "2026-1",
  name: "Youth Summit",
  date: "2026-06-30",
  startDate: "2026-06-30",
  endDate: "2026-06-30",
  venue: "Pasig",
  points: 4,
  createdAt: "",
};
const period: YPOPPeriod = {
  id: "period",
  semesterKey: "2026-1",
  semesterLabel: "First Semester 2026",
  validationDeadline: "2026-07-31T23:59:59+08:00",
  status: "open",
  createdAt: "",
  updatedAt: "",
};
const profile = { profileStatus: "verified" } as OrganizationProfile;

describe("YPOP event eligibility", () => {
  it("uses the Asia/Manila end of day for date-only events", () => {
    expect(YPOP_TIME_ZONE).toBe("Asia/Manila");
    expect(getYpopEventEndAt("2026-06-30")?.toISOString()).toBe("2026-06-30T15:59:59.999Z");
    expect(isPastYpopActivityDate("2026-06-30", new Date("2026-06-30T15:59:59.998Z"))).toBe(false);
    expect(isPastYpopActivityDate("2026-06-30", new Date("2026-06-30T15:59:59.999Z"))).toBe(true);
  });

  it("treats timezone-less event times as Asia/Manila", () => {
    expect(getYpopEventEndAt("2026-06-30T17:00")?.toISOString()).toBe("2026-06-30T09:00:00.000Z");
  });

  it("allows submitting proof for an activity after the event date as long as the semester is open", () => {
    // Activity happened on 2026-06-30; user submits on 2026-07-15 while semester deadline is 2026-07-31
    const pastDate = new Date("2026-07-15T10:00:00Z");
    const res = getYpopEventJoinEligibility({ activity, period, profile, now: pastDate });
    expect(res.allowed).toBe(true);
    expect(res.reason).toBe("eligible");
  });

  it("blocks submitting proof when the semester period is closed", () => {
    const res = getYpopEventJoinEligibility({
      activity,
      period: { ...period, status: "closed" },
      profile,
      now: new Date("2026-06-30T09:00:00Z"),
    });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("period_closed");
  });

  it("blocks unverified organization profiles", () => {
    const unverifiedProfile = { profileStatus: "pending" } as OrganizationProfile;
    const res = getYpopEventJoinEligibility({ activity, period, profile: unverifiedProfile, now: new Date("2026-06-30T09:00:00Z") });
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("profile_unverified");
  });

  it("allows continuous semester accumulation without blocking on unproved activities", () => {
    // User can accumulate submissions without requiring all joined activities to have proof immediately
    const res = validateYpopSubmissionEligibility({ participations: [], profile });
    expect(res.eligible).toBe(true);
    expect(res.message).toBe("Ready for continuous submission.");
  });
});
