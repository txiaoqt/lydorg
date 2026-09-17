import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import JSZip from "jszip";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellOff,
  X,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  Clock,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ChevronsLeft,
  ChevronsRight,
  CircleHelp,
  Circle,
  Download,
  ExternalLink,
  Eye,
  Building2,
  FileText,
  FileUp,
  Filter,
  Gauge,
  Layers,
  MapPin,
  Loader2,
  Medal,
  MoreHorizontal,
  PenSquare,
  Plus,
  Receipt,
  Search,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  Trophy,
  UploadCloud,
  UserRound,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfirmActionDialog } from "@/components/ConfirmActionDialog";
import { Badge } from "@/components/ui/badge";
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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { RecentActivityList, RecentActivityPreview, type RecentActivityItem, formatActivityActionLabel, formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";
import { PortalEmptyState, PortalIconBadge, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { UserFeatureIcon } from "@/components/portal/UserFeatureIcon";
import { UserPortalShell } from "@/components/portal/UserPortalShell";
import { UserPortalRedesignView } from "@/components/portal/UserPortalRedesignView";
import { UserPortalDocumentWorkspaceView } from "@/components/portal/UserPortalDocumentWorkspaceView";
import { UserPortalLiquidationWorkspaceView } from "@/components/portal/UserPortalLiquidationWorkspaceView";
import { UserPortalBudgetWorkspaceView } from "@/components/portal/UserPortalBudgetWorkspaceView";
import { UserPortalYPOPWorkspaceView } from "@/components/portal/UserPortalYPOPWorkspaceView";
import { UserPortalTemplatesWorkspaceView } from "@/components/portal/UserPortalTemplatesWorkspaceView";
import { UserPortalNewsWorkspaceView } from "@/components/portal/UserPortalNewsWorkspaceView";
import { UserPortalRenewalWorkspaceView } from "@/components/portal/UserPortalRenewalWorkspaceView";
import PublicBudgetOverview from "@/components/public/PublicBudgetOverview";
import { computeBudgetWorkflowMetrics, computeLiquidationWorkflowMetrics } from "@/lib/workflow-metrics";
import { UserPortalOrganizationProfileWorkspaceView } from "@/components/portal/UserPortalOrganizationProfileWorkspaceView";
import { PortalDocumentDrawer } from "@/components/portal/PortalDocumentDrawer";
import { PortalAttachedDocumentDrawer } from "@/components/portal/PortalAttachedDocumentDrawer";
import { OrganizationActivityHistoryModal } from "@/components/portal/OrganizationActivityHistoryModal";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { cn } from "@/lib/utils";
import { resolveBudgetEligibility } from "@/lib/budget-eligibility";
import { LYDO_FACEBOOK_PAGE_URL } from "@/lib/official-links";
import { isUrnRegistration, urnReviewLabels } from "@/lib/urn-registration";
import { DUPLICATE_URN_ERROR_MESSAGE } from "@/lib/urn-validation";
import { mapOrganizationProfileError } from "@/lib/organization-profile-domain";
import {
  getOrganizationRenewalCountdown,
  resolveUserRenewalState,
  type UserFacingRenewalState,
} from "@/lib/organization-renewal";
import { useRenewalClock } from "@/hooks/use-renewal-clock";
import {
  isRegistrationRequirementTemplate,
  resolveBudgetWorkflowEligibility,
  resolveLiquidationWorkflowEligibility,
  resolveRegistrationPrerequisites,
  resolveYpopWorkflowEligibility,
  type WorkflowRequirement,
} from "@/lib/user-workflow-eligibility";
import {
  isApprovedRegistrationDocument,
  resolveRegistrationDocumentAccess,
} from "@/lib/document-file-access";
import {
  getMissingEditableProfileRequirements,
  getOrganizationProfileCompletionCount,
  getOrganizationProfileCompletionTarget,
  isOrganizationProfileComplete,
  isValidFacebookUrl,
  isValidPersonName,
  organizationEmailPattern,
  philippineContactNumberPattern,
} from "@/lib/organization-profile-domain";
import {
  getYpopEventJoinEligibility,
  isPastYpopActivityDate,
  parseYpopActivityDate,
  validateYpopSubmissionEligibility,
} from "@/lib/ypop-event-eligibility";
import {
  type BudgetRequest,
  advocacyOptions,
  majorClassificationOptions,
  type LiquidationReport,
  type LiquidationReportFile,
  type LiquidationStatus,
  type NotificationRecord,
  type SubmissionFile,
  type YPOPEntry,
  type YPOPEventFile,
  type YPOPEventParticipation,
  type YPOPFile,
  type YPOPOrgActivity,
  type YPOPOrgActivityFile,
  type YPOPPeriod,
  statusLabelMap,
  formatSubClassificationLabel,
  subClassificationOptions,
  type OrganizationProfile,
  type InquiryRecord,
  buildVerifiedYpopAttendance,
  computeYpopScore,
  buildPublicRecordCode,
  getYpopCityLedPoints,
  getApprovedYpopOrgActivityCount,
  normalizeYpopCityLedPoints,
  resolveYpopCityLedCategory,
  userNavigationGroups,
  userRouteMap,
  YPOP_CITY_LED_CATEGORY_LABELS,
  YPOP_BASE_TOTAL_POINTS,
  YPOP_SCORE_THRESHOLD,
  formatTemplateCategoryDropdownLabel,
  deriveTemplateCategory,
  type OrganizationRenewalRecord,
} from "@/lib/lydo-connect-data";
import {
  loadLydoConnectSupabaseState,
  createInquiryInSupabase,
  createBudgetRequestInSupabase,
  updateBudgetRequestInSupabase,
  deleteBudgetRequestInSupabase,
  uploadBudgetRequestFileToSupabase,
  createLiquidationReportFileInSupabase,
  deleteLiquidationReportFileInSupabase,
  resolveSupabaseFileUrl,
  upsertOrganizationProfileInSupabase,
  resubmitOrganizationUrnInSupabase,
  removeOrganizationDocumentFromSupabase,
  submitOrganizationDocumentToSupabase,
  submitDocumentSubmissionForReviewInSupabase,
  submitOrganizationDocumentsBatchToSupabase,
  updateLiquidationReportInSupabase,
  createYpopEntryInSupabase,
  createYpopOrgActivityInSupabase,
  createYpopEventParticipationInSupabase,
  updateYpopEntryInSupabase,
  updateYpopOrgActivityInSupabase,
  updateYpopEventParticipationInSupabase,
  deleteYpopEntryFromSupabase,
  deleteYpopOrgActivityFromSupabase,
  uploadYpopOrgActivityFileToSupabase,
  uploadYpopEventFileToSupabase,
  uploadYpopFileToSupabase,
  deleteYpopOrgActivityFileFromSupabase,
  deleteYpopEventFileFromSupabase,
  deleteYpopFileFromSupabase,
  markNotificationReadInSupabase,
  markAllNotificationsReadInSupabase,
  fetchOrganizationRenewalsInSupabase,
  userStartOrGetRenewalDraftInSupabase,
} from "@/lib/lydo-connect-supabase";

const getReadiness = (filled: number, total: number) => (total === 0 ? 0 : Math.round((filled / total) * 100));
const normalizeText = (value?: string | null) => value?.trim() ?? "";
const isPdfFile = (file: File) => file.type === "application/pdf" && /\.pdf$/i.test(file.name);
const validatePdfUpload = async (file: File) => {
  if (!isPdfFile(file)) return "Only PDF files can be uploaded for this submission.";
  if (!file.size) return "The selected PDF is empty.";

  const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (String.fromCharCode(...signature) !== "%PDF-") {
    return "This file does not appear to be a valid PDF.";
  }
  return null;
};
const hasUploadedTemplateFile = (fileUrl?: string, fileName?: string) =>
  Boolean(fileName?.trim() && fileUrl?.trim() && !fileUrl.startsWith("#"));
const formatStatusLabel = (status: string) => statusLabelMap[status] ?? status.replaceAll("_", " ");
const formatCurrency = (value: number | null | undefined) => {
  const num = typeof value === "number" && !Number.isNaN(value) ? Math.round(value) : Math.round(Number(value || 0));
  const safeNum = Number.isNaN(num) ? 0 : num;
  return `PHP ${safeNum.toLocaleString("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};
const getLatestBudgetAdminFeedback = (request?: BudgetRequest | null) => {
  if (!request) return "";
  const direct = request.adminRemarks?.trim();
  if (direct) return direct;

  return (
    [...(request.revisionHistory ?? [])]
      .reverse()
      .find((entry) => (entry.action === "needs_revision" || entry.action === "rejected_red") && entry.adminRemarks?.trim())
      ?.adminRemarks?.trim() ?? ""
  );
};
const canInlinePreviewFile = (value: string) => {
  if (!value) return false;
  const cleanPath = value.split("?")[0].split("#")[0];
  return /\.(pdf|png|jpe?g|gif|webp|svg)$/i.test(cleanPath) || /\.(pdf|png|jpe?g|gif|webp|svg)/i.test(value);
};
const isImagePreviewFile = (value: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
const getDocumentUploadAcceptValue = (_documentTypeId: string) => ".pdf,application/pdf";
const getDocumentPrimaryFileTypeLabel = (_documentTypeId: string) => "PDF";
const getDocumentUploadHelpText = (_documentTypeId: string) => "Upload a PDF file for submission.";
const isApprovedSubmissionFile = isApprovedRegistrationDocument;
const isApprovedDocumentSubmission = (submission?: { status?: string } | null) =>
  submission?.status === "approved" || submission?.status === "approved_green";
const isEditableDocumentSubmission = (submission?: { status?: string } | null) =>
  !submission || ["draft", "needs_revision", "rejected_red"].includes(submission.status ?? "draft");
const deriveOverallDocumentSubmissionStatus = (
  files: SubmissionFile[],
): "not_started" | "draft" | "under_admin_review" | "needs_revision" | "approved_green" => {
  if (!files.length) return "not_started";
  const statuses = files.map((file) => file.adminStatus);
  if (statuses.includes("needs_revision") || statuses.includes("rejected_red")) return "needs_revision";
  if (statuses.every((status) => status === "approved_green" || status === "approved")) return "approved_green";
  if (statuses.some((status) => status === "under_admin_review" || status === "submitted" || status === "ready_for_review")) {
    return "under_admin_review";
  }
  if (statuses.some((status) => status === "draft")) return "draft";
  return "under_admin_review";
};
const formatCompactDateLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
};
const formatDateTimeLabel = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Manila",
  }).format(date);
};
const formatShortPortalDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  }).format(date);
};
const budgetNativeSelectClass =
  "h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50";
const budgetActionLabels: Record<string, string> = {
  needs_revision: "Revision requested",
  approved_for_ftf_green: "Submit Onsite",
  hard_copy_submitted: "Hardcopy Submitted",
  budget_released: "Budget released",
  completed: "Completed",
  submitted: "Submitted for review",
  rejected_red: "Rejected",
  draft: "Saved as draft",
};
const approvedBudgetStatuses = new Set<BudgetRequest["status"]>([
  "approved_for_ftf_green",
  "budget_released",
  "completed",
]);
const liquidationUnlockedBudgetStatuses = new Set<BudgetRequest["status"]>(["budget_released", "completed"]);
const ADMIN_RECIPIENT_ID = "admin-demo";
const createNotificationId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createBatchUploadDraftId = () => `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

type BatchDroppedDocumentFile = {
  id: string;
  file: File;
  mappedDocumentTypeId: string;
};

type BatchUploadResultSummary = {
  submitMode: "draft" | "review";
  successCount: number;
  failureCount: number;
  results: Array<{
    documentTypeName: string;
    fileName: string;
    success: boolean;
    error?: string;
  }>;
};

const WebsiteWorkflowNotice = ({
  title,
  description,
  requirements,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  requirements: WorkflowRequirement[];
  actionLabel: string;
  onAction: () => void;
}) => (
  <Card className="border-amber-300/70 bg-amber-50/70 shadow-sm">
    <CardContent className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-amber-100 p-2 text-amber-700">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-amber-950">{title}</h2>
          <p className="mt-1 text-sm text-amber-900/80">{description}</p>
          <ul className="mt-4 space-y-2" aria-label="Eligibility requirements">
            {requirements.map((requirement) => (
              <li
                key={requirement.id}
                className={cn(
                  "flex items-center gap-2 text-sm",
                  requirement.met ? "text-emerald-700" : "text-muted-foreground",
                )}
              >
                {requirement.met
                  ? <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                  : <Circle className="h-4 w-4 shrink-0" aria-hidden="true" />}
                <span>{requirement.label}</span>
                <span className="sr-only">{requirement.met ? "complete" : "incomplete"}</span>
              </li>
            ))}
          </ul>
          <Button type="button" variant="ghost" className="mt-4 h-11 px-0 text-amber-800 hover:bg-transparent hover:text-amber-950" onClick={onAction}>
            {actionLabel}<ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
);

const createBlankOrganizationProfile = (
  userId: string,
  defaults?: Partial<
    Pick<
      OrganizationProfile,
      | "organizationName"
      | "organizationEmail"
      | "contactNumber"
      | "district"
      | "barangay"
      | "isExistingOrganization"
      | "organizationIdentifierNumber"
    >
  >,
): OrganizationProfile => {
  const isExisting = Boolean(defaults?.isExistingOrganization);
  const existingIdentifier = isExisting ? (defaults?.organizationIdentifierNumber ?? "") : "";

  return {
    id: `draft-${userId || "organization"}`,
    userId,
    organizationName: defaults?.organizationName ?? "",
    organizationEmail: defaults?.organizationEmail ?? "",
    contactNumber: defaults?.contactNumber ?? "",
    district: defaults?.district ?? "",
    barangay: defaults?.barangay ?? "",
    isExistingOrganization: isExisting,
    organizationIdentifierNumber: existingIdentifier,
    registrationType: isExisting ? "existing_urn" : "new_organization",
    urn: existingIdentifier,
    urnNormalized: existingIdentifier ? existingIdentifier.trim().toUpperCase() : "",
    urnReviewStatus: isExisting ? "pending" : "not_applicable",
    urnAdminRemarks: "",
    urnReviewedBy: "",
    urnReviewedAt: "",
    verificationMethod: null,
    majorClassification: "",
    subClassification: "",
    advocacies: [],
    adviserName: "",
    representativeName: "",
    address: "",
    facebookPageUrl: "",
    profileStatus: "incomplete",
    verifiedAt: "",
    internalNotes: "",
    yorpRegisteredYear: null,
    yorpRenewedYear: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const createOrganizationProfileDraft = (
  userId: string,
  profile: OrganizationProfile | null,
  defaults?: Partial<
    Pick<
      OrganizationProfile,
      | "organizationName"
      | "organizationEmail"
      | "contactNumber"
      | "district"
      | "barangay"
      | "isExistingOrganization"
      | "organizationIdentifierNumber"
    >
  >,
): OrganizationProfile => {
  const blank = createBlankOrganizationProfile(userId, defaults);
  if (!profile) return blank;

  const isExisting = Boolean(profile.isExistingOrganization);
  const identifier = isExisting
    ? normalizeText(profile.organizationIdentifierNumber) || blank.organizationIdentifierNumber
    : profile.profileStatus === "verified"
      ? normalizeText(profile.organizationIdentifierNumber)
      : "";

  return {
    ...blank,
    ...profile,
    organizationName: normalizeText(profile.organizationName) || blank.organizationName,
    organizationEmail: normalizeText(profile.organizationEmail) || blank.organizationEmail,
    contactNumber: normalizeText(profile.contactNumber) || blank.contactNumber,
    district: normalizeText(profile.district) || blank.district,
    barangay: normalizeText(profile.barangay) || blank.barangay,
    isExistingOrganization: isExisting,
    organizationIdentifierNumber: identifier,
    registrationType: isExisting ? "existing_urn" : "new_organization",
    urn: isExisting ? identifier : profile.profileStatus === "verified" ? profile.urn : "",
    urnNormalized: isExisting && identifier ? identifier.trim().toUpperCase() : profile.profileStatus === "verified" ? (profile.urnNormalized || "") : "",
    urnReviewStatus: isExisting ? profile.urnReviewStatus || "pending" : "not_applicable",
    majorClassification: normalizeText(profile.majorClassification) as OrganizationProfile["majorClassification"],
    subClassification: normalizeText(profile.subClassification) as OrganizationProfile["subClassification"],
    adviserName: normalizeText(profile.adviserName),
    representativeName: normalizeText(profile.representativeName),
    address: normalizeText(profile.address),
    facebookPageUrl: normalizeText(profile.facebookPageUrl),
    verifiedAt: normalizeText(profile.verifiedAt),
    internalNotes: normalizeText(profile.internalNotes),
    advocacies: Array.isArray(profile.advocacies) ? [...profile.advocacies] : [],
  };
};

const createBlankBudgetRequest = (organizationId: string, submittedBy: string): BudgetRequest => ({
  id: `budget-${organizationId || "draft"}-${Date.now()}`,
  organizationId,
  submittedBy,
  fiscalYear: new Date().getFullYear(),
  activityTitle: "",
  activityDescription: "",
  activityDate: "",
  venue: "",
  requestedAmount: 0,
  approvedAmount: 0,
  releasedAmount: 0,
  releaseDate: "",
  purposeCategory: "Leadership & Governance",
  status: "draft",
  remarks: "",
  adminRemarks: "",
  goSignalAt: "",
  hardCopySubmittedAt: "",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

export default function UserPortal({ section }: { section: string }) {
  const navigate = useNavigate();
  const { confirmAction, confirmationDialog } = useConfirmActionDialog();
  const { signOut, user } = useAuth();
  const {
    state,
    mergeRemoteState,
    upsertOrganizationProfile,
    updateDocumentFile,
    updateDocumentSubmission,
    updateBudgetRequest,
    createNotification,
    markNotificationRead,
    markAllNotificationsRead,
    updateYPOPEntry,
    createYPOPEntry,
    deleteYPOPEntry,
    createYPOPFile,
    deleteYPOPFile,
    createYPOPEventParticipation,
    updateYPOPEventParticipation,
    createYPOPEventFile,
    deleteYPOPEventFile,
    createYPOPOrgActivity,
    updateYPOPOrgActivity,
    deleteYPOPOrgActivity,
    createYPOPOrgActivityFile,
    deleteYPOPOrgActivityFile,
    createInquiry,
  } = useLydoConnect();
  const [scanningDocumentId, setScanningDocumentId] = useState<string | null>(null);
  const [submittingDocumentId, setSubmittingDocumentId] = useState<string | null>(null);
  const [userRemarkDraftsByFileId, setUserRemarkDraftsByFileId] = useState<Record<string, string>>({});
  const [budgetUserNoteDrafts, setBudgetUserNoteDrafts] = useState<Record<string, string>>({});
  const [liquidationNotesByReportId, setLiquidationNotesByReportId] = useState<Record<string, string>>({});
  const [submittingLiquidationId, setSubmittingLiquidationId] = useState<string | null>(null);
  const [liquidationFileDraftByReportId, setLiquidationFileDraftByReportId] = useState<Record<string, File>>({});
  const [liquidationSearch, setLiquidationSearch] = useState("");
  const [liquidationStatusFilter, setLiquidationStatusFilter] = useState<"all" | LiquidationStatus>("all");
  const [liquidationDateRangeFilter, setLiquidationDateRangeFilter] = useState<"all" | "30d" | "90d" | "year">("all");
  const [liquidationSortOrder, setLiquidationSortOrder] = useState<"newest" | "oldest" | "deadline_asc" | "deadline_desc">("newest");
  const [liquidationRowsPerPage, setLiquidationRowsPerPage] = useState<10 | 25 | 50>(10);
  const [liquidationPage, setLiquidationPage] = useState(1);
  const [liquidationFiltersExpanded, setLiquidationFiltersExpanded] = useState(false);
  const [liquidationHasFileOnly, setLiquidationHasFileOnly] = useState(false);
  const [liquidationUploadTargetId, setLiquidationUploadTargetId] = useState<string | null>(null);
  const [mobileLiquidationFormReportId, setMobileLiquidationFormReportId] = useState<string | null>(null);
  const [desktopLiquidationFormReportId, setDesktopLiquidationFormReportId] = useState<string | null>(null);
  const [ypopNotesByEntryId, setYpopNotesByEntryId] = useState<Record<string, string>>({});
  const [submittingYpopId, setSubmittingYpopId] = useState<string | null>(null);
  const [ypopUploadingId, setYpopUploadingId] = useState<string | null>(null);
  const [submittingYpopEventParticipationId, setSubmittingYpopEventParticipationId] = useState<string | null>(null);
  const [ypopEventUploadingId, setYpopEventUploadingId] = useState<string | null>(null);
  const [ypopHistoryOpenById, setYpopHistoryOpenById] = useState<Record<string, boolean>>({});
  const [ypopSemesterEventFilterById, setYpopSemesterEventFilterById] = useState<Record<string, "ongoing" | "past">>({});
  const [ypopOrgActivityModalOpen, setYpopOrgActivityModalOpen] = useState(false);
  const [ypopScoringHelpOpen, setYpopScoringHelpOpen] = useState(false);
  const [ypopScoringExplanationOpenById, setYpopScoringExplanationOpenById] = useState<Record<string, boolean>>({});
  const [editingYpopOrgActivityId, setEditingYpopOrgActivityId] = useState<string | null>(null);
  const [ypopOrgActivityDraft, setYpopOrgActivityDraft] = useState({ activityName: "", venue: "", activityDate: "", narrativeReport: "" });
  const [savingYpopOrgActivity, setSavingYpopOrgActivity] = useState(false);
  const [ypopOrgActivityUploadingId, setYpopOrgActivityUploadingId] = useState<string | null>(null);
  const [submittingYpopOrgActivityId, setSubmittingYpopOrgActivityId] = useState<string | null>(null);
  const [ypopOrgView, setYpopOrgView] = useState<"list" | "entry-detail">("list");
  const [activeYpopEntryId, setActiveYpopEntryId] = useState<string | null>(null);
  const [ypopPreviewFileId, setYpopPreviewFileId] = useState<string | null>(null);
  const [ypopPreviewUrl, setYpopPreviewUrl] = useState("");
  const [ypopPreviewTitle, setYpopPreviewTitle] = useState("");
  const [ypopPreviewCanInline, setYpopPreviewCanInline] = useState(false);
  const [confirmDeleteYpopEntryId, setConfirmDeleteYpopEntryId] = useState<string | null>(null);
  const ypopFileInputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();
  const [isDesktopViewport, setIsDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  );
  const [isBudgetDesktopViewport, setIsBudgetDesktopViewport] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 1024px)").matches : false,
  );
  const [savingProfile, setSavingProfile] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [showProfileEditSection, setShowProfileEditSection] = useState(false);
  const [profileActivityModalOpen, setProfileActivityModalOpen] = useState(false);
  const [profileEditorOpenSections, setProfileEditorOpenSections] = useState<string[]>([
    "basic-information",
    "location-classification",
  ]);
  const [activeProfileTab, setActiveProfileTab] = useState<
    "overview" | "organization-details" | "classification" | "advocacy" | "contacts-socials" | "ypop-participation"
  >("overview");
  const [portalNewsSearch, setPortalNewsSearch] = useState("");
  const [portalNewsCategoryFilter, setPortalNewsCategoryFilter] = useState("all");
  const [budgetReviewNote, setBudgetReviewNote] = useState<{ title: string; note: string; status: BudgetRequestStatus } | null>(null);
  const [budgetRecentActivityModal, setBudgetRecentActivityModal] = useState<{
    title: string;
    entries: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  } | null>(null);
  const [liquidationRecentActivityModal, setLiquidationRecentActivityModal] = useState<{
    title: string;
    entries: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  } | null>(null);
  const [documentRecentActivityModal, setDocumentRecentActivityModal] = useState<{
    title: string;
    description?: string;
    activities: RecentActivityItem[];
  } | null>(null);
  const [ypopRecentActivityModal, setYpopRecentActivityModal] = useState<{
    title: string;
    description?: string;
    activities: RecentActivityItem[];
  } | null>(null);

  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [submissionSuccessOpen, setSubmissionSuccessOpen] = useState(false);
  const [profileRequiredModalOpen, setProfileRequiredModalOpen] = useState(false);
  const [attachedDocumentEditorOpen, setAttachedDocumentEditorOpen] = useState(false);
  const [attachedDocumentEditor, setAttachedDocumentEditor] = useState<{
    file: SubmissionFile;
    documentTypeName: string;
  } | null>(null);
  const [attachedDocumentPreviewUrl, setAttachedDocumentPreviewUrl] = useState("");
  const [attachedDocumentPreviewTitle, setAttachedDocumentPreviewTitle] = useState("");
  const [attachedDocumentPreviewEmptyMessage, setAttachedDocumentPreviewEmptyMessage] = useState("");
  const [attachedDocumentPreviewCanInline, setAttachedDocumentPreviewCanInline] = useState(false);
  const [attachedDocumentReplacementFile, setAttachedDocumentReplacementFile] = useState<File | null>(null);
  const [attachedDocumentMarkedForRemoval, setAttachedDocumentMarkedForRemoval] = useState(false);
  const [savingAttachedDocument, setSavingAttachedDocument] = useState(false);
  const [downloadingAttachedFile, setDownloadingAttachedFile] = useState(false);
  const [documentDetailMode, setDocumentDetailMode] = useState(false);
  const [pendingDocumentRemoval, setPendingDocumentRemoval] = useState<{
    fileId: string;
    fileName: string;
    documentTypeName: string;
  } | null>(null);
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);
  const [savingBudgetRequest, setSavingBudgetRequest] = useState(false);
  const [budgetFileDraft, setBudgetFileDraft] = useState<File | null>(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "read">("all");
  const [verifiedBannerDismissed, setVerifiedBannerDismissed] = useState(false);
  const [pendingBudgetDelete, setPendingBudgetDelete] = useState<BudgetRequest | null>(null);
  const [pendingDeleteConfirmation, setPendingDeleteConfirmation] = useState<{
    title: string;
    description: string;
    confirmLabel?: string;
    action: () => Promise<void> | void;
  } | null>(null);
  const [processingDeleteConfirmation, setProcessingDeleteConfirmation] = useState(false);
  const [budgetSearch, setBudgetSearch] = useState("");
  const [budgetStatusFilter, setBudgetStatusFilter] = useState<"all" | BudgetRequest["status"]>("all");
  const [budgetDateRangeFilter, setBudgetDateRangeFilter] = useState<"all" | "30d" | "90d" | "year">("all");
  const [budgetSortOrder, setBudgetSortOrder] = useState<"newest" | "oldest" | "requested_desc" | "requested_asc">("newest");
  const [budgetRowsPerPage, setBudgetRowsPerPage] = useState<10 | 25 | 50>(10);
  const [budgetPage, setBudgetPage] = useState(1);
  const [budgetForm, setBudgetForm] = useState<BudgetRequest>(() =>
    createBlankBudgetRequest(user?.id ?? "", user?.id ?? ""),
  );
  const [inquiryForm, setInquiryForm] = useState({
    submitterName: "",
    organizationName: "",
    email: "",
    subject: "",
    description: "",
  });
  const [savingInquiry, setSavingInquiry] = useState(false);
  const [confirmInquirySubmitOpen, setConfirmInquirySubmitOpen] = useState(false);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const [inquiryListModalOpen, setInquiryListModalOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const [previewTitle, setPreviewTitle] = useState("");
  const [previewEmptyMessage, setPreviewEmptyMessage] = useState("");
  const [previewCanInline, setPreviewCanInline] = useState(false);
  const attachedDocumentInputRef = useRef<HTMLInputElement | null>(null);
  const liquidationFileInputRef = useRef<HTMLInputElement | null>(null);
  const budgetFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDocumentScan, setPendingDocumentScan] = useState<{
    documentTypeId: string;
    documentTypeName: string;
    file: File;
  } | null>(null);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [batchUploadConfirmOpen, setBatchUploadConfirmOpen] = useState(false);
  const [batchUploadSubmitting, setBatchUploadSubmitting] = useState(false);
  const [downloadingAllTemplates, setDownloadingAllTemplates] = useState(false);
  const [downloadingTemplateId, setDownloadingTemplateId] = useState("");
  const [batchUploadSubmitMode, setBatchUploadSubmitMode] = useState<"draft" | "review">("review");
  const [batchDroppedFiles, setBatchDroppedFiles] = useState<BatchDroppedDocumentFile[]>([]);
  const [batchUploadResult, setBatchUploadResult] = useState<BatchUploadResultSummary | null>(null);
  const currentProfile = state.organizationProfiles.find((item) => item.userId === user?.id) ?? null;
  const ypopEntryIdParam = section === "budget-request" ? searchParams.get("ypopEntryId") : null;
  const ypopSemesterParam = section === "budget-request" ? searchParams.get("semester") : null;
  const budgetEligibility = useMemo(
    () =>
      resolveBudgetEligibility({
        organizationId: currentProfile?.id ?? "",
        periods: state.ypopPeriods,
        entries: state.ypopEntries,
        semesterContext: ypopEntryIdParam || ypopSemesterParam,
      }),
    [currentProfile?.id, state.ypopEntries, state.ypopPeriods, ypopEntryIdParam, ypopSemesterParam],
  );

  const [organizationRenewals, setOrganizationRenewals] = useState<OrganizationRenewalRecord[]>([]);
  const [loadingRenewals, setLoadingRenewals] = useState(false);
  const [renewalLoadError, setRenewalLoadError] = useState(false);
  const [startingRenewal, setStartingRenewal] = useState(false);

  useEffect(() => {
    if (!currentProfile?.id) {
      setOrganizationRenewals([]);
      setLoadingRenewals(false);
      setRenewalLoadError(false);
      return;
    }

    let cancelled = false;
    setLoadingRenewals(true);
    setRenewalLoadError(false);

    fetchOrganizationRenewalsInSupabase(currentProfile.id)
      .then((data) => {
        if (!cancelled) {
          setOrganizationRenewals(data);
          setLoadingRenewals(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load organization renewals:", err);
          setRenewalLoadError(true);
          setLoadingRenewals(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfile?.id]);

  const mergeRemoteStateRef = useRef(mergeRemoteState);
  useEffect(() => {
    mergeRemoteStateRef.current = mergeRemoteState;
  }, [mergeRemoteState]);

  useEffect(() => {
    if (section === "ypop" || section === "budget-request" || section === "templates") {
      void loadLydoConnectSupabaseState().then((remoteSnapshot) => {
        if (remoteSnapshot) {
          mergeRemoteStateRef.current(remoteSnapshot);
        }
      });
    }
  }, [section]);

  const userRenewalState = useMemo(() => {
    return resolveUserRenewalState({
      profile: currentProfile,
      renewals: organizationRenewals,
      hasError: renewalLoadError,
    });
  }, [currentProfile, organizationRenewals, renewalLoadError]);

  const handleContinueRenewal = () => {
    navigate(userRouteMap["organization-renewal"]);
  };

  const handleStartRenewal = async () => {
    if (!currentProfile?.id) return;
    try {
      setStartingRenewal(true);
      const result = await userStartOrGetRenewalDraftInSupabase(currentProfile.id);
      if (result.isExisting) {
        toast({
          title: "Existing renewal in progress",
          description: "Opened your active renewal application.",
        });
      } else {
        toast({
          title: "Renewal draft started",
          description: "Your cycle draft has been initiated successfully.",
        });
      }
      setOrganizationRenewals((prev) => {
        const existingIndex = prev.findIndex((r) => r.id === result.renewal.id);
        if (existingIndex >= 0) {
          const next = [...prev];
          next[existingIndex] = result.renewal;
          return next;
        }
        return [...prev, result.renewal];
      });
      navigate(userRouteMap["organization-renewal"]);
    } catch (err: any) {
      console.error("Failed to start renewal draft:", err);
      toast({
        title: "Unable to start renewal",
        description: err?.message || "An unexpected error occurred while starting your renewal draft.",
        variant: "destructive",
      });
    } finally {
      setStartingRenewal(false);
    }
  };
  useEffect(() => {
    if (!currentProfile) return;
    setInquiryForm((current) => ({
      submitterName: currentProfile.organizationName,
      organizationName: currentProfile.organizationName,
      email: current.email.trim() ? current.email : currentProfile.organizationEmail,
      subject: current.subject,
      description: current.description,
    }));
  }, [currentProfile?.id, currentProfile?.organizationEmail, currentProfile?.organizationName]);
  const profileSummaryRef = useRef<HTMLDivElement>(null);
  const profileEditRef = useRef<HTMLDivElement>(null);
  const profileYpopRef = useRef<HTMLDivElement>(null);
  const profileActivityRef = useRef<HTMLDivElement>(null);

  const initializedYpopBudgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (section === "budget-request") {
      const ypopEntryId = searchParams.get("ypopEntryId");
      if (!ypopEntryId) {
        initializedYpopBudgetIdRef.current = null;
        return;
      }
      if (initializedYpopBudgetIdRef.current === ypopEntryId) {
        return;
      }
      const qualifiedYpopEntry =
        budgetEligibility.eligible &&
        (budgetEligibility.entry?.id === ypopEntryId ||
          state.ypopEntries.some(
            (e) => e.id === ypopEntryId && e.organizationId === currentProfile?.id && e.status === "qualified"
          ))
          ? (state.ypopEntries.find((e) => e.id === ypopEntryId) || budgetEligibility.entry)
          : null;
      if (qualifiedYpopEntry) {
        initializedYpopBudgetIdRef.current = ypopEntryId;
        const blank = createBlankBudgetRequest(currentProfile?.id ?? "", user?.id ?? "");
        setBudgetForm({ ...blank, budgetRequestType: "ypop_incentive", ypopEntryId: qualifiedYpopEntry.id });
        setBudgetFileDraft(null);
        setShowBudgetForm(true);
      }
    } else {
      initializedYpopBudgetIdRef.current = null;
    }
  }, [budgetEligibility, currentProfile?.id, section, searchParams, state.ypopEntries, user?.id]);

  useEffect(() => {
    setBudgetPage(1);
  }, [budgetSearch, budgetStatusFilter, budgetDateRangeFilter, budgetSortOrder, budgetRowsPerPage]);

  useEffect(() => {
    setLiquidationPage(1);
  }, [
    liquidationSearch,
    liquidationStatusFilter,
    liquidationDateRangeFilter,
    liquidationSortOrder,
    liquidationRowsPerPage,
    liquidationHasFileOnly,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsDesktopViewport(event ? event.matches : mediaQuery.matches);
    };
    syncViewport();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }
    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncViewport = (event?: MediaQueryListEvent) => {
      setIsBudgetDesktopViewport(event ? event.matches : mediaQuery.matches);
    };
    syncViewport();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", syncViewport);
      return () => mediaQuery.removeEventListener("change", syncViewport);
    }
    mediaQuery.addListener(syncViewport);
    return () => mediaQuery.removeListener(syncViewport);
  }, []);

  useEffect(() => {
    if (user?.id) {
      setVerifiedBannerDismissed(
        localStorage.getItem(`lydo_verified_dismissed_${user.id}`) === "true"
      );
    }
  }, [user?.id]);

  const dismissVerifiedBanner = () => {
    if (user?.id) {
      localStorage.setItem(`lydo_verified_dismissed_${user.id}`, "true");
    }
    setVerifiedBannerDismissed(true);
  };

  const handleBudgetFileDraftChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;

    if (!file) {
      setBudgetFileDraft(null);
      return;
    }

    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      event.target.value = "";
      setBudgetFileDraft(null);
      toast({
        title: "PDF only",
        description: "Please upload a PDF file for the budget request document.",
        variant: "destructive",
      });
      return;
    }

    setBudgetFileDraft(file);
  };

  const [profileDraft, setProfileDraft] = useState<OrganizationProfile>(
    createOrganizationProfileDraft(currentProfile?.userId ?? user?.id ?? "", currentProfile, {
      organizationName: user?.displayName ?? "",
      organizationEmail: user?.email ?? "",
      contactNumber: user?.profileHints?.contactNumber ?? "",
      district: user?.profileHints?.district ?? "",
      barangay: user?.profileHints?.barangay ?? "",
      isExistingOrganization: user?.profileHints?.isExistingOrganization ?? false,
      organizationIdentifierNumber: user?.profileHints?.organizationIdentifierNumber ?? "",
    }),
  );
  const [isProfileDraftDirty, setIsProfileDraftDirty] = useState(false);
  const lastProfileDraftSourceRef = useRef<string>("");

  useEffect(() => {
    const nextSourceKey = [
      currentProfile?.id ?? "",
      currentProfile?.updatedAt ?? "",
      user?.id ?? "",
      user?.displayName ?? "",
      user?.email ?? "",
      user?.profileHints?.contactNumber ?? "",
      user?.profileHints?.district ?? "",
      user?.profileHints?.barangay ?? "",
      user?.profileHints?.isExistingOrganization ? "1" : "0",
      user?.profileHints?.organizationIdentifierNumber ?? "",
    ].join("|");

    if (nextSourceKey === lastProfileDraftSourceRef.current) return;

    const previousSourceParts = lastProfileDraftSourceRef.current.split("|");
    const previousProfileId = previousSourceParts[0] ?? "";
    const previousUserId = previousSourceParts[2] ?? "";
    const switchedRecord =
      previousProfileId !== (currentProfile?.id ?? "") ||
      previousUserId !== (user?.id ?? "");

    if (!isProfileDraftDirty || switchedRecord) {
      setProfileDraft(
        createOrganizationProfileDraft(currentProfile?.userId ?? user?.id ?? "", currentProfile, {
          organizationName: user?.displayName ?? "",
          organizationEmail: user?.email ?? "",
          contactNumber: user?.profileHints?.contactNumber ?? "",
          district: user?.profileHints?.district ?? "",
          barangay: user?.profileHints?.barangay ?? "",
          isExistingOrganization: user?.profileHints?.isExistingOrganization ?? false,
          organizationIdentifierNumber: user?.profileHints?.organizationIdentifierNumber ?? "",
        }),
      );
      setIsProfileDraftDirty(false);
      lastProfileDraftSourceRef.current = nextSourceKey;
    }
  }, [
    currentProfile?.id,
    currentProfile?.updatedAt,
    user?.displayName,
    user?.email,
    user?.id,
    user?.profileHints?.barangay,
    user?.profileHints?.contactNumber,
    user?.profileHints?.district,
    user?.profileHints?.isExistingOrganization,
    user?.profileHints?.organizationIdentifierNumber,
    isProfileDraftDirty,
  ]);

  useEffect(() => {
    if (!user) return;
    setBudgetForm((current) =>
      current.organizationId === (currentProfile?.id ?? "")
        ? current
        : createBlankBudgetRequest(currentProfile?.id ?? "", user.id),
    );
  }, [currentProfile?.id, user]);



  const profile = createOrganizationProfileDraft(currentProfile?.userId ?? user?.id ?? "", currentProfile, {
    organizationName: user?.displayName ?? "",
    organizationEmail: user?.email ?? "",
    contactNumber: user?.profileHints?.contactNumber ?? "",
    district: user?.profileHints?.district ?? "",
    barangay: user?.profileHints?.barangay ?? "",
    isExistingOrganization: user?.profileHints?.isExistingOrganization ?? false,
    organizationIdentifierNumber: user?.profileHints?.organizationIdentifierNumber ?? "",
  });
  const submission = state.documentSubmissions.find((s) => s.organizationId === (currentProfile?.id ?? "___")) ?? null;
  const isDocumentSubmissionApproved = isApprovedDocumentSubmission(submission);
  const userNotifications = useMemo(
    () => state.notifications.filter((notification) => notification.userId === user?.id),
    [state.notifications, user?.id],
  );
  const unreadNotifications = userNotifications.filter((notification) => !notification.isRead);
  const templateDocuments = useMemo(
    () =>
      [...state.templates]
        .filter(isRegistrationRequirementTemplate)
        .sort((left, right) => (left.sortOrder ?? 0) - (right.sortOrder ?? 0)),
    [state.templates],
  );
  const otherTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((template) => (template.templateActive ?? true) && template.isActive !== false && template.templateScope !== "document_submission")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
  );

  const resolveTemplateCategory = (t: (typeof state.templates)[number]) => {
    const rawCategories = Array.isArray(t.templateCategories) && t.templateCategories.length > 0
      ? t.templateCategories
      : (t as any).template_category && Array.isArray((t as any).template_category) && (t as any).template_category.length > 0
      ? (t as any).template_category
      : [];
    const primaryCategory = rawCategories[0] || deriveTemplateCategory(t.name);
    return formatTemplateCategoryDropdownLabel(primaryCategory);
  };

  const allUserTemplates = useMemo(() => {
    const activeTemplates = state.templates.filter(
      (template) => (template.templateActive ?? true) && template.isActive !== false,
    );

    const seen = new Set<string>();
    const uniqueTemplates: typeof activeTemplates = [];
    for (const t of activeTemplates) {
      const key = t.databaseId || t.id;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueTemplates.push(t);
      }
    }

    uniqueTemplates.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return uniqueTemplates.map((t) => {
      const rawCategories = Array.isArray(t.templateCategories) && t.templateCategories.length > 0
        ? t.templateCategories
        : (t as any).template_category && Array.isArray((t as any).template_category) && (t as any).template_category.length > 0
        ? (t as any).template_category
        : (t as any).category
        ? [(t as any).category]
        : [];

      const effectiveRawCategories = rawCategories.length > 0
        ? rawCategories
        : [deriveTemplateCategory(t.name)];

      const formattedCategories = effectiveRawCategories.map((cat) =>
        formatTemplateCategoryDropdownLabel(cat),
      );

      return {
        id: t.id,
        databaseId: t.databaseId || t.id,
        title: t.name,
        name: t.name,
        description: t.description || t.templateDescription || "",
        fileUrl: t.templateFileUrl,
        fileSize: t.templateFileSize ?? (t as any).fileSize ?? (t as any).file_size ?? (t as any).size ?? null,
        category: formattedCategories[0] || "General",
        categories: formattedCategories,
        rawCategories: effectiveRawCategories,
        templateCategories: effectiveRawCategories,
        isRequired: t.isRequired ?? (t.templateScope === "document_submission"),
        updatedAt: t.templateUploadedAt || (t as any).updatedAt || (t as any).updated_at || null,
        sortOrder: t.sortOrder,
        templateScope: t.templateScope,
      };
    });
  }, [state.templates]);
  const validDocumentTypeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const doc of templateDocuments) {
      if (doc.id) ids.add(doc.id);
      if (doc.databaseId) ids.add(doc.databaseId);
    }
    return ids;
  }, [templateDocuments]);
  const submissionId = submission?.id ?? "";
  const docFiles = state.documentSubmissionFiles.filter(
    (file) => file.submissionId === submissionId && validDocumentTypeIds.has(file.documentTypeId),
  );

  const isUnderReviewSubmissionFile = (file?: SubmissionFile | null) => {
    if (!file) return false;
    const status = file.adminStatus;
    return status === "under_admin_review" || status === "submitted" || status === "ready_for_review" || status === "under_review";
  };

  const uploadableTemplateDocuments = useMemo(
    () =>
      templateDocuments.filter((documentType) => {
        const file = docFiles.find(
          (entry) =>
            entry.documentTypeId === documentType.id ||
            (documentType.databaseId && entry.documentTypeId === documentType.databaseId),
        );
        if (!file) return true;
        if (isApprovedSubmissionFile(file)) return false;
        if (isUnderReviewSubmissionFile(file)) return false;
        return true;
      }),
    [docFiles, templateDocuments],
  );
  const documentFilesByTypeId = useMemo(() => {
    const map = new Map<string, SubmissionFile>();
    for (const file of docFiles) {
      if (file.documentTypeId) {
        map.set(file.documentTypeId, file);
      }
      const matched = templateDocuments.find(
        (t) => t.id === file.documentTypeId || t.databaseId === file.documentTypeId,
      );
      if (matched) {
        if (matched.id) map.set(matched.id, file);
        if (matched.databaseId) map.set(matched.databaseId, file);
      }
    }
    return map;
  }, [docFiles, templateDocuments]);
  const budgetRequests = useMemo(
    () =>
      state.budgetRequests
        .filter((request) => request.organizationId === currentProfile?.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.budgetRequests],
  );
  const inquiryHistory = useMemo(
    () =>
      state.inquiries
        .filter((inquiry) => inquiry.organizationId === currentProfile?.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.inquiries],
  );
  const ypopEventParticipations = useMemo(
    () =>
      state.ypopEventParticipations
        .filter((participation) => participation.organizationId === currentProfile?.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.ypopEventParticipations],
  );
  const ypopEventFilesByParticipationId = useMemo(() => {
    const map = new Map<string, YPOPEventFile[]>();
    state.ypopEventFiles.forEach((file) => {
      const existing = map.get(file.participationId) ?? [];
      existing.push(file);
      map.set(file.participationId, existing);
    });
    return map;
  }, [state.ypopEventFiles]);
  const ypopOrgActivities = useMemo(
    () =>
      state.ypopOrgActivities
        .filter((activity) => activity.organizationId === currentProfile?.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.ypopOrgActivities],
  );
  const ypopOrgActivityFilesByActivityId = useMemo(() => {
    const map = new Map<string, YPOPOrgActivityFile[]>();
    state.ypopOrgActivityFiles.forEach((file) => {
      const existing = map.get(file.orgActivityId) ?? [];
      existing.push(file);
      map.set(file.orgActivityId, existing);
    });
    return map;
  }, [state.ypopOrgActivityFiles]);
  const latestBudget = budgetRequests[0] ?? null;
  const liquidationReports = useMemo(
    () =>
      state.liquidationReports
        .filter(
          (report) =>
            report.organizationId === currentProfile?.id &&
            budgetRequests.some(
              (request) =>
                request.id === report.budgetRequestId && liquidationUnlockedBudgetStatuses.has(request.status),
            ),
        )
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [budgetRequests, currentProfile?.id, state.liquidationReports],
  );
  const latestLiquidation = liquidationReports[0] ?? null;
  const budgetRequestFilesByBudgetId = useMemo(
    () => new Map(state.budgetRequestFiles.map((file) => [file.budgetRequestId, file])),
    [state.budgetRequestFiles],
  );
  const liquidationFilesByReportId = useMemo(() => {
    const map = new Map<string, LiquidationReportFile[]>();
    state.liquidationReportFiles.forEach((file) => {
      const files = map.get(file.liquidationReportId) ?? [];
      files.push(file);
      map.set(file.liquidationReportId, files);
    });
    return map;
  }, [state.liquidationReportFiles]);
  const templatesById = useMemo(
    () => Object.fromEntries(templateDocuments.map((template) => [template.id, template])),
    [templateDocuments],
  );
  const completedDocs = docFiles.filter((file) => file.validationStatus === "correct").length;
  const profilePercent = getReadiness(
    getOrganizationProfileCompletionCount(profile),
    getOrganizationProfileCompletionTarget(profile),
  );
  const profileDraftPercent = getReadiness(
    getOrganizationProfileCompletionCount(profileDraft),
    getOrganizationProfileCompletionTarget(profileDraft),
  );
  const profileComplete = isOrganizationProfileComplete(profile);
  const isDocumentSubmissionLocked = !profileComplete || (templateDocuments.length > 0 && uploadableTemplateDocuments.length === 0);
  const renewalCountdown = useMemo(
    () => getOrganizationRenewalCountdown(currentProfile),
    [currentProfile],
  );
  const registrationPrerequisites = resolveRegistrationPrerequisites({
    profile: currentProfile,
    requiredTemplates: templateDocuments,
    documentFiles: docFiles,
  });
  const budgetWorkflowEligibility = resolveBudgetWorkflowEligibility({
    profile: currentProfile,
    requiredTemplates: templateDocuments,
    documentFiles: docFiles,
    ypopEligibility: budgetEligibility,
  });
  const ypopWorkflowEligibility = resolveYpopWorkflowEligibility({
    profile: currentProfile,
    requiredTemplates: templateDocuments,
    documentFiles: docFiles,
  });
  const liquidationWorkflowEligibility = resolveLiquidationWorkflowEligibility({
    profile: currentProfile,
    requiredTemplates: templateDocuments,
    documentFiles: docFiles,
    budgetRequests,
    hasLiquidation: liquidationReports.length > 0,
  });
  const profileLocation = [profile.district?.trim(), profile.barangay?.trim()].filter(Boolean).join(" · ");
  const documentsPercent = getReadiness(completedDocs, templateDocuments.length);
  const budgetPercent = latestBudget ? getReadiness(approvedBudgetStatuses.has(latestBudget.status) ? 1 : 0, 1) : 0;
  const liquidationPercent = latestLiquidation ? getReadiness(latestLiquidation.status === "completed_liquidated" ? 1 : 0, 1) : 0;
  const documentsAwaitingUploadCount = Math.max(templateDocuments.length - docFiles.length, 0);
  const revisionRequiredFiles = docFiles.filter((file) => file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red");
  const batchSelectedItems = useMemo(() => {
    const droppedSelections = batchDroppedFiles
      .map((entry) => {
        const documentType = templateDocuments.find((template) => template.id === entry.mappedDocumentTypeId);
        if (!documentType || !entry.file) return null;
        return { documentType, file: entry.file, source: "drop" as const, id: entry.id };
      })
      .filter((entry): entry is { documentType: (typeof templateDocuments)[number]; file: File; source: "drop"; id: string } => Boolean(entry));

    return droppedSelections;
  }, [batchDroppedFiles, templateDocuments]);
  const profileActivityLogEntries = useMemo(
    () =>
      state.activityLogs
        .filter((log) => log.organizationId === currentProfile?.id && log.relatedType === "organization_profile")
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.activityLogs],
  );
  const submissionLogs = useMemo(
    () =>
      state.activityLogs
        .filter((log) => log.organizationId === currentProfile?.id)
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.activityLogs],
  );
  const profileRecentYpopEvents = ypopEventParticipations.slice(0, 4);
  const focusProfileTabSection = (
    tab:
      | "overview"
      | "organization-details"
      | "classification"
      | "advocacy"
      | "contacts-socials"
      | "ypop-participation",
  ) => {
    const tabAnchors: Partial<
      Record<
        "overview" | "organization-details" | "classification" | "advocacy" | "contacts-socials" | "ypop-participation",
        RefObject<HTMLDivElement>
      >
    > = {
      overview: profileSummaryRef,
      "organization-details": profileEditRef,
      "ypop-participation": profileYpopRef,
    };

    tabAnchors[tab]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openFile = async (fileUrl: string, downloadName?: string) => {
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
      if (!resolvedUrl) {
        throw new Error("No file is available yet.");
      }

      if (downloadName) {
        await downloadResolvedFile(fileUrl, downloadName);
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

  const downloadResolvedFile = async (fileUrl: string, downloadName: string) => {
    const resolvedUrl = await resolveSupabaseFileUrl(fileUrl);
    if (!resolvedUrl) {
      throw new Error("No file is available yet.");
    }

    const response = await fetch(resolvedUrl);
    if (!response.ok) {
      throw new Error(`Unable to download ${downloadName}.`);
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = downloadName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  };

  const getTemplateDownloadFileName = (template: { templateFileName?: string; templateFileUrl?: string; name: string }) => {
    const storedName = template.templateFileName?.trim();
    if (storedName && storedName.includes(".")) return storedName;

    const urlSource = (template.templateFileUrl || "").split(/[?#]/)[0];
    const urlFileName = urlSource.split("/").pop()?.trim();
    if (urlFileName && urlFileName.includes(".")) return urlFileName;

    const match = urlSource.match(/\.([a-z0-9]{1,8})$/i);
    const ext = match ? match[1] : "";
    const baseName = storedName || template.name;
    return ext ? `${baseName}.${ext}` : baseName;
  };

  const handleDownloadTemplate = async (template: (typeof state.templates)[number]) => {
    if (!template.templateFileUrl) {
      toast({
        title: "Template currently unavailable",
        description: `${template.name} does not have a downloadable template file yet.`,
        variant: "destructive",
      });
      return;
    }

    if (downloadingTemplateId === template.id) return;

    setDownloadingTemplateId(template.id);
    try {
      const downloadName = getTemplateDownloadFileName(template);
      await downloadResolvedFile(template.templateFileUrl, downloadName);
    } catch (error) {
      toast({
        title: "Unable to download template",
        description: error instanceof Error ? error.message : "The template could not be downloaded right now.",
        variant: "destructive",
      });
    } finally {
      setDownloadingTemplateId("");
    }
  };

  const handleDownloadAllTemplates = async () => {
    const missingTemplates = templateDocuments.filter((template) => !template.templateFileUrl);
    if (missingTemplates.length) {
      toast({
        title: "Unable to prepare all templates",
        description: `Missing template: ${missingTemplates[0].name}`,
        variant: "destructive",
      });
      return;
    }

    setDownloadingAllTemplates(true);
    try {
      const zip = new JSZip();
      await Promise.all(
        templateDocuments.map(async (template) => {
          const resolvedUrl = await resolveSupabaseFileUrl(template.templateFileUrl);
          if (!resolvedUrl) {
            throw new Error(`Missing template: ${template.name}`);
          }
          const response = await fetch(resolvedUrl);
          if (!response.ok) {
            throw new Error(`Missing template: ${template.name}`);
          }
          const blob = await response.blob();
          zip.file(getTemplateDownloadFileName(template), blob);
        }),
      );

      const archive = await zip.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = "Y-TRACE-Required-Templates.zip";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      toast({
        title: "Unable to prepare all templates",
        description: error instanceof Error ? error.message : "The ZIP archive could not be generated.",
        variant: "destructive",
      });
    } finally {
      setDownloadingAllTemplates(false);
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
      setPreviewCanInline(
        canInlinePreviewFile(title) ||
        canInlinePreviewFile(fileUrl) ||
        canInlinePreviewFile(resolvedUrl) ||
        resolvedUrl.includes("application/pdf") ||
        fileUrl.toLowerCase().includes("template") ||
        fileUrl.toLowerCase().endsWith(".pdf") ||
        resolvedUrl.toLowerCase().includes(".pdf")
      );
      setPreviewModalOpen(true);
    } catch (error) {
      toast({
        title: "Unable to open preview",
        description: error instanceof Error ? error.message : "The file preview could not be opened right now.",
        variant: "destructive",
      });
    }
  };

  const openAttachedDocumentEditor = async (file: SubmissionFile, documentTypeName: string) => {
    setAttachedDocumentEditor({ file, documentTypeName });
    setAttachedDocumentEditorOpen(true);
    setAttachedDocumentReplacementFile(null);
    setAttachedDocumentMarkedForRemoval(false);
    setAttachedDocumentPreviewUrl("");
    setAttachedDocumentPreviewTitle(file.fileName || documentTypeName);
    setAttachedDocumentPreviewEmptyMessage("Loading preview...");
    setAttachedDocumentPreviewCanInline(false);

    if (!file.fileUrl.trim() || file.fileUrl.startsWith("#")) {
      setAttachedDocumentPreviewEmptyMessage("No uploaded file is available.");
      return;
    }

    try {
      const resolvedUrl = await resolveSupabaseFileUrl(file.fileUrl);
      if (!resolvedUrl) {
        throw new Error("No file is available yet.");
      }

      setAttachedDocumentPreviewUrl(resolvedUrl);
      setAttachedDocumentPreviewEmptyMessage("");
      setAttachedDocumentPreviewCanInline(canInlinePreviewFile(file.fileName) || canInlinePreviewFile(resolvedUrl));
    } catch (error) {
      setAttachedDocumentPreviewUrl("");
      setAttachedDocumentPreviewCanInline(false);
      setAttachedDocumentPreviewEmptyMessage(
        error instanceof Error ? error.message : "The uploaded file preview could not be opened right now.",
      );
    }
  };

  const closeAttachedDocumentEditor = () => {
    setDocumentDetailMode(false);
    setAttachedDocumentEditorOpen(false);
    setAttachedDocumentEditor(null);
    setAttachedDocumentPreviewUrl("");
    setAttachedDocumentPreviewTitle("");
    setAttachedDocumentPreviewEmptyMessage("");
    setAttachedDocumentPreviewCanInline(false);
    setAttachedDocumentReplacementFile(null);
    setAttachedDocumentMarkedForRemoval(false);
    setSavingAttachedDocument(false);
    if (attachedDocumentInputRef.current) {
      attachedDocumentInputRef.current.value = "";
    }
  };

  const removeDocumentById = async (fileId: string, documentTypeName: string) => {
    await removeOrganizationDocumentFromSupabase(fileId);
    const remoteSnapshot = await loadLydoConnectSupabaseState();
    if (remoteSnapshot) {
      mergeRemoteState(remoteSnapshot);
    }
    toast({
      title: "Document removed",
      description: `${documentTypeName} was removed successfully.`,
    });
  };

  const notifyAdmin = (params: {
    title: string;
    message: string;
    relatedType: string;
    relatedId: string;
    organizationId?: string;
  }) => {
    createNotification({
      id: createNotificationId(),
      userId: ADMIN_RECIPIENT_ID,
      organizationId: params.organizationId ?? currentProfile?.id ?? "",
      title: params.title,
      message: params.message,
      type: "user_update",
      relatedType: params.relatedType,
      relatedId: params.relatedId,
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  };

  const resetDocumentScan = () => {
    setPendingDocumentScan(null);
    setConfirmSubmitOpen(false);
    setSubmissionSuccessOpen(false);
  };

  const ensureCompletedOrganizationProfile = () => {
    if (profileComplete) return true;
    setProfileRequiredModalOpen(true);
    return false;
  };

  const getDocumentUploadValidationError = (
    documentTypeId: string,
    file: File | null,
    options?: { ignoreExistingApprovedFile?: boolean },
  ) => {
    if (!file) return "No file was selected.";
    if (isDocumentSubmissionLocked) {
      return "Submitted documents can no longer be changed or replaced until the admin requests a revision.";
    }

    const existingFile = documentFilesByTypeId.get(documentTypeId);
    if (!options?.ignoreExistingApprovedFile && isApprovedSubmissionFile(existingFile)) {
      return "This approved document can no longer be changed or removed.";
    }

    if (!isPdfFile(file)) {
      return "Please upload a PDF file for document submission.";
    }

    return null;
  };

  const suggestDocumentTypeIdForFile = (fileName: string) => {
    const normalized = fileName.toLowerCase().replace(/[^a-z0-9]+/g, " ");
    const matchedTemplate = uploadableTemplateDocuments.find((documentType) => {
      const templateName = documentType.name.toLowerCase().replace(/[^a-z0-9]+/g, " ");
      return normalized.includes(templateName);
    });
    return matchedTemplate?.id ?? "";
  };

  const resetBatchUploadState = () => {
    setBatchUploadConfirmOpen(false);
    setBatchUploadSubmitting(false);
    setBatchUploadSubmitMode("review");
    setBatchDroppedFiles([]);
  };

  const getBatchUploadIssues = () => {
    const issues: string[] = [];
    const mappedDocumentTypeIds = new Set<string>();

    batchSelectedItems.forEach((entry) => {
      const existingFile = documentFilesByTypeId.get(entry.documentType.id);
      if (isUnderReviewSubmissionFile(existingFile)) {
        issues.push(`${entry.documentType.name}: This document is currently under admin review and cannot be re-uploaded.`);
      }
      if (isApprovedSubmissionFile(existingFile)) {
        issues.push(`${entry.documentType.name}: This document is approved and locked.`);
      }
      const validationError = getDocumentUploadValidationError(entry.documentType.id, entry.file);
      if (validationError) {
        issues.push(`${entry.documentType.name}: ${validationError}`);
      }
      if (mappedDocumentTypeIds.has(entry.documentType.id)) {
        issues.push(`${entry.documentType.name}: This document type is already assigned in the current batch.`);
      }
      mappedDocumentTypeIds.add(entry.documentType.id);
    });

    batchDroppedFiles
      .filter((entry) => !entry.mappedDocumentTypeId)
      .forEach((entry) => {
        issues.push(`${entry.file.name}: Select a document type before continuing.`);
      });

    return issues;
  };

  const batchAssignmentCounts = useMemo(() => {
    const rawCount = batchDroppedFiles.length;
    const assignedCount = batchDroppedFiles.filter((entry) => entry.mappedDocumentTypeId).length;
    const duplicateTypeCount = batchDroppedFiles.reduce((count, entry, index, array) => {
      if (!entry.mappedDocumentTypeId) return count;
      return array.findIndex((item) => item.mappedDocumentTypeId === entry.mappedDocumentTypeId) !== index ? count + 1 : count;
    }, 0);
    const validReadyCount = batchDroppedFiles.filter((entry) => {
      if (!entry.mappedDocumentTypeId) return false;
      const validationError = getDocumentUploadValidationError(entry.mappedDocumentTypeId, entry.file);
      const hasDuplicate = batchDroppedFiles.some(
        (other) => other.id !== entry.id && other.mappedDocumentTypeId && other.mappedDocumentTypeId === entry.mappedDocumentTypeId,
      );
      return !validationError && !hasDuplicate;
    }).length;
    return {
      rawCount,
      assignedCount,
      validReadyCount,
      unassignedCount: rawCount - assignedCount,
      duplicateTypeCount,
    };
  }, [batchDroppedFiles]);

  const openBatchUploadWorkspace = () => {
    if (!ensureCompletedOrganizationProfile()) return;
    if (isDocumentSubmissionLocked) {
      toast({
        title: "Submission locked",
        description: "Submitted documents can no longer be changed or replaced until the admin requests a revision.",
        variant: "destructive",
      });
      return;
    }
    setBatchUploadResult(null);
    setBatchUploadOpen(true);
  };

  const handleBatchDroppedFiles = (files: FileList | File[] | null | undefined) => {
    const normalizedFiles = Array.from(files ?? []).filter(Boolean);
    if (!normalizedFiles.length) return;

    setBatchDroppedFiles((current) => [
      ...current,
      ...normalizedFiles.map((file) => ({
        id: createBatchUploadDraftId(),
        file,
        mappedDocumentTypeId: suggestDocumentTypeIdForFile(file.name),
      })),
    ]);
  };

  const handleSubmitBatchUpload = async (submitMode: "draft" | "review") => {
    if (!batchSelectedItems.length) {
      toast({
        title: "No files selected",
        description: "Select at least one required document before continuing.",
        variant: "destructive",
      });
      return;
    }

    const issues = getBatchUploadIssues();
    if (issues.length) {
      toast({
        title: "Fix the batch selection first",
        description: issues[0],
        variant: "destructive",
      });
      return;
    }

    setBatchUploadSubmitMode(submitMode);
    setBatchUploadConfirmOpen(true);
  };

  const confirmBatchUpload = async () => {
    if (!batchSelectedItems.length) return;

    setBatchUploadSubmitting(true);
    try {
      const result = await submitOrganizationDocumentsBatchToSupabase({
        submitMode: batchUploadSubmitMode,
        documents: batchSelectedItems.map((entry) => ({
          documentTypeId: entry.documentType.databaseId || entry.documentType.id,
          documentTypeName: entry.documentType.name,
          file: entry.file,
          validationStatus: "correct",
        })),
      });

      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }

      if (result.successCount > 0 && batchUploadSubmitMode === "review") {
        notifyAdmin({
          title: "Batch document submission",
          message: `${result.successCount} document${result.successCount === 1 ? "" : "s"} were submitted by ${profile.organizationName || "an organization"}.`,
          relatedType: "document_submission",
          relatedId: submission?.id ?? result.results.find((entry) => entry.submissionId)?.submissionId ?? "",
          organizationId: profile.id,
        });
      }

      setBatchUploadResult({
        submitMode: batchUploadSubmitMode,
        successCount: result.successCount,
        failureCount: result.failureCount,
        results: result.results.map((entry) => ({
          documentTypeName: entry.documentTypeName,
          fileName: entry.fileName,
          success: entry.success,
          error: entry.error,
        })),
      });

      setBatchUploadConfirmOpen(false);
      setBatchUploadOpen(false);
      if (result.successCount > 0) {
        resetBatchUploadState();
      }
    } catch (error) {
      toast({
        title: "Batch upload failed",
        description: error instanceof Error ? error.message : "The selected documents could not be processed.",
        variant: "destructive",
      });
    } finally {
      setBatchUploadSubmitting(false);
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    const targetNotification = userNotifications.find((notification) => notification.id === notificationId);
    if (!targetNotification || targetNotification.isRead) return;

    markNotificationRead(notificationId);

    try {
      await markNotificationReadInSupabase(notificationId);
    } catch (error) {
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }
      toast({
        title: "Notification update failed",
        description: error instanceof Error ? error.message : "The notification could not be marked as read.",
        variant: "destructive",
      });
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    if (!userNotifications.some((notification) => !notification.isRead)) return;

    markAllNotificationsRead();

    try {
      await markAllNotificationsReadInSupabase();
    } catch (error) {
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }
      toast({
        title: "Notification update failed",
        description: error instanceof Error ? error.message : "Notifications could not be marked as read.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (documentTypeName: string, file: File | null) => {
    if (!file) return;
    if (!ensureCompletedOrganizationProfile()) return;
    if (isDocumentSubmissionLocked) {
      toast({
        title: "Submission locked",
        description: "Submitted documents can no longer be changed or replaced until the admin requests a revision.",
        variant: "destructive",
      });
      return;
    }

    const localDocumentType = templateDocuments.find((documentType) => documentType.name === documentTypeName);
    if (!localDocumentType) return;
    const existingFile = docFiles.find(
      (entry) =>
        entry.documentTypeId === localDocumentType.id ||
        (localDocumentType.databaseId && entry.documentTypeId === localDocumentType.databaseId),
    );
    if (isApprovedSubmissionFile(existingFile)) {
      toast({
        title: "Document locked",
        description: "This approved document can no longer be changed or removed.",
        variant: "destructive",
      });
      return;
    }

    const validationError = getDocumentUploadValidationError(localDocumentType.id, file, {
      ignoreExistingApprovedFile: true,
    });
    if (validationError) {
      toast({
        title: "Unsupported file type",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setScanningDocumentId(localDocumentType.id);
    try {
      setPendingDocumentScan({
        documentTypeId: localDocumentType.databaseId || localDocumentType.id,
        documentTypeName,
        file,
      });
      setConfirmSubmitOpen(true);
      setSubmissionSuccessOpen(false);
    } finally {
      setScanningDocumentId(null);
    }
  };

  const submitScannedDocument = async () => {
    if (!pendingDocumentScan || !user) return;
    if (!ensureCompletedOrganizationProfile()) return;

    setSubmittingDocumentId(pendingDocumentScan.documentTypeId);

    try {
      const submissionResult = await submitOrganizationDocumentToSupabase({
        documentTypeId: pendingDocumentScan.documentTypeId,
        documentTypeName: pendingDocumentScan.documentTypeName,
        file: pendingDocumentScan.file,
        validationStatus: "correct",
      });

      updateDocumentFile(submissionResult.file.id, submissionResult.file);
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }
      notifyAdmin({
        title: "New document submission",
        message: `${pendingDocumentScan.documentTypeName} was submitted by ${profile.organizationName || "an organization"}.`,
        relatedType: "document_submission",
        relatedId: submissionResult.submissionId,
        organizationId: profile.id,
      });

      setConfirmSubmitOpen(false);
      setSubmissionSuccessOpen(true);
      toast({
        title: "Document submitted",
        description: "Your document has been submitted for admin approval.",
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "The document could not be submitted.",
        variant: "destructive",
      });
    } finally {
      setSubmittingDocumentId(null);
    }
  };

  const confirmRemoveDocument = async () => {
    if (!pendingDocumentRemoval) return;
    if (isDocumentSubmissionLocked) {
      toast({
        title: "Submission locked",
        description: "Submitted documents can no longer be removed until the admin requests a revision.",
        variant: "destructive",
      });
      setPendingDocumentRemoval(null);
      return;
    }
    const targetFile = docFiles.find((entry) => entry.id === pendingDocumentRemoval.fileId);
    if (isApprovedSubmissionFile(targetFile)) {
      toast({
        title: "Document locked",
        description: "This approved document can no longer be removed.",
        variant: "destructive",
      });
      setPendingDocumentRemoval(null);
      return;
    }

    setRemovingDocumentId(pendingDocumentRemoval.fileId);
    try {
      await removeDocumentById(pendingDocumentRemoval.fileId, pendingDocumentRemoval.documentTypeName);
      setPendingDocumentRemoval(null);
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "The uploaded document could not be removed right now.",
        variant: "destructive",
      });
    } finally {
      setRemovingDocumentId(null);
    }
  };

  const saveAttachedDocumentChanges = async () => {
    if (!attachedDocumentEditor) return;
    if (isDocumentSubmissionLocked) {
      toast({
        title: "Submission locked",
        description: "Submitted documents can no longer be changed or removed until the admin requests a revision.",
        variant: "destructive",
      });
      closeAttachedDocumentEditor();
      return;
    }
    if (isApprovedSubmissionFile(attachedDocumentEditor.file)) {
      toast({
        title: "Document locked",
        description: "This approved document can no longer be changed or removed.",
        variant: "destructive",
      });
      closeAttachedDocumentEditor();
      return;
    }

    if (attachedDocumentMarkedForRemoval) {
      setSavingAttachedDocument(true);
      try {
        await removeDocumentById(attachedDocumentEditor.file.id, attachedDocumentEditor.documentTypeName);
        closeAttachedDocumentEditor();
      } catch (error) {
        toast({
          title: "Remove failed",
          description: error instanceof Error ? error.message : "The uploaded document could not be removed right now.",
          variant: "destructive",
        });
      } finally {
        setSavingAttachedDocument(false);
      }
      return;
    }

    if (!attachedDocumentReplacementFile) {
      closeAttachedDocumentEditor();
      return;
    }

    setSavingAttachedDocument(true);
    try {
      await handleDocumentUpload(attachedDocumentEditor.documentTypeName, attachedDocumentReplacementFile);
      closeAttachedDocumentEditor();
    } catch (error) {
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "The uploaded document could not be updated right now.",
        variant: "destructive",
      });
    } finally {
      setSavingAttachedDocument(false);
    }
  };

  const handleProfileFieldChange = <K extends keyof OrganizationProfile>(field: K, value: OrganizationProfile[K]) => {
    setIsProfileDraftDirty(true);
    setProfileDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleAdvocacy = (advocacy: OrganizationProfile["advocacies"][number]) => {
    setIsProfileDraftDirty(true);
    setProfileDraft((current) => ({
      ...current,
      advocacies: current.advocacies.includes(advocacy)
        ? current.advocacies.filter((item) => item !== advocacy)
        : [...current.advocacies, advocacy],
    }));
  };

  const saveOrganizationProfile = async () => {
    if (!user) return;

    const trimmedProfile: OrganizationProfile = {
      ...profileDraft,
      userId: user.id,
      organizationName: profileDraft.organizationName.trim(),
      organizationEmail: profileDraft.organizationEmail.trim(),
      contactNumber: profileDraft.contactNumber.trim(),
      district: profileDraft.district.trim(),
      barangay: profileDraft.barangay.trim(),
      isExistingOrganization: profileDraft.isExistingOrganization,
      organizationIdentifierNumber: profileDraft.organizationIdentifierNumber.trim(),
      majorClassification: profileDraft.majorClassification,
      subClassification: profileDraft.subClassification,
      advocacies: [...profileDraft.advocacies],
      adviserName: profileDraft.adviserName.trim(),
      representativeName: profileDraft.representativeName.trim(),
      address: profileDraft.address.trim(),
      facebookPageUrl: profileDraft.facebookPageUrl.trim(),
      profileStatus: "pending_review",
      verifiedAt: "",
      internalNotes: profileDraft.internalNotes.trim(),
      updatedAt: new Date().toISOString(),
      createdAt: currentProfile?.createdAt ?? profileDraft.createdAt ?? new Date().toISOString(),
    };

    if (
      !trimmedProfile.organizationName ||
      !trimmedProfile.organizationEmail ||
      !trimmedProfile.contactNumber ||
      !trimmedProfile.district ||
      !trimmedProfile.barangay ||
      (trimmedProfile.isExistingOrganization && !trimmedProfile.organizationIdentifierNumber) ||
      !trimmedProfile.majorClassification ||
      !trimmedProfile.subClassification ||
      trimmedProfile.advocacies.length === 0
    ) {
      setProfileEditorOpenSections((current) => Array.from(new Set([...current, "basic-information", "location-classification", "advocacy-focus-areas"])));
      const missingEditable = getMissingEditableProfileRequirements(trimmedProfile);
      toast({
        title: "Complete your organization profile",
        description:
          missingEditable.length > 0
            ? `Your organization profile is not yet complete. Please complete the remaining editable requirements: ${missingEditable.join(", ")}.`
            : "Your organization profile is missing required information. Please complete all required sections before continuing.",
        variant: "destructive",
      });
      return;
    }

    if (!organizationEmailPattern.test(trimmedProfile.organizationEmail)) {
      setProfileEditorOpenSections((current) => Array.from(new Set([...current, "basic-information"])));
      toast({
        title: "Invalid organization email",
        description: "Please enter a valid email address for the organization.",
        variant: "destructive",
      });
      return;
    }

    if (!philippineContactNumberPattern.test(trimmedProfile.contactNumber)) {
      setProfileEditorOpenSections((current) => Array.from(new Set([...current, "basic-information"])));
      toast({
        title: "Invalid contact number",
        description: "Please enter an 11-digit Philippine mobile number starting with 09.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedProfile.representativeName && !isValidPersonName(trimmedProfile.representativeName)) {
      setProfileEditorOpenSections((current) => Array.from(new Set([...current, "leadership"])));
      toast({
        title: "Invalid Representative Name",
        description: "Representative name must contain only letters, spaces, hyphens (-), apostrophes ('), and periods (.). Numbers and special symbols are not allowed.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedProfile.adviserName && !isValidPersonName(trimmedProfile.adviserName)) {
      setProfileEditorOpenSections((current) => Array.from(new Set([...current, "leadership"])));
      toast({
        title: "Invalid Adviser Name",
        description: "Adviser name must contain only letters, spaces, hyphens (-), apostrophes ('), and periods (.). Numbers and special symbols are not allowed.",
        variant: "destructive",
      });
      return;
    }

    if (trimmedProfile.facebookPageUrl && !isValidFacebookUrl(trimmedProfile.facebookPageUrl)) {
      setProfileEditorOpenSections((current) => Array.from(new Set([...current, "contact-social"])));
      toast({
        title: "Invalid Facebook URL",
        description: "Please enter a valid Facebook profile or page URL starting with https://facebook.com, https://www.facebook.com, or https://fb.com.",
        variant: "destructive",
      });
      return;
    }

    if (!trimmedProfile.isExistingOrganization && !trimmedProfile.organizationIdentifierNumber) {
      trimmedProfile.organizationIdentifierNumber = "";
    }

    setSavingProfile(true);
    try {
      if (
        currentProfile?.registrationType === "existing_urn" &&
        (currentProfile.urnReviewStatus === "needs_correction" || currentProfile.urnReviewStatus === "rejected") &&
        trimmedProfile.organizationIdentifierNumber !== currentProfile.urn
      ) {
        await resubmitOrganizationUrnInSupabase(trimmedProfile.organizationIdentifierNumber);
      }
      const savedProfile = await upsertOrganizationProfileInSupabase(trimmedProfile);
      upsertOrganizationProfile(savedProfile);
      setProfileDraft(savedProfile);
      setIsProfileDraftDirty(false);
      notifyAdmin({
        title: savedProfile.isExistingOrganization ? "Existing Organization profile updated" : "Organization profile updated",
        message: savedProfile.isExistingOrganization
          ? `${savedProfile.organizationName} updated its profile and submitted an existing organization identifier for admin verification.`
          : `${savedProfile.organizationName} updated its profile and sent it for admin review.`,
        relatedType: "organization_profile",
        relatedId: savedProfile.id,
        organizationId: savedProfile.id,
      });

      toast({
        title: "Profile saved",
        description: "Your organization profile has been updated and sent for admin review.",
      });
    } catch (error) {
      const userFacingError = mapOrganizationProfileError(error, "The organization profile could not be saved.");
      toast({
        title: /urn/i.test(userFacingError) ? "URN already registered" : "Save failed",
        description: userFacingError,
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const resetBudgetForm = () => {
    const blank = createBlankBudgetRequest(currentProfile?.id ?? "", user?.id ?? "");
    if (budgetEligibility.eligible && budgetEligibility.entry) {
      setBudgetForm({
        ...blank,
        budgetRequestType: "ypop_incentive",
        ypopEntryId: budgetEligibility.entry.id,
      });
    } else {
      setBudgetForm(blank);
    }
    setBudgetFileDraft(null);
  };

  const startEditingBudgetRequest = (request: BudgetRequest | null) => {
    if (!request) {
      resetBudgetForm();
      return;
    }

    if (approvedBudgetStatuses.has(request.status)) {
      toast({
        title: "Editing locked",
        description: "Approved budget requests for FTF submission can no longer be edited.",
        variant: "destructive",
      });
      return;
    }

    setBudgetForm({ ...request });
    setBudgetFileDraft(null);
  };

  const saveBudgetRequest = async (status: BudgetRequest["status"] = budgetForm.status) => {
    if (!user || !currentProfile) {
      toast({
        title: "Complete your organization profile first",
        description: "Budget requests need an organization profile before they can be saved.",
        variant: "destructive",
      });
      return;
    }

    const existingBudgetRequest = budgetRequests.find((request) => request.id === budgetForm.id) ?? null;
    if (!existingBudgetRequest && !budgetWorkflowEligibility.eligible) {
      toast({
        title: "Complete eligibility requirements first",
        description: "Registration verification, required documents or URN verification, and active YPOP qualification are required before creating a budget request.",
        variant: "destructive",
      });
      return;
    }
    const qualifiedYpopEntry =
      budgetForm.ypopEntryId &&
      budgetEligibility.eligible &&
      (budgetEligibility.entry?.id === budgetForm.ypopEntryId ||
        state.ypopEntries.some(
          (e) => e.id === budgetForm.ypopEntryId && e.organizationId === currentProfile.id && e.status === "qualified"
        ))
        ? (state.ypopEntries.find((e) => e.id === budgetForm.ypopEntryId) || budgetEligibility.entry)
        : null;
    if (!existingBudgetRequest && (budgetForm.budgetRequestType !== "ypop_incentive" || !qualifiedYpopEntry)) {
      toast({
        title: "YPOP qualification required",
        description: "New budget requests can only be created from a qualified YPOP incentive.",
        variant: "destructive",
      });
      return;
    }
    if (existingBudgetRequest && approvedBudgetStatuses.has(existingBudgetRequest.status)) {
      toast({
        title: "Editing locked",
        description: "Approved budget requests for FTF submission can no longer be modified.",
        variant: "destructive",
      });
      return;
    }

    const nextBudgetRequest: BudgetRequest = {
      ...budgetForm,
      organizationId: currentProfile.id,
      submittedBy: user.id,
      fiscalYear: budgetForm.fiscalYear || new Date().getFullYear(),
      activityTitle: budgetForm.activityTitle.trim(),
      activityDescription: budgetForm.activityDescription.trim(),
      activityDate: budgetForm.activityDate,
      venue: budgetForm.venue.trim(),
      requestedAmount: Number(budgetForm.requestedAmount || 0),
      approvedAmount: Number(budgetForm.approvedAmount || 0),
      releasedAmount: Number(budgetForm.releasedAmount || 0),
      releaseDate: budgetForm.releaseDate,
      purposeCategory: budgetForm.purposeCategory.trim(),
      status,
      remarks: budgetForm.remarks.trim(),
      goSignalAt: budgetForm.goSignalAt,
      hardCopySubmittedAt: budgetForm.hardCopySubmittedAt,
      updatedAt: new Date().toISOString(),
      createdAt: budgetForm.createdAt || new Date().toISOString(),
    };

    if (
      !nextBudgetRequest.activityTitle ||
      !nextBudgetRequest.activityDescription ||
      !nextBudgetRequest.activityDate ||
      !nextBudgetRequest.venue ||
      nextBudgetRequest.requestedAmount <= 0 ||
      !nextBudgetRequest.purposeCategory ||
      !nextBudgetRequest.remarks.trim()
    ) {
      toast({
        title: "Complete the budget form",
        description:
          "Activity title, description, proposed date, venue, requested amount, purpose/category, and remarks are required.",
        variant: "destructive",
      });
      return;
    }

    if (!Number.isInteger(nextBudgetRequest.requestedAmount) || nextBudgetRequest.requestedAmount % 1 !== 0) {
      toast({
        title: "Whole peso amount required",
        description: "Requested amount must be a whole peso number without decimals.",
        variant: "destructive",
      });
      return;
    }

    const existingBudgetFile = budgetRequestFilesByBudgetId.get(nextBudgetRequest.id);
    if (!budgetFileDraft && !existingBudgetFile) {
      toast({
        title: "Attach the required document",
        description: "Please upload the detailed project proposal before saving the request.",
        variant: "destructive",
      });
      return;
    }

    if (budgetFileDraft && budgetFileDraft.type !== "application/pdf" && !/\.pdf$/i.test(budgetFileDraft.name)) {
      toast({
        title: "PDF only",
        description: "Please upload a PDF file for the budget request document.",
        variant: "destructive",
      });
      return;
    }

    setSavingBudgetRequest(true);
    try {
      const isExisting = budgetRequests.some((request) => request.id === nextBudgetRequest.id);
      const file = budgetFileDraft;

      if (isExisting) {
        await updateBudgetRequestInSupabase(nextBudgetRequest.id, nextBudgetRequest);
        if (file) {
          await uploadBudgetRequestFileToSupabase(nextBudgetRequest.id, file);
        }
      } else {
        await createBudgetRequestInSupabase({
          budgetRequest: nextBudgetRequest,
          file,
        });
      }

      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }
      resetBudgetForm();
      setShowBudgetForm(false);
      toast({
        title: isExisting ? "Budget request updated" : "Budget request saved",
        description:
          status === "submitted"
            ? "The budget request is now ready for admin review."
            : "The budget request has been saved as a draft.",
      });
    } catch (error) {
      toast({
        title: "Unable to save budget request",
        description: error instanceof Error ? error.message : "The budget request could not be saved right now.",
        variant: "destructive",
      });
    } finally {
      setSavingBudgetRequest(false);
    }
  };

  const handleReplaceBudgetFile = async (budgetRequestId: string, file: File) => {
    if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) {
      toast({
        title: "PDF only",
        description: "Please upload a PDF file for the revised budget proposal.",
        variant: "destructive",
      });
      return;
    }

    try {
      // 1. Upload/replace proposal file in Supabase storage & budget_request_files table
      await uploadBudgetRequestFileToSupabase(budgetRequestId, file);

      // 2. Update parent budget request: status = "under_review", clear active adminRemarks, append revision history
      const existing = budgetRequests.find((req) => req.id === budgetRequestId);
      const now = new Date().toISOString();
      const existingHistory = existing?.revisionHistory ?? [];
      const updatedHistory = [
        ...existingHistory,
        {
          action: "under_review",
          adminRemarks: "",
          changedAt: now,
        },
      ];

      await updateBudgetRequestInSupabase(budgetRequestId, {
        status: "under_review",
        adminRemarks: "",
        revisionHistory: updatedHistory,
      });

      // 3. Refresh and merge remote state using the existing Y-TRACE synchronization mechanism
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }

      // 4. Success toast
      toast({
        title: "Revised proposal uploaded",
        description: "Revised proposal uploaded. The admin will review your updated document.",
      });
    } catch (error) {
      console.error("Failed to replace budget request proposal file:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload revised proposal. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDeleteBudgetRequest = (request: BudgetRequest) => {
    if (approvedBudgetStatuses.has(request.status)) {
      toast({
        title: "Deletion locked",
        description: "Approved budget requests for FTF submission can no longer be deleted.",
        variant: "destructive",
      });
      return;
    }

    setPendingBudgetDelete(request);
  };

  const confirmDeleteBudgetRequest = async () => {
    const request = pendingBudgetDelete;
    if (!request) return;

    if (approvedBudgetStatuses.has(request.status)) {
      setPendingBudgetDelete(null);
      toast({
        title: "Deletion locked",
        description: "Approved budget requests for FTF submission can no longer be deleted.",
        variant: "destructive",
      });
      return;
    }

    setPendingBudgetDelete(null);

    try {
      await deleteBudgetRequestInSupabase(request.id);
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }
      if (budgetForm.id === request.id) {
        resetBudgetForm();
      }
      toast({
        title: "Budget request deleted",
        description: "The request and its attached files were removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "The budget request could not be deleted right now.",
        variant: "destructive",
      });
    }
  };

  const handleLiquidationFileUpload = async (report: LiquidationReport, fileList: FileList | null) => {
    if (!fileList?.length) return;

    try {
      const selectedFile = fileList[0];
      const uploadError = await validatePdfUpload(selectedFile);
      if (uploadError) {
        toast({
          title: "PDF required",
          description: uploadError,
          variant: "destructive",
        });
        return;
      }

      const canEditSubmission = ["pending_activity_completion", "not_started", "draft", "needs_revision", "overdue", "rejected_red"].includes(report.status);
      if (!canEditSubmission) {
        toast({
          title: "Submission locked",
          description: "Files cannot be uploaded, replaced, or removed while this submission is under review.",
          variant: "destructive",
        });
        return;
      }

      // Stage file locally in draft state. DO NOT upload to Storage or mutate Supabase records yet.
      setLiquidationFileDraftByReportId((prev) => ({
        ...prev,
        [report.id]: selectedFile,
      }));

      toast({
        title: "File staged for review",
        description: "Preview your document and click Submit for Review when ready.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "The liquidation files could not be staged.",
        variant: "destructive",
      });
    }
  };

  const handleClearLiquidationFileDraft = (reportId: string) => {
    setLiquidationFileDraftByReportId((prev) => {
      if (!prev[reportId]) return prev;
      const next = { ...prev };
      delete next[reportId];
      return next;
    });
  };

  const handleDeleteLiquidationFile = async (file: LiquidationReportFile) => {
    const report = liquidationReports.find((entry) => entry.id === file.liquidationReportId);
    const canEditSubmission = report && ["pending_activity_completion", "not_started", "draft", "needs_revision", "overdue", "rejected_red"].includes(report.status);
    if (!canEditSubmission) {
      toast({
        title: "Submission locked",
        description: "Files cannot be removed while this submission is under review.",
        variant: "destructive",
      });
      return;
    }

    try {
      await deleteLiquidationReportFileInSupabase(file.id, file.fileUrl);
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }

      toast({
        title: "Liquidation file removed",
        description: "The selected liquidation attachment was removed successfully.",
      });
    } catch (error) {
      toast({
        title: "Remove failed",
        description: error instanceof Error ? error.message : "The liquidation file could not be removed.",
        variant: "destructive",
      });
    }
  };

  const requestDeleteConfirmation = (config: {
    title: string;
    description: string;
    confirmLabel?: string;
    action: () => Promise<void> | void;
  }) => {
    setPendingDeleteConfirmation(config);
  };

  const confirmPendingDelete = async () => {
    const pending = pendingDeleteConfirmation;
    if (!pending) return;

    setProcessingDeleteConfirmation(true);
    try {
      await pending.action();
      setPendingDeleteConfirmation(null);
    } finally {
      setProcessingDeleteConfirmation(false);
    }
  };

  const handleSubmitLiquidation = async (report: LiquidationReport) => {
    const canEditSubmission = ["pending_activity_completion", "not_started", "draft", "needs_revision", "overdue", "rejected_red"].includes(report.status);
    if (!canEditSubmission) {
      toast({
        title: "Submission locked",
        description: "This liquidation report is currently under review and cannot be modified.",
        variant: "destructive",
      });
      return;
    }

    const stagedFile = liquidationFileDraftByReportId[report.id];
    const existingFiles = liquidationFilesByReportId.get(report.id) ?? [];
    const isNeedsRevision = report.status === "needs_revision" || report.status === "rejected_red";

    if (!stagedFile && existingFiles.length === 0) {
      toast({
        title: isNeedsRevision ? "Attachment required for resubmission" : "Attachment required",
        description: "Please upload a liquidation file before submitting this report.",
        variant: "destructive",
      });
      return;
    }

    if (isNeedsRevision && !stagedFile) {
      toast({
        title: "Replacement document required",
        description: "Please select a corrected liquidation PDF report before resubmitting.",
        variant: "destructive",
      });
      return;
    }

    if (stagedFile) {
      const uploadError = await validatePdfUpload(stagedFile);
      if (uploadError) {
        toast({
          title: "PDF required",
          description: uploadError,
          variant: "destructive",
        });
        return;
      }
    }

    setSubmittingLiquidationId(report.id);
    try {
      if (stagedFile) {
        if (existingFiles.length > 0) {
          for (const existingFile of existingFiles) {
            await deleteLiquidationReportFileInSupabase(existingFile.id, existingFile.fileUrl);
          }
        }

        await createLiquidationReportFileInSupabase({
          liquidationReportId: report.id,
          file: stagedFile,
        });
      }

      await updateLiquidationReportInSupabase(report.id, { status: "submitted" });
      setLiquidationNotesByReportId((prev) => {
        const next = { ...prev };
        delete next[report.id];
        return next;
      });
      setLiquidationFileDraftByReportId((prev) => {
        const next = { ...prev };
        delete next[report.id];
        return next;
      });

      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }

      toast({
        title: isNeedsRevision ? "Liquidation resubmitted" : "Liquidation submitted",
        description: "Your documents have been submitted. The admin will review them shortly.",
      });
    } catch (error) {
      toast({
        title: "Submit failed",
        description: error instanceof Error ? error.message : "Something went wrong while submitting the liquidation report.",
        variant: "destructive",
      });
    } finally {
      setSubmittingLiquidationId(null);
    }
  };

  const handleSubmitInquiry = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!currentProfile) {
      toast({
        title: "Profile required",
        description: "Please save your organization profile before submitting an inquiry.",
        variant: "destructive",
      });
      return;
    }

    const organizationName = (currentProfile.organizationName || inquiryForm.organizationName || "").trim();
    const submitterName = (currentProfile.organizationName || inquiryForm.submitterName || organizationName).trim();
    const email = inquiryForm.email.trim();
    const subject = inquiryForm.subject.trim();
    const description = inquiryForm.description.trim();

    if (!organizationName || !email || !subject || !description) {
      toast({
        title: "Missing details",
        description: "Please complete the email, subject, and description fields.",
        variant: "destructive",
      });
      return;
    }

    setConfirmInquirySubmitOpen(false);
    setSavingInquiry(true);
    try {
      const createdInquiry = await createInquiryInSupabase({
        submitterName,
        organizationName,
        email,
        subject,
        description,
      });
      createInquiry(createdInquiry);
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) mergeRemoteState(remoteSnapshot);
      setInquiryForm({
        submitterName: currentProfile.organizationName,
        organizationName: currentProfile.organizationName,
        email: currentProfile.organizationEmail,
        subject: "",
        description: "",
      });
      toast({
        title: "Inquiry sent",
        description: "Your message has been forwarded to the admin dashboard.",
      });
    } catch (error) {
      toast({
        title: "Inquiry failed",
        description: error instanceof Error ? error.message : "The inquiry could not be submitted.",
        variant: "destructive",
      });
      throw error;
    } finally {
      setSavingInquiry(false);
    }
  };

  const handleConfirmInquirySubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    return handleSubmitInquiry(e);
  };

  const openBudgetRecentActivityModal = (request: BudgetRequest) => {
    const history = request.revisionHistory ?? [];
    const entries = history.length > 0
      ? [...history]
          .filter((entry) => entry.changedAt)
          .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime())
      : [
          {
            action: request.status,
            adminRemarks: request.adminRemarks?.trim() || "",
            changedAt: request.updatedAt || request.createdAt || new Date().toISOString(),
          },
        ];

    setBudgetRecentActivityModal({
      title: request.activityTitle || "Budget Request Activity",
      entries,
    });
  };

  const openLiquidationRecentActivityModal = (report: LiquidationReport) => {
    const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
    const entries = [...(report.revisionHistory ?? [])]
      .filter((entry) => entry.changedAt)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

    setLiquidationRecentActivityModal({
      title: relatedBudget?.activityTitle || "Liquidation Report Activity",
      entries,
    });
  };

  const activeContent = useMemo(() => {
    switch (section) {
      case "dashboard": {
        const isVerified = profile.profileStatus === "verified";
        const isProfileSaved = profile.profileStatus !== "incomplete";
        const hasSubmittedDocuments = submission !== null && submission.status !== "draft";
        const stepsCompleted = (isProfileSaved ? 1 : 0) + (hasSubmittedDocuments ? 1 : 0);
        const pendingDocumentIssues = docFiles.filter((file) => file.validationStatus !== "correct");
        const approvedDashboardDocuments = docFiles.filter((file) => file.adminStatus === "approved" || file.adminStatus === "approved_green").length;
        const dashboardDocumentPercent = getReadiness(approvedDashboardDocuments, templateDocuments.length);
        const dashboardDocumentHelper = templateDocuments.length > 0
          ? `${approvedDashboardDocuments} of ${templateDocuments.length} approved`
          : "No requirements";
        const budgetMetrics = computeBudgetWorkflowMetrics(budgetRequests);
        const budgetPercent = budgetMetrics.completionPercent;
        const budgetOverviewLabel = budgetMetrics.overviewLabel;

        const liquidationMetrics = computeLiquidationWorkflowMetrics(liquidationReports);
        const liquidationPercent = liquidationMetrics.completionPercent;
        const liquidationOverviewLabel = liquidationMetrics.overviewLabel;
        const dashboardTasks: Array<{
          key: string;
          title: string;
          description: string;
          ctaLabel?: string;
          onClick?: () => void;
          icon: typeof User;
          tone: string;
        }> = [];

        if (!isProfileSaved) {
          dashboardTasks.push({
            key: "profile",
            title: "Complete your organization profile",
            description: "Fill in your organization details first so the rest of the compliance workflow can unlock properly.",
            ctaLabel: "Open Profile",
            onClick: () => navigate(userRouteMap["organization-profile"]),
            icon: User,
            tone: "bg-primary/10 text-primary",
          });
        }

        if (isUrnRegistration(currentProfile)) {
          dashboardTasks.push({
            key: "urn-review",
            title: currentProfile!.urnReviewStatus === "verified" ? "Registration verified through URN" : currentProfile!.urnReviewStatus === "needs_correction" ? "URN needs correction" : currentProfile!.urnReviewStatus === "rejected" ? "Review URN decision" : "URN verification is pending",
            description: currentProfile!.urnAdminRemarks || "LYDO / PCYDO is checking your Unique Registration Number against its official registration record.",
            ctaLabel: currentProfile!.urnReviewStatus === "needs_correction" ? "Update URN" : "View Registration Status",
            onClick: () => navigate(currentProfile!.urnReviewStatus === "needs_correction" ? userRouteMap["organization-profile"] : userRouteMap["document-submission"]),
            icon: BadgeCheck,
            tone: "bg-sky-500/10 text-sky-600",
          });
        } else if (!hasSubmittedDocuments) {
          dashboardTasks.push({
            key: "documents-start",
            title: "Submit your required documents",
            description: "Upload the required compliance files so the admin can begin reviewing your organization.",
            ctaLabel: "Open Documents",
            onClick: () => navigate(userRouteMap["document-submission"]),
            icon: FileText,
            tone: "bg-sky-500/10 text-sky-600",
          });
        } else if (pendingDocumentIssues.length > 0) {
          dashboardTasks.push({
            key: "documents-revision",
            title: "Resolve flagged document files",
            description: `${pendingDocumentIssues.length} document file${pendingDocumentIssues.length === 1 ? "" : "s"} need your attention before approval.`,
            ctaLabel: "Review Documents",
            onClick: () => navigate(userRouteMap["document-submission"]),
            icon: AlertTriangle,
            tone: "bg-amber-500/10 text-amber-600",
          });
        } else if (submission?.status === "under_admin_review") {
          dashboardTasks.push({
            key: "documents-review",
            title: "Wait for document review",
            description: "Your compliance documents are already with the admin. Check back for approval or remarks.",
            ctaLabel: "View Submission",
            onClick: () => navigate(userRouteMap["document-submission"]),
            icon: FileText,
            tone: "bg-emerald-500/10 text-emerald-600",
          });
        }

        if (latestBudget?.status === "budget_released") {
          dashboardTasks.push({
            key: "liquidation",
            title: "Submit your liquidation file",
            description: "Your budget has already been released, so you can now upload the required liquidation file.",
            ctaLabel: "Open Liquidation",
            onClick: () => navigate(userRouteMap["liquidation-reporting"]),
            icon: CalendarDays,
            tone: "bg-primary-soft text-primary",
          });
        } else if (latestBudget?.status === "approved_for_ftf_green") {
          dashboardTasks.push({
            key: "budget-hardcopy",
            title: "Prepare your hard copy submission",
            description: "Your budget request is approved for face-to-face processing. Prepare the required hard copy next.",
            ctaLabel: "Open Budget",
            onClick: () => navigate(userRouteMap["budget-request"]),
            icon: ClipboardList,
            tone: "bg-primary/10 text-primary",
          });
        } else if (latestBudget?.status === "hard_copy_submitted") {
          dashboardTasks.push({
            key: "budget-release-wait",
            title: "Wait for cash release",
            description: "Your hard copy has already been submitted. The next update will be the release of your approved budget.",
            ctaLabel: "Open Budget",
            onClick: () => navigate(userRouteMap["budget-request"]),
            icon: ClipboardList,
            tone: "bg-primary/10 text-primary",
          });
        } else if (latestBudget?.status === "needs_revision") {
          dashboardTasks.push({
            key: "budget-revision",
            title: "Revise your budget request",
            description: "The admin requested changes to your latest budget request. Review the remarks and resubmit when ready.",
            ctaLabel: "Open Budget",
            onClick: () => navigate(userRouteMap["budget-request"]),
            icon: AlertTriangle,
            tone: "bg-orange-500/10 text-orange-600",
          });
        } else if (latestBudget?.status === "submitted" || latestBudget?.status === "draft") {
          dashboardTasks.push({
            key: "budget-review",
            title: "Track your budget request",
            description: "Your latest budget request is in progress. You can review its current status and attached file anytime.",
            ctaLabel: "Open Budget",
            onClick: () => navigate(userRouteMap["budget-request"]),
            icon: ClipboardList,
            tone: "bg-primary/10 text-primary",
          });
        } else if (isVerified) {
          dashboardTasks.push({
            key: "budget-start",
            title: "Create your next budget request",
            description: "Your organization is verified, so you can already submit a new budget request for upcoming activities.",
            ctaLabel: "Open Budget",
            onClick: () => navigate(userRouteMap["budget-request"]),
            icon: ClipboardList,
            tone: "bg-primary/10 text-primary",
          });
        }

        if (userRenewalState.key === "renewal_needs_revision") {
          dashboardTasks.unshift({
            key: "renewal-revision",
            title: "Renewal action required",
            description: userRenewalState.adminRemarks || "The admin requested revisions to your renewal documents. Review remarks and resubmit.",
            ctaLabel: "Review Remarks",
            onClick: handleContinueRenewal,
            icon: AlertTriangle,
            tone: "bg-rose-500/10 text-rose-600",
          });
        } else if (userRenewalState.key === "renewal_draft") {
          dashboardTasks.unshift({
            key: "renewal-continue",
            title: "Continue your renewal application",
            description: "Your cycle draft is in progress. Complete and submit the required renewal documents.",
            ctaLabel: "Continue Renewal",
            onClick: handleContinueRenewal,
            icon: Clock,
            tone: "bg-amber-500/10 text-amber-600",
          });
        } else if (userRenewalState.key === "expiring_soon_renewal_available") {
          dashboardTasks.unshift({
            key: "renewal-start",
            title: "Accreditation renewal is now open",
            description: `Your accreditation expires in ${userRenewalState.daysRemaining} days. Submit your renewal application to maintain active standing.`,
            ctaLabel: startingRenewal ? "Starting..." : "Start Renewal",
            onClick: handleStartRenewal,
            icon: Sparkles,
            tone: "bg-amber-500/10 text-amber-600",
          });
        } else if (userRenewalState.key === "expired_within_renewal_window") {
          dashboardTasks.unshift({
            key: "renewal-start-expired",
            title: "Accreditation expired — Renewal available",
            description: `Accreditation expired. Privileges are paused, but late renewal remains available until ${userRenewalState.lateCutoffDate || "cutoff"}.`,
            ctaLabel: startingRenewal ? "Starting..." : "Start Renewal",
            onClick: handleStartRenewal,
            icon: AlertCircle,
            tone: "bg-rose-500/10 text-rose-600",
          });
        } else if (userRenewalState.key === "expired_beyond_renewal_window") {
          dashboardTasks.unshift({
            key: "renewal-expired-cutoff",
            title: "Accreditation expired — Registration required",
            description: "The 180-day late renewal window has elapsed. Renewal is closed; full re-registration is required.",
            ctaLabel: "Open Profile",
            onClick: () => navigate(userRouteMap["organization-profile"]),
            icon: AlertCircle,
            tone: "bg-rose-500/10 text-rose-600",
          });
        } else if (userRenewalState.key === "renewal_rejected") {
          dashboardTasks.unshift({
            key: "renewal-rejected",
            title: "Renewal application not approved",
            description: (userRenewalState.adminRemarks ? `${userRenewalState.adminRemarks} — ` : "") + "Renewal application was not approved. Please contact the LYDO office directly for guidance.",
            ctaLabel: undefined,
            onClick: undefined,
            icon: AlertCircle,
            tone: "bg-rose-500/10 text-rose-600",
          });
        } else if (
          userRenewalState.key === "renewal_submitted" ||
          userRenewalState.key === "renewal_under_review" ||
          userRenewalState.key === "renewal_resubmitted"
        ) {
          dashboardTasks.unshift({
            key: "renewal-pending",
            title: userRenewalState.statusLabel,
            description: userRenewalState.renewalBlockedReason || "Your renewal application is under review by the LYDO administrator.",
            ctaLabel: "View Renewal Status",
            onClick: handleContinueRenewal,
            icon: ClipboardList,
            tone: "bg-sky-500/10 text-sky-600",
          });
        }

        return (
          <UserPortalRedesignView
            profile={profile}
            currentProfile={currentProfile}
            isVerified={isVerified}
            isProfileSaved={isProfileSaved}
            hasSubmittedDocuments={hasSubmittedDocuments}
            stepsCompleted={stepsCompleted}
            profilePercent={profilePercent}
            dashboardDocumentPercent={dashboardDocumentPercent}
            dashboardDocumentHelper={dashboardDocumentHelper}
            budgetPercent={budgetPercent}
            budgetOverviewLabel={budgetOverviewLabel}
            liquidationPercent={liquidationPercent}
            liquidationOverviewLabel={liquidationOverviewLabel}
            renewalCountdown={renewalCountdown}
            renewalState={userRenewalState}
            onStartRenewal={handleStartRenewal}
            onContinueRenewal={handleContinueRenewal}
            startingRenewal={startingRenewal}
            dashboardTasks={dashboardTasks}
            recentActivities={profileActivityLogEntries.map((log) => ({
              id: log.id,
              description: log.description,
              createdAt: log.createdAt,
            }))}
            inquiries={inquiryHistory}
            inquiryForm={inquiryForm}
            setInquiryForm={setInquiryForm}
            submittingInquiry={savingInquiry}
            handleSendInquiry={handleSubmitInquiry}
            onViewAllInquiries={() => setInquiryListModalOpen(true)}
            onViewAllActivities={() => setProfileActivityModalOpen(true)}
            publicTemplates={allUserTemplates}
            openPreview={openPreview}
            navigate={navigate}
            userRouteMap={userRouteMap}
          />
        );
      }
      case "templates":
        return (
          <UserPortalTemplatesWorkspaceView
            publicTemplates={allUserTemplates}
            openPreview={openPreview}
            openFile={openFile}
            formatShortPortalDate={formatShortPortalDate}
          />
        );
      case "organization-profile": {
        return (
          <UserPortalOrganizationProfileWorkspaceView
            profile={profile}
            currentProfile={currentProfile}
            profileDraft={profileDraft}
            setProfileDraft={setProfileDraft}
            handleProfileFieldChange={handleProfileFieldChange}
            toggleAdvocacy={toggleAdvocacy}
            saveOrganizationProfile={saveOrganizationProfile}
            savingProfile={savingProfile}
            profilePercent={profilePercent}
            activeProfileTab={activeProfileTab}
            setActiveProfileTab={setActiveProfileTab}
            showProfileEditSection={showProfileEditSection}
            setShowProfileEditSection={setShowProfileEditSection}
            profilePreviewOpen={profilePreviewOpen}
            setProfilePreviewOpen={setProfilePreviewOpen}
            advocacyOptions={advocacyOptions}
            subClassificationOptions={subClassificationOptions}
            joinedYpopEvents={ypopEventParticipations}
            activityLogs={profileActivityLogEntries}
            onViewAllActivities={() => setProfileActivityModalOpen(true)}
            formatShortPortalDate={formatShortPortalDate}
            formatDateTimeLabel={formatDateTimeLabel}
            formatSubClassificationLabel={formatSubClassificationLabel}
            openFile={openFile}
            navigate={navigate}
            userRouteMap={userRouteMap}
          />
        );
      }
      case "document-submission": {
        if (isUrnRegistration(currentProfile)) {
          const urnStatus = currentProfile!.urnReviewStatus;
          return (
            <div className="w-full">
              <PortalSection title="URN Verification" description="Track the manual review of your existing LYDO / PCYDO registration.">
                <Card>
                  <CardContent className="space-y-4 p-5 sm:p-6">
                    <div><p className="text-sm text-muted-foreground">Submitted Unique Registration Number (URN)</p><p className="break-all text-xl font-semibold">{currentProfile!.urn}</p></div>
                    <div><p className="text-sm text-muted-foreground">Status</p><p className="font-semibold">{urnReviewLabels[urnStatus]}</p></div>
                    <p className="text-sm text-muted-foreground">
                      {urnStatus === "verified"
                        ? "Your existing registration record has been confirmed. You do not need to upload the six new-organization registration documents."
                        : urnStatus === "needs_correction"
                          ? "The submitted URN could not be confirmed. Review the admin feedback and update the number."
                          : "Your submitted URN is currently awaiting admin verification."}
                    </p>
                  </CardContent>
                </Card>
              </PortalSection>
            </div>
          );
        }

        return (
          <UserPortalDocumentWorkspaceView
            registrationPrerequisites={registrationPrerequisites}
            currentProfile={currentProfile}
            templateDocuments={templateDocuments}
            docFiles={docFiles}
            templatesById={templatesById}
            submissionLogs={submissionLogs}
            isDocumentSubmissionLocked={isDocumentSubmissionLocked}
            isDocumentSubmissionApproved={isDocumentSubmissionApproved}
            downloadingAllTemplates={downloadingAllTemplates}
            handleDownloadAllTemplates={handleDownloadAllTemplates}
            openBatchUploadWorkspace={openBatchUploadWorkspace}
            openPreview={openPreview}
            openFile={openFile}
            openAttachedDocumentEditor={openAttachedDocumentEditor}
            openDocumentRecentActivityModal={() => {
              setDocumentRecentActivityModal({
                title: "Document Activity History",
                description: "Complete log of document submissions and review updates.",
                activities: (submissionLogs || []).map((log: any) => ({
                  id: log.id,
                  message: formatActivityActionLabel(log.action || log.description),
                  note: log.adminRemarks || log.remarks || undefined,
                  timestamp: log.createdAt,
                  timestampLabel: formatFullActivityTimestamp(log.createdAt),
                })),
              });
            }}
            navigate={navigate}
            userRouteMap={userRouteMap}
            formatDateTimeLabel={formatDateTimeLabel}
            getDocumentPrimaryFileTypeLabel={getDocumentPrimaryFileTypeLabel}
            deriveOverallDocumentSubmissionStatus={deriveOverallDocumentSubmissionStatus}
            formatStatusLabel={formatStatusLabel}
            resolveRegistrationDocumentAccess={resolveRegistrationDocumentAccess}
          />
        );
      }
      case "organization-renewal": {
        return (
          <UserPortalRenewalWorkspaceView
            currentProfile={currentProfile}
            userRenewalState={userRenewalState}
            activeRenewal={userRenewalState.activeRenewal}
            navigate={navigate}
            userRouteMap={userRouteMap}
            onStartRenewal={handleStartRenewal}
            startingRenewal={startingRenewal}
            openPreview={openPreview}
            openFile={openFile}
            onRenewalUpdated={(updatedRenewal) => {
              setOrganizationRenewals((prev) => {
                const existingIndex = prev.findIndex((r) => r.id === updatedRenewal.id);
                if (existingIndex >= 0) {
                  const updated = [...prev];
                  updated[existingIndex] = updatedRenewal;
                  return updated;
                }
                return [updatedRenewal, ...prev];
              });
            }}
          />
        );
      }
      case "budget-request":
        return (
          <UserPortalBudgetWorkspaceView
            budgetWorkflowEligibility={budgetWorkflowEligibility}
            budgetRequests={budgetRequests}
            budgetFilesByRequestId={budgetRequestFilesByBudgetId}
            budgetNotesByRequestId={{}}
            submittingBudgetId={savingBudgetRequest ? budgetForm.id : null}
            showBudgetForm={showBudgetForm}
            setShowBudgetForm={setShowBudgetForm}
            editingBudgetRequest={budgetRequests.find((r) => r.id === budgetForm.id) || null}
            startEditingBudgetRequest={startEditingBudgetRequest}
            handleDeleteBudgetRequest={handleDeleteBudgetRequest}
            openPreview={openPreview}
            openFile={openFile}
            navigate={navigate}
            searchParams={searchParams}
            userRouteMap={userRouteMap}
            buildPublicRecordCode={buildPublicRecordCode}
            formatCurrency={formatCurrency}
            formatShortPortalDate={formatShortPortalDate}
            formatDateTimeLabel={formatDateTimeLabel}
            formatStatusLabel={formatStatusLabel}
            newActivityTitle={budgetForm.activityTitle}
            setNewActivityTitle={(val) => setBudgetForm((c) => ({ ...c, activityTitle: val }))}
            newActivityDescription={budgetForm.activityDescription}
            setNewActivityDescription={(val) => setBudgetForm((c) => ({ ...c, activityDescription: val }))}
            newPurposeCategory={budgetForm.purposeCategory}
            setNewPurposeCategory={(val) => setBudgetForm((c) => ({ ...c, purposeCategory: val }))}
            newActivityDate={budgetForm.activityDate}
            setNewActivityDate={(val) => setBudgetForm((c) => ({ ...c, activityDate: val }))}
            newVenue={budgetForm.venue}
            setNewVenue={(val) => setBudgetForm((c) => ({ ...c, venue: val }))}
            newRequestedAmount={budgetForm.requestedAmount}
            setNewRequestedAmount={(val) => setBudgetForm((c) => ({ ...c, requestedAmount: val }))}
            newRemarks={budgetForm.remarks}
            setNewRemarks={(val) => setBudgetForm((c) => ({ ...c, remarks: val }))}
            budgetFileInputRef={budgetFileInputRef}
            budgetFileDraft={budgetFileDraft}
            handleBudgetFileDraftChange={handleBudgetFileDraftChange}
            onClearBudgetFileDraft={() => {
              setBudgetFileDraft(null);
              if (budgetFileInputRef.current) {
                budgetFileInputRef.current.value = "";
              }
            }}
            handleCreateOrUpdateBudgetRequest={async (e, isDraft) => {
              e.preventDefault();
              await saveBudgetRequest(isDraft ? "draft" : "submitted");
            }}
            onReplaceBudgetFile={handleReplaceBudgetFile}
          />
        );
      case "liquidation-reporting":
        return (
          <UserPortalLiquidationWorkspaceView
            liquidationWorkflowEligibility={liquidationWorkflowEligibility}
            budgetWorkflowEligibility={budgetWorkflowEligibility}
            liquidationReports={liquidationReports}
            budgetRequests={budgetRequests}
            liquidationFilesByReportId={liquidationFilesByReportId}
            liquidationNotesByReportId={liquidationNotesByReportId}
            setLiquidationNotesByReportId={setLiquidationNotesByReportId}
            submittingLiquidationId={submittingLiquidationId}
            liquidationFileDraftByReportId={liquidationFileDraftByReportId}
            onClearLiquidationFileDraft={handleClearLiquidationFileDraft}
            liquidationFileInputRef={liquidationFileInputRef}
            liquidationUploadTargetId={liquidationUploadTargetId}
            setLiquidationUploadTargetId={setLiquidationUploadTargetId}
            handleLiquidationFileUpload={handleLiquidationFileUpload}
            handleSubmitLiquidation={handleSubmitLiquidation}
            handleDeleteLiquidationFile={handleDeleteLiquidationFile}
            openPreview={openPreview}
            openFile={openFile}
            navigate={navigate}
            searchParams={searchParams}
            userRouteMap={userRouteMap}
            buildPublicRecordCode={buildPublicRecordCode}
            formatCurrency={formatCurrency}
            formatShortPortalDate={formatShortPortalDate}
            formatDateTimeLabel={formatDateTimeLabel}
            formatStatusLabel={formatStatusLabel}
          />
        );
      case "news-releases":
        return (
          <UserPortalNewsWorkspaceView
            newsReleases={state.newsReleases}
            formatShortPortalDate={formatShortPortalDate}
            LYDO_FACEBOOK_PAGE_URL={LYDO_FACEBOOK_PAGE_URL}
          />
        );
      case "ypop":
        return (
          <UserPortalYPOPWorkspaceView
            ypopWorkflowEligibility={ypopWorkflowEligibility}
            currentProfile={currentProfile}
            ypopPeriods={state.ypopPeriods}
            ypopEntries={state.ypopEntries}
            ypopCityActivities={state.ypopCityActivities}
            ypopEventParticipations={ypopEventParticipations}
            ypopEventFiles={state.ypopEventFiles}
            ypopFiles={state.ypopFiles}
            ypopOrgActivities={state.ypopOrgActivities}
            ypopOrgActivityFiles={state.ypopOrgActivityFiles}
            activeEntry={(() => {
              const currentOrgId = currentProfile?.id ?? "";
              const semesterParam = typeof window !== "undefined" && window.location?.search
                ? new URLSearchParams(window.location.search).get("semester")
                : null;
              const targetSemesterKey = (semesterParam && state.ypopPeriods.some((p) => p.semesterKey === semesterParam))
                ? semesterParam
                : (state.ypopPeriods.find((p) => p.status === "open")?.semesterKey ?? state.ypopPeriods[0]?.semesterKey ?? null);

              return targetSemesterKey
                ? (state.ypopEntries.find((e) => e.organizationId === currentOrgId && e.semester === targetSemesterKey) ?? null)
                : (state.ypopEntries.find((e) => e.organizationId === currentOrgId) ?? null);
            })()}
            navigate={navigate}
            userRouteMap={userRouteMap}
            openFile={openFile}
            formatDateTimeLabel={formatDateTimeLabel}
            formatShortPortalDate={formatShortPortalDate}
            setYpopOrgActivityModalOpen={setYpopOrgActivityModalOpen}
            user={user}
            createYPOPEntry={createYPOPEntry}
            updateYPOPEntry={updateYPOPEntry}
            createYPOPEventParticipation={createYPOPEventParticipation}
            updateYPOPEventParticipation={updateYPOPEventParticipation}
            createYPOPEventFile={createYPOPEventFile}
            deleteYPOPEventFile={deleteYPOPEventFile}
            createYPOPOrgActivity={createYPOPOrgActivity}
            updateYPOPOrgActivity={updateYPOPOrgActivity}
            deleteYPOPOrgActivity={deleteYPOPOrgActivity}
            createYPOPOrgActivityFile={createYPOPOrgActivityFile}
            deleteYPOPOrgActivityFile={deleteYPOPOrgActivityFile}
          />
        );
      case "public-transparency":
        return (
          <div className="space-y-6">
            <PublicBudgetOverview />
          </div>
        );
      default:
        return (
          <PortalEmptyState
            title="Section not found"
            description="This portal section has not been configured yet."
            action={
              <Button variant="outline" onClick={() => navigate(userRouteMap.dashboard)}>
                Go to Dashboard
              </Button>
            }
          />
        );
    }
  }, [
    approvedBudgetStatuses,
    budgetFileDraft,
    budgetForm,
    budgetRequestFilesByBudgetId,
    budgetRequests,
    completedDocs,
    currentProfile,
    documentsPercent,
    docFiles,
    handleDeleteBudgetRequest,
    handleLiquidationFileUpload,
    latestBudget,
    latestLiquidation,
    liquidationFilesByReportId,
    liquidationPercent,
    liquidationReports,
    handleMarkAllNotificationsRead,
    handleMarkNotificationRead,
    majorClassificationOptions,
    mergeRemoteState,
    navigate,
    openFile,
    openPreview,
    previewEmptyMessage,
    previewModalOpen,
    previewTitle,
    previewUrl,
    profile.address,
    profile.adviserName,
    profile.barangay,
    profileComplete,
    profile.contactNumber,
    profile.facebookPageUrl,
    profile.organizationEmail,
    profile.organizationName,
    profile.profileStatus,
    profile.representativeName,
    profileDraft,
    profilePercent,
    renewalCountdown,
    resetBudgetForm,
    saveBudgetRequest,
    savingBudgetRequest,
    savingProfile,
    section,
    state.newsReleases,
    state.notifications,
    state.inquiries,
    state.templates,
    state.transparencyPosts,
    startEditingBudgetRequest,
    submissionLogs,
    submission?.id,
    submission?.status,
    subClassificationOptions,
    otherTemplates,
    templateDocuments,
    templatesById,
    toggleAdvocacy,
    updateDocumentFile,
    updateDocumentSubmission,
    userNotifications,
    user,
    validDocumentTypeIds,
    advocacyOptions,
    notifFilter,
    setNotifFilter,
    verifiedBannerDismissed,
    dismissVerifiedBanner,
    inquiryForm,
    inquiryHistory,
    savingInquiry,
    handleSubmitInquiry,
    state.ypopEntries,
    state.ypopFiles,
    state.ypopEventParticipations,
    state.ypopEventFiles,
    state.ypopOrgActivities,
    state.ypopOrgActivityFiles,
    ypopNotesByEntryId,
    setYpopNotesByEntryId,
    submittingYpopId,
    ypopUploadingId,
    submittingYpopEventParticipationId,
    ypopEventUploadingId,
    ypopOrgActivityModalOpen,
    editingYpopOrgActivityId,
    ypopOrgActivityDraft,
    savingYpopOrgActivity,
    ypopOrgActivityUploadingId,
    submittingYpopOrgActivityId,
    ypopFileInputRef,
    updateYPOPEntry,
    createYPOPEntry,
    createYPOPFile,
    deleteYPOPFile,
    createYPOPEventParticipation,
    updateYPOPEventParticipation,
    createYPOPEventFile,
    deleteYPOPEventFile,
    createYPOPOrgActivity,
    updateYPOPOrgActivity,
    deleteYPOPOrgActivity,
    createYPOPOrgActivityFile,
    deleteYPOPOrgActivityFile,
    deleteYPOPEntry,
    searchParams,
    state.ypopPeriods,
    state.ypopFiles,
    createYpopEntryInSupabase,
    createYpopEventParticipationInSupabase,
    updateYpopEntryInSupabase,
    createYpopOrgActivityInSupabase,
    updateYpopOrgActivityInSupabase,
    updateYpopEventParticipationInSupabase,
    uploadYpopOrgActivityFileToSupabase,
    uploadYpopEventFileToSupabase,
    uploadYpopFileToSupabase,
    deleteYpopOrgActivityFileFromSupabase,
    deleteYpopEventFileFromSupabase,
    deleteYpopFileFromSupabase,
    deleteYpopEntryFromSupabase,
    deleteYpopOrgActivityFromSupabase,
    ypopEventParticipations,
    ypopEventFilesByParticipationId,
    ypopHistoryOpenById,
    ypopOrgActivities,
    ypopOrgActivityFilesByActivityId,
    ypopScoringExplanationOpenById,
    ypopSemesterEventFilterById,
    isDesktopViewport,
    confirmAction,
    userRenewalState,
    startingRenewal,
    handleStartRenewal,
    handleContinueRenewal,
    allUserTemplates,
  ]);

  return (
    <>
      <UserPortalShell
        title={user?.displayName ?? "Organization Portal"}
        subtitle="Organization User"
        hidePageBanner
        userDisplayName={user?.displayName}
        userEmail={user?.email}
        notifications={userNotifications}
        onMarkAllRead={() => void handleMarkAllNotificationsRead()}
        groups={userNavigationGroups}
        activeId={section}
        onNavigate={(id) => navigate(userRouteMap[id] ?? userRouteMap.dashboard)}
        onSignOut={() => void signOut()}
      >
        {activeContent}
      </UserPortalShell>
      <PortalDocumentDrawer
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
        mode="template"
        previewUrl={previewUrl}
        previewTitle={previewTitle}
        templateTitle={previewTitle}
        templateFileName={previewTitle}
        previewCanInline={previewCanInline}
        previewEmptyMessage={previewEmptyMessage}
        organizationName={currentProfile?.organizationName || "Pasig City Organization"}
        onDownloadFile={async (url, name) => {
          await downloadResolvedFile(url, name);
        }}
        onOpenInNewTab={(url) => {
          if (url) {
            window.open(url, "_blank", "noopener,noreferrer");
          }
        }}
      />
      <Dialog
        open={batchUploadOpen}
        onOpenChange={(open) => {
          setBatchUploadOpen(open);
          if (!open) {
            resetBatchUploadState();
          }
        }}
      >
        <DialogContent className="grid w-[calc(100vw-24px)] max-w-[520px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-4xl lg:max-w-3xl max-h-[calc(100dvh-24px)]">
          {/* Header */}
          <DialogHeader className="shrink-0 border-b border-border/60 bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-5 sm:p-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="h-11 w-11 rounded-2xl bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0 shadow-2xs">
                <UploadCloud className="h-6 w-6" />
              </div>
              <div className="space-y-0.5 min-w-0">
                <DialogTitle className="text-xl font-black tracking-tight text-foreground">
                  Upload Documents
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground font-medium">
                  Upload one or multiple required registration documents for review.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Main Body */}
          <div className="min-h-0 overflow-y-auto p-5 sm:p-6 space-y-6 overscroll-contain">
            {/* Modern Dropzone */}
            <div
              className="group relative rounded-2xl border-2 border-dashed border-primary/30 dark:border-primary/40 hover:border-primary/60 bg-primary/5 dark:bg-primary/10 hover:bg-primary/10 p-7 sm:p-8 text-center transition-all duration-200 cursor-pointer shadow-2xs"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleBatchDroppedFiles(event.dataTransfer.files);
              }}
            >
              <div className="h-12 w-12 rounded-2xl bg-card border border-border/60 text-primary flex items-center justify-center mx-auto mb-3.5 shadow-2xs group-hover:scale-105 group-hover:border-primary/40 transition-all duration-200">
                <UploadCloud className="h-6 w-6" />
              </div>
              <p className="text-sm font-bold text-foreground">
                Drag & drop your PDF files
              </p>
              <p className="mt-1 text-xs text-muted-foreground font-medium">
                or browse your computer to upload multiple registration documents.
              </p>
              <label className="mt-4 inline-flex cursor-pointer">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="sr-only"
                  onChange={(event) => {
                    handleBatchDroppedFiles(event.target.files);
                    event.currentTarget.value = "";
                  }}
                />
                <span className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-2xs gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all">
                  <FileUp className="h-4 w-4" /> Browse Files
                </span>
              </label>
              <p className="mt-3 text-[11px] text-muted-foreground/70 font-medium">
                Accepted format: PDF (.pdf) • Maximum 10MB per file
              </p>
            </div>

            {/* Upload Queue Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Layers className="h-4 w-4 text-primary" /> Files Ready
                </h3>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                  {batchDroppedFiles.length} File{batchDroppedFiles.length === 1 ? "" : "s"}
                </span>
              </div>

              {batchDroppedFiles.length ? (
                <div className="space-y-3">
                  {batchDroppedFiles.map((entry) => {
                    const duplicateAssignment = Boolean(
                      entry.mappedDocumentTypeId &&
                      batchDroppedFiles.some(
                        (other) => other.id !== entry.id && other.mappedDocumentTypeId === entry.mappedDocumentTypeId,
                      ),
                    );
                    const validationError = entry.mappedDocumentTypeId
                      ? getDocumentUploadValidationError(entry.mappedDocumentTypeId, entry.file)
                      : null;
                    const isMapped = Boolean(entry.mappedDocumentTypeId);
                    const hasError = duplicateAssignment || Boolean(validationError);
                    const mappedTemplate = templateDocuments.find((t) => t.id === entry.mappedDocumentTypeId);

                    return (
                      <div
                        key={entry.id}
                        className="rounded-2xl border border-border/70 bg-card p-4 space-y-3 shadow-2xs hover:border-border transition-all duration-200"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center justify-center font-bold text-xs shrink-0 shadow-2xs">
                              <FileText className="h-5 w-5" />
                            </div>
                            <div className="min-w-0 space-y-0.5">
                              <p className="text-sm font-bold text-foreground truncate" title={entry.file.name}>
                                {entry.file.name}
                              </p>
                              <p className="text-xs text-muted-foreground font-medium">
                                {Math.max(1, Math.round(entry.file.size / 1024))} KB
                                {mappedTemplate ? (
                                  <span className="text-primary font-semibold"> · Mapped to: {mappedTemplate.name}</span>
                                ) : null}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {hasError ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-destructive bg-destructive/10 border border-destructive/20 px-2.5 py-1 rounded-full">
                                <AlertCircle className="h-3 w-3" /> Error
                              </span>
                            ) : isMapped ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                                <CheckCircle2 className="h-3 w-3" /> Ready
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                                <Clock className="h-3 w-3" /> Needs Type
                              </span>
                            )}

                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl transition-colors"
                              onClick={() => setBatchDroppedFiles((current) => current.filter((item) => item.id !== entry.id))}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">Remove file</span>
                            </Button>
                          </div>
                        </div>

                        {/* Document Type Mapping Selector */}
                        <div className="space-y-1.5 pt-1 border-t border-border/40">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            Assign Required Document Type
                          </label>
                          <Select
                            value={entry.mappedDocumentTypeId || "__unassigned__"}
                            onValueChange={(value) =>
                              setBatchDroppedFiles((current) =>
                                current.map((item) =>
                                  item.id === entry.id
                                    ? { ...item, mappedDocumentTypeId: value === "__unassigned__" ? "" : value }
                                    : item,
                                ),
                              )
                            }
                          >
                            <SelectTrigger className="h-9 w-full rounded-xl bg-background border-border text-xs font-medium">
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[260px] rounded-xl">
                              <SelectItem value="__unassigned__">Select document type</SelectItem>
                              {templateDocuments.map((documentType) => {
                                const existingFile = documentFilesByTypeId.get(documentType.id);
                                const isApproved = isApprovedSubmissionFile(existingFile);
                                const isUnderReview = isUnderReviewSubmissionFile(existingFile);
                                const assignedToOther = batchDroppedFiles.some(
                                  (other) =>
                                    other.id !== entry.id &&
                                    other.mappedDocumentTypeId &&
                                    other.mappedDocumentTypeId === documentType.id,
                                );
                                const isDisabled = isApproved || isUnderReview || assignedToOther;
                                return (
                                  <SelectItem
                                    key={documentType.id}
                                    value={documentType.id}
                                    disabled={isDisabled}
                                  >
                                    {isApproved
                                      ? `${documentType.name} — Approved`
                                      : isUnderReview
                                      ? `${documentType.name} — Under Review`
                                      : assignedToOther
                                      ? `${documentType.name} — Assigned`
                                      : documentType.name}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Inline Error Alerts */}
                        {duplicateAssignment ? (
                          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>This document type has already been assigned to another file in the queue.</span>
                          </div>
                        ) : null}
                        {validationError ? (
                          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                            <span>{validationError}</span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty State */
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-8 text-center space-y-2">
                  <div className="h-10 w-10 rounded-xl bg-card border border-border/60 text-muted-foreground flex items-center justify-center mx-auto shadow-2xs">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-bold text-foreground">No files selected yet</p>
                  <p className="text-xs text-muted-foreground">
                    Drag PDFs here or click Browse Files to begin.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Action Bar Footer */}
          <DialogFooter className="shrink-0 border-t border-border/80 bg-card/95 backdrop-blur-md p-4 px-5 sm:px-6 rounded-b-3xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg z-20">
            <div className="text-xs text-muted-foreground font-medium">
              <p className="font-bold text-foreground">
                {batchAssignmentCounts.validReadyCount} file{batchAssignmentCounts.validReadyCount === 1 ? "" : "s"} ready
              </p>
              {batchAssignmentCounts.unassignedCount > 0 || batchAssignmentCounts.duplicateTypeCount > 0 ? (
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5">
                  {batchAssignmentCounts.unassignedCount} file{batchAssignmentCounts.unassignedCount === 1 ? "" : "s"} need a document type
                  {batchAssignmentCounts.duplicateTypeCount > 0
                    ? ` · ${batchAssignmentCounts.duplicateTypeCount} duplicate assignment${batchAssignmentCounts.duplicateTypeCount === 1 ? "" : "s"}`
                    : ""}
                </p>
              ) : null}
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                className="h-9 flex-1 sm:flex-initial rounded-xl border-border text-xs font-semibold hover:bg-accent"
                disabled={!batchDroppedFiles.length}
                onClick={() => void handleSubmitBatchUpload("draft")}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                className="h-9 flex-1 sm:flex-initial rounded-xl bg-primary text-primary-foreground font-bold text-xs shadow-2xs gap-1.5 hover:scale-[1.02] active:scale-[0.98] transition-all"
                disabled={!batchDroppedFiles.length || getBatchUploadIssues().length > 0}
                onClick={() => void handleSubmitBatchUpload("review")}
              >
                <FileUp className="h-3.5 w-3.5" /> Submit Selected for Review
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={batchUploadConfirmOpen} onOpenChange={setBatchUploadConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {batchUploadSubmitMode === "draft" ? "Save selected documents as draft?" : `Submit ${batchSelectedItems.length} documents for admin review?`}
            </DialogTitle>
            <DialogDescription>
              {batchUploadSubmitMode === "draft"
                ? "The selected files will be saved now and can still be reviewed or replaced later."
                : "Documents submitted for review cannot be changed while locked unless the admin requests a revision."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            <ul className="space-y-2">
              {batchSelectedItems.map((entry) => (
                <li key={`${entry.documentType.id}-${entry.file.name}`} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                  <span>{entry.documentType.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setBatchUploadConfirmOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={batchUploadSubmitting}
              onClick={() => void confirmBatchUpload()}
            >
              {batchUploadSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : batchUploadSubmitMode === "draft" ? (
                "Save Draft"
              ) : (
                `Submit ${batchSelectedItems.length} Document${batchSelectedItems.length === 1 ? "" : "s"}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(batchUploadResult)}
        onOpenChange={(open) => {
          if (!open) {
            setBatchUploadResult(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl border border-border/80 bg-card shadow-2xl p-5 sm:p-6 space-y-4 max-w-md lg:max-w-lg">
          <DialogHeader className="space-y-1 text-left">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-primary/10 text-primary shrink-0">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-black text-foreground">
                  {batchUploadResult?.submitMode === "draft" ? "Draft Saved" : "Submitted for Review"}
                </DialogTitle>
                <DialogDescription className="text-xs font-medium text-muted-foreground mt-0.5">
                  {batchUploadResult
                    ? `${batchUploadResult.successCount} document${batchUploadResult.successCount === 1 ? "" : "s"} ${batchUploadResult.submitMode === "draft" ? "saved as drafts" : "submitted for admin review"}.`
                    : "Review the result of your batch upload."}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {batchUploadResult ? (
            <div className="space-y-3 pt-1">
              <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
                {batchUploadResult.results.map((entry) => (
                  <div
                    key={`${entry.documentTypeName}-${entry.fileName}`}
                    className="rounded-2xl border border-border/60 bg-muted/20 p-3.5 space-y-1.5 transition-all hover:border-primary/40"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-bold text-foreground leading-snug truncate max-w-[260px]">
                        {entry.documentTypeName}
                      </h4>
                      <span className={cn(
                        "text-[10px] font-semibold px-2.5 py-0.5 rounded-full border shrink-0",
                        !entry.success
                          ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
                          : batchUploadResult.submitMode === "draft"
                          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                          : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                      )}>
                        {!entry.success
                          ? "Failed"
                          : batchUploadResult.submitMode === "draft"
                          ? "Draft Saved"
                          : "Under Review"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                      <span className="truncate max-w-[240px] font-medium">{entry.fileName || entry.documentTypeName}</span>
                      <span className="shrink-0">{formatDateTimeLabel(new Date().toISOString())}</span>
                    </div>
                    {!entry.success && entry.error && (
                      <p className="text-[11px] text-destructive font-medium pt-0.5">{entry.error}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              className="w-full rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs h-9 shadow-2xs cursor-pointer"
              onClick={() => setBatchUploadResult(null)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmSubmitOpen && Boolean(pendingDocumentScan)} onOpenChange={setConfirmSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>Are you sure the details are correct and checked by you?</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            {pendingDocumentScan
              ? `Are you sure you want to submit ${pendingDocumentScan.documentTypeName}?`
              : "The selected file will be submitted for admin approval."}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setConfirmSubmitOpen(false)}>
              No
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={submittingDocumentId === pendingDocumentScan?.documentTypeId}
              onClick={() => void submitScannedDocument()}
            >
              {submittingDocumentId === pendingDocumentScan?.documentTypeId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Yes, submit"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={submissionSuccessOpen}
        onOpenChange={(open) => {
          setSubmissionSuccessOpen(open);
          if (!open) {
            resetDocumentScan();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Document Submitted</DialogTitle>
            <DialogDescription>
              The documents have been submitted to the LYDO. This will be subjected for approval.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            Your submission is now under admin review. You can continue checking the other portal sections while the admin evaluates the file.
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="w-full sm:w-auto"
              onClick={() => {
                setSubmissionSuccessOpen(false);
                resetDocumentScan();
              }}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Attached Document Preview Drawer — Standardized Right-side Drawer on PC */}
      <PortalAttachedDocumentDrawer
        open={attachedDocumentEditorOpen && !documentDetailMode}
        onOpenChange={(open) => {
          if (!open && !savingAttachedDocument) {
            closeAttachedDocumentEditor();
          }
        }}
        file={attachedDocumentEditor?.file}
        documentTypeName={attachedDocumentEditor?.documentTypeName || "Attached Document"}
        previewUrl={attachedDocumentPreviewUrl}
        previewCanInline={attachedDocumentPreviewCanInline}
        previewEmptyMessage={attachedDocumentPreviewEmptyMessage}
        saving={savingAttachedDocument}
        downloading={downloadingAttachedFile}
        formatDateTimeLabel={formatDateTimeLabel}
        formatShortPortalDate={formatShortPortalDate}
        onOpenInNewTab={() => {
          if (attachedDocumentPreviewUrl) {
            window.open(attachedDocumentPreviewUrl, "_blank", "noopener,noreferrer");
          } else if (attachedDocumentEditor?.file?.fileUrl) {
            void openFile(attachedDocumentEditor.file.fileUrl);
          }
        }}
        onDownloadFile={async () => {
          if (!attachedDocumentEditor?.file?.fileUrl || downloadingAttachedFile) return;
          setDownloadingAttachedFile(true);
          try {
            await openFile(attachedDocumentEditor.file.fileUrl, attachedDocumentEditor.file.fileName);
          } finally {
            setDownloadingAttachedFile(false);
          }
        }}
        onSubmitForReview={async () => {
          if (!attachedDocumentEditor?.file?.submissionId) return;
          setSavingAttachedDocument(true);
          try {
            await submitDocumentSubmissionForReviewInSupabase(
              attachedDocumentEditor.file.submissionId,
              [attachedDocumentEditor.file.id]
            );
            const remoteSnapshot = await loadLydoConnectSupabaseState();
            if (remoteSnapshot) {
              mergeRemoteState(remoteSnapshot);
            }
            notifyAdmin({
              title: "Document submission",
              message: `${attachedDocumentEditor.documentTypeName} submitted for review by ${
                profile.organizationName || "an organization"
              }.`,
              relatedType: "document_submission",
              relatedId: attachedDocumentEditor.file.submissionId,
              organizationId: profile.id,
            });
            toast({
              title: "Documents submitted successfully",
              description: `${attachedDocumentEditor.documentTypeName} is now under review.`,
            });
            closeAttachedDocumentEditor();
          } catch (error) {
            toast({
              title: "Submission failed",
              description:
                error instanceof Error ? error.message : "The document could not be submitted.",
              variant: "destructive",
            });
          } finally {
            setSavingAttachedDocument(false);
          }
        }}
        onReplaceFile={() => {
          closeAttachedDocumentEditor();
          openBatchUploadWorkspace();
        }}
        onDeleteDraft={async () => {
          if (!attachedDocumentEditor?.file?.id) return;
          setSavingAttachedDocument(true);
          try {
            await removeOrganizationDocumentFromSupabase(attachedDocumentEditor.file.id);
            const remoteSnapshot = await loadLydoConnectSupabaseState();
            if (remoteSnapshot) {
              mergeRemoteState(remoteSnapshot);
            }
            toast({
              title: "Draft deleted",
              description: `Draft for ${attachedDocumentEditor.documentTypeName} was deleted.`,
            });
            closeAttachedDocumentEditor();
          } catch (error) {
            toast({
              title: "Delete failed",
              description: error instanceof Error ? error.message : "Unable to delete draft.",
              variant: "destructive",
            });
          } finally {
            setSavingAttachedDocument(false);
          }
        }}
      />
      <Dialog
        open={Boolean(pendingDocumentRemoval)}
        onOpenChange={(open) => {
          if (!open && !removingDocumentId) {
            setPendingDocumentRemoval(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Uploaded Document</DialogTitle>
            <DialogDescription>Are you sure you want to remove this document?</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            {pendingDocumentRemoval
              ? `${pendingDocumentRemoval.documentTypeName} and its uploaded record will be removed from your submission.`
              : "The selected document will be removed."}
          </div>
          <DialogFooter className="flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={Boolean(removingDocumentId)}
              onClick={() => setPendingDocumentRemoval(null)}
            >
              No
            </Button>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={Boolean(removingDocumentId)}
              onClick={() => void confirmRemoveDocument()}
            >
              {removingDocumentId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Removing...
                </>
              ) : (
                "Yes, remove"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={profileRequiredModalOpen} onOpenChange={setProfileRequiredModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Complete Your Organization Profile</DialogTitle>
            <DialogDescription>
              Your organization profile is not yet complete. Please complete the remaining editable requirements before continuing.
            </DialogDescription>
          </DialogHeader>
          {getMissingEditableProfileRequirements(currentProfile).length > 0 ? (
            <div className="rounded-xl border border-amber-300/70 bg-amber-50/70 p-4 text-xs text-amber-950 space-y-2">
              <span className="font-bold text-amber-900 block">Remaining requirements to complete:</span>
              <ul className="list-disc pl-4 space-y-1 text-amber-900/90 font-medium">
                {getMissingEditableProfileRequirements(currentProfile).map((req) => (
                  <li key={req}>{req}</li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-xs text-muted-foreground">
              Please ensure all profile sections are filled out and saved.
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              className="w-full sm:w-auto font-bold rounded-xl"
              onClick={() => {
                setProfileRequiredModalOpen(false);
                navigate(userRouteMap["organization-profile"]);
              }}
            >
              Go to Profile Editor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <OrganizationActivityHistoryModal
        open={profileActivityModalOpen}
        onOpenChange={setProfileActivityModalOpen}
        description="Complete timeline of document uploads, approvals, budget requests, liquidation updates, and inquiries for your organization."
        activities={profileActivityLogEntries.map((log) => ({
          id: log.id,
          message: log.description,
          note: (log as any).adminRemarks?.trim() || undefined,
          timestamp: log.createdAt,
          timestampLabel: formatDateTimeLabel(log.createdAt),
        }))}
        emptyDescription="Profile changes and admin review actions will appear here."
      />
      <Dialog
        open={Boolean(budgetReviewNote)}
        onOpenChange={(open) => {
          if (!open) setBudgetReviewNote(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{budgetReviewNote?.title || "Budget Comment"}</DialogTitle>
            <DialogDescription>
              {budgetReviewNote?.status === "needs_revision"
                ? "The admin requested changes for this budget request."
                : budgetReviewNote?.status === "rejected_red"
                  ? "The admin rejected this budget request."
                  : "Admin remarks for this budget request."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
            {budgetReviewNote?.note || "No comment was provided."}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setBudgetReviewNote(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(budgetRecentActivityModal)}
        onOpenChange={(open) => {
          if (!open) setBudgetRecentActivityModal(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{budgetRecentActivityModal?.title || "Recent Activity"}</DialogTitle>
            <DialogDescription>
              Full activity history for this budget request.
            </DialogDescription>
          </DialogHeader>
          <RecentActivityList
            activities={
              budgetRecentActivityModal?.entries.map((entry, index) => ({
                id: `${entry.action}-${entry.changedAt}-${index}`,
                message: budgetActionLabels[entry.action] ?? formatStatusLabel(entry.action),
                note: entry.adminRemarks?.trim() || undefined,
                timestamp: entry.changedAt,
                timestampLabel: formatDateTimeLabel(entry.changedAt),
              })) ?? []
            }
            emptyDescription="Budget request updates will appear here once the request has been processed."
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setBudgetRecentActivityModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(liquidationRecentActivityModal)}
        onOpenChange={(open) => {
          if (!open) setLiquidationRecentActivityModal(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{liquidationRecentActivityModal?.title || "Recent Activity"}</DialogTitle>
            <DialogDescription>
              Full activity history for this liquidation report.
            </DialogDescription>
          </DialogHeader>
          <RecentActivityList
            activities={
              liquidationRecentActivityModal?.entries.map((entry, index) => ({
                id: `${entry.action}-${entry.changedAt}-${index}`,
                message: liquidationActionLabels[entry.action] ?? formatStatusLabel(entry.action),
                note: entry.adminRemarks?.trim() || undefined,
                timestamp: entry.changedAt,
                timestampLabel: formatDateTimeLabel(entry.changedAt),
              })) ?? []
            }
            emptyDescription="Liquidation report updates will appear here once the report has been processed."
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setLiquidationRecentActivityModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(documentRecentActivityModal)}
        onOpenChange={(open) => {
          if (!open) setDocumentRecentActivityModal(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{documentRecentActivityModal?.title || "Recent Activity"}</DialogTitle>
            <DialogDescription>
              {documentRecentActivityModal?.description || "Full activity history for this record."}
            </DialogDescription>
          </DialogHeader>
          <RecentActivityList
            activities={documentRecentActivityModal?.activities ?? []}
            emptyDescription="Document review updates will appear here once the file has been processed."
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setDocumentRecentActivityModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={Boolean(ypopRecentActivityModal)}
        onOpenChange={(open) => {
          if (!open) setYpopRecentActivityModal(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{ypopRecentActivityModal?.title || "Recent Activity"}</DialogTitle>
            <DialogDescription>
              {ypopRecentActivityModal?.description || "Full activity history for this record."}
            </DialogDescription>
          </DialogHeader>
          <RecentActivityList
            activities={ypopRecentActivityModal?.activities ?? []}
            emptyDescription="YPOP submission updates will appear here once activity is recorded."
          />
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setYpopRecentActivityModal(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(pendingBudgetDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingBudgetDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Request</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBudgetDelete
                ? `Are you sure you want to delete "${pendingBudgetDelete.activityTitle}"? This action cannot be undone.`
                : "This action cannot be undone."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingBudgetRequest}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDeleteBudgetRequest()}
              disabled={savingBudgetRequest || !pendingBudgetDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* YPOP entry delete confirmation */}
      <AlertDialog
        open={Boolean(confirmDeleteYpopEntryId)}
        onOpenChange={(open) => { if (!open) setConfirmDeleteYpopEntryId(null); }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Submission</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft submission? All attached files will also be removed. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDeleteYpopEntryId) {
                  const idToDelete = confirmDeleteYpopEntryId;
                  void deleteYpopEntryFromSupabase(idToDelete).catch(() => {});
                  deleteYPOPEntry(idToDelete);
                  setConfirmDeleteYpopEntryId(null);
                  setYpopOrgView("list");
                  setActiveYpopEntryId(null);
                  setYpopPreviewFileId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={confirmInquirySubmitOpen} onOpenChange={setConfirmInquirySubmitOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Inquiry</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this inquiry?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={savingInquiry}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleSubmitInquiry()}
              disabled={savingInquiry}
            >
              {savingInquiry ? "Submitting..." : "Yes, submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={inquiryListModalOpen} onOpenChange={setInquiryListModalOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>All Inquiries</DialogTitle>
            <DialogDescription>Tap an inquiry to view its full message.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {inquiryHistory.map((inquiry) => (
              <DashboardInquiryItem
                key={inquiry.id}
                title={inquiry.subject}
                timestamp={formatDateTimeLabel(inquiry.createdAt)}
                status={<PortalStatusBadge status={inquiry.status} />}
                onClick={() => {
                  setInquiryListModalOpen(false);
                  setSelectedInquiry(inquiry);
                }}
                showChevron
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={Boolean(selectedInquiry)} onOpenChange={(open) => { if (!open) setSelectedInquiry(null); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="break-words">{selectedInquiry?.subject || "Inquiry"}</DialogTitle>
            <DialogDescription>Review your submitted inquiry details here.</DialogDescription>
          </DialogHeader>
          {selectedInquiry ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-background p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm text-muted-foreground">{formatDateTimeLabel(selectedInquiry.createdAt)}</p>
                </div>
                <div className="w-full sm:w-auto">
                  <PortalStatusBadge status={selectedInquiry.status} />
                </div>
              </div>
              <div className="rounded-xl border border-border/70 bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Message</p>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                  {selectedInquiry.description}
                </p>
              </div>
              {selectedInquiry.adminRemarks ? (
                <div className="rounded-xl border border-primary/15 bg-primary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">Admin Note</p>
                  <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
                    {selectedInquiry.adminRemarks}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
      <AlertDialog
        open={Boolean(pendingDeleteConfirmation)}
        onOpenChange={(open) => {
          if (!open && !processingDeleteConfirmation) {
            setPendingDeleteConfirmation(null);
          }
        }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>{pendingDeleteConfirmation?.title ?? "Delete Item"}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteConfirmation?.description ?? "Are you sure you want to delete this item?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processingDeleteConfirmation}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmPendingDelete()}
              disabled={processingDeleteConfirmation}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processingDeleteConfirmation ? "Deleting..." : (pendingDeleteConfirmation?.confirmLabel ?? "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {confirmationDialog}
    </>
  );
}

function WebsiteRenewalStrip({ expiresAt, onOpen }: { expiresAt: string; onOpen: () => void }) {
  const clock = useRenewalClock(expiresAt);
  const dueDate = new Date(expiresAt).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <button
      type="button"
      className="mt-3 flex w-full items-center gap-3 rounded-xl border border-border/70 bg-background px-3.5 py-3 text-left shadow-sm transition-colors hover:bg-muted/20"
      onClick={onOpen}
    >
      <UserFeatureIcon icon={CalendarDays} />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Registration renewal</span>
        <span className="mt-0.5 block font-semibold text-foreground">
          {clock.isDue
            ? "Renewal is due"
            : `${clock.days}d ${String(clock.hours).padStart(2, "0")}h ${String(clock.minutes).padStart(2, "0")}m ${String(clock.seconds).padStart(2, "0")}s`}
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">Valid until {dueDate}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
    </button>
  );
}

function DashboardSection({
  title,
  description,
  action,
  className,
  titleClassName,
  contentClassName,
  children,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  titleClassName?: string;
  contentClassName?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("rounded-[1.15rem] border border-border/70 bg-card/95 p-4 shadow-sm sm:p-5 lg:p-5", className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className={cn("text-[1.05rem] font-semibold text-foreground", titleClassName)}>{title}</h2>
          {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
        {action ? <div className="w-full sm:w-auto">{action}</div> : null}
      </div>
      <div className={cn("mt-4", contentClassName)}>{children}</div>
    </section>
  );
}

function DashboardOverviewCard({
  label,
  value,
  helper,
  icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  helper: string;
  icon: typeof User;
  tone: "primary" | "emerald" | "amber" | "red";
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="overview-card flex min-h-[132px] min-w-0 flex-col rounded-xl border border-border/70 bg-background p-3 text-left shadow-sm transition-colors hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:min-h-0 lg:rounded-[1.05rem] lg:flex-col lg:items-start lg:gap-2.5 lg:p-[0.875rem]"
    >
      <div className="overview-metric-header flex w-full min-w-0 items-start justify-between gap-2 lg:hidden">
        <p className="overview-label overview-card-label min-w-0 pt-0.5 text-[0.68rem] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        <UserFeatureIcon icon={icon} />
      </div>
      <p className="overview-metric-value overview-value mt-3.5 whitespace-nowrap text-[clamp(1.65rem,7vw,2rem)] font-semibold leading-none tracking-[-0.02em] text-foreground lg:hidden">
        {value}
      </p>
      <p className="overview-status overview-card-status mt-auto pt-2 text-[0.78rem] leading-[1.35] text-muted-foreground lg:hidden">
        {helper}
      </p>

      <div className="hidden lg:block">
        <UserFeatureIcon icon={icon} />
      </div>
      <div className="hidden min-w-0 lg:block">
        <p className="overview-label overview-card-label text-[0.92rem] font-semibold leading-tight text-foreground">{label}</p>
        <p className="overview-value mt-1 whitespace-nowrap text-[clamp(1.5rem,1.6vw,1.75rem)] font-semibold leading-none text-foreground">
          {value}
        </p>
        <p className="overview-status overview-card-status mt-2 text-sm leading-snug text-muted-foreground">{helper}</p>
      </div>
    </button>
  );
}

function DashboardActionRow({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-[1.05rem] border border-border/70 bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between lg:min-w-0 lg:flex-col lg:items-start lg:justify-start lg:px-4 lg:py-4">
      <div className="flex min-w-0 items-start gap-3">
        {children}
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground lg:text-[0.98rem] lg:leading-[1.3]">{title}</p>
          <p className="mt-1 text-sm leading-snug text-muted-foreground lg:text-[0.875rem] lg:leading-[1.45]">
            {description}
          </p>
        </div>
      </div>
      {action ? <div className="w-full sm:w-auto sm:shrink-0 lg:w-auto">{action}</div> : null}
    </div>
  );
}

function DashboardInquiryItem({
  title,
  timestamp,
  status,
  onClick,
  showChevron = false,
}: {
  title: string;
  timestamp: string;
  status: React.ReactNode;
  onClick?: () => void;
  showChevron?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[1.05rem] border border-border/70 bg-background px-4 py-3 text-left shadow-sm transition-colors hover:bg-muted/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 lg:px-3.5 lg:py-3"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 truncate pr-2 text-sm font-semibold text-foreground">{title}</p>
          <div className="shrink-0">{status}</div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{timestamp}</p>
      </div>
      {showChevron ? <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" /> : null}
    </button>
  );
}

function SubmissionStatCard({
  icon: Icon,
  iconClassName,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClassName?: string;
  value: number;
  label: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border/60 bg-background px-3 py-2.5 lg:w-full lg:gap-3 lg:px-4 lg:py-3.5">
      <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} />
      <div className="min-w-0">
        <p className="text-lg font-semibold leading-none text-foreground">{value}</p>
        <p className="mt-1 text-xs leading-snug text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function FieldGroup({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">
        {label}
        {required ? <span className="ml-1 text-destructive">*</span> : null}
      </label>
      {children}
    </div>
  );
}



