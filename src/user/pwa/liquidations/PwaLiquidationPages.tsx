import { PortalWorkflowStatusHelper } from "@/components/portal/PortalWorkflowStatusHelper";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";
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

export function PwaLiquidationEligibilityNotice({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  const releasedBudget = data.liquidationWorkflowEligibility.releasedBudget;
  if (data.liquidationWorkflowEligibility.eligible) return null;
  const requirements = data.liquidationWorkflowEligibility.requirements;
  return (
    <section className="pwa-eligibility-notice">
      <ReceiptText aria-hidden="true" />
      <div>
        <h2>No liquidation report is available yet</h2>
        <p>Liquidation becomes available after an eligible budget is approved and released.</p>
        <ul className="pwa-requirement-list">
          {requirements.map((item) => (
            <li key={item.id} className={item.met ? "is-complete" : ""}>
              {item.met ? <Check /> : <Circle />}
              <span>{item.label}</span>
            </li>
          ))}
        </ul>
        <button
          type="button"
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
      </div>
    </section>
  );
}

export function PwaLiquidationList({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
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
  return (
    <div className="pwa-stack pwa-liquidation-list-page">
      <PwaLiquidationEligibilityNotice data={data} />
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
          <div className="pwa-card pwa-empty-copy">
            No liquidation reports have been created yet.
          </div>
        ) : null}
      </section>
      <OrganizationHistoryPagination page={page} totalPages={pageQuery.data?.totalPages ?? 1} totalCount={totalCount} pageSize={25} loading={pageQuery.isFetching} onPageChange={setPage} />
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
      {files.length ? <section className="pwa-card pwa-liquidation-attachment-editor">
        <h3>Attachments</h3>
        {files.map((file) => <div key={file.id} className="pwa-stack">
          <div className="pwa-selected-liquidation-file"><FileText aria-hidden="true" /><span><strong>{file.fileName}</strong><small>{Math.max(1, Math.round(file.fileSize / 1024))} KB</small></span></div>
          <PortalDocumentViewer previewUrl={file.fileUrl} previewTitle={file.fileName} previewCanInline className="pwa-liquidation-selected-preview" />
        </div>)}
      </section> : null}
      {report.status !== "completed_liquidated" && (submittableStatuses.has(report.status) || files.length > 0) ? <button type="button" className="pwa-primary-button" onClick={() => go(pwaLiquidationManageRoute(report.id))}><UploadCloud /> Manage Report</button> : null}
      {report.revisionHistory?.length ? <section className="pwa-card pwa-timeline"><h3>Status history</h3>{[...report.revisionHistory].reverse().map((item, index) => <article key={`${item.changedAt}-${index}`}><span /><div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.adminRemarks || "Status updated."}</p><time>{dateLabel(item.changedAt)}</time></div></article>)}</section> : null}
    </div>
  );
}

export function PwaLiquidationManager({ data }: { data: PortalData }) {
  const { reportId = "" } = useParams();
  const { go } = usePwaNavigation();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const busy = useRef(false);
  const organizationId = data.profile?.id ?? "";
  const detailQuery = useQuery({ queryKey: ["user", organizationId, "liquidation-detail-pwa", reportId], queryFn: () => loadOrganizationLiquidationReportById(organizationId, reportId), enabled: Boolean(organizationId && reportId) });
  const filesQuery = useQuery({ queryKey: ["user", organizationId, "liquidation-files-pwa", reportId], queryFn: () => loadOrganizationLiquidationReportFiles(organizationId, reportId), enabled: Boolean(organizationId && reportId) });
  const report = detailQuery.data ?? data.liquidationReports.find((item) => item.id === reportId);
  const budget = report ? data.budgetRequests.find((item) => item.id === report.budgetRequestId) ?? (report as ReportWithBudget).relatedBudget : null;
  const files = filesQuery.data ?? data.store.state.liquidationReportFiles.filter((item) => item.liquidationReportId === reportId);
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  useEffect(() => { setFile(null); setConfirmSubmit(false); }, [reportId]);
  if (detailQuery.isLoading || filesQuery.isLoading) return <p role="status" className="pwa-card">Loading liquidation report…</p>;
  if (detailQuery.isError || filesQuery.isError) return <section className="pwa-card"><p role="alert">Liquidation report could not be loaded.</p><button className="pwa-secondary-button" onClick={() => { void detailQuery.refetch(); void filesQuery.refetch(); }}>Try again</button></section>;
  if (!report) return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.liquidations} label="Liquidation" /><section className="pwa-card pwa-empty-copy">Liquidation report not found.</section></div>;
  const editable = submittableStatuses.has(report.status) && !isSubmissionRevisionLocked(report);
  const refresh = async () => { await data.refreshLiquidations(); await Promise.all([detailQuery.refetch(), filesQuery.refetch()]); };

  const remove = async (fileId: string, fileUrl: string) => {
    if (!editable || saving || busy.current) return;
    busy.current = true;
    setSaving(true);
    try {
      await deleteLiquidationReportFileInSupabase(fileId, fileUrl);
      queryClient.setQueryData(["user", organizationId, "liquidation-files-pwa", reportId], files.filter((item) => item.id !== fileId));
      await refresh();
      toast({ title: "Liquidation file removed" });
    } catch (error) {
      toast({ title: "Remove failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  const clearSelectedFile = () => {
    setFile(null);
    if (fileInput.current) fileInput.current.value = "";
  };

  const save = async (action: "draft" | "submitted", confirmed = false) => {
    if (!editable || saving || busy.current) return;
    if (!file && files.length !== 1) {
      toast({ title: "One attachment required", description: "Choose one liquidation PDF before saving or submitting.", variant: "destructive" });
      return;
    }
    if (action === "submitted" && !file && replacementStatuses.has(report.status) && !hasGenuineResubmission({ ...report, files })) {
      toast({ title: "Corrected file required", description: "Choose a corrected liquidation PDF before resubmitting.", variant: "destructive" });
      return;
    }
    if (action === "submitted" && !confirmed) { setConfirmSubmit(true); return; }
    setConfirmSubmit(false);
    busy.current = true;
    setSaving(true);
    const filesKey = ["user", organizationId, "liquidation-files-pwa", reportId];
    let currentFiles = files;
    try {
      if (file) {
        // Save the replacement first, so a failed upload retains the saved attachment.
        const uploaded = await createLiquidationReportFileInSupabase({ liquidationReportId: report.id, file });
        currentFiles = [...files, uploaded];
        queryClient.setQueryData(filesKey, currentFiles);
        clearSelectedFile();
        for (const existing of files) {
          await deleteLiquidationReportFileInSupabase(existing.id, existing.fileUrl);
          currentFiles = currentFiles.filter((item) => item.id !== existing.id);
          queryClient.setQueryData(filesKey, currentFiles);
        }
      }
      if (currentFiles.length !== 1) throw new Error("Keep one liquidation PDF before submitting. Remove any older attachment and try again.");
      if (action === "submitted" && replacementStatuses.has(report.status) && !hasGenuineResubmission({ ...report, files: currentFiles })) {
        throw new Error("Choose a corrected liquidation PDF before resubmitting.");
      }
      // Keep revision deadlines and activity completion status when saving an attachment.
      if (action === "submitted" || report.status === "not_started" || report.status === "draft") {
        const updated = await updateLiquidationReportInSupabase(report.id, { status: action });
        queryClient.setQueryData(["user", organizationId, "liquidation-detail-pwa", reportId], updated);
      }
      await refresh().catch(() => undefined);
      toast({ title: action === "draft" ? "Liquidation draft saved" : "Liquidation submitted", description: action === "draft" ? "Your PDF is saved. Submit for review when it is ready." : "The admin can now review your report." });
      if (action === "submitted") go(pwaLiquidationDetailRoute(report.id), { replace: true });
    } catch (error) {
      await refresh().catch(() => undefined);
      toast({ title: action === "draft" ? "Draft could not be saved" : "Report could not be submitted", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      busy.current = false;
      setSaving(false);
    }
  };

  return (
    <div className="pwa-stack">
      <PwaBackButton fallback={pwaLiquidationDetailRoute(report.id)} label="Report Details" />
      <section className="pwa-card pwa-workspace-intro"><h2>{budget?.activityTitle || "Liquidation report"}</h2><StatusBadge status={report.status} /><p>{nextStep(report.status)}</p></section>
      {files.length ? <section className="pwa-card pwa-file-list">
        <h3>Saved attachment</h3>
        {files.map((item) => <article key={item.id}><FileText /><span><strong>{item.fileName}</strong><small>{Math.max(1, Math.round(item.fileSize / 1024))} KB</small><button type="button" className="pwa-saved-file-preview" onClick={() => requestPwaDocumentPreview(item.fileUrl, item.fileName)}><Eye aria-hidden="true" /> View PDF</button></span>{editable ? <button type="button" disabled={saving} aria-label={`Remove saved file ${item.fileName}`} onClick={() => void remove(item.id, item.fileUrl)}><Trash2 /></button> : null}</article>)}
      </section> : null}
      {report.revisionDueAt ? <p className="pwa-card">Revision deadline: {dateLabel(report.revisionDueAt)}. {isSubmissionRevisionLocked(report) ? "This revision is locked. Contact PCYDO for assistance." : "Submit the corrected PDF before this deadline."}</p> : null}
      {editable ? <>
        <section className="pwa-card pwa-liquidation-attachment-editor">
          <h2>{files.length ? "Choose a replacement PDF" : "Liquidation PDF"}</h2>
          <p className="pwa-form-helper">Preview your PDF, then save a draft or submit it for review.</p>
          {!file ? <label className="pwa-file-control"><input ref={fileInput} type="file" disabled={saving} aria-label="Choose PDF file" accept=".pdf,application/pdf" onChange={(event) => {
            const selected = event.target.files?.[0];
            if (!selected) return;
            if (selected.type !== "application/pdf" || !/\.pdf$/i.test(selected.name) || !selected.size) {
              event.target.value = "";
              toast({ title: "Choose a PDF", description: "Select a non-empty PDF file for your liquidation report.", variant: "destructive" });
              return;
            }
            setFile(selected);
          }} /><FileText aria-hidden="true" /><span>Choose PDF file</span></label> : <>
            <div className="pwa-selected-liquidation-file"><FileText aria-hidden="true" /><span><strong>{file.name}</strong><small>{Math.max(1, Math.round(file.size / 1024))} KB · Not saved yet</small></span><button type="button" disabled={saving} aria-label="Remove selected PDF" onClick={clearSelectedFile}><Trash2 aria-hidden="true" /></button></div>
            <PortalDocumentViewer previewFile={file} previewTitle={file.name} previewCanInline className="pwa-liquidation-selected-preview" />
          </>}
          {file && files.length ? <p className="pwa-form-helper">This PDF will replace the saved attachment when you save or submit.</p> : null}
        </section>
        <div className="pwa-sticky-actions pwa-liquidation-save-actions">
          <button type="button" className="pwa-secondary-button" disabled={saving || (!file && files.length !== 1)} onClick={() => void save("draft")}>{saving ? <Loader2 className="pwa-spin" /> : null} Save Draft</button>
          <button type="button" className="pwa-primary-button" disabled={saving || (!file && files.length !== 1)} onClick={() => void save("submitted")}>{saving ? <Loader2 className="pwa-spin" /> : <ReceiptText />} Submit for Review</button>
        </div>
      </> : null}
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}><DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Submit this liquidation report?</DialogTitle><DialogDescription>PCYDO will review your attached liquidation PDF. Check the file before submitting; editing is locked during review.</DialogDescription></DialogHeader><p className="text-sm break-all">{file?.name || files[0]?.fileName}</p><DialogFooter><button className="pwa-secondary-button" onClick={() => setConfirmSubmit(false)}>Cancel</button><button className="pwa-primary-button" disabled={saving} onClick={() => void save("submitted", true)}>Submit for Review</button></DialogFooter></DialogContent></Dialog>
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
