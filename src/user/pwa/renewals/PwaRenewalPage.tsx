import { useState } from "react";
import { UserPortalRenewalWorkspaceView } from "@/components/portal/UserPortalRenewalWorkspaceView";
import { requestPwaDocumentPreview } from "@/lib/pwa-document-preview";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { PWA_ROUTES } from "../pwaRoutes";

export function PwaRenewalPage({ data, history = false }: { data: ReturnType<typeof usePwaPortalData>; history?: boolean }) {
  const { go } = usePwaNavigation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const approved = data.renewals.filter((item) => item.status === "approved");
  const active = history ? approved.find((item) => item.id === selectedId) ?? approved[0] ?? null
    : data.renewalState.activeRenewal ?? approved[0] ?? null;
  const openFile = async (url: string) => requestPwaDocumentPreview(url, decodeURIComponent(url.split(/[/?#]/).filter(Boolean).pop() || "Renewal document.pdf"));
  if (data.renewalsLoading) return <p role="status" className="pwa-empty-copy">Loading renewal cycles…</p>;
  if (data.renewalsError) return <section className="pwa-card"><p role="alert">Renewal cycles could not be loaded.</p><button className="pwa-secondary-button" onClick={() => void data.refreshRenewals()}>Retry</button></section>;
  return (
    <div className="pwa-stack pwa-shared-workspace pwa-renewal-page">
      <div className="pwa-filter-chips" aria-label="Renewal views">
        <button className={!history ? "is-active" : ""} onClick={() => go(PWA_ROUTES.renewal)}>Registration Renewal</button>
        <button className={history ? "is-active" : ""} onClick={() => go(PWA_ROUTES.renewals)}>Approved Renewals</button>
      </div>
      {!history ? <section className="pwa-card pwa-workspace-intro"><h2>{data.renewalState.statusLabel}</h2><p>{data.renewalState.adminRemarks || data.renewalState.renewalBlockedReason || "Review your renewal documents and follow the current administrative decision."}</p>{data.renewalState.expiresAt ? <p>Registration expires: {new Date(data.renewalState.expiresAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}</p> : null}</section> : null}
      {history && !approved.length ? <p className="pwa-card pwa-empty-copy">Approved renewal documents will appear here after your renewal is verified.</p> : (
        <UserPortalRenewalWorkspaceView
          currentProfile={data.profile}
          userRenewalState={data.renewalState}
          activeRenewal={active}
          readOnly={history}
          approvedRenewals={history ? approved : undefined}
          onActiveRenewalChange={(renewal) => setSelectedId(renewal.id)}
          navigate={go}
          userRouteMap={{ "organization-profile": PWA_ROUTES.profile, "document-submission": PWA_ROUTES.documents, "organization-renewal": PWA_ROUTES.renewal, renewals: PWA_ROUTES.renewals }}
          openPreview={openFile}
          openFile={(url) => { void openFile(url); }}
          onRenewalUpdated={() => { void data.refreshRenewals(); }}
        />
      )}
    </div>
  );
}
