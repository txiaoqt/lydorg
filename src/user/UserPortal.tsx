import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bell,
  BellOff,
  X,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ClipboardList,
  Download,
  Eye,
  FileText,
  FileUp,
  Loader2,
  Medal,
  Plus,
  Receipt,
  Trash2,
  Trophy,
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
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PortalEmptyState, PortalMetricCard, PortalSection, PortalStatusBadge } from "@/components/portal/portal-ui";
import { UserPortalShell } from "@/components/portal/UserPortalShell";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "@/hooks/use-toast";
import { useLydoConnect } from "@/lib/lydo-connect-store";
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
  type YPOPFile,
  type YPOPPeriod,
  statusLabelMap,
  statusToneMap,
  formatSubClassificationLabel,
  subClassificationOptions,
  type OrganizationProfile,
  userNavigationGroups,
  userRouteMap,
} from "@/lib/lydo-connect-data";
import {
  loadLydoConnectSupabaseState,
  createBudgetRequestInSupabase,
  updateBudgetRequestInSupabase,
  deleteBudgetRequestInSupabase,
  uploadBudgetRequestFileToSupabase,
  createLiquidationReportFileInSupabase,
  resolveSupabaseFileUrl,
  upsertOrganizationProfileInSupabase,
  removeOrganizationDocumentFromSupabase,
  submitOrganizationDocumentToSupabase,
  updateLiquidationReportInSupabase,
  createYpopEntryInSupabase,
  updateYpopEntryInSupabase,
  deleteYpopEntryFromSupabase,
  uploadYpopFileToSupabase,
  deleteYpopFileFromSupabase,
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
  } = useLydoConnect();
  const [scanningDocumentId, setScanningDocumentId] = useState<string | null>(null);
  const [submittingDocumentId, setSubmittingDocumentId] = useState<string | null>(null);
  const [userRemarkDraftsByFileId, setUserRemarkDraftsByFileId] = useState<Record<string, string>>({});
  const [budgetUserNoteDrafts, setBudgetUserNoteDrafts] = useState<Record<string, string>>({});
  const [liquidationNotesByReportId, setLiquidationNotesByReportId] = useState<Record<string, string>>({});
  const [submittingLiquidationId, setSubmittingLiquidationId] = useState<string | null>(null);
  const [ypopNotesByEntryId, setYpopNotesByEntryId] = useState<Record<string, string>>({});
  const [submittingYpopId, setSubmittingYpopId] = useState<string | null>(null);
  const [ypopUploadingId, setYpopUploadingId] = useState<string | null>(null);
  const [ypopHistoryOpenById, setYpopHistoryOpenById] = useState<Record<string, boolean>>({});
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
  const [ocrPreviewOpen, setOcrPreviewOpen] = useState(false);
  const [budgetReviewNote, setBudgetReviewNote] = useState<{ title: string; note: string; status: BudgetRequestStatus } | null>(null);

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
  const [budgetForm, setBudgetForm] = useState<BudgetRequest>(() =>
    createBlankBudgetRequest(user?.id ?? "", user?.id ?? ""),
  );
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
  const [pendingDocumentScan, setPendingDocumentScan] = useState<{
    documentTypeId: string;
    documentTypeName: string;
    file: File;
    result: DocumentOcrScanResult | null;
  } | null>(null);
  const currentProfile = state.organizationProfiles.find((item) => item.userId === user?.id) ?? null;

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

  useEffect(() => {
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
  }, [
    currentProfile,
    user?.displayName,
    user?.email,
    user?.id,
    user?.profileHints?.barangay,
    user?.profileHints?.contactNumber,
    user?.profileHints?.district,
    user?.profileHints?.isExistingOrganization,
    user?.profileHints?.organizationIdentifierNumber,
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
  const userNotifications = useMemo(
    () => state.notifications.filter((notification) => notification.userId === user?.id),
    [state.notifications, user?.id],
  );
  const unreadNotifications = userNotifications.filter((notification) => !notification.isRead);
  const templateDocuments = useMemo(
    () =>
      [...state.templates]
        .filter((template) => template.templateActive && template.isActive)
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
  const documentsPercent = getReadiness(completedDocs, templateDocuments.length);
  const budgetPercent = latestBudget ? getReadiness(approvedBudgetStatuses.has(latestBudget.status) ? 1 : 0, 1) : 0;
  const liquidationPercent = latestLiquidation ? getReadiness(latestLiquidation.status === "completed_liquidated" ? 1 : 0, 1) : 0;

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

  const handleDocumentUpload = async (documentTypeName: string, file: File | null) => {
    if (!file) return;
    if (!ensureCompletedOrganizationProfile()) return;

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
    setProfileDraft((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const toggleAdvocacy = (advocacy: OrganizationProfile["advocacies"][number]) => {
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
      for (const file of Array.from(fileList)) {
        await createLiquidationReportFileInSupabase({
          liquidationReportId: report.id,
          file,
        });
      }

      const remoteSnapshot = await loadLydoConnectSupabaseState();
      if (remoteSnapshot) {
        mergeRemoteState(remoteSnapshot);
      }

      toast({
        title: "Liquidation files uploaded",
        description: "The post-activity documents were attached to the liquidation record.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "The liquidation files could not be uploaded.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitLiquidation = async (report: LiquidationReport) => {
    setSubmittingLiquidationId(report.id);
    try {
      const updated = await updateLiquidationReportInSupabase(report.id, { status: "submitted" });
      updateLiquidationReport(report.id, { status: "submitted", updatedAt: updated.updatedAt });
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

  const activeContent = useMemo(() => {
    switch (section) {
      case "dashboard": {
        const isVerified = profile.profileStatus === "verified";
        const isProfileSaved = profile.profileStatus !== "incomplete";
        const hasSubmittedDocuments = submission !== null && submission.status !== "draft";
        const stepsCompleted = (isProfileSaved ? 1 : 0) + (hasSubmittedDocuments ? 1 : 0);
        const latestAnnouncements = state.newsReleases
          .filter((n) => n.visibilityStatus === "published")
          .sort((a, b) => b.datePosted.localeCompare(a.datePosted))
          .slice(0, 2);
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
                        <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => navigate(userRouteMap["organization-profile"])}>Go now →</button>
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
                        <button type="button" className="mt-1 text-xs text-primary hover:underline" onClick={() => navigate(userRouteMap["document-submission"])}>Go now →</button>
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
                onClick={() => navigate(userRouteMap["organization-profile"])}
              />
              <PortalMetricCard
                label="Documents"
                value={`${documentsPercent}%`}
                helper={`${completedDocs}/${templateDocuments.length} checked`}
                icon={FileText}
                onClick={() => navigate(userRouteMap["document-submission"])}
              />
              <PortalMetricCard
                label="Budget"
                value={`${budgetPercent}%`}
                helper={formatStatusLabel(latestBudget?.status ?? "draft")}
                icon={ClipboardList}
                onClick={() => navigate(userRouteMap["budget-request"])}
              />
              <PortalMetricCard
                label="Liquidation"
                value={`${liquidationPercent}%`}
                helper={formatStatusLabel(latestLiquidation?.status ?? "pending_activity_completion")}
                icon={CalendarDays}
                onClick={() => navigate(userRouteMap["liquidation-reporting"])}
              />
            </div>

            <Card className="bg-muted/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-0 pb-5">
                {(
                  [
                    { label: "Profile",     badge: <PortalStatusBadge status={profile.profileStatus} /> },
                    { label: "Documents",   badge: submission ? <PortalStatusBadge status={submission.status} /> : <span className="text-xs text-muted-foreground">No submission yet</span> },
                    { label: "Budget",      badge: latestBudget ? <PortalStatusBadge status={latestBudget.status} /> : <span className="text-xs text-muted-foreground">No request yet</span> },
                    { label: "Liquidation", badge: latestLiquidation ? <PortalStatusBadge status={latestLiquidation.status} /> : <span className="text-xs text-muted-foreground">Locked</span> },
                  ] as { label: string; badge: React.ReactNode }[]
                ).map(({ label, badge }, i, arr) => (
                  <div
                    key={label}
                    className={`flex items-center justify-between gap-3 py-2.5 text-sm${i < arr.length - 1 ? " border-b border-border/40" : ""}`}
                  >
                    <span className="text-muted-foreground">{label}</span>
                    {badge}
                  </div>
                ))}
                <div className="mt-3 rounded-lg border border-border/40 bg-background/60 px-3 py-2.5">
                  <p className="text-[0.68rem] font-semibold uppercase tracking-wide text-muted-foreground/60">Next Step</p>
                  <p className="mt-1 text-sm text-foreground">
                    {submission?.status === "under_admin_review"
                      ? "Your documents are under admin review. Check back for remarks."
                      : latestBudget?.status === "budget_released"
                        ? "Your budget has been released. You can now submit a liquidation report."
                        : latestBudget?.status === "hard_copy_submitted"
                          ? "Hard copy received. Wait for cash release before liquidation unlocks."
                          : latestBudget?.status === "approved_for_ftf_green"
                            ? "Prepare hard copies for face-to-face submission."
                            : latestBudget
                              ? "Budget request is under administrative review."
                              : !isProfileSaved
                                ? "Complete your profile to begin the compliance workflow."
                                : "Submit your required documents to continue."}
                  </p>
                </div>
              </CardContent>
            </Card>

            {docFiles.some((file) => file.validationStatus !== "correct") && (
              <PortalSection
                title="Action Items"
                description="These documents need your attention before you can move forward."
              >
                <ul className="space-y-2">
                  {docFiles
                    .filter((file) => file.validationStatus !== "correct")
                    .map((file) => (
                      <li key={file.id}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between gap-3 rounded-xl border border-border/70 p-3 text-sm text-left transition-colors hover:bg-muted/40"
                          onClick={() => navigate(userRouteMap["document-submission"])}
                        >
                          <span className="font-medium">{templatesById[file.documentTypeId]?.name ?? file.documentTypeId}</span>
                          <PortalStatusBadge status="needs_revision" />
                        </button>
                      </li>
                    ))}
                </ul>
              </PortalSection>
            )}

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
                        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{news.description}</p>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </PortalSection>
          </div>
        );
      }
      case "organization-profile":
        return (
          <PortalSection
            title="My Profile"
            description="Complete your organization's profile to unlock the compliance workflow. Core registration details from sign-up are locked in."
            action={<PortalStatusBadge status={profileDraft.profileStatus} />}
          >
            <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card className="border-border/70">
                <CardContent className="space-y-5 p-4 sm:p-5">
                  <div className="grid gap-4 md:grid-cols-2">
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
                    <p className="text-xs text-muted-foreground">
                      Save changes to update the shared profile record seen by the admin dashboard.
                    </p>
                    <Button type="button" onClick={() => void saveOrganizationProfile()} disabled={savingProfile}>
                      {savingProfile ? "Saving..." : "Save Profile"}
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Profile readiness</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Progress className="mt-1" value={profileDraftPercent} />
                    <p className="mt-3 text-sm text-muted-foreground">
                      {profileDraftPercent}% complete. Required details should stay updated so the organization can submit documents and budget requests.
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Saved Profile</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0 text-sm">
                    {currentProfile ? (
                      <>
                        <p><span className="text-muted-foreground">Status:</span> {currentProfile.profileStatus.replaceAll("_", " ")}</p>
                        {currentProfile.profileStatus === "verified" && currentProfile.verifiedAt ? (
                          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="font-medium">VERIFIED ON {formatVerifiedDateLabel(currentProfile.verifiedAt)}</span>
                          </div>
                        ) : null}
                        <p><span className="text-muted-foreground">Major:</span> {currentProfile.majorClassification || "N/A"}</p>
                        <p><span className="text-muted-foreground">Sub:</span> {formatSubClassificationLabel(currentProfile.subClassification) || "N/A"}</p>
                        <p><span className="text-muted-foreground">Representative:</span> {currentProfile.representativeName || "N/A"}</p>
                        <p><span className="text-muted-foreground">Adviser:</span> {currentProfile.adviserName || "N/A"}</p>
                        <p><span className="text-muted-foreground">Address:</span> {currentProfile.address || "N/A"}</p>
                        <p><span className="text-muted-foreground">Facebook Page:</span> {currentProfile.facebookPageUrl || "N/A"}</p>
                        <div>
                          <p className="text-muted-foreground">Advocacies:</p>
                          {currentProfile.advocacies.length ? (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {currentProfile.advocacies.map((advocacy) => (
                                <span
                                  key={advocacy}
                                  className="inline-flex items-center rounded-full border border-primary/15 bg-primary/8 px-2.5 py-1 text-[11px] font-medium text-primary"
                                >
                                  {advocacy}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted-foreground">N/A</p>
                          )}
                        </div>
                      </>
                    ) : (
                      <p className="text-muted-foreground">No saved profile yet. Fill out the form and save it to create the organization record.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </PortalSection>
        );
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
                        ? `Uploaded ${new Date(detailFile.uploadedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}`
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
                      <p className="text-xs text-muted-foreground">
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
                      <p className="text-xs text-muted-foreground">No activity yet.</p>
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
                              <p className="mt-0.5 text-[10px] text-muted-foreground">
                                {new Date(entry.date).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                              </p>
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

        return (
          <div className="space-y-6">
            <PortalSection
              title="Document Submissions"
              description="Upload each required file and submit for admin review. You will be notified when documents are approved or require changes."
            >
              {/* Progress banner */}
              <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-card/60 px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {completedDocs} of {templateDocuments.length} documents approved
                  </p>
                  <div className="mt-1.5 flex items-center gap-2">
                    <Progress value={documentsPercent} className="h-1.5 w-32" />
                    <span className="text-xs text-muted-foreground">{documentsPercent}%</span>
                  </div>
                </div>
                <div className="shrink-0">
                  {submission
                    ? <PortalStatusBadge status={submission.status} />
                    : <span className="text-xs text-muted-foreground">No submission yet</span>}
                </div>
              </div>

              <div className="grid gap-3">
                {templateDocuments.map((documentType) => {
                  const file = docFiles.find((entry) => entry.documentTypeId === documentType.id);
                  const template = templatesById[documentType.id];
                  const fileBadgeStatus =
                    file?.adminStatus && file.adminStatus !== "draft"
                      ? file.adminStatus
                      : file
                        ? file.validationStatus === "correct"
                          ? "ready_for_review"
                          : "needs_revision"
                        : null;
                  const isApproved = fileBadgeStatus === "approved" || fileBadgeStatus === "approved_green";
                  return (
                    <Card key={documentType.id} className="overflow-hidden border-border/70">
                      <CardContent className="p-0">
                        {/* Header: icon + name + status badge */}
                        <div className="flex items-start gap-3 p-4 sm:p-5">
                          <div className="mt-0.5 shrink-0 rounded-lg border border-border/50 bg-muted/40 p-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-medium leading-snug">{documentType.name}</p>
                              {fileBadgeStatus
                                ? <PortalStatusBadge status={fileBadgeStatus} />
                                : <span className="text-xs text-muted-foreground">No file uploaded yet</span>
                              }
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{documentType.description}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground/60">
                              Format: {getDocumentPrimaryFileTypeLabel(documentType.id)}
                            </p>
                            {file && (file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red") && file.adminRemarks?.trim() && (
                              <p className="mt-1 text-xs italic text-amber-700">
                                Admin: {file.adminRemarks.trim()}
                              </p>
                            )}
                            {isApproved && (
                              <p className="mt-1.5 flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                This document has been approved.
                              </p>
                            )}
                            {isApproved && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Approved files are locked and can no longer be modified or removed.
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/40 bg-muted/20 px-4 py-3 sm:px-5">
                          <div>
                            {hasUploadedTemplateFile(template?.templateFileUrl, template?.templateFileName) ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void openPreview(template.templateFileUrl, template.templateFileName || documentType.name)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Template
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => void openPreview(template?.templateFileUrl ?? "", template?.templateFileName || documentType.name)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Template
                              </Button>
                            )}
                          </div>
                          <label
                            onClick={(event) => {
                              if (ensureCompletedOrganizationProfile()) return;
                              event.preventDefault();
                            }}
                          >
                            <input
                              type="file"
                              accept={getDocumentUploadAcceptValue(documentType.id)}
                              className="sr-only"
                              onChange={(event) => {
                                void handleDocumentUpload(documentType.name, event.target.files?.[0] ?? null);
                                event.currentTarget.value = "";
                              }}
                            />
                            <Button
                              type="button"
                              variant={file ? "outline" : "secondary"}
                              size="sm"
                              asChild
                              disabled={scanningDocumentId === documentType.id || submittingDocumentId === documentType.id}
                              className="cursor-pointer"
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
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </PortalSection>

            {/* Submission Review Log */}
            <PortalSection title="Recent Activity" description="Admin review actions on your document submission.">
              {submissionLogs.length === 0 ? (
                <PortalEmptyState
                  title="No activity yet"
                  description="Review activity will appear here once your submission has been processed."
                />
              ) : (
                <div>
                  {submissionLogs.map((log, i) => (
                    <div key={log.id} className="flex gap-3">
                      <div className="flex flex-col items-center pt-1">
                        <span className="h-2 w-2 shrink-0 rounded-full bg-primary/70" />
                        {i < submissionLogs.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-border/50" style={{ minHeight: "1.5rem" }} />
                        )}
                      </div>
                      <div className="min-w-0 pb-5">
                        <p className="text-sm leading-snug text-foreground">{log.description}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString("en-PH", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
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
                        <p className="text-sm text-muted-foreground">
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
            approved_for_ftf_green: "Approved for FTF submission",
            hard_copy_submitted: "Hard copy submitted",
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
                              {budgetRequests.find((r) => r.id === budgetForm.id)?.remarks?.trim() || "No comment was provided."}
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
                              Remarks <span className="ml-1 text-destructive">*</span>
                            </Label>
                            <Textarea
                              id="budget-remarks"
                              value={budgetForm.remarks}
                              onChange={(event) => setBudgetForm((current) => ({ ...current, remarks: event.target.value }))}
                              placeholder="Notes for the reviewer."
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
                            <p className="text-xs text-muted-foreground">
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
                    {/* Summary metric cards */}
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
                      return (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <PortalMetricCard label="Total" value={totalRequests} helper="all requests" icon={ClipboardList} />
                          <PortalMetricCard label="Under Review" value={pendingReviewCount} helper="awaiting admin" icon={Eye} />
                          <PortalMetricCard label="Needs Revision" value={needsRevisionCount} helper="action required" icon={AlertTriangle} />
                          <PortalMetricCard label="Approved" value={approvedCount} helper="approved or released" icon={CheckCircle2} />
                        </div>
                      );
                    })()}

                    {budgetRequests.length ? (
                      budgetRequests.map((request) => {
                        const attachedFile = budgetRequestFilesByBudgetId.get(request.id);
                        const isApproved = approvedBudgetStatuses.has(request.status);
                        return (
                          <Card key={request.id} className="overflow-hidden border-border/70">
                            <CardContent className="p-0">
                              {/* Card header */}
                              <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <p className="font-semibold leading-snug">{request.activityTitle || "Untitled request"}</p>
                                    {request.budgetRequestType === "ypop_incentive" && (
                                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                        <Trophy className="h-2.5 w-2.5" />
                                        YPOP Incentive
                                      </span>
                                    )}
                                  </div>
                                  <p className="mt-0.5 text-xs text-muted-foreground">{request.purposeCategory || "No category"}</p>
                                </div>
                                <PortalStatusBadge status={request.status} />
                              </div>

                              {/* Card body */}
                              <div className="space-y-4 px-4 pb-5 sm:px-5">
                                {/* Description */}
                                <p className="text-sm text-muted-foreground">{request.activityDescription || "No description provided."}</p>

                                {/* Details grid */}
                                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground/60">Proposed Date</p>
                                    <p className="mt-0.5 font-medium">
                                      {request.activityDate
                                        ? new Date(request.activityDate).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                        : "Not set"}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground/60">Venue</p>
                                    <p className="mt-0.5 font-medium">{request.venue || "Not set"}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground/60">Requested Amount</p>
                                    <p className="mt-0.5 font-medium">{formatCurrency(request.requestedAmount || 0)}</p>
                                  </div>
                                  <div>
                                    <p className="text-xs uppercase tracking-wide text-muted-foreground/60">Approved Amount</p>
                                    <p className="mt-0.5 font-medium">{request.approvedAmount ? formatCurrency(request.approvedAmount) : "—"}</p>
                                  </div>
                                </div>

                                {/* Admin feedback (needs_revision only) */}
                                {request.status === "needs_revision" && (
                                  <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                                    <div className="mb-1 flex items-center gap-1.5">
                                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Feedback</p>
                                    </div>
                                    <p className="text-sm text-amber-800">{request.remarks?.trim() || "No comment was provided."}</p>
                                  </div>
                                )}

                                {/* Attached document */}
                                {attachedFile ? (
                                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm">
                                    <div className="flex min-w-0 items-center gap-2">
                                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                      <span className="truncate font-medium text-foreground">{attachedFile.fileName}</span>
                                    </div>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => void openFile(attachedFile.fileUrl, attachedFile.fileName)}
                                    >
                                      <Eye className="mr-1.5 h-3.5 w-3.5" />
                                      Open File
                                    </Button>
                                  </div>
                                ) : (
                                  <p className="text-xs italic text-muted-foreground/60">No supporting document attached yet.</p>
                                )}

                                {/* Revision history timeline */}
                                {request.revisionHistory?.length ? (
                                  <div>
                                    <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</p>
                                    <div>
                                      {request.revisionHistory.map((entry, i) => (
                                        <div key={i} className="flex gap-2.5">
                                          <div className="flex flex-col items-center pt-0.5">
                                            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                                            {i < (request.revisionHistory?.length ?? 0) - 1 && (
                                              <span className="mt-0.5 w-px flex-1 bg-border/50" style={{ minHeight: "1rem" }} />
                                            )}
                                          </div>
                                          <div className="min-w-0 pb-3">
                                            <p className="text-xs leading-snug text-foreground">
                                              {budgetActionLabels[entry.action] ?? entry.action}
                                              {entry.adminRemarks ? `: "${entry.adminRemarks}"` : ""}
                                            </p>
                                            <p className="mt-0.5 text-[10px] text-muted-foreground">
                                              {new Date(entry.changedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                                            </p>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : null}

                                {/* Footer actions (hidden for approved requests) */}
                                {!isApproved && (
                                  <div className="flex gap-2 border-t border-border/40 pt-3">
                                    {request.status === "needs_revision" ? (
                                      <Button
                                        type="button"
                                        size="sm"
                                        onClick={() => { startEditingBudgetRequest(request); setShowBudgetForm(true); }}
                                        disabled={savingBudgetRequest}
                                      >
                                        Edit &amp; Resubmit
                                      </Button>
                                    ) : (
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => { startEditingBudgetRequest(request); setShowBudgetForm(true); }}
                                        disabled={savingBudgetRequest}
                                      >
                                        Edit
                                      </Button>
                                    )}
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleDeleteBudgetRequest(request)}
                                      disabled={savingBudgetRequest}
                                    >
                                      Delete
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    ) : (
                      <PortalEmptyState
                        title="No budget requests yet"
                        description="Click 'New Budget Request' to create your first allocation request. Once budget is released, the liquidation page will unlock automatically."
                      />
                    )}
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
                        <p className="text-sm text-muted-foreground">
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
            {liquidationReports.length ? (
              <div className="space-y-4">
                {(() => {
                  const liquidationActionLabels: Record<string, string> = {
                    submitted: "Submitted for review",
                    needs_revision: "Revision requested",
                    approved_for_ftf_green: "Approved",
                    hard_copy_submitted: "Hard copy submitted",
                    completed_liquidated: "Liquidation completed",
                    overdue: "Marked as overdue",
                    rejected_red: "Rejected",
                  };
                  const liquidationSubmittableStatuses = new Set<LiquidationStatus>([
                    "pending_activity_completion",
                    "not_started",
                    "draft",
                    "needs_revision",
                    "overdue",
                  ]);
                  return liquidationReports.map((report) => {
                    const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
                    const attachedFiles = liquidationFilesByReportId.get(report.id) ?? [];
                    const isDeadlineUrgent =
                      report.status === "overdue" ||
                      (report.deadlineAt ? new Date(report.deadlineAt) < new Date() : false);
                    const hasAdminNote =
                      report.remarks?.trim().length > 0 &&
                      (report.status === "needs_revision" || report.status === "overdue" || report.status === "rejected_red");
                    const isSubmittable = liquidationSubmittableStatuses.has(report.status);
                    const isSubmitting = submittingLiquidationId === report.id;
                    const noteValue = liquidationNotesByReportId[report.id] ?? "";
                    return (
                      <Card key={report.id} className="overflow-hidden border-border/70">
                        <CardContent className="p-0">
                          {/* Card header */}
                          <div className="flex items-start justify-between gap-3 p-4 sm:p-5">
                            <div className="min-w-0">
                              <p className="font-semibold leading-snug">{relatedBudget?.activityTitle || "Approved budget"}</p>
                              <p className="mt-0.5 text-xs text-muted-foreground">
                                {relatedBudget?.purposeCategory || "No category"}
                                {relatedBudget ? ` · ${formatCurrency(relatedBudget.releasedAmount || relatedBudget.approvedAmount || 0)} released` : ""}
                              </p>
                            </div>
                            <PortalStatusBadge status={report.status} />
                          </div>

                          {/* Card body */}
                          <div className="space-y-4 px-4 pb-5 sm:px-5">
                            {/* Dates */}
                            <div className="grid gap-3 sm:grid-cols-2 text-sm">
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground/60">Go Signal Date</p>
                                <p className="mt-0.5 font-medium">
                                  {report.goSignalAt
                                    ? new Date(report.goSignalAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                    : "Pending"}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs uppercase tracking-wide text-muted-foreground/60">Deadline</p>
                                <p className={`mt-0.5 font-medium ${isDeadlineUrgent ? "text-destructive" : ""}`}>
                                  {report.deadlineAt
                                    ? new Date(report.deadlineAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })
                                    : "Pending"}
                                  {isDeadlineUrgent && " · Overdue"}
                                </p>
                              </div>
                            </div>

                            {/* Admin note (inline) */}
                            {hasAdminNote && (
                              <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                                <div className="mb-1 flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">Admin Note</p>
                                </div>
                                <p className="text-sm text-amber-800">{report.remarks.trim()}</p>
                              </div>
                            )}

                            {/* Revision history timeline */}
                            {report.revisionHistory?.length ? (
                              <div>
                                <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recent Activity</p>
                                <div>
                                  {report.revisionHistory.map((entry, i) => (
                                    <div key={i} className="flex gap-2.5">
                                      <div className="flex flex-col items-center pt-0.5">
                                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                                        {i < (report.revisionHistory?.length ?? 0) - 1 && (
                                          <span className="mt-0.5 w-px flex-1 bg-border/50" style={{ minHeight: "1rem" }} />
                                        )}
                                      </div>
                                      <div className="min-w-0 pb-3">
                                        <p className="text-xs leading-snug text-foreground">
                                          {liquidationActionLabels[entry.action] ?? entry.action}
                                          {entry.adminRemarks ? `: "${entry.adminRemarks}"` : ""}
                                        </p>
                                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                                          {new Date(entry.changedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ) : null}

                            {/* Post-activity documents */}
                            <div className="space-y-3 border-t border-border/40 pt-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Post-Activity Documents</p>
                              <div className="space-y-2">
                                <label className="block">
                                  <input
                                    type="file"
                                    multiple
                                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                    className="sr-only"
                                    onChange={async (event) => {
                                      await handleLiquidationFileUpload(report, event.target.files);
                                      event.currentTarget.value = "";
                                    }}
                                  />
                                  <Button type="button" variant="outline" size="sm" asChild className="cursor-pointer">
                                    <span>
                                      <FileUp className="mr-2 h-4 w-4" />
                                      Upload Documents
                                    </span>
                                  </Button>
                                </label>
                                <p className="text-xs text-muted-foreground">
                                  Attendance sheets, photos, narrative reports, expense receipts, etc. PDF/image/Word accepted.
                                </p>
                              </div>
                              {attachedFiles.length ? (
                                <div className="space-y-2">
                                  {attachedFiles.map((file) => (
                                    <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2.5 text-sm">
                                      <div className="flex min-w-0 items-center gap-2">
                                        <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                                        <span className="truncate font-medium text-foreground">{file.fileName}</span>
                                      </div>
                                      <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file.fileUrl, file.fileName)}>
                                        <Eye className="mr-1.5 h-3.5 w-3.5" />
                                        Open File
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs italic text-muted-foreground/60">No documents uploaded yet.</p>
                              )}
                            </div>

                            {/* Submit / Resubmit */}
                            {isSubmittable && (
                              <div className="space-y-3 border-t border-border/40 pt-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`liq-note-${report.id}`}>
                                    {report.status === "needs_revision" ? "Message with resubmission" : "Message with submission"}
                                    <span className="ml-1 font-normal text-muted-foreground">(optional)</span>
                                  </Label>
                                  <Textarea
                                    id={`liq-note-${report.id}`}
                                    value={noteValue}
                                    onChange={(e) =>
                                      setLiquidationNotesByReportId((prev) => ({ ...prev, [report.id]: e.target.value }))
                                    }
                                    placeholder={
                                      report.status === "needs_revision"
                                        ? "Briefly explain what you changed or clarify anything for the admin."
                                        : "Add any notes for the admin about your submission."
                                    }
                                    rows={3}
                                    className="resize-none text-sm"
                                    disabled={isSubmitting}
                                  />
                                </div>
                                <Button
                                  type="button"
                                  size="sm"
                                  onClick={() => void handleSubmitLiquidation(report)}
                                  disabled={isSubmitting}
                                >
                                  {isSubmitting ? (
                                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                                  ) : report.status === "needs_revision" ? (
                                    "Resubmit for Review"
                                  ) : (
                                    "Submit for Review"
                                  )}
                                </Button>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  });
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
        const publishedReleases = state.newsReleases.filter((n) => n.visibilityStatus === "published");
        const isRecentRelease = (datePosted: string) => {
          const diffDays = (Date.now() - new Date(datePosted).getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        };
        return (
          <PortalSection
            title="News Releases"
            description="Official announcements and updates from LYDO. Click any card to preview the source Facebook post."
          >
            {publishedReleases.length ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {publishedReleases.map((news) => (
                  <Link
                    key={news.id}
                    to={`/news-releases/${news.id}`}
                    className="group flex flex-col overflow-hidden rounded-2xl border border-border/70 bg-card transition-shadow hover:shadow-md"
                  >
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-medium text-muted-foreground">
                          {new Date(news.datePosted).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                        {isRecentRelease(news.datePosted) && (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                            New
                          </span>
                        )}
                      </div>
                      <p className="mt-2.5 line-clamp-2 text-base font-semibold leading-snug group-hover:text-primary">
                        {news.title}
                      </p>
                      <p className="mt-2 flex-1 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
                        {news.description}
                      </p>
                      <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
                        <span className="text-sm font-medium text-primary">View Announcement</span>
                        <ArrowRight className="h-4 w-4 text-primary/60 transition-transform group-hover:translate-x-0.5" />
                      </div>
                    </div>
                  </Link>
                ))}
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
                    <Button variant="ghost" size="sm" onClick={markAllNotificationsRead} className="shrink-0 text-xs">
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
                          onClick={() => markNotificationRead(notification.id)}
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
                        <p className="text-sm text-muted-foreground">
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
          const fileUrl = state.ypopFiles.find((f) => f.id === fileId)?.fileUrl ?? "";
          void deleteYpopFileFromSupabase(fileId, fileUrl).catch(() => {});
          deleteYPOPFile(fileId);
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
          const thresholdPct = entry.totalPoints > 0 ? Math.round((entry.pointsRequired / entry.totalPoints) * 100) : 70;
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
                    <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
                      <Medal className="h-4 w-4" />
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

                {/* Draft / Needs Revision — step flow */}
                {(isDraft || isNeedsRevision) && (
                  <>
                    {isNeedsRevision && entry.adminRemarks.trim() && (
                      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-3">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-amber-600">Revision Required</p>
                        <p className="text-sm text-amber-800">{entry.adminRemarks}</p>
                      </div>
                    )}

                    <div className="space-y-4">
                      {/* Step 1 — Attach files */}
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
                                      <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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

                      {/* Step 2 — Add message */}
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
                            placeholder="Any notes for the admin reviewing your participation records…"
                            rows={2}
                            className="resize-none text-sm"
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>

                      {/* Step 3 — Submit */}
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
                              <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                            ) : "Submit for Validation"}
                          </Button>
                          {files.length === 0 && (
                            <p className="text-xs text-muted-foreground">Attach at least one file before submitting.</p>
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
                                  {rev.adminRemarks && <span className="ml-1 text-muted-foreground">— {rev.adminRemarks}</span>}
                                  <span className="ml-1 text-muted-foreground/60">· {new Date(rev.changedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Submitted / Under Review — quiet state */}
                {isSubmitted && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                      Submitted — awaiting admin review.
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

                {/* Qualified — score + PPA action */}
                {isQualified && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Participation score</span>
                        <span className="font-semibold text-green-700">{entry.pointsEarned} / {entry.totalPoints} pts</span>
                      </div>
                      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(pctEarned, 100)}%` }} />
                        <div className="absolute top-0 h-full w-0.5 bg-foreground/30" style={{ left: `${thresholdPct}%` }} />
                      </div>
                    </div>
                    <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-green-100 p-1.5 text-green-600">
                          <Trophy className="h-4 w-4" />
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
                              <Trophy className="h-3.5 w-3.5" />
                              Budget request already submitted ✓
                            </div>
                          ) : (
                            <Button
                              type="button"
                              size="sm"
                              className="bg-green-600 text-white hover:bg-green-700"
                              onClick={() => navigate(`${userRouteMap["budget-request"]}?ypopEntryId=${entry.id}&semesterLabel=${encodeURIComponent(entry.semesterLabel)}`)}
                            >
                              <Trophy className="mr-2 h-4 w-4" />
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

                {/* Not Qualified — result + context */}
                {isNotQualified && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Participation score</span>
                        <span className="font-semibold text-destructive">{entry.pointsEarned} / {entry.totalPoints} pts</span>
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
          const validatedDate = entry.validatedAt
            ? new Date(entry.validatedAt).toLocaleDateString("en-PH", { month: "short", year: "numeric" })
            : null;

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
                    <Medal className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium leading-snug">{entry.semesterLabel}</p>
                      {validatedDate && (
                        <p className="text-xs text-muted-foreground">Validated {validatedDate}</p>
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
                          <Trophy className="h-3 w-3" />
                          PPA filed ✓
                        </div>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          className="h-7 bg-green-600 px-2.5 text-xs text-white hover:bg-green-700"
                          onClick={(e) => { e.stopPropagation(); navigate(`${userRouteMap["budget-request"]}?ypopEntryId=${entry.id}&semesterLabel=${encodeURIComponent(entry.semesterLabel)}`); }}
                        >
                          <Trophy className="mr-1 h-3 w-3" />
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
          const thresholdPct = activeEntry.totalPoints > 0 ? Math.round((activeEntry.pointsRequired / activeEntry.totalPoints) * 100) : 70;
          const deadline = activeEntry.validationDeadline ? new Date(activeEntry.validationDeadline) : null;
          const isDeadlinePast = deadline ? deadline < new Date() : false;
          const hasLinkedBudgetRequest = budgetRequests.some(
            (r) => r.ypopEntryId === activeEntry.id && r.budgetRequestType === "ypop_incentive"
          );
          const revHistory = activeEntry.revisionHistory ?? [];

          const revHistoryForLog = revHistory.filter(
            (r) => !(r.action === "submitted" && activeEntry.submittedAt)
          );
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
          ];

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

                  {/* LEFT — metadata + actions */}
                  <div className="space-y-5">

                    {/* Admin Remarks — needs_revision */}
                    {activeEntry.status === "needs_revision" && activeEntry.adminRemarks.trim() && (
                      <div className="rounded-lg border border-amber-200/70 bg-amber-50/50 p-4">
                        <p className="mb-1 text-sm font-semibold text-amber-700">Revision Required</p>
                        <p className="text-sm text-amber-800">{activeEntry.adminRemarks}</p>
                      </div>
                    )}

                    {/* Quiet state — submitted / under review */}
                    {isSubmittedOrReview && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-500" />
                        Submitted — awaiting admin review.
                      </div>
                    )}

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
                          placeholder="Any notes for the admin reviewing your participation records…"
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
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Participation score</span>
                            <span className={`font-semibold ${isQualified ? "text-green-700" : "text-destructive"}`}>
                              {activeEntry.pointsEarned} / {activeEntry.totalPoints} pts
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
                            {thresholdPct}% threshold ({activeEntry.pointsRequired}/{activeEntry.totalPoints} pts) required to qualify
                          </p>
                        </div>
                        {isQualified && (
                          <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
                            <div className="flex items-start gap-3">
                              <div className="rounded-full bg-green-100 p-1.5 text-green-600">
                                <Trophy className="h-4 w-4" />
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
                                    <Trophy className="h-3.5 w-3.5" />
                                    Budget request already submitted ✓
                                  </div>
                                ) : (
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="bg-green-600 text-white hover:bg-green-700"
                                    onClick={() => navigate(`${userRouteMap["budget-request"]}?ypopEntryId=${activeEntry.id}&semesterLabel=${encodeURIComponent(activeEntry.semesterLabel)}`)}
                                  >
                                    <Trophy className="mr-2 h-4 w-4" />
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
                              {item.note && <span className="ml-1 text-muted-foreground">— {item.note}</span>}
                              <span className="ml-1.5 text-xs text-muted-foreground/70">
                                {new Date(item.date).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
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
                          disabled={isSubmitting || detailFiles.length === 0}
                        >
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Submitting…</>
                          ) : activeEntry.status === "needs_revision" ? "Resubmit for Validation" : "Submit for Validation"}
                        </Button>
                      </div>
                    )}

                  </div>

                  {/* RIGHT — proof documents + tall preview */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">Proof Documents</p>
                      {isDraftOrRevision && (
                        <>
                          <input
                            ref={ypopFileInputRef}
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) void handleYpopFileUpload(activeEntry.id, file);
                              e.target.value = "";
                            }}
                          />
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
                        </>
                      )}
                    </div>

                    {detailFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {detailFiles.map((f: YPOPFile) => (
                          <div key={f.id} className="flex items-center gap-0.5">
                            <Button
                              type="button"
                              size="sm"
                              variant={ypopPreviewFileId === f.id ? "default" : "outline"}
                              className="max-w-[14rem]"
                              onClick={() => {
                                if (ypopPreviewFileId === f.id) {
                                  setYpopPreviewFileId(null);
                                } else {
                                  setYpopPreviewFileId(f.id);
                                  setYpopPreviewUrl(f.fileUrl);
                                  setYpopPreviewTitle(f.fileName);
                                  setYpopPreviewCanInline(!!f.fileUrl);
                                }
                              }}
                            >
                              <FileText className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{f.fileName}</span>
                            </Button>
                            {isDraftOrRevision && (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  handleDeleteYpopFile(f.id);
                                  if (ypopPreviewFileId === f.id) setYpopPreviewFileId(null);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        ))}
                        {isDraftOrRevision && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isUploading}
                            onClick={() => ypopFileInputRef.current?.click()}
                          >
                            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileUp className="h-3.5 w-3.5" />}
                            <span className="ml-1.5">Add another</span>
                          </Button>
                        )}
                      </div>
                    )}

                    {/* Preview area — always tall */}
                    <div className="overflow-hidden rounded-xl border border-border/70 bg-muted/10">
                      {detailFiles.length === 0 ? (
                        <div className="flex min-h-[32rem] items-center justify-center p-6 text-sm text-muted-foreground">
                          {isDraftOrRevision ? "Attach proof documents to preview them here." : "No files attached."}
                        </div>
                      ) : ypopPreviewFileId === null ? (
                        <div className="flex min-h-[32rem] items-center justify-center p-4 text-sm text-muted-foreground">
                          Select a file above to preview it here.
                        </div>
                      ) : ypopPreviewUrl && ypopPreviewCanInline ? (
                        isImagePreviewFile(ypopPreviewTitle) || isImagePreviewFile(ypopPreviewUrl) ? (
                          <div className="flex max-h-[52rem] items-center justify-center overflow-hidden bg-background sm:max-h-[60rem]">
                            <img src={ypopPreviewUrl} alt={ypopPreviewTitle} className="max-h-[52rem] w-full object-contain sm:max-h-[60rem]" />
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
                        <div className="flex min-h-[6rem] flex-col items-start gap-3 p-4 text-sm text-muted-foreground">
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

                  </div>
                </div>

              </div>
            </PortalSection>
          );
        }

        // List view
        return (
          <PortalSection
            title="YPOP Incentive"
            description="Submit proof of participation for admin validation. Qualifying organizations (70% of activities) unlock a Project Grant (PPA) budget request."
          >
            <div className="space-y-8">
              {/* Section A: Open Semesters */}
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">Open Semesters</p>
                {openPeriods.length === 0 ? (
                  <PortalEmptyState
                    title="No open semesters right now"
                    description="Check back when the next YPOP registration period opens."
                  />
                ) : (
                  <div className="space-y-4">
                    {openPeriods.map((period) => {
                      const existing = activeEntries.find((e) => e.semester === period.semesterKey);
                      const deadlineDate = period.validationDeadline ? new Date(period.validationDeadline) : null;
                      if (existing) {
                        const existingFiles = ypopFilesByEntryId.get(existing.id) ?? [];
                        return (
                          <Card key={period.id} className="border-border/70">
                            <CardContent className="p-5 sm:p-6">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                                    <Medal className="h-4 w-4" />
                                  </div>
                                  <div>
                                    <p className="font-semibold leading-snug">{period.semesterLabel}</p>
                                    {deadlineDate && (
                                      <p className="text-xs text-muted-foreground">
                                        Validation closes {deadlineDate.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                                      </p>
                                    )}
                                    <p className="mt-0.5 text-xs text-muted-foreground">
                                      {existingFiles.length} {existingFiles.length === 1 ? "file" : "files"} attached
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <PortalStatusBadge status={existing.status} />
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
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      }
                      return (
                        <Card key={period.id} className="border-border/70">
                          <CardContent className="p-5 sm:p-6">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div className="rounded-full bg-muted p-1.5 text-muted-foreground">
                                  <Medal className="h-4 w-4" />
                                </div>
                                <div>
                                  <p className="font-semibold leading-snug">{period.semesterLabel}</p>
                                  <p className="text-xs text-muted-foreground">YPOP Participation Validation</p>
                                  {deadlineDate && (
                                    <p className="text-xs text-muted-foreground">
                                      Validation closes {deadlineDate.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => void handleStartYpopSubmission(period)}
                              >
                                Register
                                <ChevronRight className="ml-1.5 h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
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
    markAllNotificationsRead,
    markNotificationRead,
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
    state.templates,
    state.transparencyPosts,
    startEditingBudgetRequest,
    submission?.id,
    submission?.status,
    subClassificationOptions,
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
    state.ypopEntries,
    state.ypopFiles,
    ypopNotesByEntryId,
    setYpopNotesByEntryId,
    submittingYpopId,
    ypopUploadingId,
    ypopFileInputRef,
    updateYPOPEntry,
    createYPOPEntry,
    createYPOPFile,
    deleteYPOPFile,
    deleteYPOPEntry,
    searchParams,
    state.ypopPeriods,
    state.ypopFiles,
    createYpopEntryInSupabase,
    updateYpopEntryInSupabase,
    uploadYpopFileToSupabase,
    deleteYpopFileFromSupabase,
    deleteYpopEntryFromSupabase,
  ]);

  return (
    <>
      <UserPortalShell
        title={user?.displayName ?? "Organization Portal"}
        subtitle="Organization User"
        userDisplayName={user?.displayName}
        userEmail={user?.email}
        notifications={userNotifications}
        onMarkAllRead={markAllNotificationsRead}
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
                      <p className="text-xs text-muted-foreground">
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
                                    <p className="text-xs text-muted-foreground">
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
                                                  deleteEditableOcrField(field);
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
                                            <p className="text-xs text-muted-foreground">
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
                                                  <Button type="button" size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteEditableOcrTableRow(table.id, row.id)}>
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
                    ? `Uploaded ${new Date(attachedDocumentEditor.file.uploadedAt).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}`
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
                  disabled={Boolean(savingAttachedDocument) || isApprovedSubmissionFile(attachedDocumentEditor?.file)}
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
                  disabled={Boolean(savingAttachedDocument) || isApprovedSubmissionFile(attachedDocumentEditor?.file)}
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
                  disabled={Boolean(savingAttachedDocument) || isApprovedSubmissionFile(attachedDocumentEditor?.file)}
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
