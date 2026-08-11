import { useEffect, useState } from "react";
import {
  DEFAULT_PWA_ACCENT_THEME,
  getPwaAccentTheme,
  updatePwaThemeColor,
  type PwaAccentTheme,
} from "../pwaAccentThemes";

export type PwaPreferences = {
  accentTheme: PwaAccentTheme;
  textSize: "standard" | "large";
  reduceMotion: boolean;
  increaseContrast: boolean;
  underlineLinks: boolean;
  defaultLanding: "home" | "documents" | "budget" | "liquidation";
  showNotificationBadge: boolean;
};

const STORAGE_KEY = "ytrace-pwa-preferences-v1";
const CHANGE_EVENT = "ytrace-pwa-preferences-change";
const THEME_PREVIEW_EVENT = "ytrace-pwa-theme-preview";

export const defaultPwaPreferences: PwaPreferences = {
  accentTheme: DEFAULT_PWA_ACCENT_THEME,
  textSize: "standard",
  reduceMotion: false,
  increaseContrast: false,
  underlineLinks: false,
  defaultLanding: "home",
  showNotificationBadge: true,
};

export const readPwaPreferences = (): PwaPreferences => {
  if (typeof window === "undefined") return defaultPwaPreferences;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<PwaPreferences>;
    return {
      ...defaultPwaPreferences,
      ...stored,
      accentTheme: getPwaAccentTheme(stored.accentTheme),
      textSize: stored.textSize === "large" ? "large" : defaultPwaPreferences.textSize,
      reduceMotion: stored.reduceMotion === true,
      increaseContrast: stored.increaseContrast === true,
      underlineLinks: stored.underlineLinks === true,
      defaultLanding: ["home", "documents", "budget", "liquidation"].includes(stored.defaultLanding ?? "")
        ? stored.defaultLanding as PwaPreferences["defaultLanding"]
        : defaultPwaPreferences.defaultLanding,
      showNotificationBadge: stored.showNotificationBadge === false ? false : defaultPwaPreferences.showNotificationBadge,
    };
  } catch {
    return defaultPwaPreferences;
  }
};

export function usePwaPreferences() {
  const [preferences, setPreferences] = useState<PwaPreferences>(readPwaPreferences);

  useEffect(() => {
    const sync = () => setPreferences(readPwaPreferences());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updatePreferences = (patch: Partial<PwaPreferences>) => {
    const next = { ...readPwaPreferences(), ...patch };
    next.accentTheme = getPwaAccentTheme(next.accentTheme);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPreferences(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { preferences, updatePreferences };
}

export function previewPwaAccentTheme(theme: PwaAccentTheme | null) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ theme: PwaAccentTheme | null }>(THEME_PREVIEW_EVENT, { detail: { theme } }));
}

export function usePwaActiveAccentTheme(savedTheme: PwaAccentTheme) {
  const [previewTheme, setPreviewTheme] = useState<PwaAccentTheme | null>(null);

  useEffect(() => {
    const syncPreview = (event: Event) => {
      const detail = (event as CustomEvent<{ theme: PwaAccentTheme | null }>).detail;
      setPreviewTheme(detail?.theme ? getPwaAccentTheme(detail.theme) : null);
    };
    window.addEventListener(THEME_PREVIEW_EVENT, syncPreview);
    return () => window.removeEventListener(THEME_PREVIEW_EVENT, syncPreview);
  }, []);

  const activeTheme = previewTheme ?? savedTheme;

  useEffect(() => {
    updatePwaThemeColor(activeTheme);
  }, [activeTheme]);

  return activeTheme;
}
