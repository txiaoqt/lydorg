const AUTH_CALLBACK_PATH = "/auth/callback";

const cleanUrl = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const joinUrl = (origin: string, path: string) => {
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return `${normalizedOrigin}${path}`;
};

export const getAuthCallbackUrl = () => {
  const explicitRedirectUrl = cleanUrl(import.meta.env.VITE_AUTH_REDIRECT_URL);
  if (explicitRedirectUrl) return explicitRedirectUrl;

  const configuredSiteUrl = cleanUrl(import.meta.env.VITE_SITE_URL);
  if (configuredSiteUrl) return joinUrl(configuredSiteUrl, AUTH_CALLBACK_PATH);

  if (typeof window !== "undefined" && window.location.origin) {
    return joinUrl(window.location.origin, AUTH_CALLBACK_PATH);
  }

  return AUTH_CALLBACK_PATH;
};
