import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  Eye,
  FileUp,
  Loader2,
  MessageCircle,
  Sparkles,
  Trash2,
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
  type SubmissionFile,
  statusLabelMap,
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
    organizationName: profile.organizationName.trim() || blank.organizationName,
    organizationEmail: profile.organizationEmail.trim() || blank.organizationEmail,
    contactNumber: profile.contactNumber.trim() || blank.contactNumber,
    district: profile.district.trim() || blank.district,
    barangay: profile.barangay.trim() || blank.barangay,
    isExistingOrganization: Boolean(profile.isExistingOrganization),
    organizationIdentifierNumber: profile.organizationIdentifierNumber.trim() || blank.organizationIdentifierNumber,
    advocacies: [...profile.advocacies],
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
    createNotification,
    markNotificationRead,
  } = useLydoConnect();
  const [scanningDocumentId, setScanningDocumentId] = useState<string | null>(null);
  const [submittingDocumentId, setSubmittingDocumentId] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [ocrPreviewOpen, setOcrPreviewOpen] = useState(false);
  const [documentReviewNote, setDocumentReviewNote] = useState<{ title: string; note: string; status: "needs_revision" | "rejected_red" } | null>(null);
  const [budgetReviewNote, setBudgetReviewNote] = useState<{ title: string; note: string; status: BudgetRequestStatus } | null>(null);
  const [liquidationReviewNote, setLiquidationReviewNote] = useState<{
    title: string;
    note: string;
    status: LiquidationStatus;
  } | null>(null);
  const [budgetRequestLockedModalOpen, setBudgetRequestLockedModalOpen] = useState(false);
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
  const [pendingDocumentRemoval, setPendingDocumentRemoval] = useState<{
    fileId: string;
    fileName: string;
    documentTypeName: string;
  } | null>(null);
  const [removingDocumentId, setRemovingDocumentId] = useState<string | null>(null);
  const [savingBudgetRequest, setSavingBudgetRequest] = useState(false);
  const [budgetFileDraft, setBudgetFileDraft] = useState<File | null>(null);
  const [budgetFormMobileOpen, setBudgetFormMobileOpen] = useState(false);
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
      setBudgetFormMobileOpen(false);
    }
  }, [section]);

  useEffect(() => {
    const isBudgetRequestLocked = section === "budget-request" && currentProfile?.profileStatus !== "verified";
    setBudgetRequestLockedModalOpen(isBudgetRequestLocked);
  }, [currentProfile?.profileStatus, section]);

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
  const submission = state.documentSubmissions[0] ?? null;
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

  const activeContent = useMemo(() => {
    switch (section) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <PortalMetricCard label="Profile" value={`${profilePercent}%`} helper={formatStatusLabel(profile.profileStatus)} />
              <PortalMetricCard label="Documents" value={`${documentsPercent}%`} helper={`${completedDocs}/${templateDocuments.length} checked`} />
              <PortalMetricCard label="Budget" value={`${budgetPercent}%`} helper={formatStatusLabel(latestBudget?.status ?? "draft")} />
              <PortalMetricCard
                label="Liquidation"
                value={`${liquidationPercent}%`}
                helper={formatStatusLabel(latestLiquidation?.status ?? "pending_activity_completion")}
              />
            </div>

            <PortalSection
              title="Quick Actions"
              description="Move through the organization compliance workflow."
              action={<Sparkles className="h-5 w-5 text-primary" />}
            >
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {[
                  ["document-submission", "Submit Documents"],
                  ["budget-request", "Request Budget"],
                  ["liquidation-reporting", "Submit Liquidation"],
                  ["compliance-status", "View Compliance"],
                  ["news-releases", "View News"],
                ].map(([id, label]) => (
                  <Button key={id} type="button" variant="outline" className="w-full justify-between" onClick={() => navigate(userRouteMap[id])}>
                    <span>{label}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </PortalSection>

            <PortalSection title="Compliance Summary" description="A quick look at the organization standing.">
              <div className="grid gap-3 md:grid-cols-2">
                <Card className="bg-muted/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Next Action Needed</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                      <p>{submission?.status === "under_admin_review" ? "Wait for admin review remarks." : "Complete the remaining required documents."}</p>
                    <p>
                      {latestBudget?.status === "budget_released"
                        ? "Your budget has been released. You can now submit liquidation."
                        : latestBudget?.status === "hard_copy_submitted"
                          ? "Hard copy received. Wait for cash release before liquidation unlocks."
                          : latestBudget?.status === "approved_for_ftf_green"
                            ? "Prepare hard copies for face-to-face submission."
                            : latestBudget
                              ? "Budget request is ready for administrative review."
                              : "Create your first budget request to start the review flow."}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-muted/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Recent Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>Profile</span>
                      <PortalStatusBadge status={profile.profileStatus} />
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>Documents</span>
                      {submission ? <PortalStatusBadge status={submission.status} /> : <span className="text-muted-foreground">No submission yet</span>}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>Budget</span>
                      {latestBudget ? <PortalStatusBadge status={latestBudget.status} /> : <span className="text-muted-foreground">No request yet</span>}
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span>Liquidation</span>
                      {latestLiquidation ? <PortalStatusBadge status={latestLiquidation.status} /> : <span className="text-muted-foreground">Locked</span>}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </PortalSection>

            <PortalSection title="Pending Notifications" description="Important admin messages and workflow updates.">
              {unreadNotifications.length ? (
                <div className="space-y-3">
                  {unreadNotifications.slice(0, 3).map((notification) => (
                    <button
                      key={notification.id}
                      type="button"
                      className="w-full rounded-xl border border-border/70 bg-background p-4 text-left transition-colors hover:bg-muted/40"
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{notification.title}</p>
                        <PortalStatusBadge status={notification.type === "overdue" ? "overdue" : "under_review"} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                    </button>
                  ))}
                </div>
              ) : (
                <PortalEmptyState
                  title="No unread notifications"
                  description="You are all caught up."
                  action={
                    <Button variant="outline" onClick={() => navigate(userRouteMap.notifications)}>
                      View all notifications
                    </Button>
                  }
                />
              )}
            </PortalSection>
          </div>
        );
      case "organization-profile":
        return (
          <PortalSection
            title="Organization Profile Setup"
            description="Review the organization profile linked to your account. Core registration details are pulled from signup and locked in."
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
      case "document-submission":
        return (
          <div className="space-y-6">
            <PortalSection
              title="Document Submission"
              description="Upload each required file, review the extracted details, and submit only after the required fields are checked."
            >
              <div className="grid gap-4">
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
                  const hasAdminReviewNote = file?.adminStatus === "needs_revision" || file?.adminStatus === "rejected_red";
                  return (
                    <Card key={documentType.id} className="border-border/70">
                      <CardContent className="grid gap-4 p-4 sm:p-5 md:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)] md:items-start">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                            <p className="min-w-0 break-words font-medium leading-snug">{documentType.name}</p>
                            {fileBadgeStatus ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <PortalStatusBadge status={fileBadgeStatus} />
                                {hasAdminReviewNote ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-xs text-primary hover:text-primary"
                                    onClick={() =>
                                      setDocumentReviewNote({
                                        title: documentType.name,
                                        note: file?.adminRemarks?.trim() || "No comment was provided.",
                                        status: fileBadgeStatus,
                                      })
                                    }
                                  >
                                    <MessageCircle className="mr-1.5 h-4 w-4" />
                                    Comment
                                  </Button>
                                ) : null}
                              </div>
                            ) : file ? null : (
                              <span className="text-xs text-muted-foreground">No file uploaded yet</span>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{documentType.description}</p>
                          <p className="text-xs text-muted-foreground">Primary file type: {getDocumentPrimaryFileTypeLabel(documentType.id)}</p>
                          {!file ? (
                            <p className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
                              {getDocumentUploadHelpText(documentType.id)}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex min-w-0 flex-col gap-3 md:items-end">
                          <div className="flex flex-wrap gap-2 md:justify-end">
                            {hasUploadedTemplateFile(template?.templateFileUrl, template?.templateFileName) ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="w-full sm:w-auto"
                                  onClick={() => void openPreview(template.templateFileUrl, template.templateFileName || documentType.name)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Template
                                </Button>
                              </>
                            ) : (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="w-full sm:w-auto"
                                onClick={() => void openPreview(template?.templateFileUrl ?? "", template?.templateFileName || documentType.name)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Template
                              </Button>
                            )}
                          </div>

                          <label
                            className="w-full md:w-auto"
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
                              variant="secondary"
                              size="sm"
                              asChild
                              disabled={scanningDocumentId === documentType.id || submittingDocumentId === documentType.id}
                              className="w-full sm:w-auto"
                              onClick={(event) => {
                                if (file) {
                                  event.preventDefault();
                                  event.stopPropagation();
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

            <PortalSection
              title="Submission Flow"
              description="After you upload a file, a confirmation modal will ask if you want to submit it. Choose Yes to send it to LYDO."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">What happens next</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    Upload the required file, confirm the submission, and send the document for admin review.
                  </CardContent>
                </Card>
                <Card className="bg-muted/20">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Current state</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 text-sm text-muted-foreground">
                    {submission ? (
                      <p>{formatStatusLabel(submission.status)}</p>
                    ) : (
                      <p>No submission has been created yet. It will appear automatically after the first confirmed file upload.</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </PortalSection>
          </div>
        );
      case "budget-request":
        if (isBudgetRequestLocked) {
          return (
            <div className="space-y-6">
              <PortalSection
                title="Budget Request"
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
                    <div className="rounded-2xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                      Please wait for the admin to approve your registration before creating or submitting any budget requests.
                      Once your profile is verified, this page will become available automatically.
                    </div>
                    <Button type="button" onClick={() => navigate(userRouteMap["document-submission"])}>
                      <ArrowRight className="mr-2 h-4 w-4" />
                      Return to Document Submission
                    </Button>
                  </CardContent>
                </Card>
              </PortalSection>
            </div>
          );
        }
        return (
          <div className="space-y-6">
            <PortalSection
              title="Budget Request"
              description="Create, edit, delete, and submit allocation requests from one page."
              action={<PortalStatusBadge status={latestBudget?.status ?? "draft"} />}
            >
              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <Card className="border-border/70">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">
                        {budgetRequests.some((request) => request.id === budgetForm.id) ? "Edit Budget Request" : "New Budget Request"}
                      </CardTitle>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="md:hidden"
                        onClick={() => setBudgetFormMobileOpen((current) => !current)}
                      >
                        {budgetFormMobileOpen ? (
                          <>
                            <ChevronUp className="mr-2 h-4 w-4" />
                            Hide Fields
                          </>
                        ) : (
                          <>
                            <ChevronDown className="mr-2 h-4 w-4" />
                            Show Fields
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className={`${budgetFormMobileOpen ? "block" : "hidden"} space-y-4 md:block`}>
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
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          PDF only. Upload the required budget document that contains the full breakdown and supporting details.
                        </p>
                        {budgetFileDraft ? <p className="text-xs text-foreground">Selected file: {budgetFileDraft.name}</p> : null}
                        {!budgetFileDraft && budgetRequestFilesByBudgetId.get(budgetForm.id) ? (
                          <p className="text-xs text-foreground">
                            Current file: {budgetRequestFilesByBudgetId.get(budgetForm.id)?.fileName}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button
                        type="button"
                        className="sm:w-auto"
                        disabled={savingBudgetRequest}
                        onClick={() => void saveBudgetRequest("draft")}
                      >
                        {savingBudgetRequest ? "Saving..." : "Save Draft"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="sm:w-auto"
                        disabled={savingBudgetRequest}
                        onClick={() => void saveBudgetRequest("submitted")}
                      >
                        Submit for Review
                      </Button>
                      <Button type="button" variant="ghost" className="sm:w-auto" onClick={resetBudgetForm}>
                        Reset
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <div className="space-y-4">
                  {budgetRequests.length ? (
                    budgetRequests.map((request) => {
                      const attachedFile = budgetRequestFilesByBudgetId.get(request.id);
                      return (
                        <Card key={request.id} className="border-border/70">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <CardTitle className="text-base">{request.activityTitle || "Untitled request"}</CardTitle>
                                <p className="mt-1 text-sm text-muted-foreground">{request.purposeCategory || "No category yet"}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                {request.remarks?.trim() ? (
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    className="h-8 px-2 text-xs text-primary hover:text-primary"
                                    onClick={() =>
                                      setBudgetReviewNote({
                                        title: request.activityTitle || "Budget Comment",
                                        note: request.remarks.trim(),
                                        status: request.status,
                                      })
                                    }
                                  >
                                    <MessageCircle className="mr-1.5 h-4 w-4" />
                                    Comment
                                  </Button>
                                ) : null}
                                <PortalStatusBadge status={request.status} />
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3 text-sm text-muted-foreground">
                            <p>{request.activityDescription || "No description provided yet."}</p>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <p>Proposed Date: {request.activityDate || "Pending"}</p>
                              <p>Venue: {request.venue || "Pending"}</p>
                              <p>Requested Amount: {formatCurrency(request.requestedAmount || 0)}</p>
                              <p>Approved Amount: {formatCurrency(request.approvedAmount || 0)}</p>
                            </div>
                            <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-xs">
                              {attachedFile ? (
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <span>{attachedFile.fileName}</span>
                                  <Button type="button" size="sm" variant="outline" onClick={() => void openFile(attachedFile.fileUrl, attachedFile.fileName)}>
                                    Open File
                                  </Button>
                                </div>
                              ) : (
                                <p>No detailed document uploaded yet.</p>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => startEditingBudgetRequest(request)}
                                disabled={savingBudgetRequest || approvedBudgetStatuses.has(request.status)}
                              >
                                Edit
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => handleDeleteBudgetRequest(request)}
                                disabled={savingBudgetRequest || approvedBudgetStatuses.has(request.status)}
                              >
                                Delete
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  ) : (
                    <PortalEmptyState
                      title="No budget requests yet"
                      description="Create the first request using the form on the left. Once cash is released, the liquidation page will unlock automatically."
                    />
                  )}
                </div>
              </div>
            </PortalSection>
          </div>
        );
      case "liquidation-reporting":
        return (
          <PortalSection
            title="Liquidation and Reporting"
            description="Post-activity documents appear only after cash has been released for the linked budget."
            action={<PortalStatusBadge status={latestLiquidation?.status ?? "pending_activity_completion"} />}
          >
            {liquidationReports.length ? (
              <div className="space-y-4">
                {liquidationReports.map((report) => {
                  const relatedBudget = budgetRequests.find((request) => request.id === report.budgetRequestId) ?? null;
                  const attachedFiles = liquidationFilesByReportId.get(report.id) ?? [];
                  const hasLiquidationReviewNote =
                    (report.status === "needs_revision" || report.status === "rejected_red") && report.remarks.trim().length > 0;
                  return (
                    <Card key={report.id} className="border-border/70">
                      <CardHeader>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <CardTitle className="text-base">{relatedBudget?.activityTitle || "Approved budget"}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {relatedBudget?.purposeCategory || "No category"} | {relatedBudget ? formatCurrency(relatedBudget.approvedAmount || relatedBudget.requestedAmount || 0) : "PHP 0"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            {hasLiquidationReviewNote ? (
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className="h-8 px-2 text-xs text-primary hover:text-primary"
                                onClick={() =>
                                  setLiquidationReviewNote({
                                    title: relatedBudget?.activityTitle || "Liquidation Comment",
                                    note: report.remarks.trim(),
                                    status: report.status,
                                  })
                                }
                              >
                                <MessageCircle className="mr-1.5 h-4 w-4" />
                                Comment
                              </Button>
                            ) : null}
                            <PortalStatusBadge status={report.status} />
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4 text-sm">
                        <div className="grid gap-3 md:grid-cols-2">
                          <Card className="bg-muted/20">
                            <CardContent className="p-4">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Go Signal Date</p>
                              <p className="mt-2 text-sm">{report.goSignalAt || "Pending"}</p>
                            </CardContent>
                          </Card>
                          <Card className="bg-muted/20">
                            <CardContent className="p-4">
                              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground/75">Deadline</p>
                              <p className="mt-2 text-sm">{report.deadlineAt || "Pending"}</p>
                            </CardContent>
                          </Card>
                        </div>
                        <div className="rounded-xl border border-border/70 bg-muted/20 p-4">
                          <Label htmlFor={`liquidation-upload-${report.id}`} className="text-sm font-medium text-foreground">
                            Upload post-activity documents
                          </Label>
                          <Input
                            id={`liquidation-upload-${report.id}`}
                            type="file"
                            multiple
                            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                            className="mt-2"
                            onChange={async (event) => {
                              await handleLiquidationFileUpload(report, event.target.files);
                              event.currentTarget.value = "";
                            }}
                          />
                          <p className="mt-2 text-xs text-muted-foreground">
                            Upload attendance sheets, photos, narrative reports, and other post-activity proof.
                          </p>
                        </div>
                        <div className="space-y-2">
                          <p className="font-medium text-foreground">Uploaded files</p>
                          {attachedFiles.length ? (
                            <div className="space-y-2">
                              {attachedFiles.map((file) => (
                                <div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 p-3">
                                  <div>
                                    <p className="font-medium text-foreground">{file.fileName}</p>
                                    <p className="text-xs text-muted-foreground">{file.fileType}</p>
                                  </div>
                                  <Button type="button" size="sm" variant="outline" onClick={() => void openFile(file.fileUrl, file.fileName)}>
                                    Open File
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No post-activity files uploaded yet.</p>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <PortalEmptyState
                title="No approved budget yet"
                description="Once the admin approves a budget request, its liquidation record will appear here for post-activity uploads."
              />
            )}
          </PortalSection>
        );
      case "news-releases":
        return (
          <PortalSection title="News Releases" description="Announcements and Facebook post previews.">
            <div className="grid gap-4 md:grid-cols-2">
              {state.newsReleases.map((news) => (
                <Link
                  key={news.id}
                  to={`/news-releases/${news.id}`}
                  className="group block rounded-2xl border border-border/70 bg-card p-5 transition-transform hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold group-hover:text-primary">{news.title}</p>
                      <p className="mt-2 text-sm text-muted-foreground">{news.description}</p>
                    </div>
                    <PortalStatusBadge status={news.visibilityStatus} />
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground/70">{news.datePosted}</p>
                  <p className="mt-2 text-sm font-medium text-primary">Click to preview the source post</p>
                </Link>
              ))}
            </div>
          </PortalSection>
        );
      case "compliance-status":
        return (
          <div className="space-y-6">
            <PortalSection title="Compliance Status" description="Your organization standing across all modules.">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <PortalMetricCard label="Profile" value={`${profilePercent}%`} />
                <PortalMetricCard label="Documents" value={`${documentsPercent}%`} />
                <PortalMetricCard label="Budget" value={formatStatusLabel(latestBudget?.status ?? "draft")} />
                <PortalMetricCard
                  label="Liquidation"
                  value={formatStatusLabel(latestLiquidation?.status ?? "pending_activity_completion")}
                />
              </div>
            </PortalSection>
            <PortalSection title="Missing Requirements" description="Items that need attention before you can move forward.">
              <ul className="space-y-3 text-sm text-muted-foreground">
                {docFiles.filter((file) => file.validationStatus !== "correct").map((file) => (
                  <li key={file.id} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
                    <span>{templatesById[file.documentTypeId]?.name ?? file.documentTypeId}</span>
                    <PortalStatusBadge status="needs_revision" />
                  </li>
                ))}
                {!docFiles.some((file) => file.validationStatus !== "correct") ? (
                  <li>
                    <PortalEmptyState title="All required documents are in good standing." description="No missing requirements detected." />
                  </li>
                ) : null}
              </ul>
            </PortalSection>
          </div>
        );
      case "notifications":
        return (
          <PortalSection title="Notifications" description="Admin remarks, go signals, revisions, and deadlines.">
            <div className="space-y-3">
              {userNotifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  className="w-full rounded-xl border border-border/70 bg-background p-4 text-left transition-colors hover:bg-muted/40"
                  onClick={() => markNotificationRead(notification.id)}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {!notification.isRead ? (
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-2.5 rounded-full bg-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.14)]"
                        />
                      ) : null}
                      <p className="font-medium">{notification.title}</p>
                    </div>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                </button>
              ))}
            </div>
          </PortalSection>
        );
      default:
        return (
          <PortalEmptyState
            title="Section not found"
            description="This portal section has not been configured yet."
            action={
              <Button variant="outline" onClick={() => navigate(userRouteMap.dashboard)}>
                Go to dashboard
              </Button>
                          }
                          required
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
  ]);

  return (
    <>
      <UserPortalShell
        title="Organization Portal"
        subtitle="Organization User"
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
        open={Boolean(documentReviewNote)}
        onOpenChange={(open) => {
          if (!open) setDocumentReviewNote(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{documentReviewNote?.title || "Admin Comment"}</DialogTitle>
            <DialogDescription>
              {documentReviewNote?.status === "needs_revision" ? "The admin requested changes for this submission." : "The admin rejected this submission."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
            {documentReviewNote?.note || "No comment was provided."}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setDocumentReviewNote(null)}>
              Close
            </Button>
          </DialogFooter>
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
        open={attachedDocumentEditorOpen}
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
              Review the uploaded file, change it if needed, or remove it before saving.
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
              <div className="space-y-2">
                <p className="text-sm font-semibold text-foreground">Actions</p>
                <p className="text-sm text-muted-foreground">
                  Choose a replacement file or remove the current upload, then save your changes.
                </p>
              </div>
              <div className="space-y-2 rounded-lg border border-border/70 bg-muted/20 p-3 text-sm">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Current file</p>
                <p className="break-all font-medium text-foreground">{attachedDocumentEditor?.file.fileName || "No file selected"}</p>
                <p className="text-xs text-muted-foreground">
                  {attachedDocumentEditor?.file.uploadedAt
                    ? `Uploaded ${new Date(attachedDocumentEditor.file.uploadedAt).toLocaleString()}`
                    : "Uploaded recently"}
                </p>
              </div>
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
                    Replacement selected: <span className="font-medium text-foreground">{attachedDocumentReplacementFile.name}</span>
                  </p>
                ) : null}
              </div>
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
                {attachedDocumentMarkedForRemoval ? "Undo Remove" : "Remove Uploaded Document"}
              </Button>
              {attachedDocumentMarkedForRemoval ? (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                  This file will be removed when you save changes.
                </div>
              ) : null}
              <div className="flex flex-col gap-2 pt-2 sm:flex-row">
                <Button
                  type="button"
                  className="w-full sm:flex-1"
                  onClick={() => void saveAttachedDocumentChanges()}
                  disabled={Boolean(savingAttachedDocument)}
                >
                  {savingAttachedDocument ? "Saving..." : "Save Changes"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full sm:flex-1"
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
      <Dialog
        open={Boolean(liquidationReviewNote)}
        onOpenChange={(open) => {
          if (!open) setLiquidationReviewNote(null);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{liquidationReviewNote?.title || "Liquidation Comment"}</DialogTitle>
            <DialogDescription>
              {liquidationReviewNote?.status === "needs_revision"
                ? "The admin requested changes for this liquidation report."
                : liquidationReviewNote?.status === "rejected_red"
                  ? "The admin rejected this liquidation report."
                  : "Admin remarks for this liquidation report."}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-foreground">
            {liquidationReviewNote?.note || "No comment was provided."}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => setLiquidationReviewNote(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={budgetRequestLockedModalOpen}
        onOpenChange={(open) => {
          setBudgetRequestLockedModalOpen(open);
          if (!open && isBudgetRequestLocked) {
            navigate(userRouteMap["document-submission"]);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Waiting for Admin Approval</DialogTitle>
            <DialogDescription>
              Your organization needs to be approved before the budget request page can be used.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
            Please wait for the admin to approve your registration. Once approved, you can return here to create and submit
            budget requests.
          </div>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              onClick={() => {
                setBudgetRequestLockedModalOpen(false);
                navigate(userRouteMap["document-submission"]);
              }}
            >
              Return to Document Submission
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget Request</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBudgetDelete
                ? `Delete budget request "${pendingBudgetDelete.activityTitle}"? This action cannot be undone.`
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
