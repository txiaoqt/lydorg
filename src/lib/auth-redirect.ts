const AUTH_CALLBACK_PATH = "/auth/callback";
const PASSWORD_RESET_PATH = "/reset-password";

const cleanUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const joinUrl = (origin: string, path: string) => {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return `${normalizedOrigin}${path}`;
};

const withPwaAuthMarker = (value: string, pwaFlow: boolean) => {
  if (!pwaFlow) return value;
  try {
    const url = new URL(value, typeof window !== "undefined" ? window.location.origin : "https://ytrace.local");
    url.searchParams.set("pwa", "1");
    if (/^https?:/i.test(value)) return url.toString();
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
};

export const getAuthCallbackUrl = (options?: { pwaFlow?: boolean }) => {
  const explicitRedirectUrl = cleanUrl(import.meta.env.VITE_AUTH_REDIRECT_URL);
  if (explicitRedirectUrl) return withPwaAuthMarker(explicitRedirectUrl, Boolean(options?.pwaFlow));

  const configuredSiteUrl = cleanUrl(import.meta.env.VITE_SITE_URL);
  if (configuredSiteUrl) return withPwaAuthMarker(joinUrl(configuredSiteUrl, AUTH_CALLBACK_PATH), Boolean(options?.pwaFlow));

  if (typeof window !== "undefined" && window.location.origin) {
    return withPwaAuthMarker(joinUrl(window.location.origin, AUTH_CALLBACK_PATH), Boolean(options?.pwaFlow));
  }

  return withPwaAuthMarker(AUTH_CALLBACK_PATH, Boolean(options?.pwaFlow));
};

export const getPasswordResetUrl = (options?: { pwaFlow?: boolean }) => {
  const configuredSiteUrl = cleanUrl(import.meta.env.VITE_SITE_URL);
  if (configuredSiteUrl) return withPwaAuthMarker(joinUrl(configuredSiteUrl, PASSWORD_RESET_PATH), Boolean(options?.pwaFlow));

  if (typeof window !== "undefined" && window.location.origin) {
    return withPwaAuthMarker(joinUrl(window.location.origin, PASSWORD_RESET_PATH), Boolean(options?.pwaFlow));
  }

  return withPwaAuthMarker(PASSWORD_RESET_PATH, Boolean(options?.pwaFlow));
};
