import { describe, expect, it } from "vitest";
import type { OrganizationProfile, YPOPCityActivity, YPOPPeriod } from "./lydo-connect-data";
import {
  getYpopEventEndAt,
  getYpopEventJoinEligibility,
  isPastYpopActivityDate,
  YPOP_TIME_ZONE,
} from "./ypop-event-eligibility";

const activity: YPOPCityActivity = {
  id: "activity",
  semesterKey: "2026-1",
  name: "Youth Summit",
  date: "2026-06-30",
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

  it("allows only verified organizations in an open editable period", () => {
    expect(getYpopEventJoinEligibility({ activity, period, profile, now: new Date("2026-06-30T09:00:00Z") }).allowed).toBe(true);
    expect(getYpopEventJoinEligibility({ activity, period, profile, now: new Date("2026-06-30T16:00:00Z") }).reason).toBe("event_ended");
    expect(getYpopEventJoinEligibility({
      activity,
      period: { ...period, status: "closed" },
      profile,
      now: new Date("2026-06-30T09:00:00Z"),
    }).reason).toBe("period_closed");
  });
});
