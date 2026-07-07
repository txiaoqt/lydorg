import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PWA_ACCENT_THEME_IDS, PWA_ACCENT_THEMES } from "../pwaAccentThemes";
import { PwaAppearanceSettings } from "./PwaSettingsPages";

const STORAGE_KEY = "ytrace-pwa-preferences-v1";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

const renderAppearance = () => render(
  <MemoryRouter>
    <PwaAppearanceSettings />
  </MemoryRouter>,
);

describe("PwaAppearanceSettings", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows all grouped curated theme presets", () => {
    renderAppearance();

    for (const group of ["Blues", "Greens", "Warm", "Pinks", "Purples", "Neutral"]) {
      expect(screen.getByRole("heading", { name: group })).toBeInTheDocument();
    }

    expect(screen.getAllByRole("radio")).toHaveLength(18);
    for (const theme of PWA_ACCENT_THEME_IDS) {
      expect(screen.getByText(PWA_ACCENT_THEMES[theme].label)).toBeInTheDocument();
    }
  });

  it("selects the saved theme and previews a new selection before saving", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accentTheme: "mint", textSize: "large" }));
    const previewEvents: Array<string | null> = [];
    window.addEventListener("ytrace-pwa-theme-preview", (event) => {
      previewEvents.push((event as CustomEvent<{ theme: string | null }>).detail.theme);
    });

    renderAppearance();

    expect(screen.getByRole("radio", { name: /Mint/ })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: /Lavender/ }));

    expect(screen.getByRole("radio", { name: /Lavender/ })).toHaveAttribute("aria-checked", "true");
    expect(previewEvents).toContain("lavender");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({
      accentTheme: "mint",
      textSize: "large",
    });
  });

  it("saves selected app color without clearing accessibility preferences", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accentTheme: "mint", reduceMotion: true, underlineLinks: true }));

    renderAppearance();
    fireEvent.click(screen.getByRole("radio", { name: /Rose Pink/ }));
    fireEvent.click(screen.getByRole("button", { name: "Save Appearance" }));

    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({
      accentTheme: "rose-pink",
      reduceMotion: true,
      underlineLinks: true,
    });
  });

  it("reset selects Pasig Blue and still requires Save Appearance", () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ accentTheme: "lilac", increaseContrast: true }));

    renderAppearance();
    fireEvent.click(screen.getByRole("button", { name: "Reset to Pasig Blue" }));

    const appColor = screen.getByRole("radiogroup", { name: "App Color" });
    expect(within(appColor).getByRole("radio", { name: /Pasig Blue/ })).toHaveAttribute("aria-checked", "true");
    expect(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}")).toMatchObject({
      accentTheme: "lilac",
      increaseContrast: true,
    });
  });
});
