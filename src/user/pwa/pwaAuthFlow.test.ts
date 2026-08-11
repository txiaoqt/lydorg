import { beforeEach, describe, expect, it } from "vitest";
import {
  beginPwaAuthFlow,
  endPwaAuthFlow,
  isPwaAuthFlow,
  PWA_ENTRY_ROUTE,
  pwaAuthRoute,
  pwaPublicRoute,
} from "./pwaAuthFlow";

describe("PWA public and authentication routes", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("uses fixed internal routes instead of arbitrary return URLs", () => {
    expect(PWA_ENTRY_ROUTE).toBe("/app-start");
    expect(pwaAuthRoute("/signin")).toBe("/signin?pwa=1");
    expect(pwaPublicRoute("privacy")).toBe("/app-start/privacy");
  });

  it("recognizes the explicit PWA query marker", () => {
    expect(isPwaAuthFlow("?pwa=1")).toBe(true);
    expect(isPwaAuthFlow("?pwa=0")).toBe(false);
  });

  it("retains and clears PWA auth origin within the current app session", () => {
    beginPwaAuthFlow();
    expect(isPwaAuthFlow("")).toBe(true);
    endPwaAuthFlow();
    expect(isPwaAuthFlow("")).toBe(false);
  });
});
