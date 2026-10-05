import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  loadOrganizationPortalSectionState,
  loadOrganizationDocumentSubmissionState,
  loadOrganizationBudgetSubmissionState,
  loadOrganizationLiquidationSubmissionState,
  loadOrganizationYpopState,
  invalidateOrganizationYpopQueries,
  loadOrganizationInquiriesState,
  loadOrganizationNotificationsState,
  markAllNotificationsReadInSupabase,
  markNotificationReadInSupabase,
  subscribeToOrganizationStatusChangesInSupabase,
} from "@/lib/lydo-connect-supabase";
import { resolveBudgetEligibility } from "@/lib/budget-eligibility";
import { getProfileCompletionPercent } from "./pwaPortalMetrics";
import { PWA_ROUTES } from "../pwaRoutes";
import { isUrnRegistration, urnReviewLabels } from "@/lib/urn-registration";
import {
  isMatchingFileForTemplate,
  isRegistrationRequirementTemplate,
  resolveBudgetWorkflowEligibility,
  resolveLiquidationWorkflowEligibility,
  resolveYpopWorkflowEligibility,
} from "@/lib/user-workflow-eligibility";
import { getOrganizationRenewalCountdown } from "@/lib/organization-renewal";

const approvedBudgetStatuses = new Set(["awaiting_release", "approved_for_ftf_green", "hard_copy_submitted", "budget_released"]);
const unlockedLiquidationStatuses = new Set(["budget_released"]);
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
  const { pathname } = useLocation();
  const mergeRemoteStateRef = useRef(store.mergeRemoteState);
  mergeRemoteStateRef.current = store.mergeRemoteState;
  const { state } = store;
  const profile = state.organizationProfiles.find((item) => item.userId === user?.id) ?? null;
  const organizationId = profile?.id ?? "";

  const activeSection = pathname.startsWith("/app/documents") ? "document-submission"
    : pathname.startsWith("/app/budgets") ? "budget-request"
    : pathname.startsWith("/app/liquidations") ? "liquidation-reporting"
    : pathname.startsWith("/app/notifications") ? "notifications"
    : pathname.startsWith("/app/activity") ? "activity"
    : pathname.startsWith("/app/profile") ? "organization-profile"
    : pathname.startsWith("/app/ypop") ? "ypop"
    : pathname.startsWith("/app/templates") ? "templates"
    : pathname.startsWith("/app/news") ? "news-releases"
    : pathname.startsWith("/app/transparency") ? "public-transparency"
    : pathname.startsWith("/app/compliance") ? "compliance-status"
    : pathname.startsWith("/app/inquiries") ? "inquiries"
    : pathname === "/app" ? "dashboard"
    : "";

  useEffect(() => {
    if (!activeSection || !user?.id || !organizationId) return;
    let cancelled = false;
    void loadOrganizationPortalSectionState(activeSection, user.id, organizationId)
      .then((remoteSnapshot) => {
        if (!cancelled && remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
      })
      .catch((error) => {
        if (!cancelled) console.error(`Failed to load ${activeSection} PWA data:`, error);
      });
    return () => { cancelled = true; };
  }, [activeSection, organizationId, user?.id]);

  const registrationSubmissionId = state.documentSubmissions.find((item) =>
    item.organizationId === organizationId && item.submissionScope !== "renewal" && !item.renewalId,
  )?.id ?? null;
  useEffect(() => {
    if (!activeSection || !organizationId) return;
    const onStatus = (status: string, error?: Error | null) => {
      if (import.meta.env.DEV && status === "SUBSCRIBED") console.debug(`Organization ${activeSection} status channel subscribed.`);
      else if (import.meta.env.DEV && ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) console.warn(`Organization ${activeSection} status channel:`, status, error ?? "");
    };
    if (activeSection === "document-submission") {
      return subscribeToOrganizationStatusChangesInSupabase({
        organizationId, feature: "registration", submissionId: registrationSubmissionId,
        onChange: () => {
          void loadOrganizationDocumentSubmissionState(undefined, organizationId)
            .then((result) => { if (result) mergeRemoteStateRef.current(result); })
            .catch((error) => { if (import.meta.env.DEV) console.warn("Could not refresh PWA document status.", error); });
        }, onStatus,
      });
    }
    if (activeSection === "budget-request") {
      const path = pathname.split("/").filter(Boolean);
      const requestId = path[2] && !["new", "edit"].includes(path[2]) ? path[2] : null;
      return subscribeToOrganizationStatusChangesInSupabase({ organizationId, feature: "budgets", detailId: requestId, onChange: () => undefined, onStatus });
    }
    if (activeSection === "liquidation-reporting") {
      const path = pathname.split("/").filter(Boolean);
      const reportId = path[2] && !["new", "edit"].includes(path[2]) ? path[2] : null;
      return subscribeToOrganizationStatusChangesInSupabase({ organizationId, feature: "liquidations", detailId: reportId, onChange: () => undefined, onStatus });
    }
  }, [activeSection, organizationId, pathname, registrationSubmissionId]);

  const data = useMemo(() => {
    const activeTemplates = state.templates.filter(
      (template) => (template.templateActive ?? true) && template.isActive !== false,
    );
    const seenTemplateIds = new Set<string>();
    const templates = activeTemplates
      .filter((template) => {
        const key = template.databaseId || template.id;
        if (seenTemplateIds.has(key)) return false;
        seenTemplateIds.add(key);
        return true;
      })
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const requiredTemplates = [...state.templates]
      .filter(isRegistrationRequirementTemplate)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    const submission = state.documentSubmissions.find((item) => item.organizationId === organizationId) ?? null;
    const documentFiles = submission
      ? state.documentSubmissionFiles.filter((item) => item.submissionId === submission.id)
      : [];
    const requiredDocumentFiles = requiredTemplates
      .map((template) =>
        documentFiles.find((file) => isMatchingFileForTemplate(file, template)),
      )
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
    const approvedDocuments = requiredDocumentFiles.filter((item) => approvedDocumentStatuses.has(item.adminStatus)).length;
    const underReviewDocuments = requiredDocumentFiles.filter((item) => underReviewDocumentStatuses.has(item.adminStatus)).length;
    const revisionDocuments = requiredDocumentFiles.filter((item) => revisionDocumentStatuses.has(item.adminStatus));
    const draftDocuments = requiredDocumentFiles.filter((item) => item.adminStatus === "draft").length;
    const missingDocuments = requiredTemplates.filter(
      (template) => !documentFiles.some((file) => isMatchingFileForTemplate(file, template)),
    ).length;
    const documentPercent = requiredTemplates.length
      ? Math.round((approvedDocuments / requiredTemplates.length) * 100)
      : 0;

    const budgetRequests = [...state.budgetRequests]
      .filter((item) => item.organizationId === organizationId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const dashboardSummary = state.organizationDashboardSummary ?? null;
    const budgetRequestCount = dashboardSummary?.budgets.totalCount ?? budgetRequests.length;
    const latestBudget = budgetRequests[0] ?? null;
    const releasedBudget = dashboardSummary?.budgets.releasedAmount ?? budgetRequests.reduce((sum, item) => sum + Number(item.releasedAmount || 0), 0);
    const budgetPercent = latestBudget && approvedBudgetStatuses.has(latestBudget.status) ? 100 : 0;
    const draftBudgetRequests = budgetRequests.filter((item) => item.status === "draft");
    const releasedBudgetRequests = dashboardSummary?.budgets.releasedCount ?? budgetRequests.filter((item) => item.status === "budget_released").length;
    const underReviewBudgetRequests = dashboardSummary?.budgets.underReviewCount ?? budgetRequests.filter((item) => item.status === "submitted" || item.status === "under_review").length;
    const revisionBudgetRequests = budgetRequests.filter((item) => item.status === "needs_revision");
    const draftBudgetRequestCount = dashboardSummary?.budgets.draftCount ?? draftBudgetRequests.length;
    const revisionBudgetRequestCount = dashboardSummary?.budgets.revisionCount ?? revisionBudgetRequests.length;

    const liquidationReports = [...state.liquidationReports]
      .filter((item) => item.organizationId === organizationId)
      .filter((item) => {
        const budget = budgetRequests.find((request) => request.id === item.budgetRequestId);
        return budget ? unlockedLiquidationStatuses.has(budget.status) : false;
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const latestLiquidation = liquidationReports[0] ?? null;
    const liquidationPercent = latestLiquidation?.status === "completed_liquidated" ? 100 : 0;
    const completedLiquidations = dashboardSummary?.liquidations.completedCount ?? liquidationReports.filter((item) => item.status === "completed_liquidated").length;
    const underReviewLiquidations = dashboardSummary?.liquidations.underReviewCount ?? liquidationReports.filter((item) => underReviewLiquidationStatuses.has(item.status)).length;
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
    const revisionLiquidationCount = dashboardSummary?.liquidations.revisionCount ?? revisionLiquidations.length;
    const draftLiquidationCount = dashboardSummary?.liquidations.pendingUploadCount ?? draftLiquidations.length;
    const overdueLiquidationCount = dashboardSummary?.liquidations.overdueCount ?? overdueLiquidations.length;
    const upcomingLiquidations = liquidationReports
      .filter((item) =>
        actionableLiquidationStatuses.has(item.status) &&
        item.deadlineAt &&
        new Date(item.deadlineAt).getTime() >= now,
      )
      .sort((a, b) => a.deadlineAt.localeCompare(b.deadlineAt));
    const nextDeadline = dashboardSummary?.liquidations.nextDeadline ?? upcomingLiquidations[0]?.deadlineAt ?? "";
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
      .filter((item) => item.organizationId === organizationId && item.action !== "admin_notification_dispatched")
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
      hasLiquidation: (dashboardSummary?.liquidations.totalCount ?? liquidationReports.length) > 0,
    });

    const urnRegistration = isUrnRegistration(profile);
    const pendingActions =
      (profile?.profileStatus === "incomplete" ? 1 : 0) +
      (urnRegistration ? (profile?.urnReviewStatus === "needs_correction" ? 1 : 0) : revisionDocuments.length + missingDocuments) +
      (latestBudget?.status === "needs_revision" ? 1 : 0) +
      (dashboardSummary?.liquidations.pendingActionCount ?? liquidationReports.filter((item) => ["not_started", "draft", "needs_revision", "overdue"].includes(item.status)).length);

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
        description: urnStatus === "verified" ? "Your existing PCYDO registration record was confirmed." : urnStatus === "needs_correction" ? (profile!.urnAdminRemarks || "Review the admin feedback and update the submitted number.") : urnStatus === "rejected" ? (profile!.urnAdminRemarks || "Contact PCYDO if you need help with this decision.") : "PCYDO is checking your registration record. You do not need to upload the six new-organization requirements.",
        tone: urnStatus === "verified" ? "success" : urnStatus === "rejected" ? "danger" : urnStatus === "needs_correction" ? "warning" : "info",
        action: { label: urnStatus === "needs_correction" || urnStatus === "rejected" ? "Update URN" : "View URN Status", path: urnStatus === "needs_correction" || urnStatus === "rejected" ? PWA_ROUTES.profileEdit : PWA_ROUTES.documents },
      };
    } else if (!profileComplete) {
      briefing = { title: "Your organization profile is incomplete.", description: "Complete the required organization details before accessing Registration Requirements.", tone: "warning", action: { label: "Complete Profile", path: PWA_ROUTES.profileEdit } };
    } else if (missingDocuments) {
      briefing = { title: `${missingDocuments} required document${missingDocuments === 1 ? " is" : "s are"} still missing.`, description: "Upload the remaining required files for admin review.", tone: "warning", action: { label: "Continue Documents", path: PWA_ROUTES.documentsManage } };
    } else if (revisionDocuments.length) {
      briefing = { title: `${revisionDocuments.length === 1 ? "One document needs" : `${revisionDocuments.length} documents need`} revision.`, description: "Review the latest admin remarks and upload the corrected file.", tone: "warning", action: { label: "Review Required Changes", path: PWA_ROUTES.documents } };
    } else if (profile?.profileStatus === "pending_review") {
      briefing = { title: "Your registration is awaiting verification.", description: "PCYDO is reviewing your organization profile. You can monitor the current status while you wait.", tone: "info", action: { label: "View Verification Status", path: PWA_ROUTES.profile } };
    } else if (!budgetEligibility.eligible) {
      briefing = { title: "Complete YPOP validation first.", description: "Your organization must qualify in the active YPOP period before creating an activity budget request.", tone: "info", action: { label: "Open YPOP Incentive", path: PWA_ROUTES.ypop } };
    } else if (!budgetRequestCount) {
      briefing = { title: "Your organization can create a budget request.", description: "YPOP qualification is complete and no activity budget request has been created yet.", tone: "success", action: { label: "Create Budget Request", path: PWA_ROUTES.budgetNew } };
    } else if (revisionBudgetRequestCount) {
      briefing = { title: "A budget request needs revision.", description: "Review the latest admin feedback and update the request.", tone: "warning", action: { label: "Review Budget", path: PWA_ROUTES.budgets } };
    } else if (latestBudget?.status === "draft") {
      briefing = { title: "You have an unfinished budget request.", description: "Continue the draft and submit it when the required details and file are ready.", tone: "info", action: { label: "View Budget", path: PWA_ROUTES.budgets } };
    } else if (latestBudget && approvedBudgetStatuses.has(latestBudget.status) && !(dashboardSummary?.liquidations.totalCount ?? liquidationReports.length)) {
      briefing = { title: "Your approved budget is moving through the release workflow.", description: "Open the request to review its current release and post-activity status.", tone: "info", action: { label: "View Budget", path: PWA_ROUTES.budgets } };
    } else if (overdueLiquidationCount) {
      briefing = { title: "A liquidation report is overdue.", description: "Submit the required report as soon as possible to restore compliance.", tone: "danger", action: { label: "Submit Liquidation", path: PWA_ROUTES.liquidations } };
    } else if (revisionLiquidationCount) {
      briefing = { title: "A liquidation report needs revision.", description: "Review the admin remarks and upload the corrected report.", tone: "warning", action: { label: "Submit Liquidation", path: PWA_ROUTES.liquidations } };
    } else if (daysUntilDeadline !== null && daysUntilDeadline <= 7) {
      briefing = { title: "A liquidation deadline is approaching.", description: `${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"} remaining before the next deadline.`, tone: "warning", action: { label: "View Liquidation", path: PWA_ROUTES.liquidations } };
    } else if (draftLiquidationCount) {
      briefing = { title: "You have an unfinished liquidation report.", description: "Continue the draft and submit it when the required file is ready.", tone: "info", action: { label: "Continue Liquidation", path: PWA_ROUTES.liquidations } };
    }

    const actions: Array<{ title: string; detail: string; path: string; kind: string }> = [];
    if (!urnRegistration && profileComplete && missingDocuments) actions.push({ title: "Complete Registration Requirements", detail: `${missingDocuments} required file${missingDocuments === 1 ? "" : "s"} remaining.`, path: PWA_ROUTES.documentsManage, kind: "documents" });
    if (!urnRegistration && profileComplete && revisionDocuments.length) actions.push({ title: "Review Required Changes", detail: "Correct the documents flagged by the admin.", path: PWA_ROUTES.documents, kind: "documents" });
    if (urnRegistration) actions.push({ title: urnReviewLabels[profile!.urnReviewStatus], detail: profile!.urnReviewStatus === "needs_correction" ? "Review feedback and submit the corrected URN." : "Open your registration verification record.", path: profile!.urnReviewStatus === "needs_correction" ? PWA_ROUTES.profileEdit : PWA_ROUTES.documents, kind: "profile" });
    if (profileComplete && profile?.profileStatus === "pending_review") actions.push({ title: "View Verification Status", detail: "Your organization profile is awaiting admin verification.", path: PWA_ROUTES.profile, kind: "profile" });
    if (!profileComplete) actions.push({ title: "Complete Profile", detail: "Finish all required organization information before submitting documents.", path: PWA_ROUTES.profileEdit, kind: "profile" });
    if (!budgetEligibility.eligible) actions.push({ title: "Open YPOP Incentive", detail: "Complete the active period qualification workflow.", path: PWA_ROUTES.ypop, kind: "budget" });
    if (budgetEligibility.eligible && !budgetRequestCount) actions.push({ title: "Create Budget Request", detail: "Start an eligible activity budget request.", path: PWA_ROUTES.budgetNew, kind: "budget" });
    if (revisionBudgetRequestCount) actions.push({ title: "Revise Budget Request", detail: "Address the latest review feedback.", path: PWA_ROUTES.budgets, kind: "budget" });
    if (draftBudgetRequestCount) actions.push({ title: "Continue Budget Draft", detail: "Finish the current budget request.", path: PWA_ROUTES.budgets, kind: "budget" });
    if (overdueLiquidationCount) actions.push({ title: "Submit Overdue Liquidation", detail: "Complete the overdue report as soon as possible.", path: PWA_ROUTES.liquidations, kind: "liquidation" });
    if (revisionLiquidationCount) actions.push({ title: "Review Liquidation Remarks", detail: "Correct the report flagged by the admin.", path: PWA_ROUTES.liquidations, kind: "liquidation" });
    if (!overdueLiquidationCount && !revisionLiquidationCount && daysUntilDeadline !== null && daysUntilDeadline <= 7) actions.push({ title: "Submit Liquidation", detail: `${daysUntilDeadline} day${daysUntilDeadline === 1 ? "" : "s"} remain before the deadline.`, path: PWA_ROUTES.liquidations, kind: "liquidation" });
    if (draftLiquidationCount) actions.push({ title: "Continue Liquidation Draft", detail: "Finish the current report draft.", path: PWA_ROUTES.liquidations, kind: "liquidation" });

    const isSuspended =
      profile?.profileStatus === "suspended_inactive" ||
      documentFiles.some(
        (file) => file.adminStatus === "rejected_red" && (!submission || !submission.renewalId),
      );

    return {
      isSuspended,
      templates, requiredTemplates, submission, documentFiles, approvedDocuments, underReviewDocuments,
      revisionDocuments, draftDocuments, missingDocuments, documentPercent, budgetRequests, latestBudget,
      releasedBudget, budgetPercent, budgetRequestCount, releasedBudgetRequests, underReviewBudgetRequests, revisionBudgetRequests, revisionBudgetRequestCount,
      liquidationCount: dashboardSummary?.liquidations.totalCount ?? liquidationReports.length,
      liquidationReports, latestLiquidation, liquidationPercent, completedLiquidations, underReviewLiquidations,
      revisionLiquidations, revisionLiquidationCount, overdueLiquidations, overdueLiquidationCount, draftLiquidationCount, daysUntilDeadline,
      profilePercent, renewalCountdown, notifications,
      unreadCount: state.unreadNotificationCount ?? notifications.filter((item) => !item.isRead).length,
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
    if (!activeSection || !user?.id || !organizationId) return;
    const remoteSnapshot = await loadOrganizationPortalSectionState(activeSection, user.id, organizationId);
    if (remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
  };
  const refreshDocuments = async () => {
    const remoteSnapshot = await loadOrganizationDocumentSubmissionState(undefined, organizationId);
    if (remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
  };
  const refreshBudgets = async () => {
    const remoteSnapshot = await loadOrganizationBudgetSubmissionState(undefined, organizationId);
    if (remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
  };
  const refreshLiquidations = async () => {
    const remoteSnapshot = await loadOrganizationLiquidationSubmissionState(undefined, organizationId);
    if (remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
  };
  const refreshYpop = async () => {
    await invalidateOrganizationYpopQueries(organizationId);
    const remoteSnapshot = await loadOrganizationYpopState(undefined, organizationId);
    if (remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
  };
  const refreshInquiries = async () => {
    const remoteSnapshot = await loadOrganizationInquiriesState(undefined, organizationId);
    if (remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
  };
  const refreshNotifications = async () => {
    const remoteSnapshot = await loadOrganizationNotificationsState();
    if (remoteSnapshot) mergeRemoteStateRef.current(remoteSnapshot);
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
    refreshDocuments,
    refreshBudgets,
    refreshLiquidations,
    refreshYpop,
    refreshInquiries,
    refreshNotifications,
  };
}
