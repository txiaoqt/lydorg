import { PortalWorkflowStatusHelper } from "@/components/portal/PortalWorkflowStatusHelper";
import { BudgetSubmissionBlockerDialog } from "@/components/portal/BudgetSubmissionBlockerDialog";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Check, ChevronRight, Circle, FileText, Loader2, Pencil, Plus, WalletCards,
} from "lucide-react";
import { useParams } from "react-router-dom";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { formatAdvocacyLabel, getBudgetRequestStatusLabel, type BudgetRequest } from "@/lib/lydo-connect-data";
import type { BudgetSubmissionBlocker } from "@/lib/budget-submission-blocker";
import {
  createBudgetRequestInSupabase,
  loadOrganizationBudgetRequestById,
  loadOrganizationBudgetRequestFiles,
  loadOrganizationBudgetRequestPage,
  loadOrganizationBudgetSubmissionBlocker,
  updateBudgetRequestInSupabase,
  uploadBudgetRequestFileToSupabase,
} from "@/lib/lydo-connect-supabase";
import { PwaBackButton } from "../PwaBackButton";
import { PortalDocumentViewer } from "@/components/portal/PortalDocumentPreviewModal";
import { usePwaNavigation } from "../hooks/usePwaNavigation";
import type { usePwaPortalData } from "../hooks/usePwaPortalData";
import { PWA_ROUTES, pwaBudgetDetailRoute, pwaBudgetEditRoute, pwaLiquidationDetailRoute } from "../pwaRoutes";
import { OrganizationHistoryPagination } from "@/components/portal/OrganizationHistoryPagination";
import { isSubmissionRevisionLocked } from "@/lib/revision-deadline";
import { BudgetProposalFormFields } from "@/components/portal/BudgetProposalFormFields";
import { compactProposalForm, createEmptyProposalForm, normalizeProposalForm, proposalBudgetTotal, validateProposalForm, type BudgetProposalForm } from "@/lib/budget-proposal";
import { buildBudgetProposalFile } from "@/lib/budget-proposal-pdf";
import { clearProposalDraft, readProposalDraft, writeProposalDraft } from "@/lib/budget-proposal-draft-storage";
import { fetchPublicSystemSettings, getOfficialSignatories } from "@/lib/admin-system-settings";

type PortalData = ReturnType<typeof usePwaPortalData>;
type Filter = "all" | "draft" | "review" | "revision" | "approved";

const canEditBudget = (request: BudgetRequest) => request.status === "draft" || (request.status === "needs_revision" && !isSubmissionRevisionLocked(request));
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
        {data.profile?.profileStatus === "verified" && data.budgetEligibility.reason === "ypop_not_submitted" ? (
          <>
            <h2>Complete YPOP participation</h2>
            <p>Your organization is verified, but a valid YPOP qualification is required before you can submit a budget request. Complete the required YPOP participation activities and meet the qualification criteria to proceed.</p>
          </>
        ) : (
          <>
            <h2>Budget request unavailable</h2>
            <p>Complete the requirements below before submitting a budget request.</p>
          </>
        )}
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
  const [checkingNewRequest, setCheckingNewRequest] = useState(false);
  const [blockerDialogOpen, setBlockerDialogOpen] = useState(false);
  const [submissionBlocker, setSubmissionBlocker] = useState<BudgetSubmissionBlocker | null>(null);
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

  const handleNewBudgetRequest = async () => {
    if (checkingNewRequest) return;
    setCheckingNewRequest(true);
    try {
      const blocker = await loadOrganizationBudgetSubmissionBlocker(organizationId);
      if (blocker) {
        setSubmissionBlocker(blocker);
        setBlockerDialogOpen(true);
      } else {
        go(PWA_ROUTES.budgetNew);
      }
    } catch (error) {
      toast({
        title: "Unable to check current budget requests",
        description: error instanceof Error ? error.message : "Please try again before creating a new request.",
        variant: "destructive",
      });
    } finally {
      setCheckingNewRequest(false);
    }
  };

  const openCurrentBlocker = () => {
    if (!submissionBlocker) return;
    setBlockerDialogOpen(false);
    if (submissionBlocker.kind === "draft") {
      go(pwaBudgetEditRoute(submissionBlocker.budgetRequestId));
    } else if (submissionBlocker.kind === "pending_liquidation") {
      go(submissionBlocker.liquidationReportId
        ? pwaLiquidationDetailRoute(submissionBlocker.liquidationReportId)
        : PWA_ROUTES.liquidations);
    } else {
      go(pwaBudgetDetailRoute(submissionBlocker.budgetRequestId));
    }
  };

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
              <span><small>Category</small><strong>{formatAdvocacyLabel(request.purposeCategory) || "Not set"}</strong></span>
              <span><small>Updated</small><strong>{dateLabel(request.updatedAt)}</strong></span>
            </span>
            <span className="pwa-view-row">View Details <ChevronRight aria-hidden="true" /></span>
          </button>
        ))}
        {!visible.length ? <div className="pwa-card pwa-empty-copy">{totalCount ? "No budget requests match this filter." : "No budget requests have been created yet."}</div> : null}
      </section>
      <OrganizationHistoryPagination page={page} totalPages={pageQuery.data?.totalPages ?? 1} totalCount={totalCount} pageSize={25} loading={pageQuery.isFetching} onPageChange={setPage} />
      {data.budgetWorkflowEligibility.eligible ? (
        <button type="button" className="pwa-primary-button" onClick={() => void handleNewBudgetRequest()} disabled={checkingNewRequest}>
          {checkingNewRequest ? <Loader2 className="pwa-spin" /> : <Plus />} New Budget Request
        </button>
      ) : null}
      <BudgetSubmissionBlockerDialog
        open={blockerDialogOpen}
        onOpenChange={setBlockerDialogOpen}
        blocker={submissionBlocker}
        onAction={openCurrentBlocker}
      />
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
          <div><dt>Purpose & Category</dt><dd>{formatAdvocacyLabel(request.purposeCategory)}</dd></div>
          <div><dt>Approved</dt><dd>{money.format(request.approvedAmount)}</dd></div>
          <div><dt>Released</dt><dd>{money.format(request.releasedAmount)}</dd></div>
          <div><dt>Updated</dt><dd>{dateLabel(request.updatedAt)}</dd></div>
        </dl>
        <div className="pwa-detail-section"><h3>Project Overview</h3><p>{request.activityDescription}</p></div>
        {request.adminRemarks ? <div className="pwa-admin-note"><strong>Admin remarks</strong><p>{request.adminRemarks}</p></div> : null}
      </section>
      {file ? <section className="pwa-card pwa-liquidation-attachment-editor">
        <h3>Project proposal PDF</h3>
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

export function PwaBudgetForm({ data, mode }: { data: PortalData; mode: "new" | "edit" }) {
  const { requestId = "" } = useParams();
  const { go } = usePwaNavigation();
  const organizationId = data.profile?.id ?? "";
  const submissionBlockerQuery = useQuery({
    queryKey: ["user", organizationId, "budget-submission-blocker"],
    queryFn: () => loadOrganizationBudgetSubmissionBlocker(organizationId),
    enabled: Boolean(mode === "new" && organizationId),
    staleTime: 0,
  });
  const detailQuery = useQuery({ queryKey: ["user", organizationId, "budget-detail-pwa", requestId], queryFn: () => loadOrganizationBudgetRequestById(organizationId, requestId), enabled: Boolean(mode === "edit" && organizationId && requestId) });
  const filesQuery = useQuery({ queryKey: ["user", organizationId, "budget-files-pwa", requestId], queryFn: () => loadOrganizationBudgetRequestFiles(organizationId, requestId), enabled: Boolean(mode === "edit" && organizationId && requestId) });
  const existing = mode === "edit" ? detailQuery.data ?? data.budgetRequests.find((item) => item.id === requestId) : undefined;
  const orgAdvocacies = data.profile?.advocacies || [];
  const defaultCategory = orgAdvocacies[0] || "";
  const profileDefaults = () => createEmptyProposalForm({
    organizationName: data.profile?.organizationName,
    barangay: data.profile?.barangay,
    contactNumber: data.profile?.contactNumber,
    email: data.profile?.organizationEmail,
  });
  // Unsaved answers survive a reload; cleared after a successful save.
  const draftScope = `pwa:${organizationId}:${mode === "new" ? "new" : requestId}`;
  type StoredDraft = { purposeCategory: string; proposal: unknown };
  const [purposeCategory, setPurposeCategory] = useState(() => readProposalDraft<StoredDraft>(draftScope)?.purposeCategory || existing?.purposeCategory || defaultCategory);
  const [proposal, setProposal] = useState<BudgetProposalForm>(() => normalizeProposalForm(readProposalDraft<StoredDraft>(draftScope)?.proposal ?? existing?.proposalForm, profileDefaults()));
  const [saving, setSaving] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  // Reload answers only when a different request (or a newer save) arrives, never mid-typing on refetch.
  const existingKey = existing ? `${existing.id}:${existing.updatedAt}` : "";
  useEffect(() => {
    const stored = readProposalDraft<StoredDraft>(draftScope);
    setPurposeCategory(stored?.purposeCategory || existing?.purposeCategory || defaultCategory);
    setProposal(normalizeProposalForm(stored?.proposal ?? existing?.proposalForm, profileDefaults()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingKey, defaultCategory]);
  // Only an edit by the org is stored, so loading a saved request never overwrites it with blanks.
  const editedRef = useRef(false);
  const editProposal = (next: BudgetProposalForm) => { editedRef.current = true; setProposal(next); };
  useEffect(() => {
    if (organizationId && editedRef.current) writeProposalDraft(draftScope, { purposeCategory, proposal });
  }, [draftScope, organizationId, purposeCategory, proposal]);

  if (mode === "edit" && (detailQuery.isLoading || filesQuery.isLoading)) return <p role="status" className="pwa-card">Loading budget request…</p>;
  if (mode === "edit" && (detailQuery.isError || filesQuery.isError)) return <section className="pwa-card"><p role="alert">Budget request could not be loaded.</p><button className="pwa-secondary-button" onClick={() => { void detailQuery.refetch(); void filesQuery.refetch(); }}>Try again</button></section>;

  if (mode === "new" && (submissionBlockerQuery.isLoading || submissionBlockerQuery.isFetching)) {
    return <p role="status" className="pwa-card">Checking for an unfinished budget request or liquidation…</p>;
  }
  if (mode === "new" && submissionBlockerQuery.isError) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><section className="pwa-card"><p role="alert">We couldn’t check whether your organization has an unfinished budget request or liquidation. Please return to Budget Requests and try again.</p><button type="button" className="pwa-secondary-button" onClick={() => void submissionBlockerQuery.refetch()}>Try again</button></section></div>;
  }
  if (mode === "new" && submissionBlockerQuery.data) {
    const blocker = submissionBlockerQuery.data;
    const openBlocker = () => {
      if (blocker.kind === "draft") go(pwaBudgetEditRoute(blocker.budgetRequestId));
      else if (blocker.kind === "pending_liquidation") go(blocker.liquidationReportId ? pwaLiquidationDetailRoute(blocker.liquidationReportId) : PWA_ROUTES.liquidations);
      else go(pwaBudgetDetailRoute(blocker.budgetRequestId));
    };
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><BudgetSubmissionBlockerDialog open onOpenChange={(open) => { if (!open) go(PWA_ROUTES.budgets); }} blocker={blocker} onAction={openBlocker} /></div>;
  }

  if (mode === "new" && !data.budgetWorkflowEligibility.eligible) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><PwaEligibilityNotice data={data} /></div>;
  }
  if (mode === "edit" && (!existing || !canEditBudget(existing))) {
    return <div className="pwa-stack"><PwaBackButton fallback={PWA_ROUTES.budgets} label="Budget Requests" /><section className="pwa-card pwa-empty-copy">{existing ? "This request is locked. Requests under review cannot be edited; expired revisions require an admin to unlock them." : "Budget request not found."}</section></div>;
  }

  const save = async (status: "draft" | "submitted", event?: FormEvent, confirmed = false) => {
    event?.preventDefault();
    if (saving || (existing && !canEditBudget(existing))) return;
    if (orgAdvocacies.length === 0) {
      toast({
        title: "No Centers of Youth Participation",
        description: "Your organization does not have any Centers of Youth Participation configured in its profile. Please update your profile before submitting a budget request.",
        variant: "destructive",
      });
      return;
    }
    if (!purposeCategory.trim()) {
      toast({ title: "Center of Participation is required", description: "Select a Center of Youth Participation for this activity.", variant: "destructive" });
      return;
    }
    const proposalError = validateProposalForm(proposal, status === "draft" ? "draft" : "submit");
    if (proposalError) {
      toast({ title: "Complete the project proposal", description: proposalError, variant: "destructive" });
      return;
    }
    const categoryUnchangedForHistory = Boolean(
      existing && existing.purposeCategory.trim().toLowerCase() === purposeCategory.trim().toLowerCase()
    );
    if (!orgAdvocacies.some((category) => category.trim().toLowerCase() === purposeCategory.trim().toLowerCase()) && !categoryUnchangedForHistory) {
      toast({
        title: "Invalid Center of Participation",
        description: "Selected category must be one of your organization's configured Centers of Youth Participation.",
        variant: "destructive",
      });
      return;
    }

    if (status === "submitted" && !confirmed) { setConfirmSubmit(true); return; }
    setConfirmSubmit(false);
    setSaving(true);
    try {
      const compact = compactProposalForm(proposal);
      const payload = {
        activityTitle: compact.projectTitle.trim(),
        activityDescription: compact.projectOverview.trim(),
        activityDate: compact.implementationDate,
        requestedAmount: proposalBudgetTotal(compact),
        proposalForm: compact,
        approvedAmount: existing?.approvedAmount ?? 0,
        releasedAmount: existing?.releasedAmount ?? 0,
        releaseDate: existing?.releaseDate ?? "",
        purposeCategory: purposeCategory.trim(),
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
      // Every save rebuilds the official proposal PDF from the answers; admin reviews this file.
      await fetchPublicSystemSettings();
      const file = await buildBudgetProposalFile({ form: compact, centerOfParticipation: formatAdvocacyLabel(payload.purposeCategory), ...getOfficialSignatories() });
      let saved: BudgetRequest;
      if (existing) {
        if (file) await uploadBudgetRequestFileToSupabase(existing.id, file);
        saved = await updateBudgetRequestInSupabase(existing.id, payload);
        await Promise.all([detailQuery.refetch(), filesQuery.refetch()]);
      } else {
        saved = await createBudgetRequestInSupabase({ budgetRequest: payload, file });
      }
      clearProposalDraft(draftScope);
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
        <h1>{existing ? "Edit project proposal" : "New budget request"}</h1>
        <p>Fill in the official PCYDO Project Proposal. The proposal PDF is generated from your answers when you save.</p>
        {existing?.revisionDueAt ? <p className="pwa-form-helper">Revision deadline: {dateLabel(existing.revisionDueAt)}</p> : null}
      </header>
      <BudgetProposalFormFields
        value={proposal}
        onChange={editProposal}
        centerOfParticipationField={
          <label className="block space-y-1.5">
            <span className="block text-xs font-bold text-foreground">Center of Participation <span className="text-red-500">*</span></span>
            {orgAdvocacies.length > 0 ? (
              <select className="h-10 w-full rounded-xl border border-border/80 bg-background px-3 text-xs" value={purposeCategory} onChange={(event) => { editedRef.current = true; setPurposeCategory(event.target.value); }} required>
                {existing && !orgAdvocacies.some((category) => category === existing.purposeCategory) && (
                  <option value={existing.purposeCategory}>{formatAdvocacyLabel(existing.purposeCategory)}</option>
                )}
                {orgAdvocacies.map((cyp) => <option key={cyp} value={cyp}>{formatAdvocacyLabel(cyp)}</option>)}
              </select>
            ) : (
              <p className="pwa-form-helper text-amber-600">No Centers of Youth Participation configured. Please configure them in your Organization Profile.</p>
            )}
          </label>
        }
      />
      <div className="pwa-sticky-actions">
        <button type="button" className="pwa-secondary-button" disabled={saving} onClick={(event) => void save("draft", event)}>{saving ? <Loader2 className="pwa-spin" /> : null} Save Draft</button>
        <button type="submit" className="pwa-primary-button" disabled={saving || orgAdvocacies.length === 0}>{saving ? <Loader2 className="pwa-spin" /> : null} Submit Request</button>
      </div>
      <Dialog open={confirmSubmit} onOpenChange={setConfirmSubmit}><DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md"><DialogHeader><DialogTitle>Submit this budget request?</DialogTitle><DialogDescription>PCYDO will review your project proposal PDF. Editing is locked while the request is under review.</DialogDescription></DialogHeader><p className="text-sm font-semibold break-words">{proposal.projectTitle} · {money.format(proposalBudgetTotal(proposal))}</p><DialogFooter><button type="button" className="pwa-secondary-button" onClick={() => setConfirmSubmit(false)}>Cancel</button><button type="button" className="pwa-primary-button" disabled={saving} onClick={() => void save("submitted", undefined, true)}>Submit Request</button></DialogFooter></DialogContent></Dialog>
    </form>
  );
}
