import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import JSZip from "jszip";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellOff,
  X,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
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
import { RecentActivityList, RecentActivityPreview, type RecentActivityItem } from "@/components/activity/RecentActivityPreview";
import { PortalEmptyState, PortalIconBadge, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { UserFeatureIcon } from "@/components/portal/UserFeatureIcon";
import { UserPortalShell } from "@/components/portal/UserPortalShell";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { cn } from "@/lib/utils";
import { resolveBudgetEligibility } from "@/lib/budget-eligibility";
import { LYDO_FACEBOOK_PAGE_URL } from "@/lib/official-links";
import { generateUniqueUrn, isUrnRegistration, urnReviewLabels } from "@/lib/urn-registration";
import { getOrganizationRenewalCountdown } from "@/lib/organization-renewal";
import { useRenewalClock } from "@/hooks/use-renewal-clock";
import {
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
} from "@/lib/lydo-connect-supabase";
import {
  buildStructuredOcrData,
  getDocumentSchemaForSlot,
  scanPdfForOcr,
  type DocumentOcrAuditEntry,
  type DocumentOcrField,
  type DocumentOcrFieldSection,
  type DocumentOcrScanResult,
  type DocumentOcrTable,
  summarizeEditableOcrData,
  titleCaseStatus,
  validateOcrFieldValue,
  normalizeOcrFieldValue,
} from "@/lib/document-ocr";

const getReadiness = (filled: number, total: number) => (total === 0 ? 0 : Math.round((filled / total) * 100));
const normalizeText = (value?: string | null) => value?.trim() ?? "";
const hasUploadedTemplateFile = (fileUrl?: string, fileName?: string) =>
  Boolean(fileName?.trim() && fileUrl?.trim() && !fileUrl.startsWith("#"));
const formatStatusLabel = (status: string) => statusLabelMap[status] ?? status.replaceAll("_", " ");
const formatCurrency = (value: number) => `PHP ${value.toLocaleString()}`;
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
const canInlinePreviewFile = (value: string) => /\.(pdf|png|jpe?g|gif|webp|svg)$/i.test(value);
const isImagePreviewFile = (value: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(value);
const getDocumentUploadAcceptValue = (documentTypeId: string) =>
  documentTypeId === "yorp-members"
    ? ".pdf,.xlsx,.xls,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
    : ".pdf,application/pdf";
const getDocumentPrimaryFileTypeLabel = (documentTypeId: string) => (documentTypeId === "yorp-members" ? "PDF or XLSX" : "PDF");
const getDocumentUploadHelpText = (documentTypeId: string) =>
  documentTypeId === "yorp-members"
    ? "Upload a PDF or XLSX file."
    : "Upload a PDF file for submission.";
const isApprovedSubmissionFile = isApprovedRegistrationDocument;
const isApprovedDocumentSubmission = (submission?: { status?: string } | null) =>
  submission?.status === "approved" || submission?.status === "approved_green";
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
const approvedBudgetStatuses = new Set<BudgetRequest["status"]>([
  "approved_for_ftf_green",
  "budget_released",
  "completed",
]);
const liquidationUnlockedBudgetStatuses = new Set<BudgetRequest["status"]>(["budget_released", "completed"]);
const ADMIN_RECIPIENT_ID = "admin-demo";
const createNotificationId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createOcrEntityId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
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
): OrganizationProfile => ({
  id: `draft-${userId || "organization"}`,
  userId,
  organizationName: defaults?.organizationName ?? "",
  organizationEmail: defaults?.organizationEmail ?? "",
  contactNumber: defaults?.contactNumber ?? "",
  district: defaults?.district ?? "",
  barangay: defaults?.barangay ?? "",
  isExistingOrganization: defaults?.isExistingOrganization ?? false,
  organizationIdentifierNumber: defaults?.organizationIdentifierNumber ?? "",
  registrationType: defaults?.isExistingOrganization ? "existing_urn" : "new_organization",
  urn: defaults?.organizationIdentifierNumber ?? "",
  urnNormalized: defaults?.organizationIdentifierNumber?.trim().toUpperCase() ?? "",
  urnReviewStatus: defaults?.isExistingOrganization ? "pending" : "not_applicable",
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
});

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
) => {
  const blank = createBlankOrganizationProfile(userId, defaults);
  if (!profile) return blank;

  return {
    ...blank,
    ...profile,
    organizationName: normalizeText(profile.organizationName) || blank.organizationName,
    organizationEmail: normalizeText(profile.organizationEmail) || blank.organizationEmail,
    contactNumber: normalizeText(profile.contactNumber) || blank.contactNumber,
    district: normalizeText(profile.district) || blank.district,
    barangay: normalizeText(profile.barangay) || blank.barangay,
    isExistingOrganization: Boolean(profile.isExistingOrganization),
    organizationIdentifierNumber: normalizeText(profile.organizationIdentifierNumber) || blank.organizationIdentifierNumber,
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
  activityTitle: "",
  activityDescription: "",
  activityDate: "",
  venue: "",
  requestedAmount: 0,
  approvedAmount: 0,
  releasedAmount: 0,
  releaseDate: "",
  purposeCategory: "",
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
  const [ocrPreviewOpen, setOcrPreviewOpen] = useState(false);
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
  const [ocrPreviewUrl, setOcrPreviewUrl] = useState("");
  const [editableOcrFields, setEditableOcrFields] = useState<DocumentOcrField[]>([]);
  const [editableOcrTables, setEditableOcrTables] = useState<DocumentOcrTable[]>([]);
  const [ocrAuditTrail, setOcrAuditTrail] = useState<DocumentOcrAuditEntry[]>([]);
  const [selectedOcrFieldId, setSelectedOcrFieldId] = useState<string | null>(null);
  const [activeOcrPage, setActiveOcrPage] = useState(1);
  const attachedDocumentInputRef = useRef<HTMLInputElement | null>(null);
  const liquidationFileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingDocumentScan, setPendingDocumentScan] = useState<{
    documentTypeId: string;
    documentTypeName: string;
    file: File;
    result: DocumentOcrScanResult | null;
  } | null>(null);
  const [batchUploadOpen, setBatchUploadOpen] = useState(false);
  const [batchUploadConfirmOpen, setBatchUploadConfirmOpen] = useState(false);
  const [batchUploadSubmitting, setBatchUploadSubmitting] = useState(false);
  const [downloadingAllTemplates, setDownloadingAllTemplates] = useState(false);
  const [batchUploadSubmitMode, setBatchUploadSubmitMode] = useState<"draft" | "review">("review");
  const [batchDroppedFiles, setBatchDroppedFiles] = useState<BatchDroppedDocumentFile[]>([]);
  const [batchUploadResult, setBatchUploadResult] = useState<BatchUploadResultSummary | null>(null);
  const currentProfile = state.organizationProfiles.find((item) => item.userId === user?.id) ?? null;
  const budgetEligibility = useMemo(
    () =>
      resolveBudgetEligibility({
        organizationId: currentProfile?.id ?? "",
        periods: state.ypopPeriods,
        entries: state.ypopEntries,
      }),
    [currentProfile?.id, state.ypopEntries, state.ypopPeriods],
  );
  useEffect(() => {
    if (!currentProfile) return;
    setInquiryForm((current) => ({
      submitterName: current.submitterName.trim() ? current.submitterName : currentProfile.organizationName,
      organizationName: current.organizationName.trim() ? current.organizationName : currentProfile.organizationName,
      email: current.email.trim() ? current.email : currentProfile.organizationEmail,
      subject: current.subject,
      description: current.description,
    }));
  }, [currentProfile?.id, currentProfile?.organizationEmail, currentProfile?.organizationName]);
  const profileSummaryRef = useRef<HTMLDivElement>(null);
  const profileEditRef = useRef<HTMLDivElement>(null);
  const profileYpopRef = useRef<HTMLDivElement>(null);
  const profileActivityRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (section === "budget-request") {
      const ypopEntryId = searchParams.get("ypopEntryId");
      const qualifiedYpopEntry =
        ypopEntryId &&
        budgetEligibility.eligible &&
        budgetEligibility.entry?.id === ypopEntryId
          ? budgetEligibility.entry
          : null;
      if (qualifiedYpopEntry) {
        const blank = createBlankBudgetRequest(currentProfile?.id ?? "", user?.id ?? "");
        setBudgetForm({ ...blank, budgetRequestType: "ypop_incentive", ypopEntryId: qualifiedYpopEntry.id });
        setBudgetFileDraft(null);
        setShowBudgetForm(true);
      } else {
        setShowBudgetForm(false);
      }
    }
  }, [budgetEligibility, currentProfile?.id, section, searchParams, user?.id]);

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

  useEffect(() => {
    return () => {
      if (ocrPreviewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(ocrPreviewUrl);
      }
    };
  }, [ocrPreviewUrl]);

  useEffect(() => {
    if (!ocrPreviewOpen || ocrPreviewUrl || !pendingDocumentScan?.result) return;
    setOcrPreviewUrl(URL.createObjectURL(pendingDocumentScan.file));
  }, [ocrPreviewOpen, ocrPreviewUrl, pendingDocumentScan]);

  useEffect(() => {
    if (!showProfileEditSection) return;
    const handle = window.requestAnimationFrame(() => {
      scrollToProfileSection(profileEditRef);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [showProfileEditSection]);

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
        .filter((template) => template.templateActive && template.isActive && template.templateScope === "document_submission")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
  );
  const otherTemplates = useMemo(
    () =>
      [...state.templates]
        .filter((template) => template.templateActive && template.isActive && template.templateScope === "other")
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [state.templates],
  );
  const validDocumentTypeIds = useMemo(
    () => new Set(templateDocuments.map((documentType) => documentType.id)),
    [templateDocuments],
  );
  const submissionId = submission?.id ?? "";
  const docFiles = state.documentSubmissionFiles.filter(
    (file) => file.submissionId === submissionId && validDocumentTypeIds.has(file.documentTypeId),
  );
  const uploadableTemplateDocuments = useMemo(
    () =>
      templateDocuments.filter((documentType) => {
        const file = docFiles.find((entry) => entry.documentTypeId === documentType.id);
        return !isApprovedSubmissionFile(file);
      }),
    [docFiles, templateDocuments],
  );
  const documentFilesByTypeId = useMemo(
    () => new Map(docFiles.map((file) => [file.documentTypeId, file])),
    [docFiles],
  );
  const ocrSchema = pendingDocumentScan ? getDocumentSchemaForSlot(pendingDocumentScan.documentTypeName) : null;
  const selectedEditableOcrField = editableOcrFields.find((field) => field.id === selectedOcrFieldId) ?? null;
  const activeOcrPageResult = pendingDocumentScan?.result?.pages.find((page) => page.pageNumber === activeOcrPage) ?? pendingDocumentScan?.result?.pages[0] ?? null;
  const ocrFieldSections = ocrSchema?.sections ?? Array.from(new Set(editableOcrFields.map((field) => field.section)));
  const groupedEditableOcrFields = ocrFieldSections.map((section) => ({
    section,
    fields: editableOcrFields.filter((field) => field.section === section),
    tables: editableOcrTables.filter((table) => table.section === section),
  })).filter((entry) => entry.fields.length > 0 || entry.tables.length > 0);
  const editableOcrFieldErrorCount =
    editableOcrFields.reduce((count, field) => count + field.validationErrors.length, 0) +
    editableOcrTables.reduce(
      (count, table) =>
        count +
        table.validationWarnings.length +
        table.rows.reduce(
          (rowCount, row) => rowCount + Object.values(row.cells).reduce((cellCount, cell) => cellCount + cell.validationErrors.length, 0),
          0,
        ),
      0,
    );
  const editableOcrSummary = summarizeEditableOcrData(editableOcrFields, editableOcrTables);
  const canSubmitEditableOcr =
    !pendingDocumentScan?.result?.issues.some((issue) => issue.severity === "error") &&
    editableOcrSummary.missingRequiredFieldsCount === 0 &&
    editableOcrFieldErrorCount === 0 &&
    editableOcrTables.every((table) => table.rows.length >= table.minimumRows);
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

  const handleDownloadTemplate = async (template: (typeof templateDocuments)[number]) => {
    if (!template.templateFileUrl) {
      toast({
        title: "Template currently unavailable",
        description: `${template.name} does not have a downloadable template file yet.`,
        variant: "destructive",
      });
      return;
    }

    try {
      await downloadResolvedFile(template.templateFileUrl, template.templateFileName || template.name);
    } catch (error) {
      toast({
        title: "Unable to download template",
        description: error instanceof Error ? error.message : "The template could not be downloaded right now.",
        variant: "destructive",
      });
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
          zip.file(template.templateFileName || `${template.name}.pdf`, blob);
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
    setOcrPreviewOpen(false);
    setSubmissionSuccessOpen(false);
    setOcrPreviewUrl("");
    setEditableOcrFields([]);
    setEditableOcrTables([]);
    setOcrAuditTrail([]);
    setSelectedOcrFieldId(null);
    setActiveOcrPage(1);
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
    if (isDocumentSubmissionApproved) {
      return "Approved submitted documents can no longer be changed or replaced.";
    }

    const existingFile = documentFilesByTypeId.get(documentTypeId);
    if (!options?.ignoreExistingApprovedFile && isApprovedSubmissionFile(existingFile)) {
      return "This approved document can no longer be changed or removed.";
    }

    const isMembersList = documentTypeId === "yorp-members";
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isSpreadsheet = /\.(xlsx|xls)$/i.test(file.name);
    if (!isPdf && !(isMembersList && isSpreadsheet)) {
      return isMembersList
        ? "Please upload a PDF or XLSX file for the members list document slot."
        : "Please upload a PDF file for document submission.";
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
    if (isDocumentSubmissionApproved) {
      toast({
        title: "Submission locked",
        description: "Approved submitted documents can no longer be changed or replaced.",
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
          documentTypeId: entry.documentType.id,
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
    if (isDocumentSubmissionApproved) {
      toast({
        title: "Submission locked",
        description: "Approved submitted documents can no longer be changed or replaced.",
        variant: "destructive",
      });
      return;
    }

    const localDocumentType = templateDocuments.find((documentType) => documentType.name === documentTypeName);
    if (!localDocumentType) return;
    const existingFile = docFiles.find((entry) => entry.documentTypeId === localDocumentType.id);
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
        documentTypeId: localDocumentType.id,
        documentTypeName,
        file,
        result: null,
      });
      setConfirmSubmitOpen(true);
      setSubmissionSuccessOpen(false);
      setOcrPreviewOpen(false);
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
        documentTypeName: pendingDocumentScan.documentTypeName,
        file: pendingDocumentScan.file,
        ocrText: "",
        ocrConfidence: 0,
        validationStatus: "correct",
        ocrMetadata: null,
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
      setOcrPreviewOpen(false);
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
    if (isDocumentSubmissionApproved) {
      toast({
        title: "Submission locked",
        description: "Approved submitted documents can no longer be removed.",
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
    if (isDocumentSubmissionApproved) {
      toast({
        title: "Submission locked",
        description: "Approved submitted documents can no longer be changed or removed.",
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

  const updateEditableOcrField = (fieldId: string, patch: Partial<DocumentOcrField>) => {
    setEditableOcrFields((current) =>
      current.map((field) => {
        if (field.id !== fieldId) return field;
        const nextField = {
          ...field,
          ...patch,
        };
        nextField.normalizedValue = normalizeOcrFieldValue(nextField);
        nextField.validationErrors = validateOcrFieldValue(nextField, {
          required: nextField.required,
          expectedValues: nextField.expectedValues,
        });
        nextField.status = nextField.normalizedValue
          ? patch.value !== undefined && patch.value !== field.value
            ? "manually_corrected"
            : nextField.confidence >= 90
              ? "auto_detected"
              : nextField.confidence >= 70
                ? "needs_review"
                : "low_confidence"
          : nextField.required
            ? "missing"
            : "not_applicable";
        return nextField;
      }),
    );
  };

  const recordOcrAudit = (entry: Omit<DocumentOcrAuditEntry, "id" | "timestamp">) => {
    setOcrAuditTrail((current) => [
      ...current,
      {
        ...entry,
        id: createOcrEntityId("ocr-audit"),
        timestamp: new Date().toISOString(),
      },
    ]);
  };

  const addEditableOcrField = (section: DocumentOcrFieldSection) => {
    const newField: DocumentOcrField = {
      id: createOcrEntityId("ocr-field"),
      key: `custom_${Date.now()}`,
      label: "New Field",
      value: "",
      normalizedValue: "",
      confidence: 0,
      confidenceBand: "red",
      source: "Manual entry",
      sourceSnippet: "Added manually by the user.",
      sourcePage: activeOcrPage,
      pageNumber: activeOcrPage,
      boundingBox: null,
      section,
      fieldType: "text",
      rawValue: "",
      validationErrors: ["Value is required."],
      duplicateKeys: [],
      status: "missing",
      required: false,
      isCustom: true,
    };
    setEditableOcrFields((current) => [...current, newField]);
    setSelectedOcrFieldId(newField.id);
    recordOcrAudit({
      action: "added",
      fieldId: newField.id,
      fieldLabel: newField.label,
      previousValue: "",
      nextValue: "",
      note: `Added a new field under ${section}.`,
    });
  };

  const deleteEditableOcrField = (field: DocumentOcrField) => {
    if (!field.isCustom) return;
    setEditableOcrFields((current) => current.filter((entry) => entry.id !== field.id));
    if (selectedOcrFieldId === field.id) {
      setSelectedOcrFieldId(null);
    }
    recordOcrAudit({
      action: "deleted",
      fieldId: field.id,
      fieldLabel: field.label,
      previousValue: field.value,
      nextValue: "",
      note: "Removed during human verification.",
    });
  };

  const updateEditableOcrTableCell = (tableId: string, rowId: string, columnKey: string, value: string) => {
    setEditableOcrTables((current) =>
      current.map((table) => {
        if (table.id !== tableId) return table;
        return {
          ...table,
          rows: table.rows.map((row) => {
            if (row.id !== rowId) return row;
            const cell = row.cells[columnKey];
            if (!cell) return row;
            const nextCell = {
              ...cell,
              value,
              rawValue: value,
              normalizedValue: normalizeOcrFieldValue({ fieldType: cell.fieldType, value, label: cell.label, key: cell.key }),
            };
            nextCell.validationErrors = validateOcrFieldValue(nextCell, { required: nextCell.required });
            nextCell.status = nextCell.normalizedValue
              ? "manually_corrected"
              : nextCell.required
                ? "missing"
                : "not_applicable";
            const nextRow = {
              ...row,
              cells: {
                ...row.cells,
                [columnKey]: nextCell,
              },
            };
            nextRow.status = Object.values(nextRow.cells).some((entry) => entry.required && !entry.normalizedValue)
              ? "missing"
              : Object.values(nextRow.cells).some((entry) => entry.validationErrors.length)
                ? "needs_review"
                : "manually_corrected";
            return nextRow;
          }),
        };
      }),
    );
  };

  const addEditableOcrTableRow = (tableId: string) => {
    setEditableOcrTables((current) =>
      current.map((table) => {
        if (table.id !== tableId) return table;
        const nextRow = {
          id: createOcrEntityId("ocr-row"),
          rowNumber: table.rows.length + 1,
          status: "missing" as const,
          cells: Object.fromEntries(
            table.columns.map((column) => [
              column.key,
              {
                id: createOcrEntityId("ocr-cell"),
                key: column.key,
                label: column.label,
                value: "",
                rawValue: "",
                normalizedValue: "",
                confidence: 0,
                confidenceBand: "red" as const,
                fieldType: column.fieldType,
                status: column.required ? "missing" : "not_applicable",
                required: column.required ?? false,
                validationErrors: column.required ? ["Value is required."] : [],
                sourcePage: activeOcrPage,
              },
            ]),
          ),
        };
        return {
          ...table,
          rows: [...table.rows, nextRow],
        };
      }),
    );
  };

  const deleteEditableOcrTableRow = (tableId: string, rowId: string) => {
    setEditableOcrTables((current) =>
      current.map((table) => {
        if (table.id !== tableId) return table;
        return {
          ...table,
          rows: table.rows
            .filter((row) => row.id !== rowId)
            .map((row, index) => ({ ...row, rowNumber: index + 1 })),
        };
      }),
    );
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
      toast({
        title: "Complete the profile",
        description:
          "Please fill in the required organization details, district, barangay, classifications, and at least one advocacy. Previously registered organizations also need a Unique Registration Number (URN).",
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
      trimmedProfile.organizationIdentifierNumber = generateUniqueUrn();
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
        title: savedProfile.isExistingOrganization ? "Existing organization profile updated" : "Organization profile updated",
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
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "The organization profile could not be saved.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const resetBudgetForm = () => {
    setBudgetForm(createBlankBudgetRequest(currentProfile?.id ?? "", user?.id ?? ""));
    setBudgetFileDraft(null);
  };

  const startEditingBudgetRequest = (request: BudgetRequest) => {
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
      budgetEligibility.entry?.id === budgetForm.ypopEntryId
        ? budgetEligibility.entry
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

    const existingBudgetFile = budgetRequestFilesByBudgetId.get(nextBudgetRequest.id);
    if (!budgetFileDraft && !existingBudgetFile) {
      toast({
        title: "Attach the required document",
        description: "Please upload the detailed budget document before saving the request.",
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
      const existingFiles = liquidationFilesByReportId.get(report.id) ?? [];
      const canReplaceExistingFiles =
        report.status === "needs_revision" || report.status === "rejected_red";
      const shouldReplaceExistingFiles = canReplaceExistingFiles && existingFiles.length > 0;

      if (existingFiles.length > 0 && !shouldReplaceExistingFiles) {
        toast({
          title: "Only one file allowed",
          description: "Remove the current file first before uploading another document.",
          variant: "destructive",
        });
        return;
      }

      if (shouldReplaceExistingFiles) {
        for (const existingFile of existingFiles) {
          await deleteLiquidationReportFileInSupabase(existingFile.id, existingFile.fileUrl);
        }
      }

      await createLiquidationReportFileInSupabase({
        liquidationReportId: report.id,
        file: selectedFile,
      });

      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }

      toast({
        title: "Liquidation files uploaded",
        description: shouldReplaceExistingFiles
          ? "The previous liquidation files were replaced with the new upload."
          : "The post-activity document was attached to the liquidation record.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "The liquidation files could not be uploaded.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLiquidationFile = async (file: LiquidationReportFile) => {
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
    const attachedFiles = liquidationFilesByReportId.get(report.id) ?? [];
    if (attachedFiles.length === 0) {
      toast({
        title: report.status === "needs_revision" || report.status === "overdue" || report.status === "rejected_red"
          ? "Attachment required for resubmission"
          : "Attachment required",
        description:
          "Please upload a liquidation file before submitting this report.",
        variant: "destructive",
      });
      return;
    }

    setSubmittingLiquidationId(report.id);
    try {
      await updateLiquidationReportInSupabase(report.id, { status: "submitted" });
      setLiquidationNotesByReportId((prev) => { const next = { ...prev }; delete next[report.id]; return next; });
      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) mergeRemoteState(remoteSnapshot);
      toast({ title: "Liquidation submitted", description: "Your documents have been submitted. The admin will review them shortly." });
    } catch (error) {
      toast({ title: "Submit failed", description: error instanceof Error ? error.message : "Something went wrong.", variant: "destructive" });
    } finally {
      setSubmittingLiquidationId(null);
    }
  };

  const handleSubmitInquiry = async () => {
    if (!currentProfile) {
      toast({
        title: "Profile required",
        description: "Please save your organization profile before submitting an inquiry.",
        variant: "destructive",
      });
      return;
    }

    const submitterName = inquiryForm.submitterName.trim();
    const organizationName = inquiryForm.organizationName.trim();
    const email = inquiryForm.email.trim();
    const subject = inquiryForm.subject.trim();
    const description = inquiryForm.description.trim();

    if (!submitterName || !organizationName || !email || !subject || !description) {
      toast({
        title: "Missing details",
        description: "Please complete the name, email, subject, and description fields.",
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
    } finally {
      setSavingInquiry(false);
    }
  };

  const handleConfirmInquirySubmit = () => {
    if (!currentProfile) {
      toast({
        title: "Profile required",
        description: "Please save your organization profile before submitting an inquiry.",
        variant: "destructive",
      });
      return;
    }

    const submitterName = inquiryForm.submitterName.trim();
    const organizationName = inquiryForm.organizationName.trim();
    const email = inquiryForm.email.trim();
    const subject = inquiryForm.subject.trim();
    const description = inquiryForm.description.trim();

    if (!submitterName || !organizationName || !email || !subject || !description) {
      toast({
        title: "Missing details",
        description: "Please complete the name, email, subject, and description fields.",
        variant: "destructive",
      });
      return;
    }

    setConfirmInquirySubmitOpen(true);
  };

  const openBudgetRecentActivityModal = (request: BudgetRequest) => {
    const entries = [...(request.revisionHistory ?? [])]
      .filter((entry) => entry.changedAt)
      .sort((left, right) => new Date(right.changedAt).getTime() - new Date(left.changedAt).getTime());

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
        const budgetOverviewLabel =
          latestBudget?.status === "budget_released"
            ? "Released"
            : latestBudget?.status === "approved_for_ftf_green"
              ? "Approved"
              : latestBudget?.status === "hard_copy_submitted"
                ? "Submitted"
                : latestBudget?.status === "needs_revision"
                  ? "Needs Revision"
                  : latestBudget?.status === "submitted"
                    ? "Submitted"
                    : latestBudget?.status === "draft"
                      ? "Draft"
                      : latestBudget
                        ? formatStatusLabel(latestBudget.status)
                        : "Draft";
        const liquidationOverviewLabel =
          latestLiquidation?.status === "pending_activity_completion"
            ? "Pending"
            : latestLiquidation?.status === "completed_liquidated"
              ? "Completed"
              : latestLiquidation
                ? formatStatusLabel(latestLiquidation.status)
                : "Pending";
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
        return (
          <div className="user-dashboard-page mx-auto max-w-5xl space-y-4 lg:max-w-7xl lg:space-y-[18px]">
            {!isVerified ? null : !verifiedBannerDismissed ? (
              <Card className="border-green-500/20 bg-green-500/5">
                <CardContent className="flex items-start justify-between gap-4 p-5 sm:p-6">
                  <div className="flex items-start gap-4">
                    <div className="rounded-full bg-green-500/10 p-2 text-green-600">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Organization verified</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {currentProfile?.verifiedAt
                          ? `Verified on ${new Date(currentProfile.verifiedAt).toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}.`
                          : "Your organization has been verified by the admin."}
                        {" "}Budget requests, liquidation reports, and YPOP Incentive are now unlocked.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={dismissVerifiedBanner}
                    className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:text-foreground"
                    aria-label="Dismiss"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </CardContent>
              </Card>
            ) : null}
            {!isVerified && (
              <Card className="border-primary/20 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Getting Started</CardTitle>
                  <p className="text-sm text-muted-foreground">Complete these steps to unlock the full compliance workflow.</p>
                </CardHeader>
                <CardContent className="space-y-4 pb-5 sm:pb-6">
                  <div className="flex items-start gap-3">
                    {isProfileSaved ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border text-[10px] font-bold text-muted-foreground">1</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${isProfileSaved ? "text-muted-foreground" : "text-foreground"}`}>Complete Your Profile</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Fill in your organization's details and save your profile.</p>
                      {!isProfileSaved && (
                        <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => navigate(userRouteMap["organization-profile"])}>Go now</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    {hasSubmittedDocuments ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    ) : (
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border text-[10px] font-bold text-muted-foreground">2</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm font-medium ${hasSubmittedDocuments ? "text-muted-foreground" : "text-foreground"}`}>Submit Required Documents</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">Upload the documents required for admin review.</p>
                      {!hasSubmittedDocuments && (
                        <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => navigate(userRouteMap["document-submission"])}>Go now</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-border text-[10px] font-bold text-muted-foreground">3</div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">Await Admin Verification</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">The admin will review your submission and verify your organization.</p>
                    </div>
                  </div>
                  <div className="mt-4 border-t border-primary/10 pt-4">
                    <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{stepsCompleted} of 3 steps completed</span>
                      <span>{Math.round((stepsCompleted / 3) * 100)}%</span>
                    </div>
                    <Progress value={(stepsCompleted / 3) * 100} className="h-1.5 bg-primary/20" />
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="organization-summary-card rounded-[1.15rem] border border-border/70 bg-card/95 p-3.5 shadow-sm sm:p-4 lg:p-5">
              <div className="mobile-organization-summary flex min-w-0 items-center gap-3">
                <UserFeatureIcon icon={Building2} className="organization-summary-icon" />
                <div className="organization-summary-content min-w-0">
                  <p className="organization-summary-name truncate text-[1.25rem] font-semibold leading-tight text-foreground lg:text-[1.55rem] lg:leading-none">
                    {profile.organizationName || currentProfile?.organizationName || "Organization"}
                  </p>
                  <p className="organization-summary-role mt-0.5 text-[0.82rem] text-muted-foreground lg:mt-1 lg:text-sm">
                    Organization User
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4 lg:grid lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)] lg:gap-[18px] lg:space-y-0 lg:items-start">
              <div className="space-y-4 lg:grid lg:gap-[18px] lg:space-y-0">
                <DashboardSection title="Overview" className="overview-section p-3.5 sm:p-4 lg:p-5" titleClassName="overview-section-title" contentClassName="mt-3 sm:mt-4">
                  <div className="overview-grid grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3">
                    <DashboardOverviewCard
                      label="Profile"
                      value={`${profilePercent}%`}
                      helper="Verified"
                      icon={User}
                      tone="primary"
                      onClick={() => navigate(userRouteMap["organization-profile"])}
                    />
                    <DashboardOverviewCard
                      label="Documents"
                      value={`${dashboardDocumentPercent}%`}
                      helper={dashboardDocumentHelper}
                      icon={FileText}
                      tone="emerald"
                      onClick={() => navigate(userRouteMap["document-submission"])}
                    />
                    <DashboardOverviewCard
                      label="Budget"
                      value={`${budgetPercent}%`}
                      helper={budgetOverviewLabel}
                      icon={ClipboardList}
                      tone="amber"
                      onClick={() => navigate(userRouteMap["budget-request"])}
                    />
                    <DashboardOverviewCard
                      label="Liquidation"
                      value={`${liquidationPercent}%`}
                      helper={liquidationOverviewLabel}
                      icon={CalendarDays}
                      tone="red"
                      onClick={() => navigate(userRouteMap["liquidation-reporting"])}
                    />
                  </div>
                  {renewalCountdown ? (
                    <WebsiteRenewalStrip
                      expiresAt={renewalCountdown.expiresAt}
                      onOpen={() => navigate(userRouteMap["organization-profile"])}
                    />
                  ) : null}
                </DashboardSection>

                <DashboardSection title="Recommended Next Steps">
                  <div className="space-y-3 lg:grid lg:grid-cols-2 lg:gap-3 lg:space-y-0">
                    {dashboardTasks.slice(0, 3).map((task) => {
                      const TaskIcon = task.icon;
                      return (
                        <DashboardActionRow
                          key={task.key}
                          title={task.title}
                          description={task.description}
                          action={
                            task.ctaLabel && task.onClick ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-10 w-full border-primary/35 text-primary hover:bg-primary/5 sm:w-auto"
                                onClick={task.onClick}
                              >
                                {task.ctaLabel}
                              </Button>
                            ) : null
                          }
                        >
                          {TaskIcon === AlertTriangle ? (
                            <span
                              aria-hidden="true"
                              className="inline-grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600"
                            >
                              <TaskIcon aria-hidden="true" className="h-5 w-5" />
                            </span>
                          ) : (
                            <UserFeatureIcon icon={TaskIcon} />
                          )}
                        </DashboardActionRow>
                      );
                    })}

                    {pendingDocumentIssues.length ? (
                      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-3 lg:col-span-2 lg:p-4">
                        <p className="text-sm font-semibold text-amber-900">Document files needing revision</p>
                        <div className="mt-2 space-y-2">
                          {pendingDocumentIssues.slice(0, 3).map((file) => (
                            <button
                              key={file.id}
                              type="button"
                              className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white/90 px-3 py-2.5 text-left transition-colors hover:bg-white"
                              onClick={() => navigate(userRouteMap["document-submission"])}
                            >
                              <span className="min-w-0 truncate text-sm font-medium text-foreground">
                                {templatesById[file.documentTypeId]?.name ?? file.documentTypeId}
                              </span>
                              <PortalStatusBadge status="needs_revision" />
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </DashboardSection>

                <RecentActivityPreview
                  title="Recent Activity"
                  activities={profileActivityLogEntries.map((log) => ({
                    id: log.id,
                    message: log.description,
                    timestamp: log.createdAt,
                    timestampLabel: formatDateTimeLabel(log.createdAt),
                  }))}
                  onViewAll={profileActivityLogEntries.length > 3 ? () => setProfileActivityModalOpen(true) : undefined}
                  emptyDescription="Your profile changes and admin review updates will appear here."
                  className="rounded-[1.15rem] border-border/70 bg-card/95 shadow-sm"
                />
              </div>

              <div className="space-y-4 lg:grid lg:gap-[18px] lg:space-y-0">
                <DashboardSection
                  title="Inquiries"
                  description="Send a quick inquiry here and keep track of your earlier submissions."
                >
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                        <FieldGroup label="Name / Organization Name" required>
                          <Input
                            value={inquiryForm.submitterName}
                            onChange={(event) =>
                              setInquiryForm((current) => ({ ...current, submitterName: event.target.value, organizationName: event.target.value }))
                            }
                            placeholder="Your name"
                            className="h-11 rounded-xl text-sm placeholder:text-sm"
                          />
                        </FieldGroup>
                        <FieldGroup label="Email" required>
                          <Input
                            type="email"
                            value={inquiryForm.email}
                            onChange={(event) => setInquiryForm((current) => ({ ...current, email: event.target.value }))}
                            placeholder="Email address"
                            className="h-11 rounded-xl text-sm placeholder:text-sm"
                          />
                        </FieldGroup>
                      </div>
                      <FieldGroup label="Subject" required>
                        <Input
                          value={inquiryForm.subject}
                          onChange={(event) => setInquiryForm((current) => ({ ...current, subject: event.target.value }))}
                          placeholder="What is your inquiry about?"
                          className="h-11 rounded-xl text-sm placeholder:text-sm"
                        />
                      </FieldGroup>
                      <FieldGroup label="Description" required>
                        <Textarea
                          value={inquiryForm.description}
                          onChange={(event) => setInquiryForm((current) => ({ ...current, description: event.target.value }))}
                          placeholder="Write the full details of your inquiry here."
                          className="min-h-28 rounded-xl text-sm placeholder:text-sm"
                        />
                      </FieldGroup>
                      <div className="flex justify-end">
                        <Button
                          type="button"
                          onClick={handleConfirmInquirySubmit}
                          disabled={savingInquiry}
                          className="h-11 w-full sm:w-auto lg:w-full"
                        >
                          {savingInquiry ? "Sending..." : "Send Inquiry"}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {inquiryHistory.length ? (
                        <>
                          <div className="space-y-3 sm:hidden">
                            {inquiryHistory.slice(0, 2).map((inquiry) => (
                              <DashboardInquiryItem
                                key={inquiry.id}
                                title={inquiry.subject}
                                timestamp={formatDateTimeLabel(inquiry.createdAt)}
                                status={<PortalStatusBadge status={inquiry.status} />}
                                onClick={() => setSelectedInquiry(inquiry)}
                                showChevron
                              />
                            ))}
                            {inquiryHistory.length > 2 ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setInquiryListModalOpen(true)}
                              >
                                View all inquiry
                              </Button>
                            ) : null}
                          </div>

                          <div className="hidden space-y-3 sm:block">
                            {inquiryHistory.slice(0, 2).map((inquiry) => (
                              <DashboardInquiryItem
                                key={inquiry.id}
                                title={inquiry.subject}
                                timestamp={formatDateTimeLabel(inquiry.createdAt)}
                                status={<PortalStatusBadge status={inquiry.status} />}
                                onClick={() => setSelectedInquiry(inquiry)}
                                showChevron
                              />
                            ))}
                            {inquiryHistory.length > 2 ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="w-full"
                                onClick={() => setInquiryListModalOpen(true)}
                              >
                                View all inquiries
                              </Button>
                            ) : null}
                          </div>
                        </>
                      ) : (
                        <PortalEmptyState
                          title="No inquiry history yet"
                          description="Your submitted inquiries will appear here after you send them."
                        />
                      )}
                    </div>
                  </div>
                </DashboardSection>

              </div>
            </div>
          </div>
        );
      }
      case "templates":
        return (
          <div className="space-y-6">
            <PortalSection
              title="Required Document Templates"
              description={
                <span className="hidden lg:inline">
                  Download the required document templates here before preparing your bulk document submission.
                </span>
              }
              action={
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 w-full sm:w-auto"
                  disabled={downloadingAllTemplates}
                  onClick={() => void handleDownloadAllTemplates()}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {downloadingAllTemplates ? "Preparing ZIP..." : "Download All Templates"}
                </Button>
              }
            >
              <div className="grid gap-4 lg:grid-cols-2">
                {templateDocuments.map((template) => (
                  <Card key={template.id} className="border-border/70 shadow-sm">
                    <CardContent className="space-y-4 p-5">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex min-w-0 items-start gap-3">
                            <UserFeatureIcon icon={FileText} />
                            <div className="min-w-0">
                              <p className="break-words text-base font-semibold text-foreground">{template.name}</p>
                              <p className="mt-1 hidden text-sm text-muted-foreground lg:block">
                                {template.templateFileUrl ? template.description : "Template currently unavailable"}
                              </p>
                            </div>
                          </div>
                          <PortalStatusBadge status={template.templateFileUrl ? "approved_green" : "draft"} />
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full sm:flex-1"
                          disabled={!template.templateFileUrl}
                          onClick={() => void openPreview(template.templateFileUrl, template.templateFileName || template.name)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          View Template
                        </Button>
                        <Button
                          type="button"
                          className="w-full sm:flex-1"
                          disabled={!template.templateFileUrl}
                          onClick={() => void handleDownloadTemplate(template)}
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Download
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </PortalSection>

            <PortalSection
              title="Other Templates"
              description={
                <span className="hidden lg:inline">
                  Download the shared template files that the admin has published for your organization.
                </span>
              }
            >
              {otherTemplates.length === 0 ? (
                <PortalEmptyState
                  title="No other templates available"
                  description="Other reference templates will appear here once the admin uploads them."
                />
              ) : (
                <div className="grid gap-4 lg:grid-cols-2">
                  {otherTemplates.map((template) => (
                    <Card key={template.id} className="border-border/70 shadow-sm">
                      <CardContent className="space-y-4 p-5">
                        <div className="space-y-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <UserFeatureIcon icon={FileText} />
                              <div className="min-w-0">
                                <p className="break-words text-base font-semibold text-foreground">{template.name}</p>
                                <p className="mt-1 hidden text-sm text-muted-foreground lg:block">{template.description}</p>
                              </div>
                            </div>
                            <PortalStatusBadge status={template.templateFileUrl ? "approved_green" : "draft"} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full sm:flex-1"
                            disabled={!template.templateFileUrl}
                            onClick={() => void openPreview(template.templateFileUrl, template.templateFileName || template.name)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Template
                          </Button>
                          <Button
                            type="button"
                            className="w-full sm:flex-1"
                            disabled={!template.templateFileUrl}
                            onClick={() => void openFile(template.templateFileUrl, template.templateFileName || template.name)}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </PortalSection>
          </div>
        );
      case "organization-profile": {
        const profileStatus = currentProfile?.profileStatus ?? profileDraft.profileStatus;
        const profileName = currentProfile?.organizationName?.trim() || profile.organizationName || "Organization Profile";
        const profileSubClassification = formatSubClassificationLabel(profile.subClassification) || "N/A";
        const profileRole = [profile.majorClassification, profile.subClassification ? profileSubClassification : ""]
          .filter(Boolean)
          .join(" · ");
        const profileCompletionRing = `${profilePercent}%`;
        const profileTabs = [
          { id: "overview", label: "Overview", icon: Gauge },
          { id: "organization-details", label: "Organization Details", icon: ClipboardList },
          { id: "classification", label: "Classification", icon: UserRound },
          { id: "advocacy", label: "Advocacy", icon: BadgeCheck },
          { id: "contacts-socials", label: "Contacts & Socials", icon: ExternalLink },
          { id: "ypop-participation", label: "YPOP Participation", icon: Medal },
        ] as const;
        const organizationDetailRows = [
          { label: "Organization Name", value: profile.organizationName || "Not set" },
          { label: "Organization Type", value: profile.isExistingOrganization ? "Existing organization" : "New organization" },
          { label: "District", value: profile.district || "Not set" },
          { label: "Barangay", value: profile.barangay || "Not set" },
          {
            label: "Unique Registration Number (URN)",
            value: profile.isExistingOrganization ? profile.organizationIdentifierNumber || "Not set" : "Not required",
          },
        ];
        const shouldShowOverviewSidebar = activeProfileTab === "overview";
        const mobileProfileEditorSections = [
          { id: "basic-information", label: "Basic Information" },
          { id: "location-classification", label: "Location & Classification" },
          { id: "advocacy-focus-areas", label: "Advocacy Focus Areas" },
          { id: "leadership", label: "Leadership" },
          { id: "contact-social", label: "Contact & Social" },
        ] as const;
        return (
          <PortalSection
            title="Organization Profile"
            description="View and manage your organization's profile and compliance information."
            action={<div className="hidden lg:block"><PortalStatusBadge status={profileStatus} /></div>}
          >
            <div className="organization-profile-page space-y-4 lg:space-y-5">
              <Card ref={profileSummaryRef} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-col gap-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(14rem,16rem)] lg:items-center lg:gap-5">
                    <div className="profile-summary-main flex min-w-0 max-w-full items-start gap-3 sm:gap-4">
                      <PortalIconBadge icon={Building2} tone="primary" size="lg" className="h-14 w-14 rounded-2xl sm:h-16 sm:w-16 sm:rounded-3xl lg:h-20 lg:w-20 lg:rounded-full" iconClassName="h-7 w-7 sm:h-8 sm:w-8 lg:h-10 lg:w-10" />
                      <div className="profile-summary-identity min-w-0 max-w-full space-y-2">
                        <div className="flex flex-col items-start gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                          <h2 className="profile-organization-name w-full max-w-full break-words text-[1.35rem] font-semibold tracking-tight text-foreground sm:w-auto sm:text-2xl lg:text-3xl">{profileName}</h2>
                          <PortalStatusBadge status={profileStatus} />
                        </div>
                        <p className="profile-organization-type max-w-full break-words text-sm text-muted-foreground">
                          {profileRole || "Complete your classification details to unlock the full profile."}
                        </p>
                        <div className="profile-location-row flex flex-wrap items-center gap-x-4 gap-y-2 text-[0.84rem] text-muted-foreground sm:text-sm">
                          <span className="inline-flex items-center gap-1.5">
                            <MapPin className="h-4 w-4 text-primary" />
                            {profile.district || "District not set"}
                          </span>
                          <span className="inline-flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-primary" />
                            {profile.barangay || "Barangay not set"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="hidden shrink-0 items-center justify-start lg:flex lg:justify-center">
                      <div className="flex flex-col items-start gap-2 text-left lg:items-center lg:text-center">
                        <div
                          className="flex h-20 w-20 items-center justify-center rounded-full sm:h-24 sm:w-24"
                          style={{
                            background: `conic-gradient(hsl(var(--primary)) ${(profilePercent / 100) * 360}deg, hsl(var(--muted)) 0deg)`,
                          }}
                        >
                          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-background text-lg font-semibold text-foreground shadow-sm sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl">
                            {profileCompletionRing}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-primary">Profile Complete</p>
                      </div>
                    </div>

                    <div className="hidden flex-col gap-3 lg:flex lg:items-stretch">
                      <Button
                        type="button"
                        className="w-full justify-center"
                        onClick={() => {
                          setActiveProfileTab("organization-details");
                          setShowProfileEditSection(true);
                        }}
                      >
                        <PenSquare className="mr-2 h-4 w-4" />
                        Edit Profile
                      </Button>
                      <Button type="button" variant="outline" className="w-full justify-center" onClick={() => setProfilePreviewOpen(true)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Public Profile
                      </Button>
                      <p className="text-xs text-muted-foreground sm:text-sm">
                        Last updated: {currentProfile?.updatedAt ? formatDateTimeLabel(currentProfile.updatedAt) : "Not yet saved"}
                      </p>
                    </div>

                    <div className="profile-summary-actions min-w-0 max-w-full space-y-3 lg:hidden">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-foreground">Profile completeness</p>
                          <span className="text-sm font-semibold text-primary">{profilePercent}%</span>
                        </div>
                        <Progress value={profilePercent} className="h-2" />
                      </div>
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Button
                          type="button"
                          className="h-10 w-full min-w-0 justify-center text-sm"
                          onClick={() => {
                            setActiveProfileTab("organization-details");
                            setShowProfileEditSection(true);
                          }}
                        >
                          <PenSquare className="mr-2 h-4 w-4" />
                          Edit Profile
                        </Button>
                        <Button type="button" variant="outline" className="h-10 w-full min-w-0 justify-center text-sm" onClick={() => setProfilePreviewOpen(true)}>
                          <Eye className="mr-2 h-4 w-4" />
                          View Public Profile
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Last updated: {currentProfile?.updatedAt ? formatDateTimeLabel(currentProfile.updatedAt) : "Not yet saved"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="profile-tabs-wrapper max-w-full overflow-hidden border-b border-border/70">
                <div className="profile-tabs flex w-full max-w-full gap-2 overflow-x-auto overflow-y-hidden pb-1 [scrollbar-width:none] [-webkit-overflow-scrolling:touch] [overscroll-behavior-x:contain] [&::-webkit-scrollbar]:hidden">
                    {profileTabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => {
                            setShowProfileEditSection(false);
                            setActiveProfileTab(tab.id);
                            focusProfileTabSection(tab.id);
                          }}
                          className={cn(
                            "profile-tab inline-flex min-w-max shrink-0 items-center whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium transition-colors",
                            activeProfileTab === tab.id
                              ? "border-primary text-primary"
                              : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <Icon className="mr-2 h-4 w-4" />
                          {tab.label}
                        </button>
                      );
                    })}
                </div>
              </div>

              {showProfileEditSection ? (
                <div ref={profileEditRef}>
                  <Card className="border-border/70 bg-card/95 shadow-sm">
                    <CardHeader className="pb-3">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="space-y-1">
                          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                            <PenSquare className="h-3.5 w-3.5 text-primary" />
                            Edit Profile
                          </CardTitle>
                          <p className="text-xs text-muted-foreground lg:hidden">Update your organization information.</p>
                        </div>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowProfileEditSection(false)}>
                          Hide Editor
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
                      <div className="profile-editor space-y-3 lg:hidden">
                        <Accordion type="multiple" value={profileEditorOpenSections} onValueChange={setProfileEditorOpenSections} className="space-y-3">
                          {mobileProfileEditorSections.map((section) => (
                            <AccordionItem key={section.id} value={section.id} className="profile-editor-section overflow-hidden rounded-xl border border-border/70 bg-background px-0">
                              <AccordionTrigger className="px-4 py-3 text-sm font-semibold hover:no-underline">
                                <div className="flex min-w-0 flex-1 items-center justify-between gap-3 pr-2 text-left">
                                  <span>{section.label}</span>
                                  {section.id === "advocacy-focus-areas" && !profileEditorOpenSections.includes(section.id) ? (
                                    <span className="shrink-0 text-xs font-medium text-muted-foreground">
                                      {profileDraft.advocacies.length} selected
                                    </span>
                                  ) : null}
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="px-4 pb-4 pt-1">
                                {section.id === "basic-information" ? (
                                  <div className="profile-editor-fields grid gap-3">
                                    <FieldGroup label="Organization Name" required>
                                      <input value={profileDraft.organizationName} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="Organization name" readOnly />
                                    </FieldGroup>
                                    <FieldGroup label="Organization Email" required>
                                      <input type="email" value={profileDraft.organizationEmail} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="Organization email" readOnly />
                                    </FieldGroup>
                                    <FieldGroup label="Contact Number" required>
                                      <input value={profileDraft.contactNumber} inputMode="numeric" maxLength={11} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="09XXXXXXXXX" readOnly />
                                    </FieldGroup>
                                  </div>
                                ) : null}
                                {section.id === "location-classification" ? (
                                  <div className="profile-editor-fields grid gap-3">
                                    <div className="profile-editor-two-column grid gap-3 min-[600px]:grid-cols-2">
                                      <FieldGroup label="District" required>
                                        <input value={profileDraft.district} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="District" readOnly />
                                      </FieldGroup>
                                      <FieldGroup label="Barangay" required>
                                        <input value={profileDraft.barangay} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="Barangay" readOnly />
                                      </FieldGroup>
                                    </div>
                                    <div className="profile-editor-two-column grid gap-3 min-[600px]:grid-cols-2">
                                      <FieldGroup label="Organization Type">
                                        <input value={profileDraft.isExistingOrganization ? "Existing organization" : "New organization"} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" readOnly />
                                      </FieldGroup>
                                      <FieldGroup label="Unique Registration Number (URN)">
                                        <input value={profileDraft.isExistingOrganization ? profileDraft.organizationIdentifierNumber : "Not required"} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="Unique Registration Number (URN)" readOnly />
                                      </FieldGroup>
                                    </div>
                                    <div className="profile-editor-two-column grid gap-3 min-[600px]:grid-cols-2">
                                      <FieldGroup label="Major Classification" required>
                                        <select value={profileDraft.majorClassification} onChange={(event) => handleProfileFieldChange("majorClassification", event.target.value as OrganizationProfile["majorClassification"])} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary">
                                          <option value="">Select major classification</option>
                                          {majorClassificationOptions.map((option) => (
                                            <option key={option} value={option}>{option}</option>
                                          ))}
                                        </select>
                                      </FieldGroup>
                                      <FieldGroup label="Sub Classification" required>
                                        <select value={profileDraft.subClassification} onChange={(event) => handleProfileFieldChange("subClassification", event.target.value as OrganizationProfile["subClassification"])} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary">
                                          <option value="">Select sub classification</option>
                                          {subClassificationOptions.map((option) => (
                                            <option key={option} value={option}>{formatSubClassificationLabel(option)}</option>
                                          ))}
                                        </select>
                                      </FieldGroup>
                                    </div>
                                  </div>
                                ) : null}
                                {section.id === "advocacy-focus-areas" ? (
                                  <FieldGroup label="Advocacies" required>
                                    <div className="advocacy-options grid gap-2 min-[600px]:grid-cols-2">
                                      {advocacyOptions.map((advocacy) => (
                                        <label key={advocacy} className="advocacy-option flex min-w-0 cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40">
                                          <input type="checkbox" checked={profileDraft.advocacies.includes(advocacy)} onChange={() => toggleAdvocacy(advocacy)} className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                                          <span className="min-w-0 capitalize">{advocacy}</span>
                                        </label>
                                      ))}
                                    </div>
                                  </FieldGroup>
                                ) : null}
                                {section.id === "leadership" ? (
                                  <div className="profile-editor-two-column grid gap-3 min-[600px]:grid-cols-2">
                                    <FieldGroup label="Representative">
                                      <input value={profileDraft.representativeName} onChange={(event) => handleProfileFieldChange("representativeName", event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="Enter representative name" />
                                    </FieldGroup>
                                    <FieldGroup label="Adviser">
                                      <input value={profileDraft.adviserName} onChange={(event) => handleProfileFieldChange("adviserName", event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="Enter adviser name" />
                                    </FieldGroup>
                                  </div>
                                ) : null}
                                {section.id === "contact-social" ? (
                                  <div className="profile-editor-fields grid gap-3">
                                    <FieldGroup label="Address">
                                      <textarea value={profileDraft.address} onChange={(event) => handleProfileFieldChange("address", event.target.value)} className="min-h-[100px] w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="Enter organization address" />
                                    </FieldGroup>
                                    <FieldGroup label="Facebook Page">
                                      <input value={profileDraft.facebookPageUrl} onChange={(event) => handleProfileFieldChange("facebookPageUrl", event.target.value)} className="h-11 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary" placeholder="https://facebook.com/..." />
                                    </FieldGroup>
                                  </div>
                                ) : null}
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      </div>

                      <div className="hidden space-y-4 lg:block">
                        <div className="grid gap-3 md:grid-cols-2">
                          <FieldGroup label="Organization Name" required>
                            <input
                              value={profileDraft.organizationName}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="Organization name"
                              readOnly
                            />
                          </FieldGroup>
                          <FieldGroup label="Organization Email" required>
                            <input
                              type="email"
                              value={profileDraft.organizationEmail}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="Organization email"
                              readOnly
                            />
                          </FieldGroup>
                          <FieldGroup label="Contact Number" required>
                            <input
                              value={profileDraft.contactNumber}
                              inputMode="numeric"
                              maxLength={11}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="09XXXXXXXXX"
                              readOnly
                            />
                          </FieldGroup>
                          <FieldGroup label="District" required>
                            <input
                              value={profileDraft.district}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="District"
                              readOnly
                            />
                          </FieldGroup>
                          <FieldGroup label="Barangay" required>
                            <input
                              value={profileDraft.barangay}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="Barangay"
                              readOnly
                            />
                          </FieldGroup>
                          <FieldGroup label="Organization Type">
                            <input
                              value={profileDraft.isExistingOrganization ? "Existing organization" : "New organization"}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              readOnly
                            />
                          </FieldGroup>
                          <FieldGroup label="Unique Registration Number (URN)">
                            <input
                              value={profileDraft.isExistingOrganization ? profileDraft.organizationIdentifierNumber : "Not required"}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="Unique Registration Number (URN)"
                              readOnly
                            />
                          </FieldGroup>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup label="Major Classification" required>
                            <select
                              value={profileDraft.majorClassification}
                              onChange={(event) =>
                                handleProfileFieldChange("majorClassification", event.target.value as OrganizationProfile["majorClassification"])
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                            >
                              <option value="">Select major classification</option>
                              {majorClassificationOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          </FieldGroup>
                          <FieldGroup label="Sub Classification" required>
                            <select
                              value={profileDraft.subClassification}
                              onChange={(event) =>
                                handleProfileFieldChange("subClassification", event.target.value as OrganizationProfile["subClassification"])
                              }
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                            >
                              <option value="">Select sub classification</option>
                              {subClassificationOptions.map((option) => (
                                <option key={option} value={option}>
                                  {formatSubClassificationLabel(option)}
                                </option>
                              ))}
                            </select>
                          </FieldGroup>
                        </div>

                        <FieldGroup label="Advocacies" required>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {advocacyOptions.map((advocacy) => (
                              <label
                                key={advocacy}
                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-3 text-sm transition-colors hover:bg-muted/40"
                              >
                                <input
                                  type="checkbox"
                                  checked={profileDraft.advocacies.includes(advocacy)}
                                  onChange={() => toggleAdvocacy(advocacy)}
                                  className="mt-0.5 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                                />
                                <span className="capitalize">{advocacy}</span>
                              </label>
                            ))}
                          </div>
                        </FieldGroup>

                        <div className="grid gap-4 md:grid-cols-2">
                          <FieldGroup label="Representative">
                            <input
                              value={profileDraft.representativeName}
                              onChange={(event) => handleProfileFieldChange("representativeName", event.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="Enter representative name"
                            />
                          </FieldGroup>
                          <FieldGroup label="Adviser">
                            <input
                              value={profileDraft.adviserName}
                              onChange={(event) => handleProfileFieldChange("adviserName", event.target.value)}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                              placeholder="Enter adviser name"
                            />
                          </FieldGroup>
                        </div>

                        <FieldGroup label="Address">
                          <textarea
                            value={profileDraft.address}
                            onChange={(event) => handleProfileFieldChange("address", event.target.value)}
                            className="min-h-24 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                            placeholder="Enter organization address"
                          />
                        </FieldGroup>

                        <FieldGroup label="Facebook Page">
                          <input
                            value={profileDraft.facebookPageUrl}
                            onChange={(event) => handleProfileFieldChange("facebookPageUrl", event.target.value)}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                            placeholder="https://facebook.com/..."
                          />
                        </FieldGroup>
                      </div>

                      <div className="profile-editor-actions flex flex-col gap-2 border-t border-border/50 pt-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:border-0 lg:pt-0">
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          Save changes to update the shared profile record seen by the admin dashboard.
                        </p>
                        <div className="grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] gap-2 lg:flex lg:items-center">
                          <Button type="button" variant="outline" onClick={() => setShowProfileEditSection(false)} disabled={savingProfile} className="h-10 w-full lg:hidden">
                            Hide Editor
                          </Button>
                          <Button type="button" onClick={() => void saveOrganizationProfile()} disabled={savingProfile} className="h-10 w-full">
                            {savingProfile ? "Saving..." : "Save Profile"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              ) : null}

              <div
                className={cn(
                  "grid items-start gap-4",
                  shouldShowOverviewSidebar
                    ? "xl:grid-cols-[minmax(0,0.7fr)_minmax(16rem,0.3fr)]"
                    : "xl:grid-cols-1",
                )}
              >
                <div className="space-y-4">
                  {(activeProfileTab === "overview" || activeProfileTab === "organization-details") && (
                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <ClipboardList className="h-4 w-4 text-primary" />
                          Organization Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y divide-border/70">
                          {organizationDetailRows.map((row) => (
                            <div key={row.label} className="profile-field-row flex flex-col gap-1 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:py-3">
                              <p className="profile-field-label text-[0.82rem] text-muted-foreground sm:text-sm">{row.label}</p>
                              <p className="profile-field-value text-sm font-medium text-foreground sm:text-right">{row.value}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeProfileTab === "overview" ? (
                    <div className="space-y-4 xl:hidden">
                      <Card className="border-border/70 bg-card/95 shadow-sm">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base font-semibold">Verification Status</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <div className="space-y-1">
                            <PortalStatusBadge status={profileStatus} />
                            <p className="text-xs text-muted-foreground">
                              {currentProfile?.profileStatus === "verified" && currentProfile.verifiedAt
                                ? formatDateTimeLabel(currentProfile.verifiedAt)
                                : "This profile is still under review."}
                            </p>
                          </div>
                          <div className="space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Major:</span> {profile.majorClassification || "N/A"}</p>
                            <p><span className="text-muted-foreground">Sub:</span> {profileSubClassification}</p>
                            <p><span className="text-muted-foreground">Representative:</span> {profile.representativeName || "N/A"}</p>
                            <p><span className="text-muted-foreground">Adviser:</span> {profile.adviserName || "N/A"}</p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="border-border/70 bg-card/95 shadow-sm">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between gap-3">
                            <CardTitle className="text-base font-semibold">Profile Readiness</CardTitle>
                            <span className="text-sm font-semibold text-primary">{profileDraftPercent}%</span>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3 pt-0">
                          <Progress value={profileDraftPercent} className="h-2" />
                          <p className="text-sm leading-6 text-muted-foreground">
                            Keep your information updated to maintain compliance and unlock more opportunities.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : null}

                  {(activeProfileTab === "overview" || activeProfileTab === "contacts-socials") && (
                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <UserRound className="h-4 w-4 text-primary" />
                          Representative & Adviser
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="representative-adviser-grid grid gap-3 min-[360px]:grid-cols-2 md:grid-cols-2">
                          <div>
                            <p className="text-[0.82rem] text-muted-foreground sm:text-sm">Representative</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{profile.representativeName || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-[0.82rem] text-muted-foreground sm:text-sm">Adviser</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{profile.adviserName || "Not set"}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(activeProfileTab === "overview" || activeProfileTab === "contacts-socials") && (
                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <MapPin className="h-4 w-4 text-primary" />
                          Address & Facebook Page
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y divide-border/70">
                          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <p className="text-[0.82rem] text-muted-foreground sm:text-sm">Address</p>
                            <p className="text-sm font-medium text-foreground sm:max-w-[70%] sm:text-right">{profile.address || "Not set"}</p>
                          </div>
                          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <p className="text-[0.82rem] text-muted-foreground sm:text-sm">Facebook Page</p>
                            <div className="sm:max-w-[70%] sm:text-right">
                            {profile.facebookPageUrl ? (
                              <a
                                href={profile.facebookPageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-block max-w-full break-words text-sm font-medium text-primary underline-offset-4 hover:underline"
                              >
                                {profile.facebookPageUrl}
                              </a>
                            ) : (
                              <p className="text-sm font-medium text-foreground">Not set</p>
                            )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {activeProfileTab === "classification" && (
                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <BadgeCheck className="h-4 w-4 text-primary" />
                          Classification
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="divide-y divide-border/70">
                          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <p className="text-sm text-muted-foreground">Major Classification</p>
                            <p className="text-sm font-medium text-foreground sm:text-right">{profile.majorClassification || "Not selected"}</p>
                          </div>
                          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                            <p className="text-sm text-muted-foreground">Sub Classification</p>
                            <p className="text-sm font-medium text-foreground sm:text-right">{profileSubClassification}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(activeProfileTab === "overview" || activeProfileTab === "advocacy") && (
                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <BadgeCheck className="h-4 w-4 text-primary" />
                          Advocacy Focus Areas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {profile.advocacies.length ? (
                          <div className="advocacy-tags flex flex-wrap gap-2">
                            {profile.advocacies.map((advocacy) => (
                              <span
                                key={advocacy}
                                className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary sm:px-3 sm:text-sm"
                              >
                                {advocacy}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <PortalEmptyState
                            title="No advocacies selected"
                            description="Your selected advocacy areas will appear here once they are saved."
                          />
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {(activeProfileTab === "overview" || activeProfileTab === "ypop-participation") && (
                    <Card ref={profileYpopRef} className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="flex items-center gap-2 text-base">
                            <Medal className="h-4 w-4 text-primary" />
                            Recent City-Led Activities
                          </CardTitle>
                          <button
                            type="button"
                            onClick={() => navigate(userRouteMap.ypop)}
                            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                          >
                            View all activities
                          </button>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        {profileRecentYpopEvents.length ? (
                          <div className="divide-y divide-border/70">
                            {profileRecentYpopEvents.map((participation) => (
                              <div key={participation.id} className="city-activity-item flex flex-col gap-2 py-3 min-[340px]:grid min-[340px]:grid-cols-[minmax(0,1fr)_auto] min-[340px]:items-start min-[340px]:gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-foreground">{participation.activityName}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    {formatDateTimeLabel(participation.joinedAt)}
                                    {participation.venue ? ` · ${participation.venue}` : ""}
                                  </p>
                                  {participation.adminRemarks?.trim() ? (
                                    <p className="mt-1 text-sm text-muted-foreground">{participation.adminRemarks}</p>
                                  ) : null}
                                </div>
                                <PortalStatusBadge status={participation.status} />
                              </div>
                            ))}
                          </div>
                        ) : (
                          <PortalEmptyState
                            title="No joined activities yet"
                            description="Joined city-led activities will appear here once the organization participates in one."
                          />
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {activeProfileTab === "overview" ? (
                    <Card ref={profileActivityRef} className="border-border/70 bg-card/95 shadow-sm lg:hidden">
                      <CardContent className="pt-4">
                        <RecentActivityPreview
                          title="Recent Activity"
                          activities={profileActivityLogEntries.map((log) => ({
                            id: log.id,
                            message: log.description,
                            timestamp: log.createdAt,
                            timestampLabel: formatDateTimeLabel(log.createdAt),
                          }))}
                          onViewAll={profileActivityLogEntries.length > 3 ? () => setProfileActivityModalOpen(true) : undefined}
                          emptyDescription="Profile changes and admin review actions will show up here with full date and time."
                          className="border-0 bg-transparent p-0 shadow-none"
                          headerClassName="mb-3"
                        />
                      </CardContent>
                    </Card>
                  ) : null}
                </div>

                {shouldShowOverviewSidebar ? (
                  <div className="hidden space-y-4 lg:block">
                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Verification Status</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                        {currentProfile?.profileStatus === "verified" && currentProfile.verifiedAt ? (
                          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                            VERIFIED ON {formatDateTimeLabel(currentProfile.verifiedAt).toUpperCase()}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                            This profile is still under review.
                          </div>
                        )}
                        <div className="space-y-2 text-sm">
                          <p><span className="text-muted-foreground">Major:</span> {profile.majorClassification || "N/A"}</p>
                          <p><span className="text-muted-foreground">Sub:</span> {profileSubClassification}</p>
                          <p><span className="text-muted-foreground">Representative:</span> {profile.representativeName || "N/A"}</p>
                          <p><span className="text-muted-foreground">Adviser:</span> {profile.adviserName || "N/A"}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base font-semibold">Profile Readiness</CardTitle>
                          <span className="text-sm font-semibold text-primary">{profileDraftPercent}%</span>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0">
                        <Progress value={profileDraftPercent} />
                        <p className="text-sm leading-6 text-muted-foreground">
                          Keep your information updated to maintain compliance and unlock more opportunities.
                        </p>
                      </CardContent>
                    </Card>

                    <Card ref={profileActivityRef} className="border-border/70 bg-card/95 shadow-sm">
                      <CardContent className="pt-4">
                        <RecentActivityPreview
                          title="Recent Activity"
                          activities={profileActivityLogEntries.map((log) => ({
                            id: log.id,
                            message: log.description,
                            timestamp: log.createdAt,
                            timestampLabel: formatDateTimeLabel(log.createdAt),
                          }))}
                          onViewAll={profileActivityLogEntries.length > 3 ? () => setProfileActivityModalOpen(true) : undefined}
                          emptyDescription="Profile changes and admin review actions will show up here with full date and time."
                          className="border-0 bg-transparent p-0 shadow-none"
                          headerClassName="mb-3"
                        />
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </div>

              <Card className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="flex items-start gap-3 p-3.5 text-sm text-muted-foreground lg:p-4">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>To make changes, click Edit Profile. Some changes may require verification before they take effect.</p>
                </CardContent>
              </Card>
            </div>
          </PortalSection>
        );
      }
      case "document-submission": {
        if (!registrationPrerequisites.canAccessDocuments) {
          return (
            <div className="w-full space-y-4">
              <PortalSection
                title="Document Submissions"
                description="Complete your organization profile before starting the registration requirements."
              >
                <WebsiteWorkflowNotice
                  title="Complete your profile first"
                  description="Finish and save all required organization information before accessing document submission."
                  requirements={[
                    {
                      id: "profile",
                      label: `Organization profile (${profilePercent}% complete)`,
                      met: false,
                    },
                  ]}
                  actionLabel="Complete Profile"
                  onAction={() => navigate(userRouteMap["organization-profile"])}
                />
              </PortalSection>
            </div>
          );
        }
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
                          : urnStatus === "rejected"
                            ? "LYDO / PCYDO could not confirm the submitted registration record."
                            : "LYDO / PCYDO is checking this number against its official registration record. You do not need to upload the six new-organization registration documents."}
                    </p>
                    {currentProfile!.urnAdminRemarks ? <div className="rounded-lg border bg-muted/30 p-3"><p className="text-sm font-semibold">Admin feedback</p><p className="text-sm">{currentProfile!.urnAdminRemarks}</p></div> : null}
                    {(urnStatus === "needs_correction" || urnStatus === "rejected") ? <Button onClick={() => navigate(userRouteMap["organization-profile"])}>Update URN</Button> : null}
                  </CardContent>
                </Card>
              </PortalSection>
            </div>
          );
        }
        const submissionLogs = state.activityLogs
          .filter((log) => log.organizationId === currentProfile?.id && log.relatedType === "document_submission")
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

        // Detail sub-view values
        const detailDocumentType = attachedDocumentEditor
          ? templateDocuments.find((dt) => dt.id === attachedDocumentEditor.file.documentTypeId)
          : null;
        const detailFile = attachedDocumentEditor?.file ?? null;
        const detailHasAdminFeedback =
          detailFile?.adminStatus === "needs_revision" || detailFile?.adminStatus === "rejected_red";
        const detailFileBadgeStatus = detailFile
          ? detailFile.adminStatus
            ? detailFile.adminStatus
            : detailFile.validationStatus === "correct"
              ? "ready_for_review"
              : "needs_revision"
          : null;
        type FileTimelineEntry = { date: string; message: string };
        const detailFileTimeline: FileTimelineEntry[] = detailFile
          ? [
              ...(detailFile.uploadedAt
                ? [{ date: detailFile.uploadedAt, message: detailFile.adminStatus === "draft" ? "Document saved as draft." : "Document uploaded for review." }]
                : []),
              ...(detailFile.reviewedAt
                ? (() => {
                    const s = detailFile.adminStatus;
                    if (s === "approved_green" || s === "approved")
                      return [{ date: detailFile.reviewedAt, message: "Document approved by admin." }];
                    if (s === "needs_revision" || s === "rejected_red") {
                      const remark = detailFile.adminRemarks?.trim();
                      return [{
                        date: detailFile.reviewedAt,
                        message: remark ? `Admin requested revision: "${remark}"` : "Admin requested revision.",
                      }];
                    }
                    if (s === "submitted" || s === "ready_for_review" || s === "under_admin_review")
                      return [{ date: detailFile.reviewedAt, message: "Document received and queued for review." }];
                    return [];
                  })()
                : []),
            ].sort((a, b) => a.date.localeCompare(b.date))
          : [];

        // Document detail sub-view
        if (documentDetailMode && attachedDocumentEditor && detailDocumentType && detailFile) {
          const detailFileLocked = isDocumentSubmissionApproved || isApprovedSubmissionFile(detailFile);
          const detailFileTypeLabel = getDocumentPrimaryFileTypeLabel(detailDocumentType.id);
          const detailActivityItems = detailFileTimeline.map((entry, index) => ({
            id: `${entry.date}-${index}`,
            message: entry.message,
            timestamp: entry.date,
            timestampLabel: formatDateTimeLabel(entry.date),
          }));
          const detailStatusDescription =
            detailFileBadgeStatus === "approved" || detailFileBadgeStatus === "approved_green"
              ? "This document has been approved and is locked."
              : detailFileBadgeStatus === "needs_revision" || detailFileBadgeStatus === "rejected_red"
                ? "The admin requested changes before this document can be approved."
                : detailFileBadgeStatus === "submitted" ||
                    detailFileBadgeStatus === "ready_for_review" ||
                    detailFileBadgeStatus === "under_review" ||
                    detailFileBadgeStatus === "under_admin_review"
                  ? "The file has been submitted and is awaiting admin review."
                  : "This document is being prepared for submission.";
          const openDocumentActivityLog = detailFileTimeline.length > 3
            ? () =>
                setDocumentRecentActivityModal({
                  title: attachedDocumentEditor.documentTypeName || "Recent Activity",
                  description: "Full activity history for this attached document.",
                  activities: detailActivityItems,
                })
            : undefined;
          const handleOpenDocumentManager = () => {
            closeAttachedDocumentEditor();
            openBatchUploadWorkspace();
          };

          return (
            <div className="user-document-attachment-page">
              <div className="hidden lg:block">
                <header className="attachment-page-header mb-4">
                  <button
                    type="button"
                    onClick={closeAttachedDocumentEditor}
                    className="mb-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Documents
                  </button>
                  <div className="attachment-title-row flex min-w-0 items-start justify-between gap-5">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold leading-snug">{detailDocumentType.name}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{detailDocumentType.description}</p>
                    </div>
                    {detailFileBadgeStatus ? (
                      <div className="shrink-0 pt-0.5">
                        <PortalStatusBadge status={detailFileBadgeStatus} />
                      </div>
                    ) : null}
                  </div>
                </header>

                <div className="attachment-workspace grid grid-cols-[minmax(0,3fr)_minmax(290px,1fr)] items-start gap-4">
                  <section className="document-viewer-card min-w-0 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
                    <div className="document-viewer-toolbar flex min-h-16 min-w-0 items-center justify-between gap-4 border-b border-border/70 px-4 py-3">
                      <div className="flex min-w-0 items-start gap-3">
                        <UserFeatureIcon icon={FileText} size="compact" className="mt-0.5" />
                        <div className="min-w-0">
                          <p
                            className="line-clamp-2 overflow-hidden text-sm font-semibold leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                            title={detailFile.fileName}
                          >
                            {detailFile.fileName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {detailFileTypeLabel} · {detailFile.uploadedAt ? `Uploaded ${formatDateTimeLabel(detailFile.uploadedAt)}` : "Uploaded recently"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-9 shrink-0"
                        aria-label={`Open ${detailDocumentType.name} file`}
                        onClick={() => void openFile(detailFile.fileUrl, detailFile.fileName)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Open File
                      </Button>
                    </div>

                    <div className="pdf-viewer-frame h-[clamp(580px,calc(100vh-260px),780px)] w-full overflow-auto bg-background">
                      {attachedDocumentPreviewUrl && attachedDocumentPreviewCanInline ? (
                        isImagePreviewFile(attachedDocumentPreviewTitle) || isImagePreviewFile(detailFile.fileUrl) ? (
                          <div className="flex min-h-full items-center justify-center p-4">
                            <img
                              src={attachedDocumentPreviewUrl}
                              alt={attachedDocumentPreviewTitle || `Preview of ${detailDocumentType.name}`}
                              className="max-h-[calc(clamp(580px,calc(100vh-260px),780px)-2rem)] w-full object-contain"
                            />
                          </div>
                        ) : (
                          <iframe
                            src={attachedDocumentPreviewUrl}
                            title={`Preview of ${detailDocumentType.name}`}
                            className="h-full w-full border-0"
                          />
                        )
                      ) : attachedDocumentPreviewUrl ? (
                        <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                          <div className="space-y-2">
                            <p className="text-base font-medium text-foreground">Preview not available in the browser</p>
                            <p className="max-w-md text-sm text-muted-foreground">
                              This file type cannot be displayed inline. Use the Open File button to view it.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                          <p className="text-sm font-medium text-foreground">No preview available</p>
                          <p className="max-w-md text-sm text-muted-foreground">
                            {attachedDocumentPreviewEmptyMessage || "The uploaded file could not be previewed."}
                          </p>
                        </div>
                      )}
                    </div>
                  </section>

                  <aside className="attachment-details-panel w-full max-w-[380px] justify-self-end rounded-2xl border border-border/70 bg-card p-4 shadow-sm xl:sticky xl:top-20">
                    <section>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Document Status</p>
                      <div className="mt-2">
                        {detailFileBadgeStatus ? <PortalStatusBadge status={detailFileBadgeStatus} /> : null}
                      </div>
                      <p className="mt-2 text-sm leading-5 text-muted-foreground">{detailStatusDescription}</p>
                    </section>

                    {detailHasAdminFeedback ? (
                      <section className="mt-3.5 border-t border-border/60 pt-3.5">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">Admin Feedback</p>
                        </div>
                        <p className="mt-2 text-sm leading-5 text-amber-800">
                          {detailFile.adminRemarks?.trim() || "No comment was provided."}
                        </p>
                      </section>
                    ) : null}

                    <section className="mt-3.5 border-t border-border/60 pt-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">File Details</p>
                      <dl className="mt-2.5 space-y-2.5 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">File name</dt>
                          <dd className="mt-0.5 break-words font-medium leading-5 text-foreground" title={detailFile.fileName}>
                            {detailFile.fileName}
                          </dd>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <dt className="text-xs text-muted-foreground">File type</dt>
                            <dd className="mt-0.5 font-medium text-foreground">{detailFileTypeLabel}</dd>
                          </div>
                          <div>
                            <dt className="text-xs text-muted-foreground">Uploaded</dt>
                            <dd className="mt-0.5 font-medium tabular-nums text-foreground">
                              {detailFile.uploadedAt ? formatDateTimeLabel(detailFile.uploadedAt) : "Recently"}
                            </dd>
                          </div>
                        </div>
                      </dl>
                    </section>

                    <section className="mt-3.5 border-t border-border/60 pt-3.5">
                      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Recent Activity</p>
                      <RecentActivityPreview
                        title=""
                        activities={detailActivityItems}
                        maxItems={3}
                        onViewAll={openDocumentActivityLog}
                        emptyDescription="Document review updates will appear here once the file has been processed."
                        className="rounded-none border-0 bg-transparent p-0 shadow-none"
                        headerClassName="mb-0"
                        itemClassName="py-2.5"
                      />
                    </section>

                    <section className="mt-3.5 border-t border-border/60 pt-3.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Manage Document</p>
                      {detailHasAdminFeedback && !detailFileLocked ? (
                        <div className="mt-2.5 space-y-3">
                          <p className="text-sm leading-5 text-muted-foreground">
                            Update this returned file here, or use the bulk document manager for multiple files.
                          </p>
                          <div className="space-y-1.5">
                            <p className="text-xs font-medium text-foreground/70">
                              Message with resubmission <span className="font-normal text-muted-foreground">(optional)</span>
                            </p>
                            <Textarea
                              placeholder="Briefly describe what you changed or clarify anything for the admin."
                              value={userRemarkDraftsByFileId[detailFile.id] ?? detailFile.userRemarks ?? ""}
                              onChange={(event) => {
                                setUserRemarkDraftsByFileId((prev) => ({ ...prev, [detailFile.id]: event.target.value }));
                                updateDocumentFile(detailFile.id, { userRemarks: event.target.value });
                              }}
                              className="min-h-[4.5rem] resize-none text-sm"
                            />
                          </div>
                          <input
                            ref={attachedDocumentInputRef}
                            type="file"
                            accept={getDocumentUploadAcceptValue(detailFile.documentTypeId)}
                            className="hidden"
                            onChange={(event) => {
                              const nextFile = event.target.files?.[0] ?? null;
                              setAttachedDocumentReplacementFile(nextFile);
                              setAttachedDocumentMarkedForRemoval(false);
                            }}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10"
                              onClick={() => attachedDocumentInputRef.current?.click()}
                              disabled={Boolean(savingAttachedDocument)}
                            >
                              <FileUp className="mr-1.5 h-4 w-4" />
                              Change File
                            </Button>
                            <Button
                              type="button"
                              variant={attachedDocumentMarkedForRemoval ? "secondary" : "destructive"}
                              className="h-10"
                              onClick={() => {
                                setAttachedDocumentMarkedForRemoval((current) => !current);
                                setAttachedDocumentReplacementFile(null);
                                if (attachedDocumentInputRef.current) attachedDocumentInputRef.current.value = "";
                              }}
                              disabled={Boolean(savingAttachedDocument)}
                            >
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              {attachedDocumentMarkedForRemoval ? "Undo" : "Remove"}
                            </Button>
                          </div>
                          {attachedDocumentReplacementFile ? (
                            <p className="text-xs leading-5 text-muted-foreground">
                              Replacement: <span className="font-medium text-foreground">{attachedDocumentReplacementFile.name}</span>
                            </p>
                          ) : null}
                          {attachedDocumentMarkedForRemoval ? (
                            <p className="text-xs text-destructive">This file will be removed when you save.</p>
                          ) : null}
                          <Button
                            type="button"
                            className="h-10 w-full"
                            onClick={() => void saveAttachedDocumentChanges()}
                            disabled={Boolean(savingAttachedDocument)}
                          >
                            {savingAttachedDocument ? "Saving..." : "Save Changes"}
                          </Button>
                          <Button type="button" variant="ghost" className="h-9 w-full" onClick={handleOpenDocumentManager}>
                            Manage Multiple Documents
                          </Button>
                        </div>
                      ) : detailFileLocked ? (
                        <p className="mt-2 text-sm leading-5 text-muted-foreground">
                          This approved document is locked and can no longer be changed through the normal submission flow.
                        </p>
                      ) : (
                        <div className="mt-2.5 space-y-3">
                          <p className="text-sm leading-5 text-muted-foreground">
                            Use the bulk document manager to replace or update eligible files.
                          </p>
                          <Button type="button" variant="outline" className="h-10 w-full" onClick={handleOpenDocumentManager}>
                            <FileUp className="mr-2 h-4 w-4" />
                            Manage Documents
                          </Button>
                        </div>
                      )}
                    </section>
                  </aside>
                </div>
              </div>

              <div className="space-y-4 lg:hidden">
              {/* Back button */}
              <button
                type="button"
                onClick={closeAttachedDocumentEditor}
                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Documents
              </button>

              {/* Page header */}
              <div className="space-y-1">
                <div className="flex flex-wrap items-start gap-2">
                  <h2 className="text-lg font-semibold leading-snug">{detailDocumentType.name}</h2>
                  {detailFileBadgeStatus && <PortalStatusBadge status={detailFileBadgeStatus} />}
                </div>
                <p className="text-sm text-muted-foreground">{detailDocumentType.description}</p>
              </div>

              <div className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm sm:p-5">
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.75fr)] lg:items-start">
                  <div className="min-w-0 space-y-4">
                    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-border/70 bg-background px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/5 text-primary">
                          <FileText className="h-4.5 w-4.5 text-red-500" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className="line-clamp-2 overflow-hidden text-sm font-medium leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                            title={detailFile.fileName}
                          >
                            {detailFile.fileName}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {getDocumentPrimaryFileTypeLabel(detailDocumentType.id)} · {detailFile.uploadedAt ? `Uploaded ${formatDateTimeLabel(detailFile.uploadedAt)}` : "Uploaded recently"}
                          </p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-10 w-full sm:w-auto"
                        onClick={() => void openFile(detailFile.fileUrl, detailFile.fileName)}
                      >
                        <Eye className="mr-2 h-4 w-4" />
                        Open File
                      </Button>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border/70 bg-background">
                      <div className="h-[clamp(320px,52vh,460px)] overflow-auto">
                        {attachedDocumentPreviewUrl && attachedDocumentPreviewCanInline ? (
                          isImagePreviewFile(attachedDocumentPreviewTitle) || isImagePreviewFile(detailFile.fileUrl) ? (
                            <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                              <img
                                src={attachedDocumentPreviewUrl}
                                alt={attachedDocumentPreviewTitle || "Attached file preview"}
                                className="max-h-[calc(clamp(320px,52vh,460px)-1rem)] w-full rounded-md object-contain"
                              />
                            </div>
                          ) : (
                            <iframe
                              src={attachedDocumentPreviewUrl}
                              title={attachedDocumentPreviewTitle || "Attached file preview"}
                              className="h-[clamp(320px,52vh,460px)] w-full border-0"
                            />
                          )
                        ) : attachedDocumentPreviewUrl ? (
                          <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center sm:p-6">
                            <div className="space-y-2">
                              <p className="text-base font-medium text-foreground">Preview not available in the browser</p>
                              <p className="max-w-md text-sm text-muted-foreground">
                                This file type cannot be displayed inline. Use the Open File button to view it.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center sm:p-6">
                            <p className="text-sm font-medium text-foreground">No preview available</p>
                            <p className="max-w-md text-sm text-muted-foreground">
                              {attachedDocumentPreviewEmptyMessage || "The uploaded file could not be previewed."}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {detailHasAdminFeedback ? (
                      <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3">
                        <div className="mb-1 flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Feedback</p>
                        </div>
                        <p className="text-sm text-amber-800">
                          {detailFile.adminRemarks?.trim() || "No comment was provided."}
                        </p>
                      </div>
                    ) : null}

                    {detailHasAdminFeedback ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-foreground/70">
                          Message with resubmission <span className="font-normal text-muted-foreground">(optional)</span>
                        </p>
                        <Textarea
                          placeholder="Briefly describe what you changed or clarify anything for the admin."
                          value={userRemarkDraftsByFileId[detailFile.id] ?? detailFile.userRemarks ?? ""}
                          onChange={(e) => {
                            setUserRemarkDraftsByFileId((prev) => ({ ...prev, [detailFile.id]: e.target.value }));
                            updateDocumentFile(detailFile.id, { userRemarks: e.target.value });
                          }}
                          className="min-h-[4.5rem] resize-none text-sm"
                        />
                      </div>
                    ) : null}

                    {detailHasAdminFeedback && !detailFileLocked ? (
                      <div className="border-t border-border/40 pt-4">
                        <input
                          ref={attachedDocumentInputRef}
                          type="file"
                          accept={getDocumentUploadAcceptValue(attachedDocumentEditor.file.documentTypeId)}
                          className="hidden"
                          onChange={(event) => {
                            const nextFile = event.target.files?.[0] ?? null;
                            setAttachedDocumentReplacementFile(nextFile);
                            setAttachedDocumentMarkedForRemoval(false);
                          }}
                        />
                        <div className="grid grid-cols-1 gap-2 min-[340px]:grid-cols-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-10"
                            onClick={() => attachedDocumentInputRef.current?.click()}
                            disabled={Boolean(savingAttachedDocument)}
                          >
                            <FileUp className="mr-2 h-4 w-4" />
                            Change File
                          </Button>
                          <Button
                            type="button"
                            variant={attachedDocumentMarkedForRemoval ? "secondary" : "destructive"}
                            className="h-10"
                            onClick={() => {
                              setAttachedDocumentMarkedForRemoval((current) => !current);
                              setAttachedDocumentReplacementFile(null);
                              if (attachedDocumentInputRef.current) {
                                attachedDocumentInputRef.current.value = "";
                              }
                            }}
                            disabled={Boolean(savingAttachedDocument)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {attachedDocumentMarkedForRemoval ? "Undo Remove" : "Remove Document"}
                          </Button>
                        </div>
                        {attachedDocumentReplacementFile ? (
                          <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                            Replacement: <span className="font-medium text-foreground">{attachedDocumentReplacementFile.name}</span>
                          </p>
                        ) : null}
                        {attachedDocumentMarkedForRemoval ? (
                          <p className="mt-2 text-xs text-destructive">This file will be removed when you save.</p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                        {detailHasAdminFeedback
                          ? "This document is currently locked."
                          : detailFileLocked
                            ? "This approved document is locked and can no longer be changed through the normal submission flow."
                            : "Use Upload Multiple Documents from the main page whenever you need to add or revise eligible documents."}
                      </div>
                    )}

                    <div className="border-t border-border/40 pt-4">
                      <RecentActivityPreview
                        title="Recent Activity"
                        activities={detailFileTimeline.map((entry, index) => ({
                          id: `${entry.date}-${index}`,
                          message: entry.message,
                          timestamp: entry.date,
                          timestampLabel: formatDateTimeLabel(entry.date),
                        }))}
                        onViewAll={
                          detailFileTimeline.length > 3
                            ? () =>
                                setDocumentRecentActivityModal({
                                  title: attachedDocumentEditor?.documentTypeName || "Recent Activity",
                                  description: "Full activity history for this attached document.",
                                  activities: detailFileTimeline.map((entry, index) => ({
                                    id: `${entry.date}-${index}`,
                                    message: entry.message,
                                    timestamp: entry.date,
                                    timestampLabel: formatDateTimeLabel(entry.date),
                                  })),
                                })
                            : undefined
                        }
                        emptyDescription="Document review updates will appear here once the file has been processed."
                        className="border-0 bg-transparent p-0 shadow-none"
                        headerClassName="mb-2"
                      />
                    </div>

                    <div className="border-t border-border/40 pt-4">
                      <div className="grid grid-cols-2 gap-2">
                        {detailHasAdminFeedback && !detailFileLocked ? (
                          <Button
                            type="button"
                            className="h-10"
                            onClick={() => void saveAttachedDocumentChanges()}
                            disabled={Boolean(savingAttachedDocument)}
                          >
                            {savingAttachedDocument ? "Saving..." : "Save Changes"}
                          </Button>
                        ) : (
                          <div />
                        )}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-10"
                          onClick={closeAttachedDocumentEditor}
                          disabled={Boolean(savingAttachedDocument)}
                        >
                          Back to Documents
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </div>
          );
        }

        const documentStatuses = templateDocuments.map((documentType) => {
          const file = docFiles.find((entry) => entry.documentTypeId === documentType.id);
          const template = templatesById[documentType.id];
          const badgeStatus =
            file?.adminStatus
              ? file.adminStatus
              : file
                ? file.validationStatus === "correct"
                  ? "ready_for_review"
                  : "needs_revision"
                : null;
          return { documentType, file, template, badgeStatus };
        });
        const approvedDocumentCount = documentStatuses.filter(({ badgeStatus }) => badgeStatus === "approved" || badgeStatus === "approved_green").length;
        const reviewDocumentCount = documentStatuses.filter(({ badgeStatus }) =>
          badgeStatus === "under_review" ||
          badgeStatus === "under_admin_review" ||
          badgeStatus === "submitted" ||
          badgeStatus === "ready_for_review",
        ).length;
        const rejectedDocumentCount = documentStatuses.filter(({ badgeStatus }) =>
          badgeStatus === "needs_revision" || badgeStatus === "rejected_red",
        ).length;
        const totalDocumentCount = templateDocuments.length;
        const documentCompletionPercent = totalDocumentCount > 0 ? Math.round((approvedDocumentCount / totalDocumentCount) * 100) : 0;
        const overallDocumentStatus = deriveOverallDocumentSubmissionStatus(docFiles);
        const overallDocumentStatusLabel = formatStatusLabel(overallDocumentStatus);
        const summarySupportMessage =
          totalDocumentCount === 0
            ? "No required document slots are configured yet."
            : approvedDocumentCount === totalDocumentCount
              ? "All required documents are approved."
              : rejectedDocumentCount > 0
                ? "Some documents need changes before approval."
                : reviewDocumentCount > 0
                  ? "Some documents are still waiting for admin review."
                  : "Upload the required files to begin the review process.";

        return (
          <div className="space-y-4 lg:mx-auto lg:max-w-6xl lg:space-y-5">
            <PortalSection
              title="Document Submissions"
              description="Upload each required file and submit for admin review. You will be notified when documents are approved or require changes."
              action={
                <PortalStatusBadge status={overallDocumentStatus} />
              }
            >
              <div className="space-y-4">
                <Card className="border-border/70 bg-card/95 shadow-sm">
                  <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1.5">
                      <p className="text-sm font-semibold text-foreground">Upload Multiple Documents</p>
                      <p className="text-sm text-muted-foreground">
                        Select and prepare several required documents before submitting them together.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        className="h-10 w-full sm:w-auto"
                        onClick={openBatchUploadWorkspace}
                      >
                        <FileUp className="mr-2 h-4 w-4" />
                        Upload Multiple Documents
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-10 w-full sm:w-auto"
                        disabled={downloadingAllTemplates}
                        onClick={() => void handleDownloadAllTemplates()}
                      >
                        <Download className="mr-2 h-4 w-4" />
                        {downloadingAllTemplates ? "Preparing ZIP..." : "Download All Templates"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-border/70 bg-card/95 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div className="grid gap-4 lg:gap-5">
                      <div className="flex min-w-0 items-center gap-3 lg:grid lg:grid-cols-[auto_minmax(0,1fr)] lg:gap-3.5">
                        <div className="flex shrink-0 items-center justify-center">
                          <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={documentCompletionPercent}
                            className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full"
                            style={{
                              background: `conic-gradient(hsl(var(--primary)) ${(documentCompletionPercent / 100) * 360}deg, hsl(var(--muted)) 0deg)`,
                            }}
                          >
                            <div className="flex h-[3.35rem] w-[3.35rem] items-center justify-center rounded-full bg-background text-base font-semibold text-foreground shadow-sm">
                              {documentCompletionPercent}%
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1 lg:min-w-0">
                          <p className="text-base font-semibold text-foreground">
                            {approvedDocumentCount} of {totalDocumentCount} documents approved
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">{summarySupportMessage}</p>
                          <div className="mt-3">
                            <Progress value={documentCompletionPercent} className="h-1.5" />
                          </div>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-3 lg:gap-3 lg:w-full">
                        <SubmissionStatCard
                          icon={CheckCircle2}
                          iconClassName="text-emerald-600"
                          value={approvedDocumentCount}
                          label="Approved"
                        />
                        <SubmissionStatCard
                          icon={Eye}
                          iconClassName="text-primary"
                          value={reviewDocumentCount}
                          label="Under Review"
                        />
                        <SubmissionStatCard
                          icon={AlertTriangle}
                          iconClassName="text-destructive"
                          value={rejectedDocumentCount}
                          label="Rejected / Revision"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {revisionRequiredFiles.length ? (
                  <Card className="border-amber-200/70 bg-amber-50/40 shadow-sm">
                    <CardContent className="space-y-3 p-4 sm:p-5">
                      <div>
                        <p className="text-sm font-semibold text-foreground">Documents Requiring Action</p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Replace only the files that were returned for revision.
                        </p>
                      </div>
                      <div className="space-y-3">
                        {revisionRequiredFiles.map((file) => {
                          const documentType = templateDocuments.find((entry) => entry.id === file.documentTypeId);
                          if (!documentType) return null;
                          return (
                            <div key={file.id} className="rounded-xl border border-amber-200/70 bg-background px-4 py-3">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">{documentType.name}</p>
                                  <p className="mt-1 text-sm text-muted-foreground">
                                    Admin remark: {file.adminRemarks?.trim() || "Please review and replace this file."}
                                  </p>
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-10 w-full sm:w-auto"
                                  onClick={openBatchUploadWorkspace}
                                >
                                  <FileUp className="mr-2 h-4 w-4" />
                                  Upload Multiple Documents
                                </Button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ) : null}

                {templateDocuments.length === 0 ? (
                  <PortalEmptyState
                    title="No document requirements yet"
                    description="Document requirements will appear here once they are configured for your organization."
                  />
                ) : (
                  <Card className="overflow-hidden border-border/70 bg-card/95 shadow-sm">
                    <CardContent className="p-0">
                      <div className="divide-y divide-border/60">
                        {documentStatuses.map(({ documentType, file, template, badgeStatus }) => {
                          const isApproved = badgeStatus === "approved" || badgeStatus === "approved_green";
                          const isRejected = badgeStatus === "needs_revision" || badgeStatus === "rejected_red";
                          const isUnderReview =
                            badgeStatus === "under_review" ||
                            badgeStatus === "under_admin_review" ||
                            badgeStatus === "submitted" ||
                            badgeStatus === "ready_for_review";
                          const fileAccess = resolveRegistrationDocumentAccess({
                            file,
                            submissionApproved: isDocumentSubmissionApproved,
                          });
                          const statusNode = badgeStatus ? (
                            <PortalStatusBadge status={badgeStatus} />
                          ) : (
                            <span className="inline-flex rounded-full border border-border/70 bg-muted/20 px-2.5 py-1 text-xs font-medium text-muted-foreground">
                              No file uploaded yet
                            </span>
                          );
                          const reviewDateLabel = file?.reviewedAt
                            ? formatDateTimeLabel(file.reviewedAt)
                            : file?.uploadedAt
                              ? formatDateTimeLabel(file.uploadedAt)
                              : "";
                          const statusMessage = isRejected && file?.adminRemarks?.trim()
                            ? `Admin: ${file.adminRemarks.trim()}`
                            : file?.adminStatus === "draft"
                              ? (file.adminRemarks?.trim() || "This document is saved as a draft and has not been submitted yet.")
                            : isUnderReview
                              ? (file?.adminRemarks?.trim() || "This document is currently under admin review.")
                                : isApproved
                                  ? "This document has been approved."
                                : file
                                  ? "Attached file is available for viewing."
                                  : "No file uploaded yet. Use Upload Multiple Documents above to submit this requirement.";

                          return (
                            <div
                              key={documentType.id}
                              className="grid gap-3 px-4 py-4 transition-colors hover:bg-muted/10 sm:px-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(220px,0.65fr)_auto] lg:gap-6 lg:px-5 lg:py-5 lg:items-center"
                            >
                              <div className="flex min-w-0 gap-3">
                                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-primary/5 text-primary">
                                  <FileText className="h-4.5 w-4.5 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-start gap-2">
                                    <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">{documentType.name}</p>
                                    {statusNode}
                                  </div>
                                  <p className="mt-1 text-sm leading-snug text-muted-foreground">{documentType.description}</p>
                                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground sm:text-xs">
                                    <span>Format: {getDocumentPrimaryFileTypeLabel(documentType.id)}</span>
                                    {file?.uploadedAt ? <span>Uploaded {formatDateTimeLabel(file.uploadedAt)}</span> : null}
                                    {reviewDateLabel ? <span>Updated {reviewDateLabel}</span> : null}
                                  </div>
                                  {isApproved ? (
                                    <p className="mt-2 text-[11px] text-emerald-700 sm:text-xs">
                                      Approved files are locked and can no longer be modified or removed.
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="min-w-0">
                                <p className={cn(
                                  "text-sm leading-snug",
                                  isRejected
                                    ? "text-destructive"
                                    : isApproved
                                      ? "text-emerald-700"
                                      : "text-muted-foreground",
                                )}>
                                  {statusMessage}
                                </p>
                              </div>

                              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:justify-end lg:gap-2 lg:flex-nowrap">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-10 w-full sm:w-auto lg:min-w-[8.75rem]"
                                  onClick={() =>
                                    void openPreview(template?.templateFileUrl ?? "", template?.templateFileName || documentType.name)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Template
                                </Button>
                                {file ? (
                                  <Button
                                    type="button"
                                    variant="default"
                                    size="sm"
                                    className="h-10 w-full sm:w-auto lg:min-w-[8.75rem]"
                                    disabled={!fileAccess.canViewAttachedFile}
                                    onClick={() => {
                                      setDocumentDetailMode(true);
                                      window.scrollTo({ top: 0, behavior: "smooth" });
                                      void openAttachedDocumentEditor(file, documentType.name);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Attached
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </PortalSection>

            <PortalSection title="Recent Activity" description="Admin review actions on your document submission.">
              <RecentActivityList
                activities={submissionLogs.map((log) => ({
                  id: log.id,
                  message: log.description,
                  timestamp: log.createdAt,
                  timestampLabel: formatDateTimeLabel(log.createdAt),
                }))}
                maxItems={3}
                emptyDescription="Review activity will appear here once your submission has been processed."
              />
            </PortalSection>
          </div>
        );
      }
      case "budget-request":
        if (!budgetWorkflowEligibility.eligible && !budgetRequests.length) {
          const nextBudgetStep = !budgetWorkflowEligibility.profileComplete
            ? { label: "Complete Profile", route: userRouteMap["organization-profile"] }
            : !budgetWorkflowEligibility.registrationVerified || !budgetWorkflowEligibility.documentsSatisfied
              ? { label: "View Registration Status", route: userRouteMap["document-submission"] }
              : { label: "Open YPOP Incentive", route: userRouteMap.ypop };
          return (
            <div className="w-full space-y-6">
              <PortalSection
                title="Budget Requests"
                description="Review the requirements that must be completed before creating an activity budget request."
              >
                <WebsiteWorkflowNotice
                  title="Complete eligibility requirements first"
                  description="Your organization must complete registration and qualify in an active YPOP period before it can create an activity budget request."
                  requirements={budgetWorkflowEligibility.requirements}
                  actionLabel={nextBudgetStep.label}
                  onAction={() => navigate(nextBudgetStep.route)}
                />
                {!budgetRequests.length ? (
                  <Card className="mt-4"><CardContent className="p-5 text-sm text-muted-foreground">No budget requests have been created yet.</CardContent></Card>
                ) : null}
              </PortalSection>
            </div>
          );
        }
        {
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
          return (
            <div className="user-budget-requests-page space-y-6">
              <PortalSection
                title="Budget Requests"
                description="View and manage budget requests created through qualified YPOP incentives."
                headerClassName={showBudgetForm ? "hidden lg:block" : "max-lg:gap-3 max-lg:px-3.5 max-lg:pb-2 max-lg:pt-3.5 lg:items-center lg:pb-3"}
              >
                {!budgetWorkflowEligibility.eligible ? (
                  <WebsiteWorkflowNotice
                    title="Complete eligibility requirements first"
                    description="Existing requests remain available below, but a new request requires completed registration and active YPOP qualification."
                    requirements={budgetWorkflowEligibility.requirements}
                    actionLabel={!budgetWorkflowEligibility.profileComplete ? "Complete Profile" : !budgetWorkflowEligibility.registrationVerified || !budgetWorkflowEligibility.documentsSatisfied ? "View Registration Status" : "Open YPOP Incentive"}
                    onAction={() => navigate(!budgetWorkflowEligibility.profileComplete ? userRouteMap["organization-profile"] : !budgetWorkflowEligibility.registrationVerified || !budgetWorkflowEligibility.documentsSatisfied ? userRouteMap["document-submission"] : userRouteMap.ypop)}
                  />
                ) : null}
                {budgetWorkflowEligibility.eligible && showBudgetForm ? (
                  <div className="new-budget-request-page space-y-4">
                    {/* Back button */}
                    <button
                      type="button"
                      onClick={() => { setShowBudgetForm(false); resetBudgetForm(); }}
                      className="budget-request-back-link flex items-center gap-1.5 pt-3 text-sm text-muted-foreground transition-colors hover:text-foreground lg:pt-0"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Budget Requests
                    </button>
                    <div className="budget-request-header space-y-1 lg:space-y-1">
                      <h2 className="text-lg font-semibold">
                        {budgetRequests.some((r) => r.id === budgetForm.id) ? "Edit Budget Request" : "New Budget Request"}
                      </h2>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {budgetRequests.find((r) => r.id === budgetForm.id)?.status === "needs_revision"
                          ? "Review the admin's feedback below, make your changes, and resubmit."
                          : "Fill in the details below and save as draft or submit for admin review."}
                      </p>
                    </div>
                    <Card className="border-border/70">
                      <CardContent className="budget-request-form space-y-4 p-4 sm:p-5 lg:p-6">
                        {budgetForm.budgetRequestType === "ypop_incentive" && (() => {
                          const linked = state.ypopEntries.find((e) => e.id === budgetForm.ypopEntryId);
                          return (
                            <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                              <div className="mb-1 flex items-center gap-1.5">
                                <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">YPOP Incentive Grant</p>
                              </div>
                              <p className="text-sm text-amber-800">
                                This budget request is linked to your{linked ? ` ${linked.semesterLabel}` : ""} YPOP qualification. It will be reviewed as a Project Grant (PPA).
                              </p>
                            </div>
                          );
                        })()}
                        {budgetRequests.find((r) => r.id === budgetForm.id)?.status === "needs_revision" && (
                          <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                            <div className="mb-1 flex items-center gap-1.5">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Feedback</p>
                            </div>
                            <p className="text-sm text-amber-800">
                              {getLatestBudgetAdminFeedback(budgetRequests.find((r) => r.id === budgetForm.id) ?? null) || "No comment was provided."}
                            </p>
                          </div>
                        )}
                        <div className="grid gap-4 lg:grid-cols-2">
                          <section className="budget-form-section grid gap-3 lg:contents">
                            <div className="budget-form-section-header mb-3.5 flex items-center gap-3 lg:hidden">
                              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                Activity Information
                              </h3>
                              <span className="h-px flex-1 bg-border" aria-hidden="true" />
                            </div>
                            <div className="budget-form-section-fields grid gap-4 lg:contents">
                              <div className="budget-form-field space-y-1.5 lg:space-y-2 lg:col-span-2">
                                <Label htmlFor="budget-title">
                                  Activity Title <span className="ml-1 text-destructive">*</span>
                                </Label>
                                <Input
                                  id="budget-title"
                                  value={budgetForm.activityTitle}
                                  onChange={(event) => setBudgetForm((current) => ({ ...current, activityTitle: event.target.value }))}
                                  placeholder="Youth leadership training"
                                  required
                                />
                              </div>
                              <div className="budget-form-field space-y-1.5 lg:space-y-2 lg:col-span-2">
                                <Label htmlFor="budget-description">
                                  Description <span className="ml-1 text-destructive">*</span>
                                </Label>
                                <Textarea
                                  id="budget-description"
                                  value={budgetForm.activityDescription}
                                  onChange={(event) => setBudgetForm((current) => ({ ...current, activityDescription: event.target.value }))}
                                  placeholder="Explain the activity, expected participants, and goals."
                                  rows={4}
                                  required
                                  className="min-h-24 resize-y"
                                />
                              </div>
                              <div className="budget-form-two-column grid gap-4 min-[600px]:grid-cols-2 lg:contents">
                                <div className="budget-form-field space-y-1.5 lg:space-y-2">
                                  <Label htmlFor="budget-date">
                                    Proposed Date <span className="ml-1 text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id="budget-date"
                                    type="date"
                                    value={budgetForm.activityDate}
                                    onChange={(event) => setBudgetForm((current) => ({ ...current, activityDate: event.target.value }))}
                                    required
                                  />
                                </div>
                                <div className="budget-form-field space-y-1.5 lg:space-y-2">
                                  <Label htmlFor="budget-venue">
                                    Venue <span className="ml-1 text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id="budget-venue"
                                    value={budgetForm.venue}
                                    onChange={(event) => setBudgetForm((current) => ({ ...current, venue: event.target.value }))}
                                    placeholder="LYDO Hall"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </section>
                          <section className="budget-form-section mt-1 grid gap-3 lg:contents">
                            <div className="budget-form-section-header mb-3.5 flex items-center gap-3 lg:hidden">
                              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                Budget Information
                              </h3>
                              <span className="h-px flex-1 bg-border" aria-hidden="true" />
                            </div>
                            <div className="budget-form-section-fields grid gap-4 lg:contents">
                              <div className="budget-form-two-column grid gap-4 min-[600px]:grid-cols-2 lg:contents">
                                <div className="budget-form-field space-y-1.5 lg:space-y-2">
                                  <Label htmlFor="budget-amount">
                                    Requested Amount <span className="ml-1 text-destructive">*</span>
                                  </Label>
                                  <div className="flex overflow-hidden rounded-md border border-input bg-background">
                                    <span className="inline-flex items-center border-r border-input px-3 text-sm font-medium text-muted-foreground">PHP</span>
                                    <Input
                                      id="budget-amount"
                                      type="number"
                                      min="0.01"
                                      step="0.01"
                                      value={budgetForm.requestedAmount || ""}
                                      onChange={(event) =>
                                        setBudgetForm((current) => ({
                                          ...current,
                                          requestedAmount: Number(event.target.value || 0),
                                        }))
                                      }
                                      placeholder="15000"
                                      className="border-0 shadow-none focus-visible:ring-0"
                                    />
                                  </div>
                                </div>
                                <div className="budget-form-field space-y-1.5 lg:space-y-2">
                                  <Label htmlFor="budget-category">
                                    Purpose and Category <span className="ml-1 text-destructive">*</span>
                                  </Label>
                                  <Input
                                    id="budget-category"
                                    value={budgetForm.purposeCategory}
                                    onChange={(event) => setBudgetForm((current) => ({ ...current, purposeCategory: event.target.value }))}
                                    placeholder="Capacity building / training"
                                    required
                                  />
                                </div>
                              </div>
                            </div>
                          </section>
                          <section className="budget-form-section mt-1 grid gap-3 lg:contents">
                            <div className="budget-form-section-header mb-3.5 flex items-center gap-3 lg:hidden">
                              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                                Supporting Details
                              </h3>
                              <span className="h-px flex-1 bg-border" aria-hidden="true" />
                            </div>
                            <div className="budget-form-section-fields grid gap-4 lg:contents">
                              <div className="budget-form-field space-y-1.5 lg:space-y-2 lg:col-span-2">
                                <Label htmlFor="budget-remarks">
                                  Remarks for Admin <span className="ml-1 text-destructive">*</span>
                                </Label>
                                <Textarea
                                  id="budget-remarks"
                                  value={budgetForm.remarks}
                                  onChange={(event) => setBudgetForm((current) => ({ ...current, remarks: event.target.value }))}
                                  placeholder="Add your request note, justification, or other details for the admin."
                                  rows={3}
                                  required
                                  className="min-h-24 resize-y"
                                />
                              </div>
                              <div className="budget-form-field space-y-1.5 lg:space-y-2 lg:col-span-2">
                                <Label htmlFor="budget-file">
                                  Detailed Document <span className="ml-1 text-destructive">*</span>
                                </Label>
                                <div className="relative">
                                  <Input
                                    id="budget-file"
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    onChange={handleBudgetFileDraftChange}
                                    className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0 lg:static lg:z-auto lg:h-auto lg:cursor-default lg:opacity-100"
                                  />
                                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3 lg:hidden">
                                    <div className="flex items-start gap-3">
                                      <div className="rounded-lg border border-border/60 bg-background p-2 text-primary">
                                        <FileText className="h-4 w-4" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-foreground">
                                          {budgetFileDraft ? budgetFileDraft.name : budgetRequestFilesByBudgetId.get(budgetForm.id)?.fileName ?? "Upload PDF"}
                                        </p>
                                        <p className="mt-0.5 text-xs text-muted-foreground">
                                          {budgetFileDraft
                                            ? `${(budgetFileDraft.size / 1024 / 1024).toFixed(1)} MB`
                                            : budgetRequestFilesByBudgetId.get(budgetForm.id)
                                              ? "Current attached file"
                                              : "No file selected"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                                <p className="text-[11px] leading-snug text-muted-foreground">
                                  PDF only. Upload the budget document with full breakdown and supporting details.
                                </p>
                                {budgetFileDraft ? (
                                  <p className="hidden text-xs text-foreground lg:block">Selected: {budgetFileDraft.name}</p>
                                ) : null}
                                {!budgetFileDraft && budgetRequestFilesByBudgetId.get(budgetForm.id) ? (
                                  <p className="hidden text-xs text-foreground lg:block">
                                    Current file: {budgetRequestFilesByBudgetId.get(budgetForm.id)?.fileName}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </section>
                          {budgetRequests.find((r) => r.id === budgetForm.id)?.status === "needs_revision" && (
                            <div className="budget-form-field space-y-1.5 lg:space-y-2 lg:col-span-2">
                              <Label htmlFor="budget-user-note">
                                Message with resubmission{" "}
                                <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                              </Label>
                              <Textarea
                                id="budget-user-note"
                                value={budgetForm.userNote ?? ""}
                                onChange={(e) => setBudgetForm((current) => ({ ...current, userNote: e.target.value }))}
                                placeholder="Briefly explain what you changed or clarify anything for the admin."
                                rows={3}
                                className="resize-none text-sm"
                              />
                            </div>
                          )}
                        </div>
                        <div className="budget-form-actions mt-4 grid gap-2 border-t border-border/60 pt-4 sm:grid-cols-2 lg:mt-0 lg:flex lg:flex-wrap lg:border-t lg:border-border/40 lg:pt-4">
                          <Button
                            type="button"
                            disabled={savingBudgetRequest}
                            onClick={() => void saveBudgetRequest("draft")}
                            className="order-2 w-full border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground sm:w-auto lg:order-none lg:border-0 lg:bg-primary lg:text-primary-foreground lg:hover:bg-primary-hover lg:active:bg-primary-active"
                          >
                            {savingBudgetRequest ? "Saving..." : "Save Draft"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={savingBudgetRequest}
                            onClick={() => void saveBudgetRequest("submitted")}
                            className="order-1 w-full bg-primary text-primary-foreground hover:bg-primary-hover active:bg-primary-active hover:text-primary-foreground sm:w-auto lg:order-none lg:border lg:border-primary/55 lg:bg-card lg:text-primary lg:hover:bg-primary/5 lg:hover:text-primary lg:active:bg-primary-soft"
                          >
                            Submit for Review
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={savingBudgetRequest}
                            onClick={() => { setShowBudgetForm(false); resetBudgetForm(); }}
                            className="order-3 w-full justify-center sm:col-span-2 sm:w-auto lg:order-none"
                          >
                            Cancel
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(() => {
                      const totalRequests = budgetRequests.length;
                      const pendingReviewCount = budgetRequests.filter((r) => r.status === "submitted" || r.status === "under_review").length;
                      const needsRevisionCount = budgetRequests.filter((r) => r.status === "needs_revision").length;
                      const approvedCount = budgetRequests.filter((r) =>
                        r.status === "approved_for_ftf_green" ||
                        r.status === "hard_copy_submitted" ||
                        r.status === "budget_released" ||
                        r.status === "completed"
                      ).length;
                      const budgetSummaryItems = [
                        {
                          label: "Total Requests",
                          value: totalRequests,
                          helper: "All time",
                          icon: ClipboardList,
                          iconTone: "bg-primary/10 text-primary",
                        },
                        {
                          label: "Under Review",
                          value: pendingReviewCount,
                          helper: "Awaiting admin",
                          icon: Eye,
                          iconTone: "bg-amber-500/10 text-amber-600",
                        },
                        {
                          label: "Needs Revision",
                          value: needsRevisionCount,
                          helper: "Action required",
                          icon: AlertTriangle,
                          iconTone: "bg-orange-500/10 text-orange-600",
                        },
                        {
                          label: "Approved",
                          value: approvedCount,
                          helper: "Approved or released",
                          icon: CheckCircle2,
                          iconTone: "bg-emerald-500/10 text-emerald-600",
                        },
                      ];
                      const budgetStatusSecondaryMap: Partial<Record<BudgetRequest["status"], string>> = {
                        draft: "Draft saved",
                        submitted: "Awaiting admin review",
                        under_review: "Currently under review",
                        needs_revision: "Admin feedback received",
                        approved_for_ftf_green: "Submit Onsite",
                        hard_copy_submitted: "Hardcopy Submitted",
                        budget_released: "Budget Released",
                        completed: "Completed",
                        rejected_red: "Rejected",
                      };
                      const filteredRequests = [...budgetRequests]
                        .filter((request) => {
                          const query = budgetSearch.trim().toLowerCase();
                          if (!query) return true;
                          return [
                            request.activityTitle,
                            request.id,
                            request.venue,
                            request.purposeCategory,
                          ].some((value) => value?.toLowerCase().includes(query));
                        })
                        .filter((request) => (budgetStatusFilter === "all" ? true : request.status === budgetStatusFilter))
                        .filter((request) => {
                          if (budgetDateRangeFilter === "all") return true;
                          const dateValue = request.activityDate || request.createdAt;
                          const baseDate = new Date(dateValue);
                          if (Number.isNaN(baseDate.getTime())) return false;
                          const now = new Date();
                          const diffDays = (now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
                          if (budgetDateRangeFilter === "30d") return diffDays <= 30;
                          if (budgetDateRangeFilter === "90d") return diffDays <= 90;
                          return baseDate.getFullYear() === now.getFullYear();
                        })
                        .sort((left, right) => {
                          if (budgetSortOrder === "oldest") {
                            return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
                          }
                          if (budgetSortOrder === "requested_desc") {
                            return (right.requestedAmount || 0) - (left.requestedAmount || 0);
                          }
                          if (budgetSortOrder === "requested_asc") {
                            return (left.requestedAmount || 0) - (right.requestedAmount || 0);
                          }
                          return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
                        });
                      const totalFilteredRequests = filteredRequests.length;
                      const hasActiveBudgetFilters =
                        Boolean(budgetSearch.trim()) ||
                        budgetStatusFilter !== "all" ||
                        budgetDateRangeFilter !== "all";
                      const totalBudgetPages = Math.max(1, Math.ceil(totalFilteredRequests / budgetRowsPerPage));
                      const safeBudgetPage = Math.min(budgetPage, totalBudgetPages);
                      const startIndex = totalFilteredRequests === 0 ? 0 : (safeBudgetPage - 1) * budgetRowsPerPage;
                      const endIndexExclusive = startIndex + budgetRowsPerPage;
                      const paginatedRequests = filteredRequests.slice(startIndex, endIndexExclusive);
                      const showingFrom = totalFilteredRequests === 0 ? 0 : startIndex + 1;
                      const showingTo = totalFilteredRequests === 0 ? 0 : Math.min(endIndexExclusive, totalFilteredRequests);
                      const rowPaddingClass = "py-3 lg:px-3.5 lg:py-3.5";
                      const uniqueStatuses = Array.from(new Set(budgetRequests.map((request) => request.status)));
                      const mobileBudgetRequestId = searchParams.get("budgetRequestId");
                      const openBudgetMobileDetail = (requestId: string) => {
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.set("budgetRequestId", requestId);
                        navigate(`${userRouteMap["budget-request"]}?${nextParams.toString()}`);
                      };
                      const closeBudgetMobileDetail = () => {
                        const nextParams = new URLSearchParams(searchParams);
                        nextParams.delete("budgetRequestId");
                        const nextQuery = nextParams.toString();
                        navigate(nextQuery ? `${userRouteMap["budget-request"]}?${nextQuery}` : userRouteMap["budget-request"]);
                      };
                      const selectedMobileBudgetRequest = mobileBudgetRequestId
                        ? budgetRequests.find((request) => request.id === mobileBudgetRequestId) ?? null
                        : null;
                      const isShowingMobileBudgetDetail = !isBudgetDesktopViewport && !showBudgetForm && Boolean(mobileBudgetRequestId);

                      if (isShowingMobileBudgetDetail) {
                        if (!selectedMobileBudgetRequest) {
                          return (
                            <div className="space-y-4 lg:hidden">
                              <button
                                type="button"
                                onClick={closeBudgetMobileDetail}
                                className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <ArrowLeft className="h-4 w-4" />
                                Back to Budget Requests
                              </button>
                              <PortalEmptyState
                                title="Budget request not found"
                                description="The selected budget request could not be loaded. Return to the request list and try again."
                                action={
                                  <Button type="button" variant="outline" className="h-10" onClick={closeBudgetMobileDetail}>
                                    Back to Requests
                                  </Button>
                                }
                              />
                            </div>
                          );
                        }

                        const selectedBudgetFile = budgetRequestFilesByBudgetId.get(selectedMobileBudgetRequest.id);
                        const selectedLatestActivity = selectedMobileBudgetRequest.revisionHistory?.length
                          ? selectedMobileBudgetRequest.revisionHistory[selectedMobileBudgetRequest.revisionHistory.length - 1]
                          : null;
                        const selectedAdditionalActivities = Math.max((selectedMobileBudgetRequest.revisionHistory?.length ?? 0) - 3, 0);
                        const selectedSecondaryStatus =
                          budgetStatusSecondaryMap[selectedMobileBudgetRequest.status] ?? formatStatusLabel(selectedMobileBudgetRequest.status);
                        const canEditOrDelete = !approvedBudgetStatuses.has(selectedMobileBudgetRequest.status);

                        return (
                          <div className="space-y-4 lg:hidden">
                            <button
                              type="button"
                              onClick={closeBudgetMobileDetail}
                              className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                            >
                              <ArrowLeft className="h-4 w-4" />
                              Back to Budget Requests
                            </button>

                            <Card className="border-border/70 shadow-sm">
                              <CardContent className="space-y-4 p-4 sm:p-5">
                                <div className="space-y-2">
                                  <div className="flex flex-wrap items-start gap-2">
                                    <h2 className="text-lg font-semibold leading-snug text-foreground">
                                      {selectedMobileBudgetRequest.activityTitle || "Untitled request"}
                                    </h2>
                                    {selectedMobileBudgetRequest.budgetRequestType === "ypop_incentive" ? (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        <Trophy className="h-2.5 w-2.5 text-amber-600" />
                                        YPOP
                                      </span>
                                    ) : null}
                                  </div>
                                  <div className="flex flex-wrap gap-2">
                                    <PortalStatusBadge status={selectedMobileBudgetRequest.status} />
                                  </div>
                                  {selectedMobileBudgetRequest.purposeCategory ? (
                                    <p className="text-sm text-muted-foreground">{selectedMobileBudgetRequest.purposeCategory}</p>
                                  ) : null}
                                </div>

                                <div className="grid gap-3 min-[360px]:grid-cols-2">
                                  <div className="min-w-0 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Request ID</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground break-words">
                                      {buildPublicRecordCode("BR", selectedMobileBudgetRequest, budgetRequests)}
                                    </p>
                                  </div>
                                  <div className="min-w-0 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Requested</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground break-words">
                                      {formatCurrency(selectedMobileBudgetRequest.requestedAmount || 0)}
                                    </p>
                                  </div>
                                  <div className="min-w-0 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                                    <p className="mt-1 text-sm font-semibold text-emerald-600 break-words">
                                      {selectedMobileBudgetRequest.approvedAmount ? formatCurrency(selectedMobileBudgetRequest.approvedAmount) : "—"}
                                    </p>
                                  </div>
                                  <div className="min-w-0 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Venue</p>
                                    <p className="mt-1 text-sm font-semibold text-foreground break-words">
                                      {selectedMobileBudgetRequest.venue || "Not set"}
                                    </p>
                                  </div>
                                </div>

                                <div className="grid gap-3 border-y border-border/60 py-3">
                                  <div className="min-w-0">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Proposed Date</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">
                                      {selectedMobileBudgetRequest.activityDate ? formatShortPortalDate(selectedMobileBudgetRequest.activityDate) : "Not set"}
                                    </p>
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Created</p>
                                    <p className="mt-1 text-sm font-medium text-foreground">
                                      {formatDateTimeLabel(selectedMobileBudgetRequest.createdAt)}
                                    </p>
                                  </div>
                                </div>

                                <div className="space-y-3 border-t border-border/50 pt-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">File Information</p>
                                  {selectedBudgetFile ? (
                                    <div className="flex min-w-0 items-start gap-3">
                                      <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                                        <FileText className="h-4 w-4 text-red-500" />
                                      </div>
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className="overflow-hidden text-sm font-medium leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                                          title={selectedBudgetFile.fileName}
                                        >
                                          {selectedBudgetFile.fileName}
                                        </p>
                                        <p className="mt-1 text-xs text-muted-foreground">
                                          PDF • {selectedBudgetFile.fileSize ? `${Math.max(1, Math.round(selectedBudgetFile.fileSize / 1024))} KB` : "file attached"}
                                        </p>
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-sm text-muted-foreground">No file attached</p>
                                  )}
                                </div>

                                <div className="border-t border-border/50 pt-4">
                                  <RecentActivityPreview
                                    title="Recent Activity"
                                    activities={
                                      selectedMobileBudgetRequest.revisionHistory?.length
                                        ? selectedMobileBudgetRequest.revisionHistory.map((entry, index) => ({
                                            id: `${entry.action}-${entry.changedAt}-${index}`,
                                            message: budgetActionLabels[entry.action] ?? entry.action,
                                            note: entry.adminRemarks?.trim() || undefined,
                                            timestamp: entry.changedAt,
                                            timestampLabel: formatDateTimeLabel(entry.changedAt),
                                          }))
                                        : [
                                            {
                                              id: `${selectedMobileBudgetRequest.id}-status`,
                                              message: selectedSecondaryStatus,
                                              timestamp: selectedMobileBudgetRequest.updatedAt,
                                              timestampLabel: formatDateTimeLabel(selectedMobileBudgetRequest.updatedAt),
                                            },
                                          ]
                                    }
                                    onViewAll={
                                      selectedAdditionalActivities > 0
                                        ? () => openBudgetRecentActivityModal(selectedMobileBudgetRequest)
                                        : undefined
                                    }
                                    className="border-0 bg-transparent p-0 shadow-none"
                                    headerClassName="mb-2"
                                  />
                                </div>

                                <div className="space-y-3 border-t border-border/50 pt-4">
                                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Available Actions</p>
                                  <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                                    {selectedBudgetFile ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal"
                                        onClick={() => void openFile(selectedBudgetFile.fileUrl, selectedBudgetFile.fileName)}
                                      >
                                        <Eye className="mr-2 h-4 w-4" />
                                        Open File
                                      </Button>
                                    ) : null}
                                    {canEditOrDelete ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal"
                                        onClick={() => {
                                          closeBudgetMobileDetail();
                                          startEditingBudgetRequest(selectedMobileBudgetRequest);
                                          setShowBudgetForm(true);
                                        }}
                                      >
                                        <PenSquare className="mr-2 h-4 w-4" />
                                        Edit Request
                                      </Button>
                                    ) : null}
                                    {canEditOrDelete ? (
                                      <Button
                                        type="button"
                                        variant="outline"
                                        className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal border-destructive/30 text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                                        onClick={() => {
                                          closeBudgetMobileDetail();
                                          handleDeleteBudgetRequest(selectedMobileBudgetRequest);
                                        }}
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Request
                                      </Button>
                                    ) : null}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-4">
                          <div className="budget-summary-grid grid grid-cols-2 gap-2.5 lg:hidden">
                            {budgetSummaryItems.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Card key={item.label} className="budget-summary-card min-w-0 border-border/70 shadow-sm">
                                  <CardContent className="flex min-h-[124px] flex-col p-3">
                                    <div className="budget-summary-header flex items-start justify-between gap-2">
                                      <p className="min-w-0 text-[0.68rem] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground">
                                        {item.label}
                                      </p>
                                      <UserFeatureIcon icon={Icon} />
                                    </div>
                                    <p className="budget-summary-value mt-3 text-[1.7rem] font-semibold leading-none text-foreground">
                                      {item.value}
                                    </p>
                                    <p className="budget-summary-description mt-auto pt-2 text-xs leading-[1.35] text-muted-foreground">
                                      {item.helper}
                                    </p>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>

                          <div className="budget-summary-grid hidden gap-3 lg:grid lg:grid-cols-4">
                            {budgetSummaryItems.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Card key={item.label} className="budget-summary-card min-w-0 border-border/70 shadow-sm">
                                  <CardContent className="flex min-h-[96px] items-center gap-3 p-3.5 xl:px-4">
                                    <UserFeatureIcon icon={Icon} />
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium uppercase tracking-[0.06em] text-muted-foreground">{item.label}</p>
                                      <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{item.value}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>

                          <Card className="overflow-hidden border-border/70 shadow-sm">
                            <CardContent className="space-y-3 p-3.5 sm:p-4 lg:space-y-4 lg:p-5">
                              <div className="flex flex-col gap-2 lg:hidden">
                                <div className="budget-filter-grid grid grid-cols-2 gap-2">
                                  <div className="budget-search relative col-span-2 min-w-0">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      value={budgetSearch}
                                      onChange={(event) => setBudgetSearch(event.target.value)}
                                      placeholder="Search by title, venue, or ID"
                                      className="h-10 pl-9 text-sm"
                                    />
                                  </div>
                                  <div className="relative min-w-0">
                                    <select
                                      value={budgetStatusFilter}
                                      onChange={(event) => setBudgetStatusFilter(event.target.value as "all" | BudgetRequest["status"])}
                                      className={`${budgetNativeSelectClass} h-10 text-sm`}
                                    >
                                      <option value="all">Status: All</option>
                                      {uniqueStatuses.map((status) => (
                                        <option key={status} value={status}>
                                          {formatStatusLabel(status)}
                                        </option>
                                      ))}
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  </div>
                                  <div className="relative min-w-0">
                                    <select
                                      value={budgetDateRangeFilter}
                                      onChange={(event) => setBudgetDateRangeFilter(event.target.value as "all" | "30d" | "90d" | "year")}
                                      className={`${budgetNativeSelectClass} h-10 text-sm`}
                                    >
                                      <option value="all">Date range</option>
                                      <option value="30d">Last 30 days</option>
                                      <option value="90d">Last 90 days</option>
                                      <option value="year">This year</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  </div>
                                  <div className="relative min-w-0">
                                    <select
                                      value={budgetSortOrder}
                                      onChange={(event) => setBudgetSortOrder(event.target.value as "newest" | "oldest" | "requested_desc" | "requested_asc")}
                                      className={`${budgetNativeSelectClass} h-10 text-sm`}
                                    >
                                      <option value="newest">Newest</option>
                                      <option value="oldest">Oldest</option>
                                      <option value="requested_desc">Highest amount</option>
                                      <option value="requested_asc">Lowest amount</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>

                              <div className="budget-toolbar hidden items-center gap-2.5 lg:grid lg:grid-cols-[minmax(220px,1.4fr)_minmax(135px,0.75fr)_minmax(130px,0.65fr)_minmax(0,1fr)_minmax(150px,auto)]">
                                <div className="relative min-w-0">
                                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  <Input
                                    value={budgetSearch}
                                    onChange={(event) => setBudgetSearch(event.target.value)}
                                    placeholder="Search requests..."
                                    className="h-10 pl-9"
                                  />
                                </div>
                                <div className="relative min-w-0">
                                  <select
                                    value={budgetStatusFilter}
                                    onChange={(event) => setBudgetStatusFilter(event.target.value as "all" | BudgetRequest["status"])}
                                    className={`${budgetNativeSelectClass} h-10`}
                                  >
                                    <option value="all">Status: All</option>
                                    {uniqueStatuses.map((status) => (
                                      <option key={status} value={status}>
                                        {formatStatusLabel(status)}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                                <div className="relative min-w-0">
                                  <select
                                    value={budgetDateRangeFilter}
                                    onChange={(event) => setBudgetDateRangeFilter(event.target.value as "all" | "30d" | "90d" | "year")}
                                    className={`${budgetNativeSelectClass} h-10`}
                                  >
                                    <option value="all">Date range</option>
                                    <option value="30d">Last 30 days</option>
                                    <option value="90d">Last 90 days</option>
                                    <option value="year">This year</option>
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                                <div aria-hidden="true" />
                                <div className="relative min-w-0">
                                  <select
                                    value={budgetSortOrder}
                                    onChange={(event) => setBudgetSortOrder(event.target.value as "newest" | "oldest" | "requested_desc" | "requested_asc")}
                                    className={`${budgetNativeSelectClass} h-10`}
                                  >
                                    <option value="newest">Sort: Newest</option>
                                    <option value="oldest">Sort: Oldest</option>
                                    <option value="requested_desc">Highest amount</option>
                                    <option value="requested_asc">Lowest amount</option>
                                  </select>
                                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                </div>
                              </div>

                              <div className="hidden text-xs text-muted-foreground lg:block">
                                {totalFilteredRequests} {hasActiveBudgetFilters ? "matching " : ""}
                                request{totalFilteredRequests === 1 ? "" : "s"}
                              </div>

                              {totalFilteredRequests ? (
                                <>
                                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground lg:hidden">
                                    <span>{totalFilteredRequests} request{totalFilteredRequests === 1 ? "" : "s"}</span>
                                    <span>
                                      {budgetSortOrder === "oldest"
                                        ? "Sorted by oldest"
                                        : budgetSortOrder === "requested_desc"
                                          ? "Highest amount"
                                          : budgetSortOrder === "requested_asc"
                                            ? "Lowest amount"
                                            : "Sorted by newest"}
                                    </span>
                                  </div>
                                  <div className="space-y-3 lg:hidden">
                                    {paginatedRequests.map((request) => {
                                      const requestCode = buildPublicRecordCode("BR", request, budgetRequests);
                                      const requestedAmount = formatCurrency(request.requestedAmount || 0);
                                      return (
                                        <Card key={request.id} className="budget-request-card border-border/70 shadow-sm">
                                          <CardContent className="grid gap-[11px] p-[14px]">
                                            <div className="budget-card-header grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                                              <div className="min-w-0">
                                                <p className="budget-card-title overflow-hidden text-sm font-semibold leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
                                                  {request.activityTitle || "Untitled request"}
                                                </p>
                                                {request.budgetRequestType === "ypop_incentive" ? (
                                                  <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                    <Trophy className="h-2.5 w-2.5 text-amber-600" />
                                                    YPOP
                                                  </span>
                                                ) : null}
                                              </div>
                                              <div className="budget-card-status mr-3 max-w-[118px] text-center [&>span]:h-auto [&>span]:max-w-full [&>span]:whitespace-normal [&>span]:text-center [&>span]:leading-tight min-[431px]:mr-0">
                                                <PortalStatusBadge status={request.status} />
                                              </div>
                                            </div>

                                            <p className="min-w-0 text-[0.8rem] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                                              <span>{requestCode}</span>
                                              <span className="text-muted-foreground/60"> · </span>
                                              <span className="budget-card-amount font-semibold tabular-nums text-foreground">{requestedAmount}</span>
                                            </p>

                                            <div className="budget-card-details grid grid-cols-2 gap-3 border-y border-border/60 py-[11px]">
                                              <div className="min-w-0">
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Proposed Date</p>
                                                <p className="mt-1 text-sm font-medium text-foreground">
                                                  {request.activityDate ? formatShortPortalDate(request.activityDate) : "Not set"}
                                                </p>
                                              </div>
                                              <div className="min-w-0">
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Venue</p>
                                                <p className="budget-card-venue mt-1 overflow-hidden text-sm font-medium leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
                                                  {request.venue || "Not set"}
                                                </p>
                                              </div>
                                            </div>

                                            <Button
                                              type="button"
                                              variant="outline"
                                              className="budget-card-action ml-auto h-9 w-full px-3.5 min-[340px]:w-auto"
                                              onClick={() => openBudgetMobileDetail(request.id)}
                                            >
                                              View details
                                              <ChevronRight className="ml-1.5 h-4 w-4" />
                                            </Button>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                  <div className="hidden overflow-x-auto lg:block">
                                    <div className="min-w-[1080px] rounded-2xl border border-border/70 lg:w-full lg:min-w-0 lg:overflow-hidden">
                                      <Table className="budget-requests-table lg:w-full lg:table-fixed">
                                        <TableHeader>
                                          <TableRow className="bg-muted/15 hover:bg-muted/15">
                                            <TableHead className="w-[22%] lg:w-[24%] lg:px-3.5 lg:py-3">Request</TableHead>
                                            <TableHead className="w-[14%] lg:w-[13%] lg:px-3.5 lg:py-3">Status</TableHead>
                                            <TableHead className="w-[12%] lg:w-[10%] lg:px-3.5 lg:py-3">Proposed Date</TableHead>
                                            <TableHead className="w-[12%] lg:w-[10%] lg:px-3.5 lg:py-3">Venue</TableHead>
                                            <TableHead className="w-[16%] lg:w-[17%] lg:px-3.5 lg:py-3">Amounts (PHP)</TableHead>
                                            <TableHead className="w-[14%] lg:w-[16%] lg:px-3.5 lg:py-3">File</TableHead>
                                            <TableHead className="w-[10%] lg:w-[10%] lg:px-3.5 lg:py-3">Recent Activity</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {paginatedRequests.map((request) => {
                                            const attachedFile = budgetRequestFilesByBudgetId.get(request.id);
                                            const latestActivity = request.revisionHistory?.length
                                              ? request.revisionHistory[request.revisionHistory.length - 1]
                                              : null;
                                            const additionalActivities = Math.max((request.revisionHistory?.length ?? 0) - 1, 0);
                                            const secondaryStatus = budgetStatusSecondaryMap[request.status] ?? formatStatusLabel(request.status);
                                            return (
                                              <TableRow key={request.id} className="align-middle transition-colors lg:align-top lg:hover:bg-muted/20">
                                                <TableCell className={`${rowPaddingClass} align-middle lg:align-top`}>
                                                  <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <p className="font-semibold leading-snug text-foreground lg:line-clamp-2 lg:[overflow-wrap:anywhere]">
                                                        {request.activityTitle || "Untitled request"}
                                                      </p>
                                                      {request.budgetRequestType === "ypop_incentive" ? (
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                                          <Trophy className="h-2.5 w-2.5 text-amber-600" />
                                                          YPOP
                                                        </span>
                                                      ) : null}
                                                    </div>
                                                    <p className="text-xs text-primary">Request ID: {buildPublicRecordCode("BR", request, budgetRequests)}</p>
                                                    <p className="text-xs text-muted-foreground">Created {formatDateTimeLabel(request.createdAt)}</p>
                                                  </div>
                                                </TableCell>
                                                <TableCell className={`${rowPaddingClass} align-middle lg:align-top`}>
                                                  <div className="inline-flex lg:max-w-[132px] lg:[&>span]:h-auto lg:[&>span]:max-w-full lg:[&>span]:whitespace-normal lg:[&>span]:text-center lg:[&>span]:leading-[1.2]">
                                                    <PortalStatusBadge status={request.status} />
                                                  </div>
                                                </TableCell>
                                                <TableCell className={`${rowPaddingClass} align-middle`}>
                                                  <p className="text-sm text-foreground">
                                                    {request.activityDate
                                                      ? new Date(request.activityDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                                      : "Not set"}
                                                  </p>
                                                </TableCell>
                                                <TableCell className={`${rowPaddingClass} align-middle`}>
                                                  <p className="text-sm text-foreground">{request.venue || "Not set"}</p>
                                                </TableCell>
                                                <TableCell className={`${rowPaddingClass} align-middle lg:align-top`}>
                                                  <div className="space-y-2 text-sm">
                                                    <div>
                                                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Requested</p>
                                                      <p className="font-medium tabular-nums text-foreground">{formatCurrency(request.requestedAmount || 0)}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Approved</p>
                                                      <p className="font-semibold tabular-nums text-emerald-600 lg:text-foreground/80">
                                                        {request.approvedAmount ? formatCurrency(request.approvedAmount) : "—"}
                                                      </p>
                                                    </div>
                                                  </div>
                                                </TableCell>
                                                <TableCell className={`${rowPaddingClass} align-middle lg:align-top`}>
                                                  {attachedFile ? (
                                                    <div className="flex items-start gap-2.5">
                                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 lg:hidden">
                                                        <FileText className="h-4 w-4 text-red-500" />
                                                      </div>
                                                      <UserFeatureIcon icon={FileText} size="compact" className="hidden lg:inline-grid" />
                                                      <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground lg:break-normal lg:[overflow-wrap:anywhere]">{attachedFile.fileName}</p>
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                          PDF • {attachedFile.fileSize ? `${Math.max(1, Math.round(attachedFile.fileSize / 1024))} KB` : "file attached"}
                                                        </p>
                                                      </div>
                                                      <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0" aria-label="Open request file actions">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                          </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                          <DropdownMenuItem onClick={() => void openFile(attachedFile.fileUrl, attachedFile.fileName)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Open File
                                                          </DropdownMenuItem>
                                                          <DropdownMenuSeparator />
                                                          {!approvedBudgetStatuses.has(request.status) ? (
                                                            <>
                                                              <DropdownMenuItem onClick={() => { startEditingBudgetRequest(request); setShowBudgetForm(true); }}>
                                                                <PenSquare className="mr-2 h-4 w-4" />
                                                                Edit Request
                                                              </DropdownMenuItem>
                                                              <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDeleteBudgetRequest(request)}
                                                              >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Delete Request
                                                              </DropdownMenuItem>
                                                            </>
                                                          ) : null}
                                                        </DropdownMenuContent>
                                                      </DropdownMenu>
                                                    </div>
                                                  ) : (
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70 lg:hidden">
                                                        <FileText className="h-4 w-4 text-red-500" />
                                                      </div>
                                                      <UserFeatureIcon icon={FileText} size="compact" className="hidden lg:inline-grid" />
                                                      <span>No file attached</span>
                                                    </div>
                                                  )}
                                                </TableCell>
                                                <TableCell className={rowPaddingClass}>
                                                  <div className="space-y-1">
                                                    <p className="text-sm leading-snug text-foreground lg:line-clamp-2">
                                                      {latestActivity ? (budgetActionLabels[latestActivity.action] ?? latestActivity.action) : secondaryStatus}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                      {latestActivity ? formatDateTimeLabel(latestActivity.changedAt) : formatDateTimeLabel(request.updatedAt)}
                                                    </p>
                                                    {additionalActivities > 0 ? (
                                                      <button
                                                        type="button"
                                                        className="text-xs font-medium text-primary hover:underline"
                                                        onClick={() => openBudgetRecentActivityModal(request)}
                                                      >
                                                        +{additionalActivities} more
                                                      </button>
                                                    ) : null}
                                                  </div>
                                                </TableCell>
                                              </TableRow>
                                            );
                                          })}
                                        </TableBody>
                                      </Table>
                                  </div>
                                  </div>

                                  <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-muted-foreground">
                                      Showing {showingFrom} to {showingTo} of {totalFilteredRequests} requests
                                    </p>
                                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                      <Select value={String(budgetRowsPerPage)} onValueChange={(value) => setBudgetRowsPerPage(Number(value) as 10 | 25 | 50)}>
                                        <SelectTrigger className="h-9 w-[110px]">
                                          <SelectValue placeholder="Rows" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="10">10 / page</SelectItem>
                                          <SelectItem value="25">25 / page</SelectItem>
                                          <SelectItem value="50">50 / page</SelectItem>
                                        </SelectContent>
                                      </Select>
                                      <div className="flex items-center gap-1">
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="outline"
                                          className="h-9 w-9"
                                          disabled={safeBudgetPage <= 1}
                                          onClick={() => setBudgetPage((current) => Math.max(1, current - 1))}
                                        >
                                          <ChevronsLeft className="h-4 w-4" />
                                        </Button>
                                        <div className="flex h-9 min-w-[2.5rem] items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-3 text-sm font-medium text-primary">
                                          {safeBudgetPage}
                                        </div>
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="outline"
                                          className="h-9 w-9"
                                          disabled={safeBudgetPage >= totalBudgetPages}
                                          onClick={() => setBudgetPage((current) => Math.min(totalBudgetPages, current + 1))}
                                        >
                                          <ChevronsRight className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  </div>
                                </>
                              ) : (
                                <PortalEmptyState
                                  title="No matching budget requests"
                                  description="Try adjusting your search, status, or date range filters."
                                />
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </PortalSection>
            </div>
          );
      }
      case "liquidation-reporting": {
        return (
          <div className="user-liquidation-reports-page">
            <PortalSection
              title="Liquidation Reports"
              description={
                <>
                  <span className="lg:hidden">
                    Upload post-activity documents for each approved budget. The admin will review and mark your liquidation complete.
                  </span>
                  <span className="hidden lg:inline">
                    Upload post-activity documents for approved budgets and track their review and completion status.
                  </span>
                </>
              }
              headerClassName="max-lg:gap-1 max-lg:px-3.5 max-lg:pb-2 max-lg:pt-3.5"
            >
            <input
              ref={liquidationFileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
              className="sr-only"
              onChange={async (event) => {
                const targetReport = liquidationReports.find((item) => item.id === liquidationUploadTargetId) ?? null;
                if (targetReport) {
                  await handleLiquidationFileUpload(targetReport, event.target.files);
                }
                event.currentTarget.value = "";
                setLiquidationUploadTargetId(null);
              }}
            />
            {liquidationReports.length ? (
              <div className="space-y-4">
                {(() => {
                  const liquidationActionLabels: Record<string, string> = {
                    submitted: "Submitted for review",
                    needs_revision: "Revision requested",
                    approved_for_ftf_green: "Submit Onsite",
                    hard_copy_submitted: "Hardcopy Submitted",
                    completed_liquidated: "Liquidated",
                    overdue: "Marked as overdue",
                    rejected_red: "Rejected",
                  };
                  const liquidationSubmittableStatuses = new Set<LiquidationStatus>([
                    "pending_activity_completion",
                    "not_started",
                    "draft",
                    "needs_revision",
                    "overdue",
                    "rejected_red",
                  ]);
                  const liquidationLockedStatuses = new Set<LiquidationStatus>([
                    "approved_for_ftf_green",
                    "hard_copy_submitted",
                    "completed_liquidated",
                  ]);
                  const totalReports = liquidationReports.length;
                  const underReviewCount = liquidationReports.filter((report) =>
                    report.status === "submitted" || report.status === "hard_copy_submitted" || report.status === "approved_for_ftf_green"
                  ).length;
                  const needsRevisionCount = liquidationReports.filter((report) =>
                    report.status === "needs_revision" || report.status === "overdue" || report.status === "rejected_red"
                  ).length;
                  const completedCount = liquidationReports.filter((report) => report.status === "completed_liquidated").length;
                  const liquidationSummaryItems = [
                    {
                      label: "Total Reports",
                      value: totalReports,
                      helper: "Approved budgets linked",
                      icon: Receipt,
                    },
                    {
                      label: "Under Review",
                      value: underReviewCount,
                      helper: "Awaiting admin action",
                      icon: Eye,
                    },
                    {
                      label: "Needs Revision",
                      value: needsRevisionCount,
                      helper: "Action required",
                      icon: AlertTriangle,
                    },
                    {
                      label: "Completed",
                      value: completedCount,
                      helper: "Liquidated reports",
                      icon: CheckCircle2,
                    },
                  ];
                  const liquidationStatusSecondaryMap: Partial<Record<LiquidationStatus, string>> = {
                    pending_activity_completion: "Awaiting activity completion",
                    not_started: "Not started",
                    draft: "Draft",
                    submitted: "Submitted for review",
                    needs_revision: "Revision requested",
                    approved_for_ftf_green: "Submit Onsite",
                    hard_copy_submitted: "Hardcopy Submitted",
                    completed_liquidated: "Liquidated",
                    overdue: "Marked overdue",
                    rejected_red: "Rejected",
                  };
                  const mobileLiquidationReportId = searchParams.get("reportId");
                  const openLiquidationDetail = (reportId: string) => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.set("reportId", reportId);
                    navigate(`${userRouteMap["liquidation-reporting"]}?${nextParams.toString()}`);
                  };
                  const closeLiquidationDetail = () => {
                    const nextParams = new URLSearchParams(searchParams);
                    nextParams.delete("reportId");
                    const nextQuery = nextParams.toString();
                    navigate(nextQuery ? `${userRouteMap["liquidation-reporting"]}?${nextQuery}` : userRouteMap["liquidation-reporting"]);
                    setMobileLiquidationFormReportId(null);
                  };
                  const filteredReports = [...liquidationReports]
                    .filter((report) => {
                      const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
                      const query = liquidationSearch.trim().toLowerCase();
                      if (!query) return true;
                      return [
                        relatedBudget?.activityTitle,
                        relatedBudget?.purposeCategory,
                        relatedBudget?.venue,
                        report.id,
                      ].some((value) => value?.toLowerCase().includes(query));
                    })
                    .filter((report) => (liquidationStatusFilter === "all" ? true : report.status === liquidationStatusFilter))
                    .filter((report) => {
                      if (liquidationDateRangeFilter === "all") return true;
                      const dateValue = report.deadlineAt || report.goSignalAt || report.createdAt;
                      const baseDate = new Date(dateValue);
                      if (Number.isNaN(baseDate.getTime())) return false;
                      const now = new Date();
                      const diffDays = (now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24);
                      if (liquidationDateRangeFilter === "30d") return diffDays <= 30;
                      if (liquidationDateRangeFilter === "90d") return diffDays <= 90;
                      return baseDate.getFullYear() === now.getFullYear();
                    })
                    .filter((report) => (liquidationHasFileOnly ? (liquidationFilesByReportId.get(report.id) ?? []).length > 0 : true))
                    .sort((left, right) => {
                      if (liquidationSortOrder === "oldest") {
                        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
                      }
                      if (liquidationSortOrder === "deadline_asc") {
                        return new Date(left.deadlineAt || left.createdAt).getTime() - new Date(right.deadlineAt || right.createdAt).getTime();
                      }
                      if (liquidationSortOrder === "deadline_desc") {
                        return new Date(right.deadlineAt || right.createdAt).getTime() - new Date(left.deadlineAt || left.createdAt).getTime();
                      }
                      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
                    });
                  const totalFilteredReports = filteredReports.length;
                  const hasActiveLiquidationFilters =
                    Boolean(liquidationSearch.trim()) ||
                    liquidationStatusFilter !== "all" ||
                    liquidationDateRangeFilter !== "all" ||
                    liquidationHasFileOnly;
                  const totalLiquidationPages = Math.max(1, Math.ceil(totalFilteredReports / liquidationRowsPerPage));
                  const safeLiquidationPage = Math.min(liquidationPage, totalLiquidationPages);
                  const startIndex = totalFilteredReports === 0 ? 0 : (safeLiquidationPage - 1) * liquidationRowsPerPage;
                  const endIndexExclusive = startIndex + liquidationRowsPerPage;
                  const paginatedReports = filteredReports.slice(startIndex, endIndexExclusive);
                  const showingFrom = totalFilteredReports === 0 ? 0 : startIndex + 1;
                  const showingTo = totalFilteredReports === 0 ? 0 : Math.min(endIndexExclusive, totalFilteredReports);
                  const rowPaddingClass = "px-3.5 py-3.5";
                  const uniqueStatuses = Array.from(new Set(liquidationReports.map((report) => report.status)));
                  const selectedMobileReport = mobileLiquidationReportId
                    ? liquidationReports.find((report) => report.id === mobileLiquidationReportId) ?? null
                    : null;
                  const isShowingMobileLiquidationDetail = !isDesktopViewport && Boolean(mobileLiquidationReportId);

                  if (isShowingMobileLiquidationDetail) {
                    if (!selectedMobileReport) {
                      return (
                        <div className="space-y-4 lg:hidden">
                          <button
                            type="button"
                            onClick={closeLiquidationDetail}
                            className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                          >
                            <ArrowLeft className="h-4 w-4" />
                            Back to Liquidation Reports
                          </button>
                          <PortalEmptyState
                            title="Liquidation report not found"
                            description="The selected report could not be loaded. Return to the report list and try again."
                            action={
                              <Button type="button" variant="outline" className="h-10" onClick={closeLiquidationDetail}>
                                Back to Reports
                              </Button>
                            }
                          />
                        </div>
                      );
                    }

                    const selectedBudget = budgetRequests.find((request) => request.id === selectedMobileReport.budgetRequestId) ?? null;
                    const selectedFiles = liquidationFilesByReportId.get(selectedMobileReport.id) ?? [];
                    const selectedPrimaryFile = selectedFiles[0] ?? null;
                    const selectedLatestActivity = selectedMobileReport.revisionHistory?.length
                      ? selectedMobileReport.revisionHistory[selectedMobileReport.revisionHistory.length - 1]
                      : null;
                    const selectedAdditionalActivities = Math.max((selectedMobileReport.revisionHistory?.length ?? 0) - 3, 0);
                    const selectedSecondaryStatus =
                      liquidationStatusSecondaryMap[selectedMobileReport.status] ?? formatStatusLabel(selectedMobileReport.status);
                    const selectedHasAdminNote =
                      selectedMobileReport.remarks?.trim().length > 0 &&
                      (selectedMobileReport.status === "needs_revision" ||
                        selectedMobileReport.status === "overdue" ||
                        selectedMobileReport.status === "rejected_red");
                    const selectedIsDeadlineUrgent =
                      selectedMobileReport.status === "overdue" ||
                      (selectedMobileReport.deadlineAt ? new Date(selectedMobileReport.deadlineAt) < new Date() : false);
                    const selectedIsSubmittable = liquidationSubmittableStatuses.has(selectedMobileReport.status);
                    const selectedCanRemoveSubmittedFile = !liquidationLockedStatuses.has(selectedMobileReport.status);
                    const selectedCanUploadReplacement =
                      selectedMobileReport.status === "needs_revision" || selectedMobileReport.status === "rejected_red";
                    const selectedIsSubmitting = submittingLiquidationId === selectedMobileReport.id;
                    const selectedHasAttachedFile = selectedFiles.length > 0;
                    const selectedNoteValue = liquidationNotesByReportId[selectedMobileReport.id] ?? "";
                    const selectedFormVisible = selectedIsSubmittable && mobileLiquidationFormReportId === selectedMobileReport.id;

                    return (
                      <div className="space-y-4 lg:hidden">
                        <button
                          type="button"
                          onClick={closeLiquidationDetail}
                          className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          <ArrowLeft className="h-4 w-4" />
                          Back to Liquidation Reports
                        </button>

                        <Card className="border-border/70 shadow-sm">
                          <CardContent className="space-y-4 p-4 sm:p-5">
                            <div className="space-y-2">
                              <h2 className="text-lg font-semibold leading-snug text-foreground">
                                {selectedBudget?.activityTitle || "Approved budget"}
                              </h2>
                              <div className="flex flex-wrap gap-2">
                                <PortalStatusBadge
                                  status={selectedMobileReport.status}
                                  className="whitespace-normal"
                                />
                              </div>
                              {selectedBudget?.purposeCategory ? (
                                <p className="text-sm text-muted-foreground">{selectedBudget.purposeCategory}</p>
                              ) : null}
                            </div>

                            <div className="grid gap-3 min-[360px]:grid-cols-2">
                              <div className="min-w-0 rounded-xl border border-border/60 bg-muted/10 p-3">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Report ID</p>
                                <p className="mt-1 text-sm font-semibold text-foreground break-words">
                                  {buildPublicRecordCode("LR", selectedMobileReport, liquidationReports)}
                                </p>
                              </div>
                              <div className="min-w-0 rounded-xl border border-border/60 bg-muted/10 p-3">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Budget Released</p>
                                <p className="mt-1 text-sm font-semibold text-emerald-600 break-words">
                                  {selectedBudget
                                    ? formatCurrency(selectedBudget.releasedAmount || selectedBudget.approvedAmount || 0)
                                    : "Released budget linked"}
                                </p>
                              </div>
                            </div>

                            <div className="grid gap-3 border-y border-border/60 py-3 min-[360px]:grid-cols-2">
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                <p className="mt-1 text-sm font-medium text-foreground">
                                  {selectedMobileReport.goSignalAt ? formatShortPortalDate(selectedMobileReport.goSignalAt) : "Pending"}
                                </p>
                              </div>
                              <div className="min-w-0">
                                <p className="text-[11px] uppercase tracking-[0.14em] text-destructive">
                                  Deadline
                                </p>
                                <p className="mt-1 text-sm font-semibold text-destructive">
                                  {selectedMobileReport.deadlineAt ? formatShortPortalDate(selectedMobileReport.deadlineAt) : "Pending"}
                                </p>
                              </div>
                            </div>

                            {selectedHasAdminNote ? (
                              <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3">
                                <div className="mb-1 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Feedback</p>
                                </div>
                                <p className="text-sm leading-snug text-amber-800">{selectedMobileReport.remarks.trim()}</p>
                              </div>
                            ) : null}

                            <div className="space-y-3 border-t border-border/50 pt-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">File Information</p>
                              {selectedPrimaryFile ? (
                                <div className="flex min-w-0 items-start gap-3">
                                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                                    <FileText className="h-4 w-4 text-red-500" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p
                                      className="overflow-hidden text-sm font-medium leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]"
                                      title={selectedPrimaryFile.fileName}
                                    >
                                      {selectedPrimaryFile.fileName}
                                    </p>
                                    <p className="mt-1 text-xs text-muted-foreground">
                                      {(selectedPrimaryFile.fileType || "PDF").toUpperCase()} ·{" "}
                                      {selectedPrimaryFile.fileSize
                                        ? `${Math.max(1, Math.round(selectedPrimaryFile.fileSize / 1024))} KB`
                                        : "File attached"}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No file uploaded yet</p>
                              )}
                            </div>

                            <div className="border-t border-border/50 pt-4">
                              <RecentActivityPreview
                                title="Recent Activity"
                                activities={
                                  selectedMobileReport.revisionHistory?.length
                                    ? selectedMobileReport.revisionHistory.map((entry, index) => ({
                                        id: `${entry.action}-${entry.changedAt}-${index}`,
                                        message: liquidationActionLabels[entry.action] ?? entry.action,
                                        note: entry.adminRemarks?.trim() || undefined,
                                        timestamp: entry.changedAt,
                                        timestampLabel: formatDateTimeLabel(entry.changedAt),
                                      }))
                                    : [
                                        {
                                          id: `${selectedMobileReport.id}-status`,
                                          message: selectedSecondaryStatus,
                                          timestamp: selectedMobileReport.updatedAt,
                                          timestampLabel: formatDateTimeLabel(selectedMobileReport.updatedAt),
                                        },
                                      ]
                                }
                                onViewAll={
                                  selectedAdditionalActivities > 0
                                    ? () => openLiquidationRecentActivityModal(selectedMobileReport)
                                    : undefined
                                }
                                className="border-0 bg-transparent p-0 shadow-none"
                                headerClassName="mb-2"
                              />
                            </div>

                            <div className="space-y-3 border-t border-border/50 pt-4">
                              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground/80">Available Actions</p>
                              <div className="grid grid-cols-1 gap-2 min-[430px]:grid-cols-2">
                                {selectedPrimaryFile ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal"
                                    onClick={() => void openFile(selectedPrimaryFile.fileUrl, selectedPrimaryFile.fileName)}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    Open File
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal"
                                    onClick={() => {
                                      setLiquidationUploadTargetId(selectedMobileReport.id);
                                      liquidationFileInputRef.current?.click();
                                    }}
                                  >
                                    <FileUp className="mr-2 h-4 w-4" />
                                    Upload Document
                                  </Button>
                                )}
                                {selectedPrimaryFile && selectedCanUploadReplacement ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal"
                                    onClick={() => {
                                      setLiquidationUploadTargetId(selectedMobileReport.id);
                                      liquidationFileInputRef.current?.click();
                                    }}
                                  >
                                    <FileUp className="mr-2 h-4 w-4" />
                                    Upload Another Document
                                  </Button>
                                ) : null}
                                {selectedPrimaryFile && selectedCanRemoveSubmittedFile ? (
                                  <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal border-destructive/30 text-destructive hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                                    onClick={() =>
                                      requestDeleteConfirmation({
                                        title: "Remove Submitted File",
                                        description: `Are you sure you want to delete "${selectedPrimaryFile.fileName}"? This action cannot be undone.`,
                                        action: () => handleDeleteLiquidationFile(selectedPrimaryFile),
                                      })
                                    }
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove File
                                  </Button>
                                ) : null}
                                {selectedIsSubmittable ? (
                                  <Button
                                    type="button"
                                    className="h-10 w-full min-w-0 px-3 text-sm whitespace-normal"
                                    onClick={() => setMobileLiquidationFormReportId(selectedMobileReport.id)}
                                  >
                                    <Receipt className="mr-2 h-4 w-4" />
                                    Submit Note
                                  </Button>
                                ) : null}
                              </div>

                              {selectedFormVisible ? (
                                <div className="space-y-2 rounded-xl border border-border/50 bg-muted/10 p-3">
                                  <Textarea
                                    id={`liq-note-${selectedMobileReport.id}`}
                                    value={selectedNoteValue}
                                    onChange={(event) =>
                                      setLiquidationNotesByReportId((prev) => ({ ...prev, [selectedMobileReport.id]: event.target.value }))
                                    }
                                    placeholder={
                                      selectedMobileReport.status === "needs_revision"
                                        ? "Briefly explain what you changed."
                                        : "Optional note for admin."
                                    }
                                    rows={3}
                                    className="min-h-[76px] resize-none text-sm"
                                    disabled={selectedIsSubmitting}
                                  />
                                  <div className="grid gap-2 min-[340px]:grid-cols-2">
                                    <Button
                                      type="button"
                                      variant="outline"
                                      className="h-10 w-full"
                                      onClick={() => setMobileLiquidationFormReportId(null)}
                                      disabled={selectedIsSubmitting}
                                    >
                                      Cancel
                                    </Button>
                                    <Button
                                      type="button"
                                      className="h-10 w-full"
                                      onClick={() => void handleSubmitLiquidation(selectedMobileReport)}
                                      disabled={selectedIsSubmitting || !selectedHasAttachedFile}
                                    >
                                      {selectedIsSubmitting ? (
                                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                                      ) : selectedMobileReport.status === "needs_revision" ? (
                                        "Resubmit"
                                      ) : (
                                        "Submit"
                                      )}
                                    </Button>
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="liquidation-summary-grid grid grid-cols-2 gap-2.5 lg:hidden">
                        {liquidationSummaryItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Card key={item.label} className="liquidation-summary-card min-w-0 border-border/70 shadow-sm">
                              <CardContent className="flex min-h-[126px] flex-col p-3">
                                <div className="liquidation-summary-header flex items-start justify-between gap-2">
                                  <p className="min-w-0 text-[0.68rem] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground">
                                    {item.label}
                                  </p>
                                  <UserFeatureIcon icon={Icon} />
                                </div>
                                <p className="liquidation-summary-value mt-3 text-[1.7rem] font-semibold leading-none text-foreground">
                                  {item.value}
                                </p>
                                <p className="liquidation-summary-description mt-auto pt-2 text-xs leading-[1.35] text-muted-foreground">
                                  {item.helper}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <div className="liquidation-summary-grid hidden gap-3 lg:grid lg:grid-cols-4">
                        {liquidationSummaryItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Card key={item.label} className="liquidation-summary-card min-w-0 border-border/70 shadow-sm">
                              <CardContent className="flex min-h-[108px] flex-col p-3.5 xl:px-4">
                                <div className="liquidation-summary-header flex items-start justify-between gap-3">
                                  <p className="min-w-0 text-[0.7rem] font-medium uppercase leading-tight tracking-[0.08em] text-muted-foreground">
                                    {item.label}
                                  </p>
                                  <UserFeatureIcon icon={Icon} size="compact" />
                                </div>
                                <p className="liquidation-summary-value mt-2.5 text-2xl font-semibold leading-none text-foreground">
                                  {item.value}
                                </p>
                                <p className="liquidation-summary-description mt-auto pt-1.5 text-xs leading-snug text-muted-foreground">
                                  {item.helper}
                                </p>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <Card className="overflow-hidden border-border/70 shadow-sm">
                        <CardContent className="space-y-3 p-3.5 sm:p-4 lg:space-y-4 lg:p-5">
                          <div className="flex flex-col gap-3 max-lg:gap-2.5 lg:hidden">
                            <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1 xl:flex-wrap max-lg:grid-cols-2 max-lg:gap-2">
                              <div className="relative min-w-[220px] flex-1 xl:max-w-xs max-lg:col-span-2 max-lg:min-w-0">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  value={liquidationSearch}
                                  onChange={(event) => setLiquidationSearch(event.target.value)}
                                  placeholder="Search by title, category, or ID"
                                  className="pl-9 max-lg:h-10 max-lg:text-sm"
                                />
                              </div>
                              <div className="relative min-w-[160px] max-lg:min-w-0">
                                <select
                                  value={liquidationStatusFilter}
                                  onChange={(event) => setLiquidationStatusFilter(event.target.value as "all" | LiquidationStatus)}
                                  className={`${budgetNativeSelectClass} max-lg:h-10 max-lg:text-sm`}
                                >
                                  <option value="all">Status: All</option>
                                  {uniqueStatuses.map((status) => (
                                    <option key={status} value={status}>
                                      {formatStatusLabel(status)}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              </div>
                              <div className="relative min-w-[150px] max-lg:min-w-0">
                                <select
                                  value={liquidationDateRangeFilter}
                                  onChange={(event) => setLiquidationDateRangeFilter(event.target.value as "all" | "30d" | "90d" | "year")}
                                  className={`${budgetNativeSelectClass} max-lg:h-10 max-lg:text-sm`}
                                >
                                  <option value="all">Date range</option>
                                  <option value="30d">Last 30 days</option>
                                  <option value="90d">Last 90 days</option>
                                  <option value="year">This year</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setLiquidationFiltersExpanded((current) => !current)}
                                className="max-lg:h-10 max-lg:w-full max-lg:justify-center max-lg:px-2 max-lg:text-sm"
                              >
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                More filters
                              </Button>
                              <div className="relative min-w-[150px] max-lg:min-w-0 lg:hidden">
                                <select
                                  value={liquidationSortOrder}
                                  onChange={(event) => setLiquidationSortOrder(event.target.value as "newest" | "oldest" | "deadline_asc" | "deadline_desc")}
                                  className={`${budgetNativeSelectClass} max-lg:h-10 max-lg:text-sm`}
                                >
                                  <option value="newest">Newest</option>
                                  <option value="oldest">Oldest</option>
                                  <option value="deadline_asc">Earliest deadline</option>
                                  <option value="deadline_desc">Latest deadline</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              </div>
                            </div>
                            <div className="hidden flex-wrap items-center gap-2 lg:flex">
                              <div className="relative min-w-[150px]">
                                <select
                                  value={liquidationSortOrder}
                                  onChange={(event) => setLiquidationSortOrder(event.target.value as "newest" | "oldest" | "deadline_asc" | "deadline_desc")}
                                  className={budgetNativeSelectClass}
                                >
                                  <option value="newest">Sort by: Newest</option>
                                  <option value="oldest">Sort by: Oldest</option>
                                  <option value="deadline_asc">Earliest deadline</option>
                                  <option value="deadline_desc">Latest deadline</option>
                                </select>
                                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              </div>
                            </div>
                          </div>

                          <div className="report-toolbar hidden items-center gap-2.5 lg:grid lg:grid-cols-[minmax(220px,1.4fr)_minmax(135px,0.75fr)_minmax(130px,0.65fr)_auto_minmax(0,1fr)_minmax(150px,auto)]">
                            <div className="relative min-w-0">
                              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                              <Input
                                value={liquidationSearch}
                                onChange={(event) => setLiquidationSearch(event.target.value)}
                                placeholder="Search reports..."
                                className="h-10 pl-9"
                              />
                            </div>
                            <div className="relative min-w-0">
                              <select
                                value={liquidationStatusFilter}
                                onChange={(event) => setLiquidationStatusFilter(event.target.value as "all" | LiquidationStatus)}
                                className={`${budgetNativeSelectClass} h-10`}
                              >
                                <option value="all">Status: All</option>
                                {uniqueStatuses.map((status) => (
                                  <option key={status} value={status}>
                                    {formatStatusLabel(status)}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                            <div className="relative min-w-0">
                              <select
                                value={liquidationDateRangeFilter}
                                onChange={(event) => setLiquidationDateRangeFilter(event.target.value as "all" | "30d" | "90d" | "year")}
                                className={`${budgetNativeSelectClass} h-10`}
                              >
                                <option value="all">Date range</option>
                                <option value="30d">Last 30 days</option>
                                <option value="90d">Last 90 days</option>
                                <option value="year">This year</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-10 px-3"
                              onClick={() => setLiquidationFiltersExpanded((current) => !current)}
                            >
                              <SlidersHorizontal className="mr-2 h-4 w-4" />
                              More filters
                            </Button>
                            <div aria-hidden="true" />
                            <div className="sort-control relative min-w-0">
                              <select
                                value={liquidationSortOrder}
                                onChange={(event) => setLiquidationSortOrder(event.target.value as "newest" | "oldest" | "deadline_asc" | "deadline_desc")}
                                className={`${budgetNativeSelectClass} h-10`}
                              >
                                <option value="newest">Sort: Newest</option>
                                <option value="oldest">Sort: Oldest</option>
                                <option value="deadline_asc">Earliest deadline</option>
                                <option value="deadline_desc">Latest deadline</option>
                              </select>
                              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            </div>
                          </div>

                          {liquidationFiltersExpanded ? (
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-3 max-lg:px-3 max-lg:py-2.5">
                              <Button
                                type="button"
                                size="sm"
                                variant={liquidationHasFileOnly ? "default" : "outline"}
                                onClick={() => setLiquidationHasFileOnly((current) => !current)}
                              >
                                <Filter className="mr-2 h-3.5 w-3.5" />
                                Has file only
                              </Button>
                            </div>
                          ) : null}

                          <div className="hidden text-xs text-muted-foreground lg:block">
                            {totalFilteredReports} {hasActiveLiquidationFilters ? "matching " : ""}
                            report{totalFilteredReports === 1 ? "" : "s"}
                          </div>

                          {totalFilteredReports ? (
                            <>
                              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground lg:hidden">
                                <span>{totalFilteredReports} report{totalFilteredReports === 1 ? "" : "s"}</span>
                                <span>
                                  {liquidationSortOrder === "oldest"
                                    ? "Sorted by oldest"
                                    : liquidationSortOrder === "deadline_asc"
                                      ? "Earliest deadline"
                                      : liquidationSortOrder === "deadline_desc"
                                        ? "Latest deadline"
                                        : "Sorted by newest"}
                                </span>
                              </div>
                              <div className="space-y-3 lg:hidden">
                                {paginatedReports.map((report) => {
                                  const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
                                  const isDeadlineUrgent =
                                    report.status !== "completed_liquidated" &&
                                    (report.status === "overdue" ||
                                      (report.deadlineAt ? new Date(report.deadlineAt) < new Date() : false));
                                  const reportCode = buildPublicRecordCode("LR", report, liquidationReports);
                                  const budgetAmount = relatedBudget
                                    ? formatCurrency(relatedBudget.releasedAmount || relatedBudget.approvedAmount || 0)
                                    : "Budget linked";
                                  return (
                                    <Card key={report.id} className="liquidation-report-card border-border/70 shadow-sm">
                                      <CardContent className="grid gap-3 p-[14px]">
                                        <div className="report-card-header grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                                          <p className="report-card-title min-w-0 overflow-hidden text-sm font-semibold leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
                                            {relatedBudget?.activityTitle || "Approved budget"}
                                          </p>
                                          <div className="report-card-status mr-3 max-w-[116px] text-center [&>span]:h-auto [&>span]:max-w-full [&>span]:whitespace-normal [&>span]:text-center [&>span]:leading-tight min-[431px]:mr-0">
                                            <PortalStatusBadge status={report.status} />
                                          </div>
                                        </div>

                                        <p className="min-w-0 text-[0.8rem] leading-5 text-muted-foreground [overflow-wrap:anywhere]">
                                          <span>{reportCode}</span>
                                          <span className="text-muted-foreground/60"> · </span>
                                          <span className="font-semibold tabular-nums text-foreground">{budgetAmount}</span>
                                        </p>

                                        <div className="report-card-dates grid grid-cols-2 gap-3 border-y border-border/60 py-[11px]">
                                          <div className="min-w-0">
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                            <p className="mt-1 text-sm font-medium text-foreground">
                                              {report.goSignalAt ? formatShortPortalDate(report.goSignalAt) : "Pending"}
                                            </p>
                                          </div>
                                          <div className="min-w-0">
                                            <p className={cn("text-[11px] uppercase tracking-[0.14em]", isDeadlineUrgent ? "text-destructive" : "text-muted-foreground/75")}>
                                              Deadline
                                            </p>
                                            <p className={cn("mt-1 text-sm font-semibold", isDeadlineUrgent ? "text-destructive" : report.status === "completed_liquidated" ? "text-muted-foreground" : "text-foreground")}>
                                              {report.deadlineAt ? formatShortPortalDate(report.deadlineAt) : "Pending"}
                                            </p>
                                          </div>
                                        </div>

                                        <Button
                                          type="button"
                                          variant="outline"
                                          className="report-card-action ml-auto h-9 w-full px-3.5 min-[340px]:w-auto"
                                          onClick={() => openLiquidationDetail(report.id)}
                                        >
                                          View details
                                          <ChevronRight className="ml-1.5 h-4 w-4" />
                                        </Button>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                              <div className="hidden overflow-x-auto lg:block">
                                <div className="w-full overflow-hidden rounded-2xl border border-border/70">
                                  <Table className="reports-table w-full table-fixed">
                                    <TableHeader>
                                      <TableRow className="bg-muted/15 hover:bg-muted/15">
                                        <TableHead className="col-report w-[24%] px-3.5 py-3">Report</TableHead>
                                        <TableHead className="col-status w-[14%] px-3.5 py-3">Status</TableHead>
                                        <TableHead className="col-timeline w-[14%] px-3.5 py-3">Timeline</TableHead>
                                        <TableHead className="col-file w-[20%] px-3.5 py-3">File</TableHead>
                                        <TableHead className="col-activity w-[18%] px-3.5 py-3">Recent Activity</TableHead>
                                        <TableHead className="col-action w-[10%] px-3.5 py-3 text-center">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {paginatedReports.map((report) => {
                                        const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
                                        const attachedFiles = liquidationFilesByReportId.get(report.id) ?? [];
                                        const isDeadlineUrgent =
                                          report.status !== "completed_liquidated" &&
                                          (report.status === "overdue" ||
                                            (report.deadlineAt ? new Date(report.deadlineAt) < new Date() : false));
                                        const hasAdminNote =
                                          report.remarks?.trim().length > 0 &&
                                          (report.status === "needs_revision" || report.status === "overdue" || report.status === "rejected_red");
                                        const isSubmittable = liquidationSubmittableStatuses.has(report.status);
                                        const canRemoveSubmittedFile = !liquidationLockedStatuses.has(report.status);
                                        const canUploadReplacement = report.status === "needs_revision" || report.status === "rejected_red";
                                        const isSubmitting = submittingLiquidationId === report.id;
                                        const hasAttachedFile = attachedFiles.length > 0;
                                        const noteValue = liquidationNotesByReportId[report.id] ?? "";
                                        const isDesktopFormVisible = isSubmittable && desktopLiquidationFormReportId === report.id;
                                        const latestActivity = report.revisionHistory?.length
                                          ? report.revisionHistory[report.revisionHistory.length - 1]
                                          : null;
                                        const additionalActivities = Math.max((report.revisionHistory?.length ?? 0) - 1, 0);
                                        const secondaryStatus = liquidationStatusSecondaryMap[report.status] ?? formatStatusLabel(report.status);
                                        const primaryFile = attachedFiles[0] ?? null;
                                        return (
                                          <TableRow key={report.id} className="align-top transition-colors hover:bg-muted/20">
                                            <TableCell className={`${rowPaddingClass} align-top`}>
                                              <div className="min-w-0 space-y-1">
                                                <p className="report-title overflow-hidden font-semibold leading-snug text-foreground [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2] [overflow-wrap:anywhere]">
                                                  {relatedBudget?.activityTitle || "Approved budget"}
                                                </p>
                                                <p className="line-clamp-1 text-xs text-muted-foreground xl:line-clamp-2">
                                                  {relatedBudget?.purposeCategory || "No category"}
                                                </p>
                                                <p className="text-xs text-primary">{buildPublicRecordCode("LR", report, liquidationReports)}</p>
                                                <p className="report-amount text-xs tabular-nums text-foreground/75">
                                                  {relatedBudget ? `${formatCurrency(relatedBudget.releasedAmount || relatedBudget.approvedAmount || 0)} released` : "Released budget linked"}
                                                </p>
                                              </div>
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-top`}>
                                              <div className="space-y-2">
                                                <div className="report-status-badge inline-flex max-w-[132px] [&>span]:h-auto [&>span]:max-w-full [&>span]:whitespace-normal [&>span]:text-center [&>span]:leading-[1.2]">
                                                  <PortalStatusBadge status={report.status} />
                                                </div>
                                                {hasAdminNote ? (
                                                  <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-2">
                                                    <p className="line-clamp-2 text-[11px] leading-snug text-amber-800">{report.remarks.trim()}</p>
                                                  </div>
                                                ) : null}
                                              </div>
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-top`}>
                                              <div className="space-y-2 text-sm">
                                                <div>
                                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Go Signal</p>
                                                  <p className="font-medium text-foreground">
                                                    {report.goSignalAt
                                                      ? new Date(report.goSignalAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                                      : "Pending"}
                                                  </p>
                                                </div>
                                                <div>
                                                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Deadline</p>
                                                  <p className={cn("font-medium", isDeadlineUrgent ? "text-destructive" : "text-foreground")}>
                                                    {report.deadlineAt
                                                      ? new Date(report.deadlineAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                                      : "Pending"}
                                                  </p>
                                                </div>
                                              </div>
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-top`}>
                                              {primaryFile ? (
                                                <div className="flex items-start gap-2">
                                                  <UserFeatureIcon icon={FileText} size="compact" />
                                                  <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground [overflow-wrap:anywhere]">{primaryFile.fileName}</p>
                                                    <p className="mt-1 whitespace-nowrap text-[11px] text-muted-foreground">
                                                      {(primaryFile.fileType || "PDF").toUpperCase()} ·{" "}
                                                      {primaryFile.fileSize
                                                        ? primaryFile.fileSize >= 1024 * 1024
                                                          ? `${(primaryFile.fileSize / (1024 * 1024)).toFixed(1)} MB`
                                                          : `${Math.max(1, Math.round(primaryFile.fileSize / 1024))} KB`
                                                        : "File attached"}
                                                    </p>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                  <UserFeatureIcon icon={FileText} size="compact" />
                                                  <span>No file uploaded</span>
                                                </div>
                                              )}
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-top`}>
                                              <div className="space-y-1">
                                                <p className="line-clamp-2 text-sm leading-snug text-foreground">
                                                  {latestActivity ? (liquidationActionLabels[latestActivity.action] ?? latestActivity.action) : secondaryStatus}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                  {latestActivity ? formatDateTimeLabel(latestActivity.changedAt) : formatDateTimeLabel(report.updatedAt)}
                                                </p>
                                                {additionalActivities > 0 ? (
                                                  <button
                                                    type="button"
                                                    className="text-xs font-medium text-primary transition hover:underline"
                                                    onClick={() => openLiquidationRecentActivityModal(report)}
                                                  >
                                                    +{additionalActivities} more
                                                  </button>
                                                ) : null}
                                              </div>
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-top`}>
                                              <div className="space-y-2.5">
                                                <div className="flex justify-center">
                                                  <DropdownMenu modal={false}>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="outline"
                                                        className="h-9 w-9"
                                                        aria-label="Open report actions"
                                                      >
                                                        <MoreHorizontal className="h-4 w-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="min-w-[210px]">
                                                      {isSubmittable ? (
                                                        <DropdownMenuItem onClick={() => setDesktopLiquidationFormReportId(report.id)}>
                                                          <Receipt className="mr-2 h-4 w-4" />
                                                          Submit Note
                                                        </DropdownMenuItem>
                                                      ) : null}
                                                      {!primaryFile ? (
                                                        <DropdownMenuItem
                                                          onClick={() => {
                                                            setLiquidationUploadTargetId(report.id);
                                                            liquidationFileInputRef.current?.click();
                                                          }}
                                                        >
                                                          <FileUp className="mr-2 h-4 w-4" />
                                                          Upload Document
                                                        </DropdownMenuItem>
                                                      ) : (
                                                        <>
                                                          <DropdownMenuItem onClick={() => void openFile(primaryFile.fileUrl, primaryFile.fileName)}>
                                                            <Eye className="mr-2 h-4 w-4" />
                                                            Open File
                                                          </DropdownMenuItem>
                                                          {canUploadReplacement ? (
                                                            <DropdownMenuItem
                                                              onClick={() => {
                                                                setLiquidationUploadTargetId(report.id);
                                                                liquidationFileInputRef.current?.click();
                                                              }}
                                                            >
                                                              <FileUp className="mr-2 h-4 w-4" />
                                                              Upload Another Document
                                                            </DropdownMenuItem>
                                                          ) : null}
                                                          {canRemoveSubmittedFile ? (
                                                            <>
                                                              <DropdownMenuSeparator />
                                                              <DropdownMenuItem
                                                                className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                                                                onClick={() =>
                                                                  requestDeleteConfirmation({
                                                                    title: "Remove Submitted File",
                                                                    description: `Are you sure you want to delete "${primaryFile.fileName}"? This action cannot be undone.`,
                                                                    action: () => handleDeleteLiquidationFile(primaryFile),
                                                                  })
                                                                }
                                                              >
                                                                <Trash2 className="mr-2 h-4 w-4" />
                                                                Remove Submitted File
                                                              </DropdownMenuItem>
                                                            </>
                                                          ) : null}
                                                        </>
                                                      )}
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </div>
                                                {isDesktopFormVisible ? (
                                                  <div className="space-y-2 rounded-xl border border-border/50 bg-muted/10 p-2.5">
                                                    <Textarea
                                                      id={`liq-note-${report.id}`}
                                                      value={noteValue}
                                                      onChange={(e) =>
                                                        setLiquidationNotesByReportId((prev) => ({ ...prev, [report.id]: e.target.value }))
                                                      }
                                                      placeholder={
                                                        report.status === "needs_revision"
                                                          ? "Briefly explain what you changed."
                                                          : "Optional note for admin."
                                                      }
                                                      rows={3}
                                                      className="min-h-[76px] resize-none text-xs"
                                                      disabled={isSubmitting}
                                                    />
                                                    <div className="grid grid-cols-2 gap-2">
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        variant="outline"
                                                        className="h-8 w-full text-xs"
                                                        onClick={() => setDesktopLiquidationFormReportId(null)}
                                                        disabled={isSubmitting}
                                                      >
                                                        Cancel
                                                      </Button>
                                                      <Button
                                                        type="button"
                                                        size="sm"
                                                        className="h-8 w-full text-xs"
                                                        onClick={() => void handleSubmitLiquidation(report)}
                                                        disabled={isSubmitting || !hasAttachedFile}
                                                      >
                                                        {isSubmitting ? (
                                                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                                                        ) : report.status === "needs_revision" ? (
                                                          "Resubmit"
                                                        ) : (
                                                          "Submit"
                                                        )}
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : null}
                                              </div>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
                              </div>
                              </div>

                              <div className="flex flex-col gap-3 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
                                <p className="text-sm text-muted-foreground">
                                  Showing {showingFrom} to {showingTo} of {totalFilteredReports} reports
                                </p>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                  <Select value={String(liquidationRowsPerPage)} onValueChange={(value) => setLiquidationRowsPerPage(Number(value) as 10 | 25 | 50)}>
                                    <SelectTrigger className="h-9 w-[110px]">
                                      <SelectValue placeholder="Rows" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="10">10 / page</SelectItem>
                                      <SelectItem value="25">25 / page</SelectItem>
                                      <SelectItem value="50">50 / page</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="flex items-center gap-1">
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-9 w-9"
                                      disabled={safeLiquidationPage <= 1}
                                      onClick={() => setLiquidationPage((current) => Math.max(1, current - 1))}
                                    >
                                      <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                    <div className="flex h-9 min-w-[2.5rem] items-center justify-center rounded-md border border-primary/20 bg-primary/10 px-3 text-sm font-medium text-primary">
                                      {safeLiquidationPage}
                                    </div>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="outline"
                                      className="h-9 w-9"
                                      disabled={safeLiquidationPage >= totalLiquidationPages}
                                      onClick={() => setLiquidationPage((current) => Math.min(totalLiquidationPages, current + 1))}
                                    >
                                      <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </>
                          ) : (
                            <PortalEmptyState
                              title="No matching liquidation reports"
                              description="Try adjusting your search, status, or date range filters."
                            />
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <WebsiteWorkflowNotice
                title="No liquidation report is available yet"
                description="Liquidation becomes available after an eligible budget is approved, released, and reaches the applicable post-activity stage."
                requirements={liquidationWorkflowEligibility.requirements}
                actionLabel={!liquidationWorkflowEligibility.profileComplete
                  ? "Complete Profile"
                  : !liquidationWorkflowEligibility.registrationVerified
                    ? "View Registration Status"
                    : !budgetWorkflowEligibility.eligible
                      ? "Open YPOP Incentive"
                      : liquidationWorkflowEligibility.releasedBudget
                        ? "View Released Budget"
                        : "View Budget Requests"}
                onAction={() => {
                  if (!liquidationWorkflowEligibility.profileComplete) navigate(userRouteMap["organization-profile"]);
                  else if (!liquidationWorkflowEligibility.registrationVerified) navigate(userRouteMap["document-submission"]);
                  else if (!budgetWorkflowEligibility.eligible) navigate(userRouteMap.ypop);
                  else navigate(userRouteMap["budget-request"]);
                }}
              />
            )}
            </PortalSection>
          </div>
        );
      }
      case "news-releases": {
        const publishedReleases = state.newsReleases.filter((n) => n.visibilityStatus === "published");
        const availableCategories = Array.from(
          new Set(publishedReleases.map((r) => r.category).filter((c): c is string => Boolean(c)))
        ).sort();
        const searchLower = portalNewsSearch.trim().toLowerCase();
        const filteredReleases = publishedReleases.filter((news) => {
          const matchesCategory = portalNewsCategoryFilter === "all" || news.category === portalNewsCategoryFilter;
          const matchesQuery =
            !searchLower ||
            news.title.toLowerCase().includes(searchLower) ||
            (news.description ?? "").toLowerCase().includes(searchLower);
          return matchesCategory && matchesQuery;
        });
        const isRecentRelease = (datePosted: string) => {
          const diffDays = (Date.now() - new Date(datePosted).getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        };
        return (
          <PortalSection
            title="News Releases"
            description="Official announcements and updates from LYDO. Browse the latest posts and open them directly on Facebook."
            action={
              <Button type="button" variant="outline" asChild>
                <a href={LYDO_FACEBOOK_PAGE_URL} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Facebook Page
                </a>
              </Button>
            }
          >
            <div className="space-y-4 sm:space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={portalNewsSearch}
                    onChange={(e) => setPortalNewsSearch(e.target.value)}
                    placeholder="Search news releases..."
                    className="h-10 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus:border-primary"
                  />
                </div>
                {availableCategories.length ? (
                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                    <button
                      type="button"
                      onClick={() => setPortalNewsCategoryFilter("all")}
                      className={cn(
                        "rounded-full px-3 py-1.5 font-medium transition-colors",
                        portalNewsCategoryFilter === "all"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                      )}
                    >
                      All
                    </button>
                    {availableCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setPortalNewsCategoryFilter(cat)}
                        className={cn(
                          "rounded-full px-3 py-1.5 font-medium transition-colors capitalize",
                          portalNewsCategoryFilter === cat
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {filteredReleases.length ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredReleases.map((news) => {
                    const facebookUrl = news.facebookPostUrl?.trim() || "";
                    const hasFacebookUrl = Boolean(facebookUrl);
                    const previewImageUrl = news.previewImageUrl?.trim() || "";
                    const formattedDate = new Date(news.datePosted).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    });
                    const fallbackAccent = isRecentRelease(news.datePosted)
                      ? "from-primary via-primary/85 to-sky-500"
                      : "from-slate-700 via-primary/90 to-slate-800";

                    return (
                      <article
                        key={news.id}
                        className="group flex h-full flex-col overflow-hidden rounded-[22px] border border-border/70 bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
                      >
                        <div className="border-b border-border/50 bg-muted/10 p-3 sm:p-4">
                          {hasFacebookUrl ? (
                            <a
                              href={facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
                              aria-label={`Open ${news.title} on Facebook`}
                            >
                              <div className="relative aspect-[16/10] overflow-hidden rounded-xl border border-border/60 bg-muted">
                                <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackAccent)} />
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:auto,24px_24px,24px_24px] opacity-90 transition-transform duration-300 group-hover:scale-[1.03]" />
                                <div className="absolute inset-x-0 bottom-0 p-4">
                                  <div className="rounded-2xl border border-white/15 bg-black/20 p-3 backdrop-blur-sm">
                                    <p className="line-clamp-3 text-lg font-semibold leading-tight text-white">
                                      {news.title}
                                    </p>
                                  </div>
                                </div>
                                {previewImageUrl ? (
                                  <img
                                    src={previewImageUrl}
                                    alt={`${news.title} preview`}
                                    referrerPolicy="no-referrer"
                                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                    onError={(event) => {
                                      event.currentTarget.style.display = "none";
                                    }}
                                  />
                                ) : null}
                                <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
                                  <span className="inline-flex items-center rounded-full border border-white/20 bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary shadow-sm">
                                    News Release
                                  </span>
                                  {isRecentRelease(news.datePosted) ? (
                                    <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary shadow-sm">
                                      New
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                            </a>
                          ) : (
                            <div className="relative aspect-[16/10] overflow-hidden rounded-xl bg-muted">
                              <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackAccent)} />
                              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:auto,24px_24px,24px_24px] opacity-90" />
                              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
                                <span className="inline-flex items-center rounded-full border border-white/20 bg-white/12 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/90 backdrop-blur-sm">
                                  LYDO News
                                </span>
                                {isRecentRelease(news.datePosted) ? (
                                  <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary shadow-sm">
                                    New
                                  </span>
                                ) : null}
                              </div>
                              <div className="absolute inset-x-0 bottom-0 p-4">
                                <div className="rounded-2xl border border-white/15 bg-black/20 p-3 backdrop-blur-sm">
                                  <p className="line-clamp-3 text-lg font-semibold leading-tight text-white">
                                    {news.title}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-4 sm:p-5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-muted-foreground">{formattedDate}</p>
                            {isRecentRelease(news.datePosted) ? (
                              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                                New
                              </span>
                            ) : null}
                          </div>
                          {hasFacebookUrl ? (
                            <a
                              href={facebookUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-flex items-start gap-1.5 text-left text-[1.02rem] font-semibold leading-snug text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/70 focus-visible:ring-offset-2"
                            >
                              <span className="line-clamp-2">{news.title}</span>
                              <ExternalLink className="mt-0.5 h-4 w-4 shrink-0" />
                            </a>
                          ) : (
                            <p className="mt-2 text-[1.02rem] font-semibold leading-snug text-foreground">{news.title}</p>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <PortalEmptyState
                  title="No announcements found"
                  description="No news releases match your search criteria. Try clearing filters or check back later."
                />
              )}
            </div>
          </PortalSection>
        );
      }
      case "notifications": {
        const hasUnread = userNotifications.some((n) => !n.isRead);
        const unreadCount = userNotifications.filter((n) => !n.isRead).length;
        const sorted = [...userNotifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const filtered =
          notifFilter === "unread"
            ? sorted.filter((n) => !n.isRead)
            : notifFilter === "read"
              ? sorted.filter((n) => n.isRead)
              : sorted;

        const formatNotifDate = (iso: string) => {
          const d = new Date(iso);
          const isToday = d.toDateString() === new Date().toDateString();
          return isToday
            ? "Today"
            : d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
        };

        type IconConfig = { icon: typeof Bell; semanticWarning?: boolean };
        const relatedTypeIconMap: Record<string, IconConfig> = {
          document_submission: { icon: FileText },
          budget_request: { icon: ClipboardList },
          liquidation_report: { icon: Receipt },
          organization_profile: { icon: User },
        };
        const getIconConfig = (n: NotificationRecord): IconConfig =>
          n.type === "warning"
            ? { icon: AlertTriangle, semanticWarning: true }
            : (relatedTypeIconMap[n.relatedType] ?? { icon: Bell });

        const filterLabel = (f: "all" | "unread" | "read") => {
          if (f === "all")    return `All${userNotifications.length ? ` · ${userNotifications.length}` : ""}`;
          if (f === "unread") return `Unread${unreadCount ? ` · ${unreadCount}` : ""}`;
          return "Read";
        };

        return (
          <PortalSection
            title="Notifications"
            description="Admin remarks, go signals, revisions, and status updates."
          >
            {userNotifications.length === 0 ? (
              <PortalEmptyState
                title="No notifications yet"
                description="You will be notified here when the admin sends remarks, go signals, or updates."
              />
            ) : (
              <div className="space-y-4">
                {/* Filter chips + mark all read */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                  {(["all", "unread", "read"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setNotifFilter(f)}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                        notifFilter === f
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      }`}
                    >
                      {filterLabel(f)}
                    </button>
                  ))}
                  </div>
                  {hasUnread && (
                    <Button variant="ghost" size="sm" onClick={() => void handleMarkAllNotificationsRead()} className="shrink-0 text-xs">
                      Mark all as read
                    </Button>
                  )}
                </div>

                {/* List */}
                {filtered.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 py-10 text-center">
                    <BellOff className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">
                      {notifFilter === "unread"
                        ? "You're all caught up! No unread notifications."
                        : "No read notifications yet."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filtered.map((notification) => {
                      const { icon: Icon, semanticWarning } = getIconConfig(notification);
                      return (
                        <button
                          key={notification.id}
                          type="button"
                          className={`w-full rounded-xl border p-4 text-left transition-colors hover:bg-muted/40 ${
                            notification.isRead
                              ? "border-border/40 bg-muted/20"
                              : "border-border/70 bg-background"
                          }`}
                          onClick={() => void handleMarkNotificationRead(notification.id)}
                        >
                          <div className="flex items-start gap-3">
                            {semanticWarning ? (
                              <span
                                aria-hidden="true"
                                className="mt-0.5 inline-grid h-8 w-8 shrink-0 place-items-center rounded-[10px] border border-amber-500/20 bg-amber-500/10 text-amber-600"
                              >
                                <Icon aria-hidden="true" className="h-4 w-4" />
                              </span>
                            ) : (
                              <UserFeatureIcon icon={Icon} size="compact" className="mt-0.5" />
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  {!notification.isRead && (
                                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-primary" />
                                  )}
                                  <p className={`text-sm leading-snug ${notification.isRead ? "font-normal text-foreground/70" : "font-semibold text-foreground"}`}>
                                    {notification.title}
                                  </p>
                                </div>
                                <span className="shrink-0 text-xs text-muted-foreground/70">
                                  {formatNotifDate(notification.createdAt)}
                                </span>
                              </div>
                              <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </PortalSection>
        );
      }
      case "ypop": {
        const availableYpopSemesterKeys = new Set(
          state.ypopPeriods.map((period) => period.semesterKey),
        );
        const orgYpopEntries = state.ypopEntries
          .filter(
            (entry) =>
              entry.organizationId === (currentProfile?.id ?? "") &&
              availableYpopSemesterKeys.has(entry.semester),
          )
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        const ypopFilesByEntryId = new Map(
          orgYpopEntries.map((e) => [
            e.id,
            state.ypopFiles.filter((f) => f.ypopEntryId === e.id),
          ]),
        );
        const joinedYpopEvents = ypopEventParticipations;
        const ypopParticipationByActivityId = new Map(
          joinedYpopEvents.map((participation) => [participation.activityId, participation]),
        );
        const ypopActivitiesSorted = [...state.ypopCityActivities].sort((left, right) => {
          const leftDate = parseYpopActivityDate(left.date)?.getTime() ?? 0;
          const rightDate = parseYpopActivityDate(right.date)?.getTime() ?? 0;
          return leftDate - rightDate;
        });
        const availableYpopActivities = ypopActivitiesSorted.filter((activity) => !ypopParticipationByActivityId.has(activity.id));

        const handleSubmitYpop = async (entry: YPOPEntry) => {
          const note = ypopNotesByEntryId[entry.id] ?? "";
          if (!await confirmAction({
            title: entry.status === "needs_revision" ? "Resubmit for city-led validation?" : "Submit for city-led validation?",
            description: `Your joined city-led activities and proof files will be sent to the admin for validation.${note.trim() ? "\n\nYour message for the admin will be included." : ""}`,
            confirmLabel: entry.status === "needs_revision" ? "Resubmit for Validation" : "Submit for Validation",
          })) return;
          setSubmittingYpopId(entry.id);
          try {
            const patch = { status: "submitted" as const, submissionNote: note, submittedAt: new Date().toISOString() };
            const saved = await updateYpopEntryInSupabase(entry.id, patch);
            updateYPOPEntry(saved.id, saved);
            setYpopNotesByEntryId((prev) => { const next = { ...prev }; delete next[entry.id]; return next; });
            toast({ title: "YPOP submitted", description: "Your participation records have been submitted for admin validation." });
          } catch (err) {
            toast({ title: "Submission failed", description: err instanceof Error ? err.message : "An error occurred.", variant: "destructive" });
          } finally {
            setSubmittingYpopId(null);
          }
        };

        const handleYpopFileUpload = async (entryId: string, file: File) => {
          setYpopUploadingId(entryId);
          try {
            const orgId = currentProfile?.id ?? "";
            try {
              const saved = await uploadYpopFileToSupabase({ entryId, organizationId: orgId, file });
              createYPOPFile(saved);
            } catch {
              const now = new Date().toISOString();
              createYPOPFile({
                id: `ypop-file-${Date.now()}`,
                ypopEntryId: entryId,
                organizationId: orgId,
                fileName: file.name,
                fileUrl: "",
                fileType: file.type,
                uploadedAt: now,
              });
            }
            toast({ title: "File attached", description: `${file.name} has been attached to your YPOP submission.` });
          } catch (err) {
            toast({ title: "Upload failed", description: err instanceof Error ? err.message : "An error occurred.", variant: "destructive" });
          } finally {
            setYpopUploadingId(null);
          }
        };

        const handleDeleteYpopFile = (fileId: string) => {
          const targetFile = state.ypopFiles.find((f) => f.id === fileId);
          requestDeleteConfirmation({
            title: "Delete Attached File",
            description: `Are you sure you want to delete "${targetFile?.fileName ?? "this file"}"? This action cannot be undone.`,
            action: async () => {
              const fileUrl = targetFile?.fileUrl ?? "";
              void deleteYpopFileFromSupabase(fileId, fileUrl).catch(() => {});
              deleteYPOPFile(fileId);
            },
          });
        };

        const resetYpopOrgActivityDraft = () => {
          setEditingYpopOrgActivityId(null);
          setYpopOrgActivityDraft({ activityName: "", venue: "", activityDate: "", narrativeReport: "" });
        };

        const handleYpopOrgActivityModalChange = (open: boolean) => {
          setYpopOrgActivityModalOpen(open);
          if (!open) {
            resetYpopOrgActivityDraft();
          }
        };

        const handleEditYpopOrgActivity = (activity: YPOPOrgActivity) => {
          setEditingYpopOrgActivityId(activity.id);
          setYpopOrgActivityDraft({
            activityName: activity.activityName,
            venue: activity.venue,
            activityDate: activity.activityDate,
            narrativeReport: activity.narrativeReport,
          });
          setYpopOrgActivityModalOpen(true);
        };

        const handleSaveYpopOrgActivity = async (entry: YPOPEntry) => {
          if (!currentProfile?.id) return;
          if (entry.status !== "qualified") {
            toast({
              title: "Qualification required",
              description: "PPA logging unlocks only after the admin marks this semester as qualified.",
              variant: "destructive",
            });
            return;
          }
          const activityName = ypopOrgActivityDraft.activityName.trim();
          const venue = ypopOrgActivityDraft.venue.trim();
          const activityDate = ypopOrgActivityDraft.activityDate.trim();
          const narrativeReport = ypopOrgActivityDraft.narrativeReport.trim();

          if (!activityName || !venue || !activityDate || !narrativeReport) {
            toast({ title: "Missing details", description: "Please complete the activity name, venue, date, and narrative report first.", variant: "destructive" });
            return;
          }

          setSavingYpopOrgActivity(true);
          try {
            const now = new Date().toISOString();
            const payload = {
              ypopEntryId: entry.id,
              organizationId: currentProfile.id,
              submittedBy: user?.id ?? "",
              activityName,
              activityDate,
              venue,
              narrativeReport,
              status: "draft" as const,
              adminRemarks: "",
              submittedAt: "",
            };
            if (editingYpopOrgActivityId) {
              const existing = state.ypopOrgActivities.find((activity) => activity.id === editingYpopOrgActivityId);
              const updatePatch = {
                activityName,
                venue,
                activityDate,
                narrativeReport,
                updatedAt: now,
                adminRemarks: existing?.status === "needs_revision" ? existing.adminRemarks : "",
              };
              const saved = await updateYpopOrgActivityInSupabase(editingYpopOrgActivityId, updatePatch);
              updateYPOPOrgActivity(saved.id, saved);
              toast({ title: "PPA log updated", description: "Your organization-initiated activity draft has been updated." });
            } else {
              const saved = await createYpopOrgActivityInSupabase(payload);
              createYPOPOrgActivity(saved);
              toast({ title: "PPA log created", description: "Your organization-initiated activity draft is ready for file attachments and submission." });
            }
            handleYpopOrgActivityModalChange(false);
          } catch (error) {
            toast({ title: editingYpopOrgActivityId ? "Unable to update PPA log" : "Unable to create PPA log", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
          } finally {
            setSavingYpopOrgActivity(false);
          }
        };

        const handleUploadYpopOrgActivityFile = async (activityId: string, file: File) => {
          setYpopOrgActivityUploadingId(activityId);
          try {
            const orgId = currentProfile?.id ?? "";
            const saved = await uploadYpopOrgActivityFileToSupabase({ orgActivityId: activityId, organizationId: orgId, file });
            createYPOPOrgActivityFile(saved);
            toast({ title: "Attachment added", description: `${file.name} has been attached to the PPA log.` });
          } catch (error) {
            toast({ title: "Upload failed", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
          } finally {
            setYpopOrgActivityUploadingId(null);
          }
        };

        const promptUploadYpopOrgActivityFile = (activityId: string) => {
          const input = document.createElement("input");
          input.type = "file";
          input.multiple = true;
          input.accept = ".pdf,.jpg,.jpeg,.png,.doc,.docx,.txt,application/pdf,image/*,.doc,.docx";
          input.onchange = () => {
            const files = Array.from(input.files ?? []);
            files.forEach((file) => {
              void handleUploadYpopOrgActivityFile(activityId, file);
            });
          };
          input.click();
        };

        const handleDeleteYpopOrgActivityFile = (fileId: string) => {
          const targetFile = state.ypopOrgActivityFiles.find((file) => file.id === fileId);
          requestDeleteConfirmation({
            title: "Delete PPA Attachment",
            description: `Are you sure you want to delete "${targetFile?.fileName ?? "this file"}"? This action cannot be undone.`,
            action: async () => {
              const fileUrl = targetFile?.fileUrl ?? "";
              await deleteYpopOrgActivityFileFromSupabase(fileId, fileUrl);
              deleteYPOPOrgActivityFile(fileId);
            },
          });
        };

        const handleSubmitYpopOrgActivity = async (activity: YPOPOrgActivity) => {
          const files = ypopOrgActivityFilesByActivityId.get(activity.id) ?? [];
          if (files.length === 0) {
            toast({ title: "Missing proof files", description: "Attach photo documentation or supporting files before submitting this PPA log.", variant: "destructive" });
            return;
          }
          if (!await confirmAction({
            title: activity.status === "needs_revision" ? "Resubmit this PPA for validation?" : "Submit this PPA for validation?",
            description: "The PPA details and supporting files will be locked while the admin reviews them.",
            confirmLabel: activity.status === "needs_revision" ? "Resubmit PPA" : "Submit PPA",
          })) return;

          setSubmittingYpopOrgActivityId(activity.id);
          try {
            const now = new Date().toISOString();
            const patch = {
              status: "submitted" as const,
              submittedAt: now,
              adminRemarks: "",
              revisionHistory: [
                ...(activity.revisionHistory ?? []),
                { action: "submitted", adminRemarks: "Organization submitted this organization-initiated activity for admin approval.", changedAt: now },
              ],
            };
            const saved = await updateYpopOrgActivityInSupabase(activity.id, patch);
            updateYPOPOrgActivity(saved.id, saved);
            toast({ title: "PPA submitted", description: "This organization-initiated activity is now pending admin approval." });
          } catch (error) {
            toast({ title: "Submission failed", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
          } finally {
            setSubmittingYpopOrgActivityId(null);
          }
        };

        const handleDeleteYpopOrgActivity = (activityId: string) => {
          const targetActivity = state.ypopOrgActivities.find((activity) => activity.id === activityId);
          requestDeleteConfirmation({
            title: "Delete PPA Log",
            description: `Are you sure you want to delete "${targetActivity?.activityName ?? "this PPA log"}"? This action cannot be undone.`,
            action: async () => {
              await deleteYpopOrgActivityFromSupabase(activityId);
              deleteYPOPOrgActivity(activityId);
            },
          });
        };

        const handleJoinYpopEvent = async (activityId: string) => {
          const activity = state.ypopCityActivities.find((item) => item.id === activityId);
          if (!activity || !currentProfile?.id) return;
          const linkedPeriod = state.ypopPeriods.find((period) => period.semesterKey === activity.semesterKey);
          const existingEntry = state.ypopEntries.find(
            (entry) => entry.organizationId === currentProfile.id && entry.semester === activity.semesterKey,
          );
          const existingParticipation = state.ypopEventParticipations.find(
            (participation) => participation.organizationId === currentProfile.id && participation.activityId === activity.id,
          );
          const eligibility = getYpopEventJoinEligibility({
            activity,
            period: linkedPeriod,
            entry: existingEntry,
            participation: existingParticipation,
            profile: currentProfile,
          });
          if (!eligibility.allowed) {
            toast({ title: eligibility.label, description: "This event cannot be joined in its current state.", variant: "destructive" });
            return;
          }

          const now = new Date().toISOString();
          const payload = {
            organizationId: currentProfile.id,
            activityId: activity.id,
            activityName: activity.name,
            activityDate: activity.date,
            venue: activity.venue,
            status: "pending_verification" as const,
            adminRemarks: "",
            joinedAt: now,
          };
          try {
            const saved = await createYpopEventParticipationInSupabase(payload);
            createYPOPEventParticipation(saved);
            const remoteSnapshot = await loadLydoConnectSupabaseState();
            if (remoteSnapshot) mergeRemoteState(remoteSnapshot);
          } catch (error) {
            toast({ title: "Unable to join event", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
            return;
          }
          toast({ title: "YPOP event joined", description: "This event now appears in your joined YPOP events with pending verification status." });
        };

        const handleUploadYpopEventFile = async (participationId: string, file: File) => {
          setYpopEventUploadingId(participationId);
          try {
            const orgId = currentProfile?.id ?? "";
            try {
              const saved = await uploadYpopEventFileToSupabase({ participationId, organizationId: orgId, file });
              createYPOPEventFile(saved);
            } catch {
              createYPOPEventFile({
                id: `ypop-event-file-${Date.now()}`,
                participationId,
                organizationId: orgId,
                fileName: file.name,
                fileUrl: "",
                fileType: file.type,
                uploadedAt: new Date().toISOString(),
              });
            }
            toast({ title: "Proof attached", description: `${file.name} has been attached to the YPOP event submission.` });
          } catch (error) {
            toast({ title: "Upload failed", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
          } finally {
            setYpopEventUploadingId(null);
          }
        };

        const promptUploadYpopEventFile = (participationId: string) => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".pdf,.jpg,.jpeg,.png,application/pdf,image/*";
          input.onchange = () => {
            const file = input.files?.[0];
            if (file) {
              void handleUploadYpopEventFile(participationId, file);
            }
          };
          input.click();
        };

        const renderJoinableYpopActivityCard = (activity: YPOPCityActivity) => {
          const period = state.ypopPeriods.find((item) => item.semesterKey === activity.semesterKey);
          const entry = state.ypopEntries.find(
            (item) => item.organizationId === currentProfile?.id && item.semester === activity.semesterKey,
          );
          const participation = state.ypopEventParticipations.find(
            (item) => item.organizationId === currentProfile?.id && item.activityId === activity.id,
          );
          const eligibility = getYpopEventJoinEligibility({ activity, period, entry, participation, profile: currentProfile });
          return <Card key={activity.id} className="border-border/70">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
              <div>
                <p className="font-semibold">{activity.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.date || "Date TBD"}
                  {activity.venue ? ` • ${activity.venue}` : ""} • {YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(activity.category, activity.points)]} • {normalizeYpopCityLedPoints(activity.points, activity.category)} pts
                </p>
              </div>
              <Button type="button" size="sm" disabled={!eligibility.allowed} onClick={() => void handleJoinYpopEvent(activity.id)}>
                {eligibility.label}
              </Button>
            </CardContent>
          </Card>;
        };

        const handleDeleteYpopEventFile = (fileId: string) => {
          const targetFile = state.ypopEventFiles.find((file) => file.id === fileId);
          requestDeleteConfirmation({
            title: "Delete Proof File",
            description: `Are you sure you want to delete "${targetFile?.fileName ?? "this proof file"}"? This action cannot be undone.`,
            action: async () => {
              const fileUrl = targetFile?.fileUrl ?? "";
              void deleteYpopEventFileFromSupabase(fileId, fileUrl).catch(() => {});
              deleteYPOPEventFile(fileId);
            },
          });
        };

        const handleSubmitYpopEventProof = async (participation: YPOPEventParticipation) => {
          setSubmittingYpopEventParticipationId(participation.id);
          try {
            const now = new Date().toISOString();
            const patch = {
              status: "pending_verification" as const,
              adminRemarks: "",
              proofSubmittedAt: now,
              revisionHistory: [
                ...(participation.revisionHistory ?? []),
                { action: "pending_verification", adminRemarks: "Proof resubmitted for admin verification.", changedAt: now },
              ],
            };
            try {
              const saved = await updateYpopEventParticipationInSupabase(participation.id, patch);
              updateYPOPEventParticipation(saved.id, saved);
            } catch {
              updateYPOPEventParticipation(participation.id, patch);
            }
            toast({ title: "Proof submitted", description: "Your YPOP event proof is now pending admin verification." });
          } catch (error) {
            toast({ title: "Submission failed", description: error instanceof Error ? error.message : "An error occurred.", variant: "destructive" });
          } finally {
            setSubmittingYpopEventParticipationId(null);
          }
        };

        const renderJoinedYpopEventCard = (participation: YPOPEventParticipation) => {
          const files = ypopEventFilesByParticipationId.get(participation.id) ?? [];
          const currentActivity = state.ypopCityActivities.find((activity) => activity.id === participation.activityId);
          const displayedActivityName = currentActivity?.name || participation.activityName;
          const displayedActivityDate = currentActivity?.date || participation.activityDate;
          const displayedVenue = currentActivity?.venue || participation.venue;
          const eventDate = parseYpopActivityDate(displayedActivityDate);
          const canSubmitProof = participation.status === "needs_revision" || (eventDate ? eventDate <= new Date() : false);
          const isSubmitting = submittingYpopEventParticipationId === participation.id;
          const isUploading = ypopEventUploadingId === participation.id;
          const canEditProof = participation.status !== "verified";

          return (
            <Card key={participation.id} className="border-border/70">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{displayedActivityName}</p>
                    <p className="text-xs text-muted-foreground">
                      {displayedActivityDate || "Date TBD"}{displayedVenue ? ` • ${displayedVenue}` : ""}
                    </p>
                  </div>
                  <PortalStatusBadge status={participation.status} />
                </div>

                {participation.status === "verified" && participation.verifiedAt && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                    <p className="text-sm font-semibold">Verified</p>
                    <p className="text-xs">{formatCompactDateLabel(participation.verifiedAt)}</p>
                  </div>
                )}

                {participation.adminRemarks.trim() && participation.status !== "verified" && (
                  <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Remarks</p>
                    <p className="text-sm text-amber-800">{participation.adminRemarks}</p>
                  </div>
                )}

                {participation.status !== "verified" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Proof Files</p>
                      {canEditProof && (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!canSubmitProof || isUploading}
                          onClick={() => {
                            promptUploadYpopEventFile(participation.id);
                          }}
                        >
                          {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                          <span className="ml-1.5">Attach File</span>
                        </Button>
                      )}
                    </div>
                    {files.length > 0 ? (
                      <ul className="space-y-1.5">
                        {files.map((file) => (
                          <li key={file.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                            <span className="truncate text-sm">{file.fileName}</span>
                            {canEditProof && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteYpopEventFile(file.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {canSubmitProof
                          ? "Upload your post-event proof here: photo documentation and narrative report."
                          : "Proof upload unlocks after the event date."}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
                  <div className="text-xs text-muted-foreground">
                    Joined {formatCompactDateLabel(participation.joinedAt)}
                    {participation.proofSubmittedAt ? ` • Last proof submission ${formatCompactDateLabel(participation.proofSubmittedAt)}` : ""}
                  </div>
                  {canEditProof && (
                    <Button
                      type="button"
                      disabled={!canSubmitProof || files.length === 0 || isSubmitting}
                      onClick={() => void handleSubmitYpopEventProof(participation)}
                    >
                      {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</> : participation.status === "needs_revision" ? "Resubmit Proof" : "Submit Proof"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        };

        const handleStartYpopSubmission = async (period: YPOPPeriod) => {
          if (!ypopWorkflowEligibility.canEditParticipation || period.status !== "open") {
            toast({
              title: period.status !== "open" ? "YPOP period is closed" : "Organization verification required",
              description: period.status !== "open"
                ? "This period is available for viewing only."
                : "YPOP participation becomes editable after your organization registration is verified.",
              variant: "destructive",
            });
            return;
          }
          const now = new Date().toISOString();
          const entryData = {
            organizationId: currentProfile?.id ?? "",
            submittedBy: user?.id ?? "",
            semester: period.semesterKey,
            semesterLabel: period.semesterLabel,
            pointsEarned: 0,
            pointsRequired: 70,
            totalPoints: 100,
            status: "draft" as const,
            adminRemarks: "",
            submissionNote: "",
            validationDeadline: period.validationDeadline,
            submittedAt: "",
            validatedAt: "",
            revisionHistory: [],
            orgLedProjectCount: 0,
            cityLedAttendance: [],
          };
          let savedId: string;
          try {
            const saved = await createYpopEntryInSupabase(entryData);
            createYPOPEntry({ ...saved });
            savedId = saved.id;
          } catch {
            const localId = `ypop-${Date.now()}`;
            createYPOPEntry({ id: localId, ...entryData, createdAt: now, updatedAt: now });
            savedId = localId;
          }
          setActiveYpopEntryId(savedId);
          setYpopPreviewFileId(null);
          setYpopOrgView("entry-detail");
        };

        const allYpopPeriods = [...state.ypopPeriods].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
        const openPeriods = allYpopPeriods.filter((p) => p.status === "open");
        const openSemesterKeys = new Set(openPeriods.map((p) => p.semesterKey));
        const activeEntries = orgYpopEntries.filter((e) => openSemesterKeys.has(e.semester));
        const historyEntries = orgYpopEntries.filter((e) => !openSemesterKeys.has(e.semester));

        const renderEntryCard = (entry: YPOPEntry) => {
          const files = ypopFilesByEntryId.get(entry.id) ?? [];
          const isSubmitting = submittingYpopId === entry.id;
          const isUploading = ypopUploadingId === entry.id;
          const isDraft = entry.status === "draft";
          const isNeedsRevision = entry.status === "needs_revision";
          const isSubmitted = entry.status === "submitted" || entry.status === "under_review";
          const isQualified = entry.status === "qualified";
          const isNotQualified = entry.status === "not_qualified";
          const pctEarned = entry.totalPoints > 0 ? Math.round((entry.pointsEarned / entry.totalPoints) * 100) : 0;
          const thresholdPct = entry.totalPoints > 0 ? Math.round((entry.pointsRequired / entry.totalPoints) * 100) : YPOP_SCORE_THRESHOLD;
          const deadline = entry.validationDeadline ? new Date(entry.validationDeadline) : null;
          const isDeadlinePast = deadline ? deadline < new Date() : false;
          const hasLinkedBudgetRequest = budgetRequests.some(
            (r) => r.ypopEntryId === entry.id && r.budgetRequestType === "ypop_incentive"
          );
          const historyOpen = ypopHistoryOpenById[entry.id] ?? false;
          const revHistory = entry.revisionHistory ?? [];

          const fileListReadOnly = (
            <ul className="space-y-1.5">
              {files.map((f: YPOPFile) => (
                <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-red-500/80" />
                    <span className="truncate text-sm">{f.fileName}</span>
                  </div>
                  {f.fileUrl && (
                    <Button type="button" size="sm" variant="ghost" asChild>
                      <a href={f.fileUrl} target="_blank" rel="noreferrer">Open</a>
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          );

          return (
            <Card key={entry.id} className={`overflow-hidden border-border/70 ${isQualified ? "border-green-500/30 bg-green-500/[0.02]" : ""}`}>
              <CardContent className="space-y-4 p-5 sm:p-6">

                {/* Shared header */}
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`rounded-full p-1.5 ${isQualified ? "bg-green-100 text-green-600" : "bg-muted text-muted-foreground"}`}>
                      <Medal className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold leading-snug">{entry.semesterLabel}</p>
                      {deadline && (
                        <p className={`text-xs ${isDeadlinePast ? "text-destructive" : "text-muted-foreground"}`}>
                          Validation {isDeadlinePast ? "closed" : "closes"} {deadline.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                  </div>
                  <PortalStatusBadge status={entry.status} />
                </div>

                {/* Draft / Needs Revision â€” step flow */}
                {(isDraft || isNeedsRevision) && (
                  <>
                    {isNeedsRevision && entry.adminRemarks.trim() && (
                      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Revision Required</p>
                        <p className="text-sm text-amber-800">{entry.adminRemarks}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Step 1 â€” Attach files */}
                      <div className="hidden" aria-hidden="true">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">1</div>
                        <div className="flex-1 space-y-2">
                          <p className="pt-0.5 text-sm font-medium leading-none">Attach proof documents</p>
                          <input
                            ref={ypopFileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleYpopFileUpload(entry.id, file);
                              e.target.value = "";
                            }}
                          />
                          {files.length === 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isUploading}
                              onClick={() => ypopFileInputRef.current?.click()}
                            >
                              {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                              <span className="ml-1.5">Attach File</span>
                            </Button>
                          ) : (
                            <div className="space-y-1.5">
                              <ul className="space-y-1.5">
                                {files.map((f: YPOPFile) => (
                                  <li key={f.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <FileText className="h-3.5 w-3.5 shrink-0 text-red-500/80" />
                                      <span className="truncate text-sm">{f.fileName}</span>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                      {f.fileUrl && (
                                        <Button type="button" size="sm" variant="ghost" asChild>
                                          <a href={f.fileUrl} target="_blank" rel="noreferrer">Open</a>
                                        </Button>
                                      )}
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteYpopFile(f.id)}
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                disabled={isUploading}
                                onClick={() => ypopFileInputRef.current?.click()}
                              >
                                {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                                <span className="ml-1.5">Add another file</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Step 2 â€” Add message */}
                      <div className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">1</div>
                        <div className="flex-1 space-y-2">
                          <p className="pt-0.5 text-sm font-medium leading-none">
                            Add a message
                            <span className="ml-1.5 text-xs font-normal text-muted-foreground">(optional)</span>
                          </p>
                          <Textarea
                            id={`ypop-note-${entry.id}`}
                            value={ypopNotesByEntryId[entry.id] ?? ""}
                            onChange={(e) => setYpopNotesByEntryId((prev) => ({ ...prev, [entry.id]: e.target.value }))}
                          placeholder="Any notes for the admin reviewing your participation records..."
                            rows={2}
                            className="resize-none text-sm"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {/* Step 3 â€” Submit */}
                      <div className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">2</div>
                        <div className="flex-1 space-y-1.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSubmitYpop(entry)}
                            disabled={isSubmitting}
                          >
                            {isSubmitting ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                            ) : "Submit for Validation"}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Collapsible revision history */}
                    {revHistory.length > 0 && (
                      <div className="border-t border-border/30 pt-3">
                        <button
                          type="button"
                          className="flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                          onClick={() => setYpopHistoryOpenById((prev) => ({ ...prev, [entry.id]: !historyOpen }))}
                        >
                          {historyOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {historyOpen ? "Hide" : "View"} history ({revHistory.length})
                        </button>
                        {historyOpen && (
                          <ul className="mt-2 space-y-1.5 pl-5">
                            {revHistory.map((rev, i) => (
                              <li key={i} className="flex items-start gap-2 text-xs">
                                <span className="mt-1 h-2 w-2 shrink-0 rounded-full border-2 border-border bg-background" />
                                <span>
                                  <span className="font-medium capitalize">{rev.action.replace(/_/g, " ")}</span>
                                  {rev.adminRemarks && <span className="ml-1 text-muted-foreground">- {rev.adminRemarks}</span>}
                                  <span className="ml-1 text-muted-foreground/60">· {formatDateTimeLabel(rev.changedAt)}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Submitted / Under Review â€” quiet state */}
                {isSubmitted && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                      Submitted - awaiting admin review.
                    </div>
                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Attached files ({files.length})</p>
                        {fileListReadOnly}
                      </div>
                    )}
                    {entry.submissionNote.trim() && (
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Note sent</p>
                        <p className="text-sm">{entry.submissionNote}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Qualified â€” score + PPA action */}
                {isQualified && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">

                      <div className="flex items-center justify-between text-xs sm:text-sm">

                        <span className="text-muted-foreground">Participation score</span>
                        <span className="font-semibold text-green-700">{entry.pointsEarned}%</span>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(pctEarned, 100)}%` }} />
                        <div className="absolute top-0 h-full w-0.5 bg-foreground/30" style={{ left: `${thresholdPct}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-green-100 p-1.5 text-green-600">
                          <Trophy className="h-4 w-4 text-amber-600" />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-green-800">You're qualified for a Project Grant!</p>
                            <p className="text-sm text-green-700">
                              Your {entry.semesterLabel} YPOP score qualifies you for a budget incentive. Submit your Plans, Programs &amp; Activities (PPA) to claim it.
                            </p>
                          </div>
                          {hasLinkedBudgetRequest ? (
                            <div className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-100/60 px-3 py-1 text-xs font-medium text-green-700">
                              <Trophy className="h-3.5 w-3.5 text-amber-600" />
                              Budget request already submitted ✓
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={() => navigate(`${userRouteMap["budget-request"]}?ypopEntryId=${entry.id}&semesterLabel=${encodeURIComponent(entry.semesterLabel)}`)}
                            >
                              <Trophy className="mr-2 h-4 w-4 text-amber-600" />
                              Submit a Budget Request (PPA)
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    {entry.adminRemarks.trim() && (
                      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Remarks</p>
                        <p className="text-sm text-amber-800">{entry.adminRemarks}</p>
                      </div>
                    )}
                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Attached files ({files.length})</p>
                        {fileListReadOnly}
                      </div>
                    )}
                  </div>
                )}

                {/* Not Qualified â€” result + context */}
                {isNotQualified && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">

                      <div className="flex items-center justify-between text-xs sm:text-sm">

                        <span className="text-muted-foreground">Participation score</span>
                        <span className="font-semibold text-destructive">{entry.pointsEarned}%</span>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-destructive transition-all" style={{ width: `${Math.min(pctEarned, 100)}%` }} />
                        <div className="absolute top-0 h-full w-0.5 bg-foreground/30" style={{ left: `${thresholdPct}%` }} />
                      </div>
                    </div>
                    {entry.adminRemarks.trim() && (
                      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Remarks</p>
                        <p className="text-sm text-amber-800">{entry.adminRemarks}</p>
                      </div>
                    )}
                    {files.length > 0 && (
                      <div className="space-y-1.5">
                        <p className="text-xs font-medium text-muted-foreground">Attached files ({files.length})</p>
                        {fileListReadOnly}
                      </div>
                    )}
                  </div>
                )}

              </CardContent>
            </Card>
          );
        };

        const isImagePreviewFile = (name: string) => /\.(jpe?g|png|gif|webp)$/i.test(name);

        const renderHistoryRow = (entry: YPOPEntry) => {
          const isQualified = entry.status === "qualified";
          const showScore = entry.status === "qualified" || entry.status === "not_qualified";
          const pctEarned = entry.totalPoints > 0 ? Math.round((entry.pointsEarned / entry.totalPoints) * 100) : 0;
          const hasLinkedBudgetRequest = budgetRequests.some(
            (r) => r.ypopEntryId === entry.id && r.budgetRequestType === "ypop_incentive"
          );
          const validatedDate = entry.validatedAt ? formatDateTimeLabel(entry.validatedAt) : null;

          return (
            <Card
              key={entry.id}
              className="cursor-pointer border-border/60 transition-colors hover:border-border hover:bg-muted/30"
              onClick={() => {
                setActiveYpopEntryId(entry.id);
                setYpopPreviewFileId(null);
                setYpopOrgView("entry-detail");
              }}
            >
              <CardContent className="px-5 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                      <Medal className="h-4 w-4 shrink-0 text-primary" />
                    <div>
                      <p className="text-sm font-medium leading-snug">{entry.semesterLabel}</p>
                      {validatedDate && (
  
                      <p className="text-[11px] leading-snug text-muted-foreground">
Validated {validatedDate}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {showScore && (
                      <span className={`text-xs font-medium tabular-nums ${isQualified ? "text-green-700" : "text-destructive"}`}>
                        {pctEarned}%
                      </span>
                    )}
                    <PortalStatusBadge status={entry.status} />
                    {isQualified && (
                      hasLinkedBudgetRequest ? (
                        <div className="inline-flex items-center gap-1 rounded-full border border-green-500/40 bg-green-100/60 px-2.5 py-0.5 text-xs font-medium text-green-700">
                          <Trophy className="h-3 w-3 text-amber-600" />
                          PPA filed ✓
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 bg-green-600 px-2.5 text-xs text-white hover:bg-green-700"
                          onClick={(e) => { e.stopPropagation(); navigate(`${userRouteMap["budget-request"]}?ypopEntryId=${entry.id}&semesterLabel=${encodeURIComponent(entry.semesterLabel)}`); }}
                        >
                          <Trophy className="mr-1 h-3 w-3 text-amber-600" />
                          File PPA
                        </Button>
                      )
                    )}
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        };

        // Entry detail view
        if (ypopOrgView === "entry-detail") {
          const activeEntry = state.ypopEntries.find((e) => e.id === activeYpopEntryId);

          if (!activeEntry) {
            return (
              <PortalSection title="YPOP Incentive" description="Submit proof of participation for admin validation.">
                <PortalEmptyState title="Submission not found" description="This submission may have been deleted." />
              </PortalSection>
            );
          }

          const detailFiles = ypopFilesByEntryId.get(activeEntry.id) ?? [];
          const detailFileListReadOnly = (
            <ul className="space-y-1.5">
              {detailFiles.map((file: YPOPFile) => (
                <li key={file.id} className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <FileText className="h-3.5 w-3.5 shrink-0 text-red-500/80" />
                    <span className="truncate text-sm">{file.fileName}</span>
                  </div>
                  {file.fileUrl ? (
                    <Button type="button" size="sm" variant="ghost" asChild>
                      <a href={file.fileUrl} target="_blank" rel="noreferrer">Open</a>
                    </Button>
                  ) : null}
                </li>
              ))}
            </ul>
          );
          const isSubmitting = submittingYpopId === activeEntry.id;
          const isUploading = ypopUploadingId === activeEntry.id;
          const isDraftOrRevision = activeEntry.status === "draft" || activeEntry.status === "needs_revision";
          const isSubmittedOrReview = activeEntry.status === "submitted" || activeEntry.status === "under_review";
          const isQualified = activeEntry.status === "qualified";
          const isNotQualified = activeEntry.status === "not_qualified";
          const pctEarned = activeEntry.totalPoints > 0 ? Math.round((activeEntry.pointsEarned / activeEntry.totalPoints) * 100) : 0;
          const thresholdPct = activeEntry.totalPoints > 0 ? Math.round((activeEntry.pointsRequired / activeEntry.totalPoints) * 100) : YPOP_SCORE_THRESHOLD;
          const deadline = activeEntry.validationDeadline ? new Date(activeEntry.validationDeadline) : null;
          const isDeadlinePast = deadline ? deadline < new Date() : false;
          const hasLinkedBudgetRequest = budgetRequests.some(
            (r) => r.ypopEntryId === activeEntry.id && r.budgetRequestType === "ypop_incentive"
          );
          const revHistory = activeEntry.revisionHistory ?? [];
          const semesterPeriod = state.ypopPeriods.find((period) => period.semesterKey === activeEntry.semester) ?? null;
          const semesterActivities = ypopActivitiesSorted.filter((activity) => activity.semesterKey === activeEntry.semester);
          const semesterJoinedEvents = joinedYpopEvents.filter((participation) =>
            semesterActivities.some((activity) => activity.id === participation.activityId),
          );
          const semesterOrgActivities = ypopOrgActivities.filter((activity) => activity.ypopEntryId === activeEntry.id);
          const semesterAvailableActivities = semesterActivities.filter(
            (activity) => !semesterJoinedEvents.some((participation) => participation.activityId === activity.id),
          );
          const semesterEventFiles = semesterJoinedEvents.flatMap((participation) =>
            ypopEventFilesByParticipationId.get(participation.id) ?? [],
          );
          const semesterOrgActivityFiles = semesterOrgActivities.flatMap((activity) =>
            ypopOrgActivityFilesByActivityId.get(activity.id) ?? [],
          );
          const detailEventFilter = ypopSemesterEventFilterById[activeEntry.id] ?? "ongoing";
          const filteredSemesterAvailableActivities = semesterAvailableActivities.filter((activity) =>
            detailEventFilter === "past" ? isPastYpopActivityDate(activity.date) : !isPastYpopActivityDate(activity.date),
          );
          const filteredSemesterJoinedEvents = semesterJoinedEvents.filter((participation) =>
            detailEventFilter === "past"
              ? isPastYpopActivityDate(semesterActivities.find((activity) => activity.id === participation.activityId)?.date || participation.activityDate)
              : !isPastYpopActivityDate(semesterActivities.find((activity) => activity.id === participation.activityId)?.date || participation.activityDate),
          );
          const verifiedAttendance = buildVerifiedYpopAttendance(
            semesterActivities,
            semesterJoinedEvents,
            activeEntry.cityLedAttendance,
          );
          const verifiedCityLedIds = new Set(
            verifiedAttendance.filter((attendance) => attendance.attended).map((attendance) => attendance.activityId),
          );
          const approvedOrgActivityCount = getApprovedYpopOrgActivityCount(
            semesterOrgActivities,
            activeEntry.id,
            activeEntry.orgLedProjectCount ?? 0,
          );
          const scoreBreakdown = computeYpopScore(
            verifiedAttendance,
            semesterActivities,
            approvedOrgActivityCount,
            semesterPeriod?.orgLedTiers,
          );

          const revHistoryForLog = revHistory.filter(
            (r) => !(r.action === "submitted" && activeEntry.submittedAt)
          );
          const eventActivityLog: Array<{ label: string; date: string; note?: string }> = [
            ...semesterJoinedEvents.flatMap((participation) => {
              const participationFiles = ypopEventFilesByParticipationId.get(participation.id) ?? [];
              return [
                { label: `Joined event`, date: participation.joinedAt, note: participation.activityName },
                ...participationFiles.map((file) => ({
                  label: "Proof file attached",
                  date: file.uploadedAt,
                  note: `${participation.activityName}: ${file.fileName}`,
                })),
                ...(participation.proofSubmittedAt
                  ? [{ label: "Event proof submitted", date: participation.proofSubmittedAt, note: participation.activityName }]
                  : []),
                ...(participation.verifiedAt
                  ? [{ label: "Event proof verified", date: participation.verifiedAt, note: participation.activityName }]
                  : []),
              ];
            }),
          ];
          const orgActivityLog: Array<{ label: string; date: string; note?: string }> = [
            ...semesterOrgActivities.flatMap((activity) => {
              const activityFiles = ypopOrgActivityFilesByActivityId.get(activity.id) ?? [];
              return [
                { label: "PPA log created", date: activity.createdAt, note: activity.activityName },
                ...activityFiles.map((file) => ({
                  label: "PPA file attached",
                  date: file.uploadedAt,
                  note: `${activity.activityName}: ${file.fileName}`,
                })),
                ...(activity.submittedAt
                  ? [{ label: "PPA submitted", date: activity.submittedAt, note: activity.activityName }]
                  : []),
                ...(activity.approvedAt
                  ? [{ label: "PPA approved", date: activity.approvedAt, note: activity.activityName }]
                  : []),
              ];
            }),
          ];
          const activityLog: Array<{ label: string; date: string; note?: string }> = [
            { label: "Submission started", date: activeEntry.createdAt },
            ...(activeEntry.submittedAt ? [{ label: "Submitted for validation", date: activeEntry.submittedAt }] : []),
            ...revHistoryForLog.map((r) => ({
              label:
                r.action === "needs_revision" ? "Revision requested"
                : r.action === "qualified" ? "Qualified"
                : r.action === "not_qualified" ? "Not qualified"
                : r.action === "under_review" ? "Moved to under review"
                : r.action.replace(/_/g, " "),
              date: r.changedAt,
              note: r.adminRemarks || undefined,
            })),
            ...(activeEntry.validatedAt ? [{ label: "Validated", date: activeEntry.validatedAt }] : []),
            ...eventActivityLog,
            ...orgActivityLog,
          ].sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime());
          const isMobileYpopDetail = !isDesktopViewport;
          const showScoringExplanation = ypopScoringExplanationOpenById[activeEntry.id] ?? false;

          const renderSemesterEventsCard = (mobile: boolean) => (
            <Card className={cn("border-border/70", mobile ? "order-2 lg:hidden" : "hidden lg:block")}>
              <CardHeader className={cn("pb-2.5", mobile ? "px-4 pt-4" : "px-[18px] pb-3 pt-[18px]")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold">Semester Events</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Join available city-led activities and submit post-activity proof directly inside this submission.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant={detailEventFilter === "ongoing" ? "default" : "outline"}
                      onClick={() =>
                        setYpopSemesterEventFilterById((prev) => ({ ...prev, [activeEntry.id]: "ongoing" }))
                      }
                    >
                      Ongoing
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={detailEventFilter === "past" ? "default" : "outline"}
                      onClick={() =>
                        setYpopSemesterEventFilterById((prev) => ({ ...prev, [activeEntry.id]: "past" }))
                      }
                    >
                      Past
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className={cn("pt-0", mobile ? "space-y-4 px-4 pb-4" : "space-y-4 px-[18px] pb-[18px]")}>
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    <span className={mobile ? "" : "hidden lg:inline"}>{mobile ? "Available Activities" : "Available City-Led Activities"}</span>
                    {!mobile && <span className="lg:hidden">Available Activities</span>}
                  </p>
                  {filteredSemesterAvailableActivities.length === 0 ? (
                    mobile ? (
                      <div className="mobile-empty-state rounded-lg border border-border/50 px-4 py-4 text-sm text-muted-foreground">
                        No {detailEventFilter} joinable city-led activities in this semester.
                      </div>
                    ) : (
                      <div className="flex min-h-[76px] items-center rounded-lg border border-dashed border-border/60 bg-muted/10 p-4">
                        <div className="flex items-start gap-3">
                          <UserFeatureIcon icon={CalendarDays} size="compact" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">No {detailEventFilter} joinable activities</p>
                            <p className="mt-1 text-xs text-muted-foreground">New city-led activities will appear here.</p>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      {filteredSemesterAvailableActivities.map((activity) => renderJoinableYpopActivityCard(activity))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">
                    <span className={mobile ? "" : "hidden lg:inline"}>{mobile ? "Joined Activities" : "Joined City-Led Activities"}</span>
                    {!mobile && <span className="lg:hidden">Joined Activities</span>}
                  </p>
                  {filteredSemesterJoinedEvents.length === 0 ? (
                    mobile ? (
                      <div className="mobile-empty-state rounded-lg border border-border/50 px-4 py-4 text-sm text-muted-foreground">
                        <p>No {detailEventFilter} joined activities yet.</p>
                        <p className="text-xs">Proof uploads will appear here.</p>
                      </div>
                    ) : (
                      <div className="flex min-h-[76px] items-center rounded-lg border border-dashed border-border/60 bg-muted/10 p-4">
                        <div className="flex items-start gap-3">
                          <UserFeatureIcon icon={CheckCircle2} size="compact" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium">No {detailEventFilter} joined activities yet</p>
                            <p className="mt-1 text-xs text-muted-foreground">Joined activities and proof uploads will appear here.</p>
                          </div>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="space-y-3">
                      {filteredSemesterJoinedEvents.map((participation) => renderJoinedYpopEventCard(participation))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );

          const renderOrganizationInitiatedCard = (mobile: boolean) => (
            <Card className={cn("border-border/70", mobile ? "order-[7] lg:hidden" : "hidden lg:block")}>
              <CardHeader className={cn("pb-2.5", mobile ? "px-4 pt-4" : "px-[18px] pb-3 pt-[18px]")}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <CardTitle className="text-sm font-semibold">Organization-Initiated Activities</CardTitle>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Log your PPAs here. Only admin-approved entries count toward the organization-initiated bonus.
                    </p>
                  </div>
                  {isQualified && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        resetYpopOrgActivityDraft();
                        setYpopOrgActivityModalOpen(true);
                      }}
                    >
                      <Plus className="mr-1.5 h-4 w-4" />
                      Log PPA
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className={cn("space-y-3 pt-0", mobile ? "px-4 pb-4" : "px-[18px] pb-[18px]")}>
                {semesterOrgActivities.length === 0 ? (
                  mobile ? (
                    <div className="mobile-empty-state rounded-lg border border-border/50 px-4 py-4 text-sm text-muted-foreground">
                      <p>No organization-initiated activities yet.</p>
                      <p className="text-xs">Add PPAs with activity details, narrative, and proof files for admin approval.</p>
                    </div>
                  ) : (
                    <div className="flex min-h-[76px] items-center rounded-lg border border-dashed border-border/60 bg-muted/10 p-4">
                      <div className="flex items-start gap-3">
                        <UserFeatureIcon icon={ClipboardList} size="compact" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">No organization-initiated activities yet</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            Add PPAs with activity details, narrative, and proof files for admin approval.
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-3">
                    {semesterOrgActivities.map((activity) => {
                      const files = ypopOrgActivityFilesByActivityId.get(activity.id) ?? [];
                      const isUploading = ypopOrgActivityUploadingId === activity.id;
                      const isSubmitting = submittingYpopOrgActivityId === activity.id;
                      const canEdit = isQualified && (activity.status === "draft" || activity.status === "needs_revision");
                      return (
                        <Card key={activity.id} className="border-border/60 shadow-none">
                          <CardContent className={cn("space-y-4", mobile ? "p-3.5" : "p-4")}>
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold leading-snug">{activity.activityName}</p>
                                <p className="mt-0.5 text-xs text-muted-foreground">
                                  {activity.activityDate || "Date TBD"}
                                  {activity.venue ? ` • ${activity.venue}` : ""}
                                </p>
                              </div>
                              <PortalStatusBadge status={activity.status} />
                            </div>

                            <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
                              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Narrative Report</p>
                              <p className="text-sm whitespace-pre-wrap text-foreground">{activity.narrativeReport}</p>
                            </div>

                            {activity.status === "needs_revision" && activity.adminRemarks.trim() && (
                              <div className="rounded-lg border border-amber-200/70 bg-amber-50/60 p-3">
                                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Admin Remarks</p>
                                <p className="text-sm text-amber-800">{activity.adminRemarks}</p>
                              </div>
                            )}

                            <div className="space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="text-sm font-medium">Attachments ({files.length})</p>
                                {canEdit && (
                                  <Button type="button" size="sm" variant="outline" onClick={() => promptUploadYpopOrgActivityFile(activity.id)} disabled={isUploading}>
                                    {isUploading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FileUp className="mr-1.5 h-4 w-4" />}
                                    Attach File
                                  </Button>
                                )}
                              </div>
                              {files.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No proof files attached yet.</p>
                              ) : (
                                <div className="space-y-2">
                                  {files.map((file) => (
                                    <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-background px-3 py-2">
                                      <button
                                        type="button"
                                        className="min-w-0 text-left text-sm font-medium text-foreground hover:text-primary"
                                        onClick={() => void openFile(file.fileUrl, file.fileName)}
                                      >
                                        <span className="block truncate">{file.fileName}</span>
                                        <span className="text-xs font-normal text-muted-foreground">{file.fileType || "Attachment"}</span>
                                      </button>
                                      {canEdit && (
                                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => handleDeleteYpopOrgActivityFile(file.id)}>
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                              <p className="text-xs text-muted-foreground">
                                {activity.submittedAt ? `Submitted ${formatDateTimeLabel(activity.submittedAt)}` : `Created ${formatDateTimeLabel(activity.createdAt)}`}
                              </p>
                              <div className="flex flex-wrap items-center gap-2">
                                {canEdit && (
                                  <Button type="button" size="sm" variant="outline" onClick={() => handleEditYpopOrgActivity(activity)}>
                                    Edit Details
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button type="button" size="sm" variant="outline" className="border-destructive/40 text-destructive hover:text-destructive" onClick={() => handleDeleteYpopOrgActivity(activity.id)}>
                                    Delete
                                  </Button>
                                )}
                                {canEdit && (
                                  <Button type="button" size="sm" onClick={() => void handleSubmitYpopOrgActivity(activity)} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                                    {activity.status === "needs_revision" ? "Resubmit PPA" : "Submit PPA"}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          );

          const handleBackToList = () => {
            setYpopOrgView("list");
            setActiveYpopEntryId(null);
            setYpopPreviewFileId(null);
          };

          return (
            <PortalSection title="YPOP Incentive">
              <div className="user-ypop-submission-details-page ypop-submission-detail-page space-y-4 lg:mx-auto lg:max-w-[1320px] lg:space-y-5">

                {/* Back nav + page header */}
                <div className="space-y-2 lg:space-y-3">
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span className="lg:hidden">Back to YPOP Incentive</span>
                    <span className="hidden lg:inline">Back to YPOP Incentive</span>
                  </button>
                  <div className="flex flex-wrap items-start justify-between gap-2 pr-10 sm:pr-12 lg:pr-0">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-[1.15rem] font-semibold leading-snug lg:text-xl">{activeEntry.semesterLabel}</h2>
                      {deadline && (
                        <p className={cn(
                          "mt-0.5 text-xs leading-snug lg:text-sm",
                          isMobileYpopDetail ? "text-destructive/85" : isDeadlinePast ? "text-destructive/70" : "text-muted-foreground",
                        )}>
                          <span className="lg:hidden">
                            Validation {isDeadlinePast ? "closed" : "closes"} {deadline.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                          <span className="hidden lg:inline">
                            Validation {isDeadlinePast ? "closed" : "closes"} · {deadline.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                          </span>
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 max-w-full lg:hidden">
                      <PortalStatusBadge status={activeEntry.status} />
                    </div>
                  </div>
                </div>

                <div className="ypop-details-grid hidden grid-cols-[minmax(0,1.35fr)_minmax(360px,0.85fr)] items-start gap-5 lg:grid">
                  <main className="ypop-workflow-column grid min-w-0 content-start gap-4">
                    {renderSemesterEventsCard(false)}
                    {renderOrganizationInitiatedCard(false)}

                    <RecentActivityPreview
                      activities={activityLog.map((item, index) => ({
                        id: `${item.label}-${item.date}-${index}`,
                        message: (
                          <>
                            <span className="font-medium">{item.label}</span>
                            {item.note ? <span className="text-muted-foreground"> — {item.note}</span> : null}
                          </>
                        ),
                        timestamp: item.date,
                        timestampLabel: formatDateTimeLabel(item.date),
                      }))}
                      maxItems={3}
                      onViewAll={
                        activityLog.length > 3
                          ? () =>
                              setYpopRecentActivityModal({
                                title: `${activeEntry.semesterLabel} Activity`,
                                description: "Full activity history for this YPOP submission.",
                                activities: activityLog.map((item, index) => ({
                                  id: `${item.label}-${item.date}-${index}`,
                                  message: (
                                    <>
                                      <span className="font-medium">{item.label}</span>
                                      {item.note ? <span className="text-muted-foreground"> — {item.note}</span> : null}
                                    </>
                                  ),
                                  timestamp: item.date,
                                  timestampLabel: formatDateTimeLabel(item.date),
                                })),
                              })
                          : undefined
                      }
                      className="ypop-section-card rounded-[0.875rem] border-border/70 bg-card p-[18px] shadow-sm"
                    />

                    {detailFiles.length > 0 && (
                      <Card className="border-border/70">
                        <CardHeader className="px-[18px] pb-2 pt-[18px]">
                          <CardTitle className="text-sm font-semibold">Legacy Semester Files</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 px-[18px] pb-[18px] pt-0">
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            Older semester-level proof files retained for reference.
                          </p>
                          {detailFileListReadOnly}
                        </CardContent>
                      </Card>
                    )}

                    {isDraftOrRevision && (
                      <Card className="border-border/70">
                        <CardContent className="space-y-3 p-[18px]">
                          <div className="space-y-1">
                            <p className="text-sm font-semibold">Message for admin</p>
                            <p className="text-xs text-muted-foreground">Optional context for the reviewer.</p>
                          </div>
                          <Textarea
                            value={ypopNotesByEntryId[activeEntry.id] ?? ""}
                            onChange={(event) =>
                              setYpopNotesByEntryId((previous) => ({
                                ...previous,
                                [activeEntry.id]: event.target.value,
                              }))
                            }
                            placeholder="Any notes for the admin reviewing your participation records..."
                            rows={3}
                            className="resize-none text-sm"
                            disabled={isSubmitting}
                          />
                          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
                            <Button
                              type="button"
                              variant="outline"
                              className="border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
                              onClick={() => setConfirmDeleteYpopEntryId(activeEntry.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Submission
                            </Button>
                            <Button
                              type="button"
                              onClick={() => void handleSubmitYpop(activeEntry)}
                              disabled={isSubmitting}
                            >
                              {isSubmitting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Submitting...
                                </>
                              ) : activeEntry.status === "needs_revision" ? (
                                "Resubmit for Validation"
                              ) : (
                                "Submit for Validation"
                              )}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </main>

                  <aside className="ypop-summary-column grid min-w-0 content-start gap-4">
                    <Card className="ypop-section-card border-border/70">
                      <CardHeader className="px-[18px] pb-2 pt-[18px]">
                        <div className="flex items-start justify-between gap-3">
                          <CardTitle className="text-base font-semibold">Qualification Result</CardTitle>
                          <PortalStatusBadge status={activeEntry.status} />
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 px-[18px] pb-[18px] pt-0">
                        <div className="space-y-3">
                          <dl className="space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-muted-foreground">City-Led Score</dt>
                              <dd className="font-semibold tabular-nums text-foreground">{scoreBreakdown.cityLedPercent}%</dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-muted-foreground">Organization Bonus</dt>
                              <dd className="font-semibold tabular-nums text-foreground">+{scoreBreakdown.orgLedBonus}%</dd>
                            </div>
                            <div className="flex items-end justify-between gap-3 border-t border-border/60 pt-2">
                              <dt className="font-medium text-foreground">Final Score</dt>
                              <dd
                                className={cn(
                                  "text-2xl font-semibold tabular-nums",
                                  isQualified ? "text-green-700" : isNotQualified ? "text-destructive" : "text-foreground",
                                )}
                              >
                                {scoreBreakdown.totalScore}%
                              </dd>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <dt className="text-muted-foreground">Threshold</dt>
                              <dd className="font-semibold tabular-nums text-foreground">{activeEntry.pointsRequired}%</dd>
                            </div>
                          </dl>
                          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                isQualified ? "bg-green-500" : isNotQualified ? "bg-destructive" : "bg-primary/70",
                              )}
                              style={{ width: `${Math.min(scoreBreakdown.totalScore, 100)}%` }}
                            />
                            <div
                              className="absolute top-0 h-full w-0.5 bg-foreground/40"
                              style={{ left: `${Math.min(activeEntry.pointsRequired, 100)}%` }}
                            />
                          </div>
                        </div>

                        {isQualified && (
                          <div className="rounded-xl border border-green-500/15 bg-green-500/5 p-3.5">
                            <div className="flex items-start gap-3">
                              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-green-100 text-green-700" aria-hidden="true">
                                <Trophy className="h-4 w-4" />
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-semibold text-green-800">You're qualified for a Project Grant!</p>
                                <p className="mt-1 text-sm leading-snug text-foreground/75">
                                  Your YPOP score qualifies your organization for a budget incentive.
                                </p>
                                <div className="mt-3">
                                  {hasLinkedBudgetRequest ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-100/60 px-3 py-1 text-xs font-medium text-green-800">
                                      <CheckCircle2 className="h-3.5 w-3.5" />
                                      Budget request already submitted
                                    </span>
                                  ) : (
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="bg-green-600 text-white hover:bg-green-700"
                                      onClick={() =>
                                        navigate(
                                          `${userRouteMap["budget-request"]}?ypopEntryId=${activeEntry.id}&semesterLabel=${encodeURIComponent(activeEntry.semesterLabel)}`,
                                        )
                                      }
                                    >
                                      <Trophy className="mr-2 h-4 w-4" />
                                      Submit a Budget Request
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {isSubmittedOrReview && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                            Submitted - awaiting admin review.
                          </div>
                        )}

                        {activeEntry.adminRemarks.trim() && (
                          <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-700">Admin Remarks</p>
                            <p className="text-sm text-amber-900">{activeEntry.adminRemarks}</p>
                          </div>
                        )}

                        {!isDraftOrRevision && activeEntry.submissionNote.trim() && (
                          <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                            <p className="mb-1 text-xs font-medium text-muted-foreground">Message sent with submission</p>
                            <p className="text-sm">{activeEntry.submissionNote}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="ypop-section-card border-border/70">
                      <CardHeader className="px-[18px] pb-3 pt-[18px]">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-base font-semibold">Scoring Breakdown</CardTitle>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                            onClick={() => setYpopScoringHelpOpen(true)}
                            aria-label="View YPOP scoring guide"
                          >
                            <CircleHelp className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 px-[18px] pb-[18px] pt-0">
                        <div className="grid grid-cols-3 gap-2.5">
                          {[
                            { label: "City-Led", value: `${scoreBreakdown.cityLedPercent}%` },
                            { label: "Bonus", value: `+${scoreBreakdown.orgLedBonus}%` },
                            { label: "Threshold", value: `${activeEntry.pointsRequired}%` },
                          ].map((metric) => (
                            <div key={metric.label} className="min-w-0 rounded-lg border border-border/60 bg-muted/20 p-3">
                              <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">{metric.label}</p>
                              <p className="mt-1 text-lg font-semibold leading-none tabular-nums text-foreground">{metric.value}</p>
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1 border-t border-border/50 pt-3">
                          <p className="pb-1 text-sm font-semibold">City-Led Activities</p>
                          {semesterActivities.length === 0 ? (
                            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                              No city-led activities are configured for this semester yet.
                            </div>
                          ) : (
                            semesterActivities.map((activity) => {
                              const participation = semesterJoinedEvents.find((item) => item.activityId === activity.id);
                              const isVerified =
                                verifiedCityLedIds.has(activity.id) || participation?.status === "verified";
                              return (
                                <div
                                  key={activity.id}
                                  className="city-led-activity-row grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border/50 py-2.5 last:border-b-0"
                                >
                                  <div className="min-w-0">
                                    <p className="line-clamp-2 text-sm font-medium leading-snug">{activity.name}</p>
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {activity.date ? formatShortPortalDate(activity.date) : "Date TBD"}
                                      {activity.venue ? ` · ${activity.venue}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex max-w-[190px] flex-wrap items-center justify-end gap-1.5">
                                    <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                      {YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(activity.category, activity.points)]}
                                    </span>
                                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                      {normalizeYpopCityLedPoints(activity.points, activity.category)} pts
                                    </span>
                                    {isVerified ? (
                                      <PortalStatusBadge status="verified" />
                                    ) : participation ? (
                                      <PortalStatusBadge status={participation.status} />
                                    ) : (
                                      <span className="rounded-full border border-border/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                                        Not joined
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <div className="space-y-2 border-t border-border/50 pt-3">
                          <p className="text-sm font-semibold">Organization Bonus</p>
                          {semesterPeriod?.orgLedTiers?.length ? (
                            <div>
                              {[...semesterPeriod.orgLedTiers]
                                .sort((left, right) => right.minProjects - left.minProjects)
                                .map((tier) => (
                                  <div
                                    key={`${tier.minProjects}-${tier.bonus}`}
                                    className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/50 py-2.5 text-sm last:border-b-0"
                                  >
                                    <span>{`${tier.minProjects}+ activit${tier.minProjects === 1 ? "y" : "ies"}`}</span>
                                    <span className="font-semibold">+{tier.bonus}%</span>
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <div className="rounded-lg border border-dashed border-border/60 bg-muted/10 p-4 text-sm text-muted-foreground">
                              No organization bonus tiers are configured yet.
                            </div>
                          )}
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            Admin-confirmed organization-initiated activity count: {approvedOrgActivityCount}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                  </aside>
                </div>

                {/* Mobile and small-tablet body */}
                <div className="grid gap-6 lg:hidden">

                  {/* LEFT â€” metadata + actions */}
                  <div className="flex min-w-0 flex-col gap-4 lg:gap-5">

                    {/* Admin Remarks â€” needs_revision */}
                    {activeEntry.status === "needs_revision" && activeEntry.adminRemarks.trim() && (
                      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-4">
                        <p className="mb-1 text-sm font-semibold text-amber-700">Revision Required</p>
                        <p className="text-sm text-amber-800">{activeEntry.adminRemarks}</p>
                      </div>
                    )}

                    {/* Quiet state â€” submitted / under review */}
                    {isSubmittedOrReview && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        Submitted - awaiting admin review.
                      </div>
                    )}

                    <Card className="order-3 border-border/70 lg:order-none">
                      <CardHeader className="pb-2.5 lg:pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-sm font-semibold">
                            <span className="lg:hidden">Scoring Breakdown</span>
                            <span className="hidden lg:inline">Scoring Overview</span>
                          </CardTitle>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="hidden h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground lg:inline-flex"
                            onClick={() => setYpopScoringHelpOpen(true)}
                            aria-label="View YPOP scoring guide"
                          >
                            <CircleHelp className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3 pt-0 lg:space-y-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-3 pr-10 text-xs sm:text-sm lg:pr-0">

                            <span className="text-muted-foreground">Final participation score</span>
                            <span className={`font-semibold ${isQualified ? "text-green-700" : isNotQualified ? "text-destructive" : "text-foreground"}`}>
                              {scoreBreakdown.totalScore}%
                            </span>
                          </div>
                          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${isQualified ? "bg-green-500" : isNotQualified ? "bg-destructive" : "bg-primary/70"}`}
                              style={{ width: `${Math.min(scoreBreakdown.totalScore, 100)}%` }}
                            />
                            <div className="absolute top-0 h-full w-0.5 bg-foreground/30" style={{ left: `${thresholdPct}%` }} />
                          </div>
                          <div className="lg:hidden">
                            <button
                              type="button"
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors hover:text-foreground"
                              aria-expanded={showScoringExplanation}
                              onClick={() =>
                                setYpopScoringExplanationOpenById((prev) => ({
                                  ...prev,
                                  [activeEntry.id]: !showScoringExplanation,
                                }))
                              }
                            >
                              How scoring works
                              {showScoringExplanation ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            </button>
                            {showScoringExplanation && (
                              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                                YPOP uses percentage-based scoring. City-led score is points earned divided by total possible points, then approved organization-initiated activities add bonus percentage points. Final score can exceed 100%.
                              </p>
                            )}
                          </div>
                          <p className="hidden text-[11px] text-muted-foreground lg:block">
                            YPOP uses percentage-based scoring. City-led score is points earned divided by total possible points, then approved organization-initiated activities add bonus percentage points. Final score can exceed 100%.
                          </p>
                        </div>

                        <div className="scoring-breakdown-grid grid grid-cols-3 gap-2 sm:gap-2.5">
                          <div className="scoring-breakdown-item min-w-0 rounded-lg border border-border/60 bg-muted/20 px-2 py-2.5 text-center lg:p-3 lg:text-left">
                            <p className="text-[11px] uppercase leading-snug tracking-[0.14em] text-muted-foreground lg:normal-case lg:tracking-normal">City-Led</p>
                            <p className="mt-1 text-[1.3rem] font-semibold leading-none lg:text-base">{scoreBreakdown.cityLedPercent}%</p>
                          </div>
                          <div className="scoring-breakdown-item min-w-0 rounded-lg border border-border/60 bg-muted/20 px-2 py-2.5 text-center lg:p-3 lg:text-left">
                            <p className="text-[11px] uppercase leading-snug tracking-[0.14em] text-muted-foreground lg:normal-case lg:tracking-normal">Bonus</p>
                            <p className="mt-1 text-[1.3rem] font-semibold leading-none lg:text-base">+{scoreBreakdown.orgLedBonus}%</p>
                          </div>
                          <div className="scoring-breakdown-item min-w-0 rounded-lg border border-border/60 bg-muted/20 px-2 py-2.5 text-center lg:p-3 lg:text-left">
                            <p className="text-[11px] uppercase leading-snug tracking-[0.14em] text-muted-foreground lg:normal-case lg:tracking-normal">Threshold</p>
                            <p className="mt-1 text-[1.3rem] font-semibold leading-none lg:text-base">{activeEntry.pointsRequired}%</p>
                          </div>
                        </div>

                        <div className="space-y-2 border-t border-border/50 pt-3 lg:border-0 lg:pt-0">
                          <p className="text-sm font-medium">City-Led Activities</p>
                          {semesterActivities.length === 0 ? (
                            <>
                              <p className="rounded-md border border-border/50 px-3 py-4 text-xs text-muted-foreground lg:hidden">
                                No city-led activities are configured for this semester yet.
                              </p>
                              <p className="hidden rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground lg:block">
                                No city-led activities are configured for this semester yet.
                              </p>
                            </>
                          ) : (
                            <div className="space-y-0 lg:space-y-1.5">
                              {semesterActivities.map((activity) => {
                                const participation = semesterJoinedEvents.find((item) => item.activityId === activity.id);
                                const isVerifiedAttendance = verifiedCityLedIds.has(activity.id);
                                return (
                                  <div key={activity.id} className="city-led-activity-item grid gap-2 border-b border-border/50 py-3 last:border-b-0 lg:flex lg:items-start lg:justify-between lg:gap-3 lg:rounded-lg lg:border lg:border-border/60 lg:px-3 lg:py-2.5">
                                    <div className="activity-main min-w-0">
                                      <p className="text-sm font-medium leading-snug">{activity.name}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {activity.date || "Date TBD"}
                                        {activity.venue ? ` • ${activity.venue}` : ""}
                                      </p>
                                    </div>
                                    <div className="activity-badges flex flex-wrap items-center gap-2 lg:shrink-0 lg:justify-end">
                                      <span className="rounded-full border border-border/60 bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                        {YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(activity.category, activity.points)]}
                                      </span>
                                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                                        {normalizeYpopCityLedPoints(activity.points, activity.category)} pts
                                      </span>
                                      {isVerifiedAttendance ? (
                                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                          Verified
                                        </span>
                                      ) : participation?.status === "verified" && isMobileYpopDetail ? (
                                        <PortalStatusBadge status="verified" />
                                      ) : participation ? (
                                        <PortalStatusBadge status={participation.status} />
                                      ) : (
                                        <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                          Not joined
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        <div className="space-y-2 border-t border-border/50 pt-3 lg:border-0 lg:pt-0">
                          <p className="text-sm font-medium">
                            <span className="lg:hidden">Organization Bonus</span>
                            <span className="hidden lg:inline">Organization-Initiated Activities</span>
                          </p>
                          {semesterPeriod?.orgLedTiers?.length ? (
                            <>
                              <div className="hidden space-y-1.5 lg:block">
                                {[...semesterPeriod.orgLedTiers]
                                    .sort((left, right) => right.minProjects - left.minProjects)
                                    .map((tier) => (
                                      <div key={`${tier.minProjects}-${tier.bonus}`} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                                        <span>{`>= ${tier.minProjects} activit${tier.minProjects === 1 ? "y" : "ies"}`}</span>
                                        <span className="font-semibold">+{tier.bonus}% bonus</span>
                                      </div>
                                    ))}
                              </div>
                              <div className="rounded-lg border border-border/60 px-3 lg:hidden">
                                {[...semesterPeriod.orgLedTiers]
                                    .sort((left, right) => right.minProjects - left.minProjects)
                                    .map((tier) => (
                                      <div key={`${tier.minProjects}-${tier.bonus}`} className="bonus-threshold-row grid grid-cols-[minmax(0,1fr)_auto] gap-3 border-b border-border/50 py-2.5 text-sm last:border-b-0">
                                        <span>{`${tier.minProjects}+ activit${tier.minProjects === 1 ? "y" : "ies"}`}</span>
                                        <span className="font-semibold">+{tier.bonus}%</span>
                                      </div>
                                    ))}
                              </div>
                            </>
                          ) : (
                            <>
                              <p className="rounded-md border border-border/50 px-3 py-4 text-xs text-muted-foreground lg:hidden">
                                No organization-initiated scoring tiers are configured for this semester yet.
                              </p>
                              <p className="hidden rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground lg:block">
                                No organization-initiated scoring tiers are configured for this semester yet.
                              </p>
                            </>
                          )}
                          <p className="text-[11px] leading-snug text-muted-foreground">
                            Admin-confirmed organization-initiated activity count: {approvedOrgActivityCount}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Message / Note */}
                    {isDraftOrRevision && (
                      <div className="order-[5] space-y-2 lg:order-none">
                        <p className="font-medium">
                          Message for admin
                          <span className="ml-1.5 text-sm font-normal text-muted-foreground">(optional)</span>
                        </p>
                        <Textarea
                          value={ypopNotesByEntryId[activeEntry.id] ?? ""}
                          onChange={(e) => setYpopNotesByEntryId((prev) => ({ ...prev, [activeEntry.id]: e.target.value }))}
                          placeholder="Any notes for the admin reviewing your participation records..."
                          rows={3}
                          className="resize-none text-sm"
                          disabled={isSubmitting}
                        />
                      </div>
                    )}
                    {!isDraftOrRevision && activeEntry.submissionNote.trim() && (
                      <div className="order-[5] rounded-lg border border-border/50 bg-muted/20 p-3 lg:order-none">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Message sent with submission</p>
                        <p className="text-sm">{activeEntry.submissionNote}</p>
                      </div>
                    )}

                    {/* Validation result (qualified / not_qualified) */}
                    {(isQualified || isNotQualified) && (
                      <div className="order-1 space-y-3 lg:order-none">
                        <p className="font-medium">Validation Result</p>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-3 pr-10 text-xs sm:text-sm lg:pr-0">

                            <span className="text-muted-foreground">Participation score</span>
                            <span className={`font-semibold ${isQualified ? "text-green-700" : "text-destructive"}`}>
                              {activeEntry.pointsEarned}%
                            </span>
                          </div>
                          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full transition-all ${isQualified ? "bg-green-500" : "bg-destructive"}`}
                              style={{ width: `${Math.min(pctEarned, 100)}%` }}
                            />
                            <div className="absolute top-0 h-full w-0.5 bg-foreground/30" style={{ left: `${thresholdPct}%` }} />
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            {thresholdPct}% threshold required to qualify. Organization-initiated bonuses can push the final score above {YPOP_BASE_TOTAL_POINTS}%.
                          </p>
                        </div>
                        {isQualified && (
                          <div className="qualification-result rounded-xl border border-green-500/30 bg-green-500/5 p-3.5 lg:p-4">
                            <div className="qualification-result-header grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2.5 lg:flex lg:items-start lg:gap-3">
                              <div className="qualification-result-icon grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full bg-green-100 text-green-600 lg:h-auto lg:w-auto lg:p-1.5">
                                <Trophy className="h-4 w-4 text-amber-600" />
                              </div>
                              <div className="qualification-result-content min-w-0 flex-1 space-y-2">
                                <div>
                                  <p className="text-[0.95rem] font-semibold leading-[1.3] text-green-800 lg:text-sm lg:leading-normal">You're qualified for a Project Grant!</p>
                                  <p className="mt-1 text-[0.85rem] leading-[1.45] text-green-700 lg:mt-0 lg:text-sm lg:leading-normal">
                                    Your {activeEntry.semesterLabel} YPOP score qualifies you for a budget incentive. Submit your Plans, Programs &amp; Activities (PPA) to claim it.
                                  </p>
                                </div>
                                {hasLinkedBudgetRequest ? (
                                  <div className="inline-flex items-center gap-1.5 rounded-full border border-green-500/40 bg-green-100/60 px-3 py-1 text-xs font-medium text-green-700">
                                    <Trophy className="h-3.5 w-3.5 text-amber-600" />
                                    Budget request already submitted ✓
                                  </div>
                                ) : (
                                  <div className="qualification-result-action w-full lg:w-auto">
                                    <Button
                                      type="button"
                                      size="sm"
                                      className="min-h-[42px] w-full justify-center bg-green-600 text-white hover:bg-green-700 sm:w-auto lg:min-h-0 lg:w-auto"
                                      onClick={() => navigate(`${userRouteMap["budget-request"]}?ypopEntryId=${activeEntry.id}&semesterLabel=${encodeURIComponent(activeEntry.semesterLabel)}`)}
                                    >
                                      <Trophy className="mr-2 h-4 w-4 text-amber-600" />
                                      <span className="lg:hidden">Submit a Budget Request</span>
                                      <span className="hidden lg:inline">Submit a Budget Request (PPA)</span>
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        {activeEntry.adminRemarks.trim() && (
                          <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Remarks</p>
                            <p className="text-sm text-amber-800">{activeEntry.adminRemarks}</p>
                          </div>
                        )}
                      </div>
                    )}

                    {renderSemesterEventsCard(true)}

                    {/* Activity Log */}
                    <div className="section-recent-activity order-[6] lg:order-none">
                      <RecentActivityPreview
                        activities={activityLog.map((item, index) => ({
                          id: `${item.label}-${item.date}-${index}`,
                          message: (
                            <>
                              <span className="font-medium">{item.label}</span>
                              {item.note ? <span className="text-muted-foreground"> — {item.note}</span> : null}
                            </>
                          ),
                          timestamp: item.date,
                          timestampLabel: formatDateTimeLabel(item.date),
                        }))}
                        onViewAll={
                          activityLog.length > 3
                            ? () =>
                                setYpopRecentActivityModal({
                                  title: `${activeEntry.semesterLabel} Activity`,
                                  description: "Full activity history for this YPOP submission.",
                                  activities: activityLog.map((item, index) => ({
                                    id: `${item.label}-${item.date}-${index}`,
                                    message: (
                                      <>
                                        <span className="font-medium">{item.label}</span>
                                        {item.note ? <span className="text-muted-foreground"> — {item.note}</span> : null}
                                      </>
                                    ),
                                    timestamp: item.date,
                                    timestampLabel: formatDateTimeLabel(item.date),
                                  })),
                                })
                            : undefined
                        }
                        className="border-0 bg-transparent p-0 shadow-none"
                        headerClassName="mb-2"
                      />
                    </div>

                    {renderOrganizationInitiatedCard(true)}

                    {/* Footer actions */}
                    {isDraftOrRevision && (
                      <div className="order-[8] flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4 lg:order-none">
                        <Button
                          type="button"
                          variant="outline"
                          className="border-destructive/50 text-destructive hover:bg-destructive/5 hover:text-destructive"
                          onClick={() => setConfirmDeleteYpopEntryId(activeEntry.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete Submission
                        </Button>
                        <Button
                          type="button"
                          onClick={() => void handleSubmitYpop(activeEntry)}
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                          ) : activeEntry.status === "needs_revision" ? "Resubmit for Validation" : "Submit for Validation"}
                        </Button>
                      </div>
                    )}

                  </div>

                  <div className="space-y-4 lg:space-y-5">
                    {renderSemesterEventsCard(false)}

                    {renderOrganizationInitiatedCard(false)}

                    {detailFiles.length > 0 && (
                      <Card className="border-border/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">Legacy Semester Files</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
    
                      <p className="text-[11px] leading-snug text-muted-foreground">

                            These were attached through the older semester-level proof flow and are still retained for reference.
                          </p>
                          {detailFileListReadOnly}
                        </CardContent>
                      </Card>
                    )}
                  </div>

                </div>

              </div>
              <Dialog open={ypopScoringHelpOpen} onOpenChange={setYpopScoringHelpOpen}>
                <DialogContent className="sm:max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>YPOP Scoring Breakdown</DialogTitle>
                    <DialogDescription>
                      City-led activities are scored using the memo formula: points earned divided by total possible points, rounded to the nearest whole percent. Total possible points come from the available city-led categories in the semester: Mandatory = 4, Invitational = 3, Partnership = 2. Approved organization-initiated activities then add bonus percentage points.
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
                            <TableCell>{scoreBreakdown.cityLedEarned}</TableCell>
                            <TableCell>{scoreBreakdown.cityLedMax}</TableCell>
                            <TableCell>{scoreBreakdown.cityLedEarned} ÷ {scoreBreakdown.cityLedMax || 0} × 100 = {scoreBreakdown.cityLedPercent}%</TableCell>
                            <TableCell>{scoreBreakdown.cityLedPercent}% of total</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell>Organization-Initiated Activities</TableCell>
                            <TableCell>{approvedOrgActivityCount} approved</TableCell>
                            <TableCell>Bonus tier basis</TableCell>
                            <TableCell>Based on approved PPA count</TableCell>
                            <TableCell>+{scoreBreakdown.orgLedBonus}% bonus</TableCell>
                          </TableRow>
                          <TableRow>
                            <TableCell className="font-semibold">Total YPOP Points</TableCell>
                            <TableCell colSpan={3} className="font-medium">City-led percentage + organization-initiated bonus</TableCell>
                            <TableCell className="font-semibold">{scoreBreakdown.totalScore}%</TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Current City-Led</p>
                        <p className="mt-1 font-semibold">{scoreBreakdown.cityLedEarned} / {scoreBreakdown.cityLedMax} pts</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Rounded Percentage</p>
                        <p className="mt-1 font-semibold">{scoreBreakdown.cityLedPercent}%</p>
                      </div>
                      <div className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Threshold</p>
                        <p className="mt-1 font-semibold">{activeEntry.pointsRequired}% to qualify</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Example: if the semester has one Mandatory, one Invitational, and one Partnership activity, the total possible city-led points are 9. If the organization verifies the Mandatory and Partnership activities only, the city-led score is 6 ÷ 9 × 100 = 66.67%, rounded to 67%.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>

              <Dialog open={ypopOrgActivityModalOpen} onOpenChange={handleYpopOrgActivityModalChange}>
                <DialogContent className="sm:max-w-xl">
                  <DialogHeader>
                    <DialogTitle>{editingYpopOrgActivityId ? "Edit Organization-Initiated Activity" : "Log Organization-Initiated Activity"}</DialogTitle>
                    <DialogDescription>
                      Add the PPA details first, then attach photo documentation or supporting files after saving the draft.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="ypop-ppa-name">Activity Name</Label>
                      <Input
                        id="ypop-ppa-name"
                        value={ypopOrgActivityDraft.activityName}
                        onChange={(event) => setYpopOrgActivityDraft((current) => ({ ...current, activityName: event.target.value }))}
                        placeholder="Enter the PPA or activity title"
                      />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="ypop-ppa-venue">Venue</Label>
                        <Input
                          id="ypop-ppa-venue"
                          value={ypopOrgActivityDraft.venue}
                          onChange={(event) => setYpopOrgActivityDraft((current) => ({ ...current, venue: event.target.value }))}
                          placeholder="Activity venue"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="ypop-ppa-date">Date</Label>
                        <Input
                          id="ypop-ppa-date"
                          type="date"
                          value={ypopOrgActivityDraft.activityDate}
                          onChange={(event) => setYpopOrgActivityDraft((current) => ({ ...current, activityDate: event.target.value }))}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ypop-ppa-narrative">Narrative Report</Label>
                      <Textarea
                        id="ypop-ppa-narrative"
                        value={ypopOrgActivityDraft.narrativeReport}
                        onChange={(event) => setYpopOrgActivityDraft((current) => ({ ...current, narrativeReport: event.target.value }))}
                        placeholder="Summarize what happened, the objective, and the outcomes of the activity."
                        rows={5}
                        className="resize-none"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => handleYpopOrgActivityModalChange(false)} disabled={savingYpopOrgActivity}>
                      Cancel
                    </Button>
                    <Button type="button" onClick={() => void handleSaveYpopOrgActivity(activeEntry)} disabled={savingYpopOrgActivity}>
                      {savingYpopOrgActivity ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
                      {editingYpopOrgActivityId ? "Save Changes" : "Save PPA Draft"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </PortalSection>
          );
        }

        // List view
        return (
          <PortalSection
            title="YPOP Incentive"
            description="Join city-led activities, submit post-activity proof for verification, and track semester-based incentive qualification in one place."
          >
            <div className="ypop-incentive-page space-y-4 lg:space-y-8">
              {!ypopWorkflowEligibility.canEditParticipation ? (
                <WebsiteWorkflowNotice
                  title="Organization verification required"
                  description="You can review available YPOP periods, but participation becomes editable only after registration verification is complete."
                  requirements={ypopWorkflowEligibility.requirements}
                  actionLabel={!ypopWorkflowEligibility.profileComplete ? "Complete Profile" : "View Registration Status"}
                  onAction={() => navigate(!ypopWorkflowEligibility.profileComplete ? userRouteMap["organization-profile"] : userRouteMap["document-submission"])}
                />
              ) : null}

              <div className="space-y-3 lg:hidden" aria-label="YPOP semester submissions">
                {allYpopPeriods.map((period) => {
                  const existing = orgYpopEntries.find((entry) => entry.semester === period.semesterKey) ?? null;
                  const existingFiles = existing ? (ypopFilesByEntryId.get(existing.id) ?? []) : [];
                  const periodActivities = ypopActivitiesSorted.filter((activity) => activity.semesterKey === period.semesterKey);
                  const periodActivityIds = new Set(periodActivities.map((activity) => activity.id));
                  const periodJoinedEvents = joinedYpopEvents.filter((participation) => periodActivityIds.has(participation.activityId));
                  const periodOrgActivities = existing
                    ? state.ypopOrgActivities.filter((activity) => activity.ypopEntryId === existing.id)
                    : [];
                  const proofCount =
                    existingFiles.length +
                    state.ypopEventFiles.filter((file) => periodJoinedEvents.some((participation) => participation.id === file.participationId)).length +
                    state.ypopOrgActivityFiles.filter((file) => periodOrgActivities.some((activity) => activity.id === file.orgActivityId)).length;
                  const periodAvailableActivities = periodActivities.filter((activity) => {
                    const participation = ypopParticipationByActivityId.get(activity.id);
                    return getYpopEventJoinEligibility({
                      activity,
                      period,
                      entry: existing,
                      participation,
                      profile: currentProfile,
                    }).allowed;
                  });
                  const finalized = existing?.status === "qualified" || existing?.status === "not_qualified";
                  const actionText = existing
                    ? existing.status === "draft"
                      ? "Open Submission"
                      : existing.status === "needs_revision"
                        ? "Continue Revision"
                        : finalized
                          ? "View Result"
                          : "View Submission"
                    : period.status === "open" && ypopWorkflowEligibility.canEditParticipation
                      ? "Open Submission"
                      : "View Period";
                  return (
                    <Card key={`${period.id}-${existing?.id ?? "period"}`} className="overflow-hidden border-border/70 shadow-sm">
                      <CardContent className="space-y-4 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="font-semibold">{period.semesterLabel}</h3>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Validation {period.status === "open" ? "closes" : "closed"} {period.validationDeadline ? formatCompactDateLabel(period.validationDeadline) : "on a date to be announced"}
                            </p>
                          </div>
                          <PortalStatusBadge status={existing?.status ?? period.status} />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="rounded-lg bg-muted/40 p-2 text-center"><p className="text-[10px] text-muted-foreground">Available</p><strong>{periodAvailableActivities.length}</strong></div>
                          <div className="rounded-lg bg-muted/40 p-2 text-center"><p className="text-[10px] text-muted-foreground">Joined</p><strong>{periodJoinedEvents.length}</strong></div>
                          <div className="rounded-lg bg-muted/40 p-2 text-center"><p className="text-[10px] text-muted-foreground">Proof files</p><strong>{proofCount}</strong></div>
                        </div>
                        {finalized ? (
                          <div className={cn("rounded-lg border p-3 text-sm font-medium", existing?.status === "qualified" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800")}>
                            {existing?.status === "qualified" ? "Qualified for the YPOP incentive" : "Not qualified for this period"}
                          </div>
                        ) : null}
                        <Button
                          type="button"
                          variant="outline"
                          className="h-11 w-full justify-between"
                          disabled={!existing && (period.status !== "open" || !ypopWorkflowEligibility.canEditParticipation)}
                          onClick={() => {
                            if (existing) {
                              setActiveYpopEntryId(existing.id);
                              setYpopPreviewFileId(null);
                              setYpopOrgView("entry-detail");
                            } else {
                              void handleStartYpopSubmission(period);
                            }
                          }}
                        >
                          {actionText}<ChevronRight className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
                {!allYpopPeriods.length ? <PortalEmptyState title="No YPOP validation periods are available yet" description="Check back when LYDO / PCYDO publishes a validation period." /> : null}
              </div>

              <div className="hidden space-y-2 lg:block lg:space-y-3">
                <p className="text-sm font-semibold text-foreground">Open Semesters</p>
                {openPeriods.length === 0 ? (
                  <PortalEmptyState
                    title="No open semesters right now"
                    description="Check back when the next YPOP registration period opens."
                  />
                ) : (
                  <Accordion type="multiple" className="ypop-semester-list space-y-3 lg:space-y-4">
                    {openPeriods.map((period) => {
                      const existing = activeEntries.find((e) => e.semester === period.semesterKey);
                      const existingFiles = existing ? (ypopFilesByEntryId.get(existing.id) ?? []) : [];
                      const deadlineDate = period.validationDeadline ? new Date(period.validationDeadline) : null;
                      const periodActivities = ypopActivitiesSorted.filter((activity) => activity.semesterKey === period.semesterKey);
                      const periodActivityIds = new Set(periodActivities.map((activity) => activity.id));
                      const periodAvailableActivities = periodActivities.filter((activity) => !ypopParticipationByActivityId.has(activity.id));
                      const periodJoinedEvents = joinedYpopEvents.filter((participation) => periodActivityIds.has(participation.activityId));
                      const summaryItems = [
                        `${periodAvailableActivities.length} available`,
                        `${periodJoinedEvents.length} joined`,
                        `${existingFiles.length} ${existingFiles.length === 1 ? "file" : "files"}`,
                      ];

                      return (
                        <AccordionItem
                          key={period.id}
                          value={period.id}
                          className="ypop-semester-card overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                        >
                          <AccordionTrigger className="ypop-semester-trigger px-4 py-3.5 pr-12 text-left hover:no-underline sm:px-5 sm:pr-14 lg:px-6 lg:py-4 lg:pr-12">
                            <div className="ypop-semester-summary flex w-full flex-col gap-3 pr-1 lg:pr-3">
                              <div className="ypop-semester-summary-main grid w-full grid-cols-[auto_minmax(0,1fr)] items-start gap-3 lg:flex lg:items-start lg:justify-between">
                                <div className="flex min-w-0 items-start gap-3">
                                <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                                  <Medal className="h-4 w-4 text-primary" />
                                </div>
                                  <div className="min-w-0">
                                    <p className="semester-title text-[0.98rem] font-semibold leading-snug lg:text-base">{period.semesterLabel}</p>
                                    <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                                      YPOP Participation Validation
                                    </p>
                                  {deadlineDate && (
                                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                                      Validation closes {deadlineDate.toLocaleDateString("en-PH", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </p>
                                  )}
                                    <p className="mt-1 hidden text-xs text-muted-foreground lg:block">
                                      {periodAvailableActivities.length} available event{periodAvailableActivities.length === 1 ? "" : "s"} •{" "}
                                      {periodJoinedEvents.length} joined event{periodJoinedEvents.length === 1 ? "" : "s"}
                                    </p>
                                </div>
                              </div>
                                <div className="hidden flex-wrap items-center gap-2 lg:flex">
                                  {existing ? <PortalStatusBadge status={existing.status} /> : null}
                                  {existing ? (
                                    <span className="text-[11px] text-muted-foreground">
                                      {existingFiles.length} {existingFiles.length === 1 ? "file" : "files"} attached
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              <div className="ypop-semester-summary-footer flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground sm:text-xs lg:hidden">
                                {existing ? <PortalStatusBadge status={existing.status} /> : null}
                                <span className="min-w-0">{summaryItems.join(" • ")}</span>
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-t border-border/60 px-4 pb-4 pt-3.5 sm:px-5 sm:pb-5 lg:px-6 lg:pb-6 lg:pt-4">
                            <div className="space-y-3 lg:space-y-4">
                              <div className="semester-stats grid grid-cols-3 gap-2 sm:gap-2.5">
                                <div className="semester-stat min-w-0 rounded-xl border border-border/60 bg-muted/20 px-2 py-3 text-center lg:p-4">
                                  <p className="text-[11px] uppercase leading-snug tracking-[0.14em] text-muted-foreground lg:text-[11px] lg:normal-case lg:tracking-normal">
                                    <span className="lg:hidden">Available</span>
                                    <span className="hidden lg:inline">Available events</span>
                                  </p>
                                  <p className="semester-stat-value mt-1 text-[1.35rem] font-semibold leading-none lg:text-lg">
                                    {periodAvailableActivities.length}
                                  </p>
                                </div>
                                <div className="semester-stat min-w-0 rounded-xl border border-border/60 bg-muted/20 px-2 py-3 text-center lg:p-4">
                                  <p className="text-[11px] uppercase leading-snug tracking-[0.14em] text-muted-foreground lg:text-[11px] lg:normal-case lg:tracking-normal">
                                    <span className="lg:hidden">Joined</span>
                                    <span className="hidden lg:inline">Joined events</span>
                                  </p>
                                  <p className="semester-stat-value mt-1 text-[1.35rem] font-semibold leading-none lg:text-lg">
                                    {periodJoinedEvents.length}
                                  </p>
                                </div>
                                <div className="semester-stat min-w-0 rounded-xl border border-border/60 bg-muted/20 px-2 py-3 text-center lg:p-4">
                                  <p className="text-[11px] uppercase leading-snug tracking-[0.14em] text-muted-foreground lg:text-[11px] lg:normal-case lg:tracking-normal">
                                    <span className="lg:hidden">Score</span>
                                    <span className="hidden lg:inline">Current score</span>
                                  </p>
                                  <p className="semester-stat-value mt-1 text-[1.35rem] font-semibold leading-none lg:text-lg">
                                    {existing ? `${existing.pointsEarned}%` : "Pending"}
                                  </p>
                                </div>
                              </div>

                              <div className="semester-submission-action flex flex-col gap-3 border-t border-border/60 pt-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between lg:gap-3 lg:rounded-xl lg:border lg:border-dashed lg:border-border/70 lg:bg-muted/20 lg:p-4 lg:pt-4 lg:border-t lg:pt-4">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-foreground">Semester Submission</p>
                                  <p className="text-[11px] leading-snug text-muted-foreground sm:text-xs">
                                    {existing ? (
                                      <>
                                        <span className="lg:hidden">Manage activities, proof uploads, and score tracking.</span>
                                        <span className="hidden lg:inline">
                                          Open this submission to manage available activities, joined activities, proof uploads, and score tracking.
                                        </span>
                                      </>
                                    ) : (
                                      "Register this semester to open the full YPOP submission workspace for this period."
                                    )}
                                  </p>
                                </div>
                                {existing ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    className="min-h-[42px] w-full sm:w-auto"
                                    onClick={() => {
                                      setActiveYpopEntryId(existing.id);
                                      setYpopPreviewFileId(null);
                                      setYpopOrgView("entry-detail");
                                    }}
                                  >
                                    View Submission
                                    <ChevronRight className="ml-1 h-3.5 w-3.5" />
                                  </Button>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="min-h-[42px] w-full sm:w-auto"
                                    onClick={() => void handleStartYpopSubmission(period)}
                                  >
                                    Register
                                    <ChevronRight className="ml-1.5 h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                )}
              </div>

              {/* Section B: Recent Activity */}
              {historyEntries.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-foreground">Recent Activity</p>
                  <div className="space-y-2">
                    {historyEntries.map((entry) => renderHistoryRow(entry))}
                  </div>
                </div>
              )}
            </div>
          </PortalSection>
        );
      }
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
                  {previewTitle || "Template Preview"}
                </DialogTitle>
                <DialogDescription className="text-sm">
                  Preview the uploaded template file here.
                </DialogDescription>
              </DialogHeader>
            </div>
            <div className="flex-1 overflow-hidden p-4 sm:p-6">
              <div className="h-[calc(100dvh-11rem)] overflow-hidden rounded-md border border-border/70 bg-muted/20 sm:h-[70vh]">
                {previewUrl && previewCanInline ? (
                  <iframe
                    src={previewUrl}
                    title={previewTitle || "Template preview"}
                    className="h-full w-full"
                  />
                ) : previewUrl ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
                    <div className="space-y-2">
                      <p className="text-base font-medium text-foreground">Preview not available in the browser</p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        This template file type cannot be shown inside the portal preview. Open or download the file to view it in Excel, Word, or another compatible app.
                      </p>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button type="button" variant="outline" onClick={() => window.open(previewUrl, "_blank", "noopener,noreferrer")}>
                        <Eye className="mr-2 h-4 w-4" />
                        Open File
                      </Button>
                      <Button type="button" onClick={() => void openFile(previewUrl, previewTitle || "template-file")}>
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
      <Dialog
        open={false}
        onOpenChange={(open) => {
          setOcrPreviewOpen(open);
          if (!open) {
            setConfirmSubmitOpen(false);
            setOcrPreviewUrl("");
          }
        }}
      >
        <DialogContent className="max-w-[96vw] sm:max-w-6xl p-0 overflow-hidden">
          <div className="max-h-[92vh] overflow-y-auto">
            <div className="border-b border-border/70 px-4 pb-4 pt-5 sm:px-6 sm:pb-5">
              <DialogHeader>
                <DialogTitle>OCR Preview</DialogTitle>
                <DialogDescription>
                  Review the uploaded PDF, the fields we detected automatically, and any issues before you submit it to LYDO.
                </DialogDescription>
              </DialogHeader>
            </div>

            {pendingDocumentScan?.result ? (
              <div className="space-y-5 px-4 py-5 sm:px-6">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="bg-muted/20">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Document Type</p>
                      <p className="mt-2 text-sm font-medium">{pendingDocumentScan.result.documentType}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Slot-matched at {pendingDocumentScan.result.documentTypeConfidence}% from {pendingDocumentScan.file.name}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Confidence</p>
                      <p className="mt-2 text-2xl font-semibold">{pendingDocumentScan.result.confidence}%</p>
                      <p className="mt-1 text-xs text-muted-foreground">Low page confidence creates a warning, not an automatic rejection.</p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Required Fields</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {editableOcrSummary.completedRequiredFieldsCount}/{editableOcrSummary.requiredFieldsCount}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {editableOcrSummary.missingRequiredFieldsCount
                          ? `${editableOcrSummary.missingRequiredFieldsCount} still need review.`
                          : "All required fields are currently filled."}
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="bg-muted/20">
                    <CardContent className="p-4">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Extracted Values</p>
                      <p className="mt-2 text-2xl font-semibold">
                        {editableOcrSummary.extractedFieldsCount}
                        {editableOcrSummary.tableRowCount ? ` + ${editableOcrSummary.tableRowCount} rows` : ""}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {editableOcrFields.length || editableOcrTables.length
                          ? "Expected schema fields are ready for review below."
                          : "No structured values were detected yet."}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
                  <Card className="border-border/70">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Document Preview</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {pendingDocumentScan.result.pages.map((page) => (
                          <Button
                            key={page.pageNumber}
                            type="button"
                            size="sm"
                            variant={activeOcrPage === page.pageNumber ? "default" : "outline"}
                            onClick={() => setActiveOcrPage(page.pageNumber)}
                          >
                            Page {page.pageNumber}
                          </Button>
                        ))}
                      </div>
                      <div className="overflow-hidden rounded-2xl border border-border/70 bg-background shadow-sm">
                        {activeOcrPageResult ? (
                          <div className="relative h-[28rem] overflow-auto sm:h-[36rem] lg:h-[42rem]">
                            <img
                              src={activeOcrPageResult.previewDataUrl}
                              alt={`Page ${activeOcrPageResult.pageNumber}`}
                              className="block w-full"
                            />
                            {editableOcrFields
                              .filter((field) => field.pageNumber === activeOcrPageResult.pageNumber && field.boundingBox)
                              .map((field) => {
                                const box = field.boundingBox!;
                                const isSelected = field.id === selectedOcrFieldId;
                                return (
                                  <button
                                    key={field.id}
                                    type="button"
                                    onClick={() => setSelectedOcrFieldId(field.id)}
                                    className={`absolute border-2 ${isSelected ? "border-primary bg-primary/15" : "border-amber-400/80 bg-amber-300/10"}`}
                                    style={{
                                      left: `${(box.x / activeOcrPageResult.width) * 100}%`,
                                      top: `${(box.y / activeOcrPageResult.height) * 100}%`,
                                      width: `${(box.width / activeOcrPageResult.width) * 100}%`,
                                      height: `${(box.height / activeOcrPageResult.height) * 100}%`,
                                    }}
                                    aria-label={`Highlight ${field.label}`}
                                  />
                                );
                              })}
                          </div>
                        ) : ocrPreviewUrl && canInlinePreviewFile(pendingDocumentScan.file.name) ? (
                          <iframe
                            src={ocrPreviewUrl}
                            title={pendingDocumentScan.documentTypeName}
                            className="h-[28rem] w-full sm:h-[36rem] lg:h-[42rem]"
                          />
                        ) : (
                          <div className="grid h-[28rem] place-items-center p-6 text-center text-sm text-muted-foreground sm:h-[36rem] lg:h-[42rem]">
                            <div className="space-y-3">
                              <p className="font-medium text-foreground">Browser preview is not available for this file type.</p>
                              <p>
                                {pendingDocumentScan.file.name} can still be reviewed through the extracted form sections below.
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      {activeOcrPageResult ? (
                        <div className="grid gap-3 rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground sm:grid-cols-2">
                          <p>Page confidence: <span className="font-medium text-foreground">{activeOcrPageResult.confidence}%</span></p>
                          <p>Tables detected: <span className="font-medium text-foreground">{activeOcrPageResult.tableCount}</span></p>
                          <p>Checkboxes detected: <span className="font-medium text-foreground">{activeOcrPageResult.checkboxCount}</span></p>
                          <p>Signatures detected: <span className="font-medium text-foreground">{activeOcrPageResult.signatureCount}</span></p>
                        </div>
                      ) : null}
                      {selectedEditableOcrField ? (
                        <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm">
                          <p className="font-medium text-foreground">{selectedEditableOcrField.label}</p>
                          <p className="mt-2 text-muted-foreground">Page {selectedEditableOcrField.pageNumber}</p>
                          <p className="mt-1 break-words text-muted-foreground">
                            OCR snippet: {selectedEditableOcrField.sourceSnippet || selectedEditableOcrField.source}
                          </p>
                          <p className="mt-1 text-muted-foreground">
                            Bounding box: {selectedEditableOcrField.boundingBox
                              ? `${Math.round(selectedEditableOcrField.boundingBox.x)}, ${Math.round(selectedEditableOcrField.boundingBox.y)}, ${Math.round(selectedEditableOcrField.boundingBox.width)}, ${Math.round(selectedEditableOcrField.boundingBox.height)}`
                              : "No coordinates available"}
                          </p>
                        </div>
                      ) : null}

                      <p className="text-[11px] leading-snug text-muted-foreground">

                        Click a field below to highlight its original OCR location in the document preview.
                      </p>
                    </CardContent>
                  </Card>

                  <div className="space-y-4">
                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Editable Extracted Fields</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {groupedEditableOcrFields.length ? (
                          <div className="space-y-4">
                            {groupedEditableOcrFields.map((group) => (
                              <div key={group.section} className="space-y-3 rounded-2xl border border-border/70 bg-muted/20 p-4">
                                <div className="flex items-center justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">{group.section}</p>
              
                      <p className="text-[11px] leading-snug text-muted-foreground">

                                      {group.fields.length} field(s)
                                      {group.tables.length ? ` • ${group.tables.length} table(s)` : ""}
                                    </p>
                                  </div>
                                  <Button type="button" size="sm" variant="outline" onClick={() => addEditableOcrField(group.section)}>
                                    Add Field
                                  </Button>
                                </div>
                                {group.fields.length ? (
                                  <div className="space-y-3">
                                    {group.fields.map((field) => (
                                      <button
                                        key={field.id}
                                        type="button"
                                        className={`w-full rounded-2xl border p-4 text-left transition-colors ${
                                          selectedOcrFieldId === field.id ? "border-primary bg-primary/5" : "border-border/70 bg-background hover:bg-muted/30"
                                        }`}
                                        onClick={() => {
                                          setSelectedOcrFieldId(field.id);
                                          setActiveOcrPage(field.pageNumber);
                                        }}
                                      >
                                        <div className="grid gap-3">
                                          <div className="flex flex-wrap items-start justify-between gap-3">
                                            <Input
                                              id={`ocr-field-label-${field.id}`}
                                              name={`ocr_field_label_${field.id}`}
                                              value={field.label}
                                              disabled={!field.isCustom}
                                              onClick={(event) => event.stopPropagation()}
                                              onChange={(event) => updateEditableOcrField(field.id, { label: event.target.value })}
                                              onBlur={(event) =>
                                                field.isCustom
                                                  ? recordOcrAudit({
                                                      action: "edited",
                                                      fieldId: field.id,
                                                      fieldLabel: field.label,
                                                      previousValue: field.label,
                                                      nextValue: event.target.value,
                                                      note: "Field label updated.",
                                                    })
                                                  : undefined
                                              }
                                              className="flex-1"
                                            />
                                            <div className="flex flex-wrap items-center gap-2">
                                              <span
                                                className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ${
                                                  field.confidenceBand === "green"
                                                    ? "bg-emerald-100 text-emerald-700"
                                                    : field.confidenceBand === "yellow"
                                                      ? "bg-amber-100 text-amber-700"
                                                      : "bg-rose-100 text-rose-700"
                                                }`}
                                              >
                                                {field.confidence}%
                                              </span>
                                              <span className="rounded-full border border-border/70 bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground">
                                                {titleCaseStatus(field.status)}
                                              </span>
                                            </div>
                                          </div>
                                          {field.fieldType === "boolean" ? (
                                            <label
                                              className="flex items-center gap-3 rounded-xl border border-border/70 bg-muted/20 px-3 py-3"
                                              onClick={(event) => event.stopPropagation()}
                                            >
                                              <input
                                                id={`ocr-field-value-${field.id}`}
                                                name={`ocr_field_value_${field.id}`}
                                                type="checkbox"
                                                checked={field.normalizedValue === "true"}
                                                onChange={(event) => updateEditableOcrField(field.id, { value: event.target.checked ? "true" : "" })}
                                              />
                                              <span className="text-sm text-foreground">{field.label}</span>
                                            </label>
                                          ) : field.fieldType === "multiselect" && field.expectedValues?.length ? (
                                            <div className="space-y-2" onClick={(event) => event.stopPropagation()}>
                                              <div className="flex flex-wrap gap-2">
                                                {field.expectedValues.map((option) => {
                                                  const currentValues = field.normalizedValue
                                                    .split(",")
                                                    .map((item) => item.trim())
                                                    .filter(Boolean);
                                                  const checked = currentValues.some((item) => item.toLowerCase() === option.toLowerCase());
                                                  return (
                                                    <label key={option} className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background px-3 py-2 text-xs text-foreground">
                                                      <input
                                                        type="checkbox"
                                                        checked={checked}
                                                        onChange={(event) => {
                                                          const nextValues = event.target.checked
                                                            ? [...currentValues, option]
                                                            : currentValues.filter((item) => item.toLowerCase() !== option.toLowerCase());
                                                          updateEditableOcrField(field.id, { value: nextValues.join(", ") });
                                                        }}
                                                      />
                                                      {option}
                                                    </label>
                                                  );
                                                })}
                                              </div>
                                              <Input
                                                id={`ocr-field-value-${field.id}`}
                                                name={`ocr_field_value_${field.id}`}
                                                value={field.value}
                                                onChange={(event) => updateEditableOcrField(field.id, { value: event.target.value })}
                                              />
                                            </div>
                                          ) : field.fieldType === "textarea" ? (
                                            <Textarea
                                              id={`ocr-field-value-${field.id}`}
                                              name={`ocr_field_value_${field.id}`}
                                              value={field.value}
                                              onClick={(event) => event.stopPropagation()}
                                              onChange={(event) => updateEditableOcrField(field.id, { value: event.target.value })}
                                              className="min-h-24"
                                            />
                                          ) : (
                                            <Input
                                              id={`ocr-field-value-${field.id}`}
                                              name={`ocr_field_value_${field.id}`}
                                              value={field.value}
                                              onClick={(event) => event.stopPropagation()}
                                              onChange={(event) => updateEditableOcrField(field.id, { value: event.target.value })}
                                            />
                                          )}
                                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                                            <span>Page {field.pageNumber}</span>
                                            <span className="break-words">Normalized: {normalizeOcrFieldValue(field) || "N/A"}</span>
                                            {field.isCustom ? (
                                              <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                className="text-destructive hover:text-destructive"
                                                onClick={(event) => {
                                                  event.stopPropagation();
                                                  requestDeleteConfirmation({
                                                    title: "Delete OCR Field",
                                                    description: `Are you sure you want to delete "${field.label}"? This action cannot be undone.`,
                                                    action: () => deleteEditableOcrField(field),
                                                  });
                                                }}
                                              >
                                                Delete
                                              </Button>
                                            ) : null}
                                          </div>
                                          {field.helpText ? (
                                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                                              {field.helpText}
                                            </div>
                                          ) : null}
                                          {field.validationErrors.length ? (
                                            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
                                              {field.validationErrors.join(" ")}
                                            </div>
                                          ) : null}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                                {group.tables.length ? (
                                  <div className="space-y-4">
                                    {group.tables.map((table) => (
                                      <div key={table.id} className="rounded-2xl border border-border/70 bg-background p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                          <div>
                                            <p className="text-sm font-semibold text-foreground">{table.label}</p>
                      
                      <p className="text-[11px] leading-snug text-muted-foreground">

                                              {table.rows.length} row(s) detected
                                              {table.minimumRows ? ` • minimum ${table.minimumRows}` : ""}
                                            </p>
                                          </div>
                                          <Button type="button" size="sm" variant="outline" onClick={() => addEditableOcrTableRow(table.id)}>
                                            Add Row
                                          </Button>
                                        </div>
                                        {table.rows.length ? (
                                          <div className="mt-4 space-y-3 overflow-x-auto">
                                            {table.rows.map((row) => (
                                              <div key={row.id} className="min-w-[52rem] rounded-xl border border-border/70 p-3">
                                                <div className="mb-3 flex items-center justify-between gap-3">
                                                  <p className="text-sm font-medium text-foreground">Row {row.rowNumber}</p>
                                                  <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() =>
                                                      requestDeleteConfirmation({
                                                        title: "Delete Table Row",
                                                        description: `Are you sure you want to delete Row ${row.rowNumber}? This action cannot be undone.`,
                                                        action: () => deleteEditableOcrTableRow(table.id, row.id),
                                                      })
                                                    }
                                                  >
                                                    Delete Row
                                                  </Button>
                                                </div>
                                                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                                                  {table.columns.map((column) => {
                                                    const cell = row.cells[column.key];
                                                    return (
                                                      <div key={column.key} className="space-y-2">
                                                        <Label htmlFor={`ocr-table-${table.id}-${row.id}-${column.key}`}>{column.label}</Label>
                                                        <Input
                                                          id={`ocr-table-${table.id}-${row.id}-${column.key}`}
                                                          name={`ocr_table_${table.id}_${row.id}_${column.key}`}
                                                          value={cell?.value ?? ""}
                                                          onChange={(event) => updateEditableOcrTableCell(table.id, row.id, column.key, event.target.value)}
                                                        />
                                                        {cell?.validationErrors.length ? (
                                                          <p className="text-xs text-rose-700">{cell.validationErrors.join(" ")}</p>
                                                        ) : null}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        ) : (
                                          <div className="mt-4 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                                            No rows were detected yet. Add rows manually if needed.
                                          </div>
                                        )}
                                        {table.validationWarnings.length ? (
                                          <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-800">
                                            {table.validationWarnings.join(" ")}
                                          </div>
                                        ) : null}
                                        {table.duplicateWarnings.length ? (
                                          <div className="mt-3 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-800">
                                            {table.duplicateWarnings.join(" ")}
                                          </div>
                                        ) : null}
                                      </div>
                                    ))}
                                  </div>
                                ) : null}
                                {!group.fields.length && !group.tables.length ? (
                                  <div className="rounded-xl border border-dashed border-border/70 bg-background p-4 text-sm text-muted-foreground">
                                    No extracted values in this section yet. Add a field manually if needed.
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                            No structured values were detected automatically yet. You can still review the raw text and add missing fields manually.
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Flags and Review Notes</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {pendingDocumentScan.result.issues.length ? (
                          <div className="space-y-2">
                            {pendingDocumentScan.result.issues.map((issue, index) => (
                              <div
                                key={`${issue.title}-${index}`}
                                className={`rounded-xl border p-3 text-sm ${
                                  issue.severity === "error"
                                    ? "border-destructive/30 bg-destructive/5 text-destructive"
                                    : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                                }`}
                              >
                                <p className="font-medium">{issue.title}</p>
                                <p className="mt-1 text-sm opacity-90">{issue.description}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-300">
                            No OCR issues were detected. The file is ready for your confirmation.
                          </div>
                        )}
                        {pendingDocumentScan.result.duplicates.length ? (
                          <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-amber-700 dark:text-amber-300">
                            Duplicate fields were detected and merged automatically. Review the editable sections before submission.
                          </div>
                        ) : null}
                        <div className="rounded-xl border border-border/70 bg-background p-3 text-sm">
                          <p className="font-medium text-foreground">Real-time validation</p>
                          <p className="mt-1 text-muted-foreground">
                            {editableOcrFieldErrorCount
                              ? `${editableOcrFieldErrorCount} validation issue(s) still need correction.`
                              : "All editable fields currently pass validation."}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-background p-3 text-sm">
                          <p className="font-medium text-foreground">Submission readiness</p>
                          <p className="mt-1 text-muted-foreground">
                            {canSubmitEditableOcr
                              ? "All required values are present or corrected. This file is ready for submission."
                              : "Some required values or table rows still need attention before submission."}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                          If anything looks wrong, you can correct the values here, add missing fields manually, or reupload a clearer file.
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Raw OCR Text and Audit Trail</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                          Verified JSON preview:
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed">
                            {JSON.stringify(buildStructuredOcrData(editableOcrFields, editableOcrTables), null, 2)}
                          </pre>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs text-muted-foreground">
                          Audit trail:
                          <div className="mt-2 max-h-40 space-y-2 overflow-auto">
                            {ocrAuditTrail.length ? ocrAuditTrail.map((entry) => (
                              <div key={entry.id} className="rounded-lg border border-border/60 bg-background px-3 py-2">
                                <p className="font-medium text-foreground">{entry.action.toUpperCase()} · {entry.fieldLabel}</p>
                                <p>{entry.note || `${entry.previousValue} -> ${entry.nextValue}`}</p>
                              </div>
                            )) : (
                              <p>No audit entries yet.</p>
                            )}
                          </div>
                        </div>
                        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-xl border border-border/70 bg-muted/20 p-4 text-xs leading-relaxed sm:text-sm">
                          {pendingDocumentScan.result.text || "No readable text was extracted."}
                        </pre>
                      </CardContent>
                    </Card>
                  </div>
                </div>

                <DialogFooter className="flex-col gap-2 sm:flex-row">
                  <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setOcrPreviewOpen(false)}>
                    Review Later
                  </Button>
                  <Button
                    type="button"
                    className="w-full sm:w-auto"
                    disabled={!canSubmitEditableOcr || submittingDocumentId === pendingDocumentScan.documentTypeId}
                    onClick={() => setConfirmSubmitOpen(true)}
                  >
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Submit for Review
                  </Button>
                </DialogFooter>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog
        open={batchUploadOpen}
        onOpenChange={(open) => {
          setBatchUploadOpen(open);
          if (!open) {
            resetBatchUploadState();
          }
        }}
      >
        <DialogContent className="grid w-[calc(100vw-24px)] max-w-[520px] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-2xl p-0 sm:max-w-4xl lg:max-w-3xl max-h-[calc(100dvh-24px)]">
          <DialogHeader className="shrink-0 border-b border-border/70 px-4 py-4 sm:px-5">
            <DialogTitle>Upload Required Documents</DialogTitle>
            <DialogDescription>
              Select files, assign each type, then submit when ready.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto px-4 py-4 overscroll-contain sm:px-5">
            <div className="grid gap-4 pb-6">
            <div
              className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-5 text-center"
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "copy";
              }}
              onDrop={(event) => {
                event.preventDefault();
                handleBatchDroppedFiles(event.dataTransfer.files);
              }}
            >
              <p className="text-sm font-medium text-foreground">Drag and drop PDF files here</p>
              <p className="mt-1 text-sm text-muted-foreground">or browse files and map them to the correct required document.</p>
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
                <span className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium text-foreground">
                  Browse Files
                </span>
              </label>
            </div>

            {batchDroppedFiles.length ? (
              <div className="space-y-3 rounded-2xl border border-border/70 bg-background p-4">
                <div>
                  <p className="text-sm font-semibold text-foreground">Dropped Files</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Confirm which required document each dropped file belongs to.
                  </p>
                </div>
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
                    return (
                      <div key={entry.id} className="grid gap-3 rounded-xl border border-border/60 p-3">
                        <div className="min-w-0">
                          <p className="break-words text-sm font-medium text-foreground" title={entry.file.name}>{entry.file.name}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{Math.max(1, Math.round(entry.file.size / 1024))} KB</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">Document type</p>
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
                            <SelectTrigger className="h-10 w-full">
                              <SelectValue placeholder="Select document type" />
                            </SelectTrigger>
                            <SelectContent className="max-h-[260px]">
                              <SelectItem value="__unassigned__">Select document type</SelectItem>
                              {templateDocuments.map((documentType) => {
                                const existingFile = documentFilesByTypeId.get(documentType.id);
                                const isApproved = isApprovedSubmissionFile(existingFile);
                                const assignedToOther = batchDroppedFiles.some(
                                  (other) =>
                                    other.id !== entry.id &&
                                    other.mappedDocumentTypeId &&
                                    other.mappedDocumentTypeId === documentType.id,
                                );
                                return (
                                  <SelectItem
                                    key={documentType.id}
                                    value={documentType.id}
                                    disabled={isApproved || assignedToOther}
                                  >
                                    {isApproved ? `${documentType.name} — Approved` : documentType.name}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        {duplicateAssignment ? (
                          <p className="text-xs text-destructive">This document type has already been assigned to another file.</p>
                        ) : null}
                        {validationError ? (
                          <p className="text-xs text-destructive">{validationError}</p>
                        ) : null}
                        <div className="flex justify-start">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-9 px-3"
                            onClick={() => setBatchDroppedFiles((current) => current.filter((item) => item.id !== entry.id))}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

          </div>
          </div>
          <DialogFooter className="shrink-0 border-t border-border/70 bg-background px-4 py-3 sm:px-5">
            <div className="flex w-full flex-col gap-3 sm:gap-2">
              <div className="text-sm text-muted-foreground">
                <p>{batchAssignmentCounts.validReadyCount} file{batchAssignmentCounts.validReadyCount === 1 ? "" : "s"} ready</p>
                {(batchAssignmentCounts.unassignedCount > 0 || batchAssignmentCounts.duplicateTypeCount > 0) ? (
                  <p className="mt-1">
                    {batchAssignmentCounts.unassignedCount} file{batchAssignmentCounts.unassignedCount === 1 ? "" : "s"} still need a document type
                    {batchAssignmentCounts.duplicateTypeCount > 0 ? ` · ${batchAssignmentCounts.duplicateTypeCount} duplicate assignment${batchAssignmentCounts.duplicateTypeCount === 1 ? "" : "s"}` : ""}
                  </p>
                ) : null}
              </div>
              <div className="grid w-full gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full"
                disabled={!batchDroppedFiles.length}
                onClick={() => void handleSubmitBatchUpload("draft")}
              >
                Save as Draft
              </Button>
              <Button
                type="button"
                className="h-10 w-full"
                disabled={!batchDroppedFiles.length || getBatchUploadIssues().length > 0}
                onClick={() => void handleSubmitBatchUpload("review")}
              >
                Submit Selected for Review
              </Button>
            </div>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{batchUploadResult?.submitMode === "draft" ? "Draft Saved" : "Batch Upload Result"}</DialogTitle>
            <DialogDescription>
              {batchUploadResult
                ? `${batchUploadResult.successCount} document${batchUploadResult.successCount === 1 ? "" : "s"} processed successfully.`
                : "Review the result of your batch upload."}
            </DialogDescription>
          </DialogHeader>
          {batchUploadResult ? (
            <div className="space-y-3">
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                {batchUploadResult.failureCount > 0
                  ? `${batchUploadResult.failureCount} document${batchUploadResult.failureCount === 1 ? "" : "s"} still need attention.`
                  : "All selected documents were processed successfully."}
              </div>
              <div className="space-y-2">
                {batchUploadResult.results.map((entry) => (
                  <div key={`${entry.documentTypeName}-${entry.fileName}`} className="rounded-xl border border-border/60 px-3 py-3 text-sm">
                    <p className="font-medium text-foreground">{entry.documentTypeName}</p>
                    <p className="mt-1 text-muted-foreground">{entry.fileName}</p>
                    <p className={cn("mt-1 text-xs", entry.success ? "text-emerald-700" : "text-destructive")}>
                      {entry.success ? "Processed successfully" : entry.error || "Unable to process this file."}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setBatchUploadResult(null)}>
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
      <Dialog
        open={attachedDocumentEditorOpen && !documentDetailMode}
        onOpenChange={(open) => {
          if (!open && !savingAttachedDocument) {
            closeAttachedDocumentEditor();
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-w-4xl max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-lg sm:text-xl">{attachedDocumentPreviewTitle || "Attached File"}</DialogTitle>
            <DialogDescription className="text-sm">
              {isApprovedSubmissionFile(attachedDocumentEditor?.file)
                ? "This approved file is now locked. You can review or open it, but you can no longer change or remove it."
                : "Review the uploaded file here. Use Upload Multiple Documents from the main page for any future eligible replacements."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] lg:items-start">
            <div className="min-w-0 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
              <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Attached file preview</p>
                  <p className="break-all text-sm font-medium text-foreground sm:truncate">
                    {attachedDocumentEditor?.file.fileName || "Uploaded file"}
                  </p>
                </div>
                {attachedDocumentEditor ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                    onClick={() => void openFile(attachedDocumentEditor.file.fileUrl, attachedDocumentEditor.file.fileName)}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Open File
                  </Button>
                ) : null}
              </div>
              <div className="h-[min(52vh,28rem)] overflow-auto rounded-lg border border-border/70 bg-background sm:h-[min(60vh,34rem)]">
                {attachedDocumentPreviewUrl && attachedDocumentPreviewCanInline ? (
                  isImagePreviewFile(attachedDocumentPreviewTitle) || isImagePreviewFile(attachedDocumentEditor?.file.fileUrl ?? "") ? (
                    <div className="flex min-h-full items-center justify-center p-2 sm:p-4">
                      <img
                        src={attachedDocumentPreviewUrl}
                        alt={attachedDocumentPreviewTitle || "Attached file preview"}
                        className="max-h-[calc(52vh-1.5rem)] w-full rounded-md object-contain sm:max-h-[calc(34rem-2rem)]"
                      />
                    </div>
                  ) : (
                    <iframe
                      src={attachedDocumentPreviewUrl}
                      title={attachedDocumentPreviewTitle || "Attached file preview"}
                      className="h-[min(52vh,28rem)] w-full border-0 sm:h-[min(60vh,34rem)]"
                    />
                  )
                ) : attachedDocumentPreviewUrl ? (
                  <div className="flex h-full flex-col items-center justify-center gap-4 p-4 text-center sm:p-6">
                    <div className="space-y-2">
                      <p className="text-base font-medium text-foreground">Preview not available in the browser</p>
                      <p className="max-w-md text-sm text-muted-foreground">
                        This file type cannot be displayed inline. You can still open the file in a new tab from this modal.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center sm:p-6">
                    <p className="text-sm font-medium text-foreground">No preview available</p>
                    <p className="max-w-md text-sm text-muted-foreground">
                      {attachedDocumentPreviewEmptyMessage || "The uploaded file could not be previewed."}
                    </p>
                  </div>
                )}
              </div>
            </div>
            <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
              {/* File info */}
              <div>
                <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Current file</p>
                <p className="mt-1 break-all text-sm font-medium text-foreground">
                  {attachedDocumentEditor?.file.fileName || "Uploaded file"}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {attachedDocumentEditor?.file.uploadedAt
                    ? `Uploaded ${formatDateTimeLabel(attachedDocumentEditor.file.uploadedAt)}`
                    : "Uploaded recently"}
                </p>
              </div>
              <div className="h-px bg-border/40" />
              {attachedDocumentEditor?.file &&
              (attachedDocumentEditor.file.adminStatus === "needs_revision" || attachedDocumentEditor.file.adminStatus === "rejected_red") &&
              !isDocumentSubmissionApproved &&
              !isApprovedSubmissionFile(attachedDocumentEditor.file) ? (
                <>
                  <input
                    ref={attachedDocumentInputRef}
                    type="file"
                    accept={
                      attachedDocumentEditor
                        ? getDocumentUploadAcceptValue(attachedDocumentEditor.file.documentTypeId)
                        : ".pdf,application/pdf"
                    }
                    className="hidden"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setAttachedDocumentReplacementFile(nextFile);
                      setAttachedDocumentMarkedForRemoval(false);
                    }}
                  />
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => attachedDocumentInputRef.current?.click()}
                      disabled={Boolean(savingAttachedDocument)}
                    >
                      <FileUp className="mr-2 h-4 w-4" />
                      Change File
                    </Button>
                    {attachedDocumentReplacementFile ? (
                      <p className="text-xs text-muted-foreground">
                        Replacement: <span className="font-medium text-foreground">{attachedDocumentReplacementFile.name}</span>
                      </p>
                    ) : null}
                    <Button
                      type="button"
                      variant={attachedDocumentMarkedForRemoval ? "secondary" : "destructive"}
                      className="w-full justify-start"
                      onClick={() => {
                        setAttachedDocumentMarkedForRemoval((current) => !current);
                        setAttachedDocumentReplacementFile(null);
                        if (attachedDocumentInputRef.current) {
                          attachedDocumentInputRef.current.value = "";
                        }
                      }}
                      disabled={Boolean(savingAttachedDocument)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {attachedDocumentMarkedForRemoval ? "Undo Remove" : "Remove Document"}
                    </Button>
                    {attachedDocumentMarkedForRemoval ? (
                      <p className="text-xs text-destructive">This file will be removed when you save.</p>
                    ) : null}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      className="flex-1"
                      onClick={() => void saveAttachedDocumentChanges()}
                      disabled={Boolean(savingAttachedDocument)}
                    >
                      {savingAttachedDocument ? "Saving..." : "Save Changes"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={closeAttachedDocumentEditor}
                      disabled={Boolean(savingAttachedDocument)}
                    >
                      Cancel
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm text-muted-foreground">
                    Return to the main Document Submissions page and use Upload Multiple Documents for normal submissions.
                  </div>
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={closeAttachedDocumentEditor}
                    >
                      Close
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
            <DialogTitle>Complete the Organization Profile First</DialogTitle>
            <DialogDescription>
              Finish filling up the organization profile first before uploading documents or submitting them for review.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            Required fields like the organization details, classifications, advocacies, adviser, representative, and address must be completed and saved first.
          </div>
          <DialogFooter>
            <Button type="button" className="w-full sm:w-auto" onClick={() => setProfileRequiredModalOpen(false)}>
              Okay
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={profilePreviewOpen} onOpenChange={setProfilePreviewOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Public Profile Preview</DialogTitle>
            <DialogDescription>
              This preview reflects the profile details currently saved on the portal.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/70 bg-muted/20 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold text-foreground">{profile.organizationName || "Organization Profile"}</p>
                    <PortalStatusBadge status={currentProfile?.profileStatus ?? "incomplete"} />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {profile.majorClassification || "Classification pending"}
                    {profile.subClassification ? ` · ${formatSubClassificationLabel(profile.subClassification)}` : ""}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {profileLocation || "District and barangay not set"}
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background px-4 py-3 text-center">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Profile Complete</p>
                  <p className="mt-1 text-2xl font-semibold text-primary">{profilePercent}%</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Representative</p>
                <p className="mt-1 text-sm font-medium">{profile.representativeName || "N/A"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Adviser</p>
                <p className="mt-1 text-sm font-medium">{profile.adviserName || "N/A"}</p>
              </div>
              <div className="rounded-2xl border border-border/70 bg-background p-4 sm:col-span-2">
                <p className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Facebook Page</p>
                <p className="mt-1 break-all text-sm font-medium">
                  {profile.facebookPageUrl ? (
                    <a href={profile.facebookPageUrl} target="_blank" rel="noreferrer" className="text-primary underline-offset-4 hover:underline">
                      {profile.facebookPageUrl}
                    </a>
                  ) : (
                    "N/A"
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Recent City-Led Activities</p>
              {profileRecentYpopEvents.length ? (
                <div className="space-y-2">
                  {profileRecentYpopEvents.slice(0, 3).map((participation) => (
                    <div key={participation.id} className="rounded-2xl border border-border/70 bg-background p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium">{participation.activityName}</p>
    
                      <p className="text-[11px] leading-snug text-muted-foreground">
{formatDateTimeLabel(participation.joinedAt)}</p>
                        </div>
                        <PortalStatusBadge status={participation.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <PortalEmptyState
                  title="No joined activities yet"
                  description="The preview will show joined city-led activities once the organization participates in one."
                />
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={profileActivityModalOpen} onOpenChange={setProfileActivityModalOpen}>
        <DialogContent className="max-h-[90vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Full Activity Log</DialogTitle>
            <DialogDescription>
              All profile-related actions are listed here with date and time for transparency.
            </DialogDescription>
          </DialogHeader>
          <RecentActivityList
            activities={profileActivityLogEntries.map((log) => ({
              id: log.id,
              message: log.description,
              timestamp: log.createdAt,
              timestampLabel: formatDateTimeLabel(log.createdAt),
            }))}
            emptyDescription="Profile changes and admin review actions will appear here."
          />
        </DialogContent>
      </Dialog>
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



