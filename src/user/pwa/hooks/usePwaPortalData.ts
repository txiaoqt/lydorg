import { useMemo } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  loadLydoConnectSupabaseState,
  markAllNotificationsReadInSupabase,
  markNotificationReadInSupabase,
} from "@/lib/lydo-connect-supabase";
import { resolveBudgetEligibility } from "@/lib/budget-eligibility";
import { getProfileCompletionPercent } from "./pwaPortalMetrics";
import { PWA_ROUTES } from "../pwaRoutes";
import { isUrnRegistration, urnReviewLabels } from "@/lib/urn-registration";
import {
  resolveBudgetWorkflowEligibility,
  resolveLiquidationWorkflowEligibility,
  resolveYpopWorkflowEligibility,
} from "@/lib/user-workflow-eligibility";
import { getOrganizationRenewalCountdown } from "@/lib/organization-renewal";

const approvedBudgetStatuses = new Set(["approved_for_ftf_green", "hard_copy_submitted", "budget_released", "completed"]);
const unlockedLiquidationStatuses = new Set(["budget_released", "completed"]);
const approvedDocumentStatuses = new Set(["approved", "approved_green"]);
const underReviewDocumentStatuses = new Set(["uploaded", "ready_for_review", "submitted", "under_admin_review"]);
const revisionDocumentStatuses = new Set(["needs_revision", "rejected_red"]);
const underReviewLiquidationStatuses = new Set(["submitted", "under_review", "approved_for_ftf_green", "hard_copy_submitted"]);
const actionableLiquidationStatuses = new Set(["not_started", "draft", "needs_revision", "rejected_red", "overdue"]);

type PwaBriefing = {
  title: string;
  description: string;
  tone: "success" | "warning" | "danger" | "info";
  action: { label: string; path: string } | null;
};

export function usePwaPortalData() {
  const { user, signOut } = useAuth();
  const store = useLydoConnect();
  const { state } = store;
  const profile = state.organizationProfiles.find((item) => item.userId === user?.id) ?? null;
  const organizationId = profile?.id ?? "";

  const data = useMemo(() => {
    const templates = [...state.templates]
      .filter((item) => item.isActive && item.templateActive)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const requiredTemplates = templates.filter((item) => item.templateScope === "document_submission");
    const submission = state.documentSubmissions.find((item) => item.organizationId === organizationId) ?? null;
    const documentFiles = submission
      ? state.documentSubmissionFiles.filter((item) => item.submissionId === submission.id)
      : [];
    const documentFileByType = new Map(documentFiles.map((item) => [item.documentTypeId, item]));
    const requiredDocumentFiles = requiredTemplates
      .map((template) => documentFileByType.get(template.id))
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const approvedDocuments = requiredDocumentFiles.filter((item) => approvedDocumentStatuses.has(item.adminStatus)).length;
    const underReviewDocuments = requiredDocumentFiles.filter((item) => underReviewDocumentStatuses.has(item.adminStatus)).length;
    const revisionDocuments = requiredDocumentFiles.filter((item) => revisionDocumentStatuses.has(item.adminStatus));
    const draftDocuments = requiredDocumentFiles.filter((item) => item.adminStatus === "draft").length;
    const missingDocuments = requiredTemplates.filter((template) => !documentFileByType.has(template.id)).length;
    const documentPercent = requiredTemplates.length
      ? Math.round((approvedDocuments / requiredTemplates.length) * 100)
      : 0;

    const budgetRequests = [...state.budgetRequests]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latestBudget = budgetRequests[0] ?? null;
    const releasedBudget = budgetRequests.reduce((sum, item) => sum + Number(item.releasedAmount || 0), 0);
    const budgetPercent = latestBudget && approvedBudgetStatuses.has(latestBudget.status) ? 100 : 0;
    const draftBudgetRequests = budgetRequests.filter((item) => item.status === "draft");
    const releasedBudgetRequests = budgetRequests.filter((item) => item.status === "budget_released" || item.status === "completed").length;
    const underReviewBudgetRequests = budgetRequests.filter((item) => item.status === "submitted" || item.status === "under_review").length;
    const revisionBudgetRequests = budgetRequests.filter((item) => item.status === "needs_revision");

    const liquidationReports = [...state.liquidationReports]
      .filter((item) => item.organizationId === organizationId)
      .filter((item) => {
        const budget = budgetRequests.find((request) => request.id === item.budgetRequestId);
        return budget ? unlockedLiquidationStatuses.has(budget.status) : false;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latestLiquidation = liquidationReports[0] ?? null;
    const liquidationPercent = latestLiquidation?.status === "completed_liquidated" ? 100 : 0;
    const completedLiquidations = liquidationReports.filter((item) => item.status === "completed_liquidated").length;
    const underReviewLiquidations = liquidationReports.filter((item) => underReviewLiquidationStatuses.has(item.status)).length;
    const revisionLiquidations = liquidationReports.filter((item) => item.status === "needs_revision" || item.status === "rejected_red");
    const draftLiquidations = liquidationReports.filter((item) => item.status === "draft" || item.status === "not_started");
    const now = Date.now();
    const overdueLiquidations = liquidationReports.filter((item) =>
      item.status === "overdue" ||
      (
        actionableLiquidationStatuses.has(item.status) &&
        item.deadlineAt &&
        new Date(item.deadlineAt).getTime() < now
      ),
    );
    const upcomingLiquidations = liquidationReports
      .filter((item) =>
        actionableLiquidationStatuses.has(item.status) &&
        item.deadlineAt &&
        new Date(item.deadlineAt).getTime() >= now,
      )
      .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt));
    const nextDeadline = upcomingLiquidations[0]?.deadlineAt ?? "";
    const daysUntilDeadline = nextDeadline
      ? Math.max(0, Math.ceil((new Date(nextDeadline).getTime() - now) / 86_400_000))
      : null;

    const profilePercent = getProfileCompletionPercent(profile, user);
    const renewalCountdown = getOrganizationRenewalCountdown(profile);
    const profileComplete = profilePercent === 100;
    const notifications = [...state.notifications]
      .filter((item) => item.userId === user?.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const activities = [...state.activityLogs]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const profileActivities = activities.filter((item) => item.relatedType === "organization_profile");
    const cityLedParticipations = [...state.ypopEventParticipations]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => (b.joinedAt || b.createdAt).localeCompare(a.joinedAt || a.createdAt));
    const inquiries = [...state.inquiries]
      .filter((item) => item.organizationId === organizationId || item.submittedBy === user?.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const ypopEntries = [...state.ypopEntries]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const budgetEligibility = resolveBudgetEligibility({
      organizationId,
      periods: state.ypopPeriods,
      entries: state.ypopEntries,
    });
    const budgetWorkflowEligibility = resolveBudgetWorkflowEligibility({
      profile,
      requiredTemplates,
      documentFiles,
      ypopEligibility: budgetEligibility,
    });
    const ypopWorkflowEligibility = resolveYpopWorkflowEligibility({
      profile,
      requiredTemplates,
      documentFiles,
    });
    const liquidationWorkflowEligibility = resolveLiquidationWorkflowEligibility({
      profile,
      requiredTemplates,
      documentFiles,
      budgetRequests,
      hasLiquidation: liquidationReports.length > 0,
    });

    const urnRegistration = isUrnRegistration(profile);
    const pendingActions =
      (profile?.profileStatus === "incomplete" ? 1 : 0) +
      (urnRegistration ? (profile?.urnReviewStatus === "needs_correction" ? 1 : 0) : revisionDocuments.length + missingDocuments) +
      (latestBudget?.status === "needs_revision" ? 1 : 0) +
      liquidationReports.filter((item) => ["not_started", "draft", "needs_revision", "overdue"].includes(item.status)).length;

    let briefing: PwaBriefing = {
      title: "Your organization is on track.",
      description: "There are no overdue records or submissions currently requiring your action.",
      tone: "success",
      action: null,
    };
    if (urnRegistration) {
      const urnStatus = profile!.urnReviewStatus;
      briefing = {
        title: urnStatus === "verified" ? "Registration verified through URN." : urnStatus === "needs_correction" ? "Your URN needs correction." : urnStatus === "rejected" ? "URN verification was unsuccessful." : "Your URN is under review.",
        description: urnStatus === "verified" ? "Your existing LYDO / PCYDO registration record was confirmed." : urnStatus === "needs_correction" ? (profile!.urnAdminRemarks || "Review the admin feedback and update the submitted number.") : urnStatus === "rejected" ? (profile!.urnAdminRemarks || "Contact LYDO / PCYDO if you need help with this decision.") : "LYDO / PCYDO is checking your registration record. You do not need to upload the six new-organization requirements.",
        tone: urnStatus === "verified" ? "success" : urnStatus === "rejected" ? "danger" : urnStatus === "needs_correction" ? "warning" : "info",
        action: { label: urnStatus === "needs_correction" || urnStatus === "rejected" ? "Update URN" : "View URN Status", path: urnStatus === "needs_correction" || urnStatus === "rejected" ? PWA_ROUTES.profileEdit : PWA_ROUTES.documents },
      };
    } else if (!profileComplete) {
      briefing = { title: "Your organization profile is incomplete.", description: "Complete the required organization details before accessing document submission.", tone: "warning", action: { label: "Complete Profile", path: PWA_ROUTES.profileEdit } };
    } else if (missingDocuments) {
      briefing = { title: `${missingDocuments} required document${missingDocuments === 1 ? " is" : "s are"} still missing.`, description: "Upload the remaining required files for admin review.", tone: "warning", action: { label: "Continue Documents", path: PWA_ROUTES.documentsManage } };
    } else if (revisionDocuments.length) {
      briefing = { title: `${revisionDocuments.length === 1 ? "One document needs" : `${revisionDocuments.length} documents need`} revision.`, description: "Review the latest admin remarks and upload the corrected file.", tone: "warning", action: { label: "Review Required Changes", path: PWA_ROUTES.documents } };
    } else if (profile?.profileStatus === "pending_review") {
      briefing = { title: "Your registration is awaiting verification.", description: "LYDO / PCYDO is reviewing your organization profile. You can monitor the current status while you wait.", tone: "info", action: { label: "View Verification Status", path: PWA_ROUTES.profile } };
    } else if (!budgetEligibility.eligible) {
      briefing = { title: "Complete YPOP validation first.", description: "Your organization must qualify in the active YPOP period before creating an activity budget request.", tone: "info", action: { label: "Open YPOP Incentive", path: PWA_ROUTES.ypop } };
    } else if (!budgetRequests.length) {
      briefing = { title: "Your organization can create a budget request.", description: "YPOP qualification is complete and no activity budget request has been created yet.", tone: "success", action: { label: "Create Budget Request", path: PWA_ROUTES.budgetNew } };
    } else if (revisionBudgetRequests.length) {
      briefing = { title: "A budget request needs revision.", description: "Review the latest admin feedback and update the request.", tone: "warning", action: { label: "Review Budget", path: PWA_ROUTES.budgets } };
    } else if (latestBudget?.status === "draft") {
      briefing = { title: "You have an unfinished budget request.", description: "Continue the draft and submit it when the required details and file are ready.", tone: "info", action: { label: "View Budget", path: PWA_ROUTES.budgets } };
    } else if (latestBudget && approvedBudgetStatuses.has(latestBudget.status) && !liquidationReports.length) {
      briefing = { title: "Your approved budget is moving through the release workflow.", description: "Open the request to review its current release and post-activity status.", tone: "info", action: { label: "View Budget", path: PWA_ROUTES.budgets } };
    } else if (overdueLiquidations.length) {
      briefing = { title: "A liquidation report is overdue.", description: "Submit the required report as soon as possible to restore compliance.", tone: "danger", action: { label: "Submit Liquidation", path: PWA_ROUTES.liquidations } };
    } else if (revisionLiquidations.length) {
      briefing = { title: "A liquidation report needs revision.", description: "Review the admin remarks and upload the corrected report.", tone: "warning", action: { label: "Submit Liquidation", path: PWA_ROUTES.liquidations } };
    } else if (daysUntilDeadline !== null && daysUntilDeadline <= 7) {
      briefing = { title: "A liquidation deadline is approaching.", description: `${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"} remaining before the next deadline.`, tone: "warning", action: { label: "View Liquidation", path: PWA_ROUTES.liquidations } };
    } else if (draftLiquidations.length) {
      briefing = { title: "You have an unfinished liquidation report.", description: "Continue the draft and submit it when the required file is ready.", tone: "info", action: { label: "Continue Liquidation", path: PWA_ROUTES.liquidations } };
    }

    const actions: Array<{ title: string; detail: string; path: string; kind: string }> = [];
    if (!urnRegistration && profileComplete && missingDocuments) actions.push({ title: "Continue Document Submission", detail: `${missingDocuments} required file${missingDocuments === 1 ? "" : "s"} remaining.`, path: PWA_ROUTES.documentsManage, kind: "documents" });
    if (!urnRegistration && profileComplete && revisionDocuments.length) actions.push({ title: "Review Required Changes", detail: "Correct the documents flagged by the admin.", path: PWA_ROUTES.documents, kind: "documents" });
    if (urnRegistration) actions.push({ title: urnReviewLabels[profile!.urnReviewStatus], detail: profile!.urnReviewStatus === "needs_correction" ? "Review feedback and submit the corrected URN." : "Open your registration verification record.", path: profile!.urnReviewStatus === "needs_correction" ? PWA_ROUTES.profileEdit : PWA_ROUTES.documents, kind: "profile" });
    if (profileComplete && profile?.profileStatus === "pending_review") actions.push({ title: "View Verification Status", detail: "Your organization profile is awaiting admin verification.", path: PWA_ROUTES.profile, kind: "profile" });
    if (!profileComplete) actions.push({ title: "Complete Profile", detail: "Finish all required organization information before submitting documents.", path: PWA_ROUTES.profileEdit, kind: "profile" });
    if (!budgetEligibility.eligible) actions.push({ title: "Open YPOP Incentive", detail: "Complete the active period qualification workflow.", path: PWA_ROUTES.ypop, kind: "budget" });
    if (budgetEligibility.eligible && !budgetRequests.length) actions.push({ title: "Create Budget Request", detail: "Start an eligible activity budget request.", path: PWA_ROUTES.budgetNew, kind: "budget" });
    if (revisionBudgetRequests.length) actions.push({ title: "Revise Budget Request", detail: "Address the latest review feedback.", path: PWA_ROUTES.budgets, kind: "budget" });
    if (draftBudgetRequests.length) actions.push({ title: "Continue Budget Draft", detail: "Finish the current budget request.", path: PWA_ROUTES.budgets, kind: "budget" });
    if (overdueLiquidations.length) actions.push({ title: "Submit Overdue Liquidation", detail: "Complete the overdue report as soon as possible.", path: PWA_ROUTES.liquidations, kind: "liquidation" });
    if (revisionLiquidations.length) actions.push({ title: "Review Liquidation Remarks", detail: "Correct the report flagged by the admin.", path: PWA_ROUTES.liquidations, kind: "liquidation" });
    if (!overdueLiquidations.length && !revisionLiquidations.length && daysUntilDeadline !== null && daysUntilDeadline <= 7) actions.push({ title: "Submit Liquidation", detail: `${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"} remain before the deadline.`, path: PWA_ROUTES.liquidations, kind: "liquidation" });
    if (draftLiquidations.length) actions.push({ title: "Continue Liquidation Draft", detail: "Finish the current report draft.", path: PWA_ROUTES.liquidations, kind: "liquidation" });

    return {
      templates, requiredTemplates, submission, documentFiles, approvedDocuments, underReviewDocuments,
      revisionDocuments, draftDocuments, missingDocuments, documentPercent, budgetRequests, latestBudget,
      releasedBudget, budgetPercent, releasedBudgetRequests, underReviewBudgetRequests, revisionBudgetRequests,
      liquidationReports, latestLiquidation, liquidationPercent, completedLiquidations, underReviewLiquidations,
      revisionLiquidations, overdueLiquidations, daysUntilDeadline,
      profilePercent, renewalCountdown, notifications, unreadCount: notifications.filter((item) => !item.isRead).length,
      activities, profileActivities, cityLedParticipations, inquiries, ypopEntries, budgetEligibility,
      budgetWorkflowEligibility, liquidationWorkflowEligibility, ypopWorkflowEligibility,
      pendingActions, briefing, actions: actions.slice(0, 3),
      news: [...state.newsReleases].filter((item) => item.visibilityStatus === "published").sort((a, b) => b.datePosted.localeCompare(a.datePosted)),
      transparency: [...state.transparencyPosts].filter((item) => item.visibilityStatus === "published").sort((a, b) => b.postDate.localeCompare(a.postDate)),
      compliance: state.complianceRemarks.filter((item) => item.organizationId === organizationId),
    };
  }, [organizationId, profile, state, user?.id]);

  const markRead = async (id: string) => {
    await markNotificationReadInSupabase(id);
    store.markNotificationRead(id);
  };
  const markAllRead = async () => {
    await markAllNotificationsReadInSupabase();
    store.markAllNotificationsRead();
  };
  const refresh = async () => {
    const remoteSnapshot = await loadLydoConnectSupabaseState();
    if (remoteSnapshot) store.mergeRemoteState(remoteSnapshot);
  };

  return {
    ...data,
    profile,
    user,
    organizationName: profile?.organizationName || user?.displayName || "Organization",
    store,
    signOut,
    markRead,
    markAllRead,
    refresh,
  };
}
