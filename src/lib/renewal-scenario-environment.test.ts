import { describe, it, expect } from "vitest";
import { isRenewalScenarioVisible, isStagingRenewalScenarioEnabled } from "./renewal-scenario-environment";
describe("existing renewal scenario availability", () => {
  const staging = { DEV: false, MODE: "production", VITE_SUPABASE_URL: "https://zroudsvpswqsjlyttkjf.supabase.co", VITE_ENABLE_STAGING_RENEWAL_SCENARIO: "true" };
  it("allows explicit staging builds using the existing feature", () => expect(isRenewalScenarioVisible(staging)).toBe(true));
  it.each([undefined, "false", "1"])("requires an explicit flag: %s", flag => expect(isStagingRenewalScenarioEnabled({ ...staging, VITE_ENABLE_STAGING_RENEWAL_SCENARIO: flag })).toBe(false));
  it.each([undefined, "https://mqqaykksadotbrghbexz.supabase.co", "https://unknown.supabase.co", "https://zroudsvpswqsjlyttkjf.supabase.co.evil.invalid"])("rejects another target: %s", url => expect(isRenewalScenarioVisible({ ...staging, VITE_SUPABASE_URL: url })).toBe(false));
  it("preserves existing development availability", () => expect(isRenewalScenarioVisible({ DEV: true, MODE: "development" })).toBe(true));
  it("keeps ordinary production builds disabled", () => expect(isRenewalScenarioVisible({ DEV: false, MODE: "production" })).toBe(false));
});
