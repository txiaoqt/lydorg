import { PortalWorkflowStatusHelper } from "@/components/portal/PortalWorkflowStatusHelper";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check, ChevronRight, Circle, FileText, Loader2, Pencil, Plus, Upload, WalletCards,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatAdvocacyLabel, getBudgetRequestStatusLabel, type BudgetRequest } from "@/lib/lydo-connect-data";
import {
  createBudgetRequestInSupabase,
  loadOrganizationBudgetRequestById,
  loadOrganizationBudgetRequestFiles,
  loadOrganizationBudgetRequestPage,
  updateBudgetRequestInSupabase,
  uploadBudgetRequestFileToSupabase,
} from "@/lib/lydo-connect-supabase";
import { PwaBackButton } from "../PwaBackButton";
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { PWA_ROUTES, pwaBudgetDetailRoute, pwaBudgetEditRoute } from "../pwaRoutes";
import { OrganizationHistoryPagination } from "@/components/portal/OrganizationHistoryPagination";
import { isRevisionExpired, isSubmissionRevisionLocked, isAwaitingResubmission } from "@/lib/revision-deadline";

type PortalData = ReturnType<typeof usePwaPortalData>;
type Filter = "all" | "draft" | "review" | "revision" | "approved";

const canEditBudget = (request: BudgetRequest) => request.status === "draft" || (request.status === "needs_revision" && !isRevisionExpired(request.revisionDueAt) && !isSubmissionRevisionLocked(request));
const reviewStatuses = new Set(["submitted", "under_review"]);
const approvedStatuses = new Set(["awaiting_release", "approved_for_ftf_green", "hard_copy_submitted", "budget_released"]);
const money = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP", maximumFractionDigits: 0 });
const dateLabel = (value: string) => value ? new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" }) : "Not set";

const filterOptions: Array<{ id: Filter; label: string }> = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "review", label: "Under Review" },
  { id: "revision", label: "Needs Revision" },
  { id: "approved", label: "Approved / Released" },
];

export function PwaEligibilityNotice({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  if (data.budgetWorkflowEligibility.eligible) return null;
  const requirements = data.budgetWorkflowEligibility.requirements;
  return (
    <section className={`pwa-eligibility-notice ${data.budgetEligibility.reason === "ypop_not_qualified" ? "is-rejected" : ""}`}>
      <WalletCards aria-hidden="true" />
      <div>
        <h2>Budget request unavailable</h2>
        <p>Complete the requirements below before submitting a budget request.</p>
        <ul className="pwa-requirement-list">
          {requirements.map((item) => <li key={item.label} className={item.met ? "is-complete" : ""}>{item.met ? <Check /> : <Circle />}<span>{item.label}</span></li>)}
        </ul>
        <button type="button" onClick={() => go(!data.budgetWorkflowEligibility.profileComplete ? PWA_ROUTES.profile : !data.budgetWorkflowEligibility.documentsSatisfied ? PWA_ROUTES.documents : PWA_ROUTES.ypop)}>Review Requirements<ChevronRight /></button>
      </div>
    </section>
  );
}

export function PwaBudgetList({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const organizationId = data.profile?.id ?? "";
  const statuses = filter === "draft" ? ["draft"]
    : filter === "review" ? [...reviewStatuses]
      : filter === "revision" ? ["needs_revision", "rejected_red"]
        : filter === "approved" ? [...approvedStatuses] : [];
  const pageQuery = useQuery({
    queryKey: ["user", organizationId, "budget-page-pwa", page, 25, statuses],
    queryFn: () => loadOrganizationBudgetRequestPage(organizationId, { page, pageSize: 25, statuses }),
    enabled: Boolean(organizationId),
    placeholderData: (previous) => previous,
  });
  const visible = pageQuery.data?.rows ?? data.budgetRequests;
  const totalCount = pageQuery.data?.totalCount ?? data.budgetRequests.length;
  useEffect(() => setPage(1), [filter]);

  return (
    <div className="pwa-stack pwa-budget-list-page">
      <PwaEligibilityNotice data={data} />
      {totalCount ? (
        <div className="pwa-filter-chips" aria-label="Budget request filters">
          {filterOptions.map((item) => <button key={item.id} type="button" className={filter === item.id ? "is-active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
      ) : null}
      <section className="pwa-compact-card-list">
        {visible.map((request) => (
          <button key={request.id} type="button" className="pwa-card pwa-transaction-card" onClick={() => go(pwaBudgetDetailRoute(request.id))}>
            <span className="pwa-transaction-heading"><strong>{request.activityTitle || "Untitled activity"}</strong><StatusBadge status={request.status} label={getBudgetRequestStatusLabel(String(request.status))} /></span>
            <span className="pwa-transaction-amount">{money.format(request.requestedAmount)}</span>
            <span className="pwa-transaction-date">{dateLabel(request.activityDate)}</span>
            <span className="pwa-transaction-meta">
              <span><small>Venue</small><strong>{request.venue || "Not set"}</strong></span>
              <span><small>Updated</small><strong>{dateLabel(request.updatedAt)}</strong></span>
            </span>
            <span className="pwa-view-row">View Details <ChevronRight aria-hidden="true" /></span>
          </button>
        ))}
        {!visible.length ? <div className="pwa-card pwa-empty-copy">{totalCount ? "No budget requests match this filter." : "No budget requests have been created yet."}</div> : null}
      </section>
      <OrganizationHistoryPagination page={page} totalPages={pageQuery.data?.totalPages ?? 1} totalCount={totalCount} pageSize={25} loading={pageQuery.isFetching} onPageChange={setPage} />
      {data.budgetWorkflowEligibility.eligible ? (
        <button type="button" className="pwa-primary-button" onClick={() => go(PWA_ROUTES.budgetNew)}><Plus /> New Budget Request</button>
      ) : null}
    </div>
  );
}

export function PwaBudgetDetail({ data }: { data: PortalData }) {
  const { requestId = "" } = useParams();
  const { go } = usePwaNavigation();
  const organizationId = data.profile?.id ?? "";
  const detailQuery = useQuery({
    queryKey: ["user", organizationId, "budget-detail-pwa", requestId],
    queryFn: () => loadOrganizationBudgetRequestById(organizationId, requestId),
    enabled: Boolean(organizationId && requestId),
  });
  const filesQuery = useQuery({
    queryKey: ["user", organizationId, "budget-files-pwa", requestId],
    queryFn: () => loadOrganizationBudgetRequestFiles(organizationId, requestId),
    enabled: Boolean(organizationId && requestId),
  });
  const request = detailQuery.data ?? data.budgetRequests.find((item) => item.id === requestId);
  const file = filesQuery.data?.[0] ?? data.store.state.budgetRequestFiles.find((item) => item.budgetRequestId === requestId);
  if (detailQuery.isLoading || filesQuery.isLoading) return <p role="status" className="pwa-card">Loading budget request…</p>;
  if (detailQuery.isError || filesQuery.isError) return <section className="pwa-card"><p role="alert">Budget request could not be loaded.</p><button className="pwa-secondary-button" onClick={() => { void detailQuery.refetch(); void filesQuery.refetch(); }}>Try again</button></section>;
  if (!request) return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><section className="pwa-card pwa-empty-copy">Budget request not found.</section></div>;

  return (
    <div className="pwa-stack">
      <PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" />
      <PortalWorkflowStatusHelper workflow="budget" status={request.status} />
      <section className="pwa-card pwa-transaction-detail">
        <div className="pwa-detail-title"><div><small>Budget request</small><h2>{request.activityTitle}</h2></div><StatusBadge status={request.status} label={getBudgetRequestStatusLabel(String(request.status))} /></div>
        <strong className="pwa-detail-amount">{money.format(request.requestedAmount)}</strong>
        <dl>
          <div><dt>Proposed date</dt><dd>{dateLabel(request.activityDate)}</dd></div>
          <div><dt>Venue</dt><dd>{request.venue}</dd></div>
          <div><dt>Purpose & Category</dt><dd>{formatAdvocacyLabel(request.purposeCategory)}</dd></div>
          <div><dt>Approved</dt><dd>{money.format(request.approvedAmount)}</dd></div>
          <div><dt>Released</dt><dd>{money.format(request.releasedAmount)}</dd></div>
          <div><dt>Updated</dt><dd>{dateLabel(request.updatedAt)}</dd></div>
        </dl>
        <div className="pwa-detail-section"><h3>Purpose Description</h3><p>{request.activityDescription}</p></div>
        {request.adminRemarks ? <div className="pwa-admin-note"><strong>Admin remarks</strong><p>{request.adminRemarks}</p></div> : null}
      </section>
      {file ? <section className="pwa-card pwa-liquidation-attachment-editor">
        <h3>Attached budget PDF</h3>
        <div className="pwa-selected-liquidation-file"><FileText aria-hidden="true" /><span><strong>{file.fileName || "Budget request attachment.pdf"}</strong></span></div>
        <PortalDocumentViewer previewUrl={file.fileUrl} previewTitle={file.fileName || "Budget request attachment.pdf"} previewCanInline className="pwa-liquidation-selected-preview" />
      </section> : null}
      {canEditBudget(request) ? <button type="button" className="pwa-primary-button" onClick={() => go(pwaBudgetEditRoute(request.id))}><Pencil /> {request.status === "draft" ? "Edit Draft" : "Revise Request"}</button> : null}
      {request.revisionHistory?.length ? (
        <section className="pwa-card pwa-timeline"><h3>Activity</h3>{[...request.revisionHistory].reverse().map((item, index) => <article key={`${item.changedAt}-${index}`}><span /><div><strong>{item.action.replaceAll("_", " ")}</strong><p>{item.adminRemarks || "Status updated."}</p><time>{dateLabel(item.changedAt)}</time></div></article>)}</section>
      ) : null}
    </div>
  );
}

type BudgetDraft = {
  activityTitle: string;
  activityDescription: string;
  activityDate: string;
  venue: string;
  requestedAmount: string;
  purposeCategory: string;
};

const draftFrom = (request?: BudgetRequest, defaultCategory?: string): BudgetDraft => ({
  activityTitle: request?.activityTitle ?? "",
  activityDescription: request?.activityDescription ?? "",
  activityDate: request?.activityDate ?? "",
  venue: request?.venue ?? "",
  requestedAmount: request ? String(request.requestedAmount) : "",
  purposeCategory: request?.purposeCategory || defaultCategory || "",
});

export function PwaBudgetForm({ data, mode }: { data: PortalData; mode: "new" | "edit" }) {
  const { requestId = "" } = useParams();
  const { go } = usePwaNavigation();
  const organizationId = data.profile?.id ?? "";
  const detailQuery = useQuery({ queryKey: ["user", organizationId, "budget-detail-pwa", requestId], queryFn: () => loadOrganizationBudgetRequestById(organizationId, requestId), enabled: Boolean(mode === "edit" && organizationId && requestId) });
  const filesQuery = useQuery({ queryKey: ["user", organizationId, "budget-files-pwa", requestId], queryFn: () => loadOrganizationBudgetRequestFiles(organizationId, requestId), enabled: Boolean(mode === "edit" && organizationId && requestId) });
  const existing = mode === "edit" ? detailQuery.data ?? data.budgetRequests.find((item) => item.id === requestId) : undefined;
  const existingFile = filesQuery.data?.[0] ?? (existing ? data.store.state.budgetRequestFiles.find((item) => item.budgetRequestId === existing.id) : undefined);
  const orgAdvocacies = data.profile?.advocacies || [];
  const defaultCategory = orgAdvocacies[0] || "";
  const [draft, setDraft] = useState(() => draftFrom(existing, defaultCategory));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  useEffect(() => { setDraft(draftFrom(existing, defaultCategory)); }, [existing, defaultCategory]);

  if (mode === "edit" && (detailQuery.isLoading || filesQuery.isLoading)) return <p role="status" className="pwa-card">Loading budget request…</p>;
  if (mode === "edit" && (detailQuery.isError || filesQuery.isError)) return <section className="pwa-card"><p role="alert">Budget request could not be loaded.</p><button className="pwa-secondary-button" onClick={() => { void detailQuery.refetch(); void filesQuery.refetch(); }}>Try again</button></section>;

  if (mode === "new" && !data.budgetWorkflowEligibility.eligible) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><PwaEligibilityNotice data={data} /></div>;
  }
  if (mode === "edit" && (!existing || !canEditBudget(existing))) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><section className="pwa-card pwa-empty-copy">{existing ? "This request is locked. Requests under review cannot be edited; expired revisions require an admin to unlock them." : "Budget request not found."}</section></div>;
  }

  const update = (field: keyof BudgetDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const save = async (status: "draft" | "submitted", event?: FormEvent, confirmed = false) => {
    event?.preventDefault();
    if (saving || (existing && !canEditBudget(existing))) return;
    if (status === "submitted" && existing?.status === "needs_revision" && !file && isAwaitingResubmission({ status: existing.status, revisionRequestedAt: existing.revisionRequestedAt, files: filesQuery.data ?? (existingFile ? [existingFile] : []) })) {
      toast({ title: "Corrected file required", description: "Upload your revised budget PDF before resubmitting.", variant: "destructive" });
      return;
    }
    if (orgAdvocacies.length === 0) {
      toast({
        title: "No Centers of Youth Participation",
        description: "Your organization does not have any Centers of Youth Participation configured in its profile. Please update your profile before submitting a budget request.",
        variant: "destructive",
      });
      return;
    }
    const requestedAmount = Number(draft.requestedAmount);
    if (!draft.activityTitle.trim() || !draft.activityDescription.trim() || !draft.activityDate || !draft.venue.trim() || !draft.purposeCategory.trim() || requestedAmount <= 0) {
      toast({ title: "Complete the budget form", description: "All activity, amount, and category fields are required.", variant: "destructive" });
      return;
    }
    const categoryUnchangedForHistory = Boolean(
      existing && existing.purposeCategory.trim().toLowerCase() === draft.purposeCategory.trim().toLowerCase()
    );
    if (!orgAdvocacies.some((category) => category.trim().toLowerCase() === draft.purposeCategory.trim().toLowerCase()) && !categoryUnchangedForHistory) {
      toast({
        title: "Invalid Purpose & Category",
        description: "Selected category must be one of your organization's configured Centers of Youth Participation.",
        variant: "destructive",
      });
      return;
    }
    if (requestedAmount > 100000) {
      toast({ title: "Requested budget amount cannot exceed ₱100,000", description: "The maximum allowable requested budget amount is ₱100,000.00.", variant: "destructive" });
      return;
    }
    if (!existingFile && !file) {
      toast({ title: "Attach the required document", description: "Upload the detailed budget PDF.", variant: "destructive" });
      return;
    }
    if (file && file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      toast({ title: "PDF only", description: "The budget attachment must be a PDF.", variant: "destructive" });
      return;
    }

    if (status === "submitted" && !confirmed) { setConfirmSubmit(true); return; }
    setConfirmSubmit(false);
    setSaving(true);
    try {
      const payload = {
        activityTitle: draft.activityTitle.trim(),
        activityDescription: draft.activityDescription.trim(),
        activityDate: draft.activityDate,
        venue: draft.venue.trim(),
        requestedAmount: requestedAmount,
        approvedAmount: existing?.approvedAmount ?? 0,
        releasedAmount: existing?.releasedAmount ?? 0,
        releaseDate: existing?.releaseDate ?? "",
        purposeCategory: draft.purposeCategory.trim(),
        status: existing?.status === "needs_revision" && status === "draft" ? "needs_revision" as const : status,
        remarks: "",
        adminRemarks: existing?.adminRemarks ?? "",
        goSignalAt: existing?.goSignalAt ?? "",
        hardCopySubmittedAt: existing?.hardCopySubmittedAt ?? "",
        userNote: existing?.userNote ?? "",
        revisionHistory: existing?.revisionHistory ?? [],
        budgetRequestType: "ypop_incentive" as const,
        ypopEntryId: data.budgetEligibility.entry?.id,
      };
      let saved: BudgetRequest;
      if (existing) {
        if (file) await uploadBudgetRequestFileToSupabase(existing.id, file);
        saved = await updateBudgetRequestInSupabase(existing.id, payload);
        await Promise.all([detailQuery.refetch(), filesQuery.refetch()]);
      } else {
        saved = await createBudgetRequestInSupabase({ budgetRequest: payload, file });
      }
      await data.refreshBudgets();
      toast({ title: status === "draft" ? "Budget draft saved" : "Budget request submitted" });
      go(pwaBudgetDetailRoute(saved.id), { replace: true });
    } catch (error) {
      toast({ title: "Unable to save request", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="pwa-stack pwa-native-form pwa-budget-editor" onSubmit={(event) => void save("submitted", event)}>
      <PwaBackButton fallback={existing ? pwaBudgetDetailRoute(existing.id) : PWA_ROUTES.budgets} label={existing ? "Budget Details" : "Budget Requests"} />
      <header className="pwa-budget-editor-heading">
        <h1>{existing ? "Edit budget request" : "New budget request"}</h1>
        <p>Add your activity details and attach the detailed budget PDF. All fields are required.</p>
      </header>
      <section className="pwa-budget-editor-section" aria-labelledby="budget-activity-heading">
        <h2 id="budget-activity-heading">Activity information</h2>
        <label>Activity title <input placeholder="Name of your activity" value={draft.activityTitle} onChange={(event) => update("activityTitle", event.target.value)} required /></label>
        <label>Purpose Description <textarea rows={3} placeholder="Purpose, objectives, expected outcomes, and target participants" value={draft.activityDescription} onChange={(event) => update("activityDescription", event.target.value)} required /></label>
        <label>Proposed date <input type="date" value={draft.activityDate} onChange={(event) => update("activityDate", event.target.value)} required /></label>
        <label>Venue <input placeholder="Where will the activity take place?" value={draft.venue} onChange={(event) => update("venue", event.target.value)} required /></label>
      </section>
      <section className="pwa-budget-editor-section" aria-labelledby="budget-amount-heading">
        <h2 id="budget-amount-heading">Budget details</h2>
        <label>Requested amount <span className="pwa-prefix-input"><span aria-hidden="true">₱</span><input aria-describedby="budget-amount-help" type="number" min="0.01" max="100000" step="any" inputMode="decimal" value={draft.requestedAmount} onFocus={(e) => { if (e.target.value === "0") e.target.select(); }} onClick={(e) => { if ((e.target as HTMLInputElement).value === "0") (e.target as HTMLInputElement).select(); }} onChange={(event) => { let val = event.target.value; if (/^0[0-9]+(\.[0-9]*)?$/.test(val)) { val = val.replace(/^0+/, ""); if (val === "" || val.startsWith(".")) { val = "0" + val; } } update("requestedAmount", val); }} required /></span><small id="budget-amount-help">Maximum request: ₱100,000</small></label>
        <label>
          Purpose & Category
          {orgAdvocacies.length > 0 ? (
            <select
              value={draft.purposeCategory}
              onChange={(event) => update("purposeCategory", event.target.value)}
              required
            >
              {existing && !orgAdvocacies.some((category) => category === existing.purposeCategory) && (
                <option value={existing.purposeCategory}>
                  {formatAdvocacyLabel(existing.purposeCategory)}
                </option>
              )}
              {orgAdvocacies.map((cyp) => (
                <option key={cyp} value={cyp}>
                  {formatAdvocacyLabel(cyp)}
                </option>
              ))}
            </select>
          ) : (
            <p className="pwa-form-helper text-amber-600">
              No Centers of Youth Participation configured. Please configure them in your Organization Profile.
            </p>
          )}
        </label>
      </section>
      <section className="pwa-budget-editor-section" aria-labelledby="budget-file-heading">
        <h2 id="budget-file-heading">Detailed budget PDF</h2>
        {existing?.revisionDueAt ? <p className="pwa-form-helper">Revision deadline: {dateLabel(existing.revisionDueAt)}</p> : null}
        {existingFile ? <p className="pwa-form-helper"><FileText /> Current: {existingFile.fileName}</p> : null}
        <label className="pwa-budget-upload"><input type="file" aria-label={existingFile ? "Replace detailed budget PDF" : "Attach detailed budget PDF"} accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><FileText aria-hidden="true" /><span><strong>{file?.name || (existingFile ? "Replace attached PDF" : "Attach budget PDF")}</strong><small>{file ? "Selected · Tap to choose another file" : "Choose a PDF from your device"}</small></span><Upload aria-hidden="true" /></label>
      </section>
      <div className="pwa-sticky-actions">
        <button type="button" className="pwa-secondary-button" disabled={saving} onClick={(event) => void save("draft", event)}>{saving ? <Loader2 className="pwa-spin" /> : null} Save Draft</button>
        <button type="submit" className="pwa-primary-button" disabled={saving || orgAdvocacies.length === 0}>{saving ? <Loader2 className="pwa-spin" /> : null} Submit Request</button>
      </div>
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}><DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Submit this budget request?</DialogTitle><DialogDescription>PCYDO will review your activity details and detailed budget PDF. Editing is locked while the request is under review.</DialogDescription></DialogHeader><p className="text-sm font-semibold break-words">{draft.activityTitle} · {money.format(Number(draft.requestedAmount))}</p><DialogFooter><button type="button" className="pwa-secondary-button" onClick={() => setConfirmSubmit(false)}>Cancel</button><button type="button" className="pwa-primary-button" disabled={saving} onClick={() => void save("submitted", undefined, true)}>Submit Request</button></DialogFooter></DialogContent></Dialog>
    </form>
  );
}
