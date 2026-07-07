import { useEffect, useState } from "react";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";

type CachedAvatar = { url: string; expiresAt: number };

const avatarUrlCache = new Map<string, CachedAvatar>();
const avatarRequestCache = new Map<string, Promise<string>>();
const AVATAR_URL_CACHE_MS = 50 * 60 * 1000;

const getCachedAvatarUrl = (source: string) => {
  const cached = avatarUrlCache.get(source);
  if (!cached) return "";
  if (cached.expiresAt <= Date.now()) {
    avatarUrlCache.delete(source);
    return "";
  }
  return cached.url;
};

const resolveAvatarUrl = (source: string) => {
  const cached = getCachedAvatarUrl(source);
  if (cached) return Promise.resolve(cached);

  const pending = avatarRequestCache.get(source);
  if (pending) return pending;

  const request = resolveSupabaseFileUrl(source)
    .then((url) => {
      avatarUrlCache.set(source, { url, expiresAt: Date.now() + AVATAR_URL_CACHE_MS });
      return url;
    })
    .finally(() => avatarRequestCache.delete(source));
  avatarRequestCache.set(source, request);
  return request;
};

export function PwaOrganizationAvatar({
  organizationName,
  profileImageUrl,
  className,
}: {
  organizationName: string;
  profileImageUrl?: string | null;
  className: string;
}) {
  const source = profileImageUrl?.trim() ?? "";
  const [resolvedUrl, setResolvedUrl] = useState(() => getCachedAvatarUrl(source));
  const [failedSource, setFailedSource] = useState("");
  const initial = organizationName.trim().charAt(0).toUpperCase() || "Y";

  useEffect(() => {
    let cancelled = false;
    setFailedSource("");
    if (!source) {
      setResolvedUrl("");
      return () => { cancelled = true; };
    }

    const cached = getCachedAvatarUrl(source);
    if (cached) {
      setResolvedUrl(cached);
      return () => { cancelled = true; };
    }

    setResolvedUrl("");
    void resolveAvatarUrl(source)
      .then((url) => {
        if (!cancelled) setResolvedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailedSource(source);
      });
    return () => { cancelled = true; };
  }, [source]);

  return (
    <span className={className}>
      {resolvedUrl && failedSource !== source
        ? <img src={resolvedUrl} alt={`${organizationName} profile`} onError={() => {
          avatarUrlCache.delete(source);
          setFailedSource(source);
        }} />
        : <span aria-hidden="true">{initial}</span>}
    </span>
  );
}
