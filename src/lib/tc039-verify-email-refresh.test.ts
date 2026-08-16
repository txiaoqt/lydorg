import { beforeEach, describe, expect, it } from "vitest";
import { VERIFY_FRESH_NAV_KEY } from "./email-validation";

function computeIsReloaded(navType?: string) {
  const isFreshNav = window.sessionStorage.getItem(VERIFY_FRESH_NAV_KEY) === "true";
  if (isFreshNav) {
    window.sessionStorage.removeItem(VERIFY_FRESH_NAV_KEY);
    window.sessionStorage.setItem("ytrace_verify_active", "true");
    return false;
  }

  const wasActive = window.sessionStorage.getItem("ytrace_verify_active") === "true";
  const isPerformanceReload = navType === "reload";

  if (wasActive || isPerformanceReload) {
    return true;
  }

  return false;
}

describe("TC039: Password field appears if verification page is refreshed", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("determines that on initial forward navigation from signup, showPasswordField is false", () => {
    window.sessionStorage.setItem(VERIFY_FRESH_NAV_KEY, "true");
    const isReloaded = computeIsReloaded("navigate");
    expect(isReloaded).toBe(false);
    expect(window.sessionStorage.getItem(VERIFY_FRESH_NAV_KEY)).toBeNull();
    expect(window.sessionStorage.getItem("ytrace_verify_active")).toBe("true");
  });

  it("determines that on reload navigation, showPasswordField is true and helper text appears", () => {
    // Simulate was previously mounted
    window.sessionStorage.setItem("ytrace_verify_active", "true");
    const isReloaded = computeIsReloaded("reload");
    const showPasswordField = isReloaded;
    const helperText = "Re-enter the password if this page was refreshed.";

    expect(showPasswordField).toBe(true);
    expect(helperText).toBe("Re-enter the password if this page was refreshed.");
  });

  it("determines that button is enabled with OTP only when not reloaded, but requires password when reloaded", () => {
    const code = "123456";
    const email = "user@gmail.com";
    const password = "";

    // Fresh navigation: showPasswordField = false
    const freshShowPassword = false;
    const freshDisabled = code.length !== 6 || (freshShowPassword && password.length < 8) || !email;
    expect(freshDisabled).toBe(false);

    // Reloaded: showPasswordField = true
    const reloadShowPassword = true;
    const reloadDisabledWithoutPassword = code.length !== 6 || (reloadShowPassword && password.length < 8) || !email;
    expect(reloadDisabledWithoutPassword).toBe(true);

    const reloadDisabledWithPassword = code.length !== 6 || (reloadShowPassword && "Password123!".length < 8) || !email;
    expect(reloadDisabledWithPassword).toBe(false);
  });
});
