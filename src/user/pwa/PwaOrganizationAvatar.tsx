import { useEffect, useState } from "react";
import { resolveSupabaseFileUrl } from "@/lib/lydo-connect-supabase";

// Signing freshness and concurrent requests belong to the session-scoped resolver.
// A second bucket/path cache here would bypass account-transition invalidation.
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
  const [resolvedUrl, setResolvedUrl] = useState("");
  const [authorizationRevision, setAuthorizationRevision] = useState(0);
  const [failedSource, setFailedSource] = useState("");
  const initial = organizationName.trim().charAt(0).toUpperCase() || "Y";

  useEffect(() => {
    const invalidate = () => { setResolvedUrl(""); setAuthorizationRevision(value => value + 1); };
    window.addEventListener("lydo-storage-authorization-change", invalidate);
    return () => window.removeEventListener("lydo-storage-authorization-change", invalidate);
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFailedSource("");
    if (!source) {
      setResolvedUrl("");
      return () => { cancelled = true; };
    }

    setResolvedUrl("");
    void resolveSupabaseFileUrl(source)
      .then((url) => {
        if (!cancelled) setResolvedUrl(url);
      })
      .catch(() => {
        if (!cancelled) setFailedSource(source);
      });
    return () => { cancelled = true; };
  }, [source, authorizationRevision]);

  return (
    <span className={className}>
      {resolvedUrl && failedSource !== source
        ? <img src={resolvedUrl} alt={`${organizationName} profile`} onError={() => {
          setFailedSource(source);
        }} />
        : <span aria-hidden="true">{initial}</span>}
    </span>
  );
}
