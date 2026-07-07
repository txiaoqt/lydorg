import { useEffect, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { PwaHeader } from "./PwaHeader";
import { PwaBottomNavigation } from "./PwaBottomNavigation";
import { usePwaNavigation } from "./hooks/usePwaNavigation";
import { usePwaPreferences } from "./hooks/usePwaPreferences";
import { usePwaRuntimeStatus } from "./hooks/usePwaRuntimeStatus";
import { getPwaParentRoute, PWA_ROUTES } from "./pwaRoutes";

export function PwaAppShell({
  title,
  organizationName,
  profileImageUrl,
  unreadCount,
  dashboard,
  children,
}: {
  title: string;
  organizationName: string;
  profileImageUrl?: string | null;
  unreadCount: number;
  dashboard?: boolean;
  children: ReactNode;
}) {
  const { go, back } = usePwaNavigation();
  const { pathname } = useLocation();
  const { preferences } = usePwaPreferences();
  const runtime = usePwaRuntimeStatus();

  const identityHeaderRoutes = new Set([
    PWA_ROUTES.home,
    PWA_ROUTES.documents,
    PWA_ROUTES.budgets,
    PWA_ROUTES.liquidations,
    PWA_ROUTES.more,
  ]);
  const pageHasInlineBackButton =
    pathname === PWA_ROUTES.activity ||
    pathname.startsWith(`${PWA_ROUTES.documents}/`) ||
    pathname.startsWith(`${PWA_ROUTES.budgets}/`) ||
    pathname.startsWith(`${PWA_ROUTES.liquidations}/`) ||
    pathname.startsWith(`${PWA_ROUTES.profile}/`) ||
    pathname.startsWith(`${PWA_ROUTES.ypop}/`) ||
    pathname.startsWith(`${PWA_ROUTES.templates}/`) ||
    pathname.startsWith(`${PWA_ROUTES.news}/`);
  const headerMode = identityHeaderRoutes.has(pathname) ? "identity" : "nested";
  const contentWidth = getPwaContentWidth(pathname);

  useEffect(() => {
    document.documentElement.classList.add("ytrace-pwa-active");
    document.body.classList.add("ytrace-pwa-active");
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    return () => {
      document.documentElement.classList.remove("ytrace-pwa-active");
      document.body.classList.remove("ytrace-pwa-active");
    };
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("ytrace-pwa-text-large", preferences.textSize === "large");
    root.classList.toggle("ytrace-pwa-reduce-motion", preferences.reduceMotion);
    return () => {
      root.classList.remove("ytrace-pwa-text-large", "ytrace-pwa-reduce-motion");
    };
  }, [preferences.reduceMotion, preferences.textSize]);

  return (
    <div className={[
      "ytrace-pwa-app",
      "pwa-authenticated-app",
      preferences.increaseContrast ? "pwa-high-contrast" : "",
      preferences.underlineLinks ? "pwa-underline-links" : "",
    ].filter(Boolean).join(" ")}>
      <div className={`pwa-app-frame pwa-shell-width-${contentWidth} ${pageHasInlineBackButton ? "pwa-app-frame--headerless" : ""}`}>
        {!pageHasInlineBackButton ? (
          <PwaHeader
            title={title}
            organizationName={organizationName}
            profileImageUrl={profileImageUrl}
            unreadCount={preferences.showNotificationBadge ? unreadCount : 0}
            mode={headerMode}
            dashboard={dashboard}
            onProfile={() => go(PWA_ROUTES.profile)}
            onBack={() => back(getPwaParentRoute(pathname))}
            onNotifications={() => go(PWA_ROUTES.notifications)}
          />
        ) : null}
        {!runtime.online ? (
          <section className="pwa-runtime-banner is-offline" role="status">
            <strong>You&apos;re offline.</strong>
            <span>Previously loaded information may still be available. Some actions will continue when your connection returns.</span>
          </section>
        ) : null}
        {runtime.updateState === "available" ? (
          <section className="pwa-runtime-banner is-update" role="status">
            <span><strong>A new Y-TRACE version is available.</strong></span>
            <button type="button" onClick={() => void runtime.updateApp()}>Update App</button>
          </section>
        ) : null}
        <main className={`pwa-main-content pwa-content--${contentWidth}`} aria-label={title}>{children}</main>
      </div>
      <PwaBottomNavigation />
    </div>
  );
}

function getPwaContentWidth(pathname: string): "narrow" | "medium" | "wide" {
  const narrowRoutes = [
    PWA_ROUTES.privacy,
    PWA_ROUTES.terms,
    PWA_ROUTES.faqs,
    PWA_ROUTES.contact,
    PWA_ROUTES.about,
    PWA_ROUTES.settingsNotifications,
    PWA_ROUTES.settingsAppearance,
    PWA_ROUTES.settingsStorage,
    PWA_ROUTES.settingsPreferences,
    PWA_ROUTES.settingsAccount,
  ];
  if (narrowRoutes.some((route) => pathname === route)) return "narrow";
  if (
    pathname === PWA_ROUTES.more ||
    pathname === PWA_ROUTES.settings ||
    pathname === PWA_ROUTES.profile ||
    pathname === PWA_ROUTES.notifications ||
    pathname === PWA_ROUTES.inquiries ||
    pathname === PWA_ROUTES.activity ||
    pathname.startsWith(`${PWA_ROUTES.ypop}/`) ||
    pathname.startsWith(`${PWA_ROUTES.profile}/`) ||
    pathname.startsWith(`${PWA_ROUTES.documents}/`) ||
    pathname.startsWith(`${PWA_ROUTES.budgets}/`) ||
    pathname.startsWith(`${PWA_ROUTES.liquidations}/`) ||
    pathname.includes("/ppa/")
  ) return "medium";
  return "wide";
}
