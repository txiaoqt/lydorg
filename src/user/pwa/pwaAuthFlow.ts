export const PWA_ENTRY_ROUTE = "/app-start";
export const PWA_AUTH_MARKER = "ytrace-pwa-auth-flow";

export const pwaPublicRoute = (page: "help" | "faqs" | "contact" | "privacy" | "terms") =>
  `${PWA_ENTRY_ROUTE}/${page}`;

export const pwaAuthRoute = (route: "/signin" | "/signup" | "/verify-email" | "/auth/callback") =>
  `${route}?pwa=1`;

export const beginPwaAuthFlow = () => {
  if (typeof window !== "undefined") window.sessionStorage.setItem(PWA_AUTH_MARKER, "1");
};

export const endPwaAuthFlow = () => {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(PWA_AUTH_MARKER);
};

export const isPwaAuthFlow = (search = "") => {
  const requested = new URLSearchParams(search).get("pwa") === "1";
  const activeSession =
    typeof window !== "undefined" && window.sessionStorage.getItem(PWA_AUTH_MARKER) === "1";
  return requested || activeSession;
};
