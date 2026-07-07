import { useEffect, useState } from "react";

export type PwaPreferences = {
  textSize: "standard" | "large";
  reduceMotion: boolean;
  increaseContrast: boolean;
  underlineLinks: boolean;
  defaultLanding: "home" | "documents" | "budget" | "liquidation";
  showNotificationBadge: boolean;
};

const STORAGE_KEY = "ytrace-pwa-preferences-v1";
const CHANGE_EVENT = "ytrace-pwa-preferences-change";

export const defaultPwaPreferences: PwaPreferences = {
  textSize: "standard",
  reduceMotion: false,
  increaseContrast: false,
  underlineLinks: false,
  defaultLanding: "home",
  showNotificationBadge: true,
};

const readPreferences = (): PwaPreferences => {
  if (typeof window === "undefined") return defaultPwaPreferences;
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<PwaPreferences>;
    return { ...defaultPwaPreferences, ...stored };
  } catch {
    return defaultPwaPreferences;
  }
};

export function usePwaPreferences() {
  const [preferences, setPreferences] = useState<PwaPreferences>(readPreferences);

  useEffect(() => {
    const sync = () => setPreferences(readPreferences());
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const updatePreferences = (patch: Partial<PwaPreferences>) => {
    const next = { ...readPreferences(), ...patch };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setPreferences(next);
    window.dispatchEvent(new Event(CHANGE_EVENT));
  };

  return { preferences, updatePreferences };
}
