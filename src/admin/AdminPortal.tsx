import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import "./admin-news-releases.css";
import "./admin-inquiries.css";
import "./admin-template-management.css";
import "./admin-activity-logs.css";
import "./admin-ypop-validation-review.css";
import "./admin-budget-monitoring.css";
import { useNavigate } from "react-router-dom";
import { YorpRegistryPage } from "./pages/YorpRegistry";
import { UsersPage } from "./pages/Users";
import { Roles } from "./pages/Roles";
import { AlertTriangle, ArrowLeft, ArrowRight, ArrowUpRight, Banknote, Bell, Building2, CalendarDays, CheckCircle2, ChevronDown, ChevronRight, ChevronUp, CircleDollarSign, CircleHelp, ClipboardList, Clock3, Download, Eye, FileText, FolderOpen, Mail, MapPin, Medal, MoreHorizontal, Pencil, Plus, Save, Trash2, TrendingUp, Trophy, UserRound, Users, Wallet, X } from "lucide-react";
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
import { RecentActivityList, RecentActivityPreview } from "@/components/activity/RecentActivityPreview";
import { useConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { PortalEmptyState, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { PortalShell } from "@/components/portal/PortalShell";
import { ExportReportDialog } from "@/components/reports/ExportReportDialog";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { adminNavigationGroups as baseAdminNavigationGroups, buildPublicRecordCode, computeYpopScore, DEFAULT_ORG_LED_TIERS, getApprovedYpopOrgActivityCount, getYpopCityLedPoints, normalizeYpopCityLedPoints, resolveYpopCityLedCategory, templateScopeLabelMap, YPOP_BASE_TOTAL_POINTS, YPOP_CITY_LED_CATEGORY_LABELS, YPOP_CITY_LED_MAX_POINTS, YPOP_SCORE_THRESHOLD, type ActivityLog, type InquiryRecord, type NewsRelease, type TemplateRecord, type TransparencyPost, type YPOPCityActivity, type YPOPCityActivityCategory, type YPOPEntry, type YPOPEventFile, type YPOPEventParticipation, type YPOPFile, type YPOPOrgActivity, type YPOPOrgActivityFile, type YPOPOrgLedTier, type YPOPPeriod, type YPOPPeriodStatus, type YPOPStatus } from "@/lib/lydo-connect-data";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { UrnReviewPanel } from "@/admin/components/UrnReviewPanel";
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
  activityLogExportConfig,
  getFriendlyAuditAction,
  getFriendlyAuditCategory,
  mapAuditLogToExportRow,
} from "@/lib/activity-log-export";
import {
  createAdminActivityLogInSupabase,
  createNewsReleaseInSupabase,
  createTransparencyPostInSupabase,
  createTemplateRecordInSupabase,
  deleteNewsReleaseInSupabase,
  deleteNewsReleasePreviewImageFromSupabase,
  deleteTransparencyPostInSupabase,
  updateBudgetRequestInSupabase,
  deleteTemplateRecordInSupabase,
  loadAdminPortalSupabaseState,
  loadLydoConnectSupabaseState,
  resolveSupabaseFileUrl,
  submitDocumentReviewBatchToSupabase,
  updateDocumentSubmissionFileReviewInSupabase,
  updateTransparencyPostInSupabase,
  updateLiquidationReportInSupabase,
  updateNewsReleaseInSupabase,
  updateOrganizationProfileReviewInSupabase,
  updateTemplateRecordInSupabase,
  uploadTemplateDocumentToSupabase,
  uploadNewsReleasePreviewImageToSupabase,
  adminCreateYpopPeriodInSupabase,
  adminUpdateYpopPeriodInSupabase,
  adminDeleteYpopPeriodFromSupabase,
  adminCreateYpopCityActivityInSupabase,
  adminUpdateYpopCityActivityInSupabase,
  adminDeleteYpopCityActivityFromSupabase,
  adminUpdateYpopEntryInSupabase,
  adminUpdateYpopEventParticipationInSupabase,
  adminUpdateYpopOrgActivityInSupabase,
  adminUpdateInquiryInSupabase,
  createNotificationInSupabase,
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
  users: "/admin/users",
  "roles-permissions": "/admin/roles-permissions",
};

const adminId = "admin-demo";

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

function MobileInquiryCard({
  inquiry,
  submittedDate,
  submittedTime,
  onView,
}: {
  inquiry: InquiryRecord;
  submittedDate: string;
  submittedTime: string;
  onView: () => void;
}) {
  const senderName = inquiry.organizationName || inquiry.submitterName || "Unnamed submitter";

  return (
    <article className="mobile-inquiry-card">
      <div className="mobile-inquiry-header">
        <h3 className="mobile-inquiry-subject">{inquiry.subject}</h3>
        <div className="mobile-inquiry-status">
          <PortalStatusBadge status={inquiry.status} />
        </div>
      </div>

      {inquiry.description ? <p className="mobile-inquiry-description">{inquiry.description}</p> : null}

      <div className="mobile-inquiry-metadata">
        <p className="mobile-inquiry-sender">{senderName}</p>
        <p className="mobile-inquiry-email">{inquiry.email}</p>
        <p className="mobile-inquiry-submitted">
          Submitted {submittedDate}
          {submittedTime ? ` \u00b7 ${submittedTime}` : ""}
        </p>
      </div>

      <Button
        type="button"
        variant="outline"
        className="mobile-inquiry-view-button"
        aria-label={`View inquiry from ${inquiry.submitterName || inquiry.organizationName || inquiry.email}`}
        onClick={onView}
      >
        <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
        View Inquiry
      </Button>
    </article>
  );
}

function MobileAdminTemplateCard({
  template,
  updatedDate,
  onPreview,
  onEdit,
  onReplace,
  onDelete,
}: {
  template: TemplateRecord;
  updatedDate: string | null;
  onPreview: () => void;
  onEdit: () => void;
  onReplace: () => void;
  onDelete: () => void;
}) {
  const displayFilename = template.templateFileName.replace(/^\d{13}-/, "");

  return (
    <article className="mobile-template-card">
      <div className="mobile-template-card-header">
        <span className="mobile-template-icon">
          <FileText className="h-4 w-4" aria-hidden="true" />
        </span>
        <div className="mobile-template-heading">
          <h3 className="mobile-template-title">{template.name}</h3>
          <p className="mobile-template-category">{templateScopeLabelMap[template.templateScope]}</p>
        </div>
      </div>

      {template.description ? <p className="mobile-template-description">{template.description}</p> : null}

      <div className="mobile-template-file-meta">
        {displayFilename ? (
          <div className="mobile-template-file-row">
            <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p className="mobile-template-filename">{displayFilename}</p>
          </div>
        ) : (
          <p className="mobile-template-filename">No file uploaded yet</p>
        )}
        <p className="mobile-template-updated">Updated {updatedDate ?? "Not uploaded"}</p>
      </div>

      <div className="mobile-template-actions">
        <Button
          type="button"
          variant="outline"
          disabled={!template.templateFileUrl}
          onClick={onPreview}
        >
          <Eye className="mr-2 h-4 w-4" aria-hidden="true" />
          Preview
        </Button>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="mobile-template-more"
              aria-label={`More actions for ${template.name}`}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Template
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onReplace}>
              <FileText className="mr-2 h-4 w-4" />
              Replace File
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={onDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Template
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </article>
  );
}

function MobileActivityLogItem({
  log,
  actorLabel,
}: {
  log: ActivityLog;
  actorLabel: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement | null>(null);
  const timestamp = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(log.createdAt));

  useEffect(() => {
    const measureDescription = () => {
      const element = descriptionRef.current;
      if (!element || expanded) return;
      setCanExpand(element.scrollHeight > element.clientHeight + 1);
    };
    measureDescription();
    window.addEventListener("resize", measureDescription);
    return () => window.removeEventListener("resize", measureDescription);
  }, [expanded, log.description]);

  return (
    <article className="mobile-activity-item">
      <div className="activity-timeline-marker" aria-hidden="true" />
      <div className="activity-content">
        <div className="activity-heading">
          <h3>{getFriendlyAuditAction(log.action)}</h3>
          <span>{getFriendlyAuditCategory(log.relatedType)}</span>
        </div>
        {log.description ? (
          <>
            <p ref={descriptionRef} className={`activity-description ${expanded ? "is-expanded" : ""}`}>{log.description}</p>
            {canExpand || expanded ? (
              <button
                type="button"
                className="activity-details-toggle"
                onClick={() => setExpanded((current) => !current)}
              >
                {expanded ? "Show less" : "View details"}
              </button>
            ) : null}
          </>
        ) : null}
        <div className="activity-metadata">
          {log.relatedId ? <span className="activity-target">Record: {log.relatedId}</span> : null}
          <span>{actorLabel}</span>
          <time dateTime={log.createdAt}>{timestamp}</time>
        </div>
      </div>
    </article>
  );
}

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

type RegistrationReviewDecision = "approve" | "needs_revision" | "reject" | "unreviewed";

type RegistrationReviewDraft = {
  decision: RegistrationReviewDecision;
  remark: string;
  expectedUpdatedAt: string;
};

const registrationReviewDecisionLabel: Record<RegistrationReviewDecision, string> = {
  approve: "Approve",
  needs_revision: "Needs Revision",
  reject: "Reject",
  unreviewed: "Unreviewed",
};

const registrationReviewPendingTone: Record<RegistrationReviewDecision, string> = {
  approve: "border-emerald-200 bg-emerald-50 text-emerald-700",
  needs_revision: "border-amber-200 bg-amber-50 text-amber-700",
  reject: "border-rose-200 bg-rose-50 text-rose-700",
  unreviewed: "border-border/70 bg-muted/20 text-muted-foreground",
};

const registrationDecisionRequiresRemark = (decision: RegistrationReviewDecision) =>
  decision === "needs_revision" || decision === "reject";

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
    }
  | {
      kind: "ypop_city_activity";
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
type RecentActivityEntry = {
  key: string;
  title: string;
  timestamp?: string;
  note?: string;
  dotClassName: string;
};

export default function AdminPortal({ section }: { section: string }) {
  const { confirmAction, confirmationDialog } = useConfirmActionDialog();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { state, mergeRemoteState, updateOrganizationProfile, createTemplate, removeTemplate, createNewsRelease, removeNewsRelease, updateNewsRelease, updateTransparencyPost, updateComplianceRemark, updateTemplate, createNotification, markNotificationRead, markAllNotificationsRead, updateBudgetRequest, updateLiquidationReport, updateInquiry, updateYPOPEntry, updateYPOPEventParticipation, createYPOPOrgActivity, updateYPOPOrgActivity, createYPOPCityActivity, updateYPOPCityActivity, deleteYPOPCityActivity, createYPOPPeriod, updateYPOPPeriod, deleteYPOPPeriod } =
    useLydoConnect();
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const [templateModalMode, setTemplateModalMode] = useState<"create" | "edit" | "delete" | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [templateDescriptionDraft, setTemplateDescriptionDraft] = useState("");
  const [templateScopeDraft, setTemplateScopeDraft] = useState<"document_submission" | "other">("document_submission");
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
  const [newsPreviewImageFileDraft, setNewsPreviewImageFileDraft] = useState<File | null>(null);
  const [newsSearch, setNewsSearch] = useState("");
  const [newsVisibilityFilter, setNewsVisibilityFilter] = useState<"all" | NewsRelease["visibilityStatus"]>("all");
  const [activityLogFilter, setActivityLogFilter] = useState<string>("all");
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [activityDateFilter, setActivityDateFilter] = useState<"all" | "7d" | "30d" | "90d">("all");
  const [activityPage, setActivityPage] = useState(0);
  const [activityExporting, setActivityExporting] = useState<ExportFormat | null>(null);
  const [activityExportDialogOpen, setActivityExportDialogOpen] = useState(false);
  const [newsDatePostedDraft, setNewsDatePostedDraft] = useState("");
  const [newsVisibilityDraft, setNewsVisibilityDraft] = useState<NewsRelease["visibilityStatus"]>("draft");
  const [newsCategoryDraft, setNewsCategoryDraft] = useState("");
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
  const [inquiryStatusDraft, setInquiryStatusDraft] = useState<InquiryRecord["status"]>("pending_review");
  const [inquiryAdminRemarksDraft, setInquiryAdminRemarksDraft] = useState("");
  const [savingInquiryStatus, setSavingInquiryStatus] = useState(false);
  const [expandedRegistrationIds, setExpandedRegistrationIds] = useState<string[]>([]);
  const [expandedDocumentFileIds, setExpandedDocumentFileIds] = useState<string[]>([]);
  const [documentReviewRemarksByFileId, setDocumentReviewRemarksByFileId] = useState<Record<string, string>>({});
  const [registrationReviewDraftsByFileId, setRegistrationReviewDraftsByFileId] = useState<Record<string, RegistrationReviewDraft>>({});
  const [selectedRegistrationReviewFileIds, setSelectedRegistrationReviewFileIds] = useState<string[]>([]);
  const [activeRegistrationReviewFileId, setActiveRegistrationReviewFileId] = useState<string | null>(null);
  const [registrationInfoCollapsed, setRegistrationInfoCollapsed] = useState(false);
  const [registrationBulkDecision, setRegistrationBulkDecision] = useState<Exclude<RegistrationReviewDecision, "unreviewed">>("approve");
  const [registrationBulkRemark, setRegistrationBulkRemark] = useState("");
  const [registrationMobileInfoExpanded, setRegistrationMobileInfoExpanded] = useState(false);
  const [registrationMobileBulkOpen, setRegistrationMobileBulkOpen] = useState(false);
  const [registrationReviewSubmitting, setRegistrationReviewSubmitting] = useState(false);
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
  const [budgetInsightsExpanded, setBudgetInsightsExpanded] = useState(false);
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
  const [budgetAllocationMobilePage, setBudgetAllocationMobilePage] = useState(1);
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
  const [showAllYpopProofDocuments, setShowAllYpopProofDocuments] = useState(false);
  const [showAllYpopOrgActivities, setShowAllYpopOrgActivities] = useState(false);
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
  const [recentActivityDialogOpen, setRecentActivityDialogOpen] = useState(false);
  const [recentActivityDialogTitle, setRecentActivityDialogTitle] = useState("Recent Activity");
  const [recentActivityDialogEntries, setRecentActivityDialogEntries] = useState<RecentActivityEntry[]>([]);

  useEffect(() => {
    setShowAllYpopProofDocuments(false);
    setShowAllYpopOrgActivities(false);
  }, [selectedYpopId]);

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
  const otherTemplates = useMemo(
    () => activeTemplates.filter((template) => template.templateScope === "other"),
    [activeTemplates],
  );
  const selectedRegistrationProfile = useMemo(
    () => state.organizationProfiles.find((profile) => profile.id === selectedRegistrationId) ?? null,
    [selectedRegistrationId, state.organizationProfiles],
  );
  const selectedRegistrationSubmission = useMemo(
    () =>
      selectedRegistrationProfile
        ? state.documentSubmissions.find((submission) => submission.organizationId === selectedRegistrationProfile.id) ?? null
        : null,
    [selectedRegistrationProfile, state.documentSubmissions],
  );
  const selectedRegistrationFiles = useMemo(
    () =>
      selectedRegistrationSubmission
        ? state.documentSubmissionFiles
            .filter((file) => file.submissionId === selectedRegistrationSubmission.id)
            .sort((left, right) => left.documentTypeId.localeCompare(right.documentTypeId))
        : [],
    [selectedRegistrationSubmission, state.documentSubmissionFiles],
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
  const budgetRecentActivities = useMemo<RecentActivityEntry[]>(() => {
    if (!selectedBudgetRequest) return [];
    const historyEntries = (selectedBudgetRequest.revisionHistory ?? []).map((entry, idx) => {
      const dotClassName =
        entry.action === "needs_revision" || entry.action === "rejected_red"
          ? "bg-rose-500"
          : entry.action === "approved_for_ftf_green" ||
              entry.action === "hard_copy_submitted" ||
              entry.action === "budget_released" ||
              entry.action === "completed"
            ? "bg-emerald-500"
            : "bg-amber-400";
      const title =
        entry.action === "needs_revision" ? "Revision Requested"
        : entry.action === "rejected_red" ? "Rejected"
        : entry.action === "approved_for_ftf_green" ? "Approved"
        : entry.action === "hard_copy_submitted" ? "Hardcopy Submitted"
        : entry.action === "budget_released" ? "Budget Released"
        : entry.action === "completed" ? "Completed"
        : entry.action.replaceAll("_", " ");
      return {
        key: `budget-history-${idx}-${entry.changedAt}`,
        title,
        timestamp: formatDateTimeLabel(entry.changedAt),
        note: entry.adminRemarks ? `"${entry.adminRemarks}"` : undefined,
        dotClassName,
      };
    });
    return [
      {
        key: `budget-submitted-${selectedBudgetRequest.id}`,
        title: "Submitted",
        timestamp: formatDateTimeLabel(selectedBudgetRequest.createdAt),
        dotClassName: "bg-muted-foreground/40",
      },
      ...historyEntries,
      ...(selectedBudgetRequest.userNote
        ? [
            {
              key: `budget-note-${selectedBudgetRequest.id}`,
              title: "Message from organization",
              note: `"${selectedBudgetRequest.userNote}"`,
              dotClassName: "bg-sky-500",
            },
          ]
        : []),
    ];
  }, [selectedBudgetRequest]);
  const liquidationRecentActivities = useMemo<RecentActivityEntry[]>(() => {
    if (!selectedLiquidationReport) return [];
    const historyEntries = (selectedLiquidationReport.revisionHistory ?? []).map((entry, idx) => {
      const dotClassName =
        entry.action === "overdue" || entry.action === "rejected_red"
          ? "bg-rose-500"
          : entry.action === "approved_for_ftf_green" ||
              entry.action === "completed_liquidated" ||
              entry.action === "hard_copy_submitted"
            ? "bg-emerald-500"
            : entry.action === "submitted"
              ? "bg-muted-foreground/40"
              : "bg-amber-400";
      const title =
        entry.action === "overdue" ? "Marked Overdue"
        : entry.action === "needs_revision" ? "Revision Requested"
        : entry.action === "approved_for_ftf_green" ? "Approved"
        : entry.action === "submitted" ? "Submitted"
        : entry.action === "hard_copy_submitted" ? "Hardcopy Submitted"
        : entry.action === "completed_liquidated" ? "Liquidated"
        : entry.action;
      return {
        key: `liquidation-history-${idx}-${entry.changedAt}`,
        title,
        timestamp: formatDateTimeLabel(entry.changedAt),
        note: entry.adminRemarks ? `"${entry.adminRemarks}"` : undefined,
        dotClassName,
      };
    });
    return [
      {
        key: `liquidation-created-${selectedLiquidationReport.id}`,
        title: "Report Created",
        timestamp: formatDateTimeLabel(selectedLiquidationReport.createdAt),
        dotClassName: "bg-muted-foreground/40",
      },
      ...historyEntries,
    ];
  }, [selectedLiquidationReport]);
  function formatStatusLabel(status: string) {
    return statusLabelMap[status] ?? status.replaceAll("_", " ");
  }
  function formatShortDate(value?: string | null) {
    if (!value) return "Pending";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Pending";
    return new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(parsed);
  }
  function formatDateTimeLabel(value?: string | null) {
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
  }
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
  const openInquiryDetails = (inquiry: InquiryRecord) => {
    setSelectedInquiry(inquiry);
    setInquiryStatusDraft(inquiry.status);
    setInquiryAdminRemarksDraft(inquiry.adminRemarks);
  };
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
  const budgetAllocationMobilePageSize = 6;
  const budgetAllocationMobilePageCount = Math.max(
    1,
    Math.ceil(filteredBudgetAllocationRows.length / budgetAllocationMobilePageSize),
  );
  const pagedBudgetAllocationRows = useMemo(
    () =>
      filteredBudgetAllocationRows.slice(
        (budgetAllocationMobilePage - 1) * budgetAllocationMobilePageSize,
        budgetAllocationMobilePage * budgetAllocationMobilePageSize,
      ),
    [budgetAllocationMobilePage, filteredBudgetAllocationRows],
  );
  const groupedPagedBudgetAllocationRows = useMemo(() => {
    const groups = new Map<string, BarangayAllocationEntry[]>();
    pagedBudgetAllocationRows.forEach((row) => {
      const districtRows = groups.get(row.district) ?? [];
      districtRows.push(row);
      groups.set(row.district, districtRows);
    });
    return [...groups.entries()].map(([district, rows]) => ({
      district,
      rows,
      organizationCount: rows.reduce((sum, row) => sum + row.organizationCount, 0),
    }));
  }, [pagedBudgetAllocationRows]);
  useEffect(() => {
    setBudgetAllocationMobilePage(1);
  }, [budgetAllocationBarangayFilter, budgetAllocationDistrictFilter]);
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
      pendingYpop: state.ypopEntries.filter((item) => item.status === "submitted" || item.status === "under_review").length,
      nonCompliant: state.organizationProfiles.filter((item) => item.profileStatus === "suspended_inactive").length,
    }),
    [state],
  );

  const overviewTags = useMemo(() => {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const newOrgs = state.organizationProfiles.filter(
      (p) => new Date(p.createdAt) >= weekAgo,
    ).length;

    const approvedToday = state.documentSubmissions.filter(
      (s) => s.status === "approved_green" && s.reviewedAt && new Date(s.reviewedAt) >= startOfToday,
    ).length;

    const totalReleased = state.budgetRequests
      .filter((r) => r.status === "budget_released")
      .reduce((sum, r) => sum + (r.releasedAmount ?? 0), 0);
    const budgetTag =
      totalReleased >= 1_000_000
        ? `₱${(totalReleased / 1_000_000).toFixed(1)}m cycle`
        : totalReleased >= 1_000
        ? `₱${(totalReleased / 1_000).toFixed(0)}k cycle`
        : `₱${totalReleased} cycle`;

    const pending = state.inquiries.filter((i) => i.status === "pending_review");
    let inquiryTag = "None pending";
    if (pending.length > 0) {
      const oldestMs = Math.min(...pending.map((i) => new Date(i.createdAt).getTime()));
      const daysOld = Math.floor((now.getTime() - oldestMs) / (1000 * 60 * 60 * 24));
      inquiryTag = daysOld === 0 ? "Today" : `Oldest ${daysOld}d`;
    }

    return {
      orgs:    newOrgs > 0 ? `+${newOrgs} this week` : "No change",
      docs:    approvedToday > 0 ? `+${approvedToday} today` : "None today",
      budget:  budgetTag,
      inquiry: inquiryTag,
    };
  }, [state]);

  const navGroups = useMemo(() => {
    const counts: Record<string, number> = {
      registrations: overviewStats.pendingProfiles,
      "ypop-validation": overviewStats.pendingYpop,
      "budget-utilization": overviewStats.pendingBudget,
      "liquidation-monitoring": overviewStats.pendingLiquidation,
      inquiries: overviewStats.pendingInquiries,
    };
    return baseAdminNavigationGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => ({
        ...item,
        count: (counts[item.id] ?? 0) > 0 ? counts[item.id] : undefined,
      })),
    }));
  }, [overviewStats]);

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
    const firstReviewableFile = templateDocuments
      .map((documentType) => selectedRegistrationFiles.find((file) => file.documentTypeId === documentType.id))
      .find((file): file is NonNullable<typeof file> => Boolean(file)) ?? null;

    setActiveRegistrationReviewFileId((current) => {
      if (current && selectedRegistrationFiles.some((file) => file.id === current)) {
        return current;
      }
      return firstReviewableFile?.id ?? null;
    });
  }, [selectedRegistrationFiles, templateDocuments]);

  useEffect(() => {
    setSelectedRegistrationReviewFileIds([]);
    setRegistrationReviewDraftsByFileId({});
    setRegistrationBulkDecision("approve");
    setRegistrationBulkRemark("");
    setRegistrationMobileInfoExpanded(false);
    setRegistrationMobileBulkOpen(false);
  }, [selectedRegistrationId]);

  useEffect(() => {
    const hasStagedRegistrationReviewChanges = Object.values(registrationReviewDraftsByFileId).some(
      (draft) => draft.decision !== "unreviewed",
    );
    if (!hasStagedRegistrationReviewChanges) return undefined;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [registrationReviewDraftsByFileId]);

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

  const handleSaveInquiryStatus = async () => {
    if (!selectedInquiry || savingInquiryStatus) return;

    setSavingInquiryStatus(true);
    try {
      const previousStatus = selectedInquiry.status;
      const savedInquiry = await adminUpdateInquiryInSupabase(selectedInquiry.id, {
        status: inquiryStatusDraft,
        adminRemarks: inquiryAdminRemarksDraft.trim(),
      });

      updateInquiry(savedInquiry.id, savedInquiry);
      setSelectedInquiry(savedInquiry);
      setInquiryStatusDraft(savedInquiry.status);
      setInquiryAdminRemarksDraft(savedInquiry.adminRemarks);

      void appendAuditLog(
        "update_inquiry_status",
        "inquiry",
        savedInquiry.id,
        `Changed inquiry status from ${statusLabelMap[previousStatus] ?? previousStatus} to ${statusLabelMap[savedInquiry.status] ?? savedInquiry.status}.`,
        savedInquiry.organizationId,
      ).catch((error) => console.error("Unable to record inquiry status activity:", error));

      toast({
        title: "Inquiry status updated",
        description: `The inquiry is now ${statusLabelMap[savedInquiry.status] ?? savedInquiry.status}.`,
      });
    } catch (error) {
      console.error("Unable to update inquiry status:", error);
      toast({
        title: "Status update failed",
        description: error instanceof Error ? error.message : "The inquiry status could not be updated.",
        variant: "destructive",
      });
    } finally {
      setSavingInquiryStatus(false);
    }
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
    const notif = {
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
    };
    createNotification(notif);
    void createNotificationInSupabase(notif);
  };

  const getRegistrationReviewDraft = (fileId: string, fallbackRemark = "", expectedUpdatedAt = "") =>
    registrationReviewDraftsByFileId[fileId] ?? {
      decision: "unreviewed" as const,
      remark: fallbackRemark,
      expectedUpdatedAt,
    };

  const setRegistrationReviewDraft = (
    fileId: string,
    nextValue: Partial<RegistrationReviewDraft> & Pick<RegistrationReviewDraft, "expectedUpdatedAt">,
  ) => {
    setRegistrationReviewDraftsByFileId((current) => ({
      ...current,
      [fileId]: {
        decision: current[fileId]?.decision ?? "unreviewed",
        remark: current[fileId]?.remark ?? "",
        expectedUpdatedAt: current[fileId]?.expectedUpdatedAt ?? nextValue.expectedUpdatedAt,
        ...current[fileId],
        ...nextValue,
      },
    }));
  };

  const clearRegistrationReviewDraft = (fileId: string) => {
    setRegistrationReviewDraftsByFileId((current) => {
      if (!current[fileId]) return current;
      const next = { ...current };
      delete next[fileId];
      return next;
    });
  };

  const applyRegistrationBulkDecision = (
    fileIds: string[],
    decision: Exclude<RegistrationReviewDecision, "unreviewed">,
  ) => {
    if (!fileIds.length) {
      toast({
        title: "No documents selected",
        description: "Select at least one submitted document first.",
        variant: "destructive",
      });
      return;
    }

    setRegistrationReviewDraftsByFileId((current) => {
      const next = { ...current };
      fileIds.forEach((fileId) => {
        const existingFile = selectedRegistrationFiles.find((file) => file.id === fileId);
        if (!existingFile || existingFile.adminStatus === "approved_green") return;
        next[fileId] = {
          decision,
          remark:
            decision === "approve"
              ? ""
              : current[fileId]?.remark?.trim() || registrationBulkRemark.trim() || existingFile.adminRemarks || "",
          expectedUpdatedAt: current[fileId]?.expectedUpdatedAt || existingFile.updatedAt,
        };
      });
      return next;
    });
  };

  const hasStagedRegistrationReviewChanges = Object.values(registrationReviewDraftsByFileId).some(
    (draft) => draft.decision !== "unreviewed",
  );

  const confirmDiscardRegistrationReviewChanges = async () =>
    !hasStagedRegistrationReviewChanges ||
    await confirmAction({
      title: "Discard unsaved review decisions?",
      description: "You have unsaved review decisions. Leaving this page will discard them.",
      confirmLabel: "Discard and Leave",
      destructive: true,
    });

  const handleRegistrationSelectionChange = async (nextRegistrationId: string | null) => {
    if (nextRegistrationId === selectedRegistrationId) return;
    if (!await confirmDiscardRegistrationReviewChanges()) return;
    setSelectedRegistrationId(nextRegistrationId);
  };

  const handleAdminSectionNavigate = async (id: string) => {
    const nextRoute = routeMap[id] ?? routeMap.overview;
    const currentRoute = routeMap[section] ?? routeMap.overview;
    if (nextRoute === currentRoute) return;
    if (!await confirmDiscardRegistrationReviewChanges()) return;
    navigate(nextRoute);
  };

  const stageBulkRegistrationDecision = async (
    fileIds: string[],
    decision: Exclude<RegistrationReviewDecision, "unreviewed">,
  ) => {
    if (!fileIds.length) {
      toast({
        title: "No documents selected",
        description: "Select at least one submitted document first.",
        variant: "destructive",
      });
      return;
    }

    const shouldConfirm = decision !== "approve" || fileIds.length > 1;
    if (shouldConfirm) {
      const confirmed = await confirmAction({
        title: `${registrationReviewDecisionLabel[decision]} ${fileIds.length} selected document${fileIds.length === 1 ? "" : "s"}?`,
        description:
          decision === "approve"
            ? "This will only stage approval decisions until you submit the review batch."
            : `Shared remark: ${registrationBulkRemark.trim() || "No shared remark provided."}`,
        confirmLabel: `Stage ${registrationReviewDecisionLabel[decision]}`,
        destructive: decision !== "approve",
      });
      if (!confirmed) return;
    }

    applyRegistrationBulkDecision(fileIds, decision);
  };

  const stageApproveAllUnreviewedDocuments = async (fileIds: string[]) => {
    if (!fileIds.length) {
      toast({
        title: "No eligible documents",
        description: "All reviewable documents already have a final status or staged decision.",
      });
      return;
    }

    const confirmed = await confirmAction({
      title: `Approve all ${fileIds.length} eligible document${fileIds.length === 1 ? "" : "s"}?`,
      description: "This will add approval decisions to the review summary.\nNothing will be submitted until you click Submit Review Decisions.",
      confirmLabel: "Stage Approvals",
    });
    if (!confirmed) return;

    applyRegistrationBulkDecision(fileIds, "approve");
  };

  const submitRegistrationReviewDecisions = async () => {
    if (!selectedRegistrationProfile || !selectedRegistrationSubmission) return;

    const decisionEntries = selectedRegistrationFiles
      .map((file) => ({ file, draft: registrationReviewDraftsByFileId[file.id] }))
      .filter((entry): entry is { file: (typeof selectedRegistrationFiles)[number]; draft: RegistrationReviewDraft } => Boolean(entry.draft))
      .filter((entry) => entry.draft.decision !== "unreviewed");

    if (!decisionEntries.length) {
      toast({
        title: "No review decisions yet",
        description: "Assign at least one decision before submitting the batch review.",
        variant: "destructive",
      });
      return;
    }

    const missingRemarkEntry = decisionEntries.find(
      ({ draft }) => (draft.decision === "needs_revision" || draft.decision === "reject") && !draft.remark.trim(),
    );
    if (missingRemarkEntry) {
      toast({
        title: "Comment required",
        description: "Add a remark for every Needs Revision or Reject decision before submitting.",
        variant: "destructive",
      });
      return;
    }

    setRegistrationReviewSubmitting(true);
    try {
      const result = await submitDocumentReviewBatchToSupabase({
        decisions: decisionEntries.map(({ file, draft }) => ({
          fileId: file.id,
          status:
            draft.decision === "approve"
              ? "approved_green"
              : draft.decision === "needs_revision"
                ? "needs_revision"
                : "rejected_red",
          adminRemarks: draft.decision === "approve" ? undefined : draft.remark.trim(),
          expectedUpdatedAt: draft.expectedUpdatedAt,
        })),
      });

      const successfulFileIds = new Set(
        result.results.filter((item) => item.success).map((item) => item.fileId),
      );
      const successfulEntries = decisionEntries.filter((entry) => successfulFileIds.has(entry.file.id));
      const failedResults = result.results.filter((item) => !item.success);

      if (!successfulEntries.length) {
        throw new Error(
          failedResults.map((item) => item.error).filter(Boolean).join(" ") ||
            "No document review decisions were saved. Please refresh and try again.",
        );
      }

      await refreshAdminState();

      for (const entry of successfulEntries) {
        if (entry.draft.decision === "approve") {
          await appendAuditLog(
            "Approved document submission",
            "document_submission_file",
            entry.file.id,
            `Approved ${entry.file.fileName} from the registration detail batch review.`,
            selectedRegistrationProfile.id,
          );
        } else if (entry.draft.decision === "needs_revision") {
          await appendAuditLog(
            "Document revision requested",
            "document_submission_file",
            entry.file.id,
            `Requested revisions for ${entry.file.fileName} from the registration detail batch review.`,
            selectedRegistrationProfile.id,
          );
        } else {
          await appendAuditLog(
            "Rejected document submission",
            "document_submission_file",
            entry.file.id,
            `Rejected ${entry.file.fileName} from the registration detail batch review.`,
            selectedRegistrationProfile.id,
          );
        }
      }

      await appendAuditLog(
        "Submitted batch document review",
        "document_submission",
        selectedRegistrationSubmission.id,
        `Submitted ${result.successCount} document review decision${result.successCount === 1 ? "" : "s"} for ${selectedRegistrationProfile.organizationName}.`,
        selectedRegistrationProfile.id,
      );

      notifyOrganizationUser({
        userId: selectedRegistrationProfile.userId,
        organizationId: selectedRegistrationProfile.id,
        title: "Document review updated",
        message: `The admin submitted ${result.successCount} document review decision${result.successCount === 1 ? "" : "s"} for your registration files.`,
        type: "document_review_update",
        relatedType: "document_submission",
        relatedId: selectedRegistrationSubmission.id,
      });

      setRegistrationReviewDraftsByFileId((current) =>
        Object.fromEntries(Object.entries(current).filter(([fileId]) => !successfulFileIds.has(fileId))),
      );
      setSelectedRegistrationReviewFileIds([]);
      setRegistrationBulkRemark("");

      if (failedResults.length) {
        toast({
          title: "Review partially completed",
          description: `${result.successCount} saved; ${result.failureCount} failed. ${failedResults
            .map((item) => item.error)
            .filter(Boolean)
            .join(" ")}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Review completed",
          description: `${result.successCount} document${result.successCount === 1 ? "" : "s"} were updated successfully.`,
        });
      }
    } catch (error) {
      toast({
        title: "Unable to submit review decisions",
        description: error instanceof Error ? error.message : "The selected review decisions could not be saved.",
        variant: "destructive",
      });
    } finally {
      setRegistrationReviewSubmitting(false);
    }
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

        const savedOrgActivity = await adminUpdateYpopOrgActivityInSupabase(
          pendingAdminConfirmation.orgActivityId,
          patch,
        );
        updateYPOPOrgActivity(savedOrgActivity.id, savedOrgActivity);

        if (relatedEntry) {
          const semesterActivities = state.ypopCityActivities.filter((activity) => activity.semesterKey === relatedEntry.semester);
          const period = state.ypopPeriods.find((item) => item.semesterKey === relatedEntry.semester) ?? null;
          const approvedOrgActivities = [
            ...state.ypopOrgActivities.filter((item) => item.id !== pendingAdminConfirmation.orgActivityId),
            savedOrgActivity,
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
          const savedEntry = await adminUpdateYpopEntryInSupabase(relatedEntry.id, entryPatch);
          updateYPOPEntry(savedEntry.id, savedEntry);
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
    setNewsPreviewImageFileDraft(null);
    setNewsDatePostedDraft("");
    setNewsVisibilityDraft("draft");
    setNewsCategoryDraft("");
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
    setNewsPreviewImageFileDraft(null);
    setNewsDatePostedDraft(newsRelease.datePosted);
    setNewsVisibilityDraft(newsRelease.visibilityStatus);
    setNewsCategoryDraft(newsRelease.category ?? "");
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
    let uploadedPreviewImageUrl = "";
    try {
      if (newsPreviewImageFileDraft) {
        uploadedPreviewImageUrl = await uploadNewsReleasePreviewImageToSupabase(newsPreviewImageFileDraft);
      }
      const resolvedPreviewImageUrl = uploadedPreviewImageUrl || newsPreviewImageUrlDraft.trim();
      const previousPreviewImageUrl = editingNewsReleaseId
        ? newsReleases.find((entry) => entry.id === editingNewsReleaseId)?.previewImageUrl?.trim() || ""
        : "";

      if (newsModalMode === "edit" && editingNewsReleaseId) {
        const updatedNewsRelease = await updateNewsReleaseInSupabase(editingNewsReleaseId, {
          title: newsTitleDraft,
          description: newsDescriptionDraft,
          facebookPostUrl: newsFacebookPostUrlDraft,
          previewImageUrl: resolvedPreviewImageUrl,
          datePosted: newsDatePostedDraft,
          visibilityStatus: newsVisibilityDraft,
          category: newsCategoryDraft,
        });
        updateNewsRelease(editingNewsReleaseId, updatedNewsRelease);
        await appendAuditLog("Updated news release", "news_release", updatedNewsRelease.id, `Updated news release "${updatedNewsRelease.title}".`);
        await refreshAdminState();
        if (uploadedPreviewImageUrl && previousPreviewImageUrl && previousPreviewImageUrl !== uploadedPreviewImageUrl) {
          void deleteNewsReleasePreviewImageFromSupabase(previousPreviewImageUrl);
        }
        toast({ title: "News release updated", description: `${updatedNewsRelease.title} was updated successfully.` });
      } else {
        const createdNewsRelease = await createNewsReleaseInSupabase({
          title: newsTitleDraft,
          description: newsDescriptionDraft,
          facebookPostUrl: newsFacebookPostUrlDraft,
          previewImageUrl: resolvedPreviewImageUrl,
          datePosted: newsDatePostedDraft,
          visibilityStatus: newsVisibilityDraft,
          category: newsCategoryDraft,
        });
        createNewsRelease(createdNewsRelease);
        await appendAuditLog("Created news release", "news_release", createdNewsRelease.id, `Created news release "${createdNewsRelease.title}".`);
        await refreshAdminState();
        toast({ title: "News release created", description: `${createdNewsRelease.title} was added successfully.` });
      }
      resetNewsReleaseForm();
    } catch (error) {
      if (uploadedPreviewImageUrl) {
        void deleteNewsReleasePreviewImageFromSupabase(uploadedPreviewImageUrl);
      }
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
        await adminDeleteYpopPeriodFromSupabase(pending.id);
        deleteYPOPPeriod(pending.id);
        await refreshAdminState();
        toast({ title: "Semester deleted", description: `"${pending.title}", its submissions, activities, and files have been removed.` });
        return;
      }

      if (pending.kind === "ypop_city_activity") {
        try { await adminDeleteYpopCityActivityFromSupabase(pending.id); } catch { /* local-only fallback */ }
        deleteYPOPCityActivity(pending.id);
        toast({ title: "City-led activity deleted", description: `"${pending.title}" was removed successfully.` });
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
              : pending.kind === "ypop_city_activity"
                ? "The city-led activity could not be deleted."
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

        const getActivityDotColor = (action: string): string => {
          const a = action.toLowerCase();
          if (/verif|approv|releas|publish/.test(a)) return "#009951";
          if (/reject|remov|delet|hidden/.test(a)) return "#C00F0C";
          if (/revision|needs|flagg|overdue/.test(a)) return "#975102";
          return "#3271D7";
        };

        const taskItems = [
          { count: overviewStats.pendingProfiles,    label: "Organization profile(s) pending review",  route: routeMap.registrations,             icon: Users,         iconBg: "#FFFBEB", iconColor: "#522504" },
          { count: overviewStats.pendingDocuments,   label: "Document set(s) awaiting validation",     route: routeMap.registrations,             icon: FileText,      iconBg: "#FFFBEB", iconColor: "#522504" },
          { count: overviewStats.revisions,          label: "Document revision(s) need re-review",     route: routeMap.registrations,             icon: ClipboardList, iconBg: "#FFFBEB", iconColor: "#522504" },
          { count: overviewStats.overdueLiquidation, label: "Liquidation report(s) overdue",           route: routeMap["liquidation-monitoring"], icon: ClipboardList, iconBg: "#DCEFFD", iconColor: "#118DF0" },
          { count: overviewStats.pendingLiquidation, label: "Liquidation report(s) awaiting review",   route: routeMap["liquidation-monitoring"], icon: ClipboardList, iconBg: "#DCEFFD", iconColor: "#118DF0" },
          { count: overviewStats.pendingInquiries,   label: "Inquiry(s) awaiting response",            route: routeMap.inquiries,                 icon: Mail,          iconBg: "#EBFFEE", iconColor: "#02542D" },
          { count: overviewStats.nonCompliant,       label: "Organization(s) with compliance issues",  route: routeMap.users,                     icon: AlertTriangle, iconBg: "#FEE9E7", iconColor: "#C00F0C" },
        ].filter((item) => item.count > 0);
        const dashboardRecentActivities = state.activityLogs.map((log) => ({
          id: log.id,
          message: formatActionName(log.action),
          note: log.description,
          timestamp: log.createdAt,
          timestampLabel: formatDateTimeLabel(log.createdAt),
        }));

        return (
          <div className="-m-3 sm:-m-6 lg:-m-8">
            {/* Breadcrumb bar */}
            <div className="border-b border-[#E5E7EB] bg-white px-4 py-[6px]">
              <nav className="flex items-center gap-[10px]" aria-label="Breadcrumb">
                <span className="text-[14px] leading-[100%] text-[#B3B3B3]">Workspace</span>
                <ChevronRight className="h-4 w-4 shrink-0 text-[#B3B3B3]" strokeWidth={2} />
                <span className="text-[14px] leading-[100%] text-[#1E1E1E]">Overview</span>
              </nav>
            </div>

            {/* Main content area */}
            <div className="flex flex-col gap-5 bg-[#F5F7FA] px-4 py-3">
              {/* Page title */}
              <div className="flex flex-col gap-[10px]">
                <h1 className="font-segoe text-[24px] font-bold leading-[100%] tracking-[-0.03em] text-[#1E1E1E]">
                  Overview
                </h1>
                <p className="font-segoe text-[14px] font-normal leading-[140%] text-[#757575]">
                  Monitor registrations, compliance, and budget status across all youth programs.
                </p>
              </div>

              <div className="flex flex-col gap-5">
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-[10px] xl:grid-cols-4">
              {(
                [
                  {
                    label: "Registered Organizations",
                    value: overviewStats.organizations,
                    tag: overviewTags.orgs,
                    description: "Total registered youth organizations.",
                    icon: Users,
                    iconBg: "#DCE4F0",
                    iconBorder: "#0E2F66",
                    iconColor: "#0E2F66",
                    onClick: () => navigate(routeMap.registrations),
                  },
                  {
                    label: "Approved Documents",
                    value: overviewStats.approvedDocs,
                    tag: overviewTags.docs,
                    description: "Documents with full compliance approval.",
                    icon: CheckCircle2,
                    iconBg: "#EBFFEE",
                    iconBorder: "#02542D",
                    iconColor: "#02542D",
                    onClick: () => navigate(routeMap.registrations),
                  },
                  {
                    label: "Budget Released",
                    value: overviewStats.releasedBudget,
                    tag: overviewTags.budget,
                    description: "Total budget requests released to date.",
                    icon: Banknote,
                    iconBg: "#DCEFFD",
                    iconBorder: "#118DF0",
                    iconColor: "#118DF0",
                    onClick: () => navigate(routeMap["budget-utilization"]),
                  },
                  {
                    label: "Pending Inquiries",
                    value: overviewStats.pendingInquiries,
                    tag: overviewTags.inquiry,
                    description: "Inquiries awaiting admin response.",
                    icon: Mail,
                    iconBg: "#FFFBEB",
                    iconBorder: "#522504",
                    iconColor: "#522504",
                    onClick: () => navigate(routeMap.inquiries),
                  },
                ] as const
              ).map((card) => {
                const Icon = card.icon;
                return (
                  <button
                    key={card.label}
                    type="button"
                    onClick={card.onClick}
                    className="flex flex-col gap-2 rounded-lg border border-[#E5E7EB] bg-white p-4 text-left shadow-[0px_1px_4px_0px_rgba(0,0,0,0.10)] transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    {/* Title block */}
                    <div className="flex w-full items-center justify-between">
                      <span className="font-segoe text-[11px] font-semibold uppercase leading-[140%] text-[#757575]">
                        {card.label}
                      </span>
                      <div
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] p-2"
                        style={{ background: card.iconBg }}
                      >
                        <Icon className="h-4 w-4" style={{ color: card.iconColor }} strokeWidth={1.6} />
                      </div>
                    </div>

                    {/* Stat info */}
                    <div className="flex flex-col gap-[10px]">
                      <div className="flex items-center gap-[10px]">
                        <span className="font-mono text-[32px] font-bold leading-[120%] tracking-[-0.02em] text-[#1E1E1E]">
                          {card.value}
                        </span>
                        <div className="flex items-center gap-1 rounded-full bg-[#F1F6FD] px-[6px] py-[2px]">
                          <TrendingUp className="h-[10px] w-[10px] text-[#444444]" strokeWidth={1} />
                          <span className="font-mono text-[11px] font-semibold leading-[140%] text-[#444444]">
                            {card.tag}
                          </span>
                        </div>
                      </div>
                      <p className="font-segoe text-[12px] leading-[140%] text-[#757575]">
                        {card.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tasks card */}
            <div className="overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.10)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#F0F1F3] bg-white px-4 pb-3 pt-5">
                <div className="flex flex-col gap-1">
                  <span className="font-segoe text-[18px] font-semibold leading-[100%] text-[#1E1E1E]">Tasks</span>
                  <span className="font-segoe text-[13px] font-normal leading-[100%] text-[#B3B3B3]">
                    Pending actions across all modules.
                  </span>
                </div>
                {taskItems.length > 0 && (
                  <div className="flex items-center gap-2 rounded-full bg-[#FFFBEB] px-[10px] py-1">
                    <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#975102]" />
                    <span className="font-segoe text-[12px] font-semibold leading-[100%] text-[#975102]">
                      {taskItems.length} pending
                    </span>
                  </div>
                )}
              </div>

              {/* Task rows */}
              {taskItems.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-4 text-sm text-emerald-700">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  All clear — no pending tasks right now.
                </div>
              ) : (
                <div className="pb-3">
                  {taskItems.map((item, i) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => navigate(item.route)}
                        className="group flex w-full items-center justify-between border-b border-[#F0F1F3] px-5 py-3 text-left transition-colors last:border-b-0 hover:rounded-lg hover:bg-[#F5F7FA]"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[14px] p-2"
                            style={{ background: item.iconBg }}
                          >
                            <Icon className="h-4 w-4 shrink-0" style={{ color: item.iconColor }} strokeWidth={1.6} />
                          </div>
                          <span className="font-mono text-[14px] leading-[100%] text-[#1E1E1E] group-hover:text-[#0E2F66]">
                            {item.count}
                          </span>
                          <span className="font-segoe text-[14px] leading-[100%] text-[#1E1E1E] group-hover:text-[#0E2F66]">
                            {item.label}
                          </span>
                        </div>
                        <ArrowUpRight
                          className="h-[18px] w-[18px] shrink-0 text-[#757575] group-hover:text-[#0E2F66]"
                          strokeWidth={1.6}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Activity card */}
            <div className="w-full max-w-[549px] overflow-hidden rounded-lg border border-[#E5E7EB] bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.10)]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[#F0F1F3] px-4 pb-3 pt-5">
                <span className="font-segoe text-[18px] font-semibold leading-[100%] text-[#1E1E1E]">
                  Recent activity
                </span>
                {state.activityLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRecentActivityDialogTitle("Recent Activity");
                      setRecentActivityDialogEntries(
                        state.activityLogs.map((log) => ({
                          key: log.id,
                          title: formatActionName(log.action),
                          note: log.description,
                          timestamp: formatDateTimeLabel(log.createdAt),
                          dotClassName: "bg-primary",
                        })),
                      );
                      setRecentActivityDialogOpen(true);
                    }}
                    className="font-segoe text-[13px] leading-[140%] text-[#0E2F66] hover:underline"
                  >
                    View full log
                  </button>
                )}
              </div>

              {/* Log items */}
              {state.activityLogs.length === 0 ? (
                <div className="px-5 py-4 font-segoe text-[13px] text-[#757575]">
                  No recent activity yet.
                </div>
              ) : (
                <div className="pb-5">
                  {state.activityLogs.slice(0, 3).map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 border-b border-[#F0F1F3] px-5 py-3 last:border-b-0"
                    >
                      <span
                        className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: getActivityDotColor(log.action) }}
                      />
                      <div className="flex flex-col gap-1">
                        <span className="font-segoe text-[14px] leading-[120%] text-[#1E1E1E]">
                          {formatActionName(log.action)}
                        </span>
                        {log.description && (
                          <span className="font-segoe text-[13px] leading-[100%] text-[#757575]">
                            {log.description}
                          </span>
                        )}
                        <time className="font-mono text-[12px] leading-[140%] text-[#757575]">
                          {formatDateTimeLabel(log.createdAt)}
                        </time>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
              </div>
            </div>
          </div>
        );
      }
      case "inquiries": {
        return (
          <div className="admin-inquiries-page">
            <PortalSection
              title="Inquiries"
              description="Submitted inquiries from the user dashboard appear here in a consistent review format."
            >
              <div className="space-y-4">
                <div className="inquiry-filters grid gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                  <Input
                    value={inquirySearch}
                    onChange={(event) => setInquirySearch(event.target.value)}
                    placeholder="Search inquiries"
                    aria-label="Search inquiries"
                    className="h-11 lg:hidden"
                  />
                  <Input
                    value={inquirySearch}
                    onChange={(event) => setInquirySearch(event.target.value)}
                    placeholder="Search name, organization, email, subject, or description"
                    aria-label="Search inquiries"
                    className="hidden h-11 lg:flex"
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

                <p className="inquiry-results-count">
                  {filteredInquiries.length} {filteredInquiries.length === 1 ? "inquiry" : "inquiries"}
                </p>

                <div className="mobile-inquiries-list">
                  {filteredInquiries.length ? (
                    filteredInquiries.map((inquiry) => {
                      const submittedParts = formatCompactDateParts(inquiry.createdAt);
                      return (
                        <MobileInquiryCard
                          key={inquiry.id}
                          inquiry={inquiry}
                          submittedDate={submittedParts.date}
                          submittedTime={submittedParts.time}
                          onView={() => openInquiryDetails(inquiry)}
                        />
                      );
                    })
                  ) : (
                    <PortalEmptyState
                      title="No inquiries found"
                      description="Try changing your search or status filter."
                    />
                  )}
                </div>

                {filteredInquiries.length ? (
                  <div className="desktop-inquiries-table overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
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
                                onClick={() => openInquiryDetails(inquiry)}
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
                  <div className="desktop-inquiries-table">
                    <PortalEmptyState
                      title="No inquiries yet"
                      description="Once a user submits an inquiry from the dashboard, it will appear here."
                    />
                  </div>
                )}
              </div>
            </PortalSection>
          </div>
        );
      }
      case "registrations": {
        const selectedOrg = selectedRegistrationProfile;
        const selectedSubmission = selectedRegistrationSubmission;
        const selectedFiles = selectedRegistrationFiles.filter(
          (file) => validDocumentTypeIds.has(file.documentTypeId) && file.adminStatus !== "draft",
        );
        const approvedDocumentCount = selectedFiles.filter((file) => file.adminStatus === "approved_green").length;
        const allRequiredDocumentsApproved = selectedFiles.length === templateDocuments.length && approvedDocumentCount === templateDocuments.length;
        const submittedDocumentCount = selectedFiles.length;
        const reviewedDocumentCount = selectedFiles.filter((file) => file.adminStatus !== "submitted" && file.adminStatus !== "under_admin_review").length;
        const needsRevisionCount = selectedFiles.filter((file) => file.adminStatus === "needs_revision").length;
        const rejectedCount = selectedFiles.filter((file) => file.adminStatus === "rejected_red").length;
        const unreviewedCount = selectedFiles.filter((file) => file.adminStatus === "submitted" || file.adminStatus === "under_admin_review").length;
        const orderedSubmittedFiles = templateDocuments
          .map((documentType) => {
            const file = selectedFiles.find((entry) => entry.documentTypeId === documentType.id);
            if (!file) return null;
            return { documentType, file };
          })
          .filter((entry): entry is { documentType: (typeof templateDocuments)[number]; file: (typeof selectedFiles)[number] } => Boolean(entry));
        const filteredQueueEntries = orderedSubmittedFiles;
        const activeReviewEntry =
          filteredQueueEntries.find((entry) => entry.file.id === activeRegistrationReviewFileId) ??
          filteredQueueEntries[0] ??
          orderedSubmittedFiles.find((entry) => entry.file.id === activeRegistrationReviewFileId) ??
          orderedSubmittedFiles[0] ??
          null;
        const activeReviewIndex = activeReviewEntry
          ? filteredQueueEntries.findIndex((entry) => entry.file.id === activeReviewEntry.file.id)
          : -1;
        const activeReviewDraft = activeReviewEntry
          ? getRegistrationReviewDraft(
              activeReviewEntry.file.id,
              activeReviewEntry.file.adminStatus === "needs_revision" || activeReviewEntry.file.adminStatus === "rejected_red"
                ? activeReviewEntry.file.adminRemarks
                : "",
              activeReviewEntry.file.updatedAt,
            )
          : null;
        const selectedBulkFiles = orderedSubmittedFiles.filter((entry) => selectedRegistrationReviewFileIds.includes(entry.file.id));
        const eligibleUnreviewedFileIds = orderedSubmittedFiles
          .filter(
            (entry) =>
              entry.file.adminStatus !== "approved_green" &&
              (entry.file.adminStatus === "submitted" || entry.file.adminStatus === "under_admin_review") &&
              getRegistrationReviewDraft(entry.file.id, "", entry.file.updatedAt).decision === "unreviewed",
          )
          .map((entry) => entry.file.id);
        const activeReviewHistory = activeReviewEntry
          ? [
              {
                id: `${activeReviewEntry.file.id}-submitted`,
                message: "Submitted",
                timestamp: activeReviewEntry.file.uploadedAt,
                timestampLabel: activeReviewEntry.file.uploadedAt ? formatDateTimeLabel(activeReviewEntry.file.uploadedAt) : undefined,
              },
              ...(activeReviewEntry.file.reviewedAt
                ? [{
                    id: `${activeReviewEntry.file.id}-reviewed`,
                    message: statusLabelMap[activeReviewEntry.file.adminStatus] ?? activeReviewEntry.file.adminStatus.replaceAll("_", " "),
                    note:
                      (activeReviewEntry.file.adminStatus === "needs_revision" ||
                        activeReviewEntry.file.adminStatus === "rejected_red") &&
                      activeReviewEntry.file.adminRemarks
                        ? `"${activeReviewEntry.file.adminRemarks}"`
                        : undefined,
                    timestamp: activeReviewEntry.file.reviewedAt,
                    timestampLabel: activeReviewEntry.file.reviewedAt ? formatDateTimeLabel(activeReviewEntry.file.reviewedAt) : undefined,
                  }]
                : []),
              ...(activeReviewEntry.file.userRemarks
                ? [{
                    id: `${activeReviewEntry.file.id}-user-note`,
                    message: "Note from org",
                    note: `"${activeReviewEntry.file.userRemarks}"`,
                  }]
                : []),
            ]
          : [];
        const bulkDecisionSummary = Object.values(registrationReviewDraftsByFileId).reduce(
          (summary, draft) => {
            if (draft.decision === "approve") summary.approve += 1;
            if (draft.decision === "needs_revision") summary.needsRevision += 1;
            if (draft.decision === "reject") summary.reject += 1;
            if (draft.decision === "unreviewed") summary.unreviewed += 1;
            return summary;
          },
          { approve: 0, needsRevision: 0, reject: 0, unreviewed: 0 },
        );
        const stagedDecisionCount = bulkDecisionSummary.approve + bulkDecisionSummary.needsRevision + bulkDecisionSummary.reject;
        const reviewableUnreviewedCount = orderedSubmittedFiles.filter((entry) => {
          if (entry.file.adminStatus === "approved_green") return false;
          return getRegistrationReviewDraft(entry.file.id, "", entry.file.updatedAt).decision === "unreviewed";
        }).length;
        const hasMissingDecisionRemark = orderedSubmittedFiles.some((entry) => {
          const draft = registrationReviewDraftsByFileId[entry.file.id];
          return Boolean(draft && registrationDecisionRequiresRemark(draft.decision) && !draft.remark.trim());
        });
        const isActiveDocumentLocked = activeReviewEntry?.file.adminStatus === "approved_green";
        const missingDocumentCount = Math.max(templateDocuments.length - submittedDocumentCount, 0);
        const selectableBulkFileCount = orderedSubmittedFiles.filter((entry) => entry.file.adminStatus !== "approved_green").length;
        const shouldShowMobileBulkReview = selectedBulkFiles.length > 0 && selectableBulkFileCount > 1;
        const activeDocumentPreviewUrl = activeReviewEntry ? documentPreviewUrls[activeReviewEntry.file.id] : null;

        if (selectedOrg) {
          if (selectedOrg.registrationType === "existing_urn") {
            return (
              <UrnReviewPanel
                profile={selectedOrg}
                onBack={() => handleRegistrationSelectionChange(null)}
                onReviewed={(updated) => updateOrganizationProfile(updated.id, updated)}
              />
            );
          }
          return (
            <div className="space-y-5">
              <div className="rounded-xl border border-border/70 bg-card px-4 py-3 shadow-sm">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 space-y-2">
                    <Button size="sm" variant="ghost" className="-ml-2 h-8 px-2 text-muted-foreground" onClick={() => handleRegistrationSelectionChange(null)}>
                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                      Back
                    </Button>
                    <div className="min-w-0">
                      <h1 className="truncate text-2xl font-semibold text-foreground">{selectedOrg.organizationName}</h1>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {selectedOrg.profileStatus === "verified" && selectedOrg.verifiedAt
                          ? `Verified on ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" }).format(new Date(selectedOrg.verifiedAt))}`
                          : selectedOrg.profileStatus === "needs_update"
                          ? "Needs update"
                          : "Pending verification"}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span className={`inline-flex items-center rounded-full border px-2 py-0.5 font-medium ${selectedOrg.isExistingOrganization ? "border-sky-200 bg-sky-50 text-sky-700" : "border-primary/20 bg-primary-soft text-primary"}`}>
                          {selectedOrg.isExistingOrganization ? "Existing organization" : "New organization"}
                        </span>
                        <span>&middot;</span>
                        <span>{approvedDocumentCount}/{templateDocuments.length} documents approved</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2 lg:justify-end">
                    <PortalStatusBadge status={selectedOrg.profileStatus} />
                    {selectedOrg.profileStatus !== "verified" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={!allRequiredDocumentsApproved}
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
              </div>

              <div className="rounded-xl border border-border/70 bg-card p-4 shadow-sm lg:hidden">
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 text-left"
                  aria-expanded={registrationMobileInfoExpanded}
                  onClick={() => setRegistrationMobileInfoExpanded((current) => !current)}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">Organization Information</p>
                    <p className="mt-1 text-sm font-medium text-foreground">{selectedOrg.organizationEmail}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {[selectedOrg.barangay, selectedOrg.district].filter(Boolean).join(" · ") || "No location provided"}
                    </p>
                  </div>
                  {registrationMobileInfoExpanded ? (
                    <ChevronUp className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                </button>

                {registrationMobileInfoExpanded ? (
                  <div className="mt-4 space-y-4 border-t border-border/60 pt-4">
                    <div className="space-y-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">Contact &amp; Location</p>
                      <div className="space-y-2 text-sm">
                        <p className="break-all text-foreground">{selectedOrg.organizationEmail}</p>
                        <p className="text-muted-foreground">{selectedOrg.contactNumber || "No contact number"}</p>
                        <p className="text-muted-foreground">{selectedOrg.address || "No address provided"}</p>
                        {selectedOrg.facebookPageUrl ? (
                          <a
                            href={selectedOrg.facebookPageUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="break-all text-primary underline-offset-4 hover:underline"
                          >
                            {selectedOrg.facebookPageUrl}
                          </a>
                        ) : null}
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border/60 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">Leadership</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Representative: <span className="font-medium text-foreground">{selectedOrg.representativeName || "N/A"}</span></p>
                        <p>Adviser: <span className="font-medium text-foreground">{selectedOrg.adviserName || "N/A"}</span></p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border/60 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">Classification</p>
                      <div className="space-y-2 text-sm text-muted-foreground">
                        <p>Major: <span className="font-medium text-foreground">{selectedOrg.majorClassification || "N/A"}</span></p>
                        <p>Sub: <span className="font-medium text-foreground">{selectedOrg.subClassification || "N/A"}</span></p>
                        <p>Created: <span className="font-medium text-foreground">{selectedOrg.verifiedAt ? formatVerifiedDateLabel(selectedOrg.verifiedAt) : "Pending verification"}</span></p>
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-border/60 pt-4">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/75">Advocacies</p>
                      {renderAdvocacyChips(selectedOrg.advocacies)}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="hidden lg:block">
                <PortalSection
                  title="Organization Information"
                  action={
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-expanded={!registrationInfoCollapsed}
                      onClick={() => setRegistrationInfoCollapsed((current) => !current)}
                    >
                      {registrationInfoCollapsed ? "Expand" : "Collapse"}
                    </Button>
                  }
                >
                  {registrationInfoCollapsed ? (
                    <div className="rounded-xl border border-border/70 bg-muted/15 px-4 py-3 text-sm text-muted-foreground">
                      <p>
                        {selectedOrg.majorClassification || "Unclassified"} &middot; {selectedOrg.subClassification || "No sub-classification"} &middot; {selectedOrg.barangay || "No barangay"}
                      </p>
                      <p className="mt-1">
                        Representative: {selectedOrg.representativeName || "N/A"} &middot; Adviser: {selectedOrg.adviserName || "N/A"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-3 lg:grid-cols-2">
                      <div className="rounded-xl border border-border/70 bg-background p-3.5">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">Contact &amp; Location</p>
                        <div className="mt-3 divide-y divide-border/50">
                          <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Email</p>
                            <p className="break-all text-sm font-medium">{selectedOrg.organizationEmail}</p>
                          </div>
                          <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Contact</p>
                            <p className="text-sm font-medium">{selectedOrg.contactNumber || "N/A"}</p>
                          </div>
                          <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Barangay</p>
                            <p className="text-sm font-medium">{selectedOrg.barangay || "N/A"}</p>
                          </div>
                          <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Facebook</p>
                            {selectedOrg.facebookPageUrl ? (
                              <a href={selectedOrg.facebookPageUrl} target="_blank" rel="noreferrer" className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline">
                                {selectedOrg.facebookPageUrl}
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-muted-foreground">N/A</p>
                            )}
                          </div>
                          <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-3">
                            <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Address</p>
                            <p className="break-words text-sm font-medium">{selectedOrg.address || "N/A"}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <div className="rounded-xl border border-border/70 bg-background p-3.5">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">Leadership</p>
                          <div className="mt-3 divide-y divide-border/50">
                            <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Representative</p>
                              <p className="text-sm font-medium">{selectedOrg.representativeName || "N/A"}</p>
                            </div>
                            <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[8rem_minmax(0,1fr)] lg:gap-3">
                              <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Adviser</p>
                              <p className="text-sm font-medium">{selectedOrg.adviserName || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                        <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
                          <div className="rounded-xl border border-border/70 bg-background p-3.5">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">Classification</p>
                            <div className="mt-3 divide-y divide-border/50">
                              <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[6rem_minmax(0,1fr)] lg:gap-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Major</p>
                                <p className="text-sm font-medium">{selectedOrg.majorClassification || "N/A"}</p>
                              </div>
                              <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[6rem_minmax(0,1fr)] lg:gap-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Sub</p>
                                <p className="text-sm font-medium">{selectedOrg.subClassification || "N/A"}</p>
                              </div>
                              <div className="grid gap-1 py-2 first:pt-0 last:pb-0 lg:grid-cols-[6rem_minmax(0,1fr)] lg:gap-3">
                                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground/75">Created</p>
                                <p className="text-sm font-medium">{selectedOrg.verifiedAt ? formatVerifiedDateLabel(selectedOrg.verifiedAt) : "Pending verification"}</p>
                              </div>
                            </div>
                          </div>
                          <div className="rounded-xl border border-border/70 bg-background p-3.5">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/75">Advocacies</p>
                            <div className="mt-3">{renderAdvocacyChips(selectedOrg.advocacies)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </PortalSection>
              </div>

              {/* Documents */}
              <PortalSection
                title="Submitted Documents"
                description={`${selectedFiles.length}/${templateDocuments.length} files submitted from the organization user side.`}
              >
                {selectedSubmission ? (
                  <div className="space-y-4">
                    {orderedSubmittedFiles.length ? (
                      <>
                        <div className="space-y-4 lg:hidden">
                          <div className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm">
                            <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Submission Summary</p>
                            <p className="mt-2 text-sm font-medium text-foreground">
                              {submittedDocumentCount} submitted · {approvedDocumentCount} approved
                              {missingDocumentCount ? ` · ${missingDocumentCount} missing` : ""}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {orderedSubmittedFiles.length} queued for review
                            </p>
                          </div>

                          {activeReviewEntry ? (
                            <>
                              <div className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm">
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Document Selector</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Switch the active preview and review the current file from here.</p>
                                  </div>
                                  <Select
                                    value={activeReviewEntry.file.id}
                                    onValueChange={(value) => setActiveRegistrationReviewFileId(value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {orderedSubmittedFiles.map(({ documentType, file }) => (
                                        <SelectItem key={file.id} value={file.id}>
                                          {documentType.name}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center justify-between gap-2">
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={activeReviewIndex <= 0}
                                      onClick={() => setActiveRegistrationReviewFileId(filteredQueueEntries[Math.max(0, activeReviewIndex - 1)]?.file.id ?? null)}
                                    >
                                      <ArrowLeft className="mr-1.5 h-4 w-4" />
                                      Previous
                                    </Button>
                                    <span className="text-xs text-muted-foreground">
                                      {Math.max(activeReviewIndex + 1, 0)} of {filteredQueueEntries.length || orderedSubmittedFiles.length}
                                    </span>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      disabled={activeReviewIndex < 0 || activeReviewIndex >= filteredQueueEntries.length - 1}
                                      onClick={() => setActiveRegistrationReviewFileId(filteredQueueEntries[Math.min(filteredQueueEntries.length - 1, activeReviewIndex + 1)]?.file.id ?? null)}
                                    >
                                      Next
                                      <ArrowRight className="ml-1.5 h-4 w-4" />
                                    </Button>
                                  </div>
                                  {selectableBulkFileCount > 1 ? (
                                    <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2 text-xs"
                                        onClick={() =>
                                          setSelectedRegistrationReviewFileIds(
                                            orderedSubmittedFiles
                                              .filter((entry) => entry.file.adminStatus !== "approved_green")
                                              .map((entry) => entry.file.id),
                                          )
                                        }
                                      >
                                        Select all reviewable
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2 text-xs"
                                        onClick={() =>
                                          setSelectedRegistrationReviewFileIds(
                                            orderedSubmittedFiles
                                              .filter(
                                                (entry) =>
                                                  entry.file.adminStatus !== "approved_green" &&
                                                  (entry.file.adminStatus === "submitted" || entry.file.adminStatus === "under_admin_review"),
                                              )
                                              .map((entry) => entry.file.id),
                                          )
                                        }
                                      >
                                        Select all unreviewed
                                      </Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="h-8 px-2 text-xs text-muted-foreground"
                                        onClick={() => setSelectedRegistrationReviewFileIds([])}
                                      >
                                        Clear
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              <div className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <p className="text-base font-semibold text-foreground">{activeReviewEntry.documentType.name}</p>
                                      <PortalStatusBadge status={activeReviewEntry.file.adminStatus} />
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground" title={activeReviewEntry.file.fileName}>
                                      {activeReviewEntry.file.fileName}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      Current: {statusLabelMap[activeReviewEntry.file.adminStatus] ?? activeReviewEntry.file.adminStatus.replaceAll("_", " ")}
                                    </p>
                                  </div>
                                  <label className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                      type="checkbox"
                                      className="h-4 w-4 rounded border-border"
                                      checked={selectedRegistrationReviewFileIds.includes(activeReviewEntry.file.id)}
                                      disabled={isActiveDocumentLocked}
                                      onChange={(event) =>
                                        setSelectedRegistrationReviewFileIds((current) =>
                                          event.target.checked
                                            ? current.includes(activeReviewEntry.file.id)
                                              ? current
                                              : [...current, activeReviewEntry.file.id]
                                            : current.filter((item) => item !== activeReviewEntry.file.id),
                                        )
                                      }
                                    />
                                    Select
                                  </label>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => void openFile(activeReviewEntry.file.fileUrl, activeReviewEntry.file.fileName)}
                                  >
                                    <Eye className="mr-1.5 h-4 w-4" />
                                    Open File
                                  </Button>
                                  {activeReviewDraft?.decision !== "unreviewed" ? (
                                    <span
                                      className={cn(
                                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                                        registrationReviewPendingTone[activeReviewDraft.decision],
                                      )}
                                    >
                                      Pending: {registrationReviewDecisionLabel[activeReviewDraft.decision]}
                                    </span>
                                  ) : null}
                                </div>
                              </div>

                              <div className="overflow-hidden rounded-xl border border-border/70 bg-background shadow-sm">
                                {activeDocumentPreviewUrl ? (
                                  <iframe
                                    src={activeDocumentPreviewUrl}
                                    title={activeReviewEntry.file.fileName}
                                    className="w-full border-0"
                                    style={{ height: "clamp(420px, 62vh, 620px)" }}
                                  />
                                ) : (
                                  <div
                                    className="grid place-items-center p-6 text-center text-sm text-muted-foreground"
                                    style={{ minHeight: "clamp(420px, 62vh, 620px)" }}
                                  >
                                    Preview unavailable. Open the file in a new tab if needed.
                                  </div>
                                )}
                              </div>

                              <div className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm">
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Review Decision</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Stage one decision for the active document.</p>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Review decision">
                                    {(["approve", "needs_revision", "reject"] as const).map((decision) => {
                                      const isActive = activeReviewDraft?.decision === decision;
                                      return (
                                        <Button
                                          key={decision}
                                          type="button"
                                          variant={isActive ? (decision === "reject" ? "destructive" : "default") : "outline"}
                                          aria-pressed={isActive}
                                          className="min-w-0 whitespace-normal px-2 py-2 text-xs leading-tight"
                                          disabled={isActiveDocumentLocked}
                                          onClick={() =>
                                            setRegistrationReviewDraft(activeReviewEntry.file.id, {
                                              decision,
                                              remark:
                                                decision === "approve"
                                                  ? ""
                                                  : activeReviewDraft?.remark ?? activeReviewEntry.file.adminRemarks ?? "",
                                              expectedUpdatedAt: activeReviewEntry.file.updatedAt,
                                            })
                                          }
                                        >
                                          {registrationReviewDecisionLabel[decision]}
                                        </Button>
                                      );
                                    })}
                                  </div>
                                  {activeReviewDraft?.decision !== "unreviewed" ? (
                                    <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                                      <span className="text-muted-foreground">
                                        Pending:{" "}
                                        <span className="font-medium text-foreground">
                                          {registrationReviewDecisionLabel[activeReviewDraft.decision]}
                                        </span>
                                      </span>
                                      <Button type="button" variant="ghost" size="sm" onClick={() => clearRegistrationReviewDraft(activeReviewEntry.file.id)}>
                                        Clear
                                      </Button>
                                    </div>
                                  ) : null}
                                  {isActiveDocumentLocked ? (
                                    <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                      This document is already approved and locked.
                                    </div>
                                  ) : null}
                                  {registrationDecisionRequiresRemark(activeReviewDraft?.decision ?? "unreviewed") ? (
                                    <div className="space-y-2">
                                      <p className="text-sm font-medium text-foreground">Admin Remark *</p>
                                      <Textarea
                                        className="min-h-24"
                                        disabled={isActiveDocumentLocked}
                                        placeholder="Explain what needs to be corrected or why this document is rejected."
                                        value={activeReviewDraft?.remark ?? ""}
                                        onChange={(event) =>
                                          setRegistrationReviewDraft(activeReviewEntry.file.id, {
                                            decision: activeReviewDraft?.decision ?? "unreviewed",
                                            remark: event.target.value,
                                            expectedUpdatedAt: activeReviewEntry.file.updatedAt,
                                          })
                                        }
                                      />
                                    </div>
                                  ) : null}
                                </div>
                              </div>

                              {shouldShowMobileBulkReview ? (
                                <div className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm">
                                  <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 text-left"
                                    aria-expanded={registrationMobileBulkOpen}
                                    onClick={() => setRegistrationMobileBulkOpen((current) => !current)}
                                  >
                                    <div>
                                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Bulk Review</p>
                                      <p className="mt-1 text-sm text-muted-foreground">
                                        {selectedBulkFiles.length} selected document{selectedBulkFiles.length === 1 ? "" : "s"}
                                      </p>
                                    </div>
                                    {registrationMobileBulkOpen ? (
                                      <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    ) : (
                                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    )}
                                  </button>
                                  {registrationMobileBulkOpen ? (
                                    <div className="mt-4 grid gap-3 border-t border-border/60 pt-4">
                                      <div className="grid gap-2">
                                        <p className="text-sm font-medium text-foreground">Decision</p>
                                        <Select
                                          value={registrationBulkDecision}
                                          onValueChange={(value) => setRegistrationBulkDecision(value as Exclude<RegistrationReviewDecision, "unreviewed">)}
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="approve">Approve</SelectItem>
                                            <SelectItem value="needs_revision">Needs Revision</SelectItem>
                                            <SelectItem value="reject">Reject</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      {registrationDecisionRequiresRemark(registrationBulkDecision) ? (
                                        <div className="grid gap-2">
                                          <p className="text-sm font-medium text-foreground">Shared Remark</p>
                                          <Textarea
                                            className="min-h-20"
                                            placeholder="Used only when a selected document does not already have its own staged remark."
                                            value={registrationBulkRemark}
                                            onChange={(event) => setRegistrationBulkRemark(event.target.value)}
                                          />
                                        </div>
                                      ) : null}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => stageBulkRegistrationDecision(selectedBulkFiles.map((entry) => entry.file.id), registrationBulkDecision)}
                                      >
                                        Apply to Selected
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              ) : null}

                              <div className="rounded-xl border border-border/70 bg-background p-3.5 shadow-sm">
                                <div className="space-y-4">
                                  <div>
                                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Review Summary</p>
                                    <p className="mt-1 text-sm text-muted-foreground">Staged decisions stay local until you submit the batch review.</p>
                                  </div>
                                  {eligibleUnreviewedFileIds.length ? (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="w-full"
                                      onClick={() => stageApproveAllUnreviewedDocuments(eligibleUnreviewedFileIds)}
                                    >
                                      Approve all {eligibleUnreviewedFileIds.length} unreviewed
                                    </Button>
                                  ) : null}
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approve</p>
                                      <p className="mt-1 text-lg font-semibold text-foreground">{bulkDecisionSummary.approve}</p>
                                    </div>
                                    <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Needs Revision</p>
                                      <p className="mt-1 text-lg font-semibold text-foreground">{bulkDecisionSummary.needsRevision}</p>
                                    </div>
                                    <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Reject</p>
                                      <p className="mt-1 text-lg font-semibold text-foreground">{bulkDecisionSummary.reject}</p>
                                    </div>
                                    <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Unreviewed</p>
                                      <p className="mt-1 text-lg font-semibold text-foreground">{reviewableUnreviewedCount}</p>
                                    </div>
                                  </div>
                                  {!stagedDecisionCount ? <p className="text-sm text-muted-foreground">No decisions staged</p> : null}
                                  <Button
                                    type="button"
                                    className="w-full"
                                    disabled={registrationReviewSubmitting || !stagedDecisionCount || hasMissingDecisionRemark}
                                    onClick={() => void submitRegistrationReviewDecisions()}
                                  >
                                    {registrationReviewSubmitting
                                      ? "Submitting..."
                                      : stagedDecisionCount
                                      ? `Submit ${stagedDecisionCount} Review Decision${stagedDecisionCount === 1 ? "" : "s"}`
                                      : "Submit Review Decisions"}
                                  </Button>
                                </div>
                              </div>

                              <RecentActivityPreview
                                title="Recent Activity"
                                description={`Latest actions for ${activeReviewEntry.documentType.name}.`}
                                activities={activeReviewHistory}
                                maxItems={3}
                                onViewAll={
                                  activeReviewHistory.length > 3
                                    ? () => {
                                        setRecentActivityDialogTitle(`Recent Activity - ${activeReviewEntry.documentType.name}`);
                                        setRecentActivityDialogEntries(
                                          activeReviewHistory.map((entry, index) => ({
                                            key: entry.id,
                                            title: typeof entry.message === "string" ? entry.message : `Activity ${index + 1}`,
                                            timestamp:
                                              typeof entry.timestampLabel === "string"
                                                ? entry.timestampLabel
                                                : typeof entry.timestamp === "string"
                                                ? formatDateTimeLabel(entry.timestamp)
                                                : undefined,
                                            note: typeof entry.note === "string" ? entry.note : undefined,
                                            dotClassName: "bg-primary",
                                          })),
                                        );
                                        setRecentActivityDialogOpen(true);
                                      }
                                    : undefined
                                }
                                viewAllLabel="View all recent activity"
                                emptyDescription="Activity entries will appear after reviewers or the organization update this file."
                                className="border-border/70 bg-background shadow-sm"
                              />
                            </>
                          ) : (
                            <PortalEmptyState title="No document preview" description="Select a submitted document to begin reviewing it." />
                          )}
                        </div>

                        <div className="hidden items-start gap-4 lg:grid lg:grid-cols-[minmax(270px,0.9fr)_minmax(620px,2.2fr)_minmax(300px,0.95fr)]">
                        <div className="grid min-h-0 gap-4 lg:grid-rows-[minmax(0,1fr)_auto]">
                          <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Document Queue</p>
                                <p className="mt-1 text-sm text-muted-foreground">Review the current organization documents and switch the active preview from here.</p>
                              </div>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                    <span className="sr-only">Document queue actions</span>
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-56">
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSelectedRegistrationReviewFileIds(
                                        orderedSubmittedFiles
                                          .filter((entry) => entry.file.adminStatus !== "approved_green")
                                          .map((entry) => entry.file.id),
                                      )
                                    }
                                  >
                                    Select all reviewable
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      setSelectedRegistrationReviewFileIds(
                                        orderedSubmittedFiles
                                          .filter(
                                            (entry) =>
                                              entry.file.adminStatus !== "approved_green" &&
                                              (entry.file.adminStatus === "submitted" || entry.file.adminStatus === "under_admin_review"),
                                          )
                                          .map((entry) => entry.file.id),
                                      )
                                    }
                                  >
                                    Select all unreviewed
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    disabled={!eligibleUnreviewedFileIds.length}
                                    onClick={() => stageApproveAllUnreviewedDocuments(eligibleUnreviewedFileIds)}
                                  >
                                    Approve all {eligibleUnreviewedFileIds.length || ""} unreviewed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setSelectedRegistrationReviewFileIds([])}>
                                    Clear selection
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <div className="mt-4 max-h-[26rem] min-h-0 space-y-2 overflow-y-auto pr-1">
                              {filteredQueueEntries.length ? filteredQueueEntries.map(({ documentType, file }) => {
                                const draft = getRegistrationReviewDraft(
                                  file.id,
                                  file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red" ? file.adminRemarks : "",
                                  file.updatedAt,
                                );
                                const isSelected = selectedRegistrationReviewFileIds.includes(file.id);
                                const isActive = activeReviewEntry?.file.id === file.id;
                                const isLocked = file.adminStatus === "approved_green";
                                return (
                                  <div
                                    key={file.id}
                                    className={cn(
                                      "rounded-xl border transition-colors",
                                      isActive ? "border-primary bg-primary/5" : "border-border/60 bg-card",
                                    )}
                                  >
                                    <div className="flex items-start gap-3 px-3 py-3">
                                      <input
                                        type="checkbox"
                                        className="mt-1 h-4 w-4 rounded border-border"
                                        checked={isSelected}
                                        disabled={isLocked}
                                        onChange={(event) =>
                                          setSelectedRegistrationReviewFileIds((current) =>
                                            event.target.checked
                                              ? [...current, file.id]
                                              : current.filter((item) => item !== file.id),
                                          )
                                        }
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setActiveRegistrationReviewFileId(file.id)}
                                        className="min-w-0 flex-1 text-left"
                                      >
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="min-w-0 flex-1 text-sm font-medium leading-5 text-foreground">{documentType.name}</p>
                                          <PortalStatusBadge status={file.adminStatus} />
                                        </div>
                                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground" title={file.fileName}>
                                          {file.fileName}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                          <span className="text-muted-foreground">
                                            Current: {statusLabelMap[file.adminStatus] ?? file.adminStatus.replaceAll("_", " ")}
                                          </span>
                                          {draft.decision !== "unreviewed" ? (
                                            <span
                                              className={cn(
                                                "inline-flex items-center rounded-full border px-2 py-0.5 font-medium",
                                                registrationReviewPendingTone[draft.decision],
                                              )}
                                            >
                                              Pending: {registrationReviewDecisionLabel[draft.decision]}
                                            </span>
                                          ) : null}
                                        </div>
                                      </button>
                                    </div>
                                  </div>
                                );
                              }) : (
                                <div className="rounded-xl border border-dashed border-border/70 px-3 py-5 text-sm text-muted-foreground">
                                  No documents match the current queue filters.
                                </div>
                              )}
                            </div>
                          </div>

                          <RecentActivityPreview
                            title="Recent Activity"
                            description={activeReviewEntry ? `Latest actions for ${activeReviewEntry.documentType.name}.` : undefined}
                            activities={activeReviewHistory}
                            maxItems={3}
                            onViewAll={
                              activeReviewHistory.length > 3
                                ? () => {
                                    setRecentActivityDialogTitle(`Recent Activity - ${activeReviewEntry?.documentType.name ?? "Document"}`);
                                    setRecentActivityDialogEntries(
                                      activeReviewHistory.map((entry, index) => ({
                                        key: entry.id,
                                        title: typeof entry.message === "string" ? entry.message : `Activity ${index + 1}`,
                                        timestamp:
                                          typeof entry.timestampLabel === "string"
                                            ? entry.timestampLabel
                                            : typeof entry.timestamp === "string"
                                            ? formatDateTimeLabel(entry.timestamp)
                                            : undefined,
                                        note: typeof entry.note === "string" ? entry.note : undefined,
                                        dotClassName: "bg-primary",
                                      })),
                                    );
                                    setRecentActivityDialogOpen(true);
                                  }
                                : undefined
                            }
                            viewAllLabel="View full activity log"
                            emptyDescription="Activity entries will appear after reviewers or the organization update this file."
                            className="border-border/70 bg-background shadow-none"
                          />
                        </div>

                        <div className="active-document-panel flex min-h-0 flex-col overflow-hidden rounded-xl border border-border/70 bg-background p-4 lg:min-h-[calc(100vh-210px)]">
                          {activeReviewEntry ? (
                            <div className="flex min-h-0 flex-1 flex-col gap-4">
                              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-lg font-semibold text-foreground">{activeReviewEntry.documentType.name}</p>
                                  <p className="mt-1 truncate text-sm text-muted-foreground" title={activeReviewEntry.file.fileName}>
                                    {activeReviewEntry.file.fileName}
                                  </p>
                                </div>
                                <div className="flex shrink-0 items-center gap-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={activeReviewIndex <= 0}
                                    onClick={() => setActiveRegistrationReviewFileId(filteredQueueEntries[Math.max(0, activeReviewIndex - 1)]?.file.id ?? null)}
                                  >
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Previous
                                  </Button>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.max(activeReviewIndex + 1, 0)} of {filteredQueueEntries.length || orderedSubmittedFiles.length}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={activeReviewIndex < 0 || activeReviewIndex >= filteredQueueEntries.length - 1}
                                    onClick={() => setActiveRegistrationReviewFileId(filteredQueueEntries[Math.min(filteredQueueEntries.length - 1, activeReviewIndex + 1)]?.file.id ?? null)}
                                  >
                                    Next
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="min-h-0 flex-1 overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
                                {documentPreviewUrls[activeReviewEntry.file.id] ? (
                                  <iframe
                                    src={documentPreviewUrls[activeReviewEntry.file.id]}
                                    title={activeReviewEntry.file.fileName}
                                    className="h-full min-h-[28rem] w-full xl:min-h-[34rem]"
                                  />
                                ) : (
                                  <div className="grid h-full min-h-[28rem] place-items-center p-6 text-center text-sm text-muted-foreground xl:min-h-[34rem]">
                                    Preview unavailable. Open the file from the browser storage link if needed.
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <PortalEmptyState title="No document preview" description="Select a submitted document to begin reviewing it." />
                          )}
                        </div>

                        <div className="review-control-panel min-h-0 overflow-hidden rounded-xl border border-border/70 bg-background lg:sticky lg:top-4 lg:max-h-[calc(100vh-32px)] lg:overflow-y-auto">
                          {activeReviewEntry ? (
                            <div className="flex h-full flex-col divide-y divide-border/60">
                              <div className="space-y-4 p-4">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Review Decision</p>
                                  <p className="mt-1 text-sm text-muted-foreground">Stage one decision for the active document. Nothing is submitted until the final review action.</p>
                                </div>
                                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Review decision">
                                  {(["approve", "needs_revision", "reject"] as const).map((decision) => {
                                    const isActive = activeReviewDraft?.decision === decision;
                                    return (
                                      <Button
                                        key={decision}
                                        type="button"
                                        variant={isActive ? (decision === "reject" ? "destructive" : "default") : "outline"}
                                        aria-pressed={isActive}
                                        className="min-w-0 whitespace-normal px-2 py-2 text-xs leading-tight sm:px-3 sm:text-sm"
                                        disabled={isActiveDocumentLocked}
                                        onClick={() =>
                                          setRegistrationReviewDraft(activeReviewEntry.file.id, {
                                            decision,
                                            remark:
                                              decision === "approve"
                                                ? ""
                                                : activeReviewDraft?.remark ?? activeReviewEntry.file.adminRemarks ?? "",
                                            expectedUpdatedAt: activeReviewEntry.file.updatedAt,
                                          })
                                        }
                                      >
                                        {registrationReviewDecisionLabel[decision]}
                                      </Button>
                                    );
                                  })}
                                </div>
                                {activeReviewDraft?.decision !== "unreviewed" ? (
                                  <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-sm">
                                    <span className="text-muted-foreground">
                                      Pending:{" "}
                                      <span className="font-medium text-foreground">
                                        {registrationReviewDecisionLabel[activeReviewDraft.decision]}
                                      </span>
                                    </span>
                                    <Button type="button" variant="ghost" size="sm" onClick={() => clearRegistrationReviewDraft(activeReviewEntry.file.id)}>
                                      Clear
                                    </Button>
                                  </div>
                                ) : null}
                                {isActiveDocumentLocked ? (
                                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                                    This document is already approved.
                                  </div>
                                ) : null}
                                {registrationDecisionRequiresRemark(activeReviewDraft?.decision ?? "unreviewed") ? (
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium text-foreground">Admin Remark *</p>
                                    <Textarea
                                      className="min-h-24"
                                      disabled={isActiveDocumentLocked}
                                      placeholder="Explain what needs to be corrected or why this document is rejected."
                                      value={activeReviewDraft?.remark ?? ""}
                                      onChange={(event) =>
                                        setRegistrationReviewDraft(activeReviewEntry.file.id, {
                                          decision: activeReviewDraft?.decision ?? "unreviewed",
                                          remark: event.target.value,
                                          expectedUpdatedAt: activeReviewEntry.file.updatedAt,
                                        })
                                      }
                                    />
                                  </div>
                                ) : null}
                              </div>

                              <div className="space-y-4 p-4">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Bulk Review</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Selected: {selectedBulkFiles.length} document{selectedBulkFiles.length === 1 ? "" : "s"}
                                  </p>
                                </div>
                                <div className="grid gap-3">
                                  <div className="grid gap-2">
                                    <p className="text-sm font-medium text-foreground">Decision</p>
                                    <Select value={registrationBulkDecision} onValueChange={(value) => setRegistrationBulkDecision(value as Exclude<RegistrationReviewDecision, "unreviewed">)} disabled={!selectedBulkFiles.length}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="approve">Approve</SelectItem>
                                        <SelectItem value="needs_revision">Needs Revision</SelectItem>
                                        <SelectItem value="reject">Reject</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {registrationDecisionRequiresRemark(registrationBulkDecision) ? (
                                    <div className="grid gap-2">
                                      <p className="text-sm font-medium text-foreground">Shared Remark</p>
                                      <Textarea
                                        className="min-h-20"
                                        disabled={!selectedBulkFiles.length}
                                        placeholder="Used only when a selected document does not already have its own staged remark."
                                        value={registrationBulkRemark}
                                        onChange={(event) => setRegistrationBulkRemark(event.target.value)}
                                      />
                                    </div>
                                  ) : null}
                                  <Button
                                    type="button"
                                    variant="outline"
                                    disabled={!selectedBulkFiles.length}
                                    onClick={() => stageBulkRegistrationDecision(selectedBulkFiles.map((entry) => entry.file.id), registrationBulkDecision)}
                                  >
                                    Apply to Selected
                                  </Button>
                                </div>
                              </div>

                              <div className="mt-auto space-y-4 p-4">
                                <div>
                                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Review Summary</p>
                                  <p className="mt-1 text-sm text-muted-foreground">Staged decisions stay local until you submit the batch review.</p>
                                </div>
                                {eligibleUnreviewedFileIds.length ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => stageApproveAllUnreviewedDocuments(eligibleUnreviewedFileIds)}
                                  >
                                    Approve all {eligibleUnreviewedFileIds.length} unreviewed
                                  </Button>
                                ) : null}
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approve</p>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{bulkDecisionSummary.approve}</p>
                                  </div>
                                  <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Needs Revision</p>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{bulkDecisionSummary.needsRevision}</p>
                                  </div>
                                  <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Reject</p>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{bulkDecisionSummary.reject}</p>
                                  </div>
                                  <div className="rounded-lg border border-border/70 bg-muted/10 px-3 py-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Unreviewed</p>
                                    <p className="mt-1 text-lg font-semibold text-foreground">{reviewableUnreviewedCount}</p>
                                  </div>
                                </div>
                                {!stagedDecisionCount ? <p className="text-sm text-muted-foreground">No decisions staged</p> : null}
                                <Button
                                  type="button"
                                  className="w-full"
                                  disabled={registrationReviewSubmitting || !stagedDecisionCount || hasMissingDecisionRemark}
                                  onClick={() => void submitRegistrationReviewDecisions()}
                                >
                                  {registrationReviewSubmitting
                                    ? "Submitting..."
                                    : `Submit ${stagedDecisionCount} Review Decision${stagedDecisionCount === 1 ? "" : "s"}`}
                                </Button>
                              </div>
                            </div>
                          ) : null}
                        </div>
                        </div>
                      </>
                    ) : (
                      <PortalEmptyState
                        title="No submitted files yet"
                        description="Once the organization uploads documents, they will appear here for batch review."
                      />
                    )}
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
              <div className="registration-review-page space-y-4">
                <div className="review-filter-grid grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_220px]">
                  <Input
                    className="review-search"
                    value={registrationSearch}
                    onChange={(event) => setRegistrationSearch(event.target.value)}
                    placeholder="Search organizations..."
                  />
                  <Select value={registrationStatusFilter} onValueChange={setRegistrationStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
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
                      <SelectValue placeholder="District" />
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

                <div className="text-sm text-muted-foreground lg:hidden">
                  {filteredRegistrations.length} organization{filteredRegistrations.length === 1 ? "" : "s"} - {filteredRegistrations.filter((org) => org.profileStatus === "pending_review").length} pending review
                </div>

                {filteredRegistrations.length ? (
                  <>
                  <div className="grid gap-3 lg:hidden">
                    {filteredRegistrations.map((org) => {
                      const orgSubmission = state.documentSubmissions.find((item) => item.organizationId === org.id);
                      const submittedCount = orgSubmission
                        ? state.documentSubmissionFiles.filter(
                            (file) =>
                              file.submissionId === orgSubmission.id &&
                              validDocumentTypeIds.has(file.documentTypeId) &&
                              file.adminStatus !== "draft",
                          ).length
                        : 0;
                      const completionRate = templateDocuments.length ? Math.round((submittedCount / templateDocuments.length) * 100) : 0;
                      const statusDotColor =
                        org.profileStatus === "verified"
                          ? "bg-emerald-500"
                          : org.profileStatus === "needs_update" || org.profileStatus === "pending_review"
                          ? "bg-amber-400"
                          : "bg-muted-foreground/40";
                      return (
                        <Card key={org.id} className="border-border/70 shadow-sm">
                          <CardContent className="p-3.5">
                            <div className="organization-review-header grid grid-cols-[minmax(0,1fr)_auto] gap-2 items-start">
                              <div className="flex min-w-0 items-start gap-2.5">
                                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${statusDotColor}`} />
                                <div className="min-w-0">
                                  <p className="organization-review-name line-clamp-2 text-sm font-semibold leading-5 text-foreground">{org.organizationName}</p>
                                  <p className="organization-review-email mt-0.5 overflow-hidden text-ellipsis whitespace-nowrap text-xs text-muted-foreground">{org.organizationEmail}</p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    {[org.barangay, org.district].filter(Boolean).join(" - ") || "No location provided"}
                                  </p>
                                </div>
                              </div>
                              <div className="organization-review-status max-w-[112px] text-right">
                                <PortalStatusBadge status={org.profileStatus} />
                              </div>
                            </div>
                            <div className="mt-3 flex items-center justify-between gap-3">
                              <p className="text-xs text-muted-foreground">
                                {org.registrationType === "existing_urn" ? (
                                  <span className="font-medium text-foreground">Existing URN · {org.urnReviewStatus === "pending" ? "Pending URN Review" : org.urnReviewStatus.replaceAll("_", " ")}</span>
                                ) : <><span className="font-medium text-foreground">{submittedCount} of {templateDocuments.length}</span> documents</>}
                              </p>
                              <Button type="button" size="sm" className="h-10 px-3" onClick={() => handleRegistrationSelectionChange(org.id)}>
                                Review
                                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                              </Button>
                            </div>
                            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full bg-primary/60 transition-[width]"
                                style={{ width: `${completionRate}%` }}
                              />
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  <div className="hidden gap-4 lg:grid md:grid-cols-2">
                    {filteredRegistrations.map((org) => {
                      const orgSubmission = state.documentSubmissions.find((item) => item.organizationId === org.id);
                      const submittedCount = orgSubmission
                        ? state.documentSubmissionFiles.filter(
                            (file) =>
                              file.submissionId === orgSubmission.id &&
                              validDocumentTypeIds.has(file.documentTypeId) &&
                              file.adminStatus !== "draft",
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
                                    {[org.barangay, org.district].filter(Boolean).join(" - ") || "No location provided"}
                                  </p>
                                </div>
                              </div>
                              <PortalStatusBadge status={org.profileStatus} />
                            </div>
                            <div className="mt-4">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>{org.registrationType === "existing_urn" ? "Registration Type" : "Documents submitted"}</span>
                                <span className="font-medium">{org.registrationType === "existing_urn" ? "Existing URN" : `${submittedCount}/${templateDocuments.length}`}</span>
                              </div>
                              {org.registrationType !== "existing_urn" ? <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                                <div
                                  className="h-full rounded-full bg-primary/60 transition-[width]"
                                  style={{ width: templateDocuments.length ? `${(submittedCount / templateDocuments.length) * 100}%` : "0%" }}
                                />
                              </div> : <p className="mt-1.5 text-sm">{org.urnReviewStatus === "pending" ? "Pending URN Review" : org.urnReviewStatus.replaceAll("_", " ")}</p>}
                            </div>
                            <div className="mt-4 flex justify-end">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => handleRegistrationSelectionChange(org.id)}
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
                  </>
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

              <div className="space-y-4 lg:hidden">
                <Card className="border-border/70 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-6 text-foreground">{selectedBudgetRequest.activityTitle}</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedBudgetOrganization?.organizationName ?? "Unknown organization"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Activity Date: {budgetTimelineLabel}</p>
                      </div>
                      <PortalStatusBadge status={selectedBudgetRequest.status} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 border-y border-border/60 py-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Requested</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatPesoAmount(selectedBudgetRequest.requestedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                        <p className="mt-1 text-sm font-medium text-emerald-700">{formatPesoAmount(selectedBudgetRequest.approvedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Released</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatPesoAmount(selectedBudgetRequest.releasedAmount)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Venue</p>
                        <p className="mt-1 break-words text-sm font-medium text-foreground">{selectedBudgetRequest.venue || "Not specified"}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Purpose Category</p>
                      <p className="mt-1 text-sm font-medium text-foreground">{selectedBudgetRequest.purposeCategory || "Not specified"}</p>
                    </div>
                    {selectedBudgetRequest.remarks ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Organization Remarks</p>
                        <div className="mt-2 rounded-xl border border-border/60 bg-muted/10 p-3 text-sm text-foreground">
                          {selectedBudgetRequest.remarks}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Review Actions</p>
                    <div className="grid gap-2 min-[430px]:grid-cols-2">
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
                        className="min-[430px]:col-span-2"
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
                    </div>
                    {selectedBudgetRequest.adminRemarks ? (
                      <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Latest Admin Feedback</p>
                        <p className="text-sm text-amber-900">{selectedBudgetRequest.adminRemarks}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardContent className="space-y-4 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Attached Files</p>
                    {selectedBudgetRequestFiles.length ? (
                      <>
                        <DetailFilePills
                          items={selectedBudgetRequestFiles.map((file) => ({ id: file.id, fileName: file.fileName }))}
                          selectedId={selectedBudgetRequestFile?.id}
                          onSelect={setSelectedBudgetFileId}
                        />
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                          {budgetPreviewLoading ? (
                            <div className="grid place-items-center p-6 text-sm text-muted-foreground" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>Loading preview...</div>
                          ) : budgetPreviewUrl && budgetPreviewCanInline ? (
                            isImagePreviewFile(budgetPreviewTitle) || isImagePreviewFile(budgetPreviewUrl) ? (
                              <div className="flex items-center justify-center overflow-hidden bg-background" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>
                                <img src={budgetPreviewUrl} alt={budgetPreviewTitle || "Budget request preview"} className="max-h-[460px] w-full object-contain" />
                              </div>
                            ) : (
                              <iframe title={budgetPreviewTitle || "Budget Request Preview"} src={budgetPreviewUrl} className="w-full border-0 bg-background" style={{ height: "clamp(320px, 52vh, 460px)" }} loading="eager" />
                            )
                          ) : budgetPreviewUrl ? (
                            <div className="grid place-items-center p-6 text-center text-sm text-muted-foreground" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>
                              <div className="space-y-3">
                                <p>This uploaded file cannot be shown inline.</p>
                                <Button type="button" variant="outline" onClick={() => window.open(budgetPreviewUrl, "_blank", "noopener,noreferrer")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open File
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid place-items-center border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>
                              {budgetPreviewEmptyMessage || "No attached budget request file was uploaded."}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
                        No attached budget request files were submitted.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <RecentActivityPreview
                  title="Recent Activity"
                  activities={budgetRecentActivities.map((entry) => ({
                    id: entry.key,
                    message: entry.title,
                    note: entry.note || undefined,
                    timestamp: entry.timestamp,
                    timestampLabel: entry.timestamp,
                  }))}
                  onViewAll={
                    budgetRecentActivities.length > 3
                      ? () => {
                          setRecentActivityDialogTitle("Budget Request Activity");
                          setRecentActivityDialogEntries(budgetRecentActivities);
                          setRecentActivityDialogOpen(true);
                        }
                      : undefined
                  }
                  className="border-border/70 bg-background shadow-sm"
                  headerClassName="mb-2"
                  emptyMessage="No recent activity yet."
                  emptyDescription="Budget review activity will appear here once the request is processed."
                />
              </div>

              <div className="hidden lg:block">
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
                    <RecentActivityPreview
                      activities={budgetRecentActivities.map((entry) => ({
                        id: entry.key,
                        message: entry.title,
                        note: entry.note || undefined,
                        timestamp: entry.timestamp,
                        timestampLabel: entry.timestamp,
                      }))}
                      onViewAll={
                        budgetRecentActivities.length > 3
                          ? () => {
                              setRecentActivityDialogTitle("Budget Request Activity");
                              setRecentActivityDialogEntries(budgetRecentActivities);
                              setRecentActivityDialogOpen(true);
                            }
                          : undefined
                      }
                      className="border-0 bg-transparent p-0 shadow-none"
                      headerClassName="mb-2"
                      emptyMessage="No recent activity yet."
                      emptyDescription="Budget review activity will appear here once the request is processed."
                    />
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
            </div>
          );
        }
        return (
          <PortalSection title="Budget Requests" description="Review budget requests submitted by organizations. Approve requests to issue a go-signal, request revisions, or reject.">
            {state.budgetRequests.length ? (
              <div className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
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
                    <div className="space-y-3 lg:hidden">
                      {filteredAdminBudgetRequests.map((request) => {
                        const requestOrganization = state.organizationProfiles.find((org) => org.id === request.organizationId) ?? null;
                        const requestCode = buildPublicRecordCode("BR", request, state.budgetRequests);
                        const requestedAmount = formatPesoAmount(request.requestedAmount);
                        return (
                          <Card key={request.id} className="border-border/70 shadow-sm">
                            <CardContent className="grid gap-3 p-[14px] sm:p-4">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="overflow-hidden text-sm font-semibold leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                        {request.activityTitle || "Untitled request"}
                                      </p>
                                      {request.budgetRequestType === "ypop_incentive" ? (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                          <Trophy className="h-2.5 w-2.5 text-amber-600" />
                                          YPOP
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {requestOrganization?.organizationName ?? "Unknown organization"}
                                    </p>
                                  </div>
                                  <PortalStatusBadge status={request.status} />
                                </div>
                              </div>

                              <p className="min-w-0 break-words text-[0.82rem] leading-5 text-muted-foreground">
                                <span>{requestCode}</span> · <span className="font-medium text-emerald-600">{requestedAmount}</span>
                              </p>

                              <div className="grid grid-cols-2 gap-3 border-y border-border/60 py-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Proposed Date</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(request.proposedDate)}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Venue</p>
                                  <p className="mt-1 break-words text-sm font-medium text-foreground">{request.venue || "No venue"}</p>
                                </div>
                              </div>

                              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => openBudgetRequestDetails(request.id)}>
                                View Details
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm lg:block">
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

              <div className="space-y-4 lg:hidden">
                <Card className="border-border/70 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-base font-semibold leading-6 text-foreground">
                          {selectedLiquidationBudgetRequest?.activityTitle ?? "Liquidation Report"}
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {selectedLiquidationOrganization?.organizationName ?? "Unknown organization"}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">Deadline: {liquidationDeadlineLabel}</p>
                      </div>
                      <PortalStatusBadge status={selectedLiquidationReport.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {buildPublicRecordCode("LR", selectedLiquidationReport, visibleLiquidationReports)} ·{" "}
                      <span className="font-medium text-emerald-600">
                        {formatPesoAmount(selectedLiquidationBudgetRequest?.releasedAmount || selectedLiquidationBudgetRequest?.approvedAmount || 0)}
                      </span>
                    </p>
                    <div className="grid grid-cols-2 gap-3 border-y border-border/60 py-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(selectedLiquidationReport.goSignalAt)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Hardcopy Submitted</p>
                        <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(selectedLiquidationReport.hardCopySubmittedAt)}</p>
                      </div>
                    </div>
                    {selectedLiquidationReport.remarks ? (
                      <div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Organization Remarks</p>
                        <div className="mt-2 rounded-xl border border-border/60 bg-muted/10 p-3 text-sm text-foreground">
                          {selectedLiquidationReport.remarks}
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardContent className="space-y-3 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Review Actions</p>
                    <div className="grid gap-2 min-[430px]:grid-cols-2">
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
                    </div>
                    {selectedLiquidationReport.remarks ? (
                      <div className="rounded-xl border border-amber-200/70 bg-amber-50/60 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Latest Admin Feedback</p>
                        <p className="text-sm text-amber-900">{selectedLiquidationReport.remarks}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="border-border/70 shadow-sm">
                  <CardContent className="space-y-4 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Attached Files</p>
                    {selectedLiquidationReportFiles.length ? (
                      <>
                        <DetailFilePills
                          items={selectedLiquidationReportFiles.map((file) => ({ id: file.id, fileName: file.fileName }))}
                          selectedId={selectedLiquidationReportFile?.id}
                          onSelect={setSelectedLiquidationFileId}
                        />
                        <div className="overflow-hidden rounded-2xl border border-border/70 bg-background">
                          {liquidationPreviewLoading ? (
                            <div className="grid place-items-center p-6 text-sm text-muted-foreground" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>Loading preview...</div>
                          ) : liquidationPreviewUrl && liquidationPreviewCanInline ? (
                            isImagePreviewFile(liquidationPreviewTitle) || isImagePreviewFile(liquidationPreviewUrl) ? (
                              <div className="flex items-center justify-center overflow-hidden bg-background" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>
                                <img src={liquidationPreviewUrl} alt={liquidationPreviewTitle || "Liquidation file preview"} className="max-h-[460px] w-full object-contain" />
                              </div>
                            ) : (
                              <iframe title={liquidationPreviewTitle || "Liquidation Preview"} src={liquidationPreviewUrl} className="w-full border-0 bg-background" style={{ height: "clamp(320px, 52vh, 460px)" }} loading="eager" />
                            )
                          ) : liquidationPreviewUrl ? (
                            <div className="grid place-items-center p-6 text-center text-sm text-muted-foreground" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>
                              <div className="space-y-3">
                                <p>This uploaded file cannot be shown inline.</p>
                                <Button type="button" variant="outline" onClick={() => window.open(liquidationPreviewUrl, "_blank", "noopener,noreferrer")}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Open File
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="grid place-items-center border border-dashed border-border/60 bg-muted/10 p-6 text-center text-sm text-muted-foreground" style={{ minHeight: "clamp(320px, 52vh, 460px)" }}>
                              {liquidationPreviewEmptyMessage || "No liquidation file was uploaded."}
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-6 text-sm text-muted-foreground">
                        No attached liquidation files were submitted.
                      </div>
                    )}
                  </CardContent>
                </Card>

                <RecentActivityPreview
                  title="Recent Activity"
                  activities={liquidationRecentActivities.map((entry) => ({
                    id: entry.key,
                    message: entry.title,
                    note: entry.note || undefined,
                    timestamp: entry.timestamp,
                    timestampLabel: entry.timestamp,
                  }))}
                  onViewAll={
                    liquidationRecentActivities.length > 3
                      ? () => {
                          setRecentActivityDialogTitle("Liquidation Activity");
                          setRecentActivityDialogEntries(liquidationRecentActivities);
                          setRecentActivityDialogOpen(true);
                        }
                      : undefined
                  }
                  className="border-border/70 bg-background shadow-sm"
                  headerClassName="mb-2"
                  emptyMessage="No recent activity yet."
                  emptyDescription="Liquidation review activity will appear here once the report is processed."
                />
              </div>

              <div className="hidden lg:block">
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
                    <RecentActivityPreview
                      activities={liquidationRecentActivities.map((entry) => ({
                        id: entry.key,
                        message: entry.title,
                        note: entry.note || undefined,
                        timestamp: entry.timestamp,
                        timestampLabel: entry.timestamp,
                      }))}
                      onViewAll={
                        liquidationRecentActivities.length > 3
                          ? () => {
                              setRecentActivityDialogTitle("Liquidation Activity");
                              setRecentActivityDialogEntries(liquidationRecentActivities);
                              setRecentActivityDialogOpen(true);
                            }
                          : undefined
                      }
                      className="border-0 bg-transparent p-0 shadow-none"
                      headerClassName="mb-2"
                      emptyMessage="No recent activity yet."
                      emptyDescription="Liquidation review activity will appear here once the report is processed."
                    />
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
            </div>
          );
        }
        return (
          <PortalSection title="Liquidation Reports" description="Review liquidation reports submitted after funded activities. Approve completed reports, request revisions, or flag overdue ones.">
            {visibleLiquidationReports.length ? (
              <div className="space-y-3">
                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
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
                    <div className="space-y-3 lg:hidden">
                      {filteredVisibleLiquidationReports.map((record) => {
                        const linkedBudget = state.budgetRequests.find((item) => item.id === record.budgetRequestId) ?? null;
                        const reportCode = buildPublicRecordCode("LR", record, visibleLiquidationReports);
                        const budgetAmount = formatPesoAmount(
                          linkedBudget?.releasedAmount || linkedBudget?.approvedAmount || 0,
                        );
                        return (
                          <Card key={record.id} className="border-border/70 shadow-sm">
                            <CardContent className="grid gap-3 p-[14px] sm:p-4">
                              <div className="min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="overflow-hidden text-sm font-semibold leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
                                    {linkedBudget?.activityTitle ?? "Approved budget"}
                                  </p>
                                  <PortalStatusBadge status={record.status} />
                                </div>
                              </div>

                              <p className="min-w-0 break-words text-[0.82rem] leading-5 text-muted-foreground">
                                <span>{reportCode}</span> · <span className="font-medium text-emerald-600">{budgetAmount}</span>
                              </p>

                              <div className="grid grid-cols-2 gap-3 border-y border-border/60 py-3">
                                <div className="min-w-0">
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">
                                    {formatShortDate(record.goSignalAt || linkedBudget?.goSignalAt)}
                                  </p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Deadline</p>
                                  <p className="mt-1 text-sm font-medium text-foreground">{formatShortDate(record.deadlineAt)}</p>
                                </div>
                              </div>

                              <Button type="button" variant="outline" className="h-10 w-full" onClick={() => openLiquidationDetails(record)}>
                                View Details
                              </Button>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                    <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm lg:block">
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
          <div className="admin-news-releases-page">
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
                    setNewsCategoryDraft("");
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add News Release
                </Button>
              }
            >
              {newsReleases.length ? (
                <div className="space-y-3">
                  <div className="admin-news-toolbar grid gap-2 lg:grid-cols-[minmax(0,1fr)_200px] lg:gap-3">
                    <Input
                      className="lg:hidden"
                      value={newsSearch}
                      onChange={(event) => setNewsSearch(event.target.value)}
                      placeholder="Search news releases"
                    />
                    <Input
                      className="hidden lg:flex"
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
                  <p className="news-results-count lg:hidden">
                    {filteredNewsReleases.length} {filteredNewsReleases.length === 1 ? "news release" : "news releases"}
                  </p>
                  {filteredNewsReleases.length ? (
                    <div className="news-releases-list grid gap-3 lg:grid-cols-2 lg:gap-4">
                      {filteredNewsReleases.map((news) => {
                        const dotColor =
                          news.visibilityStatus === "published"
                            ? "bg-emerald-500"
                            : news.visibilityStatus === "hidden"
                            ? "bg-slate-400"
                            : "bg-amber-400";
                        const formattedDate = news.datePosted
                          ? new Intl.DateTimeFormat("en-PH", { year: "numeric", month: "short", day: "numeric" }).format(new Date(news.datePosted))
                          : "?";
                        return (
                          <Card key={news.id} className="news-release-card flex flex-col border-border/70 shadow-sm">
                            <CardContent className="flex flex-1 flex-col gap-3 p-4 lg:p-5">
                              <div className="news-card-thumbnail lg:hidden">
                                {news.previewImageUrl ? (
                                  <img src={news.previewImageUrl} alt="" />
                                ) : (
                                  <div className="news-card-thumbnail-placeholder">No thumbnail</div>
                                )}
                              </div>
                              <div className="news-card-header flex items-start justify-between gap-3">
                                <div className="flex min-w-0 items-start gap-2">
                                  <span className={`news-status-dot mt-1.5 h-2 w-2 shrink-0 rounded-full ${dotColor}`} />
                                  <p className="news-card-title break-words font-semibold leading-snug text-foreground" title={news.title}>{news.title}</p>
                                </div>
                                <div className="shrink-0">
                                  <PortalStatusBadge status={news.visibilityStatus} />
                                </div>
                              </div>
                              <p className="news-card-description line-clamp-3 pl-4 text-sm leading-relaxed text-muted-foreground">{news.description}</p>
                              <div className="news-card-metadata space-y-0.5 pl-4">
                                <p className="news-meta-item hidden text-xs text-muted-foreground lg:flex">
                                  <span className="news-meta-label">Posted</span>
                                  <span>{formattedDate}</span>
                                </p>
                                <p className="text-xs text-muted-foreground lg:hidden">
                                  Posted {formattedDate}
                                  {news.facebookPostUrl ? (
                                    <>
                                      {" · "}
                                      <a href={news.facebookPostUrl} target="_blank" rel="noopener noreferrer">
                                        Open Facebook Post ↗
                                      </a>
                                    </>
                                  ) : null}
                                </p>
                                <p className="news-meta-item hidden text-xs text-muted-foreground/70 lg:flex">
                                  <span className="news-meta-label">Facebook</span>
                                  {news.facebookPostUrl ? (
                                    <a href={news.facebookPostUrl} target="_blank" rel="noopener noreferrer" title={news.facebookPostUrl}>
                                      Open Facebook Post <span aria-hidden="true">↗</span>
                                    </a>
                                  ) : <span>Link not added</span>}
                                </p>
                                {news.previewImageUrl ? (
                                  <p className="news-meta-item hidden max-w-full text-xs text-muted-foreground/70 lg:flex">
                                    <span className="news-meta-label">Thumbnail</span>
                                    <span>Uploaded and ready for public preview</span>
                                  </p>
                                ) : (
                                  <p className="news-meta-item hidden max-w-full text-xs text-muted-foreground/70 lg:flex">
                                    <span className="news-meta-label">Thumbnail</span>
                                    <span>Not uploaded</span>
                                  </p>
                                )}
                              </div>
                              <div className="news-card-actions mt-auto flex flex-col gap-2 pt-1 lg:flex-row lg:items-center lg:justify-between">
                                <Button size="sm" variant="outline" className="w-full lg:w-auto" onClick={() => navigate(`/admin/news-releases/${news.id}`)}>
                                  <Eye className="mr-1.5 h-3.5 w-3.5" />
                                  Preview
                                </Button>
                                <div className="news-card-secondary-actions flex items-center justify-end gap-1.5">
                                  {news.visibilityStatus === "published" ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="hidden lg:inline-flex"
                                      onClick={() => openAdminConfirmation({ kind: "news_release", action: "hide", id: news.id, title: news.title })}
                                    >
                                      Hide
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="hidden lg:inline-flex"
                                      onClick={() => openAdminConfirmation({ kind: "news_release", action: "publish", id: news.id, title: news.title })}
                                    >
                                      Publish
                                    </Button>
                                  )}
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button size="sm" variant="ghost" className="news-card-more h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                        <span className="sr-only">More actions</span>
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-36">
                                      <DropdownMenuItem
                                        className="lg:hidden"
                                        onClick={() =>
                                          openAdminConfirmation({
                                            kind: "news_release",
                                            action: news.visibilityStatus === "published" ? "hide" : "publish",
                                            id: news.id,
                                            title: news.title,
                                          })
                                        }
                                      >
                                        {news.visibilityStatus === "published" ? "Hide" : "Publish"}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator className="lg:hidden" />
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
                      ? "Update the public news release details, source post link, and thumbnail image link."
                      : "Create a news release record with a source post link and optional thumbnail image link."}
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
                    <label htmlFor="news-release-category" className="text-sm font-medium">Category</label>
                    <Input
                      id="news-release-category"
                      name="newsReleaseCategory"
                      value={newsCategoryDraft}
                      onChange={(event) => setNewsCategoryDraft(event.target.value)}
                      placeholder="e.g. YORP, YPOP, MOVE"
                    />
                    <p className="text-xs text-muted-foreground">Optional tag shown on public news release cards.</p>
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
                  <div className="space-y-3">
                    <label htmlFor="news-release-preview-image-file" className="text-sm font-medium">Thumbnail Image</label>
                    <Input
                      id="news-release-preview-image-file"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(event) => setNewsPreviewImageFileDraft(event.target.files?.[0] ?? null)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Recommended: upload a JPG, PNG, or WebP image. The file is copied to Y-TRACE Storage so Facebook link restrictions do not break it.
                    </p>
                    <label htmlFor="news-release-preview-image-url" className="text-xs font-medium text-muted-foreground">Existing or external image URL</label>
                    <Input
                      id="news-release-preview-image-url"
                      name="newsReleasePreviewImageUrl"
                      value={newsPreviewImageUrlDraft}
                      onChange={(event) => setNewsPreviewImageUrlDraft(event.target.value)}
                      placeholder="https://example.com/thumbnail.jpg"
                    />
                    <p className="text-xs text-muted-foreground">
                      External URLs may expire or block image embedding. Uploading the image above is more reliable.
                    </p>
                    {newsPreviewImageFileDraft ? (
                      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-primary">
                        Ready to upload: <strong>{newsPreviewImageFileDraft.name}</strong>
                      </div>
                    ) : newsPreviewImageUrlDraft.trim() ? (
                      <div className="space-y-2 rounded-xl border border-border/70 bg-muted/10 p-3">
                        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                          Thumbnail Preview
                        </p>
                        <img
                          src={newsPreviewImageUrlDraft}
                          alt="News release thumbnail preview"
                          referrerPolicy="no-referrer"
                          onError={(event) => {
                            event.currentTarget.style.display = "none";
                          }}
                          className="h-40 w-full rounded-lg border border-border/60 object-cover"
                        />
                      </div>
                    ) : null}
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
          </div>
        );
      case "budget-monitoring":
      case "public-transparency-posts":
        return (
          <Tabs
            value={budgetMonitoringTab}
            onValueChange={(value) => setBudgetMonitoringTab(value as typeof budgetMonitoringTab)}
            className="budget-monitoring-page admin-budget-monitoring-page space-y-4 lg:space-y-5"
          >
            <div className="space-y-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-1">
                  <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Budget Monitoring</h1>
                  <p className="text-sm text-muted-foreground">
                    Track approved budgets, utilization, and liquidation progress.
                  </p>
                </div>
                <div className="page-actions flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={!budgetRequestExportRows.length}
                    onClick={() => setActiveReportExport("budget-requests")}
                    className="min-h-10 flex-1 px-3 text-sm sm:flex-none lg:min-h-[44px] lg:px-4"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Report
                  </Button>
                  <Button
                    type="button"
                    onClick={() => navigate("/admin/budget-utilization")}
                    className="min-h-10 flex-1 px-3 text-sm sm:flex-none lg:min-h-[44px] lg:px-4"
                  >
                    <ClipboardList className="mr-2 h-4 w-4" />
                    Review Budget Requests
                  </Button>
                </div>
              </div>

              <TabsList className="monitoring-tabs grid h-auto w-full grid-cols-2 gap-2 rounded-xl bg-muted/30 p-1 lg:flex lg:justify-start lg:gap-6 lg:rounded-none lg:border-b lg:border-border lg:bg-transparent lg:p-0">
                <TabsTrigger
                  value="overview"
                  className="relative h-auto rounded-lg border border-transparent px-3 py-2.5 text-center text-sm font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm lg:rounded-none lg:border-0 lg:border-b-2 lg:border-transparent lg:bg-transparent lg:px-0 lg:pb-3 lg:pt-0 lg:data-[state=active]:border-primary lg:data-[state=active]:bg-transparent lg:data-[state=active]:shadow-none"
                >
                  Monitoring Overview
                </TabsTrigger>
                <TabsTrigger
                  value="barangay-allocation"
                  className="relative h-auto rounded-lg border border-transparent px-3 py-2.5 text-center text-sm font-medium text-muted-foreground shadow-none transition-none data-[state=active]:border-primary/20 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm lg:rounded-none lg:border-0 lg:border-b-2 lg:border-transparent lg:bg-transparent lg:px-0 lg:pb-3 lg:pt-0 lg:data-[state=active]:border-primary lg:data-[state=active]:bg-transparent lg:data-[state=active]:shadow-none"
                >
                  Allocation by Barangay
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-0">
              <div className="space-y-4">
                <div className="monitoring-summary-grid grid grid-cols-2 gap-3 xl:grid-cols-4">
                  {[
                    {
                      label: "Released Budgets",
                      value: budgetMonitoringEntries.length.toLocaleString(),
                      helper: "Budget requests already released.",
                      icon: ClipboardList,
                      iconClasses: "bg-primary/10 text-primary",
                    },
                    {
                      label: "Utilization Rate",
                      value: `${budgetMonitoringAnalysis.utilizationRate}%`,
                      helper: "Released share of approved funds.",
                      icon: CheckCircle2,
                      iconClasses: "bg-amber-400/15 text-amber-700",
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
                      iconClasses: "bg-primary-soft text-primary",
                    },
                  ].map((metric) => {
                    const MetricIcon = metric.icon;
                    return (
                      <Card
                        key={metric.label}
                        className={cn(
                          "monitoring-summary-card border-border/70 shadow-sm",
                          metric.label.includes("Amount") ? "summary-card--currency max-[359px]:col-span-2" : "",
                        )}
                      >
                        <CardContent className="flex items-start gap-3 p-3 lg:min-h-[136px] lg:gap-4 lg:p-4">
                          <div className={`summary-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl lg:h-11 lg:w-11 ${metric.iconClasses}`}>
                            <MetricIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0 space-y-1">
                            <p className="summary-label text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">{metric.label}</p>
                            <p className="summary-value overflow-hidden text-[clamp(1.45rem,5.5vw,1.8rem)] font-semibold leading-[1.08] tracking-tight text-foreground lg:text-3xl">
                              {metric.value}
                            </p>
                            <p className="summary-description text-xs leading-5 text-muted-foreground lg:text-sm">{metric.helper}</p>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]">
                  <Card className="budget-health-snapshot border-border/70 shadow-sm">
                    <CardContent className="space-y-5 p-4 sm:p-5">
                      <div>
                        <h2 className="text-lg font-semibold text-foreground">Budget Health Snapshot</h2>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {budgetMonitoringEntries.length} cash-released budget{budgetMonitoringEntries.length === 1 ? "" : "s"} under monitoring.
                        </p>
                      </div>

                      {budgetMonitoringStatusRows.some((row) => row.count > 0) ? (
                        <div className="grid gap-4 lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-6 lg:items-center">
                          <div className="budget-health-chart relative mx-auto h-44 w-full max-w-[220px] lg:h-56 lg:max-w-[250px]">
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
                              <p className="text-2xl font-semibold tracking-tight text-foreground lg:text-3xl">{budgetMonitoringEntries.length}</p>
                              <p className="text-sm text-muted-foreground">Total Budgets</p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            {budgetMonitoringStatusRows.map((row) => (
                              <div key={row.riskLabel} className="space-y-1.5">
                                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                                  <div className="flex items-center gap-2.5">
                                    <span className={`h-2.5 w-2.5 rounded-full ${row.dotClass}`} />
                                    <p className="text-sm font-medium text-foreground">{row.riskLabel}</p>
                                  </div>
                                  <div className="text-right text-sm text-muted-foreground">
                                    <span className="font-semibold text-foreground">{row.count}</span> ({row.percentage}%)
                                  </div>
                                </div>
                                {row.count > 0 ? (
                                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div className={`h-full rounded-full ${row.barClass}`} style={{ width: `${row.percentage}%` }} />
                                  </div>
                                ) : null}
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
                          <ul className="divide-y divide-border/60">
                            {budgetMonitoringAnalysis.insights.map((insight) => (
                              <li key={insight} className="flex items-start gap-3 py-3 text-sm text-foreground first:pt-0 last:pb-0">
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
                    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px]">
                      <Input
                        className="lg:hidden"
                        value={budgetMonitoringSearch}
                        onChange={(event) => setBudgetMonitoringSearch(event.target.value)}
                        placeholder="Search by title, organization, or request ID"
                      />
                      <Input
                        className="hidden lg:flex"
                        value={budgetMonitoringSearch}
                        onChange={(event) => setBudgetMonitoringSearch(event.target.value)}
                        placeholder="Search budgets..."
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
                    <p className="mobile-budget-result-count lg:hidden">
                      {filteredBudgetMonitoringEntries.length} monitored {filteredBudgetMonitoringEntries.length === 1 ? "budget" : "budgets"}
                    </p>
                    {filteredBudgetMonitoringEntries.length ? (
                      <>
                      <div className="mobile-budget-list space-y-3 lg:hidden">
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
                            <Card key={entry.budgetRequestId} className="mobile-budget-card border-border/70 shadow-sm">
                              <CardContent className="space-y-3 p-3.5">
                                <div className="mobile-budget-card-heading">
                                  <div className="budget-primary-info min-w-0 space-y-1">
                                    <p className="font-semibold text-foreground">{entry.title}</p>
                                    <p className="text-xs text-muted-foreground">{entry.organizationName}</p>
                                    <p className="text-xs text-primary">Request ID: {buildPublicRecordCode("BR", linkedRequest, state.budgetRequests)}</p>
                                  </div>
                                  <div className="budget-status-row">
                                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${riskClasses}`}>{entry.riskLabel}</span>
                                    <PortalStatusBadge status={entry.budgetStatus} />
                                  </div>
                                </div>

                                <div className="mobile-budget-details grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:grid-cols-2">
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
                                    <p
                                      className={cn(
                                        "mt-1 text-sm font-medium",
                                        entry.riskLabel === "Overdue"
                                          ? "text-destructive"
                                          : entry.riskLabel === "Needs Attention"
                                            ? "text-amber-700"
                                            : "text-foreground",
                                      )}
                                    >
                                      {formatShortDate(entry.deadlineAt)}
                                    </p>
                                  </div>
                                </div>

                                <div className="mobile-budget-progress space-y-2 rounded-xl border border-border/50 bg-muted/10 p-3">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Fund Release Progress</p>
                                    <p className="text-sm font-medium text-foreground">{entry.utilizationRate}%</p>
                                  </div>
                                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                                    <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }} />
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    {formatStatusLabel(entry.liquidationStatus)} · Hard copy {formatShortDate(entry.hardCopySubmittedAt)} · Completed {formatShortDate(entry.completedAt)}
                                  </p>
                                </div>

                                <div className={cn("mobile-budget-actions grid gap-2", entry.liquidationReportId ? "grid-cols-2" : "grid-cols-1")}>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="min-h-10"
                                    onClick={() => openBudgetRequestDetails(entry.budgetRequestId)}
                                  >
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Budget Review
                                  </Button>
                                  {entry.liquidationReportId ? (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="min-h-10"
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
                      <div className="hidden overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm lg:block">
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
                {budgetMonitoringAnalysis.insights.length ? (
                  <Card className="mobile-monitoring-insights border-border/70 shadow-sm lg:hidden">
                    <CardContent className="p-4">
                      <h2 className="text-base font-semibold text-foreground">Monitoring Insights</h2>
                      <ul>
                        {(budgetInsightsExpanded ? budgetMonitoringAnalysis.insights : budgetMonitoringAnalysis.insights.slice(0, 2)).map((insight) => (
                          <li key={insight}>{insight}</li>
                        ))}
                      </ul>
                      {budgetMonitoringAnalysis.insights.length > 2 ? (
                        <button
                          type="button"
                          onClick={() => setBudgetInsightsExpanded((expanded) => !expanded)}
                        >
                          {budgetInsightsExpanded ? "Show fewer insights" : "View all insights"}
                        </button>
                      ) : null}
                    </CardContent>
                  </Card>
                ) : null}
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
                  description={
                    <>
                      <span className="lg:hidden">Released budgets grouped by the organizations’ registered barangay.</span>
                      <span className="hidden lg:inline">Released budgets broken down by the organizations' registered barangay.</span>
                    </>
                  }
                  action={
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!allocationByBarangayExportRows.length}
                      onClick={() => setActiveReportExport("allocation-by-barangay")}
                      className="allocation-filtered-export"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Filtered Report
                    </Button>
                  }
                >
                  <div className="allocation-mobile-filters grid grid-cols-2 gap-3 max-[359px]:grid-cols-1">
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

                  <div className="allocation-summary-grid mt-4 grid gap-2 lg:hidden">
                    <div className="allocation-summary-pair grid grid-cols-2 gap-2">
                      <Card className="allocation-summary-card border-border/70 shadow-sm">
                        <CardContent className="space-y-1 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">Active Barangays</p>
                          <p className="text-2xl font-semibold tracking-tight text-foreground">{budgetAllocationSummary.barangayCount.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Barangays with released budgets</p>
                        </CardContent>
                      </Card>
                      <Card className="allocation-summary-card border-border/70 shadow-sm">
                        <CardContent className="space-y-1 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">Utilization</p>
                          <p className="text-2xl font-semibold tracking-tight text-foreground">{budgetAllocationSummary.utilizationRate}%</p>
                          <p className="text-xs text-muted-foreground">Released vs. approved</p>
                        </CardContent>
                      </Card>
                    </div>
                    <Card className="allocation-summary-card is-primary is-currency border-border/70 shadow-sm">
                      <CardContent className="space-y-1 p-3">
                        <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">Released Amount</p>
                        <p className="text-[clamp(1.45rem,5.5vw,1.8rem)] font-semibold leading-[1.08] tracking-tight text-emerald-700">
                          PHP {budgetAllocationSummary.totalReleased.toLocaleString()}
                        </p>
                        <p className="text-xs text-muted-foreground">Total cash released</p>
                      </CardContent>
                    </Card>
                    <div className="allocation-summary-pair allocation-currency-pair grid grid-cols-2 gap-2">
                      <Card className="allocation-summary-card is-currency border-border/70 shadow-sm">
                        <CardContent className="space-y-1 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">Approved</p>
                          <p className="text-xl font-semibold tracking-tight text-foreground">PHP {budgetAllocationSummary.totalApproved.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Budget ceiling before release</p>
                        </CardContent>
                      </Card>
                      <Card className="allocation-summary-card is-currency border-border/70 shadow-sm">
                        <CardContent className="space-y-1 p-3">
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground/75">Remaining</p>
                          <p className="text-xl font-semibold tracking-tight text-foreground">PHP {budgetAllocationSummary.totalRemaining.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">Not yet released</p>
                        </CardContent>
                      </Card>
                    </div>
                  </div>

                  <div className="mt-4 hidden grid-cols-2 gap-2 sm:grid-cols-3 lg:grid lg:grid-cols-5">
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

                  <div className="allocation-by-barangay-mobile mt-4 lg:hidden">
                    <p className="allocation-result-count">
                      {filteredBudgetAllocationRows.length} {filteredBudgetAllocationRows.length === 1 ? "barangay" : "barangays"} found
                      {budgetAllocationDistrictFilter !== "all" ? ` in ${budgetAllocationDistrictFilter}` : ""}
                    </p>

                    {filteredBudgetAllocationRows.length ? (
                      <>
                        <div className="allocation-district-groups">
                          {groupedPagedBudgetAllocationRows.map((group) => (
                            <section key={group.district} className="allocation-district-group">
                              <div className="allocation-district-heading">
                                <h2>{group.district}</h2>
                                <p>
                                  {group.rows.length} {group.rows.length === 1 ? "barangay" : "barangays"} ·{" "}
                                  {group.organizationCount} {group.organizationCount === 1 ? "organization" : "organizations"}
                                </p>
                              </div>

                              <div className="mobile-barangay-list">
                                {group.rows.map((entry) => (
                                  <article key={`${entry.district}-${entry.barangay}`} className="mobile-barangay-card">
                                    <div className="barangay-card-heading">
                                      <h3>{entry.barangay}</h3>
                                      <span className="organization-count">
                                        {entry.organizationCount} org{entry.organizationCount === 1 ? "" : "s"}
                                      </span>
                                    </div>

                                    <dl className="barangay-financial-summary">
                                      <div>
                                        <dt>Approved</dt>
                                        <dd>PHP {entry.approvedAmount.toLocaleString()}</dd>
                                      </div>
                                      <div>
                                        <dt>Released</dt>
                                        <dd className="is-released">PHP {entry.releasedAmount.toLocaleString()}</dd>
                                      </div>
                                      <div>
                                        <dt>Remaining</dt>
                                        <dd>PHP {entry.remainingAmount.toLocaleString()}</dd>
                                      </div>
                                    </dl>

                                    <div className="barangay-utilization">
                                      <div className="utilization-heading">
                                        <span>Utilization</span>
                                        <strong>{entry.utilizationRate}%</strong>
                                      </div>
                                      <div className="utilization-track">
                                        <div
                                          className="utilization-fill"
                                          style={{ width: `${Math.min(entry.utilizationRate, 100)}%` }}
                                        />
                                      </div>
                                    </div>

                                    <button
                                      type="button"
                                      className="barangay-view-details"
                                      onClick={() => setSelectedBudgetAllocation(entry)}
                                    >
                                      <span>View Details</span>
                                      <ChevronRight className="h-4 w-4" />
                                    </button>
                                  </article>
                                ))}
                              </div>
                            </section>
                          ))}
                        </div>

                        <div className="allocation-pagination">
                          <p>
                            Showing {(budgetAllocationMobilePage - 1) * budgetAllocationMobilePageSize + 1}–
                            {Math.min(
                              budgetAllocationMobilePage * budgetAllocationMobilePageSize,
                              filteredBudgetAllocationRows.length,
                            )}{" "}
                            of {filteredBudgetAllocationRows.length} barangays
                          </p>
                          <div>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={budgetAllocationMobilePage === 1}
                              onClick={() => setBudgetAllocationMobilePage((page) => Math.max(1, page - 1))}
                            >
                              Previous
                            </Button>
                            <span>
                              Page {budgetAllocationMobilePage} of {budgetAllocationMobilePageCount}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={budgetAllocationMobilePage === budgetAllocationMobilePageCount}
                              onClick={() =>
                                setBudgetAllocationMobilePage((page) => Math.min(budgetAllocationMobilePageCount, page + 1))
                              }
                            >
                              Next
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <PortalEmptyState
                        title="No barangay allocations found"
                        description="Try another district or barangay filter. Only released budgets are included in this allocation view."
                      />
                    )}
                  </div>

                  <div className="mt-4 hidden overflow-hidden rounded-2xl border border-border/70 bg-background lg:block">
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
                            className="grid w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:outline-none lg:grid-cols-[1.8fr_1fr_1fr_1fr_1.2fr_auto] lg:items-center lg:gap-6 lg:px-5"
                          >
                              <div className="min-w-0">
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
                                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary lg:hidden">
                                  View details
                                  <ChevronRight className="h-4 w-4" />
                                </span>
                                <Eye className="hidden h-4 w-4 text-primary lg:block" />
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
          <div className="admin-template-management-page">
            <PortalSection
              title="Template Management"
              description="Manage downloadable templates for document submissions and other user-side reference files."
              action={
                <Button
                  type="button"
                  className="admin-news-header-add w-full sm:w-auto lg:hidden"
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
              <div className="mobile-template-presentation">
                {[
                  {
                    key: "document_submission" as const,
                    title: "Document Submissions",
                    description: "These templates appear inside the user document submissions page.",
                    items: templateDocuments,
                  },
                  {
                    key: "other" as const,
                    title: "Other Templates",
                    description: "These templates appear in the user Templates page for download and reference.",
                    items: otherTemplates,
                  },
                ].map((group) => (
                  <section key={group.key} className="mobile-template-section">
                    <div className="mobile-template-section-header">
                      <h2>{group.title}</h2>
                      <span>{group.items.length} {group.items.length === 1 ? "template" : "templates"}</span>
                    </div>
                    <p className="mobile-template-section-description">{group.description}</p>
                    {group.items.length ? (
                      <div className="mobile-template-list">
                        {group.items.map((template) => {
                          const uploadedDate = template.templateUploadedAt
                            ? new Intl.DateTimeFormat("en-PH", {
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                              }).format(new Date(template.templateUploadedAt))
                            : null;
                          const openEdit = () => startEditingTemplate(template.id);
                          return (
                            <MobileAdminTemplateCard
                              key={template.id}
                              template={template}
                              updatedDate={uploadedDate}
                              onPreview={() => void openPreview(template.templateFileUrl, template.templateFileName || template.name)}
                              onEdit={openEdit}
                              onReplace={openEdit}
                              onDelete={() => {
                                setEditingTemplateId(template.id);
                                setTemplateModalMode("delete");
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="mobile-template-empty">
                        <p>No {group.title.toLowerCase()} yet</p>
                        <span>Templates assigned to {group.title} will appear here after they are added.</span>
                      </div>
                    )}
                  </section>
                ))}
              </div>

              <div className="desktop-template-presentation">
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
              </div>
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
                    <Select value={templateScopeDraft} onValueChange={(value) => setTemplateScopeDraft(value as "document_submission" | "other")}>
                      <SelectTrigger id="template-document-scope">
                        <SelectValue placeholder="Select where this template should appear" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="document_submission">Document Submissions</SelectItem>
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
                            <Button
                              type="button"
                              className="admin-template-preview-download"
                              onClick={() => void openFile(previewUrl, previewTitle || "uploaded-file")}
                            >
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
          </div>
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
          approve_document_submission: { label: "Document Approved",       iconColor: "text-emerald-600", bgColor: "bg-emerald-500/10" },
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
        const mobileFilterTypes = [...new Set([
          ...filterTypes,
          ...state.activityLogs
            .map((log) => log.relatedType)
            .filter((type) => type && !filterTypes.includes(type)),
        ])];
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
        const handleActivityExport = async (format: ExportFormat) => {
          if (!filteredLogs.length) {
            toast({
              title: "No activity records found",
              description: "Try changing the selected category or time range.",
            });
            return;
          }

          setActivityExporting(format);
          try {
            const rows = filteredLogs.map((log) => {
              const organizationName =
                state.organizationProfiles.find((organization) => organization.id === log.organizationId)?.organizationName ?? "";
              return mapAuditLogToExportRow(log, {
                actor: log.actorUserId ? "Administrator" : "System",
                organization: organizationName,
              });
            });
            await exportReport(format, {
              config: activityLogExportConfig,
              rows,
              metadataLines: [
                "Generated by: Administrator",
                `Records: ${rows.length}`,
              ],
              filterSummaryLines: [
                `Category: ${activityLogFilter === "all" ? "All" : getFriendlyAuditCategory(activityLogFilter)}`,
                `Time Range: ${
                  activityDateFilter === "all"
                    ? "All time"
                    : `Last ${activityDateFilter.replace("d", "")} days`
                }`,
              ],
            });
            toast({
              title: "Export Ready",
              description: `The activity log ${format.toUpperCase()} export has been downloaded.`,
            });
          } catch (error) {
            console.error("Unable to export activity logs:", error);
            toast({
              title: "Export Failed",
              description: "Unable to export activity logs. Please try again.",
              variant: "destructive",
            });
          } finally {
            setActivityExporting(null);
          }
        };
        return (
          <div className="admin-activity-logs-page">
            <PortalSection title="Recent Activity" description="Audit trail of admin-side edits and review actions.">
            <div className="mobile-activity-controls">
              <Button
                type="button"
                variant="outline"
                className="activity-export-trigger"
                disabled={!filteredLogs.length || activityExporting !== null}
                onClick={() => setActivityExportDialogOpen(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>

              <div className="activity-category-filters" aria-label="Filter activity by category">
                {mobileFilterTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className={`activity-filter-chip ${activityLogFilter === type ? "is-active" : ""}`}
                    onClick={() => {
                      setActivityLogFilter(type);
                      setActivityPage(0);
                    }}
                  >
                    {type === "all" ? "All" : getFriendlyAuditCategory(type)}
                  </button>
                ))}
              </div>

              <select
                value={activityDateFilter}
                onChange={(event) => {
                  setActivityDateFilter(event.target.value as "all" | "7d" | "30d" | "90d");
                  setActivityPage(0);
                }}
                className="activity-time-filter"
                aria-label="Filter activity by time range"
              >
                <option value="all">All time</option>
                <option value="90d">Last 90 days</option>
                <option value="30d">Last 30 days</option>
                <option value="7d">Last 7 days</option>
              </select>
              <p className="activity-result-count">
                {filteredLogs.length} {filteredLogs.length === 1 ? "activity record" : "activity records"}
              </p>
            </div>

            <div className="desktop-activity-controls mb-4 flex flex-wrap items-center justify-between gap-3">
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
              <div className="flex items-center gap-2">
                <select
                  value={activityDateFilter}
                  onChange={(e) => { setActivityDateFilter(e.target.value as "all" | "7d" | "30d" | "90d"); setActivityPage(0); }}
                  className="rounded-full border border-border/60 bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground focus:outline-none"
                  aria-label="Filter activity by time range"
                >
                  <option value="all">All time</option>
                  <option value="90d">Last 90 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="7d">Last 7 days</option>
                </select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!filteredLogs.length || activityExporting !== null}
                  onClick={() => setActivityExportDialogOpen(true)}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </Button>
              </div>
            </div>
            {filteredLogs.length ? (
              <>
              <div className="desktop-activity-table overflow-hidden rounded-xl border border-border/70">
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
              <div className="mobile-activity-list">
                {pagedLogs.map((activity) => (
                  <MobileActivityLogItem
                    key={activity.id}
                    log={activity}
                    actorLabel={activity.actorUserId ? "Administrator" : "System"}
                  />
                ))}
              </div>
              </>
            ) : (
              <>
                <div className="desktop-activity-empty">
                  <PortalEmptyState title="No activity found" description="No logs match the selected filter." />
                </div>
                <div className="mobile-activity-empty">
                  <PortalEmptyState
                    title="No activity records found"
                    description="Try changing the selected category or time range."
                  />
                </div>
              </>
            )}
            {filteredLogs.length > ACTIVITY_PAGE_SIZE && (
              <>
              <div className="desktop-activity-pagination mt-3 flex items-center justify-between text-xs text-muted-foreground">
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
              <div className="mobile-activity-pagination">
                <span>
                  Showing {activityPage * ACTIVITY_PAGE_SIZE + 1}{"\u2013"}
                  {Math.min((activityPage + 1) * ACTIVITY_PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length}
                </span>
                <div className="mobile-activity-pagination-controls">
                  <Button variant="outline" size="sm" disabled={activityPage === 0} onClick={() => setActivityPage((page) => page - 1)}>
                    Previous
                  </Button>
                  <span>Page {activityPage + 1} of {totalActivityPages}</span>
                  <Button variant="outline" size="sm" disabled={activityPage >= totalActivityPages - 1} onClick={() => setActivityPage((page) => page + 1)}>
                    Next
                  </Button>
                </div>
              </div>
              </>
            )}
            </PortalSection>
            <ExportReportDialog
              open={activityExportDialogOpen}
              onOpenChange={setActivityExportDialogOpen}
              reportTitle="Activity Logs"
              description="Export all activity records matching the current category and time-range filters."
              onExport={handleActivityExport}
            />
          </div>
        );
      }
      case "users":
        return <UsersPage />;
      case "roles-permissions":
        return <Roles />;
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
          // Legacy entry-level uploads are intentionally retired from the
          // review UI. Proof now belongs to a city-led event or a PPA.
          const entryFiles: YPOPFile[] = [];
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
          const cityValidationScore = computeYpopScore(
            effectiveCityLedAttendance,
            semesterActivities,
            0,
            periodTiers,
          );
          const currentScore = computeYpopScore(
            effectiveCityLedAttendance,
            semesterActivities,
            approvedOrgActivityCount,
            periodTiers,
          );
          const {
            cityLedEarned,
            cityLedMax,
            cityLedPercent,
            cityLedWeightedScore,
          } = cityValidationScore;
          const { orgLedBonus, totalScore } = currentScore;
          const _sortedTiers = [...periodTiers].sort((a, b) => b.minProjects - a.minProjects);
          const _matchedTier = _sortedTiers.find((t) => form.orgLedProjectCount >= t.minProjects);
          const orgLedTierLabel = _matchedTier
            ? `≥ ${_matchedTier.minProjects} projects → +${_matchedTier.bonus}% bonus`
            : "0 projects → +0% bonus";
          const qualifies = cityLedPercent >= (entry.pointsRequired ?? YPOP_SCORE_THRESHOLD);
          const orgLedTierLabelDisplay = orgLedTierLabel && (_matchedTier
            ? `>= ${_matchedTier.minProjects} activit${_matchedTier.minProjects === 1 ? "y" : "ies"} -> +${_matchedTier.bonus}% bonus`
            : "0 activities -> +0% bonus");
          const persistYpopValidation = async () => {
            setSavingYpopValidation(true);
            try {
              const now = new Date().toISOString();
              const semActs = state.ypopCityActivities.filter((a) => a.semesterKey === entry.semester);
              const { cityLedPercent: computedScore } = computeYpopScore(
                effectiveCityLedAttendance,
                semActs,
                0,
                periodTiers,
              );
              const patch = {
                pointsEarned: computedScore,
                status: form.status,
                adminRemarks: form.adminRemarks,
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
            <div className="admin-ypop-validation-review-page space-y-5">
              {/* Header bar */}
              <div className="desktop-ypop-review-context desktop-review-toolbar flex flex-wrap items-center justify-between gap-3">
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

              <div className="desktop-ypop-review-context desktop-review-identity-card">
                <h2 className="text-lg font-semibold">{entryOrg?.organizationName ?? "Unknown org"}</h2>
                <p className="text-sm text-muted-foreground">{entry.semesterLabel}</p>
                {entryPeriod?.validationDeadline ? <small>Validation deadline: {formatShortDate(entryPeriod.validationDeadline)}</small> : null}
                {entry.submissionNote.trim() ? <div className="desktop-review-note"><strong>Org&apos;s Submission Note</strong><p>{entry.submissionNote}</p></div> : null}
              </div>

              <div className="mobile-ypop-validation-review">
                <section className="mobile-review-context mobile-review-section">
                  <div className="review-context-top">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedYpopId(null);
                        setYpopValidationForm(null);
                        setYpopPreviewFileId(null);
                        setYpopAdminView("period-detail");
                      }}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Period
                    </button>
                    <PortalStatusBadge status={entry.status} />
                  </div>
                  <h1>{entryOrg?.organizationName ?? "Unknown organization"}</h1>
                  <p>{entry.semesterLabel}</p>
                  {entryPeriod?.validationDeadline ? (
                    <small>Validation deadline: {formatShortDate(entryPeriod.validationDeadline)}</small>
                  ) : null}
                  {entry.submissionNote.trim() ? (
                    <div className="mobile-submission-note">
                      <strong>Org&apos;s Submission Note</strong>
                      <p>{entry.submissionNote}</p>
                    </div>
                  ) : null}
                </section>

                <section className="mobile-validation-summary mobile-review-section">
                  <div className="summary-heading">
                    <h2>Validation Summary</h2>
                    <span className={qualifies ? "qualifies" : "does-not-qualify"}>
                      {qualifies ? "Qualifies \u2713" : "Does Not Qualify"}
                    </span>
                  </div>
                  <div className="summary-score">
                    <strong>{totalScore}%</strong>
                    <span>Total score</span>
                  </div>
                  <div className="summary-progress">
                    <div style={{ width: `${Math.min(totalScore, 100)}%` }} />
                    <span style={{ left: `${entry.pointsRequired ?? YPOP_SCORE_THRESHOLD}%` }} />
                  </div>
                  <div className="summary-metrics">
                    <div><span>City-Led</span><strong>{cityLedWeightedScore}%</strong></div>
                    <div><span>Bonus</span><strong>+{orgLedBonus}%</strong></div>
                    <div><span>Threshold</span><strong>{entry.pointsRequired ?? YPOP_SCORE_THRESHOLD}%</strong></div>
                    <div><span>Total</span><strong>{totalScore}%</strong></div>
                  </div>
                </section>

                <section className="mobile-review-section mobile-activity-validation">
                  <div className="mobile-section-heading">
                    <div>
                      <h2>City-Led Activities</h2>
                      <p>Select the verified activities that should count toward the score.</p>
                    </div>
                    <strong>{cityLedEarned} / {cityLedMax} pts</strong>
                  </div>
                  {semesterActivities.length ? (
                    <div className="mobile-activity-options">
                      {semesterActivities.map((activity) => {
                        const checked = effectiveCityLedAttendance.find((attendance) => attendance.activityId === activity.id)?.attended ?? false;
                        return (
                          <label key={activity.id} className={`mobile-activity-option ${checked ? "is-selected" : ""} ${isTerminal ? "is-disabled" : ""}`}>
                            <input type="checkbox" checked={checked} disabled readOnly />
                            <span className="activity-option-content">
                              <strong>{activity.name}</strong>
                              <small>{activity.date}{activity.venue ? ` \u00b7 ${activity.venue}` : ""}</small>
                            </span>
                            <span className="points-badge">{normalizeYpopCityLedPoints(activity.points, activity.category)} pts</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mobile-review-empty">No city-led activities configured for this validation period.</p>
                  )}

                  <div className="mobile-org-activities">
                    <h2>Organization-Initiated Activities</h2>
                    <div className="org-activity-summary">
                      <span>Approved activities</span><strong>{approvedOrgActivityCount}</strong>
                      <span>Current bonus</span><strong>+{orgLedBonus}%</strong>
                    </div>
                    {orgActivities.length ? (
                      <div className="mobile-org-activity-list">
                        {orgActivities.map((activity) => {
                          const files = orgActivityFilesByActivityId.get(activity.id) ?? [];
                          return (
                            <div key={activity.id} className="mobile-org-activity-row">
                              <div className="mobile-row-heading">
                                <div>
                                  <strong>{activity.activityName}</strong>
                                  <small>{activity.activityDate || "Date TBD"}{activity.venue ? ` \u00b7 ${activity.venue}` : ""}</small>
                                </div>
                                <PortalStatusBadge status={activity.status} />
                              </div>
                              {activity.narrativeReport ? <p>{activity.narrativeReport}</p> : null}
                              {files.map((file) => (
                                <button key={file.id} type="button" className="mobile-proof-file" onClick={() => void openFile(file.fileUrl, file.fileName)}>
                                  <FileText className="h-4 w-4 shrink-0" />
                                  <span>{file.fileName}</span>
                                </button>
                              ))}
                              <div className="mobile-org-review-controls">
                                <Textarea
                                  value={ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks}
                                  onChange={(event) => setYpopEventReviewRemarksById((current) => ({ ...current, [activity.id]: event.target.value }))}
                                  rows={2}
                                  className="resize-none text-sm"
                                  placeholder="Feedback for this activity..."
                                  disabled={isTerminal}
                                />
                                {!isTerminal ? (
                                  <div className="proof-decision-actions">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="verify-action"
                                      onClick={() => openAdminConfirmation({
                                        kind: "ypop_org_activity",
                                        action: "approved",
                                        orgActivityId: activity.id,
                                        entryId: entry.id,
                                        organizationId: activity.organizationId,
                                        organizationName: entryOrg?.organizationName ?? "Organization",
                                        activityName: activity.activityName,
                                        currentAdminRemarks: ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks,
                                      })}
                                    >
                                      Approve Activity
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      className="needs-revision-action"
                                      onClick={() => openAdminConfirmation({
                                        kind: "ypop_org_activity",
                                        action: "needs_revision",
                                        orgActivityId: activity.id,
                                        entryId: entry.id,
                                        organizationId: activity.organizationId,
                                        organizationName: entryOrg?.organizationName ?? "Organization",
                                        activityName: activity.activityName,
                                        currentAdminRemarks: ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks,
                                      })}
                                    >
                                      Needs Revision
                                    </Button>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => openAdminConfirmation({
                                        kind: "ypop_org_activity",
                                        action: "rejected",
                                        orgActivityId: activity.id,
                                        entryId: entry.id,
                                        organizationId: activity.organizationId,
                                        organizationName: entryOrg?.organizationName ?? "Organization",
                                        activityName: activity.activityName,
                                        currentAdminRemarks: ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks,
                                      })}
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="mobile-review-empty">No organization-initiated activities were submitted for this validation period.</p>
                    )}
                  </div>
                </section>

                <section className="mobile-review-section mobile-proof-documents">
                  <div className="mobile-section-heading">
                    <h2>Proof Documents</h2>
                    <strong>{orgEventParticipations.length}</strong>
                  </div>
                  {orgEventParticipations.length ? (
                    <Accordion type="multiple" className="mobile-proof-accordion">
                      {orgEventParticipations.map((participation) => {
                        const files = eventFilesByParticipationId.get(participation.id) ?? [];
                        const remarksDraft = ypopEventReviewRemarksById[participation.id] ?? participation.adminRemarks;
                        const isSaving = processingAdminConfirmation && pendingAdminConfirmation?.kind === "ypop_event" && pendingAdminConfirmation.participationId === participation.id;
                        return (
                          <AccordionItem key={participation.id} value={participation.id} className="proof-accordion-item">
                            <AccordionTrigger className="proof-accordion-trigger hover:no-underline">
                              <div className="proof-trigger-content">
                                <strong>{participation.activityName}</strong>
                                <small>{participation.activityDate || "Date TBD"}{participation.venue ? ` \u00b7 ${participation.venue}` : ""}</small>
                                <small>{files.length} proof {files.length === 1 ? "file" : "files"}</small>
                              </div>
                              <PortalStatusBadge status={participation.status} />
                            </AccordionTrigger>
                            <AccordionContent className="proof-accordion-content">
                              {participation.status === "verified" && participation.verifiedAt ? (
                                <p className="proof-status-strip">
                                  Verified {"\u00b7"} {formatShortDate(participation.verifiedAt)}
                                </p>
                              ) : null}

                              <div className="proof-content-group">
                                <h3>Attached Files</h3>
                                {files.length ? files.map((file) => (
                                  <div key={file.id} className="file-row">
                                    <span>{file.fileName}</span>
                                    <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file.fileUrl, file.fileName)}>
                                      Open File
                                    </Button>
                                  </div>
                                )) : <p className="mobile-review-empty">No proof files uploaded yet.</p>}
                              </div>

                              <div className="proof-content-group">
                                <label>Event Remarks</label>
                                <Textarea
                                  value={remarksDraft}
                                  onChange={(event) => setYpopEventReviewRemarksById((current) => ({ ...current, [participation.id]: event.target.value }))}
                                  rows={3}
                                  className="resize-none text-sm"
                                  placeholder="Feedback for this event proof..."
                                />
                              </div>

                              <div className="proof-content-group">
                                <h3>Proof Decision</h3>
                                <div className="proof-decision-actions">
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="verify-action"
                                    disabled={isSaving}
                                    onClick={() => openAdminConfirmation({
                                      kind: "ypop_event",
                                      action: "verified",
                                      participationId: participation.id,
                                      entryId: entry.id,
                                      activityId: participation.activityId,
                                      organizationId: participation.organizationId,
                                      organizationName: entryOrg?.organizationName ?? "Organization",
                                      activityName: participation.activityName,
                                      currentAdminRemarks: remarksDraft,
                                    })}
                                  >
                                    {isSaving ? "Saving..." : "Verify Proof"}
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="needs-revision-action"
                                    disabled={isSaving}
                                    onClick={() => openAdminConfirmation({
                                      kind: "ypop_event",
                                      action: "needs_revision",
                                      participationId: participation.id,
                                      entryId: entry.id,
                                      activityId: participation.activityId,
                                      organizationId: participation.organizationId,
                                      organizationName: entryOrg?.organizationName ?? "Organization",
                                      activityName: participation.activityName,
                                      currentAdminRemarks: remarksDraft,
                                    })}
                                  >
                                    Needs Revision
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="destructive"
                                    disabled={isSaving}
                                    onClick={() => openAdminConfirmation({
                                      kind: "ypop_event",
                                      action: "rejected",
                                      participationId: participation.id,
                                      entryId: entry.id,
                                      activityId: participation.activityId,
                                      organizationId: participation.organizationId,
                                      organizationName: entryOrg?.organizationName ?? "Organization",
                                      activityName: participation.activityName,
                                      currentAdminRemarks: remarksDraft,
                                    })}
                                  >
                                    Reject Proof
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        );
                      })}
                    </Accordion>
                  ) : (
                    <p className="mobile-review-empty">No proof documents were submitted for this validation period.</p>
                  )}

                </section>

                <section className="mobile-review-section mobile-final-decision">
                  <h2>Final Validation Decision</h2>
                  <div>
                    <label htmlFor="mobile-ypop-status">Outcome</label>
                    <Select value={form.status} onValueChange={(value) => setYpopValidationForm({ ...form, status: value as YPOPStatus })} disabled={isTerminal || savingYpopValidation}>
                      <SelectTrigger id="mobile-ypop-status"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="under_review">Under Review</SelectItem>
                        <SelectItem value="needs_revision">Needs Revision</SelectItem>
                        <SelectItem value="qualified">Qualified {"\u2713"}</SelectItem>
                        <SelectItem value="not_qualified">Not Qualified</SelectItem>
                      </SelectContent>
                    </Select>
                    {!isTerminal ? <small>Suggested from the current computed score.</small> : null}
                  </div>
                  <div>
                    <label htmlFor="mobile-ypop-remarks">Admin Remarks</label>
                    <Textarea
                      id="mobile-ypop-remarks"
                      value={form.adminRemarks}
                      onChange={(event) => setYpopValidationForm({ ...form, adminRemarks: event.target.value })}
                      placeholder="Optional feedback for the organization..."
                      rows={3}
                      className="resize-none"
                      disabled={isTerminal || savingYpopValidation}
                    />
                  </div>
                  {!isTerminal ? (
                    <Button
                      type="button"
                      className="mobile-save-validation"
                      disabled={savingYpopValidation}
                      onClick={() => {
                        setYpopValidationAcknowledged(false);
                        setConfirmYpopValidationOpen(true);
                      }}
                    >
                      {savingYpopValidation ? "Saving..." : "Save City-Led Validation"}
                    </Button>
                  ) : null}
                </section>

                {(entry.revisionHistory?.length ?? 0) > 0 ? (
                  <section className="mobile-review-section mobile-review-activity">
                    <h2>Review Activity</h2>
                    {[...entry.revisionHistory!].slice(-3).reverse().map((revision, index) => (
                      <div key={`${revision.changedAt}-${index}`} className="mobile-review-activity-row">
                        <span />
                        <div>
                          <strong>{statusLabelMap[revision.action] ?? revision.action.replaceAll("_", " ")}</strong>
                          <small>{formatDateTimeLabel(revision.changedAt)}</small>
                          {revision.adminRemarks ? <p>{revision.adminRemarks}</p> : null}
                        </div>
                      </div>
                    ))}
                    {entry.revisionHistory!.length > 3 ? (
                      <button
                        type="button"
                        className="mobile-full-activity-log"
                        onClick={() => {
                          setRecentActivityDialogTitle(`Review Activity - ${entryOrg?.organizationName ?? "Organization"}`);
                          setRecentActivityDialogEntries(entry.revisionHistory!.map((revision, index) => ({
                            key: `${revision.changedAt}-${index}`,
                            title: statusLabelMap[revision.action] ?? revision.action.replaceAll("_", " "),
                            note: revision.adminRemarks || undefined,
                            timestamp: revision.changedAt,
                          })));
                          setRecentActivityDialogOpen(true);
                        }}
                      >
                        View full activity log
                      </button>
                    ) : null}
                  </section>
                ) : null}
              </div>

              {/* Two-column layout */}
              <div className="desktop-ypop-validation-review grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                {/* LEFT: Validation */}
                <div className="space-y-4">
                  {entry.submissionNote.trim() && (
                    <div className="desktop-legacy-submission-note rounded-xl border border-border/60 bg-muted/20 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Org's Submission Note</p>
                      <p className="text-sm">{entry.submissionNote}</p>
                    </div>
                  )}

                  <Card className="desktop-review-workflow border-border/70">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">Validation</CardTitle>
                    </CardHeader>
                    <CardContent className="desktop-review-workflow-content space-y-5 pt-0">
                      {/* City-Led Activities checklist */}
                      <div className="desktop-city-led-review space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold">City-Led Activities</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">Verified activities that count toward the score.</p>
                          </div>
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
                      <div className="desktop-ppa-review space-y-2">
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
                                        className="needs-revision-action"
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
                                        Reject
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
                      <div className="desktop-validation-summary rounded-xl border border-border/60 bg-muted/20 p-4 space-y-3">
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
                      <div className="desktop-final-decision-fields space-y-3">
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
                          className="desktop-save-validation w-full"
                          disabled={savingYpopValidation}
                          onClick={() => {
                            setYpopValidationAcknowledged(false);
                            setConfirmYpopValidationOpen(true);
                          }}
                        >
                          {savingYpopValidation ? "Saving…" : "Save City-Led Validation"}
                        </Button>
                      )}
                    </CardContent>
                  </Card>

                </div>

                {/* RIGHT: Proof Documents + History */}
                <div className="desktop-review-support space-y-3">
                  <Card className="desktop-summary-card border-border/70">
                    <CardContent className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Validation Summary</p>
                          <p className="text-xs text-muted-foreground">Current computed result</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${qualifies ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>
                          {qualifies ? "Qualifies ✓" : "Does Not Qualify"}
                        </span>
                      </div>
                      <div className="flex items-end gap-1">
                        <strong className="text-3xl tabular-nums">{totalScore}</strong>
                        <span className="mb-1 text-sm text-muted-foreground">% total</span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                        <div className={qualifies ? "h-full rounded-full bg-emerald-500" : "h-full rounded-full bg-amber-400"} style={{ width: `${Math.min(totalScore, 100)}%` }} />
                        <span className="absolute top-0 h-full w-0.5 bg-foreground/40" style={{ left: `${entry.pointsRequired ?? YPOP_SCORE_THRESHOLD}%` }} />
                      </div>
                      <div className="desktop-summary-metrics">
                        <div><span>City-Led</span><strong>{cityLedWeightedScore}%</strong></div>
                        <div><span>Bonus</span><strong>+{orgLedBonus}%</strong></div>
                        <div><span>Threshold</span><strong>{entry.pointsRequired ?? YPOP_SCORE_THRESHOLD}%</strong></div>
                        <div><span>Total</span><strong>{totalScore}%</strong></div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="desktop-proof-documents border-border/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold">Proof Documents ({orgEventParticipations.length})</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {orgEventParticipations.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No joined YPOP events for this organization in the selected semester yet.</p>
                      ) : (
                        <Accordion type="multiple" className="w-full rounded-xl border border-border/60">
                          {orgEventParticipations.slice(0, showAllYpopProofDocuments ? orgEventParticipations.length : 3).map((participation) => {
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
                                      className="needs-revision-action"
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
                                      Reject Proof
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
                                      {isSaving ? "Saving..." : "Verify Proof"}
                                    </Button>
                                  </div>
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      )}
                      {orgEventParticipations.length > 3 ? (
                        <Button type="button" variant="outline" className="w-full" onClick={() => setShowAllYpopProofDocuments((current) => !current)}>
                          {showAllYpopProofDocuments ? "Show less" : `View all proof documents (${orgEventParticipations.length})`}
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>

                  <Card className="desktop-org-activities-card border-border/70">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-sm font-semibold">Organization-Led Activities</CardTitle>
                          <p className="mt-1 text-xs text-muted-foreground">Review submitted PPA details and supporting files.</p>
                        </div>
                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">{orgActivities.length}</span>
                      </div>
                      <div className="desktop-org-activity-summary">
                        <div><span>Approved</span><strong>{approvedOrgActivityCount}</strong></div>
                        <div><span>Current bonus</span><strong>+{orgLedBonus}%</strong></div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-0">
                      {orgActivities.length === 0 ? (
                        <p className="rounded-lg border border-dashed border-border/70 p-3 text-sm text-muted-foreground">
                          No organization-led activities were submitted for this semester.
                        </p>
                      ) : (
                        <Accordion type="multiple" className="w-full rounded-xl border border-border/60">
                          {orgActivities.slice(0, showAllYpopOrgActivities ? orgActivities.length : 3).map((activity) => {
                            const files = orgActivityFilesByActivityId.get(activity.id) ?? [];
                            const remarksDraft = ypopEventReviewRemarksById[activity.id] ?? activity.adminRemarks;
                            return (
                              <AccordionItem key={activity.id} value={activity.id} className="border-border/60 px-4">
                                <AccordionTrigger className="gap-3 py-4 text-left hover:no-underline">
                                  <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-semibold">{activity.activityName}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {activity.activityDate || "Date TBD"}{activity.venue ? ` · ${activity.venue}` : ""}
                                      </p>
                                      <p className="text-xs text-muted-foreground">{files.length} attached file{files.length === 1 ? "" : "s"}</p>
                                    </div>
                                    <PortalStatusBadge status={activity.status} />
                                  </div>
                                </AccordionTrigger>
                                <AccordionContent className="space-y-4 pb-4">
                                  <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                                    <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Narrative Report</p>
                                    <p className="whitespace-pre-wrap text-sm">{activity.narrativeReport || "No narrative report provided."}</p>
                                  </div>
                                  <div className="space-y-2">
                                    <p className="text-sm font-medium">Attached Files ({files.length})</p>
                                    {files.length ? files.map((file) => (
                                      <div key={file.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2">
                                        <span className="min-w-0 truncate text-sm">{file.fileName}</span>
                                        <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file.fileUrl, file.fileName)}>Open</Button>
                                      </div>
                                    )) : <p className="text-sm text-muted-foreground">No proof files uploaded yet.</p>}
                                  </div>
                                  <div className="space-y-2">
                                    <label className="text-sm font-medium">PPA Remarks</label>
                                    <Textarea
                                      value={remarksDraft}
                                      onChange={(event) => setYpopEventReviewRemarksById((current) => ({ ...current, [activity.id]: event.target.value }))}
                                      rows={3}
                                      className="resize-none text-sm"
                                      placeholder="Feedback for this organization-led activity..."
                                      disabled={isTerminal}
                                    />
                                  </div>
                                  {!isTerminal ? (
                                    <div className="desktop-org-activity-actions">
                                      <Button
                                        type="button"
                                        size="sm"
                                        className="needs-revision-action"
                                        variant="outline"
                                        onClick={() => openAdminConfirmation({
                                          kind: "ypop_org_activity",
                                          action: "needs_revision",
                                          orgActivityId: activity.id,
                                          entryId: entry.id,
                                          organizationId: activity.organizationId,
                                          organizationName: entryOrg?.organizationName ?? "Organization",
                                          activityName: activity.activityName,
                                          currentAdminRemarks: remarksDraft,
                                        })}
                                      >Needs Revision</Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => openAdminConfirmation({
                                          kind: "ypop_org_activity",
                                          action: "rejected",
                                          orgActivityId: activity.id,
                                          entryId: entry.id,
                                          organizationId: activity.organizationId,
                                          organizationName: entryOrg?.organizationName ?? "Organization",
                                          activityName: activity.activityName,
                                          currentAdminRemarks: remarksDraft,
                                        })}
                                      >Reject</Button>
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => openAdminConfirmation({
                                          kind: "ypop_org_activity",
                                          action: "approved",
                                          orgActivityId: activity.id,
                                          entryId: entry.id,
                                          organizationId: activity.organizationId,
                                          organizationName: entryOrg?.organizationName ?? "Organization",
                                          activityName: activity.activityName,
                                          currentAdminRemarks: remarksDraft,
                                        })}
                                      >Approve PPA</Button>
                                    </div>
                                  ) : null}
                                </AccordionContent>
                              </AccordionItem>
                            );
                          })}
                        </Accordion>
                      )}
                      {orgActivities.length > 3 ? (
                        <Button type="button" variant="outline" className="w-full" onClick={() => setShowAllYpopOrgActivities((current) => !current)}>
                          {showAllYpopOrgActivities ? "Show less" : `View all organization-led activities (${orgActivities.length})`}
                        </Button>
                      ) : null}
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
                      {savingYpopValidation ? "Saving…" : "Save City-Led Validation"}
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
                  <PortalStatusBadge status={period.status} size="md" />
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
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 shrink-0 p-0 text-destructive hover:text-destructive"
                                onClick={() => setPendingDeleteConfirmation({ kind: "ypop_city_activity", id: act.id, title: act.name })}
                              >
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
                  return (
                    <Card key={period.id} className="border-border/70 shadow-sm">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-foreground">{period.semesterLabel}</p>
                              <PortalStatusBadge status={period.status} />
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
    activityExportDialogOpen,
    activityExporting,
    activityPage,
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
    newsPreviewImageFileDraft,
    newsPreviewImageUrlDraft,
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
    showAllYpopProofDocuments,
    showAllYpopOrgActivities,
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
  ]);

  const adminConfirmationCopy = getAdminConfirmationCopy();

  return (
    <>
      <PortalShell
        groups={navGroups}
        activeId={section}
        onNavigate={handleAdminSectionNavigate}
        onSignOut={() => setSignOutConfirmOpen(true)}
        userProfile={{ name: user?.displayName ?? "Administrator", role: "Super Admin", email: user?.email ?? "" }}
        notifications={adminNotifications}
        onMarkAllNotificationsRead={() => markAllNotificationsRead()}
      >
        {activeContent}
      </PortalShell>
      {confirmationDialog}
      <Dialog open={recentActivityDialogOpen} onOpenChange={setRecentActivityDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{recentActivityDialogTitle}</DialogTitle>
            <DialogDescription>
              Full activity history for this record.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[70vh] overflow-y-auto pr-1">
            <RecentActivityList
              activities={recentActivityDialogEntries.map((entry) => ({
                id: entry.key,
                message: entry.title,
                note: entry.note || undefined,
                timestamp: entry.timestamp,
                timestampLabel: entry.timestamp,
              }))}
            />
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(selectedInquiry)}
        onOpenChange={(open) => (!open && !savingInquiryStatus ? setSelectedInquiry(null) : undefined)}
      >
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
              <div className="space-y-4 rounded-xl border border-border/70 bg-muted/20 p-4">
                <div className="space-y-2">
                  <label htmlFor="inquiry-status" className="text-sm font-medium text-foreground">
                    Change Status
                  </label>
                  <Select
                    value={inquiryStatusDraft}
                    onValueChange={(value) => setInquiryStatusDraft(value as InquiryRecord["status"])}
                    disabled={savingInquiryStatus}
                  >
                    <SelectTrigger id="inquiry-status">
                      <SelectValue placeholder="Select inquiry status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending_review">Pending Review</SelectItem>
                      <SelectItem value="reviewed">Reviewed</SelectItem>
                      <SelectItem value="closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="inquiry-admin-remarks" className="text-sm font-medium text-foreground">
                    Admin Remarks <span className="font-normal text-muted-foreground">(optional)</span>
                  </label>
                  <Textarea
                    id="inquiry-admin-remarks"
                    value={inquiryAdminRemarksDraft}
                    onChange={(event) => setInquiryAdminRemarksDraft(event.target.value)}
                    placeholder="Add a note about this inquiry or status change."
                    rows={3}
                    disabled={savingInquiryStatus}
                  />
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={savingInquiryStatus}
              onClick={() => setSelectedInquiry(null)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={
                !selectedInquiry ||
                savingInquiryStatus ||
                (inquiryStatusDraft === selectedInquiry.status &&
                  inquiryAdminRemarksDraft.trim() === selectedInquiry.adminRemarks.trim())
              }
              onClick={() => void handleSaveInquiryStatus()}
            >
              {savingInquiryStatus ? "Saving..." : "Save Status"}
            </Button>
          </DialogFooter>
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
                : pendingDeleteConfirmation?.kind === "ypop_city_activity"
                ? "Delete City-Led Activity"
                : "Delete Transparency Post"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteConfirmation?.kind === "ypop_period"
                ? `Are you sure you want to delete "${pendingDeleteConfirmation.title}"? This will also remove its organization submissions, uploaded-file records, and ${pendingDeleteConfirmation.activityCount} configured activit${pendingDeleteConfirmation.activityCount !== 1 ? "ies" : "y"}. This action cannot be undone.`
                : pendingDeleteConfirmation?.kind === "ypop_city_activity"
                ? `Are you sure you want to delete "${pendingDeleteConfirmation.title}"? This action cannot be undone.`
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
