import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ArrowLeft, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Download, Eye, FileText, Pencil, Plus, Save, Trash2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { PortalEmptyState, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { PortalShell } from "@/components/portal/PortalShell";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { adminNavigationGroups as baseAdminNavigationGroups, type NewsRelease, type TransparencyPost } from "@/lib/lydo-connect-data";
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
} from "@/lib/lydo-connect-supabase";

const routeMap: Record<string, string> = {
  overview: "/admin",
  registrations: "/admin/registrations",
  users: "/admin/users",
  "budget-utilization": "/admin/budget-utilization",
  "liquidation-monitoring": "/admin/liquidation-monitoring",
  "news-releases": "/admin/news-releases",
  "budget-monitoring": "/admin/budget-monitoring",
  templates: "/admin/templates",
  notifications: "/admin/notifications",
  "activity-logs": "/admin/activity-logs",
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
  const { state, mergeRemoteState, createTemplate, removeTemplate, createNewsRelease, removeNewsRelease, updateNewsRelease, updateTransparencyPost, updateComplianceRemark, updateTemplate, createNotification, markNotificationRead } =
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
  const [expandedUserIds, setExpandedUserIds] = useState<string[]>([]);
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
        const goSignalAt = liquidation?.goSignalAt || request.goSignalAt || "Pending";
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
          deadlineAt: liquidation?.deadlineAt || "Pending",
          hardCopySubmittedAt: liquidation?.hardCopySubmittedAt || "Pending",
          completedAt: liquidation?.completedAt || "Pending",
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

  const toggleUserCard = (organizationId: string) => {
    setExpandedUserIds((current) =>
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

        if (pendingAdminConfirmation.action === "approve") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "approved_for_ftf_green",
            approvedAmount,
            goSignalAt: new Date().toISOString(),
          });
        } else if (pendingAdminConfirmation.action === "submitted_hardcopy") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "hard_copy_submitted",
            hardCopySubmittedAt: new Date().toISOString(),
          });
        } else if (pendingAdminConfirmation.action === "cash_released") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "budget_released",
            releasedAmount: approvedAmount,
            releaseDate: getManilaDateIso(),
          });
        } else if (pendingAdminConfirmation.action === "needs_revision") {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "needs_revision",
            remarks: adminRemarks,
          });
        } else {
          await updateBudgetRequestInSupabase(pendingAdminConfirmation.budgetRequestId, {
            status: "rejected_red",
            remarks: adminRemarks,
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
      case "overview":
        return (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <PortalMetricCard
                label="Registered Organizations"
                value={overviewStats.organizations}
                helper="Open the registrations list."
                onClick={() => navigate(routeMap.registrations)}
              />
              <PortalMetricCard
                label="Pending Profiles"
                value={overviewStats.pendingProfiles}
                helper="Review incomplete and pending registrations."
                onClick={() => navigate(routeMap.registrations)}
              />
              <PortalMetricCard
                label="Pending Documents"
                value={overviewStats.pendingDocuments}
                helper="Jump to document validation."
                onClick={() => navigate(routeMap.registrations)}
              />
              <PortalMetricCard
                label="Overdue Liquidations"
                value={overviewStats.overdueLiquidation}
                helper="Open liquidation monitoring."
                onClick={() => navigate(routeMap["liquidation-monitoring"])}
              />
            </div>
            <PortalSection title="Operational Summary" description="Everything the admin side needs to monitor at a glance.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <PortalMetricCard
                  label="Document Revisions"
                  value={overviewStats.revisions}
                  helper="Review corrected submissions."
                  onClick={() => navigate(routeMap.registrations)}
                />
                <PortalMetricCard
                  label="Approved Documents"
                  value={overviewStats.approvedDocs}
                  helper="See verified document sets."
                  onClick={() => navigate(routeMap.registrations)}
                />
                <PortalMetricCard
                  label="Budget Go Signals"
                  value={overviewStats.approvedBudget}
                  helper="Open budget utilization."
                  onClick={() => navigate(routeMap["budget-utilization"])}
                />
                <PortalMetricCard
                  label="Budget Released"
                  value={overviewStats.releasedBudget}
                  helper="Track released budget activity."
                  onClick={() => navigate(routeMap["budget-utilization"])}
                />
                <PortalMetricCard
                  label="Pending Liquidation"
                  value={overviewStats.pendingLiquidation}
                  helper="Inspect liquidation status."
                  onClick={() => navigate(routeMap["liquidation-monitoring"])}
                />
                <PortalMetricCard
                  label="Non-compliant Orgs"
                  value={overviewStats.nonCompliant}
                  helper="Review inactive organizations."
                  onClick={() => navigate(routeMap.users)}
                />
              </div>
            </PortalSection>
            <PortalSection title="Recent Activity" description="Latest activity log entries and unread notifications.">
              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  {state.activityLogs.slice(0, 4).map((log) => (
                    <div key={log.id} className="rounded-xl border border-border/70 bg-background p-4 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{log.action}</p>
                        <PortalStatusBadge status="under_review" />
                      </div>
                      <p className="mt-1 text-muted-foreground">{log.description}</p>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  {state.notifications.slice(0, 4).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-xl border border-border/70 bg-background p-4 text-left text-sm transition-colors hover:bg-muted/40"
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{notification.title}</p>
                        <PortalStatusBadge status={notification.isRead ? "verified" : "pending_review"} />
                      </div>
                      <p className="mt-1 text-muted-foreground">{notification.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            </PortalSection>
          </div>
        );
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
              <PortalSection
                title={selectedOrg.organizationName}
                description="Registration details and submitted documents for validation."
                action={<PortalStatusBadge status={selectedOrg.profileStatus} />}
              >
                <div className="mb-6 rounded-2xl border border-border/70 bg-muted/20 p-4 sm:p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                      <Button size="sm" variant="outline" onClick={() => setSelectedRegistrationId(null)} className="w-full sm:w-auto">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to registrations
                      </Button>
                      {selectedOrg.profileStatus === "verified" && selectedOrg.verifiedAt ? (
                        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          VERIFIED ON {formatVerifiedDateLabel(selectedOrg.verifiedAt)}
                        </div>
                      ) : selectedOrg.profileStatus === "needs_update" ? (
                        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">
                          Needs update
                        </div>
                      ) : (
                        <div className="rounded-xl border border-dashed border-border/80 bg-background px-4 py-2 text-sm text-muted-foreground">
                          Pending verification
                        </div>
                      )}
                    </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="inline-flex items-center rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground">
                        {selectedOrg.isExistingOrganization ? "Existing org" : "New org"}
                        {selectedOrg.isExistingOrganization ? ` · ${selectedOrg.organizationIdentifierNumber || "No ID"}` : ""}
                      </div>
                      <div className="inline-flex items-center rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
                        {approvedDocumentCount}/{templateDocuments.length} approved
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
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
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full sm:w-auto"
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
                  <p className="mt-3 text-sm text-muted-foreground">
                    {canVerifyWithoutDocuments
                      ? "This organization is marked as existing, so verification can proceed after the identifier number is validated."
                      : `Verification is available only after all ${templateDocuments.length} submitted documents are marked approved.`}
                  </p>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]">
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Organization Contact</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        {renderRegistrationDetailCard({ title: "Email", value: selectedOrg.organizationEmail })}
                        {renderRegistrationDetailCard({ title: "Contact Number", value: selectedOrg.contactNumber })}
                        {renderRegistrationDetailCard({ title: "Barangay", value: selectedOrg.barangay })}
                        {renderRegistrationDetailCard({
                          title: "Facebook Page",
                          value: selectedOrg.facebookPageUrl || "N/A",
                          wrap: true,
                          linkHref: selectedOrg.facebookPageUrl || undefined,
                        })}
                        {renderRegistrationDetailCard({
                          title: "Address",
                          value: selectedOrg.address || "N/A",
                          className: "md:col-span-2",
                          wrap: true,
                        })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Classification</p>
                      <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {renderRegistrationDetailCard({ title: "Major Classification", value: selectedOrg.majorClassification || "N/A" })}
                        {renderRegistrationDetailCard({ title: "Sub Classification", value: selectedOrg.subClassification || "N/A" })}
                        {renderRegistrationDetailCard({
                          title: "Date of Creation",
                          value: selectedOrg.verifiedAt ? formatVerifiedDateLabel(selectedOrg.verifiedAt) : "Pending verification",
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Leadership</p>
                      <div className="mt-4 grid gap-4">
                        {renderRegistrationDetailCard({ title: "Representative", value: selectedOrg.representativeName || "N/A" })}
                        {renderRegistrationDetailCard({ title: "Adviser", value: selectedOrg.adviserName || "N/A" })}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Advocacies</p>
                      <div className="mt-4 rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                        {renderAdvocacyChips(selectedOrg.advocacies)}
                      </div>
                    </div>
                  </div>
                </div>
              </PortalSection>

              <PortalSection
                title="Submitted Documents"
                description={`${selectedFiles.length}/${templateDocuments.length} files submitted from the organization user side.`}
              >
                {selectedSubmission ? (
                  <div className="space-y-3">
                    {templateDocuments.map((documentType) => {
                      const file = selectedFiles.find((entry) => entry.documentTypeId === documentType.id);
                      const previewUrl = file ? documentPreviewUrls[file.id] ?? "" : "";
                      const isExpanded = file ? expandedDocumentFileIds.includes(file.id) : false;
                      return (
                        <Card key={documentType.id} className="border-border/70">
                          <CardHeader className="pb-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div className="space-y-2">
                                <div className="flex flex-wrap items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <CardTitle className="text-base">{documentType.name}</CardTitle>
                                </div>
                                <p className="text-sm text-muted-foreground">{file?.fileName ?? "No file submitted yet."}</p>
                                {file ? (
                                  <div className="flex flex-wrap items-center gap-2">
                                    <PortalStatusBadge status={file.adminStatus ?? "submitted"} />
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex flex-col gap-2 sm:flex-row">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="w-full sm:w-auto"
                                  disabled={!file}
                                  onClick={() => file && toggleDocumentCard(file.id)}
                                >
                                  {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                                  {isExpanded ? "Hide details" : "Show details"}
                                </Button>
                              </div>
                            </div>
                          </CardHeader>
                          {isExpanded ? (
                            <CardContent className="space-y-4 border-t border-border/70 pt-4">
                              {file ? (
                                <>
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
                                    <div className="space-y-4">
                                      <div className="rounded-xl border border-border/70 bg-background p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                          <div className="min-w-0">
                                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Admin Comment</p>
                                            <p className="mt-1 text-sm text-muted-foreground">
                                              Add a note only when the submission needs revision or is rejected.
                                            </p>
                                          </div>
                                          <span className="inline-flex w-fit max-w-full items-center rounded-lg border border-border/70 bg-muted/40 px-3 py-1.5 text-xs leading-tight text-muted-foreground sm:ml-auto sm:text-right">
                                            Comment required for revision or rejection
                                          </span>
                                        </div>
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
                                          className="mt-3 min-h-32"
                                        />
                                        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
                                </>
                              ) : (
                                <div className="grid min-h-[12rem] place-items-center rounded-xl border border-dashed border-border/70 bg-muted/20 p-6 text-center text-sm text-muted-foreground">
                                  No uploaded file submitted yet for this requirement.
                                </div>
                              )}
                            </CardContent>
                          ) : null}
                        </Card>
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
            title="Registrations"
            description="Use the dropdown to inspect card details, then open the full review page when needed."
            action={state.organizationProfiles.length ? <PortalStatusBadge status="pending_review" /> : null}
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
                  const isExpanded = expandedRegistrationIds.includes(org.id);
                  return (
                    <Card key={org.id} className="border-border/70 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-base">{org.organizationName}</CardTitle>
                            <p className="text-sm text-muted-foreground">{org.organizationEmail}</p>
                            <p className="text-sm text-muted-foreground">
                              Documents submitted: {submittedCount}/{templateDocuments.length}
                            </p>
                          </div>
                          <div className="flex flex-col gap-2 sm:items-end">
                            <PortalStatusBadge status={org.profileStatus} />
                            <div className="flex flex-col gap-2 sm:flex-row">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
                                onClick={() => toggleRegistrationCard(org.id)}
                              >
                                {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                                {isExpanded ? "Hide details" : "Show details"}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => setSelectedRegistrationId(org.id)}
                              >
                                Review
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      {isExpanded ? (
                        <CardContent className="space-y-4 border-t border-border/70 pt-4 text-sm text-muted-foreground">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Contact Number</p>
                              <p className="mt-1 font-medium text-foreground">{org.contactNumber}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Barangay</p>
                              <p className="mt-1 font-medium text-foreground">{org.barangay}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Major Classification</p>
                              <p className="mt-1 font-medium text-foreground">{org.majorClassification || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Sub Classification</p>
                              <p className="mt-1 font-medium text-foreground">{org.subClassification || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Representative</p>
                              <p className="mt-1 font-medium text-foreground">{org.representativeName || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Adviser</p>
                              <p className="mt-1 font-medium text-foreground">{org.adviserName || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:col-span-2">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Facebook</p>
                              <p className="mt-1 break-all font-medium text-foreground">{org.facebookPageUrl || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:col-span-2">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Date of Creation</p>
                              <p className="mt-1 font-medium text-foreground">
                                {org.verifiedAt ? formatVerifiedDateLabel(org.verifiedAt) : "Pending verification"}
                              </p>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Advocacies</p>
                            <div className="mt-2">{renderAdvocacyChips(org.advocacies)}</div>
                          </div>
                        </CardContent>
                      ) : null}
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
      case "users":
        return (
          <PortalSection title="Users" description="Linked accounts and access levels.">
            {state.organizationProfiles.length ? (
              <div className="space-y-3">
                {state.organizationProfiles.map((organization) => {
                  const isExpanded = expandedUserIds.includes(organization.id);
                  return (
                    <Card key={organization.id} className="border-border/70 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="space-y-1">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Name / Email</p>
                            <CardTitle className="text-base">{organization.organizationName}</CardTitle>
                            <p className="text-sm text-muted-foreground">{organization.organizationEmail}</p>
                          </div>
                          <div className="flex flex-col gap-2 sm:items-end">
                            <div>
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Role</p>
                              <p className="mt-1 font-medium text-foreground">Organization User</p>
                            </div>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="w-full sm:w-auto"
                              onClick={() => toggleUserCard(organization.id)}
                            >
                              {isExpanded ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
                              {isExpanded ? "Hide details" : "Show details"}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      {isExpanded ? (
                        <CardContent className="space-y-4 border-t border-border/70 pt-4 text-sm text-muted-foreground">
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Contact Number</p>
                              <p className="mt-1 font-medium text-foreground">{organization.contactNumber}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Barangay</p>
                              <p className="mt-1 font-medium text-foreground">{organization.barangay}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Representative</p>
                              <p className="mt-1 font-medium text-foreground">{organization.representativeName || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Adviser</p>
                              <p className="mt-1 font-medium text-foreground">{organization.adviserName || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:col-span-2">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Address</p>
                              <p className="mt-1 font-medium text-foreground">{organization.address || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:col-span-2">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Facebook</p>
                              <p className="mt-1 break-all font-medium text-foreground">{organization.facebookPageUrl || "N/A"}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 sm:col-span-2">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Date of Creation</p>
                              <p className="mt-1 font-medium text-foreground">
                                {organization.verifiedAt ? formatVerifiedDateLabel(organization.verifiedAt) : "Pending verification"}
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      ) : null}
                    </Card>
                  );
                })}
              </div>
            ) : (
              <PortalEmptyState
                title="No users yet"
                description="Linked organization accounts will appear here after users register and save their organization profiles."
              />
            )}
          </PortalSection>
        );
      case "budget-utilization":
        return (
          <>
            <PortalSection title="Budget Utilization" description="Budget request review and go-signal control.">
              <div className="grid gap-4">
                {state.budgetRequests.length ? (
                  state.budgetRequests.map((request) => {
                    const requestOrganization = state.organizationProfiles.find((org) => org.id === request.organizationId) ?? null;
                    const requestFiles = state.budgetRequestFiles
                      .filter((file) => file.budgetRequestId === request.id)
                      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());

                    return (
                      <Card key={request.id} className="border-border/70">
                        <CardContent className="grid gap-4 p-4 md:grid-cols-[1.6fr_0.9fr]">
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="font-medium">{request.activityTitle}</p>
                                <p className="text-sm text-muted-foreground">{request.activityDescription || "No description provided."}</p>
                              </div>
                              <PortalStatusBadge status={request.status} />
                            </div>
                            <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                              <p>Organization: {requestOrganization?.organizationName ?? "Unknown organization"}</p>
                              <p>Requested: PHP {request.requestedAmount.toLocaleString()}</p>
                              <p>Venue: {request.venue}</p>
                              <p>Attached files: {requestFiles.length}</p>
                            </div>
                            <p className="text-sm text-muted-foreground">Remarks: {request.remarks || "None"}</p>
                          </div>
                          <div className="flex items-start justify-end">
                            <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => openBudgetRequestDetails(request.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
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

            <Dialog open={selectedBudgetRequest !== null} onOpenChange={(open) => { if (!open) closeBudgetRequestDetails(); }}>
              <DialogContent className="h-[100dvh] w-[calc(100vw-1rem)] max-w-none overflow-hidden rounded-none border-0 p-0 sm:h-[92dvh] sm:w-[min(96vw,96rem)] sm:max-w-none sm:rounded-2xl sm:border">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-border/70 px-4 pb-2 pt-4 sm:px-6 sm:pb-4 sm:pt-6">
                    <DialogHeader className="text-left sm:text-left">
                      <DialogTitle className="text-lg leading-tight sm:text-2xl">
                        {selectedBudgetRequest?.activityTitle ?? "Budget Request Details"}
                      </DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm sm:text-base">
                        Review organization details and attached files before updating the request status.
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
                    {selectedBudgetRequest ? (
                      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                        <div className="space-y-4">
                          <div className="hidden rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Organization Details</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              {renderRegistrationDetailCard({
                                title: "Organization Name",
                                value: selectedBudgetOrganization?.organizationName ?? "N/A",
                                className: "sm:col-span-2",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Organization Email",
                                value: selectedBudgetOrganization?.organizationEmail ?? "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Contact Number",
                                value: selectedBudgetOrganization?.contactNumber ?? "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Barangay",
                                value: selectedBudgetOrganization?.barangay ?? "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "District",
                                value: selectedBudgetOrganization?.district || "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Submitted By",
                                value: selectedBudgetRequest.submittedBy,
                                wrap: true,
                                className: "sm:col-span-2",
                              })}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Request Details</p>
                            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                              {renderRegistrationDetailCard({ title: "Requested Amount", value: `PHP ${selectedBudgetRequest.requestedAmount.toLocaleString()}` })}
                              {renderRegistrationDetailCard({
                                title: "Approved Amount",
                                value: `PHP ${selectedBudgetRequest.approvedAmount.toLocaleString()}`,
                              })}
                              {renderRegistrationDetailCard({
                                title: "Released Amount",
                                value: `PHP ${selectedBudgetRequest.releasedAmount.toLocaleString()}`,
                              })}
                              {renderRegistrationDetailCard({
                                title: "Activity Date",
                                value: selectedBudgetRequest.activityDate || "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Venue",
                                value: selectedBudgetRequest.venue,
                                wrap: true,
                                className: "sm:col-span-2",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Purpose Category",
                                value: selectedBudgetRequest.purposeCategory || "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Go Signal",
                                value: selectedBudgetRequest.goSignalAt || "Pending",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Hard Copy Submitted",
                                value: selectedBudgetRequest.hardCopySubmittedAt || "Pending",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Release Date",
                                value: selectedBudgetRequest.releaseDate || "Pending",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Remarks",
                                value: selectedBudgetRequest.remarks || "None",
                                wrap: true,
                                className: "sm:col-span-2",
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Attached Files</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {selectedBudgetRequestFiles.length
                                    ? `${selectedBudgetRequestFiles.length} file${selectedBudgetRequestFiles.length === 1 ? "" : "s"} uploaded.`
                                    : "No attached files were uploaded for this request."}
                                </p>
                              </div>
                              <div className="self-start">
                                <PortalStatusBadge status={selectedBudgetRequest.status} />
                              </div>
                            </div>

                            {selectedBudgetRequestFiles.length ? (
                              <div className="mt-4 space-y-3">
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
                              <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
                                No attached budget request files were submitted.
                              </div>
                            )}
                          </div>

                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-4 sm:p-5">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Status Controls</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <span>Current status:</span>
                              <PortalStatusBadge status={selectedBudgetRequest.status} />
                            </div>
                            <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
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
                                className="w-full sm:w-auto"
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
                                className="w-full sm:w-auto"
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
                                className="w-full sm:w-auto"
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
                                className="w-full sm:w-auto"
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
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-border/70 px-4 py-4 sm:px-6">
                    <DialogFooter>
                      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeBudgetRequestDetails}>
                        Close
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog open={liquidationDetailsOpen} onOpenChange={(open) => { if (!open) closeLiquidationDetails(); }}>
              <DialogContent className="h-[100dvh] w-[calc(100vw-1rem)] max-w-none overflow-hidden rounded-none border-0 p-0 sm:h-[92dvh] sm:w-[min(96vw,96rem)] sm:max-w-none sm:rounded-2xl sm:border">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-border/70 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
                    <DialogHeader className="text-left sm:text-left">
                      <DialogTitle className="text-xl leading-tight sm:text-2xl">
                        {selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation Details"}
                      </DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm sm:text-base">
                        Review the liquidation record, attached files, and linked budget request before updating its status.
                      </DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 sm:px-6 sm:py-6">
                    {selectedLiquidationReport ? (
                      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
                        <div className="space-y-3">
                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-3 sm:p-5">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Organization Details</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {renderRegistrationDetailCard({
                                title: "Organization Name",
                                value: selectedLiquidationOrganization?.organizationName ?? "N/A",
                                className: "sm:col-span-2",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Organization Email",
                                value: selectedLiquidationOrganization?.organizationEmail ?? "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Contact Number",
                                value: selectedLiquidationOrganization?.contactNumber ?? "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Barangay",
                                value: selectedLiquidationOrganization?.barangay ?? "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "District",
                                value: selectedLiquidationOrganization?.district || "N/A",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Submitted By",
                                value: selectedLiquidationReport.submittedBy,
                                wrap: true,
                                className: "sm:col-span-2",
                              })}
                            </div>
                          </div>

                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-3 sm:p-5">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Liquidation Details</p>
                            <div className="mt-3 grid gap-3 sm:grid-cols-2">
                              {renderRegistrationDetailCard({
                                title: "Linked Budget Request",
                                value: selectedLiquidationBudgetRequest?.activityTitle ?? "N/A",
                                wrap: true,
                                className: "sm:col-span-2",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Go Signal",
                                value: selectedLiquidationReport.goSignalAt || "Pending",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Deadline",
                                value: selectedLiquidationReport.deadlineAt || "Pending",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Hard Copy Submitted",
                                value: selectedLiquidationReport.hardCopySubmittedAt || "Pending",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Completed At",
                                value: selectedLiquidationReport.completedAt || "Pending",
                              })}
                              {renderRegistrationDetailCard({
                                title: "Remarks",
                                value: selectedLiquidationReport.remarks || "None",
                                wrap: true,
                                className: "sm:col-span-2",
                              })}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-3 sm:p-5">
                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Status Controls</p>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                              <span>Current status:</span>
                              <PortalStatusBadge status={selectedLiquidationReport.status} />
                            </div>
                            <div className="mt-3 grid gap-2 sm:flex sm:flex-wrap">
                              <Button
                                size="sm"
                                variant="outline"
                                className="w-full sm:w-auto"
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
                                className="w-full sm:w-auto"
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
                                className="w-full sm:w-auto"
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

                          <div className="rounded-2xl border border-border/70 bg-muted/15 p-3 sm:p-5">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Attached Files</p>
                                <p className="mt-1.5 text-sm text-muted-foreground">
                                  {selectedLiquidationReportFiles.length
                                    ? `${selectedLiquidationReportFiles.length} file${selectedLiquidationReportFiles.length === 1 ? "" : "s"} uploaded.`
                                    : "No attached files were uploaded for this liquidation report."}
                                </p>
                              </div>
                              <div className="self-start">
                                <PortalStatusBadge status={selectedLiquidationReport.status} />
                              </div>
                            </div>

                            {selectedLiquidationReportFiles.length ? (
                              <div className="mt-3 space-y-3">
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
                                    Preview hidden on mobile. Open it to review the uploaded file before acting.
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="mt-3 rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                                No attached liquidation files were submitted.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="border-t border-border/70 px-4 py-3 sm:px-6 sm:py-4">
                    <DialogFooter>
                      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={closeLiquidationDetails}>
                        Close
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            <Dialog
              open={selectedBudgetAllocation !== null}
              onOpenChange={(open) => {
                if (!open) setSelectedBudgetAllocation(null);
              }}
            >
              <DialogContent className="h-[100dvh] w-[calc(100vw-1rem)] max-w-none overflow-hidden rounded-none border-0 p-0 sm:h-[92dvh] sm:w-[min(96vw,96rem)] sm:max-w-none sm:rounded-2xl sm:border">
                <div className="flex h-full min-h-0 flex-col">
                  <div className="border-b border-border/70 px-4 pb-3 pt-5 sm:px-6 sm:pb-4 sm:pt-6">
                    <DialogHeader className="text-left sm:text-left">
                      <DialogTitle className="text-xl leading-tight sm:text-2xl">
                        {selectedBudgetAllocation?.barangay ?? "Barangay Allocation Details"}
                      </DialogTitle>
                      <DialogDescription className="max-w-2xl text-sm sm:text-base">
                        Allocation breakdown for {selectedBudgetAllocation?.district ?? "the selected district"}.
                      </DialogDescription>
                    </DialogHeader>
                    {selectedBudgetAllocation ? (
                      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        <PortalMetricCard
                          label="Organizations"
                          value={selectedBudgetAllocation.organizationCount.toLocaleString()}
                          helper="Organizations with released budgets in this barangay."
                        />
                        <PortalMetricCard
                          label="Approved Allocation"
                          value={`PHP ${selectedBudgetAllocation.approvedAmount.toLocaleString()}`}
                          helper="Total approved amount across all released requests."
                        />
                        <PortalMetricCard
                          label="Released Allocation"
                          value={`PHP ${selectedBudgetAllocation.releasedAmount.toLocaleString()}`}
                          helper="Cash already released to organizations."
                        />
                        <PortalMetricCard
                          label="Utilization Rate"
                          value={`${selectedBudgetAllocation.utilizationRate}%`}
                          helper="Released versus approved amount."
                        />
                      </div>
                    ) : null}
                  </div>

                  <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
                    {selectedBudgetAllocationOrganizationDetails.length ? (
                      <div className="space-y-4">
                        {selectedBudgetAllocationOrganizationDetails.map((detail) => (
                          <Card key={detail.organizationId} className="border-border/70">
                            <CardContent className="space-y-4 p-4 sm:p-5">
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">{detail.district}</p>
                                  <h3 className="mt-1 text-lg font-semibold text-foreground">{detail.organizationName}</h3>
                                  <p className="text-sm text-muted-foreground">{detail.barangay}</p>
                                </div>
                                <div className="rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-xs font-medium text-primary">
                                  {detail.releasedBudgetCount} released budget{detail.releasedBudgetCount === 1 ? "" : "s"}
                                </div>
                              </div>

                              <div className="grid gap-3 md:grid-cols-4">
                                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Approved</p>
                                  <p className="mt-1 font-semibold text-foreground">PHP {detail.approvedAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Released</p>
                                  <p className="mt-1 font-semibold text-foreground">PHP {detail.releasedAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Remaining</p>
                                  <p className="mt-1 font-semibold text-foreground">PHP {detail.remainingAmount.toLocaleString()}</p>
                                </div>
                                <div className="rounded-xl border border-border/70 bg-muted/10 p-3">
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Utilization</p>
                                  <p className="mt-1 font-semibold text-foreground">{detail.utilizationRate}%</p>
                                </div>
                              </div>

                              <div className="space-y-3">
                                <p className="text-sm font-medium text-foreground">Released Requests</p>
                                <div className="space-y-3">
                                  {detail.requests.map((request) => (
                                    <div key={request.id} className="rounded-2xl border border-border/70 bg-background p-4">
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                                        <div>
                                          <p className="text-sm font-semibold text-foreground">{request.activityTitle}</p>
                                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">
                                            {request.activityDate || "No activity date"} · Released {request.releaseDate || "Pending"}
                                          </p>
                                        </div>
                                        <PortalStatusBadge status={request.status} />
                                      </div>
                                      <div className="mt-3 grid gap-2 text-sm text-muted-foreground md:grid-cols-4">
                                        <p>Approved: PHP {request.approvedAmount.toLocaleString()}</p>
                                        <p>Released: PHP {request.releasedAmount.toLocaleString()}</p>
                                        <p>Remaining: PHP {request.remainingAmount.toLocaleString()}</p>
                                        <p>Go signal: {request.goSignalAt || "Pending"}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
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

                  <div className="border-t border-border/70 px-4 py-3 sm:px-6 sm:py-4">
                    <DialogFooter>
                      <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setSelectedBudgetAllocation(null)}>
                        Close
                      </Button>
                    </DialogFooter>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </>
        );
      case "liquidation-monitoring":
        return (
          <PortalSection title="Liquidation Monitoring" description="Track deadlines and go-signal dates.">
            <div className="grid gap-4">
              {visibleLiquidationReports.length ? (
                visibleLiquidationReports.map((record) => (
                  <Card key={record.id} className="border-border/70">
                    <CardContent className="grid gap-4 p-4 md:grid-cols-[1.6fr_0.9fr]">
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium">
                              {state.budgetRequests.find((item) => item.id === record.budgetRequestId)?.activityTitle ?? "Liquidation item"}
                            </p>
                            <p className="text-sm text-muted-foreground">Go signal: {record.goSignalAt || "Pending"}</p>
                          </div>
                          <PortalStatusBadge status={record.status} />
                        </div>
                        <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                          <p>Organization: {state.organizationProfiles.find((item) => item.id === record.organizationId)?.organizationName ?? "Unknown organization"}</p>
                          <p>Attached files: {state.liquidationReportFiles.filter((file) => file.liquidationReportId === record.id).length}</p>
                          <p>Deadline: {record.deadlineAt || "Pending"}</p>
                          <p>Hard copy submitted: {record.hardCopySubmittedAt || "Pending"}</p>
                        </div>
                        <p className="text-sm text-muted-foreground">Remarks: {record.remarks || "None"}</p>
                      </div>
                      <div className="flex items-start justify-end">
                        <Button size="sm" variant="outline" className="w-full sm:w-auto" onClick={() => openLiquidationDetails(record)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
              description="Admin-created news and Facebook post links."
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
                  {newsReleases.map((news) => (
                  <Card key={news.id} className="border-border/70">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{news.title}</p>
                        <PortalStatusBadge status={news.visibilityStatus} />
                      </div>
                      <p className="text-sm text-muted-foreground">{news.description}</p>
                      <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                        <p className="font-medium text-foreground">Posted {news.datePosted}</p>
                        <p className="mt-1 break-all">{news.facebookPostUrl}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/admin/news-releases/${news.id}`)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openAdminConfirmation({
                              kind: "news_release",
                              action: "publish",
                              id: news.id,
                              title: news.title,
                            })
                          }
                        >
                          Publish
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openAdminConfirmation({
                              kind: "news_release",
                              action: "hide",
                              id: news.id,
                              title: news.title,
                            })
                          }
                        >
                          Hide
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEditingNewsRelease(news.id)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => void handleDeleteNewsRelease(news.id)}>
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  ))}
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
              <TabsTrigger value="barangay-allocation">Barangay Allocation</TabsTrigger>
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
              <Card className="border-border/70">
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Risk Distribution</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Budget Monitoring Overview</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {budgetMonitoringEntries.length} cash-released budget{budgetMonitoringEntries.length === 1 ? "" : "s"} under monitoring.
                    </p>
                  </div>
                  <div className="h-72">
                    {budgetMonitoringChartData.some((entry) => entry.count > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={budgetMonitoringChartData} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" allowDecimals={false} />
                          <YAxis type="category" dataKey="riskLabel" width={110} />
                          <Tooltip formatter={(value: number) => [String(value), "Count"]} />
                          <Legend />
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
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">Financial DSS Analysis</p>
                      <h3 className="mt-2 text-lg font-semibold text-foreground">Budget Health Snapshot</h3>
                    </div>
                    <PortalStatusBadge status={budgetMonitoringAnalysis.overdueCount > 0 ? "overdue" : "completed_liquidated"} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">On Track</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{budgetMonitoringAnalysis.onTrackCount}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Needs Attention</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{budgetMonitoringAnalysis.needsAttentionCount}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Overdue</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{budgetMonitoringAnalysis.overdueCount}</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Completed</p>
                      <p className="mt-2 text-2xl font-bold text-foreground">{budgetMonitoringAnalysis.completedCount}</p>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-background p-4">
                    <p className="text-sm font-medium text-foreground">Analysis Notes</p>
                    <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
                      {budgetMonitoringAnalysis.insights.map((insight) => (
                        <li key={insight} className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2">
                          {insight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>

              {budgetMonitoringEntries.length ? (
                <div className="grid gap-4">
                  {budgetMonitoringEntries.map((entry) => (
                    <Card key={entry.budgetRequestId} className="border-border/70">
                      <CardContent className="grid gap-4 p-4 md:grid-cols-[1.5fr_1fr]">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{entry.title}</p>
                              <p className="text-sm text-muted-foreground">{entry.organizationName}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                              <PortalStatusBadge status={entry.budgetStatus} />
                              <span
                                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                  entry.riskLabel === "Overdue"
                                    ? "bg-destructive/15 text-destructive"
                                    : entry.riskLabel === "Completed"
                                      ? "bg-emerald-500/15 text-emerald-700"
                                      : entry.riskLabel === "On Track"
                                        ? "bg-primary/15 text-primary"
                                        : "bg-warning/15 text-warning"
                                }`}
                              >
                                {entry.riskLabel}
                              </span>
                            </div>
                          </div>
                          <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                            <p>Approved Amount: PHP {entry.approvedAmount.toLocaleString()}</p>
                            <p>Released Amount: PHP {entry.releasedAmount.toLocaleString()}</p>
                            <p>Remaining Amount: PHP {entry.remainingAmount.toLocaleString()}</p>
                            <p>Utilization: {entry.utilizationRate}%</p>
                            <p>Go Signal: {entry.goSignalAt || "Pending"}</p>
                            <p>Deadline: {entry.deadlineAt || "Pending"}</p>
                            <p>Hard Copy Submitted: {entry.hardCopySubmittedAt || "Pending"}</p>
                              <p>Liquidation Status: {formatStatusLabel(entry.liquidationStatus)}</p>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-muted/10 p-3 text-sm text-muted-foreground">
                            <p className="font-medium text-foreground">Monitoring Analysis</p>
                            <p className="mt-1">
                              {entry.riskLabel === "Overdue"
                                ? "This approved budget is past its expected timeline and should be escalated."
                                : entry.riskLabel === "Needs Attention"
                                  ? "The budget is approved, but liquidation tracking is still incomplete or awaiting a stronger signal."
                                  : entry.riskLabel === "Completed"
                                    ? "The budget has been fully liquidated and is considered closed."
                                    : "The budget is progressing normally and remains within monitoring targets."}
                            </p>
                          </div>
                        </div>
                        <div className="space-y-3 rounded-xl border border-border/70 bg-muted/15 p-4 text-sm">
                          <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Risk Metrics</p>
                            <p className="mt-2 font-medium text-foreground">
                              Monitoring age: {entry.ageInDays} day{entry.ageInDays === 1 ? "" : "s"}
                            </p>
                            <p className="mt-1 text-muted-foreground">
                              Approved budgets appear here automatically once the budget request is approved.
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/70 bg-background p-3">
                            <div className="flex items-center justify-between text-xs uppercase tracking-[0.14em] text-muted-foreground/75">
                              <span>Release Progress</span>
                              <span>{entry.utilizationRate}%</span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }} />
                            </div>
                          </div>
                          <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/admin/budget-utilization")}>
                            Open Budget Review
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
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
          <PortalSection
            title="Barangay Allocation"
            description="See how released budgets are distributed by barangay and district, then filter the list to focus on one area at a time."
            action={
              <Button type="button" variant="outline" onClick={exportBudgetAllocationReport}>
                <Download className="mr-2 h-4 w-4" />
                Export Filtered Report
              </Button>
            }
          >
            <div className="grid gap-4 lg:grid-cols-4">
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
              <PortalMetricCard
                label="Barangays with Allocation"
                value={budgetAllocationSummary.barangayCount.toLocaleString()}
                helper="Unique barangays that currently have released budgets in view."
              />
              <PortalMetricCard
                label="Released Allocation"
                value={`PHP ${budgetAllocationSummary.totalReleased.toLocaleString()}`}
                helper="Total released cash for the selected district or barangay."
              />
            </div>

            <div className="rounded-2xl border border-border/70 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
              These summary cards show the filtered barangay allocation totals based on the district and barangay selection above.
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <PortalMetricCard
                label="Approved Allocation"
                value={`PHP ${budgetAllocationSummary.totalApproved.toLocaleString()}`}
                helper="Approved budget amount before release."
              />
              <PortalMetricCard
                label="Remaining Allocation"
                value={`PHP ${budgetAllocationSummary.totalRemaining.toLocaleString()}`}
                helper="Amount not yet released from the approved budget."
              />
              <PortalMetricCard
                label="Utilization Rate"
                value={`${budgetAllocationSummary.utilizationRate}%`}
                helper="Released amount compared with approved amount."
              />
            </div>

            <div className="mt-4">
              {filteredBudgetAllocationRows.length ? (
                <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                  <div className="hidden border-b border-border/70 bg-muted/20 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/75 lg:grid lg:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_0.8fr_0.45fr] lg:gap-4">
                    <span>District / Barangay</span>
                    <span>Organizations</span>
                    <span>Approved</span>
                    <span>Released</span>
                    <span>Remaining</span>
                    <span>Utilization</span>
                  </div>
                  <div className="divide-y divide-border/70">
                    {filteredBudgetAllocationRows.map((entry) => (
                      <button
                        key={`${entry.district}-${entry.barangay}`}
                        type="button"
                        onClick={() => setSelectedBudgetAllocation(entry)}
                        className="grid w-full gap-4 px-4 py-4 text-left transition hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none lg:grid-cols-[1.4fr_0.9fr_0.9fr_0.9fr_0.8fr_0.45fr] lg:items-center"
                      >
                        <div className="space-y-1">
                          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/75">{entry.district}</p>
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-foreground">{entry.barangay}</h3>
                            <span className="rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-xs font-medium text-primary">
                              {entry.organizationCount} organization{entry.organizationCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {entry.releasedBudgetCount} released budget{entry.releasedBudgetCount === 1 ? "" : "s"} under monitoring
                          </p>
                        </div>
                        <div className="space-y-1 lg:text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75 lg:hidden">Approved</p>
                          <p className="text-sm font-medium text-foreground">PHP {entry.approvedAmount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1 lg:text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75 lg:hidden">Released</p>
                          <p className="text-sm font-medium text-foreground">PHP {entry.releasedAmount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1 lg:text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75 lg:hidden">Remaining</p>
                          <p className="text-sm font-medium text-foreground">PHP {entry.remainingAmount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1 lg:text-right">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75 lg:hidden">Utilization</p>
                          <p className="text-sm font-semibold text-foreground">{entry.utilizationRate}%</p>
                          <div className="h-2 overflow-hidden rounded-full bg-muted lg:ml-auto lg:w-32">
                            <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }} />
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 border-t border-border/70 pt-3 text-sm text-muted-foreground lg:justify-end lg:border-t-0 lg:pt-0">
                          <span className="lg:hidden">Tap to view allocation details</span>
                          <span className="hidden lg:inline">View details</span>
                          <ChevronDown className="h-4 w-4 shrink-0 text-primary lg:rotate-[-90deg]" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <PortalEmptyState
                  title="No barangay allocations found"
                  description="Try another district or barangay filter. Only released budgets are included in this allocation view."
                />
              )}
            </div>
          </PortalSection>
        </TabsContent>
      </Tabs>
        );
      case "templates":
        return (
          <PortalSection
            title="Template Management"
            description="Create, edit, upload, and remove document templates. The active list here is the same list used on the user side."
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
            <div className="grid gap-4 md:grid-cols-2">
              {templateDocuments.map((template) => (
                <Card key={template.id} className="border-border/70">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{template.name}</p>
                      <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">
                        {template.templateFileName ? "Uploaded" : "No file yet"}
                      </span>
                    </div>
                    <div className="rounded-md border border-border/70 bg-muted/20 p-3 text-sm">
                      <p className="font-medium text-foreground">
                        {template.templateFileName || "No template uploaded yet."}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {template.templateUploadedAt
                          ? `Uploaded ${new Date(template.templateUploadedAt).toLocaleString()}`
                          : "Upload a file so organization users can view and download it."}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button type="button" variant="outline" size="sm" onClick={() => startEditingTemplate(template.id)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      {template.templateFileUrl ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void openPreview(template.templateFileUrl, template.templateFileName || template.name)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      ) : (
                        <Button type="button" variant="outline" size="sm" disabled>
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                      )}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingTemplateId(template.id);
                          setTemplateModalMode("delete");
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
          <PortalSection title="Notifications" description="User-side changes that need admin attention." action={<BadgePanel count={unread} />}>
            <div className="space-y-3">
              {adminNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="w-full rounded-xl border border-border/70 bg-background p-4 text-left text-sm transition-colors hover:bg-muted/40"
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{notification.title}</p>
                    <PortalStatusBadge status={notification.isRead ? "verified" : "pending_review"} />
                  </div>
                  <p className="mt-1 text-muted-foreground">{notification.message}</p>
                </button>
              ))}
            </div>
          </PortalSection>
        );
      case "activity-logs":
        return (
          <PortalSection title="Activity Logs" description="Audit trail of admin-side edits and review actions.">
            <div className="space-y-3">
              {state.activityLogs.map((activity) => (
                <div key={activity.id} className="rounded-xl border border-border/70 bg-background p-4 text-sm">
                  <p className="font-medium">{activity.action}</p>
                  <p className="mt-1 text-muted-foreground">{activity.description}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.16em] text-muted-foreground/75">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </PortalSection>
        );
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
        onSignOut={() => void signOut()}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDeleteConfirmation?.kind === "news_release" ? "Delete News Release" : "Delete Transparency Post"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteConfirmation
                ? `Delete "${pendingDeleteConfirmation.title}"? This action cannot be undone.`
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
