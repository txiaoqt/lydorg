import { describe, expect, it } from "vitest";
import { getRenewalClock } from "./use-renewal-clock";

describe("renewal clock", () => {
  it("breaks the remaining duration into days, hours, minutes, and seconds", () => {
    const now = new Date("2026-07-06T00:00:00.000Z").getTime();
    const expiresAt = "2026-07-08T03:04:05.000Z";

    expect(getRenewalClock(expiresAt, now)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
      isDue: false,
    });
  });

  it("stops at zero once renewal is due", () => {
    expect(getRenewalClock("2026-07-05T00:00:00.000Z", Date.now())).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      isDue: true,
    });
  });
});
