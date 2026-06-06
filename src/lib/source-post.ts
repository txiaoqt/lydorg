const FACEBOOK_HOST_PATTERN = /(^|\.)facebook\.com$/i;
const FACEBOOK_PLUGIN_PATH_PATTERN = /^\/plugins\/(post|video)\.php$/i;
const FACEBOOK_SHARE_PATH_PATTERN = /^\/share\//i;
const FACEBOOK_PAGE_PATH_PATTERN = /^\/(?!plugins\/|share\/|story\.php|photo\.php|permalink\.php|watch\b|reel\b|videos\b|posts\b|groups\b|events\b|pages\b)([^/]+)\/?$/i;

const isFacebookHost = (hostname: string) => FACEBOOK_HOST_PATTERN.test(hostname.toLowerCase());

const normalizeFacebookUrl = (url: URL) => {
  const normalized = new URL(url.toString());
  normalized.protocol = "https:";
  if (normalized.hostname.toLowerCase() === "m.facebook.com") {
    normalized.hostname = "www.facebook.com";
  }
  return normalized;
};

const decodeHref = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const normalizeSourcePostUrl = (rawUrl?: string | null): string | null => {
  const value = (rawUrl ?? "").trim();
  if (!value) return null;
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

export type FacebookEmbedIssue = {
  code: "share_link";
  message: string;
};

type ResolvedFacebookTarget = {
  targetUrl: URL;
  kind: "post" | "video" | "page";
  issue: FacebookEmbedIssue | null;
};

const resolveFacebookTarget = (sourcePostUrl?: string | null): ResolvedFacebookTarget | null => {
  const normalized = normalizeSourcePostUrl(sourcePostUrl);
  if (!normalized) return null;

  const parsed = new URL(normalized);
  if (!isFacebookHost(parsed.hostname)) return null;

  const normalizedUrl = normalizeFacebookUrl(parsed);

  if (FACEBOOK_PLUGIN_PATH_PATTERN.test(normalizedUrl.pathname)) {
    const href = normalizedUrl.searchParams.get("href");
    if (!href) return null;

    const nested = normalizeSourcePostUrl(decodeHref(href));
    if (!nested) return null;
    const nestedUrl = new URL(nested);
    if (!isFacebookHost(nestedUrl.hostname)) return null;

    const normalizedNestedUrl = normalizeFacebookUrl(nestedUrl);
    return {
      targetUrl: normalizedNestedUrl,
      kind: isVideoPostUrl(normalizedNestedUrl) ? "video" : "post",
      issue: FACEBOOK_SHARE_PATH_PATTERN.test(normalizedNestedUrl.pathname)
        ? {
            code: "share_link",
            message:
              "Facebook share links cannot be embedded reliably. Use the direct post permalink (open post timestamp, then copy link).",
          }
        : null,
    };
  }

  return {
    targetUrl: normalizedUrl,
    kind:
      isVideoPostUrl(normalizedUrl) ||
      /\/(posts|photos|photo\.php|permalink\.php|story\.php)\b/i.test(normalizedUrl.pathname) ||
      normalizedUrl.searchParams.has("fbid")
        ? "post"
        : FACEBOOK_PAGE_PATH_PATTERN.test(normalizedUrl.pathname)
          ? "page"
          : "page",
    issue: FACEBOOK_SHARE_PATH_PATTERN.test(normalizedUrl.pathname)
      ? {
          code: "share_link",
          message:
            "Facebook share links cannot be embedded reliably. Use the direct post permalink (open post timestamp, then copy link).",
        }
      : null,
  };
};

const isVideoPostUrl = (url: URL) => {
  const path = url.pathname.toLowerCase();
  if (path.includes("/reel/")) return true;
  if (path.includes("/videos/")) return true;
  if (path === "/watch" && Boolean(url.searchParams.get("v"))) return true;
  return false;
};

export const getFacebookEmbedIssue = (sourcePostUrl?: string | null): FacebookEmbedIssue | null =>
  resolveFacebookTarget(sourcePostUrl)?.issue ?? null;

export type FacebookEmbedConfig = {
  kind: "post" | "video" | "page";
  embedUrl: string;
};

export const toFacebookEmbedConfig = (sourcePostUrl?: string | null, width = 500): FacebookEmbedConfig | null => {
  const resolved = resolveFacebookTarget(sourcePostUrl);
  if (!resolved || resolved.issue) return null;

  const minimumWidth = resolved.kind === "post" ? 350 : 280;
  const safeWidth = Math.min(750, Math.max(minimumWidth, Math.round(width)));
  const href = encodeURIComponent(resolved.targetUrl.toString());
  if (isVideoPostUrl(resolved.targetUrl)) {
    return {
      kind: "video",
      embedUrl: `https://www.facebook.com/v19.0/plugins/video.php?href=${href}&show_text=false&width=${safeWidth}&adapt_container_width=true&locale=en_US`,
    };
  }

  if (resolved.kind === "page") {
    return {
      kind: "page",
      embedUrl: `https://www.facebook.com/v19.0/plugins/page.php?href=${href}&tabs=timeline&width=${safeWidth}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&locale=en_US`,
    };
  }

  return {
    kind: "post",
    embedUrl: `https://www.facebook.com/v19.0/plugins/post.php?href=${href}&show_text=true&width=${safeWidth}&height=640&adapt_container_width=true&locale=en_US`,
  };
};

export const toFacebookPostEmbedUrl = (sourcePostUrl?: string | null, width = 500): string | null =>
  toFacebookEmbedConfig(sourcePostUrl, width)?.embedUrl ?? null;
