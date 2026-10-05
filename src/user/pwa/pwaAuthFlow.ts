import { IS_ADMIN_SURFACE } from "@/lib/deployment-surface";

export const PWA_ENTRY_ROUTE = "/app-start";
export const PWA_AUTH_MARKER = "ytrace-pwa-auth-flow";

export const pwaPublicRoute = (page: "help" | "faqs" | "contact" | "privacy" | "terms") =>
  `${PWA_ENTRY_ROUTE}/${page}`;

export const pwaAuthRoute = (
  route: "/signin" | "/signup" | "/verify-email" | "/reset-password" | "/auth/callback",
) => `${route}?pwa=1`;

export const beginPwaAuthFlow = () => {
  if (typeof window !== "undefined") window.sessionStorage.setItem(PWA_AUTH_MARKER, "1");
};

export const endPwaAuthFlow = () => {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(PWA_AUTH_MARKER);
};

export const isPwaAuthFlow = (search = "") => {
  // Admin installs and admin routes on the combined deployment use admin auth.
  if (IS_ADMIN_SURFACE || (typeof window !== "undefined"
    && /^\/admin(?:\/|$)/.test(window.location.pathname))) return false;

  const param = new URLSearchParams(search).get("pwa");
  if (param === "1") return true;
  if (param === "0") return false;
  const activeSession =
    typeof window !== "undefined" && window.sessionStorage.getItem(PWA_AUTH_MARKER) === "1";
  const isStandalone =
    typeof window !== "undefined" &&
    Boolean(
      window.matchMedia?.("(display-mode: standalone)").matches ||
        window.matchMedia?.("(display-mode: fullscreen)").matches ||
        (window.navigator as { standalone?: boolean })?.standalone === true,
    );
  return activeSession || isStandalone;
};
