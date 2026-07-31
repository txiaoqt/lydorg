import { readPwaPreferences, usePwaActiveAccentTheme } from "./hooks/usePwaPreferences";
import { getPwaThemeStyle } from "./pwaAccentThemes";
import BrandLogo from "@/components/BrandLogo";

export default function PwaInitialLoadingScreen() {
  const preferences = readPwaPreferences();
  const activeTheme = usePwaActiveAccentTheme(preferences.accentTheme);
  return (
    <div
      className="ytrace-pwa-app pwa-loading-screen"
      data-pwa-theme={activeTheme}
      style={getPwaThemeStyle(activeTheme)}
      role="status"
      aria-live="polite"
    >
      <BrandLogo showText={false} />
      <p>Loading Y-TRACE...</p>
    </div>
  );
}
