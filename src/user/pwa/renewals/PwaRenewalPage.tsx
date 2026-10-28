import { useState } from "react";
import { UserPortalRenewalWorkspaceView } from "@/components/portal/UserPortalRenewalWorkspaceView";
import { requestPwaDocumentPreview } from "@/lib/pwa-document-preview";
import {
  downloadPwaDocument,
  getPwaDocumentFilename,
  openPwaDocumentInNewTab,
} from "@/lib/pwa-renewal-document-actions";
import { toast } from "@/hooks/use-toast";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import { PWA_ROUTES } from "../pwaRoutes";

export function PwaRenewalPage({ data, history = false }: { data: ReturnType<typeof usePwaPortalData>; history?: boolean }) {
  const { go } = usePwaNavigation();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const approved = data.renewals.filter((item) => item.status === "approved");
  const active = history ? approved.find((item) => item.id === selectedId) ?? approved[0] ?? null
    : data.renewalState.activeRenewal ?? approved[0] ?? null;
  const openPreview = (url: string, fileName: string) =>
    requestPwaDocumentPreview(url, getPwaDocumentFilename(url, fileName));
  const openFile = async (url: string, fileName?: string) => {
    try {
      await downloadPwaDocument(url, getPwaDocumentFilename(url, fileName));
    } catch {
      toast({
        title: "Unable to download document",
        description: "This file could not be downloaded. Check your connection and try again.",
        variant: "destructive",
      });
    }
  };
  const openInNewTab = async (url: string) => {
    try {
      await openPwaDocumentInNewTab(url);
    } catch {
      toast({
        title: "Unable to open document",
        description: "This file could not be opened in a new tab. Check your connection and try again.",
        variant: "destructive",
      });
    }
  };
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
          openPreview={openPreview}
          openFile={openFile}
          openInNewTab={openInNewTab}
          onRenewalUpdated={() => { void data.refreshRenewals(); }}
        />
      )}
    </div>
  );
}
