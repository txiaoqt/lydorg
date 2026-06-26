import { useEffect, useMemo, useRef, useState, type ChangeEvent, type RefObject } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { PortalEmptyState, PortalIconBadge, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { UserPortalShell } from "@/components/portal/UserPortalShell";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useLydoConnect } from "@/lib/lydo-connect-store";
import { cn } from "@/lib/utils";
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
  statusToneMap,
  formatSubClassificationLabel,
  subClassificationOptions,
  type OrganizationProfile,
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
  removeOrganizationDocumentFromSupabase,
  submitOrganizationDocumentToSupabase,
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
const organizationEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const philippineContactNumberPattern = /^09\d{9}$/;
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
const isApprovedSubmissionFile = (file?: Pick<SubmissionFile, "adminStatus"> | null) =>
  file?.adminStatus === "approved" || file?.adminStatus === "approved_green";
const isApprovedDocumentSubmission = (submission?: { status?: string } | null) =>
  submission?.status === "approved" || submission?.status === "approved_green";
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
const budgetNativeSelectClass =
  "h-10 w-full appearance-none rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50";
const parseYpopActivityDate = (value: string) => {
  const directDate = new Date(value);
  if (!Number.isNaN(directDate.getTime())) return directDate;
  const normalized = value
    .replace(/[â€“â€”]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  const firstChunk = normalized.split("-")[0]?.trim() ?? normalized;
  const fallbackDate = new Date(firstChunk);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
};
const isPastYpopActivityDate = (value: string) => {
  const parsed = parseYpopActivityDate(value);
  if (!parsed) return false;
  const normalized = new Date(parsed);
  normalized.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return normalized < today;
};
const approvedBudgetStatuses = new Set<BudgetRequest["status"]>([
  "approved_for_ftf_green",
  "budget_released",
  "completed",
]);
const liquidationUnlockedBudgetStatuses = new Set<BudgetRequest["status"]>(["budget_released", "completed"]);
const ADMIN_RECIPIENT_ID = "admin-demo";
const createNotificationId = () => `notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createOcrEntityId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const getOrganizationProfileCompletionCount = (profile?: OrganizationProfile | null) =>
  [
    profile?.organizationName?.trim(),
    profile?.organizationEmail?.trim(),
    profile?.contactNumber?.trim(),
    profile?.district?.trim(),
    profile?.barangay?.trim(),
    profile?.isExistingOrganization ? profile?.organizationIdentifierNumber?.trim() : "",
    profile?.majorClassification?.trim(),
    profile?.subClassification?.trim(),
    profile?.advocacies?.length ? "advocacies" : "",
    profile?.adviserName?.trim(),
    profile?.representativeName?.trim(),
    profile?.address?.trim(),
  ].filter(Boolean).length;
const getOrganizationProfileCompletionTarget = (profile?: OrganizationProfile | null) => 11 + (profile?.isExistingOrganization ? 1 : 0);
const isOrganizationProfileComplete = (profile?: OrganizationProfile | null) =>
  getOrganizationProfileCompletionCount(profile) === getOrganizationProfileCompletionTarget(profile);

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
  const [ypopNotesByEntryId, setYpopNotesByEntryId] = useState<Record<string, string>>({});
  const [submittingYpopId, setSubmittingYpopId] = useState<string | null>(null);
  const [ypopUploadingId, setYpopUploadingId] = useState<string | null>(null);
  const [submittingYpopEventParticipationId, setSubmittingYpopEventParticipationId] = useState<string | null>(null);
  const [ypopEventUploadingId, setYpopEventUploadingId] = useState<string | null>(null);
  const [ypopHistoryOpenById, setYpopHistoryOpenById] = useState<Record<string, boolean>>({});
  const [ypopSemesterEventFilterById, setYpopSemesterEventFilterById] = useState<Record<string, "ongoing" | "past">>({});
  const [ypopOrgActivityModalOpen, setYpopOrgActivityModalOpen] = useState(false);
  const [ypopScoringHelpOpen, setYpopScoringHelpOpen] = useState(false);
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
  const [savingProfile, setSavingProfile] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [profilePreviewOpen, setProfilePreviewOpen] = useState(false);
  const [showProfileEditSection, setShowProfileEditSection] = useState(false);
  const [profileActivityModalOpen, setProfileActivityModalOpen] = useState(false);
  const [activeProfileTab, setActiveProfileTab] = useState<
    "overview" | "organization-details" | "classification" | "advocacy" | "contacts-socials" | "ypop-participation"
  >("overview");
  const [ocrPreviewOpen, setOcrPreviewOpen] = useState(false);
  const [budgetReviewNote, setBudgetReviewNote] = useState<{ title: string; note: string; status: BudgetRequestStatus } | null>(null);
  const [budgetRecentActivityModal, setBudgetRecentActivityModal] = useState<{
    title: string;
    entries: Array<{ action: string; adminRemarks: string; changedAt: string }>;
  } | null>(null);
  const [liquidationRecentActivityModal, setLiquidationRecentActivityModal] = useState<{
    title: string;
    entries: Array<{ action: string; adminRemarks: string; changedAt: string }>;
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
  const [budgetFiltersExpanded, setBudgetFiltersExpanded] = useState(false);
  const [budgetHasFileOnly, setBudgetHasFileOnly] = useState(false);
  const [budgetYpopOnly, setBudgetYpopOnly] = useState(false);
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
  const currentProfile = state.organizationProfiles.find((item) => item.userId === user?.id) ?? null;
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
      if (ypopEntryId) {
        const blank = createBlankBudgetRequest(currentProfile?.id ?? "", user?.id ?? "");
        setBudgetForm({ ...blank, budgetRequestType: "ypop_incentive", ypopEntryId });
        setBudgetFileDraft(null);
        setShowBudgetForm(true);
      } else {
        setShowBudgetForm(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, searchParams]);

  useEffect(() => {
    setBudgetPage(1);
  }, [budgetSearch, budgetStatusFilter, budgetDateRangeFilter, budgetSortOrder, budgetRowsPerPage, budgetHasFileOnly, budgetYpopOnly]);

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
  const isBudgetRequestLocked = section === "budget-request" && currentProfile?.profileStatus !== "verified";
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
  const profileLocation = [profile.district?.trim(), profile.barangay?.trim()].filter(Boolean).join(" · ");
  const documentsPercent = getReadiness(completedDocs, templateDocuments.length);
  const budgetPercent = latestBudget ? getReadiness(approvedBudgetStatuses.has(latestBudget.status) ? 1 : 0, 1) : 0;
  const liquidationPercent = latestLiquidation ? getReadiness(latestLiquidation.status === "completed_liquidated" ? 1 : 0, 1) : 0;
  const profileActivityLogEntries = useMemo(
    () =>
      state.activityLogs
        .filter((log) => log.organizationId === currentProfile?.id && log.relatedType === "organization_profile")
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [currentProfile?.id, state.activityLogs],
  );
  const profileRecentActivity = profileActivityLogEntries.slice(0, 5);
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

    const isMembersList = localDocumentType.id === "yorp-members";
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isSpreadsheet = /\.(xlsx|xls)$/i.test(file.name);
    if (!isPdf && !(isMembersList && isSpreadsheet)) {
      toast({
        title: "Unsupported file type",
        description: isMembersList
          ? "Please upload a PDF or XLSX file for the members list document slot."
          : "Please upload a PDF file for document submission.",
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
        adminRemarks: "Awaiting admin review.",
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
      toast({
        title: "Complete the profile",
        description:
          "Please fill in the required organization details, district, barangay, classifications, and at least one advocacy. Existing organizations also need an identifier number.",
        variant: "destructive",
      });
      return;
    }

    if (!organizationEmailPattern.test(trimmedProfile.organizationEmail)) {
      toast({
        title: "Invalid organization email",
        description: "Please enter a valid email address for the organization.",
        variant: "destructive",
      });
      return;
    }

    if (!philippineContactNumberPattern.test(trimmedProfile.contactNumber)) {
      toast({
        title: "Invalid contact number",
        description: "Please enter an 11-digit Philippine mobile number starting with 09.",
        variant: "destructive",
      });
      return;
    }

    setSavingProfile(true);
    try {
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
        const latestAnnouncements = state.newsReleases
          .filter((n) => n.visibilityStatus === "published")
          .sort((a, b) => b.datePosted.localeCompare(a.datePosted))
          .slice(0, 2);
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

        if (!hasSubmittedDocuments) {
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
            tone: "bg-violet-500/10 text-violet-600",
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
          <div className="space-y-6">
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

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PortalMetricCard
                label="Profile"
                value={`${profilePercent}%`}
                helper={formatStatusLabel(profile.profileStatus)}
                icon={User}
                iconTone="primary"
                onClick={() => navigate(userRouteMap["organization-profile"])}
              />
              <PortalMetricCard
                label="Documents"
                value={`${documentsPercent}%`}
                helper={`${completedDocs}/${templateDocuments.length} checked`}
                icon={FileText}
                iconTone="sky"
                onClick={() => navigate(userRouteMap["document-submission"])}
              />
              <PortalMetricCard
                label="Budget"
                value={`${budgetPercent}%`}
                helper={formatStatusLabel(latestBudget?.status ?? "draft")}
                icon={ClipboardList}
                iconTone="amber"
                onClick={() => navigate(userRouteMap["budget-request"])}
              />
              <PortalMetricCard
                label="Liquidation"
                value={`${liquidationPercent}%`}
                helper={formatStatusLabel(latestLiquidation?.status ?? "pending_activity_completion")}
                icon={CalendarDays}
                iconTone="red"
                onClick={() => navigate(userRouteMap["liquidation-reporting"])}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
              <Card className="border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recommended Next Steps</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Focus on the items below instead of checking the same status twice.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {dashboardTasks.slice(0, 3).map((task) => {
                    const TaskIcon = task.icon;
                    return (
                      <div
                        key={task.key}
                        className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-background/80 p-4 sm:flex-row sm:items-start sm:justify-between"
                      >
                        <div className="flex min-w-0 items-start gap-3">
                            <PortalIconBadge
                              icon={TaskIcon}
                              tone={
                                task.tone.includes("amber")
                                  ? "amber"
                                  : task.tone.includes("orange")
                                    ? "orange"
                                    : task.tone.includes("emerald")
                                      ? "emerald"
                                      : task.tone.includes("violet")
                                        ? "violet"
                                        : task.tone.includes("sky")
                                          ? "sky"
                                          : "primary"
                              }
                              className="mt-0.5 h-10 w-10 rounded-xl"
                              iconClassName="h-4.5 w-4.5"
                            />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{task.title}</p>
                            <p className="mt-1 text-sm leading-6 text-muted-foreground">{task.description}</p>
                          </div>
                        </div>
                        {task.ctaLabel && task.onClick ? (
                          <Button type="button" variant="outline" size="sm" className="sm:shrink-0" onClick={task.onClick}>
                            {task.ctaLabel}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}

                  {pendingDocumentIssues.length ? (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                      <p className="text-sm font-semibold text-amber-900">Document files needing revision</p>
                      <div className="mt-3 space-y-2">
                        {pendingDocumentIssues.slice(0, 3).map((file) => (
                          <button
                            key={file.id}
                            type="button"
                            className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-200/80 bg-white/80 px-3 py-2.5 text-left transition-colors hover:bg-white"
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
                </CardContent>
              </Card>

              <Card className="border-border/70 bg-card/95 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recent Activity</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Your latest profile and admin-review updates appear here.
                  </p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {profileRecentActivity.length ? (
                    profileRecentActivity.slice(0, 5).map((log) => (
                      <div key={log.id} className="flex gap-3 rounded-2xl border border-border/60 bg-background/70 p-3.5">
                        <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary/80" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium leading-6 text-foreground">{log.description}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeLabel(log.createdAt)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <PortalEmptyState
                      title="No recent activity yet"
                      description="Your profile changes and admin review updates will appear here."
                    />
                  )}
                </CardContent>
              </Card>
            </div>

            <PortalSection
              title="Inquiries"
              description="Send a quick inquiry here and keep track of your earlier submissions."
            >
              <div className="grid gap-4 xl:grid-cols-[1fr_0.9fr]">
                <div className="space-y-4 rounded-3xl border border-border/70 bg-background p-4 sm:p-5">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldGroup label="Name / Organization Name" required>
                      <Input
                        value={inquiryForm.submitterName}
                        onChange={(event) =>
                          setInquiryForm((current) => ({ ...current, submitterName: event.target.value, organizationName: event.target.value }))
                        }
                        placeholder="Enter your name or organization name"
                      />
                    </FieldGroup>
                    <FieldGroup label="Email" required>
                      <Input
                        type="email"
                        value={inquiryForm.email}
                        onChange={(event) => setInquiryForm((current) => ({ ...current, email: event.target.value }))}
                        placeholder="name@example.com"
                      />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Subject" required>
                    <Input
                      value={inquiryForm.subject}
                      onChange={(event) => setInquiryForm((current) => ({ ...current, subject: event.target.value }))}
                      placeholder="What is your inquiry about?"
                    />
                  </FieldGroup>
                  <FieldGroup label="Description" required>
                    <Textarea
                      value={inquiryForm.description}
                      onChange={(event) => setInquiryForm((current) => ({ ...current, description: event.target.value }))}
                      placeholder="Write the full details of your inquiry here."
                      className="min-h-32"
                    />
                  </FieldGroup>
                  <div className="flex justify-end">
                    <Button type="button" onClick={handleConfirmInquirySubmit} disabled={savingInquiry}>
                      {savingInquiry ? "Sending..." : "Send Inquiry"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-3">
                  {inquiryHistory.length ? (
                    inquiryHistory.slice(0, 5).map((inquiry) => (
                      <div key={inquiry.id} className="rounded-2xl border border-border/70 bg-background p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{inquiry.subject}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTimeLabel(inquiry.createdAt)}</p>
                          </div>
                          <PortalStatusBadge status={inquiry.status} />
                        </div>
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-muted-foreground">{inquiry.description}</p>
                        {inquiry.adminRemarks ? (
                          <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-primary">Admin Note</p>
                            <p className="mt-1 text-sm leading-6 text-foreground">{inquiry.adminRemarks}</p>
                          </div>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <PortalEmptyState
                      title="No inquiry history yet"
                      description="Your submitted inquiries will appear here after you send them."
                    />
                  )}
                </div>
              </div>
            </PortalSection>

            <PortalSection
              title="Latest Announcements"
              description="Recent updates from LYDO."
              action={
                <Button variant="ghost" size="sm" onClick={() => navigate(userRouteMap["news-releases"])}>
                  View all
                </Button>
              }
            >
              {latestAnnouncements.length === 0 ? (
                <PortalEmptyState title="No announcements yet" description="Check back soon for updates from LYDO." />
              ) : (
                <div className="space-y-2">
                  {latestAnnouncements.map((news) => (
                    <a
                      key={news.id}
                      href={news.facebookPostUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex gap-3 rounded-xl border border-border/70 bg-background p-4 transition-all hover:-translate-y-0.5 hover:bg-muted/30 hover:shadow-sm"
                    >
                      <div className="flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <p className="text-[9px] font-semibold uppercase leading-none">
                          {new Date(news.datePosted).toLocaleDateString("en-PH", { month: "short" })}
                        </p>
                        <p className="text-lg font-bold leading-none">
                          {new Date(news.datePosted).getDate()}
                        </p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-foreground">{news.title}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </PortalSection>
          </div>
        );
      }
      case "templates":
        return (
          <PortalSection
            title="Templates"
            description="Download the shared template files that the admin has published for your organization."
          >
            {otherTemplates.length === 0 ? (
              <PortalEmptyState
                title="No templates available"
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
                            <PortalIconBadge icon={FileText} tone="red" />
                            <div className="min-w-0">
                              <p className="break-words text-base font-semibold text-foreground">{template.name}</p>
                              <p className="mt-1 text-sm text-muted-foreground">{template.description}</p>
                            </div>
                          </div>
                          <PortalStatusBadge status={template.templateFileUrl ? "approved_green" : "draft"} />
                        </div>
                      </div>
                      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm">
                        <p className="font-medium text-foreground">
                          {template.templateFileName || "No file uploaded yet"}
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          {template.templateUploadedAt
                            ? `Updated ${formatDateTimeLabel(template.templateUploadedAt)}`
                            : "This template will become downloadable once the admin uploads a file."}
                        </p>
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
            label: "Organization Identifier Number",
            value: profile.isExistingOrganization ? profile.organizationIdentifierNumber || "Not set" : "Not required",
          },
        ];
        const shouldShowOverviewSidebar = activeProfileTab === "overview";
        return (
          <PortalSection
            title="Organization Profile"
            description="View and manage your organization's profile and compliance information."
            action={<PortalStatusBadge status={profileStatus} />}
          >
            <div className="space-y-5">
              <Card ref={profileSummaryRef} className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="p-5 sm:p-6">
                  <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto_minmax(14rem,16rem)] lg:items-center">
                    <div className="flex min-w-0 items-center gap-4">
                      <PortalIconBadge icon={Building2} tone="primary" size="lg" />
                      <div className="min-w-0 space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-3xl font-semibold tracking-tight text-foreground">{profileName}</h2>
                          <PortalStatusBadge status={profileStatus} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {profileRole || "Complete your classification details to unlock the full profile."}
                        </p>
                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
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

                    <div className="flex shrink-0 items-center justify-center">
                      <div className="flex flex-col items-center gap-2 text-center">
                        <div
                          className="flex h-24 w-24 items-center justify-center rounded-full"
                          style={{
                            background: `conic-gradient(hsl(var(--primary)) ${(profilePercent / 100) * 360}deg, hsl(var(--muted)) 0deg)`,
                          }}
                        >
                          <div className="flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full bg-background text-xl font-semibold text-foreground shadow-sm">
                            {profileCompletionRing}
                          </div>
                        </div>
                        <p className="text-sm font-semibold text-primary">Profile Complete</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 lg:items-stretch">
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
                      <p className="text-sm text-muted-foreground">
                        Last updated: {currentProfile?.updatedAt ? formatDateTimeLabel(currentProfile.updatedAt) : "Not yet saved"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="border-b border-border/70">
                <div className="flex gap-1 overflow-x-auto">
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
                            "inline-flex items-center whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium transition-colors",
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
                        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                          <PenSquare className="h-3.5 w-3.5 text-primary" />
                          Edit Profile
                        </CardTitle>
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowProfileEditSection(false)}>
                          Hide Editor
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-0">
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
                        <FieldGroup label="Organization Identifier Number">
                          <input
                            value={profileDraft.isExistingOrganization ? profileDraft.organizationIdentifierNumber : "Not required"}
                            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-primary"
                            placeholder="Organization identifier number"
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

                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          Save changes to update the shared profile record seen by the admin dashboard.
                        </p>
                        <Button type="button" onClick={() => void saveOrganizationProfile()} disabled={savingProfile}>
                          {savingProfile ? "Saving..." : "Save Profile"}
                        </Button>
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
                            <div key={row.label} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                              <p className="text-sm text-muted-foreground">{row.label}</p>
                              <p className="text-sm font-medium text-foreground sm:text-right">{row.value}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {(activeProfileTab === "overview" || activeProfileTab === "contacts-socials") && (
                    <Card className="border-border/70 bg-card/95 shadow-sm">
                      <CardHeader className="pb-4">
                        <CardTitle className="flex items-center gap-2 text-base">
                          <UserRound className="h-4 w-4 text-primary" />
                          Representative & Adviser
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <p className="text-sm text-muted-foreground">Representative</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{profile.representativeName || "Not set"}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Adviser</p>
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
                            <p className="text-sm text-muted-foreground">Address</p>
                            <p className="text-sm font-medium text-foreground sm:max-w-[70%] sm:text-right">{profile.address || "Not set"}</p>
                          </div>
                          <div className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                            <p className="text-sm text-muted-foreground">Facebook Page</p>
                            <div className="sm:max-w-[70%] sm:text-right">
                            {profile.facebookPageUrl ? (
                              <a
                                href={profile.facebookPageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="break-all text-sm font-medium text-primary underline-offset-4 hover:underline"
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
                          <div className="flex flex-wrap gap-2">
                            {profile.advocacies.map((advocacy) => (
                              <span
                                key={advocacy}
                                className="inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-primary"
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
                              <div key={participation.id} className="flex flex-wrap items-start justify-between gap-3 py-3">
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
                </div>

                {shouldShowOverviewSidebar ? (
                  <div className="space-y-4">
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
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                        {profileRecentActivity.length ? (
                          <div className="space-y-3">
                            {profileRecentActivity.slice(0, 5).map((log) => (
                              <div key={log.id} className="flex gap-3">
                                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-primary/80" />
                                <div className="min-w-0">
                                  <p className="text-sm font-medium leading-6 text-foreground">{log.description}</p>
                                  <p className="text-sm text-muted-foreground">{formatDateTimeLabel(log.createdAt)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <PortalEmptyState
                            title="No activity yet"
                            description="Profile changes and admin review actions will show up here with full date and time."
                          />
                        )}
                        <button
                          type="button"
                          onClick={() => setProfileActivityModalOpen(true)}
                          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                        >
                          View full activity log
                        </button>
                      </CardContent>
                    </Card>
                  </div>
                ) : null}
              </div>

              <Card className="border-border/70 bg-card/95 shadow-sm">
                <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <p>To make changes, click Edit Profile. Some changes may require verification before they take effect.</p>
                </CardContent>
              </Card>
            </div>
          </PortalSection>
        );
      }
      case "document-submission": {
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
          ? detailFile.adminStatus && detailFile.adminStatus !== "draft"
            ? detailFile.adminStatus
            : detailFile.validationStatus === "correct"
              ? "ready_for_review"
              : "needs_revision"
          : null;
        type FileTimelineEntry = { date: string; message: string };
        const detailFileTimeline: FileTimelineEntry[] = detailFile
          ? [
              ...(detailFile.uploadedAt
                ? [{ date: detailFile.uploadedAt, message: "Document uploaded for review." }]
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
                    if (s === "submitted" || s === "ready_for_review")
                      return [{ date: detailFile.reviewedAt, message: "Document received and queued for review." }];
                    return [];
                  })()
                : []),
            ].sort((a, b) => a.date.localeCompare(b.date))
          : [];

        // Document detail sub-view
        if (documentDetailMode && attachedDocumentEditor && detailDocumentType && detailFile) {
          return (
            <div className="space-y-4">
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
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{detailDocumentType.name}</h2>
                  {detailFileBadgeStatus && <PortalStatusBadge status={detailFileBadgeStatus} />}
                </div>
                <p className="mt-0.5 text-sm text-muted-foreground">{detailDocumentType.description}</p>
              </div>

              {/* Two-column layout */}
              <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.7fr)] lg:items-start">
                {/* Left: file preview */}
                <div className="min-w-0 rounded-xl border border-border/70 bg-muted/20 p-3 sm:p-4">
                  <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Attached file preview</p>
                      <p className="break-all text-sm font-medium text-foreground sm:truncate">
                        {attachedDocumentPreviewTitle || detailFile.fileName}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full sm:w-auto"
                      onClick={() => void openFile(detailFile.fileUrl, detailFile.fileName)}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Open File
                    </Button>
                  </div>
                  <div className="h-[min(52vh,28rem)] overflow-auto rounded-lg border border-border/70 bg-background sm:h-[min(60vh,34rem)]">
                    {attachedDocumentPreviewUrl && attachedDocumentPreviewCanInline ? (
                      isImagePreviewFile(attachedDocumentPreviewTitle) || isImagePreviewFile(detailFile.fileUrl) ? (
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

                {/* Right: actions sidebar */}
                <div className="space-y-4 rounded-xl border border-border/70 bg-card p-4 sm:p-5">
                  {/* File info */}
                  <div>
                    <p className="text-xs uppercase tracking-[0.12em] text-muted-foreground">Current file</p>
                    <p className="mt-1 break-all text-sm font-medium text-foreground">{detailFile.fileName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {detailFile.uploadedAt
                        ? `Uploaded ${formatDateTimeLabel(detailFile.uploadedAt)}`
                        : "Uploaded recently"}
                    </p>
                  </div>

                  <div className="h-px bg-border/40" />

                  {/* Admin feedback + resubmission note */}
                  {detailHasAdminFeedback && (
                    <>
                      <div className="space-y-3">
                        <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                          <div className="mb-1 flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                            <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Feedback</p>
                          </div>
                          <p className="text-sm text-amber-800">
                            {detailFile.adminRemarks?.trim() || "No comment was provided."}
                          </p>
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-xs font-medium text-foreground/70">
                            Message with resubmission{" "}
                            <span className="font-normal text-muted-foreground">(optional)</span>
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
                      </div>
                      <div className="h-px bg-border/40" />
                    </>
                  )}

                  {/* File actions */}
                  <div className="space-y-2">
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
                    {attachedDocumentReplacementFile && (

                      <p className="text-[11px] leading-snug text-muted-foreground">

                        Replacement: <span className="font-medium text-foreground">{attachedDocumentReplacementFile.name}</span>
                      </p>
                    )}
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
                    {attachedDocumentMarkedForRemoval && (
                      <p className="text-xs text-destructive">This file will be removed when you save.</p>
                    )}
                  </div>

                  {/* Per-file review log */}
                  <div className="h-px bg-border/40" />
                  <div>
                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</p>
                    {detailFileTimeline.length === 0 ? (

                      <p className="text-[11px] leading-snug text-muted-foreground">
No activity yet.</p>
                    ) : (
                      <div>
                        {detailFileTimeline.map((entry, i) => (
                          <div key={i} className="flex gap-2.5">
                            <div className="flex flex-col items-center pt-0.5">
                              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                              {i < detailFileTimeline.length - 1 && (
                                <span className="mt-0.5 w-px flex-1 bg-border/50" style={{ minHeight: "1rem" }} />
                              )}
                            </div>
                            <div className="min-w-0 pb-3">
                              <p className="text-xs leading-snug text-foreground">{entry.message}</p>
                              <p className="mt-0.5 text-[10px] text-muted-foreground">{formatDateTimeLabel(entry.date)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Save / Cancel */}
                  <div className="h-px bg-border/40" />
                  <div className="flex gap-2">
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
                </div>
              </div>
            </div>
          );
        }

        const documentStatuses = templateDocuments.map((documentType) => {
          const file = docFiles.find((entry) => entry.documentTypeId === documentType.id);
          const template = templatesById[documentType.id];
          const badgeStatus =
            file?.adminStatus && file.adminStatus !== "draft"
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
        const overallDocumentStatusLabel = submission ? formatStatusLabel(submission.status) : "Incomplete";
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
          <div className="space-y-6">
            <PortalSection
              title="Document Submissions"
              description="Upload each required file and submit for admin review. You will be notified when documents are approved or require changes."
              action={
                submission ? (
                  <PortalStatusBadge status={submission.status} />
                ) : (
                  <span className="inline-flex rounded-full border border-border/70 bg-muted/20 px-3 py-1 text-xs font-medium text-muted-foreground">
                    {overallDocumentStatusLabel}
                  </span>
                )
              }
            >
              <div className="space-y-5">
                <Card className="border-border/70 bg-card/95 shadow-sm">
                  <CardContent className="p-3.5 sm:p-4">
                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.95fr)] lg:items-center">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                        <div className="flex items-center justify-center">
                          <div
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={100}
                            aria-valuenow={documentCompletionPercent}
                            className="flex h-20 w-20 items-center justify-center rounded-full"
                            style={{
                              background: `conic-gradient(hsl(var(--primary)) ${(documentCompletionPercent / 100) * 360}deg, hsl(var(--muted)) 0deg)`,
                            }}
                          >
                            <div className="flex h-[3.7rem] w-[3.7rem] items-center justify-center rounded-full bg-background text-xl font-semibold text-foreground shadow-sm">
                              {documentCompletionPercent}%
                            </div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-lg font-semibold text-foreground">
                            {approvedDocumentCount} of {totalDocumentCount} documents approved
                          </p>
                          <div className="mt-2.5">
                            <Progress value={documentCompletionPercent} className="h-2" />
                          </div>
                          <p className="mt-2 text-xs sm:text-sm text-muted-foreground">{summarySupportMessage}</p>
                        </div>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-3">
                        <div className="grid min-h-[6.5rem] grid-cols-[1.5rem_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-start gap-x-3 rounded-xl border border-border/60 px-3 py-2.5">
                          <CheckCircle2 className="row-[1/4] h-6 w-6 self-center text-emerald-600" />
                          <p className="col-start-2 min-h-6 text-xl font-semibold leading-none text-foreground">{approvedDocumentCount}</p>
                          <p className="col-start-2 min-h-10 text-sm leading-5 text-muted-foreground">Approved</p>
                          <p className="col-start-2 text-[11px] leading-[1.2] text-muted-foreground">
                              {totalDocumentCount > 0 ? `${Math.round((approvedDocumentCount / totalDocumentCount) * 100)}% of total` : "0% of total"}
                            </p>
                        </div>
                        <div className="grid min-h-[6.5rem] grid-cols-[1.5rem_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-start gap-x-3 rounded-xl border border-border/60 px-3 py-2.5">
                          <Eye className="row-[1/4] h-6 w-6 self-center text-primary" />
                          <p className="col-start-2 min-h-6 text-xl font-semibold leading-none text-foreground">{reviewDocumentCount}</p>
                          <p className="col-start-2 min-h-10 text-sm leading-5 text-muted-foreground">Under Review</p>
                          <p className="col-start-2 text-[11px] leading-[1.2] text-muted-foreground">
                              {totalDocumentCount > 0 ? `${Math.round((reviewDocumentCount / totalDocumentCount) * 100)}% of total` : "0% of total"}
                            </p>
                        </div>
                        <div className="grid min-h-[6.5rem] grid-cols-[1.5rem_minmax(0,1fr)] grid-rows-[auto_auto_auto] items-start gap-x-3 rounded-xl border border-border/60 px-3 py-2.5">
                          <AlertTriangle className="row-[1/4] h-6 w-6 self-center text-destructive" />
                          <p className="col-start-2 min-h-6 text-xl font-semibold leading-none text-foreground">{rejectedDocumentCount}</p>
                          <p className="col-start-2 min-h-10 text-sm leading-5 text-muted-foreground">Rejected / Revision</p>
                          <p className="col-start-2 text-[11px] leading-[1.2] text-muted-foreground">
                              {totalDocumentCount > 0 ? `${Math.round((rejectedDocumentCount / totalDocumentCount) * 100)}% of total` : "0% of total"}
                            </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

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

                          return (
                            <div
                              key={documentType.id}
                              className="grid gap-4 px-4 py-4 transition-colors hover:bg-muted/10 sm:px-5 sm:py-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.55fr)_auto]"
                            >
                              <div className="flex min-w-0 gap-3">
                                <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-primary/5 text-primary">
                                  <FileText className="h-5 w-5 text-red-500" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold leading-snug text-foreground">{documentType.name}</p>
                                    {statusNode}
                                  </div>
                                  <p className="mt-1 text-sm text-muted-foreground">{documentType.description}</p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>Format: {getDocumentPrimaryFileTypeLabel(documentType.id)}</span>
                                    {file?.uploadedAt ? <span>Uploaded {formatDateTimeLabel(file.uploadedAt)}</span> : null}
                                  </div>
                                  {isApproved ? (
                                    <p className="mt-2 text-xs text-emerald-700">
                                      Approved files are locked and can no longer be modified or removed.
                                    </p>
                                  ) : null}
                                </div>
                              </div>

                              <div className="min-w-0">
                                {isRejected && file?.adminRemarks?.trim() ? (
                                  <div className="space-y-1">
                                    {reviewDateLabel ? <p className="text-sm font-medium text-foreground">{reviewDateLabel}</p> : null}
                                    <p className="text-sm text-destructive">Admin: {file.adminRemarks.trim()}</p>
                                  </div>
                                ) : isUnderReview ? (
                                  <div className="space-y-1">
                                    {reviewDateLabel ? <p className="text-sm font-medium text-foreground">{reviewDateLabel}</p> : null}
                                    <p className="text-sm text-muted-foreground">
                                      {file?.adminRemarks?.trim() || "This document is currently under admin review."}
                                    </p>
                                  </div>
                                ) : isApproved ? (
                                  <div className="space-y-1">
                                    {reviewDateLabel ? <p className="text-sm font-medium text-foreground">{reviewDateLabel}</p> : null}
                                    <p className="text-sm text-emerald-700">This document has been approved.</p>
                                  </div>
                                ) : file ? (
                                  <div className="space-y-1">
                                    {reviewDateLabel ? <p className="text-sm font-medium text-foreground">{reviewDateLabel}</p> : null}
                                    <p className="text-sm text-muted-foreground">Attached file is available for viewing.</p>
                                  </div>
                                ) : (
                                  <p className="text-sm text-muted-foreground">Upload the required document file to begin review.</p>
                                )}
                              </div>

                              <div className="flex flex-col gap-2 xl:min-w-[18rem] xl:items-end">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full xl:w-auto"
                                  onClick={() =>
                                    void openPreview(template?.templateFileUrl ?? "", template?.templateFileName || documentType.name)
                                  }
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Template
                                </Button>

                                <label
                                  className="w-full xl:w-auto"
                                  onClick={(event) => {
                                    if (file) return;
                                    if (isDocumentSubmissionApproved) {
                                      event.preventDefault();
                                      toast({
                                        title: "Submission locked",
                                        description: "Approved submitted documents can no longer be changed or replaced.",
                                        variant: "destructive",
                                      });
                                      return;
                                    }
                                    if (ensureCompletedOrganizationProfile()) return;
                                    event.preventDefault();
                                  }}
                                >
                                  <input
                                    type="file"
                                    accept={getDocumentUploadAcceptValue(documentType.id)}
                                    className="sr-only"
                                    disabled={isDocumentSubmissionApproved}
                                    onChange={(event) => {
                                      void handleDocumentUpload(documentType.name, event.target.files?.[0] ?? null);
                                      event.currentTarget.value = "";
                                    }}
                                  />
                                  <Button
                                    type="button"
                                    variant={file ? "default" : "secondary"}
                                    size="sm"
                                    asChild
                                    disabled={
                                      scanningDocumentId === documentType.id ||
                                      submittingDocumentId === documentType.id ||
                                      (!file && isDocumentSubmissionApproved) ||
                                      (Boolean(file) && isApproved)
                                    }
                                    className="w-full cursor-pointer xl:w-auto"
                                    onClick={(event) => {
                                      if (file) {
                                        event.preventDefault();
                                        event.stopPropagation();
                                        setDocumentDetailMode(true);
                                        window.scrollTo({ top: 0, behavior: "smooth" });
                                        void openAttachedDocumentEditor(file, documentType.name);
                                      }
                                    }}
                                  >
                                    <span>
                                      {file ? (
                                        <>
                                          <Eye className="mr-2 h-4 w-4" />
                                          View Attached
                                        </>
                                      ) : (
                                        <>
                                          <FileUp className="mr-2 h-4 w-4" />
                                          {scanningDocumentId === documentType.id ? "Preparing..." : "Upload Document"}
                                        </>
                                      )}
                                    </span>
                                  </Button>
                                </label>
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
              {submissionLogs.length === 0 ? (
                <PortalEmptyState
                  title="No activity yet"
                  description="Review activity will appear here once your submission has been processed."
                />
              ) : (
                <Card className="border-border/70 bg-card/95 shadow-sm">
                  <CardContent className="p-4 sm:p-5">
                    <div>
                  {submissionLogs.slice(0, 5).map((log, i) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary/70" />
                        {i < Math.min(submissionLogs.length, 5) - 1 && (
                          <span className="mt-1 w-px flex-1 bg-border/50" style={{ minHeight: "1.5rem" }} />
                        )}
                      </div>
                      <div className="min-w-0 pb-5">
                        <p className="text-sm leading-snug text-foreground">{log.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{formatDateTimeLabel(log.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                  </CardContent>
                </Card>
              )}
            </PortalSection>
          </div>
        );
      }
      case "budget-request":
        if (isBudgetRequestLocked) {
          return (
            <div className="space-y-6">
              <PortalSection
                title="Budget Requests"
                description="This section becomes available after your organization registration is approved."
              >
                <Card className="border-border/70">
                  <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Waiting for Admin Approval</h3>
  
                      <p className="text-xs leading-snug text-muted-foreground">

                          Your budget request page is locked until the admin verifies your organization registration.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
            <div className="space-y-6">
              <PortalSection
                title="Budget Requests"
                description="Create, edit, and submit allocation requests for your organization's activities."
                action={!showBudgetForm ? (
                  <Button type="button" size="sm" onClick={() => { resetBudgetForm(); setShowBudgetForm(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    New Budget Request
                  </Button>
                ) : undefined}
              >
                {showBudgetForm ? (
                  <div className="space-y-4">
                    {/* Back button */}
                    <button
                      type="button"
                      onClick={() => { setShowBudgetForm(false); resetBudgetForm(); }}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Back to Budget Requests
                    </button>
                    <div>
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
                      <CardContent className="space-y-4 p-5 sm:p-6">
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
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="space-y-2 md:col-span-2">
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
                          <div className="space-y-2 md:col-span-2">
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
                            />
                          </div>
                          <div className="space-y-2">
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
                          <div className="space-y-2">
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
                          <div className="space-y-2">
                            <Label htmlFor="budget-amount">
                              Requested Amount <span className="ml-1 text-destructive">*</span>
                            </Label>
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
                            />
                          </div>
                          <div className="space-y-2">
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
                          <div className="space-y-2 md:col-span-2">
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
                            />
                          </div>
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="budget-file">
                              Detailed Document <span className="ml-1 text-destructive">*</span>
                            </Label>
                            <Input
                              id="budget-file"
                              type="file"
                              accept=".pdf,application/pdf"
                              onChange={handleBudgetFileDraftChange}
                            />
      
                      <p className="text-[11px] leading-snug text-muted-foreground">

                              PDF only. Upload the budget document with full breakdown and supporting details.
                            </p>
                            {budgetFileDraft ? (
                              <p className="text-xs text-foreground">Selected: {budgetFileDraft.name}</p>
                            ) : null}
                            {!budgetFileDraft && budgetRequestFilesByBudgetId.get(budgetForm.id) ? (
                              <p className="text-xs text-foreground">
                                Current file: {budgetRequestFilesByBudgetId.get(budgetForm.id)?.fileName}
                              </p>
                            ) : null}
                          </div>
                          {budgetRequests.find((r) => r.id === budgetForm.id)?.status === "needs_revision" && (
                            <div className="space-y-2 md:col-span-2">
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
                        <div className="flex flex-wrap gap-2 border-t border-border/40 pt-4">
                          <Button
                            type="button"
                            disabled={savingBudgetRequest}
                            onClick={() => void saveBudgetRequest("draft")}
                          >
                            {savingBudgetRequest ? "Saving..." : "Save Draft"}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            disabled={savingBudgetRequest}
                            onClick={() => void saveBudgetRequest("submitted")}
                          >
                            Submit for Review
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            disabled={savingBudgetRequest}
                            onClick={() => { setShowBudgetForm(false); resetBudgetForm(); }}
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
                        .filter((request) => (budgetHasFileOnly ? Boolean(budgetRequestFilesByBudgetId.get(request.id)) : true))
                        .filter((request) => (budgetYpopOnly ? request.budgetRequestType === "ypop_incentive" : true))
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
                      const totalBudgetPages = Math.max(1, Math.ceil(totalFilteredRequests / budgetRowsPerPage));
                      const safeBudgetPage = Math.min(budgetPage, totalBudgetPages);
                      const startIndex = totalFilteredRequests === 0 ? 0 : (safeBudgetPage - 1) * budgetRowsPerPage;
                      const endIndexExclusive = startIndex + budgetRowsPerPage;
                      const paginatedRequests = filteredRequests.slice(startIndex, endIndexExclusive);
                      const showingFrom = totalFilteredRequests === 0 ? 0 : startIndex + 1;
                      const showingTo = totalFilteredRequests === 0 ? 0 : Math.min(endIndexExclusive, totalFilteredRequests);
                      const rowPaddingClass = "py-3";
                      const uniqueStatuses = Array.from(new Set(budgetRequests.map((request) => request.status)));

                      return (
                        <div className="space-y-4">
                          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                            {[
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
                            ].map((item) => {
                              const Icon = item.icon;
                              return (
                                <Card key={item.label} className="border-border/70 shadow-sm">
                                  <CardContent className="flex items-center gap-3 p-4">
                                    <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", item.iconTone)}>
                                      <Icon className="h-5 w-5" />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                      <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{item.value}</p>
                                      <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>

                          <Card className="overflow-hidden border-border/70 shadow-sm">
                            <CardContent className="space-y-4 p-4 sm:p-5">
                              <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                                <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1 xl:flex-wrap">
                                  <div className="relative min-w-[220px] flex-1 xl:max-w-xs">
                                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                      value={budgetSearch}
                                      onChange={(event) => setBudgetSearch(event.target.value)}
                                      placeholder="Search requests by title, venue, ID..."
                                      className="pl-9"
                                    />
                                  </div>
                                  <div className="relative min-w-[160px]">
                                    <select
                                      value={budgetStatusFilter}
                                      onChange={(event) => setBudgetStatusFilter(event.target.value as "all" | BudgetRequest["status"])}
                                      className={budgetNativeSelectClass}
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
                                  <div className="relative min-w-[150px]">
                                    <select
                                      value={budgetDateRangeFilter}
                                      onChange={(event) => setBudgetDateRangeFilter(event.target.value as "all" | "30d" | "90d" | "year")}
                                      className={budgetNativeSelectClass}
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
                                    onClick={() => setBudgetFiltersExpanded((current) => !current)}
                                  >
                                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                                    More filters
                                  </Button>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="relative min-w-[150px]">
                                    <select
                                      value={budgetSortOrder}
                                      onChange={(event) => setBudgetSortOrder(event.target.value as "newest" | "oldest" | "requested_desc" | "requested_asc")}
                                      className={budgetNativeSelectClass}
                                    >
                                      <option value="newest">Sort by: Newest</option>
                                      <option value="oldest">Sort by: Oldest</option>
                                      <option value="requested_desc">Highest amount</option>
                                      <option value="requested_asc">Lowest amount</option>
                                    </select>
                                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                  </div>
                                </div>
                              </div>

                              {budgetFiltersExpanded ? (
                                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-3">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={budgetHasFileOnly ? "default" : "outline"}
                                    onClick={() => setBudgetHasFileOnly((current) => !current)}
                                  >
                                    <Filter className="mr-2 h-3.5 w-3.5" />
                                    Has file only
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={budgetYpopOnly ? "default" : "outline"}
                                    onClick={() => setBudgetYpopOnly((current) => !current)}
                                  >
                                    <Trophy className="mr-2 h-3.5 w-3.5 text-amber-600" />
                                    YPOP linked only
                                  </Button>
                                </div>
                              ) : null}

                              {totalFilteredRequests ? (
                                <>
                                  <div className="space-y-3 md:hidden">
                                    {paginatedRequests.map((request) => {
                                      const attachedFile = budgetRequestFilesByBudgetId.get(request.id);
                                      const latestActivity = request.revisionHistory?.length
                                        ? request.revisionHistory[request.revisionHistory.length - 1]
                                        : null;
                                      const additionalActivities = Math.max((request.revisionHistory?.length ?? 0) - 1, 0);
                                      const secondaryStatus = budgetStatusSecondaryMap[request.status] ?? formatStatusLabel(request.status);
                                      return (
                                        <Card key={request.id} className="border-border/70 shadow-sm">
                                          <CardContent className="space-y-3 p-4">
                                            <div className="flex items-start justify-between gap-3">
                                              <div className="min-w-0 space-y-1">
                                                <div className="flex flex-wrap items-center gap-2">
                                                  <p className="font-semibold text-foreground">{request.activityTitle || "Untitled request"}</p>
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
                                              <PortalStatusBadge status={request.status} />
                                            </div>

                                            <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:grid-cols-2">
                                              <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Proposed Date</p>
                                                <p className="mt-1 text-sm font-medium text-foreground">
                                                  {request.activityDate
                                                    ? new Date(request.activityDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                                    : "Not set"}
                                                </p>
                                              </div>
                                              <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Venue</p>
                                                <p className="mt-1 text-sm font-medium text-foreground">{request.venue || "Not set"}</p>
                                              </div>
                                              <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Requested</p>
                                                <p className="mt-1 text-sm font-medium text-foreground">{formatCurrency(request.requestedAmount || 0)}</p>
                                              </div>
                                              <div>
                                                <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Approved</p>
                                                <p className="mt-1 text-sm font-semibold text-emerald-600">
                                                  {request.approvedAmount ? formatCurrency(request.approvedAmount) : "—"}
                                                </p>
                                              </div>
                                            </div>

                                            <div className="space-y-2">
                                              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">File</p>
                                              {attachedFile ? (
                                                <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background p-3">
                                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                                                    <FileText className="h-4 w-4 text-red-500" />
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{attachedFile.fileName}</p>
                                                    <p className="text-xs text-muted-foreground">
                                                      PDF • {attachedFile.fileSize ? `${Math.max(1, Math.round(attachedFile.fileSize / 1024))} KB` : "file attached"}
                                                    </p>
                                                  </div>
                                                </div>
                                              ) : (
                                                <p className="text-sm text-muted-foreground">No file attached</p>
                                              )}
                                            </div>

                                            <div className="space-y-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                                              <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Recent Activity</p>
                                              <p className="text-sm text-foreground">
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

                                            <div className="flex items-center justify-end">
                                              {attachedFile ? (
                                                <DropdownMenu modal={false}>
                                                  <DropdownMenuTrigger asChild>
                                                    <Button type="button" size="sm" variant="outline">
                                                      <MoreHorizontal className="mr-2 h-4 w-4" />
                                                      Actions
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
                                              ) : null}
                                            </div>
                                          </CardContent>
                                        </Card>
                                      );
                                    })}
                                  </div>
                                  <div className="hidden overflow-x-auto md:block">
                                    <div className="min-w-[1080px] rounded-2xl border border-border/70">
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="bg-muted/15 hover:bg-muted/15">
                                            <TableHead className="w-[22%]">Request</TableHead>
                                            <TableHead className="w-[14%]">Status</TableHead>
                                            <TableHead className="w-[12%]">Proposed Date</TableHead>
                                            <TableHead className="w-[12%]">Venue</TableHead>
                                            <TableHead className="w-[16%]">Amounts (PHP)</TableHead>
                                            <TableHead className="w-[14%]">File</TableHead>
                                            <TableHead className="w-[10%]">Recent Activity</TableHead>
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
                                              <TableRow key={request.id} className="align-middle">
                                                <TableCell className={`${rowPaddingClass} align-middle`}>
                                                  <div className="min-w-0 space-y-1">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                      <p className="font-semibold text-foreground">{request.activityTitle || "Untitled request"}</p>
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
                                                <TableCell className={`${rowPaddingClass} align-middle`}>
                                                  <PortalStatusBadge status={request.status} />
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
                                                <TableCell className={`${rowPaddingClass} align-middle`}>
                                                  <div className="space-y-2 text-sm">
                                                    <div>
                                                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Requested</p>
                                                      <p className="font-medium text-foreground">{formatCurrency(request.requestedAmount || 0)}</p>
                                                    </div>
                                                    <div>
                                                      <p className="text-[11px] uppercase tracking-wide text-muted-foreground/70">Approved</p>
                                                      <p className="font-semibold text-emerald-600">
                                                        {request.approvedAmount ? formatCurrency(request.approvedAmount) : "—"}
                                                      </p>
                                                    </div>
                                                  </div>
                                                </TableCell>
                                                <TableCell className={`${rowPaddingClass} align-middle`}>
                                                  {attachedFile ? (
                                                    <div className="flex items-start gap-2.5">
                                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600">
                                                        <FileText className="h-4 w-4 text-red-500" />
                                                      </div>
                                                      <div className="min-w-0 flex-1">
                                                        <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{attachedFile.fileName}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                          PDF • {attachedFile.fileSize ? `${Math.max(1, Math.round(attachedFile.fileSize / 1024))} KB` : "file attached"}
                                                        </p>
                                                      </div>
                                                      <DropdownMenu modal={false}>
                                                        <DropdownMenuTrigger asChild>
                                                          <Button type="button" size="icon" variant="ghost" className="h-8 w-8 shrink-0">
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
                                                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70">
                                                        <FileText className="h-4 w-4 text-red-500" />
                                                      </div>
                                                      <span>No file attached</span>
                                                    </div>
                                                  )}
                                                </TableCell>
                                                <TableCell className={rowPaddingClass}>
                                                  <div className="space-y-1">
                                                    <p className="text-sm text-foreground">
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
        const isLiquidationLocked = currentProfile?.profileStatus !== "verified";
        if (isLiquidationLocked) {
          return (
            <div className="space-y-6">
              <PortalSection
                title="Liquidation Reports"
                description="This section becomes available after your organization registration is approved."
              >
                <Card className="border-border/70">
                  <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Waiting for Admin Approval</h3>
  
                      <p className="text-xs leading-snug text-muted-foreground">

                          Your liquidation reports page is locked until the admin verifies your organization registration.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </PortalSection>
            </div>
          );
        }
        return (
          <PortalSection
            title="Liquidation Reports"
            description="Upload post-activity documents for each approved budget. The admin will review and mark your liquidation complete."
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
                  const totalLiquidationPages = Math.max(1, Math.ceil(totalFilteredReports / liquidationRowsPerPage));
                  const safeLiquidationPage = Math.min(liquidationPage, totalLiquidationPages);
                  const startIndex = totalFilteredReports === 0 ? 0 : (safeLiquidationPage - 1) * liquidationRowsPerPage;
                  const endIndexExclusive = startIndex + liquidationRowsPerPage;
                  const paginatedReports = filteredReports.slice(startIndex, endIndexExclusive);
                  const showingFrom = totalFilteredReports === 0 ? 0 : startIndex + 1;
                  const showingTo = totalFilteredReports === 0 ? 0 : Math.min(endIndexExclusive, totalFilteredReports);
                  const rowPaddingClass = "py-3";
                  const uniqueStatuses = Array.from(new Set(liquidationReports.map((report) => report.status)));

                  return (
                    <div className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {[
                          {
                            label: "Total Reports",
                            value: totalReports,
                            helper: "Approved budgets linked",
                            icon: Receipt,
                            iconTone: "bg-primary/10 text-primary",
                          },
                          {
                            label: "Under Review",
                            value: underReviewCount,
                            helper: "Awaiting admin action",
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
                            label: "Completed",
                            value: completedCount,
                            helper: "Liquidated reports",
                            icon: CheckCircle2,
                            iconTone: "bg-emerald-500/10 text-emerald-600",
                          },
                        ].map((item) => {
                          const Icon = item.icon;
                          return (
                            <Card key={item.label} className="border-border/70 shadow-sm">
                              <CardContent className="flex items-center gap-3 p-4">
                                <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl", item.iconTone)}>
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                                  <p className="mt-1 text-2xl font-semibold leading-none text-foreground">{item.value}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">{item.helper}</p>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>

                      <Card className="overflow-hidden border-border/70 shadow-sm">
                        <CardContent className="space-y-4 p-4 sm:p-5">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                            <div className="grid gap-3 md:grid-cols-2 xl:flex xl:flex-1 xl:flex-wrap">
                              <div className="relative min-w-[220px] flex-1 xl:max-w-xs">
                                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                  value={liquidationSearch}
                                  onChange={(event) => setLiquidationSearch(event.target.value)}
                                  placeholder="Search reports by title, category, ID..."
                                  className="pl-9"
                                />
                              </div>
                              <div className="relative min-w-[160px]">
                                <select
                                  value={liquidationStatusFilter}
                                  onChange={(event) => setLiquidationStatusFilter(event.target.value as "all" | LiquidationStatus)}
                                  className={budgetNativeSelectClass}
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
                              <div className="relative min-w-[150px]">
                                <select
                                  value={liquidationDateRangeFilter}
                                  onChange={(event) => setLiquidationDateRangeFilter(event.target.value as "all" | "30d" | "90d" | "year")}
                                  className={budgetNativeSelectClass}
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
                              >
                                <SlidersHorizontal className="mr-2 h-4 w-4" />
                                More filters
                              </Button>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
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

                          {liquidationFiltersExpanded ? (
                            <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border/60 bg-muted/15 px-3 py-3">
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

                          {totalFilteredReports ? (
                            <>
                              <div className="space-y-3 md:hidden">
                                {paginatedReports.map((report) => {
                                  const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
                                  const attachedFiles = liquidationFilesByReportId.get(report.id) ?? [];
                                  const isDeadlineUrgent =
                                    report.status === "overdue" ||
                                    (report.deadlineAt ? new Date(report.deadlineAt) < new Date() : false);
                                  const hasAdminNote =
                                    report.remarks?.trim().length > 0 &&
                                    (report.status === "needs_revision" || report.status === "overdue" || report.status === "rejected_red");
                                  const isSubmittable = liquidationSubmittableStatuses.has(report.status);
                                  const canRemoveSubmittedFile = !liquidationLockedStatuses.has(report.status);
                                  const canUploadReplacement = report.status === "needs_revision" || report.status === "rejected_red";
                                  const isSubmitting = submittingLiquidationId === report.id;
                                  const hasAttachedFile = attachedFiles.length > 0;
                                  const noteValue = liquidationNotesByReportId[report.id] ?? "";
                                  const latestActivity = report.revisionHistory?.length
                                    ? report.revisionHistory[report.revisionHistory.length - 1]
                                    : null;
                                  const additionalActivities = Math.max((report.revisionHistory?.length ?? 0) - 1, 0);
                                  const secondaryStatus = liquidationStatusSecondaryMap[report.status] ?? formatStatusLabel(report.status);
                                  const primaryFile = attachedFiles[0] ?? null;
                                  return (
                                    <Card key={report.id} className="border-border/70 shadow-sm">
                                      <CardContent className="space-y-3 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <div className="min-w-0 space-y-1">
                                            <p className="font-semibold text-foreground">{relatedBudget?.activityTitle || "Approved budget"}</p>
                                            <p className="text-xs text-muted-foreground">{relatedBudget?.purposeCategory || "No category"}</p>
                                            <p className="text-xs text-primary">Report ID: {buildPublicRecordCode("LR", report, liquidationReports)}</p>
                                            <p className="text-xs text-muted-foreground">
                                              {relatedBudget ? `${formatCurrency(relatedBudget.releasedAmount || relatedBudget.approvedAmount || 0)} released` : "Released budget linked"}
                                            </p>
                                          </div>
                                          <PortalStatusBadge status={report.status} />
                                        </div>

                                        {hasAdminNote ? (
                                          <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3">
                                            <p className="text-xs leading-snug text-amber-800">{report.remarks.trim()}</p>
                                          </div>
                                        ) : null}

                                        <div className="grid gap-3 rounded-xl border border-border/50 bg-muted/10 p-3 sm:grid-cols-2">
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Go Signal</p>
                                            <p className="mt-1 text-sm font-medium text-foreground">
                                              {report.goSignalAt
                                                ? new Date(report.goSignalAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                                : "Pending"}
                                            </p>
                                          </div>
                                          <div>
                                            <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Deadline</p>
                                            <p className={cn("mt-1 text-sm font-medium", isDeadlineUrgent ? "text-destructive" : "text-foreground")}>
                                              {report.deadlineAt
                                                ? new Date(report.deadlineAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                                : "Pending"}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="space-y-2">
                                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">File</p>
                                          {primaryFile ? (
                                            <div className="flex items-start gap-2.5 rounded-xl border border-border/60 bg-background p-3">
                                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                                                <FileText className="h-4 w-4 text-red-500" />
                                              </div>
                                              <div className="min-w-0 flex-1">
                                                <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{primaryFile.fileName}</p>
                                                <p className="mt-1 text-[11px] text-muted-foreground">
                                                  {`${(primaryFile.fileType || "PDF").toUpperCase()} • ${primaryFile.fileSize ? `${Math.max(1, Math.round(primaryFile.fileSize / 1024))} KB` : "File attached"}`}
                                                </p>
                                              </div>
                                            </div>
                                          ) : (
                                            <p className="text-sm text-muted-foreground">No file uploaded yet</p>
                                          )}
                                        </div>

                                        <div className="space-y-1 rounded-xl border border-border/50 bg-muted/10 p-3">
                                          <p className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground/75">Recent Activity</p>
                                          <p className="text-sm text-foreground">
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

                                        <div className="space-y-2.5">
                                          <div className="flex justify-end">
                                            <DropdownMenu modal={false}>
                                              <DropdownMenuTrigger asChild>
                                                <Button type="button" size="sm" variant="outline">
                                                  <MoreHorizontal className="mr-2 h-4 w-4" />
                                                  Actions
                                                </Button>
                                              </DropdownMenuTrigger>
                                              <DropdownMenuContent align="end">
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
                                                    {canRemoveSubmittedFile ? (
                                                      <DropdownMenuItem
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
                                                    ) : null}
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
                                                  </>
                                                )}
                                              </DropdownMenuContent>
                                            </DropdownMenu>
                                          </div>
                                          {isSubmittable ? (
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
                                          ) : null}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  );
                                })}
                              </div>
                              <div className="hidden overflow-x-auto md:block">
                                <div className="min-w-[1240px] rounded-2xl border border-border/70">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="bg-muted/15 hover:bg-muted/15">
                                        <TableHead className="w-[22%]">Report</TableHead>
                                        <TableHead className="w-[14%]">Status</TableHead>
                                        <TableHead className="w-[14%]">Timeline</TableHead>
                                        <TableHead className="w-[20%]">File</TableHead>
                                        <TableHead className="w-[14%]">Recent Activity</TableHead>
                                        <TableHead className="w-[16%]">Action</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {paginatedReports.map((report) => {
                                        const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
                                        const attachedFiles = liquidationFilesByReportId.get(report.id) ?? [];
                                        const isDeadlineUrgent =
                                          report.status === "overdue" ||
                                          (report.deadlineAt ? new Date(report.deadlineAt) < new Date() : false);
                                        const hasAdminNote =
                                          report.remarks?.trim().length > 0 &&
                                          (report.status === "needs_revision" || report.status === "overdue" || report.status === "rejected_red");
                                        const isSubmittable = liquidationSubmittableStatuses.has(report.status);
                                        const canRemoveSubmittedFile = !liquidationLockedStatuses.has(report.status);
                                        const canUploadReplacement = report.status === "needs_revision" || report.status === "rejected_red";
                                        const isSubmitting = submittingLiquidationId === report.id;
                                        const hasAttachedFile = attachedFiles.length > 0;
                                        const noteValue = liquidationNotesByReportId[report.id] ?? "";
                                        const latestActivity = report.revisionHistory?.length
                                          ? report.revisionHistory[report.revisionHistory.length - 1]
                                          : null;
                                        const additionalActivities = Math.max((report.revisionHistory?.length ?? 0) - 1, 0);
                                        const secondaryStatus = liquidationStatusSecondaryMap[report.status] ?? formatStatusLabel(report.status);
                                        const primaryFile = attachedFiles[0] ?? null;
                                        return (
                                              <TableRow key={report.id} className="align-middle">
                                            <TableCell className={`${rowPaddingClass} align-middle`}>
                                              <div className="min-w-0 space-y-1">
                                                <p className="font-semibold text-foreground">{relatedBudget?.activityTitle || "Approved budget"}</p>
                                                <p className="text-xs text-muted-foreground">{relatedBudget?.purposeCategory || "No category"}</p>
                                                <p className="text-xs text-primary">Report ID: {buildPublicRecordCode("LR", report, liquidationReports)}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {relatedBudget ? `${formatCurrency(relatedBudget.releasedAmount || relatedBudget.approvedAmount || 0)} released` : "Released budget linked"}
                                                </p>
                                              </div>
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-middle`}>
                                              <div className="space-y-2">
                                                <PortalStatusBadge status={report.status} />
                                                {hasAdminNote ? (
                                                  <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-2">
                                                    <p className="text-[11px] leading-snug text-amber-800">{report.remarks.trim()}</p>
                                                  </div>
                                                ) : null}
                                              </div>
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-middle`}>
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
                                            <TableCell className={`${rowPaddingClass} align-middle`}>
                                              {primaryFile ? (
                                                <div className="flex items-start gap-2">
                                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-500/10 text-red-600">
                                                    <FileText className="h-4 w-4 text-red-500" />
                                                  </div>
                                                  <div className="min-w-0 flex-1">
                                                    <p className="line-clamp-2 break-all text-sm font-medium leading-snug text-foreground">{primaryFile.fileName}</p>
                                                    <p className="mt-1 text-[11px] text-muted-foreground">
                                                      {`${(primaryFile.fileType || "PDF").toUpperCase()} • ${primaryFile.fileSize ? `${Math.max(1, Math.round(primaryFile.fileSize / 1024))} KB` : "File attached"}`}
                                                    </p>
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-dashed border-border/70">
                                                    <FileText className="h-4 w-4 text-red-500" />
                                                  </div>
                                                  <span>No file uploaded yet</span>
                                                </div>
                                              )}
                                            </TableCell>
                                            <TableCell className={`${rowPaddingClass} align-middle`}>
                                              <div className="space-y-1">
                                                <p className="text-sm text-foreground">
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
                                            <TableCell className={`${rowPaddingClass} align-middle`}>
                                              <div className="space-y-2.5">
                                                <div className="flex justify-start">
                                                  <DropdownMenu modal={false}>
                                                    <DropdownMenuTrigger asChild>
                                                      <Button type="button" size="icon" variant="outline" className="h-8 w-8">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                      </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="start">
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
                                                          {canRemoveSubmittedFile ? (
                                                            <DropdownMenuItem
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
                                                          ) : null}
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
                                                        </>
                                                      )}
                                                    </DropdownMenuContent>
                                                  </DropdownMenu>
                                                </div>
                                                {isSubmittable ? (
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
              <PortalEmptyState
                title="No liquidation reports yet"
                description="Liquidation reports appear here once a budget has been released. Upload your post-activity documents after your event."
              />
            )}
          </PortalSection>
        );
      }
      case "news-releases": {
        const lydoFacebookPageUrl = "https://www.facebook.com/profile.php?id=100064071040238";
        const publishedReleases = state.newsReleases.filter((n) => n.visibilityStatus === "published");
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
                <a href={lydoFacebookPageUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Facebook Page
                </a>
              </Button>
            }
          >
            {publishedReleases.length ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {publishedReleases.map((news) => {
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
                              {previewImageUrl ? (
                                <img
                                  src={previewImageUrl}
                                  alt={`${news.title} preview`}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                                />
                              ) : (
                                <>
                                  <div className={cn("absolute inset-0 bg-gradient-to-br", fallbackAccent)} />
                                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%),linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[length:auto,24px_24px,24px_24px] opacity-90 transition-transform duration-300 group-hover:scale-[1.03]" />
                                  <div className="absolute inset-x-0 bottom-0 p-4">
                                    <div className="rounded-2xl border border-white/15 bg-black/20 p-3 backdrop-blur-sm">
                                      <p className="line-clamp-3 text-lg font-semibold leading-tight text-white">
                                        {news.title}
                                      </p>
                                    </div>
                                  </div>
                                </>
                              )}
                              <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4">
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
                title="No announcements yet"
                description="LYDO hasn't published any announcements yet. Check back soon for updates."
              />
            )}
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

        type IconConfig = { icon: React.ElementType; bg: string; text: string };
        const relatedTypeIconMap: Record<string, IconConfig> = {
          document_submission:  { icon: FileText,      bg: "bg-blue-100",   text: "text-blue-600" },
          budget_request:       { icon: ClipboardList, bg: "bg-emerald-100", text: "text-emerald-600" },
          liquidation_report:   { icon: Receipt,       bg: "bg-violet-100",  text: "text-violet-600" },
          organization_profile: { icon: User,          bg: "bg-slate-100",   text: "text-slate-500" },
        };
        const getIconConfig = (n: NotificationRecord): IconConfig =>
          n.type === "warning"
            ? { icon: AlertTriangle, bg: "bg-amber-100", text: "text-amber-600" }
            : (relatedTypeIconMap[n.relatedType] ?? { icon: Bell, bg: "bg-muted", text: "text-muted-foreground" });

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
                      const { icon: Icon, bg, text } = getIconConfig(notification);
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
                            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${bg}`}>
                              <Icon className={`h-4 w-4 ${text}`} />
                            </div>
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
        const isYpopLocked = currentProfile?.profileStatus !== "verified";
        if (isYpopLocked) {
          return (
            <div className="space-y-6">
              <PortalSection
                title="YPOP Incentive"
                description="This section becomes available after your organization registration is approved."
              >
                <Card className="border-border/70">
                  <CardContent className="flex flex-col items-start gap-4 p-6 sm:p-8">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-amber-500/10 p-2 text-amber-600">
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">Waiting for Admin Approval</h3>
  
                      <p className="text-xs leading-snug text-muted-foreground">

                          Your YPOP Incentive page is locked until the admin verifies your organization registration.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </PortalSection>
            </div>
          );
        }
        const orgYpopEntries = state.ypopEntries
          .filter((e) => e.organizationId === (currentProfile?.id ?? ""))
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
          setSubmittingYpopId(entry.id);
          try {
            const note = ypopNotesByEntryId[entry.id] ?? "";
            const patch = { status: "submitted" as const, submissionNote: note, submittedAt: new Date().toISOString() };
            try {
              const saved = await updateYpopEntryInSupabase(entry.id, patch);
              updateYPOPEntry(saved.id, saved);
            } catch {
              updateYPOPEntry(entry.id, patch);
            }
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
              try {
                const saved = await updateYpopOrgActivityInSupabase(editingYpopOrgActivityId, updatePatch);
                updateYPOPOrgActivity(saved.id, saved);
              } catch {
                updateYPOPOrgActivity(editingYpopOrgActivityId, updatePatch);
              }
              toast({ title: "PPA log updated", description: "Your organization-initiated activity draft has been updated." });
            } else {
              try {
                const saved = await createYpopOrgActivityInSupabase(payload);
                createYPOPOrgActivity(saved);
              } catch {
                createYPOPOrgActivity({
                  id: `ypop-org-activity-${Date.now()}`,
                  ...payload,
                  approvedAt: "",
                  revisionHistory: [],
                  createdAt: now,
                  updatedAt: now,
                });
              }
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
            try {
              const saved = await uploadYpopOrgActivityFileToSupabase({ orgActivityId: activityId, organizationId: orgId, file });
              createYPOPOrgActivityFile(saved);
            } catch {
              createYPOPOrgActivityFile({
                id: `ypop-org-activity-file-${Date.now()}`,
                orgActivityId: activityId,
                organizationId: orgId,
                fileName: file.name,
                fileUrl: "",
                fileType: file.type,
                uploadedAt: new Date().toISOString(),
              });
            }
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
              void deleteYpopOrgActivityFileFromSupabase(fileId, fileUrl).catch(() => {});
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
            try {
              const saved = await updateYpopOrgActivityInSupabase(activity.id, patch);
              updateYPOPOrgActivity(saved.id, saved);
            } catch {
              updateYPOPOrgActivity(activity.id, patch);
            }
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
              void deleteYpopOrgActivityFromSupabase(activityId).catch(() => {});
              deleteYPOPOrgActivity(activityId);
            },
          });
        };

        const handleJoinYpopEvent = async (activityId: string) => {
          const activity = state.ypopCityActivities.find((item) => item.id === activityId);
          if (!activity || !currentProfile?.id) return;
          const now = new Date().toISOString();
          const linkedPeriod = state.ypopPeriods.find((period) => period.semesterKey === activity.semesterKey);
          const existingEntry = state.ypopEntries.find(
            (entry) => entry.organizationId === currentProfile.id && entry.semester === activity.semesterKey,
          );
          if (!existingEntry && linkedPeriod) {
            const entryData = {
              organizationId: currentProfile.id,
              submittedBy: user?.id ?? "",
              semester: linkedPeriod.semesterKey,
              semesterLabel: linkedPeriod.semesterLabel,
              pointsEarned: 0,
              pointsRequired: 70,
              totalPoints: 100,
              status: "draft" as const,
              adminRemarks: "",
              submissionNote: "",
              validationDeadline: linkedPeriod.validationDeadline,
              submittedAt: "",
              validatedAt: "",
              revisionHistory: [],
              orgLedProjectCount: 0,
              cityLedAttendance: [],
            };
            try {
              const savedEntry = await createYpopEntryInSupabase(entryData);
              createYPOPEntry({ ...savedEntry });
            } catch {
              createYPOPEntry({ id: `ypop-${Date.now()}`, ...entryData, createdAt: now, updatedAt: now });
            }
          }
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
          } catch (error) {
            createYPOPEventParticipation({
              id: `ypop-participation-${Date.now()}`,
              ...payload,
              proofSubmittedAt: "",
              verifiedAt: "",
              revisionHistory: [{ action: "pending_verification", adminRemarks: "Organization joined the YPOP event.", changedAt: now }],
              createdAt: now,
              updatedAt: now,
            });
            if (error instanceof Error && !/duplicate/i.test(error.message)) {
              toast({ title: "Joined locally", description: "The event was added locally, but Supabase sync should be checked later." });
              return;
            }
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

        const renderJoinableYpopActivityCard = (activity: { id: string; name: string; date: string; venue: string; points: number; category?: string }) => (
          <Card key={activity.id} className="border-border/70">
            <CardContent className="flex flex-wrap items-start justify-between gap-3 p-5 sm:p-6">
              <div>
                <p className="font-semibold">{activity.name}</p>
                <p className="text-xs text-muted-foreground">
                  {activity.date || "Date TBD"}
                  {activity.venue ? ` • ${activity.venue}` : ""} • {YPOP_CITY_LED_CATEGORY_LABELS[resolveYpopCityLedCategory(activity.category, activity.points)]} • {normalizeYpopCityLedPoints(activity.points, activity.category)} pts
                </p>
              </div>
              <Button type="button" size="sm" onClick={() => void handleJoinYpopEvent(activity.id)}>
                Join Event
              </Button>
            </CardContent>
          </Card>
        );

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
          const eventDate = parseYpopActivityDate(participation.activityDate);
          const canSubmitProof = participation.status === "needs_revision" || (eventDate ? eventDate <= new Date() : false);
          const isSubmitting = submittingYpopEventParticipationId === participation.id;
          const isUploading = ypopEventUploadingId === participation.id;
          const canEditProof = participation.status !== "verified";

          return (
            <Card key={participation.id} className="border-border/70">
              <CardContent className="space-y-4 p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{participation.activityName}</p>
                    <p className="text-xs text-muted-foreground">
                      {participation.activityDate || "Date TBD"}{participation.venue ? ` • ${participation.venue}` : ""}
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

        const openPeriods = state.ypopPeriods.filter((p) => p.status === "open");
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
                      <div className="flex gap-3">
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
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">2</div>
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
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${files.length > 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>3</div>
                        <div className="flex-1 space-y-1.5">
                          <Button
                            type="button"
                            size="sm"
                            onClick={() => void handleSubmitYpop(entry)}
                            disabled={isSubmitting || files.length === 0}
                          >
                            {isSubmitting ? (
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                            ) : "Submit for Validation"}
                          </Button>
                          {files.length === 0 && (
      
                      <p className="text-[11px] leading-snug text-muted-foreground">
Attach at least one file before submitting.</p>
                          )}
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
          const totalSubmissionProofCount = detailFiles.length + semesterEventFiles.length + semesterOrgActivityFiles.length;
          const detailEventFilter = ypopSemesterEventFilterById[activeEntry.id] ?? "ongoing";
          const filteredSemesterAvailableActivities = semesterAvailableActivities.filter((activity) =>
            detailEventFilter === "past" ? isPastYpopActivityDate(activity.date) : !isPastYpopActivityDate(activity.date),
          );
          const filteredSemesterJoinedEvents = semesterJoinedEvents.filter((participation) =>
            detailEventFilter === "past"
              ? isPastYpopActivityDate(participation.activityDate)
              : !isPastYpopActivityDate(participation.activityDate),
          );
          const verifiedCityLedIds = new Set(
            (activeEntry.cityLedAttendance ?? []).filter((attendance) => attendance.attended).map((attendance) => attendance.activityId),
          );
          const approvedOrgActivityCount = getApprovedYpopOrgActivityCount(
            semesterOrgActivities,
            activeEntry.id,
            activeEntry.orgLedProjectCount ?? 0,
          );
          const scoreBreakdown = computeYpopScore(
            activeEntry.cityLedAttendance ?? [],
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

          const handleBackToList = () => {
            setYpopOrgView("list");
            setActiveYpopEntryId(null);
            setYpopPreviewFileId(null);
          };

          return (
            <PortalSection title="YPOP Incentive">
              <div className="space-y-5">

                {/* Back nav + page header */}
                <div>
                  <button
                    type="button"
                    onClick={handleBackToList}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back
                  </button>
                  <div className="mt-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h2 className="text-xl font-semibold">{activeEntry.semesterLabel}</h2>
                      {deadline && (
                        <p className={`mt-0.5 text-sm ${isDeadlinePast ? "text-destructive" : "text-muted-foreground"}`}>
                          Validation {isDeadlinePast ? "closed" : "closes"} {deadline.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      )}
                    </div>
                    <PortalStatusBadge status={activeEntry.status} />
                  </div>
                </div>

                {/* Two-column body */}
                <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">

                  {/* LEFT â€” metadata + actions */}
                  <div className="space-y-5">

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

                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-3">
                          <CardTitle className="text-sm font-semibold">Scoring Overview</CardTitle>
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
                      <CardContent className="space-y-4 pt-0">
                        <div className="space-y-1.5">
    
                      <div className="flex items-center justify-between text-xs sm:text-sm">

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
                          <p className="text-[11px] text-muted-foreground">
                            YPOP uses percentage-based scoring. City-led score is points earned divided by total possible points, then approved organization-initiated activities add bonus percentage points. Final score can exceed 100%.
                          </p>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-3">
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      
                      <p className="text-[11px] leading-snug text-muted-foreground">
City-led score</p>
                            <p className="mt-1 text-base font-semibold">{scoreBreakdown.cityLedPercent}%</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      
                      <p className="text-[11px] leading-snug text-muted-foreground">
Organization-initiated bonus</p>
                            <p className="mt-1 text-base font-semibold">+{scoreBreakdown.orgLedBonus}%</p>
                          </div>
                          <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      
                      <p className="text-[11px] leading-snug text-muted-foreground">
Threshold</p>
                            <p className="mt-1 text-base font-semibold">{activeEntry.pointsRequired}%</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <p className="text-sm font-medium">City-Led Activities</p>
                          {semesterActivities.length === 0 ? (
                            <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                              No city-led activities are configured for this semester yet.
                            </p>
                          ) : (
                            <div className="space-y-1.5">
                              {semesterActivities.map((activity) => {
                                const participation = semesterJoinedEvents.find((item) => item.activityId === activity.id);
                                const isVerifiedAttendance = verifiedCityLedIds.has(activity.id);
                                return (
                                  <div key={activity.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                                    <div className="min-w-0">
                                      <p className="text-sm font-medium leading-snug">{activity.name}</p>
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {activity.date || "Date TBD"}
                                        {activity.venue ? ` • ${activity.venue}` : ""}
                                      </p>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-2">
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

                        <div className="space-y-2">
                          <p className="text-sm font-medium">Organization-Initiated Activities</p>
                          {semesterPeriod?.orgLedTiers?.length ? (
                            <div className="space-y-1.5">
                              {[...semesterPeriod.orgLedTiers]
                                  .sort((left, right) => right.minProjects - left.minProjects)
                                  .map((tier) => (
                                    <div key={`${tier.minProjects}-${tier.bonus}`} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2 text-sm">
                                      <span>{`>= ${tier.minProjects} activit${tier.minProjects === 1 ? "y" : "ies"}`}</span>
                                      <span className="font-semibold">+{tier.bonus}% bonus</span>
                                    </div>
                                  ))}
                            </div>
                          ) : (
                            <p className="rounded-md border border-dashed border-border/60 p-3 text-xs text-muted-foreground">
                              No organization-initiated scoring tiers are configured for this semester yet.
                            </p>
                          )}
    
                      <p className="text-[11px] leading-snug text-muted-foreground">

                            Admin-confirmed organization-initiated activity count: {approvedOrgActivityCount}
                          </p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Message / Note */}
                    {isDraftOrRevision && (
                      <div className="space-y-2">
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
                      <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                        <p className="mb-1 text-xs font-medium text-muted-foreground">Message sent with submission</p>
                        <p className="text-sm">{activeEntry.submissionNote}</p>
                      </div>
                    )}

                    {/* Validation result (qualified / not_qualified) */}
                    {(isQualified || isNotQualified) && (
                      <div className="space-y-3">
                        <p className="font-medium">Validation Result</p>
                        <div className="space-y-1.5">
    
                      <div className="flex items-center justify-between text-xs sm:text-sm">

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
                          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-green-100 p-1.5 text-green-600">
                                <Trophy className="h-4 w-4 text-amber-600" />
                              </div>
                              <div className="flex-1 space-y-2">
                                <div>
                                  <p className="text-sm font-semibold text-green-800">You're qualified for a Project Grant!</p>
                                  <p className="text-sm text-green-700">
                                    Your {activeEntry.semesterLabel} YPOP score qualifies you for a budget incentive. Submit your Plans, Programs &amp; Activities (PPA) to claim it.
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
                                    onClick={() => navigate(`${userRouteMap["budget-request"]}?ypopEntryId=${activeEntry.id}&semesterLabel=${encodeURIComponent(activeEntry.semesterLabel)}`)}
                                  >
                                    <Trophy className="mr-2 h-4 w-4 text-amber-600" />
                                    Submit a Budget Request (PPA)
                                  </Button>
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

                    {/* Activity Log */}
                    <div className="space-y-2.5">
                      <p className="font-medium">Recent Activity</p>
                      <ul className="space-y-2 pl-1">
                        {activityLog.map((item, i) => (
                          <li key={i} className="flex items-start gap-2.5 text-sm">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" />
                            <span className="flex-1">
                              <span className="font-medium capitalize">{item.label}</span>
                              {item.note && <span className="ml-1 text-muted-foreground">- {item.note}</span>}
                              <span className="ml-1.5 text-xs text-muted-foreground/70">{formatDateTimeLabel(item.date)}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footer actions */}
                    {isDraftOrRevision && (
                      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/40 pt-4">
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
                          disabled={isSubmitting || totalSubmissionProofCount === 0}
                        >
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting...</>
                          ) : activeEntry.status === "needs_revision" ? "Resubmit for Validation" : "Submit for Validation"}
                        </Button>
                      </div>
                    )}

                  </div>

                  <div className="space-y-5">
                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
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
                      <CardContent className="space-y-5 pt-0">
                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-foreground">Available City-Led Activities</p>
                          {filteredSemesterAvailableActivities.length === 0 ? (
                            <PortalEmptyState
                              title={`No ${detailEventFilter} joinable city-led activities in this semester`}
                            />
                          ) : (
                            <div className="space-y-3">
                              {filteredSemesterAvailableActivities.map((activity) => renderJoinableYpopActivityCard(activity))}
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-semibold text-foreground">Joined City-Led Activities</p>
                          {filteredSemesterJoinedEvents.length === 0 ? (
                            <PortalEmptyState
                              title={`No ${detailEventFilter} joined city-led activities in this semester yet`}
                              description="Joined activities and their proof-upload cards will appear here."
                            />
                          ) : (
                            <div className="space-y-3">
                              {filteredSemesterJoinedEvents.map((participation) => renderJoinedYpopEventCard(participation))}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70">
                      <CardHeader className="pb-3">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <CardTitle className="text-sm font-semibold">Organization-Initiated Activities</CardTitle>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Log your PPAs here. Only admin-approved entries count toward the organization-initiated bonus.
                            </p>
                          </div>
                          {isDraftOrRevision && (
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
                      <CardContent className="space-y-3 pt-0">
                        {semesterOrgActivities.length === 0 ? (
                          <PortalEmptyState
                            title="No organization-initiated activities logged yet"
                            description="Add each PPA with its activity details, narrative, and proof files for admin approval."
                          />
                        ) : (
                          <div className="space-y-3">
                            {semesterOrgActivities.map((activity) => {
                              const files = ypopOrgActivityFilesByActivityId.get(activity.id) ?? [];
                              const isUploading = ypopOrgActivityUploadingId === activity.id;
                              const isSubmitting = submittingYpopOrgActivityId === activity.id;
                              const canEdit = activity.status === "draft" || activity.status === "needs_revision";
                              return (
                                <Card key={activity.id} className="border-border/60 shadow-none">
                                  <CardContent className="space-y-4 p-4">
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
                                      <p className="text-sm text-foreground whitespace-pre-wrap">{activity.narrativeReport}</p>
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

                    {detailFiles.length > 0 && (
                      <Card className="border-border/70">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-semibold">Legacy Semester Files</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 pt-0">
    
                      <p className="text-[11px] leading-snug text-muted-foreground">

                            These were attached through the older semester-level proof flow and are still retained for reference.
                          </p>
                          {fileListReadOnly}
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
            <div className="space-y-8">
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Open Semesters</p>
                {openPeriods.length === 0 ? (
                  <PortalEmptyState
                    title="No open semesters right now"
                    description="Check back when the next YPOP registration period opens."
                  />
                ) : (
                  <Accordion type="multiple" className="space-y-4">
                    {openPeriods.map((period) => {
                      const existing = activeEntries.find((e) => e.semester === period.semesterKey);
                      const existingFiles = existing ? (ypopFilesByEntryId.get(existing.id) ?? []) : [];
                      const deadlineDate = period.validationDeadline ? new Date(period.validationDeadline) : null;
                      const periodActivities = ypopActivitiesSorted.filter((activity) => activity.semesterKey === period.semesterKey);
                      const periodActivityIds = new Set(periodActivities.map((activity) => activity.id));
                      const periodAvailableActivities = periodActivities.filter((activity) => !ypopParticipationByActivityId.has(activity.id));
                      const periodJoinedEvents = joinedYpopEvents.filter((participation) => periodActivityIds.has(participation.activityId));

                      return (
                        <AccordionItem
                          key={period.id}
                          value={period.id}
                          className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                        >
                          <AccordionTrigger className="px-5 py-4 text-left hover:no-underline sm:px-6">
                            <div className="flex w-full flex-col gap-3 pr-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="flex items-start gap-3">
                                <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                                  <Medal className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                  <p className="font-semibold leading-snug">{period.semesterLabel}</p>
            
                      <p className="text-[11px] leading-snug text-muted-foreground">
YPOP Participation Validation</p>
                                  {deadlineDate && (
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      Validation closes {deadlineDate.toLocaleDateString("en-PH", {
                                        year: "numeric",
                                        month: "short",
                                        day: "numeric",
                                      })}
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {periodAvailableActivities.length} available event{periodAvailableActivities.length === 1 ? "" : "s"} •{" "}
                                    {periodJoinedEvents.length} joined event{periodJoinedEvents.length === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2">
                                {existing ? <PortalStatusBadge status={existing.status} /> : null}
                                {existing ? (
        
                          <span className="text-[11px] text-muted-foreground">

                                    {existingFiles.length} {existingFiles.length === 1 ? "file" : "files"} attached
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="border-t border-border/60 px-5 pb-5 pt-4 sm:px-6 sm:pb-6">
                            <div className="space-y-4">
        
                      <div className="grid gap-2 sm:grid-cols-3">

                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            
                      <p className="text-[11px] leading-snug text-muted-foreground">
Available events</p>
                                  <p className="mt-1 text-lg font-semibold">{periodAvailableActivities.length}</p>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            
                      <p className="text-[11px] leading-snug text-muted-foreground">
Joined events</p>
                                  <p className="mt-1 text-lg font-semibold">{periodJoinedEvents.length}</p>
                                </div>
                                <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
            
                      <p className="text-[11px] leading-snug text-muted-foreground">
Current score</p>
                                  <p className="mt-1 text-lg font-semibold">
                                    {existing ? `${existing.pointsEarned}%` : "Pending"}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-4">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">Semester Submission</p>
            
                      <p className="text-[11px] leading-snug text-muted-foreground">

                                    {existing
                                      ? "Open this submission to manage available activities, joined activities, proof uploads, and score tracking."
                                      : "Register this semester to open the full YPOP submission workspace for this period."}
                                  </p>
                                </div>
                                {existing ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
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
                                  <Button type="button" size="sm" onClick={() => void handleStartYpopSubmission(period)}>
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
    ypopOrgActivities,
    ypopOrgActivityFilesByActivityId,
    ypopSemesterEventFilterById,
  ]);

  return (
    <>
      <UserPortalShell
        title={user?.displayName ?? "Organization Portal"}
        subtitle="Organization User"
        hidePageBanner={section !== "dashboard"}
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
                : "Review the uploaded file, change it if needed, or remove it before saving."}
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
                  disabled={Boolean(savingAttachedDocument) || isDocumentSubmissionApproved || isApprovedSubmissionFile(attachedDocumentEditor?.file)}
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
                  disabled={Boolean(savingAttachedDocument) || isDocumentSubmissionApproved || isApprovedSubmissionFile(attachedDocumentEditor?.file)}
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
                  disabled={Boolean(savingAttachedDocument) || isDocumentSubmissionApproved || isApprovedSubmissionFile(attachedDocumentEditor?.file)}
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
          <div className="space-y-2">
            {profileActivityLogEntries.length ? (
              profileActivityLogEntries.map((log) => (
                <div key={log.id} className="rounded-2xl border border-border/70 bg-muted/20 p-3.5">
                  <p className="text-sm font-medium leading-snug">{log.description}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{formatDateTimeLabel(log.createdAt)}</p>
                </div>
              ))
            ) : (
              <PortalEmptyState
                title="No activity yet"
                description="Profile changes and admin review actions will appear here."
              />
            )}
          </div>
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
          <div className="space-y-3">
            {budgetRecentActivityModal?.entries.length ? (
              budgetRecentActivityModal.entries.map((entry, index) => (
                <div key={`${entry.action}-${entry.changedAt}-${index}`} className="rounded-xl border border-border/70 bg-muted/15 p-3.5">
                  <p className="text-sm font-medium text-foreground">
                    {budgetActionLabels[entry.action] ?? formatStatusLabel(entry.action)}
                  </p>
                  {entry.adminRemarks?.trim() ? (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.adminRemarks.trim()}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeLabel(entry.changedAt)}</p>
                </div>
              ))
            ) : (
              <PortalEmptyState
                title="No recent activity yet"
                description="Budget request updates will appear here once the request has been processed."
              />
            )}
          </div>
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
          <div className="space-y-3">
            {liquidationRecentActivityModal?.entries.length ? (
              liquidationRecentActivityModal.entries.map((entry, index) => (
                <div key={`${entry.action}-${entry.changedAt}-${index}`} className="rounded-xl border border-border/70 bg-muted/15 p-3.5">
                  <p className="text-sm font-medium text-foreground">
                    {liquidationActionLabels[entry.action] ?? formatStatusLabel(entry.action)}
                  </p>
                  {entry.adminRemarks?.trim() ? (
                    <p className="mt-1 text-sm text-muted-foreground">{entry.adminRemarks.trim()}</p>
                  ) : null}
                  <p className="mt-1 text-xs text-muted-foreground">{formatDateTimeLabel(entry.changedAt)}</p>
                </div>
              ))
            ) : (
              <PortalEmptyState
                title="No recent activity yet"
                description="Liquidation report updates will appear here once the report has been processed."
              />
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setLiquidationRecentActivityModal(null)}>
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
    </>
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



