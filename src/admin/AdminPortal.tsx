import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { YorpRegistryPage } from "./pages/YorpRegistry";
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, Bell, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronUp, CircleDollarSign, CircleHelp, ClipboardList, Clock3, Download, Eye, FileText, FolderOpen, Mail, MapPin, Medal, MoreHorizontal, Pencil, Plus, Save, Trash2, Trophy, UserRound, Users, Wallet, X } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PortalEmptyState, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { PortalShell } from "@/components/portal/PortalShell";
import { ExportReportDialog } from "@/components/reports/ExportReportDialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { adminNavigationGroups as baseAdminNavigationGroups, buildPublicRecordCode, computeYpopScore, DEFAULT_ORG_LED_TIERS, getApprovedYpopOrgActivityCount, getYpopCityLedPoints, normalizeYpopCityLedPoints, resolveYpopCityLedCategory, templateScopeLabelMap, YPOP_BASE_TOTAL_POINTS, YPOP_CITY_LED_CATEGORY_LABELS, YPOP_CITY_LED_MAX_POINTS, YPOP_SCORE_THRESHOLD, type InquiryRecord, type NewsRelease, type TransparencyPost, type YPOPCityActivity, type YPOPCityActivityCategory, type YPOPEntry, type YPOPEventFile, type YPOPEventParticipation, type YPOPFile, type YPOPOrgActivity, type YPOPOrgActivityFile, type YPOPOrgLedTier, type YPOPPeriod, type YPOPPeriodStatus, type YPOPStatus } from "@/lib/lydo-connect-data";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import {
  allocationByBarangayExportConfig,
  budgetRequestExportConfig,
  buildAllocationPdfTotalsRow,
  buildAllocationTotalsRow,
  buildAllocationXlsxTotalsRow,
  buildBudgetRequestPdfTotalsRow,
  buildBudgetRequestTotalsRow,
  buildBudgetRequestXlsxTotalsRow,
  type AllocationByBarangayExportRow,
  type BudgetRequestExportRow,
} from "@/lib/report-export-configs";
import { exportReport, formatCurrencyPdf, type ExportFormat } from "@/lib/report-export";
import {
  createAdminActivityLogInSupabase,
  createNewsReleaseInSupabase,
  createTransparencyPostInSupabase,
  createTemplateRecordInSupabase,
  deleteNewsReleaseInSupabase,
  deleteTransparencyPostInSupabase,
  updateBudgetRequestInSupabase,
  deleteTemplateRecordInSupabase,
  loadAdminPortalSupabaseState,
  loadLydoConnectSupabaseState,
  resolveSupabaseFileUrl,
  updateDocumentSubmissionFileReviewInSupabase,
  updateTransparencyPostInSupabase,
  updateLiquidationReportInSupabase,
  updateNewsReleaseInSupabase,
  updateOrganizationProfileReviewInSupabase,
  updateTemplateRecordInSupabase,
  uploadTemplateDocumentToSupabase,
  adminCreateYpopPeriodInSupabase,
  adminUpdateYpopPeriodInSupabase,
  adminDeleteYpopPeriodFromSupabase,
  adminCreateYpopCityActivityInSupabase,
  adminUpdateYpopCityActivityInSupabase,
  adminDeleteYpopCityActivityFromSupabase,
  adminUpdateYpopEntryInSupabase,
  adminUpdateYpopEventParticipationInSupabase,
  adminUpdateYpopOrgActivityInSupabase,
  adminUpdateMoveApplicationInSupabase,
} from "@/lib/lydo-connect-supabase";

const routeMap: Record<string, string> = {
  overview: "/admin",
  registrations: "/admin/registrations",
  "budget-utilization": "/admin/budget-utilization",
  "liquidation-monitoring": "/admin/liquidation-monitoring",
  inquiries: "/admin/inquiries",
  "news-releases": "/admin/news-releases",
  "budget-monitoring": "/admin/budget-monitoring",
  templates: "/admin/templates",
  notifications: "/admin/notifications",
  "activity-logs": "/admin/activity-logs",
  "ypop-validation": "/admin/ypop-validation",
  "yorp-registry": "/admin/yorp-registry",
};

const adminId = "admin-demo";
const splitNotificationsGroup = baseAdminNavigationGroups.map((group) =>
  group.items.some((item) => item.id === "notifications-activity")
    ? {
        ...group,
        items: group.items.flatMap((item) =>
          item.id === "notifications-activity"
            ? [
                { id: "notifications", label: "Notifications", icon: Bell },
                { id: "activity-logs", label: "Activity Logs", icon: ClipboardList },
              ]
            : [item],
        ),
      }
    : group,
);

const renderAdvocacyChips = (advocacies: string[]) =>
  advocacies.length ? (
    <div className="flex flex-wrap gap-2">
      {advocacies.map((advocacy) => (
        <span
          key={advocacy}
          className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary"
        >
          {advocacy}
        </span>
      ))}
    </div>
  ) : (
    <span className="text-sm text-muted-foreground">N/A</span>
  );

const formatVerifiedDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date).toUpperCase();
};

const getManilaNow = () => {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  return { year: Number(year), month: Number(month), day: Number(day), isoDate: `${year}-${month}-${day}` };
};

const deriveSemesterLabelFromDate = (dateLike?: string) => {
  const base = dateLike ? new Date(dateLike) : new Date();
  const safeBase = Number.isNaN(base.getTime()) ? new Date() : base;
  const manila = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(safeBase);
  const year = Number(manila.find((part) => part.type === "year")?.value ?? new Date().getFullYear());
  const month = Number(manila.find((part) => part.type === "month")?.value ?? 1);
  return `${year} ${month <= 6 ? "First" : "Second"} Semester`;
};

const buildSemesterKeyFromNow = (existingPeriods: YPOPPeriod[]) => {
  const { year, month, day } = getManilaNow();
  const semesterNumber = month <= 6 ? 1 : 2;
  const prefix = `S${semesterNumber}-${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const existingCount = existingPeriods.filter((period) => period.semesterKey.startsWith(prefix)).length;
  return `${prefix}-${String(existingCount + 1).padStart(2, "0")}`;
};

const canInlinePreviewFile = (value: string) => /\.(pdf|png|jpe?g|gif|webp|svg)$/i.test(value);
const isImagePreviewFile = (value: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(value);

const renderRegistrationDetailCard = (params: {
  title: string;
  value: string;
  className?: string;
  wrap?: boolean;
  linkHref?: string;
}) => (
  <div className={`min-w-0 rounded-xl border border-border/70 bg-card p-4 shadow-sm ${params.className ?? ""}`.trim()}>
    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">{params.title}</p>
    {params.linkHref && params.value !== "N/A" ? (
      <a
        href={params.linkHref}
        target="_blank"
        rel="noreferrer"
        className={`mt-2 block text-sm font-medium text-primary underline-offset-4 hover:underline ${params.wrap ? "break-all" : ""}`}
      >
        {params.value}
      </a>
    ) : (
      <p className={`mt-2 text-sm font-medium text-foreground ${params.wrap ? "break-all" : ""}`}>
        {params.value}
      </p>
    )}
  </div>
);

const budgetReleaseStatuses = new Set<BudgetRequest["status"]>(["budget_released", "completed"]);
const approvableBudgetStatuses = new Set<BudgetRequest["status"]>(["draft", "submitted", "under_review"]);
const liquidationApprovableStatuses = new Set<LiquidationReport["status"]>(["submitted", "under_review", "needs_revision"]);
const liquidationLockedStatuses = new Set<LiquidationReport["status"]>(["hard_copy_submitted", "completed_liquidated"]);

type PendingAdminConfirmation =
  | {
      kind: "document";
      action: "approve" | "needs_revision" | "reject";
      fileId: string;
      submissionId: string;
      organizationId: string;
      organizationName: string;
      fileName: string;
      currentAdminRemarks: string;
    }
  | {
      kind: "profile";
      action: "verify" | "needs_update";
      organizationId: string;
      organizationName: string;
      userId: string;
    }
  | {
      kind: "budget";
      action: "approve" | "submitted_hardcopy" | "cash_released" | "needs_revision" | "reject";
      budgetRequestId: string;
      organizationId: string;
      organizationName: string;
      activityTitle: string;
      requestedAmount: number;
      currentStatus: BudgetRequest["status"];
    }
  | {
      kind: "liquidation";
      action: "approve" | "submitted_hardcopy" | "needs_revision" | "overdue";
      liquidationReportId: string;
      budgetRequestId: string;
      organizationId: string;
      organizationName: string;
      activityTitle: string;
      currentStatus: LiquidationReport["status"];
    }
  | {
      kind: "news_release";
      action: "publish" | "hide";
      id: string;
      title: string;
    }
  | {
      kind: "transparency_post";
      action: "publish" | "hide";
      id: string;
      title: string;
    }
  | {
      kind: "ypop_event";
      action: "verified" | "needs_revision" | "rejected";
      participationId: string;
      entryId: string;
      activityId: string;
      organizationId: string;
      organizationName: string;
      activityName: string;
      currentAdminRemarks: string;
    }
  | {
      kind: "ypop_org_activity";
      action: "approved" | "needs_revision" | "rejected";
      orgActivityId: string;
      entryId: string;
      organizationId: string;
      organizationName: string;
      activityName: string;
      currentAdminRemarks: string;
    };

type PendingDeleteConfirmation =
  | {
      kind: "news_release";
      id: string;
      title: string;
    }
  | {
      kind: "transparency_post";
      id: string;
      title: string;
    }
  | {
      kind: "ypop_period";
      id: string;
      title: string;
      activityCount: number;
    };

type BudgetMonitoringEntry = {
  budgetRequestId: string;
  liquidationReportId: string | null;
  title: string;
  organizationName: string;
  approvedAmount: number;
  releasedAmount: number;
  remainingAmount: number;
  utilizationRate: number;
  budgetStatus: string;
  liquidationStatus: string;
  releaseDate: string;
  goSignalAt: string;
  deadlineAt: string;
  hardCopySubmittedAt: string;
  completedAt: string;
  remarks: string;
  ageInDays: number;
  riskLabel: "On Track" | "Needs Attention" | "Overdue" | "Completed";
};

type BudgetMonitoringChartRow = {
  riskLabel: BudgetMonitoringEntry["riskLabel"];
  count: number;
  approvedAmount: number;
  releasedAmount: number;
  remainingAmount: number;
};

type BarangayAllocationEntry = {
  district: string;
  barangay: string;
  organizationCount: number;
  releasedBudgetCount: number;
  approvedAmount: number;
  releasedAmount: number;
  remainingAmount: number;
  utilizationRate: number;
};

type BarangayAllocationOrganizationDetail = {
  organizationId: string;
  organizationName: string;
  district: string;
  barangay: string;
  budgetRequestCount: number;
  releasedBudgetCount: number;
  approvedAmount: number;
  releasedAmount: number;
  remainingAmount: number;
  utilizationRate: number;
  requests: Array<{
    id: string;
    createdAt: string;
    activityTitle: string;
    status: BudgetRequest["status"];
    approvedAmount: number;
    releasedAmount: number;
    remainingAmount: number;
    activityDate: string;
    releaseDate: string;
    goSignalAt: string;
    hardCopySubmittedAt: string;
  }>;
};

type ActiveReportExport = "budget-requests" | "allocation-by-barangay" | null;

export default function AdminPortal({ section }: { section: string }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state, mergeRemoteState, createTemplate, removeTemplate, createNewsRelease, removeNewsRelease, updateNewsRelease, updateTransparencyPost, updateComplianceRemark, updateTemplate, createNotification, markNotificationRead, markAllNotificationsRead, updateBudgetRequest, updateLiquidationReport, updateYPOPEntry, updateYPOPEventParticipation, createYPOPOrgActivity, updateYPOPOrgActivity, createYPOPCityActivity, updateYPOPCityActivity, deleteYPOPCityActivity, createYPOPPeriod, updateYPOPPeriod, deleteYPOPPeriod } =
    useLydoConnect();
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const [templateModalMode, setTemplateModalMode] = useState<"create" | "edit" | "delete" | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [templateDescriptionDraft, setTemplateDescriptionDraft] = useState("");
  const [templateScopeDraft, setTemplateScopeDraft] = useState<"document_submission" | "move" | "other">("document_submission");
  const [templateFileDraft, setTemplateFileDraft] = useState<File | null>(null);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewEmptyMessage, setPreviewEmptyMessage] = useState("");
  const [previewCanInline, setPreviewCanInline] = useState(false);
  const [newsModalMode, setNewsModalMode] = useState<"create" | "edit" | null>(null);
  const [editingNewsReleaseId, setEditingNewsReleaseId] = useState<string | null>(null);
  const [newsTitleDraft, setNewsTitleDraft] = useState("");
  const [newsDescriptionDraft, setNewsDescriptionDraft] = useState("");
  const [newsFacebookPostUrlDraft, setNewsFacebookPostUrlDraft] = useState("");
  const [newsPreviewImageUrlDraft, setNewsPreviewImageUrlDraft] = useState("");
  const [newsSearch, setNewsSearch] = useState("");
  const [newsVisibilityFilter, setNewsVisibilityFilter] = useState<"all" | NewsRelease["visibilityStatus"]>("all");
  const [activityLogFilter, setActivityLogFilter] = useState<string>("all");
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [activityDateFilter, setActivityDateFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [activityPage, setActivityPage] = useState(0);
  const [newsDatePostedDraft, setNewsDatePostedDraft] = useState("");
  const [newsVisibilityDraft, setNewsVisibilityDraft] = useState<NewsRelease["visibilityStatus"]>("draft");
  const [savingNewsRelease, setSavingNewsRelease] = useState(false);
  const [transparencyModalMode, setTransparencyModalMode] = useState<"create" | "edit" | null>(null);
  const [editingTransparencyPostId, setEditingTransparencyPostId] = useState<string | null>(null);
  const [transparencyTitleDraft, setTransparencyTitleDraft] = useState("");
  const [transparencyDescriptionDraft, setTransparencyDescriptionDraft] = useState("");
  const [transparencyCategoryDraft, setTransparencyCategoryDraft] = useState("");
  const [transparencyAttachmentUrlDraft, setTransparencyAttachmentUrlDraft] = useState("");
  const [transparencyPostDateDraft, setTransparencyPostDateDraft] = useState("");
  const [transparencyVisibilityDraft, setTransparencyVisibilityDraft] = useState<TransparencyPost["visibilityStatus"]>("draft");
  const [savingTransparencyPost, setSavingTransparencyPost] = useState(false);
  const [pendingAdminConfirmation, setPendingAdminConfirmation] = useState<PendingAdminConfirmation | null>(null);
  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState<PendingDeleteConfirmation | null>(null);
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [statusChangeRemarkDraft, setStatusChangeRemarkDraft] = useState("");
  const [processingAdminConfirmation, setProcessingAdminConfirmation] = useState(false);
  const [inquirySearch, setInquirySearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<"all" | InquiryRecord["status"]>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [expandedRegistrationIds, setExpandedRegistrationIds] = useState<string[]>([]);
  const [expandedDocumentFileIds, setExpandedDocumentFileIds] = useState<string[]>([]);
  const [documentReviewRemarksByFileId, setDocumentReviewRemarksByFileId] = useState<Record<string, string>>({});
  const [selectedBudgetRequestId, setSelectedBudgetRequestId] = useState<string | null>(null);
  const [selectedBudgetFileId, setSelectedBudgetFileId] = useState<string | null>(null);
  const [budgetPreviewUrl, setBudgetPreviewUrl] = useState("");
  const [budgetPreviewTitle, setBudgetPreviewTitle] = useState("");
  const [budgetPreviewEmptyMessage, setBudgetPreviewEmptyMessage] = useState("");
  const [budgetPreviewCanInline, setBudgetPreviewCanInline] = useState(false);
  const [budgetPreviewLoading, setBudgetPreviewLoading] = useState(false);
  const [selectedBudgetAllocation, setSelectedBudgetAllocation] = useState<BarangayAllocationEntry | null>(null);
  const [selectedLiquidationReportSnapshot, setSelectedLiquidationReportSnapshot] = useState<LiquidationReport | null>(null);
  const [selectedLiquidationReportId, setSelectedLiquidationReportId] = useState<string | null>(null);
  const [selectedLiquidationFileId, setSelectedLiquidationFileId] = useState<string | null>(null);
  const [liquidationDetailsOpen, setLiquidationDetailsOpen] = useState(false);
  const [liquidationPreviewUrl, setLiquidationPreviewUrl] = useState("");
  const [liquidationPreviewTitle, setLiquidationPreviewTitle] = useState("");
  const [liquidationPreviewEmptyMessage, setLiquidationPreviewEmptyMessage] = useState("");
  const [liquidationPreviewCanInline, setLiquidationPreviewCanInline] = useState(false);
  const [liquidationPreviewLoading, setLiquidationPreviewLoading] = useState(false);
  const [budgetMonitoringTab, setBudgetMonitoringTab] = useState<"overview" | "barangay-allocation">("overview");
  const [budgetRequestsSearch, setBudgetRequestsSearch] = useState("");
  const [budgetRequestsStatusFilter, setBudgetRequestsStatusFilter] = useState("all");
  const [liquidationReportsSearch, setLiquidationReportsSearch] = useState("");
  const [liquidationReportsStatusFilter, setLiquidationReportsStatusFilter] = useState("all");
  const [budgetMonitoringSearch, setBudgetMonitoringSearch] = useState("");
  const [budgetMonitoringRiskFilter, setBudgetMonitoringRiskFilter] = useState("all");
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState("all");
  const [registrationDistrictFilter, setRegistrationDistrictFilter] = useState("all");
  const [budgetAllocationDistrictFilter, setBudgetAllocationDistrictFilter] = useState("all");
  const [budgetAllocationBarangayFilter, setBudgetAllocationBarangayFilter] = useState("all");
  const [activeReportExport, setActiveReportExport] = useState<ActiveReportExport>(null);
  const [documentPreviewUrls, setDocumentPreviewUrls] = useState<Record<string, string>>({});
  const documentPreviewSourceRef = useRef<Record<string, string>>({});
  const [selectedYpopId, setSelectedYpopId] = useState<string | null>(null);
  const [ypopValidationForm, setYpopValidationForm] = useState<{
    cityLedAttendance: Array<{ activityId: string; attended: boolean }>;
    orgLedProjectCount: number;
    status: YPOPStatus;
    adminRemarks: string;
  } | null>(null);
  const [savingYpopValidation, setSavingYpopValidation] = useState(false);
  const [ypopScoringHelpOpen, setYpopScoringHelpOpen] = useState(false);
  const [confirmYpopValidationOpen, setConfirmYpopValidationOpen] = useState(false);
  const [ypopValidationAcknowledged, setYpopValidationAcknowledged] = useState(false);
  const [ypopAdminView, setYpopAdminView] = useState<"periods" | "create-period" | "period-detail" | "entry-review">("periods");
  const [selectedYpopPeriodId, setSelectedYpopPeriodId] = useState<string | null>(null);
  const [createPeriodForm, setCreatePeriodForm] = useState<{ semesterLabel: string; validationDeadline: string; status: YPOPPeriodStatus }>({ semesterLabel: deriveSemesterLabelFromDate(), validationDeadline: "", status: "draft" });
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [createPeriodActivities, setCreatePeriodActivities] = useState<Array<{ tempId: string; name: string; date: string; venue: string; category: YPOPCityActivityCategory }>>([]);
  const [createFormNewActivity, setCreateFormNewActivity] = useState<{ name: string; date: string; venue: string; category: YPOPCityActivityCategory } | null>(null);
  const [createPeriodOrgLedTiers, setCreatePeriodOrgLedTiers] = useState<YPOPOrgLedTier[]>(DEFAULT_ORG_LED_TIERS);
  const [ypopSubmissionFilter, setYpopSubmissionFilter] = useState<"all" | YPOPStatus>("all");
  const [newActivityForm, setNewActivityForm] = useState<{ name: string; date: string; venue: string; category: YPOPCityActivityCategory } | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityData, setEditingActivityData] = useState<{ name: string; date: string; venue: string; category: YPOPCityActivityCategory } | null>(null);
  const [ypopPreviewFileId, setYpopPreviewFileId] = useState<string | null>(null);
  const [ypopPreviewUrl, setYpopPreviewUrl] = useState("");
  const [ypopPreviewTitle, setYpopPreviewTitle] = useState("");
  const [ypopPreviewCanInline, setYpopPreviewCanInline] = useState(false);
  const [ypopPreviewLoading, setYpopPreviewLoading] = useState(false);
  const [ypopEventReviewRemarksById, setYpopEventReviewRemarksById] = useState<Record<string, string>>({});

  const profile = state.organizationProfiles[0] ?? null;
  const adminNotifications = state.notifications.filter((item) => item.userId === adminId);
  const unread = adminNotifications.filter((item) => !item.isRead).length;
  const activeTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((template) => template.templateActive && template.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
  );
  const templateDocuments = useMemo(
    () => activeTemplates.filter((template) => template.templateScope === "document_submission"),
    [activeTemplates],
  );
  const moveTemplates = useMemo(
    () => activeTemplates.filter((template) => template.templateScope === "move"),
    [activeTemplates],
  );
  const otherTemplates = useMemo(
    () => activeTemplates.filter((template) => template.templateScope === "other"),
    [activeTemplates],
  );
  const newsReleases = useMemo(
    () =>
      [...state.newsReleases].sort((left, right) => {
        const dateDelta = new Date(right.datePosted).getTime() - new Date(left.datePosted).getTime();
        if (dateDelta !== 0) return dateDelta;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [state.newsReleases],
  );
  const transparencyPosts = useMemo(
    () =>
      [...state.transparencyPosts].sort((left, right) => {
        const dateDelta = new Date(right.postDate).getTime() - new Date(left.postDate).getTime();
        if (dateDelta !== 0) return dateDelta;
        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      }),
    [state.transparencyPosts],
  );
  const selectedBudgetRequest = useMemo(
    () => state.budgetRequests.find((item) => item.id === selectedBudgetRequestId) ?? null,
    [selectedBudgetRequestId, state.budgetRequests],
  );
  const selectedBudgetRequestFiles = useMemo(
    () =>
      selectedBudgetRequest
        ? [...state.budgetRequestFiles]
            .filter((file) => file.budgetRequestId === selectedBudgetRequest.id)
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        : [],
    [selectedBudgetRequest, state.budgetRequestFiles],
  );
  const selectedBudgetRequestFile = useMemo(
    () => selectedBudgetRequestFiles.find((file) => file.id === selectedBudgetFileId) ?? selectedBudgetRequestFiles[0] ?? null,
    [selectedBudgetRequestFiles, selectedBudgetFileId],
  );
  const selectedBudgetOrganization = useMemo(
    () => state.organizationProfiles.find((org) => org.id === selectedBudgetRequest?.organizationId) ?? null,
    [selectedBudgetRequest?.organizationId, state.organizationProfiles],
  );
  const selectedLiquidationReport = useMemo(
    () =>
      state.liquidationReports.find((item) => item.id === selectedLiquidationReportId) ??
      selectedLiquidationReportSnapshot ??
      null,
    [selectedLiquidationReportId, selectedLiquidationReportSnapshot, state.liquidationReports],
  );
  const selectedLiquidationReportFiles = useMemo(
    () =>
      selectedLiquidationReport
        ? [...state.liquidationReportFiles]
            .filter((file) => file.liquidationReportId === selectedLiquidationReport.id)
            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())
        : [],
    [selectedLiquidationReport, state.liquidationReportFiles],
  );
  const selectedLiquidationReportFile = useMemo(
    () => selectedLiquidationReportFiles.find((file) => file.id === selectedLiquidationFileId) ?? selectedLiquidationReportFiles[0] ?? null,
    [selectedLiquidationReportFiles, selectedLiquidationFileId],
  );
  const selectedLiquidationBudgetRequest = useMemo(
    () => state.budgetRequests.find((item) => item.id === selectedLiquidationReport?.budgetRequestId) ?? null,
    [selectedLiquidationReport?.budgetRequestId, state.budgetRequests],
  );
  const selectedLiquidationOrganization = useMemo(
    () => state.organizationProfiles.find((org) => org.id === selectedLiquidationReport?.organizationId) ?? null,
    [selectedLiquidationReport?.organizationId, state.organizationProfiles],
  );
  const formatStatusLabel = (status: string) => statusLabelMap[status] ?? status.replaceAll("_", " ");
  const formatShortDate = (value?: string | null) => {
    if (!value) return "Pending";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Pending";
    return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(parsed);
  };
  const formatDateTimeLabel = (value?: string | null) => {
    if (!value) return "Pending";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Pending";
    return new Intl.DateTimeFormat("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(parsed);
  };
  const formatCompactDateParts = (value?: string | null) => {
    if (!value) {
      return { date: "Pending", time: "" };
    }
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return { date: "Pending", time: "" };
    }
    return {
      date: new Intl.DateTimeFormat("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(parsed),
      time: new Intl.DateTimeFormat("en-PH", {
        hour: "numeric",
        minute: "2-digit",
      }).format(parsed),
    };
  };
  const formatFileMetaLabel = (fileType?: string | null, fileSize?: number | null) => {
    const normalizedType = (fileType || "PDF").replace("application/", "").toUpperCase();
    const sizeLabel = fileSize ? `${Math.max(1, Math.round(fileSize / 1024))} KB` : "File attached";
    return `${normalizedType} • ${sizeLabel}`;
  };
  const getManilaDateIso = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
  const visibleLiquidationReports = useMemo(
    () =>
      state.liquidationReports
        .filter((report) => {
          const linkedBudget = state.budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
          return Boolean(linkedBudget && budgetReleaseStatuses.has(linkedBudget.status));
        })
        .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()),
    [budgetReleaseStatuses, state.budgetRequests, state.liquidationReports],
  );
  const budgetRequestStatusOptions = useMemo(
    () => Array.from(new Set(state.budgetRequests.map((request) => request.status))),
    [state.budgetRequests],
  );
  const liquidationReportStatusOptions = useMemo(
    () => Array.from(new Set(visibleLiquidationReports.map((report) => report.status))),
    [visibleLiquidationReports],
  );
  const getLatestLiquidationReportForBudgetRequest = (budgetRequestId: string) =>
    [...state.liquidationReports]
      .filter((item) => item.budgetRequestId === budgetRequestId)
      .sort((left, right) => {
        const leftTime = new Date(left.updatedAt || left.createdAt).getTime();
        const rightTime = new Date(right.updatedAt || right.createdAt).getTime();
        return rightTime - leftTime;
      })[0] ?? null;
  const budgetMonitoringEntries = useMemo<BudgetMonitoringEntry[]>(() => {
    const now = new Date();

    return state.budgetRequests
      .filter((request) => budgetReleaseStatuses.has(request.status))
      .map((request) => {
        const liquidation = getLatestLiquidationReportForBudgetRequest(request.id);
        const approvedAmount = Number(request.approvedAmount || request.requestedAmount || 0);
        const releasedAmount = Number(request.releasedAmount || 0);
        const remainingAmount = Math.max(approvedAmount - releasedAmount, 0);
        const utilizationRate = approvedAmount > 0 ? Math.round((releasedAmount / approvedAmount) * 100) : 0;
        const deadlineDate = liquidation?.deadlineAt ? new Date(liquidation.deadlineAt) : null;
        const completedAtDate = liquidation?.completedAt ? new Date(liquidation.completedAt) : null;
        const requestAgeInDays = Math.max(Math.ceil((now.getTime() - new Date(request.updatedAt || request.createdAt).getTime()) / 86400000), 0);
        const goSignalAt = liquidation?.goSignalAt || request.goSignalAt || "";
        const liquidationStatus = liquidation?.status ?? "pending_activity_completion";
        let riskLabel: BudgetMonitoringEntry["riskLabel"] = "Needs Attention";

        if (liquidationStatus === "completed_liquidated" || request.status === "completed") {
          riskLabel = "Completed";
        } else if (!liquidation && requestAgeInDays >= 7) {
          riskLabel = "Overdue";
        } else if (!liquidation && requestAgeInDays >= 2) {
          riskLabel = "Needs Attention";
        } else if (
          liquidationStatus === "overdue" ||
          (deadlineDate && !Number.isNaN(deadlineDate.getTime()) && deadlineDate.getTime() < now.getTime() && !completedAtDate)
        ) {
          riskLabel = "Overdue";
        } else if (
          liquidationStatus === "approved_for_ftf_green" ||
          liquidationStatus === "budget_released" ||
          liquidationStatus === "hard_copy_submitted"
        ) {
          riskLabel = "On Track";
        } else if (liquidation && deadlineDate && !Number.isNaN(deadlineDate.getTime())) {
          const daysUntilDeadline = Math.ceil((deadlineDate.getTime() - now.getTime()) / 86400000);
          if (daysUntilDeadline <= 0) {
            riskLabel = completedAtDate ? "Completed" : "Overdue";
          } else if (daysUntilDeadline <= 3 || utilizationRate < 50) {
            riskLabel = "Needs Attention";
          } else {
            riskLabel = "On Track";
          }
        }

        return {
          budgetRequestId: request.id,
          liquidationReportId: liquidation?.id ?? null,
          title: request.activityTitle,
          organizationName: state.organizationProfiles.find((org) => org.id === request.organizationId)?.organizationName ?? "Unknown organization",
          approvedAmount,
          releasedAmount,
          remainingAmount,
          utilizationRate,
          budgetStatus: request.status,
          liquidationStatus,
          releaseDate: request.releaseDate || "",
          goSignalAt,
          deadlineAt: liquidation?.deadlineAt || "",
          hardCopySubmittedAt: liquidation?.hardCopySubmittedAt || "",
          completedAt: liquidation?.completedAt || "",
          remarks: liquidation?.remarks || "None",
          ageInDays: liquidation?.deadlineAt ? Math.max(Math.ceil((now.getTime() - new Date(liquidation.deadlineAt).getTime()) / 86400000), 0) : 0,
          riskLabel,
        };
      })
      .sort((left, right) => {
        if (left.riskLabel !== right.riskLabel) {
          const order = new Map<BudgetMonitoringEntry["riskLabel"], number>([
            ["Overdue", 0],
            ["Needs Attention", 1],
            ["On Track", 2],
            ["Completed", 3],
          ]);
          return (order.get(left.riskLabel) ?? 99) - (order.get(right.riskLabel) ?? 99);
        }
        return right.approvedAmount - left.approvedAmount;
      });
  }, [budgetReleaseStatuses, state.budgetRequests, state.liquidationReports, state.organizationProfiles]);
  const filteredAdminBudgetRequests = useMemo(() => {
    const query = budgetRequestsSearch.trim().toLowerCase();
    return state.budgetRequests.filter((request) => {
      const requestOrganization = state.organizationProfiles.find((org) => org.id === request.organizationId) ?? null;
      const matchesSearch =
        !query ||
        [
          request.activityTitle,
          requestOrganization?.organizationName ?? "",
          request.venue ?? "",
          buildPublicRecordCode("BR", request, state.budgetRequests),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = budgetRequestsStatusFilter === "all" || request.status === budgetRequestsStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [budgetRequestsSearch, budgetRequestsStatusFilter, state.budgetRequests, state.organizationProfiles]);
  const filteredVisibleLiquidationReports = useMemo(() => {
    const query = liquidationReportsSearch.trim().toLowerCase();
    return visibleLiquidationReports.filter((report) => {
      const linkedBudget = state.budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
      const liquidationOrg = state.organizationProfiles.find((org) => org.id === report.organizationId) ?? null;
      const matchesSearch =
        !query ||
        [
          liquidationOrg?.organizationName ?? "",
          linkedBudget?.activityTitle ?? "",
          buildPublicRecordCode("LR", report, visibleLiquidationReports),
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = liquidationReportsStatusFilter === "all" || report.status === liquidationReportsStatusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [
    liquidationReportsSearch,
    liquidationReportsStatusFilter,
    state.budgetRequests,
    state.organizationProfiles,
    visibleLiquidationReports,
  ]);
  const filteredBudgetMonitoringEntries = useMemo(() => {
    const query = budgetMonitoringSearch.trim().toLowerCase();
    return budgetMonitoringEntries.filter((entry) => {
      const linkedRequest = state.budgetRequests.find((request) => request.id === entry.budgetRequestId) ?? null;
      const matchesSearch =
        !query ||
        [entry.title, entry.organizationName, buildPublicRecordCode("BR", linkedRequest, state.budgetRequests)]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesRisk = budgetMonitoringRiskFilter === "all" || entry.riskLabel === budgetMonitoringRiskFilter;
      return matchesSearch && matchesRisk;
    });
  }, [budgetMonitoringEntries, budgetMonitoringRiskFilter, budgetMonitoringSearch, state.budgetRequests]);
  const registrationStatusOptions = useMemo(
    () => Array.from(new Set(state.organizationProfiles.map((org) => org.profileStatus))),
    [state.organizationProfiles],
  );
  const registrationDistrictOptions = useMemo(
    () =>
      Array.from(new Set(state.organizationProfiles.map((org) => org.district?.trim()).filter((value): value is string => Boolean(value)))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [state.organizationProfiles],
  );
  const filteredRegistrations = useMemo(() => {
    const query = registrationSearch.trim().toLowerCase();
    return state.organizationProfiles.filter((org) => {
      const matchesSearch =
        !query ||
        [org.organizationName, org.organizationEmail, org.barangay ?? "", org.district ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = registrationStatusFilter === "all" || org.profileStatus === registrationStatusFilter;
      const matchesDistrict = registrationDistrictFilter === "all" || org.district === registrationDistrictFilter;
      return matchesSearch && matchesStatus && matchesDistrict;
    });
  }, [registrationDistrictFilter, registrationSearch, registrationStatusFilter, state.organizationProfiles]);
  const filteredNewsReleases = useMemo(() => {
    const query = newsSearch.trim().toLowerCase();
    return newsReleases.filter((news) => {
      const matchesSearch =
        !query ||
        [news.title, news.description, news.facebookPostUrl ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesVisibility = newsVisibilityFilter === "all" || news.visibilityStatus === newsVisibilityFilter;
      return matchesSearch && matchesVisibility;
    });
  }, [newsSearch, newsVisibilityFilter, newsReleases]);
  const filteredInquiries = useMemo(() => {
    const query = inquirySearch.trim().toLowerCase();
    return [...state.inquiries]
      .filter((inquiry) => {
        const matchesSearch =
          !query ||
          [inquiry.submitterName, inquiry.organizationName, inquiry.email, inquiry.subject, inquiry.description]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesStatus = inquiryStatusFilter === "all" || inquiry.status === inquiryStatusFilter;
        return matchesSearch && matchesStatus;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [inquirySearch, inquiryStatusFilter, state.inquiries]);
  const budgetMonitoringAnalysis = useMemo(() => {
    const totalApproved = budgetMonitoringEntries.reduce((sum, entry) => sum + entry.approvedAmount, 0);
    const totalReleased = budgetMonitoringEntries.reduce((sum, entry) => sum + entry.releasedAmount, 0);
    const totalRemaining = Math.max(totalApproved - totalReleased, 0);
    const utilizationRate = totalApproved > 0 ? Math.round((totalReleased / totalApproved) * 100) : 0;
    const overdueCount = budgetMonitoringEntries.filter((entry) => entry.riskLabel === "Overdue").length;
    const needsAttentionCount = budgetMonitoringEntries.filter((entry) => entry.riskLabel === "Needs Attention").length;
    const completedCount = budgetMonitoringEntries.filter((entry) => entry.riskLabel === "Completed").length;
    const onTrackCount = budgetMonitoringEntries.filter((entry) => entry.riskLabel === "On Track").length;
    const pendingLiquidationCount = budgetMonitoringEntries.filter((entry) => !entry.liquidationReportId).length;

    const insights = [
      `${budgetMonitoringEntries.length} cash-released budget${budgetMonitoringEntries.length === 1 ? "" : "s"} are now under automatic monitoring.`,
      `${pendingLiquidationCount} budget${pendingLiquidationCount === 1 ? "" : "s"} still need an attached liquidation record.`,
      `${overdueCount} budget${overdueCount === 1 ? "" : "s"} are flagged overdue or past deadline.`,
      `${utilizationRate}% of approved funds have been released so far.`,
    ];

    return {
      totalApproved,
      totalReleased,
      totalRemaining,
      utilizationRate,
      overdueCount,
      needsAttentionCount,
      completedCount,
      onTrackCount,
      pendingLiquidationCount,
      insights,
    };
  }, [budgetMonitoringEntries]);
  const organizationProfileById = useMemo(
    () => new Map(state.organizationProfiles.map((organization) => [organization.id, organization] as const)),
    [state.organizationProfiles],
  );
  const budgetAllocationRows = useMemo<BarangayAllocationEntry[]>(() => {
    const grouped = new Map<string, BarangayAllocationEntry>();
    const organizationIdsByGroup = new Map<string, Set<string>>();

    state.budgetRequests
      .filter((request) => budgetReleaseStatuses.has(request.status))
      .forEach((request) => {
        const organization = organizationProfileById.get(request.organizationId) ?? null;
        const district = organization?.district?.trim() || "Unassigned District";
        const barangay = organization?.barangay?.trim() || "Unassigned Barangay";
        const releasedAmount = Number(request.releasedAmount || 0);
        const approvedAmount = Number(request.approvedAmount || request.requestedAmount || 0);
        const remainingAmount = Math.max(approvedAmount - releasedAmount, 0);
        const utilizationRate = approvedAmount > 0 ? Math.round((releasedAmount / approvedAmount) * 100) : 0;
        const key = `${district}::${barangay}`;
        const organizationIds = organizationIdsByGroup.get(key) ?? new Set<string>();
        organizationIds.add(request.organizationId);
        organizationIdsByGroup.set(key, organizationIds);
        const existing = grouped.get(key);

        if (existing) {
          existing.organizationCount = organizationIds.size;
          existing.releasedBudgetCount += 1;
          existing.approvedAmount += approvedAmount;
          existing.releasedAmount += releasedAmount;
          existing.remainingAmount += remainingAmount;
          existing.utilizationRate = existing.approvedAmount > 0 ? Math.round((existing.releasedAmount / existing.approvedAmount) * 100) : 0;
          return;
        }

        grouped.set(key, {
          district,
          barangay,
          organizationCount: organizationIds.size,
          releasedBudgetCount: 1,
          approvedAmount,
          releasedAmount,
          remainingAmount,
          utilizationRate,
        });
      });

    return [...grouped.values()].sort((left, right) => {
      if (left.district !== right.district) return left.district.localeCompare(right.district);
      if (left.releasedAmount !== right.releasedAmount) return right.releasedAmount - left.releasedAmount;
      return left.barangay.localeCompare(right.barangay);
    });
  }, [organizationProfileById, state.budgetRequests]);
  const budgetAllocationDistrictOptions = useMemo(
    () =>
      Array.from(new Set(state.organizationProfiles.map((organization) => organization.district?.trim()).filter((value): value is string => Boolean(value))))
        .sort((left, right) => left.localeCompare(right)),
    [state.organizationProfiles],
  );
  const budgetAllocationBarangayOptions = useMemo(() => {
    const sourceRows =
      budgetAllocationDistrictFilter === "all"
        ? budgetAllocationRows
        : budgetAllocationRows.filter((row) => row.district === budgetAllocationDistrictFilter);
    return Array.from(new Set(sourceRows.map((row) => row.barangay)))
      .sort((left, right) => left.localeCompare(right));
  }, [budgetAllocationDistrictFilter, budgetAllocationRows]);
  const filteredBudgetAllocationRows = useMemo(
    () =>
      budgetAllocationRows.filter((row) => {
        if (budgetAllocationDistrictFilter !== "all" && row.district !== budgetAllocationDistrictFilter) return false;
        if (budgetAllocationBarangayFilter !== "all" && row.barangay !== budgetAllocationBarangayFilter) return false;
        return true;
      }),
    [budgetAllocationBarangayFilter, budgetAllocationDistrictFilter, budgetAllocationRows],
  );
  const selectedBudgetAllocationOrganizationDetails = useMemo<BarangayAllocationOrganizationDetail[]>(() => {
    if (!selectedBudgetAllocation) return [];

    const grouped = new Map<string, BarangayAllocationOrganizationDetail>();

    state.budgetRequests
      .filter((request) => budgetReleaseStatuses.has(request.status))
      .forEach((request) => {
        const organization = organizationProfileById.get(request.organizationId);
        const district = organization?.district?.trim() || "Unassigned District";
        const barangay = organization?.barangay?.trim() || "Unassigned Barangay";

        if (district !== selectedBudgetAllocation.district || barangay !== selectedBudgetAllocation.barangay) return;

        const current =
          grouped.get(request.organizationId) ??
          ({
            organizationId: request.organizationId,
            organizationName: organization?.organizationName || "Unknown organization",
            district,
            barangay,
            budgetRequestCount: 0,
            releasedBudgetCount: 0,
            approvedAmount: 0,
            releasedAmount: 0,
            remainingAmount: 0,
            utilizationRate: 0,
            requests: [],
          } satisfies BarangayAllocationOrganizationDetail);

        const remainingAmount = Math.max(request.approvedAmount - request.releasedAmount, 0);
        current.budgetRequestCount += 1;
        current.releasedBudgetCount += 1;
        current.approvedAmount += request.approvedAmount;
        current.releasedAmount += request.releasedAmount;
        current.remainingAmount += remainingAmount;
        current.utilizationRate = current.approvedAmount > 0 ? Math.round((current.releasedAmount / current.approvedAmount) * 100) : 0;
        current.requests.push({
          id: request.id,
          createdAt: request.createdAt,
          activityTitle: request.activityTitle,
          status: request.status,
          approvedAmount: request.approvedAmount,
          releasedAmount: request.releasedAmount,
          remainingAmount,
          activityDate: request.activityDate,
          releaseDate: request.releaseDate,
          goSignalAt: request.goSignalAt,
          hardCopySubmittedAt: request.hardCopySubmittedAt,
        });
        grouped.set(request.organizationId, current);
      });

    return [...grouped.values()].sort((left, right) => {
      if (right.releasedAmount !== left.releasedAmount) return right.releasedAmount - left.releasedAmount;
      return left.organizationName.localeCompare(right.organizationName);
    });
  }, [organizationProfileById, selectedBudgetAllocation, state.budgetRequests]);
  const budgetAllocationSummary = useMemo(() => {
    const totalApproved = filteredBudgetAllocationRows.reduce((sum, row) => sum + row.approvedAmount, 0);
    const totalReleased = filteredBudgetAllocationRows.reduce((sum, row) => sum + row.releasedAmount, 0);
    const totalRemaining = filteredBudgetAllocationRows.reduce((sum, row) => sum + row.remainingAmount, 0);
    const utilizationRate = totalApproved > 0 ? Math.round((totalReleased / totalApproved) * 100) : 0;
    return {
      barangayCount: filteredBudgetAllocationRows.length,
      totalApproved,
      totalReleased,
      totalRemaining,
      utilizationRate,
    };
  }, [filteredBudgetAllocationRows]);
  const budgetMonitoringChartData = useMemo<BudgetMonitoringChartRow[]>(() => {
    const rows: BudgetMonitoringChartRow[] = [
      { riskLabel: "On Track", count: 0, approvedAmount: 0, releasedAmount: 0, remainingAmount: 0 },
      { riskLabel: "Needs Attention", count: 0, approvedAmount: 0, releasedAmount: 0, remainingAmount: 0 },
      { riskLabel: "Overdue", count: 0, approvedAmount: 0, releasedAmount: 0, remainingAmount: 0 },
      { riskLabel: "Completed", count: 0, approvedAmount: 0, releasedAmount: 0, remainingAmount: 0 },
    ];
    const bucketByLabel = new Map(rows.map((row) => [row.riskLabel, row]));
    budgetMonitoringEntries.forEach((entry) => {
      const bucket = bucketByLabel.get(entry.riskLabel);
      if (!bucket) return;
      bucket.count += 1;
      bucket.approvedAmount += entry.approvedAmount;
      bucket.releasedAmount += entry.releasedAmount;
      bucket.remainingAmount += entry.remainingAmount;
    });
    return rows;
  }, [budgetMonitoringEntries]);
  const budgetMonitoringStatusRows = useMemo(() => {
    const totalCount = Math.max(budgetMonitoringEntries.length, 1);
    return budgetMonitoringChartData.map((row) => ({
      ...row,
      percentage: budgetMonitoringEntries.length ? Math.round((row.count / totalCount) * 100) : 0,
      dotClass:
        row.riskLabel === "On Track"
          ? "bg-primary"
          : row.riskLabel === "Needs Attention"
          ? "bg-amber-400"
          : row.riskLabel === "Overdue"
          ? "bg-rose-500"
          : "bg-emerald-500",
      barClass:
        row.riskLabel === "On Track"
          ? "bg-primary"
          : row.riskLabel === "Needs Attention"
          ? "bg-amber-400"
          : row.riskLabel === "Overdue"
          ? "bg-rose-500"
          : "bg-emerald-500",
      chartColor:
        row.riskLabel === "On Track"
          ? "#2460A7"
          : row.riskLabel === "Needs Attention"
          ? "#F59E0B"
          : row.riskLabel === "Overdue"
          ? "#F43F5E"
          : "#10B981",
    }));
  }, [budgetMonitoringChartData, budgetMonitoringEntries.length]);
  const allocationOrganizationNamesByGroup = useMemo(() => {
    const grouped = new Map<string, Set<string>>();

    state.budgetRequests
      .filter((request) => budgetReleaseStatuses.has(request.status))
      .forEach((request) => {
        const organization = organizationProfileById.get(request.organizationId);
        const district = organization?.district?.trim() || "Unassigned District";
        const barangay = organization?.barangay?.trim() || "Unassigned Barangay";
        const name = organization?.organizationName?.trim() || "Unknown organization";
        const key = `${district}::${barangay}`;
        const names = grouped.get(key) ?? new Set<string>();
        names.add(name);
        grouped.set(key, names);
      });

    return grouped;
  }, [organizationProfileById, state.budgetRequests]);
  const budgetRequestExportRows = useMemo<BudgetRequestExportRow[]>(
    () =>
      budgetMonitoringEntries.map((entry) => ({
        organizationName: entry.organizationName,
        activity: entry.title,
        approvedAmount: entry.approvedAmount,
        releasedAmount: entry.releasedAmount,
        releasedDate: entry.releaseDate,
      })),
    [budgetMonitoringEntries],
  );
  const allocationByBarangayExportRows = useMemo<AllocationByBarangayExportRow[]>(
    () =>
      filteredBudgetAllocationRows.map((entry) => ({
        district: entry.district,
        barangay: entry.barangay,
        organizationNames: [
          ...(allocationOrganizationNamesByGroup.get(`${entry.district}::${entry.barangay}`) ?? new Set<string>()),
        ].sort((left, right) => left.localeCompare(right)),
        approvedAmount: entry.approvedAmount,
        releasedAmount: entry.releasedAmount,
      })),
    [allocationOrganizationNamesByGroup, filteredBudgetAllocationRows],
  );
  const budgetRequestExportFilters = useMemo(() => {
    const summary: string[] = [];
    return summary;
  }, []);
  const allocationExportFilters = useMemo(() => {
    const summary: string[] = [];
    if (budgetAllocationDistrictFilter !== "all") summary.push(`District: ${budgetAllocationDistrictFilter}`);
    if (budgetAllocationBarangayFilter !== "all") summary.push(`Barangay: ${budgetAllocationBarangayFilter}`);
    return summary;
  }, [budgetAllocationBarangayFilter, budgetAllocationDistrictFilter]);
  const handleReportExport = async (format: ExportFormat) => {
    try {
      if (activeReportExport === "budget-requests") {
        if (!budgetRequestExportRows.length) {
          toast({ title: "No Data", description: "No monitored budgets are available to export." });
          return;
        }

        await exportReport(format, {
          config: budgetRequestExportConfig,
          rows: budgetRequestExportRows,
          metadataLines: [
            `Total Records: ${budgetRequestExportRows.length}`,
            `Total Approved Amount: ${formatCurrencyPdf(budgetMonitoringAnalysis.totalApproved)}`,
            `Total Released Amount: ${formatCurrencyPdf(budgetMonitoringAnalysis.totalReleased)}`,
          ],
          filterSummaryLines: budgetRequestExportFilters,
          totalsRow:
            format === "pdf"
              ? buildBudgetRequestPdfTotalsRow(budgetRequestExportRows)
              : format === "csv"
              ? undefined
              : buildBudgetRequestTotalsRow(budgetRequestExportRows),
          xlsxTotalsRow: format === "xlsx" ? buildBudgetRequestXlsxTotalsRow(budgetRequestExportRows) : undefined,
        });
        toast({ title: "Export Ready", description: `The budget request ${format.toUpperCase()} export has been downloaded.` });
        return;
      }

      if (activeReportExport === "allocation-by-barangay") {
        if (!allocationByBarangayExportRows.length) {
          toast({ title: "No Data", description: "No barangay allocations match the current filters." });
          return;
        }

        await exportReport(format, {
          config: allocationByBarangayExportConfig,
          rows: allocationByBarangayExportRows,
          metadataLines: [
            `Total Barangays: ${budgetAllocationSummary.barangayCount}`,
            `Total Organizations: ${allocationByBarangayExportRows.reduce((sum, row) => sum + row.organizationNames.length, 0)}`,
            `Total Approved Amount: ${formatCurrencyPdf(budgetAllocationSummary.totalApproved)}`,
            `Total Released Amount: ${formatCurrencyPdf(budgetAllocationSummary.totalReleased)}`,
          ],
          filterSummaryLines: allocationExportFilters,
          totalsRow:
            format === "pdf"
              ? buildAllocationPdfTotalsRow(allocationByBarangayExportRows)
              : format === "csv"
              ? undefined
              : buildAllocationTotalsRow(allocationByBarangayExportRows),
          xlsxTotalsRow: format === "xlsx" ? buildAllocationXlsxTotalsRow(allocationByBarangayExportRows) : undefined,
        });
        toast({ title: "Export Ready", description: `The allocation by barangay ${format.toUpperCase()} export has been downloaded.` });
      }
    } catch (error) {
      console.error("Failed to export admin report:", error);
      toast({
        title: "Export Failed",
        description: "The selected report could not be generated.",
        variant: "destructive",
      });
      throw error;
    }
  };
  const validDocumentTypeIds = useMemo(
    () => new Set(templateDocuments.map((documentType) => documentType.id)),
    [templateDocuments],
  );
  const overviewStats = useMemo(
    () => ({
      organizations: state.organizationProfiles.length,
      pendingProfiles: state.organizationProfiles.filter((item) => item.profileStatus === "pending_review" || item.profileStatus === "incomplete").length,
      pendingDocuments: state.documentSubmissions.filter((item) => item.status === "submitted" || item.status === "under_admin_review").length,
      revisions: state.documentSubmissions.filter((item) => item.status === "needs_revision").length,
      approvedDocs: state.documentSubmissions.filter((item) => item.status === "approved_green").length,
      pendingBudget: state.budgetRequests.filter((item) => item.status === "submitted" || item.status === "under_review").length,
      approvedBudget: state.budgetRequests.filter((item) => item.status === "approved_for_ftf_green").length,
      releasedBudget: state.budgetRequests.filter((item) => item.status === "budget_released").length,
      pendingLiquidation: state.liquidationReports.filter((item) => item.status === "submitted" || item.status === "under_review").length,
      overdueLiquidation: state.liquidationReports.filter((item) => item.status === "overdue").length,
      pendingInquiries: state.inquiries.filter((item) => item.status === "pending_review").length,
      nonCompliant: state.organizationProfiles.filter((item) => item.profileStatus === "suspended_inactive").length,
    }),
    [state],
  );

  useEffect(() => {
    let isActive = true;
    const filesWithUploads = state.documentSubmissionFiles.filter((file) => file.fileUrl.trim());

    if (!filesWithUploads.length) {
      documentPreviewSourceRef.current = {};
      if (Object.keys(documentPreviewUrls).length > 0) {
        setDocumentPreviewUrls({});
      }
      return;
    }

    void (async () => {
      const nextUrls: Record<string, string> = {};
      const nextSources: Record<string, string> = {};
      const filesToResolve = filesWithUploads.filter((file) => {
        const existingSource = documentPreviewSourceRef.current[file.id];
        if (existingSource === file.fileUrl && documentPreviewUrls[file.id]) {
          nextUrls[file.id] = documentPreviewUrls[file.id];
          nextSources[file.id] = existingSource;
          return false;
        }
        return true;
      });

      const resolvedEntries = await Promise.all(
        filesToResolve.map(async (file) => {
          try {
            const resolvedUrl = await resolveSupabaseFileUrl(file.fileUrl);
            return [file.id, file.fileUrl, resolvedUrl ?? ""] as const;
          } catch {
            return [file.id, file.fileUrl, ""] as const;
          }
        }),
      );

      if (!isActive) return;
      for (const [fileId, sourceUrl, resolvedUrl] of resolvedEntries) {
        nextUrls[fileId] = resolvedUrl;
        nextSources[fileId] = sourceUrl;
      }
      const hasChanged =
        Object.keys(nextUrls).length !== Object.keys(documentPreviewUrls).length ||
        Object.entries(nextUrls).some(([fileId, resolvedUrl]) => documentPreviewUrls[fileId] !== resolvedUrl);
      if (!hasChanged) {
        documentPreviewSourceRef.current = nextSources;
        return;
      }
      documentPreviewSourceRef.current = nextSources;
      setDocumentPreviewUrls(nextUrls);
    })();

    return () => {
      isActive = false;
    };
  }, [documentPreviewUrls, state.documentSubmissionFiles]);

  useEffect(() => {
    let isActive = true;

    if (!selectedBudgetRequestFile) {
      setBudgetPreviewUrl("");
      setBudgetPreviewEmptyMessage(selectedBudgetRequest ? "No budget request file was uploaded." : "");
      setBudgetPreviewCanInline(false);
      setBudgetPreviewLoading(false);
      return;
    }

    const previewTitle = selectedBudgetRequestFile.fileName || selectedBudgetRequest.activityTitle || "Budget Request File";
    setBudgetPreviewTitle(previewTitle);

    if (!selectedBudgetRequestFile.fileUrl.trim()) {
      setBudgetPreviewUrl("");
      setBudgetPreviewEmptyMessage("No budget request file was uploaded.");
      setBudgetPreviewCanInline(false);
      setBudgetPreviewLoading(false);
      return;
    }

    setBudgetPreviewLoading(true);
    setBudgetPreviewEmptyMessage("");

    void (async () => {
      try {
        const resolvedUrl = await resolveSupabaseFileUrl(selectedBudgetRequestFile.fileUrl);
        if (!isActive) return;
        const finalUrl = resolvedUrl ?? "";
        setBudgetPreviewUrl(finalUrl);
        setBudgetPreviewCanInline(canInlinePreviewFile(previewTitle) || canInlinePreviewFile(finalUrl));
      } catch (error) {
        if (!isActive) return;
        setBudgetPreviewUrl("");
        setBudgetPreviewCanInline(false);
        setBudgetPreviewEmptyMessage(
          error instanceof Error ? error.message : "The budget request file preview could not be loaded right now.",
        );
      } finally {
        if (isActive) setBudgetPreviewLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [selectedBudgetRequest?.id, selectedBudgetRequest?.activityTitle, selectedBudgetRequestFile?.id, selectedBudgetRequestFile?.fileUrl]);

  useEffect(() => {
    let isActive = true;

    if (!selectedLiquidationReportFile) {
      setLiquidationPreviewUrl("");
      setLiquidationPreviewEmptyMessage(selectedLiquidationReport ? "No liquidation file was uploaded." : "");
      setLiquidationPreviewCanInline(false);
      setLiquidationPreviewLoading(false);
      return;
    }

    const previewTitle =
      selectedLiquidationReportFile.fileName || selectedLiquidationBudgetRequest?.activityTitle || "Liquidation File";
    setLiquidationPreviewTitle(previewTitle);

    if (!selectedLiquidationReportFile.fileUrl.trim()) {
      setLiquidationPreviewUrl("");
      setLiquidationPreviewEmptyMessage("No liquidation file was uploaded.");
      setLiquidationPreviewCanInline(false);
      setLiquidationPreviewLoading(false);
      return;
    }

    setLiquidationPreviewLoading(true);
    setLiquidationPreviewEmptyMessage("");

    void (async () => {
      try {
        const resolvedUrl = await resolveSupabaseFileUrl(selectedLiquidationReportFile.fileUrl);
        if (!isActive) return;
        const finalUrl = resolvedUrl ?? "";
        setLiquidationPreviewUrl(finalUrl);
        setLiquidationPreviewCanInline(canInlinePreviewFile(previewTitle) || canInlinePreviewFile(finalUrl));
      } catch (error) {
        if (!isActive) return;
        setLiquidationPreviewUrl("");
        setLiquidationPreviewCanInline(false);
        setLiquidationPreviewEmptyMessage(
          error instanceof Error ? error.message : "The liquidation file preview could not be loaded right now.",
        );
      } finally {
        if (isActive) setLiquidationPreviewLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [
    selectedLiquidationBudgetRequest?.activityTitle,
    selectedLiquidationReport?.id,
    selectedLiquidationReportFile?.id,
    selectedLiquidationReportFile?.fileUrl,
  ]);

  useEffect(() => {
    let isActive = true;
    const ypopFile = ypopPreviewFileId
      ? state.ypopFiles.find((f) => f.id === ypopPreviewFileId) ?? null
      : null;

    if (!ypopFile) {
      setYpopPreviewUrl("");
      setYpopPreviewCanInline(false);
      setYpopPreviewLoading(false);
      return;
    }

    setYpopPreviewTitle(ypopFile.fileName);

    if (!ypopFile.fileUrl.trim()) {
      setYpopPreviewUrl("");
      setYpopPreviewCanInline(false);
      setYpopPreviewLoading(false);
      return;
    }

    setYpopPreviewLoading(true);

    void (async () => {
      try {
        const resolvedUrl = await resolveSupabaseFileUrl(ypopFile.fileUrl);
        if (!isActive) return;
        const finalUrl = resolvedUrl ?? "";
        setYpopPreviewUrl(finalUrl);
        setYpopPreviewCanInline(canInlinePreviewFile(ypopFile.fileName) || canInlinePreviewFile(finalUrl));
      } catch {
        if (!isActive) return;
        setYpopPreviewUrl("");
        setYpopPreviewCanInline(false);
      } finally {
        if (isActive) setYpopPreviewLoading(false);
      }
    })();

    return () => { isActive = false; };
  }, [ypopPreviewFileId, state.ypopFiles]);

  const mergeRemoteStateRef = useRef(mergeRemoteState);
  useEffect(() => {
    mergeRemoteStateRef.current = mergeRemoteState;
  }, [mergeRemoteState]);

  const refreshAdminState = async () => {
    const remoteSnapshot = (await loadAdminPortalSupabaseState()) ?? (await loadLydoConnectSupabaseState());
    if (remoteSnapshot) {
      mergeRemoteStateRef.current(remoteSnapshot);
    }
  };

  useEffect(() => {
    let isActive = true;

    void (async () => {
      await refreshAdminState();
      if (!isActive) return;
    })();

    return () => {
      isActive = false;
    };
  }, [section]);

  const appendAuditLog = async (
    action: string,
    relatedType: string,
    relatedId: string,
    description: string,
    organizationId = profile?.id ?? "",
  ) => {
    await createAdminActivityLogInSupabase({
      organizationId,
      action,
      relatedType,
      relatedId,
      description,
    });
  };

  const notifyOrganizationUser = (params: {
    userId: string;
    organizationId: string;
    title: string;
    message: string;
    type: string;
    relatedType: string;
    relatedId: string;
  }) => {
    createNotification({
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userId: params.userId,
      organizationId: params.organizationId,
      title: params.title,
      message: params.message,
      type: params.type,
      relatedType: params.relatedType,
      relatedId: params.relatedId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  };

  const openAdminConfirmation = (params: PendingAdminConfirmation) => {
    setPendingAdminConfirmation(params);
    setApprovalAcknowledged(false);
    setStatusChangeRemarkDraft("currentAdminRemarks" in params ? params.currentAdminRemarks ?? "" : "");
  };

  const closeAdminConfirmation = () => {
    if (processingAdminConfirmation) return;
    setPendingAdminConfirmation(null);
    setApprovalAcknowledged(false);
    setStatusChangeRemarkDraft("");
  };

  const toggleRegistrationCard = (organizationId: string) => {
    setExpandedRegistrationIds((current) =>
      current.includes(organizationId)
        ? current.filter((id) => id !== organizationId)
        : [...current, organizationId],
    );
  };


  const toggleDocumentCard = (fileId: string) => {
    setExpandedDocumentFileIds((current) =>
      current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId],
    );
  };

  const getDocumentReviewCommentDraft = (file: { id: string; adminStatus?: string | null; adminRemarks?: string | null }) => {
    const storedDraft = documentReviewRemarksByFileId[file.id];
    if (typeof storedDraft === "string") {
      return storedDraft;
    }

    if (file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red") {
      return file.adminRemarks?.trim() || "";
    }

    return "";
  };

  const getAdminConfirmationCopy = () => {
    if (!pendingAdminConfirmation) {
      return {
        title: "",
        description: "",
        checkboxLabel: "",
        confirmLabel: "",
        showCommentBox: false,
        commentLabel: "",
        commentPlaceholder: "",
      };
    }

    if (pendingAdminConfirmation.kind === "document") {
      if (pendingAdminConfirmation.action === "approve") {
        return {
          title: "Confirm Document Approval",
          description: `Click the checkbox to acknowledge this approval before marking ${pendingAdminConfirmation.fileName} as approved.`,
          checkboxLabel: "I acknowledge this approval action.",
          confirmLabel: "Approve Submission",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      if (pendingAdminConfirmation.action === "needs_revision") {
        return {
          title: "Confirm Revision Request",
          description: `Click the checkbox to acknowledge this revision request before returning ${pendingAdminConfirmation.fileName} to the organization user.`,
          checkboxLabel: "I acknowledge this revision request.",
          confirmLabel: "Request Revision",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      return {
        title: "Confirm Document Rejection",
        description: `Click the checkbox to acknowledge this rejection before marking ${pendingAdminConfirmation.fileName} as rejected.`,
        checkboxLabel: "I acknowledge this rejection action.",
        confirmLabel: "Reject Submission",
        showCommentBox: false,
        commentLabel: "",
        commentPlaceholder: "",
      };
    }

    if (pendingAdminConfirmation.action === "verify") {
      return {
        title: "Confirm Organization Verification",
        description: `Click the checkbox to acknowledge this approval before verifying ${pendingAdminConfirmation.organizationName}.`,
        checkboxLabel: "I acknowledge this verification action.",
        confirmLabel: "Mark Verified",
        showCommentBox: false,
        commentLabel: "",
        commentPlaceholder: "",
      };
    }

    if (pendingAdminConfirmation.kind === "profile") {
      return {
        title: "Confirm Needs Update Status",
        description: `Click the checkbox to acknowledge this update request before marking ${pendingAdminConfirmation.organizationName} as needing changes.`,
        checkboxLabel: "I acknowledge this needs update action.",
        confirmLabel: "Mark Needs Update",
        showCommentBox: false,
        commentLabel: "",
        commentPlaceholder: "",
      };
    }

    if (pendingAdminConfirmation.kind === "budget") {
      if (pendingAdminConfirmation.action === "approve") {
        return {
          title: "Confirm Budget Approval",
          description: `Click the checkbox to acknowledge this approval before marking ${pendingAdminConfirmation.activityTitle} as approved for face-to-face submission.`,
          checkboxLabel: "I acknowledge this budget approval.",
          confirmLabel: "Approve Budget",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      if (pendingAdminConfirmation.action === "submitted_hardcopy") {
        return {
          title: "Confirm Hardcopy Submission",
          description: `Click the checkbox to acknowledge that the hard copy for ${pendingAdminConfirmation.activityTitle} has been submitted.`,
          checkboxLabel: "I acknowledge this hardcopy submission.",
          confirmLabel: "Mark Submitted Hardcopy",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      if (pendingAdminConfirmation.action === "cash_released") {
        return {
          title: "Confirm Cash Release",
          description: `Click the checkbox to confirm that cash has been released for ${pendingAdminConfirmation.activityTitle}. This will move the budget to monitoring and unlock liquidation.`,
          checkboxLabel: "I acknowledge this cash release.",
          confirmLabel: "Release Cash",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      if (pendingAdminConfirmation.action === "needs_revision") {
        return {
          title: "Confirm Budget Revision",
          description: `Click the checkbox and add a comment before requesting changes for ${pendingAdminConfirmation.activityTitle}.`,
          checkboxLabel: "I acknowledge this revision request.",
          confirmLabel: "Request Revision",
          showCommentBox: true,
          commentLabel: "Admin Comment",
          commentPlaceholder: "Explain what needs to be corrected before approval.",
        };
      }
      return {
        title: "Confirm Budget Rejection",
        description: `Click the checkbox and add a comment before rejecting ${pendingAdminConfirmation.activityTitle}.`,
        checkboxLabel: "I acknowledge this rejection action.",
        confirmLabel: "Reject Budget",
        showCommentBox: true,
        commentLabel: "Admin Comment",
        commentPlaceholder: "Explain why the budget request was rejected.",
      };
    }

    if (pendingAdminConfirmation.action === "overdue") {
      return {
        title: "Confirm Liquidation Overdue",
        description: `Click the checkbox to mark ${pendingAdminConfirmation.activityTitle} as overdue.`,
        checkboxLabel: "I acknowledge this overdue action.",
        confirmLabel: "Mark Overdue",
        showCommentBox: false,
        commentLabel: "",
        commentPlaceholder: "",
      };
    }

    if (pendingAdminConfirmation.kind === "liquidation") {
      if (pendingAdminConfirmation.action === "approve") {
        return {
          title: "Confirm Liquidation Go Signal",
          description: `Click the checkbox to approve the liquidation record for ${pendingAdminConfirmation.activityTitle}.`,
          checkboxLabel: "I acknowledge this liquidation approval.",
          confirmLabel: "Approve Liquidation",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      if (pendingAdminConfirmation.action === "submitted_hardcopy") {
        return {
          title: "Confirm Liquidation Hardcopy Submission",
          description: `Click the checkbox to confirm that the liquidation hard copy for ${pendingAdminConfirmation.activityTitle} has been submitted. This will complete the liquidation record.`,
          checkboxLabel: "I acknowledge this liquidation hardcopy submission.",
          confirmLabel: "Mark Submitted Hardcopy",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      return {
        title: "Confirm Liquidation Revision",
        description: `Click the checkbox and add a comment before requesting changes for ${pendingAdminConfirmation.activityTitle}.`,
        checkboxLabel: "I acknowledge this revision request.",
        confirmLabel: "Request Revision",
        showCommentBox: true,
        commentLabel: "Admin Comment",
        commentPlaceholder: "Explain what needs to be corrected before liquidation can proceed.",
      };
    }

    if (pendingAdminConfirmation.kind === "news_release") {
      if (pendingAdminConfirmation.action === "publish") {
        return {
          title: "Confirm News Publish",
          description: `Click the checkbox to publish "${pendingAdminConfirmation.title}" to the portal.`,
          checkboxLabel: "I acknowledge this publish action.",
          confirmLabel: "Publish News",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      return {
        title: "Confirm News Hide",
        description: `Click the checkbox to hide "${pendingAdminConfirmation.title}" from public view.`,
        checkboxLabel: "I acknowledge this hide action.",
        confirmLabel: "Hide News",
        showCommentBox: false,
        commentLabel: "",
        commentPlaceholder: "",
      };
    }

    if (pendingAdminConfirmation.kind === "transparency_post") {
      if (pendingAdminConfirmation.action === "publish") {
        return {
          title: "Confirm Transparency Publish",
          description: `Click the checkbox to publish "${pendingAdminConfirmation.title}" to the portal.`,
          checkboxLabel: "I acknowledge this publish action.",
          confirmLabel: "Publish Post",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      return {
        title: "Confirm Transparency Hide",
        description: `Click the checkbox to hide "${pendingAdminConfirmation.title}" from public view.`,
        checkboxLabel: "I acknowledge this hide action.",
        confirmLabel: "Hide Post",
        showCommentBox: false,
        commentLabel: "",
        commentPlaceholder: "",
      };
    }

    if (pendingAdminConfirmation.kind === "ypop_event") {
      if (pendingAdminConfirmation.action === "verified") {
        return {
          title: "Confirm Event Verification",
          description: `Click the checkbox to acknowledge this approval before verifying the proof submitted for ${pendingAdminConfirmation.activityName}.`,
          checkboxLabel: "I acknowledge this event verification action.",
          confirmLabel: "Mark Verified",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      if (pendingAdminConfirmation.action === "needs_revision") {
        return {
          title: "Confirm Event Revision Request",
          description: `Click the checkbox and add a comment before requesting revisions for ${pendingAdminConfirmation.activityName}.`,
          checkboxLabel: "I acknowledge this event revision request.",
          confirmLabel: "Request Revision",
          showCommentBox: true,
          commentLabel: "Admin Comment",
          commentPlaceholder: "Explain what proof needs to be corrected or re-uploaded.",
        };
      }
      return {
        title: "Confirm Event Rejection",
        description: `Click the checkbox and add a comment before rejecting the proof submitted for ${pendingAdminConfirmation.activityName}.`,
        checkboxLabel: "I acknowledge this event rejection action.",
        confirmLabel: "Reject Event Proof",
        showCommentBox: true,
        commentLabel: "Admin Comment",
        commentPlaceholder: "Explain why this event proof is being rejected.",
      };
    }

    if (pendingAdminConfirmation.kind === "ypop_org_activity") {
      if (pendingAdminConfirmation.action === "approved") {
        return {
          title: "Confirm PPA Approval",
          description: `Click the checkbox to approve ${pendingAdminConfirmation.activityName}. This will automatically increase the organization-initiated bonus if a tier is reached.`,
          checkboxLabel: "I acknowledge this PPA approval action.",
          confirmLabel: "Approve PPA",
          showCommentBox: false,
          commentLabel: "",
          commentPlaceholder: "",
        };
      }
      if (pendingAdminConfirmation.action === "needs_revision") {
        return {
          title: "Confirm PPA Revision Request",
          description: `Click the checkbox and add a comment before requesting revisions for ${pendingAdminConfirmation.activityName}.`,
          checkboxLabel: "I acknowledge this PPA revision request.",
          confirmLabel: "Request Revision",
          showCommentBox: true,
          commentLabel: "Admin Comment",
          commentPlaceholder: "Explain what needs to be corrected in the narrative or proof files.",
        };
      }
      return {
        title: "Confirm PPA Rejection",
        description: `Click the checkbox and add a comment before rejecting ${pendingAdminConfirmation.activityName}.`,
        checkboxLabel: "I acknowledge this PPA rejection action.",
        confirmLabel: "Reject PPA",
        showCommentBox: true,
        commentLabel: "Admin Comment",
        commentPlaceholder: "Explain why this organization-initiated activity is being rejected.",
      };
    }

    return {
      title: "",
      description: "",
      checkboxLabel: "",
      confirmLabel: "",
      showCommentBox: false,
      commentLabel: "",
      commentPlaceholder: "",
    };
  };

  const executeAdminConfirmation = async () => {
    if (!pendingAdminConfirmation) return;

    setProcessingAdminConfirmation(true);
    try {
      if (pendingAdminConfirmation.kind === "document") {
        const status =
          pendingAdminConfirmation.action === "approve"
            ? "approved_green"
            : pendingAdminConfirmation.action === "needs_revision"
              ? "needs_revision"
              : "rejected_red";
        const adminRemarks = (
          documentReviewRemarksByFileId[pendingAdminConfirmation.fileId] ?? pendingAdminConfirmation.currentAdminRemarks
        ).trim();

        if (pendingAdminConfirmation.action !== "approve" && !adminRemarks) {
          toast({
            title: "Comment required",
            description: "Please add a short comment before requesting a revision or rejection.",
            variant: "destructive",
          });
          return;
        }

        await updateDocumentSubmissionFileReviewInSupabase({
          fileId: pendingAdminConfirmation.fileId,
          status,
          adminRemarks: pendingAdminConfirmation.action === "approve" ? undefined : adminRemarks,
        });
        await refreshAdminState();

        if (pendingAdminConfirmation.action === "approve") {
          await appendAuditLog(
            "Approved document submission",
            "document_submission_file",
            pendingAdminConfirmation.fileId,
            `Approved ${pendingAdminConfirmation.fileName} from the registration detail view.`,
            pendingAdminConfirmation.organizationId,
          );
          toast({
            title: "Submission approved",
            description: `${pendingAdminConfirmation.organizationName}'s document submission is now approved.`,
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await appendAuditLog(
            "Document revision requested",
            "document_submission_file",
            pendingAdminConfirmation.fileId,
            `Requested revisions for ${pendingAdminConfirmation.fileName} from the registration detail view.`,
            pendingAdminConfirmation.organizationId,
          );
          toast({
            title: "Revision requested",
            description: `${pendingAdminConfirmation.organizationName} was asked to revise the document submission.`,
          });
        } else {
          await appendAuditLog(
            "Rejected document submission",
            "document_submission_file",
            pendingAdminConfirmation.fileId,
            `Rejected ${pendingAdminConfirmation.fileName} from the registration detail view.`,
            pendingAdminConfirmation.organizationId,
          );
          toast({
            title: "Submission rejected",
            description: `${pendingAdminConfirmation.organizationName}'s document submission is now rejected.`,
          });
        }
      } else if (pendingAdminConfirmation.kind === "budget") {
        const adminRemarks = statusChangeRemarkDraft.trim();
        const selectedBudget = state.budgetRequests.find((item) => item.id === pendingAdminConfirmation.budgetRequestId) ?? null;
        const budgetStatus = selectedBudget?.status ?? pendingAdminConfirmation.currentStatus;
        const approvedAmount = Number(selectedBudget?.approvedAmount || pendingAdminConfirmation.requestedAmount || 0);

        if (pendingAdminConfirmation.action === "approve" && !approvableBudgetStatuses.has(budgetStatus)) {
          toast({
            title: "Action unavailable",
            description: "This budget request has already moved beyond the approval step.",
            variant: "destructive",
          });
          return;
        }

        if (
          pendingAdminConfirmation.action === "submitted_hardcopy" &&
          budgetStatus !== "approved_for_ftf_green"
        ) {
          toast({
            title: "Action unavailable",
            description: "Hard copy submission can only be recorded after the budget is approved for FTF submission.",
            variant: "destructive",
          });
          return;
        }

        if (
          pendingAdminConfirmation.action === "cash_released" &&
          budgetStatus !== "hard_copy_submitted"
        ) {
          toast({
            title: "Action unavailable",
            description: "Cash can only be released after the hard copy has been recorded as submitted.",
            variant: "destructive",
          });
          return;
        }

        if (
          pendingAdminConfirmation.action === "needs_revision" &&
          !adminRemarks
        ) {
          toast({
            title: "Comment required",
            description: "Please add a short comment before requesting a revision.",
            variant: "destructive",
          });
          return;
        }

        if (pendingAdminConfirmation.action === "reject" && !adminRemarks) {
          toast({
            title: "Comment required",
            description: "Please add a short comment before rejecting a budget request.",
            variant: "destructive",
          });
          return;
        }

        const budgetHistoryNow = new Date().toISOString();
        const existingHistory = (state.budgetRequests.find((r) => r.id === pendingAdminConfirmation.budgetRequestId)?.revisionHistory ?? []);

        if (pendingAdminConfirmation.action === "approve") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "approved_for_ftf_green",
            approvedAmount,
            goSignalAt: budgetHistoryNow,
            adminRemarks: "",
            revisionHistory: [...existingHistory, { action: "approved_for_ftf_green", adminRemarks: "", changedAt: budgetHistoryNow }],
          });
        } else if (pendingAdminConfirmation.action === "submitted_hardcopy") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "hard_copy_submitted",
            hardCopySubmittedAt: budgetHistoryNow,
            adminRemarks: "",
            revisionHistory: [...existingHistory, { action: "hard_copy_submitted", adminRemarks: "", changedAt: budgetHistoryNow }],
          });
        } else if (pendingAdminConfirmation.action === "cash_released") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "budget_released",
            releasedAmount: approvedAmount,
            releaseDate: getManilaDateIso(),
            adminRemarks: "",
            revisionHistory: [...existingHistory, { action: "budget_released", adminRemarks: "", changedAt: budgetHistoryNow }],
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "needs_revision",
            adminRemarks,
            revisionHistory: [...existingHistory, { action: "needs_revision", adminRemarks, changedAt: budgetHistoryNow }],
          });
        } else {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "rejected_red",
            adminRemarks,
            revisionHistory: [...existingHistory, { action: "rejected_red", adminRemarks, changedAt: budgetHistoryNow }],
          });
        }

        await refreshAdminState();

        if (pendingAdminConfirmation.action === "approve") {
          await appendAuditLog(
            "Approved budget request",
            "budget_request",
            pendingAdminConfirmation.budgetRequestId,
            `Marked budget request "${pendingAdminConfirmation.activityTitle}" as approved for face-to-face submission.`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Budget request approved",
            message: "The admin approved your budget request and issued the go signal for the next step.",
            type: "budget_go_signal",
            relatedType: "budget_request",
            relatedId: pendingAdminConfirmation.budgetRequestId,
          });
          toast({
            title: "Budget approved",
            description: `${pendingAdminConfirmation.organizationName}'s budget request is now marked green.`,
          });
        } else if (pendingAdminConfirmation.action === "submitted_hardcopy") {
          await appendAuditLog(
            "Budget hard copy submitted",
            "budget_request",
            pendingAdminConfirmation.budgetRequestId,
            `Recorded hard copy submission for budget request "${pendingAdminConfirmation.activityTitle}".`,
            pendingAdminConfirmation.organizationId,
          );
          toast({
            title: "Hard copy recorded",
            description: `${pendingAdminConfirmation.organizationName}'s hard copy has been marked as submitted.`,
          });
        } else if (pendingAdminConfirmation.action === "cash_released") {
          await appendAuditLog(
            "Budget cash released",
            "budget_request",
            pendingAdminConfirmation.budgetRequestId,
            `Released cash for budget request "${pendingAdminConfirmation.activityTitle}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Budget released",
            message: "Your budget has been released.",
            type: "budget_released",
            relatedType: "budget_request",
            relatedId: pendingAdminConfirmation.budgetRequestId,
          });
          toast({
            title: "Cash released",
            description: `${pendingAdminConfirmation.organizationName}'s budget is now in monitoring and liquidation has been unlocked.`,
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await appendAuditLog(
            "Budget request needs revision",
            "budget_request",
            pendingAdminConfirmation.budgetRequestId,
            `Requested revisions for budget request "${pendingAdminConfirmation.activityTitle}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Budget revision requested",
            message: adminRemarks,
            type: "budget_revision",
            relatedType: "budget_request",
            relatedId: pendingAdminConfirmation.budgetRequestId,
          });
          toast({
            title: "Revision requested",
            description: `${pendingAdminConfirmation.organizationName} was asked to revise the budget request.`,
          });
        } else {
          await appendAuditLog(
            "Rejected budget request",
            "budget_request",
            pendingAdminConfirmation.budgetRequestId,
            `Rejected budget request "${pendingAdminConfirmation.activityTitle}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Budget request rejected",
            message: adminRemarks,
            type: "budget_rejected",
            relatedType: "budget_request",
            relatedId: pendingAdminConfirmation.budgetRequestId,
          });
          toast({
            title: "Budget rejected",
            description: `${pendingAdminConfirmation.organizationName}'s budget request was rejected.`,
          });
        }
      } else if (pendingAdminConfirmation.kind === "liquidation") {
        const selectedLiquidation =
          state.liquidationReports.find((item) => item.id === pendingAdminConfirmation.liquidationReportId) ?? null;
        const liquidationStatus = selectedLiquidation?.status ?? pendingAdminConfirmation.currentStatus;
        const adminRemarks = statusChangeRemarkDraft.trim();
        const liqHistoryNow = new Date().toISOString();
        const existingLiqHistory =
          state.liquidationReports.find((r) => r.id === pendingAdminConfirmation.liquidationReportId)?.revisionHistory ?? [];

        if (
          pendingAdminConfirmation.action === "approve" &&
          !liquidationApprovableStatuses.has(liquidationStatus)
        ) {
          toast({
            title: "Action unavailable",
            description: "This liquidation report has already moved beyond the approval step.",
            variant: "destructive",
          });
          return;
        }

        if (
          pendingAdminConfirmation.action === "submitted_hardcopy" &&
          liquidationStatus !== "approved_for_ftf_green"
        ) {
          toast({
            title: "Action unavailable",
            description: "Hard copy submission can only be recorded after the liquidation report is approved.",
            variant: "destructive",
          });
          return;
        }

        if (
          liquidationLockedStatuses.has(liquidationStatus) &&
          pendingAdminConfirmation.action !== "submitted_hardcopy"
        ) {
          toast({
            title: "Action unavailable",
            description: "This liquidation report is already finalized.",
            variant: "destructive",
          });
          return;
        }

        if (pendingAdminConfirmation.action === "needs_revision" && !adminRemarks) {
          toast({
            title: "Comment required",
            description: "Please add a short comment before requesting a revision.",
            variant: "destructive",
          });
          return;
        }

        if (pendingAdminConfirmation.action === "approve") {
          await updateLiquidationReportInSupabase(pendingAdminConfirmation.liquidationReportId, {
            status: "approved_for_ftf_green",
            remarks: undefined,
            goSignalAt: liqHistoryNow,
          });
        } else if (pendingAdminConfirmation.action === "submitted_hardcopy") {
          await updateLiquidationReportInSupabase(pendingAdminConfirmation.liquidationReportId, {
            status: "completed_liquidated",
            hardCopySubmittedAt: liqHistoryNow,
            completedAt: liqHistoryNow,
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await updateLiquidationReportInSupabase(pendingAdminConfirmation.liquidationReportId, {
            status: "needs_revision",
            remarks: adminRemarks,
          });
        } else {
          await updateLiquidationReportInSupabase(pendingAdminConfirmation.liquidationReportId, {
            status: "overdue",
            remarks: adminRemarks,
          });
        }
        await refreshAdminState();
        updateLiquidationReport(
          pendingAdminConfirmation.liquidationReportId,
          pendingAdminConfirmation.action === "submitted_hardcopy"
            ? {
                hardCopySubmittedAt: liqHistoryNow,
                completedAt: liqHistoryNow,
                status: "completed_liquidated",
                revisionHistory: [
                  ...existingLiqHistory,
                  { action: "hard_copy_submitted", adminRemarks: "", changedAt: liqHistoryNow },
                  { action: "completed_liquidated", adminRemarks: "", changedAt: liqHistoryNow },
                ],
              }
            : {
                revisionHistory: [
                  ...existingLiqHistory,
                  {
                    action:
                      pendingAdminConfirmation.action === "approve"
                        ? "approved_for_ftf_green"
                        : pendingAdminConfirmation.action === "needs_revision"
                        ? "needs_revision"
                        : "overdue",
                    adminRemarks,
                    changedAt: liqHistoryNow,
                  },
                ],
              },
        );

        if (pendingAdminConfirmation.action === "approve") {
          await appendAuditLog(
            "Approved liquidation report",
            "liquidation_report",
            pendingAdminConfirmation.liquidationReportId,
            `Marked liquidation report for "${pendingAdminConfirmation.activityTitle}" as approved for face-to-face submission.`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Liquidation go signal issued",
            message: "Your liquidation soft copies have been pre-checked. You may now submit the hard copies face-to-face.",
            type: "liquidation_go_signal",
            relatedType: "liquidation_report",
            relatedId: pendingAdminConfirmation.liquidationReportId,
          });
          toast({
            title: "Liquidation approved",
            description: `${pendingAdminConfirmation.organizationName}'s liquidation report is now approved.`,
          });
        } else if (pendingAdminConfirmation.action === "submitted_hardcopy") {
          await appendAuditLog(
            "Liquidation hard copy submitted",
            "liquidation_report",
            pendingAdminConfirmation.liquidationReportId,
            `Recorded liquidation hard copy submission for "${pendingAdminConfirmation.activityTitle}" and marked the record completed.`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Liquidation completed",
            message: "Your liquidation hard copy has been recorded and the liquidation report is now completed.",
            type: "liquidation_completed",
            relatedType: "liquidation_report",
            relatedId: pendingAdminConfirmation.liquidationReportId,
          });
          toast({
            title: "Hard copy recorded",
            description: `${pendingAdminConfirmation.organizationName}'s liquidation report is now marked completed.`,
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await appendAuditLog(
            "Liquidation needs revision",
            "liquidation_report",
            pendingAdminConfirmation.liquidationReportId,
            `Requested revisions for liquidation report "${pendingAdminConfirmation.activityTitle}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Liquidation revision requested",
            message: adminRemarks,
            type: "liquidation_revision",
            relatedType: "liquidation_report",
            relatedId: pendingAdminConfirmation.liquidationReportId,
          });
          toast({
            title: "Revision requested",
            description: `${pendingAdminConfirmation.organizationName} was asked to revise the liquidation report.`,
          });
        } else {
          await appendAuditLog(
            "Marked liquidation overdue",
            "liquidation_report",
            pendingAdminConfirmation.liquidationReportId,
            `Marked liquidation report "${pendingAdminConfirmation.activityTitle}" as overdue.`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "",
            organizationId: pendingAdminConfirmation.organizationId,
            title: "Liquidation overdue",
            message: "Your liquidation submission is overdue.",
            type: "overdue",
            relatedType: "liquidation_report",
            relatedId: pendingAdminConfirmation.liquidationReportId,
          });
          toast({
            title: "Liquidation marked overdue",
            description: `${pendingAdminConfirmation.organizationName}'s liquidation report is now overdue.`,
          });
        }
      } else if (pendingAdminConfirmation.kind === "ypop_event") {
        const participation =
          state.ypopEventParticipations.find((item) => item.id === pendingAdminConfirmation.participationId) ?? null;
        const adminRemarks = statusChangeRemarkDraft.trim();

        if (
          (pendingAdminConfirmation.action === "needs_revision" || pendingAdminConfirmation.action === "rejected") &&
          !adminRemarks
        ) {
          toast({
            title: "Comment required",
            description: "Please add a short comment before requesting a revision or rejecting this event proof.",
            variant: "destructive",
          });
          return;
        }

        const now = new Date().toISOString();
        const patch = {
          status: pendingAdminConfirmation.action,
          adminRemarks: pendingAdminConfirmation.action === "verified" ? "" : adminRemarks,
          proofSubmittedAt: participation?.proofSubmittedAt ?? null,
          verifiedAt: pendingAdminConfirmation.action === "verified" ? now : "",
          revisionHistory: [
            ...(participation?.revisionHistory ?? []),
            {
              action: pendingAdminConfirmation.action,
              adminRemarks: pendingAdminConfirmation.action === "verified" ? "" : adminRemarks,
              changedAt: now,
            },
          ],
        };

        try {
          const saved = await adminUpdateYpopEventParticipationInSupabase(pendingAdminConfirmation.participationId, patch);
          updateYPOPEventParticipation(saved.id, saved);
        } catch {
          updateYPOPEventParticipation(pendingAdminConfirmation.participationId, patch);
        }

        await refreshAdminState();

        const orgUserId = state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "";
        if (pendingAdminConfirmation.action === "verified") {
          await appendAuditLog(
            "Verified YPOP event proof",
            "ypop_event_participation",
            pendingAdminConfirmation.participationId,
            `Verified the YPOP event proof for "${pendingAdminConfirmation.activityName}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: orgUserId,
            organizationId: pendingAdminConfirmation.organizationId,
            title: "YPOP event proof verified",
            message: `Your proof for ${pendingAdminConfirmation.activityName} has been verified.`,
            type: "ypop_event_verified",
            relatedType: "ypop_event_participation",
            relatedId: pendingAdminConfirmation.participationId,
          });
          toast({
            title: "Event proof verified",
            description: `${pendingAdminConfirmation.organizationName}'s event proof is now marked verified.`,
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await appendAuditLog(
            "Requested YPOP event proof revision",
            "ypop_event_participation",
            pendingAdminConfirmation.participationId,
            `Requested revisions for the YPOP event proof "${pendingAdminConfirmation.activityName}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: orgUserId,
            organizationId: pendingAdminConfirmation.organizationId,
            title: "YPOP event revision requested",
            message: adminRemarks,
            type: "ypop_event_revision",
            relatedType: "ypop_event_participation",
            relatedId: pendingAdminConfirmation.participationId,
          });
          toast({
            title: "Revision requested",
            description: `${pendingAdminConfirmation.organizationName} was asked to revise the event proof.`,
          });
        } else {
          await appendAuditLog(
            "Rejected YPOP event proof",
            "ypop_event_participation",
            pendingAdminConfirmation.participationId,
            `Rejected the YPOP event proof "${pendingAdminConfirmation.activityName}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: orgUserId,
            organizationId: pendingAdminConfirmation.organizationId,
            title: "YPOP event proof rejected",
            message: adminRemarks,
            type: "ypop_event_rejected",
            relatedType: "ypop_event_participation",
            relatedId: pendingAdminConfirmation.participationId,
          });
          toast({
            title: "Event proof rejected",
            description: `${pendingAdminConfirmation.organizationName}'s event proof was rejected.`,
          });
        }
      } else if (pendingAdminConfirmation.kind === "ypop_org_activity") {
        const orgActivity =
          state.ypopOrgActivities.find((item) => item.id === pendingAdminConfirmation.orgActivityId) ?? null;
        const relatedEntry =
          state.ypopEntries.find((item) => item.id === pendingAdminConfirmation.entryId) ?? null;
        const adminRemarks = statusChangeRemarkDraft.trim();

        if (
          (pendingAdminConfirmation.action === "needs_revision" || pendingAdminConfirmation.action === "rejected") &&
          !adminRemarks
        ) {
          toast({
            title: "Comment required",
            description: "Please add a short comment before requesting a revision or rejecting this PPA log.",
            variant: "destructive",
          });
          return;
        }

        const now = new Date().toISOString();
        const patch = {
          status: pendingAdminConfirmation.action,
          adminRemarks: pendingAdminConfirmation.action === "approved" ? "" : adminRemarks,
          approvedAt: pendingAdminConfirmation.action === "approved" ? now : "",
          revisionHistory: [
            ...(orgActivity?.revisionHistory ?? []),
            {
              action: pendingAdminConfirmation.action,
              adminRemarks: pendingAdminConfirmation.action === "approved" ? "" : adminRemarks,
              changedAt: now,
            },
          ],
        };

        let savedOrgActivity: YPOPOrgActivity | null = null;
        try {
          savedOrgActivity = await adminUpdateYpopOrgActivityInSupabase(pendingAdminConfirmation.orgActivityId, patch);
          updateYPOPOrgActivity(savedOrgActivity.id, savedOrgActivity);
        } catch {
          updateYPOPOrgActivity(pendingAdminConfirmation.orgActivityId, patch);
        }

        if (relatedEntry) {
          const semesterActivities = state.ypopCityActivities.filter((activity) => activity.semesterKey === relatedEntry.semester);
          const period = state.ypopPeriods.find((item) => item.semesterKey === relatedEntry.semester) ?? null;
          const approvedOrgActivities = [
            ...state.ypopOrgActivities.filter((item) => item.id !== pendingAdminConfirmation.orgActivityId),
            (savedOrgActivity ?? { ...(orgActivity as YPOPOrgActivity), ...patch, id: pendingAdminConfirmation.orgActivityId, ypopEntryId: pendingAdminConfirmation.entryId, organizationId: pendingAdminConfirmation.organizationId, submittedBy: orgActivity?.submittedBy ?? "", activityName: pendingAdminConfirmation.activityName, activityDate: orgActivity?.activityDate ?? "", venue: orgActivity?.venue ?? "", narrativeReport: orgActivity?.narrativeReport ?? "", createdAt: orgActivity?.createdAt ?? now, updatedAt: now }) as YPOPOrgActivity,
          ];
          const approvedCount = getApprovedYpopOrgActivityCount(approvedOrgActivities, relatedEntry.id, relatedEntry.orgLedProjectCount ?? 0);
          const updatedScore = computeYpopScore(
            relatedEntry.cityLedAttendance ?? [],
            semesterActivities,
            approvedCount,
            period?.orgLedTiers,
          );
          setYpopValidationForm((current) =>
            current
              ? {
                  ...current,
                  orgLedProjectCount: approvedCount,
                  status:
                    current.status === "qualified" || current.status === "not_qualified"
                      ? (updatedScore.totalScore >= (relatedEntry.pointsRequired ?? YPOP_SCORE_THRESHOLD) ? "qualified" : "not_qualified")
                      : current.status,
                }
              : current,
          );
          const entryPatch = {
            orgLedProjectCount: approvedCount,
            pointsEarned: updatedScore.totalScore,
          };
          try {
            const savedEntry = await adminUpdateYpopEntryInSupabase(relatedEntry.id, entryPatch);
            updateYPOPEntry(savedEntry.id, savedEntry);
          } catch {
            updateYPOPEntry(relatedEntry.id, entryPatch);
          }
        }

        await refreshAdminState();

        const orgUserId = state.organizationProfiles.find((org) => org.id === pendingAdminConfirmation.organizationId)?.userId ?? "";
        if (pendingAdminConfirmation.action === "approved") {
          await appendAuditLog(
            "Approved YPOP organization-initiated activity",
            "ypop_org_activity",
            pendingAdminConfirmation.orgActivityId,
            `Approved the organization-initiated activity "${pendingAdminConfirmation.activityName}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: orgUserId,
            organizationId: pendingAdminConfirmation.organizationId,
            title: "PPA log approved",
            message: `${pendingAdminConfirmation.activityName} now counts toward your YPOP organization-initiated activity bonus.`,
            type: "ypop_org_activity_approved",
            relatedType: "ypop_org_activity",
            relatedId: pendingAdminConfirmation.orgActivityId,
          });
          toast({
            title: "PPA approved",
            description: `${pendingAdminConfirmation.organizationName}'s organization-initiated activity now counts toward the YPOP bonus.`,
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await appendAuditLog(
            "Requested YPOP organization-initiated activity revision",
            "ypop_org_activity",
            pendingAdminConfirmation.orgActivityId,
            `Requested revisions for the organization-initiated activity "${pendingAdminConfirmation.activityName}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: orgUserId,
            organizationId: pendingAdminConfirmation.organizationId,
            title: "PPA revision requested",
            message: adminRemarks,
            type: "ypop_org_activity_revision",
            relatedType: "ypop_org_activity",
            relatedId: pendingAdminConfirmation.orgActivityId,
          });
          toast({
            title: "Revision requested",
            description: `${pendingAdminConfirmation.organizationName} was asked to revise the organization-initiated activity log.`,
          });
        } else {
          await appendAuditLog(
            "Rejected YPOP organization-initiated activity",
            "ypop_org_activity",
            pendingAdminConfirmation.orgActivityId,
            `Rejected the organization-initiated activity "${pendingAdminConfirmation.activityName}".`,
            pendingAdminConfirmation.organizationId,
          );
          notifyOrganizationUser({
            userId: orgUserId,
            organizationId: pendingAdminConfirmation.organizationId,
            title: "PPA log rejected",
            message: adminRemarks,
            type: "ypop_org_activity_rejected",
            relatedType: "ypop_org_activity",
            relatedId: pendingAdminConfirmation.orgActivityId,
          });
          toast({
            title: "PPA rejected",
            description: `${pendingAdminConfirmation.organizationName}'s organization-initiated activity log was rejected.`,
          });
        }
      } else if (pendingAdminConfirmation.kind === "news_release") {
        const visibilityStatus = pendingAdminConfirmation.action === "publish" ? "published" : "hidden";
        const updatedNewsRelease = await updateNewsReleaseInSupabase(pendingAdminConfirmation.id, {
          visibilityStatus,
        });
        updateNewsRelease(pendingAdminConfirmation.id, updatedNewsRelease);
        await refreshAdminState();

        if (pendingAdminConfirmation.action === "publish") {
          await appendAuditLog(
            "Published news release",
            "news_release",
            pendingAdminConfirmation.id,
            `Published news release "${updatedNewsRelease.title}".`,
          );
          toast({
            title: "News release published",
            description: `${updatedNewsRelease.title} is now visible in the portal.`,
          });
        } else {
          await appendAuditLog(
            "Hidden news release",
            "news_release",
            pendingAdminConfirmation.id,
            `Hidden news release "${updatedNewsRelease.title}".`,
          );
          toast({
            title: "News release hidden",
            description: `${updatedNewsRelease.title} is now hidden from public view.`,
          });
        }
      } else if (pendingAdminConfirmation.kind === "transparency_post") {
        const visibilityStatus = pendingAdminConfirmation.action === "publish" ? "published" : "hidden";
        const updatedPost = await updateTransparencyPostInSupabase(pendingAdminConfirmation.id, {
          visibilityStatus,
        });
        updateTransparencyPost(pendingAdminConfirmation.id, updatedPost);
        await refreshAdminState();

        if (pendingAdminConfirmation.action === "publish") {
          await appendAuditLog(
            "Published transparency post",
            "transparency_post",
            pendingAdminConfirmation.id,
            `Published transparency post "${updatedPost.title}".`,
          );
          toast({
            title: "Transparency post published",
            description: `${updatedPost.title} is now visible in the portal.`,
          });
        } else {
          await appendAuditLog(
            "Hidden transparency post",
            "transparency_post",
            pendingAdminConfirmation.id,
            `Hidden transparency post "${updatedPost.title}".`,
          );
          toast({
            title: "Transparency post hidden",
            description: `${updatedPost.title} is now hidden from public view.`,
          });
        }
      } else {
        if (pendingAdminConfirmation.action === "verify") {
          const organizationSubmission =
            state.documentSubmissions.find((item) => item.organizationId === pendingAdminConfirmation.organizationId) ?? null;
          const organizationFiles = organizationSubmission
            ? state.documentSubmissionFiles.filter(
                (file) => file.submissionId === organizationSubmission.id && validDocumentTypeIds.has(file.documentTypeId),
              )
            : [];
          const approvedDocumentCount = organizationFiles.filter((file) => file.adminStatus === "approved_green").length;
          const allRequiredDocumentsApproved =
            organizationFiles.length === templateDocuments.length && approvedDocumentCount === templateDocuments.length;
          const selectedOrganization =
            state.organizationProfiles.find((item) => item.id === pendingAdminConfirmation.organizationId) ?? null;
          const canVerifyWithoutDocuments =
            Boolean(selectedOrganization?.isExistingOrganization) &&
            Boolean(selectedOrganization?.organizationIdentifierNumber.trim());

          if (!allRequiredDocumentsApproved && !canVerifyWithoutDocuments) {
            toast({
              title: "Verification unavailable",
              description: `Please approve all ${templateDocuments.length} submitted documents before marking this organization verified.`,
              variant: "destructive",
            });
            return;
          }

          const verifiedAt = new Date().toISOString();
          await updateOrganizationProfileReviewInSupabase(pendingAdminConfirmation.organizationId, {
            profileStatus: "verified",
            verifiedAt,
          });
          await refreshAdminState();
          await appendAuditLog(
            "Verified organization",
            "organization_profile",
            pendingAdminConfirmation.organizationId,
            `Marked ${pendingAdminConfirmation.organizationName} as verified on ${formatVerifiedDateLabel(verifiedAt)}.`,
            pendingAdminConfirmation.organizationId,
          );
          toast({
            title: "Organization verified",
            description: `${pendingAdminConfirmation.organizationName} is now marked as verified.`,
          });
        } else {
          await updateOrganizationProfileReviewInSupabase(pendingAdminConfirmation.organizationId, {
            profileStatus: "needs_update",
            verifiedAt: "",
          });
          await refreshAdminState();
          await appendAuditLog(
            "Marked needs update",
            "organization_profile",
            pendingAdminConfirmation.organizationId,
            `Marked ${pendingAdminConfirmation.organizationName} for an organization profile update.`,
            pendingAdminConfirmation.organizationId,
          );
          toast({
            title: "Organization marked for update",
            description: `${pendingAdminConfirmation.organizationName} needs to update the submitted profile details.`,
          });
        }
      }

      setPendingAdminConfirmation(null);
      setApprovalAcknowledged(false);
      setStatusChangeRemarkDraft("");
    } catch (error) {
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "The review action could not be completed right now.",
        variant: "destructive",
      });
    } finally {
      setProcessingAdminConfirmation(false);
    }
  };

  const resetTemplateForm = () => {
    setTemplateModalMode(null);
    setEditingTemplateId(null);
    setTemplateNameDraft("");
    setTemplateDescriptionDraft("");
    setTemplateScopeDraft("document_submission");
    setTemplateFileDraft(null);
  };

  const resetNewsReleaseForm = () => {
    setNewsModalMode(null);
    setEditingNewsReleaseId(null);
    setNewsTitleDraft("");
    setNewsDescriptionDraft("");
    setNewsFacebookPostUrlDraft("");
    setNewsPreviewImageUrlDraft("");
    setNewsDatePostedDraft("");
    setNewsVisibilityDraft("draft");
  };

  const resetTransparencyForm = () => {
    setTransparencyModalMode(null);
    setEditingTransparencyPostId(null);
    setTransparencyTitleDraft("");
    setTransparencyDescriptionDraft("");
    setTransparencyCategoryDraft("");
    setTransparencyAttachmentUrlDraft("");
    setTransparencyPostDateDraft("");
    setTransparencyVisibilityDraft("draft");
  };

  const startEditingTemplate = (templateId: string) => {
    const template = activeTemplates.find((entry) => entry.id === templateId);
    if (!template) return;
    setTemplateModalMode("edit");
    setEditingTemplateId(templateId);
    setTemplateNameDraft(template.name);
    setTemplateDescriptionDraft(template.description);
    setTemplateScopeDraft(template.templateScope);
    setTemplateFileDraft(null);
  };

  const startEditingNewsRelease = (newsReleaseId: string) => {
    const newsRelease = newsReleases.find((entry) => entry.id === newsReleaseId);
    if (!newsRelease) return;
    setNewsModalMode("edit");
    setEditingNewsReleaseId(newsReleaseId);
    setNewsTitleDraft(newsRelease.title);
    setNewsDescriptionDraft(newsRelease.description);
    setNewsFacebookPostUrlDraft(newsRelease.facebookPostUrl);
    setNewsPreviewImageUrlDraft(newsRelease.previewImageUrl ?? "");
    setNewsDatePostedDraft(newsRelease.datePosted);
    setNewsVisibilityDraft(newsRelease.visibilityStatus);
  };

  const startEditingTransparencyPost = (postId: string) => {
    const post = transparencyPosts.find((entry) => entry.id === postId);
    if (!post) return;
    setTransparencyModalMode("edit");
    setEditingTransparencyPostId(postId);
    setTransparencyTitleDraft(post.title);
    setTransparencyDescriptionDraft(post.description);
    setTransparencyCategoryDraft(post.category);
    setTransparencyAttachmentUrlDraft(post.attachmentUrl);
    setTransparencyPostDateDraft(post.postDate);
    setTransparencyVisibilityDraft(post.visibilityStatus);
  };

  const handleCreateTemplate = async () => {
    if (!templateNameDraft.trim()) {
      toast({ title: "Template name required", description: "Please enter a document name.", variant: "destructive" });
      return;
    }
    if (!templateFileDraft) {
      toast({ title: "Template file required", description: "Please upload the document file for this template.", variant: "destructive" });
      return;
    }

    setSavingTemplate(true);
    try {
      const newTemplate = await createTemplateRecordInSupabase({
        name: templateNameDraft,
        description: templateDescriptionDraft,
        templateDescription: templateDescriptionDraft || `Template for ${templateNameDraft.trim()}.`,
        templateScope: templateScopeDraft,
      });
      createTemplate(newTemplate);
      if (templateFileDraft) {
        setUploadingTemplateId(newTemplate.id);
        const uploadedTemplate = await uploadTemplateDocumentToSupabase({
          databaseId: newTemplate.databaseId,
          documentTypeName: newTemplate.name,
          file: templateFileDraft,
        });
        updateTemplate(newTemplate.id, uploadedTemplate);
        setUploadingTemplateId(null);
      }
      await appendAuditLog("Created template", "template", newTemplate.databaseId, `Created template "${newTemplate.name}" and uploaded a new file.`);
      await refreshAdminState();
      resetTemplateForm();
      toast({ title: "Template created", description: `${newTemplate.name} was added successfully.` });
    } catch (error) {
      toast({
        title: "Create failed",
        description: error instanceof Error ? error.message : "The template could not be created.",
        variant: "destructive",
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleSaveNewsRelease = async () => {
    if (!newsTitleDraft.trim()) {
      toast({ title: "News title required", description: "Please enter a news release title.", variant: "destructive" });
      return;
    }
    if (!newsDescriptionDraft.trim()) {
      toast({ title: "Description required", description: "Please enter a news release description.", variant: "destructive" });
      return;
    }
    if (!newsFacebookPostUrlDraft.trim()) {
      toast({ title: "Facebook URL required", description: "Please enter the source post URL.", variant: "destructive" });
      return;
    }
    if (!newsDatePostedDraft) {
      toast({ title: "Date required", description: "Please select the posting date.", variant: "destructive" });
      return;
    }

    setSavingNewsRelease(true);
    try {
      if (newsModalMode === "edit" && editingNewsReleaseId) {
        const updatedNewsRelease = await updateNewsReleaseInSupabase(editingNewsReleaseId, {
          title: newsTitleDraft,
          description: newsDescriptionDraft,
          facebookPostUrl: newsFacebookPostUrlDraft,
          previewImageUrl: newsPreviewImageUrlDraft,
          datePosted: newsDatePostedDraft,
          visibilityStatus: newsVisibilityDraft,
        });
        updateNewsRelease(editingNewsReleaseId, updatedNewsRelease);
        await appendAuditLog("Updated news release", "news_release", updatedNewsRelease.id, `Updated news release "${updatedNewsRelease.title}".`);
        await refreshAdminState();
        toast({ title: "News release updated", description: `${updatedNewsRelease.title} was updated successfully.` });
      } else {
        const createdNewsRelease = await createNewsReleaseInSupabase({
          title: newsTitleDraft,
          description: newsDescriptionDraft,
          facebookPostUrl: newsFacebookPostUrlDraft,
          previewImageUrl: newsPreviewImageUrlDraft,
          datePosted: newsDatePostedDraft,
          visibilityStatus: newsVisibilityDraft,
        });
        createNewsRelease(createdNewsRelease);
        await appendAuditLog("Created news release", "news_release", createdNewsRelease.id, `Created news release "${createdNewsRelease.title}".`);
        await refreshAdminState();
        toast({ title: "News release created", description: `${createdNewsRelease.title} was added successfully.` });
      }
      resetNewsReleaseForm();
    } catch (error) {
      toast({
        title: newsModalMode === "edit" ? "Update failed" : "Create failed",
        description: error instanceof Error ? error.message : "The news release could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSavingNewsRelease(false);
    }
  };

  const handleDeleteNewsRelease = async (newsReleaseId: string) => {
    const newsRelease = newsReleases.find((entry) => entry.id === newsReleaseId);
    if (!newsRelease) return;
    setPendingDeleteConfirmation({ kind: "news_release", id: newsReleaseId, title: newsRelease.title });
  };

  const handleDeleteTransparencyPost = async (postId: string) => {
    const post = transparencyPosts.find((entry) => entry.id === postId);
    if (!post) return;
    setPendingDeleteConfirmation({ kind: "transparency_post", id: postId, title: post.title });
  };

  const confirmDeleteRecord = async () => {
    const pending = pendingDeleteConfirmation;
    if (!pending) return;

    setPendingDeleteConfirmation(null);

    try {
      if (pending.kind === "news_release") {
        const newsRelease = newsReleases.find((entry) => entry.id === pending.id);
        if (!newsRelease) return;
        await deleteNewsReleaseInSupabase(pending.id);
        removeNewsRelease(pending.id);
        await appendAuditLog("Deleted news release", "news_release", newsRelease.id, `Deleted news release "${newsRelease.title}".`);
        await refreshAdminState();
        if (editingNewsReleaseId === pending.id) {
          resetNewsReleaseForm();
        }
        toast({ title: "News release deleted", description: `${newsRelease.title} was removed successfully.` });
        return;
      }

      if (pending.kind === "ypop_period") {
        try { await adminDeleteYpopPeriodFromSupabase(pending.id); } catch { /* local-only fallback */ }
        deleteYPOPPeriod(pending.id);
        toast({ title: "Semester deleted", description: `"${pending.title}" and its activities have been removed.` });
        return;
      }

      const post = transparencyPosts.find((entry) => entry.id === pending.id);
      if (!post) return;
      await deleteTransparencyPostInSupabase(pending.id);
      await appendAuditLog("Deleted transparency post", "transparency_post", post.id, `Deleted transparency post "${post.title}".`);
      await refreshAdminState();
      if (editingTransparencyPostId === pending.id) {
        resetTransparencyForm();
      }
      toast({ title: "Transparency post deleted", description: `${post.title} was removed successfully.` });
    } catch (error) {
      toast({
        title: "Delete failed",
        description:
          error instanceof Error
            ? error.message
            : pending.kind === "news_release"
              ? "The news release could not be deleted."
              : "The transparency post could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    const template = templateDocuments.find((entry) => entry.id === editingTemplateId);
    if (!template) return;
    if (!templateNameDraft.trim()) {
      toast({ title: "Template name required", description: "Please enter a document name.", variant: "destructive" });
      return;
    }

    setSavingTemplate(true);
    try {
      const updatedTemplate = await updateTemplateRecordInSupabase({
        databaseId: template.databaseId,
        lookupName: template.name,
        name: templateNameDraft,
        description: templateDescriptionDraft,
        templateDescription: templateDescriptionDraft || `Template for ${templateNameDraft.trim()}.`,
        templateScope: templateScopeDraft,
      });
      updateTemplate(template.id, updatedTemplate);
      if (templateFileDraft) {
        setUploadingTemplateId(template.id);
        const uploadedTemplate = await uploadTemplateDocumentToSupabase({
          databaseId: updatedTemplate.databaseId,
          documentTypeName: updatedTemplate.name,
          file: templateFileDraft,
        });
        updateTemplate(template.id, uploadedTemplate);
        setUploadingTemplateId(null);
      }
      await appendAuditLog("Updated template", "template", template.databaseId, `Updated template "${template.name}" to "${updatedTemplate.name}".`);
      await refreshAdminState();
      resetTemplateForm();
      toast({ title: "Template updated", description: `${updatedTemplate.name} was updated successfully.` });
    } catch (error) {
      toast({
        title: "Update failed",
        description: error instanceof Error ? error.message : "The template could not be updated.",
        variant: "destructive",
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    const template = activeTemplates.find((entry) => entry.id === templateId);
    if (!template) return;

    try {
      await deleteTemplateRecordInSupabase(template.databaseId, template.name);
      removeTemplate(template.id);
      await appendAuditLog("Deleted template", "template", template.databaseId, `Deleted template "${template.name}" from the active list.`);
      await refreshAdminState();
      if (editingTemplateId === template.id || templateModalMode === "delete") {
        resetTemplateForm();
      }
      toast({ title: "Template deleted", description: `${template.name} was removed from the active template list.` });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "The template could not be deleted.",
        variant: "destructive",
      });
    }
  };

  const openFile = async (fileUrl: string, downloadName?: string) => {
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      if (!resolvedUrl) {
        throw new Error("No file is available yet.");
      }

      if (downloadName) {
        const link = document.createElement("a");
        link.href = resolvedUrl;
        link.download = downloadName;
        link.target = "_blank";
        link.rel = "noreferrer";
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      window.open(resolvedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      toast({
        title: "Unable to open file",
        description: error instanceof Error ? error.message : "The file could not be opened right now.",
        variant: "destructive",
      });
    }
  };

  const openPreview = async (fileUrl: string, title: string) => {
    if (!fileUrl.trim() || fileUrl.startsWith("#")) {
      setPreviewUrl("");
      setPreviewTitle(title);
      setPreviewEmptyMessage("No file uploaded yet.");
      setPreviewCanInline(false);
      setPreviewModalOpen(true);
      return;
    }

    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      if (!resolvedUrl) {
        throw new Error("No file is available yet.");
      }

      setPreviewUrl(resolvedUrl);
      setPreviewTitle(title);
      setPreviewEmptyMessage("");
      setPreviewCanInline(canInlinePreviewFile(title) || canInlinePreviewFile(resolvedUrl));
      setPreviewModalOpen(true);
    } catch (error) {
      toast({
        title: "Unable to open preview",
        description: error instanceof Error ? error.message : "The file preview could not be opened right now.",
        variant: "destructive",
      });
    }
  };

  const openBudgetRequestDetails = (requestId: string) => {
    const requestFiles = [...state.budgetRequestFiles]
      .filter((file) => file.budgetRequestId === requestId)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    if (section !== "budget-utilization") {
      navigate(routeMap["budget-utilization"]);
    }
    setSelectedBudgetRequestId(requestId);
    setSelectedBudgetFileId(requestFiles[0]?.id ?? null);
  };

  const closeBudgetRequestDetails = () => {
    setSelectedBudgetRequestId(null);
    setSelectedBudgetFileId(null);
    setBudgetPreviewUrl("");
    setBudgetPreviewTitle("");
    setBudgetPreviewEmptyMessage("");
    setBudgetPreviewCanInline(false);
    setBudgetPreviewLoading(false);
  };

  const openLiquidationDetails = (report: LiquidationReport) => {
    const reportFiles = [...state.liquidationReportFiles]
      .filter((file) => file.liquidationReportId === report.id)
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

    if (section !== "liquidation-monitoring") {
      navigate(routeMap["liquidation-monitoring"]);
    }
    setSelectedLiquidationReportSnapshot(report);
    setSelectedLiquidationReportId(report.id);
    setSelectedLiquidationFileId(reportFiles[0]?.id ?? null);
    setLiquidationDetailsOpen(true);
  };

  const closeLiquidationDetails = () => {
    setLiquidationDetailsOpen(false);
    setSelectedLiquidationReportSnapshot(null);
    setSelectedLiquidationReportId(null);
    setSelectedLiquidationFileId(null);
    setLiquidationPreviewUrl("");
    setLiquidationPreviewTitle("");
    setLiquidationPreviewEmptyMessage("");
    setLiquidationPreviewCanInline(false);
    setLiquidationPreviewLoading(false);
  };

  const performBudgetRequestStatusUpdate = async (
    request: {
      id: string;
      organizationId: string;
      organizationName: string;
      submittedBy: string;
      activityTitle: string;
      requestedAmount: number;
    },
    action: "approve" | "needs_revision" | "reject",
  ) => {
    try {
      if (action === "approve") {
        await updateBudgetRequestInSupabase(request.id, {
          status: "approved_for_ftf_green",
          goSignalAt: new Date().toISOString(),
          approvedAmount: request.requestedAmount,
        });
        await refreshAdminState();
        notifyOrganizationUser({
          userId: request.submittedBy,
          organizationId: request.organizationId,
          title: "Budget request approved",
          message: "The admin approved your budget request and issued the go signal for the next step.",
          type: "budget_go_signal",
          relatedType: "budget_request",
          relatedId: request.id,
        });
        await appendAuditLog(
          "Approved budget request",
          "budget_request",
          request.id,
          `Marked budget request "${request.activityTitle}" as approved for face-to-face green.`,
          request.organizationId,
        );
        toast({
          title: "Budget approved",
          description: `${request.organizationName}'s budget request is now marked green.`,
        });
        return;
      }

      if (action === "needs_revision") {
        await updateBudgetRequestInSupabase(request.id, { status: "needs_revision" });
        await refreshAdminState();
        notifyOrganizationUser({
          userId: request.submittedBy,
          organizationId: request.organizationId,
          title: "Budget request needs revision",
          message: "The admin reviewed your budget request and requested revisions before approval.",
          type: "budget_revision",
          relatedType: "budget_request",
          relatedId: request.id,
        });
        await appendAuditLog(
          "Budget request needs revision",
          "budget_request",
          request.id,
          `Marked budget request "${request.activityTitle}" as needing revision.`,
          request.organizationId,
        );
        toast({
          title: "Revision requested",
          description: `${request.organizationName} was asked to revise the budget request.`,
        });
        return;
      }

      await updateBudgetRequestInSupabase(request.id, { status: "rejected_red" });
      await refreshAdminState();
      notifyOrganizationUser({
        userId: request.submittedBy,
        organizationId: request.organizationId,
        title: "Budget request rejected",
        message: "The admin rejected your budget request. Please review the requirements and submit an updated request if needed.",
        type: "budget_rejected",
        relatedType: "budget_request",
        relatedId: request.id,
      });
      await appendAuditLog(
        "Rejected budget request",
        "budget_request",
        request.id,
        `Rejected budget request "${request.activityTitle}".`,
        request.organizationId,
      );
      toast({
        title: "Budget rejected",
        description: `${request.organizationName}'s budget request was rejected.`,
      });
    } catch (error) {
      toast({
        title: "Unable to update budget",
        description: error instanceof Error ? error.message : "The budget request could not be updated right now.",
        variant: "destructive",
      });
    }
  };

  const selectedTemplate = editingTemplateId
    ? activeTemplates.find((template) => template.id === editingTemplateId) ?? null
    : null;

  const handleSaveTransparencyPost = async () => {
    if (!transparencyTitleDraft.trim()) {
      toast({ title: "Title required", description: "Please enter a transparency post title.", variant: "destructive" });
      return;
    }
    if (!transparencyDescriptionDraft.trim()) {
      toast({ title: "Description required", description: "Please enter a transparency post description.", variant: "destructive" });
      return;
    }
    if (!transparencyCategoryDraft.trim()) {
      toast({ title: "Category required", description: "Please enter a transparency category.", variant: "destructive" });
      return;
    }
    if (!transparencyPostDateDraft) {
      toast({ title: "Post date required", description: "Please select a post date.", variant: "destructive" });
      return;
    }

    setSavingTransparencyPost(true);
    try {
      if (transparencyModalMode === "edit" && editingTransparencyPostId) {
        const updatedPost = await updateTransparencyPostInSupabase(editingTransparencyPostId, {
          title: transparencyTitleDraft,
          description: transparencyDescriptionDraft,
          category: transparencyCategoryDraft,
          attachmentUrl: transparencyAttachmentUrlDraft,
          postDate: transparencyPostDateDraft,
          visibilityStatus: transparencyVisibilityDraft,
        });
        updateTransparencyPost(editingTransparencyPostId, updatedPost);
        await appendAuditLog("Updated transparency post", "transparency_post", updatedPost.id, `Updated transparency post "${updatedPost.title}".`);
        await refreshAdminState();
        toast({ title: "Transparency post updated", description: `${updatedPost.title} was updated successfully.` });
      } else {
        const createdPost = await createTransparencyPostInSupabase({
          title: transparencyTitleDraft,
          description: transparencyDescriptionDraft,
          category: transparencyCategoryDraft,
          attachmentUrl: transparencyAttachmentUrlDraft,
          postDate: transparencyPostDateDraft,
          visibilityStatus: transparencyVisibilityDraft,
        });
        await appendAuditLog("Created transparency post", "transparency_post", createdPost.id, `Created transparency post "${createdPost.title}".`);
        await refreshAdminState();
        toast({ title: "Transparency post created", description: `${createdPost.title} was added successfully.` });
      }
      resetTransparencyForm();
    } catch (error) {
      toast({
        title: transparencyModalMode === "edit" ? "Update failed" : "Create failed",
        description: error instanceof Error ? error.message : "The transparency post could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSavingTransparencyPost(false);
    }
  };

  const activeContent = useMemo(() => {
    switch (section) {
      case "overview": {
        const formatActionName = (action: string) =>
          action.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

        const taskItems = [
          { count: overviewStats.pendingProfiles,    label: "Organization profile(s) pending review", route: routeMap.registrations,             critical: false },
          { count: overviewStats.pendingDocuments,   label: "Document set(s) awaiting validation",   route: routeMap.registrations,             critical: false },
          { count: overviewStats.revisions,          label: "Document revision(s) need re-review",   route: routeMap.registrations,             critical: false },
          { count: overviewStats.overdueLiquidation, label: "liquidation report(s) overdue",         route: routeMap["liquidation-monitoring"], critical: true  },
          { count: overviewStats.pendingLiquidation, label: "liquidation report(s) awaiting review", route: routeMap["liquidation-monitoring"], critical: false },
          { count: overviewStats.pendingInquiries,    label: "inquiry(s) awaiting response",          route: routeMap.inquiries,                 critical: false },
          { count: overviewStats.nonCompliant,       label: "organization(s) with compliance issues", route: routeMap.users,                    critical: true  },
        ].filter((item) => item.count > 0);

        return (
          <div className="space-y-5">
            {/* Summary stats */}
            <PortalSection title="Summary" description="Current compliance and budget status across all organizations.">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <PortalMetricCard
                  label="Registered Organizations"
                  value={overviewStats.organizations}
                  helper="Total organizations on the portal."
                  icon={Users}
                  iconTone="primary"
                  onClick={() => navigate(routeMap.registrations)}
                />
                <PortalMetricCard
                  label="Approved Documents"
                  value={overviewStats.approvedDocs}
                  helper="Fully validated document sets."
                  icon={CheckCircle2}
                  iconTone="emerald"
                  onClick={() => navigate(routeMap.registrations)}
                />
                <PortalMetricCard
                  label="Budget Released"
                  value={overviewStats.releasedBudget}
                  helper="Funds confirmed released to organizations."
                  icon={Banknote}
                  iconTone="violet"
                  onClick={() => navigate(routeMap["budget-utilization"])}
                />
                <PortalMetricCard
                  label="Pending Inquiries"
                  value={overviewStats.pendingInquiries}
                  helper="User submissions waiting for admin review."
                  icon={Mail}
                  iconTone="sky"
                  onClick={() => navigate(routeMap.inquiries)}
                />
              </div>
            </PortalSection>

            {/* Tasks */}
            <PortalSection
              title="Tasks"
              action={
                taskItems.length > 0 ? (
                  <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                    {taskItems.length} pending
                  </span>
                ) : null
              }
            >
              {taskItems.length === 0 ? (
                <div className="flex items-center gap-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  All clear — no pending tasks right now.
                </div>
              ) : (
                <div className="divide-y divide-border/60">
                  {taskItems.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => navigate(item.route)}
                      className="flex w-full items-center gap-3 py-3 text-left text-sm transition-colors hover:bg-muted/40 first:pt-0 last:pb-0 px-1 rounded-lg"
                    >
                      <AlertTriangle className={`h-4 w-4 shrink-0 ${item.critical ? "text-destructive" : "text-amber-500"}`} />
                      <span className={`inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-md px-1.5 text-xs font-semibold tabular-nums ${
                        item.critical
                          ? "bg-destructive/10 text-destructive"
                          : "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                      }`}>
                        {item.count}
                      </span>
                      <span className="flex-1 text-foreground">{item.label}</span>
                      <ArrowRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                    </button>
                  ))}
                </div>
              )}
            </PortalSection>

            {/* Recent Activity — two separate cards */}
            <div className="grid gap-5 xl:grid-cols-2">
              <PortalSection title="Notifications">
                <div className="space-y-2">
                  {state.notifications.slice(0, 4).length > 0 ? state.notifications.slice(0, 4).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-xl border border-border/70 bg-background p-3.5 text-left text-sm transition-colors hover:bg-muted/40"
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex items-start gap-2.5">
                        {!notification.isRead && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`font-medium leading-snug ${!notification.isRead ? "text-foreground" : "text-muted-foreground"}`}>
                            {notification.title}
                          </p>
                          <p className="mt-1 text-muted-foreground text-xs">{notification.message}</p>
                        </div>
                      </div>
                    </button>
                  )) : (
                    <p className="text-sm text-muted-foreground">No notifications.</p>
                  )}
                </div>
              </PortalSection>
              <PortalSection title="Recent Activity">
                <div className="space-y-2">
                  {state.activityLogs.slice(0, 4).length > 0 ? state.activityLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="rounded-xl border border-border/70 bg-background p-3.5 text-sm">
                      <p className="font-medium leading-snug">{formatActionName(log.action)}</p>
                      <p className="mt-1 text-muted-foreground">{log.description}</p>
                      <p className="mt-1.5 text-xs text-muted-foreground/75">{formatDateTimeLabel(log.createdAt)}</p>
                    </div>
                  )) : (
                    <p className="text-sm text-muted-foreground">No recent activity.</p>
                  )}
                </div>
              </PortalSection>
            </div>
          </div>
        );
      }
      case "inquiries": {
        return (
          <PortalSection
            title="Inquiries"
            description="Submitted inquiries from the user dashboard appear here in a consistent review format."
          >
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                <Input
                  value={inquirySearch}
                  onChange={(event) => setInquirySearch(event.target.value)}
                  placeholder="Search name, organization, email, subject, or description"
                  aria-label="Search inquiries"
                  className="h-11"
                />
                <Select value={inquiryStatusFilter} onValueChange={(value) => setInquiryStatusFilter(value as typeof inquiryStatusFilter)}>
                  <SelectTrigger className="h-11" aria-label="Filter inquiries by status">
                    <SelectValue placeholder="Filter status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending_review">Pending Review</SelectItem>
                    <SelectItem value="reviewed">Reviewed</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {filteredInquiries.length ? (
                <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
                  <Table className="min-w-[940px] table-fixed">
                    <TableHeader>
                      <TableRow className="border-border/70 bg-muted/35 hover:bg-muted/35">
                        <TableHead className="h-11 w-[16%] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Name / Organization
                        </TableHead>
                        <TableHead className="h-11 w-[21%] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Email
                        </TableHead>
                        <TableHead className="h-11 w-[29%] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Subject
                        </TableHead>
                        <TableHead className="h-11 w-[17%] px-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Submitted
                        </TableHead>
                        <TableHead className="h-11 w-[11%] px-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Status
                        </TableHead>
                        <TableHead className="h-11 w-[6%] px-4 text-center text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInquiries.map((inquiry) => {
                        const submittedParts = formatCompactDateParts(inquiry.createdAt);
                        return (
                          <TableRow key={inquiry.id} className="border-border/60 transition-colors hover:bg-muted/20">
                            <TableCell className="px-4 py-3.5 align-middle">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-foreground">
                                  {inquiry.submitterName || "Unnamed submitter"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {inquiry.organizationName || "No organization name provided"}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 align-middle">
                              <p className="truncate text-sm text-foreground" title={inquiry.email}>
                                {inquiry.email}
                              </p>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 align-top">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-foreground" title={inquiry.subject}>
                                  {inquiry.subject}
                                </p>
                                <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground" title={inquiry.description}>
                                  {inquiry.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-center align-middle">
                              <div className="space-y-0.5">
                                <p className="text-sm font-medium text-foreground">{submittedParts.date}</p>
                                <p className="text-xs text-muted-foreground">{submittedParts.time}</p>
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-center align-middle">
                              <div className="flex justify-center">
                                <PortalStatusBadge status={inquiry.status} />
                              </div>
                            </TableCell>
                            <TableCell className="px-4 py-3.5 text-center align-middle">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2.5 text-xs font-medium"
                                aria-label={`View inquiry from ${inquiry.submitterName || inquiry.organizationName || inquiry.email}`}
                                onClick={() => setSelectedInquiry(inquiry)}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <PortalEmptyState
                  title="No inquiries yet"
                  description="Once a user submits an inquiry from the dashboard, it will appear here."
                />
              )}
            </div>
          </PortalSection>
        );
      }
      case "registrations": {
        const selectedOrg =
          state.organizationProfiles.find((org) => org.id === selectedRegistrationId) ?? null;
        const selectedSubmission = selectedOrg
          ? state.documentSubmissions.find((item) => item.organizationId === selectedOrg.id) ?? null
          : null;
        const selectedFiles = selectedSubmission
          ? state.documentSubmissionFiles.filter(
              (file) => file.submissionId === selectedSubmission.id && validDocumentTypeIds.has(file.documentTypeId),
            )
          : [];
        const approvedDocumentCount = selectedFiles.filter((file) => file.adminStatus === "approved_green").length;
        const allRequiredDocumentsApproved = selectedFiles.length === templateDocuments.length && approvedDocumentCount === templateDocuments.length;
        const canVerifyWithoutDocuments =
          Boolean(selectedOrg?.isExistingOrganization) && Boolean(selectedOrg?.organizationIdentifierNumber?.trim());

        if (selectedOrg) {
          return (
            <div className="space-y-6">
              {/* Action bar */}
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Button size="sm" variant="ghost" className="-ml-1.5 shrink-0" onClick={() => setSelectedRegistrationId(null)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                    <span className="h-5 w-px shrink-0 bg-border/60" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{selectedOrg.organizationName}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {selectedOrg.profileStatus === "verified" && selectedOrg.verifiedAt
                          ? `Verified on ${new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(selectedOrg.verifiedAt))}`
                          : selectedOrg.profileStatus === "needs_update"
                          ? "Needs update"
                          : "Pending verification"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PortalStatusBadge status={selectedOrg.profileStatus} />
                    {selectedOrg.profileStatus !== "verified" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!allRequiredDocumentsApproved && !canVerifyWithoutDocuments}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "profile",
                            action: "verify",
                            organizationId: selectedOrg.id,
                            organizationName: selectedOrg.organizationName,
                            userId: selectedOrg.userId,
                          })
                        }
                      >
                        Mark Verified
                      </Button>
                    ) : null}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "profile",
                          action: "needs_update",
                          organizationId: selectedOrg.id,
                          organizationName: selectedOrg.organizationName,
                          userId: selectedOrg.userId,
                        })
                      }
                    >
                      Needs Update
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${selectedOrg.isExistingOrganization ? "border-sky-200 bg-sky-50 text-sky-700" : "border-violet-200 bg-violet-50 text-violet-700"}`}>
                    {selectedOrg.isExistingOrganization ? "Existing organization" : "New organization"}
                  </span>
                  {selectedOrg.isExistingOrganization && selectedOrg.organizationIdentifierNumber ? (
                    <>
                      <span className="h-3 w-px bg-border" />
                      <span>{selectedOrg.organizationIdentifierNumber}</span>
                    </>
                  ) : null}
                  <span className="h-3 w-px bg-border" />
                  <span>{approvedDocumentCount}/{templateDocuments.length} documents approved</span>
                </div>
              </div>

              {/* Profile detail */}
              <div className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
                <div className="space-y-5">
                  <PortalSection title="Organization Contact">
                    <div className="divide-y divide-border/50">
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Email</p>
                        <p className="break-all text-sm font-medium">{selectedOrg.organizationEmail}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Contact</p>
                        <p className="text-sm font-medium">{selectedOrg.contactNumber || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Barangay</p>
                        <p className="text-sm font-medium">{selectedOrg.barangay || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Facebook</p>
                        {selectedOrg.facebookPageUrl ? (
                          <a href={selectedOrg.facebookPageUrl} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline">
                            {selectedOrg.facebookPageUrl}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-muted-foreground">N/A</p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Address</p>
                        <p className="break-words text-sm font-medium">{selectedOrg.address || "N/A"}</p>
                      </div>
                    </div>
                  </PortalSection>

                  <PortalSection title="Classification">
                    <div className="divide-y divide-border/50">
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Major</p>
                        <p className="text-sm font-medium">{selectedOrg.majorClassification || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Sub</p>
                        <p className="text-sm font-medium">{selectedOrg.subClassification || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-1 gap-1.5 py-3 first:pt-0 last:pb-0 sm:grid-cols-[9rem_1fr] sm:gap-3">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Date Created</p>
                        <p className="text-sm font-medium">
                          {selectedOrg.verifiedAt ? formatVerifiedDateLabel(selectedOrg.verifiedAt) : "Pending verification"}
                        </p>
                      </div>
                    </div>
                  </PortalSection>
                </div>

                <div className="space-y-5">
                  <PortalSection title="Leadership">
                    <div className="divide-y divide-border/50">
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Representative</p>
                        <p className="text-sm font-medium">{selectedOrg.representativeName || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Adviser</p>
                        <p className="text-sm font-medium">{selectedOrg.adviserName || "N/A"}</p>
                      </div>
                    </div>
                  </PortalSection>

                  <PortalSection title="Advocacies">
                    {renderAdvocacyChips(selectedOrg.advocacies)}
                  </PortalSection>
                </div>
              </div>

              {/* Documents */}
              <PortalSection
                title="Submitted Documents"
                description={`${selectedFiles.length}/${templateDocuments.length} files submitted from the organization user side.`}
              >
                {selectedSubmission ? (
                  <div className="divide-y divide-border/50">
                    {templateDocuments.map((documentType) => {
                      const file = selectedFiles.find((entry) => entry.documentTypeId === documentType.id);
                      const previewUrl = file ? documentPreviewUrls[file.id] ?? "" : "";
                      const isExpanded = file ? expandedDocumentFileIds.includes(file.id) : false;
                      return (
                        <div key={documentType.id} className="py-4 first:pt-0 last:pb-0">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="min-w-0 space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                <p className="text-sm font-medium">{documentType.name}</p>
                                {file ? <PortalStatusBadge status={file.adminStatus ?? "submitted"} /> : null}
                              </div>
                              <p className="pl-6 text-sm text-muted-foreground">{file?.fileName ?? "No file submitted yet."}</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full shrink-0 sm:w-auto lg:w-auto"
                              disabled={!file}
                              onClick={() => file && toggleDocumentCard(file.id)}
                            >
                              {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                              {isExpanded ? "Hide" : "Review"}
                            </Button>
                          </div>
                          {isExpanded && file ? (
                            <div className="mt-4 space-y-4">
                              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)]">
                                <div className="space-y-3">
                                  <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                                    {previewUrl ? (
                                      <iframe
                                        src={previewUrl}
                                        title={file.fileName}
                                        className="h-[24rem] w-full sm:h-[28rem] xl:h-[32rem]"
                                      />
                                    ) : (
                                      <div className="grid h-[24rem] place-items-center p-6 text-center text-sm text-muted-foreground sm:h-[28rem] xl:h-[32rem]">
                                        Preview unavailable. Use the buttons below to open the uploaded file.
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-3">
                                  {/* Recent Activity */}
                                  <div className="rounded-xl border border-border/70 bg-background p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Recent Activity</p>
                                    <div className="mt-3 space-y-3">
                                      <div className="flex items-start gap-3">
                                        <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                                        <div>
                                          <p className="text-sm font-medium">Submitted</p>
                                          {file.uploadedAt ? (
                                            <p className="text-xs text-muted-foreground">
                                              {formatDateTimeLabel(file.uploadedAt)}
                                            </p>
                                          ) : null}
                                        </div>
                                      </div>
                                      {file.adminStatus !== "submitted" ? (
                                        <div className="flex items-start gap-3">
                                          <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${file.adminStatus === "approved_green" ? "bg-emerald-500" : file.adminStatus === "needs_revision" ? "bg-amber-400" : file.adminStatus === "rejected_red" ? "bg-destructive" : "bg-muted-foreground/40"}`} />
                                          <div className="min-w-0">
                                            <p className="text-sm font-medium">{statusLabelMap[file.adminStatus] ?? file.adminStatus.replaceAll("_", " ")}</p>
                                            {file.reviewedAt ? (
                                              <p className="text-xs text-muted-foreground">
                                                {formatDateTimeLabel(file.reviewedAt)}
                                              </p>
                                            ) : null}
                                            {file.adminRemarks ? (
                                              <p className="mt-1 break-words text-sm text-muted-foreground">"{file.adminRemarks}"</p>
                                            ) : null}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="flex items-start gap-3">
                                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/20" />
                                          <p className="text-sm text-muted-foreground">Not yet reviewed.</p>
                                        </div>
                                      )}
                                      {file.userRemarks ? (
                                        <div className="flex items-start gap-3">
                                          <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                                          <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">Note from org</p>
                                            <p className="mt-0.5 break-words text-sm text-muted-foreground">"{file.userRemarks}"</p>
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>

                                  {/* Admin Review Action */}
                                  <div className="rounded-xl border border-border/70 bg-background p-4">
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Admin review action</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      Leave a note when the submission needs revision or is rejected.
                                    </p>
                                    <Textarea
                                      id={`document-admin-comment-${file.id}`}
                                      name={`documentAdminComment-${file.id}`}
                                      value={getDocumentReviewCommentDraft(file)}
                                      onChange={(event) =>
                                        setDocumentReviewRemarksByFileId((current) => ({
                                          ...current,
                                          [file.id]: event.target.value,
                                        }))
                                      }
                                      placeholder="Explain what should be changed, or why the file was rejected."
                                      className="mt-3 min-h-24"
                                    />
                                    <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                        onClick={() =>
                                          openAdminConfirmation({
                                            kind: "document",
                                            action: "approve",
                                            fileId: file.id,
                                            submissionId: selectedSubmission.id,
                                            organizationId: selectedOrg.id,
                                            organizationName: selectedOrg.organizationName,
                                            fileName: file.fileName,
                                            currentAdminRemarks: getDocumentReviewCommentDraft(file),
                                          })
                                        }
                                      >
                                        Approve
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                        onClick={() =>
                                          openAdminConfirmation({
                                            kind: "document",
                                            action: "needs_revision",
                                            fileId: file.id,
                                            submissionId: selectedSubmission.id,
                                            organizationId: selectedOrg.id,
                                            organizationName: selectedOrg.organizationName,
                                            fileName: file.fileName,
                                            currentAdminRemarks: getDocumentReviewCommentDraft(file),
                                          })
                                        }
                                      >
                                        Needs Revision
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="w-full sm:w-auto"
                                        onClick={() =>
                                          openAdminConfirmation({
                                            kind: "document",
                                            action: "reject",
                                            fileId: file.id,
                                            submissionId: selectedSubmission.id,
                                            organizationId: selectedOrg.id,
                                            organizationName: selectedOrg.organizationName,
                                            fileName: file.fileName,
                                            currentAdminRemarks: getDocumentReviewCommentDraft(file),
                                          })
                                        }
                                      >
                                        Reject
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <PortalEmptyState
                    title="No document submission yet"
                    description="Once this organization submits files on the user side, the same files will appear here."
                  />
                )}
              </PortalSection>
            </div>
          );
        }

        return (
          <PortalSection
            title="Registration Review"
            description="Review pending organization profiles and their submitted documents. Open an organization to validate files and verify their registration."
          >
            {state.organizationProfiles.length ? (
              <div className="space-y-4">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                  <Input
                    value={registrationSearch}
                    onChange={(event) => setRegistrationSearch(event.target.value)}
                    placeholder="Search by organization, email, barangay, or district"
                  />
                  <Select value={registrationStatusFilter} onValueChange={setRegistrationStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {registrationStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={registrationDistrictFilter} onValueChange={setRegistrationDistrictFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All districts" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Districts</SelectItem>
                      {registrationDistrictOptions.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredRegistrations.length ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    {filteredRegistrations.map((org) => {
                      const orgSubmission = state.documentSubmissions.find((item) => item.organizationId === org.id);
                      const submittedCount = orgSubmission
                        ? state.documentSubmissionFiles.filter(
                            (file) => file.submissionId === orgSubmission.id && validDocumentTypeIds.has(file.documentTypeId),
                          ).length
                        : 0;
                      const statusDotColor =
                        org.profileStatus === "verified"
                          ? "bg-emerald-500"
                          : org.profileStatus === "needs_update" || org.profileStatus === "pending_review"
                          ? "bg-amber-400"
                          : "bg-muted-foreground/40";
                      return (
                        <Card key={org.id} className="border-border/70 shadow-sm">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-2.5">
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotColor}`} />
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-foreground">{org.organizationName}</p>
                                  <p className="mt-0.5 truncate text-sm text-muted-foreground">{org.organizationEmail}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {[org.barangay, org.district].filter(Boolean).join(" • ") || "No location provided"}
                                  </p>
                                </div>
                              </div>
                              <PortalStatusBadge status={org.profileStatus} />
                            </div>
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Documents submitted</span>
                                <span className="font-medium">{submittedCount}/{templateDocuments.length}</span>
                              </div>
                              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary/60 transition-[width]"
                                  style={{ width: templateDocuments.length ? `${(submittedCount / templateDocuments.length) * 100}%` : "0%" }}
                                />
                              </div>
                            </div>
                            <div className="mt-4 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setSelectedRegistrationId(org.id)}
                              >
                                Review
                                <ArrowRight className="ml-2 h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ) : (
                  <PortalEmptyState
                    title="No matching registrations"
                    description="Try adjusting the search, status, or district filter."
                  />
                )}
              </div>
            ) : (
              <PortalEmptyState
                title="No registrations yet"
                description="Organization profiles will appear here after users complete and save them from the user portal."
              />
            )}
          </PortalSection>
        );
      }
      case "budget-utilization":
        if (selectedBudgetRequest) {
          const budgetLockedAfterRelease =
            selectedBudgetRequest.status === "budget_released" || selectedBudgetRequest.status === "completed";
          const budgetTimelineLabel = selectedBudgetRequest.activityDate
            ? formatShortDate(selectedBudgetRequest.activityDate)
            : "No activity date";
          return (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeBudgetRequestDetails}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Budget Requests
                </button>
                <div className="flex items-center gap-2">
                  <PortalStatusBadge status={selectedBudgetRequest.status} />
                  {budgetLockedAfterRelease ? <DetailStatusChip label="Finalized" tone="success" /> : null}
                </div>
              </div>

              <DetailInfoCard
                title="Budget Request"
                icon={<CircleDollarSign className="h-5 w-5" />}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <p className="text-3xl font-semibold tracking-tight text-foreground">{selectedBudgetRequest.activityTitle}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>Submitted by {selectedBudgetOrganization?.organizationName ?? "Unknown organization"}</span>
                      {selectedBudgetOrganization?.organizationEmail ? <span>({selectedBudgetOrganization.organizationEmail})</span> : null}
                      {selectedBudgetOrganization?.barangay ? <span>{selectedBudgetOrganization.barangay}</span> : null}
                      <span>Activity Date: {budgetTimelineLabel}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <PortalStatusBadge status={selectedBudgetRequest.status} />
                    {budgetLockedAfterRelease ? <DetailStatusChip label="Finalized" tone="success" /> : null}
                  </div>
                </div>
              </DetailInfoCard>

              <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
                <DetailInfoCard title="Budget Details" icon={<ClipboardList className="h-5 w-5" />} className="self-start">
                  <DetailSectionBlock label="Submitted By">
                    <DetailSubmittedBy
                      title={selectedBudgetOrganization?.organizationName ?? "Unknown organization"}
                      email={selectedBudgetOrganization?.organizationEmail}
                      subtitle={selectedBudgetOrganization?.barangay ?? null}
                    />
                  </DetailSectionBlock>

                  <SectionDivider />

                  <DetailSectionBlock label="Financial Information">
                    <div className="space-y-3">
                      <DetailInfoRow label="Requested Amount" value={formatPesoAmount(selectedBudgetRequest.requestedAmount)} />
                      <DetailInfoRow label="Approved Amount" value={formatPesoAmount(selectedBudgetRequest.approvedAmount)} />
                      <DetailInfoRow label="Released Amount" value={formatPesoAmount(selectedBudgetRequest.releasedAmount)} />
                    </div>
                  </DetailSectionBlock>

                  <SectionDivider />

                  <DetailSectionBlock label="Activity Information">
                    <div className="space-y-3">
                      <DetailInfoRow label="Activity Date" value={budgetTimelineLabel} />
                      <DetailInfoRow label="Venue" value={selectedBudgetRequest.venue || "Not specified"} valueClassName="break-words" />
                      <DetailInfoRow label="Purpose Category" value={selectedBudgetRequest.purposeCategory || "Not specified"} />
                    </div>
                  </DetailSectionBlock>

                  <SectionDivider />

                  <DetailSectionBlock label="Process Status">
                    <div className="space-y-3">
                      <DetailInfoRow label="Go Signal">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary/70" />
                          <span>{formatShortDate(selectedBudgetRequest.goSignalAt)}</span>
                        </div>
                      </DetailInfoRow>
                      <DetailInfoRow label="Hardcopy Submitted">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-primary/70" />
                          <span>{formatShortDate(selectedBudgetRequest.hardCopySubmittedAt)}</span>
                        </div>
                      </DetailInfoRow>
                      <DetailInfoRow label="Released At">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-primary/70" />
                          <span>{formatShortDate(selectedBudgetRequest.releaseDate)}</span>
                        </div>
                      </DetailInfoRow>
                    </div>
                  </DetailSectionBlock>

                  {selectedBudgetRequest.remarks ? (
                    <>
                      <SectionDivider />
                      <DetailSectionBlock label="Organization Remarks">
                        <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-sm text-foreground">
                          {selectedBudgetRequest.remarks}
                        </div>
                      </DetailSectionBlock>
                    </>
                  ) : null}

                  <SectionDivider />

                  <DetailSectionBlock label="Recent Activity">
                    {(selectedBudgetRequest.revisionHistory?.length || selectedBudgetRequest.userNote) ? (
                      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Submitted</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTimeLabel(selectedBudgetRequest.createdAt)}</p>
                          </div>
                        </div>
                        {(selectedBudgetRequest.revisionHistory ?? []).map((entry, idx) => {
                          const dotColor =
                            entry.action === "needs_revision" || entry.action === "rejected_red"
                              ? "bg-rose-500"
                              : entry.action === "approved_for_ftf_green" || entry.action === "hard_copy_submitted" || entry.action === "budget_released" || entry.action === "completed"
                                ? "bg-emerald-500"
                                : "bg-amber-400";
                          const actionLabel =
                            entry.action === "needs_revision" ? "Revision Requested"
                            : entry.action === "rejected_red" ? "Rejected"
                            : entry.action === "approved_for_ftf_green" ? "Approved"
                            : entry.action === "hard_copy_submitted" ? "Hardcopy Submitted"
                            : entry.action === "budget_released" ? "Budget Released"
                            : entry.action === "completed" ? "Completed"
                            : entry.action.replaceAll("_", " ");
                          return (
                            <div key={idx} className="flex items-start gap-2.5">
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{actionLabel}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTimeLabel(entry.changedAt)}</p>
                                {entry.adminRemarks ? <p className="mt-1 text-xs italic text-muted-foreground">"{entry.adminRemarks}"</p> : null}
                              </div>
                            </div>
                          );
                        })}
                        {selectedBudgetRequest.userNote ? (
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-sky-700">Message from organization</p>
                              <p className="mt-1 text-xs italic text-muted-foreground">"{selectedBudgetRequest.userNote}"</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-sm text-muted-foreground">
                        No review activity yet.
                      </div>
                    )}
                  </DetailSectionBlock>
                </DetailInfoCard>

                <DetailInfoCard title="Review and Attached Files" icon={<FileText className="h-5 w-5" />}>
                  <DetailSectionBlock label="Review Actions">
                    <ReviewActionToolbar>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!approvableBudgetStatuses.has(selectedBudgetRequest.status) || budgetLockedAfterRelease}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "budget",
                            action: "approve",
                            budgetRequestId: selectedBudgetRequest.id,
                            organizationId: selectedBudgetRequest.organizationId,
                            organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedBudgetRequest.activityTitle,
                            requestedAmount: selectedBudgetRequest.requestedAmount,
                            currentStatus: selectedBudgetRequest.status,
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedBudgetRequest.status !== "approved_for_ftf_green" || budgetLockedAfterRelease}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "budget",
                            action: "submitted_hardcopy",
                            budgetRequestId: selectedBudgetRequest.id,
                            organizationId: selectedBudgetRequest.organizationId,
                            organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedBudgetRequest.activityTitle,
                            requestedAmount: selectedBudgetRequest.requestedAmount,
                            currentStatus: selectedBudgetRequest.status,
                          })
                        }
                      >
                        Mark Hardcopy Submitted
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={selectedBudgetRequest.status !== "hard_copy_submitted" || budgetLockedAfterRelease}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "budget",
                            action: "cash_released",
                            budgetRequestId: selectedBudgetRequest.id,
                            organizationId: selectedBudgetRequest.organizationId,
                            organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedBudgetRequest.activityTitle,
                            requestedAmount: selectedBudgetRequest.requestedAmount,
                            currentStatus: selectedBudgetRequest.status,
                          })
                        }
                      >
                        Mark Released
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={budgetLockedAfterRelease}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "budget",
                            action: "needs_revision",
                            budgetRequestId: selectedBudgetRequest.id,
                            organizationId: selectedBudgetRequest.organizationId,
                            organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedBudgetRequest.activityTitle,
                            requestedAmount: selectedBudgetRequest.requestedAmount,
                            currentStatus: selectedBudgetRequest.status,
                          })
                        }
                      >
                        Needs Revision
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={budgetLockedAfterRelease}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "budget",
                            action: "reject",
                            budgetRequestId: selectedBudgetRequest.id,
                            organizationId: selectedBudgetRequest.organizationId,
                            organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedBudgetRequest.activityTitle,
                            requestedAmount: selectedBudgetRequest.requestedAmount,
                            currentStatus: selectedBudgetRequest.status,
                          })
                        }
                      >
                        Reject
                      </Button>
                    </ReviewActionToolbar>
                    {selectedBudgetRequest.adminRemarks ? (
                      <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Latest Admin Feedback</p>
                        <p className="text-sm text-amber-900">{selectedBudgetRequest.adminRemarks}</p>
                      </div>
                    ) : null}
                  </DetailSectionBlock>

                  <SectionDivider />

                  <DetailSectionBlock label="Attached Files">
                    <p className="text-sm text-muted-foreground">
                      {selectedBudgetRequestFiles.length
                        ? `${selectedBudgetRequestFiles.length} file${selectedBudgetRequestFiles.length === 1 ? "" : "s"} uploaded.`
                        : "No attached files were uploaded for this request."}
                    </p>
                    {selectedBudgetRequestFiles.length ? (
                      <div className="space-y-4">
                        <DetailFilePills
                          items={selectedBudgetRequestFiles.map((file) => ({ id: file.id, fileName: file.fileName }))}
                          selectedId={selectedBudgetRequestFile?.id}
                          onSelect={setSelectedBudgetFileId}
                        />
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                          {budgetPreviewLoading ? (
                            <div className="grid min-h-[65vh] place-items-center p-6 text-sm text-muted-foreground">Loading preview...</div>
                          ) : budgetPreviewUrl && budgetPreviewCanInline ? (
                            isImagePreviewFile(budgetPreviewTitle) || isImagePreviewFile(budgetPreviewUrl) ? (
                              <div className="flex min-h-[65vh] items-center justify-center overflow-hidden bg-background">
                                <img
                                  src={budgetPreviewUrl}
                                  alt={budgetPreviewTitle || "Budget request preview"}
                                  className="max-h-[72vh] w-full object-contain"
                                />
                              </div>
                            ) : (
                              <iframe
                                title={budgetPreviewTitle || "Budget Request Preview"}
                                src={budgetPreviewUrl}
                                className="h-[72vh] w-full border-0 bg-background"
                                loading="eager"
                              />
                            )
                          ) : budgetPreviewUrl ? (
                            <div className="grid min-h-[65vh] place-items-center p-6 text-center text-sm text-muted-foreground">
                              <div className="space-y-3">
                                <p>This uploaded file cannot be shown inline. You can open it in a new tab if needed.</p>
                                <Button type="button" variant="outline" onClick={() => window.open(budgetPreviewUrl, "_blank", "noopener,noreferrer")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open File
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid min-h-[65vh] place-items-center border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                              {budgetPreviewEmptyMessage || "No attached budget request file was uploaded."}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
                        No attached budget request files were submitted.
                      </div>
                    )}
                  </DetailSectionBlock>
                </DetailInfoCard>
              </div>
            </div>
          );
        }
        return (
          <PortalSection title="Budget Requests" description="Review budget requests submitted by organizations. Approve requests to issue a go-signal, request revisions, or reject.">
            {state.budgetRequests.length ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Input
                    value={budgetRequestsSearch}
                    onChange={(event) => setBudgetRequestsSearch(event.target.value)}
                    placeholder="Search by request title, organization, venue, or request ID"
                  />
                  <Select value={budgetRequestsStatusFilter} onValueChange={setBudgetRequestsStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {budgetRequestStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredAdminBudgetRequests.length ? (
                  <>
                    <div className="space-y-3 md:hidden">
                      {filteredAdminBudgetRequests.map((request) => {
                        const requestOrganization = state.organizationProfiles.find((org) => org.id === request.organizationId) ?? null;
                        const primaryFile =
                          [...state.budgetRequestFiles]
                            .filter((file) => file.budgetRequestId === request.id)
                            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
                        const latestActivity = (request.revisionHistory ?? []).at(-1) ?? null;
                        return (
                          <Card key={request.id} className="border-border/70 shadow-sm">
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="font-semibold text-foreground">{request.activityTitle}</p>
                                    {request.budgetRequestType === "ypop_incentive" ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        <Trophy className="h-2.5 w-2.5 text-amber-600" />
                                        YPOP Incentive
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-xs text-primary">Request ID: {buildPublicRecordCode("BR", request, state.budgetRequests)}</p>
                                  <p className="text-xs text-muted-foreground">{requestOrganization?.organizationName ?? "Unknown organization"}</p>
                                  <p className="text-xs text-muted-foreground">Created {formatShortDate(request.createdAt)}</p>
                                </div>
                                <PortalStatusBadge status={request.status} />
                              </div>

                              <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:grid-cols-2">
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Proposed Date</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(request.proposedDate)}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Venue</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{request.venue || "No venue"}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Requested</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">PHP {Number(request.requestedAmount || 0).toLocaleString()}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                                  <p className="mt-1 text-sm font-medium text-emerald-700">PHP {Number(request.approvedAmount || 0).toLocaleString()}</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">File</p>
                                {primaryFile ? (
                                  <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background p-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                                      <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{primaryFile.fileName}</p>
                                      <p className="text-xs text-muted-foreground">{formatFileMetaLabel(primaryFile.fileType, primaryFile.fileSize)}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No file uploaded yet</p>
                                )}
                              </div>

                              <div className="space-y-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Recent Activity</p>
                                <p className="text-sm text-foreground">{latestActivity ? formatStatusLabel(latestActivity.action) : formatStatusLabel(request.status)}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTimeLabel(latestActivity?.changedAt ?? request.updatedAt)}</p>
                                {latestActivity?.adminRemarks ? <p className="text-xs text-muted-foreground">{latestActivity.adminRemarks}</p> : null}
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => openBudgetRequestDetails(request.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Review
                                </Button>
                                {primaryFile ? (
                                  <Button type="button" size="sm" onClick={() => void openFile(primaryFile.fileUrl, primaryFile.fileName)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Open File
                                  </Button>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm md:block">
                <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/35 hover:bg-muted/35">
                        <TableHead className="min-w-[250px]">Request</TableHead>
                        <TableHead className="min-w-[160px]">Status</TableHead>
                        <TableHead className="min-w-[120px]">Proposed Date</TableHead>
                        <TableHead className="min-w-[140px]">Venue</TableHead>
                        <TableHead className="min-w-[170px]">Amounts (PHP)</TableHead>
                        <TableHead className="min-w-[230px]">File</TableHead>
                        <TableHead className="min-w-[190px]">Recent Activity</TableHead>
                        <TableHead className="w-[70px] text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                    {filteredAdminBudgetRequests.map((request) => {
                        const requestOrganization = state.organizationProfiles.find((org) => org.id === request.organizationId) ?? null;
                        const primaryFile =
                          [...state.budgetRequestFiles]
                            .filter((file) => file.budgetRequestId === request.id)
                            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
                        const latestActivity = (request.revisionHistory ?? []).at(-1) ?? null;
                        return (
                          <TableRow key={request.id} className="align-middle">
                            <TableCell className="align-middle">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="font-semibold text-foreground">{request.activityTitle}</p>
                                  {request.budgetRequestType === "ypop_incentive" ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                      <Trophy className="h-2.5 w-2.5 text-amber-600" />
                                      YPOP Incentive
                                    </span>
                                  ) : null}
                                </div>
                                <p className="text-xs text-muted-foreground">Request ID: {buildPublicRecordCode("BR", request, state.budgetRequests)}</p>
                                <p className="text-xs text-muted-foreground">{requestOrganization?.organizationName ?? "Unknown organization"}</p>
                                <p className="text-xs text-muted-foreground">Created {formatShortDate(request.createdAt)}</p>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle">
                              <PortalStatusBadge status={request.status} />
                            </TableCell>
                            <TableCell className="align-middle text-sm text-foreground">{formatShortDate(request.proposedDate)}</TableCell>
                            <TableCell className="align-middle text-sm text-foreground">{request.venue || "No venue"}</TableCell>
                            <TableCell className="align-middle">
                              <div className="space-y-1 text-sm">
                                <p className="text-muted-foreground">Requested</p>
                                <p className="font-medium text-foreground">PHP {Number(request.requestedAmount || 0).toLocaleString()}</p>
                                <p className="text-muted-foreground">Approved</p>
                                <p className="font-medium text-emerald-700">PHP {Number(request.approvedAmount || 0).toLocaleString()}</p>
                              </div>
                            </TableCell>
                            <TableCell className="align-middle">
                              {primaryFile ? (
                                <div className="flex items-start gap-2">
                                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                                    <FileText className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{primaryFile.fileName}</p>
                                    <p className="text-xs text-muted-foreground">{formatFileMetaLabel(primaryFile.fileType, primaryFile.fileSize)}</p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground">No file uploaded yet</p>
                              )}
                            </TableCell>
                            <TableCell className="align-middle">
                              <div className="space-y-1">
                                <p className="text-sm text-foreground">{latestActivity ? formatStatusLabel(latestActivity.action) : formatStatusLabel(request.status)}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTimeLabel(latestActivity?.changedAt ?? request.updatedAt)}</p>
                                {latestActivity?.adminRemarks ? <p className="line-clamp-2 text-xs text-muted-foreground">{latestActivity.adminRemarks}</p> : null}
                              </div>
                            </TableCell>
                            <TableCell className="align-middle text-right">
                              <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" size="icon" variant="outline" className="h-8 w-8">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                  <DropdownMenuItem onClick={() => openBudgetRequestDetails(request.id)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Review
                                  </DropdownMenuItem>
                                  {primaryFile ? (
                                    <DropdownMenuItem onClick={() => void openFile(primaryFile.fileUrl, primaryFile.fileName)}>
                                      <FileText className="mr-2 h-4 w-4" />
                                      Open File
                                    </DropdownMenuItem>
                                  ) : null}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                </Table>
                  </div>
                  </>
                ) : (
                  <PortalEmptyState title="No matching budget requests" description="Try adjusting the search or status filter." />
                )}
              </div>
            ) : (
              <PortalEmptyState title="No budget requests yet" description="Budget requests will appear here after an organization creates one." />
            )}
            </PortalSection>
        );
      case "liquidation-monitoring":
        if (liquidationDetailsOpen && selectedLiquidationReport) {
          const liquidationLockedAfterHardCopy =
            selectedLiquidationReport.status === "hard_copy_submitted" ||
            selectedLiquidationReport.status === "completed_liquidated";
          const canApproveLiquidation = liquidationApprovableStatuses.has(selectedLiquidationReport.status);
          const canMarkLiquidationHardCopySubmitted = selectedLiquidationReport.status === "approved_for_ftf_green";
          const liquidationDeadlineLabel = formatShortDate(selectedLiquidationReport.deadlineAt);
          return (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeLiquidationDetails}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Liquidation Reports
                </button>
                <div className="flex items-center gap-2">
                  <PortalStatusBadge status={selectedLiquidationReport.status} />
                  {liquidationLockedAfterHardCopy ? <DetailStatusChip label="Finalized" tone="success" /> : null}
                </div>
              </div>

              <DetailInfoCard
                title="Liquidation Record"
                icon={<FileText className="h-5 w-5" />}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="space-y-2">
                    <p className="text-3xl font-semibold tracking-tight text-foreground">{selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation Report"}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                      <span>Submitted by {selectedLiquidationOrganization?.organizationName ?? "Unknown organization"}</span>
                      {selectedLiquidationOrganization?.organizationEmail ? <span>({selectedLiquidationOrganization.organizationEmail})</span> : null}
                      {selectedLiquidationOrganization?.barangay ? <span>{selectedLiquidationOrganization.barangay}</span> : null}
                      <span>Deadline: {liquidationDeadlineLabel}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                    <PortalStatusBadge status={selectedLiquidationReport.status} />
                    {liquidationLockedAfterHardCopy ? <DetailStatusChip label="Finalized" tone="success" /> : null}
                  </div>
                </div>
              </DetailInfoCard>

              <div className="grid gap-5 xl:grid-cols-[22rem_minmax(0,1fr)]">
                <DetailInfoCard title="Liquidation Details" icon={<ClipboardList className="h-5 w-5" />} className="self-start">
                  <DetailSectionBlock label="Submitted By">
                    <DetailSubmittedBy
                      title={selectedLiquidationOrganization?.organizationName ?? "Unknown organization"}
                      email={selectedLiquidationOrganization?.organizationEmail}
                      subtitle={selectedLiquidationOrganization?.barangay ?? null}
                    />
                  </DetailSectionBlock>

                  <SectionDivider />

                  <DetailSectionBlock label="Record Information">
                    <div className="space-y-3">
                      <DetailInfoRow label="Linked Budget">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-primary/70" />
                          <span className="break-words">{selectedLiquidationBudgetRequest?.activityTitle ?? "Not linked"}</span>
                        </div>
                      </DetailInfoRow>
                      <DetailInfoRow label="Go Signal">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-primary/70" />
                          <span>{formatShortDate(selectedLiquidationReport.goSignalAt)}</span>
                        </div>
                      </DetailInfoRow>
                      <DetailInfoRow label="Deadline">
                        <div className="flex items-center gap-2">
                          <Clock3 className="h-4 w-4 text-primary/70" />
                          <span>{liquidationDeadlineLabel}</span>
                        </div>
                      </DetailInfoRow>
                      <DetailInfoRow label="Hardcopy Submitted">
                        <div className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4 text-primary/70" />
                          <span>{formatShortDate(selectedLiquidationReport.hardCopySubmittedAt)}</span>
                        </div>
                      </DetailInfoRow>
                      <DetailInfoRow label="Completed At">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-primary/70" />
                          <span>{formatShortDate(selectedLiquidationReport.completedAt)}</span>
                        </div>
                      </DetailInfoRow>
                    </div>
                  </DetailSectionBlock>

                  {selectedLiquidationReport.remarks ? (
                    <>
                      <SectionDivider />
                      <DetailSectionBlock label="Organization Remarks">
                        <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-sm text-foreground">
                          {selectedLiquidationReport.remarks}
                        </div>
                      </DetailSectionBlock>
                    </>
                  ) : null}

                  <SectionDivider />

                  <DetailSectionBlock label="Recent Activity">
                    {selectedLiquidationReport.revisionHistory?.length ? (
                      <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Report Created</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTimeLabel(selectedLiquidationReport.createdAt)}</p>
                          </div>
                        </div>
                        {selectedLiquidationReport.revisionHistory.map((entry, idx) => {
                          const liqDotColor =
                            entry.action === "overdue" || entry.action === "rejected_red"
                              ? "bg-rose-500"
                              : entry.action === "approved_for_ftf_green" || entry.action === "completed_liquidated" || entry.action === "hard_copy_submitted"
                                ? "bg-emerald-500"
                                : entry.action === "submitted"
                                  ? "bg-muted-foreground/40"
                                  : "bg-amber-400";
                          const liqActionLabel =
                            entry.action === "overdue" ? "Marked Overdue"
                            : entry.action === "needs_revision" ? "Revision Requested"
                            : entry.action === "approved_for_ftf_green" ? "Approved"
                            : entry.action === "submitted" ? "Submitted"
                            : entry.action === "hard_copy_submitted" ? "Hardcopy Submitted"
                            : entry.action === "completed_liquidated" ? "Liquidated"
                            : entry.action;
                          return (
                            <div key={idx} className="flex items-start gap-2.5">
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${liqDotColor}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{liqActionLabel}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTimeLabel(entry.changedAt)}</p>
                                {entry.adminRemarks ? <p className="mt-1 text-xs italic text-muted-foreground">"{entry.adminRemarks}"</p> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/60 bg-muted/10 p-3 text-sm text-muted-foreground">
                        No review activity yet.
                      </div>
                    )}
                  </DetailSectionBlock>
                </DetailInfoCard>

                <DetailInfoCard title="Review and Attached Files" icon={<FileText className="h-5 w-5" />}>
                  <DetailSectionBlock label="Review Actions">
                    <ReviewActionToolbar>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canApproveLiquidation || liquidationLockedAfterHardCopy}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "liquidation",
                            action: "approve",
                            liquidationReportId: selectedLiquidationReport.id,
                            budgetRequestId: selectedLiquidationReport.budgetRequestId,
                            organizationId: selectedLiquidationReport.organizationId,
                            organizationName: selectedLiquidationOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation report",
                            currentStatus: selectedLiquidationReport.status,
                          })
                        }
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!canMarkLiquidationHardCopySubmitted || liquidationLockedAfterHardCopy}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "liquidation",
                            action: "submitted_hardcopy",
                            liquidationReportId: selectedLiquidationReport.id,
                            budgetRequestId: selectedLiquidationReport.budgetRequestId,
                            organizationId: selectedLiquidationReport.organizationId,
                            organizationName: selectedLiquidationOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation report",
                            currentStatus: selectedLiquidationReport.status,
                          })
                        }
                      >
                        Mark Hardcopy Submitted
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={liquidationLockedAfterHardCopy}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "liquidation",
                            action: "needs_revision",
                            liquidationReportId: selectedLiquidationReport.id,
                            budgetRequestId: selectedLiquidationReport.budgetRequestId,
                            organizationId: selectedLiquidationReport.organizationId,
                            organizationName: selectedLiquidationOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation report",
                            currentStatus: selectedLiquidationReport.status,
                          })
                        }
                      >
                        Needs Revision
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={liquidationLockedAfterHardCopy}
                        onClick={() =>
                          openAdminConfirmation({
                            kind: "liquidation",
                            action: "overdue",
                            liquidationReportId: selectedLiquidationReport.id,
                            budgetRequestId: selectedLiquidationReport.budgetRequestId,
                            organizationId: selectedLiquidationReport.organizationId,
                            organizationName: selectedLiquidationOrganization?.organizationName ?? "Unknown organization",
                            activityTitle: selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation report",
                            currentStatus: selectedLiquidationReport.status,
                          })
                        }
                      >
                        Mark Overdue
                      </Button>
                    </ReviewActionToolbar>
                    {selectedLiquidationReport.remarks ? (
                      <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Latest Admin Feedback</p>
                        <p className="text-sm text-amber-900">{selectedLiquidationReport.remarks}</p>
                      </div>
                    ) : null}
                  </DetailSectionBlock>

                  <SectionDivider />

                  <DetailSectionBlock label="Attached Files">
                    <p className="text-sm text-muted-foreground">
                      {selectedLiquidationReportFiles.length
                        ? `${selectedLiquidationReportFiles.length} file${selectedLiquidationReportFiles.length === 1 ? "" : "s"} uploaded.`
                        : "No attached files were uploaded for this liquidation report."}
                    </p>
                    {selectedLiquidationReportFiles.length ? (
                      <div className="space-y-4">
                        <DetailFilePills
                          items={selectedLiquidationReportFiles.map((file) => ({ id: file.id, fileName: file.fileName }))}
                          selectedId={selectedLiquidationReportFile?.id}
                          onSelect={setSelectedLiquidationFileId}
                        />
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                          {liquidationPreviewLoading ? (
                            <div className="grid min-h-[65vh] place-items-center p-6 text-sm text-muted-foreground">Loading preview...</div>
                          ) : liquidationPreviewUrl && liquidationPreviewCanInline ? (
                            isImagePreviewFile(liquidationPreviewTitle) || isImagePreviewFile(liquidationPreviewUrl) ? (
                              <div className="flex min-h-[65vh] items-center justify-center overflow-hidden bg-background">
                                <img
                                  src={liquidationPreviewUrl}
                                  alt={liquidationPreviewTitle || "Liquidation file preview"}
                                  className="max-h-[72vh] w-full object-contain"
                                />
                              </div>
                            ) : (
                              <iframe
                                title={liquidationPreviewTitle || "Liquidation Preview"}
                                src={liquidationPreviewUrl}
                                className="h-[72vh] w-full border-0 bg-background"
                                loading="eager"
                              />
                            )
                          ) : liquidationPreviewUrl ? (
                            <div className="grid min-h-[65vh] place-items-center p-6 text-center text-sm text-muted-foreground">
                              <div className="space-y-3">
                                <p>This uploaded file cannot be shown inline. You can open it in a new tab if needed.</p>
                                <Button type="button" variant="outline" onClick={() => window.open(liquidationPreviewUrl, "_blank", "noopener,noreferrer")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open File
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid min-h-[65vh] place-items-center border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                              {liquidationPreviewEmptyMessage || "No liquidation file was uploaded."}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
                        No attached liquidation files were submitted.
                      </div>
                    )}
                  </DetailSectionBlock>
                </DetailInfoCard>
              </div>
            </div>
          );
        }
        return (
          <PortalSection title="Liquidation Reports" description="Review liquidation reports submitted after funded activities. Approve completed reports, request revisions, or flag overdue ones.">
            {visibleLiquidationReports.length ? (
              <div className="space-y-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Input
                    value={liquidationReportsSearch}
                    onChange={(event) => setLiquidationReportsSearch(event.target.value)}
                    placeholder="Search by organization, linked budget, or report ID"
                  />
                  <Select value={liquidationReportsStatusFilter} onValueChange={setLiquidationReportsStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      {liquidationReportStatusOptions.map((status) => (
                        <SelectItem key={status} value={status}>
                          {formatStatusLabel(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {filteredVisibleLiquidationReports.length ? (
                  <>
                    <div className="space-y-3 md:hidden">
                      {filteredVisibleLiquidationReports.map((record) => {
                        const linkedBudget = state.budgetRequests.find((item) => item.id === record.budgetRequestId) ?? null;
                        const liquidationOrg = state.organizationProfiles.find((item) => item.id === record.organizationId) ?? null;
                        const primaryFile =
                          [...state.liquidationReportFiles]
                            .filter((file) => file.liquidationReportId === record.id)
                            .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
                        const latestActivity = (record.revisionHistory ?? []).at(-1) ?? null;
                        return (
                          <Card key={record.id} className="border-border/70 shadow-sm">
                            <CardContent className="space-y-3 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0 space-y-1">
                                  <p className="font-semibold text-foreground">{liquidationOrg?.organizationName ?? "Unknown organization"}</p>
                                  <p className="text-xs text-primary">Report ID: {buildPublicRecordCode("LR", record, visibleLiquidationReports)}</p>
                                  <p className="text-xs text-muted-foreground">{linkedBudget?.activityTitle ?? "Liquidation item"}</p>
                                  <p className="text-xs text-muted-foreground">Created {formatShortDate(record.createdAt)}</p>
                                </div>
                                <PortalStatusBadge status={record.status} />
                              </div>

                              <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:grid-cols-2">
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Deadline</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(record.deadlineAt)}</p>
                                </div>
                                <div>
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Linked Budget</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{linkedBudget?.activityTitle ?? "No linked budget"}</p>
                                  <p className="text-xs text-muted-foreground">Go signal {formatShortDate(record.goSignalAt || linkedBudget?.goSignalAt)}</p>
                                </div>
                              </div>

                              <div className="space-y-2">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">File</p>
                                {primaryFile ? (
                                  <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background p-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                                      <FileText className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{primaryFile.fileName}</p>
                                      <p className="text-xs text-muted-foreground">{formatFileMetaLabel(primaryFile.fileType, primaryFile.fileSize)}</p>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">No file uploaded yet</p>
                                )}
                              </div>

                              <div className="space-y-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Recent Activity</p>
                                <p className="text-sm text-foreground">{latestActivity ? formatStatusLabel(latestActivity.action) : formatStatusLabel(record.status)}</p>
                                <p className="text-xs text-muted-foreground">{formatDateTimeLabel(latestActivity?.changedAt ?? record.updatedAt)}</p>
                                {latestActivity?.adminRemarks ? <p className="text-xs text-muted-foreground">{latestActivity.adminRemarks}</p> : null}
                              </div>

                              <div className="flex items-center justify-end gap-2">
                                <Button type="button" size="sm" variant="outline" onClick={() => openLiquidationDetails(record)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Review
                                </Button>
                                {primaryFile ? (
                                  <Button type="button" size="sm" onClick={() => void openFile(primaryFile.fileUrl, primaryFile.fileName)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Open File
                                  </Button>
                                ) : null}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/35 hover:bg-muted/35">
                      <TableHead className="min-w-[250px]">Report</TableHead>
                      <TableHead className="min-w-[160px]">Status</TableHead>
                      <TableHead className="min-w-[120px]">Deadline</TableHead>
                      <TableHead className="min-w-[220px]">Linked Budget</TableHead>
                      <TableHead className="min-w-[230px]">File</TableHead>
                      <TableHead className="min-w-[190px]">Recent Activity</TableHead>
                      <TableHead className="w-[70px] text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVisibleLiquidationReports.map((record) => {
                      const linkedBudget = state.budgetRequests.find((item) => item.id === record.budgetRequestId) ?? null;
                      const liquidationOrg = state.organizationProfiles.find((item) => item.id === record.organizationId) ?? null;
                      const primaryFile =
                        [...state.liquidationReportFiles]
                          .filter((file) => file.liquidationReportId === record.id)
                          .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
                      const latestActivity = (record.revisionHistory ?? []).at(-1) ?? null;
                      return (
                        <TableRow key={record.id} className="align-middle">
                          <TableCell className="align-middle">
                            <div className="space-y-1">
                              <p className="font-semibold text-foreground">{liquidationOrg?.organizationName ?? "Unknown organization"}</p>
                              <p className="text-xs text-muted-foreground">Report ID: {buildPublicRecordCode("LR", record, visibleLiquidationReports)}</p>
                              <p className="text-xs text-muted-foreground">{linkedBudget?.activityTitle ?? "Liquidation item"}</p>
                              <p className="text-xs text-muted-foreground">Created {formatShortDate(record.createdAt)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-middle">
                            <PortalStatusBadge status={record.status} />
                          </TableCell>
                          <TableCell className="align-middle text-sm text-foreground">{formatShortDate(record.deadlineAt)}</TableCell>
                          <TableCell className="align-middle">
                            <div className="space-y-1 text-sm">
                              <p className="font-medium text-foreground">{linkedBudget?.activityTitle ?? "No linked budget"}</p>
                              <p className="text-xs text-muted-foreground">Go signal {formatShortDate(record.goSignalAt || linkedBudget?.goSignalAt)}</p>
                            </div>
                          </TableCell>
                          <TableCell className="align-middle">
                            {primaryFile ? (
                              <div className="flex items-start gap-2">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{primaryFile.fileName}</p>
                                  <p className="text-xs text-muted-foreground">{formatFileMetaLabel(primaryFile.fileType, primaryFile.fileSize)}</p>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No file uploaded yet</p>
                            )}
                          </TableCell>
                          <TableCell className="align-middle">
                            <div className="space-y-1">
                              <p className="text-sm text-foreground">{latestActivity ? formatStatusLabel(latestActivity.action) : formatStatusLabel(record.status)}</p>
                              <p className="text-xs text-muted-foreground">{formatDateTimeLabel(latestActivity?.changedAt ?? record.updatedAt)}</p>
                              {latestActivity?.adminRemarks ? <p className="line-clamp-2 text-xs text-muted-foreground">{latestActivity.adminRemarks}</p> : null}
                            </div>
                          </TableCell>
                          <TableCell className="align-middle text-right">
                            <DropdownMenu modal={false}>
                              <DropdownMenuTrigger asChild>
                                <Button type="button" size="icon" variant="outline" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => openLiquidationDetails(record)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Review
                                </DropdownMenuItem>
                                {primaryFile ? (
                                  <DropdownMenuItem onClick={() => void openFile(primaryFile.fileUrl, primaryFile.fileName)}>
                                    <FileText className="mr-2 h-4 w-4" />
                                    Open File
                                  </DropdownMenuItem>
                                ) : null}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                  </div>
                  </>
                ) : (
                  <PortalEmptyState title="No matching liquidation reports" description="Try adjusting the search or status filter." />
                )}
              </div>
            ) : (
              <PortalEmptyState title="No liquidation records yet" description="Cash-released budgets create liquidation records automatically." />
            )}
          </PortalSection>
        );
      case "news-releases":
        return (
          <>
            <PortalSection
              title="News Releases"
              description="Create and publish announcements visible to all organizations on the portal's news feed."
              action={
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  onClick={() => {
                    setNewsModalMode("create");
                    setEditingNewsReleaseId(null);
                    setNewsTitleDraft("");
                    setNewsDescriptionDraft("");
                    setNewsFacebookPostUrlDraft("");
                    setNewsPreviewImageUrlDraft("");
                    setNewsDatePostedDraft(new Date().toISOString().slice(0, 10));
                    setNewsVisibilityDraft("draft");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add News Release
                </Button>
              }
            >
              {newsReleases.length ? (
                <div className="space-y-3">
                  <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <Input
                      value={newsSearch}
                      onChange={(event) => setNewsSearch(event.target.value)}
                      placeholder="Search by title, description, or Facebook link"
                    />
                    <Select value={newsVisibilityFilter} onValueChange={(value) => setNewsVisibilityFilter(value as "all" | NewsRelease["visibilityStatus"])}>
                      <SelectTrigger>
                        <SelectValue placeholder="All visibility" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Visibility</SelectItem>
                        <SelectItem value="published">Published</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                        <SelectItem value="hidden">Hidden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {filteredNewsReleases.length ? (
                    <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
                      {filteredNewsReleases.map((news) => {
                        const dotColor =
                          news.visibilityStatus === "published"
                            ? "bg-emerald-500"
                            : news.visibilityStatus === "hidden"
                            ? "bg-rose-500"
                            : "bg-amber-400";
                        const formattedDate = news.datePosted
                          ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(news.datePosted))
                          : "?";
                        return (
                          <Card key={news.id} className="flex flex-col border-border/70 shadow-sm">
                            <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2">
                                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                                  <p className="break-words font-semibold leading-snug text-foreground">{news.title}</p>
                                </div>
                                <div className="shrink-0">
                                  <PortalStatusBadge status={news.visibilityStatus} />
                                </div>
                              </div>
                              <p className="line-clamp-3 pl-4 text-sm leading-relaxed text-muted-foreground">{news.description}</p>
                              <div className="space-y-0.5 pl-4">
                                <p className="text-xs text-muted-foreground">Posted {formattedDate}</p>
                                {news.facebookPostUrl && (
                                  <p className="max-w-full break-all text-xs text-muted-foreground/70">{news.facebookPostUrl}</p>
                                )}
                                {news.previewImageUrl ? (
                                  <p className="max-w-full break-all text-xs text-muted-foreground/70">Preview image: {news.previewImageUrl}</p>
                                ) : null}
                              </div>
                              <div className="mt-auto flex flex-col gap-2 pt-1 sm:flex-row sm:items-center sm:justify-between">
                                <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => navigate(`/admin/news-releases/${news.id}`)}>
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  Preview
                                </Button>
                                <div className="flex items-center justify-end gap-1.5">
                                  {news.visibilityStatus === "published" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 sm:flex-none"
                                      onClick={() => openAdminConfirmation({ kind: "news_release", action: "hide", id: news.id, title: news.title })}
                                    >
                                      Hide
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="flex-1 sm:flex-none"
                                      onClick={() => openAdminConfirmation({ kind: "news_release", action: "publish", id: news.id, title: news.title })}
                                    >
                                      Publish
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">More actions</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                      <DropdownMenuItem onClick={() => startEditingNewsRelease(news.id)}>
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={() => void handleDeleteNewsRelease(news.id)}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <PortalEmptyState
                      title="No matching news releases"
                      description="Try adjusting the search or visibility filter."
                    />
                  )}
                </div>
              ) : (
                <PortalEmptyState
                  title="No news releases yet"
                  description="Create the first news release so both admin and users can preview the source post."
                />
              )}
            </PortalSection>
            <Dialog open={newsModalMode === "create" || newsModalMode === "edit"} onOpenChange={(open) => (!open ? resetNewsReleaseForm() : undefined)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{newsModalMode === "edit" ? "Edit News Release" : "Add News Release"}</DialogTitle>
                  <DialogDescription>
                    {newsModalMode === "edit"
                      ? "Update the public news release details and source post link."
                      : "Create a news release record that can be previewed on the public and admin sides."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="news-release-title" className="text-sm font-medium">Title</label>
                    <Input id="news-release-title" name="newsReleaseTitle" value={newsTitleDraft} onChange={(event) => setNewsTitleDraft(event.target.value)} placeholder="Enter news release title" />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="news-release-description" className="text-sm font-medium">Description</label>
                    <Textarea
                      id="news-release-description"
                      name="newsReleaseDescription"
                      value={newsDescriptionDraft}
                      onChange={(event) => setNewsDescriptionDraft(event.target.value)}
                      placeholder="Write the summary shown in the preview page."
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="news-release-facebook-url" className="text-sm font-medium">Facebook Post URL</label>
                    <Input
                      id="news-release-facebook-url"
                      name="newsReleaseFacebookPostUrl"
                      value={newsFacebookPostUrlDraft}
                      onChange={(event) => setNewsFacebookPostUrlDraft(event.target.value)}
                      placeholder="https://facebook.com/..."
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="news-release-preview-image-url" className="text-sm font-medium">Thumbnail Image URL</label>
                    <Input
                      id="news-release-preview-image-url"
                      name="newsReleasePreviewImageUrl"
                      value={newsPreviewImageUrlDraft}
                      onChange={(event) => setNewsPreviewImageUrlDraft(event.target.value)}
                      placeholder="https://.../thumbnail.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional. This image will be used as the thumbnail shown on the organization-side News Releases cards.
                    </p>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label htmlFor="news-release-date-posted" className="text-sm font-medium">Date Posted</label>
                      <Input
                        id="news-release-date-posted"
                        name="newsReleaseDatePosted"
                        type="date"
                        value={newsDatePostedDraft}
                        onChange={(event) => setNewsDatePostedDraft(event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="news-release-visibility" className="text-sm font-medium">Visibility</label>
                      <select
                        id="news-release-visibility"
                        name="newsReleaseVisibility"
                        className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={newsVisibilityDraft}
                        onChange={(event) => setNewsVisibilityDraft(event.target.value as NewsRelease["visibilityStatus"])}
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="hidden">Hidden</option>
                      </select>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetNewsReleaseForm}>
                    Cancel
                  </Button>
                  <Button type="button" className="w-full sm:w-auto" onClick={() => void handleSaveNewsRelease()} disabled={savingNewsRelease}>
                    <Save className="mr-2 h-4 w-4" />
                    {savingNewsRelease ? "Saving..." : newsModalMode === "edit" ? "Save Changes" : "Create News Release"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        );
      case "budget-monitoring":
      case "public-transparency-posts":
        return (
          <Tabs
            value={budgetMonitoringTab}
            onValueChange={(value) => setBudgetMonitoringTab(value as typeof budgetMonitoringTab)}
            className="space-y-5"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Budget Monitoring</h1>
                  <p className="text-sm text-muted-foreground">
                    Track approved budgets, utilization, and liquidation progress.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!budgetRequestExportRows.length}
                    onClick={() => setActiveReportExport("budget-requests")}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                  <Button type="button" onClick={() => navigate("/admin/budget-utilization")}>
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Review Budget Requests
                  </Button>
                </div>
              </div>

              <TabsList className="h-auto w-full justify-start gap-6 rounded-none border-b border-border bg-transparent p-0">
                <TabsTrigger
                  value="overview"
                  className="relative h-auto rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-sm font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Monitoring Overview
                </TabsTrigger>
                <TabsTrigger
                  value="barangay-allocation"
                  className="relative h-auto rounded-none border-b-2 border-transparent bg-transparent px-0 pb-3 pt-0 text-sm font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none"
                >
                  Allocation by Barangay
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-0">
              <div className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {[
                    {
                      label: "Released Budgets",
                      value: budgetMonitoringEntries.length.toLocaleString(),
                      helper: "Budget requests already released.",
                      icon: ClipboardList,
                      iconClasses: "bg-primary/10 text-primary",
                    },
                    {
                      label: "Released Amount",
                      value: `PHP ${budgetMonitoringAnalysis.totalReleased.toLocaleString()}`,
                      helper: "Total amount already released.",
                      icon: Banknote,
                      iconClasses: "bg-emerald-500/10 text-emerald-700",
                    },
                    {
                      label: "Remaining Amount",
                      value: `PHP ${budgetMonitoringAnalysis.totalRemaining.toLocaleString()}`,
                      helper: "Approved amount still unreleased.",
                      icon: Wallet,
                      iconClasses: "bg-violet-500/10 text-violet-700",
                    },
                    {
                      label: "Utilization Rate",
                      value: `${budgetMonitoringAnalysis.utilizationRate}%`,
                      helper: "Released share of approved funds.",
                      icon: CheckCircle2,
                      iconClasses: "bg-amber-400/15 text-amber-700",
                    },
                  ].map((metric) => {
                    const MetricIcon = metric.icon;
                    return (
                      <Card key={metric.label} className="border-border/70 shadow-sm">
                        <CardContent className="flex min-h-[136px] items-start gap-4 p-4">
                          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${metric.iconClasses}`}>
                            <MetricIcon className="h-5 w-5" />
                          </div>
                          <div className="space-y-1.5">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">{metric.label}</p>
                            <p className="text-3xl font-semibold tracking-tight text-foreground">{metric.value}</p>
                            <p className="text-sm text-muted-foreground">{metric.helper}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
                  <Card className="border-border/70 shadow-sm">
                    <CardContent className="space-y-5 p-4 sm:p-5">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Budget Health Snapshot</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {budgetMonitoringEntries.length} cash-released budget{budgetMonitoringEntries.length === 1 ? "" : "s"} under monitoring.
                        </p>
                      </div>

                      {budgetMonitoringStatusRows.some((row) => row.count > 0) ? (
                        <div className="grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-center">
                          <div className="relative mx-auto h-56 w-full max-w-[250px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={budgetMonitoringStatusRows}
                                  dataKey="count"
                                  nameKey="riskLabel"
                                  innerRadius={70}
                                  outerRadius={98}
                                  strokeWidth={0}
                                  paddingAngle={2}
                                >
                                  {budgetMonitoringStatusRows.map((row) => (
                                    <Cell key={row.riskLabel} fill={row.chartColor} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                              <p className="text-3xl font-semibold tracking-tight text-foreground">{budgetMonitoringEntries.length}</p>
                              <p className="text-sm text-muted-foreground">Total Budgets</p>
                            </div>
                          </div>

                          <div className="space-y-4">
                            {budgetMonitoringStatusRows.map((row) => (
                              <div key={row.riskLabel} className="space-y-2">
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className={`h-2.5 w-2.5 rounded-full ${row.dotClass}`} />
                                    <p className="text-sm font-medium text-foreground">{row.riskLabel}</p>
                                  </div>
                                  <div className="text-right text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{row.count}</span> ({row.percentage}%)
                                  </div>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                  <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${row.percentage}%` }} />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="grid min-h-[240px] place-items-center rounded-xl border border-dashed border-border/70 bg-muted/10 text-sm text-muted-foreground">
                          No cash-released budgets yet.
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    {budgetMonitoringAnalysis.insights.length ? (
                      <Card className="border-border/70 shadow-sm">
                        <CardContent className="space-y-4 p-4 sm:p-5">
                          <div>
                            <h2 className="text-lg font-semibold text-foreground">Analysis Notes</h2>
                            <p className="mt-1 text-sm text-muted-foreground">Existing monitoring insights based on the current budget data.</p>
                          </div>
                          <ul className="space-y-2.5">
                            {budgetMonitoringAnalysis.insights.map((insight) => (
                              <li key={insight} className="flex items-start gap-3 rounded-xl bg-muted/10 px-3.5 py-3 text-sm text-foreground">
                                <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                  <ClipboardList className="h-3 w-3" />
                                </span>
                                <span>{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>
                </div>

                {budgetMonitoringEntries.length ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                      <Input
                        value={budgetMonitoringSearch}
                        onChange={(event) => setBudgetMonitoringSearch(event.target.value)}
                        placeholder="Search by request title, organization, or request ID"
                      />
                      <Select value={budgetMonitoringRiskFilter} onValueChange={setBudgetMonitoringRiskFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All risk levels" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Risk Levels</SelectItem>
                          <SelectItem value="On Track">On Track</SelectItem>
                          <SelectItem value="Needs Attention">Needs Attention</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                          <SelectItem value="Completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {filteredBudgetMonitoringEntries.length ? (
                      <>
                      <div className="space-y-3 md:hidden">
                        {filteredBudgetMonitoringEntries.map((entry) => {
                          const linkedRequest = state.budgetRequests.find((request) => request.id === entry.budgetRequestId) ?? null;
                          const riskClasses =
                            entry.riskLabel === "Overdue"
                              ? "bg-destructive/15 text-destructive"
                              : entry.riskLabel === "Completed"
                              ? "bg-emerald-500/15 text-emerald-700"
                              : entry.riskLabel === "On Track"
                              ? "bg-primary/15 text-primary"
                              : "bg-amber-400/15 text-amber-700";
                          return (
                            <Card key={entry.budgetRequestId} className="border-border/70 shadow-sm">
                              <CardContent className="space-y-3 p-4">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 space-y-1">
                                    <p className="font-semibold text-foreground">{entry.title}</p>
                                    <p className="text-xs text-primary">Request ID: {buildPublicRecordCode("BR", linkedRequest, state.budgetRequests)}</p>
                                    <p className="text-xs text-muted-foreground">{entry.organizationName}</p>
                                  </div>
                                  <div className="flex flex-col items-end gap-1">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskClasses}`}>{entry.riskLabel}</span>
                                    <PortalStatusBadge status={entry.budgetStatus} />
                                  </div>
                                </div>

                                <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:grid-cols-2">
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">PHP {entry.approvedAmount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Released</p>
                                    <p className="mt-1 text-sm font-medium text-emerald-700">PHP {entry.releasedAmount.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(entry.goSignalAt)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Deadline</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(entry.deadlineAt)}</p>
                                  </div>
                                </div>

                                <div className="space-y-2 rounded-xl border border-border/50 bg-muted/10 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Progress</p>
                                    <p className="text-sm font-medium text-foreground">{entry.utilizationRate}%</p>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }} />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formatStatusLabel(entry.liquidationStatus)} · Hard copy {formatShortDate(entry.hardCopySubmittedAt)} · Completed {formatShortDate(entry.completedAt)}
                                  </p>
                                </div>

                                <div className="flex items-center justify-end gap-2">
                                  <Button type="button" size="sm" variant="outline" onClick={() => openBudgetRequestDetails(entry.budgetRequestId)}>
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Budget Review
                                  </Button>
                                  {entry.liquidationReportId ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      onClick={() => {
                                        const report = state.liquidationReports.find((item) => item.id === entry.liquidationReportId);
                                        if (report) openLiquidationDetails(report);
                                      }}
                                    >
                                      <Eye className="mr-2 h-4 w-4" />
                                      Liquidation
                                    </Button>
                                  ) : null}
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                      <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm md:block">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/35 hover:bg-muted/35">
                            <TableHead className="min-w-[240px]">Request</TableHead>
                            <TableHead className="min-w-[170px]">Risk & Status</TableHead>
                            <TableHead className="min-w-[190px]">Amounts (PHP)</TableHead>
                            <TableHead className="min-w-[170px]">Timeline</TableHead>
                            <TableHead className="min-w-[160px]">Liquidation</TableHead>
                            <TableHead className="min-w-[120px]">Progress</TableHead>
                            <TableHead className="w-[70px] text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredBudgetMonitoringEntries.map((entry) => {
                            const linkedRequest = state.budgetRequests.find((request) => request.id === entry.budgetRequestId) ?? null;
                            const riskClasses =
                              entry.riskLabel === "Overdue"
                                ? "bg-destructive/15 text-destructive"
                                : entry.riskLabel === "Completed"
                                ? "bg-emerald-500/15 text-emerald-700"
                                : entry.riskLabel === "On Track"
                                ? "bg-primary/15 text-primary"
                                : "bg-amber-400/15 text-amber-700";
                            return (
                              <TableRow key={entry.budgetRequestId}>
                                <TableCell className="align-top">
                                  <div className="space-y-1">
                                    <p className="font-semibold text-foreground">{entry.title}</p>
                                    <p className="text-xs text-muted-foreground">Request ID: {buildPublicRecordCode("BR", linkedRequest, state.budgetRequests)}</p>
                                    <p className="text-xs text-muted-foreground">{entry.organizationName}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-1">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskClasses}`}>{entry.riskLabel}</span>
                                    <PortalStatusBadge status={entry.budgetStatus} />
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-1 text-sm">
                                    <p className="text-muted-foreground">Approved</p>
                                    <p className="font-medium text-foreground">PHP {entry.approvedAmount.toLocaleString()}</p>
                                    <p className="text-muted-foreground">Released</p>
                                    <p className="font-medium text-emerald-700">PHP {entry.releasedAmount.toLocaleString()}</p>
                                    <p className="text-xs text-muted-foreground">Remaining PHP {entry.remainingAmount.toLocaleString()}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-1 text-sm">
                                    <p className="text-muted-foreground">Go signal</p>
                                    <p className="font-medium text-foreground">{formatShortDate(entry.goSignalAt)}</p>
                                    <p className="text-muted-foreground">Deadline</p>
                                    <p className="font-medium text-foreground">{formatShortDate(entry.deadlineAt)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-1 text-sm">
                                    <p className="font-medium text-foreground">{formatStatusLabel(entry.liquidationStatus)}</p>
                                    <p className="text-xs text-muted-foreground">Hard copy {formatShortDate(entry.hardCopySubmittedAt)}</p>
                                    <p className="text-xs text-muted-foreground">Completed {formatShortDate(entry.completedAt)}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">{entry.utilizationRate}%</p>
                                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                                      <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }} />
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell className="align-top text-right">
                                  <DropdownMenu modal={false}>
                                    <DropdownMenuTrigger asChild>
                                      <Button type="button" size="icon" variant="outline" className="h-8 w-8">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem onClick={() => openBudgetRequestDetails(entry.budgetRequestId)}>
                                        <ClipboardList className="mr-2 h-4 w-4" />
                                        Open Budget Review
                                      </DropdownMenuItem>
                                      {entry.liquidationReportId ? (
                                        <DropdownMenuItem
                                          onClick={() => {
                                            const report = state.liquidationReports.find((item) => item.id === entry.liquidationReportId);
                                            if (report) openLiquidationDetails(report);
                                          }}
                                        >
                                          <Eye className="mr-2 h-4 w-4" />
                                          Open Liquidation
                                        </DropdownMenuItem>
                                      ) : null}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                      </div>
                      </>
                    ) : (
                      <PortalEmptyState title="No matching monitored budgets" description="Try adjusting the search or risk filter." />
                    )}
                  </div>
                ) : (
                  <PortalEmptyState
                    title="No approved budgets yet"
                    description="Approved budget requests automatically appear here once the budget review marks them green."
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="barangay-allocation" className="mt-0">
              {selectedBudgetAllocation ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBudgetAllocation(null)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Barangay Allocation
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!allocationByBarangayExportRows.length}
                      onClick={() => setActiveReportExport("allocation-by-barangay")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </Button>
                  </div>

                  <PortalSection
                    title={selectedBudgetAllocation.barangay}
                    description={`${selectedBudgetAllocation.district} · ${selectedBudgetAllocation.organizationCount} organization${selectedBudgetAllocation.organizationCount === 1 ? "" : "s"} · ${selectedBudgetAllocation.releasedBudgetCount} released budget${selectedBudgetAllocation.releasedBudgetCount === 1 ? "" : "s"}`}
                  >
                  </PortalSection>

                  {selectedBudgetAllocationOrganizationDetails.length ? (
                    <div className="space-y-3">
                      {selectedBudgetAllocationOrganizationDetails.map((detail) => (
                        <Card key={detail.organizationId} className="border-border/70 shadow-sm">
                          <CardContent className="p-4 sm:p-5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">{detail.district}</p>
                                <p className="mt-0.5 font-semibold text-foreground">{detail.organizationName}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground">{detail.barangay}</p>
                              </div>
                              <span className="shrink-0 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                                {detail.releasedBudgetCount} released budget{detail.releasedBudgetCount === 1 ? "" : "s"}
                              </span>
                            </div>

                            <div className="mt-4 divide-y divide-border/40 border-t border-border/40 pt-4">
                              <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0">
                                <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                                <p className="text-sm font-medium">PHP {detail.approvedAmount.toLocaleString()}</p>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5">
                                <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Released</p>
                                <p className="text-sm font-medium">PHP {detail.releasedAmount.toLocaleString()}</p>
                              </div>
                              <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 last:pb-0">
                                <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Remaining</p>
                                <p className="text-sm font-medium">PHP {detail.remainingAmount.toLocaleString()}</p>
                              </div>
                            </div>

                            <div className="mt-4">
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground/75">
                                <span className="uppercase tracking-[0.14em]">Utilization Rate</span>
                                <span>{detail.utilizationRate}%</span>
                              </div>
                              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                                <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(detail.utilizationRate, 100)}%` }} />
                              </div>
                            </div>

                            {detail.requests.length ? (
                              <div className="mt-4">
                                <p className="mb-2 text-sm font-medium text-foreground">Released Requests</p>
                                <div className="space-y-3">
                                  <div className="space-y-3 md:hidden">
                                    {detail.requests.map((request) => (
                                      <div key={request.id} className="rounded-xl border border-border/70 bg-background p-3">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0 space-y-1">
                                            <p className="text-sm font-semibold text-foreground">{request.activityTitle}</p>
                                            <p className="text-xs text-primary">{buildPublicRecordCode("BR", request, detail.requests)}</p>
                                          </div>
                                          <PortalStatusBadge status={request.status} />
                                        </div>
                                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                                            <p className="mt-1 text-sm font-medium">PHP {request.approvedAmount.toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Released</p>
                                            <p className="mt-1 text-sm font-medium">PHP {request.releasedAmount.toLocaleString()}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                            <p className="mt-1 text-sm font-medium">{request.goSignalAt ? formatShortDate(request.goSignalAt) : "Pending"}</p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Hard Copy</p>
                                            <p className="mt-1 text-sm font-medium">{request.hardCopySubmittedAt ? formatShortDate(request.hardCopySubmittedAt) : "Pending"}</p>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
                                  <div className="overflow-x-auto">
                                    <Table>
                                      <TableHeader>
                                        <TableRow className="bg-muted/20">
                                          <TableHead className="min-w-[220px]">Request</TableHead>
                                          <TableHead className="min-w-[150px]">Status</TableHead>
                                          <TableHead className="min-w-[120px]">Approved</TableHead>
                                          <TableHead className="min-w-[120px]">Released</TableHead>
                                          <TableHead className="min-w-[130px]">Go Signal</TableHead>
                                          <TableHead className="min-w-[130px]">Hard Copy</TableHead>
                                        </TableRow>
                                      </TableHeader>
                                      <TableBody>
                                        {detail.requests.map((request) => (
                                          <TableRow key={request.id}>
                                            <TableCell>
                                              <div className="space-y-1">
                                                <p className="text-sm font-semibold text-foreground">{request.activityTitle}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {buildPublicRecordCode("BR", request, detail.requests)}
                                                </p>
                                              </div>
                                            </TableCell>
                                            <TableCell>
                                              <PortalStatusBadge status={request.status} />
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                              PHP {request.approvedAmount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm font-medium">
                                              PHP {request.releasedAmount.toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                              {request.goSignalAt ? formatShortDate(request.goSignalAt) : "Pending"}
                                            </TableCell>
                                            <TableCell className="text-sm">
                                              {request.hardCopySubmittedAt ? formatShortDate(request.hardCopySubmittedAt) : "Pending"}
                                            </TableCell>
                                          </TableRow>
                                        ))}
                                      </TableBody>
                                    </Table>
                                </div>
                                  </div>
                                </div>
                              </div>
                            ) : null}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <PortalEmptyState
                      title="No released organization details"
                      description="This barangay currently has no released budget requests to display."
                    />
                  )}
                </div>
              ) : (
                <PortalSection
                  title="Allocation by Barangay"
                  description="Released budgets broken down by the organizations' registered barangay."
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!allocationByBarangayExportRows.length}
                      onClick={() => setActiveReportExport("allocation-by-barangay")}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Filtered Report
                    </Button>
                  }
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">District</p>
                      <Select
                        value={budgetAllocationDistrictFilter}
                        onValueChange={(value) => {
                          setBudgetAllocationDistrictFilter(value);
                          setBudgetAllocationBarangayFilter("all");
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All districts" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Districts</SelectItem>
                          {budgetAllocationDistrictOptions.map((district) => (
                            <SelectItem key={district} value={district}>
                              {district}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Barangay</p>
                      <Select value={budgetAllocationBarangayFilter} onValueChange={setBudgetAllocationBarangayFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All barangays" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Barangays</SelectItem>
                          {budgetAllocationBarangayOptions.map((barangay) => (
                            <SelectItem key={barangay} value={barangay}>
                              {barangay}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
                    <PortalMetricCard
                      label="Active Barangays"
                      value={budgetAllocationSummary.barangayCount.toLocaleString()}
                      helper="Barangays with released budgets"
                      icon={MapPin}
                      iconTone="primary"
                    />
                    <PortalMetricCard
                      label="Released"
                      value={`PHP ${budgetAllocationSummary.totalReleased.toLocaleString()}`}
                      helper="Total cash released"
                      icon={Banknote}
                      iconTone="emerald"
                    />
                    <PortalMetricCard
                      label="Approved"
                      value={`PHP ${budgetAllocationSummary.totalApproved.toLocaleString()}`}
                      helper="Budget ceiling before release"
                      icon={Wallet}
                      iconTone="amber"
                    />
                    <PortalMetricCard
                      label="Remaining"
                      value={`PHP ${budgetAllocationSummary.totalRemaining.toLocaleString()}`}
                      helper="Not yet released"
                      icon={AlertTriangle}
                      iconTone="red"
                    />
                    <PortalMetricCard
                      label="Utilization Rate"
                      value={`${budgetAllocationSummary.utilizationRate}%`}
                      helper="Released vs. approved"
                      icon={CheckCircle2}
                      iconTone="violet"
                      className="sm:col-span-3 lg:col-span-1"
                    />
                  </div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-border/70 bg-background">
                    {filteredBudgetAllocationRows.length ? (
                      <>
                        <div className="hidden border-b border-border/70 bg-muted/30 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70 lg:grid lg:grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_auto] lg:items-center lg:gap-6">
                          <span>Barangay</span>
                          <span className="text-right">Approved</span>
                          <span className="text-right">Released</span>
                          <span className="text-right">Remaining</span>
                          <span className="text-right">Utilization</span>
                          <span className="text-right">Action</span>
                        </div>
                        <div className="divide-y divide-border/70">
                          {filteredBudgetAllocationRows.map((entry) => (
                            <button
                              key={`${entry.district}-${entry.barangay}`}
                              type="button"
                              onClick={() => setSelectedBudgetAllocation(entry)}
                              className="grid w-full gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none lg:grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_auto] lg:items-center lg:gap-6"
                            >
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground/70">{entry.district}</p>
                                <div className="mt-0.5 flex flex-wrap items-center gap-2">
                                  <p className="font-semibold text-foreground">{entry.barangay}</p>
                                  <span className="rounded-full border border-primary/20 bg-primary/8 px-2.5 py-0.5 text-xs font-medium text-primary">
                                    {entry.organizationCount} org{entry.organizationCount === 1 ? "" : "s"}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between lg:block lg:text-right">
                                <p className="text-xs text-muted-foreground lg:hidden">Approved</p>
                                <p className="text-sm font-medium text-foreground">PHP {entry.approvedAmount.toLocaleString()}</p>
                              </div>
                              <div className="flex items-center justify-between lg:block lg:text-right">
                                <p className="text-xs text-muted-foreground lg:hidden">Released</p>
                                <p className="text-sm font-medium text-foreground">PHP {entry.releasedAmount.toLocaleString()}</p>
                              </div>
                              <div className="flex items-center justify-between lg:block lg:text-right">
                                <p className="text-xs text-muted-foreground lg:hidden">Remaining</p>
                                <p className="text-sm font-medium text-foreground">PHP {entry.remainingAmount.toLocaleString()}</p>
                              </div>
                              <div className="flex items-center justify-between gap-4 lg:block lg:text-right">
                                <p className="text-xs text-muted-foreground lg:hidden">Utilization</p>
                                <div className="min-w-0 flex-1 lg:flex-none">
                                  <p className="text-sm font-semibold text-foreground">{entry.utilizationRate}%</p>
                                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center justify-end border-t border-border/60 pt-3 lg:border-t-0 lg:pt-0">
                                <Eye className="h-4 w-4 text-primary" />
                              </div>
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="p-6">
                        <PortalEmptyState
                          title="No barangay allocations found"
                          description="Try another district or barangay filter. Only released budgets are included in this allocation view."
                        />
                      </div>
                    )}
                  </div>
                </PortalSection>
              )}
            </TabsContent>
          </Tabs>
        );
      case "templates":
        return (
          <PortalSection
            title="Template Management"
            description="Manage downloadable templates for document submissions, MOVE, and other user-side reference files."
            action={
              <Button
                type="button"
                className="w-full sm:w-auto"
                onClick={() => {
                  setTemplateModalMode("create");
                  setEditingTemplateId(null);
                  setTemplateNameDraft("");
                  setTemplateDescriptionDraft("");
                  setTemplateScopeDraft("document_submission");
                  setTemplateFileDraft(null);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Template
              </Button>
            }
          >
            {activeTemplates.length === 0 ? (
              <PortalEmptyState
                title="No templates yet"
                description="Upload a template file and assign where it should appear in the user portal."
              />
            ) : (
              <div className="space-y-6">
                {[
                  {
                    key: "document_submission" as const,
                    title: "Document Submissions",
                    description: "These templates appear inside the user document submissions page.",
                    items: templateDocuments,
                  },
                  {
                    key: "move" as const,
                    title: "MOVE Template",
                    description: "These templates appear inside the user MOVE page.",
                    items: moveTemplates,
                  },
                  {
                    key: "other" as const,
                    title: "Other Templates",
                    description: "These templates appear in the user Templates page for download and reference.",
                    items: otherTemplates,
                  },
                ].map((group) => (
                  <div key={group.key} className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-base font-semibold text-foreground">{group.title}</h3>
                      <p className="text-sm text-muted-foreground">{group.description}</p>
                    </div>
                    {group.items.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-6 text-sm text-muted-foreground">
                        No templates added for this section yet.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/35 hover:bg-muted/35">
                              <TableHead className="min-w-[260px]">Template</TableHead>
                              <TableHead className="min-w-[300px]">Description</TableHead>
                              <TableHead className="min-w-[220px]">File</TableHead>
                              <TableHead className="min-w-[150px]">Updated</TableHead>
                              <TableHead className="w-[70px] text-right">Action</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.items.map((template) => {
                              const hasFile = Boolean(template.templateFileName);
                              const uploadedDate = template.templateUploadedAt
                                ? new Intl.DateTimeFormat("en-PH", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  }).format(new Date(template.templateUploadedAt))
                                : null;
                              return (
                                <TableRow key={template.id}>
                                  <TableCell className="align-top">
                                    <div className="flex items-start gap-2.5">
                                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${hasFile ? "bg-emerald-500" : "bg-amber-400"}`} />
                                      <div className="space-y-1">
                                        <p className="font-semibold leading-snug text-foreground">{template.name}</p>
                                        <p className="text-xs text-muted-foreground">{templateScopeLabelMap[template.templateScope]}</p>
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <p className="text-sm leading-relaxed text-muted-foreground">{template.description || "No description provided."}</p>
                                  </TableCell>
                                  <TableCell className="align-top">
                                    {hasFile ? (
                                      <div className="space-y-1">
                                        <div className="flex items-center gap-1.5">
                                        <FileText className="h-3.5 w-3.5 shrink-0 text-red-500/80" />
                                          <p className="break-all text-sm text-foreground">{template.templateFileName}</p>
                                        </div>
                                        <p className="text-xs text-muted-foreground">Ready for preview and download</p>
                                      </div>
                                    ) : (
                                      <p className="text-sm text-muted-foreground">No file uploaded yet</p>
                                    )}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    <p className="text-sm text-foreground">{uploadedDate ?? "Not uploaded"}</p>
                                  </TableCell>
                                  <TableCell className="align-top text-right">
                                    <div className="flex items-center justify-end gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled={!template.templateFileUrl}
                                        onClick={() => void openPreview(template.templateFileUrl, template.templateFileName || template.name)}
                                      >
                                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                                        Preview
                                      </Button>
                                      <DropdownMenu modal={false}>
                                        <DropdownMenuTrigger asChild>
                                          <Button size="icon" variant="ghost" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                            <span className="sr-only">More actions</span>
                                          </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-36">
                                          <DropdownMenuItem onClick={() => startEditingTemplate(template.id)}>
                                            <Pencil className="mr-2 h-4 w-4" />
                                            Edit
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                          <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={() => {
                                              setEditingTemplateId(template.id);
                                              setTemplateModalMode("delete");
                                            }}
                                          >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Delete
                                          </DropdownMenuItem>
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            <Dialog open={templateModalMode === "create" || templateModalMode === "edit"} onOpenChange={(open) => (!open ? resetTemplateForm() : undefined)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{templateModalMode === "edit" ? "Edit Template" : "Add Template"}</DialogTitle>
                  <DialogDescription>
                    {templateModalMode === "edit"
                      ? "Update the template details, category, and uploaded file if needed."
                      : "Create a new template record, assign where it should appear, then upload the file users will access."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="template-document-scope" className="text-sm font-medium">Template Section</label>
                    <Select value={templateScopeDraft} onValueChange={(value) => setTemplateScopeDraft(value as "document_submission" | "move" | "other")}>
                      <SelectTrigger id="template-document-scope">
                        <SelectValue placeholder="Select where this template should appear" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document_submission">Document Submissions</SelectItem>
                        <SelectItem value="move">MOVE Template</SelectItem>
                        <SelectItem value="other">Other Templates</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="template-document-name" className="text-sm font-medium">Document Name</label>
                    <Input
                      id="template-document-name"
                      name="templateDocumentName"
                      value={templateNameDraft}
                      onChange={(event) => setTemplateNameDraft(event.target.value)}
                      placeholder="Enter document name"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="template-document-description" className="text-sm font-medium">Document Description</label>
                    <Textarea
                      id="template-document-description"
                      name="templateDocumentDescription"
                      value={templateDescriptionDraft}
                      onChange={(event) => setTemplateDescriptionDraft(event.target.value)}
                      placeholder="Explain what the organization should upload for this document."
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="template-document-file" className="text-sm font-medium">
                      {templateModalMode === "edit" ? "Replace Template File" : "Upload Template File"}
                    </label>
                    <Input
                      id="template-document-file"
                      name="templateDocumentFile"
                      type="file"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(event) => setTemplateFileDraft(event.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      {templateModalMode === "edit"
                        ? "Leave this empty if you only want to update the title or description."
                        : "Upload a Word, PDF, XLS, or XLSX template file here so organization users can view and download it."}
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetTemplateForm}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    onClick={() => void (templateModalMode === "edit" ? handleUpdateTemplate() : handleCreateTemplate())}
                    disabled={savingTemplate || uploadingTemplateId !== null}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {savingTemplate || uploadingTemplateId !== null
                      ? "Saving..."
                      : templateModalMode === "edit"
                        ? "Save Changes"
                        : "Create Template"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog open={templateModalMode === "delete"} onOpenChange={(open) => (!open ? resetTemplateForm() : undefined)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Delete Template</DialogTitle>
                  <DialogDescription>
                    {selectedTemplate
                      ? `Are you sure you want to delete ${selectedTemplate.name}?`
                      : "Are you sure you want to delete this template?"}
                  </DialogDescription>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                  This removes the template from the active user-side template list.
                </p>
                <DialogFooter>
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={resetTemplateForm}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="w-full sm:w-auto"
                    onClick={() => void (editingTemplateId ? handleDeleteTemplate(editingTemplateId) : Promise.resolve())}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Template
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <Dialog
              open={previewModalOpen}
              onOpenChange={(open) => {
                setPreviewModalOpen(open);
                if (!open) {
                  setPreviewUrl("");
                  setPreviewTitle("");
                  setPreviewEmptyMessage("");
                  setPreviewCanInline(false);
                }
              }}
            >
              <DialogContent className="h-[100dvh] max-w-none overflow-hidden rounded-none border-0 p-0 sm:h-auto sm:max-w-5xl sm:rounded-xl sm:border">
                <div className="flex h-full flex-col sm:h-auto sm:max-h-[90vh]">
                  <div className="border-b border-border/70 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
                    <DialogHeader>
                      <DialogTitle className="max-w-[calc(100vw-5rem)] break-words text-lg leading-tight sm:max-w-none sm:text-xl">
                        {previewTitle || "File Preview"}
                      </DialogTitle>
                      <DialogDescription className="text-sm">
                        Preview the uploaded file here.
                      </DialogDescription>
                    </DialogHeader>
                  </div>
                  <div className="flex-1 overflow-hidden p-4 sm:p-6">
                    <div className="h-[calc(100dvh-11rem)] overflow-hidden rounded-md border border-border/70 bg-muted/20 sm:h-[70vh]">
                      {previewUrl && previewCanInline ? (
                        <iframe
                          src={previewUrl}
                          title={previewTitle || "File preview"}
                          className="h-full w-full"
                        />
                      ) : previewUrl ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                          <div className="space-y-2">
                            <p className="text-base font-medium text-foreground">Preview not available in the browser</p>
                            <p className="max-w-md text-sm text-muted-foreground">
                              This file type cannot be shown inline. Open or download the file to review it in a compatible app.
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:flex-row">
                            <Button type="button" variant="outline" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                              <Eye className="mr-2 h-4 w-4" />
                              Open File
                            </Button>
                            <Button type="button" onClick={() => void openFile(previewUrl, previewTitle || "uploaded-file")}>
                              <Download className="mr-2 h-4 w-4" />
                              Download File
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid h-full place-items-center p-6 text-center text-sm text-muted-foreground">
                          {previewEmptyMessage || "No file uploaded yet."}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </PortalSection>
        );
      case "notifications":
        return (
          <PortalSection
            title="Notifications"
            description="Recent activity and updates."
            action={
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <Button size="sm" variant="ghost" onClick={() => markAllNotificationsRead()}>
                    Mark all as read
                  </Button>
                )}
                <BadgePanel count={unread} />
              </div>
            }
          >
            {adminNotifications.length ? (
              <div className="space-y-2">
                {adminNotifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    className={`w-full rounded-xl border p-4 text-left text-sm transition-colors hover:bg-muted/40 ${notification.isRead ? "border-border/50 bg-background" : "border-border/70 bg-background"}`}
                    onClick={() => markNotificationRead(notification.id)}
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.isRead ? "bg-muted-foreground/30" : "bg-primary"}`} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`leading-snug ${notification.isRead ? "font-normal text-muted-foreground" : "font-medium text-foreground"}`}>
                            {notification.title}
                          </p>
                          <span className="shrink-0 text-xs text-muted-foreground/60">
                            {new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric" }).format(new Date(notification.createdAt))}
                          </span>
                        </div>
                        <p className="mt-0.5 text-muted-foreground">{notification.message}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <PortalEmptyState title="No notifications" description="You're all caught up." />
            )}
          </PortalSection>
        );
      case "activity-logs": {
        const activityMeta: Record<string, { label: string; iconColor: string; bgColor: string }> = {
          verify_organization_profile: { label: "Organization Verified",  iconColor: "text-emerald-600", bgColor: "bg-emerald-500/10" },
          release_budget:              { label: "Budget Released",         iconColor: "text-blue-600",    bgColor: "bg-blue-500/10"    },
          approve_document_submission: { label: "Document Approved",       iconColor: "text-violet-600",  bgColor: "bg-violet-500/10"  },
          create_news_release:         { label: "News Release Published",  iconColor: "text-amber-600",   bgColor: "bg-amber-500/10"   },
          reject_budget_request:       { label: "Budget Request Rejected", iconColor: "text-rose-600",    bgColor: "bg-rose-500/10"    },
          review_liquidation_report:   { label: "Liquidation Reviewed",    iconColor: "text-slate-500",   bgColor: "bg-slate-500/10"   },
        };
        const activityIconMap: Record<string, typeof CheckCircle2> = {
          verify_organization_profile: CheckCircle2,
          release_budget:              Banknote,
          approve_document_submission: FileText,
          create_news_release:         Pencil,
          reject_budget_request:       AlertTriangle,
          review_liquidation_report:   ClipboardList,
        };
        const relatedTypeLabel: Record<string, string> = {
          organization_profile: "Organization",
          budget_request:       "Budget",
          document_submission:  "Document",
          news_release:         "News Release",
          liquidation_report:   "Liquidation",
        };
        const filterTypes = ["all", "organization_profile", "budget_request", "document_submission", "news_release", "liquidation_report"];
        const now = Date.now();
        const dateFilterDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
        const filteredLogs = state.activityLogs
          .filter((l) => activityLogFilter === "all" || l.relatedType === activityLogFilter)
          .filter((l) => {
            if (activityDateFilter === "all") return true;
            const days = dateFilterDays[activityDateFilter] ?? 0;
            return new Date(l.createdAt).getTime() >= now - days * 24 * 60 * 60 * 1000;
          });
        const ACTIVITY_PAGE_SIZE = 20;
        const totalActivityPages = Math.max(1, Math.ceil(filteredLogs.length / ACTIVITY_PAGE_SIZE));
        const pagedLogs = filteredLogs.slice(activityPage * ACTIVITY_PAGE_SIZE, (activityPage + 1) * ACTIVITY_PAGE_SIZE);
        return (
          <PortalSection title="Recent Activity" description="Audit trail of admin-side edits and review actions.">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {filterTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => { setActivityLogFilter(type); setActivityPage(0); }}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      activityLogFilter === type
                        ? "bg-foreground text-background"
                        : "border border-border/60 bg-muted/60 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {type === "all" ? "All" : (relatedTypeLabel[type] ?? type)}
                  </button>
                ))}
              </div>
              <select
                value={activityDateFilter}
                onChange={(e) => { setActivityDateFilter(e.target.value as "all" | "7d" | "30d" | "90d"); setActivityPage(0); }}
                className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground focus:outline-none"
              >
                <option value="all">All time</option>
                <option value="90d">Last 90 days</option>
                <option value="30d">Last 30 days</option>
                <option value="7d">Last 7 days</option>
              </select>
            </div>
            {filteredLogs.length ? (
              <div className="overflow-hidden rounded-xl border border-border/70">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-44 text-xs">Date & Time</TableHead>
                      <TableHead className="w-56 text-xs">Action</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="w-36 text-xs">Category</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pagedLogs.map((activity) => {
                      const meta = activityMeta[activity.action] ?? { label: activity.action, iconColor: "text-muted-foreground", bgColor: "bg-muted/60" };
                      const Icon = activityIconMap[activity.action] ?? ClipboardList;
                      const formattedDate = new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(activity.createdAt));
                      return (
                        <TableRow key={activity.id}>
                          <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{formattedDate}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${meta.bgColor}`}>
                                <Icon className={`h-3 w-3 ${meta.iconColor}`} />
                              </div>
                              <span className="text-sm font-medium text-foreground">{meta.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            <p className="line-clamp-2">{activity.description}</p>
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full border border-border/60 bg-muted/60 px-2 py-0.5 text-xs text-muted-foreground">
                              {relatedTypeLabel[activity.relatedType] ?? activity.relatedType}
                            </span>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <PortalEmptyState title="No activity found" description="No logs match the selected filter." />
            )}
            {filteredLogs.length > ACTIVITY_PAGE_SIZE && (
              <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Showing {activityPage * ACTIVITY_PAGE_SIZE + 1}–{Math.min((activityPage + 1) * ACTIVITY_PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
                </span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" disabled={activityPage === 0} onClick={() => setActivityPage((p) => p - 1)}>
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" disabled={activityPage >= totalActivityPages - 1} onClick={() => setActivityPage((p) => p + 1)}>
                    Next
                  </Button>
                </div>
              </div>
            )}
          </PortalSection>
        );
      }
      case "ypop-validation": {
        // ── VIEW 4: entry-review (two-column layout) ──────────────────────────
        if (ypopAdminView === "entry-review" && selectedYpopId) {
          const entry = state.ypopEntries.find((e) => e.id === selectedYpopId);
          if (!entry) {
            setSelectedYpopId(null);
            setYpopAdminView("period-detail");
            return null;
          }
          const entryOrg = state.organizationProfiles.find((o) => o.id === entry.organizationId);
          const entryFiles = state.ypopFiles.filter((f) => f.ypopEntryId === entry.id);
          const semesterActivities = state.ypopCityActivities.filter((a) => a.semesterKey === entry.semester);
          const semesterActivityIds = new Set(semesterActivities.map((activity) => activity.id));
          const orgEventParticipations = [...state.ypopEventParticipations]
            .filter((participation) => participation.organizationId === entry.organizationId && semesterActivityIds.has(participation.activityId))
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const eventFilesByParticipationId = new Map<string, YPOPEventFile[]>();
          state.ypopEventFiles.forEach((file) => {
            const existing = eventFilesByParticipationId.get(file.participationId) ?? [];
            existing.push(file);
            eventFilesByParticipationId.set(file.participationId, existing);
          });
          const orgActivities = [...state.ypopOrgActivities]
            .filter((activity) => activity.ypopEntryId === entry.id)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const orgActivityFilesByActivityId = new Map<string, YPOPOrgActivityFile[]>();
          state.ypopOrgActivityFiles.forEach((file) => {
            const existing = orgActivityFilesByActivityId.get(file.orgActivityId) ?? [];
            existing.push(file);
            orgActivityFilesByActivityId.set(file.orgActivityId, existing);
          });
          const entryPeriod = state.ypopPeriods.find((p) => p.semesterKey === entry.semester);
          const periodTiers = entryPeriod?.orgLedTiers?.length ? entryPeriod.orgLedTiers : DEFAULT_ORG_LED_TIERS;
          const isTerminal = entry.status === "qualified" || entry.status === "not_qualified";
          const verifiedCityLedAttendance = semesterActivities.map((activity) => ({
            activityId: activity.id,
            attended: orgEventParticipations.some(
              (participation) => participation.activityId === activity.id && participation.status === "verified",
            ),
          }));
          const approvedOrgActivityCount = getApprovedYpopOrgActivityCount(orgActivities, entry.id, entry.orgLedProjectCount ?? 0);
          const form = ypopValidationForm ?? {
            cityLedAttendance: verifiedCityLedAttendance,
            orgLedProjectCount: approvedOrgActivityCount,
            status: (entry.status === "draft" || entry.status === "submitted") ? "under_review" as YPOPStatus : entry.status,
            adminRemarks: entry.adminRemarks ?? "",
          };
          const effectiveCityLedAttendance = verifiedCityLedAttendance;
          const { cityLedEarned, cityLedMax, cityLedPercent, cityLedWeightedScore, orgLedBonus, totalScore } = computeYpopScore(
            effectiveCityLedAttendance, semesterActivities, form.orgLedProjectCount, periodTiers
          );
          const _sortedTiers = [...periodTiers].sort((a, b) => b.minProjects - a.minProjects);
          const _matchedTier = _sortedTiers.find((t) => form.orgLedProjectCount >= t.minProjects);
          const orgLedTierLabel = _matchedTier
            ? `≥ ${_matchedTier.minProjects} projects → +${_matchedTier.bonus}% bonus`
            : "0 projects → +0% bonus";
          const qualifies = totalScore >= (entry.pointsRequired ?? YPOP_SCORE_THRESHOLD);
          const orgLedTierLabelDisplay = orgLedTierLabel && (_matchedTier
            ? `>= ${_matchedTier.minProjects} activit${_matchedTier.minProjects === 1 ? "y" : "ies"} -> +${_matchedTier.bonus}% bonus`
            : "0 activities -> +0% bonus");
          const persistYpopValidation = async () => {
            setSavingYpopValidation(true);
            try {
              const now = new Date().toISOString();
              const semActs = state.ypopCityActivities.filter((a) => a.semesterKey === entry.semester);
              const { totalScore: computedScore } = computeYpopScore(effectiveCityLedAttendance, semActs, form.orgLedProjectCount, periodTiers);
              const patch = {
                pointsEarned: computedScore,
                status: form.status,
                adminRemarks: form.adminRemarks,
                orgLedProjectCount: form.orgLedProjectCount,
                cityLedAttendance: effectiveCityLedAttendance,
                validatedAt: now,
                updatedAt: now,
                revisionHistory: [
                  ...(entry.revisionHistory ?? []),
                  { action: form.status, adminRemarks: form.adminRemarks, changedAt: now },
                ],
              };
              try {
                const saved = await adminUpdateYpopEntryInSupabase(entry.id, patch);
                updateYPOPEntry(saved.id, saved);
              } catch {
                updateYPOPEntry(entry.id, patch);
              }
              toast({ title: "Validation saved", description: `${entryOrg?.organizationName ?? "Org"}'s YPOP entry updated to ${statusLabelMap[form.status] ?? form.status}.` });
              setConfirmYpopValidationOpen(false);
              setYpopValidationAcknowledged(false);
              setSelectedYpopId(null);
              setYpopValidationForm(null);
              setYpopPreviewFileId(null);
              setYpopAdminView("period-detail");
            } finally {
              setSavingYpopValidation(false);
            }
          };

          return (
            <div className="space-y-5">
              {/* Header bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedYpopId(null); setYpopValidationForm(null); setYpopPreviewFileId(null); setYpopAdminView("period-detail"); }}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Period
                </button>
                <div className="flex items-center gap-2">
                  <PortalStatusBadge status={entry.status} />
                  {isTerminal && (
                    <span className="flex items-center gap-1 rounded-lg border border-border/60 bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                      Finalized — locked
                    </span>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-lg font-semibold">{entryOrg?.organizationName ?? "Unknown org"}</h2>
                <p className="text-sm text-muted-foreground">{entry.semesterLabel}</p>
              </div>

              {/* Two-column layout */}
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* LEFT: Validation */}
                <div className="space-y-4">
                  {entry.submissionNote.trim() && (
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Org's Submission Note</p>
                      <p className="text-sm">{entry.submissionNote}</p>
                    </div>
                  )}

                  <Card className="border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Validation</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5 pt-0">
                      {/* City-Led Activities checklist */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium">City-Led Activities</p>
                          {semesterActivities.length > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {cityLedEarned} / {cityLedMax} pts ({cityLedPercent}%)
                              </span>
                          )}
                        </div>
                        {semesterActivities.length === 0 ? (
                          <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                            No city-led activities configured. Edit the semester to add activities.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {semesterActivities.map((act: YPOPCityActivity) => {
                              const checked = effectiveCityLedAttendance.find((a) => a.activityId === act.id)?.attended ?? false;
                              return (
                                <div
                                  key={act.id}
                                  className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                    isTerminal ? "opacity-70" : ""
                                  } ${checked ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled
                                    readOnly
                                    className="mt-0.5 shrink-0 accent-primary"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium leading-snug">{act.name}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{act.date} · {act.venue}</p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {normalizeYpopCityLedPoints(act.points, act.category)} pts
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Organization-initiated */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Organization-Initiated Activities</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-sm font-semibold tabular-nums">
                            {approvedOrgActivityCount} approved activit{approvedOrgActivityCount === 1 ? "y" : "ies"}
                          </div>
                          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                            {orgLedTierLabelDisplay}
                          </div>
                        </div>
                        {orgActivities.length === 0 ? (
                          <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                            No organization-initiated activity logs were submitted for this semester yet.
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {orgActivities.map((activity) => {
                              const files = orgActivityFilesByActivityId.get(activity.id) ?? [];
                              return (
                                <div key={activity.id} className="rounded-lg border border-border/60 bg-background p-3">
                                  <div className="flex flex-wrap items-start justify-between gap-2">
                                    <div className="min-w-0">
                                      <p className="text-sm font-semibold leading-snug">{activity.activityName}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {activity.activityDate || "Date TBD"}{activity.venue ? ` • ${activity.venue}` : ""}
                                      </p>
                                    </div>
                                    <PortalStatusBadge status={activity.status} />
                                  </div>
                                  <div className="mt-3 rounded-md border border-border/50 bg-muted/20 p-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Narrative Report</p>
                                    <p className="text-sm whitespace-pre-wrap">{activity.narrativeReport}</p>
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Attached Files ({files.length})</p>
                                    {files.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No proof files uploaded yet.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {files.map((file) => (
                                          <div key={file.id} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2">
                                            <span className="min-w-0 truncate text-sm">{file.fileName}</span>
                                            <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file.fileUrl, file.fileName)}>
                                              Open
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-3 space-y-2">
                                    <label className="text-sm font-medium">PPA Remarks</label>
                                    <Textarea
                                      value={ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks}
                                      onChange={(event) => setYpopEventReviewRemarksById((current) => ({ ...current, [activity.id]: event.target.value }))}
                                      rows={3}
                                      className="resize-none text-sm"
                                      placeholder="Feedback for this organization-initiated activity…"
                                      disabled={isTerminal}
                                    />
                                  </div>
                                  {!isTerminal && (
                                    <div className="mt-3 flex flex-wrap justify-end gap-2">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          openAdminConfirmation({
                                            kind: "ypop_org_activity",
                                            action: "needs_revision",
                                            orgActivityId: activity.id,
                                            entryId: entry.id,
                                            organizationId: activity.organizationId,
                                            organizationName: entryOrg?.organizationName ?? "Organization",
                                            activityName: activity.activityName,
                                            currentAdminRemarks: ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks,
                                          })
                                        }
                                      >
                                        Needs Revision
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() =>
                                          openAdminConfirmation({
                                            kind: "ypop_org_activity",
                                            action: "rejected",
                                            orgActivityId: activity.id,
                                            entryId: entry.id,
                                            organizationId: activity.organizationId,
                                            organizationName: entryOrg?.organizationName ?? "Organization",
                                            activityName: activity.activityName,
                                            currentAdminRemarks: ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks,
                                          })
                                        }
                                      >
                                        Rejected
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() =>
                                          openAdminConfirmation({
                                            kind: "ypop_org_activity",
                                            action: "approved",
                                            orgActivityId: activity.id,
                                            entryId: entry.id,
                                            organizationId: activity.organizationId,
                                            organizationName: entryOrg?.organizationName ?? "Organization",
                                            activityName: activity.activityName,
                                            currentAdminRemarks: ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks,
                                          })
                                        }
                                      >
                                        Approve PPA
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Score */}
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold">Computed Score</p>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-muted-foreground hover:text-foreground"
                              onClick={() => setYpopScoringHelpOpen(true)}
                              aria-label="View YPOP scoring guide"
                            >
                              <CircleHelp className="h-4 w-4" />
                            </Button>
                          </div>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${qualifies ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {qualifies ? "Qualifies ✓" : "Does Not Qualify"}
                          </span>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-2xl font-bold tabular-nums">{totalScore}</span>
                          <span className="mb-0.5 text-sm text-muted-foreground">%</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full transition-all ${totalScore >= YPOP_SCORE_THRESHOLD ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${Math.min(totalScore, 100)}%` }} />
                          <div className="absolute top-0 h-full w-px bg-foreground/30" style={{ left: `${YPOP_SCORE_THRESHOLD}%` }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0</span><span className="font-medium">{YPOP_SCORE_THRESHOLD}% threshold</span><span>{YPOP_BASE_TOTAL_POINTS}%+</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-md border border-border/50 bg-background py-1.5">
                            <p className="font-semibold">{cityLedWeightedScore}%</p>
                            <p className="text-muted-foreground">City-Led score</p>
                          </div>
                          <div className="rounded-md border border-border/50 bg-background py-1.5">
                            <p className="font-semibold">+{orgLedBonus}%</p>
                            <p className="text-muted-foreground">Org-initiated bonus</p>
                          </div>
                          <div className="rounded-md border border-border/50 bg-background py-1.5">
                            <p className="font-semibold">{totalScore}%</p>
                            <p className="text-muted-foreground">Total</p>
                          </div>
                        </div>
                      </div>

                      {/* Outcome + Remarks */}
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="ypop-status">Outcome</label>
                          <Select value={form.status} onValueChange={(v) => setYpopValidationForm({ ...form, status: v as YPOPStatus })} disabled={isTerminal || savingYpopValidation}>
                            <SelectTrigger id="ypop-status"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="under_review">Under Review</SelectItem>
                              <SelectItem value="needs_revision">Needs Revision</SelectItem>
                              <SelectItem value="qualified">Qualified ✓</SelectItem>
                              <SelectItem value="not_qualified">Not Qualified</SelectItem>
                            </SelectContent>
                          </Select>
                          {!isTerminal && <p className="text-xs text-muted-foreground">Auto-suggested based on computed score.</p>}
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium" htmlFor="ypop-remarks">Admin Remarks <span className="font-normal text-muted-foreground">(optional)</span></label>
                          <Textarea
                            id="ypop-remarks"
                            value={form.adminRemarks}
                            onChange={(e) => setYpopValidationForm({ ...form, adminRemarks: e.target.value })}
                            placeholder="Feedback for the organization…"
                            rows={3}
                            className="resize-none text-sm"
                            disabled={isTerminal || savingYpopValidation}
                          />
                        </div>
                      </div>

                      {!isTerminal && (
                        <Button
                          type="button"
                          className="w-full"
                          disabled={savingYpopValidation}
                          onClick={() => {
                            setYpopValidationAcknowledged(false);
                            setConfirmYpopValidationOpen(true);
                          }}
                        >
                          {savingYpopValidation ? "Saving…" : "Save Validation"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                </div>

                {/* RIGHT: Proof Documents + History */}
                <div className="space-y-3">
                  <Card className="border-border/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Proof Documents ({orgEventParticipations.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {orgEventParticipations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No joined YPOP events for this organization in the selected semester yet.</p>
                      ) : (
                        <Accordion type="multiple" className="w-full rounded-xl border border-border/60">
                          {orgEventParticipations.map((participation) => {
                            const files = eventFilesByParticipationId.get(participation.id) ?? [];
                            const remarksDraft = ypopEventReviewRemarksById[participation.id] ?? participation.adminRemarks;
                            const isSaving = processingAdminConfirmation && pendingAdminConfirmation?.kind === "ypop_event" && pendingAdminConfirmation.participationId === participation.id;

                            return (
                              <AccordionItem key={participation.id} value={participation.id} className="border-border/60 px-4">
                                <AccordionTrigger className="gap-3 py-4 text-left hover:no-underline">
                                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold text-foreground">{participation.activityName}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {participation.activityDate || "Date TBD"}{participation.venue ? ` • ${participation.venue}` : ""}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {participation.proofSubmittedAt
                                          ? `Proof submitted ${new Date(participation.proofSubmittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`
                                          : "No proof submitted yet"}
                                      </p>
                                    </div>
                                    <div className="shrink-0">
                                      <PortalStatusBadge status={participation.status} />
                                    </div>
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pb-4">
                                  {participation.status === "verified" && participation.verifiedAt ? (
                                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                                      <p className="text-sm font-semibold">Verified</p>
                                      <p className="text-xs">{new Date(participation.verifiedAt).toLocaleDateString("en-US")}</p>
                                    </div>
                                  ) : null}

                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Files ({files.length})</p>
                                    {files.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">No proof files uploaded yet.</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {files.map((file) => (
                                          <div key={file.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2">
                                            <span className="truncate text-sm">{file.fileName}</span>
                                            <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file.fileUrl, file.fileName)}>
                                              Open
                                            </Button>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">Event Remarks</label>
                                    <Textarea
                                      value={remarksDraft}
                                      onChange={(event) => setYpopEventReviewRemarksById((current) => ({ ...current, [participation.id]: event.target.value }))}
                                      rows={3}
                                      className="resize-none text-sm"
                                      placeholder="Feedback for this event proof…"
                                    />
                                  </div>

                                  <div className="flex flex-wrap justify-end gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={isSaving}
                                      onClick={() =>
                                        openAdminConfirmation({
                                          kind: "ypop_event",
                                          action: "needs_revision",
                                          participationId: participation.id,
                                          entryId: entry.id,
                                          activityId: participation.activityId,
                                          organizationId: participation.organizationId,
                                          organizationName: entryOrg?.organizationName ?? "Organization",
                                          activityName: participation.activityName,
                                          currentAdminRemarks: remarksDraft,
                                        })
                                      }
                                    >
                                      Needs Revision
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      disabled={isSaving}
                                      onClick={() =>
                                        openAdminConfirmation({
                                          kind: "ypop_event",
                                          action: "rejected",
                                          participationId: participation.id,
                                          entryId: entry.id,
                                          activityId: participation.activityId,
                                          organizationId: participation.organizationId,
                                          organizationName: entryOrg?.organizationName ?? "Organization",
                                          activityName: participation.activityName,
                                          currentAdminRemarks: remarksDraft,
                                        })
                                      }
                                    >
                                      Rejected
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      disabled={isSaving}
                                      onClick={() =>
                                        openAdminConfirmation({
                                          kind: "ypop_event",
                                          action: "verified",
                                          participationId: participation.id,
                                          entryId: entry.id,
                                          activityId: participation.activityId,
                                          organizationId: participation.organizationId,
                                          organizationName: entryOrg?.organizationName ?? "Organization",
                                          activityName: participation.activityName,
                                          currentAdminRemarks: remarksDraft,
                                        })
                                      }
                                    >
                                      {isSaving ? "Saving..." : "Verified"}
                                    </Button>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      )}
                    </CardContent>
                  </Card>

                  {entryFiles.length > 0 && (
                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-semibold">General Submission Files ({entryFiles.length})</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <div className="flex flex-wrap gap-2">
                          {entryFiles.map((f: YPOPFile) => (
                            <Button
                              key={f.id}
                              type="button"
                              size="sm"
                              variant={ypopPreviewFileId === f.id ? "default" : "outline"}
                              className="max-w-full"
                              onClick={() => setYpopPreviewFileId(ypopPreviewFileId === f.id ? null : f.id)}
                            >
                              <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                              <span className="max-w-[12rem] truncate">{f.fileName}</span>
                            </Button>
                          ))}
                        </div>

                        <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/10">
                          {ypopPreviewFileId === null ? (
                            <div className="flex min-h-[20rem] items-center justify-center p-4 text-sm text-muted-foreground">
                              Select a file above to preview it here.
                            </div>
                          ) : ypopPreviewLoading ? (
                            <div className="flex min-h-[6rem] items-center justify-center p-4 text-sm text-muted-foreground">
                              Loading preview…
                            </div>
                          ) : ypopPreviewUrl && ypopPreviewCanInline ? (
                            isImagePreviewFile(ypopPreviewTitle) || isImagePreviewFile(ypopPreviewUrl) ? (
                              <div className="flex max-h-[32rem] items-center justify-center overflow-hidden bg-background sm:max-h-[40rem]">
                                <img src={ypopPreviewUrl} alt={ypopPreviewTitle || "YPOP proof"} className="max-h-[32rem] w-full object-contain sm:max-h-[40rem]" />
                              </div>
                            ) : (
                              <iframe
                                title={ypopPreviewTitle || "YPOP Proof Preview"}
                                src={ypopPreviewUrl}
                                className="h-[32rem] w-full border-0 bg-background sm:h-[40rem]"
                                loading="eager"
                              />
                            )
                          ) : ypopPreviewUrl ? (
                            <div className="flex flex-col items-start gap-3 p-4 text-sm text-muted-foreground">
                              <p>This file cannot be previewed inline.</p>
                              <Button type="button" variant="outline" size="sm" onClick={() => window.open(ypopPreviewUrl, "_blank", "noopener,noreferrer")}>
                                <Eye className="mr-2 h-4 w-4" />Open File
                              </Button>
                            </div>
                          ) : (
                            <div className="flex min-h-[6rem] items-center justify-center p-4 text-center text-sm text-muted-foreground">
                              No preview available — file URL not set in this demo.
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(entry.revisionHistory?.length ?? 0) > 0 && (
                    <Card className="border-border/70">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Review Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        {entry.revisionHistory!.map((rev, i) => {
                          const dotColor =
                            rev.action === "qualified" ? "bg-emerald-500"
                            : rev.action === "not_qualified" ? "bg-rose-500"
                            : rev.action === "needs_revision" ? "bg-amber-400"
                            : "bg-muted-foreground/40";
                          return (
                            <div key={i} className="flex items-start gap-3 text-sm">
                              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${dotColor}`} />
                              <div>
                                <p className="font-medium capitalize">{rev.action.replace(/_/g, " ")}</p>
                                <p className="text-xs text-muted-foreground">
                                  {formatDateTimeLabel(rev.changedAt)}
                                </p>
                                {rev.adminRemarks && (
                                  <p className="mt-0.5 text-xs italic text-muted-foreground/80">"{rev.adminRemarks}"</p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>

              <Dialog open={ypopScoringHelpOpen} onOpenChange={setYpopScoringHelpOpen}>
                <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>YPOP Scoring Breakdown</DialogTitle>
                    <DialogDescription>
                      City-led score uses verified proof records only. Total possible points are based on the sum of available city-led activity categories for the semester: Mandatory = 4, Invitational = 3, Partnership = 2. Approved organization-initiated activities then add bonus percentage points.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="overflow-x-auto rounded-xl border border-border/70">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Points Earned</TableHead>
                            <TableHead>Total Possible Points</TableHead>
                            <TableHead>Percentage (%)</TableHead>
                            <TableHead>Weighted Points</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow>
                            <TableCell>City-Led Activities</TableCell>
                            <TableCell>{cityLedEarned}</TableCell>
                            <TableCell>{cityLedMax}</TableCell>
                            <TableCell>{cityLedEarned} ÷ {cityLedMax || 0} × 100 = {cityLedPercent}%</TableCell>
                            <TableCell>{cityLedPercent}% of total</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Organization-Initiated Activities</TableCell>
                            <TableCell>{approvedOrgActivityCount} approved</TableCell>
                            <TableCell>Bonus tier basis</TableCell>
                            <TableCell>Based on approved PPA count</TableCell>
                            <TableCell>+{orgLedBonus}% bonus</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold">Total YPOP Points</TableCell>
                            <TableCell colSpan={3} className="font-medium">City-led percentage + organization-initiated bonus</TableCell>
                            <TableCell className="font-semibold">{totalScore}%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Example: if the semester has one Mandatory, one Invitational, and one Partnership activity, the total possible city-led points are 9. If the organization verifies the Mandatory and Partnership activities only, the city-led score is 6 ÷ 9 × 100 = 66.67%, rounded to 67%.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <AlertDialog
                open={confirmYpopValidationOpen}
                onOpenChange={(open) => {
                  setConfirmYpopValidationOpen(open);
                  if (!open) {
                    setYpopValidationAcknowledged(false);
                  }
                }}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Validation Save</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will save the YPOP validation using the currently verified city-led proofs and approved organization-initiated activities.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <label htmlFor="ypop-validation-acknowledged" className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
                    <input
                      id="ypop-validation-acknowledged"
                      type="checkbox"
                      checked={ypopValidationAcknowledged}
                      onChange={(event) => setYpopValidationAcknowledged(event.target.checked)}
                      className="mt-0.5 h-4 w-4 rounded border-border text-primary"
                    />
                    <span>I acknowledge that the validated YPOP result is based on the records shown on this page.</span>
                  </label>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={savingYpopValidation}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={(event) => {
                        event.preventDefault();
                        void persistYpopValidation();
                      }}
                      disabled={!ypopValidationAcknowledged || savingYpopValidation}
                    >
                      {savingYpopValidation ? "Saving…" : "Save Validation"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          );
        }

        // ── VIEW 3: period-detail (submissions only) ──────────────────────────
        if (ypopAdminView === "period-detail" && selectedYpopPeriodId) {
          const period = state.ypopPeriods.find((p) => p.id === selectedYpopPeriodId) as YPOPPeriod | undefined;
          if (!period) {
            setSelectedYpopPeriodId(null);
            setYpopAdminView("periods");
            return null;
          }
          const periodActivities = state.ypopCityActivities.filter((a) => a.semesterKey === period.semesterKey);
          const totalCityLedPts = periodActivities.reduce((s, a) => s + normalizeYpopCityLedPoints(a.points, a.category), 0);
          const periodActivityIds = new Set(periodActivities.map((activity) => activity.id));
          const periodParticipations = state.ypopEventParticipations.filter((participation) => periodActivityIds.has(participation.activityId));
          const participationCountByOrgId = new Map<string, number>();
          periodParticipations.forEach((participation) => {
            participationCountByOrgId.set(participation.organizationId, (participationCountByOrgId.get(participation.organizationId) ?? 0) + 1);
          });
          const periodEntries = [...state.ypopEntries]
            .filter((e) => e.semester === period.semesterKey)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const supplementalEntries = [...participationCountByOrgId.keys()]
            .filter((organizationId) => !periodEntries.some((entry) => entry.organizationId === organizationId))
            .map((organizationId) => ({
              id: `virtual-${period.semesterKey}-${organizationId}`,
              organizationId,
              semester: period.semesterKey,
              semesterLabel: period.semesterLabel,
              pointsEarned: 0,
              pointsRequired: 70,
              totalPoints: 100,
              status: "draft" as YPOPStatus,
              adminRemarks: "",
              submissionNote: "",
              validationDeadline: period.validationDeadline,
              submittedAt: "",
              validatedAt: "",
              revisionHistory: [],
              orgLedProjectCount: 0,
              cityLedAttendance: [],
              createdAt: period.createdAt,
              updatedAt: period.updatedAt,
              _isVirtual: true,
            }));
          const combinedPeriodEntries = [...periodEntries, ...supplementalEntries].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const filteredPeriodEntries =
            ypopSubmissionFilter === "all"
              ? combinedPeriodEntries
              : combinedPeriodEntries.filter((e) => e.status === ypopSubmissionFilter);
          const statusBadgeClass =
            period.status === "open" ? "bg-emerald-100 text-emerald-700"
            : period.status === "draft" ? "bg-muted text-muted-foreground"
            : "bg-secondary text-secondary-foreground";

          return (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => { setSelectedYpopPeriodId(null); setYpopAdminView("periods"); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to YPOP Semesters
              </button>

              <PortalSection
                title={period.semesterLabel}
                description={`Deadline: ${new Date(period.validationDeadline).toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })} · ${periodActivities.length} activit${periodActivities.length !== 1 ? "ies" : "y"} · ${totalCityLedPts} pts total`}
                action={
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
                    {period.status === "open" ? "Open" : period.status === "draft" ? "Draft" : "Closed"}
                  </span>
                }
              >
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold">Organization Submissions <span className="font-normal text-muted-foreground">({combinedPeriodEntries.length})</span></p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {(["all", "submitted", "under_review", "needs_revision", "qualified", "not_qualified"] as const).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setYpopSubmissionFilter(f)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          ypopSubmissionFilter === f
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                        }`}
                      >
                        {f === "all" ? "All" : (statusLabelMap[f] ?? f)}
                      </button>
                    ))}
                  </div>

                  {filteredPeriodEntries.length === 0 ? (
                    <PortalEmptyState
                      title="No submissions"
                      description={ypopSubmissionFilter === "all" ? "No organizations have active YPOP records for this semester yet." : "No submissions match this filter."}
                    />
                  ) : (
                    <div className="space-y-3">
                      {filteredPeriodEntries.map((entry) => {
                        const isVirtualEntry = "_isVirtual" in entry;
                        const entryOrg = state.organizationProfiles.find((o) => o.id === entry.organizationId);
                        const entryFiles = state.ypopFiles.filter((f) => f.ypopEntryId === entry.id);
                        const joinedEventCount = participationCountByOrgId.get(entry.organizationId) ?? 0;
                        const isTerminal = entry.status === "qualified" || entry.status === "not_qualified";
                        const statusDotColor =
                          entry.status === "qualified" ? "bg-emerald-500"
                          : entry.status === "not_qualified" ? "bg-rose-500"
                          : entry.status === "submitted" || entry.status === "under_review" ? "bg-amber-400"
                          : "bg-muted-foreground/40";
                        return (
                          <Card key={entry.id} className="border-border/70 shadow-sm">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotColor}`} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-1.5">
                                      <Medal className="h-3.5 w-3.5 shrink-0 text-primary" />
                                      <p className="font-semibold text-foreground">{entryOrg?.organizationName ?? "Unknown organization"}</p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                                      {isTerminal ? `${entry.pointsEarned}%` : "Awaiting validation"}
                                      {" · "}{joinedEventCount} joined event{joinedEventCount !== 1 ? "s" : ""}
                                      {" · "}{entryFiles.length} general file{entryFiles.length !== 1 ? "s" : ""}
                                    </p>
                                    {isVirtualEntry && (
                                      <p className="mt-1 text-[11px] text-muted-foreground">Draft review record generated from joined YPOP events.</p>
                                    )}
                                  </div>
                                </div>
                                <PortalStatusBadge status={isVirtualEntry ? "draft" : entry.status} />
                              </div>
                              <div className="mt-4 flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isTerminal ? "outline" : "default"}
                                  onClick={() => {
                                    const semActs = state.ypopCityActivities.filter((a) => a.semesterKey === entry.semester);
                                    const reviewEntry = isVirtualEntry
                                      ? {
                                          id: `ypop-${Date.now()}`,
                                          organizationId: entry.organizationId,
                                          submittedBy: "",
                                          semester: entry.semester,
                                          semesterLabel: entry.semesterLabel,
                                          pointsEarned: 0,
                                          pointsRequired: 70,
                                          totalPoints: 100,
                                          status: "draft" as const,
                                          adminRemarks: "",
                                          submissionNote: "",
                                          validationDeadline: entry.validationDeadline,
                                          submittedAt: "",
                                          validatedAt: "",
                                          revisionHistory: [],
                                          orgLedProjectCount: 0,
                                          cityLedAttendance: [],
                                          createdAt: new Date().toISOString(),
                                          updatedAt: new Date().toISOString(),
                                        }
                                      : entry;
                                    if (isVirtualEntry) {
                                      createYPOPEntry(reviewEntry);
                                    }
                                    setSelectedYpopId(reviewEntry.id);
                                    setYpopPreviewFileId(null);
                                    setYpopValidationForm({
                                      cityLedAttendance: reviewEntry.cityLedAttendance?.length
                                        ? reviewEntry.cityLedAttendance
                                        : semActs.map((a) => ({ activityId: a.id, attended: false })),
                                      orgLedProjectCount: reviewEntry.orgLedProjectCount ?? 0,
                                      status: (reviewEntry.status === "draft" || reviewEntry.status === "submitted") ? "under_review" : reviewEntry.status,
                                      adminRemarks: reviewEntry.adminRemarks ?? "",
                                    });
                                    setYpopAdminView("entry-review");
                                  }}
                                >
                                  {isTerminal ? "View" : "Review"}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </div>
              </PortalSection>
            </div>
          );
        }

        // ── VIEW 2: create / edit semester ────────────────────────────────────
        if (ypopAdminView === "create-period") {
          const isEditMode = Boolean(editingPeriodId);
          const editPeriod = isEditMode ? (state.ypopPeriods.find((p) => p.id === editingPeriodId) as YPOPPeriod | undefined) : undefined;
          const editActivities = isEditMode && editPeriod
            ? state.ypopCityActivities.filter((a) => a.semesterKey === editPeriod.semesterKey)
            : [];

          const generatedSemesterLabel = isEditMode
            ? (editPeriod?.semesterLabel ?? createPeriodForm.semesterLabel)
            : deriveSemesterLabelFromDate();
          const generatedSemesterKey = isEditMode
            ? (editPeriod?.semesterKey ?? "")
            : buildSemesterKeyFromNow(state.ypopPeriods);
          const canSubmit = generatedSemesterLabel.trim().length > 0 && createPeriodForm.validationDeadline.length > 0;

          const resetForm = () => {
            setCreatePeriodForm({ semesterLabel: deriveSemesterLabelFromDate(), validationDeadline: "", status: "draft" });
            setCreatePeriodActivities([]);
            setCreateFormNewActivity(null);
            setCreatePeriodOrgLedTiers(DEFAULT_ORG_LED_TIERS);
            setEditingActivityId(null);
            setEditingActivityData(null);
            setEditingPeriodId(null);
          };

          return (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => { resetForm(); setYpopAdminView("periods"); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to YPOP Semesters
              </button>

              <PortalSection
                title={isEditMode ? "Edit YPOP Semester" : "New YPOP Semester"}
                description={isEditMode ? "Update the semester details and configure city-led activities." : "Set up a new semester period including activities before opening it to organizations."}
              >
                <div className="space-y-6">
                  {/* Metadata fields */}
                  <div className="grid max-w-2xl gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium" htmlFor="cp-label">Semester Label <span className="font-normal text-muted-foreground">(auto-generated)</span></label>
                      <Input
                        id="cp-label"
                        value={generatedSemesterLabel}
                        readOnly
                        className="bg-muted/40"
                      />
                    </div>

                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-sm font-medium" htmlFor="cp-key">Semester Key <span className="font-normal text-muted-foreground">(auto-derived, read-only)</span></label>
                      <Input id="cp-key" value={generatedSemesterKey || "—"} readOnly className="bg-muted/40 font-mono text-sm text-muted-foreground" />
                      <p className="text-xs text-muted-foreground">Used to link submissions and activities to this semester.</p>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="cp-deadline">Validation Deadline <span className="text-destructive">*</span></label>
                      <Input
                        id="cp-deadline"
                        type="date"
                        value={createPeriodForm.validationDeadline}
                        onChange={(e) => setCreatePeriodForm({ ...createPeriodForm, validationDeadline: e.target.value })}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="cp-status">Status</label>
                      <Select
                        value={createPeriodForm.status}
                        onValueChange={(v) => setCreatePeriodForm({ ...createPeriodForm, status: v as YPOPPeriodStatus })}
                      >
                        <SelectTrigger id="cp-status"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft">Draft — not yet visible</SelectItem>
                          <SelectItem value="open">Open — organizations can submit</SelectItem>
                          <SelectItem value="closed">Closed — no new submissions</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* City-Led Activities section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">City-Led Activities</p>
                        <p className="text-xs text-muted-foreground">Assign a memo-based category for each city-led activity. Points are automatic: Mandatory = 4, Invitational = 3, Partnership = 2.</p>
                      </div>
                      {!createFormNewActivity && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setCreateFormNewActivity({ name: "", date: "", venue: "", category: "mandatory" })}
                        >
                          <Plus className="mr-1.5 h-3.5 w-3.5" />Add Activity
                        </Button>
                      )}
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                      {/* Activities list */}
                      {(isEditMode ? editActivities : createPeriodActivities).length === 0 && !createFormNewActivity ? (
                        <p className="py-3 text-center text-xs text-muted-foreground">No activities added yet. Use "+ Add Activity" to start.</p>
                      ) : isEditMode ? (
                        editActivities.map((act: YPOPCityActivity) =>
                          editingActivityId === act.id && editingActivityData ? (
                            <div key={act.id} className="flex flex-wrap items-end gap-2.5 rounded-lg border border-primary/30 bg-background p-2.5">
                              <div className="flex-1 min-w-[10rem] space-y-1">
                                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Activity Name</label>
                                <Input className="h-7 w-full text-xs" placeholder="e.g. Youth Leadership Summit" value={editingActivityData.name} onChange={(e) => setEditingActivityData({ ...editingActivityData, name: e.target.value })} />
                              </div>
                              <div className="flex-1 min-w-[8rem] space-y-1">
                                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Venue</label>
                                <Input className="h-7 w-full text-xs" placeholder="e.g. City Hall" value={editingActivityData.venue} onChange={(e) => setEditingActivityData({ ...editingActivityData, venue: e.target.value })} />
                              </div>
                              <div className="w-36 shrink-0 space-y-1">
                                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Date</label>
                                <Input className="h-7 w-full text-xs" type="date" value={editingActivityData.date} onChange={(e) => setEditingActivityData({ ...editingActivityData, date: e.target.value })} />
                              </div>
                              <div className="w-44 shrink-0 space-y-1">
                                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Category</label>
                                <Select value={editingActivityData.category} onValueChange={(value) => setEditingActivityData({ ...editingActivityData, category: value as YPOPCityActivityCategory })}>
                                  <SelectTrigger className="h-7 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="mandatory">Mandatory • 4 pts</SelectItem>
                                    <SelectItem value="invitational">Invitational • 3 pts</SelectItem>
                                    <SelectItem value="partnership">Partnership • 2 pts</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex shrink-0 items-end gap-1 pb-0.5">
                                <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={!editingActivityData.name.trim()} onClick={async () => { const patch = { name: editingActivityData.name.trim(), date: editingActivityData.date.trim(), venue: editingActivityData.venue.trim(), category: editingActivityData.category, points: getYpopCityLedPoints(editingActivityData.category) }; try { const saved = await adminUpdateYpopCityActivityInSupabase(act.id, patch); updateYPOPCityActivity(saved.id, saved); } catch { updateYPOPCityActivity(act.id, patch); } setEditingActivityId(null); setEditingActivityData(null); }}>
                                  <Save className="h-3 w-3" />
                                </Button>
                                <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => { setEditingActivityId(null); setEditingActivityData(null); }}>Cancel</Button>
                              </div>
                            </div>
                          ) : (
                            <div key={act.id} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium">{act.name}</p>
                                <p className="text-xs text-muted-foreground">{act.date} · {act.venue}</p>
                              </div>
                              <span className="shrink-0 rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(act.category, act.points)]}</span>
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{normalizeYpopCityLedPoints(act.points, act.category)} pts</span>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0" onClick={() => { setEditingActivityId(act.id); setEditingActivityData({ name: act.name, date: act.date, venue: act.venue, category: resolveYpopCityLedCategory(act.category, act.points) }); }}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive" onClick={() => { void adminDeleteYpopCityActivityFromSupabase(act.id).catch(() => {}); deleteYPOPCityActivity(act.id); }}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          )
                        )
                      ) : (
                        createPeriodActivities.map((act, idx) => (
                          <div key={act.tempId} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium">{act.name}</p>
                              <p className="text-xs text-muted-foreground">{act.date}{act.venue ? ` · ${act.venue}` : ""}</p>
                            </div>
                            <span className="shrink-0 rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">{YPOP_CITY_LED_CATEGORY_LABELS[act.category]}</span>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{getYpopCityLedPoints(act.category)} pts</span>
                            <Button type="button" size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive" onClick={() => setCreatePeriodActivities((prev) => prev.filter((_, i) => i !== idx))}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ))
                      )}

                      {/* Add activity inline form */}
                      {createFormNewActivity && (
                        <div className="flex flex-wrap items-end gap-2.5 rounded-lg border border-primary/30 bg-background p-2.5">
                          <div className="flex-1 min-w-[10rem] space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Activity Name *</label>
                            <Input className="h-7 w-full text-xs" placeholder="e.g. Youth Leadership Summit" value={createFormNewActivity.name} onChange={(e) => setCreateFormNewActivity({ ...createFormNewActivity, name: e.target.value })} />
                          </div>
                          <div className="flex-1 min-w-[8rem] space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Venue</label>
                            <Input className="h-7 w-full text-xs" placeholder="e.g. City Hall" value={createFormNewActivity.venue} onChange={(e) => setCreateFormNewActivity({ ...createFormNewActivity, venue: e.target.value })} />
                          </div>
                          <div className="w-36 shrink-0 space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Date</label>
                            <Input className="h-7 w-full text-xs" type="date" value={createFormNewActivity.date} onChange={(e) => setCreateFormNewActivity({ ...createFormNewActivity, date: e.target.value })} />
                          </div>
                          <div className="w-44 shrink-0 space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Category</label>
                            <Select value={createFormNewActivity.category} onValueChange={(value) => setCreateFormNewActivity({ ...createFormNewActivity, category: value as YPOPCityActivityCategory })}>
                              <SelectTrigger className="h-7 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mandatory">Mandatory • 4 pts</SelectItem>
                                <SelectItem value="invitational">Invitational • 3 pts</SelectItem>
                                <SelectItem value="partnership">Partnership • 2 pts</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="flex shrink-0 items-end gap-1 pb-0.5">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!createFormNewActivity.name.trim()}
                              onClick={async () => {
                                if (isEditMode && editPeriod) {
                                  const actData = { semesterKey: editPeriod.semesterKey, name: createFormNewActivity.name.trim(), date: createFormNewActivity.date.trim(), venue: createFormNewActivity.venue.trim(), category: createFormNewActivity.category, points: getYpopCityLedPoints(createFormNewActivity.category) };
                                  try {
                                    const saved = await adminCreateYpopCityActivityInSupabase(actData);
                                    createYPOPCityActivity({ ...saved });
                                  } catch {
                                    createYPOPCityActivity({ id: `ypop-act-${Date.now()}`, ...actData, createdAt: new Date().toISOString() });
                                  }
                                } else {
                                  setCreatePeriodActivities((prev) => [...prev, { tempId: `tmp-${Date.now()}`, name: createFormNewActivity.name.trim(), date: createFormNewActivity.date.trim(), venue: createFormNewActivity.venue.trim(), category: createFormNewActivity.category }]);
                                }
                                setCreateFormNewActivity(null);
                              }}
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setCreateFormNewActivity(null)}>Cancel</Button>
                          </div>
                        </div>
                      )}

                      {/* Total pts footer */}
                      {(() => {
                        const totalPts = isEditMode
                          ? editActivities.reduce((s, a) => s + normalizeYpopCityLedPoints(a.points, a.category), 0)
                          : createPeriodActivities.reduce((s, a) => s + getYpopCityLedPoints(a.category), 0);
                        return totalPts > 0 ? (
                          <p className="pt-1 text-right text-xs font-medium text-muted-foreground">
                            Total: <span className="text-foreground">{totalPts} pts</span>
                          </p>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Org-Led Scoring Tiers */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold">Organization-Initiated Scoring</p>
                        <p className="text-xs text-muted-foreground">Configure how organization-initiated activity counts map to bonus percentages. Defaults follow the memo and can still be adjusted by admin.</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => setCreatePeriodOrgLedTiers(DEFAULT_ORG_LED_TIERS)}
                      >
                        Reset to defaults
                      </Button>
                    </div>

                    <div className="space-y-2 rounded-xl border border-border/60 bg-muted/10 p-3">
                      {[...createPeriodOrgLedTiers]
                        .sort((a, b) => b.minProjects - a.minProjects)
                        .map((tier, displayIdx) => {
                          const actualIdx = createPeriodOrgLedTiers.indexOf(tier);
                          return (
                            <div key={displayIdx} className="flex items-center gap-2 rounded-lg border border-border/50 bg-background px-3 py-2">
                              <span className="shrink-0 text-sm text-muted-foreground">≥</span>
                              <Input
                                className="h-7 w-16 text-xs"
                                type="number"
                                min={0}
                                value={tier.minProjects}
                                onChange={(e) => setCreatePeriodOrgLedTiers((prev) =>
                                  prev.map((t, i) => i === actualIdx ? { ...t, minProjects: Math.max(0, Number(e.target.value) || 0) } : t)
                                )}
                              />
                              <span className="shrink-0 text-sm text-muted-foreground">projects → +</span>
                              <Input
                                className="h-7 w-16 text-xs"
                                type="number"
                                min={0}
                                value={tier.bonus}
                                onChange={(e) => setCreatePeriodOrgLedTiers((prev) =>
                                  prev.map((t, i) => i === actualIdx ? { ...t, bonus: Math.max(0, Number(e.target.value) || 0) } : t)
                                )}
                              />
                              <span className="shrink-0 text-sm text-muted-foreground">% bonus</span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="ml-auto h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => setCreatePeriodOrgLedTiers((prev) => prev.filter((_, i) => i !== actualIdx))}
                              >
                                <X className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          );
                        })}

                      {createPeriodOrgLedTiers.length === 0 && (
                        <p className="py-3 text-center text-xs text-muted-foreground">No tiers configured. Org-led activities will contribute 0 bonus points.</p>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-1 h-7 w-full text-xs"
                        onClick={() => setCreatePeriodOrgLedTiers((prev) => [...prev, { minProjects: 0, bonus: 0 }])}
                      >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />Add Tier
                      </Button>
                    </div>
                  </div>

                  {/* Submit */}
                  <div className="flex gap-3">
                    <Button
                      type="button"
                      disabled={!canSubmit}
                      onClick={async () => {
                        if (isEditMode && editingPeriodId) {
                          const deadline = createPeriodForm.validationDeadline.includes("T")
                            ? createPeriodForm.validationDeadline
                            : `${createPeriodForm.validationDeadline}T00:00:00.000Z`;
                          const patch = {
                            semesterLabel: generatedSemesterLabel,
                            validationDeadline: deadline,
                            status: createPeriodForm.status,
                            orgLedTiers: createPeriodOrgLedTiers,
                          };
                          try {
                            const saved = await adminUpdateYpopPeriodInSupabase(editingPeriodId, patch);
                            updateYPOPPeriod(saved.id, saved);
                          } catch {
                            updateYPOPPeriod(editingPeriodId, patch);
                          }
                          toast({ title: "Semester updated", description: `${generatedSemesterLabel} has been saved.` });
                          resetForm();
                          setYpopAdminView("periods");
                        } else {
                          const now = new Date().toISOString();
                          const deadline = createPeriodForm.validationDeadline.includes("T")
                            ? createPeriodForm.validationDeadline
                            : `${createPeriodForm.validationDeadline}T00:00:00.000Z`;
                          const periodData = { semesterKey: generatedSemesterKey, semesterLabel: generatedSemesterLabel, validationDeadline: deadline, status: createPeriodForm.status, orgLedTiers: createPeriodOrgLedTiers };
                          let savedPeriodId: string;
                          try {
                            const saved = await adminCreateYpopPeriodInSupabase(periodData);
                            createYPOPPeriod({ ...saved });
                            savedPeriodId = saved.id;
                            for (let i = 0; i < createPeriodActivities.length; i++) {
                              const act = createPeriodActivities[i];
                              try {
                                const savedAct = await adminCreateYpopCityActivityInSupabase({ semesterKey: saved.semesterKey, name: act.name, date: act.date, venue: act.venue, category: act.category, points: getYpopCityLedPoints(act.category) });
                                createYPOPCityActivity({ ...savedAct });
                              } catch {
                                createYPOPCityActivity({ id: `ypop-act-${Date.now()}-${i}`, semesterKey: saved.semesterKey, name: act.name, date: act.date, venue: act.venue, category: act.category, points: getYpopCityLedPoints(act.category), createdAt: now });
                              }
                            }
                          } catch {
                            const newId = `ypop-period-${Date.now()}`;
                            createYPOPPeriod({ id: newId, ...periodData, createdAt: now, updatedAt: now });
                            createPeriodActivities.forEach((act, i) => {
                              createYPOPCityActivity({ id: `ypop-act-${Date.now()}-${i}`, semesterKey: generatedSemesterKey, name: act.name, date: act.date, venue: act.venue, category: act.category, points: getYpopCityLedPoints(act.category), createdAt: now });
                            });
                            savedPeriodId = newId;
                          }
                          toast({ title: "Semester created", description: `${generatedSemesterLabel} is ready.` });
                          setSelectedYpopPeriodId(savedPeriodId);
                          setYpopSubmissionFilter("all");
                          resetForm();
                          setYpopAdminView("period-detail");
                        }
                      }}
                    >
                      {isEditMode ? "Save Changes" : "Create Semester"}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => { resetForm(); setYpopAdminView("periods"); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </PortalSection>
            </div>
          );
        }

        // ── VIEW 1: YPOP Semesters list ───────────────────────────────────────
        const sortedPeriods = [...state.ypopPeriods].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return (
          <PortalSection
            title="YPOP Semesters"
            description="Manage YPOP event participation verification and semester-level incentive validation."
            action={
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCreatePeriodForm({ semesterLabel: deriveSemesterLabelFromDate(), validationDeadline: "", status: "draft" });
                  setCreatePeriodActivities([]);
                  setCreateFormNewActivity(null);
                  setCreatePeriodOrgLedTiers(DEFAULT_ORG_LED_TIERS);
                  setEditingActivityId(null);
                  setEditingActivityData(null);
                  setEditingPeriodId(null);
                  setYpopAdminView("create-period");
                }}
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                New Semester
              </Button>
            }
          >
            {sortedPeriods.length === 0 ? (
              <PortalEmptyState
                title="No semesters yet"
                description="Create a new YPOP semester to open a registration period for organizations."
              />
            ) : (
              <div className="space-y-3">
                {sortedPeriods.map((period) => {
                  const submissionCount = state.ypopEntries.filter((e) => e.semester === period.semesterKey).length;
                  const activityCount = state.ypopCityActivities.filter((a) => a.semesterKey === period.semesterKey).length;
                  const statusBadgeClass =
                    period.status === "open" ? "bg-emerald-100 text-emerald-700"
                    : period.status === "draft" ? "bg-muted text-muted-foreground"
                    : "bg-secondary text-secondary-foreground";
                  return (
                    <Card key={period.id} className="border-border/70 shadow-sm">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{period.semesterLabel}</p>
                              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass}`}>
                                {period.status === "open" ? "Open" : period.status === "draft" ? "Draft" : "Closed"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Deadline: {new Date(period.validationDeadline).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {activityCount} activit{activityCount !== 1 ? "ies" : "y"} · {submissionCount} submission{submissionCount !== 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            title="Delete semester"
                            onClick={() => {
                              setPendingDeleteConfirmation({ kind: "ypop_period", id: period.id, title: period.semesterLabel, activityCount });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            title="Edit semester"
                            onClick={() => {
                              const deadlineDate = period.validationDeadline.includes("T")
                                ? period.validationDeadline.split("T")[0]
                                : period.validationDeadline;
                              setCreatePeriodForm({ semesterLabel: period.semesterLabel, validationDeadline: deadlineDate, status: period.status });
                              setCreatePeriodActivities([]);
                              setCreateFormNewActivity(null);
                              setCreatePeriodOrgLedTiers(period.orgLedTiers?.length ? period.orgLedTiers : DEFAULT_ORG_LED_TIERS);
                              setEditingActivityId(null);
                              setEditingActivityData(null);
                              setEditingPeriodId(period.id);
                              setYpopAdminView("create-period");
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <div className="mx-1 h-5 w-px bg-border/60" />
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => {
                              setSelectedYpopPeriodId(period.id);
                              setYpopSubmissionFilter("all");
                              setYpopAdminView("period-detail");
                            }}
                          >
                            Submissions
                            <ArrowRight className="ml-1.5 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </PortalSection>
        );
      }
      case "yorp-registry":
        return <YorpRegistryPage />;
      default:
        return (
          <PortalEmptyState
            title="Section not found"
            description="This admin section has not been configured yet."
            action={
              <Button variant="outline" onClick={() => navigate(routeMap.overview)}>
                Go to overview
              </Button>
            }
          />
        );
    }
  }, [
    activityLogFilter,
    activityDateFilter,
    createNotification,
    selectedBudgetRequestId,
    selectedLiquidationReportSnapshot,
    selectedLiquidationReportId,
    liquidationDetailsOpen,
    selectedBudgetAllocation,
    createNewsRelease,
    createTemplate,
    deleteNewsReleaseInSupabase,
    editingTemplateId,
    editingTransparencyPostId,
    handleCreateTemplate,
    handleDeleteTemplate,
    handleDeleteNewsRelease,
    handleDeleteTransparencyPost,
    handleSaveNewsRelease,
    handleSaveTransparencyPost,
    mergeRemoteState,
    markNotificationRead,
    markAllNotificationsRead,
    navigate,
    openFile,
    openPreview,
    overviewStats,
    profile,
    previewModalOpen,
    previewTitle,
    previewUrl,
    newsDatePostedDraft,
    newsDescriptionDraft,
    newsFacebookPostUrlDraft,
    newsModalMode,
    newsReleases,
    newsTitleDraft,
    newsVisibilityDraft,
    section,
    selectedRegistrationId,
    state.activityLogs,
    state.budgetRequests,
    state.complianceRemarks,
    state.documentSubmissionFiles,
    state.liquidationReports,
    state.notifications,
    state.inquiries,
    state.organizationProfiles,
    state.templates,
    state.transparencyPosts,
    inquirySearch,
    inquiryStatusFilter,
    activeTemplates,
    moveTemplates,
    otherTemplates,
    selectedTemplate,
    templateDescriptionDraft,
    templateDocuments,
    templateFileDraft,
    templateNameDraft,
    templateModalMode,
    templateScopeDraft,
    transparencyAttachmentUrlDraft,
    transparencyCategoryDraft,
    transparencyDescriptionDraft,
    transparencyModalMode,
    transparencyPostDateDraft,
    transparencyPosts,
    transparencyTitleDraft,
    transparencyVisibilityDraft,
    openAdminConfirmation,
    pendingAdminConfirmation,
    processingAdminConfirmation,
    removeNewsRelease,
    updateComplianceRemark,
    updateNewsRelease,
    updateTemplate,
    updateTransparencyPost,
    updateNewsReleaseInSupabase,
    resetNewsReleaseForm,
    resetTransparencyForm,
    savingNewsRelease,
    savingTransparencyPost,
    startEditingNewsRelease,
    startEditingTemplate,
    startEditingTransparencyPost,
    validDocumentTypeIds,
    savingTemplate,
    uploadingTemplateId,
    selectedYpopId,
    setSelectedYpopId,
    ypopValidationForm,
    setYpopValidationForm,
    savingYpopValidation,
    ypopAdminView,
    setYpopAdminView,
    selectedYpopPeriodId,
    setSelectedYpopPeriodId,
    createPeriodForm,
    setCreatePeriodForm,
    ypopSubmissionFilter,
    setYpopSubmissionFilter,
    newActivityForm,
    setNewActivityForm,
    editingActivityId,
    setEditingActivityId,
    editingActivityData,
    setEditingActivityData,
    ypopPreviewFileId,
    setYpopPreviewFileId,
    ypopPreviewUrl,
    ypopPreviewTitle,
    ypopPreviewCanInline,
    ypopPreviewLoading,
    ypopEventReviewRemarksById,
    state.ypopEntries,
    state.ypopFiles,
    state.ypopEventParticipations,
    state.ypopEventFiles,
    state.ypopOrgActivities,
    state.ypopOrgActivityFiles,
    state.ypopCityActivities,
    state.ypopPeriods,
    updateYPOPEntry,
    updateYPOPEventParticipation,
    createYPOPOrgActivity,
    updateYPOPOrgActivity,
    createYPOPCityActivity,
    updateYPOPCityActivity,
    deleteYPOPCityActivity,
    editingPeriodId,
    setEditingPeriodId,
    createPeriodActivities,
    setCreatePeriodActivities,
    createFormNewActivity,
    setCreateFormNewActivity,
    createPeriodOrgLedTiers,
    setCreatePeriodOrgLedTiers,
    createYPOPPeriod,
    updateYPOPPeriod,
    deleteYPOPPeriod,
    adminCreateYpopPeriodInSupabase,
    adminUpdateYpopPeriodInSupabase,
    adminDeleteYpopPeriodFromSupabase,
    adminCreateYpopCityActivityInSupabase,
    adminUpdateYpopCityActivityInSupabase,
    adminDeleteYpopCityActivityFromSupabase,
    adminUpdateYpopEntryInSupabase,
    adminUpdateYpopEventParticipationInSupabase,
    adminUpdateYpopOrgActivityInSupabase,
    adminUpdateMoveApplicationInSupabase,
  ]);

  const adminConfirmationCopy = getAdminConfirmationCopy();

  return (
    <>
      <PortalShell
        title="Admin Portal"
        subtitle="LYDO / PCYDO Admin"
        groups={splitNotificationsGroup}
        activeId={section}
        onNavigate={(id) => navigate(routeMap[id] ?? routeMap.overview)}
        onSignOut={() => setSignOutConfirmOpen(true)}
        userProfile={{ name: "Administrator", role: "LYDO / PCYDO Admin" }}
      >
        {activeContent}
      </PortalShell>
      <Dialog open={Boolean(selectedInquiry)} onOpenChange={(open) => (!open ? setSelectedInquiry(null) : undefined)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedInquiry?.subject || "Inquiry details"}</DialogTitle>
            <DialogDescription>
              Full inquiry details from the user dashboard.
            </DialogDescription>
          </DialogHeader>
          {selectedInquiry ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Name / Organization</p>
                  <p className="mt-1 text-sm font-medium text-foreground">
                    {selectedInquiry.submitterName || "Unnamed submitter"}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selectedInquiry.organizationName || "No organization name provided"}
                  </p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Email</p>
                  <p className="mt-1 break-all text-sm font-medium text-foreground">{selectedInquiry.email}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Submitted</p>
                  <p className="mt-1 text-sm font-medium text-foreground">{formatDateTimeLabel(selectedInquiry.createdAt)}</p>
                </div>
                <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <PortalStatusBadge status={selectedInquiry.status} />
                  </div>
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Description</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedInquiry.description}</p>
              </div>
              {selectedInquiry.adminRemarks ? (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Admin Remarks</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-foreground">{selectedInquiry.adminRemarks}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(pendingAdminConfirmation)} onOpenChange={(open) => (!open ? closeAdminConfirmation() : undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{adminConfirmationCopy.title}</DialogTitle>
            <DialogDescription>{adminConfirmationCopy.description}</DialogDescription>
          </DialogHeader>
          <label htmlFor="admin-confirmation-checkbox" className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-4 text-sm">
            <input
              id="admin-confirmation-checkbox"
              name="adminConfirmationAcknowledged"
              type="checkbox"
              checked={approvalAcknowledged}
              onChange={(event) => setApprovalAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-border text-primary"
            />
            <span>{adminConfirmationCopy.checkboxLabel}</span>
          </label>
          {adminConfirmationCopy.showCommentBox ? (
            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">{adminConfirmationCopy.commentLabel}</p>
                <span className="text-xs text-muted-foreground">Required for revision or rejection</span>
              </div>
              <Textarea
                value={statusChangeRemarkDraft}
                onChange={(event) => setStatusChangeRemarkDraft(event.target.value)}
                placeholder={adminConfirmationCopy.commentPlaceholder}
                className="min-h-28"
              />
            </div>
          ) : null}
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeAdminConfirmation} disabled={processingAdminConfirmation}>
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => void executeAdminConfirmation()}
              disabled={!approvalAcknowledged || processingAdminConfirmation}
            >
              {processingAdminConfirmation ? "Updating..." : adminConfirmationCopy.confirmLabel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(pendingDeleteConfirmation)}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteConfirmation(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteConfirmation?.kind === "news_release"
                ? "Delete News Release"
                : pendingDeleteConfirmation?.kind === "ypop_period"
                ? "Delete Semester"
                : "Delete Transparency Post"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteConfirmation?.kind === "ypop_period"
                ? `Are you sure you want to delete "${pendingDeleteConfirmation.title}"? This will also remove ${pendingDeleteConfirmation.activityCount} configured activit${pendingDeleteConfirmation.activityCount !== 1 ? "ies" : "y"}. This action cannot be undone.`
                : pendingDeleteConfirmation
                ? `Are you sure you want to delete "${pendingDeleteConfirmation.title}"? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingAdminConfirmation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteRecord()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You will be returned to the login page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void signOut()}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ExportReportDialog
        open={activeReportExport !== null}
        onOpenChange={(open) => {
          if (!open) setActiveReportExport(null);
        }}
        reportTitle={activeReportExport === "allocation-by-barangay" ? "Allocation by Barangay" : "Budget Request Report"}
        description={
          activeReportExport === "allocation-by-barangay"
            ? "Export all barangay allocation rows matching the current district and barangay filters."
            : "Export all budget request rows in the current monitored report."
        }
        onExport={handleReportExport}
      />
    </>
  );
}

const pesoCurrencyFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatPesoAmount(value?: number | null) {
  return pesoCurrencyFormatter.format(Number(value ?? 0));
}

function DetailStatusChip({
  label,
  tone = "neutral",
}: {
  label: string;
  tone?: "neutral" | "warning" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : tone === "danger"
      ? "border-rose-200 bg-rose-50 text-rose-700"
      : "border-border/70 bg-muted/30 text-muted-foreground";

  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${toneClass}`}>{label}</span>;
}

function DetailInfoCard({
  title,
  icon,
  children,
  className = "",
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card className={`border-border/70 shadow-sm ${className}`}>
      <CardHeader className="space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/5 text-primary">{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 pt-0">{children}</CardContent>
    </Card>
  );
}

function DetailSectionBlock({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">{label}</p>
      {children}
    </div>
  );
}

function DetailInfoRow({
  label,
  value,
  children,
  valueClassName = "",
}: {
  label: string;
  value?: ReactNode;
  children?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="grid gap-1.5 border-b border-border/40 pb-3 last:border-b-0 last:pb-0 sm:grid-cols-[10.5rem_minmax(0,1fr)] sm:gap-3">
      <p className="text-[12px] text-muted-foreground">{label}</p>
      <div className={`min-w-0 text-sm font-medium text-foreground ${valueClassName}`}>{children ?? value}</div>
    </div>
  );
}

function DetailSubmittedBy({
  title,
  email,
  subtitle,
}: {
  title: string;
  email?: string | null;
  subtitle?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-muted/10 p-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/5 text-primary">
        <UserRound className="h-5 w-5" />
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {email ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5 shrink-0" />
            <span className="break-all">{email}</span>
          </div>
        ) : null}
        {subtitle ? (
          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="break-words">{subtitle}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DetailFilePills({
  items,
  selectedId,
  onSelect,
}: {
  items: Array<{ id: string; fileName: string }>;
  selectedId?: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((file) => {
        const isSelected = selectedId === file.id;
        return (
          <button
            key={file.id}
            type="button"
            title={file.fileName}
            onClick={() => onSelect(file.id)}
            className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors ${
              isSelected
                ? "border-primary bg-primary/5 text-primary shadow-sm"
                : "border-border/70 bg-background text-foreground hover:border-primary/40 hover:bg-primary/5"
            }`}
          >
            <FileText className="h-4 w-4 shrink-0 text-red-500" />
            <span className="line-clamp-2 break-all text-sm font-medium leading-snug">{file.fileName}</span>
          </button>
        );
      })}
    </div>
  );
}

function ReviewActionToolbar({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap gap-2.5">{children}</div>;
}

function SectionDivider() {
  return <div className="border-t border-border/50" />;
}

function BadgePanel({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-sm">
      <Bell className="h-4 w-4" />
      <span>{count} unread</span>
    </div>
  );
}
