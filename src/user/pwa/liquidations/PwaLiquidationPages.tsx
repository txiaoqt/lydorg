import { PortalWorkflowStatusHelper } from "@/components/portal/PortalWorkflowStatusHelper";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check, ChevronRight, Circle, Eye, FileText, Loader2, ReceiptText, Trash2, UploadCloud,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import type { BudgetRequest, LiquidationReport, LiquidationStatus } from "@/lib/lydo-connect-data";
import {
  createLiquidationReportFileInSupabase,
  deleteLiquidationReportFileInSupabase,
  loadOrganizationLiquidationReportById,
  loadOrganizationLiquidationReportFiles,
  loadOrganizationLiquidationReportPage,
  updateLiquidationReportInSupabase,
} from "@/lib/lydo-connect-supabase";
import { PwaBackButton } from "../PwaBackButton";
import { requestPwaDocumentPreview } from "@/lib/pwa-document-preview";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { PWA_ROUTES, pwaBudgetDetailRoute, pwaLiquidationDetailRoute, pwaLiquidationManageRoute } from "../pwaRoutes";
import { OrganizationHistoryPagination } from "@/components/portal/OrganizationHistoryPagination";
import { isSubmissionRevisionLocked, hasGenuineResubmission } from "@/lib/revision-deadline";

type PortalData = ReturnType<typeof usePwaPortalData>;

const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const dateLabel = (value: string) => value ? new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Pending";
const submittableStatuses = new Set<LiquidationStatus>(["pending_activity_completion", "not_started", "draft", "needs_revision", "overdue", "rejected_red"]);
const replacementStatuses = new Set<LiquidationStatus>(["needs_revision", "rejected_red"]);
type ReportWithBudget = LiquidationReport & { relatedBudget?: Pick<BudgetRequest, "id" | "activityTitle" | "purposeCategory" | "venue" | "releasedAmount" | "approvedAmount"> | null };

export function PwaLiquidationList({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  const releasedBudget = data.liquidationWorkflowEligibility.releasedBudget;
  const [page, setPage] = useState(1);
  const organizationId = data.profile?.id ?? "";
  const pageQuery = useQuery({
    queryKey: ["user", organizationId, "liquidation-page-pwa", page, 25],
    queryFn: () => loadOrganizationLiquidationReportPage(organizationId, { page, pageSize: 25 }),
    enabled: Boolean(organizationId),
    placeholderData: (previous) => previous,
  });
  const reports = pageQuery.data?.rows ?? data.liquidationReports;
  const totalCount = pageQuery.data?.totalCount ?? data.liquidationReports.length;
  useEffect(() => setPage(1), [organizationId]);
  const managementTarget =
    reports.find((item) => submittableStatuses.has(item.status)) ?? reports[0];
  return (
    <div className="pwa-stack pwa-liquidation-list-page">
      <section className="pwa-compact-card-list">
        {reports.map((report) => {
          const budget = data.budgetRequests.find((item) => item.id === report.budgetRequestId) ?? (report as ReportWithBudget).relatedBudget;
          const overdue = (
            Boolean(report.deadlineAt) &&
            new Date(report.deadlineAt).getTime() < Date.now() &&
            report.status !== "completed_liquidated"
          );
          return (
            <button key={report.id} type="button" className="pwa-card pwa-transaction-card" onClick={() => go(pwaLiquidationDetailRoute(report.id))}>
              <span className="pwa-transaction-heading"><strong>{budget?.activityTitle || "Liquidation Report"}</strong><StatusBadge status={report.status} /></span>
              <span className="pwa-transaction-amount">{money.format(budget?.releasedAmount || budget?.approvedAmount || 0)} released</span>
              <span className="pwa-transaction-meta">
                <span><small>Go signal</small><strong>{dateLabel(report.goSignalAt)}</strong></span>
                <span className={overdue ? "is-overdue" : ""}><small>Deadline</small><strong>{dateLabel(report.deadlineAt)}</strong></span>
              </span>
              <span className="pwa-next-step">{nextStep(report.status)}</span>
              <span className="pwa-view-row">View Details <ChevronRight aria-hidden="true" /></span>
            </button>
          );
        })}
        {!totalCount ? (
          <section className="pwa-card pwa-contextual-empty">
            <span className="pwa-settings-hero-icon"><ReceiptText aria-hidden="true" /></span>
            <div>
              <h2>No liquidation report is available yet</h2>
              <p>Liquidation becomes available after an eligible budget is approved and released.</p>
            </div>
            <ul className="pwa-requirement-list">
              {data.liquidationWorkflowEligibility.requirements.map((item) => <li key={item.id} className={item.met ? "is-complete" : ""}>{item.met ? <Check /> : <Circle />}<span>{item.label}</span></li>)}
            </ul>
            <button
              type="button"
              className="pwa-secondary-button"
              onClick={() => {
                if (data.profile?.profileStatus !== "verified") go(PWA_ROUTES.profile);
                else if (!data.budgetEligibility.eligible) go(PWA_ROUTES.ypop);
                else if (releasedBudget) go(pwaBudgetDetailRoute(releasedBudget.id));
                else go(PWA_ROUTES.budgets);
              }}
            >
              {data.profile?.profileStatus !== "verified"
                ? "View Registration Status"
                : !data.budgetEligibility.eligible
                  ? "Open YPOP Incentive"
                  : releasedBudget
                    ? "View Released Budget"
                    : "View Budget Requests"}
              <ChevronRight aria-hidden="true" />
            </button>
          </section>
        ) : null}
      </section>
      <OrganizationHistoryPagination page={page} totalPages={pageQuery.data?.totalPages ?? 1} totalCount={totalCount} pageSize={25} loading={pageQuery.isFetching} onPageChange={setPage} />
      {managementTarget ? (
        <button type="button" className="pwa-primary-button" onClick={() => go(pwaLiquidationManageRoute(managementTarget.id))}><UploadCloud /> Upload or Manage Liquidation</button>
      ) : null}
    </div>
  );
}

export function PwaLiquidationDetail({ data }: { data: PortalData }) {
  const { reportId = "" } = useParams();
  const { go } = usePwaNavigation();
  const organizationId = data.profile?.id ?? "";
  const detailQuery = useQuery({
    queryKey: ["user", organizationId, "liquidation-detail-pwa", reportId],
    queryFn: () => loadOrganizationLiquidationReportById(organizationId, reportId),
    enabled: Boolean(organizationId && reportId),
  });
  const filesQuery = useQuery({
    queryKey: ["user", organizationId, "liquidation-files-pwa", reportId],
    queryFn: () => loadOrganizationLiquidationReportFiles(organizationId, reportId),
    enabled: Boolean(organizationId && reportId),
  });
  const report = detailQuery.data ?? data.liquidationReports.find((item) => item.id === reportId);
  const budget = report ? data.budgetRequests.find((item) => item.id === report.budgetRequestId) ?? (report as ReportWithBudget).relatedBudget : null;
  const files = filesQuery.data ?? data.store.state.liquidationReportFiles.filter((item) => item.liquidationReportId === reportId);
  if (detailQuery.isLoading || filesQuery.isLoading) return <p role="status" className="pwa-card">Loading liquidation report…</p>;
  if (detailQuery.isError || filesQuery.isError) return <section className="pwa-card"><p role="alert">Liquidation report could not be loaded.</p><button className="pwa-secondary-button" onClick={() => { void detailQuery.refetch(); void filesQuery.refetch(); }}>Try again</button></section>;
  if (!report) return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.liquidations} label="Liquidation" /><section className="pwa-card pwa-empty-copy">Liquidation report not found.</section></div>;
  const overdue = Boolean(report.deadlineAt) && new Date(report.deadlineAt).getTime() < Date.now() && report.status !== "completed_liquidated";

  const openFile = (reference: string, title: string) => requestPwaDocumentPreview(reference, title);

  return (
    <div className="pwa-stack">
      <PwaBackButton fallback={PWA_ROUTES.liquidations} label="Liquidation" />
      <PortalWorkflowStatusHelper workflow="liquidation" status={report.status} />
      <section className="pwa-card pwa-transaction-detail">
        <div className="pwa-detail-title"><div><small>Liquidation report</small><h2>{budget?.activityTitle || "Approved budget"}</h2></div><StatusBadge status={report.status} /></div>
        <strong className="pwa-detail-amount">{money.format(budget?.releasedAmount || budget?.approvedAmount || 0)} released</strong>
        <dl>
          <div><dt>Go signal</dt><dd>{dateLabel(report.goSignalAt)}</dd></div>
          <div className={overdue ? "is-overdue" : ""}><dt>Deadline</dt><dd>{dateLabel(report.deadlineAt)}</dd></div>
          <div><dt>Attached files</dt><dd>{files.length}</dd></div>
          <div><dt>Updated</dt><dd>{dateLabel(report.updatedAt)}</dd></div>
        </dl>
        {report.remarks ? <div className="pwa-admin-note"><strong>Admin remarks</strong><p>{report.remarks}</p></div> : null}
      </section>
      {files.length ? <section className="pwa-card pwa-file-list"><h3>Attachments</h3>{files.map((file) => <button type="button" key={file.id} onClick={() => openFile(file.fileUrl, file.fileName)}><FileText /><span><strong>{file.fileName}</strong><small>{Math.max(1, Math.round(file.fileSize / 1024))} KB</small></span><Eye /></button>)}</section> : null}
      {(submittableStatuses.has(report.status) || files.length) ? <button type="button" className="pwa-primary-button" onClick={() => go(pwaLiquidationManageRoute(report.id))}><UploadCloud /> Manage Report</button> : null}
      {report.revisionHistory?.length ? <section className="pwa-card pwa-timeline"><h3>Status history</h3>{[...report.revisionHistory].reverse().map((item, index) => <article key={`${item.changedAt}-${index}`}><span /><div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.adminRemarks || "Status updated."}</p><time>{dateLabel(item.changedAt)}</time></div></article>)}</section> : null}
    </div>
  );
}

export function PwaLiquidationManager({ data }: { data: PortalData }) {
  const { reportId = "" } = useParams();
  const { go } = usePwaNavigation();
  const organizationId = data.profile?.id ?? "";
  const detailQuery = useQuery({ queryKey: ["user", organizationId, "liquidation-detail-pwa", reportId], queryFn: () => loadOrganizationLiquidationReportById(organizationId, reportId), enabled: Boolean(organizationId && reportId) });
  const filesQuery = useQuery({ queryKey: ["user", organizationId, "liquidation-files-pwa", reportId], queryFn: () => loadOrganizationLiquidationReportFiles(organizationId, reportId), enabled: Boolean(organizationId && reportId) });
  const report = detailQuery.data ?? data.liquidationReports.find((item) => item.id === reportId);
  const budget = report ? data.budgetRequests.find((item) => item.id === report.budgetRequestId) ?? (report as ReportWithBudget).relatedBudget : null;
  const files = filesQuery.data ?? data.store.state.liquidationReportFiles.filter((item) => item.liquidationReportId === reportId);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  if (detailQuery.isLoading || filesQuery.isLoading) return <p role="status" className="pwa-card">Loading liquidation report…</p>;
  if (detailQuery.isError || filesQuery.isError) return <section className="pwa-card"><p role="alert">Liquidation report could not be loaded.</p><button className="pwa-secondary-button" onClick={() => { void detailQuery.refetch(); void filesQuery.refetch(); }}>Try again</button></section>;
  if (!report) return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.liquidations} label="Liquidation" /><section className="pwa-card pwa-empty-copy">Liquidation report not found.</section></div>;
  const editable = submittableStatuses.has(report.status) && !isSubmissionRevisionLocked(report);
  const refresh = async () => { await data.refreshLiquidations(); await Promise.all([detailQuery.refetch(), filesQuery.refetch()]); };

  const upload = async () => {
    if (!file || !editable || saving) return;
    if (files.length && !replacementStatuses.has(report.status)) {
      toast({ title: "Only one file allowed", description: "Remove the current file before uploading another.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await createLiquidationReportFileInSupabase({ liquidationReportId: report.id, file });
      if (files.length && replacementStatuses.has(report.status)) {
        for (const existing of files) await deleteLiquidationReportFileInSupabase(existing.id, existing.fileUrl);
      }
      await refresh();
      setFile(null);
      toast({ title: files.length ? "Liquidation file replaced" : "Liquidation file uploaded" });
    } catch (error) {
      await refresh().catch(() => undefined);
      toast({ title: "Upload failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (fileId: string, fileUrl: string) => {
    if (!editable || saving) return;
    setSaving(true);
    try {
      await deleteLiquidationReportFileInSupabase(fileId, fileUrl);
      await refresh();
      toast({ title: "Liquidation file removed" });
    } catch (error) {
      toast({ title: "Remove failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const submit = async (confirmed = false) => {
    if (!editable || saving) return;
    const currentFiles = files;
    if (currentFiles.length !== 1) {
      toast({ title: "One attachment required", description: "Keep one corrected liquidation PDF before submitting. If a replacement was interrupted, remove the older file first.", variant: "destructive" });
      return;
    }
    if (replacementStatuses.has(report.status) && !hasGenuineResubmission({ ...report, files: currentFiles })) {
      toast({ title: "Corrected file required", description: "Replace the reviewed liquidation PDF before resubmitting.", variant: "destructive" });
      return;
    }
    if (!confirmed) { setConfirmSubmit(true); return; }
    setConfirmSubmit(false);
    setSaving(true);
    try {
      await updateLiquidationReportInSupabase(report.id, { status: "submitted" });
      await refresh();
      toast({ title: "Liquidation submitted", description: "The admin can now review your report." });
      go(pwaLiquidationDetailRoute(report.id), { replace: true });
    } catch (error) {
      toast({ title: "Submit failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="pwa-stack">
      <PwaBackButton fallback={pwaLiquidationDetailRoute(report.id)} label="Report Details" />
      <section className="pwa-card pwa-workspace-intro"><h2>{budget?.activityTitle || "Liquidation report"}</h2><StatusBadge status={report.status} /><p>{nextStep(report.status)}</p></section>
      <section className="pwa-card pwa-file-list">
        <h3>Current attachment</h3>
        {files.map((item) => <article key={item.id}><FileText /><span><strong>{item.fileName}</strong><small>{Math.max(1, Math.round(item.fileSize / 1024))} KB</small></span>{editable ? <button type="button" disabled={saving} aria-label="Remove file" onClick={() => void remove(item.id, item.fileUrl)}><Trash2 /></button> : null}</article>)}
        {!files.length ? <p className="pwa-empty-copy">No liquidation file uploaded.</p> : null}
      </section>
      {report.revisionDueAt ? <p className="pwa-card">Revision deadline: {dateLabel(report.revisionDueAt)}. {isSubmissionRevisionLocked(report) ? "This revision is locked. Contact PCYDO for assistance." : "Submit the corrected PDF before this deadline."}</p> : null}
      {editable ? (
        <section className="pwa-card pwa-native-form">
          <h2>{files.length && replacementStatuses.has(report.status) ? "Replace file" : "Upload file"}</h2>
          <label className="pwa-file-control"><input type="file" accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><span>{file?.name || "Choose PDF file"}</span></label>
          <button type="button" className="pwa-secondary-button" disabled={!file || saving} onClick={() => void upload()}>{saving ? <Loader2 className="pwa-spin" /> : <UploadCloud />} Upload File</button>
        </section>
      ) : null}
      {editable ? <button type="button" className="pwa-primary-button" disabled={saving} onClick={() => void submit()}>{saving ? <Loader2 className="pwa-spin" /> : <ReceiptText />} Submit for Review</button> : null}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}><DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Submit this liquidation report?</DialogTitle><DialogDescription>PCYDO will review your attached liquidation PDF. Check the file before submitting; editing is locked during review.</DialogDescription></DialogHeader><p className="text-sm break-all">{files[0]?.fileName}</p><DialogFooter><button className="pwa-secondary-button" onClick={() => setConfirmSubmit(false)}>Cancel</button><button className="pwa-primary-button" disabled={saving} onClick={() => void submit(true)}>Submit for Review</button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}

function nextStep(status: LiquidationStatus) {
  if (status === "pending_activity_completion") return "Complete the activity before submitting the report.";
  if (status === "not_started" || status === "draft") return "Upload the required liquidation file.";
  if (status === "needs_revision" || status === "rejected_red") return "Review the remarks and upload a corrected file.";
  if (status === "overdue") return "Submit the overdue report as soon as possible.";
  if (status === "submitted" || status === "under_review") return "Your report is awaiting admin review.";
  if (status === "approved_for_ftf_green") return "Submit the required hard copy onsite.";
  if (status === "hard_copy_submitted") return "Hard copy received; awaiting completion.";
  return "Liquidation requirements completed.";
}
