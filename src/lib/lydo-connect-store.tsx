import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  ADMIN_SESSION_CHANGE_EVENT,
  readAdminSession,
} from "./admin-auth";
import {
  type ActivityLog,
  type BudgetRequest,
  type BudgetRequestFile,
  type ComplianceRemark,
  type DocumentSubmission,
  type DocumentSubmissionStatus,
  type LiquidationReport,
  type LiquidationReportFile,
  type LydoSeedState,
  type NewsRelease,
  type NotificationRecord,
  type OrganizationProfile,
  type SubmissionFile,
  type TemplateRecord,
  type TransparencyPost,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPFile,
  type YPOPPeriod,
  legacyRemovedTemplateNames,
  seedState,
} from "./lydo-connect-data";
import { loadAdminPortalSupabaseState, loadLydoConnectSupabaseState } from "./lydo-connect-supabase";
import { supabase } from "./supabase";

const STORAGE_KEY = "lydo-connect-state-v1";
const legacySeedIds = new Set([
  // old prototype IDs
  "org-lydo-001",
  "docsub-001",
  "budget-001",
  "budget-file-001",
  "liq-001",
  "liq-file-001",
  "news-001",
  "transparency-001",
  "remark-001",
  "notif-001",
  "log-001",
  // current demo seed IDs — must never appear for real authenticated users
  "org-demo-001", "org-demo-002", "org-demo-003",
  "docsub-demo-001", "docsub-demo-002",
  "budget-demo-001", "budget-demo-002", "budget-demo-003", "budget-demo-004", "budget-demo-005",
  "liq-demo-001",
  "ypop-demo-001", "ypop-demo-002",
  "ypop-period-001", "ypop-period-002",
  "ypop-act-001", "ypop-act-002", "ypop-act-003", "ypop-act-004",
  "ypop-act-005", "ypop-act-006", "ypop-act-007", "ypop-act-008",
  "ypop-file-001", "ypop-file-002", "ypop-file-003",
]);

type LydoConnectState = LydoSeedState;

type UpdatePatch<T> = Partial<T> | ((current: T) => T);

const createLocalId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const addMonthsToIso = (iso: string, months: number) => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  const nextDate = new Date(date);
  nextDate.setMonth(nextDate.getMonth() + months);
  return nextDate.toISOString();
};

const approvedBudgetStatuses = new Set<BudgetRequest["status"]>([
  "approved_for_ftf_green",
  "budget_released",
  "completed",
]);
const liquidationUnlockedBudgetStatuses = new Set<BudgetRequest["status"]>(["budget_released", "completed"]);

type LydoConnectContextValue = {
  state: LydoConnectState;
  mergeRemoteState: (snapshot: Partial<LydoConnectState>) => void;
  createTemplate: (template: TemplateRecord) => void;
  removeTemplate: (id: string) => void;
  updateOrganizationProfile: (id: string, patch: UpdatePatch<OrganizationProfile>) => void;
  upsertOrganizationProfile: (profile: OrganizationProfile) => void;
  updateDocumentSubmission: (id: string, patch: UpdatePatch<DocumentSubmission>) => void;
  updateDocumentFile: (id: string, patch: UpdatePatch<SubmissionFile>) => void;
  createBudgetRequest: (budgetRequest: BudgetRequest) => void;
  updateBudgetRequest: (id: string, patch: UpdatePatch<BudgetRequest>) => void;
  upsertBudgetRequestFile: (file: BudgetRequestFile) => void;
  updateBudgetRequestFile: (id: string, patch: UpdatePatch<BudgetRequestFile>) => void;
  deleteBudgetRequest: (id: string) => void;
  updateLiquidationReport: (id: string, patch: UpdatePatch<LiquidationReport>) => void;
  createLiquidationReport: (report: LiquidationReport) => void;
  deleteLiquidationReport: (id: string) => void;
  createLiquidationReportFile: (file: LiquidationReportFile) => void;
  updateLiquidationReportFile: (id: string, patch: UpdatePatch<LiquidationReportFile>) => void;
  deleteLiquidationReportFile: (id: string) => void;
  createNewsRelease: (newsRelease: NewsRelease) => void;
  updateNewsRelease: (id: string, patch: UpdatePatch<NewsRelease>) => void;
  removeNewsRelease: (id: string) => void;
  updateTransparencyPost: (id: string, patch: UpdatePatch<TransparencyPost>) => void;
  updateComplianceRemark: (id: string, patch: UpdatePatch<ComplianceRemark>) => void;
  updateNotification: (id: string, patch: UpdatePatch<NotificationRecord>) => void;
  updateActivityLog: (id: string, patch: UpdatePatch<ActivityLog>) => void;
  updateTemplate: (id: string, patch: UpdatePatch<TemplateRecord>) => void;
  createNotification: (notification: NotificationRecord) => void;
  createActivityLog: (activity: ActivityLog) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  setDocumentSubmissionStatus: (id: string, status: DocumentSubmissionStatus, remarks?: string) => void;
  createYPOPEntry: (entry: YPOPEntry) => void;
  updateYPOPEntry: (id: string, patch: UpdatePatch<YPOPEntry>) => void;
  deleteYPOPEntry: (id: string) => void;
  createYPOPFile: (file: YPOPFile) => void;
  deleteYPOPFile: (id: string) => void;
  createYPOPCityActivity: (activity: YPOPCityActivity) => void;
  updateYPOPCityActivity: (id: string, patch: UpdatePatch<YPOPCityActivity>) => void;
  deleteYPOPCityActivity: (id: string) => void;
  createYPOPPeriod: (period: YPOPPeriod) => void;
  updateYPOPPeriod: (id: string, patch: UpdatePatch<YPOPPeriod>) => void;
  deleteYPOPPeriod: (id: string) => void;
};

const LydoConnectContext = createContext<LydoConnectContextValue | undefined>(undefined);

const readState = (): LydoConnectState => {
  if (typeof window === "undefined") return seedState;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) return seedState;

  try {
    const parsed = JSON.parse(raw) as Partial<LydoConnectState>;
    return {
      ...seedState,
      ...parsed,
      organizationProfiles: ((parsed.organizationProfiles ?? seedState.organizationProfiles) as OrganizationProfile[])
        .filter((item) => !legacySeedIds.has(item.id))
        .map((item) => {
          if (import.meta.env.DEV) {
            const seed = seedState.organizationProfiles.find((s) => s.id === item.id);
            if (seed) return normalizeOrganizationProfile({ ...seed });
          }
          return normalizeOrganizationProfile(item);
        }),
      documentSubmissions: ((parsed.documentSubmissions ?? seedState.documentSubmissions) as DocumentSubmission[]).filter(
        (item) => !legacySeedIds.has(item.id),
      ),
      documentSubmissionFiles: (() => {
        const stored = ((parsed.documentSubmissionFiles ?? []) as SubmissionFile[])
          .filter(item => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.submissionId));
        const storedIds = new Set(stored.map(f => f.id));
        return [...stored, ...seedState.documentSubmissionFiles.filter(f => !storedIds.has(f.id) && !legacySeedIds.has(f.id))];
      })(),
      budgetRequests: (() => {
        const stored = ((parsed.budgetRequests ?? []) as BudgetRequest[])
          .filter(item => !legacySeedIds.has(item.id));
        const storedIds = new Set(stored.map(r => r.id));
        const merged = stored.map(r => {
          const seedEntry = seedState.budgetRequests.find(s => s.id === r.id);
          if (!seedEntry) return r;
          return {
            ...r,
            revisionHistory: r.revisionHistory?.length ? r.revisionHistory : seedEntry.revisionHistory,
            userNote: r.userNote !== undefined ? r.userNote : seedEntry.userNote,
          };
        });
        return [...merged, ...seedState.budgetRequests.filter(s => !storedIds.has(s.id) && !legacySeedIds.has(s.id))];
      })(),
      budgetRequestFiles: ((parsed.budgetRequestFiles ?? seedState.budgetRequestFiles) as BudgetRequestFile[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.budgetRequestId),
      ),
      liquidationReports: (() => {
        const stored = ((parsed.liquidationReports ?? []) as LiquidationReport[]).filter(
          (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.budgetRequestId),
        );
        const storedIds = new Set(stored.map((r) => r.id));
        const merged = stored.map((r) => {
          const seedEntry = seedState.liquidationReports.find((s) => s.id === r.id);
          if (!seedEntry) return r;
          return { ...r, revisionHistory: r.revisionHistory?.length ? r.revisionHistory : seedEntry.revisionHistory };
        });
        return [...merged, ...seedState.liquidationReports.filter((s) => !storedIds.has(s.id) && !legacySeedIds.has(s.id))];
      })(),
      liquidationReportFiles: ((parsed.liquidationReportFiles ?? seedState.liquidationReportFiles) as LiquidationReportFile[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.liquidationReportId),
      ),
      newsReleases: ((parsed.newsReleases ?? seedState.newsReleases) as NewsRelease[]).filter(
        (item) => !legacySeedIds.has(item.id),
      ),
      transparencyPosts: ((parsed.transparencyPosts ?? seedState.transparencyPosts) as TransparencyPost[]).filter(
        (item) => !legacySeedIds.has(item.id),
      ),
      complianceRemarks: ((parsed.complianceRemarks ?? seedState.complianceRemarks) as ComplianceRemark[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.relatedId),
      ),
      notifications: (() => {
        const stored = ((parsed.notifications ?? []) as NotificationRecord[]).filter(
          (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.relatedId),
        );
        const storedIds = new Set(stored.map((n) => n.id));
        return [...stored, ...seedState.notifications.filter((n) => !storedIds.has(n.id))];
      })(),
      activityLogs: (() => {
        const stored = ((parsed.activityLogs ?? []) as ActivityLog[]).filter(
          (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.relatedId),
        );
        const storedIds = new Set(stored.map((l) => l.id));
        return [...stored, ...seedState.activityLogs.filter((l) => !storedIds.has(l.id))];
      })(),
      templates: (parsed.templates ?? seedState.templates).filter((template) => !legacyRemovedTemplateNames.has(template.name)),
      ypopEntries: (() => {
        const stored = ((parsed.ypopEntries ?? []) as YPOPEntry[]).filter((e) => !legacySeedIds.has(e.id));
        const storedIds = new Set(stored.map((e) => e.id));
        return [...stored, ...seedState.ypopEntries.filter((e) => !storedIds.has(e.id) && !legacySeedIds.has(e.id))];
      })(),
      ypopFiles: ((parsed.ypopFiles ?? seedState.ypopFiles) as YPOPFile[]).filter((f) => !legacySeedIds.has(f.id)),
      ypopCityActivities: (() => {
        const stored = ((parsed.ypopCityActivities ?? []) as YPOPCityActivity[]).filter((a) => !legacySeedIds.has(a.id));
        const storedIds = new Set(stored.map((a) => a.id));
        return [...stored, ...seedState.ypopCityActivities.filter((a) => !storedIds.has(a.id) && !legacySeedIds.has(a.id))];
      })(),
      ypopPeriods: (() => {
        const stored = ((parsed.ypopPeriods ?? []) as YPOPPeriod[]).filter((p) => !legacySeedIds.has(p.id));
        const storedIds = new Set(stored.map((p) => p.id));
        return [...stored, ...seedState.ypopPeriods.filter((p) => !storedIds.has(p.id) && !legacySeedIds.has(p.id))];
      })(),
    };
  } catch {
    return seedState;
  }
};

const applyPatch = <T extends { id: string }>(items: T[], id: string, patch: UpdatePatch<T>) =>
  items.map((item) => {
    if (item.id !== id) return item;
    return typeof patch === "function" ? patch(item) : { ...item, ...patch };
  });

const removeById = <T extends { id: string }>(items: T[], id: string) =>
  items.filter((item) => item.id !== id);

const syncLiquidationReportForBudget = (
  liquidations: LiquidationReport[],
  budget: BudgetRequest,
  nowIso: string,
) => {
  if (!liquidationUnlockedBudgetStatuses.has(budget.status)) return liquidations;

  const existing = liquidations.find((report) => report.budgetRequestId === budget.id) ?? null;
  const goSignalAt = budget.goSignalAt || existing?.goSignalAt || nowIso;
  const deadlineAt = existing?.deadlineAt || addMonthsToIso(goSignalAt, 1);

  const syncedReport: LiquidationReport = existing
    ? {
        ...existing,
        organizationId: budget.organizationId,
        submittedBy: budget.submittedBy,
        goSignalAt,
        deadlineAt,
        updatedAt: nowIso,
      }
    : {
        id: createLocalId("liq"),
        budgetRequestId: budget.id,
        organizationId: budget.organizationId,
        submittedBy: budget.submittedBy,
        status: "pending_activity_completion",
        remarks: "",
        goSignalAt,
        deadlineAt,
        hardCopySubmittedAt: "",
        completedAt: "",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

  if (existing) {
    return liquidations.map((report) => (report.id === existing.id ? syncedReport : report));
  }

  return [syncedReport, ...liquidations];
};

const normalizeOrganizationProfile = (profile: OrganizationProfile): OrganizationProfile => ({
  ...profile,
  district: profile.district ?? "",
  majorClassification: profile.majorClassification ?? "",
  subClassification: profile.subClassification ?? "",
  advocacies: profile.advocacies ?? [],
});

export const LydoConnectProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<LydoConnectState>(() => readState());

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (!supabase) return;

    let active = true;

    const syncState = async () => {
      try {
        const snapshot =
          (await loadLydoConnectSupabaseState()) ??
          (readAdminSession() ? await loadAdminPortalSupabaseState() : null);
        if (!active || !snapshot) return;
        setState((current) => ({
          ...current,
          ...snapshot,
        }));
      } catch (error) {
        console.error("Failed to sync Y-TRACE state from Supabase:", error);
      }
    };

    void syncState();
    const syncInterval = window.setInterval(() => {
      void syncState();
    }, 5000);

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      void syncState();
    });
    const handleAdminSessionChange = () => {
      void syncState();
    };
    const handleWindowFocus = () => {
      void syncState();
    };
    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, handleAdminSessionChange);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      active = false;
      window.clearInterval(syncInterval);
      authListener.subscription.unsubscribe();
      window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, handleAdminSessionChange);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, []);

  const value = useMemo<LydoConnectContextValue>(
    () => ({
      state,
      mergeRemoteState: (snapshot) =>
        setState((current) => ({
          ...current,
          ...snapshot,
        })),
      createTemplate: (template) =>
        setState((current) => ({
          ...current,
          templates: [...current.templates, template].sort((left, right) => left.sortOrder - right.sortOrder),
        })),
      removeTemplate: (id) =>
        setState((current) => ({
          ...current,
          templates: current.templates.filter((template) => template.id !== id),
        })),
      updateOrganizationProfile: (id, patch) =>
        setState((current) => ({
          ...current,
          organizationProfiles: applyPatch(current.organizationProfiles, id, patch),
        })),
      upsertOrganizationProfile: (profile) =>
        setState((current) => {
          const existingIndex = current.organizationProfiles.findIndex(
            (item) => item.id === profile.id || item.userId === profile.userId,
          );

          if (existingIndex < 0) {
            return {
              ...current,
              organizationProfiles: [profile, ...current.organizationProfiles],
            };
          }

          const organizationProfiles = [...current.organizationProfiles];
          organizationProfiles[existingIndex] = profile;
          return {
            ...current,
            organizationProfiles,
          };
        }),
      updateDocumentSubmission: (id, patch) =>
        setState((current) => ({
          ...current,
          documentSubmissions: applyPatch(current.documentSubmissions, id, patch),
        })),
      updateDocumentFile: (id, patch) =>
        setState((current) => ({
          ...current,
          documentSubmissionFiles: applyPatch(current.documentSubmissionFiles, id, patch),
        })),
      createBudgetRequest: (budgetRequest) =>
        setState((current) => {
          const nowIso = new Date().toISOString();
          const normalizedBudgetRequest: BudgetRequest = {
            ...budgetRequest,
            createdAt: budgetRequest.createdAt || nowIso,
            updatedAt: budgetRequest.updatedAt || nowIso,
          };
          return {
            ...current,
            budgetRequests: [normalizedBudgetRequest, ...current.budgetRequests],
            liquidationReports: syncLiquidationReportForBudget(
              current.liquidationReports,
              normalizedBudgetRequest,
              nowIso,
            ),
          };
        }),
      updateBudgetRequest: (id, patch) =>
        setState((current) => {
          const nowIso = new Date().toISOString();
          const updatedBudgetRequests = applyPatch(current.budgetRequests, id, patch);
          const updatedBudget = updatedBudgetRequests.find((request) => request.id === id) ?? null;

          return {
            ...current,
            budgetRequests: updatedBudgetRequests.map((request) => ({
              ...request,
              updatedAt: request.id === id ? nowIso : request.updatedAt,
            })),
            liquidationReports:
              updatedBudget && liquidationUnlockedBudgetStatuses.has(updatedBudget.status)
                ? syncLiquidationReportForBudget(current.liquidationReports, { ...updatedBudget, updatedAt: nowIso }, nowIso)
                : current.liquidationReports,
          };
        }),
      upsertBudgetRequestFile: (file) =>
        setState((current) => {
          const existingIndex = current.budgetRequestFiles.findIndex(
            (entry) => entry.budgetRequestId === file.budgetRequestId,
          );

          if (existingIndex < 0) {
            return {
              ...current,
              budgetRequestFiles: [file, ...current.budgetRequestFiles],
            };
          }

          const budgetRequestFiles = [...current.budgetRequestFiles];
          budgetRequestFiles[existingIndex] = file;
          return {
            ...current,
            budgetRequestFiles,
          };
        }),
      updateBudgetRequestFile: (id, patch) =>
        setState((current) => ({
          ...current,
          budgetRequestFiles: applyPatch(current.budgetRequestFiles, id, patch),
        })),
      deleteBudgetRequest: (id) =>
        setState((current) => {
          const budgetRequest = current.budgetRequests.find((request) => request.id === id) ?? null;
          const relatedLiquidationIds = current.liquidationReports
            .filter((report) => report.budgetRequestId === id)
            .map((report) => report.id);
          return {
            ...current,
            budgetRequests: removeById(current.budgetRequests, id),
            budgetRequestFiles: current.budgetRequestFiles.filter((file) => file.budgetRequestId !== id),
            liquidationReports: current.liquidationReports.filter((report) => report.budgetRequestId !== id),
            liquidationReportFiles: current.liquidationReportFiles.filter(
              (file) => !relatedLiquidationIds.includes(file.liquidationReportId),
            ),
            notifications: budgetRequest
              ? current.notifications.filter(
                  (notification) =>
                    !(notification.relatedType === "budget_request" && notification.relatedId === budgetRequest.id),
                )
              : current.notifications,
            activityLogs: budgetRequest
              ? current.activityLogs.filter(
                  (log) => !(log.relatedType === "budget_request" && log.relatedId === budgetRequest.id),
                )
              : current.activityLogs,
          };
        }),
      updateLiquidationReport: (id, patch) =>
        setState((current) => ({
          ...current,
          liquidationReports: applyPatch(current.liquidationReports, id, patch).map((report) => ({
            ...report,
            updatedAt: report.id === id ? new Date().toISOString() : report.updatedAt,
          })),
        })),
      createLiquidationReport: (report) =>
        setState((current) => ({
          ...current,
          liquidationReports: [report, ...current.liquidationReports],
        })),
      deleteLiquidationReport: (id) =>
        setState((current) => ({
          ...current,
          liquidationReports: removeById(current.liquidationReports, id),
          liquidationReportFiles: current.liquidationReportFiles.filter(
            (file) => file.liquidationReportId !== id,
          ),
        })),
      createLiquidationReportFile: (file) =>
        setState((current) => ({
          ...current,
          liquidationReportFiles: [file, ...current.liquidationReportFiles],
        })),
      updateLiquidationReportFile: (id, patch) =>
        setState((current) => ({
          ...current,
          liquidationReportFiles: applyPatch(current.liquidationReportFiles, id, patch),
        })),
      deleteLiquidationReportFile: (id) =>
        setState((current) => ({
          ...current,
          liquidationReportFiles: removeById(current.liquidationReportFiles, id),
        })),
      createNewsRelease: (newsRelease) =>
        setState((current) => ({
          ...current,
          newsReleases: [newsRelease, ...current.newsReleases],
        })),
      updateNewsRelease: (id, patch) =>
        setState((current) => ({
          ...current,
          newsReleases: applyPatch(current.newsReleases, id, patch),
        })),
      removeNewsRelease: (id) =>
        setState((current) => ({
          ...current,
          newsReleases: removeById(current.newsReleases, id),
        })),
      updateTransparencyPost: (id, patch) =>
        setState((current) => ({
          ...current,
          transparencyPosts: applyPatch(current.transparencyPosts, id, patch),
        })),
      updateComplianceRemark: (id, patch) =>
        setState((current) => ({
          ...current,
          complianceRemarks: applyPatch(current.complianceRemarks, id, patch),
        })),
      updateNotification: (id, patch) =>
        setState((current) => ({
          ...current,
          notifications: applyPatch(current.notifications, id, patch),
        })),
      updateActivityLog: (id, patch) =>
        setState((current) => ({
          ...current,
          activityLogs: applyPatch(current.activityLogs, id, patch),
        })),
      updateTemplate: (id, patch) =>
        setState((current) => ({
          ...current,
          templates: applyPatch(current.templates, id, patch),
        })),
      createNotification: (notification) =>
        setState((current) => ({
          ...current,
          notifications: [notification, ...current.notifications],
        })),
      createActivityLog: (activity) =>
        setState((current) => ({
          ...current,
          activityLogs: [activity, ...current.activityLogs],
        })),
      markNotificationRead: (id) =>
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((notification) =>
            notification.id === id ? { ...notification, isRead: true } : notification,
          ),
        })),
      markAllNotificationsRead: () =>
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((n) => ({ ...n, isRead: true })),
        })),
      setDocumentSubmissionStatus: (id, status, remarks) =>
        setState((current) => ({
          ...current,
          documentSubmissions: current.documentSubmissions.map((submission) =>
            submission.id === id
              ? {
                  ...submission,
                  status,
                  overallRemarks: remarks ?? submission.overallRemarks,
                  updatedAt: new Date().toISOString(),
                }
              : submission,
          ),
        })),
      createYPOPEntry: (entry) =>
        setState((current) => ({
          ...current,
          ypopEntries: [entry, ...current.ypopEntries],
        })),
      updateYPOPEntry: (id, patch) =>
        setState((current) => ({
          ...current,
          ypopEntries: applyPatch(current.ypopEntries, id, patch).map((entry) => ({
            ...entry,
            updatedAt: entry.id === id ? new Date().toISOString() : entry.updatedAt,
          })),
        })),
      deleteYPOPEntry: (id) =>
        setState((current) => ({
          ...current,
          ypopEntries: removeById(current.ypopEntries, id),
          ypopFiles: current.ypopFiles.filter((f) => f.ypopEntryId !== id),
        })),
      createYPOPFile: (file) =>
        setState((current) => ({
          ...current,
          ypopFiles: [file, ...current.ypopFiles],
        })),
      deleteYPOPFile: (id) =>
        setState((current) => ({
          ...current,
          ypopFiles: removeById(current.ypopFiles, id),
        })),
      createYPOPCityActivity: (activity) =>
        setState((current) => ({
          ...current,
          ypopCityActivities: [...current.ypopCityActivities, activity],
        })),
      updateYPOPCityActivity: (id, patch) =>
        setState((current) => ({
          ...current,
          ypopCityActivities: applyPatch(current.ypopCityActivities, id, patch),
        })),
      deleteYPOPCityActivity: (id) =>
        setState((current) => ({
          ...current,
          ypopCityActivities: removeById(current.ypopCityActivities, id),
        })),
      createYPOPPeriod: (period) =>
        setState((current) => ({
          ...current,
          ypopPeriods: [...current.ypopPeriods, period],
        })),
      updateYPOPPeriod: (id, patch) =>
        setState((current) => ({
          ...current,
          ypopPeriods: applyPatch(current.ypopPeriods, id, patch).map((p) => ({
            ...p,
            updatedAt: p.id === id ? new Date().toISOString() : p.updatedAt,
          })),
        })),
      deleteYPOPPeriod: (id) =>
        setState((current) => {
          const period = current.ypopPeriods.find((p) => p.id === id);
          return {
            ...current,
            ypopPeriods: removeById(current.ypopPeriods, id),
            ypopCityActivities: period
              ? current.ypopCityActivities.filter((a) => a.semesterKey !== period.semesterKey)
              : current.ypopCityActivities,
          };
        }),
    }),
    [state],
  );

  return <LydoConnectContext.Provider value={value}>{children}</LydoConnectContext.Provider>;
};

export const useLydoConnect = () => {
  const context = useContext(LydoConnectContext);
  if (!context) {
    throw new Error("useLydoConnect must be used within LydoConnectProvider");
  }
  return context;
};
