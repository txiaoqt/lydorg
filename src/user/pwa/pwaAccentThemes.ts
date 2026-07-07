import type { CSSProperties } from "react";

export type PwaAccentTheme =
  | "pasig-blue"
  | "sky-blue"
  | "powder-blue"
  | "aqua"
  | "mint"
  | "sage"
  | "pistachio"
  | "butter-yellow"
  | "lemon-cream"
  | "peach"
  | "soft-coral"
  | "blush-pink"
  | "rose-pink"
  | "lavender"
  | "lilac"
  | "periwinkle"
  | "soft-mauve"
  | "warm-gray";

export type PwaAccentThemePreset = {
  label: string;
  group: PwaAccentThemeGroup;
  accent: string;
  strong: string;
  hover: string;
  soft: string;
  muted: string;
  background: string;
  surfaceTint: string;
  borderTint: string;
  focusRing: string;
  onAccent: string;
};

export type PwaAccentThemeGroup = "Blues" | "Greens" | "Warm" | "Pinks" | "Purples" | "Neutral";

export const DEFAULT_PWA_ACCENT_THEME: PwaAccentTheme = "pasig-blue";

export const PWA_ACCENT_THEMES = {
  "pasig-blue": { label: "Pasig Blue", group: "Blues", accent: "#2D68AD", strong: "#1D4F88", hover: "#245C9C", soft: "#EAF3FF", muted: "#C7DCF4", background: "#F5F8FC", surfaceTint: "#F8FBFF", borderTint: "#BDD5EE", focusRing: "rgba(45, 104, 173, 0.28)", onAccent: "#FFFFFF" },
  "sky-blue": { label: "Sky Blue", group: "Blues", accent: "#4C8FC5", strong: "#326C9B", hover: "#3F7FB2", soft: "#EAF6FF", muted: "#C9E2F3", background: "#F7FCFF", surfaceTint: "#FAFDFF", borderTint: "#C5DEEF", focusRing: "rgba(76, 143, 197, 0.28)", onAccent: "#FFFFFF" },
  "powder-blue": { label: "Powder Blue", group: "Blues", accent: "#648DB5", strong: "#496D90", hover: "#557EA5", soft: "#EDF5FC", muted: "#CCDDEA", background: "#F8FBFD", surfaceTint: "#FBFDFF", borderTint: "#CBDCE9", focusRing: "rgba(100, 141, 181, 0.28)", onAccent: "#FFFFFF" },
  aqua: { label: "Aqua", group: "Blues", accent: "#3A929F", strong: "#276D77", hover: "#31818D", soft: "#E6F7F9", muted: "#BFE4E8", background: "#F6FCFD", surfaceTint: "#FAFEFE", borderTint: "#B9DFE3", focusRing: "rgba(58, 146, 159, 0.28)", onAccent: "#FFFFFF" },
  mint: { label: "Mint", group: "Greens", accent: "#3D9884", strong: "#29715F", hover: "#338673", soft: "#E7F8F2", muted: "#BEE5D9", background: "#F7FCFA", surfaceTint: "#FAFEFC", borderTint: "#B9DED3", focusRing: "rgba(61, 152, 132, 0.28)", onAccent: "#FFFFFF" },
  sage: { label: "Sage", group: "Greens", accent: "#718E72", strong: "#526C53", hover: "#637E64", soft: "#EFF6EE", muted: "#D2E0D0", background: "#FAFCF9", surfaceTint: "#FCFDFC", borderTint: "#CCDCC9", focusRing: "rgba(113, 142, 114, 0.28)", onAccent: "#FFFFFF" },
  pistachio: { label: "Pistachio", group: "Greens", accent: "#78934F", strong: "#596F39", hover: "#698243", soft: "#F1F7E7", muted: "#D7E5BD", background: "#FBFDF7", surfaceTint: "#FDFEF9", borderTint: "#D1DFB8", focusRing: "rgba(120, 147, 79, 0.28)", onAccent: "#FFFFFF" },
  "butter-yellow": { label: "Butter Yellow", group: "Warm", accent: "#A57416", strong: "#79540D", hover: "#906514", soft: "#FFF6D8", muted: "#EEDC9D", background: "#FFFDF5", surfaceTint: "#FFFEFA", borderTint: "#E9D793", focusRing: "rgba(165, 116, 22, 0.28)", onAccent: "#FFFFFF" },
  "lemon-cream": { label: "Lemon Cream", group: "Warm", accent: "#9A7A18", strong: "#71590D", hover: "#876B14", soft: "#FFF9D9", muted: "#ECE0A3", background: "#FFFDF4", surfaceTint: "#FFFEF9", borderTint: "#E6DA9B", focusRing: "rgba(154, 122, 24, 0.28)", onAccent: "#FFFFFF" },
  peach: { label: "Peach", group: "Warm", accent: "#C8754D", strong: "#9B5637", hover: "#B46643", soft: "#FFF0E8", muted: "#F1CDBA", background: "#FFF9F6", surfaceTint: "#FFFCFA", borderTint: "#EDC6B1", focusRing: "rgba(200, 117, 77, 0.28)", onAccent: "#FFFFFF" },
  "soft-coral": { label: "Soft Coral", group: "Warm", accent: "#D36C68", strong: "#A54C49", hover: "#BD5D59", soft: "#FDECEC", muted: "#F0C5C3", background: "#FFF8F8", surfaceTint: "#FFFBFB", borderTint: "#ECC0BE", focusRing: "rgba(211, 108, 104, 0.28)", onAccent: "#FFFFFF" },
  "blush-pink": { label: "Blush Pink", group: "Pinks", accent: "#C9678A", strong: "#9B496A", hover: "#B6587A", soft: "#FCECF3", muted: "#EFC9D8", background: "#FFF8FB", surfaceTint: "#FFFBFD", borderTint: "#EBC3D3", focusRing: "rgba(201, 103, 138, 0.28)", onAccent: "#FFFFFF" },
  "rose-pink": { label: "Rose Pink", group: "Pinks", accent: "#C35D78", strong: "#934157", hover: "#AE4F69", soft: "#FBEAF0", muted: "#EDC5D1", background: "#FFF8FA", surfaceTint: "#FFFBFC", borderTint: "#E7BECA", focusRing: "rgba(195, 93, 120, 0.28)", onAccent: "#FFFFFF" },
  lavender: { label: "Lavender", group: "Purples", accent: "#8869C8", strong: "#65499F", hover: "#775AB5", soft: "#F1ECFF", muted: "#D9CDF5", background: "#FAF8FF", surfaceTint: "#FCFBFF", borderTint: "#D3C6EF", focusRing: "rgba(136, 105, 200, 0.28)", onAccent: "#FFFFFF" },
  lilac: { label: "Lilac", group: "Purples", accent: "#9A70B5", strong: "#744F8D", hover: "#8860A2", soft: "#F5EDFA", muted: "#DFCCE9", background: "#FCF9FD", surfaceTint: "#FEFCFE", borderTint: "#D9C5E3", focusRing: "rgba(154, 112, 181, 0.28)", onAccent: "#FFFFFF" },
  periwinkle: { label: "Periwinkle", group: "Purples", accent: "#6F78C8", strong: "#50599D", hover: "#6069B5", soft: "#EEF0FF", muted: "#CED2F3", background: "#F9F9FF", surfaceTint: "#FCFCFF", borderTint: "#C8CCED", focusRing: "rgba(111, 120, 200, 0.28)", onAccent: "#FFFFFF" },
  "soft-mauve": { label: "Soft Mauve", group: "Purples", accent: "#9B718D", strong: "#755267", hover: "#89627B", soft: "#F6EDF3", muted: "#DECBD7", background: "#FCF9FB", surfaceTint: "#FEFCFD", borderTint: "#D8C5D1", focusRing: "rgba(155, 113, 141, 0.28)", onAccent: "#FFFFFF" },
  "warm-gray": { label: "Warm Gray", group: "Neutral", accent: "#77716B", strong: "#59544F", hover: "#68625D", soft: "#F3F1EF", muted: "#DCD7D2", background: "#FBFAF9", surfaceTint: "#FDFCFB", borderTint: "#D6D1CC", focusRing: "rgba(119, 113, 107, 0.28)", onAccent: "#FFFFFF" },
} as const satisfies Record<PwaAccentTheme, PwaAccentThemePreset>;

export const PWA_ACCENT_THEME_GROUPS: PwaAccentThemeGroup[] = ["Blues", "Greens", "Warm", "Pinks", "Purples", "Neutral"];

export const PWA_ACCENT_THEME_IDS = Object.keys(PWA_ACCENT_THEMES) as PwaAccentTheme[];

export function isValidPwaAccentTheme(value: unknown): value is PwaAccentTheme {
  return typeof value === "string" && value in PWA_ACCENT_THEMES;
}

export function getPwaAccentTheme(theme: unknown): PwaAccentTheme {
  return isValidPwaAccentTheme(theme) ? theme : DEFAULT_PWA_ACCENT_THEME;
}

export function getPwaThemeStyle(theme: PwaAccentTheme): CSSProperties {
  const preset = PWA_ACCENT_THEMES[theme];
  return {
    "--pwa-accent": preset.accent,
    "--pwa-accent-strong": preset.strong,
    "--pwa-accent-hover": preset.hover,
    "--pwa-accent-soft": preset.soft,
    "--pwa-accent-muted": preset.muted,
    "--pwa-theme-background": preset.background,
    "--pwa-theme-surface-tint": preset.surfaceTint,
    "--pwa-theme-border": preset.borderTint,
    "--pwa-focus-ring": preset.focusRing,
    "--pwa-on-accent": preset.onAccent,
  } as CSSProperties;
}

export function updatePwaThemeColor(theme: PwaAccentTheme) {
  if (typeof document === "undefined") return;
  const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  meta?.setAttribute("content", PWA_ACCENT_THEMES[theme].strong);
}
