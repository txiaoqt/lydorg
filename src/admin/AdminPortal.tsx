import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import "./admin-inquiries.css";
import "./admin-ypop-validation-review.css";
import "./admin-budget-monitoring.css";
import { useNavigate } from "react-router-dom";
import { YorpRegistryPage } from "./pages/YorpRegistry";
import { Activity, AlertCircle, AlertTriangle, Archive, Award, ArrowLeft, ArrowRight, ArrowUpRight, Banknote, Bell, Building2, CalendarDays, CheckCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, CircleDollarSign, CircleHelp, Clipboard, ClipboardList, Clock, Clock3, Copy, CornerDownLeft, Download, Eye, EyeOff, ExternalLink, FileText, FolderOpen, Globe, History, Inbox, Info, Loader, Lock, LogOut, Mail, MapPin, Medal, Megaphone, MessageSquare, MoreHorizontal, Newspaper, Pencil, Phone, PieChart as PieChartIcon, Plus, Save, Search, Send, Settings, Shield, Trash2, TrendingUp, Trophy, Upload, UserCheck, UserPlus, UserRound, UserX, Users, Wallet, X, XCircle, type LucideIcon } from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { addYears, format, parse } from "date-fns";
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
import { DangerConfirmDialog } from "@/components/portal/DangerConfirmDialog";
import { AdminPageHeader } from "@/components/portal/AdminPageHeader";
import { ExportReportDialog } from "@/components/reports/ExportReportDialog";
import { ActivityLogsExportDialog } from "@/admin/components/ActivityLogsExportDialog";
import { DownloadDocumentsDialog } from "@/admin/components/DownloadDocumentsDialog";
import { type DownloadableFile } from "@/lib/document-compression";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { adminNavigationGroups as baseAdminNavigationGroups, buildPublicRecordCode, computeYpopScore, DEFAULT_ORG_LED_TIERS, deriveInquiryCategory, getApprovedYpopOrgActivityCount, getYpopCityLedPoints, INQUIRY_CATEGORY_OPTIONS, normalizeYpopCityLedPoints, resolveYpopCityLedCategory, orderTemplateCategories, YPOP_BASE_TOTAL_POINTS, formatActivityDateRange, YPOP_CITY_LED_CATEGORY_LABELS, YPOP_CITY_LED_CATEGORY_POINTS, YPOP_CITY_LED_MAX_POINTS, YPOP_SCORE_THRESHOLD, type ActivityLog, type BudgetRequestFileAdminStatus, type InquiryRecord, type NewsRelease, type PortalNavGroup, type PortalNavItem, type TemplateRecord, type TransparencyPost, type YPOPCityActivity, type YPOPCityActivityCategory, type YPOPEntry, type YPOPEventFile, type YPOPEventParticipation, type YPOPEventParticipationStatus, type YPOPFile, type YPOPOrgActivity, type YPOPOrgActivityFile, type YPOPOrgActivityStatus, type YPOPOrgLedTier, type YPOPPeriod, type YPOPPeriodStatus, type YPOPStatus } from "@/lib/lydo-connect-data";
import { statusLabelMap } from "@/lib/lydo-connect-data";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { UrnReviewPanel } from "@/admin/components/UrnReviewPanel";
import { StatsCard } from "@/admin/components/StatsCard";
import { NeedsAttentionList, type NeedsAttentionItem } from "@/admin/components/NeedsAttentionList";
import { BudgetMonitoringSummaryCard } from "@/admin/components/BudgetMonitoringSummaryCard";
import { RecentActivityLogCard, type RecentActivityLogItem } from "@/admin/components/RecentActivityLogCard";
import { CategoryChip, InquiriesTable, ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { YpopPeriodsTable, type YpopPeriodStatusFilter } from "@/admin/components/YpopPeriodsTable";
import { NewsReleasesTable } from "@/admin/components/NewsReleasesTable";
import { ActivityLogsTable, type ActivityDateFilter } from "@/admin/components/ActivityLogsTable";
import { TemplatesTable, type TemplateCategoryFilter, type TemplateStatusFilter } from "@/admin/components/TemplatesTable";
import { TemplateFilePreviewDialog } from "@/admin/components/TemplateFilePreviewDialog";
import { TemplateFormDialog } from "@/admin/components/TemplateFormDialog";
import { AdministratorsTable, type AdministratorRoleFilter, type AdministratorStatusFilter, type AdministratorUnitFilter } from "@/admin/components/AdministratorsTable";
import { RegistrationsTable, StatusPill as RegistrationStatusPill, type RegistrationStatusFilter } from "@/admin/components/RegistrationsTable";
import { YpopSubmissionsTable, StatusLabel, type YpopSubmissionRow } from "@/admin/components/YpopSubmissionsTable";
import { BudgetRequestsTable, StatusPill as BudgetStatusPill, type BudgetRequestsStatusFilter } from "@/admin/components/BudgetRequestsTable";
import { OrganizationFundingTable, type OrganizationFundingRow } from "@/admin/components/OrganizationFundingTable";
import {
  OrganizationBudgetDrawer,
  type OrganizationBudgetDetail,
  type OrganizationBudgetRequestRow,
} from "@/admin/components/OrganizationBudgetDrawer";
import { PublicBudgetSnapshotConfigPage } from "@/admin/components/PublicBudgetSnapshotConfigPage";
import {
  LiquidationReportsTable,
  LiquidationStatusLabel,
  matchesLiquidationStatusFilter,
  type LiquidationReportsStatusFilter,
} from "@/admin/components/LiquidationReportsTable";
import { formatFileSize } from "@/components/portal/UserPortalTemplatesWorkspaceView";
import { type PasigDistrict } from "@/lib/pasig-districts";
import { AdministratorFormDialog } from "@/admin/components/AdministratorFormDialog";
import { RolesPermissionsPanel } from "@/admin/components/RolesPermissionsPanel";
import { ADMIN_NAV_PERMISSION_MAP, hasAdminNavPermission } from "@/lib/admin-permissions";
import { NewsReleaseFormDialog, CalendarCaption } from "@/admin/components/NewsReleaseFormDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { InquiryDetailDrawer } from "@/admin/components/InquiryDetailDrawer";
import { ReplyEmailDialog } from "@/admin/components/ReplyEmailDialog";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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
  getAdminAccountsInSupabase,
  createNewsReleaseInSupabase,
  createTransparencyPostInSupabase,
  createTemplateRecordInSupabase,
  deleteNewsReleaseInSupabase,
  deleteNewsReleasePreviewImageFromSupabase,
  deleteTransparencyPostInSupabase,
  updateBudgetRequestInSupabase,
  deleteTemplateRecordInSupabase,
  reactivateTemplateRecordInSupabase,
  updateTemplateCategoryInSupabase,
  permanentlyDeleteTemplateRecordInSupabase,
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
  adminCloseYpopSemesterInSupabase,
  adminDeleteYpopPeriodFromSupabase,
  adminCreateYpopCityActivityInSupabase,
  adminUpdateYpopCityActivityInSupabase,
  adminDeleteYpopCityActivityFromSupabase,
  adminUpdateYpopEntryInSupabase,
  adminUpdateYpopEventParticipationInSupabase,
  adminUpdateYpopOrgActivityInSupabase,
  adminUpdateBudgetRequestFileStatusInSupabase,
  adminUpdateLiquidationReportFileStatusInSupabase,
  adminUpdateInquiryInSupabase,
  getAdministratorsInSupabase,
  getAdministratorRolesInSupabase,
  getAdministratorUnitsInSupabase,
  createAdministratorInSupabase,
  updateAdministratorInSupabase,
  setAdministratorActiveInSupabase,
  deleteAdministratorInSupabase,
  resendAdminInviteInSupabase,
  updateRolePermissionsInSupabase,
  DuplicateUsernameError,
} from "@/lib/lydo-connect-supabase";
import type { AdminRoleRecord, AdministratorRecord, SubmissionFile } from "@/lib/lydo-connect-data";

const RegistrationInfoBox = ({ label, title, description }: { label: string; title: string; description?: string }) => (
  <div className="flex flex-col gap-2 rounded-md border border-[#f3f7fb] bg-bg-panel-subtle px-4 py-3">
    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">{label}</p>
    <div className="flex flex-col gap-0.5">
      <p className="truncate font-segoe text-sm font-semibold leading-none text-text-default">{title}</p>
      {description ? <p className="truncate font-segoe text-xs font-normal leading-[140%] text-slate-500">{description}</p> : null}
    </div>
  </div>
);

const RegistrationContactBox = ({
  icon: Icon,
  label,
  title,
  description,
  href,
  showCopy,
}: {
  icon: LucideIcon;
  label: string;
  title: string;
  description?: string;
  href?: string;
  showCopy?: boolean;
}) => {
  const handleCopy = () => {
    void navigator.clipboard.writeText(title);
    toast({ title: "Copied", description: `${title} copied to clipboard.` });
  };

  return (
    <div className="flex items-center gap-3 rounded-md border border-slate-300 bg-admin-surface px-4 py-3">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-brand-secondary-100 p-2">
        <Icon className="h-5 w-5 text-border-brand-secondary" strokeWidth={2} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">{label}</p>
        <div className="flex min-w-0 items-center gap-1.5">
          {href ? (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="truncate font-segoe text-sm font-semibold leading-none text-text-default underline-offset-4 hover:underline"
            >
              {title}
            </a>
          ) : (
            <p className="truncate font-segoe text-sm font-semibold leading-none text-text-default">{title}</p>
          )}
          {showCopy ? (
            <button
              type="button"
              onClick={handleCopy}
              aria-label={`Copy ${label.toLowerCase()}`}
              className="shrink-0 text-slate-400 transition-colors hover:text-slate-600"
            >
              <Copy className="h-3.5 w-3.5" strokeWidth={1.6} />
            </button>
          ) : null}
        </div>
        {description ? <p className="truncate font-segoe text-xs font-normal leading-[140%] text-slate-500">{description}</p> : null}
      </div>
    </div>
  );
};

const DocumentQueueStatusPill = ({ status }: { status: SubmissionFile["adminStatus"] }) => {
  if (status === "approved_green") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        Approved
      </span>
    );
  }
  if (status === "rejected_red") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-status-danger-border bg-danger-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-danger-secondary">
        Rejected
      </span>
    );
  }
  if (status === "needs_revision") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
        Needs Revision
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-info-secondary">
      Pending Review
    </span>
  );
};

const YpopDocumentStatusPill = ({ status }: { status: YPOPEventParticipationStatus | YPOPOrgActivityStatus }) => {
  if (status === "verified" || status === "approved") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        {status === "verified" ? "Verified" : "Approved"}
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-status-danger-border bg-danger-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-danger-secondary">
        Rejected
      </span>
    );
  }
  if (status === "needs_revision") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
        Needs Revision
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-slate-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-slate-600">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-info-secondary">
      Pending Review
    </span>
  );
};

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
  administrators: "/admin/administrators",
  settings: "/admin/settings",
};

const adminId = "admin-demo";
const adminNavItemsById = new Map(
  baseAdminNavigationGroups.flatMap((group) => group.items).map((item) => [item.id, item] as const),
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
const withHiddenPdfToolbar = (url: string) => (url.includes("#") ? url : `${url}#toolbar=0`);

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

type RegistrationReviewDecision = "approve" | "needs_revision" | "reject";

const registrationReviewDecisionLabel: Record<RegistrationReviewDecision, string> = {
  approve: "Approve",
  needs_revision: "Request Revision",
  reject: "Reject",
};

const registrationDecisionRequiresRemark = (decision: RegistrationReviewDecision) =>
  decision === "needs_revision" || decision === "reject";

type BudgetReviewDecision = "approve" | "needs_revision" | "reject";

const budgetReviewDecisionLabel: Record<BudgetReviewDecision, string> = {
  approve: "Approve",
  needs_revision: "Request Revision",
  reject: "Reject",
};

const budgetDecisionRequiresRemark = (decision: BudgetReviewDecision) =>
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
  liquidatedAmount: number;
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
  const { state, mergeRemoteState, updateOrganizationProfile, createTemplate, removeTemplate, createNewsRelease, removeNewsRelease, updateNewsRelease, updateTransparencyPost, updateComplianceRemark, updateTemplate, createNotification, markNotificationRead, markAllNotificationsRead, updateBudgetRequest, updateBudgetRequestFile, updateLiquidationReport, updateLiquidationReportFile, updateInquiry, createYPOPEntry, updateYPOPEntry, updateYPOPEventParticipation, createYPOPOrgActivity, updateYPOPOrgActivity, createYPOPCityActivity, updateYPOPCityActivity, deleteYPOPCityActivity, createYPOPPeriod, updateYPOPPeriod, deleteYPOPPeriod } =
    useLydoConnect();
  const [selectedRegistrationId, setSelectedRegistrationId] = useState<string | null>(null);
  const [uploadingTemplateId, setUploadingTemplateId] = useState<string | null>(null);
  const [templateModalMode, setTemplateModalMode] = useState<"create" | "edit" | "delete" | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [templateDescriptionDraft, setTemplateDescriptionDraft] = useState("");
  const [templateScopeDraft, setTemplateScopeDraft] = useState<"document_submission" | "other">("document_submission");
  const [templateFileDraft, setTemplateFileDraft] = useState<File | null>(null);
  const [templateCategoryDraft, setTemplateCategoryDraft] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [templateSearch, setTemplateSearch] = useState("");
  const [templateCategoryFilter, setTemplateCategoryFilter] = useState<TemplateCategoryFilter>("all");
  const [templateStatusFilter, setTemplateStatusFilter] = useState<TemplateStatusFilter>("all");
  const [pendingArchiveTemplate, setPendingArchiveTemplate] = useState<TemplateRecord | null>(null);
  const [pendingDeleteTemplate, setPendingDeleteTemplate] = useState<TemplateRecord | null>(null);
  const [pendingRestoreTemplate, setPendingRestoreTemplate] = useState<TemplateRecord | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateRecord | null>(null);
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
  const [newsCategoryFilter, setNewsCategoryFilter] = useState<"all" | string>("all");
  const [newsViewMode, setNewsViewMode] = useState<"list" | "grid">("list");
  const [activityLogFilter, setActivityLogFilter] = useState<string>("all");
  const [activitySearch, setActivitySearch] = useState("");
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [activityDateFilter, setActivityDateFilter] = useState<ActivityDateFilter>("all");
  const [activityExporting, setActivityExporting] = useState<ExportFormat | null>(null);
  const [activityExportDialogOpen, setActivityExportDialogOpen] = useState(false);
  const [adminAccountsById, setAdminAccountsById] = useState<
    Record<string, { displayName: string; email: string; roleLabel: string | null }>
  >({});
  const [administrators, setAdministrators] = useState<AdministratorRecord[]>([]);
  const [administratorRoles, setAdministratorRoles] = useState<AdminRoleRecord[]>([]);
  const [administratorUnits, setAdministratorUnits] = useState<{ id: number; code: string; label: string }[]>([]);
  const [administratorsLoading, setAdministratorsLoading] = useState(false);
  const [administratorSearch, setAdministratorSearch] = useState("");
  const [administratorRoleFilter, setAdministratorRoleFilter] = useState<AdministratorRoleFilter>("all");
  const [administratorUnitFilter, setAdministratorUnitFilter] = useState<AdministratorUnitFilter>("all");
  const [administratorStatusFilter, setAdministratorStatusFilter] = useState<AdministratorStatusFilter>("all");
  const [administratorModalMode, setAdministratorModalMode] = useState<"create" | "edit" | null>(null);
  const [editingAdministratorId, setEditingAdministratorId] = useState<string | null>(null);
  const [administratorDisplayNameDraft, setAdministratorDisplayNameDraft] = useState("");
  const [administratorEmailDraft, setAdministratorEmailDraft] = useState("");
  const [administratorUsernameDraft, setAdministratorUsernameDraft] = useState("");
  const [administratorRoleIdDraft, setAdministratorRoleIdDraft] = useState<number | null>(null);
  const [administratorUnitIdDraft, setAdministratorUnitIdDraft] = useState<number | null>(null);
  const [savingAdministrator, setSavingAdministrator] = useState(false);
  const [pendingToggleActiveAdministrator, setPendingToggleActiveAdministrator] = useState<AdministratorRecord | null>(null);
  const [pendingDeleteAdministrator, setPendingDeleteAdministrator] = useState<AdministratorRecord | null>(null);
  const [resendingInviteId, setResendingInviteId] = useState<string | null>(null);
  const [administratorsExportDialogOpen, setAdministratorsExportDialogOpen] = useState(false);
  const [administratorsViewTab, setAdministratorsViewTab] = useState<"accounts" | "roles-permissions">("accounts");
  const [rolesPermissionsSubTab, setRolesPermissionsSubTab] = useState<"edit" | "compare">("edit");
  const [configuringRoleCode, setConfiguringRoleCode] = useState<"super_admin" | "admin">("super_admin");
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
  const [pendingNewsVisibilityConfirmation, setPendingNewsVisibilityConfirmation] = useState<{
    title: string;
    nextStatus: "published" | "hidden";
    onConfirm: () => void | Promise<void>;
  } | null>(null);
  const [approvalAcknowledged, setApprovalAcknowledged] = useState(false);
  const [statusChangeRemarkDraft, setStatusChangeRemarkDraft] = useState("");
  const [processingAdminConfirmation, setProcessingAdminConfirmation] = useState(false);
  const [inquirySearch, setInquirySearch] = useState("");
  const [inquiryStatusFilter, setInquiryStatusFilter] = useState<"all" | InquiryRecord["status"]>("all");
  const [inquiryCategoryFilter, setInquiryCategoryFilter] = useState<"all" | (typeof INQUIRY_CATEGORY_OPTIONS)[number]>("all");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [replyDialogInquiry, setReplyDialogInquiry] = useState<InquiryRecord | null>(null);
  const [inquiryStatusDraft, setInquiryStatusDraft] = useState<InquiryRecord["status"]>("pending_review");
  const [inquiryAdminRemarksDraft, setInquiryAdminRemarksDraft] = useState("");
  const [savingInquiryStatus, setSavingInquiryStatus] = useState(false);
  const [expandedRegistrationIds, setExpandedRegistrationIds] = useState<string[]>([]);
  const [expandedDocumentFileIds, setExpandedDocumentFileIds] = useState<string[]>([]);
  const [documentReviewRemarksByFileId, setDocumentReviewRemarksByFileId] = useState<Record<string, string>>({});
  const [selectedRegistrationReviewFileIds, setSelectedRegistrationReviewFileIds] = useState<string[]>([]);
  const [activeRegistrationReviewFileId, setActiveRegistrationReviewFileId] = useState<string | null>(null);
  const [registrationInfoCollapsed, setRegistrationInfoCollapsed] = useState(true);
  const [registrationBulkDecision, setRegistrationBulkDecision] = useState<RegistrationReviewDecision>("approve");
  const [registrationBulkRemark, setRegistrationBulkRemark] = useState("");
  const [registrationActivityVisibleCount, setRegistrationActivityVisibleCount] = useState(4);
  const [isRegistrationActivityPopoverOpen, setIsRegistrationActivityPopoverOpen] = useState(false);
  const registrationActivityTriggerRef = useRef<HTMLButtonElement | null>(null);
  const registrationActivityPanelRef = useRef<HTMLDivElement | null>(null);
  const [isRegistrationDecisionHelpOpen, setIsRegistrationDecisionHelpOpen] = useState(false);
  const registrationDecisionHelpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const registrationDecisionHelpPanelRef = useRef<HTMLDivElement | null>(null);
  const [isRegistrationDecisionConfirmOpen, setIsRegistrationDecisionConfirmOpen] = useState(false);
  const [registrationReviewSubmitting, setRegistrationReviewSubmitting] = useState(false);
  const [selectedBudgetRequestId, setSelectedBudgetRequestId] = useState<string | null>(null);
  const [budgetInfoCollapsed, setBudgetInfoCollapsed] = useState(true);
  const [budgetActivityVisibleCount, setBudgetActivityVisibleCount] = useState(4);
  const [isBudgetActivityPopoverOpen, setIsBudgetActivityPopoverOpen] = useState(false);
  const budgetActivityTriggerRef = useRef<HTMLButtonElement | null>(null);
  const budgetActivityPanelRef = useRef<HTMLDivElement | null>(null);
  const [selectedBudgetFileId, setSelectedBudgetFileId] = useState<string | null>(null);
  const [budgetPreviewUrl, setBudgetPreviewUrl] = useState("");
  const [budgetPreviewTitle, setBudgetPreviewTitle] = useState("");
  const [budgetPreviewEmptyMessage, setBudgetPreviewEmptyMessage] = useState("");
  const [budgetPreviewCanInline, setBudgetPreviewCanInline] = useState(false);
  const [budgetPreviewLoading, setBudgetPreviewLoading] = useState(false);
  const [selectedBudgetReviewFileIds, setSelectedBudgetReviewFileIds] = useState<string[]>([]);
  const [budgetBulkDecision, setBudgetBulkDecision] = useState<BudgetReviewDecision>("approve");
  const [budgetBulkRemark, setBudgetBulkRemark] = useState("");
  const [isBudgetDecisionHelpOpen, setIsBudgetDecisionHelpOpen] = useState(false);
  const budgetDecisionHelpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const budgetDecisionHelpPanelRef = useRef<HTMLDivElement | null>(null);
  const [isBudgetDecisionConfirmOpen, setIsBudgetDecisionConfirmOpen] = useState(false);
  const [budgetReviewSubmitting, setBudgetReviewSubmitting] = useState(false);
  const [liquidationInfoCollapsed, setLiquidationInfoCollapsed] = useState(true);
  const [liquidationActivityVisibleCount, setLiquidationActivityVisibleCount] = useState(4);
  const [isLiquidationActivityPopoverOpen, setIsLiquidationActivityPopoverOpen] = useState(false);
  const liquidationActivityTriggerRef = useRef<HTMLButtonElement | null>(null);
  const liquidationActivityPanelRef = useRef<HTMLDivElement | null>(null);
  const [selectedLiquidationReviewFileIds, setSelectedLiquidationReviewFileIds] = useState<string[]>([]);
  const [liquidationBulkDecision, setLiquidationBulkDecision] = useState<BudgetReviewDecision>("approve");
  const [liquidationBulkRemark, setLiquidationBulkRemark] = useState("");
  const [isLiquidationDecisionHelpOpen, setIsLiquidationDecisionHelpOpen] = useState(false);
  const liquidationDecisionHelpTriggerRef = useRef<HTMLButtonElement | null>(null);
  const liquidationDecisionHelpPanelRef = useRef<HTMLDivElement | null>(null);
  const [isLiquidationDecisionConfirmOpen, setIsLiquidationDecisionConfirmOpen] = useState(false);
  const [liquidationReviewSubmitting, setLiquidationReviewSubmitting] = useState(false);
  const [liquidationHardcopyDateReceived, setLiquidationHardcopyDateReceived] = useState(() => new Date().toISOString().slice(0, 10));
  const [isMarkingLiquidationHardcopy, setIsMarkingLiquidationHardcopy] = useState(false);
  const [isLiquidationHardcopyDateOpen, setIsLiquidationHardcopyDateOpen] = useState(false);
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
  const [budgetMonitoringTab, setBudgetMonitoringTab] = useState<"overview" | "barangay-allocation" | "public">("overview");
  const [budgetInsightsExpanded, setBudgetInsightsExpanded] = useState(false);
  const [budgetRequestsSearch, setBudgetRequestsSearch] = useState("");
  const [budgetRequestsStatusFilter, setBudgetRequestsStatusFilter] = useState<BudgetRequestsStatusFilter>("all");
  const [budgetRequestsDistrictFilter, setBudgetRequestsDistrictFilter] = useState<"all" | PasigDistrict>("all");
  const [budgetRequestsBarangayFilter, setBudgetRequestsBarangayFilter] = useState("all");
  const [budgetRequestsClassificationFilter, setBudgetRequestsClassificationFilter] = useState("all");
  const [liquidationReportsSearch, setLiquidationReportsSearch] = useState("");
  const [liquidationReportsStatusFilter, setLiquidationReportsStatusFilter] = useState<LiquidationReportsStatusFilter>("all");
  const [liquidationReportsDistrictFilter, setLiquidationReportsDistrictFilter] = useState<"all" | PasigDistrict>("all");
  const [liquidationReportsBarangayFilter, setLiquidationReportsBarangayFilter] = useState("all");
  const [liquidationReportsClassificationFilter, setLiquidationReportsClassificationFilter] = useState("all");
  const [budgetMonitoringSearch, setBudgetMonitoringSearch] = useState("");
  const [budgetMonitoringRiskFilter, setBudgetMonitoringRiskFilter] = useState("all");
  const [organizationFundingSearch, setOrganizationFundingSearch] = useState("");
  const [organizationFundingClassificationFilter, setOrganizationFundingClassificationFilter] = useState("all");
  const [barangayDetailSearch, setBarangayDetailSearch] = useState("");
  const [barangayDetailClassificationFilter, setBarangayDetailClassificationFilter] = useState("all");
  const [selectedOrganizationBudgetDetailId, setSelectedOrganizationBudgetDetailId] = useState<string | null>(null);
  const [isConfiguringPublicSnapshot, setIsConfiguringPublicSnapshot] = useState(false);
  const [registrationSearch, setRegistrationSearch] = useState("");
  const [registrationStatusFilter, setRegistrationStatusFilter] = useState<RegistrationStatusFilter>("all");
  const [registrationDistrictFilter, setRegistrationDistrictFilter] = useState<"all" | PasigDistrict>("all");
  const [registrationBarangayFilter, setRegistrationBarangayFilter] = useState("all");
  const [registrationClassificationFilter, setRegistrationClassificationFilter] = useState("all");
  const [budgetAllocationDistrictFilter, setBudgetAllocationDistrictFilter] = useState("all");
  const [budgetAllocationBarangayFilter, setBudgetAllocationBarangayFilter] = useState("all");
  const [budgetAllocationMobilePage, setBudgetAllocationMobilePage] = useState(1);
  const [budgetAllocationSearch, setBudgetAllocationSearch] = useState("");
  const [collapsedAllocationDistricts, setCollapsedAllocationDistricts] = useState<string[]>([]);
  const [activeReportExport, setActiveReportExport] = useState<ActiveReportExport>(null);
  const [downloadDialogOpen, setDownloadDialogOpen] = useState(false);
  const [downloadDialogCurrentFile, setDownloadDialogCurrentFile] = useState<DownloadableFile | null>(null);
  const [downloadDialogAllFiles, setDownloadDialogAllFiles] = useState<DownloadableFile[]>([]);
  const [downloadDialogZipName, setDownloadDialogZipName] = useState("Documents.zip");
  const [downloadDialogResolving, setDownloadDialogResolving] = useState(false);
  const [documentPreviewUrls, setDocumentPreviewUrls] = useState<Record<string, string>>({});
  const documentPreviewSourceRef = useRef<Record<string, string>>({});
  const [selectedYpopId, setSelectedYpopId] = useState<string | null>(null);
  const [ypopAdminView, setYpopAdminView] = useState<"periods" | "create-period" | "period-detail" | "entry-review">("periods");
  const [entryReviewTab, setEntryReviewTab] = useState<"city_led" | "org_led">("city_led");
  const [collapsedEntryReviewGroups, setCollapsedEntryReviewGroups] = useState<string[]>([]);
  const [selectedEntryReviewGroupIds, setSelectedEntryReviewGroupIds] = useState<string[]>([]);
  const [activeEntryReviewFileId, setActiveEntryReviewFileId] = useState<string | null>(null);
  const [entryReviewPreviewUrl, setEntryReviewPreviewUrl] = useState("");
  const [entryReviewPreviewTitle, setEntryReviewPreviewTitle] = useState("");
  const [entryReviewPreviewCanInline, setEntryReviewPreviewCanInline] = useState(false);
  const [entryReviewPreviewLoading, setEntryReviewPreviewLoading] = useState(false);
  const [entryReviewBulkDecision, setEntryReviewBulkDecision] = useState<"approve" | "needs_revision" | "reject">("approve");
  const [entryReviewBulkRemark, setEntryReviewBulkRemark] = useState("");
  const [entryReviewConfirmOpen, setEntryReviewConfirmOpen] = useState(false);
  const [entryReviewSubmitting, setEntryReviewSubmitting] = useState(false);

  useEffect(() => {
    setEntryReviewTab("city_led");
    setCollapsedEntryReviewGroups([]);
    setSelectedEntryReviewGroupIds([]);
    setActiveEntryReviewFileId(null);
    setEntryReviewBulkDecision("approve");
    setEntryReviewBulkRemark("");
  }, [selectedYpopId]);

  useEffect(() => {
    let isActive = true;
    const previewFile: YPOPEventFile | YPOPOrgActivityFile | undefined =
      state.ypopEventFiles.find((f) => f.id === activeEntryReviewFileId) ??
      state.ypopOrgActivityFiles.find((f) => f.id === activeEntryReviewFileId);

    if (!previewFile) {
      setEntryReviewPreviewUrl("");
      setEntryReviewPreviewCanInline(false);
      setEntryReviewPreviewLoading(false);
      return;
    }

    setEntryReviewPreviewTitle(previewFile.fileName);

    if (!previewFile.fileUrl.trim()) {
      setEntryReviewPreviewUrl("");
      setEntryReviewPreviewCanInline(false);
      setEntryReviewPreviewLoading(false);
      return;
    }

    setEntryReviewPreviewLoading(true);

    void (async () => {
      try {
        const resolvedUrl = await resolveSupabaseFileUrl(previewFile.fileUrl);
        if (!isActive) return;
        const finalUrl = resolvedUrl ?? "";
        setEntryReviewPreviewUrl(finalUrl);
        setEntryReviewPreviewCanInline(canInlinePreviewFile(previewFile.fileName) || canInlinePreviewFile(finalUrl));
      } catch {
        if (!isActive) return;
        setEntryReviewPreviewUrl("");
        setEntryReviewPreviewCanInline(false);
      } finally {
        if (isActive) setEntryReviewPreviewLoading(false);
      }
    })();

    return () => {
      isActive = false;
    };
  }, [activeEntryReviewFileId, state.ypopEventFiles, state.ypopOrgActivityFiles]);
  const [selectedYpopPeriodId, setSelectedYpopPeriodId] = useState<string | null>(null);
  const [ypopPeriodSearch, setYpopPeriodSearch] = useState("");
  const [ypopPeriodStatusFilter, setYpopPeriodStatusFilter] = useState<YpopPeriodStatusFilter>("all");
  const [createPeriodForm, setCreatePeriodForm] = useState<{ semesterLabel: string; validationDeadline: string; status: YPOPPeriodStatus }>({ semesterLabel: deriveSemesterLabelFromDate(), validationDeadline: "", status: "draft" });
  const [editingPeriodId, setEditingPeriodId] = useState<string | null>(null);
  const [createPeriodActivities, setCreatePeriodActivities] = useState<Array<{ tempId: string; name: string; startDate: string; endDate: string; venue: string; category: YPOPCityActivityCategory }>>([]);
  const [createFormNewActivity, setCreateFormNewActivity] = useState<{ name: string; startDate: string; endDate: string; venue: string; category: YPOPCityActivityCategory } | null>(null);
  const [createPeriodOrgLedTiers, setCreatePeriodOrgLedTiers] = useState<YPOPOrgLedTier[]>(DEFAULT_ORG_LED_TIERS);
  const [ypopSubmissionFilter, setYpopSubmissionFilter] = useState<"all" | "pending_evaluation" | "qualified" | "not_qualified">("all");
  const [ypopSubmissionSearch, setYpopSubmissionSearch] = useState("");
  const [ypopSubmissionClassificationFilter, setYpopSubmissionClassificationFilter] = useState("all");
  const [newActivityForm, setNewActivityForm] = useState<{ name: string; startDate: string; endDate: string; venue: string; category: YPOPCityActivityCategory } | null>(null);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [editingDraftTempId, setEditingDraftTempId] = useState<string | null>(null);
  const [editingActivityData, setEditingActivityData] = useState<{ name: string; startDate: string; endDate: string; venue: string; category: YPOPCityActivityCategory } | null>(null);
  const [submittingPeriodStatus, setSubmittingPeriodStatus] = useState<"draft" | "publish" | null>(null);
  const [deadlineDateOpen, setDeadlineDateOpen] = useState(false);
  const [activityStartDateOpen, setActivityStartDateOpen] = useState(false);
  const [activityEndDateOpen, setActivityEndDateOpen] = useState(false);
  const [recentActivityDialogOpen, setRecentActivityDialogOpen] = useState(false);
  const [recentActivityDialogTitle, setRecentActivityDialogTitle] = useState("Recent Activity");
  const [recentActivityDialogEntries, setRecentActivityDialogEntries] = useState<RecentActivityEntry[]>([]);

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
      const matchesDistrict = budgetRequestsDistrictFilter === "all" || requestOrganization?.district === budgetRequestsDistrictFilter;
      const matchesBarangay = budgetRequestsBarangayFilter === "all" || requestOrganization?.barangay === budgetRequestsBarangayFilter;
      const matchesClassification =
        budgetRequestsClassificationFilter === "all" || requestOrganization?.majorClassification === budgetRequestsClassificationFilter;
      return matchesSearch && matchesStatus && matchesDistrict && matchesBarangay && matchesClassification;
    });
  }, [
    budgetRequestsSearch,
    budgetRequestsStatusFilter,
    budgetRequestsDistrictFilter,
    budgetRequestsBarangayFilter,
    budgetRequestsClassificationFilter,
    state.budgetRequests,
    state.organizationProfiles,
  ]);
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
      const matchesStatus = matchesLiquidationStatusFilter(report.status, liquidationReportsStatusFilter as LiquidationReportsStatusFilter);
      const matchesDistrict = liquidationReportsDistrictFilter === "all" || liquidationOrg?.district === liquidationReportsDistrictFilter;
      const matchesBarangay = liquidationReportsBarangayFilter === "all" || liquidationOrg?.barangay === liquidationReportsBarangayFilter;
      const matchesClassification =
        liquidationReportsClassificationFilter === "all" || liquidationOrg?.majorClassification === liquidationReportsClassificationFilter;
      return matchesSearch && matchesStatus && matchesDistrict && matchesBarangay && matchesClassification;
    });
  }, [
    liquidationReportsSearch,
    liquidationReportsStatusFilter,
    liquidationReportsDistrictFilter,
    liquidationReportsBarangayFilter,
    liquidationReportsClassificationFilter,
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
  const filteredRegistrations = useMemo(() => {
    const query = registrationSearch.trim().toLowerCase();
    return state.organizationProfiles.filter((org) => {
      if (org.profileStatus === "suspended_inactive") return false;
      const matchesSearch =
        !query ||
        [org.organizationName, org.organizationEmail, org.referenceId ?? "", org.barangay ?? "", org.district ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(query);
      const matchesStatus = registrationStatusFilter === "all" || org.profileStatus === registrationStatusFilter;
      const matchesDistrict = registrationDistrictFilter === "all" || org.district === registrationDistrictFilter;
      const matchesBarangay = registrationBarangayFilter === "all" || org.barangay === registrationBarangayFilter;
      const matchesClassification =
        registrationClassificationFilter === "all" || org.majorClassification === registrationClassificationFilter;
      return matchesSearch && matchesStatus && matchesDistrict && matchesBarangay && matchesClassification;
    });
  }, [
    registrationBarangayFilter,
    registrationClassificationFilter,
    registrationDistrictFilter,
    registrationSearch,
    registrationStatusFilter,
    state.organizationProfiles,
  ]);
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
      const matchesCategory = newsCategoryFilter === "all" || news.category === newsCategoryFilter;
      return matchesSearch && matchesVisibility && matchesCategory;
    });
  }, [newsSearch, newsVisibilityFilter, newsCategoryFilter, newsReleases]);
  const filteredTemplates = useMemo(() => {
    const query = templateSearch.trim().toLowerCase();
    return [...state.templates]
      .filter((template) => {
        const matchesSearch =
          !query ||
          [template.name, template.description, template.templateFileName]
            .join(" ")
            .toLowerCase()
            .includes(query);
        const matchesStatus =
          templateStatusFilter === "all" ||
          (templateStatusFilter === "active" ? template.isActive : !template.isActive);
        const matchesCategory = templateCategoryFilter === "all" || template.templateCategories.includes(templateCategoryFilter);
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((left, right) => left.sortOrder - right.sortOrder);
  }, [state.templates, templateSearch, templateStatusFilter, templateCategoryFilter]);
  const templateCategoryOptions = useMemo(
    () => orderTemplateCategories(Array.from(new Set(state.templates.flatMap((template) => template.templateCategories)))),
    [state.templates],
  );
  const newsCategoryOptions = useMemo(
    () => Array.from(new Set(newsReleases.map((news) => news.category).filter((category): category is string => Boolean(category)))),
    [newsReleases],
  );
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
        const matchesCategory = inquiryCategoryFilter === "all" || deriveInquiryCategory(inquiry) === inquiryCategoryFilter;
        return matchesSearch && matchesStatus && matchesCategory;
      })
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [inquirySearch, inquiryStatusFilter, inquiryCategoryFilter, state.inquiries]);
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
        const isLiquidated = state.liquidationReports.some(
          (lr) => lr.budgetRequestId === request.id && lr.status === "completed_liquidated",
        );
        const liquidatedAmount = isLiquidated ? releasedAmount : 0;
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
          existing.liquidatedAmount += liquidatedAmount;
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
          liquidatedAmount,
        });
      });

    return [...grouped.values()].sort((left, right) => {
      if (left.district !== right.district) return left.district.localeCompare(right.district);
      if (left.releasedAmount !== right.releasedAmount) return right.releasedAmount - left.releasedAmount;
      return left.barangay.localeCompare(right.barangay);
    });
  }, [organizationProfileById, state.budgetRequests, state.liquidationReports]);
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
  const filteredBudgetAllocationRows = useMemo(() => {
    const query = budgetAllocationSearch.trim().toLowerCase();
    return budgetAllocationRows.filter((row) => {
      if (budgetAllocationDistrictFilter !== "all" && row.district !== budgetAllocationDistrictFilter) return false;
      if (budgetAllocationBarangayFilter !== "all" && row.barangay !== budgetAllocationBarangayFilter) return false;
      if (query && !row.barangay.toLowerCase().includes(query) && !row.district.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [budgetAllocationBarangayFilter, budgetAllocationDistrictFilter, budgetAllocationRows, budgetAllocationSearch]);
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
  }, [budgetAllocationBarangayFilter, budgetAllocationDistrictFilter, budgetAllocationSearch]);
  useEffect(() => {
    setBarangayDetailSearch("");
    setBarangayDetailClassificationFilter("all");
  }, [selectedBudgetAllocation]);
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
    const totalLiquidated = filteredBudgetAllocationRows.reduce((sum, row) => sum + row.liquidatedAmount, 0);
    const utilizationRate = totalApproved > 0 ? Math.round((totalReleased / totalApproved) * 100) : 0;
    const liquidationUtilizationRate = totalReleased > 0 ? Math.round((totalLiquidated / totalReleased) * 100) : 0;
    return {
      barangayCount: filteredBudgetAllocationRows.length,
      totalApproved,
      totalReleased,
      totalRemaining,
      totalLiquidated,
      liquidationUtilizationRate,
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

  const pendingYpop = useMemo(
    () => state.ypopEntries.filter((entry) => entry.status === "submitted" || entry.status === "under_review").length,
    [state.ypopEntries],
  );

  const sidebarGroups = useMemo<PortalNavGroup[]>(() => {
    const withOverrides = (id: string, overrides: Partial<PortalNavItem> = {}): PortalNavItem | null => {
      const base = adminNavItemsById.get(id);
      if (!base) return null;
      return { ...base, ...overrides };
    };
    const compact = (items: Array<PortalNavItem | null>) => items.filter((item): item is PortalNavItem => item !== null);

    const allGroups: PortalNavGroup[] = [
      { id: "workspace", label: "Workspace", items: compact([withOverrides("overview")]) },
      {
        id: "organizations",
        label: "Organizations",
        items: compact([
          withOverrides("registrations", {
            label: "Registrations",
            icon: UserPlus,
            count: overviewStats.pendingProfiles || undefined,
          }),
          withOverrides("yorp-registry", { icon: Globe }),
        ]),
      },
      {
        id: "programs",
        label: "Programs",
        items: compact([withOverrides("ypop-validation", { icon: Award, count: pendingYpop || undefined })]),
      },
      {
        id: "budget-management",
        label: "Budget Management",
        items: compact([
          withOverrides("budget-utilization", { count: overviewStats.pendingBudget || undefined }),
          withOverrides("liquidation-monitoring", {
            icon: Clipboard,
            count: overviewStats.overdueLiquidation + overviewStats.pendingLiquidation || undefined,
          }),
          withOverrides("budget-monitoring", { label: "Budget Monitoring", icon: TrendingUp }),
        ]),
      },
      {
        id: "content",
        label: "Content",
        items: compact([
          withOverrides("news-releases", { icon: Newspaper }),
          withOverrides("templates", { label: "Forms & Templates" }),
        ]),
      },
      {
        id: "communication",
        label: "Communication",
        items: compact([
          withOverrides("inquiries", { icon: Inbox, count: overviewStats.pendingInquiries || undefined }),
        ]),
      },
      {
        id: "administration",
        label: "Administration",
        items: [
          { id: "administrators", label: "Administrators", icon: Shield },
          { id: "activity-logs", label: "Activity Logs", icon: Activity },
        ],
      },
    ];

    return allGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) => hasAdminNavPermission(user?.permissionCodes, item.id)),
      }))
      .filter((group) => group.items.length > 0);
  }, [overviewStats, pendingYpop, user]);

  const [annualAllocation, setAnnualAllocation] = useState<number | null>(null);
  const [annualAllocationFiscalYear, setAnnualAllocationFiscalYear] = useState<number | null>(null);

  useEffect(() => {
    let isActive = true;
    if (!isSupabaseConfigured || !supabase) return;

    void supabase
      .from("barangay_financials")
      .select("barangay_id,fiscal_year,month_no,sk_budget")
      .order("fiscal_year", { ascending: false })
      .order("month_no", { ascending: false })
      .then(({ data, error }) => {
        if (!isActive || error || !data) return;
        const latestByBarangay = new Map<string, { fiscalYear: number; skBudget: number }>();
        for (const row of data as Array<{ barangay_id: string; fiscal_year: number; sk_budget: number }>) {
          if (!latestByBarangay.has(row.barangay_id)) {
            latestByBarangay.set(row.barangay_id, { fiscalYear: row.fiscal_year, skBudget: Number(row.sk_budget ?? 0) });
          }
        }
        const entries = Array.from(latestByBarangay.values());
        const fiscalYear = entries.length ? Math.max(...entries.map((entry) => entry.fiscalYear)) : null;
        const total = entries
          .filter((entry) => entry.fiscalYear === fiscalYear)
          .reduce((sum, entry) => sum + entry.skBudget, 0);
        setAnnualAllocation(total);
        setAnnualAllocationFiscalYear(fiscalYear);
      })
      .catch(() => {
        // Safely suppress errors when barangay_financials table is unavailable
      });

    return () => {
      isActive = false;
    };
  }, []);

  const totalLiquidated = useMemo(
    () =>
      state.liquidationReports
        .filter((report) => report.status === "completed_liquidated")
        .reduce((sum, report) => {
          const relatedBudgetRequest = state.budgetRequests.find((request) => request.id === report.budgetRequestId);
          return sum + (relatedBudgetRequest?.releasedAmount ?? 0);
        }, 0),
    [state.liquidationReports, state.budgetRequests],
  );

  const budgetApprovedTotal = useMemo(
    () =>
      state.budgetRequests
        .filter((r) => ["approved_for_ftf_green", "hard_copy_submitted", "budget_released", "completed"].includes(r.status))
        .reduce((sum, r) => sum + (r.approvedAmount || r.requestedAmount || 0), 0),
    [state.budgetRequests],
  );

  const purposeCategoryBreakdown = useMemo(() => {
    const totals = new Map<string, number>();
    state.budgetRequests
      .filter((r) => ["approved_for_ftf_green", "hard_copy_submitted", "budget_released", "completed"].includes(r.status))
      .forEach((r) => {
        const category = r.purposeCategory.trim() || "General Purpose";
        const amount = r.approvedAmount || r.requestedAmount || 0;
        totals.set(category, (totals.get(category) ?? 0) + amount);
      });
    return Array.from(totals.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [state.budgetRequests]);

  const organizationFundingRows = useMemo<OrganizationFundingRow[]>(() => {
    return state.organizationProfiles
      .map((org) => {
        const orgRequests = state.budgetRequests.filter((r) => r.organizationId === org.id);
        const totalRequested = orgRequests.reduce((sum, r) => sum + (r.requestedAmount || 0), 0);
        const totalReleased = orgRequests.reduce((sum, r) => sum + (r.releasedAmount || 0), 0);
        const totalLiquidated = orgRequests.reduce((sum, r) => {
          const isLiquidated = state.liquidationReports.some(
            (lr) => lr.budgetRequestId === r.id && lr.status === "completed_liquidated",
          );
          return sum + (isLiquidated ? r.releasedAmount || 0 : 0);
        }, 0);
        return {
          organizationId: org.id,
          urn: org.urn || "—",
          organizationName: org.organizationName,
          majorClassification: org.majorClassification,
          barangay: org.barangay?.trim() || "Unassigned Barangay",
          totalRequested,
          totalReleased,
          totalLiquidated,
        };
      })
      .filter((row) => row.totalRequested > 0);
  }, [state.organizationProfiles, state.budgetRequests, state.liquidationReports]);

  const organizationBudgetDetail = useMemo<OrganizationBudgetDetail | null>(() => {
    if (!selectedOrganizationBudgetDetailId) return null;
    const org = state.organizationProfiles.find((o) => o.id === selectedOrganizationBudgetDetailId);
    if (!org) return null;
    const orgRequests = state.budgetRequests.filter((r) => r.organizationId === org.id);
    const requests: OrganizationBudgetRequestRow[] = orgRequests.map((r) => ({
      id: r.id,
      activityTitle: r.activityTitle,
      referenceCode: buildPublicRecordCode("BR", r, state.budgetRequests),
      releasedAmount: r.releasedAmount || 0,
      status: r.status,
      isLiquidated: state.liquidationReports.some((lr) => lr.budgetRequestId === r.id && lr.status === "completed_liquidated"),
    }));
    const registrationDate = new Date(org.verifiedAt || org.createdAt);
    return {
      organizationId: org.id,
      urn: org.urn || "—",
      organizationName: org.organizationName,
      district: org.district,
      barangay: org.barangay,
      registrationDate,
      expiryDate: addYears(registrationDate, 3),
      totalRequested: orgRequests.reduce((sum, r) => sum + (r.requestedAmount || 0), 0),
      totalReleased: orgRequests.reduce((sum, r) => sum + (r.releasedAmount || 0), 0),
      totalLiquidated: requests.reduce((sum, r) => sum + (r.isLiquidated ? r.releasedAmount : 0), 0),
      completedCount: requests.filter((r) => r.isLiquidated || r.status === "completed").length,
      requests,
    };
  }, [selectedOrganizationBudgetDetailId, state.organizationProfiles, state.budgetRequests, state.liquidationReports]);

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
    setRegistrationBulkDecision("approve");
    setRegistrationBulkRemark("");
    setRegistrationActivityVisibleCount(4);
    setIsRegistrationActivityPopoverOpen(false);
    setIsRegistrationDecisionHelpOpen(false);
    setIsRegistrationDecisionConfirmOpen(false);
  }, [selectedRegistrationId]);

  useEffect(() => {
    setBudgetInfoCollapsed(true);
    setBudgetActivityVisibleCount(4);
    setIsBudgetActivityPopoverOpen(false);
    setSelectedBudgetReviewFileIds([]);
    setSelectedBudgetFileId(null);
    setBudgetBulkDecision("approve");
    setBudgetBulkRemark("");
  }, [selectedBudgetRequestId]);

  useEffect(() => {
    if (selectedBudgetReviewFileIds.length > 1 && budgetBulkDecision !== "approve") {
      setBudgetBulkDecision("approve");
      setBudgetBulkRemark("");
    }
  }, [selectedBudgetReviewFileIds.length, budgetBulkDecision]);

  useEffect(() => {
    if (!isBudgetDecisionHelpOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (budgetDecisionHelpPanelRef.current?.contains(target)) return;
      if (budgetDecisionHelpTriggerRef.current?.contains(target)) return;
      setIsBudgetDecisionHelpOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsBudgetDecisionHelpOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBudgetDecisionHelpOpen]);

  useEffect(() => {
    if (!isBudgetActivityPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (budgetActivityPanelRef.current?.contains(target)) return;
      if (budgetActivityTriggerRef.current?.contains(target)) return;
      setIsBudgetActivityPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsBudgetActivityPopoverOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isBudgetActivityPopoverOpen]);

  useEffect(() => {
    setLiquidationInfoCollapsed(true);
    setLiquidationActivityVisibleCount(4);
    setIsLiquidationActivityPopoverOpen(false);
    setSelectedLiquidationReviewFileIds([]);
    setLiquidationBulkDecision("approve");
    setLiquidationBulkRemark("");
    setLiquidationHardcopyDateReceived(new Date().toISOString().slice(0, 10));
  }, [selectedLiquidationReportId]);

  useEffect(() => {
    if (selectedLiquidationReviewFileIds.length > 1 && liquidationBulkDecision !== "approve") {
      setLiquidationBulkDecision("approve");
      setLiquidationBulkRemark("");
    }
  }, [selectedLiquidationReviewFileIds.length, liquidationBulkDecision]);

  useEffect(() => {
    if (!isLiquidationDecisionHelpOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (liquidationDecisionHelpPanelRef.current?.contains(target)) return;
      if (liquidationDecisionHelpTriggerRef.current?.contains(target)) return;
      setIsLiquidationDecisionHelpOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLiquidationDecisionHelpOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLiquidationDecisionHelpOpen]);

  useEffect(() => {
    if (!isLiquidationActivityPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (liquidationActivityPanelRef.current?.contains(target)) return;
      if (liquidationActivityTriggerRef.current?.contains(target)) return;
      setIsLiquidationActivityPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsLiquidationActivityPopoverOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isLiquidationActivityPopoverOpen]);

  useEffect(() => {
    if (!isRegistrationActivityPopoverOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (registrationActivityPanelRef.current?.contains(target)) return;
      if (registrationActivityTriggerRef.current?.contains(target)) return;
      setIsRegistrationActivityPopoverOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRegistrationActivityPopoverOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRegistrationActivityPopoverOpen]);

  useEffect(() => {
    if (!isRegistrationDecisionHelpOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (registrationDecisionHelpPanelRef.current?.contains(target)) return;
      if (registrationDecisionHelpTriggerRef.current?.contains(target)) return;
      setIsRegistrationDecisionHelpOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsRegistrationDecisionHelpOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRegistrationDecisionHelpOpen]);

  useEffect(() => {
    if (selectedRegistrationReviewFileIds.length > 1 && registrationBulkDecision !== "approve") {
      setRegistrationBulkDecision("approve");
      setRegistrationBulkRemark("");
    }
  }, [selectedRegistrationReviewFileIds.length, registrationBulkDecision]);

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

  useEffect(() => {
    let isActive = true;
    void (async () => {
      const accountsById = await getAdminAccountsInSupabase();
      if (isActive) setAdminAccountsById(accountsById);
    })();
    return () => {
      isActive = false;
    };
  }, []);

  const refreshAdministrators = async () => {
    setAdministratorsLoading(true);
    try {
      const [administratorRows, roleRows, unitRows] = await Promise.all([
        getAdministratorsInSupabase(),
        getAdministratorRolesInSupabase(),
        getAdministratorUnitsInSupabase(),
      ]);
      setAdministrators(administratorRows);
      setAdministratorRoles(roleRows.filter((role) => role.code === "super_admin" || role.code === "admin"));
      setAdministratorUnits(unitRows);
    } catch (error) {
      console.error("Unable to load administrators:", error);
      toast({
        title: "Unable to load administrators",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAdministratorsLoading(false);
    }
  };

  useEffect(() => {
    if (section !== "administrators") return;
    let isActive = true;
    void (async () => {
      if (!isActive) return;
      await refreshAdministrators();
    })();
    return () => {
      isActive = false;
    };
  }, [section]);

  const resetAdministratorForm = () => {
    setAdministratorModalMode(null);
    setEditingAdministratorId(null);
    setAdministratorDisplayNameDraft("");
    setAdministratorEmailDraft("");
    setAdministratorUsernameDraft("");
    setAdministratorRoleIdDraft(null);
    setAdministratorUnitIdDraft(null);
  };

  const startEditingAdministrator = (administrator: AdministratorRecord) => {
    setAdministratorModalMode("edit");
    setEditingAdministratorId(administrator.id);
    setAdministratorDisplayNameDraft(administrator.displayName);
    setAdministratorEmailDraft(administrator.email);
    setAdministratorUsernameDraft(administrator.username);
    setAdministratorRoleIdDraft(administratorRoles.find((role) => role.code === administrator.roleCode)?.id ?? null);
    setAdministratorUnitIdDraft(administratorUnits.find((unit) => unit.code === administrator.unitCode)?.id ?? null);
  };

  const MAX_USERNAME_COLLISION_ATTEMPTS = 20;

  const handleCreateAdministrator = async () => {
    if (!administratorDisplayNameDraft.trim() || !administratorEmailDraft.trim()) {
      toast({ title: "Missing information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (administratorRoleIdDraft === null || administratorUnitIdDraft === null) {
      toast({ title: "Missing information", description: "Please select a role and unit.", variant: "destructive" });
      return;
    }
    const baseUsername = administratorEmailDraft
      .trim()
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, "");
    if (!baseUsername) {
      toast({ title: "Invalid email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setSavingAdministrator(true);
    try {
      let attempt = 0;
      for (;;) {
        const candidateUsername = attempt === 0 ? baseUsername : `${baseUsername}${attempt + 1}`;
        try {
          await createAdministratorInSupabase({
            displayName: administratorDisplayNameDraft,
            email: administratorEmailDraft,
            username: candidateUsername,
            roleId: administratorRoleIdDraft,
            unitId: administratorUnitIdDraft,
          });
          break;
        } catch (error) {
          if (error instanceof DuplicateUsernameError && attempt < MAX_USERNAME_COLLISION_ATTEMPTS) {
            attempt += 1;
            continue;
          }
          throw error;
        }
      }
      toast({
        title: "Administrator invited",
        description: `An invite email has been sent to ${administratorEmailDraft.trim()}.`,
      });
      resetAdministratorForm();
      await refreshAdministrators();
    } catch (error) {
      toast({
        title: "Unable to add administrator",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAdministrator(false);
    }
  };

  const handleResendInvite = async (administrator: AdministratorRecord) => {
    setResendingInviteId(administrator.id);
    try {
      await resendAdminInviteInSupabase(administrator.id);
      toast({ title: "Invite resent", description: `A new invite email has been sent to ${administrator.email}.` });
    } catch (error) {
      toast({
        title: "Unable to resend the invite",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setResendingInviteId(null);
    }
  };

  const handleUpdateAdministrator = async () => {
    if (!editingAdministratorId) return;
    if (!administratorDisplayNameDraft.trim() || !administratorEmailDraft.trim() || !administratorUsernameDraft.trim()) {
      toast({ title: "Missing information", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    if (administratorRoleIdDraft === null || administratorUnitIdDraft === null) {
      toast({ title: "Missing information", description: "Please select a role and unit.", variant: "destructive" });
      return;
    }
    setSavingAdministrator(true);
    try {
      await updateAdministratorInSupabase({
        id: editingAdministratorId,
        displayName: administratorDisplayNameDraft,
        email: administratorEmailDraft,
        username: administratorUsernameDraft,
        roleId: administratorRoleIdDraft,
        unitId: administratorUnitIdDraft,
      });
      toast({ title: "Administrator updated" });
      resetAdministratorForm();
      await refreshAdministrators();
    } catch (error) {
      toast({
        title: "Unable to update administrator",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingAdministrator(false);
    }
  };

  const handleToggleAdministratorActive = async (administrator: AdministratorRecord) => {
    try {
      await setAdministratorActiveInSupabase(administrator.id, !administrator.isActive);
      toast({
        title: administrator.isActive ? "Administrator suspended" : "Administrator reactivated",
        description: administrator.displayName,
      });
      await refreshAdministrators();
    } catch (error) {
      toast({
        title: "Unable to update status",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAdministrator = async (administrator: AdministratorRecord) => {
    try {
      await deleteAdministratorInSupabase(administrator.id);
      toast({ title: "Administrator deleted", description: administrator.displayName });
      await refreshAdministrators();
    } catch (error) {
      toast({
        title: "Unable to delete administrator",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRolePermissions = async (roleId: number, permissionCodes: string[]) => {
    try {
      await updateRolePermissionsInSupabase(roleId, permissionCodes);
      await refreshAdministrators();
    } catch (error) {
      toast({
        title: "Unable to update permissions",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportAdministrators = async (format: ExportFormat) => {
    if (!filteredAdministrators.length) {
      toast({ title: "No administrators found", description: "Try changing the selected filters." });
      return;
    }
    try {
      await exportReport(format, {
        config: {
          title: "Administrators",
          filenamePrefix: "administrators",
          columns: [
            { label: "Display Name", value: (row: AdministratorRecord) => row.displayName, pdfWidth: 100, xlsxWidth: 24 },
            { label: "Email", value: (row: AdministratorRecord) => row.email, pdfWidth: 130, xlsxWidth: 28 },
            { label: "Username", value: (row: AdministratorRecord) => row.username, pdfWidth: 90, xlsxWidth: 18 },
            { label: "Role", value: (row: AdministratorRecord) => row.roleLabel ?? "", pdfWidth: 70, xlsxWidth: 16 },
            { label: "Unit", value: (row: AdministratorRecord) => row.unitLabel ?? "", pdfWidth: 110, xlsxWidth: 24 },
            {
              label: "Status",
              value: (row: AdministratorRecord) => (row.isActive ? "Active" : "Suspended"),
              pdfWidth: 60,
              xlsxWidth: 14,
            },
          ],
        },
        rows: filteredAdministrators,
      });
      toast({ title: "Export Ready", description: `The administrators ${format.toUpperCase()} export has been downloaded.` });
    } catch (error) {
      console.error("Unable to export administrators:", error);
      toast({
        title: "Export Failed",
        description: "Unable to export administrators. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredAdministrators = useMemo(() => {
    const searchTerm = administratorSearch.trim().toLowerCase();
    return administrators.filter((administrator) => {
      if (administratorRoleFilter !== "all" && administrator.roleCode !== administratorRoleFilter) return false;
      if (administratorUnitFilter !== "all" && administrator.unitCode !== administratorUnitFilter) return false;
      if (administratorStatusFilter === "active" && !administrator.isActive) return false;
      if (administratorStatusFilter === "suspended" && administrator.isActive) return false;
      if (!searchTerm) return true;
      const haystack = `${administrator.displayName} ${administrator.email} ${administrator.username}`.toLowerCase();
      return haystack.includes(searchTerm);
    });
  }, [administrators, administratorRoleFilter, administratorUnitFilter, administratorStatusFilter, administratorSearch]);

  const editingAdministrator = administrators.find((administrator) => administrator.id === editingAdministratorId) ?? null;

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

  const handleSaveInquiryStatus = async (overrideStatus?: InquiryRecord["status"]) => {
    if (!selectedInquiry || savingInquiryStatus) return;

    const nextStatus = overrideStatus ?? inquiryStatusDraft;
    setSavingInquiryStatus(true);
    try {
      const previousStatus = selectedInquiry.status;
      const savedInquiry = await adminUpdateInquiryInSupabase(selectedInquiry.id, {
        status: nextStatus,
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

  const openDownloadDialog = async (
    current: { fileName: string; fileUrl: string } | null | undefined,
    files: { fileName: string; fileUrl: string }[],
    zipName: string,
  ) => {
    if (downloadDialogResolving) return;
    const candidates = files.filter((file) => file.fileUrl.trim());
    if (!candidates.length) {
      toast({
        title: "No documents to download",
        description: "There are no files available for this record yet.",
        variant: "destructive",
      });
      return;
    }
    setDownloadDialogResolving(true);
    try {
      const resolved = await Promise.all(
        candidates.map(async (file) => ({
          name: file.fileName,
          url: await resolveSupabaseFileUrl(file.fileUrl),
          sourceUrl: file.fileUrl,
        })),
      );
      const currentResolved = current?.fileUrl
        ? resolved.find((entry) => entry.sourceUrl === current.fileUrl) ?? null
        : null;
      setDownloadDialogCurrentFile(
        currentResolved ? { name: currentResolved.name, url: currentResolved.url } : null,
      );
      setDownloadDialogAllFiles(resolved.map(({ name, url }) => ({ name, url })));
      setDownloadDialogZipName(zipName);
      setDownloadDialogOpen(true);
    } catch (error) {
      toast({
        title: "Unable to prepare download",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDownloadDialogResolving(false);
    }
  };

  const handleMarkInquiryResponded = async (inquiry: InquiryRecord) => {
    try {
      const savedInquiry = await adminUpdateInquiryInSupabase(inquiry.id, {
        status: "reviewed",
        adminRemarks: inquiry.adminRemarks,
      });

      updateInquiry(savedInquiry.id, savedInquiry);
      if (selectedInquiry?.id === savedInquiry.id) {
        setSelectedInquiry(savedInquiry);
        setInquiryStatusDraft(savedInquiry.status);
        setInquiryAdminRemarksDraft(savedInquiry.adminRemarks);
      }

      void appendAuditLog(
        "update_inquiry_status",
        "inquiry",
        savedInquiry.id,
        `Changed inquiry status from ${statusLabelMap[inquiry.status] ?? inquiry.status} to ${statusLabelMap[savedInquiry.status] ?? savedInquiry.status}.`,
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

  const handleRegistrationSelectionChange = (nextRegistrationId: string | null) => {
    setSelectedRegistrationId(nextRegistrationId);
  };

  const handleAdminSectionNavigate = (id: string) => {
    const nextRoute = routeMap[id] ?? routeMap.overview;
    const currentRoute = routeMap[section] ?? routeMap.overview;
    if (nextRoute === currentRoute) return;
    navigate(nextRoute);
  };

  const submitRegistrationReviewDecisions = async () => {
    if (!selectedRegistrationProfile || !selectedRegistrationSubmission) return;

    const decision = registrationBulkDecision;
    const targetFiles = selectedRegistrationFiles.filter(
      (file) => selectedRegistrationReviewFileIds.includes(file.id) && file.adminStatus !== "approved_green",
    );

    if (!targetFiles.length) {
      toast({
        title: "No documents selected",
        description: "Select at least one submitted document before confirming a decision.",
        variant: "destructive",
      });
      return;
    }

    if (registrationDecisionRequiresRemark(decision) && targetFiles.length > 1) {
      toast({
        title: "One document at a time",
        description: `${registrationReviewDecisionLabel[decision]} requires selecting a single document.`,
        variant: "destructive",
      });
      return;
    }

    const remark = registrationBulkRemark.trim();
    if (registrationDecisionRequiresRemark(decision) && !remark) {
      toast({
        title: "Comment required",
        description: `Add a remark before you can ${registrationReviewDecisionLabel[decision].toLowerCase()} this document.`,
        variant: "destructive",
      });
      return;
    }

    setRegistrationReviewSubmitting(true);
    try {
      const result = await submitDocumentReviewBatchToSupabase({
        decisions: targetFiles.map((file) => ({
          fileId: file.id,
          status:
            decision === "approve"
              ? "approved_green"
              : decision === "needs_revision"
                ? "needs_revision"
                : "rejected_red",
          adminRemarks: decision === "approve" ? undefined : remark,
          expectedUpdatedAt: file.updatedAt,
        })),
      });

      const successfulFileIds = new Set(
        result.results.filter((item) => item.success).map((item) => item.fileId),
      );
      const successfulFiles = targetFiles.filter((file) => successfulFileIds.has(file.id));
      const failedResults = result.results.filter((item) => !item.success);

      if (!successfulFiles.length) {
        throw new Error(
          failedResults.map((item) => item.error).filter(Boolean).join(" ") ||
            "No document review decisions were saved. Please refresh and try again.",
        );
      }

      await refreshAdminState();

      for (const file of successfulFiles) {
        if (decision === "approve") {
          await appendAuditLog(
            "Approved document submission",
            "document_submission_file",
            file.id,
            `Approved ${file.fileName} from the registration detail review.`,
            selectedRegistrationProfile.id,
          );
        } else if (decision === "needs_revision") {
          await appendAuditLog(
            "Document revision requested",
            "document_submission_file",
            file.id,
            `Requested revisions for ${file.fileName} from the registration detail review.`,
            selectedRegistrationProfile.id,
          );
        } else {
          await appendAuditLog(
            "Rejected document submission",
            "document_submission_file",
            file.id,
            `Rejected ${file.fileName} from the registration detail review.`,
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

      setSelectedRegistrationReviewFileIds([]);
      setRegistrationBulkDecision("approve");
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

        const saved = await adminUpdateYpopEventParticipationInSupabase(pendingAdminConfirmation.participationId, patch);
        updateYPOPEventParticipation(saved.id, saved);

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
    setTemplateCategoryDraft("");
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
    const template = state.templates.find((entry) => entry.id === templateId);
    if (!template) return;
    setTemplateModalMode("edit");
    setEditingTemplateId(templateId);
    setTemplateNameDraft(template.name);
    setTemplateDescriptionDraft(template.description);
    setTemplateScopeDraft(template.templateScope);
    setTemplateFileDraft(null);
    setTemplateCategoryDraft(template.templateCategories[0] ?? "");
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
    if (!templateCategoryDraft) {
      toast({ title: "Category required", description: "Please select a category for this file.", variant: "destructive" });
      return;
    }
    if (!templateFileDraft) {
      toast({ title: "Template file required", description: "Please upload the document file for this template.", variant: "destructive" });
      return;
    }

    setSavingTemplate(true);
    let createdTemplateId: string | null = null;
    let createdTemplateDatabaseId: string | null = null;
    try {
      const newTemplate = await createTemplateRecordInSupabase({
        name: templateNameDraft,
        description: templateDescriptionDraft,
        templateDescription: templateDescriptionDraft || `Template for ${templateNameDraft.trim()}.`,
        templateScope: templateScopeDraft,
      });
      createTemplate(newTemplate);
      createdTemplateId = newTemplate.id;
      createdTemplateDatabaseId = newTemplate.databaseId;

      const categorizedTemplate = await updateTemplateCategoryInSupabase(newTemplate.databaseId, newTemplate.name, [templateCategoryDraft]);
      updateTemplate(newTemplate.id, categorizedTemplate);
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
      setUploadingTemplateId(null);
      if (createdTemplateId && createdTemplateDatabaseId) {
        try {
          await permanentlyDeleteTemplateRecordInSupabase(createdTemplateDatabaseId, templateNameDraft);
          removeTemplate(createdTemplateId);
        } catch {
          // Best-effort rollback; surface the original create error below regardless.
        }
      }
      toast({
        title: "Create failed",
        description: error instanceof Error ? error.message : "The template could not be created.",
        variant: "destructive",
      });
    } finally {
      setSavingTemplate(false);
    }
  };

  const applyNewsVisibilityChange = async (newsId: string, nextStatus: "published" | "hidden") => {
    try {
      const updatedNewsRelease = await updateNewsReleaseInSupabase(newsId, {
        visibilityStatus: nextStatus,
      });
      updateNewsRelease(newsId, updatedNewsRelease);
      await refreshAdminState();

      if (nextStatus === "published") {
        await appendAuditLog(
          "Published news release",
          "news_release",
          newsId,
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
          newsId,
          `Hidden news release "${updatedNewsRelease.title}".`,
        );
        toast({
          title: "News release hidden",
          description: `${updatedNewsRelease.title} is now hidden from public view.`,
        });
      }
    } catch (error) {
      toast({
        title: nextStatus === "published" ? "Publish failed" : "Hide failed",
        description: error instanceof Error ? error.message : "The news release's visibility could not be updated.",
        variant: "destructive",
      });
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
    const template = state.templates.find((entry) => entry.id === editingTemplateId);
    if (!template) return;
    if (!templateNameDraft.trim()) {
      toast({ title: "Template name required", description: "Please enter a document name.", variant: "destructive" });
      return;
    }
    if (!templateCategoryDraft) {
      toast({ title: "Category required", description: "Please select a category for this file.", variant: "destructive" });
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
      if (templateCategoryDraft !== template.templateCategories[0]) {
        const categorizedTemplate = await updateTemplateCategoryInSupabase(template.databaseId, template.name, [templateCategoryDraft]);
        updateTemplate(template.id, categorizedTemplate);
      }
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
      await appendAuditLog("Archived file", "template", template.databaseId, `Archived file "${template.name}".`);
      await refreshAdminState();
      if (editingTemplateId === template.id || templateModalMode === "delete") {
        resetTemplateForm();
      }
      toast({ title: "File archived", description: `${template.name} was archived and hidden from Forms & Templates.` });
    } catch (error) {
      toast({
        title: "Archive failed",
        description: error instanceof Error ? error.message : "The file could not be archived.",
        variant: "destructive",
      });
    }
  };

  const handleRestoreTemplate = async (templateId: string) => {
    const template = state.templates.find((entry) => entry.id === templateId);
    if (!template) return;

    try {
      const restoredTemplate = await reactivateTemplateRecordInSupabase(template.databaseId, template.name);
      updateTemplate(template.id, restoredTemplate);
      await appendAuditLog("Restored file", "template", template.databaseId, `Restored file "${template.name}".`);
      await refreshAdminState();
      toast({ title: "File restored", description: `${template.name} is active again.` });
    } catch (error) {
      toast({
        title: "Restore failed",
        description: error instanceof Error ? error.message : "The file could not be restored.",
        variant: "destructive",
      });
    }
  };

  const handlePermanentlyDeleteTemplate = async (templateId: string) => {
    const template = state.templates.find((entry) => entry.id === templateId);
    if (!template) return;

    try {
      await permanentlyDeleteTemplateRecordInSupabase(template.databaseId, template.name);
      removeTemplate(template.id);
      await appendAuditLog("Deleted file", "template", template.databaseId, `Permanently deleted file "${template.name}".`);
      await refreshAdminState();
      toast({ title: "File deleted", description: `${template.name} was permanently removed.` });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "The file could not be deleted.",
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
    ? state.templates.find((template) => template.id === editingTemplateId) ?? null
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
    const requiredPermission = ADMIN_NAV_PERMISSION_MAP[section];
    const hasSectionAccess = !requiredPermission || (user?.permissionCodes ?? []).includes(requiredPermission);
    if (!hasSectionAccess) {
      return (
        <PortalEmptyState
          title="Access Restricted"
          description="You don't have permission to view this page. Contact a Super Admin if you believe this is a mistake."
          action={
            <Button onClick={() => navigate(routeMap.overview)}>Back to Overview</Button>
          }
        />
      );
    }
    switch (section) {
      case "overview": {
        const formatActionName = (action: string) =>
          action.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

        const findOrgName = (organizationId: string) =>
          state.organizationProfiles.find((org) => org.id === organizationId)?.organizationName ?? "Organization";

        const needsAttentionItems: NeedsAttentionItem[] = [
          ...state.organizationProfiles
            .filter((org) => org.profileStatus === "pending_review" || org.profileStatus === "incomplete")
            .map((org) => ({
              id: `org-${org.id}`,
              icon: UserPlus,
              orgName: org.organizationName,
              actionText: "Submitted registration profile · Review registration",
              verb: "Submitted" as const,
              timestamp: org.updatedAt,
              href: routeMap.registrations,
            })),
          ...state.ypopEntries
            .filter((entry) => entry.status === "submitted" || entry.status === "under_review")
            .map((entry) => ({
              id: `ypop-${entry.id}`,
              icon: Award,
              orgName: findOrgName(entry.organizationId),
              actionText: `Submitted YPOP entry (${entry.semesterLabel}) · Review validation`,
              verb: "Submitted" as const,
              timestamp: entry.submittedAt,
              href: routeMap["ypop-validation"],
            })),
          ...state.budgetRequests
            .filter((request) => request.status === "submitted" || request.status === "under_review")
            .map((request) => ({
              id: `budget-${request.id}`,
              icon: Wallet,
              orgName: findOrgName(request.organizationId),
              actionText: `${request.activityTitle} · Review budget request`,
              verb: "Submitted" as const,
              timestamp: request.createdAt,
              href: routeMap["budget-utilization"],
            })),
          ...state.liquidationReports
            .filter((report) => report.status === "submitted" || report.status === "under_review" || report.status === "overdue")
            .map((report) => {
              const relatedBudgetRequest = state.budgetRequests.find((request) => request.id === report.budgetRequestId);
              return {
                id: `liquidation-${report.id}`,
                icon: Clipboard,
                orgName: findOrgName(report.organizationId),
                actionText: `${relatedBudgetRequest?.activityTitle ?? "Liquidation report"} · Review liquidation`,
                verb: "Submitted" as const,
                timestamp: report.createdAt,
                href: routeMap["liquidation-monitoring"],
              };
            }),
          ...state.inquiries
            .filter((inquiry) => inquiry.status === "pending_review")
            .map((inquiry) => ({
              id: `inquiry-${inquiry.id}`,
              icon: Inbox,
              orgName: inquiry.organizationName || inquiry.submitterName,
              actionText: `${inquiry.subject} · Review inquiry`,
              verb: "Received" as const,
              timestamp: inquiry.createdAt,
              href: routeMap.inquiries,
            })),
        ]
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
          .slice(0, 5);
        const dashboardRecentActivities = state.activityLogs.map((log) => ({
          id: log.id,
          message: formatActionName(log.action),
          note: log.description,
          timestamp: log.createdAt,
          timestampLabel: formatDateTimeLabel(log.createdAt),
        }));

        return (
          <div className="admin-dashboard-page space-y-3 lg:space-y-5">
            <AdminPageHeader title="Overview" description="Monitor workflows, pending items, and recent activity." />
            {/* Stat cards */}
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 xl:grid-cols-5">
              <StatsCard
                title="YORP REGISTRATIONS"
                value={state.organizationProfiles.length}
                icon={UserPlus}
                trend="up"
                trendLabel={`${overviewStats.pendingProfiles} awaiting review`}
                description="YORP accreditation submissions"
                onClick={() => navigate(routeMap.registrations)}
              />
              <StatsCard
                title="YPOP VALIDATIONS"
                value={state.ypopEntries.length}
                icon={Award}
                trend="up"
                trendLabel={`${pendingYpop} awaiting review`}
                description="YPOP eligibility evaluations"
                onClick={() => navigate(routeMap["ypop-validation"])}
              />
              <StatsCard
                title="BUDGET REQUESTS"
                value={state.budgetRequests.length}
                icon={Wallet}
                trend="up"
                trendLabel={`${overviewStats.pendingBudget} awaiting review`}
                description="Funding requests for approved projects"
                onClick={() => navigate(routeMap["budget-utilization"])}
              />
              <StatsCard
                title="LIQUIDATIONS"
                value={state.liquidationReports.length}
                icon={Clipboard}
                trend="up"
                trendLabel={`${overviewStats.overdueLiquidation + overviewStats.pendingLiquidation} awaiting review`}
                description="Financial accountability reports"
                onClick={() => navigate(routeMap["liquidation-monitoring"])}
              />
              <StatsCard
                title="INQUIRIES"
                value={state.inquiries.length}
                icon={Inbox}
                trend="up"
                trendLabel={`${overviewStats.pendingInquiries} awaiting review`}
                description="Questions from organization users"
                onClick={() => navigate(routeMap.inquiries)}
              />
            </div>

            {/* Needs Attention */}
            <NeedsAttentionList items={needsAttentionItems} onNavigate={navigate} />

            {/* Budget Monitoring + Recent Activity Log */}
            <div className="flex flex-col gap-2.5 lg:flex-row">
              <BudgetMonitoringSummaryCard
                fiscalYearLabel={
                  annualAllocationFiscalYear ? `FY ${annualAllocationFiscalYear}-${annualAllocationFiscalYear + 1}` : "FY —"
                }
                annualAllocation={annualAllocation}
                totalReleased={budgetMonitoringAnalysis.totalReleased}
                totalLiquidated={totalLiquidated}
                onManageRequests={() => navigate(routeMap["budget-utilization"])}
              />
              <RecentActivityLogCard
                items={dashboardRecentActivities.slice(0, 4).map<RecentActivityLogItem>((activity) => ({
                  id: activity.id,
                  activity: activity.message,
                  detail: activity.note,
                  timestamp: activity.timestamp,
                }))}
                actorName={user?.displayName ?? "Administrator"}
                actorRole="Administrator"
                onViewFullLog={() => navigate(routeMap["activity-logs"])}
              />
            </div>
          </div>
        );
      }
      case "inquiries": {
        const totalInquiries = state.inquiries.length;
        const openInquiries = state.inquiries.filter((inquiry) => inquiry.status === "pending_review").length;
        const respondedInquiries = state.inquiries.filter((inquiry) => inquiry.status === "reviewed").length;
        const closedInquiries = state.inquiries.filter((inquiry) => inquiry.status === "closed").length;

        return (
          <div className="admin-inquiries-page space-y-3 lg:space-y-5">
            <AdminPageHeader title="Inquiries" description="Manage questions and inquiries from organization users." />

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <StatsCard
                title="TOTAL INQUIRIES"
                value={totalInquiries}
                icon={MessageSquare}
                description="Inquiries received during this period"
              />
              <StatsCard
                title="OPEN"
                value={openInquiries}
                icon={AlertCircle}
                description="Inquiries awaiting the team's first response"
              />
              <StatsCard
                title="RESPONDED"
                value={respondedInquiries}
                icon={CornerDownLeft}
                description="Inquiries awaiting organization follow-up"
              />
              <StatsCard
                title="CLOSED"
                value={closedInquiries}
                icon={CheckCircle}
                description="Inquiries resolved during this period"
              />
            </div>

            <InquiriesTable
              inquiries={filteredInquiries}
              getReferenceCode={(inquiry) => buildPublicRecordCode("INQ", inquiry, state.inquiries)}
              searchValue={inquirySearch}
              onSearchChange={setInquirySearch}
              statusFilter={inquiryStatusFilter}
              onStatusFilterChange={setInquiryStatusFilter}
              categoryFilter={inquiryCategoryFilter}
              onCategoryFilterChange={setInquiryCategoryFilter}
              onSelectInquiry={openInquiryDetails}
              onMarkResponded={handleMarkInquiryResponded}
            />
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
        const selectedBulkFiles = orderedSubmittedFiles.filter((entry) => selectedRegistrationReviewFileIds.includes(entry.file.id));
        const missingDocumentCount = Math.max(templateDocuments.length - submittedDocumentCount, 0);
        const activeDocumentPreviewUrl = activeReviewEntry ? documentPreviewUrls[activeReviewEntry.file.id] : null;
        const decisionRequiresRemark = registrationDecisionRequiresRemark(registrationBulkDecision);
        const isRegistrationDecisionConfirmDisabled =
          selectedBulkFiles.length === 0 ||
          registrationReviewSubmitting ||
          (selectedBulkFiles.length === 1 && decisionRequiresRemark && !registrationBulkRemark.trim());

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
          const isRegistrationDocumentsComplete = templateDocuments.length > 0 && submittedDocumentCount >= templateDocuments.length;
          const registrationCreatedDate = new Date(selectedOrg.createdAt);
          const isRegistrationCreatedDateValid = !Number.isNaN(registrationCreatedDate.getTime());

          const getActivityDayLabel = (iso: string) => {
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) return "Recent";
            const now = new Date();
            if (date.toDateString() === now.toDateString()) return "Today";
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
            return format(date, "d MMM yyyy");
          };

          const organizationActivityEntries = state.activityLogs
            .filter(
              (log) =>
                log.relatedType === "document_submission_file" &&
                log.organizationId === selectedOrg.id &&
                log.action !== "Submitted batch document review",
            )
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((log) => {
              const adminName = adminAccountsById[log.actorUserId]?.displayName ?? "Administrator";
              const relatedFile = state.documentSubmissionFiles.find((file) => file.id === log.relatedId);
              const docName = relatedFile
                ? templateDocuments.find((doc) => doc.id === relatedFile.documentTypeId)?.name ?? relatedFile.fileName
                : "a document";
              const verb =
                log.action === "Approved document submission"
                  ? "approved"
                  : log.action === "Document revision requested"
                    ? "requested revisions to the"
                    : log.action === "Rejected document submission"
                      ? "rejected"
                      : "updated";
              return { id: log.id, adminName, docName, verb, createdAt: log.createdAt };
            });

          const visibleActivityEntries = organizationActivityEntries.slice(0, registrationActivityVisibleCount);
          const hasMoreActivityEntries = organizationActivityEntries.length > visibleActivityEntries.length;
          const groupedActivityEntries = visibleActivityEntries.reduce<{ label: string; entries: typeof visibleActivityEntries }[]>(
            (groups, entry) => {
              const label = getActivityDayLabel(entry.createdAt);
              const existingGroup = groups.find((group) => group.label === label);
              if (existingGroup) {
                existingGroup.entries.push(entry);
              } else {
                groups.push({ label, entries: [entry] });
              }
              return groups;
            },
            [],
          );

          const reviewSummaryCard = (
            <div className="rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
                <div className="flex flex-col gap-1">
                  <p className="font-segoe text-lg font-semibold leading-none text-text-default">Review Summary</p>
                  <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                    Review your decisions before submitting.
                  </p>
                </div>
                <div className="relative shrink-0">
                  <button
                    ref={registrationActivityTriggerRef}
                    type="button"
                    aria-label="Decision history"
                    onClick={() => setIsRegistrationActivityPopoverOpen((current) => !current)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50"
                  >
                    <History className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                  </button>
                  {isRegistrationActivityPopoverOpen ? (
                    <div
                      ref={registrationActivityPanelRef}
                      className="absolute right-0 top-[calc(100%+8px)] z-10 flex max-h-[442px] w-[338px] flex-col gap-0 overflow-hidden rounded-md border border-slate-300 bg-admin-surface p-0 shadow-lg"
                  >
                    <div className="flex flex-col gap-1 border-b border-slate-300 p-4">
                      <p className="font-segoe text-lg font-semibold uppercase leading-none text-text-default">
                        Recent Activity
                      </p>
                      <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                        A log of recent actions taken on this organization.
                      </p>
                    </div>

                    <div className="flex-1 space-y-3 overflow-y-auto p-4">
                      {groupedActivityEntries.length ? (
                        groupedActivityEntries.map((group) => (
                          <div key={group.label} className="space-y-2">
                            <p className="font-cascadia text-[13px] font-semibold uppercase leading-[140%] text-[#b3b3b3]">
                              {group.label}
                            </p>
                            <div className="space-y-0">
                              {group.entries.map((entry, index) => {
                                const entryDate = new Date(entry.createdAt);
                                const isValidEntryDate = !Number.isNaN(entryDate.getTime());
                                return (
                                  <div key={entry.id} className="relative flex gap-2.5 pb-3 last:pb-0">
                                    {index < group.entries.length - 1 ? (
                                      <span className="absolute left-4 top-8 h-[calc(100%-16px)] w-px -translate-x-1/2 bg-slate-300/40" />
                                    ) : null}
                                    <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-info-secondary">
                                      <Clock className="h-4 w-4 text-icon-info-secondary" strokeWidth={1.6} />
                                    </span>
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                      <p className="font-segoe text-[13px] font-normal leading-[120%] text-public-text-neutral-default">
                                        <span className="font-semibold">{entry.adminName}</span> {entry.verb}{" "}
                                        <span className="font-semibold">{entry.docName}</span>.
                                      </p>
                                      <p className="font-segoe text-[11px] font-normal leading-none text-[#b3b3b3]">
                                        {isValidEntryDate ? format(entryDate, "h:mm a") : ""} · {group.label}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="py-6 text-center font-segoe text-sm text-slate-500">
                          No activity recorded yet.
                        </p>
                      )}
                    </div>

                    {hasMoreActivityEntries ? (
                      <div className="flex items-center justify-center border-t border-slate-300 p-4">
                        <button
                          type="button"
                          onClick={() => setRegistrationActivityVisibleCount((current) => current + 4)}
                          className="font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand hover:underline"
                        >
                          Load older activity
                        </button>
                      </div>
                    ) : null}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Approved</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{approvedDocumentCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Request Revision</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{needsRevisionCount + rejectedCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Unreviewed</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{unreviewedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          );

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                  onClick={() => handleRegistrationSelectionChange(null)}
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                  Back to Registrations Queue
                </button>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded border px-2 py-1 font-segoe text-xs font-semibold leading-[140%]",
                      isRegistrationDocumentsComplete
                        ? "border-border-success-subtle bg-bg-success-subtle text-positive-secondary"
                        : "border-border-warning-subtle bg-amber-50 text-text-warning-secondary",
                    )}
                  >
                    {submittedDocumentCount}/{templateDocuments.length} Documents Submitted
                  </span>
                  <RegistrationStatusPill status={selectedOrg.profileStatus} />
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-300 bg-admin-surface">
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 p-4",
                    !registrationInfoCollapsed && "border-b border-slate-300 bg-bg-panel-subtle",
                  )}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-public-bg-brand">
                      <Building2 className="h-5 w-5 text-white" strokeWidth={1.33} />
                    </div>
                    <h1 className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                      {selectedOrg.organizationName}
                    </h1>
                    <ReferenceCodeChip code={selectedOrg.referenceId || "—"} />
                    {selectedOrg.majorClassification ? <CategoryChip category={selectedOrg.majorClassification} /> : null}
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setRegistrationInfoCollapsed((current) => !current)}
                      className="font-segoe text-[11px] font-semibold leading-none text-slate-500"
                    >
                      {registrationInfoCollapsed ? "Expand Details" : "Collapse Details"}
                    </button>
                    <button
                      type="button"
                      aria-expanded={!registrationInfoCollapsed}
                      onClick={() => setRegistrationInfoCollapsed((current) => !current)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50"
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 text-text-default transition-transform", !registrationInfoCollapsed && "rotate-180")}
                        strokeWidth={1.6}
                      />
                    </button>
                  </div>
                </div>

                {!registrationInfoCollapsed ? (
                  <div className="space-y-3 p-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <RegistrationInfoBox label="ORGANIZATION" title={selectedOrg.organizationName} />
                      <RegistrationInfoBox
                        label="CLASSIFICATION"
                        title={selectedOrg.majorClassification || "N/A"}
                        description={selectedOrg.subClassification || undefined}
                      />
                      <RegistrationInfoBox
                        label="LOCATION"
                        title={selectedOrg.district || "N/A"}
                        description={selectedOrg.barangay || undefined}
                      />
                      <RegistrationInfoBox
                        label="REGISTRATION DATE"
                        title={isRegistrationCreatedDateValid ? format(registrationCreatedDate, "d MMM yyyy") : "N/A"}
                        description={selectedOrg.isExistingOrganization ? "Existing Organization" : "New Organization"}
                      />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <RegistrationContactBox
                        icon={UserRound}
                        label="REPRESENTATIVE"
                        title={selectedOrg.representativeName || "N/A"}
                        description={`Adviser: ${selectedOrg.adviserName || "N/A"}`}
                      />
                      <RegistrationContactBox
                        icon={Mail}
                        label="EMAIL"
                        title={selectedOrg.organizationEmail}
                        description="Verified Portal Account"
                        showCopy
                      />
                      <RegistrationContactBox
                        icon={Phone}
                        label="CONTACT"
                        title={selectedOrg.contactNumber || "N/A"}
                      />
                      <RegistrationContactBox
                        icon={Globe}
                        label="FACEBOOK"
                        title={selectedOrg.facebookPageUrl ? selectedOrg.facebookPageUrl.replace(/^https?:\/\/(www\.)?/i, "") : "N/A"}
                        href={selectedOrg.facebookPageUrl || undefined}
                      />
                    </div>
                    <div className="rounded-md border border-[#f3f7fb] bg-bg-panel-subtle px-4 py-3">
                      <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Office Address</p>
                      <p className="mt-2 font-segoe text-sm font-medium leading-[140%] text-text-default">
                        {selectedOrg.address || "No address provided"}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              {reviewSummaryCard}

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_376px]">
                <div className="flex flex-col overflow-hidden rounded-md border border-slate-300 bg-admin-surface shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-300 p-4">
                    <p className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                      {activeReviewEntry?.documentType.name ?? "No document selected"}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {filteredQueueEntries.length ? (
                        <div className="flex shrink-0 items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={activeReviewIndex <= 0}
                            onClick={() =>
                              setActiveRegistrationReviewFileId(
                                filteredQueueEntries[Math.max(0, activeReviewIndex - 1)]?.file.id ?? null,
                              )
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {filteredQueueEntries.slice(0, 5).map((entry, index) => (
                              <button
                                key={entry.file.id}
                                type="button"
                                onClick={() => setActiveRegistrationReviewFileId(entry.file.id)}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md font-segoe text-[13px]",
                                  activeReviewEntry?.file.id === entry.file.id
                                    ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                                    : "text-text-default hover:bg-slate-50",
                                )}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={activeReviewIndex < 0 || activeReviewIndex >= filteredQueueEntries.length - 1}
                            onClick={() =>
                              setActiveRegistrationReviewFileId(
                                filteredQueueEntries[Math.min(filteredQueueEntries.length - 1, activeReviewIndex + 1)]?.file.id ?? null,
                              )
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            Next
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Download documents"
                        disabled={downloadDialogResolving || !filteredQueueEntries.length}
                        onClick={() =>
                          void openDownloadDialog(
                            activeReviewEntry
                              ? { fileName: activeReviewEntry.file.fileName, fileUrl: activeReviewEntry.file.fileUrl }
                              : null,
                            filteredQueueEntries.map((entry) => ({
                              fileName: entry.file.fileName,
                              fileUrl: entry.file.fileUrl,
                            })),
                            "Registration-Documents.zip",
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Download className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[500px] flex-1 items-center justify-center overflow-hidden">
                    {activeReviewEntry && activeDocumentPreviewUrl ? (
                      activeReviewEntry.file.fileType.startsWith("image/") ? (
                        <img
                          src={activeDocumentPreviewUrl}
                          alt={activeReviewEntry.documentType.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        <iframe
                          src={withHiddenPdfToolbar(activeDocumentPreviewUrl)}
                          title={activeReviewEntry.documentType.name}
                          className="h-full min-h-[500px] w-full border-0"
                        />
                      )
                    ) : (
                      <div
                        className="flex h-full min-h-[500px] w-full items-center justify-center"
                        style={{ background: "linear-gradient(180deg, #0E2F66 0%, #1A5CA8 100%)" }}
                      >
                        <Megaphone className="h-16 w-16 text-white" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                  <div className="flex flex-col gap-1 border-b border-slate-300 pb-4">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-segoe text-base font-semibold leading-none text-text-default">Document Queue</p>
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedRegistrationReviewFileIds(
                            orderedSubmittedFiles
                              .filter((entry) => entry.file.adminStatus !== "approved_green")
                              .map((entry) => entry.file.id),
                          )
                        }
                        className="flex shrink-0 items-center gap-1.5 font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand"
                      >
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-slate-500" />
                        Select all
                      </button>
                    </div>
                    <p className="font-segoe text-sm font-normal leading-[140%] text-slate-500">
                      Review the organization&rsquo;s submitted documents and select a document to preview.
                    </p>
                  </div>

                  <div className="space-y-0.5 pt-1">
                    {orderedSubmittedFiles.length ? (
                      orderedSubmittedFiles.map(({ documentType, file }) => {
                        const isChecked = selectedRegistrationReviewFileIds.includes(file.id);
                        const isActive = activeReviewEntry?.file.id === file.id;
                        const uploadedDate = new Date(file.uploadedAt);
                        const isUploadedDateValid = !Number.isNaN(uploadedDate.getTime());
                        const isLocked = file.adminStatus === "approved_green";

                        return (
                          <div
                            key={file.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setActiveRegistrationReviewFileId(file.id);
                              if (!isLocked) setSelectedRegistrationReviewFileIds([file.id]);
                            }}
                            onKeyDown={(event) => {
                              if (event.key !== "Enter" && event.key !== " ") return;
                              event.preventDefault();
                              setActiveRegistrationReviewFileId(file.id);
                              if (!isLocked) setSelectedRegistrationReviewFileIds([file.id]);
                            }}
                            className={cn(
                              "flex w-full cursor-pointer items-start gap-2.5 rounded-md p-4 text-left transition-colors",
                              isChecked
                                ? "border border-border-info-tertiary bg-bg-info-tertiary"
                                : isActive
                                  ? "border border-transparent bg-slate-50"
                                  : "border border-transparent hover:bg-slate-50",
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isLocked}
                              onClick={(event) => event.stopPropagation()}
                              onChange={() => {
                                setSelectedRegistrationReviewFileIds((current) =>
                                  current.includes(file.id)
                                    ? current.filter((id) => id !== file.id)
                                    : [...current, file.id],
                                );
                              }}
                              className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="line-clamp-2 font-segoe text-sm font-semibold leading-none text-text-default">
                                  {documentType.name}
                                </p>
                                <DocumentQueueStatusPill status={file.adminStatus} />
                              </div>
                              <p className="truncate font-cascadia text-xs font-normal leading-none text-slate-500">
                                {file.fileName}
                              </p>
                              <div className="flex items-center gap-2 pt-1">
                                <p className="font-segoe text-xs font-normal leading-none text-[#b3b3b3]">
                                  Submitted: {isUploadedDateValid ? format(uploadedDate, "d MMM yyyy") : "N/A"}
                                </p>
                                <p className="font-segoe text-xs font-normal leading-none text-[#b3b3b3]">
                                  {formatFileSize(file.fileSize)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className="px-2 py-6 text-center font-segoe text-sm text-slate-500">
                        No documents submitted yet.
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                  <div className="relative flex items-center justify-between gap-2 border-b border-slate-300 pb-4">
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">Review Decision</p>
                    <button
                      type="button"
                      ref={registrationDecisionHelpTriggerRef}
                      onClick={() => setIsRegistrationDecisionHelpOpen((current) => !current)}
                      aria-label="Review rules"
                      className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-slate-500 transition-colors hover:text-text-default"
                    >
                      <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.6} />
                    </button>
                    {isRegistrationDecisionHelpOpen ? (
                      <div
                        ref={registrationDecisionHelpPanelRef}
                        className="absolute right-0 top-full z-10 mt-2 w-[280px] space-y-1.5 rounded-md border border-slate-300 bg-admin-surface p-4 shadow-lg"
                      >
                        <p className="font-segoe text-xs font-semibold uppercase leading-none text-slate-500">Review Rules</p>
                        <p className="font-segoe text-xs leading-[140%] text-text-default">
                          <span className="font-semibold">Approve</span> — multiple files can be selected.
                        </p>
                        <p className="font-segoe text-xs leading-[140%] text-text-default">
                          <span className="font-semibold">Request Revision / Reject</span> — one file at a time, remarks required.
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 pt-4">
                    {selectedBulkFiles.length === 0 ? (
                      <div className="flex items-start gap-2 rounded-md border border-border-closed-subtle bg-gray-100 px-4 py-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-tertiary" strokeWidth={1.6} />
                        <p className="font-segoe text-[13px] leading-[120%] text-neutral-tertiary">No documents selected.</p>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-md border border-brand-info-border bg-brand-info-subtle px-4 py-3">
                        <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                        <p className="font-segoe text-[13px] leading-[120%] text-public-bg-brand">
                          {selectedBulkFiles.length} document{selectedBulkFiles.length === 1 ? "" : "s"} selected.
                        </p>
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5">
                      <label className="font-segoe text-[13px] text-text-default">Decision</label>
                      <Select
                        value={registrationBulkDecision}
                        onValueChange={(value) => setRegistrationBulkDecision(value as RegistrationReviewDecision)}
                        disabled={selectedBulkFiles.length === 0}
                      >
                        <SelectTrigger className="h-8 border-slate-300 text-[13px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="approve">Approve</SelectItem>
                          <SelectItem
                            value="needs_revision"
                            disabled={selectedBulkFiles.length > 1}
                            className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                          >
                            Request Revision
                          </SelectItem>
                          <SelectItem
                            value="reject"
                            disabled={selectedBulkFiles.length > 1}
                            className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                          >
                            Reject
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedBulkFiles.length === 1 && decisionRequiresRemark ? (
                      <div className="flex flex-col gap-1.5">
                        <label className="font-segoe text-[13px] text-text-default">
                          Remarks <span className="text-destructive">*</span>
                        </label>
                        <Textarea
                          value={registrationBulkRemark}
                          onChange={(event) => setRegistrationBulkRemark(event.target.value)}
                          placeholder="Explain the reason or required action..."
                          rows={3}
                          className="resize-none text-[13px]"
                        />
                      </div>
                    ) : null}

                    <button
                      type="button"
                      disabled={isRegistrationDecisionConfirmDisabled}
                      onClick={() => setIsRegistrationDecisionConfirmOpen(true)}
                      className="mt-1 flex h-11 w-full items-center justify-center rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-[0.38]"
                    >
                      Confirm
                    </button>
                  </div>
                </div>

                <DangerConfirmDialog
                  open={isRegistrationDecisionConfirmOpen}
                  onOpenChange={setIsRegistrationDecisionConfirmOpen}
                  icon={CheckCircle}
                  variant="info"
                  title="Confirm Review Decision"
                  description="Review your decisions and remarks before submitting. These will be applied to the files below and shown to the organization in their portal."
                  content={
                    <div className="rounded-md border border-slate-300 bg-admin-surface p-6">
                      <div className="grid grid-cols-3 gap-2 border-b border-slate-300 pb-2">
                        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Document</p>
                        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Decision</p>
                        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Remarks</p>
                      </div>
                      <div className="flex flex-col gap-2 pt-2">
                        {selectedBulkFiles.map((entry) => (
                          <div key={entry.file.id} className="grid grid-cols-3 gap-2">
                            <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                              {entry.documentType.name}
                            </p>
                            <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                              {registrationReviewDecisionLabel[registrationBulkDecision]}
                            </p>
                            <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                              {selectedBulkFiles.length === 1 && decisionRequiresRemark
                                ? registrationBulkRemark.trim() || "—"
                                : "—"}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  }
                  warning="Once submitted, these decisions cannot be changed from this review."
                  cancelLabel="Cancel"
                  confirmLabel="Submit Review"
                  confirmIcon={Send}
                  onConfirm={submitRegistrationReviewDecisions}
                />
                </div>
              </div>
            </div>
          );
        }

        const documentCountsByOrgId: Record<string, { submitted: number; required: number }> = {};
        for (const org of state.organizationProfiles) {
          const orgSubmission = state.documentSubmissions.find((item) => item.organizationId === org.id);
          const submittedCount = orgSubmission
            ? state.documentSubmissionFiles.filter(
                (file) =>
                  file.submissionId === orgSubmission.id &&
                  validDocumentTypeIds.has(file.documentTypeId) &&
                  file.adminStatus !== "draft",
              ).length
            : 0;
          documentCountsByOrgId[org.id] = { submitted: submittedCount, required: templateDocuments.length };
        }

        const submittedCount = state.organizationProfiles.filter((org) => org.profileStatus === "incomplete").length;
        const receivedTodayCount = state.organizationProfiles.filter((org) => {
          if (org.profileStatus !== "incomplete") return false;
          const createdDate = new Date(org.createdAt);
          return !Number.isNaN(createdDate.getTime()) && createdDate.toDateString() === new Date().toDateString();
        }).length;
        const pendingReviewCount = state.organizationProfiles.filter((org) => org.profileStatus === "pending_review").length;
        const profilesNeedingRevisionCount = state.organizationProfiles.filter((org) => org.profileStatus === "needs_update").length;

        return (
          <div className="flex flex-col gap-4">
            <AdminPageHeader title="Registrations" description="Review incoming YORP accreditation submissions." />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <StatsCard
                title="SUBMITTED"
                value={submittedCount}
                icon={Send}
                trend="up"
                trendLabel={`${receivedTodayCount} received today`}
                description="New submissions awaiting review."
              />
              <StatsCard
                title="PENDING REVIEW"
                value={pendingReviewCount}
                icon={Clock}
                description="Submissions being evaluated."
              />
              <StatsCard
                title="NEEDS REVISION"
                value={profilesNeedingRevisionCount}
                icon={AlertCircle}
                description="Submissions requiring corrections."
              />
            </div>

            <RegistrationsTable
              registrations={filteredRegistrations}
              documentCountsByOrgId={documentCountsByOrgId}
              searchValue={registrationSearch}
              onSearchChange={setRegistrationSearch}
              statusFilter={registrationStatusFilter}
              onStatusFilterChange={setRegistrationStatusFilter}
              districtFilter={registrationDistrictFilter}
              onDistrictFilterChange={setRegistrationDistrictFilter}
              barangayFilter={registrationBarangayFilter}
              onBarangayFilterChange={setRegistrationBarangayFilter}
              classificationFilter={registrationClassificationFilter}
              onClassificationFilterChange={setRegistrationClassificationFilter}
              onReview={(organizationId) => handleRegistrationSelectionChange(organizationId)}
            />
          </div>
        );
      }
      case "budget-utilization": {
        if (selectedBudgetRequest) {
          const linkedLiquidation = getLatestLiquidationReportForBudgetRequest(selectedBudgetRequest.id);
          const proposedDate = new Date(selectedBudgetRequest.activityDate);
          const isProposedDateValid = !Number.isNaN(proposedDate.getTime());

          const budgetFiles = state.budgetRequestFiles.filter((file) => file.budgetRequestId === selectedBudgetRequest.id);
          const budgetApprovedCount = budgetFiles.filter((file) => file.adminStatus === "approved_green").length;
          const budgetNeedsRevisionCount = budgetFiles.filter(
            (file) => file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red",
          ).length;
          const budgetUnreviewedCount = budgetFiles.filter(
            (file) => file.adminStatus === "submitted" || file.adminStatus === "under_admin_review",
          ).length;

          const getBudgetActivityDayLabel = (iso: string) => {
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) return "Recent";
            const now = new Date();
            if (date.toDateString() === now.toDateString()) return "Today";
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
            return format(date, "d MMM yyyy");
          };

          const budgetActivityEntries = state.activityLogs
            .filter((log) => log.relatedType === "budget_request" && log.relatedId === selectedBudgetRequest.id)
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((log) => {
              const adminName = adminAccountsById[log.actorUserId]?.displayName ?? "Administrator";
              return { id: log.id, adminName, action: log.description || log.action, createdAt: log.createdAt };
            });
          const visibleBudgetActivityEntries = budgetActivityEntries.slice(0, budgetActivityVisibleCount);
          const hasMoreBudgetActivityEntries = budgetActivityEntries.length > visibleBudgetActivityEntries.length;
          const groupedBudgetActivityEntries = visibleBudgetActivityEntries.reduce<
            { label: string; entries: typeof visibleBudgetActivityEntries }[]
          >((groups, entry) => {
            const label = getBudgetActivityDayLabel(entry.createdAt);
            const existingGroup = groups.find((group) => group.label === label);
            if (existingGroup) {
              existingGroup.entries.push(entry);
            } else {
              groups.push({ label, entries: [entry] });
            }
            return groups;
          }, []);

          const activeBudgetReviewIndex = selectedBudgetRequestFiles.findIndex((file) => file.id === selectedBudgetRequestFile?.id);
          const selectedBudgetReviewFiles = selectedBudgetRequestFiles.filter(
            (file) => selectedBudgetReviewFileIds.includes(file.id) && file.adminStatus !== "approved_green",
          );
          const budgetDecisionRequiresRemarkNow = budgetDecisionRequiresRemark(budgetBulkDecision);
          const isBudgetDecisionConfirmDisabled =
            selectedBudgetReviewFiles.length === 0 ||
            budgetReviewSubmitting ||
            (selectedBudgetReviewFiles.length === 1 && budgetDecisionRequiresRemarkNow && !budgetBulkRemark.trim());

          const submitBudgetReviewDecisions = async () => {
            if (!selectedBudgetReviewFiles.length) return;
            setBudgetReviewSubmitting(true);
            const targetStatus: BudgetRequestFileAdminStatus =
              budgetBulkDecision === "approve"
                ? "approved_green"
                : budgetBulkDecision === "needs_revision"
                  ? "needs_revision"
                  : "rejected_red";
            const remark = selectedBudgetReviewFiles.length === 1 && budgetDecisionRequiresRemarkNow ? budgetBulkRemark.trim() : "";
            const failedNames: string[] = [];
            for (const file of selectedBudgetReviewFiles) {
              try {
                const saved = await adminUpdateBudgetRequestFileStatusInSupabase(file.id, {
                  adminStatus: targetStatus,
                  adminRemarks: remark,
                });
                updateBudgetRequestFile(saved.id, saved);
              } catch {
                failedNames.push(file.fileName);
              }
            }
            if (failedNames.length < selectedBudgetReviewFiles.length) {
              void appendAuditLog(
                "Budget file reviewed",
                "budget_request",
                selectedBudgetRequest.id,
                `${budgetReviewDecisionLabel[budgetBulkDecision]} decision applied to ${selectedBudgetReviewFiles.length - failedNames.length} file(s).`,
                selectedBudgetRequest.organizationId,
              ).catch((error) => console.error("Unable to record budget file review activity:", error));
            }
            setBudgetReviewSubmitting(false);
            setSelectedBudgetReviewFileIds([]);
            setBudgetBulkRemark("");
            setIsBudgetDecisionConfirmOpen(false);
            if (failedNames.length) {
              toast({ title: "Some updates failed", description: failedNames.join(", "), variant: "destructive" });
            } else {
              toast({
                title: "Review saved",
                description: `${selectedBudgetReviewFiles.length} file${selectedBudgetReviewFiles.length === 1 ? "" : "s"} updated.`,
              });
            }
          };

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeBudgetRequestDetails}
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                  Back to Requests
                </button>
                <BudgetStatusPill status={selectedBudgetRequest.status} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-admin-surface p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-public-bg-brand">
                    <Building2 className="h-5 w-5 text-white" strokeWidth={1.33} />
                  </div>
                  <h1 className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                    {selectedBudgetRequest.activityTitle}
                  </h1>
                  <ReferenceCodeChip
                    code={buildPublicRecordCode("BR", selectedBudgetRequest, state.budgetRequests)}
                    className="w-[109px] rounded"
                  />
                  {selectedBudgetOrganization?.majorClassification ? (
                    <CategoryChip category={selectedBudgetOrganization.majorClassification} />
                  ) : null}
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-300 bg-admin-surface">
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 p-4",
                    !budgetInfoCollapsed && "border-b border-slate-300 bg-bg-panel-subtle",
                  )}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">Budget Request Information</p>
                    <ReferenceCodeChip
                      code={buildPublicRecordCode("BR", selectedBudgetRequest, state.budgetRequests)}
                      className="w-[109px] rounded"
                    />
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBudgetInfoCollapsed((current) => !current)}
                      className="font-segoe text-[11px] font-semibold leading-none text-slate-500"
                    >
                      {budgetInfoCollapsed ? "Expand Details" : "Collapse Details"}
                    </button>
                    <button
                      type="button"
                      aria-expanded={!budgetInfoCollapsed}
                      onClick={() => setBudgetInfoCollapsed((current) => !current)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50"
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 text-text-default transition-transform", !budgetInfoCollapsed && "rotate-180")}
                        strokeWidth={1.6}
                      />
                    </button>
                  </div>
                </div>

                {!budgetInfoCollapsed ? (
                  <div className="grid grid-cols-1 gap-2.5 p-4 lg:grid-cols-3">
                    <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3">
                      <p className="text-justify font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Activity Details</p>
                      <div className="flex flex-col gap-2 rounded-md border border-[#f3f7fb] bg-bg-panel-subtle px-4 py-3">
                        <p className="font-body text-[11px] font-normal capitalize leading-[140%] text-slate-500">Project Name</p>
                        <p className="truncate font-segoe text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
                          {selectedBudgetRequest.activityTitle}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-slate-300 py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Category</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {selectedBudgetRequest.purposeCategory || "General Purpose"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-300 py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Proposed Date</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {isProposedDateValid ? format(proposedDate, "d MMM yyyy") : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Proposed Venue</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {selectedBudgetRequest.venue || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3">
                      <p className="text-justify font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Submitted By</p>
                      <div className="flex flex-col gap-2 rounded-md border border-[#f3f7fb] bg-bg-panel-subtle px-4 py-3">
                        <p className="font-body text-[11px] font-normal capitalize leading-[140%] text-slate-500">Organization Name</p>
                        <p className="truncate font-segoe text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
                          {selectedBudgetOrganization?.organizationName ?? "Unknown organization"}
                        </p>
                        <ReferenceCodeChip code={selectedBudgetOrganization?.referenceId || "—"} className="w-[109px] rounded" />
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-slate-300 py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Representative</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {selectedBudgetOrganization?.representativeName || "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-300 py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Contact</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {selectedBudgetOrganization?.contactNumber || "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Email</span>
                          <span className="truncate font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {selectedBudgetOrganization?.organizationEmail || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3">
                      <p className="text-justify font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Financial Details</p>
                      <div className="flex flex-col gap-2 rounded-md border border-[#f3f7fb] bg-bg-panel-subtle px-4 py-3">
                        <p className="font-body text-[11px] font-normal capitalize leading-[140%] text-slate-500">Total Requested</p>
                        <p className="font-cascadia text-2xl font-bold leading-[120%] tracking-[-0.02em] text-border-info-tertiary">
                          {`₱${Math.round(selectedBudgetRequest.requestedAmount).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Linked Liquidation</span>
                        {linkedLiquidation ? (
                          <ReferenceCodeChip
                            code={buildPublicRecordCode("LR", linkedLiquidation, visibleLiquidationReports)}
                            className="w-[109px] rounded"
                          />
                        ) : (
                          <span className="font-segoe text-[13px] font-semibold leading-none text-slate-400">Not yet submitted</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">Review Summary</p>
                    <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                      Review your decisions before submitting.
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      ref={budgetActivityTriggerRef}
                      type="button"
                      aria-label="Decision history"
                      onClick={() => setIsBudgetActivityPopoverOpen((current) => !current)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50"
                    >
                      <History className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                    </button>
                    {isBudgetActivityPopoverOpen ? (
                      <div
                        ref={budgetActivityPanelRef}
                        className="absolute right-0 top-[calc(100%+8px)] z-10 flex max-h-[442px] w-[338px] flex-col gap-0 overflow-hidden rounded-md border border-slate-300 bg-admin-surface p-0 shadow-lg"
                      >
                        <div className="flex flex-col gap-1 border-b border-slate-300 p-4">
                          <p className="font-segoe text-lg font-semibold uppercase leading-none text-text-default">Recent Activity</p>
                          <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                            A log of recent actions taken on this budget request.
                          </p>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto p-4">
                          {groupedBudgetActivityEntries.length ? (
                            groupedBudgetActivityEntries.map((group) => (
                              <div key={group.label} className="space-y-2">
                                <p className="font-cascadia text-[13px] font-semibold uppercase leading-[140%] text-[#b3b3b3]">
                                  {group.label}
                                </p>
                                <div className="space-y-0">
                                  {group.entries.map((entry, index) => {
                                    const entryDate = new Date(entry.createdAt);
                                    const isValidEntryDate = !Number.isNaN(entryDate.getTime());
                                    return (
                                      <div key={entry.id} className="relative flex gap-2.5 pb-3 last:pb-0">
                                        {index < group.entries.length - 1 ? (
                                          <span className="absolute left-4 top-8 h-[calc(100%-16px)] w-px -translate-x-1/2 bg-slate-300/40" />
                                        ) : null}
                                        <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-info-secondary">
                                          <Clock className="h-4 w-4 text-icon-info-secondary" strokeWidth={1.6} />
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                          <p className="font-segoe text-[13px] font-normal leading-[120%] text-public-text-neutral-default">
                                            <span className="font-semibold">{entry.adminName}</span> {entry.action}
                                          </p>
                                          <p className="font-segoe text-[11px] font-normal leading-none text-[#b3b3b3]">
                                            {isValidEntryDate ? format(entryDate, "h:mm a") : ""} · {group.label}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="py-6 text-center font-segoe text-sm text-slate-500">No activity recorded yet.</p>
                          )}
                        </div>

                        {hasMoreBudgetActivityEntries ? (
                          <div className="flex items-center justify-center border-t border-slate-300 p-4">
                            <button
                              type="button"
                              onClick={() => setBudgetActivityVisibleCount((current) => current + 4)}
                              className="font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand hover:underline"
                            >
                              Load older activity
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Approved</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{budgetApprovedCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Request Revision</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{budgetNeedsRevisionCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Unreviewed</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{budgetUnreviewedCount}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_376px]">
                <div className="flex flex-col overflow-hidden rounded-md border border-slate-300 bg-admin-surface shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-300 p-4">
                    <p className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                      {selectedBudgetRequestFile?.fileName ?? "No document selected"}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {selectedBudgetRequestFiles.length ? (
                        <div className="flex shrink-0 items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={activeBudgetReviewIndex <= 0}
                            onClick={() =>
                              setSelectedBudgetFileId(selectedBudgetRequestFiles[Math.max(0, activeBudgetReviewIndex - 1)]?.id ?? null)
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {selectedBudgetRequestFiles.slice(0, 5).map((file, index) => (
                              <button
                                key={file.id}
                                type="button"
                                onClick={() => setSelectedBudgetFileId(file.id)}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md font-segoe text-[13px]",
                                  selectedBudgetRequestFile?.id === file.id
                                    ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                                    : "text-text-default hover:bg-slate-50",
                                )}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={activeBudgetReviewIndex < 0 || activeBudgetReviewIndex >= selectedBudgetRequestFiles.length - 1}
                            onClick={() =>
                              setSelectedBudgetFileId(
                                selectedBudgetRequestFiles[Math.min(selectedBudgetRequestFiles.length - 1, activeBudgetReviewIndex + 1)]?.id ?? null,
                              )
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            Next
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Download documents"
                        disabled={downloadDialogResolving || !selectedBudgetRequestFiles.length}
                        onClick={() =>
                          void openDownloadDialog(
                            selectedBudgetRequestFile
                              ? { fileName: selectedBudgetRequestFile.fileName, fileUrl: selectedBudgetRequestFile.fileUrl }
                              : null,
                            selectedBudgetRequestFiles.map((file) => ({ fileName: file.fileName, fileUrl: file.fileUrl })),
                            "Budget-Request-Documents.zip",
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Download className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[500px] flex-1 items-center justify-center overflow-hidden">
                    {selectedBudgetRequestFile && budgetPreviewUrl ? (
                      budgetPreviewCanInline ? (
                        isImagePreviewFile(selectedBudgetRequestFile.fileName) || isImagePreviewFile(budgetPreviewUrl) ? (
                          <img src={budgetPreviewUrl} alt={budgetPreviewTitle} className="h-full w-full object-contain" />
                        ) : (
                          <iframe src={withHiddenPdfToolbar(budgetPreviewUrl)} title={budgetPreviewTitle} className="h-full min-h-[500px] w-full border-0" />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-4 text-center font-segoe text-sm text-slate-500">
                          <p>This file cannot be previewed inline.</p>
                          <button
                            type="button"
                            onClick={() => window.open(budgetPreviewUrl, "_blank", "noopener,noreferrer")}
                            className="flex items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3 py-2 font-segoe text-[13px] text-text-default transition-colors hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.6} />
                            Open File
                          </button>
                        </div>
                      )
                    ) : selectedBudgetRequestFile && budgetPreviewLoading ? (
                      <p className="font-segoe text-sm text-slate-500">Loading preview…</p>
                    ) : (
                      <div
                        className="flex h-full min-h-[500px] w-full items-center justify-center"
                        style={{ background: "linear-gradient(180deg, #0E2F66 0%, #1A5CA8 100%)" }}
                      >
                        <Megaphone className="h-16 w-16 text-white" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                    <div className="flex flex-col gap-1 border-b border-slate-300 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-segoe text-base font-semibold leading-none text-text-default">Document Queue</p>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedBudgetReviewFileIds(
                              selectedBudgetRequestFiles.filter((file) => file.adminStatus !== "approved_green").map((file) => file.id),
                            )
                          }
                          className="flex shrink-0 items-center gap-1.5 font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-slate-500" />
                          Select all
                        </button>
                      </div>
                      <p className="font-segoe text-sm font-normal leading-[140%] text-slate-500">
                        Review the organization's submitted documents and select a document to preview.
                      </p>
                    </div>

                    <div className="space-y-0.5 pt-1">
                      {selectedBudgetRequestFiles.length ? (
                        selectedBudgetRequestFiles.map((file) => {
                          const isChecked = selectedBudgetReviewFileIds.includes(file.id);
                          const isActive = selectedBudgetRequestFile?.id === file.id;
                          const uploadedDate = new Date(file.uploadedAt);
                          const isUploadedDateValid = !Number.isNaN(uploadedDate.getTime());
                          const isLocked = file.adminStatus === "approved_green";

                          return (
                            <div
                              key={file.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedBudgetFileId(file.id);
                                if (!isLocked) setSelectedBudgetReviewFileIds([file.id]);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") return;
                                event.preventDefault();
                                setSelectedBudgetFileId(file.id);
                                if (!isLocked) setSelectedBudgetReviewFileIds([file.id]);
                              }}
                              className={cn(
                                "flex w-full cursor-pointer items-start gap-2.5 rounded-md p-4 text-left transition-colors",
                                isChecked
                                  ? "border border-border-info-tertiary bg-bg-info-tertiary"
                                  : isActive
                                    ? "border border-transparent bg-slate-50"
                                    : "border border-transparent hover:bg-slate-50",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isLocked}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() => {
                                  setSelectedBudgetReviewFileIds((current) =>
                                    current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id],
                                  );
                                }}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-2 font-segoe text-sm font-semibold leading-none text-text-default">{file.fileName}</p>
                                  <DocumentQueueStatusPill status={file.adminStatus} />
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <p className="font-segoe text-xs font-normal leading-none text-[#b3b3b3]">
                                    Submitted: {isUploadedDateValid ? format(uploadedDate, "d MMM yyyy") : "N/A"}
                                  </p>
                                  <p className="font-segoe text-xs font-normal leading-none text-[#b3b3b3]">{formatFileSize(file.fileSize)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="px-2 py-6 text-center font-segoe text-sm text-slate-500">No files submitted yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                    <div className="relative flex items-center justify-between gap-2 border-b border-slate-300 pb-4">
                      <p className="font-segoe text-lg font-semibold leading-none text-text-default">Review Decision</p>
                      <button
                        type="button"
                        ref={budgetDecisionHelpTriggerRef}
                        onClick={() => setIsBudgetDecisionHelpOpen((current) => !current)}
                        aria-label="Review rules"
                        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-slate-500 transition-colors hover:text-text-default"
                      >
                        <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.6} />
                      </button>
                      {isBudgetDecisionHelpOpen ? (
                        <div
                          ref={budgetDecisionHelpPanelRef}
                          className="absolute right-0 top-full z-10 mt-2 w-[280px] space-y-1.5 rounded-md border border-slate-300 bg-admin-surface p-4 shadow-lg"
                        >
                          <p className="font-segoe text-xs font-semibold uppercase leading-none text-slate-500">Review Rules</p>
                          <p className="font-segoe text-xs leading-[140%] text-text-default">
                            <span className="font-semibold">Approve</span> — multiple files can be selected.
                          </p>
                          <p className="font-segoe text-xs leading-[140%] text-text-default">
                            <span className="font-semibold">Request Revision / Reject</span> — one file at a time, remarks required.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 pt-4">
                      {selectedBudgetReviewFiles.length === 0 ? (
                        <div className="flex items-start gap-2 rounded-md border border-border-closed-subtle bg-gray-100 px-4 py-3">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-tertiary" strokeWidth={1.6} />
                          <p className="font-segoe text-[13px] leading-[120%] text-neutral-tertiary">No documents selected.</p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-md border border-brand-info-border bg-brand-info-subtle px-4 py-3">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                          <p className="font-segoe text-[13px] leading-[120%] text-public-bg-brand">
                            {selectedBudgetReviewFiles.length} document{selectedBudgetReviewFiles.length === 1 ? "" : "s"} selected.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="font-segoe text-[13px] text-text-default">Decision</label>
                        <Select
                          value={budgetBulkDecision}
                          onValueChange={(value) => setBudgetBulkDecision(value as BudgetReviewDecision)}
                          disabled={selectedBudgetReviewFiles.length === 0}
                        >
                          <SelectTrigger className="h-8 border-slate-300 text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approve">Approve</SelectItem>
                            <SelectItem
                              value="needs_revision"
                              disabled={selectedBudgetReviewFiles.length > 1}
                              className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                            >
                              Request Revision
                            </SelectItem>
                            <SelectItem
                              value="reject"
                              disabled={selectedBudgetReviewFiles.length > 1}
                              className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                            >
                              Reject
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedBudgetReviewFiles.length === 1 && budgetDecisionRequiresRemarkNow ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="font-segoe text-[13px] text-text-default">
                            Remarks <span className="text-destructive">*</span>
                          </label>
                          <Textarea
                            value={budgetBulkRemark}
                            onChange={(event) => setBudgetBulkRemark(event.target.value)}
                            placeholder="Explain the reason or required action..."
                            rows={3}
                            className="resize-none text-[13px]"
                          />
                        </div>
                      ) : null}

                      <button
                        type="button"
                        disabled={isBudgetDecisionConfirmDisabled}
                        onClick={() => setIsBudgetDecisionConfirmOpen(true)}
                        className="mt-1 flex h-11 w-full items-center justify-center rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-[0.38]"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>

                  <DangerConfirmDialog
                    open={isBudgetDecisionConfirmOpen}
                    onOpenChange={setIsBudgetDecisionConfirmOpen}
                    icon={CheckCircle}
                    variant="info"
                    title="Confirm Review Decision"
                    description="Review your decisions and remarks before submitting. These will be applied to the files below and shown to the organization in their portal."
                    content={
                      <div className="rounded-md border border-slate-300 bg-admin-surface p-6">
                        <div className="grid grid-cols-3 gap-2 border-b border-slate-300 pb-2">
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Document</p>
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Decision</p>
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Remarks</p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                          {selectedBudgetReviewFiles.map((file) => (
                            <div key={file.id} className="grid grid-cols-3 gap-2">
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">{file.fileName}</p>
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                                {budgetReviewDecisionLabel[budgetBulkDecision]}
                              </p>
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                                {selectedBudgetReviewFiles.length === 1 && budgetDecisionRequiresRemarkNow
                                  ? budgetBulkRemark.trim() || "—"
                                  : "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                    warning="Once submitted, these decisions cannot be changed from this review."
                    cancelLabel="Cancel"
                    confirmLabel="Submit Review"
                    confirmIcon={Send}
                    onConfirm={submitBudgetReviewDecisions}
                  />
                </div>
              </div>
            </div>
          );
        }

        const submittedBudgetRequestCount = state.budgetRequests.filter((r) => r.status === "submitted").length;
        const submittedBudgetRequestTodayCount = state.budgetRequests.filter((r) => {
          if (r.status !== "submitted") return false;
          const createdDate = new Date(r.createdAt);
          const today = new Date();
          return (
            !Number.isNaN(createdDate.getTime()) &&
            createdDate.getFullYear() === today.getFullYear() &&
            createdDate.getMonth() === today.getMonth() &&
            createdDate.getDate() === today.getDate()
          );
        }).length;
        const pendingReviewBudgetRequestCount = state.budgetRequests.filter((r) => r.status === "under_review").length;
        const releasedBudgetTotal = state.budgetRequests.reduce((sum, r) => sum + (r.releasedAmount || 0), 0);
        const formatBudgetStatCurrency = (value: number) => `₱${Math.round(value).toLocaleString()}`;
        const budgetOrganizationsById = Object.fromEntries(state.organizationProfiles.map((org) => [org.id, org]));

        return (
          <div className="space-y-4">
            <AdminPageHeader title="Budget Requests" description="Review funding requests for YPOP-approved projects." />

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <StatsCard
                title="SUBMITTED"
                value={submittedBudgetRequestCount}
                icon={Send}
                trend="up"
                trendLabel={`${submittedBudgetRequestTodayCount} received today`}
                description="New submissions awaiting review."
              />
              <StatsCard
                title="PENDING REVIEW"
                value={pendingReviewBudgetRequestCount}
                icon={Clock}
                description="Submissions being evaluated."
              />
              <StatsCard
                title="RELEASED BUDGET"
                value={formatBudgetStatCurrency(releasedBudgetTotal)}
                icon={Wallet}
                description="Total amount released from approved requests."
              />
            </div>

            <BudgetRequestsTable
              requests={filteredAdminBudgetRequests}
              allRequests={state.budgetRequests}
              organizationsById={budgetOrganizationsById}
              searchValue={budgetRequestsSearch}
              onSearchChange={setBudgetRequestsSearch}
              statusFilter={budgetRequestsStatusFilter}
              onStatusFilterChange={setBudgetRequestsStatusFilter}
              districtFilter={budgetRequestsDistrictFilter}
              onDistrictFilterChange={setBudgetRequestsDistrictFilter}
              barangayFilter={budgetRequestsBarangayFilter}
              onBarangayFilterChange={setBudgetRequestsBarangayFilter}
              classificationFilter={budgetRequestsClassificationFilter}
              onClassificationFilterChange={setBudgetRequestsClassificationFilter}
              onReview={(requestId) => openBudgetRequestDetails(requestId)}
            />
          </div>
        );
      }
      case "liquidation-monitoring":
        if (liquidationDetailsOpen && selectedLiquidationReport) {
          const linkedBudgetRequest = selectedLiquidationBudgetRequest;
          const proposedDate = linkedBudgetRequest ? new Date(linkedBudgetRequest.activityDate) : null;
          const isProposedDateValid = Boolean(proposedDate && !Number.isNaN(proposedDate.getTime()));

          const releasedBudgetAmount = linkedBudgetRequest?.releasedAmount || 0;
          const totalLiquidatedAmount = selectedLiquidationReport.status === "completed_liquidated" ? releasedBudgetAmount : 0;
          const unliquidatedVariance = Math.max(releasedBudgetAmount - totalLiquidatedAmount, 0);

          const liquidationFiles = selectedLiquidationReportFiles;
          const liquidationApprovedCount = liquidationFiles.filter((file) => file.adminStatus === "approved_green").length;
          const liquidationNeedsRevisionCount = liquidationFiles.filter(
            (file) => file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red",
          ).length;
          const liquidationUnreviewedCount = liquidationFiles.filter(
            (file) => file.adminStatus === "submitted" || file.adminStatus === "under_admin_review",
          ).length;

          const getLiquidationActivityDayLabel = (iso: string) => {
            const date = new Date(iso);
            if (Number.isNaN(date.getTime())) return "Recent";
            const now = new Date();
            if (date.toDateString() === now.toDateString()) return "Today";
            const yesterday = new Date(now);
            yesterday.setDate(now.getDate() - 1);
            if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
            return format(date, "d MMM yyyy");
          };

          const liquidationActivityEntries = state.activityLogs
            .filter((log) => log.relatedType === "liquidation_report" && log.relatedId === selectedLiquidationReport.id)
            .slice()
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .map((log) => {
              const adminName = adminAccountsById[log.actorUserId]?.displayName ?? "Administrator";
              return { id: log.id, adminName, action: log.description || log.action, createdAt: log.createdAt };
            });
          const visibleLiquidationActivityEntries = liquidationActivityEntries.slice(0, liquidationActivityVisibleCount);
          const hasMoreLiquidationActivityEntries = liquidationActivityEntries.length > visibleLiquidationActivityEntries.length;
          const groupedLiquidationActivityEntries = visibleLiquidationActivityEntries.reduce<
            { label: string; entries: typeof visibleLiquidationActivityEntries }[]
          >((groups, entry) => {
            const label = getLiquidationActivityDayLabel(entry.createdAt);
            const existingGroup = groups.find((group) => group.label === label);
            if (existingGroup) {
              existingGroup.entries.push(entry);
            } else {
              groups.push({ label, entries: [entry] });
            }
            return groups;
          }, []);

          const activeLiquidationReviewIndex = liquidationFiles.findIndex((file) => file.id === selectedLiquidationReportFile?.id);
          const selectedLiquidationReviewFiles = liquidationFiles.filter(
            (file) => selectedLiquidationReviewFileIds.includes(file.id) && file.adminStatus !== "approved_green",
          );
          const liquidationDecisionRequiresRemarkNow = budgetDecisionRequiresRemark(liquidationBulkDecision);
          const isLiquidationDecisionConfirmDisabled =
            selectedLiquidationReviewFiles.length === 0 ||
            liquidationReviewSubmitting ||
            (selectedLiquidationReviewFiles.length === 1 && liquidationDecisionRequiresRemarkNow && !liquidationBulkRemark.trim());

          const submitLiquidationReviewDecisions = async () => {
            if (!selectedLiquidationReviewFiles.length) return;
            setLiquidationReviewSubmitting(true);
            const targetStatus: BudgetRequestFileAdminStatus =
              liquidationBulkDecision === "approve"
                ? "approved_green"
                : liquidationBulkDecision === "needs_revision"
                  ? "needs_revision"
                  : "rejected_red";
            const remark = selectedLiquidationReviewFiles.length === 1 && liquidationDecisionRequiresRemarkNow ? liquidationBulkRemark.trim() : "";
            const failedNames: string[] = [];
            for (const file of selectedLiquidationReviewFiles) {
              try {
                const saved = await adminUpdateLiquidationReportFileStatusInSupabase(file.id, {
                  adminStatus: targetStatus,
                  adminRemarks: remark,
                });
                updateLiquidationReportFile(saved.id, saved);
              } catch {
                failedNames.push(file.fileName);
              }
            }
            if (failedNames.length < selectedLiquidationReviewFiles.length) {
              void appendAuditLog(
                "Liquidation file reviewed",
                "liquidation_report",
                selectedLiquidationReport.id,
                `${budgetReviewDecisionLabel[liquidationBulkDecision]} decision applied to ${selectedLiquidationReviewFiles.length - failedNames.length} file(s).`,
                selectedLiquidationReport.organizationId,
              ).catch((error) => console.error("Unable to record liquidation file review activity:", error));
            }
            setLiquidationReviewSubmitting(false);
            setSelectedLiquidationReviewFileIds([]);
            setLiquidationBulkRemark("");
            setIsLiquidationDecisionConfirmOpen(false);
            if (failedNames.length) {
              toast({ title: "Some updates failed", description: failedNames.join(", "), variant: "destructive" });
            } else {
              toast({
                title: "Review saved",
                description: `${selectedLiquidationReviewFiles.length} file${selectedLiquidationReviewFiles.length === 1 ? "" : "s"} updated.`,
              });
            }
          };

          const handleMarkHardcopySubmitted = async () => {
            if (!liquidationHardcopyDateReceived) return;
            setIsMarkingLiquidationHardcopy(true);
            try {
              const iso = new Date(liquidationHardcopyDateReceived).toISOString();
              await updateLiquidationReportInSupabase(selectedLiquidationReport.id, {
                status: "completed_liquidated",
                hardCopySubmittedAt: iso,
                completedAt: iso,
              });
              await refreshAdminState();
              updateLiquidationReport(selectedLiquidationReport.id, {
                status: "completed_liquidated",
                hardCopySubmittedAt: iso,
                completedAt: iso,
              });
              void appendAuditLog(
                "Hardcopy submitted",
                "liquidation_report",
                selectedLiquidationReport.id,
                `Hardcopy received on ${format(new Date(iso), "d MMM yyyy")}.`,
                selectedLiquidationReport.organizationId,
              ).catch((error) => console.error("Unable to record hardcopy submission activity:", error));
              toast({ title: "Hardcopy recorded", description: "The liquidation report has been marked as completed." });
            } catch (error) {
              toast({
                title: "Unable to save",
                description: error instanceof Error ? error.message : "The hardcopy submission could not be recorded right now.",
                variant: "destructive",
              });
            } finally {
              setIsMarkingLiquidationHardcopy(false);
            }
          };

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={closeLiquidationDetails}
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                  Back to Reports
                </button>
                <LiquidationStatusLabel status={selectedLiquidationReport.status} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-admin-surface p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-public-bg-brand">
                    <Building2 className="h-5 w-5 text-white" strokeWidth={1.33} />
                  </div>
                  <h1 className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                    {linkedBudgetRequest?.activityTitle ?? "Liquidation Report"}
                  </h1>
                  <ReferenceCodeChip
                    code={buildPublicRecordCode("LR", selectedLiquidationReport, visibleLiquidationReports)}
                    className="w-[109px] rounded"
                  />
                </div>
              </div>

              <div className="overflow-hidden rounded-md border border-slate-300 bg-admin-surface">
                <div
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-3 p-4",
                    !liquidationInfoCollapsed && "border-b border-slate-300 bg-bg-panel-subtle",
                  )}
                >
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">Liquidation Report Information</p>
                    <ReferenceCodeChip
                      code={buildPublicRecordCode("LR", selectedLiquidationReport, visibleLiquidationReports)}
                      className="w-[109px] rounded"
                    />
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setLiquidationInfoCollapsed((current) => !current)}
                      className="font-segoe text-[11px] font-semibold leading-none text-slate-500"
                    >
                      {liquidationInfoCollapsed ? "Expand Details" : "Collapse Details"}
                    </button>
                    <button
                      type="button"
                      aria-expanded={!liquidationInfoCollapsed}
                      onClick={() => setLiquidationInfoCollapsed((current) => !current)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50"
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 text-text-default transition-transform", !liquidationInfoCollapsed && "rotate-180")}
                        strokeWidth={1.6}
                      />
                    </button>
                  </div>
                </div>

                {!liquidationInfoCollapsed ? (
                  <div className="grid grid-cols-1 gap-2.5 p-4 lg:grid-cols-2">
                    <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3">
                      <p className="text-justify font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Activity Details</p>
                      <div className="flex flex-col gap-2 rounded-md border border-[#f3f7fb] bg-bg-panel-subtle px-4 py-3">
                        <p className="font-body text-[11px] font-normal capitalize leading-[140%] text-slate-500">Project Name</p>
                        <p className="truncate font-segoe text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
                          {linkedBudgetRequest?.activityTitle ?? "—"}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between border-b border-slate-300 py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Category</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {linkedBudgetRequest?.purposeCategory || "General Purpose"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between border-b border-slate-300 py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Proposed Date</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {isProposedDateValid && proposedDate ? format(proposedDate, "d MMM yyyy") : "—"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                          <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Proposed Venue</span>
                          <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                            {linkedBudgetRequest?.venue || "—"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3">
                      <p className="text-justify font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Financial Details</p>
                      <div className="flex items-center justify-between border-b border-slate-300 py-2">
                        <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Released Budget</span>
                        <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                          {formatPesoAmount(releasedBudgetAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-300 py-2">
                        <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Total Liquidated</span>
                        <span
                          className={cn(
                            "font-segoe text-[13px] font-semibold leading-none",
                            totalLiquidatedAmount > 0 ? "text-bg-success-default" : "text-text-default",
                          )}
                        >
                          {formatPesoAmount(totalLiquidatedAmount)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between border-b border-slate-300 py-2">
                        <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Unliquidated Variance</span>
                        <span className="font-segoe text-[13px] font-semibold leading-none text-text-default">
                          {formatPesoAmount(unliquidatedVariance)} ({unliquidatedVariance === 0 ? "Balanced" : "Outstanding"})
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="font-segoe text-[13px] font-semibold capitalize leading-none text-slate-500">Linked Request</span>
                        {linkedBudgetRequest ? (
                          <button
                            type="button"
                            onClick={() => openBudgetRequestDetails(linkedBudgetRequest.id)}
                            className="flex h-[22px] w-[109px] shrink-0 items-center gap-1.5 rounded border border-border-reference-chip bg-bg-reference-chip px-2 py-1.5 font-cascadia text-[10px] font-semibold leading-[140%] text-text-reference transition-colors hover:bg-slate-100"
                          >
                            <span className="min-w-0 flex-1 truncate text-left">
                              {buildPublicRecordCode("BR", linkedBudgetRequest, state.budgetRequests)}
                            </span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                          </button>
                        ) : (
                          <span className="font-segoe text-[13px] font-semibold leading-none text-slate-400">—</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
                  <div className="flex flex-col gap-1">
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">Review Summary</p>
                    <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                      Review your decisions before submitting.
                    </p>
                  </div>
                  <div className="relative shrink-0">
                    <button
                      ref={liquidationActivityTriggerRef}
                      type="button"
                      aria-label="Decision history"
                      onClick={() => setIsLiquidationActivityPopoverOpen((current) => !current)}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50"
                    >
                      <History className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                    </button>
                    {isLiquidationActivityPopoverOpen ? (
                      <div
                        ref={liquidationActivityPanelRef}
                        className="absolute right-0 top-[calc(100%+8px)] z-10 flex max-h-[442px] w-[338px] flex-col gap-0 overflow-hidden rounded-md border border-slate-300 bg-admin-surface p-0 shadow-lg"
                      >
                        <div className="flex flex-col gap-1 border-b border-slate-300 p-4">
                          <p className="font-segoe text-lg font-semibold uppercase leading-none text-text-default">Recent Activity</p>
                          <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                            A log of recent actions taken on this liquidation report.
                          </p>
                        </div>

                        <div className="flex-1 space-y-3 overflow-y-auto p-4">
                          {groupedLiquidationActivityEntries.length ? (
                            groupedLiquidationActivityEntries.map((group) => (
                              <div key={group.label} className="space-y-2">
                                <p className="font-cascadia text-[13px] font-semibold uppercase leading-[140%] text-[#b3b3b3]">
                                  {group.label}
                                </p>
                                <div className="space-y-0">
                                  {group.entries.map((entry, index) => {
                                    const entryDate = new Date(entry.createdAt);
                                    const isValidEntryDate = !Number.isNaN(entryDate.getTime());
                                    return (
                                      <div key={entry.id} className="relative flex gap-2.5 pb-3 last:pb-0">
                                        {index < group.entries.length - 1 ? (
                                          <span className="absolute left-4 top-8 h-[calc(100%-16px)] w-px -translate-x-1/2 bg-slate-300/40" />
                                        ) : null}
                                        <span className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-info-secondary">
                                          <Clock className="h-4 w-4 text-icon-info-secondary" strokeWidth={1.6} />
                                        </span>
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                          <p className="font-segoe text-[13px] font-normal leading-[120%] text-public-text-neutral-default">
                                            <span className="font-semibold">{entry.adminName}</span> {entry.action}
                                          </p>
                                          <p className="font-segoe text-[11px] font-normal leading-none text-[#b3b3b3]">
                                            {isValidEntryDate ? format(entryDate, "h:mm a") : ""} · {group.label}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="py-6 text-center font-segoe text-sm text-slate-500">No activity recorded yet.</p>
                          )}
                        </div>

                        {hasMoreLiquidationActivityEntries ? (
                          <div className="flex items-center justify-center border-t border-slate-300 p-4">
                            <button
                              type="button"
                              onClick={() => setLiquidationActivityVisibleCount((current) => current + 4)}
                              className="font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand hover:underline"
                            >
                              Load older activity
                            </button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Approved</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{liquidationApprovedCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Request Revision</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{liquidationNeedsRevisionCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Unreviewed</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{liquidationUnreviewedCount}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_376px]">
                <div className="flex flex-col overflow-hidden rounded-md border border-slate-300 bg-admin-surface shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-300 p-4">
                    <p className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                      {selectedLiquidationReportFile?.fileName ?? "No document selected"}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {liquidationFiles.length ? (
                        <div className="flex shrink-0 items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={activeLiquidationReviewIndex <= 0}
                            onClick={() =>
                              setSelectedLiquidationFileId(liquidationFiles[Math.max(0, activeLiquidationReviewIndex - 1)]?.id ?? null)
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {liquidationFiles.slice(0, 5).map((file, index) => (
                              <button
                                key={file.id}
                                type="button"
                                onClick={() => setSelectedLiquidationFileId(file.id)}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md font-segoe text-[13px]",
                                  selectedLiquidationReportFile?.id === file.id
                                    ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                                    : "text-text-default hover:bg-slate-50",
                                )}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={activeLiquidationReviewIndex < 0 || activeLiquidationReviewIndex >= liquidationFiles.length - 1}
                            onClick={() =>
                              setSelectedLiquidationFileId(
                                liquidationFiles[Math.min(liquidationFiles.length - 1, activeLiquidationReviewIndex + 1)]?.id ?? null,
                              )
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            Next
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Download documents"
                        disabled={downloadDialogResolving || !liquidationFiles.length}
                        onClick={() =>
                          void openDownloadDialog(
                            selectedLiquidationReportFile
                              ? { fileName: selectedLiquidationReportFile.fileName, fileUrl: selectedLiquidationReportFile.fileUrl }
                              : null,
                            liquidationFiles.map((file) => ({ fileName: file.fileName, fileUrl: file.fileUrl })),
                            "Liquidation-Report-Documents.zip",
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Download className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[500px] flex-1 items-center justify-center overflow-hidden">
                    {selectedLiquidationReportFile && liquidationPreviewUrl ? (
                      liquidationPreviewCanInline ? (
                        isImagePreviewFile(selectedLiquidationReportFile.fileName) || isImagePreviewFile(liquidationPreviewUrl) ? (
                          <img src={liquidationPreviewUrl} alt={liquidationPreviewTitle} className="h-full w-full object-contain" />
                        ) : (
                          <iframe src={withHiddenPdfToolbar(liquidationPreviewUrl)} title={liquidationPreviewTitle} className="h-full min-h-[500px] w-full border-0" />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-4 text-center font-segoe text-sm text-slate-500">
                          <p>This file cannot be previewed inline.</p>
                          <button
                            type="button"
                            onClick={() => window.open(liquidationPreviewUrl, "_blank", "noopener,noreferrer")}
                            className="flex items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3 py-2 font-segoe text-[13px] text-text-default transition-colors hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.6} />
                            Open File
                          </button>
                        </div>
                      )
                    ) : selectedLiquidationReportFile && liquidationPreviewLoading ? (
                      <p className="font-segoe text-sm text-slate-500">Loading preview…</p>
                    ) : (
                      <div
                        className="flex h-full min-h-[500px] w-full items-center justify-center"
                        style={{ background: "linear-gradient(180deg, #0E2F66 0%, #1A5CA8 100%)" }}
                      >
                        <Megaphone className="h-16 w-16 text-white" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                    <div className="flex flex-col gap-1 border-b border-slate-300 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-segoe text-base font-semibold leading-none text-text-default">Document Queue</p>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedLiquidationReviewFileIds(
                              liquidationFiles.filter((file) => file.adminStatus !== "approved_green").map((file) => file.id),
                            )
                          }
                          className="flex shrink-0 items-center gap-1.5 font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-slate-500" />
                          Select all
                        </button>
                      </div>
                      <p className="font-segoe text-sm font-normal leading-[140%] text-slate-500">
                        Review the organization&rsquo;s submitted liquidation documents and select one to preview.
                      </p>
                    </div>

                    <div className="space-y-0.5 pt-1">
                      {liquidationFiles.length ? (
                        liquidationFiles.map((file) => {
                          const isChecked = selectedLiquidationReviewFileIds.includes(file.id);
                          const isActive = selectedLiquidationReportFile?.id === file.id;
                          const uploadedDate = new Date(file.uploadedAt);
                          const isUploadedDateValid = !Number.isNaN(uploadedDate.getTime());
                          const isLocked = file.adminStatus === "approved_green";

                          return (
                            <div
                              key={file.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedLiquidationFileId(file.id);
                                if (!isLocked) setSelectedLiquidationReviewFileIds([file.id]);
                              }}
                              onKeyDown={(event) => {
                                if (event.key !== "Enter" && event.key !== " ") return;
                                event.preventDefault();
                                setSelectedLiquidationFileId(file.id);
                                if (!isLocked) setSelectedLiquidationReviewFileIds([file.id]);
                              }}
                              className={cn(
                                "flex w-full cursor-pointer items-start gap-2.5 rounded-md p-4 text-left transition-colors",
                                isChecked
                                  ? "border border-border-info-tertiary bg-bg-info-tertiary"
                                  : isActive
                                    ? "border border-transparent bg-slate-50"
                                    : "border border-transparent hover:bg-slate-50",
                              )}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isLocked}
                                onClick={(event) => event.stopPropagation()}
                                onChange={() => {
                                  setSelectedLiquidationReviewFileIds((current) =>
                                    current.includes(file.id) ? current.filter((id) => id !== file.id) : [...current, file.id],
                                  );
                                }}
                                className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                              />
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-start justify-between gap-2">
                                  <p className="line-clamp-2 font-segoe text-sm font-semibold leading-none text-text-default">{file.fileName}</p>
                                  <DocumentQueueStatusPill status={file.adminStatus} />
                                </div>
                                <div className="flex items-center gap-2 pt-1">
                                  <p className="font-segoe text-xs font-normal leading-none text-[#b3b3b3]">
                                    Submitted: {isUploadedDateValid ? format(uploadedDate, "d MMM yyyy") : "N/A"}
                                  </p>
                                  <p className="font-segoe text-xs font-normal leading-none text-[#b3b3b3]">{formatFileSize(file.fileSize)}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="px-2 py-6 text-center font-segoe text-sm text-slate-500">No documents submitted yet.</p>
                      )}
                    </div>
                  </div>

                  {selectedLiquidationReport.goSignalAt ? (
                    <div className="flex items-center gap-2 rounded-md border border-border-success-subtle bg-bg-success-subtle px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-text-positive-strong" strokeWidth={1.6} />
                      <p className="font-segoe text-[13px] font-semibold leading-[140%] text-text-positive-strong">
                        Approved · {format(new Date(selectedLiquidationReport.goSignalAt), "d MMM yyyy")}
                      </p>
                    </div>
                  ) : null}

                  {selectedLiquidationReport.hardCopySubmittedAt ? (
                    <div className="flex items-center gap-2 rounded-md border border-border-success-subtle bg-bg-success-subtle px-4 py-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-text-positive-strong" strokeWidth={1.6} />
                      <p className="font-segoe text-[13px] font-semibold leading-[140%] text-text-positive-strong">
                        Hardcopy Received · {format(new Date(selectedLiquidationReport.hardCopySubmittedAt), "d MMM yyyy")}
                      </p>
                    </div>
                  ) : null}

                  {selectedLiquidationReport.goSignalAt && !selectedLiquidationReport.hardCopySubmittedAt ? (
                    <div className="flex flex-col gap-3 rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                      <p className="font-segoe text-sm font-bold uppercase leading-none text-text-default">Mark Hardcopy Submitted</p>
                      <div className="flex flex-col gap-1.5">
                        <label className="font-segoe text-[13px] text-text-default">Date Received</label>
                        <Popover open={isLiquidationHardcopyDateOpen} onOpenChange={setIsLiquidationHardcopyDateOpen}>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              className="flex h-10 w-full items-center justify-between rounded-md border border-slate-300 bg-admin-surface px-3 font-segoe text-[13px] text-text-default outline-none"
                            >
                              <span className={liquidationHardcopyDateReceived ? "" : "text-text-disabled"}>
                                {liquidationHardcopyDateReceived
                                  ? format(parse(liquidationHardcopyDateReceived, "yyyy-MM-dd", new Date()), "d MMM yyyy")
                                  : "Select date"}
                              </span>
                              <CalendarDays className="h-4 w-4 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                            </button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto rounded-md border-0 border-t border-slate-300 p-4">
                            <Calendar
                              mode="single"
                              selected={
                                liquidationHardcopyDateReceived
                                  ? parse(liquidationHardcopyDateReceived, "yyyy-MM-dd", new Date())
                                  : undefined
                              }
                              onSelect={(date) => {
                                if (date) {
                                  setLiquidationHardcopyDateReceived(format(date, "yyyy-MM-dd"));
                                  setIsLiquidationHardcopyDateOpen(false);
                                }
                              }}
                              components={{ Caption: CalendarCaption }}
                              classNames={{
                                day_selected:
                                  "bg-public-bg-brand text-public-text-neutral-on-neutral hover:bg-public-bg-brand hover:text-public-text-neutral-on-neutral focus:bg-public-bg-brand focus:text-public-text-neutral-on-neutral font-segoe text-public-fs-subheading-sm leading-none text-center",
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <button
                        type="button"
                        disabled={!liquidationHardcopyDateReceived || isMarkingLiquidationHardcopy}
                        onClick={() => void handleMarkHardcopySubmitted()}
                        className="flex h-11 w-full items-center justify-center rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-[0.38]"
                      >
                        {isMarkingLiquidationHardcopy ? "Saving…" : "Confirm"}
                      </button>
                    </div>
                  ) : null}

                  {!selectedLiquidationReport.goSignalAt ? (
                  <>
                  <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                    <div className="relative flex items-center justify-between gap-2 border-b border-slate-300 pb-4">
                      <p className="font-segoe text-lg font-semibold leading-none text-text-default">Review Decision</p>
                      <button
                        type="button"
                        ref={liquidationDecisionHelpTriggerRef}
                        onClick={() => setIsLiquidationDecisionHelpOpen((current) => !current)}
                        aria-label="Review rules"
                        className="flex h-[18px] w-[18px] shrink-0 items-center justify-center text-slate-500 transition-colors hover:text-text-default"
                      >
                        <CircleHelp className="h-[18px] w-[18px]" strokeWidth={1.6} />
                      </button>
                      {isLiquidationDecisionHelpOpen ? (
                        <div
                          ref={liquidationDecisionHelpPanelRef}
                          className="absolute right-0 top-full z-10 mt-2 w-[280px] space-y-1.5 rounded-md border border-slate-300 bg-admin-surface p-4 shadow-lg"
                        >
                          <p className="font-segoe text-xs font-semibold uppercase leading-none text-slate-500">Review Rules</p>
                          <p className="font-segoe text-xs leading-[140%] text-text-default">
                            <span className="font-semibold">Approve</span> — multiple files can be selected.
                          </p>
                          <p className="font-segoe text-xs leading-[140%] text-text-default">
                            <span className="font-semibold">Request Revision / Reject</span> — one file at a time, remarks required.
                          </p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-col gap-2 pt-4">
                      {selectedLiquidationReviewFiles.length === 0 ? (
                        <div className="flex items-start gap-2 rounded-md border border-border-closed-subtle bg-gray-100 px-4 py-3">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-tertiary" strokeWidth={1.6} />
                          <p className="font-segoe text-[13px] leading-[120%] text-neutral-tertiary">No documents selected.</p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-md border border-brand-info-border bg-brand-info-subtle px-4 py-3">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                          <p className="font-segoe text-[13px] leading-[120%] text-public-bg-brand">
                            {selectedLiquidationReviewFiles.length} document{selectedLiquidationReviewFiles.length === 1 ? "" : "s"} selected.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="font-segoe text-[13px] text-text-default">Decision</label>
                        <Select
                          value={liquidationBulkDecision}
                          onValueChange={(value) => setLiquidationBulkDecision(value as BudgetReviewDecision)}
                          disabled={selectedLiquidationReviewFiles.length === 0}
                        >
                          <SelectTrigger className="h-8 border-slate-300 text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approve">Approve</SelectItem>
                            <SelectItem
                              value="needs_revision"
                              disabled={selectedLiquidationReviewFiles.length > 1}
                              className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                            >
                              Request Revision
                            </SelectItem>
                            <SelectItem
                              value="reject"
                              disabled={selectedLiquidationReviewFiles.length > 1}
                              className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                            >
                              Reject
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedLiquidationReviewFiles.length === 1 && liquidationDecisionRequiresRemarkNow ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="font-segoe text-[13px] text-text-default">
                            Remarks <span className="text-destructive">*</span>
                          </label>
                          <Textarea
                            value={liquidationBulkRemark}
                            onChange={(event) => setLiquidationBulkRemark(event.target.value)}
                            placeholder="Explain the reason or required action..."
                            rows={3}
                            className="resize-none text-[13px]"
                          />
                        </div>
                      ) : null}

                      <button
                        type="button"
                        disabled={isLiquidationDecisionConfirmDisabled}
                        onClick={() => setIsLiquidationDecisionConfirmOpen(true)}
                        className="mt-1 flex h-11 w-full items-center justify-center rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-[0.38]"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>

                  <DangerConfirmDialog
                    open={isLiquidationDecisionConfirmOpen}
                    onOpenChange={setIsLiquidationDecisionConfirmOpen}
                    icon={CheckCircle}
                    variant="info"
                    title="Confirm Review Decision"
                    description="Review your decisions and remarks before submitting. These will be applied to the files below and shown to the organization in their portal."
                    content={
                      <div className="rounded-md border border-slate-300 bg-admin-surface p-6">
                        <div className="grid grid-cols-3 gap-2 border-b border-slate-300 pb-2">
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Document</p>
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Decision</p>
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Remarks</p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                          {selectedLiquidationReviewFiles.map((file) => (
                            <div key={file.id} className="grid grid-cols-3 gap-2">
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">{file.fileName}</p>
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                                {budgetReviewDecisionLabel[liquidationBulkDecision]}
                              </p>
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                                {selectedLiquidationReviewFiles.length === 1 && liquidationDecisionRequiresRemarkNow
                                  ? liquidationBulkRemark.trim() || "—"
                                  : "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                    warning="Once submitted, these decisions cannot be changed from this review."
                    cancelLabel="Cancel"
                    confirmLabel="Submit Review"
                    confirmIcon={Send}
                    onConfirm={submitLiquidationReviewDecisions}
                  />
                  </>
                  ) : null}
                </div>
              </div>
            </div>
          );
        }
        {
          const liquidationOrganizationsById = Object.fromEntries(state.organizationProfiles.map((org) => [org.id, org]));
          const liquidationBudgetRequestsById = Object.fromEntries(state.budgetRequests.map((request) => [request.id, request]));
          const submittedLiquidationCount = visibleLiquidationReports.filter((r) => r.status === "submitted").length;
          const todayDateString = new Date().toDateString();
          const submittedTodayCount = visibleLiquidationReports.filter(
            (r) => r.status === "submitted" && new Date(r.createdAt).toDateString() === todayDateString,
          ).length;
          const pendingReviewLiquidationCount = visibleLiquidationReports.filter(
            (r) => r.status === "submitted" || r.status === "under_review",
          ).length;
          const overdueLiquidationCount = visibleLiquidationReports.filter((r) => r.status === "overdue").length;

          return (
            <div className="space-y-4">
              <AdminPageHeader
                title="Liquidation Reports"
                description="Review financial accountability documents for released funds."
              />

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <StatsCard
                  title="SUBMITTED"
                  value={submittedLiquidationCount}
                  icon={Send}
                  trendLabel={submittedTodayCount ? `+${submittedTodayCount} received today` : undefined}
                  description="New submissions awaiting review."
                />
                <StatsCard
                  title="PENDING REVIEW"
                  value={pendingReviewLiquidationCount}
                  icon={Clock}
                  description="Submissions being evaluated."
                />
                <StatsCard
                  title="OVERDUE"
                  value={overdueLiquidationCount}
                  icon={AlertTriangle}
                  description="Liquidation reports past their deadline."
                />
              </div>

              <LiquidationReportsTable
                reports={filteredVisibleLiquidationReports}
                allReports={visibleLiquidationReports}
                organizationsById={liquidationOrganizationsById}
                budgetRequestsById={liquidationBudgetRequestsById}
                allBudgetRequests={state.budgetRequests}
                searchValue={liquidationReportsSearch}
                onSearchChange={setLiquidationReportsSearch}
                statusFilter={liquidationReportsStatusFilter}
                onStatusFilterChange={setLiquidationReportsStatusFilter}
                districtFilter={liquidationReportsDistrictFilter}
                onDistrictFilterChange={setLiquidationReportsDistrictFilter}
                barangayFilter={liquidationReportsBarangayFilter}
                onBarangayFilterChange={setLiquidationReportsBarangayFilter}
                classificationFilter={liquidationReportsClassificationFilter}
                onClassificationFilterChange={setLiquidationReportsClassificationFilter}
                onReview={(reportId) => {
                  const report = state.liquidationReports.find((item) => item.id === reportId);
                  if (report) openLiquidationDetails(report);
                }}
                onOpenLinkedRequest={(requestId) => openBudgetRequestDetails(requestId)}
              />
            </div>
          );
        }
      case "news-releases":
        return (
          <div className="space-y-3 lg:space-y-5">
            <AdminPageHeader
              title="News Releases"
              description="Create and publish announcements visible to all organizations on the portal's news feed."
              action={
                <button
                  type="button"
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
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                >
                  <Plus className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                  Add News
                </button>
              }
            />
            <NewsReleasesTable
              newsReleases={filteredNewsReleases}
              searchValue={newsSearch}
              onSearchChange={setNewsSearch}
              statusFilter={newsVisibilityFilter}
              onStatusFilterChange={setNewsVisibilityFilter}
              categoryFilter={newsCategoryFilter}
              onCategoryFilterChange={setNewsCategoryFilter}
              categoryOptions={newsCategoryOptions}
              viewMode={newsViewMode}
              onViewModeChange={setNewsViewMode}
              onEdit={(news) => startEditingNewsRelease(news.id)}
              onTogglePublish={(news) => {
                const nextStatus = news.visibilityStatus === "published" ? "hidden" : "published";
                setPendingNewsVisibilityConfirmation({
                  title: news.title,
                  nextStatus,
                  onConfirm: () => applyNewsVisibilityChange(news.id, nextStatus),
                });
              }}
              onDelete={(news) => void handleDeleteNewsRelease(news.id)}
            />
            <NewsReleaseFormDialog
              mode={newsModalMode}
              title={newsTitleDraft}
              onTitleChange={setNewsTitleDraft}
              description={newsDescriptionDraft}
              onDescriptionChange={setNewsDescriptionDraft}
              category={newsCategoryDraft}
              onCategoryChange={setNewsCategoryDraft}
              facebookPostUrl={newsFacebookPostUrlDraft}
              onFacebookPostUrlChange={setNewsFacebookPostUrlDraft}
              previewImageUrl={newsPreviewImageUrlDraft}
              onPreviewImageUrlChange={setNewsPreviewImageUrlDraft}
              previewImageFile={newsPreviewImageFileDraft}
              onPreviewImageFileChange={setNewsPreviewImageFileDraft}
              datePosted={newsDatePostedDraft}
              onDatePostedChange={setNewsDatePostedDraft}
              visibility={newsVisibilityDraft}
              onVisibilityChange={setNewsVisibilityDraft}
              saving={savingNewsRelease}
              onCancel={resetNewsReleaseForm}
              onSave={() => {
                const currentStatus = editingNewsReleaseId
                  ? newsReleases.find((entry) => entry.id === editingNewsReleaseId)?.visibilityStatus
                  : undefined;
                if (
                  newsModalMode === "edit" &&
                  currentStatus &&
                  newsVisibilityDraft !== currentStatus &&
                  (newsVisibilityDraft === "published" || newsVisibilityDraft === "hidden")
                ) {
                  setPendingNewsVisibilityConfirmation({
                    title: newsTitleDraft,
                    nextStatus: newsVisibilityDraft,
                    onConfirm: () => handleSaveNewsRelease(),
                  });
                  return;
                }
                void handleSaveNewsRelease();
              }}
            />
          </div>
        );
      case "budget-monitoring":
      case "public-transparency-posts": {
        const totalFYBudget = annualAllocation ?? 0;
        const releasedBudget = budgetMonitoringAnalysis.totalReleased;
        const liquidatedBudget = totalLiquidated;
        const approvedBudget = budgetApprovedTotal;
        const pendingDisbursement = Math.max(approvedBudget - releasedBudget, 0);
        const activeInField = Math.max(releasedBudget - liquidatedBudget, 0);
        const remainingHeadroom = Math.max(totalFYBudget - releasedBudget, 0);
        const percentClearedOfReleased = releasedBudget > 0 ? Math.round((liquidatedBudget / releasedBudget) * 100) : 0;
        const percentAvailable = totalFYBudget > 0 ? ((remainingHeadroom / totalFYBudget) * 100).toFixed(1) : "0.0";
        const utilizationBarTotal = Math.max(totalFYBudget, releasedBudget);
        const rawLiquidatedPct = utilizationBarTotal > 0 ? (liquidatedBudget / utilizationBarTotal) * 100 : 0;
        const liquidatedPct = liquidatedBudget > 0 ? Math.min(Math.max(rawLiquidatedPct, 1), 100) : 0;
        const rawActiveInFieldPct = utilizationBarTotal > 0 ? (activeInField / utilizationBarTotal) * 100 : 0;
        const activeInFieldPct =
          activeInField > 0 ? Math.min(Math.max(rawActiveInFieldPct, 1), 100 - liquidatedPct) : 0;
        const remainingPct = Math.max(100 - liquidatedPct - activeInFieldPct, 0);

        const purposeColors = ["#3F81EA", "#62B4F5"];
        const categorizedTotal = purposeCategoryBreakdown.reduce((sum, entry) => sum + entry.amount, 0);
        const unallocatedAmount = Math.max(totalFYBudget - categorizedTotal, 0);
        const donutData =
          totalFYBudget > 0
            ? [
                ...purposeCategoryBreakdown.map((entry, index) => ({
                  name: entry.category,
                  value: entry.amount,
                  color: purposeColors[index % purposeColors.length],
                })),
                ...(unallocatedAmount > 0 ? [{ name: "Unallocated", value: unallocatedAmount, color: "#E3E3E3" }] : []),
              ]
            : [{ name: "Default", value: 1, color: "#62B4F5" }];

        const budgetSnapshotSections = (
          <>
                  <div className="rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-segoe text-[11px] font-semibold leading-[140%] text-slate-500">
                        Budget Utilization Progress
                      </p>
                      <p className="font-segoe text-[11px] font-semibold leading-[140%] text-slate-500">
                        Total FY Allocation:{" "}
                        <span className="font-cascadia">{formatPesoAmount(totalFYBudget)}</span>
                      </p>
                    </div>

                    <div className="mt-3 flex h-2 w-full overflow-hidden rounded-full bg-bg-progress-track">
                      <div className="h-full bg-bg-success-default" style={{ width: `${liquidatedPct}%` }} />
                      <div className="h-full bg-public-bg-brand" style={{ width: `${activeInFieldPct}%` }} />
                      <div className="h-full bg-[#B8DFFD]" style={{ width: `${remainingPct}%` }} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1.5 font-segoe text-[11px] font-semibold leading-none text-text-default">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-bg-success-default" />
                          Liquidated &amp; Cleared:{" "}
                          <span className="font-cascadia text-bg-success-default">{formatPesoAmount(liquidatedBudget)}</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-segoe text-[11px] font-semibold leading-none text-text-default">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-public-bg-brand" />
                          Active in Field:{" "}
                          <span className="font-cascadia">{formatPesoAmount(activeInField)}</span>
                        </span>
                        <span className="flex items-center gap-1.5 font-segoe text-[11px] font-semibold leading-none text-text-default">
                          <span className="h-2 w-2 shrink-0 rounded-full bg-[#B8DFFD]" />
                          Remaining Headroom:{" "}
                          <span className="font-cascadia">{formatPesoAmount(remainingHeadroom)}</span>
                        </span>
                      </div>
                      <p className="font-segoe text-[11px] font-semibold leading-none text-slate-500">
                        {percentAvailable}% Available for New YPOP Grants
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="font-segoe text-[11px] font-semibold leading-[140%] text-slate-500">Budget Lifecycle Progression</p>
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                      <div className="flex h-full flex-col gap-2 rounded-md border border-slate-300 bg-slate-50 p-4">
                        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Total FY Budget</p>
                        <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
                          {formatPesoAmount(totalFYBudget)}
                        </p>
                        <p className="font-segoe text-xs font-normal leading-[140%] text-slate-500">Total annual allocation</p>
                        <div className="mt-auto flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-3 py-2">
                          <p className="whitespace-nowrap font-segoe text-[10px] font-normal leading-[140%] text-slate-500">100% Statutory Baseline</p>
                        </div>
                      </div>

                      <div className="flex h-full flex-col gap-2 rounded-md border border-[#C0D4F5] bg-[#F1F6FD] p-4">
                        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Approved Budget</p>
                        <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-border-info-tertiary">
                          {formatPesoAmount(approvedBudget)}
                        </p>
                        <p className="font-segoe text-xs font-normal leading-[140%] text-slate-500">Approved by administrators</p>
                        <div className="mt-auto flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-3 py-2">
                          <p className="whitespace-nowrap font-cascadia text-[10px] font-semibold text-text-default">{formatPesoAmount(pendingDisbursement)}</p>
                          <p className="whitespace-nowrap font-segoe text-[10px] font-normal leading-[140%] text-slate-500">Pending Disbursement</p>
                        </div>
                      </div>

                      <div className="flex h-full flex-col gap-2 rounded-md border border-cyan-200 bg-cyan-50 p-4">
                        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Released Budget</p>
                        <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-cyan-700">
                          {formatPesoAmount(releasedBudget)}
                        </p>
                        <p className="font-segoe text-xs font-normal leading-[140%] text-slate-500">Disbursed to organizations</p>
                        <div className="mt-auto flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-3 py-2">
                          <p className="whitespace-nowrap font-cascadia text-[10px] font-semibold text-text-default">{formatPesoAmount(activeInField)}</p>
                          <p className="whitespace-nowrap font-segoe text-[10px] font-normal leading-[140%] text-slate-500">Active in Field</p>
                        </div>
                      </div>

                      <div className="flex h-full flex-col gap-2 rounded-md border border-[#AFF4C6] bg-[#EBFFEE] p-4">
                        <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Liquidated Budget</p>
                        <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-[#02542D]">
                          {formatPesoAmount(liquidatedBudget)}
                        </p>
                        <p className="font-segoe text-xs font-normal leading-[140%] text-slate-500">Audited with official receipts</p>
                        <div className="mt-auto flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-3 py-2">
                          <p className="whitespace-nowrap font-segoe text-[10px] font-semibold text-[#02542D]">{percentClearedOfReleased}% of Released</p>
                          <p className="whitespace-nowrap font-segoe text-[10px] font-normal leading-[140%] text-slate-500">Cleared</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-300 pt-5">
                    <div className="border-b border-slate-300 pb-5">
                      <p className="font-segoe text-lg font-semibold leading-none text-text-default">Budget Allocation Breakdown</p>
                      <p className="mt-1 font-segoe text-[13px] font-normal leading-none text-slate-500">
                        How this fiscal year's {formatPesoAmount(totalFYBudget)} total is divided, by purpose — independent of how much has been spent so far.
                      </p>
                    </div>

                    {purposeCategoryBreakdown.length ? (
                      <div className="flex flex-col gap-8 pt-8 lg:flex-row lg:items-center">
                        <div className="relative h-[247px] w-[247px] shrink-0">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie data={donutData} dataKey="value" innerRadius={85} outerRadius={123} paddingAngle={donutData.length > 1 ? 2 : 0} stroke="none">
                                {donutData.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                            <p className="font-cascadia text-[29px] font-semibold leading-none text-public-text-brand">
                              {formatCompactPeso(totalFYBudget)}
                            </p>
                            <p className="mt-1 font-segoe text-xs font-normal text-slate-500">
                              Total FY {annualAllocationFiscalYear ?? "—"}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col gap-3">
                          {purposeCategoryBreakdown.map((entry, index) => {
                            const pct = totalFYBudget > 0 ? Math.round((entry.amount / totalFYBudget) * 100) : 0;
                            const color = purposeColors[index % purposeColors.length];
                            return (
                              <div
                                key={entry.category}
                                className="flex items-center justify-between gap-3 rounded-md border border-slate-300 bg-admin-surface p-4"
                              >
                                <div className="flex items-center gap-2.5">
                                  <span className="h-4 w-4 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                                  <p className="font-segoe text-[13px] font-semibold leading-[140%] text-public-text-neutral-default">
                                    {entry.category}
                                  </p>
                                </div>
                                <div className="flex flex-col items-end">
                                  <p className="font-cascadia text-[13px] font-semibold text-text-default">{formatPesoAmount(entry.amount)}</p>
                                  <p className="font-segoe text-[11px] font-normal text-slate-500">{pct}%</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="pt-8 font-segoe text-sm text-slate-500">No approved budget requests yet to break down by purpose.</p>
                    )}
                  </div>
          </>
        );

        return (
          <div className="space-y-4">
            {isConfiguringPublicSnapshot ? (
              <PublicBudgetSnapshotConfigPage onBack={() => setIsConfiguringPublicSnapshot(false)} />
            ) : (
              <>
            {!selectedBudgetAllocation ? (
              <>
            <AdminPageHeader
              title="Budget Monitoring"
              description="Track budgets from request through liquidation."
              action={
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!budgetRequestExportRows.length}
                    onClick={() => setActiveReportExport("budget-requests")}
                    className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate("/admin/budget-utilization")}
                    className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                  >
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                    Review Budget Requests
                  </button>
                </div>
              }
            />

            <div className="flex h-[52px] w-fit items-center gap-0 rounded-md border border-segmented-control-border bg-segmented-control-bg p-1 shadow-sm">
              {(["overview", "barangay-allocation", "public"] as const).map((tab) => {
                const isActive = budgetMonitoringTab === tab;
                const Icon = tab === "overview" ? PieChartIcon : tab === "barangay-allocation" ? MapPin : Globe;
                const label = tab === "overview" ? "Overview" : tab === "barangay-allocation" ? "Allocation by Barangay" : "Public";
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setBudgetMonitoringTab(tab)}
                    className={cn(
                      "flex h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-4 py-3 font-segoe text-sm font-semibold leading-[140%] transition-colors",
                      isActive ? "bg-admin-surface text-public-text-brand" : "text-segmented-control-inactive-text",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                    {label}
                  </button>
                );
              })}
            </div>
              </>
            ) : null}

            {budgetMonitoringTab === "overview" ? (
              <>
              <div className="rounded-md border border-slate-300 bg-admin-surface">
                <div className="flex items-center justify-between gap-3 border-b border-slate-300 px-6 py-5">
                  <div className="flex flex-col gap-1">
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">Budget Snapshot</p>
                    <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                      Budget allocation, release progression, and audit clearance.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="flex h-10 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                  >
                    FY 2026
                    <ChevronDown className="h-4 w-4 text-[#b3b3b3]" strokeWidth={1.6} />
                  </button>
                </div>

                <div className="space-y-5 p-6">{budgetSnapshotSections}</div>
              </div>

              <OrganizationFundingTable
                rows={organizationFundingRows}
                searchValue={organizationFundingSearch}
                onSearchChange={setOrganizationFundingSearch}
                classificationFilter={organizationFundingClassificationFilter}
                onClassificationFilterChange={setOrganizationFundingClassificationFilter}
                onView={(organizationId) => setSelectedOrganizationBudgetDetailId(organizationId)}
              />
              </>
            ) : budgetMonitoringTab === "barangay-allocation" ? (
              selectedBudgetAllocation ? (
                <div className="space-y-4">
                  <button
                    type="button"
                    onClick={() => setSelectedBudgetAllocation(null)}
                    className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                  >
                    <ArrowLeft className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                    Back to Allocation
                  </button>

                  <div className="flex items-center gap-2 rounded-md border border-slate-300 bg-admin-surface p-4">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-public-bg-brand">
                      <Building2 className="h-5 w-5 text-white" strokeWidth={1.33} />
                    </div>
                    <h1 className="font-segoe text-lg font-semibold leading-none text-text-default">
                      Barangay {selectedBudgetAllocation.barangay}
                    </h1>
                  </div>

                  <OrganizationFundingTable
                    rows={organizationFundingRows.filter((row) => row.barangay === selectedBudgetAllocation.barangay)}
                    searchValue={barangayDetailSearch}
                    onSearchChange={setBarangayDetailSearch}
                    classificationFilter={barangayDetailClassificationFilter}
                    onClassificationFilterChange={setBarangayDetailClassificationFilter}
                    onView={(organizationId) => setSelectedOrganizationBudgetDetailId(organizationId)}
                  />
                </div>
              ) : (
              <>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <StatsCard
                  title="TOTAL RELEASED"
                  value={formatPesoAmount(budgetAllocationSummary.totalReleased)}
                  icon={Banknote}
                  description="Cash released to organizations in this selection."
                />
                <StatsCard
                  title="TOTAL LIQUIDATED"
                  value={formatPesoAmount(budgetAllocationSummary.totalLiquidated)}
                  icon={CheckCircle2}
                  description="Released budgets audited and cleared."
                />
                <StatsCard
                  title="UTILIZATION RATE"
                  value={`${budgetAllocationSummary.liquidationUtilizationRate}%`}
                  icon={TrendingUp}
                  description="Share of released budgets already liquidated."
                />
              </div>

              <div className="rounded-md border border-slate-300 bg-admin-surface shadow-sm">
                <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
                  <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
                    <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                    <input
                      value={budgetAllocationSearch}
                      onChange={(event) => setBudgetAllocationSearch(event.target.value)}
                      placeholder="Search by district or barangay..."
                      className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
                    />
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-10 w-[156px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
                      >
                        <span className="truncate">{budgetAllocationDistrictFilter === "all" ? "All districts" : budgetAllocationDistrictFilter}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[180px] rounded-b-md rounded-t-none border-slate-300 p-0">
                      <DropdownMenuItem
                        onClick={() => {
                          setBudgetAllocationDistrictFilter("all");
                          setBudgetAllocationBarangayFilter("all");
                        }}
                        className={cn(
                          "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                          budgetAllocationDistrictFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
                        )}
                      >
                        All districts
                      </DropdownMenuItem>
                      {budgetAllocationDistrictOptions.map((district) => (
                        <DropdownMenuItem
                          key={district}
                          onClick={() => {
                            setBudgetAllocationDistrictFilter(district);
                            setBudgetAllocationBarangayFilter("all");
                          }}
                          className={cn(
                            "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                            budgetAllocationDistrictFilter === district && "bg-bg-info-tertiary text-public-text-brand",
                          )}
                        >
                          {district}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="flex h-10 w-[180px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
                      >
                        <span className="truncate">{budgetAllocationBarangayFilter === "all" ? "All barangays" : budgetAllocationBarangayFilter}</span>
                        <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-[220px] rounded-b-md rounded-t-none border-slate-300 p-0">
                      <DropdownMenuItem
                        onClick={() => setBudgetAllocationBarangayFilter("all")}
                        className={cn(
                          "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                          budgetAllocationBarangayFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
                        )}
                      >
                        All barangays
                      </DropdownMenuItem>
                      {budgetAllocationBarangayOptions.map((barangay) => (
                        <DropdownMenuItem
                          key={barangay}
                          onClick={() => setBudgetAllocationBarangayFilter(barangay)}
                          className={cn(
                            "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                            budgetAllocationBarangayFilter === barangay && "bg-bg-info-tertiary text-public-text-brand",
                          )}
                        >
                          {barangay}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
                  <span className="w-[22%]">Barangay</span>
                  <span className="w-[15%]">Released</span>
                  <span className="w-[15%]">Liquidated</span>
                  <span className="w-[15%]">Remaining</span>
                  <span className="w-[23%]">Utilization</span>
                  <span className="w-[90px] shrink-0">Actions</span>
                </div>

                {groupedPagedBudgetAllocationRows.length === 0 ? (
                  <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
                    <p className="font-segoe text-sm font-semibold text-text-default">No matching barangays</p>
                    <p className="font-segoe text-xs text-slate-500">Try adjusting the search, district, or barangay filters.</p>
                  </div>
                ) : (
                  groupedPagedBudgetAllocationRows.map((group) => {
                    const isCollapsed = collapsedAllocationDistricts.includes(group.district);
                    return (
                      <div key={group.district} className="border-b border-slate-300 last:border-b-0">
                        <div className="flex items-center justify-between gap-2 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <p className="font-segoe text-xs font-semibold uppercase leading-none text-text-default">{group.district}</p>
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 px-1.5 py-0.5 font-segoe text-[10px] font-semibold leading-[140%] text-slate-500">
                              {group.rows.length} barangay{group.rows.length === 1 ? "" : "s"} · {group.organizationCount} org{group.organizationCount === 1 ? "" : "s"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setCollapsedAllocationDistricts((current) =>
                                current.includes(group.district) ? current.filter((d) => d !== group.district) : [...current, group.district],
                              )
                            }
                            className="flex shrink-0 items-center gap-1.5"
                          >
                            <span className="font-segoe text-[11px] font-semibold leading-none text-slate-500">
                              {isCollapsed ? "Expand Details" : "Collapse Details"}
                            </span>
                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50">
                              <ChevronDown className={cn("h-4 w-4 text-text-default transition-transform", isCollapsed && "-rotate-180")} strokeWidth={1.6} />
                            </span>
                          </button>
                        </div>

                        {!isCollapsed
                          ? group.rows.map((entry) => {
                              const remaining = Math.max(entry.releasedAmount - entry.liquidatedAmount, 0);
                              const rowUtilization = entry.releasedAmount > 0 ? Math.round((entry.liquidatedAmount / entry.releasedAmount) * 100) : 0;
                              return (
                                <div
                                  key={`${entry.district}-${entry.barangay}`}
                                  className="flex items-center justify-between gap-2 border-t border-slate-300 p-4 transition-colors hover:bg-slate-50"
                                >
                                  <div className="flex w-[22%] min-w-0 items-center gap-2">
                                    <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">Brgy. {entry.barangay}</p>
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded border border-border-tertiary-200 bg-public-bg-tertiary-100 px-2 py-1.5 font-segoe text-xs font-semibold leading-[140%] text-text-tertiary-800">
                                      {entry.organizationCount} org{entry.organizationCount === 1 ? "" : "s"}
                                    </span>
                                  </div>
                                  <div className="flex w-[15%] items-center">
                                    <p className="font-cascadia text-sm font-semibold text-text-default">{formatPesoAmount(entry.releasedAmount)}</p>
                                  </div>
                                  <div className="flex w-[15%] items-center">
                                    <p className="font-cascadia text-sm font-semibold text-text-default">{formatPesoAmount(entry.liquidatedAmount)}</p>
                                  </div>
                                  <div className="flex w-[15%] items-center">
                                    <p className="font-cascadia text-sm font-semibold text-text-default">{formatPesoAmount(remaining)}</p>
                                  </div>
                                  <div className="flex w-[23%] items-center gap-2">
                                    <div className="h-2 w-full max-w-[140px] overflow-hidden rounded-full bg-bg-progress-track">
                                      <div className="h-full rounded-full bg-bg-success-default transition-all" style={{ width: `${Math.min(rowUtilization, 100)}%` }} />
                                    </div>
                                    <span className="shrink-0 font-segoe text-xs font-semibold text-text-default">{rowUtilization}%</span>
                                  </div>
                                  <div className="flex w-[90px] shrink-0 items-center">
                                    <button
                                      type="button"
                                      onClick={() => setSelectedBudgetAllocation(entry)}
                                      className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-public-bg-brand px-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                                    >
                                      <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                                      View
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          : null}
                      </div>
                    );
                  })
                )}

                <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
                  <p className="font-segoe text-[13px] text-text-neutral-tertiary">
                    Showing <span className="text-text-default">{pagedBudgetAllocationRows.length}</span> of{" "}
                    <span className="text-text-default">{filteredBudgetAllocationRows.length}</span> records
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setBudgetAllocationMobilePage((page) => Math.max(1, page - 1))}
                      disabled={budgetAllocationMobilePage === 1}
                      className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-neutral-tertiary disabled:opacity-50"
                    >
                      <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
                      Previous
                    </button>
                    <div className="flex items-center gap-2">
                      {Array.from({ length: budgetAllocationMobilePageCount }, (_, index) => index)
                        .slice(0, 5)
                        .map((index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => setBudgetAllocationMobilePage(index + 1)}
                            className={cn(
                              "flex h-[29px] w-8 items-center justify-center rounded-lg font-segoe text-[13px]",
                              index + 1 === budgetAllocationMobilePage
                                ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                                : "text-text-default hover:bg-slate-50",
                            )}
                          >
                            {index + 1}
                          </button>
                        ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setBudgetAllocationMobilePage((page) => Math.min(budgetAllocationMobilePageCount, page + 1))}
                      disabled={budgetAllocationMobilePage >= budgetAllocationMobilePageCount}
                      className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-default disabled:opacity-50"
                    >
                      Next
                      <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
                    </button>
                  </div>
                </div>
              </div>
              </>
              )
            ) : budgetMonitoringTab === "public" ? (
              <div className="rounded-md border border-slate-300 bg-admin-surface">
                <div className="flex items-center justify-between gap-3 border-b border-slate-300 px-6 py-5">
                  <div className="flex flex-col gap-1">
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">Budget Snapshot</p>
                    <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
                      Budget allocation, release progression, and audit clearance.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfiguringPublicSnapshot(true)}
                      className="flex h-10 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-text-info-strong bg-bg-info-tertiary px-4 py-2 font-segoe text-public-fs-body-sm font-normal text-text-info-strong transition-colors hover:bg-bg-info-secondary"
                    >
                      <Settings className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                      Configure
                    </button>
                    <button
                      type="button"
                      className="flex h-10 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                    >
                      FY 2026
                      <ChevronDown className="h-4 w-4 text-[#b3b3b3]" strokeWidth={1.6} />
                    </button>
                  </div>
                </div>

                <div className="space-y-5 p-6">
                  <div className="flex items-start gap-2 rounded-md border border-brand-info-border bg-brand-info-subtle px-4 py-3">
                    <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                    <p className="font-segoe text-[13px] font-normal leading-[120%] text-public-text-brand">
                      <span className="font-bold">This is what visitors see</span> on the Public Portal&rsquo;s Budget Monitoring page.
                    </p>
                  </div>
                  {budgetSnapshotSections}
                </div>
              </div>
            ) : null}
              </>
            )}

            <OrganizationBudgetDrawer
              detail={organizationBudgetDetail}
              onOpenChange={(open) => {
                if (!open) setSelectedOrganizationBudgetDetailId(null);
              }}
              onReviewRequest={(requestId) => {
                setSelectedOrganizationBudgetDetailId(null);
                openBudgetRequestDetails(requestId);
              }}
            />
          </div>
        );
      }
      case "templates":
        return (
          <div className="flex flex-col gap-4">
            <AdminPageHeader
              title="Forms & Templates"
              description="Manage forms and templates published to the Organization Portal."
              action={
                <button
                  type="button"
                  onClick={() => {
                    setTemplateModalMode("create");
                    setEditingTemplateId(null);
                    setTemplateNameDraft("");
                    setTemplateDescriptionDraft("");
                    setTemplateScopeDraft("document_submission");
                    setTemplateFileDraft(null);
                    setTemplateCategoryDraft("");
                  }}
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                >
                  <Upload className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                  Upload File
                </button>
              }
            />
            <TemplatesTable
              templates={filteredTemplates}
              categoryOptions={templateCategoryOptions}
              searchValue={templateSearch}
              onSearchChange={setTemplateSearch}
              statusFilter={templateStatusFilter}
              onStatusFilterChange={setTemplateStatusFilter}
              categoryFilter={templateCategoryFilter}
              onCategoryFilterChange={setTemplateCategoryFilter}
              onPreview={(template) => setPreviewTemplate(template)}
              onEdit={(template) => startEditingTemplate(template.id)}
              onArchive={(template) => setPendingArchiveTemplate(template)}
              onRestore={(template) => setPendingRestoreTemplate(template)}
              onDelete={(template) => setPendingDeleteTemplate(template)}
            />
            <TemplateFormDialog
              mode={templateModalMode === "create" || templateModalMode === "edit" ? templateModalMode : null}
              name={templateNameDraft}
              onNameChange={setTemplateNameDraft}
              description={templateDescriptionDraft}
              onDescriptionChange={setTemplateDescriptionDraft}
              category={templateCategoryDraft}
              onCategoryChange={setTemplateCategoryDraft}
              file={templateFileDraft}
              onFileChange={setTemplateFileDraft}
              existingFileName={selectedTemplate?.templateFileName}
              existingFileSize={selectedTemplate?.templateFileSize}
              saving={savingTemplate || uploadingTemplateId !== null}
              onCancel={resetTemplateForm}
              onSave={() => void (templateModalMode === "edit" ? handleUpdateTemplate() : handleCreateTemplate())}
            />
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
            <DangerConfirmDialog
              variant="info"
              open={Boolean(pendingArchiveTemplate)}
              onOpenChange={(open) => {
                if (!open) setPendingArchiveTemplate(null);
              }}
              icon={Archive}
              title="Archive File"
              description={
                <>
                  <span className="text-slate-500">Are you sure you want to archive </span>
                  <span className="font-semibold text-text-default">{pendingArchiveTemplate?.name ?? ""}</span>
                  <span className="text-slate-500">?</span>
                </>
              }
              warning={
                <>
                  This file will be removed from the active <span className="font-semibold">Forms &amp; Templates</span> list
                  available to users. You can restore it at any time.
                </>
              }
              confirmLabel="Confirm Archive"
              confirmIcon={Archive}
              onConfirm={() => {
                if (pendingArchiveTemplate) void handleDeleteTemplate(pendingArchiveTemplate.id);
                setPendingArchiveTemplate(null);
              }}
            />
            <DangerConfirmDialog
              open={Boolean(pendingDeleteTemplate)}
              onOpenChange={(open) => {
                if (!open) setPendingDeleteTemplate(null);
              }}
              icon={Trash2}
              title="Delete File"
              description={
                <>
                  <span className="text-slate-500">Are you sure you want to delete </span>
                  <span className="font-semibold text-text-default">{pendingDeleteTemplate?.name ?? ""}</span>
                  <span className="text-slate-500">?</span>
                </>
              }
              warning={
                <>
                  This file will be permanently removed from the <span className="font-semibold">Forms &amp; Templates</span>{" "}
                  list available to users and cannot be recovered.
                </>
              }
              warningTone="danger"
              confirmLabel="Delete File"
              confirmIcon={Trash2}
              onConfirm={() => {
                if (pendingDeleteTemplate) void handlePermanentlyDeleteTemplate(pendingDeleteTemplate.id);
                setPendingDeleteTemplate(null);
              }}
            />
            <DangerConfirmDialog
              variant="info"
              open={Boolean(pendingRestoreTemplate)}
              onOpenChange={(open) => {
                if (!open) setPendingRestoreTemplate(null);
              }}
              icon={Archive}
              title="Restore File"
              description={
                <>
                  <span className="text-slate-500">Are you sure you want to restore </span>
                  <span className="font-semibold text-text-default">{pendingRestoreTemplate?.name ?? ""}</span>
                  <span className="text-slate-500">?</span>
                </>
              }
              warning={
                <>
                  This file will be restored to the active <span className="font-semibold">Forms &amp; Templates</span> list
                  and made available to users again.
                </>
              }
              confirmLabel="Confirm Restore"
              confirmIcon={Archive}
              onConfirm={() => {
                if (pendingRestoreTemplate) void handleRestoreTemplate(pendingRestoreTemplate.id);
                setPendingRestoreTemplate(null);
              }}
            />
            <TemplateFilePreviewDialog
              open={Boolean(previewTemplate)}
              onOpenChange={(open) => {
                if (!open) setPreviewTemplate(null);
              }}
              template={previewTemplate}
            />
          </div>
        );
      case "administrators":
        return (
          <div className="flex flex-col gap-4">
            <AdminPageHeader
              title="Administrators"
              description="Manage administrator accounts, roles, and permissions."
              action={
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    disabled={!filteredAdministrators.length}
                    onClick={() => setAdministratorsExportDialogOpen(true)}
                    className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50 disabled:opacity-50"
                  >
                    <Download className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                    Export
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetAdministratorForm();
                      setAdministratorModalMode("create");
                    }}
                    className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                  >
                    <UserPlus className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                    Add Administrator
                  </button>
                </div>
              }
            />

            <div className="flex h-[52px] w-fit items-center gap-1 rounded-md border border-segmented-control-border bg-segmented-control-bg p-1">
              <button
                type="button"
                onClick={() => setAdministratorsViewTab("accounts")}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 font-segoe text-sm font-semibold leading-none transition-colors",
                  administratorsViewTab === "accounts"
                    ? "bg-admin-surface text-public-bg-brand"
                    : "text-segmented-control-inactive-text",
                )}
              >
                <Users className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                Accounts
              </button>
              <button
                type="button"
                onClick={() => setAdministratorsViewTab("roles-permissions")}
                className={cn(
                  "flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-md px-4 font-segoe text-sm font-semibold leading-none transition-colors",
                  administratorsViewTab === "roles-permissions"
                    ? "bg-admin-surface text-public-bg-brand"
                    : "text-segmented-control-inactive-text",
                )}
              >
                <Shield className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                Roles and Permissions
              </button>
            </div>

            {administratorsViewTab === "roles-permissions" ? (
              <RolesPermissionsPanel
                administrators={administrators}
                roles={administratorRoles}
                onUpdateRolePermissions={handleUpdateRolePermissions}
                configuringRoleCode={configuringRoleCode}
                onConfiguringRoleChange={setConfiguringRoleCode}
                subTab={rolesPermissionsSubTab}
                onSubTabChange={setRolesPermissionsSubTab}
              />
            ) : administratorsLoading && administrators.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-md border border-slate-300 bg-admin-surface px-4 py-20 text-center shadow-sm">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-public-bg-section border-t-public-text-brand" />
              </div>
            ) : (
              <AdministratorsTable
                administrators={filteredAdministrators}
                roleOptions={administratorRoles.map((role) => ({ code: role.code, label: role.label }))}
                unitOptions={administratorUnits.map((unit) => ({ code: unit.code, label: unit.label }))}
                searchValue={administratorSearch}
                onSearchChange={setAdministratorSearch}
                roleFilter={administratorRoleFilter}
                onRoleFilterChange={setAdministratorRoleFilter}
                unitFilter={administratorUnitFilter}
                onUnitFilterChange={setAdministratorUnitFilter}
                statusFilter={administratorStatusFilter}
                onStatusFilterChange={setAdministratorStatusFilter}
                currentAdminId={user?.id ?? null}
                resendingInviteId={resendingInviteId}
                onEdit={(administrator) => startEditingAdministrator(administrator)}
                onToggleActive={(administrator) => setPendingToggleActiveAdministrator(administrator)}
                onDelete={(administrator) => setPendingDeleteAdministrator(administrator)}
                onResendInvite={(administrator) => void handleResendInvite(administrator)}
              />
            )}

            <AdministratorFormDialog
              mode={administratorModalMode}
              displayName={administratorDisplayNameDraft}
              onDisplayNameChange={setAdministratorDisplayNameDraft}
              email={administratorEmailDraft}
              onEmailChange={setAdministratorEmailDraft}
              existingEmails={administrators.map((administrator) => administrator.email.toLowerCase())}
              roleOptions={administratorRoles}
              roleId={administratorRoleIdDraft}
              onRoleIdChange={setAdministratorRoleIdDraft}
              unitOptions={administratorUnits}
              unitId={administratorUnitIdDraft}
              onUnitIdChange={setAdministratorUnitIdDraft}
              isActive={editingAdministrator?.isActive ?? true}
              isPasswordSet={editingAdministrator?.isPasswordSet ?? true}
              isSelf={Boolean(editingAdministrator && user?.id && editingAdministrator.id === user.id)}
              onSuspendToggle={() => {
                if (editingAdministrator) setPendingToggleActiveAdministrator(editingAdministrator);
              }}
              onDeleteAdministrator={() => {
                if (editingAdministrator) setPendingDeleteAdministrator(editingAdministrator);
              }}
              saving={savingAdministrator}
              onCancel={resetAdministratorForm}
              onSave={() => void (administratorModalMode === "edit" ? handleUpdateAdministrator() : handleCreateAdministrator())}
            />

            <DangerConfirmDialog
              variant={pendingToggleActiveAdministrator?.isActive ? "warning" : "success"}
              open={Boolean(pendingToggleActiveAdministrator)}
              onOpenChange={(open) => {
                if (!open) setPendingToggleActiveAdministrator(null);
              }}
              icon={pendingToggleActiveAdministrator?.isActive ? UserX : UserCheck}
              title={pendingToggleActiveAdministrator?.isActive ? "Suspend Administrator" : "Reactivate Administrator"}
              description={
                <>
                  <span className="text-slate-500">
                    Are you sure you want to {pendingToggleActiveAdministrator?.isActive ? "suspend" : "reactivate"} administrator{" "}
                  </span>
                  <span className="font-semibold text-text-default">{pendingToggleActiveAdministrator?.displayName ?? ""}</span>
                  <span className="text-text-default underline"> ({pendingToggleActiveAdministrator?.email ?? ""})</span>
                  <span className="text-slate-500">?</span>
                </>
              }
              warning={
                pendingToggleActiveAdministrator?.isActive ? (
                  <>The account will be temporarily disabled and access to the Admin Portal will be suspended.</>
                ) : (
                  <>The account will be reactivated and access to the Admin Portal will be restored.</>
                )
              }
              confirmLabel={pendingToggleActiveAdministrator?.isActive ? "Suspend Administrator" : "Reactivate Administrator"}
              confirmIcon={pendingToggleActiveAdministrator?.isActive ? UserX : UserCheck}
              onConfirm={async () => {
                if (pendingToggleActiveAdministrator) await handleToggleAdministratorActive(pendingToggleActiveAdministrator);
                setPendingToggleActiveAdministrator(null);
              }}
            />

            <DangerConfirmDialog
              open={Boolean(pendingDeleteAdministrator)}
              onOpenChange={(open) => {
                if (!open) setPendingDeleteAdministrator(null);
              }}
              icon={Trash2}
              title="Delete Administrator"
              description={
                <>
                  <span className="text-slate-500">Are you sure you want to delete administrator </span>
                  <span className="font-semibold text-text-default">{pendingDeleteAdministrator?.displayName ?? ""}</span>
                  <span className="text-text-default underline"> ({pendingDeleteAdministrator?.email ?? ""})</span>
                  <span className="text-slate-500">?</span>
                </>
              }
              warning={<>The account and its access rights will be permanently removed. This action cannot be undone.</>}
              warningTone="danger"
              confirmLabel="Delete Administrator"
              confirmIcon={Trash2}
              onConfirm={async () => {
                if (pendingDeleteAdministrator) await handleDeleteAdministrator(pendingDeleteAdministrator);
                if (pendingDeleteAdministrator && pendingDeleteAdministrator.id === editingAdministratorId) {
                  resetAdministratorForm();
                }
                setPendingDeleteAdministrator(null);
              }}
            />

            <ActivityLogsExportDialog
              open={administratorsExportDialogOpen}
              onOpenChange={setAdministratorsExportDialogOpen}
              reportTitle="Administrators"
              description="Export the current filtered list of administrator accounts."
              onExport={handleExportAdministrators}
            />
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
        const now = Date.now();
        const dateFilterDays: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
        const activitySearchTerm = activitySearch.trim().toLowerCase();
        const filteredLogs = state.activityLogs
          .filter((l) => activityLogFilter === "all" || l.relatedType === activityLogFilter)
          .filter((l) => {
            if (activityDateFilter === "all") return true;
            const days = dateFilterDays[activityDateFilter] ?? 0;
            return new Date(l.createdAt).getTime() >= now - days * 24 * 60 * 60 * 1000;
          })
          .filter((l) => {
            if (!activitySearchTerm) return true;
            const admin = l.actorUserId ? adminAccountsById[l.actorUserId] : undefined;
            const actorText = admin ? `${admin.displayName} ${admin.email}` : l.actorUserId ? "Administrator" : "System";
            const haystack = [
              getFriendlyAuditAction(l.action),
              getFriendlyAuditCategory(l.relatedType),
              l.description,
              actorText,
            ]
              .join(" ")
              .toLowerCase();
            return haystack.includes(activitySearchTerm);
          });
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
          <div className="flex flex-col gap-4">
            <AdminPageHeader
              title="Activity Logs"
              description="Review the system-wide history of admin actions."
              action={
                <button
                  type="button"
                  disabled={!filteredLogs.length || activityExporting !== null}
                  onClick={() => setActivityExportDialogOpen(true)}
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-50"
                >
                  <Download className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                  Export
                </button>
              }
            />
            <ActivityLogsTable
              logs={filteredLogs}
              searchValue={activitySearch}
              onSearchChange={setActivitySearch}
              categoryFilter={activityLogFilter}
              onCategoryFilterChange={setActivityLogFilter}
              dateFilter={activityDateFilter}
              onDateFilterChange={setActivityDateFilter}
              adminAccountsById={adminAccountsById}
            />
            <ActivityLogsExportDialog
              open={activityExportDialogOpen}
              onOpenChange={setActivityExportDialogOpen}
              reportTitle="Activity Logs"
              description="Export all activity records matching the current category and time-range filters."
              onExport={handleActivityExport}
            />
          </div>
        );
      }
      case "ypop-validation": {
        // ── VIEW 4: entry-review ────────────────────────────────────────────
        if (ypopAdminView === "entry-review" && selectedYpopId) {
          const entry = state.ypopEntries.find((e) => e.id === selectedYpopId);
          if (!entry) {
            setSelectedYpopId(null);
            setYpopAdminView("period-detail");
            return null;
          }
          const entryOrg = state.organizationProfiles.find((o) => o.id === entry.organizationId);
          const semesterActivities = state.ypopCityActivities.filter((a) => a.semesterKey === entry.semester);
          const semesterActivityIds = new Set(semesterActivities.map((a) => a.id));
          const orgEventParticipations = state.ypopEventParticipations.filter(
            (p) => p.organizationId === entry.organizationId && semesterActivityIds.has(p.activityId),
          );
          const orgActivities = state.ypopOrgActivities.filter((a) => a.ypopEntryId === entry.id);
          const approvedCount =
            orgActivities.filter((a) => a.status === "approved").length +
            orgEventParticipations.filter((p) => p.status === "verified").length;
          const requestRevisionCount =
            orgActivities.filter((a) => a.status === "needs_revision" || a.status === "rejected").length +
            orgEventParticipations.filter((p) => p.status === "needs_revision" || p.status === "rejected").length;
          const unreviewedCount =
            orgActivities.filter((a) => a.status === "submitted" || a.status === "under_review").length +
            orgEventParticipations.filter((p) => p.status === "pending_verification").length;
          const qualificationProgress = Math.max(0, Math.min(100, entry.pointsEarned ?? 0));
          const eventFilesByParticipationId = new Map<string, YPOPEventFile[]>();
          state.ypopEventFiles.forEach((file) => {
            const existing = eventFilesByParticipationId.get(file.participationId) ?? [];
            existing.push(file);
            eventFilesByParticipationId.set(file.participationId, existing);
          });
          const orgActivityFilesByActivityId = new Map<string, YPOPOrgActivityFile[]>();
          state.ypopOrgActivityFiles.forEach((file) => {
            const existing = orgActivityFilesByActivityId.get(file.orgActivityId) ?? [];
            existing.push(file);
            orgActivityFilesByActivityId.set(file.orgActivityId, existing);
          });

          const entryReviewCategoryPillClasses: Record<YPOPCityActivityCategory, string> = {
            mandatory: "border-border-mandatory-subtle bg-bg-mandatory-subtle text-text-mandatory",
            invitational: "border-border-pink-subtle bg-bg-pink-subtle text-text-pink",
            partnership: "border-border-partnership-subtle bg-bg-partnership-subtle text-text-partnership",
          };

          type EntryReviewGroup = {
            id: string;
            title: string;
            categoryLabel?: string;
            categoryPillClass?: string;
            status: YPOPEventParticipationStatus | YPOPOrgActivityStatus;
            files: Array<{ id: string; fileName: string; fileUrl: string; uploadedAt: string }>;
          };

          const cityLedGroups: EntryReviewGroup[] = orgEventParticipations
            .filter((p) => p.status !== "draft")
            .map((participation) => {
            const activity = semesterActivities.find((a) => a.id === participation.activityId);
            const category = activity ? resolveYpopCityLedCategory(activity.category, activity.points) : undefined;
            return {
              id: participation.id,
              title: activity?.name || participation.activityName,
              categoryLabel: category ? YPOP_CITY_LED_CATEGORY_LABELS[category] : undefined,
              categoryPillClass: category ? entryReviewCategoryPillClasses[category] : undefined,
              status: participation.status,
              files: (eventFilesByParticipationId.get(participation.id) ?? []).map((f) => ({
                id: f.id,
                fileName: f.fileName,
                fileUrl: f.fileUrl,
                uploadedAt: f.uploadedAt,
              })),
            };
          });

          const orgLedGroups: EntryReviewGroup[] = orgActivities.map((activity) => ({
            id: activity.id,
            title: activity.activityName,
            status: activity.status,
            files: (orgActivityFilesByActivityId.get(activity.id) ?? []).map((f) => ({
              id: f.id,
              fileName: f.fileName,
              fileUrl: f.fileUrl,
              uploadedAt: f.uploadedAt,
            })),
          }));

          const activeReviewGroups = entryReviewTab === "city_led" ? cityLedGroups : orgLedGroups;
          const flattenedReviewFiles = activeReviewGroups.flatMap((group) => group.files);
          const activeReviewFileIndex = flattenedReviewFiles.findIndex((f) => f.id === activeEntryReviewFileId);
          const activeReviewFile = activeReviewFileIndex >= 0 ? flattenedReviewFiles[activeReviewFileIndex] : null;

          const selectedBulkGroups = activeReviewGroups.filter((g) => selectedEntryReviewGroupIds.includes(g.id));
          const entryReviewDecisionRequiresRemark = entryReviewBulkDecision === "needs_revision" || entryReviewBulkDecision === "reject";
          const isEntryReviewConfirmDisabled =
            selectedBulkGroups.length === 0 ||
            entryReviewSubmitting ||
            (selectedBulkGroups.length === 1 && entryReviewDecisionRequiresRemark && !entryReviewBulkRemark.trim());

          const submitEntryReviewDecisions = async () => {
            if (!selectedBulkGroups.length) return;
            setEntryReviewSubmitting(true);
            const now = new Date().toISOString();
            const targetStatus =
              entryReviewBulkDecision === "approve"
                ? entryReviewTab === "city_led" ? "verified" : "approved"
                : entryReviewBulkDecision === "needs_revision"
                  ? "needs_revision"
                  : "rejected";
            const remark = selectedBulkGroups.length === 1 && entryReviewDecisionRequiresRemark ? entryReviewBulkRemark.trim() : "";
            const failedTitles: string[] = [];
            for (const group of selectedBulkGroups) {
              try {
                if (entryReviewTab === "city_led") {
                  const participation = orgEventParticipations.find((p) => p.id === group.id);
                  const patch = {
                    status: targetStatus as YPOPEventParticipationStatus,
                    adminRemarks: remark,
                    verifiedAt: targetStatus === "verified" ? now : participation?.verifiedAt ?? "",
                    revisionHistory: [...(participation?.revisionHistory ?? []), { action: targetStatus, adminRemarks: remark, changedAt: now }],
                  };
                  const saved = await adminUpdateYpopEventParticipationInSupabase(group.id, patch);
                  updateYPOPEventParticipation(saved.id, saved);
                } else {
                  const activity = orgActivities.find((a) => a.id === group.id);
                  const patch = {
                    status: targetStatus as YPOPOrgActivityStatus,
                    adminRemarks: remark,
                    approvedAt: targetStatus === "approved" ? now : activity?.approvedAt ?? "",
                    revisionHistory: [...(activity?.revisionHistory ?? []), { action: targetStatus, adminRemarks: remark, changedAt: now }],
                  };
                  const saved = await adminUpdateYpopOrgActivityInSupabase(group.id, patch);
                  updateYPOPOrgActivity(saved.id, saved);
                }
              } catch {
                failedTitles.push(group.title);
              }
            }
            if (failedTitles.length < selectedBulkGroups.length) {
              await refreshAdminState();
            }
            setEntryReviewSubmitting(false);
            setSelectedEntryReviewGroupIds([]);
            setEntryReviewBulkRemark("");
            setEntryReviewConfirmOpen(false);
            if (failedTitles.length) {
              toast({ title: "Some updates failed", description: failedTitles.join(", "), variant: "destructive" });
            } else {
              toast({
                title: "Review saved",
                description: `${selectedBulkGroups.length} item${selectedBulkGroups.length === 1 ? "" : "s"} updated.`,
              });
            }
          };

          return (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => { setSelectedYpopId(null); setYpopAdminView("period-detail"); }}
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
                >
                  <ArrowLeft className="h-4 w-4 shrink-0 text-text-default" strokeWidth={1.6} />
                  Back to Submissions
                </button>
                <StatusLabel status={entry.status} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-300 bg-admin-surface p-4">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-public-bg-brand">
                    <Building2 className="h-5 w-5 text-white" strokeWidth={1.33} />
                  </div>
                  <h1 className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                    {entryOrg?.organizationName ?? "Unknown organization"}
                  </h1>
                  <ReferenceCodeChip code={entryOrg?.referenceId || "—"} className="w-[120px] rounded" />
                  {entryOrg?.majorClassification ? <CategoryChip category={entryOrg.majorClassification} /> : null}
                </div>
                <button
                  type="button"
                  aria-label="Decision history"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50"
                >
                  <History className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                </button>
              </div>

              <div className="space-y-4 rounded-md border border-slate-300 bg-admin-surface p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <p className="font-segoe text-lg font-semibold uppercase leading-none text-text-default">Validation Summary</p>
                      <CircleHelp className="h-[18px] w-[18px] text-slate-500" strokeWidth={1.6} />
                    </div>
                    <p className="mt-1 font-segoe text-[13px] leading-none text-slate-500">Current computed eligibility points.</p>
                  </div>
                  <div className="flex w-full max-w-[497px] flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="font-segoe text-lg font-semibold leading-none text-text-default">Qualification Progress</span>
                      <span className="font-cascadia text-lg font-bold leading-none text-text-default">{qualificationProgress}%</span>
                    </div>
                    <div className="relative h-2 w-full overflow-hidden rounded-full bg-bg-progress-track">
                      <div className="h-full rounded-l-full bg-bg-success-default transition-all" style={{ width: `${qualificationProgress}%` }} />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-4 pb-2 sm:grid-cols-3">
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Approved</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{approvedCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Request Revision</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{requestRevisionCount}</p>
                  </div>
                  <div className="flex flex-col items-center rounded-md border border-[#f3f7fb] bg-bg-panel-subtle p-4 text-center">
                    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Unreviewed</p>
                    <p className="mt-2 font-segoe text-xl font-bold leading-none text-text-default">{unreviewedCount}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_376px]">
                <div className="flex flex-col overflow-hidden rounded-md border border-slate-300 bg-admin-surface shadow-sm">
                  <div className="flex items-center justify-between gap-3 border-b border-slate-300 p-4">
                    <p className="truncate font-segoe text-lg font-semibold leading-none text-text-default">
                      {activeReviewFile?.fileName ?? "No document selected"}
                    </p>
                    <div className="flex shrink-0 items-center gap-2">
                      {flattenedReviewFiles.length ? (
                        <div className="flex shrink-0 items-center justify-between gap-2">
                          <button
                            type="button"
                            disabled={activeReviewFileIndex <= 0}
                            onClick={() =>
                              setActiveEntryReviewFileId(
                                flattenedReviewFiles[Math.max(0, activeReviewFileIndex - 1)]?.id ?? null,
                              )
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.6} />
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {flattenedReviewFiles.slice(0, 5).map((file, index) => (
                              <button
                                key={file.id}
                                type="button"
                                onClick={() => setActiveEntryReviewFileId(file.id)}
                                className={cn(
                                  "flex h-7 w-7 items-center justify-center rounded-md font-segoe text-[13px]",
                                  activeReviewFile?.id === file.id
                                    ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                                    : "text-text-default hover:bg-slate-50",
                                )}
                              >
                                {index + 1}
                              </button>
                            ))}
                          </div>
                          <button
                            type="button"
                            disabled={activeReviewFileIndex < 0 || activeReviewFileIndex >= flattenedReviewFiles.length - 1}
                            onClick={() =>
                              setActiveEntryReviewFileId(
                                flattenedReviewFiles[Math.min(flattenedReviewFiles.length - 1, activeReviewFileIndex + 1)]?.id ?? null,
                              )
                            }
                            className="flex items-center gap-1 rounded-md px-1.5 py-1 font-segoe text-[13px] text-slate-500 transition-colors hover:bg-slate-50 hover:text-text-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-500"
                          >
                            Next
                            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.6} />
                          </button>
                        </div>
                      ) : null}
                      <button
                        type="button"
                        aria-label="Download documents"
                        disabled={downloadDialogResolving || !flattenedReviewFiles.length}
                        onClick={() =>
                          void openDownloadDialog(
                            activeReviewFile ? { fileName: activeReviewFile.fileName, fileUrl: activeReviewFile.fileUrl } : null,
                            flattenedReviewFiles.map((file) => ({ fileName: file.fileName, fileUrl: file.fileUrl })),
                            "YPOP-Submission-Documents.zip",
                          )
                        }
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface transition-colors hover:bg-slate-50 disabled:opacity-40"
                      >
                        <Download className="h-4 w-4 text-text-default" strokeWidth={1.6} />
                      </button>
                    </div>
                  </div>

                  <div className="flex min-h-[500px] flex-1 items-center justify-center overflow-hidden">
                    {activeReviewFile && entryReviewPreviewUrl ? (
                      entryReviewPreviewCanInline ? (
                        isImagePreviewFile(activeReviewFile.fileName) || isImagePreviewFile(entryReviewPreviewUrl) ? (
                          <img
                            src={entryReviewPreviewUrl}
                            alt={entryReviewPreviewTitle}
                            className="h-full w-full object-contain"
                          />
                        ) : (
                          <iframe
                            src={withHiddenPdfToolbar(entryReviewPreviewUrl)}
                            title={entryReviewPreviewTitle}
                            className="h-full min-h-[500px] w-full border-0"
                          />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-3 p-4 text-center font-segoe text-sm text-slate-500">
                          <p>This file cannot be previewed inline.</p>
                          <button
                            type="button"
                            onClick={() => window.open(entryReviewPreviewUrl, "_blank", "noopener,noreferrer")}
                            className="flex items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3 py-2 font-segoe text-[13px] text-text-default transition-colors hover:bg-slate-50"
                          >
                            <Eye className="h-4 w-4" strokeWidth={1.6} />
                            Open File
                          </button>
                        </div>
                      )
                    ) : activeReviewFile && entryReviewPreviewLoading ? (
                      <p className="font-segoe text-sm text-slate-500">Loading preview…</p>
                    ) : (
                      <div
                        className="flex h-full min-h-[500px] w-full items-center justify-center"
                        style={{ background: "linear-gradient(180deg, #0E2F66 0%, #1A5CA8 100%)" }}
                      >
                        <Megaphone className="h-16 w-16 text-white" strokeWidth={1.5} />
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex w-full items-center gap-0.5 rounded-md border border-slate-300 bg-admin-surface p-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setEntryReviewTab("city_led");
                        setSelectedEntryReviewGroupIds([]);
                        setActiveEntryReviewFileId(null);
                      }}
                      className={cn(
                        "flex-1 rounded-md px-3 py-2 font-segoe text-sm font-semibold leading-none transition-colors",
                        entryReviewTab === "city_led"
                          ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                          : "bg-slate-50 text-text-default",
                      )}
                    >
                      City-led
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEntryReviewTab("org_led");
                        setSelectedEntryReviewGroupIds([]);
                        setActiveEntryReviewFileId(null);
                      }}
                      className={cn(
                        "flex-1 rounded-md px-3 py-2 font-segoe text-sm font-semibold leading-none transition-colors",
                        entryReviewTab === "org_led"
                          ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                          : "bg-slate-50 text-text-default",
                      )}
                    >
                      Organization-led
                    </button>
                  </div>

                  <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                    <div className="flex flex-col gap-1 border-b border-slate-300 pb-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-segoe text-base font-semibold leading-none text-text-default">Document Queue</p>
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedEntryReviewGroupIds(
                              activeReviewGroups
                                .filter((group) => group.status !== "verified" && group.status !== "approved")
                                .map((group) => group.id),
                            )
                          }
                          className="flex shrink-0 items-center gap-1.5 font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand"
                        >
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[3px] border border-slate-500" />
                          Select all
                        </button>
                      </div>
                      <p className="font-segoe text-sm font-normal leading-[140%] text-slate-500">
                        Review the organization&rsquo;s submitted documents and select a document to preview.
                      </p>
                    </div>

                    <div className="space-y-2 pt-2">
                      {activeReviewGroups.length ? (
                        activeReviewGroups.map((group) => {
                          const isCollapsed = collapsedEntryReviewGroups.includes(group.id);
                          const isGroupSelected = selectedEntryReviewGroupIds.includes(group.id);
                          const isLocked = group.status === "verified" || group.status === "approved";
                          return (
                            <div key={group.id} className="rounded-md border border-slate-200">
                              <div className="flex items-center justify-between gap-2 p-3">
                                <div className="flex min-w-0 items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={isGroupSelected}
                                    disabled={isLocked}
                                    onChange={() =>
                                      setSelectedEntryReviewGroupIds((current) =>
                                        current.includes(group.id)
                                          ? current.filter((id) => id !== group.id)
                                          : [...current, group.id],
                                      )
                                    }
                                    className="h-4 w-4 shrink-0 rounded border-slate-300 disabled:cursor-not-allowed disabled:opacity-50"
                                  />
                                  <p className="truncate font-segoe text-sm font-semibold leading-none text-text-default">{group.title}</p>
                                  {group.categoryLabel ? (
                                    <span className={cn("inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 font-segoe text-[10px] font-semibold uppercase leading-[140%]", group.categoryPillClass)}>
                                      {group.categoryLabel}
                                    </span>
                                  ) : null}
                                </div>
                                <button
                                  type="button"
                                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                                  onClick={() =>
                                    setCollapsedEntryReviewGroups((current) =>
                                      current.includes(group.id) ? current.filter((id) => id !== group.id) : [...current, group.id],
                                    )
                                  }
                                  className="flex h-6 w-6 shrink-0 items-center justify-center text-slate-500 transition-colors hover:text-text-default"
                                >
                                  {isCollapsed ? <ChevronDown className="h-4 w-4" strokeWidth={1.6} /> : <ChevronUp className="h-4 w-4" strokeWidth={1.6} />}
                                </button>
                              </div>
                              {!isCollapsed ? (
                                <div className="space-y-0.5 border-t border-slate-200 p-2">
                                  {group.files.length ? (
                                    group.files.map((file) => {
                                      const isActiveFile = activeReviewFile?.id === file.id;
                                      const uploadedDate = new Date(file.uploadedAt);
                                      const isUploadedDateValid = !Number.isNaN(uploadedDate.getTime());
                                      return (
                                        <div
                                          key={file.id}
                                          role="button"
                                          tabIndex={0}
                                          onClick={() => setActiveEntryReviewFileId(file.id)}
                                          onKeyDown={(event) => {
                                            if (event.key !== "Enter" && event.key !== " ") return;
                                            event.preventDefault();
                                            setActiveEntryReviewFileId(file.id);
                                          }}
                                          className={cn(
                                            "flex w-full cursor-pointer items-start gap-2.5 rounded-md p-2.5 text-left transition-colors",
                                            isActiveFile ? "bg-slate-50" : "hover:bg-slate-50",
                                          )}
                                        >
                                          <div className="min-w-0 flex-1 space-y-1">
                                            <div className="flex items-start justify-between gap-2">
                                              <p className="truncate font-cascadia text-xs font-semibold leading-none text-text-default">{file.fileName}</p>
                                              <YpopDocumentStatusPill status={group.status} />
                                            </div>
                                            <p className="font-segoe text-xs font-normal leading-none text-[#b3b3b3]">
                                              Submitted: {isUploadedDateValid ? format(uploadedDate, "d MMM yyyy") : "N/A"}
                                            </p>
                                          </div>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <p className="px-2 py-3 text-center font-segoe text-xs text-slate-500">No files uploaded yet.</p>
                                  )}
                                </div>
                              ) : null}
                            </div>
                          );
                        })
                      ) : (
                        <p className="px-2 py-6 text-center font-segoe text-sm text-slate-500">
                          No {entryReviewTab === "city_led" ? "city-led" : "organization-led"} activities yet.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 border-b border-slate-300 pb-4">
                      <p className="font-segoe text-lg font-semibold leading-none text-text-default">Review Decision</p>
                      <CircleHelp className="h-[18px] w-[18px] shrink-0 text-slate-500" strokeWidth={1.6} />
                    </div>

                    <div className="flex flex-col gap-2 pt-4">
                      {selectedBulkGroups.length === 0 ? (
                        <div className="flex items-start gap-2 rounded-md border border-border-closed-subtle bg-gray-100 px-4 py-3">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-neutral-tertiary" strokeWidth={1.6} />
                          <p className="font-segoe text-[13px] leading-[120%] text-neutral-tertiary">No documents selected.</p>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2 rounded-md border border-brand-info-border bg-brand-info-subtle px-4 py-3">
                          <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                          <p className="font-segoe text-[13px] leading-[120%] text-public-bg-brand">
                            {selectedBulkGroups.length} document{selectedBulkGroups.length === 1 ? "" : "s"} selected.
                          </p>
                        </div>
                      )}

                      <div className="flex flex-col gap-1.5">
                        <label className="font-segoe text-[13px] text-text-default">Decision</label>
                        <Select
                          value={entryReviewBulkDecision}
                          onValueChange={(value) => setEntryReviewBulkDecision(value as "approve" | "needs_revision" | "reject")}
                          disabled={selectedBulkGroups.length === 0}
                        >
                          <SelectTrigger className="h-8 border-slate-300 text-[13px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="approve">{entryReviewTab === "city_led" ? "Verify" : "Approve"}</SelectItem>
                            <SelectItem
                              value="needs_revision"
                              disabled={selectedBulkGroups.length > 1}
                              className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                            >
                              Request Revision
                            </SelectItem>
                            <SelectItem
                              value="reject"
                              disabled={selectedBulkGroups.length > 1}
                              className="data-[disabled]:text-text-disabled data-[disabled]:opacity-100"
                            >
                              Reject
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {selectedBulkGroups.length === 1 && entryReviewDecisionRequiresRemark ? (
                        <div className="flex flex-col gap-1.5">
                          <label className="font-segoe text-[13px] text-text-default">
                            Remarks <span className="text-icon-danger-secondary">*</span>
                          </label>
                          <Textarea
                            value={entryReviewBulkRemark}
                            onChange={(event) => setEntryReviewBulkRemark(event.target.value)}
                            placeholder="Explain the reason or required action..."
                            rows={3}
                            className="resize-none text-[13px]"
                          />
                        </div>
                      ) : null}

                      <button
                        type="button"
                        disabled={isEntryReviewConfirmDisabled}
                        onClick={() => setEntryReviewConfirmOpen(true)}
                        className="mt-1 flex h-11 w-full items-center justify-center rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-[0.38]"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>

                  <DangerConfirmDialog
                    open={entryReviewConfirmOpen}
                    onOpenChange={setEntryReviewConfirmOpen}
                    icon={CheckCircle}
                    variant="info"
                    title="Confirm Review Decision"
                    description="Review your decisions and remarks before submitting. These will be applied below and shown to the organization in their portal."
                    content={
                      <div className="rounded-md border border-slate-300 bg-admin-surface p-6">
                        <div className="grid grid-cols-3 gap-2 border-b border-slate-300 pb-2">
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Activity</p>
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Decision</p>
                          <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">Remarks</p>
                        </div>
                        <div className="flex flex-col gap-2 pt-2">
                          {selectedBulkGroups.map((group) => (
                            <div key={group.id} className="grid grid-cols-3 gap-2">
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">{group.title}</p>
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                                {entryReviewBulkDecision === "approve"
                                  ? entryReviewTab === "city_led" ? "Verify" : "Approve"
                                  : entryReviewBulkDecision === "needs_revision"
                                    ? "Request Revision"
                                    : "Reject"}
                              </p>
                              <p className="font-segoe text-[11px] font-semibold capitalize leading-[140%] text-text-default">
                                {selectedBulkGroups.length === 1 && entryReviewDecisionRequiresRemark
                                  ? entryReviewBulkRemark.trim() || "—"
                                  : "—"}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    }
                    warning="Once submitted, these decisions cannot be changed from this review."
                    cancelLabel="Cancel"
                    confirmLabel="Submit Review"
                    confirmIcon={Send}
                    onConfirm={submitEntryReviewDecisions}
                  />
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
          const totalCityLedPts = periodActivities.reduce((s, a) => s + normalizeYpopCityLedPoints(a.points, a.category), 0);
          const periodActivityIds = new Set(periodActivities.map((activity) => activity.id));
          const periodParticipations = state.ypopEventParticipations.filter(
            (participation) => periodActivityIds.has(participation.activityId) && participation.status !== "draft",
          );
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

          const isPendingEvaluationStatus = (status: YPOPStatus) => status === "under_review" || status === "needs_revision";
          const submittedCount = combinedPeriodEntries.filter((e) => e.status === "submitted").length;
          const pendingEvaluationCount = combinedPeriodEntries.filter((e) => isPendingEvaluationStatus(e.status)).length;
          const qualifiedCount = combinedPeriodEntries.filter((e) => e.status === "qualified").length;
          const notQualifiedCount = combinedPeriodEntries.filter((e) => e.status === "not_qualified").length;

          const entriesById = new Map(combinedPeriodEntries.map((entry) => [entry.id, entry]));
          const submissionRows: YpopSubmissionRow[] = combinedPeriodEntries.map((entry) => {
            const entryOrg = state.organizationProfiles.find((o) => o.id === entry.organizationId);
            return {
              id: entry.id,
              organizationId: entry.organizationId,
              organizationName: entryOrg?.organizationName ?? "Unknown organization",
              referenceId: entryOrg?.referenceId ?? "",
              majorClassification: entryOrg?.majorClassification ?? "",
              status: entry.status,
            };
          });

          const submissionSearchQuery = ypopSubmissionSearch.trim().toLowerCase();
          const filteredSubmissionRows = submissionRows.filter((row) => {
            const matchesSearch =
              !submissionSearchQuery ||
              row.organizationName.toLowerCase().includes(submissionSearchQuery) ||
              row.referenceId.toLowerCase().includes(submissionSearchQuery);
            const matchesClassification =
              ypopSubmissionClassificationFilter === "all" || row.majorClassification === ypopSubmissionClassificationFilter;
            const matchesStatus =
              ypopSubmissionFilter === "all" ||
              (ypopSubmissionFilter === "pending_evaluation" && isPendingEvaluationStatus(row.status)) ||
              (ypopSubmissionFilter === "qualified" && row.status === "qualified") ||
              (ypopSubmissionFilter === "not_qualified" && row.status === "not_qualified");
            return matchesSearch && matchesClassification && matchesStatus;
          });

          const handleValidateSubmission = (row: YpopSubmissionRow) => {
            const entry = entriesById.get(row.id);
            if (!entry) return;
            const isVirtualEntry = "_isVirtual" in entry;
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
            setYpopAdminView("entry-review");
          };

          return (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => { setSelectedYpopPeriodId(null); setYpopAdminView("periods"); }}
                className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                Back to Semesters
              </button>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                <StatsCard title="SUBMITTED" value={submittedCount} icon={Send} description="New submissions awaiting review." />
                <StatsCard title="PENDING EVALUATION" value={pendingEvaluationCount} icon={Clock} description="Submissions awaiting validation." />
                <StatsCard title="QUALIFIED" value={qualifiedCount} icon={CheckCircle} description="Organizations qualified for YPOP." />
                <StatsCard title="NOT QUALIFIED" value={notQualifiedCount} icon={XCircle} description="Organizations not qualified for YPOP." />
              </div>

              <YpopSubmissionsTable
                rows={filteredSubmissionRows}
                searchValue={ypopSubmissionSearch}
                onSearchChange={setYpopSubmissionSearch}
                classificationFilter={ypopSubmissionClassificationFilter}
                onClassificationFilterChange={setYpopSubmissionClassificationFilter}
                statusFilter={ypopSubmissionFilter}
                onStatusFilterChange={setYpopSubmissionFilter}
                onValidate={handleValidateSubmission}
              />
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

          const submitPeriod = async (statusOverride?: YPOPPeriodStatus) => {
            const status = statusOverride ?? createPeriodForm.status;
            setSubmittingPeriodStatus(statusOverride === "draft" ? "draft" : "publish");
            try {
            if (isEditMode && editingPeriodId) {
              const deadline = createPeriodForm.validationDeadline.includes("T")
                ? createPeriodForm.validationDeadline
                : `${createPeriodForm.validationDeadline}T00:00:00.000Z`;
              const patch = {
                semesterLabel: generatedSemesterLabel,
                validationDeadline: deadline,
                status,
                orgLedTiers: createPeriodOrgLedTiers,
              };
              if (status === "closed") {
                try {
                  const result = await adminCloseYpopSemesterInSupabase(editingPeriodId, patch);
                  updateYPOPPeriod(result.period.id, result.period);
                  result.evaluatedEntries.forEach((evaluatedEntry) => {
                    updateYPOPEntry(evaluatedEntry.id, evaluatedEntry);
                  });
                  toast({
                    title: "Semester closed & evaluated",
                    description: `${generatedSemesterLabel} has been closed and participating organizations evaluated.`,
                  });
                } catch {
                  const saved = await adminUpdateYpopPeriodInSupabase(editingPeriodId, patch);
                  updateYPOPPeriod(saved.id, saved);
                  toast({ title: "Semester updated", description: `${generatedSemesterLabel} has been saved.` });
                }
              } else {
                try {
                  const saved = await adminUpdateYpopPeriodInSupabase(editingPeriodId, patch);
                  updateYPOPPeriod(saved.id, saved);
                } catch {
                  updateYPOPPeriod(editingPeriodId, patch);
                }
                toast({ title: "Semester updated", description: `${generatedSemesterLabel} has been saved.` });
              }
              resetForm();
              setYpopAdminView("periods");
            } else {
              const now = new Date().toISOString();
              const deadline = createPeriodForm.validationDeadline.includes("T")
                ? createPeriodForm.validationDeadline
                : `${createPeriodForm.validationDeadline}T00:00:00.000Z`;
              const periodData = { semesterKey: generatedSemesterKey, semesterLabel: generatedSemesterLabel, validationDeadline: deadline, status, orgLedTiers: createPeriodOrgLedTiers };
              let savedPeriodId: string;
              try {
                const saved = await adminCreateYpopPeriodInSupabase(periodData);
                createYPOPPeriod({ ...saved });
                savedPeriodId = saved.id;
                for (let i = 0; i < createPeriodActivities.length; i++) {
                  const act = createPeriodActivities[i];
                  try {
                    const savedAct = await adminCreateYpopCityActivityInSupabase({ semesterKey: saved.semesterKey, name: act.name, date: act.startDate, startDate: act.startDate, endDate: act.endDate || act.startDate, venue: act.venue, category: act.category, points: getYpopCityLedPoints(act.category) });
                    createYPOPCityActivity({ ...savedAct });
                  } catch {
                    createYPOPCityActivity({ id: `ypop-act-${Date.now()}-${i}`, semesterKey: saved.semesterKey, name: act.name, date: act.startDate, startDate: act.startDate, endDate: act.endDate || act.startDate, venue: act.venue, category: act.category, points: getYpopCityLedPoints(act.category), createdAt: now });
                  }
                }
              } catch {
                const newId = `ypop-period-${Date.now()}`;
                createYPOPPeriod({ id: newId, ...periodData, createdAt: now, updatedAt: now });
                createPeriodActivities.forEach((act, i) => {
                  createYPOPCityActivity({ id: `ypop-act-${Date.now()}-${i}`, semesterKey: generatedSemesterKey, name: act.name, date: act.startDate, startDate: act.startDate, endDate: act.endDate || act.startDate, venue: act.venue, category: act.category, points: getYpopCityLedPoints(act.category), createdAt: now });
                });
                savedPeriodId = newId;
              }
              toast({ title: "Semester created", description: `${generatedSemesterLabel} is ready.` });
              setSelectedYpopPeriodId(savedPeriodId);
              setYpopSubmissionFilter("all");
              resetForm();
              setYpopAdminView("period-detail");
            }
            } finally {
              setSubmittingPeriodStatus(null);
            }
          };

          const categoryPillClasses: Record<YPOPCityActivityCategory, string> = {
            mandatory: "border-border-mandatory-subtle bg-bg-mandatory-subtle text-text-mandatory",
            invitational: "border-border-pink-subtle bg-bg-pink-subtle text-text-pink",
            partnership: "border-border-partnership-subtle bg-bg-partnership-subtle text-text-partnership",
          };

          const inlineInputClass = "flex h-8 w-full items-center rounded-md border border-slate-300 bg-admin-surface px-2.5 font-segoe text-[13px] text-text-default outline-none placeholder:text-text-disabled";
          const inlineLabelClass = "font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500";

          const isEditingActivity = Boolean((editingActivityId || editingDraftTempId) && editingActivityData);
          const activityModalData = isEditingActivity ? editingActivityData : createFormNewActivity;
          const isActivityModalOpen = Boolean(activityModalData);

          const closeActivityModal = () => {
            setCreateFormNewActivity(null);
            setEditingActivityId(null);
            setEditingDraftTempId(null);
            setEditingActivityData(null);
          };

          const updateActivityModalField = (
            patch: Partial<{ name: string; startDate: string; endDate: string; venue: string; category: YPOPCityActivityCategory }>,
          ) => {
            if (isEditingActivity && editingActivityData) {
              setEditingActivityData({ ...editingActivityData, ...patch });
            } else if (createFormNewActivity) {
              setCreateFormNewActivity({ ...createFormNewActivity, ...patch });
            }
          };

          const saveActivityModal = async () => {
            if (!activityModalData) return;
            const startDate = activityModalData.startDate.trim();
            const endDate = (activityModalData.endDate || activityModalData.startDate).trim();
            if (isEditingActivity && editingActivityId) {
              const patch = {
                name: activityModalData.name.trim(),
                date: startDate,
                startDate,
                endDate,
                venue: activityModalData.venue.trim(),
                category: activityModalData.category,
                points: getYpopCityLedPoints(activityModalData.category),
              };
              try {
                const saved = await adminUpdateYpopCityActivityInSupabase(editingActivityId, patch);
                updateYPOPCityActivity(saved.id, saved);
              } catch {
                updateYPOPCityActivity(editingActivityId, patch);
              }
            } else if (editingDraftTempId) {
              setCreatePeriodActivities((prev) =>
                prev.map((a) =>
                  a.tempId === editingDraftTempId
                    ? {
                        ...a,
                        name: activityModalData.name.trim(),
                        startDate,
                        endDate,
                        venue: activityModalData.venue.trim(),
                        category: activityModalData.category,
                      }
                    : a,
                ),
              );
            } else if (isEditMode && editPeriod) {
              const actData = {
                semesterKey: editPeriod.semesterKey,
                name: activityModalData.name.trim(),
                date: startDate,
                startDate,
                endDate,
                venue: activityModalData.venue.trim(),
                category: activityModalData.category,
                points: getYpopCityLedPoints(activityModalData.category),
              };
              try {
                const saved = await adminCreateYpopCityActivityInSupabase(actData);
                createYPOPCityActivity({ ...saved });
              } catch {
                createYPOPCityActivity({ id: `ypop-act-${Date.now()}`, ...actData, createdAt: new Date().toISOString() });
              }
            } else {
              setCreatePeriodActivities((prev) => [
                ...prev,
                {
                  tempId: `tmp-${Date.now()}`,
                  name: activityModalData.name.trim(),
                  startDate,
                  endDate,
                  venue: activityModalData.venue.trim(),
                  category: activityModalData.category,
                },
              ]);
            }
            closeActivityModal();
          };

          return (
            <div className="space-y-4 sm:space-y-6">
              <button
                type="button"
                onClick={() => { resetForm(); setYpopAdminView("periods"); }}
                className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                Cancel &amp; Back
              </button>

              <AdminPageHeader
                title={isEditMode ? "Edit YPOP Semester" : "New YPOP Semester"}
                description="Configure cycle identification, city-led activities point table, and organization-initiated scoring bonus tiers."
              />

              <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
                {/* Group 1: Semester Information */}
                <div className="flex flex-col gap-4 border-b border-slate-300 p-6">
                  <div>
                    <p className="font-segoe text-lg font-semibold leading-none text-text-default">1. Semester Information</p>
                    <p className="mt-1.5 font-segoe text-[13px] text-slate-500">General identification and deadline configuration for this validation period.</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-between gap-1.5 font-segoe text-[13px] text-text-default" htmlFor="cp-label">
                        <span>
                          Semester Label <span className="font-segoe text-[13px] text-text-neutral-tertiary">(Read-Only Identifier)</span>
                        </span>
                        <span className="flex h-[19px] shrink-0 items-center gap-1 rounded-[4px] border-[0.6px] border-slate-300 bg-admin-surface px-1.5 font-cascadia text-[8px] font-semibold leading-[140%] text-slate-500">
                          <Lock className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                          Read-Only
                        </span>
                      </label>
                      <div className="flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-bg-neutral-subtle px-2.5">
                        <span className="truncate font-segoe text-[13px] text-text-default">{generatedSemesterLabel}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="flex items-center justify-between gap-1.5 font-segoe text-[13px] text-text-default" htmlFor="cp-key">
                        <span>
                          Semester Key <span className="font-segoe text-[13px] text-text-neutral-tertiary">(Read-Only Identifier)</span>
                        </span>
                        <span className="flex h-[19px] shrink-0 items-center gap-1 rounded-[4px] border-[0.6px] border-slate-300 bg-admin-surface px-1.5 font-cascadia text-[8px] font-semibold leading-[140%] text-slate-500">
                          <Lock className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                          Read-Only
                        </span>
                      </label>
                      <div className="flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-bg-neutral-subtle px-2.5">
                        <span className="truncate font-cascadia text-[13px] text-text-default">{generatedSemesterKey || "—"}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-segoe text-[13px] text-text-default" htmlFor="cp-deadline">
                        Validation Deadline <span className="text-icon-danger-secondary">*</span>
                      </label>
                      <Popover open={deadlineDateOpen} onOpenChange={setDeadlineDateOpen}>
                        <PopoverTrigger asChild>
                          <button
                            id="cp-deadline"
                            type="button"
                            className="flex h-8 w-full items-center justify-between rounded-md border border-slate-300 bg-admin-surface px-2.5 font-segoe text-[13px] text-text-default outline-none"
                          >
                            <span className={createPeriodForm.validationDeadline ? "" : "text-text-disabled"}>
                              {createPeriodForm.validationDeadline
                                ? format(parse(createPeriodForm.validationDeadline, "yyyy-MM-dd", new Date()), "d MMM yyyy")
                                : "Select date"}
                            </span>
                            <CalendarDays className="h-4 w-4 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-auto rounded-md border-0 border-t border-slate-300 p-4">
                          <Calendar
                            mode="single"
                            selected={
                              createPeriodForm.validationDeadline
                                ? parse(createPeriodForm.validationDeadline, "yyyy-MM-dd", new Date())
                                : undefined
                            }
                            onSelect={(date) => {
                              if (date) {
                                setCreatePeriodForm({ ...createPeriodForm, validationDeadline: format(date, "yyyy-MM-dd") });
                                setDeadlineDateOpen(false);
                              }
                            }}
                            components={{ Caption: CalendarCaption }}
                            classNames={{
                              day_selected:
                                "bg-public-bg-brand text-public-text-neutral-on-neutral hover:bg-public-bg-brand hover:text-public-text-neutral-on-neutral focus:bg-public-bg-brand focus:text-public-text-neutral-on-neutral font-segoe text-public-fs-subheading-sm leading-none text-center",
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="font-segoe text-[13px] text-text-default" htmlFor="cp-status">
                        {isEditMode ? "Status" : "Initial Status"}
                      </label>
                      <Select
                        value={createPeriodForm.status}
                        onValueChange={(v) => setCreatePeriodForm({ ...createPeriodForm, status: v as YPOPPeriodStatus })}
                      >
                        <SelectTrigger id="cp-status" className="h-8 border-slate-300 text-[13px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="draft" className="pl-3 [&>span:first-child]:hidden">Draft</SelectItem>
                          <SelectItem value="open" className="pl-3 [&>span:first-child]:hidden">Open</SelectItem>
                          {isEditMode ? <SelectItem value="closed" className="pl-3 [&>span:first-child]:hidden">Closed</SelectItem> : null}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Group 2: City-Led Activities */}
                <div className="flex flex-col gap-4 border-b border-slate-300 p-6">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="font-segoe text-lg font-semibold leading-none text-text-default">2. City-Led Activities</p>
                      <p className="mt-1.5 font-segoe text-[13px] text-slate-500">
                        Assign each city-led activity a type. Points are automatic:{" "}
                        <span className="italic font-bold">Mandatory (4), Invitational (3), Partnership (2).</span>
                      </p>
                    </div>
                    {!isActivityModalOpen ? (
                      <button
                        type="button"
                        onClick={() => setCreateFormNewActivity({ name: "", startDate: "", endDate: "", venue: "", category: "mandatory" })}
                        className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                      >
                        <Plus className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                        Add Activity
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-col">
                    {(isEditMode ? editActivities : createPeriodActivities).length === 0 ? (
                      <p className="py-6 text-center font-segoe text-xs text-slate-500">No activities added yet. Use "+ Add Activity" to start.</p>
                    ) : isEditMode ? (
                      editActivities.map((act: YPOPCityActivity) => (
                        <div key={act.id} className="flex items-center justify-between gap-2 border-b border-slate-300 py-4 last:border-b-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-segoe text-sm font-semibold leading-[140%] text-text-default">{act.name}</p>
                              <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-segoe text-xs font-semibold leading-[140%]", categoryPillClasses[resolveYpopCityLedCategory(act.category, act.points)])}>
                                {YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(act.category, act.points)]}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                              <span className="flex items-center gap-1 font-segoe text-xs leading-[140%] text-text-default">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                                {formatActivityDateRange(act.startDate, act.endDate)}
                              </span>
                              {act.venue ? (
                                <span className="flex items-center gap-1 font-segoe text-xs leading-[140%] text-text-default">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                                  {act.venue}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded border border-border-tertiary-200 bg-bg-tertiary-subtle px-2 py-1.5 font-segoe text-xs font-semibold leading-[140%] text-text-tertiary-800">
                              {normalizeYpopCityLedPoints(act.points, act.category)} pts
                            </span>
                            <button
                              type="button"
                              aria-label="Edit activity"
                              onClick={() => { setEditingActivityId(act.id); setEditingActivityData({ name: act.name, startDate: act.startDate, endDate: act.endDate, venue: act.venue, category: resolveYpopCityLedCategory(act.category, act.points) }); }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface text-text-default transition-colors hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.6} />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete activity"
                              onClick={() => setPendingDeleteConfirmation({ kind: "ypop_city_activity", id: act.id, title: act.name })}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface text-text-default transition-colors hover:bg-slate-50 hover:text-icon-danger-secondary"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      createPeriodActivities.map((act, idx) => (
                        <div key={act.tempId} className="flex items-center justify-between gap-2 border-b border-slate-300 py-4 last:border-b-0">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-segoe text-sm font-semibold leading-[140%] text-text-default">{act.name}</p>
                              <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-segoe text-xs font-semibold leading-[140%]", categoryPillClasses[act.category])}>
                                {YPOP_CITY_LED_CATEGORY_LABELS[act.category]}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-3">
                              <span className="flex items-center gap-1 font-segoe text-xs leading-[140%] text-text-default">
                                <CalendarDays className="h-3.5 w-3.5 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                                {formatActivityDateRange(act.startDate, act.endDate)}
                              </span>
                              {act.venue ? (
                                <span className="flex items-center gap-1 font-segoe text-xs leading-[140%] text-text-default">
                                  <MapPin className="h-3.5 w-3.5 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                                  {act.venue}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded border border-border-tertiary-200 bg-bg-tertiary-subtle px-2 py-1.5 font-segoe text-xs font-semibold leading-[140%] text-text-tertiary-800">
                              {getYpopCityLedPoints(act.category)} pts
                            </span>
                            <button
                              type="button"
                              aria-label="Edit activity"
                              onClick={() => {
                                setEditingDraftTempId(act.tempId);
                                setEditingActivityData({ name: act.name, startDate: act.startDate, endDate: act.endDate, venue: act.venue, category: act.category });
                              }}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface text-text-default transition-colors hover:bg-slate-50"
                            >
                              <Pencil className="h-4 w-4" strokeWidth={1.6} />
                            </button>
                            <button
                              type="button"
                              aria-label="Delete activity"
                              onClick={() => setCreatePeriodActivities((prev) => prev.filter((_, i) => i !== idx))}
                              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface text-text-default transition-colors hover:bg-slate-50 hover:text-icon-danger-secondary"
                            >
                              <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}

                    {/* Total pts footer */}
                    {(() => {
                      const totalPts = isEditMode
                        ? editActivities.reduce((s, a) => s + normalizeYpopCityLedPoints(a.points, a.category), 0)
                        : createPeriodActivities.reduce((s, a) => s + getYpopCityLedPoints(a.category), 0);
                      return totalPts > 0 ? (
                        <p className="pt-3 text-right font-segoe text-xs font-semibold text-slate-500">
                          Total: <span className="text-text-default">{totalPts} pts</span>
                        </p>
                      ) : null;
                    })()}
                  </div>
                </div>

                <DangerConfirmDialog
                  open={isActivityModalOpen}
                  onOpenChange={(open) => { if (!open) closeActivityModal(); }}
                  variant="info"
                  icon={isEditingActivity ? Pencil : FileText}
                  title={isEditingActivity ? "Edit City-Led Activity" : "Add City-Led Activity"}
                  subtitle="Configure official city event parameters and automated scoring points."
                  description=""
                  className="w-[560px] sm:w-[560px]"
                  confirmDisabled={!activityModalData?.name.trim() || !activityModalData?.venue.trim()}
                  cancelLabel="Cancel"
                  confirmLabel={isEditingActivity ? "Save Changes" : "Add Activity"}
                  confirmIcon={isEditingActivity ? Save : Plus}
                  onConfirm={saveActivityModal}
                  content={
                    activityModalData ? (
                      <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-bg-panel-subtle p-6">
                        <div className="flex flex-col gap-1.5">
                          <label className="font-segoe text-[13px] text-text-default">
                            Title <span className="text-icon-danger-secondary">*</span>
                          </label>
                          <input
                            value={activityModalData.name}
                            onChange={(e) => updateActivityModalField({ name: e.target.value })}
                            placeholder="Enter activity title"
                            className="flex h-9 w-full items-center rounded-md border border-slate-300 bg-admin-surface px-3 font-segoe text-[13px] text-text-default outline-none placeholder:text-text-disabled"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-segoe text-[13px] text-text-default">
                            Location <span className="text-icon-danger-secondary">*</span>
                          </label>
                          <div className="flex h-9 w-full items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3">
                            <MapPin className="h-4 w-4 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                            <input
                              value={activityModalData.venue}
                              onChange={(e) => updateActivityModalField({ venue: e.target.value })}
                              placeholder="Enter location"
                              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-[13px] text-text-default outline-none placeholder:text-text-disabled"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <label className="font-segoe text-[13px] text-text-default">Start Date</label>
                            <Popover open={activityStartDateOpen} onOpenChange={setActivityStartDateOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-admin-surface px-3 font-segoe text-[13px] text-text-default outline-none"
                                >
                                  <span className={activityModalData.startDate ? "" : "text-text-disabled"}>
                                    {activityModalData.startDate
                                      ? format(parse(activityModalData.startDate, "yyyy-MM-dd", new Date()), "d MMM yyyy")
                                      : "Select date"}
                                  </span>
                                  <CalendarDays className="h-4 w-4 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-auto rounded-md border-0 border-t border-slate-300 p-4">
                                <Calendar
                                  mode="single"
                                  selected={
                                    activityModalData.startDate
                                      ? parse(activityModalData.startDate, "yyyy-MM-dd", new Date())
                                      : undefined
                                  }
                                  onSelect={(date) => {
                                    if (date) {
                                      updateActivityModalField({ startDate: format(date, "yyyy-MM-dd") });
                                      setActivityStartDateOpen(false);
                                    }
                                  }}
                                  components={{ Caption: CalendarCaption }}
                                  classNames={{
                                    day_selected:
                                      "bg-public-bg-brand text-public-text-neutral-on-neutral hover:bg-public-bg-brand hover:text-public-text-neutral-on-neutral focus:bg-public-bg-brand focus:text-public-text-neutral-on-neutral font-segoe text-public-fs-subheading-sm leading-none text-center",
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <label className="font-segoe text-[13px] text-text-default">End Date</label>
                            <Popover open={activityEndDateOpen} onOpenChange={setActivityEndDateOpen}>
                              <PopoverTrigger asChild>
                                <button
                                  type="button"
                                  className="flex h-9 w-full items-center justify-between rounded-md border border-slate-300 bg-admin-surface px-3 font-segoe text-[13px] text-text-default outline-none"
                                >
                                  <span className={activityModalData.endDate ? "" : "text-text-disabled"}>
                                    {activityModalData.endDate
                                      ? format(parse(activityModalData.endDate, "yyyy-MM-dd", new Date()), "d MMM yyyy")
                                      : "Select date"}
                                  </span>
                                  <CalendarDays className="h-4 w-4 shrink-0 text-icon-neutral-strong" strokeWidth={1.6} />
                                </button>
                              </PopoverTrigger>
                              <PopoverContent align="start" className="w-auto rounded-md border-0 border-t border-slate-300 p-4">
                                <Calendar
                                  mode="single"
                                  selected={
                                    activityModalData.endDate
                                      ? parse(activityModalData.endDate, "yyyy-MM-dd", new Date())
                                      : undefined
                                  }
                                  onSelect={(date) => {
                                    if (date) {
                                      updateActivityModalField({ endDate: format(date, "yyyy-MM-dd") });
                                      setActivityEndDateOpen(false);
                                    }
                                  }}
                                  components={{ Caption: CalendarCaption }}
                                  classNames={{
                                    day_selected:
                                      "bg-public-bg-brand text-public-text-neutral-on-neutral hover:bg-public-bg-brand hover:text-public-text-neutral-on-neutral focus:bg-public-bg-brand focus:text-public-text-neutral-on-neutral font-segoe text-public-fs-subheading-sm leading-none text-center",
                                  }}
                                />
                              </PopoverContent>
                            </Popover>
                          </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="font-segoe text-[13px] text-text-default">Activity Type</label>
                          <p className="text-justify font-segoe text-[11px] leading-none text-slate-500">
                            Select the activity type that best fits. Points are assigned based on the selected type.
                          </p>
                          <div className="grid grid-cols-3 gap-2.5 pt-4 pb-2" role="radiogroup" aria-label="Activity Type">
                            {(["mandatory", "invitational", "partnership"] as YPOPCityActivityCategory[]).map((cat) => {
                              const selected = activityModalData.category === cat;
                              return (
                                <button
                                  key={cat}
                                  type="button"
                                  role="radio"
                                  aria-checked={selected}
                                  onClick={() => updateActivityModalField({ category: cat })}
                                  className="flex flex-col gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-3 py-2 text-left transition-colors hover:bg-slate-50"
                                >
                                  <div className="flex flex-col gap-3 border-b border-slate-300 pb-1.5">
                                    <span className="flex items-center gap-1.5">
                                      <span
                                        className={cn(
                                          "flex h-[13px] w-[13px] shrink-0 items-center justify-center rounded-full border",
                                          selected ? "border-border-info-tertiary" : "border-public-border-neutral-tertiary",
                                        )}
                                      >
                                        {selected ? <span className="h-1.5 w-1.5 rounded-full bg-border-info-tertiary" /> : null}
                                      </span>
                                      <span className="font-segoe text-xs font-semibold uppercase text-text-default">
                                        {YPOP_CITY_LED_CATEGORY_LABELS[cat]}
                                      </span>
                                    </span>
                                    <span className="ml-[19px] font-segoe text-[10px] font-normal capitalize leading-[140%] text-slate-500">
                                      {cat === "mandatory"
                                        ? "Required Participation."
                                        : cat === "invitational"
                                          ? "Voluntary Participation."
                                          : "Collaborative Participation."}
                                    </span>
                                  </div>
                                  <span className="mt-1 inline-flex w-fit items-center self-center rounded border border-border-tertiary-200 bg-bg-tertiary-subtle px-1.5 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-tertiary-800">
                                    {YPOP_CITY_LED_CATEGORY_POINTS[cat]} pts
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    ) : null
                  }
                />

                {/* Group 3: Organization-Initiated Activities */}
                <div className="flex flex-col gap-4 p-6">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-segoe text-lg font-semibold leading-none text-text-default">3. Organization-Initiated Activities</p>
                      <p className="mt-1.5 font-segoe text-[13px] text-slate-500">Set bonus percentages for organization-initiated activities. Default values are applied automatically.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCreatePeriodOrgLedTiers(DEFAULT_ORG_LED_TIERS)}
                      className="shrink-0 font-segoe text-[13px] font-semibold leading-[140%] text-public-bg-brand transition-colors hover:underline"
                    >
                      Reset to defaults
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {[...createPeriodOrgLedTiers]
                      .sort((a, b) => b.minProjects - a.minProjects)
                      .map((tier, displayIdx) => {
                        const actualIdx = createPeriodOrgLedTiers.indexOf(tier);
                        return (
                          <div key={displayIdx} className="flex items-center gap-2 rounded-md border border-slate-300 bg-bg-panel-subtle px-4 py-3">
                            <span className="shrink-0 font-segoe text-[13px] font-semibold text-text-default">&#8805;</span>
                            <input
                              type="number"
                              min={0}
                              value={tier.minProjects}
                              onChange={(e) => setCreatePeriodOrgLedTiers((prev) =>
                                prev.map((t, i) => i === actualIdx ? { ...t, minProjects: Math.max(0, Number(e.target.value) || 0) } : t)
                              )}
                              className="flex h-8 w-[52px] shrink-0 items-center rounded-md border border-slate-300 bg-admin-surface px-2.5 text-center font-segoe text-[13px] text-text-default outline-none"
                            />
                            <span className="shrink-0 font-segoe text-[13px] font-semibold text-text-default">projects &#8594; +</span>
                            <input
                              type="number"
                              min={0}
                              value={tier.bonus}
                              onChange={(e) => setCreatePeriodOrgLedTiers((prev) =>
                                prev.map((t, i) => i === actualIdx ? { ...t, bonus: Math.max(0, Number(e.target.value) || 0) } : t)
                              )}
                              className="flex h-8 w-[52px] shrink-0 items-center rounded-md border border-slate-300 bg-admin-surface px-2.5 text-center font-segoe text-[13px] text-text-default outline-none"
                            />
                            <span className="shrink-0 font-segoe text-[13px] font-semibold text-text-default">% bonus</span>
                            <button
                              type="button"
                              aria-label="Remove tier"
                              onClick={() => setCreatePeriodOrgLedTiers((prev) => prev.filter((_, i) => i !== actualIdx))}
                              className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-icon-danger-secondary"
                            >
                              <X className="h-3.5 w-3.5" strokeWidth={1.6} />
                            </button>
                          </div>
                        );
                      })}

                    {createPeriodOrgLedTiers.length === 0 ? (
                      <p className="py-3 text-center font-segoe text-xs text-slate-500">No tiers configured. Org-led activities will contribute 0 bonus points.</p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => setCreatePeriodOrgLedTiers((prev) => [...prev, { minProjects: 0, bonus: 0 }])}
                      className="flex items-center justify-center gap-3 rounded-md border border-dashed border-slate-300 bg-admin-surface px-4 py-4 font-segoe text-public-fs-body-sm text-public-bg-brand transition-colors hover:bg-bg-panel-subtle"
                    >
                      <Plus className="h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
                      Add Tier
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex items-center justify-end gap-2.5 border-t border-slate-300 p-6">
                  <button
                    type="button"
                    disabled={submittingPeriodStatus !== null}
                    onClick={() => { resetForm(); setYpopAdminView("periods"); }}
                    className="flex h-11 w-fit shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-disabled transition-colors hover:text-slate-500 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={submittingPeriodStatus !== null}
                      onClick={() => void submitPeriod("draft")}
                      className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm text-text-default transition-colors hover:bg-slate-50 disabled:opacity-50"
                    >
                      {submittingPeriodStatus === "draft" ? <Loader className="h-4 w-4 shrink-0 animate-spin" strokeWidth={1.6} /> : null}
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={!canSubmit || submittingPeriodStatus !== null}
                      onClick={() => void submitPeriod()}
                      className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-50"
                    >
                      {submittingPeriodStatus === "publish" ? <Loader className="h-4 w-4 shrink-0 animate-spin text-public-text-neutral-on-neutral" strokeWidth={1.6} /> : null}
                      {isEditMode ? "Save Changes" : "Create Semester"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        }

        // ── VIEW 1: YPOP Semesters list ───────────────────────────────────────
        const sortedPeriods = [...state.ypopPeriods].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const periodRows = sortedPeriods
          .map((period) => ({
            period,
            submissionCount: state.ypopEntries.filter((e) => e.semester === period.semesterKey).length,
          }))
          .filter(({ period }) => {
            const q = ypopPeriodSearch.trim().toLowerCase();
            if (q && !period.semesterLabel.toLowerCase().includes(q) && !period.semesterKey.toLowerCase().includes(q)) {
              return false;
            }
            if (ypopPeriodStatusFilter !== "all" && period.status !== ypopPeriodStatusFilter) return false;
            return true;
          });
        return (
          <div className="space-y-4 sm:space-y-6">
            <AdminPageHeader
              title="YPOP Validation"
              description="Review YPOP grant eligibility submissions."
              action={
                <button
                  type="button"
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
                  className="flex h-11 w-fit shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                >
                  <Plus className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
                  New Semester
                </button>
              }
            />

            <YpopPeriodsTable
              rows={periodRows}
              searchValue={ypopPeriodSearch}
              onSearchChange={setYpopPeriodSearch}
              statusFilter={ypopPeriodStatusFilter}
              onStatusFilterChange={setYpopPeriodStatusFilter}
              onEdit={(period) => {
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
              onDelete={(period) => {
                const activityCount = state.ypopCityActivities.filter((a) => a.semesterKey === period.semesterKey).length;
                setPendingDeleteConfirmation({ kind: "ypop_period", id: period.id, title: period.semesterLabel, activityCount });
              }}
              onViewSubmissions={(period) => {
                setSelectedYpopPeriodId(period.id);
                setYpopSubmissionFilter("all");
                setYpopAdminView("period-detail");
              }}
            />
          </div>
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
    activitySearch,
    adminAccountsById,
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
    ypopAdminView,
    setYpopAdminView,
    selectedYpopPeriodId,
    setSelectedYpopPeriodId,
    createPeriodForm,
    setCreatePeriodForm,
    ypopSubmissionFilter,
    setYpopSubmissionFilter,
    ypopSubmissionSearch,
    setYpopSubmissionSearch,
    ypopSubmissionClassificationFilter,
    setYpopSubmissionClassificationFilter,
    newActivityForm,
    setNewActivityForm,
    editingActivityId,
    setEditingActivityId,
    editingActivityData,
    setEditingActivityData,
    state.ypopEntries,
    state.ypopFiles,
    state.ypopEventParticipations,
    state.ypopEventFiles,
    state.ypopOrgActivities,
    state.ypopOrgActivityFiles,
    state.ypopCityActivities,
    state.ypopPeriods,
    createYPOPEntry,
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
    user,
    administrators,
    administratorRoles,
    administratorUnits,
    filteredAdministrators,
    editingAdministrator,
    editingAdministratorId,
    administratorsLoading,
    administratorsViewTab,
    rolesPermissionsSubTab,
    configuringRoleCode,
    administratorSearch,
    administratorRoleFilter,
    administratorUnitFilter,
    administratorStatusFilter,
    administratorModalMode,
    administratorDisplayNameDraft,
    administratorEmailDraft,
    administratorRoleIdDraft,
    administratorUnitIdDraft,
    savingAdministrator,
    pendingToggleActiveAdministrator,
    pendingDeleteAdministrator,
    resendingInviteId,
    resetAdministratorForm,
    handleCreateAdministrator,
    handleUpdateAdministrator,
    handleToggleAdministratorActive,
    handleDeleteAdministrator,
    handleExportAdministrators,
    handleUpdateRolePermissions,
    handleResendInvite,
    startEditingAdministrator,
    administratorsExportDialogOpen,
    handleExportAdministrators,
  ]);

  const adminConfirmationCopy = getAdminConfirmationCopy();

  return (
    <>
      <PortalShell
        title="Admin Portal"
        subtitle="LYDO / PCYDO Admin"
        groups={sidebarGroups}
        activeId={section}
        onNavigate={handleAdminSectionNavigate}
        onSignOut={() => setSignOutConfirmOpen(true)}
        userProfile={{ name: user?.displayName ?? "Administrator", role: "Administrator", email: user?.email ?? "" }}
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
      <InquiryDetailDrawer
        inquiry={selectedInquiry}
        referenceCode={selectedInquiry ? buildPublicRecordCode("INQ", selectedInquiry, state.inquiries) : ""}
        onOpenChange={(open) => {
          if (!open && !savingInquiryStatus) setSelectedInquiry(null);
        }}
        onUpdateStatus={(status) => void handleSaveInquiryStatus(status)}
        onReplyEmail={() => {
          if (selectedInquiry) setReplyDialogInquiry(selectedInquiry);
          setSelectedInquiry(null);
        }}
        saving={savingInquiryStatus}
      />
      <ReplyEmailDialog
        open={Boolean(replyDialogInquiry)}
        onOpenChange={(open) => {
          if (!open) setReplyDialogInquiry(null);
        }}
        email={replyDialogInquiry?.email ?? ""}
        subject={replyDialogInquiry?.subject ?? ""}
        organizationName={
          replyDialogInquiry
            ? replyDialogInquiry.organizationName || replyDialogInquiry.submitterName || "Unknown"
            : ""
        }
        onMarkResponded={() => (replyDialogInquiry ? handleMarkInquiryResponded(replyDialogInquiry) : undefined)}
      />
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
        open={
          Boolean(pendingDeleteConfirmation) &&
          pendingDeleteConfirmation?.kind !== "news_release" &&
          pendingDeleteConfirmation?.kind !== "ypop_period" &&
          pendingDeleteConfirmation?.kind !== "ypop_city_activity"
        }
        onOpenChange={(open) => {
          if (!open) setPendingDeleteConfirmation(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transparency Post</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteConfirmation
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
      <DangerConfirmDialog
        open={signOutConfirmOpen}
        onOpenChange={setSignOutConfirmOpen}
        icon={LogOut}
        title="Sign Out Confirmation"
        subtitle="Y-TRACE Admin Portal Session"
        description="Are you sure you want to sign out of your active administrative session? Any unsaved form drafts will be discarded."
        warning="You will need to re-authenticate with your admin credentials to access the system."
        confirmLabel="Sign-out"
        confirmIcon={LogOut}
        onConfirm={() => void signOut()}
      />
      <DangerConfirmDialog
        open={pendingDeleteConfirmation?.kind === "news_release"}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteConfirmation(null);
        }}
        icon={Trash2}
        title="Delete News Release"
        description={
          <>
            <span className="text-slate-500">Are you sure you want to delete </span>
            <span className="font-semibold text-text-default">
              {pendingDeleteConfirmation?.kind === "news_release" ? pendingDeleteConfirmation.title : ""}
            </span>
            <span className="text-slate-500">?</span>
          </>
        }
        warning="This news release will be permanently removed from the system and cannot be recovered."
        warningTone="danger"
        confirmLabel="Delete News Release"
        confirmIcon={Trash2}
        onConfirm={() => void confirmDeleteRecord()}
      />
      <DangerConfirmDialog
        open={pendingDeleteConfirmation?.kind === "ypop_period"}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteConfirmation(null);
        }}
        icon={Trash2}
        title="Delete Semester"
        description={
          <>
            <span className="text-slate-500">Are you sure you want to delete this semester period? </span>
            <span className="text-slate-500">
              Submissions linked to this cycle
              {pendingDeleteConfirmation?.kind === "ypop_period"
                ? ` and its ${pendingDeleteConfirmation.activityCount} configured activit${pendingDeleteConfirmation.activityCount !== 1 ? "ies" : "y"}`
                : ""}{" "}
              will be removed.
            </span>
          </>
        }
        warning="This activity will be permanently removed from the system and cannot be recovered."
        warningTone="danger"
        confirmLabel="Delete Semester"
        confirmIcon={Trash2}
        onConfirm={() => void confirmDeleteRecord()}
      />
      <DangerConfirmDialog
        open={pendingDeleteConfirmation?.kind === "ypop_city_activity"}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteConfirmation(null);
        }}
        icon={Trash2}
        title="Delete City-Led Activity"
        description={
          <>
            <span className="text-slate-500">Are you sure you want to delete </span>
            <span className="font-semibold text-text-default">
              {pendingDeleteConfirmation?.kind === "ypop_city_activity" ? pendingDeleteConfirmation.title : ""}
            </span>
            <span className="text-slate-500">?</span>
          </>
        }
        warning="This activity will be permanently removed from the system and cannot be recovered."
        warningTone="danger"
        confirmLabel="Delete Activity"
        confirmIcon={Trash2}
        onConfirm={() => void confirmDeleteRecord()}
      />
      <DangerConfirmDialog
        variant="info"
        open={Boolean(pendingNewsVisibilityConfirmation)}
        onOpenChange={(open) => {
          if (!open) setPendingNewsVisibilityConfirmation(null);
        }}
        icon={pendingNewsVisibilityConfirmation?.nextStatus === "published" ? Globe : EyeOff}
        title={pendingNewsVisibilityConfirmation?.nextStatus === "published" ? "Publish News" : "Hide News"}
        description={
          <>
            <span className="text-slate-500">
              Are you sure you want to {pendingNewsVisibilityConfirmation?.nextStatus === "published" ? "publish" : "hide"}{" "}
            </span>
            <span className="font-semibold text-text-default">{pendingNewsVisibilityConfirmation?.title ?? ""}</span>
            <span className="text-slate-500">?</span>
          </>
        }
        warning={
          pendingNewsVisibilityConfirmation?.nextStatus === "published"
            ? "This news release will become visible on the Organization Portal once published."
            : "This news release will no longer be visible on the Organization Portal. You can publish it again at any time."
        }
        confirmLabel={pendingNewsVisibilityConfirmation?.nextStatus === "published" ? "Confirm Publish" : "Confirm Hide"}
        confirmIcon={pendingNewsVisibilityConfirmation?.nextStatus === "published" ? Globe : EyeOff}
        onConfirm={() => {
          if (pendingNewsVisibilityConfirmation) void pendingNewsVisibilityConfirmation.onConfirm();
          setPendingNewsVisibilityConfirmation(null);
        }}
      />
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
      <DownloadDocumentsDialog
        open={downloadDialogOpen}
        onOpenChange={setDownloadDialogOpen}
        currentFile={downloadDialogCurrentFile}
        allFiles={downloadDialogAllFiles}
        zipName={downloadDialogZipName}
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

function formatCompactPeso(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `₱${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `₱${(value / 1_000).toFixed(1)}K`;
  return `₱${Math.round(value).toLocaleString()}`;
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
