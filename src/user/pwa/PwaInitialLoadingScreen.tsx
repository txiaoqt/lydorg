import { readPwaPreferences, usePwaActiveAccentTheme } from "./hooks/usePwaPreferences";
import { getPwaThemeStyle } from "./pwaAccentThemes";

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
      <img className="pwa-loading-mark" src="/y-trace-logo.png" alt="Y-TRACE" />
      <p>Loading Y-TRACE...</p>
    </div>
  );
}
