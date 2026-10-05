import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
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
  type InquiryRecord,
  type OrganizationProfile,
  type SubmissionFile,
  type TemplateRecord,
  type TransparencyPost,
  type YPOPCityActivity,
  type YPOPEntry,
  type YPOPEventFile,
  type YPOPEventParticipation,
  type YPOPFile,
  type YPOPOrgActivity,
  type YPOPOrgActivityFile,
  type YPOPPeriod,
  type NewsCategoryRecord,
  INITIAL_NEWS_CATEGORIES,
  deriveTemplateCategory,
  isSystemTemplateCategory,
  legacyRemovedTemplateNames,
  normalizeInquiryStatus,
  normalizeTemplateCategoryKey,
  seedState,
} from "./lydo-connect-data";
import { loadOrganizationBootstrapState } from "./lydo-connect-supabase";
import { supabase, supabaseAuthStorageKey } from "./supabase";
import { pruneDeletedYpopSubmissions } from "./ypop-submission-deletion";

export type AccountIdentity =
  | { type: "admin"; id: string; token: string }
  | { type: "user"; id: string }
  | { type: "anonymous" };

export const getAccountIdentityKey = (identity: AccountIdentity): string => {
  if (identity.type === "admin") return `admin:${identity.id}`;
  if (identity.type === "user") return `user:${identity.id}`;
  return "anonymous";
};

export const getStorageKeyForIdentity = (identity: AccountIdentity): string =>
  `lydo-connect-state-v1:${getAccountIdentityKey(identity)}`;

export const isSameIdentity = (a: AccountIdentity, b: AccountIdentity): boolean => {
  if (a.type !== b.type) return false;
  if (a.type === "admin" && b.type === "admin") return a.id === b.id && a.token === b.token;
  if (a.type === "user" && b.type === "user") return a.id === b.id;
  if (a.type === "anonymous" && b.type === "anonymous") return true;
  return false;
};

export const readSynchronousAuthUserId = (): string | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(supabaseAuthStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.user?.id ?? null;
  } catch {
    return null;
  }
};

export const resolveInitialIdentity = (): AccountIdentity => {
  const admin = readAdminSession();
  if (admin?.sessionToken) {
    return { type: "admin", id: admin.id, token: admin.sessionToken };
  }
  const userId = readSynchronousAuthUserId();
  if (userId) {
    return { type: "user", id: userId };
  }
  return { type: "anonymous" };
};

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
  "ypop-participation-001", "ypop-participation-002", "ypop-participation-003",
  "ypop-event-file-001", "ypop-event-file-002", "ypop-event-file-003",
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

const approvedBudgetStatuses = new Set<string>([
  "awaiting_release",
  "approved_for_ftf_green",
  "hard_copy_submitted",
  "budget_released",
]);
const liquidationUnlockedBudgetStatuses = new Set<BudgetRequest["status"]>(["budget_released"]);

export const clearAccountScopedState = (base: LydoConnectState): LydoConnectState => ({
  ...base,
  organizationProfiles: [],
  documentSubmissions: [],
  documentSubmissionFiles: [],
  budgetRequests: [],
  budgetRequestFiles: [],
  liquidationReports: [],
  liquidationReportFiles: [],
  complianceRemarks: [],
  notifications: [],
  activityLogs: [],
  inquiries: [],
  ypopEntries: [],
  ypopDeletionReceipts: [],
  ypopFiles: [],
  ypopEventParticipations: [],
  ypopEventFiles: [],
  ypopOrgActivities: [],
  ypopOrgActivityFiles: [],
  customTemplateCategories: base.customTemplateCategories ?? [],
});

export const normalizeTemplates = (templates: TemplateRecord[]): TemplateRecord[] => {
  const byIdentity = new Map<string, TemplateRecord>();
  for (const template of templates ?? []) {
    if (!template || legacyRemovedTemplateNames.has(template.name)) continue;
    const normalized: TemplateRecord = {
      ...template,
      templateCategories:
        Array.isArray(template.templateCategories) && template.templateCategories.length > 0
          ? template.templateCategories.filter(Boolean)
          : [deriveTemplateCategory(template.name)],
      templateFileSize: template.templateFileSize ?? null,
    };

    const nameKey = template.name.trim().toLowerCase();
    const existing =
      byIdentity.get(nameKey) ||
      (template.databaseId ? byIdentity.get(template.databaseId) : undefined) ||
      byIdentity.get(template.id);

    if (existing) {
      const oldNameKey = existing.name.trim().toLowerCase();
      const merged: TemplateRecord = {
        ...existing,
        ...normalized,
        databaseId: normalized.databaseId || existing.databaseId,
        id: normalized.id || existing.id,
      };
      if (oldNameKey !== nameKey) byIdentity.delete(oldNameKey);
      if (existing.databaseId) byIdentity.delete(existing.databaseId);
      if (existing.id) byIdentity.delete(existing.id);
      byIdentity.set(nameKey, merged);
      if (merged.databaseId) byIdentity.set(merged.databaseId, merged);
      if (merged.id) byIdentity.set(merged.id, merged);
    } else {
      byIdentity.set(nameKey, normalized);
      if (normalized.databaseId) byIdentity.set(normalized.databaseId, normalized);
      if (normalized.id) byIdentity.set(normalized.id, normalized);
    }
  }
  return Array.from(new Set(byIdentity.values()));
};

const normalizeInitialSeedState = (seed: LydoSeedState): LydoConnectState => ({
  ...seed,
  organizationProfiles: seed.organizationProfiles.filter((item) => !legacySeedIds.has(item.id)),
  documentSubmissions: seed.documentSubmissions.filter((item) => !legacySeedIds.has(item.id)),
  documentSubmissionFiles: seed.documentSubmissionFiles.filter((item) => !legacySeedIds.has(item.id)),
  budgetRequests: seed.budgetRequests.filter((item) => !legacySeedIds.has(item.id)),
  budgetRequestFiles: seed.budgetRequestFiles.filter((item) => !legacySeedIds.has(item.id)),
  liquidationReports: seed.liquidationReports.filter((item) => !legacySeedIds.has(item.id)),
  liquidationReportFiles: seed.liquidationReportFiles.filter((item) => !legacySeedIds.has(item.id)),
  newsReleases: seed.newsReleases.filter((item) => !legacySeedIds.has(item.id)),
  transparencyPosts: seed.transparencyPosts.filter((item) => !legacySeedIds.has(item.id)),
  complianceRemarks: seed.complianceRemarks.filter((item) => !legacySeedIds.has(item.id)),
  notifications: seed.notifications.filter((item) => !legacySeedIds.has(item.id)),
  activityLogs: seed.activityLogs.filter((item) => !legacySeedIds.has(item.id)),
  inquiries: seed.inquiries.filter((item) => !legacySeedIds.has(item.id)),
  templates: normalizeTemplates(seed.templates),
  ypopEntries: seed.ypopEntries.filter((item) => !legacySeedIds.has(item.id)),
  ypopFiles: seed.ypopFiles.filter((item) => !legacySeedIds.has(item.id)),
  ypopEventParticipations: seed.ypopEventParticipations.filter((item) => !legacySeedIds.has(item.id)),
  ypopEventFiles: seed.ypopEventFiles.filter((item) => !legacySeedIds.has(item.id)),
  ypopOrgActivities: seed.ypopOrgActivities.filter((item) => !legacySeedIds.has(item.id)),
  ypopOrgActivityFiles: seed.ypopOrgActivityFiles.filter((item) => !legacySeedIds.has(item.id)),
  ypopCityActivities: seed.ypopCityActivities.filter((item) => !legacySeedIds.has(item.id)),
  ypopPeriods: seed.ypopPeriods.filter((item) => !legacySeedIds.has(item.id)),
  newsCategories: Array.isArray(seed.newsCategories) && seed.newsCategories.length > 0
    ? seed.newsCategories
    : INITIAL_NEWS_CATEGORIES,
  customTemplateCategories: Array.isArray(seed.customTemplateCategories)
    ? Array.from(
        new Set(
          seed.customTemplateCategories
            .map(normalizeTemplateCategoryKey)
            .filter((k) => Boolean(k) && !isSystemTemplateCategory(k)),
        ),
      )
    : [],
});

type LydoConnectContextValue = {
  state: LydoConnectState;
  isInitialSyncDone: boolean;
  resetAccountState: () => void;
  mergeRemoteState: (snapshot: Partial<LydoConnectState>) => void;
  createTemplate: (template: TemplateRecord) => void;
  removeTemplate: (id: string) => void;
  updateOrganizationProfile: (id: string, patch: UpdatePatch<OrganizationProfile>) => void;
  upsertOrganizationProfile: (profile: OrganizationProfile) => void;
  removeOrganizationAccountFromCache: (organizationId: string) => void;
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
  createInquiry: (inquiry: InquiryRecord) => void;
  updateInquiry: (id: string, patch: UpdatePatch<InquiryRecord>) => void;
  removeInquiry: (id: string) => void;
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
  createYPOPEventParticipation: (participation: YPOPEventParticipation) => void;
  updateYPOPEventParticipation: (id: string, patch: UpdatePatch<YPOPEventParticipation>) => void;
  createYPOPEventFile: (file: YPOPEventFile) => void;
  deleteYPOPEventFile: (id: string) => void;
  createYPOPOrgActivity: (activity: YPOPOrgActivity) => void;
  updateYPOPOrgActivity: (id: string, patch: UpdatePatch<YPOPOrgActivity>) => void;
  deleteYPOPOrgActivity: (id: string) => void;
  createYPOPOrgActivityFile: (file: YPOPOrgActivityFile) => void;
  deleteYPOPOrgActivityFile: (id: string) => void;
  createYPOPCityActivity: (activity: YPOPCityActivity) => void;
  updateYPOPCityActivity: (id: string, patch: UpdatePatch<YPOPCityActivity>) => void;
  deleteYPOPCityActivity: (id: string) => void;
  createYPOPPeriod: (period: YPOPPeriod) => void;
  updateYPOPPeriod: (id: string, patch: UpdatePatch<YPOPPeriod>) => void;
  deleteYPOPPeriod: (id: string) => void;
  addCustomTemplateCategory: (category: string) => void;
  removeCustomTemplateCategory: (category: string) => void;
  setNewsCategories: (categories: NewsCategoryRecord[]) => void;
  addNewsCategory: (category: NewsCategoryRecord) => void;
  removeNewsCategory: (categoryIdOrNormalized: string) => void;
};

const LydoConnectContext = createContext<LydoConnectContextValue | undefined>(undefined);

/** Keep only account bootstrap data and locally useful drafts in durable browser storage. */
const createUserPersistedDraftState = (state: LydoConnectState): Partial<LydoConnectState> => {
  const documentSubmissions = state.documentSubmissions.filter((item) => item.status === "draft");
  const budgetRequests = state.budgetRequests.filter((item) => item.status === "draft");
  const liquidationReports = state.liquidationReports.filter((item) => item.status === "draft" || item.status === "not_started");
  const ypopEntries = state.ypopEntries.filter((item) => item.status === "draft");
  const ypopEventParticipations = state.ypopEventParticipations.filter((item) => item.status === "draft");
  const ypopOrgActivities = state.ypopOrgActivities.filter((item) => item.status === "draft");
  const docSubmissionIds = new Set(documentSubmissions.map((item) => item.id));
  const budgetRequestIds = new Set(budgetRequests.map((item) => item.id));
  const liquidationReportIds = new Set(liquidationReports.map((item) => item.id));
  const ypopEntryIds = new Set(ypopEntries.map((item) => item.id));
  const ypopParticipationIds = new Set(ypopEventParticipations.map((item) => item.id));
  const ypopOrgActivityIds = new Set(ypopOrgActivities.map((item) => item.id));

  return {
    organizationProfiles: state.organizationProfiles.slice(0, 1),
    documentSubmissions,
    documentSubmissionFiles: state.documentSubmissionFiles.filter((item) => docSubmissionIds.has(item.submissionId)),
    budgetRequests,
    budgetRequestFiles: state.budgetRequestFiles.filter((item) => budgetRequestIds.has(item.budgetRequestId)),
    liquidationReports,
    liquidationReportFiles: state.liquidationReportFiles.filter((item) => liquidationReportIds.has(item.liquidationReportId)),
    newsReleases: [],
    transparencyPosts: [],
    complianceRemarks: [],
    notifications: [],
    unreadNotificationCount: 0,
    activityLogs: [],
    inquiries: [],
    templates: [],
    ypopEntries,
    ypopFiles: state.ypopFiles.filter((item) => ypopEntryIds.has(item.ypopEntryId)),
    ypopEventParticipations,
    ypopEventFiles: state.ypopEventFiles.filter((item) => ypopParticipationIds.has(item.participationId)),
    ypopOrgActivities,
    ypopOrgActivityFiles: state.ypopOrgActivityFiles.filter((item) => ypopOrgActivityIds.has(item.orgActivityId)),
    ypopCityActivities: [],
    ypopPeriods: [],
    ypopDeletionReceipts: [],
    customTemplateCategories: state.customTemplateCategories,
    newsCategories: state.newsCategories,
  };
};

export const readState = (identity?: AccountIdentity): LydoConnectState => {
  const targetIdentity = identity ?? resolveInitialIdentity();
  const baseState = normalizeInitialSeedState(seedState);

  if (typeof window === "undefined") {
    return clearAccountScopedState(baseState);
  }

  // Clean up legacy global key if present to prevent cross-account leakage
  try {
    window.localStorage.removeItem("lydo-connect-state-v1");
  } catch {
    // ignore storage removal error
  }

  const storageKey = getStorageKeyForIdentity(targetIdentity);
  if (targetIdentity.type === "admin" && supabase) {
    // Admin data must not be persisted wholesale in browser storage. It is
    // loaded from the session-validated admin data layer instead. When the app
    // is running offline without Supabase, retain the local demo workflow.
    try {
      window.localStorage.removeItem(storageKey);
    } catch {
      // ignore storage removal errors
    }
    return clearAccountScopedState(baseState);
  }
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    if (targetIdentity.type === "admin") {
      return {
        ...baseState,
        organizationProfiles: seedState.organizationProfiles.map(normalizeOrganizationProfile),
      };
    }
    return clearAccountScopedState(baseState);
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LydoConnectState>;

    if (targetIdentity.type === "anonymous") {
      return clearAccountScopedState({
        ...baseState,
        ...parsed,
      });
    }

    return {
      ...baseState,
      ...parsed,
      organizationProfiles: targetIdentity.type === "admin"
        ? (Array.isArray(parsed.organizationProfiles) && parsed.organizationProfiles.length > 0
            ? parsed.organizationProfiles.map(normalizeOrganizationProfile)
            : seedState.organizationProfiles.map(normalizeOrganizationProfile))
        : ((parsed.organizationProfiles ?? []) as OrganizationProfile[])
            .filter((item) => !legacySeedIds.has(item.id))
            .filter((item) => item.userId === targetIdentity.id)
            .map(normalizeOrganizationProfile),
      documentSubmissions: ((parsed.documentSubmissions ?? []) as DocumentSubmission[]).filter(
        (item) => !legacySeedIds.has(item.id),
      ),
      documentSubmissionFiles: ((parsed.documentSubmissionFiles ?? []) as SubmissionFile[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.submissionId),
      ),
      budgetRequests: ((parsed.budgetRequests ?? []) as BudgetRequest[]).filter(
        (item) => !legacySeedIds.has(item.id),
      ),
      budgetRequestFiles: ((parsed.budgetRequestFiles ?? []) as BudgetRequestFile[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.budgetRequestId),
      ),
      liquidationReports: ((parsed.liquidationReports ?? []) as LiquidationReport[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.budgetRequestId),
      ),
      liquidationReportFiles: ((parsed.liquidationReportFiles ?? []) as LiquidationReportFile[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.liquidationReportId),
      ),
      newsReleases: ((parsed.newsReleases ?? baseState.newsReleases) as NewsRelease[]).filter(
        (item) => !legacySeedIds.has(item.id),
      ),
      transparencyPosts: ((parsed.transparencyPosts ?? baseState.transparencyPosts) as TransparencyPost[]).filter(
        (item) => !legacySeedIds.has(item.id),
      ),
      complianceRemarks: ((parsed.complianceRemarks ?? []) as ComplianceRemark[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.relatedId),
      ),
      notifications: ((parsed.notifications ?? []) as NotificationRecord[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.relatedId),
      ),
      activityLogs: ((parsed.activityLogs ?? []) as ActivityLog[]).filter(
        (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.relatedId),
      ),
      inquiries: ((parsed.inquiries ?? []) as InquiryRecord[])
        .filter(
          (item) => !legacySeedIds.has(item.id) && !legacySeedIds.has(item.organizationId),
        )
        .map((item) => ({
          ...item,
          status: normalizeInquiryStatus(item.status),
        })),
      templates: normalizeTemplates(parsed.templates ?? baseState.templates),
      ypopEntries: ((parsed.ypopEntries ?? []) as YPOPEntry[]).filter((e) => !legacySeedIds.has(e.id)),
      ypopDeletionReceipts: parsed.ypopDeletionReceipts ?? [],
      ypopFiles: ((parsed.ypopFiles ?? []) as YPOPFile[]).filter((f) => !legacySeedIds.has(f.id)),
      ypopEventParticipations: ((parsed.ypopEventParticipations ?? []) as YPOPEventParticipation[]).filter(
        (p) => !legacySeedIds.has(p.id),
      ),
      ypopEventFiles: ((parsed.ypopEventFiles ?? []) as YPOPEventFile[]).filter((f) => !legacySeedIds.has(f.id)),
      ypopOrgActivities: ((parsed.ypopOrgActivities ?? []) as YPOPOrgActivity[]).filter(
        (activity) => !legacySeedIds.has(activity.id),
      ),
      ypopOrgActivityFiles: ((parsed.ypopOrgActivityFiles ?? []) as YPOPOrgActivityFile[]).filter(
        (file) => !legacySeedIds.has(file.id),
      ),
      ypopCityActivities: Array.isArray(parsed.ypopCityActivities)
        ? (parsed.ypopCityActivities as YPOPCityActivity[]).filter((a) => !legacySeedIds.has(a.id))
        : baseState.ypopCityActivities.filter((a) => !legacySeedIds.has(a.id)),
      ypopPeriods: Array.isArray(parsed.ypopPeriods)
        ? (parsed.ypopPeriods as YPOPPeriod[]).filter((p) => !legacySeedIds.has(p.id))
        : baseState.ypopPeriods.filter((p) => !legacySeedIds.has(p.id)),
      customTemplateCategories: Array.from(
        new Set(
          [
            ...(Array.isArray(parsed.customTemplateCategories) ? parsed.customTemplateCategories : []),
            ...(baseState.customTemplateCategories ?? []),
          ]
            .map(normalizeTemplateCategoryKey)
            .filter((k) => Boolean(k) && !isSystemTemplateCategory(k)),
        ),
      ),
    };
  } catch {
    return clearAccountScopedState(baseState);
  }
};

const applyPatch = <T extends { id: string }>(items: T[], id: string, patch: UpdatePatch<T>) =>
  items.map((item) => {
    if (item.id !== id) return item;
    return typeof patch === "function" ? patch(item) : { ...item, ...patch };
  });

const removeById = <T extends { id: string }>(items: T[], id: string) =>
  items.filter((item) => item.id !== id);

const mergeById = <T extends { id: string }>(localItems: T[], remoteItems: T[]) => {
  const merged = new Map<string, T>();
  localItems.forEach((item) => merged.set(item.id, item));
  remoteItems.forEach((item) => merged.set(item.id, item));
  return Array.from(merged.values());
};

export const parseIsoTimestamp = (iso?: string | null): number => {
  if (!iso || typeof iso !== "string") return 0;
  const parsed = Date.parse(iso);
  return Number.isNaN(parsed) ? 0 : parsed;
};

export const pickNewerYpopRecord = <T extends { id: string; updatedAt?: string }>(
  localItem: T | undefined,
  remoteItem: T,
): T => {
  if (!localItem) return remoteItem;

  const localTime = parseIsoTimestamp(localItem.updatedAt);
  const remoteTime = parseIsoTimestamp(remoteItem.updatedAt);

  // If local is strictly newer, retain local to prevent stale snapshot regression
  if (localTime > remoteTime) {
    return localItem;
  }
  // If remote is strictly newer, remote wins
  if (remoteTime > localTime) {
    return remoteItem;
  }
  // Deterministic tie-breaking: server/remote wins on equal or both-missing timestamps
  return remoteItem;
};

export const reconcileYpopEventParticipations = (
  currentItems: YPOPEventParticipation[],
  remoteItems: YPOPEventParticipation[] | undefined,
  snapshotOrgs: Array<{ id: string }> | undefined,
  isAdmin: boolean,
  validCityActivityIds: Set<string>,
): YPOPEventParticipation[] => {
  if (!remoteItems) {
    return currentItems.filter((p) => validCityActivityIds.has(p.activityId));
  }

  const currentById = new Map<string, YPOPEventParticipation>();
  currentItems.forEach((item) => currentById.set(item.id, item));

  if (isAdmin) {
    const merged = remoteItems.map((remoteItem) => {
      const localItem = currentById.get(remoteItem.id);
      return pickNewerYpopRecord(localItem, remoteItem);
    });
    return merged.filter((p) => validCityActivityIds.has(p.activityId));
  }

  const remoteById = new Map<string, YPOPEventParticipation>();
  remoteItems.forEach((item) => remoteById.set(item.id, item));

  if (snapshotOrgs !== undefined) {
    const coveredOrgIds = new Set(snapshotOrgs.map((o) => o.id));
    const localSameOrg = currentItems.filter(
      (item) => coveredOrgIds.has(item.organizationId) && !remoteById.has(item.id),
    );
    const mergedRemote = remoteItems
      .filter((remoteItem) => coveredOrgIds.has(remoteItem.organizationId))
      .map((remoteItem) => {
        const localItem = currentById.get(remoteItem.id);
        return pickNewerYpopRecord(localItem, remoteItem);
      });
    return [...localSameOrg, ...mergedRemote].filter((p) => validCityActivityIds.has(p.activityId));
  }

  const localItems = currentItems.filter((item) => !remoteById.has(item.id));
  const mergedRemote = remoteItems.map((remoteItem) => {
    const localItem = currentById.get(remoteItem.id);
    return pickNewerYpopRecord(localItem, remoteItem);
  });
  return [...localItems, ...mergedRemote].filter((p) => validCityActivityIds.has(p.activityId));
};

export const reconcileYpopOrgActivities = (
  currentItems: YPOPOrgActivity[],
  remoteItems: YPOPOrgActivity[] | undefined,
  snapshotOrgs: Array<{ id: string }> | undefined,
  isAdmin: boolean,
  validEntryIds: Set<string>,
): YPOPOrgActivity[] => {
  if (!remoteItems) {
    return currentItems.filter((a) => validEntryIds.has(a.ypopEntryId));
  }

  const currentById = new Map<string, YPOPOrgActivity>();
  currentItems.forEach((item) => currentById.set(item.id, item));

  if (isAdmin) {
    const merged = remoteItems.map((remoteItem) => {
      const localItem = currentById.get(remoteItem.id);
      return pickNewerYpopRecord(localItem, remoteItem);
    });
    return merged.filter((a) => validEntryIds.has(a.ypopEntryId));
  }

  const remoteById = new Map<string, YPOPOrgActivity>();
  remoteItems.forEach((item) => remoteById.set(item.id, item));

  if (snapshotOrgs !== undefined) {
    const coveredOrgIds = new Set(snapshotOrgs.map((o) => o.id));
    const localSameOrg = currentItems.filter(
      (item) => coveredOrgIds.has(item.organizationId) && !remoteById.has(item.id),
    );
    const mergedRemote = remoteItems
      .filter((remoteItem) => coveredOrgIds.has(remoteItem.organizationId))
      .map((remoteItem) => {
        const localItem = currentById.get(remoteItem.id);
        return pickNewerYpopRecord(localItem, remoteItem);
      });
    return [...localSameOrg, ...mergedRemote].filter((a) => validEntryIds.has(a.ypopEntryId));
  }

  const localItems = currentItems.filter((item) => !remoteById.has(item.id));
  const mergedRemote = remoteItems.map((remoteItem) => {
    const localItem = currentById.get(remoteItem.id);
    return pickNewerYpopRecord(localItem, remoteItem);
  });
  return [...localItems, ...mergedRemote].filter((a) => validEntryIds.has(a.ypopEntryId));
};

export const reconcileYpopEntries = (
  currentEntries: YPOPEntry[],
  remoteEntries: YPOPEntry[] | undefined,
  validSemesterKeys: Set<string>,
): YPOPEntry[] => {
  if (!remoteEntries) {
    return currentEntries.filter((e) => validSemesterKeys.has(e.semester));
  }
  const currentById = new Map<string, YPOPEntry>();
  currentEntries.forEach((e) => currentById.set(e.id, e));

  const remoteById = new Map<string, YPOPEntry>();
  remoteEntries.forEach((e) => remoteById.set(e.id, e));

  // Retain local-only virtual entries for valid semesters while active
  const localVirtualItems = currentEntries.filter(
    (item) => !remoteById.has(item.id) && ("_isVirtual" in item || item.id.startsWith("virtual-")),
  );

  const mergedRemote = remoteEntries.map((remoteEntry) => {
    const localEntry = currentById.get(remoteEntry.id);
    return pickNewerYpopRecord(localEntry, remoteEntry);
  });

  return [...localVirtualItems, ...mergedRemote].filter((e) => validSemesterKeys.has(e.semester));
};

export const reconcileYpopEventFiles = (
  currentFiles: YPOPEventFile[],
  remoteFiles: YPOPEventFile[] | undefined,
  participations: YPOPEventParticipation[],
  isAdmin: boolean,
): YPOPEventFile[] => {
  if (!remoteFiles) {
    if (isAdmin) {
      const reviewableParticipationIds = new Set(
        participations.filter((p) => p.status && p.status !== "draft").map((p) => p.id),
      );
      return currentFiles.filter((f) => reviewableParticipationIds.has(f.participationId));
    }
    return currentFiles;
  }

  if (isAdmin) {
    // Admin MUST ONLY see files belonging to reviewable/submitted participations (not draft)
    const reviewableParticipationIds = new Set(
      participations.filter((p) => p.status && p.status !== "draft").map((p) => p.id),
    );
    return remoteFiles.filter((f) => reviewableParticipationIds.has(f.participationId));
  }

  // Organization User session:
  // remoteFiles contains files returned for this organization.
  // Any files whose participation is in participations are authoritative from remoteFiles.
  const remoteById = new Map<string, YPOPEventFile>();
  remoteFiles.forEach((f) => remoteById.set(f.id, f));

  const coveredParticipationIds = new Set(participations.map((p) => p.id));
  const sameParticipationFiles = currentFiles.filter(
    (f) => coveredParticipationIds.has(f.participationId) && !remoteById.has(f.id),
  );

  return [...sameParticipationFiles, ...remoteFiles];
};

export const reconcileYpopOrgActivityFiles = (
  currentFiles: YPOPOrgActivityFile[],
  remoteFiles: YPOPOrgActivityFile[] | undefined,
  orgActivities: YPOPOrgActivity[],
  isAdmin: boolean,
): YPOPOrgActivityFile[] => {
  if (!remoteFiles) {
    if (isAdmin) {
      const reviewableActivityIds = new Set(
        orgActivities.filter((a) => a.status && a.status !== "draft").map((a) => a.id),
      );
      return currentFiles.filter((f) => reviewableActivityIds.has(f.orgActivityId));
    }
    return currentFiles;
  }

  if (isAdmin) {
    // Admin MUST ONLY see files belonging to reviewable/submitted activities (not draft)
    const reviewableActivityIds = new Set(
      orgActivities.filter((a) => a.status && a.status !== "draft").map((a) => a.id),
    );
    return remoteFiles.filter((f) => reviewableActivityIds.has(f.orgActivityId));
  }

  // Organization User session:
  const remoteById = new Map<string, YPOPOrgActivityFile>();
  remoteFiles.forEach((f) => remoteById.set(f.id, f));

  const coveredActivityIds = new Set(orgActivities.map((a) => a.id));
  const sameActivityFiles = currentFiles.filter(
    (f) => coveredActivityIds.has(f.orgActivityId) && !remoteById.has(f.id),
  );

  return [...sameActivityFiles, ...remoteFiles];
};

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
  const initialIdentity = resolveInitialIdentity();
  const [state, setState] = useState<LydoConnectState>(() => readState(initialIdentity));
  const syncedIdentityKeyRef = useRef<string>(
    (() => {
      const id = initialIdentity;
      if (id.type === "anonymous") return "anonymous";
      const initial = readState(id);
      if (id.type === "user" && initial.organizationProfiles.some((p) => p.userId === id.id)) {
        return getAccountIdentityKey(id);
      }
      if (id.type === "admin" && initial.organizationProfiles.length > 0) {
        return getAccountIdentityKey(id);
      }
      return "";
    })(),
  );
  const [isInitialSyncDone, setIsInitialSyncDone] = useState<boolean>(() => {
    const id = initialIdentity;
    if (id.type === "anonymous") return true;
    const initial = readState(id);
    if (id.type === "user") {
      return initial.organizationProfiles.some((p) => p.userId === id.id);
    }
    if (id.type === "admin") {
      return initial.organizationProfiles.length > 0;
    }
    return false;
  });
  const activeIdentityRef = useRef<AccountIdentity>(initialIdentity);
  const syncSequenceRef = useRef({ dispatched: 0, resolved: 0 });
  const bootstrapPromiseRef = useRef<Promise<Partial<LydoSeedState> | null> | null>(null);
  const lastStoredStateRef = useRef<string>("");

  const resetAccountState = useCallback((nextIdentity?: AccountIdentity) => {
    const currentIdentity = activeIdentityRef.current;
    if (typeof window !== "undefined" && (currentIdentity.type === "user" || currentIdentity.type === "admin")) {
      try {
        window.localStorage.removeItem(getStorageKeyForIdentity(currentIdentity));
      } catch {
        // ignore storage removal error
      }
    }
    const resolvedNext = nextIdentity ?? { type: "anonymous" };
    activeIdentityRef.current = resolvedNext;
    syncedIdentityKeyRef.current = "";
    lastStoredStateRef.current = "";
    bootstrapPromiseRef.current = null;
    const nextState = readState(resolvedNext);
    setState(nextState);
    const hasCachedProfile =
      resolvedNext.type === "anonymous"
        ? true
        : resolvedNext.type === "user"
        ? nextState.organizationProfiles.some((p) => p.userId === resolvedNext.id)
        : nextState.organizationProfiles.length > 0;
    if (hasCachedProfile) {
      syncedIdentityKeyRef.current = getAccountIdentityKey(resolvedNext);
    }
    setIsInitialSyncDone(hasCachedProfile);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const currentIdentity = activeIdentityRef.current;
      if (currentIdentity.type === "admin" && supabase) {
        window.localStorage.removeItem(getStorageKeyForIdentity(currentIdentity));
        lastStoredStateRef.current = "";
        return;
      }
      const targetKey = getStorageKeyForIdentity(currentIdentity);
      const toPersist = currentIdentity.type === "anonymous"
        ? clearAccountScopedState(state)
        : currentIdentity.type === "user"
          ? createUserPersistedDraftState(state)
          : state;
      const serialized = JSON.stringify(toPersist);
      if (serialized === lastStoredStateRef.current) {
        return;
      }
      lastStoredStateRef.current = serialized;
      window.localStorage.setItem(targetKey, serialized);
    } catch {
      // ignore storage serialization error
    }
  }, [state]);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    const syncBootstrap = async (force = false) => {
      const requestIdentity = { ...activeIdentityRef.current };
      if (requestIdentity.type !== "user") {
        if (requestIdentity.type === "admin") {
          syncedIdentityKeyRef.current = getAccountIdentityKey(requestIdentity);
          setIsInitialSyncDone(true);
        }
        return;
      }
      const identityKey = getAccountIdentityKey(requestIdentity);
      if (!force && syncedIdentityKeyRef.current === identityKey) return;

      const pending = bootstrapPromiseRef.current ?? (bootstrapPromiseRef.current = loadOrganizationBootstrapState(requestIdentity.id));
      try {
        const snapshot = await pending;
        if (!active || !snapshot || !isSameIdentity(requestIdentity, activeIdentityRef.current)) return;
        const profile = snapshot.organizationProfiles?.find((item) => item.userId === requestIdentity.id);
        if (profile) {
          setState((current) => ({
            ...current,
            organizationProfiles: [profile, ...current.organizationProfiles.filter((item) => item.userId !== requestIdentity.id)],
          }));
        }
      } catch (error) {
        console.error("Failed to load organization profile bootstrap:", error);
      } finally {
        if (bootstrapPromiseRef.current === pending) bootstrapPromiseRef.current = null;
        if (active && isSameIdentity(requestIdentity, activeIdentityRef.current)) {
          syncedIdentityKeyRef.current = identityKey;
          setIsInitialSyncDone(true);
        }
      }
    };

    const setIdentity = (nextIdentity: AccountIdentity) => {
      if (isSameIdentity(nextIdentity, activeIdentityRef.current)) return false;
      activeIdentityRef.current = nextIdentity;
      syncedIdentityKeyRef.current = "";
      bootstrapPromiseRef.current = null;
      const cached = readState(nextIdentity);
      setState(cached);
      lastStoredStateRef.current = "";
      const hasCachedProfile = nextIdentity.type === "user"
        ? cached.organizationProfiles.some((profile) => profile.userId === nextIdentity.id)
        : nextIdentity.type === "anonymous";
      setIsInitialSyncDone(hasCachedProfile || nextIdentity.type === "admin");
      return true;
    };

    void syncBootstrap(true);

    const identityFromSession = (session: Session | null): AccountIdentity => {
      const admin = readAdminSession();
      if (admin?.id) return { type: "admin", id: admin.id, token: admin.sessionToken };
      return session?.user?.id ? { type: "user", id: session.user.id } : { type: "anonymous" };
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetAccountState({ type: "anonymous" });
        return;
      }
      const changed = setIdentity(identityFromSession(session));
      if (changed || event === "INITIAL_SESSION") void syncBootstrap();
      else if (event === "USER_UPDATED") void syncBootstrap(true);
      // Refreshing an access token does not change the user profile or organization data.
    });

    const handleAdminSessionChange = () => {
      const admin = readAdminSession();
      const userId = readSynchronousAuthUserId();
      const changed = setIdentity(admin?.id
        ? { type: "admin", id: admin.id, token: admin.sessionToken }
        : userId ? { type: "user", id: userId } : { type: "anonymous" });
      if (changed) void syncBootstrap();
    };
    const handleAuthReset = () => resetAccountState({ type: "anonymous" });
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key !== supabaseAuthStorageKey && event.key !== "lydo_admin_session_v1") return;
      void supabase.auth.getSession().then(({ data }) => {
        const changed = setIdentity(identityFromSession(data.session));
        if (changed) void syncBootstrap();
      });
    };

    window.addEventListener(ADMIN_SESSION_CHANGE_EVENT, handleAdminSessionChange);
    window.addEventListener("lydo-auth-reset", handleAuthReset);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      active = false;
      authListener.subscription.unsubscribe();
      window.removeEventListener(ADMIN_SESSION_CHANGE_EVENT, handleAdminSessionChange);
      window.removeEventListener("lydo-auth-reset", handleAuthReset);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [resetAccountState]);

  const isInitialSyncDoneComputed = useMemo(() => {
    const currentId = activeIdentityRef.current;
    if (currentId.type === "anonymous") return true;
    if (currentId.type === "user") {
      const hasProfile = state.organizationProfiles.some((p) => p.userId === currentId.id);
      if (hasProfile) return true;
      return syncedIdentityKeyRef.current === getAccountIdentityKey(currentId);
    }
    if (currentId.type === "admin") {
      if (state.organizationProfiles.length > 0) return true;
      return syncedIdentityKeyRef.current === getAccountIdentityKey(currentId);
    }
    return isInitialSyncDone;
  }, [state.organizationProfiles, isInitialSyncDone]);

  const value = useMemo<LydoConnectContextValue>(
    () => ({
      state,
      isInitialSyncDone: isInitialSyncDoneComputed,
      resetAccountState,
      mergeRemoteState: (snapshot) => {
        const isAdmin = Boolean(readAdminSession());
        const currentIdentity = activeIdentityRef.current;

        // Discard snapshot if user mode and loaded organization belongs to another user
        if (!isAdmin && currentIdentity.type === "user" && snapshot.organizationProfiles && snapshot.organizationProfiles.length > 0) {
          const profileUserId = snapshot.organizationProfiles[0]?.userId;
          if (profileUserId && profileUserId !== currentIdentity.id) {
            return;
          }
        }

        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => {
          if (!isSameIdentity(currentIdentity, activeIdentityRef.current)) {
            return current;
          }

          const mergedYpopPeriods = snapshot.ypopPeriods ?? current.ypopPeriods;
          const validSemesterKeys = new Set(mergedYpopPeriods.map((p) => p.semesterKey));
          const mergedYpopCityActivities = (snapshot.ypopCityActivities ?? current.ypopCityActivities).filter(
            (a) => validSemesterKeys.has(a.semesterKey),
          );
          const mergedYpopEntries = reconcileYpopEntries(
            current.ypopEntries,
            snapshot.ypopEntries,
            validSemesterKeys,
          );
          const validEntryIds = new Set(mergedYpopEntries.map((e) => e.id));
          const validCityActivityIds = new Set(mergedYpopCityActivities.map((a) => a.id));

          const mergedNotifications = snapshot.notifications
            ? snapshot.notifications.map((remoteNotification) => {
                const localNotification = current.notifications.find((item) => item.id === remoteNotification.id);
                return localNotification?.isRead
                  ? { ...remoteNotification, isRead: true }
                  : remoteNotification;
              })
            : current.notifications;
          const mergedYpopFiles = snapshot.ypopFiles
            ? mergeById(current.ypopFiles, snapshot.ypopFiles)
            : current.ypopFiles;
          const mergedYpopEventParticipations = reconcileYpopEventParticipations(
            current.ypopEventParticipations,
            snapshot.ypopEventParticipations,
            snapshot.organizationProfiles,
            isAdmin,
            validCityActivityIds,
          );
          const mergedYpopEventFiles = reconcileYpopEventFiles(
            current.ypopEventFiles,
            snapshot.ypopEventFiles,
            mergedYpopEventParticipations,
            isAdmin,
          );
          const mergedYpopOrgActivities = reconcileYpopOrgActivities(
            current.ypopOrgActivities,
            snapshot.ypopOrgActivities,
            snapshot.organizationProfiles,
            isAdmin,
            validEntryIds,
          );
          const mergedYpopOrgActivityFiles = reconcileYpopOrgActivityFiles(
            current.ypopOrgActivityFiles,
            snapshot.ypopOrgActivityFiles,
            mergedYpopOrgActivities,
            isAdmin,
          );

          let mergedInquiries = current.inquiries;
          if (snapshot.inquiries) {
            if (isAdmin) {
              mergedInquiries = mergeById(current.inquiries, snapshot.inquiries);
            } else {
              const activeOrgId = (snapshot.organizationProfiles?.[0] ?? current.organizationProfiles[0])?.id;
              if (activeOrgId) {
                const currentSameOrg = current.inquiries.filter((inq) => inq.organizationId === activeOrgId);
                const remoteSameOrg = snapshot.inquiries.filter((inq) => inq.organizationId === activeOrgId);
                mergedInquiries = mergeById(currentSameOrg, remoteSameOrg);
              } else {
                mergedInquiries = snapshot.inquiries;
              }
            }
          }

          return pruneDeletedYpopSubmissions({
            ...current,
            ...snapshot,
            templates: snapshot.templates ? normalizeTemplates(snapshot.templates) : current.templates,
            notifications: mergedNotifications,
            ypopFiles: mergedYpopFiles.filter((f) => validEntryIds.has(f.ypopEntryId)),
            ypopEventParticipations: mergedYpopEventParticipations,
            ypopEventFiles: mergedYpopEventFiles,
            ypopOrgActivities: mergedYpopOrgActivities,
            ypopOrgActivityFiles: mergedYpopOrgActivityFiles,
            inquiries: mergedInquiries,
            ypopPeriods: mergedYpopPeriods,
            ypopCityActivities: mergedYpopCityActivities,
            ypopEntries: mergedYpopEntries,
            customTemplateCategories: Array.isArray(snapshot.customTemplateCategories)
              ? snapshot.customTemplateCategories
              : (current.customTemplateCategories ?? []),
            newsCategories: Array.isArray(snapshot.newsCategories) && snapshot.newsCategories.length > 0
              ? snapshot.newsCategories
              : (current.newsCategories ?? INITIAL_NEWS_CATEGORIES),
          }, [...(current.ypopDeletionReceipts ?? []), ...(snapshot.ypopDeletionReceipts ?? [])]);
        });
      },
      addCustomTemplateCategory: (category) => {
        const normalized = normalizeTemplateCategoryKey(category);
        if (!normalized || isSystemTemplateCategory(normalized)) return;
        setState((current) => {
          const currentCats = current.customTemplateCategories ?? [];
          if (currentCats.includes(normalized)) return current;
          return {
            ...current,
            customTemplateCategories: [...currentCats, normalized],
          };
        });
      },
      removeCustomTemplateCategory: (category) => {
        const normalized = normalizeTemplateCategoryKey(category);
        setState((current) => ({
          ...current,
          customTemplateCategories: (current.customTemplateCategories ?? []).filter(
            (cat) => cat !== normalized,
          ),
        }));
      },
      setNewsCategories: (categories) =>
        setState((current) => ({
          ...current,
          newsCategories: categories,
        })),
      addNewsCategory: (category) =>
        setState((current) => {
          const existing = current.newsCategories ?? [];
          if (existing.some((c) => c.normalizedName === category.normalizedName)) {
            return current;
          }
          return {
            ...current,
            newsCategories: [...existing, category],
          };
        }),
      removeNewsCategory: (categoryIdOrNormalized) =>
        setState((current) => ({
          ...current,
          newsCategories: (current.newsCategories ?? []).filter(
            (c) => c.id !== categoryIdOrNormalized && c.normalizedName !== categoryIdOrNormalized,
          ),
        })),
      createTemplate: (template) =>
        setState((current) => ({
          ...current,
          templates: normalizeTemplates([...current.templates, template]).sort((left, right) => left.sortOrder - right.sortOrder),
        })),
      removeTemplate: (id) =>
        setState((current) => ({
          ...current,
          templates: current.templates.filter((template) => template.id !== id && template.databaseId !== id),
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
      createInquiry: (inquiry) =>
        setState((current) => ({
          ...current,
          inquiries: [{ ...inquiry, status: normalizeInquiryStatus(inquiry.status) }, ...current.inquiries],
        })),
      updateInquiry: (id, patch) =>
        setState((current) => ({
          ...current,
          inquiries: applyPatch(current.inquiries, id, patch).map((inquiry) => ({
            ...inquiry,
            status: normalizeInquiryStatus(inquiry.status),
            updatedAt: inquiry.id === id ? new Date().toISOString() : inquiry.updatedAt,
          })),
        })),
      removeInquiry: (id) =>
        setState((current) => ({
          ...current,
          inquiries: current.inquiries.filter((inquiry) => inquiry.id !== id),
        })),
      updateTemplate: (id, patch) =>
        setState((current) => ({
          ...current,
          templates: normalizeTemplates(
            current.templates.map((template) => {
              if (template.id !== id && template.databaseId !== id) return template;
              return typeof patch === "function" ? patch(template) : { ...template, ...patch };
            }),
          ),
        })),
      createNotification: (notification) =>
        setState((current) => ({
          ...current,
          notifications: [notification, ...current.notifications],
          unreadNotificationCount: current.unreadNotificationCount === undefined
            ? undefined
            : current.unreadNotificationCount + (notification.isRead ? 0 : 1),
        })),
      createActivityLog: (activity) =>
        setState((current) => ({
          ...current,
          activityLogs: [activity, ...current.activityLogs],
        })),
      markNotificationRead: (id) =>
        setState((current) => {
          const wasUnread = current.notifications.some((notification) => notification.id === id && !notification.isRead);
          return {
            ...current,
            notifications: current.notifications.map((notification) =>
              notification.id === id ? { ...notification, isRead: true } : notification,
            ),
            unreadNotificationCount: current.unreadNotificationCount === undefined
              ? undefined
              : Math.max(0, current.unreadNotificationCount - (wasUnread ? 1 : 0)),
          };
        }),
      markAllNotificationsRead: () =>
        setState((current) => ({
          ...current,
          notifications: current.notifications.map((n) => ({ ...n, isRead: true })),
          unreadNotificationCount: current.unreadNotificationCount === undefined ? undefined : 0,
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
      createYPOPEntry: (entry) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopEntries: [entry, ...current.ypopEntries],
        }));
      },
      updateYPOPEntry: (id, patch) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopEntries: applyPatch(current.ypopEntries, id, patch).map((entry) => ({
            ...entry,
            updatedAt: entry.id === id ? ((patch as { updatedAt?: string }).updatedAt || new Date().toISOString()) : entry.updatedAt,
          })),
        }));
      },
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
      createYPOPEventParticipation: (participation) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopEventParticipations: [participation, ...current.ypopEventParticipations],
        }));
      },
      updateYPOPEventParticipation: (id, patch) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopEventParticipations: applyPatch(current.ypopEventParticipations, id, patch).map((participation) => ({
            ...participation,
            updatedAt: participation.id === id ? ((patch as { updatedAt?: string }).updatedAt || new Date().toISOString()) : participation.updatedAt,
          })),
        }));
      },
      createYPOPEventFile: (file) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopEventFiles: [file, ...current.ypopEventFiles.filter((f) => f.id !== file.id)],
        }));
      },
      deleteYPOPEventFile: (id) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopEventFiles: removeById(current.ypopEventFiles, id),
        }));
      },
      createYPOPOrgActivity: (activity) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopOrgActivities: [
            activity,
            ...current.ypopOrgActivities.filter((a) => a.id !== activity.id),
          ],
        }));
      },
      updateYPOPOrgActivity: (id, patch) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopOrgActivities: applyPatch(current.ypopOrgActivities, id, patch).map((activity) => ({
            ...activity,
            updatedAt: activity.id === id ? ((patch as { updatedAt?: string }).updatedAt || new Date().toISOString()) : activity.updatedAt,
          })),
        }));
      },
      deleteYPOPOrgActivity: (id) =>
        setState((current) => ({
          ...current,
          ypopOrgActivities: removeById(current.ypopOrgActivities, id),
          ypopOrgActivityFiles: current.ypopOrgActivityFiles.filter((file) => file.orgActivityId !== id),
        })),
      createYPOPOrgActivityFile: (file) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopOrgActivityFiles: [file, ...current.ypopOrgActivityFiles.filter((f) => f.id !== file.id)],
        }));
      },
      deleteYPOPOrgActivityFile: (id) => {
        syncSequenceRef.current.resolved = ++syncSequenceRef.current.dispatched;
        setState((current) => ({
          ...current,
          ypopOrgActivityFiles: removeById(current.ypopOrgActivityFiles, id),
        }));
      },
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
          const entryIds = new Set(
            period
              ? current.ypopEntries
                .filter((entry) => entry.semester === period.semesterKey)
                .map((entry) => entry.id)
              : [],
          );
          const cityActivityIds = new Set(
            period
              ? current.ypopCityActivities
                .filter((activity) => activity.semesterKey === period.semesterKey)
                .map((activity) => activity.id)
              : [],
          );
          const participationIds = new Set(
            current.ypopEventParticipations
              .filter((participation) => cityActivityIds.has(participation.activityId))
              .map((participation) => participation.id),
          );
          const orgActivityIds = new Set(
            current.ypopOrgActivities
              .filter((activity) => entryIds.has(activity.ypopEntryId))
              .map((activity) => activity.id),
          );
          return {
            ...current,
            ypopPeriods: removeById(current.ypopPeriods, id),
            ypopCityActivities: period
              ? current.ypopCityActivities.filter((a) => a.semesterKey !== period.semesterKey)
              : current.ypopCityActivities,
            ypopEntries: current.ypopEntries.filter((entry) => !entryIds.has(entry.id)),
            ypopFiles: current.ypopFiles.filter((file) => !entryIds.has(file.ypopEntryId)),
            ypopEventParticipations: current.ypopEventParticipations.filter(
              (participation) => !participationIds.has(participation.id),
            ),
            ypopEventFiles: current.ypopEventFiles.filter(
              (file) => !participationIds.has(file.participationId),
            ),
            ypopOrgActivities: current.ypopOrgActivities.filter(
              (activity) => !orgActivityIds.has(activity.id),
            ),
            ypopOrgActivityFiles: current.ypopOrgActivityFiles.filter(
              (file) => !orgActivityIds.has(file.orgActivityId),
            ),
          };
        }),
      removeOrganizationAccountFromCache: (organizationId) =>
        setState((current) => {
          const documentSubmissionIds = new Set(
            current.documentSubmissions
              .filter((submission) => submission.organizationId === organizationId)
              .map(({ id }) => id),
          );
          const budgetRequestIds = new Set(
            current.budgetRequests
              .filter((request) => request.organizationId === organizationId)
              .map(({ id }) => id),
          );
          const liquidationReportIds = new Set(
            current.liquidationReports
              .filter((report) => report.organizationId === organizationId)
              .map(({ id }) => id),
          );

          return {
            ...current,
            organizationProfiles: current.organizationProfiles.filter(({ id }) => id !== organizationId),
            documentSubmissions: current.documentSubmissions.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            documentSubmissionFiles: current.documentSubmissionFiles.filter(
              ({ submissionId }) => !documentSubmissionIds.has(submissionId),
            ),
            budgetRequests: current.budgetRequests.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            budgetRequestFiles: current.budgetRequestFiles.filter(
              ({ budgetRequestId }) => !budgetRequestIds.has(budgetRequestId),
            ),
            liquidationReports: current.liquidationReports.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            liquidationReportFiles: current.liquidationReportFiles.filter(
              ({ liquidationReportId }) => !liquidationReportIds.has(liquidationReportId),
            ),
            complianceRemarks: current.complianceRemarks.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            notifications: current.notifications.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            activityLogs: current.activityLogs.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            inquiries: current.inquiries.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            ypopEntries: current.ypopEntries.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            ypopFiles: current.ypopFiles.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            ypopEventParticipations: current.ypopEventParticipations.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            ypopEventFiles: current.ypopEventFiles.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            ypopOrgActivities: current.ypopOrgActivities.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
            ypopOrgActivityFiles: current.ypopOrgActivityFiles.filter(
              ({ organizationId: ownerId }) => ownerId !== organizationId,
            ),
          };
        }),
    }),
    [state, isInitialSyncDoneComputed, resetAccountState],
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
