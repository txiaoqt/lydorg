import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { YorpRegistryPage } from "./pages/YorpRegistry";
import { AlertTriangle, ArrowLeft, ArrowRight, Banknote, Bell, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Download, Eye, FileText, Medal, MoreHorizontal, Pencil, Plus, Save, Trash2, Trophy, Users, Wallet, X } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PortalEmptyState, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { PortalShell } from "@/components/portal/PortalShell";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { adminNavigationGroups as baseAdminNavigationGroups, computeYpopScore, DEFAULT_ORG_LED_TIERS, type NewsRelease, type TransparencyPost, type YPOPCityActivity, type YPOPEntry, type YPOPFile, type YPOPOrgLedTier, type YPOPPeriod, type YPOPPeriodStatus, type YPOPStatus } from "@/lib/lydo-connect-data";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
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
} from "@/lib/lydo-connect-supabase";

const routeMap: Record<string, string> = {
  overview: "/admin",
  registrations: "/admin/registrations",
  "budget-utilization": "/admin/budget-utilization",
  "liquidation-monitoring": "/admin/liquidation-monitoring",
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
    }
  | {
      kind: "liquidation";
      action: "approve" | "needs_revision" | "overdue";
      liquidationReportId: string;
      budgetRequestId: string;
      organizationId: string;
      organizationName: string;
      activityTitle: string;
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

export default function AdminPortal({ section }: { section: string }) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { state, mergeRemoteState, createTemplate, removeTemplate, createNewsRelease, removeNewsRelease, updateNewsRelease, updateTransparencyPost, updateComplianceRemark, updateTemplate, createNotification, markNotificationRead, markAllNotificationsRead, updateBudgetRequest, updateLiquidationReport, updateYPOPEntry, createYPOPCityActivity, updateYPOPCityActivity, deleteYPOPCityActivity, createYPOPPeriod, updateYPOPPeriod, deleteYPOPPeriod } =
    useLydoConnect();
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const [templateModalMode, setTemplateModalMode] = useState<"create" | "edit" | "delete" | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [templateDescriptionDraft, setTemplateDescriptionDraft] = useState("");
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
  const [liquidationPreviewExpanded, setLiquidationPreviewExpanded] = useState(false);
  const [budgetMonitoringTab, setBudgetMonitoringTab] = useState<"overview" | "barangay-allocation">("overview");
  const [budgetAllocationDistrictFilter, setBudgetAllocationDistrictFilter] = useState("all");
  const [budgetAllocationBarangayFilter, setBudgetAllocationBarangayFilter] = useState("all");
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
  const [ypopAdminView, setYpopAdminView] = useState<"periods" | "create-period" | "period-detail" | "entry-review">("periods");
  const [selectedYpopPeriodId, setSelectedYpopPeriodId] = useState<string | null>(null);
  const [createPeriodForm, setCreatePeriodForm] = useState<{ semesterLabel: string; validationDeadline: string; status: YPOPPeriodStatus }>({ semesterLabel: "", validationDeadline: "", status: "draft" });
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [createPeriodActivities, setCreatePeriodActivities] = useState<Array<{ tempId: string; name: string; date: string; venue: string; points: string }>>([]);
  const [createFormNewActivity, setCreateFormNewActivity] = useState<{ name: string; date: string; venue: string; points: string } | null>(null);
  const [createPeriodOrgLedTiers, setCreatePeriodOrgLedTiers] = useState<YPOPOrgLedTier[]>(DEFAULT_ORG_LED_TIERS);
  const [ypopSubmissionFilter, setYpopSubmissionFilter] = useState<"all" | YPOPStatus>("all");
  const [newActivityForm, setNewActivityForm] = useState<{ name: string; date: string; venue: string; points: string } | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingActivityData, setEditingActivityData] = useState<{ name: string; date: string; venue: string; points: string } | null>(null);
  const [ypopPreviewFileId, setYpopPreviewFileId] = useState<string | null>(null);
  const [ypopPreviewUrl, setYpopPreviewUrl] = useState("");
  const [ypopPreviewTitle, setYpopPreviewTitle] = useState("");
  const [ypopPreviewCanInline, setYpopPreviewCanInline] = useState(false);
  const [ypopPreviewLoading, setYpopPreviewLoading] = useState(false);

  const profile = state.organizationProfiles[0] ?? null;
  const adminNotifications = state.notifications.filter((item) => item.userId === adminId);
  const unread = adminNotifications.filter((item) => !item.isRead).length;
  const templateDocuments = useMemo(
    () =>
      [...state.templates]
        .filter((template) => template.templateActive && template.isActive)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
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
  const budgetMonitoringEntries = useMemo<BudgetMonitoringEntry[]>(() => {
    const now = new Date();

    return state.budgetRequests
      .filter((request) => budgetReleaseStatuses.has(request.status))
      .map((request) => {
        const liquidation = state.liquidationReports.find((item) => item.budgetRequestId === request.id) ?? null;
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
  }, [state.budgetRequests, state.liquidationReports, state.organizationProfiles]);
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
  const budgetMonitoringReportRows = useMemo(
    () =>
      budgetMonitoringEntries.map((entry) => [
        entry.organizationName,
        entry.title,
        String(entry.approvedAmount),
        String(entry.releasedAmount),
        String(entry.remainingAmount),
        String(entry.utilizationRate),
        entry.budgetStatus,
        entry.liquidationStatus,
        entry.goSignalAt,
        entry.deadlineAt,
        entry.hardCopySubmittedAt,
        entry.completedAt,
        entry.riskLabel,
        entry.remarks,
      ]),
    [budgetMonitoringEntries],
  );
  const budgetAllocationReportRows = useMemo(
    () =>
      filteredBudgetAllocationRows.map((entry) => [
        entry.district,
        entry.barangay,
        String(entry.organizationCount),
        String(entry.approvedAmount),
        String(entry.releasedAmount),
        String(entry.remainingAmount),
        String(entry.utilizationRate),
      ]),
    [filteredBudgetAllocationRows],
  );
  const exportBudgetMonitoringReport = () => {
    if (!budgetMonitoringEntries.length) {
      toast({ title: "No Data", description: "No monitored budgets are available to export." });
      return;
    }

    const headers = [
      "Organization",
      "Activity",
      "Approved Amount",
      "Released Amount",
      "Remaining Amount",
      "Utilization Rate",
      "Budget Status",
      "Liquidation Status",
      "Go Signal",
      "Deadline",
      "Hard Copy Submitted",
      "Completed At",
      "Risk Label",
      "Remarks",
    ];
    const csv = [headers, ...budgetMonitoringReportRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `budget-monitoring-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  const exportBudgetAllocationReport = () => {
    if (!filteredBudgetAllocationRows.length) {
      toast({ title: "No Data", description: "No barangay allocations match the current filters." });
      return;
    }

    const headers = [
      "District",
      "Barangay",
      "Organizations",
      "Approved Amount",
      "Released Amount",
      "Remaining Amount",
      "Utilization Rate",
    ];
    const csv = [headers, ...budgetAllocationReportRows]
      .map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `barangay-allocation-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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

  const refreshAdminState = async () => {
    const remoteSnapshot = (await loadAdminPortalSupabaseState()) ?? (await loadLydoConnectSupabaseState());
    if (remoteSnapshot) {
      mergeRemoteState(remoteSnapshot);
    }
  };

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
        const approvedAmount = Number(selectedBudget?.approvedAmount || pendingAdminConfirmation.requestedAmount || 0);

        if (pendingAdminConfirmation.action === "approve" && selectedBudget?.status !== "draft" && selectedBudget?.status !== "submitted" && selectedBudget?.status !== "under_review") {
          toast({
            title: "Action unavailable",
            description: "This budget request has already moved beyond the approval step.",
            variant: "destructive",
          });
          return;
        }

        if (
          pendingAdminConfirmation.action === "submitted_hardcopy" &&
          selectedBudget?.status !== "approved_for_ftf_green"
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
          selectedBudget?.status !== "hard_copy_submitted"
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
          });
          updateBudgetRequest(pendingAdminConfirmation.budgetRequestId, {
            revisionHistory: [...existingHistory, { action: "approved_for_ftf_green", adminRemarks: "", changedAt: budgetHistoryNow }],
          });
        } else if (pendingAdminConfirmation.action === "submitted_hardcopy") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "hard_copy_submitted",
            hardCopySubmittedAt: budgetHistoryNow,
          });
          updateBudgetRequest(pendingAdminConfirmation.budgetRequestId, {
            revisionHistory: [...existingHistory, { action: "hard_copy_submitted", adminRemarks: "", changedAt: budgetHistoryNow }],
          });
        } else if (pendingAdminConfirmation.action === "cash_released") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "budget_released",
            releasedAmount: approvedAmount,
            releaseDate: getManilaDateIso(),
          });
          updateBudgetRequest(pendingAdminConfirmation.budgetRequestId, {
            revisionHistory: [...existingHistory, { action: "budget_released", adminRemarks: "", changedAt: budgetHistoryNow }],
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "needs_revision",
            remarks: adminRemarks,
          });
          updateBudgetRequest(pendingAdminConfirmation.budgetRequestId, {
            revisionHistory: [...existingHistory, { action: "needs_revision", adminRemarks, changedAt: budgetHistoryNow }],
          });
        } else {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "rejected_red",
            remarks: adminRemarks,
          });
          updateBudgetRequest(pendingAdminConfirmation.budgetRequestId, {
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
        const status =
          pendingAdminConfirmation.action === "approve"
            ? "approved_for_ftf_green"
            : pendingAdminConfirmation.action === "needs_revision"
              ? "needs_revision"
              : "overdue";
        const adminRemarks = statusChangeRemarkDraft.trim();
        const liqHistoryNow = new Date().toISOString();
        const existingLiqHistory =
          state.liquidationReports.find((r) => r.id === pendingAdminConfirmation.liquidationReportId)?.revisionHistory ?? [];

        if (pendingAdminConfirmation.action !== "approve" && pendingAdminConfirmation.action !== "overdue" && !adminRemarks) {
          toast({
            title: "Comment required",
            description: "Please add a short comment before requesting a revision.",
            variant: "destructive",
          });
          return;
        }

        await updateLiquidationReportInSupabase(pendingAdminConfirmation.liquidationReportId, {
          status,
          remarks: pendingAdminConfirmation.action === "approve" ? undefined : adminRemarks,
          goSignalAt: pendingAdminConfirmation.action === "approve" ? new Date().toISOString() : undefined,
        });
        await refreshAdminState();
        updateLiquidationReport(pendingAdminConfirmation.liquidationReportId, {
          revisionHistory: [...existingLiqHistory, { action: status, adminRemarks, changedAt: liqHistoryNow }],
        });

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
    setTemplateFileDraft(null);
  };

  const resetNewsReleaseForm = () => {
    setNewsModalMode(null);
    setEditingNewsReleaseId(null);
    setNewsTitleDraft("");
    setNewsDescriptionDraft("");
    setNewsFacebookPostUrlDraft("");
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
    const template = templateDocuments.find((entry) => entry.id === templateId);
    if (!template) return;
    setTemplateModalMode("edit");
    setEditingTemplateId(templateId);
    setTemplateNameDraft(template.name);
    setTemplateDescriptionDraft(template.description);
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
      });
      createTemplate(newTemplate);
      if (templateFileDraft) {
        setUploadingTemplateId(newTemplate.id);
        const uploadedTemplate = await uploadTemplateDocumentToSupabase({
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
      });
      updateTemplate(template.id, updatedTemplate);
      if (templateFileDraft) {
        setUploadingTemplateId(template.id);
        const uploadedTemplate = await uploadTemplateDocumentToSupabase({
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
    const template = templateDocuments.find((entry) => entry.id === templateId);
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

    setSelectedLiquidationReportSnapshot(report);
    setSelectedLiquidationReportId(report.id);
    setSelectedLiquidationFileId(reportFiles[0]?.id ?? null);
    setLiquidationDetailsOpen(true);
    setLiquidationPreviewExpanded(typeof window !== "undefined" ? window.matchMedia("(min-width: 640px)").matches : false);
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
    setLiquidationPreviewExpanded(false);
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
    ? templateDocuments.find((template) => template.id === editingTemplateId) ?? null
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
          { count: overviewStats.pendingProfiles,    label: "org profile(s) pending review",         route: routeMap.registrations,             critical: false },
          { count: overviewStats.pendingDocuments,   label: "document set(s) awaiting validation",   route: routeMap.registrations,             critical: false },
          { count: overviewStats.revisions,          label: "document revision(s) need re-review",   route: routeMap.registrations,             critical: false },
          { count: overviewStats.overdueLiquidation, label: "liquidation report(s) overdue",         route: routeMap["liquidation-monitoring"], critical: true  },
          { count: overviewStats.pendingLiquidation, label: "liquidation report(s) awaiting review", route: routeMap["liquidation-monitoring"], critical: false },
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
                  onClick={() => navigate(routeMap.registrations)}
                />
                <PortalMetricCard
                  label="Approved Documents"
                  value={overviewStats.approvedDocs}
                  helper="Fully validated document sets."
                  icon={CheckCircle2}
                  onClick={() => navigate(routeMap.registrations)}
                />
                <PortalMetricCard
                  label="Budget Go Signals"
                  value={overviewStats.approvedBudget}
                  helper="Budget requests approved for release."
                  icon={Wallet}
                  onClick={() => navigate(routeMap["budget-utilization"])}
                />
                <PortalMetricCard
                  label="Budget Released"
                  value={overviewStats.releasedBudget}
                  helper="Funds confirmed released to organizations."
                  icon={Banknote}
                  onClick={() => navigate(routeMap["budget-utilization"])}
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
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Email</p>
                        <p className="break-all text-sm font-medium">{selectedOrg.organizationEmail}</p>
                      </div>
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Contact</p>
                        <p className="text-sm font-medium">{selectedOrg.contactNumber || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Barangay</p>
                        <p className="text-sm font-medium">{selectedOrg.barangay || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Facebook</p>
                        {selectedOrg.facebookPageUrl ? (
                          <a href={selectedOrg.facebookPageUrl} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline">
                            {selectedOrg.facebookPageUrl}
                          </a>
                        ) : (
                          <p className="text-sm font-medium text-muted-foreground">N/A</p>
                        )}
                      </div>
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Address</p>
                        <p className="break-words text-sm font-medium">{selectedOrg.address || "N/A"}</p>
                      </div>
                    </div>
                  </PortalSection>

                  <PortalSection title="Classification">
                    <div className="divide-y divide-border/50">
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Major</p>
                        <p className="text-sm font-medium">{selectedOrg.majorClassification || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
                        <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Sub</p>
                        <p className="text-sm font-medium">{selectedOrg.subClassification || "N/A"}</p>
                      </div>
                      <div className="grid grid-cols-[9rem_1fr] gap-3 py-3 first:pt-0 last:pb-0">
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
                                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
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
                                              {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(file.uploadedAt))}
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
                                                {new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(file.reviewedAt))}
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
              <div className="grid gap-4 md:grid-cols-2">
                {state.organizationProfiles.map((org) => {
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
                              {org.barangay ? (
                                <p className="text-sm text-muted-foreground">{org.barangay}</p>
                              ) : null}
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
                title="No registrations yet"
                description="Organization profiles will appear here after users complete and save them from the user portal."
              />
            )}
          </PortalSection>
        );
      }
      case "budget-utilization":
        if (selectedBudgetRequest) {
          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Button size="sm" variant="ghost" className="-ml-1.5 shrink-0" onClick={closeBudgetRequestDetails}>
                      <ArrowLeft className="mr-2 h-4 w-4" />Back
                    </Button>
                    <span className="h-5 w-px shrink-0 bg-border/60" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{selectedBudgetRequest.activityTitle}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {selectedBudgetOrganization?.organizationName ?? "Unknown organization"} · PHP {selectedBudgetRequest.requestedAmount.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PortalStatusBadge status={selectedBudgetRequest.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "budget",
                          action: "approve",
                          budgetRequestId: selectedBudgetRequest.id,
                          organizationId: selectedBudgetRequest.organizationId,
                          organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedBudgetRequest.activityTitle,
                          requestedAmount: selectedBudgetRequest.requestedAmount,
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedBudgetRequest.status !== "approved_for_ftf_green"}
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "budget",
                          action: "submitted_hardcopy",
                          budgetRequestId: selectedBudgetRequest.id,
                          organizationId: selectedBudgetRequest.organizationId,
                          organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedBudgetRequest.activityTitle,
                          requestedAmount: selectedBudgetRequest.requestedAmount,
                        })
                      }
                    >
                      Submitted hardcopy
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={selectedBudgetRequest.status !== "hard_copy_submitted"}
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "budget",
                          action: "cash_released",
                          budgetRequestId: selectedBudgetRequest.id,
                          organizationId: selectedBudgetRequest.organizationId,
                          organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedBudgetRequest.activityTitle,
                          requestedAmount: selectedBudgetRequest.requestedAmount,
                        })
                      }
                    >
                      Cash released
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "budget",
                          action: "needs_revision",
                          budgetRequestId: selectedBudgetRequest.id,
                          organizationId: selectedBudgetRequest.organizationId,
                          organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedBudgetRequest.activityTitle,
                          requestedAmount: selectedBudgetRequest.requestedAmount,
                        })
                      }
                    >
                      Needs Revision
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "budget",
                          action: "reject",
                          budgetRequestId: selectedBudgetRequest.id,
                          organizationId: selectedBudgetRequest.organizationId,
                          organizationName: selectedBudgetOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedBudgetRequest.activityTitle,
                          requestedAmount: selectedBudgetRequest.requestedAmount,
                        })
                      }
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <PortalSection title="Request Details">
                  {selectedBudgetOrganization && (
                    <div className="mb-4 border-b border-border/40 pb-4">
                      <p className="font-semibold text-foreground">{selectedBudgetOrganization.organizationName}</p>
                      <p className="text-sm text-muted-foreground">{selectedBudgetOrganization.organizationEmail}</p>
                      {selectedBudgetOrganization.barangay ? <p className="text-sm text-muted-foreground">{selectedBudgetOrganization.barangay}</p> : null}
                    </div>
                  )}
                  <div className="divide-y divide-border/40">
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Requested Amount</p>
                      <p className="text-sm font-medium">PHP {selectedBudgetRequest.requestedAmount.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Approved Amount</p>
                      <p className="text-sm font-medium">PHP {selectedBudgetRequest.approvedAmount.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Released Amount</p>
                      <p className="text-sm font-medium">PHP {selectedBudgetRequest.releasedAmount.toLocaleString()}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Activity Date</p>
                      <p className="text-sm font-medium">{selectedBudgetRequest.activityDate || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Venue</p>
                      <p className="break-words text-sm font-medium">{selectedBudgetRequest.venue || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Purpose Category</p>
                      <p className="text-sm font-medium">{selectedBudgetRequest.purposeCategory || "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                      <p className="text-sm font-medium">{selectedBudgetRequest.goSignalAt || "Pending"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Hard Copy Submitted</p>
                      <p className="text-sm font-medium">{selectedBudgetRequest.hardCopySubmittedAt || "Pending"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Release Date</p>
                      <p className="text-sm font-medium">{selectedBudgetRequest.releaseDate || "Pending"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Remarks</p>
                      <p className="break-words text-sm font-medium">{selectedBudgetRequest.remarks || "None"}</p>
                    </div>
                  </div>
                  <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Recent Activity</p>
                    {(selectedBudgetRequest.revisionHistory?.length || selectedBudgetRequest.userNote) ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Submitted</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(selectedBudgetRequest.createdAt))}
                            </p>
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
                            : entry.action === "hard_copy_submitted" ? "Hard Copy Submitted"
                            : entry.action === "budget_released" ? "Budget Released"
                            : entry.action === "completed" ? "Completed"
                            : entry.action.replaceAll("_", " ");
                          return (
                            <div key={idx} className="flex items-start gap-2.5">
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{actionLabel}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(entry.changedAt))}
                                </p>
                                {entry.adminRemarks ? (
                                  <p className="mt-1 text-xs text-muted-foreground italic">"{entry.adminRemarks}"</p>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                        {selectedBudgetRequest.userNote ? (
                          <div className="flex items-start gap-2.5">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-sky-700">Note from org</p>
                              <p className="mt-1 text-xs text-muted-foreground italic">"{selectedBudgetRequest.userNote}"</p>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">No review activity yet.</p>
                    )}
                  </div>
                </PortalSection>

                <PortalSection title="Attached Files">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {selectedBudgetRequestFiles.length
                        ? `${selectedBudgetRequestFiles.length} file${selectedBudgetRequestFiles.length === 1 ? "" : "s"} uploaded.`
                        : "No attached files were uploaded for this request."}
                    </p>
                    {selectedBudgetRequestFiles.length ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {selectedBudgetRequestFiles.map((file) => (
                            <Button
                              key={file.id}
                              type="button"
                              size="sm"
                              variant={selectedBudgetRequestFile?.id === file.id ? "default" : "outline"}
                              className="max-w-full"
                              onClick={() => setSelectedBudgetFileId(file.id)}
                            >
                              <span className="max-w-[12rem] truncate">{file.fileName}</span>
                            </Button>
                          ))}
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background p-3">
                          {budgetPreviewLoading ? (
                            <p className="p-3 text-sm text-muted-foreground">Loading preview...</p>
                          ) : budgetPreviewUrl && budgetPreviewCanInline ? (
                            isImagePreviewFile(budgetPreviewTitle) || isImagePreviewFile(budgetPreviewUrl) ? (
                              <div className="flex max-h-[24rem] min-h-[16rem] items-center justify-center overflow-hidden rounded-md bg-background sm:max-h-[32rem]">
                                <img
                                  src={budgetPreviewUrl}
                                  alt={budgetPreviewTitle || "Budget request preview"}
                                  className="max-h-[24rem] w-full object-contain sm:max-h-[32rem]"
                                />
                              </div>
                            ) : (
                              <iframe
                                title={budgetPreviewTitle || "Budget Request Preview"}
                                src={budgetPreviewUrl}
                                className="h-[24rem] w-full rounded-md border-0 bg-background sm:h-[32rem]"
                                loading="eager"
                              />
                            )
                          ) : budgetPreviewUrl ? (
                            <div className="space-y-3 p-3 text-sm text-muted-foreground">
                              <p>This uploaded file cannot be shown inline. You can open it in a new tab if needed.</p>
                              <Button type="button" variant="outline" onClick={() => window.open(budgetPreviewUrl, "_blank", "noopener,noreferrer")}>
                                <Eye className="mr-2 h-4 w-4" />
                                Open File
                              </Button>
                            </div>
                          ) : (
                            <div className="grid min-h-[16rem] place-items-center rounded-md border border-dashed border-border/70 bg-muted/10 p-6 text-center text-sm text-muted-foreground">
                              {budgetPreviewEmptyMessage || "No budget request file was uploaded."}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
                        No attached budget request files were submitted.
                      </div>
                    )}
                  </div>
                </PortalSection>
              </div>
            </div>
          );
        }
        return (
            <PortalSection title="Budget Requests" description="Review budget requests submitted by organizations. Approve requests to issue a go-signal, request revisions, or reject.">
              <div className="space-y-3">
                {state.budgetRequests.length ? (
                  state.budgetRequests.map((request) => {
                    const requestOrganization = state.organizationProfiles.find((org) => org.id === request.organizationId) ?? null;
                    const statusDotColor =
                      request.status === "budget_released" || request.status === "completed"
                        ? "bg-emerald-500"
                        : request.status === "rejected_red" || request.status === "draft"
                        ? "bg-muted-foreground/40"
                        : "bg-amber-400";
                    return (
                      <Card key={request.id} className="border-border/70 shadow-sm">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotColor}`} />
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <p className="font-semibold text-foreground">{request.activityTitle}</p>
                                  {request.budgetRequestType === "ypop_incentive" && (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                      <Trophy className="h-2.5 w-2.5" />
                                      YPOP Incentive
                                    </span>
                                  )}
                                </div>
                                <p className="mt-0.5 truncate text-sm text-foreground/70"><span className="text-muted-foreground">Organization:</span> {requestOrganization?.organizationName ?? "Unknown organization"}</p>
                                <p className="mt-0.5 text-sm text-muted-foreground"><span>Amount:</span> PHP {request.requestedAmount.toLocaleString()} · <span>Venue:</span> {request.venue || "No venue"}</p>
                              </div>
                            </div>
                            <PortalStatusBadge status={request.status} />
                          </div>
                          <div className="mt-3 flex justify-end">
                            <Button type="button" size="sm" onClick={() => openBudgetRequestDetails(request.id)}>
                              Review<ArrowRight className="ml-2 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                ) : (
                  <PortalEmptyState title="No budget requests yet" description="Budget requests will appear here after an organization creates one." />
                )}
              </div>
            </PortalSection>
        );
      case "liquidation-monitoring":
        if (liquidationDetailsOpen && selectedLiquidationReport) {
          return (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <Button size="sm" variant="ghost" className="-ml-1.5 shrink-0" onClick={closeLiquidationDetails}>
                      <ArrowLeft className="mr-2 h-4 w-4" />Back
                    </Button>
                    <span className="h-5 w-px shrink-0 bg-border/60" />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-foreground">{selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation Report"}</p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {selectedLiquidationOrganization?.organizationName ?? "Unknown organization"}
                        {selectedLiquidationReport.deadlineAt ? ` · Deadline: ${new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(selectedLiquidationReport.deadlineAt))}` : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <PortalStatusBadge status={selectedLiquidationReport.status} />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "liquidation",
                          action: "approve",
                          liquidationReportId: selectedLiquidationReport.id,
                          budgetRequestId: selectedLiquidationReport.budgetRequestId,
                          organizationId: selectedLiquidationReport.organizationId,
                          organizationName: selectedLiquidationOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation report",
                        })
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "liquidation",
                          action: "needs_revision",
                          liquidationReportId: selectedLiquidationReport.id,
                          budgetRequestId: selectedLiquidationReport.budgetRequestId,
                          organizationId: selectedLiquidationReport.organizationId,
                          organizationName: selectedLiquidationOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation report",
                        })
                      }
                    >
                      Needs Revision
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        openAdminConfirmation({
                          kind: "liquidation",
                          action: "overdue",
                          liquidationReportId: selectedLiquidationReport.id,
                          budgetRequestId: selectedLiquidationReport.budgetRequestId,
                          organizationId: selectedLiquidationReport.organizationId,
                          organizationName: selectedLiquidationOrganization?.organizationName ?? "Unknown organization",
                          activityTitle: selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation report",
                        })
                      }
                    >
                      Mark Overdue
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                <PortalSection title="Liquidation Details">
                  {selectedLiquidationOrganization && (
                    <div className="mb-4 border-b border-border/40 pb-4">
                      <p className="font-semibold text-foreground">{selectedLiquidationOrganization.organizationName}</p>
                      <p className="text-sm text-muted-foreground">{selectedLiquidationOrganization.organizationEmail}</p>
                      {selectedLiquidationOrganization.barangay ? <p className="text-sm text-muted-foreground">{selectedLiquidationOrganization.barangay}</p> : null}
                    </div>
                  )}
                  <div className="divide-y divide-border/40">
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Linked Budget</p>
                      <p className="break-words text-sm font-medium">{selectedLiquidationBudgetRequest?.activityTitle ?? "N/A"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                      <p className="text-sm font-medium">{selectedLiquidationReport.goSignalAt || "Pending"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Deadline</p>
                      <p className="text-sm font-medium">{selectedLiquidationReport.deadlineAt || "Pending"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Hard Copy Submitted</p>
                      <p className="text-sm font-medium">{selectedLiquidationReport.hardCopySubmittedAt || "Pending"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Completed At</p>
                      <p className="text-sm font-medium">{selectedLiquidationReport.completedAt || "Pending"}</p>
                    </div>
                    <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0 last:pb-0">
                      <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Remarks</p>
                      <p className="break-words text-sm font-medium">{selectedLiquidationReport.remarks || "None"}</p>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-border/70 bg-background p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Recent Activity</p>
                    {selectedLiquidationReport.revisionHistory?.length ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">Report Created</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(selectedLiquidationReport.createdAt))}
                            </p>
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
                            : entry.action === "approved_for_ftf_green" ? "Approved (Go Signal)"
                            : entry.action === "submitted" ? "Submitted"
                            : entry.action === "hard_copy_submitted" ? "Hard Copy Submitted"
                            : entry.action === "completed_liquidated" ? "Completed"
                            : entry.action;
                          return (
                            <div key={idx} className="flex items-start gap-2.5">
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${liqDotColor}`} />
                              <div className="min-w-0">
                                <p className="text-sm font-medium">{liqActionLabel}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(entry.changedAt))}
                                </p>
                                {entry.adminRemarks ? <p className="mt-1 text-xs italic text-muted-foreground">"{entry.adminRemarks}"</p> : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-muted-foreground">No review activity yet.</p>
                    )}
                  </div>
                </PortalSection>

                <PortalSection title="Attached Files">
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {selectedLiquidationReportFiles.length
                        ? `${selectedLiquidationReportFiles.length} file${selectedLiquidationReportFiles.length === 1 ? "" : "s"} uploaded.`
                        : "No attached files were uploaded for this liquidation report."}
                    </p>
                    {selectedLiquidationReportFiles.length ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {selectedLiquidationReportFiles.map((file) => (
                            <Button
                              key={file.id}
                              type="button"
                              size="sm"
                              variant={selectedLiquidationReportFile?.id === file.id ? "default" : "outline"}
                              className="max-w-full"
                              onClick={() => setSelectedLiquidationFileId(file.id)}
                            >
                              <span className="max-w-[12rem] truncate">{file.fileName}</span>
                            </Button>
                          ))}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full justify-between"
                          onClick={() => setLiquidationPreviewExpanded((value) => !value)}
                        >
                          <span className="inline-flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            {liquidationPreviewExpanded ? "Hide Preview" : "Show Preview"}
                          </span>
                          {liquidationPreviewExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                        {liquidationPreviewExpanded ? (
                          <div className="rounded-xl border border-border/70 bg-background p-2.5">
                            {liquidationPreviewLoading ? (
                              <p className="p-2 text-sm text-muted-foreground">Loading preview...</p>
                            ) : liquidationPreviewUrl && liquidationPreviewCanInline ? (
                              isImagePreviewFile(liquidationPreviewTitle) || isImagePreviewFile(liquidationPreviewUrl) ? (
                                <div className="flex max-h-[18rem] min-h-[12rem] items-center justify-center overflow-hidden rounded-md bg-background sm:max-h-[32rem]">
                                  <img
                                    src={liquidationPreviewUrl}
                                    alt={liquidationPreviewTitle || "Liquidation file preview"}
                                    className="max-h-[18rem] w-full object-contain sm:max-h-[32rem]"
                                  />
                                </div>
                              ) : (
                                <iframe
                                  title={liquidationPreviewTitle || "Liquidation Preview"}
                                  src={liquidationPreviewUrl}
                                  className="h-[18rem] w-full rounded-md border-0 bg-background sm:h-[32rem]"
                                  loading="eager"
                                />
                              )
                            ) : liquidationPreviewUrl ? (
                              <div className="space-y-3 p-2.5 text-sm text-muted-foreground">
                                <p>This uploaded file cannot be shown inline. You can open it in a new tab if needed.</p>
                                <Button type="button" variant="outline" onClick={() => window.open(liquidationPreviewUrl, "_blank", "noopener,noreferrer")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open File
                                </Button>
                              </div>
                            ) : (
                              <div className="grid min-h-[12rem] place-items-center rounded-md border border-dashed border-border/70 bg-muted/10 p-4 text-center text-sm text-muted-foreground">
                                {liquidationPreviewEmptyMessage || "No liquidation file was uploaded."}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
                            Preview hidden. Click "Show Preview" to review the uploaded file before acting.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
                        No attached liquidation files were submitted.
                      </div>
                    )}
                  </div>
                </PortalSection>
              </div>
            </div>
          );
        }
        return (
          <PortalSection title="Liquidation Reports" description="Review liquidation reports submitted after funded activities. Approve completed reports, request revisions, or flag overdue ones.">
            <div className="space-y-3">
              {visibleLiquidationReports.length ? (
                visibleLiquidationReports.map((record) => {
                  const linkedBudget = state.budgetRequests.find((item) => item.id === record.budgetRequestId) ?? null;
                  const liquidationOrg = state.organizationProfiles.find((item) => item.id === record.organizationId) ?? null;
                  const statusDotColor =
                    record.status === "approved_for_ftf_green" || record.status === "hard_copy_submitted" || record.status === "completed_liquidated"
                      ? "bg-emerald-500"
                      : record.status === "overdue" || record.status === "rejected_red"
                      ? "bg-rose-500"
                      : record.status === "pending_activity_completion" || record.status === "not_started" || record.status === "draft"
                      ? "bg-muted-foreground/40"
                      : "bg-amber-400";
                  return (
                    <Card key={record.id} className="border-border/70 shadow-sm">
                      <CardContent className="p-3 sm:p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-2.5">
                            <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotColor}`} />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground">{linkedBudget?.activityTitle ?? "Liquidation item"}</p>
                              <p className="mt-0.5 truncate text-sm text-foreground/70"><span className="text-muted-foreground">Organization:</span> {liquidationOrg?.organizationName ?? "Unknown organization"}</p>
                              {record.deadlineAt ? (
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  Deadline: {new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(record.deadlineAt))}
                                </p>
                              ) : null}
                            </div>
                          </div>
                          <PortalStatusBadge status={record.status} />
                        </div>
                        <div className="mt-3 flex justify-end">
                          <Button type="button" size="sm" onClick={() => openLiquidationDetails(record)}>
                            Review<ArrowRight className="ml-2 h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              ) : (
                <PortalEmptyState title="No liquidation records yet" description="Cash-released budgets create liquidation records automatically." />
              )}
            </div>
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
                  onClick={() => {
                    setNewsModalMode("create");
                    setEditingNewsReleaseId(null);
                    setNewsTitleDraft("");
                    setNewsDescriptionDraft("");
                    setNewsFacebookPostUrlDraft("");
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
                <div className="grid gap-4 md:grid-cols-2">
                  {newsReleases.map((news) => {
                    const dotColor =
                      news.visibilityStatus === "published"
                        ? "bg-emerald-500"
                        : news.visibilityStatus === "hidden"
                        ? "bg-rose-500"
                        : "bg-amber-400";
                    const formattedDate = news.datePosted
                      ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(news.datePosted))
                      : "—";
                    return (
                      <Card key={news.id} className="flex flex-col border-border/70 shadow-sm">
                        <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2">
                              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                              <p className="font-semibold leading-snug text-foreground">{news.title}</p>
                            </div>
                            <PortalStatusBadge status={news.visibilityStatus} />
                          </div>
                          <p className="line-clamp-2 pl-4 text-sm text-muted-foreground">{news.description}</p>
                          <div className="space-y-0.5 pl-4">
                            <p className="text-xs text-muted-foreground">Posted {formattedDate}</p>
                            {news.facebookPostUrl && (
                              <p className="max-w-full truncate text-xs text-muted-foreground/70">{news.facebookPostUrl}</p>
                            )}
                          </div>
                          <div className="mt-auto flex items-center justify-between pt-1">
                            <Button size="sm" variant="outline" onClick={() => navigate(`/admin/news-releases/${news.id}`)}>
                              <Eye className="mr-1.5 h-3.5 w-3.5" />
                              Preview
                            </Button>
                            <div className="flex items-center gap-1.5">
                              {news.visibilityStatus === "published" ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openAdminConfirmation({ kind: "news_release", action: "hide", id: news.id, title: news.title })}
                                >
                                  Hide
                                </Button>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
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
                  <div className="grid gap-4 md:grid-cols-2">
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
                  <Button type="button" variant="outline" onClick={resetNewsReleaseForm}>
                    Cancel
                  </Button>
                  <Button type="button" onClick={() => void handleSaveNewsRelease()} disabled={savingNewsRelease}>
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
            className="space-y-6"
          >
            <TabsList className="grid w-full max-w-xl grid-cols-2">
              <TabsTrigger value="overview">Monitoring Overview</TabsTrigger>
              <TabsTrigger value="barangay-allocation">Allocation by Barangay</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-0">
              <PortalSection
                title="Budget Monitoring"
                description="Approved budgets are monitored automatically after approval so release, utilization, and liquidation progress stay visible."
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" onClick={exportBudgetMonitoringReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </Button>
                    <Button type="button" onClick={() => navigate("/admin/budget-utilization")}>
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Review Budget Requests
                    </Button>
                  </div>
                }
              >
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <PortalMetricCard
                      label="Released Budgets"
                      value={budgetMonitoringEntries.length.toLocaleString()}
                      helper="Budget requests that have already been released."
                    />
                    <PortalMetricCard
                      label="Released Amount"
                      value={`PHP ${budgetMonitoringAnalysis.totalReleased.toLocaleString()}`}
                      helper="Total amount already released to organizations."
                    />
                    <PortalMetricCard
                      label="Remaining Amount"
                      value={`PHP ${budgetMonitoringAnalysis.totalRemaining.toLocaleString()}`}
                      helper="Approved amount still not released."
                    />
                    <PortalMetricCard
                      label="Utilization Rate"
                      value={`${budgetMonitoringAnalysis.utilizationRate}%`}
                      helper="Released amount as a share of approved funds."
                    />
                  </div>

                  <Card className="border-border/70">
                    <CardContent className="space-y-4 p-4 sm:p-5">
                      <div>
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Budget Health Snapshot</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {budgetMonitoringEntries.length} cash-released budget{budgetMonitoringEntries.length === 1 ? "" : "s"} under monitoring.
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-border/70 bg-card p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground/75">On Track</p>
                          </div>
                          <p className="mt-2 text-3xl font-bold text-foreground">{budgetMonitoringAnalysis.onTrackCount}</p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Needs Attention</p>
                          </div>
                          <p className="mt-2 text-3xl font-bold text-foreground">{budgetMonitoringAnalysis.needsAttentionCount}</p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-rose-500" />
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Overdue</p>
                          </div>
                          <p className="mt-2 text-3xl font-bold text-foreground">{budgetMonitoringAnalysis.overdueCount}</p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-card p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                            <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Completed</p>
                          </div>
                          <p className="mt-2 text-3xl font-bold text-foreground">{budgetMonitoringAnalysis.completedCount}</p>
                        </div>
                      </div>

                      <div className="h-52">
                        {budgetMonitoringChartData.some((d) => d.count > 0) ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={budgetMonitoringChartData} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                              <YAxis type="category" dataKey="riskLabel" width={120} tick={{ fontSize: 11 }} />
                              <Tooltip formatter={(value: number) => [String(value), "Count"]} />
                              <Bar dataKey="count" name="Count" fill="#2460A7" radius={[0, 6, 6, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border/70 bg-muted/10 text-sm text-muted-foreground">
                            No cash-released budgets yet.
                          </div>
                        )}
                      </div>

                    </CardContent>
                  </Card>

                  {budgetMonitoringAnalysis.insights.length ? (
                    <PortalSection title="Analysis Notes">
                      <ul className="space-y-2">
                        {budgetMonitoringAnalysis.insights.map((insight) => (
                          <li key={insight} className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/10 px-4 py-3 text-sm text-foreground">
                            <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary/60" />
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </PortalSection>
                  ) : null}

                  {budgetMonitoringEntries.length ? (
                    <div className="space-y-3">
                      {budgetMonitoringEntries.map((entry) => {
                        const entryDotColor =
                          entry.riskLabel === "Overdue"
                            ? "bg-rose-500"
                            : entry.riskLabel === "Completed"
                            ? "bg-emerald-500"
                            : entry.riskLabel === "On Track"
                            ? "bg-primary"
                            : "bg-amber-400";
                        return (
                          <Card key={entry.budgetRequestId} className="border-border/70 shadow-sm">
                            <CardContent className="p-4 sm:p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2.5">
                                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${entryDotColor}`} />
                                  <div className="min-w-0">
                                    <p className="font-semibold text-foreground">{entry.title}</p>
                                    <p className="mt-0.5 truncate text-sm text-muted-foreground">{entry.organizationName}</p>
                                  </div>
                                </div>
                                <div className="flex shrink-0 flex-wrap items-start justify-end gap-1.5">
                                  <span
                                    className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                      entry.riskLabel === "Overdue"
                                        ? "bg-destructive/15 text-destructive"
                                        : entry.riskLabel === "Completed"
                                        ? "bg-emerald-500/15 text-emerald-700"
                                        : entry.riskLabel === "On Track"
                                        ? "bg-primary/15 text-primary"
                                        : "bg-amber-400/15 text-amber-700"
                                    }`}
                                  >
                                    {entry.riskLabel}
                                  </span>
                                  <PortalStatusBadge status={entry.budgetStatus} />
                                </div>
                              </div>

                              <div className="mt-4 divide-y divide-border/40 border-t border-border/40 pt-4">
                                <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 first:pt-0">
                                  <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Approved Amount</p>
                                  <p className="text-sm font-medium">PHP {entry.approvedAmount.toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5">
                                  <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Released Amount</p>
                                  <p className="text-sm font-medium">PHP {entry.releasedAmount.toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5">
                                  <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Remaining</p>
                                  <p className="text-sm font-medium">PHP {entry.remainingAmount.toLocaleString()}</p>
                                </div>
                                <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5">
                                  <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                  <p className="text-sm font-medium">
                                    {entry.goSignalAt
                                      ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(entry.goSignalAt))
                                      : "Pending"}
                                  </p>
                                </div>
                                <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5">
                                  <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Deadline</p>
                                  <p className="text-sm font-medium">
                                    {entry.deadlineAt
                                      ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(entry.deadlineAt))
                                      : "Pending"}
                                  </p>
                                </div>
                                <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5">
                                  <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Hard Copy</p>
                                  <p className="text-sm font-medium">
                                    {entry.hardCopySubmittedAt
                                      ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(entry.hardCopySubmittedAt))
                                      : "Pending"}
                                  </p>
                                </div>
                                <div className="grid grid-cols-[11rem_1fr] gap-3 py-2.5 last:pb-0">
                                  <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Liquidation</p>
                                  <p className="text-sm font-medium">{formatStatusLabel(entry.liquidationStatus)}</p>
                                </div>
                              </div>

                              <div className="mt-4">
                                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground/75">
                                  <span className="uppercase tracking-[0.14em]">Release Progress</span>
                                  <span>{entry.utilizationRate}%</span>
                                </div>
                                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }} />
                                </div>
                              </div>

                              <div className="mt-4 flex justify-end">
                                <Button type="button" size="sm" variant="outline" onClick={() => navigate("/admin/budget-utilization")}>
                                  Open Budget Review<ArrowRight className="ml-2 h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <PortalEmptyState
                      title="No approved budgets yet"
                      description="Approved budget requests automatically appear here once the budget review marks them green."
                    />
                  )}
                </div>
              </PortalSection>
            </TabsContent>

            <TabsContent value="barangay-allocation" className="mt-0">
              {selectedBudgetAllocation ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedBudgetAllocation(null)}>
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Barangay Allocation
                    </Button>
                    <Button type="button" variant="outline" onClick={exportBudgetAllocationReport}>
                      <Download className="mr-2 h-4 w-4" />
                      Export Report
                    </Button>
                  </div>

                  <PortalSection
                    title={selectedBudgetAllocation.barangay}
                    description={`${selectedBudgetAllocation.district} · ${selectedBudgetAllocation.organizationCount} organization${selectedBudgetAllocation.organizationCount === 1 ? "" : "s"} · ${selectedBudgetAllocation.releasedBudgetCount} released budget${selectedBudgetAllocation.releasedBudgetCount === 1 ? "" : "s"}`}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <PortalMetricCard
                        label="Organizations"
                        value={selectedBudgetAllocation.organizationCount.toLocaleString()}
                        helper="Organizations with released budgets in this barangay."
                      />
                      <PortalMetricCard
                        label="Approved"
                        value={`PHP ${selectedBudgetAllocation.approvedAmount.toLocaleString()}`}
                        helper="Total approved amount across all released requests."
                      />
                      <PortalMetricCard
                        label="Released"
                        value={`PHP ${selectedBudgetAllocation.releasedAmount.toLocaleString()}`}
                        helper="Total cash already released to organizations."
                      />
                      <PortalMetricCard
                        label="Utilization"
                        value={`${selectedBudgetAllocation.utilizationRate}%`}
                        helper="Released versus approved amount."
                      />
                    </div>
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
                                <div className="space-y-2">
                                  {detail.requests.map((request) => (
                                    <div key={request.id} className="rounded-xl border border-border/70 bg-muted/10 p-4">
                                      <div className="flex items-start justify-between gap-3">
                                        <p className="text-sm font-semibold text-foreground">{request.activityTitle}</p>
                                        <PortalStatusBadge status={request.status} />
                                      </div>
                                      <div className="mt-3 divide-y divide-border/40 border-t border-border/40 pt-3">
                                        <div className="grid grid-cols-[11rem_1fr] gap-3 py-2 first:pt-0">
                                          <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                                          <p className="text-sm">PHP {request.approvedAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="grid grid-cols-[11rem_1fr] gap-3 py-2">
                                          <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Released</p>
                                          <p className="text-sm">PHP {request.releasedAmount.toLocaleString()}</p>
                                        </div>
                                        <div className="grid grid-cols-[11rem_1fr] gap-3 py-2">
                                          <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                          <p className="text-sm">
                                            {request.goSignalAt
                                              ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(request.goSignalAt))
                                              : "Pending"}
                                          </p>
                                        </div>
                                        <div className="grid grid-cols-[11rem_1fr] gap-3 py-2 last:pb-0">
                                          <p className="pt-0.5 text-xs uppercase tracking-[0.14em] text-muted-foreground/75">Hard Copy</p>
                                          <p className="text-sm">
                                            {request.hardCopySubmittedAt
                                              ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(request.hardCopySubmittedAt))
                                              : "Pending"}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
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
                    <Button type="button" variant="outline" onClick={exportBudgetAllocationReport}>
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
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/75">Active Barangays</p>
                      <p className="mt-1.5 text-xl font-bold text-foreground">{budgetAllocationSummary.barangayCount.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Barangays with released budgets</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/75">Released</p>
                      <p className="mt-1.5 text-xl font-bold text-foreground">PHP {budgetAllocationSummary.totalReleased.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Total cash released</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/75">Approved</p>
                      <p className="mt-1.5 text-xl font-bold text-foreground">PHP {budgetAllocationSummary.totalApproved.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Budget ceiling before release</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-3">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/75">Remaining</p>
                      <p className="mt-1.5 text-xl font-bold text-foreground">PHP {budgetAllocationSummary.totalRemaining.toLocaleString()}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Not yet released</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card px-3 py-3 sm:col-span-3 lg:col-span-1">
                      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/75">Utilization Rate</p>
                      <p className="mt-1.5 text-xl font-bold text-foreground">{budgetAllocationSummary.utilizationRate}%</p>
                      <p className="mt-1 text-xs text-muted-foreground">Released vs. approved</p>
                    </div>
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
            description="Manage downloadable document templates that organizations use during registration and compliance submissions."
            action={
              <Button
                type="button"
                onClick={() => {
                  setTemplateModalMode("create");
                  setEditingTemplateId(null);
                  setTemplateNameDraft("");
                  setTemplateDescriptionDraft("");
                  setTemplateFileDraft(null);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Document
              </Button>
            }
          >
            {templateDocuments.length === 0 ? (
              <PortalEmptyState
                title="No templates yet"
                description="Upload a document template for organizations to download."
              />
            ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {templateDocuments.map((template) => {
                const hasFile = Boolean(template.templateFileName);
                const dotColor = hasFile ? "bg-emerald-500" : "bg-amber-400";
                const uploadedDate = template.templateUploadedAt
                  ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(template.templateUploadedAt))
                  : null;
                return (
                  <Card key={template.id} className="flex flex-col border-border/70 shadow-sm">
                    <CardContent className="flex flex-1 flex-col gap-3 p-4 sm:p-5">
                      <div className="flex min-w-0 items-start gap-2">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                        <p className="font-semibold leading-snug text-foreground">{template.name}</p>
                      </div>
                      <p className="line-clamp-2 pl-4 text-sm text-muted-foreground">{template.description}</p>
                      <div className="space-y-0.5 pl-4">
                        {hasFile ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                              <p className="truncate text-xs text-muted-foreground">{template.templateFileName}</p>
                            </div>
                            {uploadedDate && (
                              <p className="text-xs text-muted-foreground/70">Uploaded {uploadedDate}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground/70">No file uploaded yet</p>
                        )}
                      </div>
                      <div className="mt-auto flex items-center justify-between pt-1">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
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
                              onClick={() => { setEditingTemplateId(template.id); setTemplateModalMode("delete"); }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            )}
            <Dialog open={templateModalMode === "create" || templateModalMode === "edit"} onOpenChange={(open) => (!open ? resetTemplateForm() : undefined)}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{templateModalMode === "edit" ? "Edit Template" : "Add Document Template"}</DialogTitle>
                  <DialogDescription>
                    {templateModalMode === "edit"
                      ? "Update the document information and replace the uploaded file if needed."
                      : "Create a new template record and upload the document file that users will access."}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
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
                  <Button type="button" variant="outline" onClick={resetTemplateForm}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
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
                  This removes the template from the active user-side document list.
                </p>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetTemplateForm}>
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
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
          const entryPeriod = state.ypopPeriods.find((p) => p.semesterKey === entry.semester);
          const periodTiers = entryPeriod?.orgLedTiers?.length ? entryPeriod.orgLedTiers : DEFAULT_ORG_LED_TIERS;
          const isTerminal = entry.status === "qualified" || entry.status === "not_qualified";
          const form = ypopValidationForm ?? {
            cityLedAttendance: entry.cityLedAttendance?.length
              ? entry.cityLedAttendance
              : semesterActivities.map((a) => ({ activityId: a.id, attended: false })),
            orgLedProjectCount: entry.orgLedProjectCount ?? 0,
            status: (entry.status === "draft" || entry.status === "submitted") ? "under_review" as YPOPStatus : entry.status,
            adminRemarks: entry.adminRemarks ?? "",
          };
          const { cityLedEarned, cityLedMax, orgLedBonus, totalScore } = computeYpopScore(
            form.cityLedAttendance, semesterActivities, form.orgLedProjectCount, periodTiers
          );
          const _sortedTiers = [...periodTiers].sort((a, b) => b.minProjects - a.minProjects);
          const _matchedTier = _sortedTiers.find((t) => form.orgLedProjectCount >= t.minProjects);
          const orgLedTierLabel = _matchedTier
            ? `≥ ${_matchedTier.minProjects} projects → +${_matchedTier.bonus} pts`
            : "0 projects → +0 pts";
          const qualifies = totalScore >= (entry.pointsRequired ?? 70);

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
                            <span className="text-xs text-muted-foreground">{cityLedEarned} / {cityLedMax} pts</span>
                          )}
                        </div>
                        {semesterActivities.length === 0 ? (
                          <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                            No city-led activities configured. Edit the semester to add activities.
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {semesterActivities.map((act: YPOPCityActivity) => {
                              const checked = form.cityLedAttendance.find((a) => a.activityId === act.id)?.attended ?? false;
                              return (
                                <label
                                  key={act.id}
                                  className={`flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                                    isTerminal ? "cursor-default opacity-70" : "hover:bg-muted/20"
                                  } ${checked ? "border-primary/30 bg-primary/5" : "border-border/50 bg-background"}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    disabled={isTerminal || savingYpopValidation}
                                    onChange={(e) => {
                                      const updated = form.cityLedAttendance.some((a) => a.activityId === act.id)
                                        ? form.cityLedAttendance.map((a) => a.activityId === act.id ? { ...a, attended: e.target.checked } : a)
                                        : [...form.cityLedAttendance, { activityId: act.id, attended: e.target.checked }];
                                      const newScore = computeYpopScore(updated, semesterActivities, form.orgLedProjectCount, periodTiers);
                                      setYpopValidationForm({
                                        ...form,
                                        cityLedAttendance: updated,
                                        status: newScore.totalScore >= (entry.pointsRequired ?? 70) ? "qualified" : "not_qualified",
                                      });
                                    }}
                                    className="mt-0.5 shrink-0 accent-primary"
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium leading-snug">{act.name}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">{act.date} · {act.venue}</p>
                                  </div>
                                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
                                    {act.points} pts
                                  </span>
                                </label>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Org-Led */}
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Organization-Led Activities</p>
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="space-y-1">
                            <label className="text-xs text-muted-foreground" htmlFor="ypop-org-led-count">Number of org-led projects</label>
                            <Input
                              id="ypop-org-led-count"
                              type="number"
                              min={0}
                              value={form.orgLedProjectCount}
                              onChange={(e) => {
                                const count = Math.max(0, Number(e.target.value || 0));
                                const newScore = computeYpopScore(form.cityLedAttendance, semesterActivities, count, periodTiers);
                                setYpopValidationForm({
                                  ...form,
                                  orgLedProjectCount: count,
                                  status: isTerminal ? form.status : (newScore.totalScore >= (entry.pointsRequired ?? 70) ? "qualified" : "not_qualified"),
                                });
                              }}
                              disabled={isTerminal || savingYpopValidation}
                              className="h-8 w-24 text-sm"
                            />
                          </div>
                          <div className="rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground">
                            {orgLedTierLabel}
                          </div>
                        </div>
                      </div>

                      {/* Score */}
                      <div className="rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold">Computed Score</p>
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${qualifies ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                            {qualifies ? "Qualifies ✓" : "Does Not Qualify"}
                          </span>
                        </div>
                        <div className="flex items-end gap-1">
                          <span className="text-2xl font-bold tabular-nums">{totalScore}</span>
                          <span className="mb-0.5 text-sm text-muted-foreground">/ 100</span>
                        </div>
                        <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted">
                          <div className={`h-full rounded-full transition-all ${totalScore >= 70 ? "bg-emerald-500" : "bg-amber-400"}`} style={{ width: `${Math.min(totalScore, 100)}%` }} />
                          <div className="absolute top-0 h-full w-px bg-foreground/30" style={{ left: "70%" }} />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>0</span><span className="font-medium">70 (threshold)</span><span>100</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-center text-xs">
                          <div className="rounded-md border border-border/50 bg-background py-1.5">
                            <p className="font-semibold">{cityLedEarned}/{cityLedMax}</p>
                            <p className="text-muted-foreground">City-Led pts</p>
                          </div>
                          <div className="rounded-md border border-border/50 bg-background py-1.5">
                            <p className="font-semibold">+{orgLedBonus}</p>
                            <p className="text-muted-foreground">Org-Led bonus</p>
                          </div>
                          <div className="rounded-md border border-border/50 bg-background py-1.5">
                            <p className="font-semibold">{totalScore}/100</p>
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
                          onClick={async () => {
                            setSavingYpopValidation(true);
                            try {
                              const now = new Date().toISOString();
                              const semActs = state.ypopCityActivities.filter((a) => a.semesterKey === entry.semester);
                              const { totalScore: computedScore } = computeYpopScore(form.cityLedAttendance, semActs, form.orgLedProjectCount, periodTiers);
                              const patch = {
                                pointsEarned: computedScore,
                                status: form.status,
                                adminRemarks: form.adminRemarks,
                                orgLedProjectCount: form.orgLedProjectCount,
                                cityLedAttendance: form.cityLedAttendance,
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
                              setSelectedYpopId(null);
                              setYpopValidationForm(null);
                              setYpopPreviewFileId(null);
                              setYpopAdminView("period-detail");
                            } finally {
                              setSavingYpopValidation(false);
                            }
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
                      <CardTitle className="text-sm font-semibold">Proof Documents ({entryFiles.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {entryFiles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No files attached to this submission.</p>
                      ) : (
                        <>
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
                              <div className="flex min-h-[32rem] items-center justify-center p-4 text-sm text-muted-foreground">
                                Select a file above to preview it here.
                              </div>
                            ) : ypopPreviewLoading ? (
                              <div className="flex min-h-[6rem] items-center justify-center p-4 text-sm text-muted-foreground">
                                Loading preview…
                              </div>
                            ) : ypopPreviewUrl && ypopPreviewCanInline ? (
                              isImagePreviewFile(ypopPreviewTitle) || isImagePreviewFile(ypopPreviewUrl) ? (
                                <div className="flex max-h-[52rem] items-center justify-center overflow-hidden bg-background sm:max-h-[60rem]">
                                  <img src={ypopPreviewUrl} alt={ypopPreviewTitle || "YPOP proof"} className="max-h-[52rem] w-full object-contain sm:max-h-[60rem]" />
                                </div>
                              ) : (
                                <iframe
                                  title={ypopPreviewTitle || "YPOP Proof Preview"}
                                  src={ypopPreviewUrl}
                                  className="h-[52rem] w-full border-0 bg-background sm:h-[60rem]"
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
                        </>
                      )}
                    </CardContent>
                  </Card>

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
                                  {new Date(rev.changedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
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
          const totalCityLedPts = periodActivities.reduce((s, a) => s + a.points, 0);
          const periodEntries = [...state.ypopEntries]
            .filter((e) => e.semester === period.semesterKey)
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          const filteredPeriodEntries =
            ypopSubmissionFilter === "all"
              ? periodEntries
              : periodEntries.filter((e) => e.status === ypopSubmissionFilter);
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
                    <p className="text-sm font-semibold">Organization Submissions <span className="font-normal text-muted-foreground">({periodEntries.length})</span></p>
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
                      description={ypopSubmissionFilter === "all" ? "No organizations have submitted entries for this semester." : "No submissions match this filter."}
                    />
                  ) : (
                    <div className="space-y-3">
                      {filteredPeriodEntries.map((entry) => {
                        const entryOrg = state.organizationProfiles.find((o) => o.id === entry.organizationId);
                        const entryFiles = state.ypopFiles.filter((f) => f.ypopEntryId === entry.id);
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
                                      <Medal className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                      <p className="font-semibold text-foreground">{entryOrg?.organizationName ?? "Unknown organization"}</p>
                                    </div>
                                    <p className="mt-0.5 text-xs text-muted-foreground/80">
                                      {isTerminal ? `${entry.pointsEarned}/${entry.totalPoints} pts` : "Awaiting validation"}
                                      {" · "}{entryFiles.length} file{entryFiles.length !== 1 ? "s" : ""}
                                    </p>
                                  </div>
                                </div>
                                <PortalStatusBadge status={entry.status} />
                              </div>
                              <div className="mt-4 flex justify-end">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isTerminal ? "outline" : "default"}
                                  onClick={() => {
                                    const semActs = state.ypopCityActivities.filter((a) => a.semesterKey === entry.semester);
                                    setSelectedYpopId(entry.id);
                                    setYpopPreviewFileId(null);
                                    setYpopValidationForm({
                                      cityLedAttendance: entry.cityLedAttendance?.length
                                        ? entry.cityLedAttendance
                                        : semActs.map((a) => ({ activityId: a.id, attended: false })),
                                      orgLedProjectCount: entry.orgLedProjectCount ?? 0,
                                      status: (entry.status === "draft" || entry.status === "submitted") ? "under_review" : entry.status,
                                      adminRemarks: entry.adminRemarks ?? "",
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

          const derivedSemesterKey = createPeriodForm.semesterLabel
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "");
          const canSubmit = createPeriodForm.semesterLabel.trim().length > 0 && createPeriodForm.validationDeadline.length > 0;

          const resetForm = () => {
            setCreatePeriodForm({ semesterLabel: "", validationDeadline: "", status: "draft" });
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
                      <label className="text-sm font-medium" htmlFor="cp-label">Semester Label <span className="text-destructive">*</span></label>
                      <Input
                        id="cp-label"
                        placeholder="e.g. 2026 Second Semester"
                        value={createPeriodForm.semesterLabel}
                        onChange={(e) => setCreatePeriodForm({ ...createPeriodForm, semesterLabel: e.target.value })}
                      />
                    </div>

                    {!isEditMode && (
                      <div className="space-y-2 sm:col-span-2">
                        <label className="text-sm font-medium" htmlFor="cp-key">Semester Key <span className="font-normal text-muted-foreground">(auto-derived, read-only)</span></label>
                        <Input id="cp-key" value={derivedSemesterKey || "—"} readOnly className="bg-muted/40 font-mono text-sm text-muted-foreground" />
                        <p className="text-xs text-muted-foreground">Used to link submissions and activities to this semester.</p>
                      </div>
                    )}

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
                        <p className="text-xs text-muted-foreground">Add activities with their point values. These are used to calculate the YPOP score.</p>
                      </div>
                      {!createFormNewActivity && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="shrink-0"
                          onClick={() => setCreateFormNewActivity({ name: "", date: "", venue: "", points: "0" })}
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
                              <div className="w-20 shrink-0 space-y-1">
                                <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Points</label>
                                <Input className="h-7 w-full text-xs" type="number" min={0} value={editingActivityData.points} onChange={(e) => setEditingActivityData({ ...editingActivityData, points: e.target.value })} />
                              </div>
                              <div className="flex shrink-0 items-end gap-1 pb-0.5">
                                <Button type="button" size="sm" className="h-7 px-2 text-xs" disabled={!editingActivityData.name.trim()} onClick={async () => { const patch = { name: editingActivityData.name.trim(), date: editingActivityData.date.trim(), venue: editingActivityData.venue.trim(), points: Math.max(0, Number(editingActivityData.points) || 0) }; try { const saved = await adminUpdateYpopCityActivityInSupabase(act.id, patch); updateYPOPCityActivity(saved.id, saved); } catch { updateYPOPCityActivity(act.id, patch); } setEditingActivityId(null); setEditingActivityData(null); }}>
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
                              <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{act.points} pts</span>
                              <Button type="button" size="sm" variant="ghost" className="h-7 w-7 shrink-0 p-0" onClick={() => { setEditingActivityId(act.id); setEditingActivityData({ name: act.name, date: act.date, venue: act.venue, points: String(act.points) }); }}>
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
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{act.points} pts</span>
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
                          <div className="w-20 shrink-0 space-y-1">
                            <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">Points</label>
                            <Input className="h-7 w-full text-xs" type="number" min={0} value={createFormNewActivity.points} onChange={(e) => setCreateFormNewActivity({ ...createFormNewActivity, points: e.target.value })} />
                          </div>
                          <div className="flex shrink-0 items-end gap-1 pb-0.5">
                            <Button
                              type="button"
                              size="sm"
                              className="h-7 px-2 text-xs"
                              disabled={!createFormNewActivity.name.trim()}
                              onClick={async () => {
                                if (isEditMode && editPeriod) {
                                  const actData = { semesterKey: editPeriod.semesterKey, name: createFormNewActivity.name.trim(), date: createFormNewActivity.date.trim(), venue: createFormNewActivity.venue.trim(), points: Math.max(0, Number(createFormNewActivity.points) || 0) };
                                  try {
                                    const saved = await adminCreateYpopCityActivityInSupabase(actData);
                                    createYPOPCityActivity({ ...saved });
                                  } catch {
                                    createYPOPCityActivity({ id: `ypop-act-${Date.now()}`, ...actData, createdAt: new Date().toISOString() });
                                  }
                                } else {
                                  setCreatePeriodActivities((prev) => [...prev, { tempId: `tmp-${Date.now()}`, name: createFormNewActivity.name.trim(), date: createFormNewActivity.date.trim(), venue: createFormNewActivity.venue.trim(), points: createFormNewActivity.points }]);
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
                          ? editActivities.reduce((s, a) => s + a.points, 0)
                          : createPeriodActivities.reduce((s, a) => s + Math.max(0, Number(a.points) || 0), 0);
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
                        <p className="text-sm font-semibold">Organization-Led Scoring</p>
                        <p className="text-xs text-muted-foreground">Configure how org-led project counts map to bonus points.</p>
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
                              <span className="shrink-0 text-sm text-muted-foreground">pts</span>
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
                            semesterLabel: createPeriodForm.semesterLabel.trim(),
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
                          toast({ title: "Semester updated", description: `${createPeriodForm.semesterLabel.trim()} has been saved.` });
                          resetForm();
                          setYpopAdminView("periods");
                        } else {
                          const now = new Date().toISOString();
                          const deadline = createPeriodForm.validationDeadline.includes("T")
                            ? createPeriodForm.validationDeadline
                            : `${createPeriodForm.validationDeadline}T00:00:00.000Z`;
                          const periodData = { semesterKey: derivedSemesterKey, semesterLabel: createPeriodForm.semesterLabel.trim(), validationDeadline: deadline, status: createPeriodForm.status, orgLedTiers: createPeriodOrgLedTiers };
                          let savedPeriodId: string;
                          try {
                            const saved = await adminCreateYpopPeriodInSupabase(periodData);
                            createYPOPPeriod({ ...saved });
                            savedPeriodId = saved.id;
                            for (let i = 0; i < createPeriodActivities.length; i++) {
                              const act = createPeriodActivities[i];
                              try {
                                const savedAct = await adminCreateYpopCityActivityInSupabase({ semesterKey: saved.semesterKey, name: act.name, date: act.date, venue: act.venue, points: Math.max(0, Number(act.points) || 0) });
                                createYPOPCityActivity({ ...savedAct });
                              } catch {
                                createYPOPCityActivity({ id: `ypop-act-${Date.now()}-${i}`, semesterKey: saved.semesterKey, name: act.name, date: act.date, venue: act.venue, points: Math.max(0, Number(act.points) || 0), createdAt: now });
                              }
                            }
                          } catch {
                            const newId = `ypop-period-${Date.now()}`;
                            createYPOPPeriod({ id: newId, ...periodData, createdAt: now, updatedAt: now });
                            createPeriodActivities.forEach((act, i) => {
                              createYPOPCityActivity({ id: `ypop-act-${Date.now()}-${i}`, semesterKey: derivedSemesterKey, name: act.name, date: act.date, venue: act.venue, points: Math.max(0, Number(act.points) || 0), createdAt: now });
                            });
                            savedPeriodId = newId;
                          }
                          toast({ title: "Semester created", description: `${createPeriodForm.semesterLabel.trim()} is ready.` });
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
            description="Manage YPOP semester registrations and review organization submissions."
            action={
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  setCreatePeriodForm({ semesterLabel: "", validationDeadline: "", status: "draft" });
                  setCreatePeriodActivities([]);
                  setCreateFormNewActivity(null);
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
    state.organizationProfiles,
    state.templates,
    state.transparencyPosts,
    selectedTemplate,
    templateDescriptionDraft,
    templateDocuments,
    templateFileDraft,
    templateNameDraft,
    templateModalMode,
    transparencyAttachmentUrlDraft,
    transparencyCategoryDraft,
    transparencyDescriptionDraft,
    transparencyModalMode,
    transparencyPostDateDraft,
    transparencyPosts,
    transparencyTitleDraft,
    transparencyVisibilityDraft,
    openAdminConfirmation,
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
    state.ypopEntries,
    state.ypopFiles,
    state.ypopCityActivities,
    state.ypopPeriods,
    updateYPOPEntry,
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
    </>
  );
}

function BadgePanel({ count }: { count: number }) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-sm">
      <Bell className="h-4 w-4" />
      <span>{count} unread</span>
    </div>
  );
}
