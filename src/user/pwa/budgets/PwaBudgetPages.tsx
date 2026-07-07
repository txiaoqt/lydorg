import { useMemo, useState, type FormEvent } from "react";
import {
  Check, ChevronRight, Circle, Eye, FileText, Loader2, Pencil, Plus, WalletCards,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { toast } from "@/hooks/use-toast";
import type { BudgetRequest } from "@/lib/lydo-connect-data";
import {
  createBudgetRequestInSupabase,
  resolveSupabaseFileUrl,
  updateBudgetRequestInSupabase,
  uploadBudgetRequestFileToSupabase,
} from "@/lib/lydo-connect-supabase";
import { PwaBackButton } from "../PwaBackButton";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { PWA_ROUTES, pwaBudgetDetailRoute, pwaBudgetEditRoute } from "../pwaRoutes";

type PortalData = ReturnType<typeof usePwaPortalData>;
type Filter = "all" | "draft" | "review" | "revision" | "approved";

const lockedStatuses = new Set(["approved_for_ftf_green", "hard_copy_submitted", "budget_released", "completed"]);
const reviewStatuses = new Set(["submitted", "under_review"]);
const approvedStatuses = new Set(["approved_for_ftf_green", "hard_copy_submitted", "budget_released", "completed"]);
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
        <h2>Complete YPOP validation first</h2>
        <p>Your organization must qualify in an active YPOP period before it can create an activity budget request.</p>
        <ul className="pwa-requirement-list">
          {requirements.map((item) => <li key={item.label} className={item.met ? "is-complete" : ""}>{item.met ? <Check /> : <Circle />}<span>{item.label}</span></li>)}
        </ul>
        <button type="button" onClick={() => go(PWA_ROUTES.ypop)}>Open YPOP Incentive<ChevronRight /></button>
      </div>
    </section>
  );
}

export function PwaBudgetList({ data }: { data: PortalData }) {
  const { go } = usePwaNavigation();
  const [filter, setFilter] = useState<Filter>("all");
  const visible = useMemo(() => data.budgetRequests.filter((request) => {
    if (filter === "all") return true;
    if (filter === "draft") return request.status === "draft";
    if (filter === "review") return reviewStatuses.has(request.status);
    if (filter === "revision") return request.status === "needs_revision" || request.status === "rejected_red";
    return approvedStatuses.has(request.status);
  }), [data.budgetRequests, filter]);

  return (
    <div className="pwa-stack pwa-budget-list-page">
      <PwaEligibilityNotice data={data} />
      {data.budgetRequests.length ? (
        <div className="pwa-filter-chips" aria-label="Budget request filters">
          {filterOptions.map((item) => <button key={item.id} type="button" className={filter === item.id ? "is-active" : ""} onClick={() => setFilter(item.id)}>{item.label}</button>)}
        </div>
      ) : null}
      <section className="pwa-compact-card-list">
        {visible.map((request) => (
          <button key={request.id} type="button" className="pwa-card pwa-transaction-card" onClick={() => go(pwaBudgetDetailRoute(request.id))}>
            <span className="pwa-transaction-heading"><strong>{request.activityTitle || "Untitled activity"}</strong><StatusBadge status={request.status} /></span>
            <span className="pwa-transaction-amount">{money.format(request.requestedAmount)}</span>
            <span className="pwa-transaction-date">{dateLabel(request.activityDate)}</span>
            <span className="pwa-transaction-meta">
              <span><small>Venue</small><strong>{request.venue || "Not set"}</strong></span>
              <span><small>Updated</small><strong>{dateLabel(request.updatedAt)}</strong></span>
            </span>
            <span className="pwa-view-row">View Details <ChevronRight aria-hidden="true" /></span>
          </button>
        ))}
        {!visible.length ? <div className="pwa-card pwa-empty-copy">{data.budgetRequests.length ? "No budget requests match this filter." : "No budget requests have been created yet."}</div> : null}
      </section>
      {data.budgetWorkflowEligibility.eligible ? (
        <button type="button" className="pwa-primary-button" onClick={() => go(PWA_ROUTES.budgetNew)}><Plus /> New Budget Request</button>
      ) : null}
    </div>
  );
}

export function PwaBudgetDetail({ data }: { data: PortalData }) {
  const { requestId = "" } = useParams();
  const { go } = usePwaNavigation();
  const request = data.budgetRequests.find((item) => item.id === requestId);
  const file = data.store.state.budgetRequestFiles.find((item) => item.budgetRequestId === requestId);
  if (!request) return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><section className="pwa-card pwa-empty-copy">Budget request not found.</section></div>;

  const openFile = async () => {
    if (!file) return;
    const url = await resolveSupabaseFileUrl(file.fileUrl);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="pwa-stack">
      <PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" />
      <section className="pwa-card pwa-transaction-detail">
        <div className="pwa-detail-title"><div><small>Budget request</small><h2>{request.activityTitle}</h2></div><StatusBadge status={request.status} /></div>
        <strong className="pwa-detail-amount">{money.format(request.requestedAmount)}</strong>
        <dl>
          <div><dt>Proposed date</dt><dd>{dateLabel(request.activityDate)}</dd></div>
          <div><dt>Venue</dt><dd>{request.venue}</dd></div>
          <div><dt>Category</dt><dd>{request.purposeCategory}</dd></div>
          <div><dt>Approved</dt><dd>{money.format(request.approvedAmount)}</dd></div>
          <div><dt>Released</dt><dd>{money.format(request.releasedAmount)}</dd></div>
          <div><dt>Updated</dt><dd>{dateLabel(request.updatedAt)}</dd></div>
        </dl>
        <div className="pwa-detail-section"><h3>Description</h3><p>{request.activityDescription}</p></div>
        <div className="pwa-detail-section"><h3>Your remarks</h3><p>{request.remarks || "No remarks."}</p></div>
        {request.adminRemarks ? <div className="pwa-admin-note"><strong>Admin remarks</strong><p>{request.adminRemarks}</p></div> : null}
      </section>
      <div className="pwa-button-stack">
        {file ? <button type="button" className="pwa-secondary-button" onClick={() => void openFile()}><Eye /> View Attached PDF</button> : null}
        {!lockedStatuses.has(request.status) ? <button type="button" className="pwa-primary-button" onClick={() => go(pwaBudgetEditRoute(request.id))}><Pencil /> Edit Request</button> : null}
      </div>
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
  remarks: string;
};

const draftFrom = (request?: BudgetRequest): BudgetDraft => ({
  activityTitle: request?.activityTitle ?? "",
  activityDescription: request?.activityDescription ?? "",
  activityDate: request?.activityDate ?? "",
  venue: request?.venue ?? "",
  requestedAmount: request ? String(request.requestedAmount) : "",
  purposeCategory: request?.purposeCategory ?? "",
  remarks: request?.remarks ?? "",
});

export function PwaBudgetForm({ data, mode }: { data: PortalData; mode: "new" | "edit" }) {
  const { requestId = "" } = useParams();
  const { go } = usePwaNavigation();
  const existing = mode === "edit" ? data.budgetRequests.find((item) => item.id === requestId) : undefined;
  const existingFile = existing ? data.store.state.budgetRequestFiles.find((item) => item.budgetRequestId === existing.id) : undefined;
  const [draft, setDraft] = useState(() => draftFrom(existing));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (mode === "new" && !data.budgetWorkflowEligibility.eligible) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><PwaEligibilityNotice data={data} /></div>;
  }
  if (mode === "edit" && (!existing || lockedStatuses.has(existing.status))) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><section className="pwa-card pwa-empty-copy">{existing ? "This approved request can no longer be edited." : "Budget request not found."}</section></div>;
  }

  const update = (field: keyof BudgetDraft, value: string) => setDraft((current) => ({ ...current, [field]: value }));
  const save = async (status: "draft" | "submitted", event: FormEvent) => {
    event.preventDefault();
    const requestedAmount = Number(draft.requestedAmount);
    if (!draft.activityTitle.trim() || !draft.activityDescription.trim() || !draft.activityDate || !draft.venue.trim() || !draft.purposeCategory.trim() || !draft.remarks.trim() || requestedAmount <= 0) {
      toast({ title: "Complete the budget form", description: "All activity, amount, category, and remarks fields are required.", variant: "destructive" });
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

    setSaving(true);
    try {
      const payload = {
        activityTitle: draft.activityTitle.trim(),
        activityDescription: draft.activityDescription.trim(),
        activityDate: draft.activityDate,
        venue: draft.venue.trim(),
        requestedAmount,
        approvedAmount: existing?.approvedAmount ?? 0,
        releasedAmount: existing?.releasedAmount ?? 0,
        releaseDate: existing?.releaseDate ?? "",
        purposeCategory: draft.purposeCategory.trim(),
        status,
        remarks: draft.remarks.trim(),
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
        saved = await updateBudgetRequestInSupabase(existing.id, payload);
        if (file) await uploadBudgetRequestFileToSupabase(existing.id, file);
      } else {
        saved = await createBudgetRequestInSupabase({ budgetRequest: payload, file });
      }
      await data.refresh();
      toast({ title: status === "draft" ? "Budget draft saved" : "Budget request submitted" });
      go(pwaBudgetDetailRoute(saved.id), { replace: true });
    } catch (error) {
      toast({ title: "Unable to save request", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="pwa-stack pwa-native-form" onSubmit={(event) => void save("submitted", event)}>
      <PwaBackButton fallback={existing ? pwaBudgetDetailRoute(existing.id) : PWA_ROUTES.budgets} label={existing ? "Budget Details" : "Budget Requests"} />
      <section className="pwa-card">
        <h2>Activity information</h2>
        <label>Activity title <input value={draft.activityTitle} onChange={(event) => update("activityTitle", event.target.value)} required /></label>
        <label>Description <textarea rows={4} value={draft.activityDescription} onChange={(event) => update("activityDescription", event.target.value)} required /></label>
        <label>Proposed date <input type="date" value={draft.activityDate} onChange={(event) => update("activityDate", event.target.value)} required /></label>
        <label>Venue <input value={draft.venue} onChange={(event) => update("venue", event.target.value)} required /></label>
      </section>
      <section className="pwa-card">
        <h2>Budget details</h2>
        <label>Requested amount <span className="pwa-prefix-input"><span>PHP</span><input type="number" min="1" step="0.01" inputMode="decimal" value={draft.requestedAmount} onChange={(event) => update("requestedAmount", event.target.value)} required /></span></label>
        <label>Purpose / category <input value={draft.purposeCategory} onChange={(event) => update("purposeCategory", event.target.value)} required /></label>
        <label>Remarks <textarea rows={3} value={draft.remarks} onChange={(event) => update("remarks", event.target.value)} required /></label>
      </section>
      <section className="pwa-card">
        <h2>Detailed budget PDF</h2>
        {existingFile ? <p className="pwa-form-helper"><FileText /> Current: {existingFile.fileName}</p> : null}
        <label className="pwa-file-control"><input type="file" accept=".pdf,application/pdf" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><span>{file?.name || (existingFile ? "Replace attached PDF" : "Choose PDF file")}</span></label>
      </section>
      <div className="pwa-sticky-actions">
        <button type="button" className="pwa-secondary-button" disabled={saving} onClick={(event) => void save("draft", event)}>{saving ? <Loader2 className="pwa-spin" /> : null} Save Draft</button>
        <button type="submit" className="pwa-primary-button" disabled={saving}>{saving ? <Loader2 className="pwa-spin" /> : null} Submit Request</button>
      </div>
    </form>
  );
}
