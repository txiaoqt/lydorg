import { describe, expect, it, beforeEach } from "vitest";
import { DEFAULT_PWA_ACCENT_THEME } from "../pwaAccentThemes";
import { readPwaPreferences } from "./usePwaPreferences";

const STORAGE_KEY = "ytrace-pwa-preferences-v1";

describe("readPwaPreferences", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults missing accent themes to Pasig Blue", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ textSize: "large", reduceMotion: true }));

    expect(readPwaPreferences()).toMatchObject({
      accentTheme: DEFAULT_PWA_ACCENT_THEME,
      textSize: "large",
      reduceMotion: true,
    });
  });

  it("keeps valid accent themes and existing accessibility preferences", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({
      accentTheme: "blush-pink",
      textSize: "large",
      increaseContrast: true,
      underlineLinks: true,
      showNotificationBadge: false,
    }));

    expect(readPwaPreferences()).toMatchObject({
      accentTheme: "blush-pink",
      textSize: "large",
      increaseContrast: true,
      underlineLinks: true,
      showNotificationBadge: false,
    });
  });

  it("falls back safely when an unknown theme is stored", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accentTheme: "neon-lime", defaultLanding: "budget" }));

    expect(readPwaPreferences()).toMatchObject({
      accentTheme: DEFAULT_PWA_ACCENT_THEME,
      defaultLanding: "budget",
    });
  });

  it("falls back safely when stored JSON is invalid", () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");

    expect(readPwaPreferences().accentTheme).toBe(DEFAULT_PWA_ACCENT_THEME);
  });
});
