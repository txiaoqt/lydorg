import React, { useState, useEffect, useMemo, useRef } from "react";
import JSZip from "jszip";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  Filter,
  FileText,
  FileUp,
  Layers,
  Loader2,
  Search,
  Sparkles,
  UploadCloud,
  Check,
  Info,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { PortalDocumentDrawer } from "@/components/portal/PortalDocumentDrawer";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EndorsementGuidelinesModal } from "@/components/portal/EndorsementGuidelinesModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";
import { resolveCleanTemplateDownloadFileName, type OrganizationProfile, type OrganizationRenewalRecord, type SubmissionFile, type TemplateRecord } from "@/lib/lydo-connect-data";
import type { UserFacingRenewalState } from "@/lib/organization-renewal";
import {
  formatRevisionDeadline,
  getRevisionTimeRemaining,
  isSubmissionRevisionLocked,
} from "@/lib/revision-deadline";
import {
  fetchRenewalPacketInSupabase,
  fetchRenewalRequiredDocumentTypesInSupabase,
  subscribeToRenewalSubmissionFileChangesInSupabase,
  userStartOrGetRenewalDraftInSupabase,
  uploadRenewalDocumentFileInSupabase,
  replaceRenewalDocumentFileInSupabase,
  resolveSupabaseFileUrl,
  userSubmitRenewalInSupabase,
  userSubmitAdditionalRenewalDocumentsInSupabase,
  userResubmitRenewalInSupabase,
} from "@/lib/lydo-connect-supabase";

export interface UserPortalRenewalWorkspaceViewProps {
  currentProfile: OrganizationProfile | null;
  userRenewalState: UserFacingRenewalState | null;
  activeRenewal: OrganizationRenewalRecord | null;
  renewalSyncVersion?: number;
  readOnly?: boolean;
  approvedRenewals?: OrganizationRenewalRecord[];
  onActiveRenewalChange?: (renewal: OrganizationRenewalRecord) => void;
  renewalActivityLogs?: RenewalActivityLog[];
  onRenewalRecentActivityModal?: (logs: RenewalActivityLog[]) => void;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  openPreview?: (fileUrl: string, title: string) => void | Promise<void>;
  openFile?: (fileUrl: string, downloadName?: string) => void;
  onRenewalUpdated?: (renewal: OrganizationRenewalRecord) => void;
}

export type RenewalActivityLog = {
  id: string;
  action: string;
  description?: string;
  relatedId: string;
  createdAt: string;
};

const isPdfFile = (file: File) => file.type === "application/pdf" && /\.pdf$/i.test(file.name);

// Match the registration batch limit without saturating the connection with PDFs.
const RENEWAL_UPLOAD_CONCURRENCY_LIMIT = 3;

const validatePdfUpload = async (file: File) => {
  if (!isPdfFile(file)) return "Only PDF files can be uploaded for this renewal submission.";
  if (!file.size) return "The selected PDF is empty.";
  if (file.size > 10 * 1024 * 1024) return "File size must not exceed 10MB.";

  try {
    const signature = new Uint8Array(await file.slice(0, 5).arrayBuffer());
    if (String.fromCharCode(...signature) !== "%PDF-") {
      return "This file does not appear to be a valid PDF.";
    }
  } catch {
    // If arrayBuffer cannot be read in test environment, continue
  }
  return null;
};

const formatFileSize = (bytes?: number | null) => {
  if (!bytes) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

type RenewalBatchFile = {
  id: string;
  file: File;
  documentTypeId: string;
  isValidating?: boolean;
  validationError?: string;
  uploadError?: string;
};

const createRenewalBatchFileId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `renewal-file-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const UserPortalRenewalWorkspaceView: React.FC<UserPortalRenewalWorkspaceViewProps> = ({
  currentProfile,
  userRenewalState,
  activeRenewal: initialActiveRenewal,
  renewalSyncVersion = 0,
  readOnly = false,
  approvedRenewals = [],
  onActiveRenewalChange,
  renewalActivityLogs = [],
  onRenewalRecentActivityModal,
  navigate,
  userRouteMap,
  openPreview,
  openFile,
  onRenewalUpdated,
}) => {
  const [activeRenewal, setActiveRenewal] = useState<OrganizationRenewalRecord | null>(initialActiveRenewal);
  const [loadingPacket, setLoadingPacket] = useState(false);
  const [packetError, setPacketError] = useState<string | null>(null);
  const [submission, setSubmission] = useState<any | null>(null);
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [requiredDocTypes, setRequiredDocTypes] = useState<TemplateRecord[]>([]);

  // Mutation and action states
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [bulkUploadConfirmOpen, setBulkUploadConfirmOpen] = useState(false);
  const [bulkUploadSubmitMode, setBulkUploadSubmitMode] = useState<"draft" | "submit">("submit");
  const [bulkUploadFiles, setBulkUploadFiles] = useState<RenewalBatchFile[]>([]);
  const [preferredRevisionDocumentTypeId, setPreferredRevisionDocumentTypeId] = useState<string | null>(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const bulkUploadingRef = useRef(false);
  const [downloadingAllTemplates, setDownloadingAllTemplates] = useState(false);
  const [openingPreviewKey, setOpeningPreviewKey] = useState<string | null>(null);
  const [attachedRenewalPreview, setAttachedRenewalPreview] = useState<{
    documentTypeId: string;
    documentTypeName: string;
    file: SubmissionFile;
    previewUrl: string;
  } | null>(null);
  const [downloadingRenewalAttachment, setDownloadingRenewalAttachment] = useState(false);
  const [endorsementModalOpen, setEndorsementModalOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "review" | "revision">("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "name" | "updated">("newest");

  // Hidden File Input Trigger State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    docTypeId: string;
  } | null>(null);

  // Keep internal activeRenewal synced with prop changes
  useEffect(() => {
    setActiveRenewal(initialActiveRenewal);
  }, [initialActiveRenewal]);

  // Load packet and required document types
  useEffect(() => {
    if (!activeRenewal?.id) {
      // If no active renewal, load template requirements anyway for display
      fetchRenewalRequiredDocumentTypesInSupabase()
        .then((types) => setRequiredDocTypes(types))
        .catch((err) => console.warn("Could not load template types:", err));
      setSubmission(null);
      setFiles([]);
      setLoadingPacket(false);
      return;
    }

    let cancelled = false;
    setLoadingPacket(true);
    setPacketError(null);

    Promise.all([
      fetchRenewalRequiredDocumentTypesInSupabase(),
      fetchRenewalPacketInSupabase(activeRenewal.id),
    ])
      .then(([types, packet]) => {
        if (!cancelled) {
          setRequiredDocTypes(types);
          setSubmission(packet.submission);
          setFiles(packet.files);
          setLoadingPacket(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error("Failed to load renewal packet:", err);
          setPacketError(err?.message || "Failed to load renewal documents.");
          setLoadingPacket(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [activeRenewal?.id]);

  useEffect(() => {
    const submissionId = submission?.id;
    const renewalId = activeRenewal?.id;
    if (!submissionId || !renewalId) return;
    let cancelled = false;
    let refreshInProgress = false;
    let timer: number | null = null;
    const refreshPacketMetadata = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        timer = null;
        if (cancelled || refreshInProgress || bulkUploadingRef.current) return;
        refreshInProgress = true;
        try {
          const packet = await fetchRenewalPacketInSupabase(renewalId);
          if (!cancelled && !bulkUploadingRef.current) {
            setSubmission(packet.submission);
            setFiles(packet.files);
          }
        } catch (error) {
          if (!cancelled && import.meta.env.DEV) console.warn("Could not refresh renewal file review status:", error);
        } finally {
          refreshInProgress = false;
        }
      }, 60);
    };
    const unsubscribe = subscribeToRenewalSubmissionFileChangesInSupabase(submissionId, refreshPacketMetadata, (status, error) => {
      if (import.meta.env.DEV && status === "SUBSCRIBED") console.debug("Organization renewal file-status channel subscribed.");
      else if (import.meta.env.DEV && ["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status)) console.warn("Organization renewal file-status channel:", status, error ?? "");
    });
    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      unsubscribe();
    };
  }, [activeRenewal?.id, submission?.id]);

  // The parent owns the single organization-scoped renewal channel. A changed
  // version refreshes only this open packet's database metadata.
  useEffect(() => {
    const renewalId = activeRenewal?.id;
    if (!renewalId || renewalSyncVersion === 0) return;
    let cancelled = false;
    let refreshInProgress = false;
    const timeout = window.setTimeout(async () => {
      if (cancelled || refreshInProgress || bulkUploadingRef.current) return;
      refreshInProgress = true;
      try {
        const packet = await fetchRenewalPacketInSupabase(renewalId);
        if (!cancelled && !bulkUploadingRef.current) {
          setSubmission(packet.submission);
          setFiles(packet.files);
        }
      } catch (error) {
        if (import.meta.env.DEV) console.warn("Could not refresh renewal review updates:", error);
      }
      finally { refreshInProgress = false; }
    }, 75);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [activeRenewal?.id, renewalSyncVersion]);

  const orgName = currentProfile?.organizationName || "Organization";
  const cycleNumber = activeRenewal?.cycleNumber ?? userRenewalState?.cycleNumber ?? 2;
  const cycleActivityLogs = useMemo(() => {
    const logs = renewalActivityLogs
      .filter((log) => log.relatedId === activeRenewal?.id)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
    if (!logs.some((log) => log.action === "renewal_submitted") && activeRenewal?.submittedAt) {
      logs.push({
        id: `renewal-submitted-${activeRenewal.id}`,
        action: "renewal_submitted",
        description: `Renewal application submitted for Cycle ${activeRenewal.cycleNumber}.`,
        relatedId: activeRenewal.id,
        createdAt: activeRenewal.submittedAt,
      });
    }
    if (activeRenewal?.status === "approved" && !logs.some((log) => log.action === "renewal_approved") && activeRenewal.reviewedAt) {
      logs.push({
        id: `renewal-approved-${activeRenewal.id}`,
        action: "renewal_approved",
        description: `Renewal application approved for Cycle ${activeRenewal.cycleNumber}.`,
        relatedId: activeRenewal.id,
        createdAt: activeRenewal.reviewedAt,
      });
    }
    return logs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }, [activeRenewal, renewalActivityLogs]);
  const renewalActivityTitle = (log: RenewalActivityLog) => {
    switch (log.action) {
      case "renewal_submitted": return "Renewal Application Submitted";
      case "renewal_resubmitted": return "Renewal Application Resubmitted";
      case "renewal_documents_submitted": return "Renewal Documents Submitted";
      case "renewal_needs_revision": return "Renewal Revision Requested";
      case "renewal_rejected": return "Renewal Rejected";
      case "renewal_approved": return "Renewal Approved";
      default: return log.description || "Renewal Activity";
    }
  };
  const normalizeRequirementName = (value: string) =>
    value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "");

  // Map file by document type ID
  const filesByDocTypeId = useMemo(() => {
    const map = new Map<string, SubmissionFile>();
    files.forEach((file) => {
      if (file.documentTypeId) {
        map.set(file.documentTypeId, file);
      }
      if (file.documentTypeName) {
        map.set(`name:${normalizeRequirementName(file.documentTypeName)}`, file);
      }
    });
    return map;
  }, [files]);

  // File lookup helper
  const getFileForDoc = (doc: TemplateRecord): SubmissionFile | null => {
    return (
      filesByDocTypeId.get(doc.id) ||
      filesByDocTypeId.get(doc.databaseId) ||
      filesByDocTypeId.get(`name:${normalizeRequirementName(doc.name)}`) ||
      null
    );
  };

  // Completion calculation
  const totalMandatoryCount = requiredDocTypes.length;
  const uploadedFilesCount = useMemo(() => {
    return requiredDocTypes.filter((doc) => Boolean(getFileForDoc(doc)?.fileUrl)).length;
  }, [requiredDocTypes, filesByDocTypeId]);

  const approvedFilesCount = useMemo(() => {
    return requiredDocTypes.filter((doc) => {
      const file = getFileForDoc(doc);
      return file?.adminStatus === "approved" || file?.adminStatus === "approved_green";
    }).length;
  }, [requiredDocTypes, filesByDocTypeId]);

  const reviewFilesCount = useMemo(() => {
    return requiredDocTypes.filter((doc) => {
      const status = getFileForDoc(doc)?.adminStatus;
      return status === "submitted" || status === "under_review" || status === "under_admin_review" || status === "ready_for_review";
    }).length;
  }, [requiredDocTypes, filesByDocTypeId]);

  const unresolvedFlaggedCount = useMemo(() => {
    return files.filter(
      (f) => f.adminStatus === "needs_revision" || f.adminStatus === "rejected_red" || f.adminStatus === "rejected",
    ).length;
  }, [files]);

  const revisionNotices = useMemo(() => requiredDocTypes.flatMap((doc) => {
    const file = getFileForDoc(doc);
    if (file?.adminStatus !== "needs_revision") return [];
    const dueAt = file.revisionDueAt || null;
    const isUnlocked = Boolean(file.revisionUnlockedAt);
    const isLocked = isSubmissionRevisionLocked(file);
    return [{
      id: file.id || doc.id,
      documentTypeId: doc.id,
      title: doc.name,
      adminRemarks: file.adminRemarks?.trim() || "",
      deadline: formatRevisionDeadline(dueAt),
      isUnlocked,
      isLocked,
      remaining: dueAt ? getRevisionTimeRemaining(dueAt, undefined, isUnlocked) : null,
    }];
  }), [requiredDocTypes, filesByDocTypeId]);

  const isRenewalRevisionLocked = useMemo(() => {
    if (activeRenewal?.status !== "needs_revision") return false;
    return isSubmissionRevisionLocked(activeRenewal);
  }, [activeRenewal]);

  const bulkAssignableDocTypes = useMemo(() => {
    if (!activeRenewal) return userRenewalState?.canStartRenewal ? requiredDocTypes : [];
    if (activeRenewal.status === "draft") return requiredDocTypes;
    if (!activeRenewal || !["needs_revision", "under_review", "submitted", "resubmitted"].includes(activeRenewal.status)) return [];
    if (activeRenewal.status === "needs_revision" && isRenewalRevisionLocked) return [];
    const isOpenForRevision = (file: SubmissionFile | null) => Boolean(
      file &&
        ["needs_revision", "rejected_red", "rejected"].includes(file.adminStatus) &&
        !isSubmissionRevisionLocked(file),
    );
    if (["under_review", "submitted", "resubmitted"].includes(activeRenewal.status)) {
      return requiredDocTypes.filter((doc) => {
        const file = getFileForDoc(doc);
        return !file?.fileUrl || file.adminStatus === "draft" || isOpenForRevision(file);
      });
    }
    return requiredDocTypes.filter((doc) => {
      const file = getFileForDoc(doc);
      return isOpenForRevision(file);
    });
  }, [activeRenewal, filesByDocTypeId, isRenewalRevisionLocked, requiredDocTypes, userRenewalState?.canStartRenewal]);

  const canCorrectFlaggedFiles = Boolean(
    activeRenewal &&
      ["needs_revision", "under_review", "submitted", "resubmitted"].includes(activeRenewal.status) &&
      (activeRenewal.status !== "needs_revision" || !isRenewalRevisionLocked),
  );

  const isBulkUploadReady = useMemo(() => {
    if (!bulkUploadFiles.length) return false;
    const assignedIds = bulkUploadFiles.map((entry) => entry.documentTypeId).filter(Boolean);
    return (
      bulkUploadFiles.every((entry) => !entry.validationError && !entry.isValidating && Boolean(entry.documentTypeId)) &&
      new Set(assignedIds).size === bulkUploadFiles.length &&
      bulkUploadFiles.every((entry) => {
        const docType = requiredDocTypes.find((doc) => doc.id === entry.documentTypeId);
        if (!docType) return false;
        const existing = getFileForDoc(docType);
        return !existing || !["approved", "approved_green", "submitted", "under_review", "under_admin_review", "ready_for_review"].includes(existing.adminStatus);
      })
    );
  }, [bulkUploadFiles, filesByDocTypeId, requiredDocTypes]);

  const canSubmitBulkUpload = useMemo(() => {
    if (!isBulkUploadReady || !bulkUploadFiles.length) return false;
    const stagedRequirementIds = new Set(bulkUploadFiles.map((entry) => entry.documentTypeId));
    if (["under_review", "submitted", "resubmitted"].includes(activeRenewal?.status || "")) return true;
    if (!activeRenewal || activeRenewal.status === "draft") return true;
    if (activeRenewal.status !== "needs_revision") return false;
    return requiredDocTypes
      .filter((doc) => ["needs_revision", "rejected_red", "rejected"].includes(getFileForDoc(doc)?.adminStatus || ""))
      .every((doc) => stagedRequirementIds.has(doc.id));
  }, [activeRenewal?.status, bulkUploadFiles, filesByDocTypeId, isBulkUploadReady, requiredDocTypes]);

  const bulkUploadCounts = useMemo(() => {
    const assignedCount = bulkUploadFiles.filter((entry) => entry.documentTypeId).length;
    const duplicateTypeCount = bulkUploadFiles.reduce((count, entry, index, entries) => {
      if (!entry.documentTypeId) return count;
      return entries.findIndex((candidate) => candidate.documentTypeId === entry.documentTypeId) === index ? count : count + 1;
    }, 0);
    const validReadyCount = bulkUploadFiles.filter((entry) => {
      if (entry.validationError || entry.isValidating || !entry.documentTypeId) return false;
      const docType = requiredDocTypes.find((doc) => doc.id === entry.documentTypeId);
      const existing = docType ? getFileForDoc(docType) : null;
      const locked = existing && ["approved", "approved_green", "submitted", "under_review", "under_admin_review", "ready_for_review"].includes(existing.adminStatus);
      const duplicated = bulkUploadFiles.some((other) => other.id !== entry.id && other.documentTypeId === entry.documentTypeId);
      return !locked && !duplicated;
    }).length;
    return {
      total: bulkUploadFiles.length,
      assigned: assignedCount,
      validReady: validReadyCount,
      invalid: bulkUploadFiles.filter((entry) => Boolean(entry.validationError)).length,
      validating: bulkUploadFiles.filter((entry) => Boolean(entry.isValidating)).length,
      unassigned: bulkUploadFiles.filter((entry) => !entry.validationError && !entry.isValidating && !entry.documentTypeId).length,
      duplicate: duplicateTypeCount,
    };
  }, [bulkUploadFiles, filesByDocTypeId, requiredDocTypes]);

  const approvalPercent = totalMandatoryCount > 0
    ? Math.round((approvedFilesCount / totalMandatoryCount) * 100)
    : 0;

  // Row actions select one requirement, then stage its file in the renewal upload dialog.
  const triggerDraftUpload = (docTypeId: string) => {
    setPendingUpload({ docTypeId });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const triggerRevisionReplacement = (docTypeId: string) => {
    setBulkUploadFiles([]);
    setPendingUpload(null);
    setPreferredRevisionDocumentTypeId(docTypeId);
    setBulkUploadOpen(true);
  };

  const suggestRenewalDocumentTypeId = (fileName: string) => {
    const normalizedFileName = normalizeRequirementName(fileName);
    return [...requiredDocTypes]
      .sort((left, right) => normalizeRequirementName(right.name).length - normalizeRequirementName(left.name).length)
      .find((docType) => {
        const normalizedName = normalizeRequirementName(docType.name);
        return normalizedName.length > 0 && normalizedFileName.includes(normalizedName);
      })?.id ?? "";
  };

  // Selecting a file from a requirement row stages it in the same review dialog
  // used for bulk uploads. Nothing is written until the user confirms there.
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const target = pendingUpload;
    e.target.value = "";
    if (!file || !target) return;

    const stagedFile: RenewalBatchFile = {
      id: createRenewalBatchFileId(),
      file,
      documentTypeId: target.docTypeId,
      validationError: (await validatePdfUpload(file)) || undefined,
    };
    setBulkUploadFiles((current) => [
      ...current.filter((entry) => entry.documentTypeId !== target.docTypeId),
      stagedFile,
    ]);
    setPendingUpload(null);
    setPreferredRevisionDocumentTypeId(null);
    setBulkUploadOpen(true);
  };

  const handleBulkFilesSelected = async (selectedFiles: FileList | File[] | null) => {
    if (bulkUploading) return;
    const filesToAdd = Array.from(selectedFiles ?? []);
    if (!filesToAdd.length) return;
    const preferredDocumentTypeId = preferredRevisionDocumentTypeId;
    setPreferredRevisionDocumentTypeId(null);

    const stagedFiles = filesToAdd.map((file, index): RenewalBatchFile => ({
      id: createRenewalBatchFileId(),
      file,
      documentTypeId: index === 0 ? preferredDocumentTypeId ?? "" : "",
      isValidating: true,
    }));
    setBulkUploadFiles((current) => [...current, ...stagedFiles]);
    stagedFiles.forEach((entry) => {
      void validatePdfUpload(entry.file).then((validationError) => {
        setBulkUploadFiles((current) => current.map((candidate) => candidate.id !== entry.id ? candidate : {
          ...candidate,
          isValidating: false,
          validationError: validationError || undefined,
          documentTypeId: validationError ? "" : entry.documentTypeId || suggestRenewalDocumentTypeId(entry.file.name),
        }));
      }).catch(() => {
        setBulkUploadFiles((current) => current.map((candidate) => candidate.id !== entry.id ? candidate : {
          ...candidate,
          isValidating: false,
          validationError: "The file could not be validated. Please choose a valid PDF and try again.",
          documentTypeId: "",
        }));
      });
    });
  };

  const closeBulkUpload = () => {
    if (bulkUploading) return;
    setBulkUploadConfirmOpen(false);
    setBulkUploadOpen(false);
    setBulkUploadFiles([]);
    setPendingUpload(null);
    setPreferredRevisionDocumentTypeId(null);
  };

  const requestBulkRenewalUpload = (mode: "draft" | "submit") => {
    if (!isBulkUploadReady || (mode === "submit" && !canSubmitBulkUpload)) {
      const firstInvalidFile = bulkUploadFiles.find((entry) => entry.validationError || !entry.documentTypeId);
      toast({
        title: mode === "submit" && !canSubmitBulkUpload ? "Complete all renewal requirements first" : "Check the selected files",
        description: firstInvalidFile?.validationError
          || (firstInvalidFile ? `Assign a renewal requirement to ${firstInvalidFile.file.name}.` : "Review duplicate or locked document assignments."),
        variant: "destructive",
      });
      return;
    }
    setBulkUploadSubmitMode(mode);
    setBulkUploadConfirmOpen(true);
  };

  const handleDownloadRenewalTemplates = async () => {
    if (!requiredDocTypes.length) {
      toast({
        title: "Templates are still loading",
        description: "Please wait for the renewal requirements to finish loading, then try again.",
        variant: "destructive",
      });
      return;
    }

    const missingTemplate = requiredDocTypes.find((doc) => !doc.templateFileUrl);
    if (missingTemplate) {
      toast({
        title: "Unable to prepare all templates",
        description: `Missing template: ${missingTemplate.name}`,
        variant: "destructive",
      });
      return;
    }

    setDownloadingAllTemplates(true);
    try {
      const archive = new JSZip();
      await Promise.all(requiredDocTypes.map(async (doc) => {
        const resolvedUrl = await resolveSupabaseFileUrl(doc.templateFileUrl);
        if (!resolvedUrl) throw new Error(`Missing template: ${doc.name}`);
        const response = await fetch(resolvedUrl);
        if (!response.ok) throw new Error(`Unable to download template: ${doc.name}`);
        archive.file(resolveCleanTemplateDownloadFileName(doc), await response.blob());
      }));

      const blob = await archive.generateAsync({ type: "blob" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Y-TRACE-Renewal-Cycle-${cycleNumber}-Templates.zip`;
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

  const handleOpenPreview = async (key: string, fileUrl: string, title: string) => {
    if (!openPreview) return;
    setOpeningPreviewKey(key);
    try {
      await openPreview(fileUrl, title);
    } catch (error) {
      toast({
        title: "Unable to open document",
        description: error instanceof Error ? error.message : "The document preview could not be opened.",
        variant: "destructive",
      });
    } finally {
      setOpeningPreviewKey(null);
    }
  };

  const handleOpenRenewalAttachment = async (documentTypeId: string, documentTypeName: string, file: SubmissionFile) => {
    setOpeningPreviewKey(`attached:${documentTypeId}`);
    try {
      const resolvedUrl = await resolveSupabaseFileUrl(file.fileUrl);
      if (!resolvedUrl) throw new Error("No file is available yet.");
      setAttachedRenewalPreview({ documentTypeId, documentTypeName, file, previewUrl: resolvedUrl });
    } catch (error) {
      toast({
        title: "Unable to open document",
        description: error instanceof Error ? error.message : "The document preview could not be opened right now.",
        variant: "destructive",
      });
    } finally {
      setOpeningPreviewKey(null);
    }
  };

  const handleBulkRenewalUpload = async (mode: "draft" | "submit") => {
    if (
      bulkUploadingRef.current ||
      activeRenewal?.status === "approved" ||
      !isBulkUploadReady ||
      (mode === "submit" && !canSubmitBulkUpload) ||
      !currentProfile?.id
    ) return;

    bulkUploadingRef.current = true;
    setBulkUploading(true);
    setBulkUploadFiles((current) => current.map((entry) => ({ ...entry, uploadError: undefined })));
    const uploaded: SubmissionFile[] = [];
    const failures: RenewalBatchFile[] = [];
    let renewal = activeRenewal;
    let renewalSubmission = submission;

    try {
      if (!renewal?.id || !renewalSubmission?.id) {
        const started = await userStartOrGetRenewalDraftInSupabase(currentProfile.id);
        renewal = started.renewal;
        renewalSubmission = started.submission;
        if (!renewalSubmission?.id) {
          const packet = await fetchRenewalPacketInSupabase(renewal.id);
          renewalSubmission = packet.submission;
          setFiles(packet.files);
        }
        if (!renewalSubmission?.id) throw new Error("The renewal document packet could not be initialized.");
        setSubmission(renewalSubmission);
        if (mode === "draft") {
          setActiveRenewal(renewal);
          onRenewalUpdated?.(renewal);
        }
      }

      const uploadRenewal = renewal;
      const uploadSubmission = renewalSubmission;
      const outcomes: { savedFile?: SubmissionFile; failure?: RenewalBatchFile }[] = new Array(bulkUploadFiles.length);
      let nextIndex = 0;
      const workers = Array.from(
        { length: Math.min(RENEWAL_UPLOAD_CONCURRENCY_LIMIT, bulkUploadFiles.length) },
        async () => {
          while (nextIndex < bulkUploadFiles.length) {
            const index = nextIndex++;
            const entry = bulkUploadFiles[index];
            const docType = bulkAssignableDocTypes.find((doc) => doc.id === entry.documentTypeId);
            if (!docType) {
              outcomes[index] = { failure: { ...entry, uploadError: "Choose a valid renewal requirement for this file." } };
              continue;
            }

            const existingFile = getFileForDoc(docType);
            try {
              const savedFile =
                existingFile && ["needs_revision", "rejected_red", "rejected"].includes(existingFile.adminStatus)
                ? await replaceRenewalDocumentFileInSupabase({
                    organizationId: currentProfile.id,
                    renewalId: uploadRenewal.id,
                    fileId: existingFile.id,
                    documentTypeId: docType.id,
                    documentTypeName: docType.name,
                    // For a renewal still in review, save the correction as a draft
                    // first; the additional-documents RPC moves selected drafts to review.
                    // A full renewal resubmission transitions flagged files directly.
                    submitForReview: mode === "submit" && uploadRenewal.status === "needs_revision",
                    file: entry.file,
                  })
                : await uploadRenewalDocumentFileInSupabase({
                    organizationId: currentProfile.id,
                    renewalId: uploadRenewal.id,
                    submissionId: uploadSubmission.id,
                    documentTypeId: docType.id,
                    documentTypeName: docType.name,
                    file: entry.file,
                  });
              outcomes[index] = { savedFile: { ...savedFile, documentTypeName: docType.name } };
            } catch (error) {
              outcomes[index] = {
                failure: {
                  ...entry,
                  uploadError: error instanceof Error ? error.message : "This file could not be uploaded.",
                },
              };
            }
          }
        },
      );
      await Promise.all(workers);

      // Keep results in selection order, regardless of which upload finishes first.
      for (const outcome of outcomes) {
        if (outcome.savedFile) uploaded.push(outcome.savedFile);
        if (outcome.failure) failures.push(outcome.failure);
      }

      if (uploaded.length) {
        setFiles((current) => {
          const remaining = current.filter(
            (existing) => !uploaded.some((saved) => saved.id === existing.id || saved.documentTypeId === existing.documentTypeId),
          );
          return [...remaining, ...uploaded];
        });
      }

      if (mode === "submit" && uploaded.length) {
        const flaggedFiles = files.filter(
          (file) => file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red" || file.adminStatus === "rejected",
        );
        const allFlaggedFilesReplaced =
          renewal.status === "needs_revision" &&
          flaggedFiles.length > 0 &&
          flaggedFiles.every((flaggedFile) => uploaded.some((saved) => saved.id === flaggedFile.id));

        if (allFlaggedFilesReplaced) {
          const result = await userResubmitRenewalInSupabase(renewal.id, renewalSubmission.id);
          const updated = { ...renewal, status: "resubmitted" as const, updatedAt: result.resubmittedAt };
          renewal = updated;
          setActiveRenewal(updated);
          onRenewalUpdated?.(updated);
          toast({
            title: failures.length ? "Some corrections were submitted" : "Renewal submitted for review",
            description: failures.length
              ? `${uploaded.length} corrected file${uploaded.length === 1 ? " was" : "s were"} submitted; ${failures.length} need attention.`
              : "Your corrected documents are now with the PCYDO administrator.",
            variant: failures.length ? "destructive" : undefined,
          });
        } else if (renewal.status === "draft") {
          const result = await userSubmitRenewalInSupabase(renewal.id);
          const updated: OrganizationRenewalRecord = { ...renewal, status: "submitted", submittedAt: result.submittedAt };
          renewal = updated;
          setActiveRenewal(updated);
          onRenewalUpdated?.(updated);
          toast({
            title: failures.length ? "Selected renewal documents submitted" : "Renewal submitted for review",
            description: failures.length
              ? `${uploaded.length} file${uploaded.length === 1 ? " was" : "s were"} sent for review; ${failures.length} need attention. You can submit the remaining requirements later.`
              : `${uploaded.length} selected document${uploaded.length === 1 ? " is" : "s are"} now with the PCYDO administrator. You can submit the remaining requirements later.`,
            variant: failures.length ? "destructive" : undefined,
          });
        } else if (["submitted", "under_review", "resubmitted"].includes(renewal.status)) {
          const result = await userSubmitAdditionalRenewalDocumentsInSupabase(
            renewal.id,
            uploaded.map((file) => file.id),
          );
          toast({
            title: failures.length ? "Some renewal documents were submitted" : "Renewal documents submitted",
            description: failures.length
              ? `${result.submittedCount} file${result.submittedCount === 1 ? " was" : "s were"} sent for review; ${failures.length} need attention.`
              : `${result.submittedCount} additional document${result.submittedCount === 1 ? " was" : "s were"} sent to the PCYDO administrator.`,
            variant: failures.length ? "destructive" : undefined,
          });
        } else if (renewal.status === "needs_revision") {
          toast({
            title: "Some corrections were uploaded",
            description: failures.length
              ? `${uploaded.length} corrected file${uploaded.length === 1 ? " was" : "s were"} uploaded; ${failures.length} need attention. Replace every document marked for revision before resubmitting.`
              : "Replace every document marked for revision before resubmitting the renewal.",
            variant: "destructive",
          });
        }

      } else if (uploaded.length) {
        toast({
          title: failures.length ? "Some renewal documents saved" : "Renewal draft saved",
          description: failures.length
            ? `${uploaded.length} file${uploaded.length === 1 ? " was" : "s were"} saved; ${failures.length} need${failures.length === 1 ? "s" : ""} attention.`
            : "Your files are saved as a draft and have not been sent to admin.",
          variant: failures.length ? "destructive" : undefined,
        });
      }

      setBulkUploadFiles(failures);
      setBulkUploadConfirmOpen(false);
      if (!failures.length) {
        setBulkUploadOpen(false);
      }

      if (mode === "submit" && uploaded.length) {
        try {
          const packet = await fetchRenewalPacketInSupabase(renewal.id);
          setSubmission(packet.submission);
          setFiles(packet.files);
        } catch (error) {
          // The submission already succeeded; a refresh failure must not mark it failed.
          console.warn("Could not refresh the submitted renewal documents:", error);
        }
      }
    } catch (error) {
      if (renewal && !activeRenewal) {
        setActiveRenewal(renewal);
        onRenewalUpdated?.(renewal);
      }
      toast({
        title: mode === "draft" ? "Unable to save renewal draft" : "Unable to submit renewal",
        description: error instanceof Error ? error.message : "The renewal documents could not be processed.",
        variant: "destructive",
      });
      setBulkUploadFiles((current) => current.map((entry) => ({
        ...entry,
        uploadError: entry.uploadError || "Upload did not finish. Review the file and try again.",
      })));
    } finally {
      bulkUploadingRef.current = false;
      setBulkUploading(false);
      setBulkUploadConfirmOpen(false);
    }
  };

  // Filtered requirements list
  const filteredRequirements = useMemo(() => {
    return requiredDocTypes
      .filter((doc) => {
        const file = getFileForDoc(doc);
        const query = searchQuery.trim().toLowerCase();
        if (!query) return true;
        return [
          doc.name,
          doc.description,
          file?.adminStatus,
          file?.fileName,
          file?.adminRemarks,
        ].some((v) => v?.toLowerCase().includes(query));
      })
      .filter((doc) => {
        const file = getFileForDoc(doc);
        if (statusFilter === "all") return true;
        if (statusFilter === "approved") {
          return file?.adminStatus === "approved" || file?.adminStatus === "approved_green";
        }
        if (statusFilter === "review") {
          return (
            file?.adminStatus === "submitted" ||
            file?.adminStatus === "under_review" ||
            file?.adminStatus === "under_admin_review" ||
            file?.adminStatus === "ready_for_review"
          );
        }
        if (statusFilter === "revision") {
          return file?.adminStatus === "needs_revision" || file?.adminStatus === "rejected_red" || file?.adminStatus === "rejected";
        }
        return true;
      })
      .sort((left, right) => {
        if (sortOrder === "name") return left.name.localeCompare(right.name);
        if (sortOrder === "updated") {
          const leftFile = getFileForDoc(left);
          const rightFile = getFileForDoc(right);
          const leftDate = new Date(leftFile?.updatedAt || leftFile?.uploadedAt || leftFile?.createdAt || 0).getTime();
          const rightDate = new Date(rightFile?.updatedAt || rightFile?.uploadedAt || rightFile?.createdAt || 0).getTime();
          return rightDate - leftDate;
        }
        return 0;
      });
  }, [requiredDocTypes, filesByDocTypeId, searchQuery, statusFilter, sortOrder]);

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 max-w-[1440px] mx-auto py-4">
      {/* Hidden File Input for Native PDF Upload */}
      {!readOnly && <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label="Upload document file"
      />}

      {/* Renewal workspace header follows the Documents Submissions workspace layout. */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-primary">Renewal Workspace</span>
                <span className="text-muted-foreground/30">•</span>
                <span className="text-xs text-muted-foreground">Y-TRACE Cycle {cycleNumber}</span>
              </div>
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                Renewal Requirements
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
                Renewal documents for <span className="font-semibold text-foreground">{orgName}</span>.
              </p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 pt-0.5 text-xs">
                <span className="font-medium text-foreground">{totalMandatoryCount} Requirements</span>
                <span className="text-muted-foreground/50">•</span>
                <span className="text-muted-foreground">Review Time: 2–3 Business days</span>
              </div>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-auto shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                {readOnly && approvedRenewals.length > 0 && (
                  <Select
                    value={activeRenewal?.id ?? ""}
                    onValueChange={(renewalId) => {
                      const selectedRenewal = approvedRenewals.find((renewal) => renewal.id === renewalId);
                      if (selectedRenewal) {
                        setActiveRenewal(selectedRenewal);
                        onActiveRenewalChange?.(selectedRenewal);
                      }
                    }}
                  >
                    <SelectTrigger aria-label="Filter renewal documents by cycle" className="h-9 w-full rounded-full sm:w-[150px] text-xs">
                      <SelectValue placeholder="Select cycle" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...approvedRenewals]
                        .sort((left, right) => left.cycleNumber - right.cycleNumber)
                        .map((renewal) => (
                          <SelectItem key={renewal.id} value={renewal.id}>Cycle {renewal.cycleNumber}</SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                )}
                {!readOnly && (
                  <Button
                    type="button"
                    onClick={() => {
                      setBulkUploadFiles([]);
                      setPreferredRevisionDocumentTypeId(null);
                      setBulkUploadOpen(true);
                    }}
                    disabled={
                      bulkUploading ||
                      bulkAssignableDocTypes.length === 0 ||
                      activeRenewal?.status === "approved" ||
                      (!activeRenewal?.id && !userRenewalState?.canStartRenewal)
                    }
                    className="rounded-full bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 h-9 px-4 text-xs font-bold transition-all shrink-0 gap-1.5 justify-center"
                  >
                    <FileUp className="h-4 w-4" />
                    Upload Multiple Documents
                  </Button>
                )}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void handleDownloadRenewalTemplates()}
                  disabled={downloadingAllTemplates || loadingPacket && !requiredDocTypes.length}
                  className="rounded-full border-border/80 text-foreground hover:bg-accent h-9 px-4 text-xs font-semibold justify-center"
                >
                  {downloadingAllTemplates ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
                      Preparing Templates…
                    </>
                  ) : (
                    <>
                      <Download className="mr-1.5 h-3.5 w-3.5" />
                      Download All Templates
                    </>
                  )}
                </Button>
              </div>

            </div>
          </div>
      </div>

      <div className="space-y-4 sm:space-y-6">
          {/* Renewal approval summary follows the Documents Submissions banner. */}
          <Card className="space-y-3 rounded-2xl border border-border/60 bg-card p-4 shadow-xs sm:space-y-3.5 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-bold text-foreground">
                    {approvedFilesCount} of {totalMandatoryCount} Documents Approved ({approvalPercent}%)
                  </h2>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {approvedFilesCount === totalMandatoryCount && totalMandatoryCount > 0
                      ? "All required renewal documents are reviewed and verified by PCYDO admin."
                      : reviewFilesCount > 0
                        ? "Your renewal documents are currently under review by PCYDO admin."
                        : `Upload the remaining ${Math.max(0, totalMandatoryCount - uploadedFilesCount)} required documents to complete your renewal submission.`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-4 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="h-4 w-4" /> {approvedFilesCount} Approved
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground/70">
                    <Clock className="h-4 w-4" /> {reviewFilesCount} Review
                  </span>
                  <span className={cn(
                    "inline-flex items-center gap-1.5",
                    unresolvedFlaggedCount > 0
                      ? "text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground/70",
                  )}>
                    <AlertTriangle className="h-4 w-4" /> {unresolvedFlaggedCount} Revision
                  </span>
                </div>
              </div>
              <Progress value={approvalPercent} className="h-2 rounded-full" />
          </Card>

          {revisionNotices.length > 0 ? (
            <section
              aria-label="Renewal resubmission deadlines"
              className="space-y-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:p-5"
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" aria-hidden="true" />
                <div className="min-w-0 space-y-1">
                  <h2 className="text-sm font-bold text-amber-900 dark:text-amber-200">
                    Action required: revise your renewal documents
                  </h2>
                  <p className="text-xs leading-relaxed text-amber-900/85 dark:text-amber-100/85">
                    Upload corrected files by each deadline. If the 5-day resubmission period ends first, the document will be locked and only a PCYDO administrator can reopen it.
                  </p>
                </div>
              </div>

              <div className="divide-y divide-amber-700/15 dark:divide-amber-200/15">
                {revisionNotices.map((notice) => (
                  <article key={notice.id} className="space-y-2 py-3 first:pt-0 last:pb-0 sm:ml-8">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <h3 className="break-words text-sm font-semibold text-amber-950 dark:text-amber-100">
                        {notice.title}
                      </h3>
                      {notice.remaining?.label ? (
                        <span className={cn(
                          "inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold",
                          notice.isLocked
                            ? "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200"
                            : notice.isUnlocked
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-800 dark:text-blue-200"
                              : "border-amber-600/25 bg-amber-500/15 text-amber-900 dark:text-amber-100",
                        )}>
                          <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                          {notice.isLocked
                            ? notice.remaining.isExpired ? "Revision period expired · Locked" : "Submission locked"
                            : notice.remaining.label}
                        </span>
                      ) : null}
                    </div>

                    {notice.adminRemarks ? (
                      <p className="break-words text-xs text-amber-950/80 dark:text-amber-100/80">
                        <span className="font-semibold">Admin feedback:</span> {notice.adminRemarks}
                      </p>
                    ) : null}

                    <p className={cn(
                      "text-xs leading-relaxed",
                      notice.isLocked ? "text-rose-800 dark:text-rose-200" : "text-amber-900/85 dark:text-amber-100/85",
                    )}>
                      {notice.deadline ? `Resubmission deadline: ${notice.deadline}. ` : "A 5-day resubmission period applies. "}
                      {notice.isLocked
                        ? "This document is locked. Contact a PCYDO administrator to request that it be reopened."
                        : notice.isUnlocked
                          ? "An administrator reopened this document. Submit the corrected file as soon as possible."
                          : "Submit the corrected document before the deadline to avoid it being locked. Only a PCYDO administrator can reopen a locked document."}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="space-y-4 sm:space-y-6 lg:col-span-8">
          {/* Renewal-only toolbar follows the Documents Submissions controls. */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-card border border-border/60 p-2 sm:p-2.5 px-3 rounded-2xl shadow-xs">
            <div className="flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] touch-pan-x overscroll-x-contain pb-1 sm:pb-0 px-0.5">
              {([
                ["all", `All (${requiredDocTypes.length})`],
                ["approved", `Approved (${approvedFilesCount})`],
                ["review", `Under Review (${reviewFilesCount})`],
                ["revision", `Needs Revision (${unresolvedFlaggedCount})`],
              ] as const).map(([filter, label]) => (
                <button
                  key={filter}
                  type="button"
                  disabled={filter !== "all" && (
                    filter === "approved"
                      ? approvedFilesCount === 0
                      : filter === "review"
                        ? reviewFilesCount === 0
                        : unresolvedFlaggedCount === 0
                  )}
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                    statusFilter === filter
                      ? "bg-primary text-primary-foreground shadow-2xs"
                      : filter !== "all" && (
                        filter === "approved"
                          ? approvedFilesCount === 0
                          : filter === "review"
                            ? reviewFilesCount === 0
                            : unresolvedFlaggedCount === 0
                      )
                        ? "text-muted-foreground/40 cursor-not-allowed"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto lg:flex-1 lg:min-w-0 lg:justify-end">
              <div className="relative flex-1 sm:w-60 lg:w-full min-w-0">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search renewal requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-8 text-xs rounded-xl bg-background border-border/80 w-full"
                />
              </div>
              <DropdownMenu modal={false}>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 cursor-pointer gap-1 rounded-xl border-border text-xs font-medium">
                    <Filter className="h-3.5 w-3.5" />
                    <span className="hidden xs:inline">Sort:</span> <span className="capitalize">{sortOrder}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="z-50 w-44 rounded-xl border-border/80 bg-card p-2 shadow-lg">
                  <DropdownMenuItem onClick={() => setSortOrder("newest")} className="cursor-pointer text-xs font-medium">Default Order</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("name")} className="cursor-pointer text-xs font-medium">Document Name</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setSortOrder("updated")} className="cursor-pointer text-xs font-medium">Recently Updated</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Loading indicator */}
          {loadingPacket && (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Loading renewal documents...</p>
            </div>
          )}

          {/* Packet error notice */}
          {packetError && !loadingPacket && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs">
              <p className="font-bold">Error loading renewal documents</p>
              <p>{packetError}</p>
            </div>
          )}

          {/* Required Documents List */}
          {!loadingPacket && (
            <div className="space-y-3.5">
              {filteredRequirements.map((doc) => {
                const file = getFileForDoc(doc);
                const hasFile = Boolean(file && file.fileUrl);
                const isApproved = file?.adminStatus === "approved" || file?.adminStatus === "approved_green";
                const isRevision = file?.adminStatus === "needs_revision" || file?.adminStatus === "rejected_red" || file?.adminStatus === "rejected";
                const isSubmitted =
                  file?.adminStatus === "submitted" ||
                  file?.adminStatus === "under_review" ||
                  file?.adminStatus === "under_admin_review" ||
                  file?.adminStatus === "ready_for_review";
                const isDraft = activeRenewal?.status === "draft" && hasFile;
                const uploadDateText = file?.uploadedAt
                  ? `Uploaded ${new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    }).format(new Date(file.uploadedAt))}`
                  : "Never uploaded";
                // Status Badge Render
                const renderDocBadge = () => {
                  if (isApproved) {
                    return (
                      <StatusBadge status="approved" label="Approved" className="text-[10px] font-bold px-2.5 py-0.5 shrink-0" />
                    );
                  }
                  if (isRevision) {
                    return (
                      <StatusBadge status="needs_revision" label="Needs Revision" className="text-[10px] font-bold px-2.5 py-0.5 shrink-0" />
                    );
                  }
                  if (isDraft) {
                    return (
                      <StatusBadge status="draft" label="Draft Saved" className="text-[10px] font-bold px-2.5 py-0.5 shrink-0" />
                    );
                  }
                  if (isSubmitted) {
                    return (
                      <StatusBadge status="under_review" label="Under Review" className="text-[10px] font-bold px-2.5 py-0.5 shrink-0" />
                    );
                  }
                  return (
                    <StatusBadge status="not_started" label="Not Uploaded" className="text-[10px] font-medium px-2.5 py-0.5 shrink-0" />
                  );
                };

                return (
                  <Card
                    key={doc.id}
                    className="rounded-2xl border border-border/60 bg-card p-4 sm:p-5 space-y-3 shadow-xs hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40 transition-all duration-200"
                  >
                    {/* Top Header Row follows the Documents Submissions requirement cards. */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="h-9 w-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="h-4.5 w-4.5" />
                        </div>
                        <div className="space-y-1 sm:space-y-0.5 min-w-0 flex-1 break-words">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                            <h3 className="text-sm font-bold text-foreground leading-snug break-words">
                              {doc.name}
                            </h3>
                            <div className="hidden sm:inline-flex shrink-0">
                              {renderDocBadge()}
                            </div>
                            <div className="sm:hidden pt-0.5 shrink-0">
                              {renderDocBadge()}
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {doc.description}
                          </p>
                        </div>
                      </div>

                    </div>

                    {/* Metadata & Actions Footer Row follows Documents Submissions. */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-border/40 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-foreground bg-accent/60 px-2 py-0.5 rounded-md border border-border/40 text-[11px] shrink-0">PDF</span>
                        <span>•</span>
                        <span className="truncate">{uploadDateText}</span>
                        <span>•</span>
                        {isApproved ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Locked from modification</span>
                        ) : isSubmitted ? (
                          <span className="text-purple-600 dark:text-purple-400 font-semibold">Awaiting Review</span>
                        ) : isRevision ? (
                          <span className="text-amber-600 dark:text-amber-400 font-semibold">Revision Requested</span>
                        ) : isDraft ? (
                          <span className="text-blue-600 dark:text-blue-400 font-semibold">Draft Saved • Ready for Submission</span>
                        ) : (
                          <span>Action required for submission</span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto justify-end">
                        {doc.templateFileUrl && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={Boolean(openingPreviewKey)}
                            onClick={() => void handleOpenPreview(`template:${doc.id}`, doc.templateFileUrl, `${doc.name} (Template)`)}
                            className="h-8 rounded-xl border-border text-xs font-medium hover:bg-accent cursor-pointer justify-center"
                          >
                            {openingPreviewKey === `template:${doc.id}` ? (
                              <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                                <span>Opening…</span>
                              </>
                            ) : (
                              <>
                                <Eye className="mr-1.5 h-3.5 w-3.5 shrink-0" />
                                <span>View Template</span>
                              </>
                            )}
                          </Button>
                        )}

                        {hasFile && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={Boolean(openingPreviewKey)}
                            onClick={() => void handleOpenRenewalAttachment(doc.id, doc.name, file!)}
                            className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer justify-center shadow-2xs"
                          >
                            {openingPreviewKey === `attached:${doc.id}` ? (
                              <>
                                <Loader2 className="mr-1.5 h-3.5 w-3.5 shrink-0 animate-spin" />
                                <span>Opening…</span>
                              </>
                            ) : (
                              <span>View Attached →</span>
                            )}
                          </Button>
                        )}

                        {/* Upload Button (Draft Mode & Missing) */}
                        {!readOnly && activeRenewal?.status === "draft" && !hasFile && (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            onClick={() => triggerDraftUpload(doc.id)}
                            className="h-8 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 justify-center shadow-2xs"
                          >
                            <span>Upload Document →</span>
                          </Button>
                        )}

                        {/* Replace Button (Draft Mode & Has File) */}
                        {!readOnly && activeRenewal?.status === "draft" && hasFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => triggerDraftUpload(doc.id)}
                            className="h-8 rounded-xl border-border text-xs font-medium hover:bg-accent justify-center"
                          >
                            Replace
                          </Button>
                        )}

                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
          </div>

          <aside className="space-y-5 lg:col-span-4">
              <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
                <div>
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
                    <Info className="h-4 w-4 text-primary" /> Submission Guidelines
                  </h3>
                  <p className="pt-0.5 text-xs text-muted-foreground">Follow requirements for fast approval.</p>
                </div>
                <div className="space-y-3.5 pt-1 text-xs leading-relaxed text-muted-foreground">
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Accepted Formats:</strong> PDF files only.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Max File Size:</strong> 10 MB per document.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong>Review Process:</strong> Admin validation takes 2–3 business days.</span>
                  </div>
                  <div className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>
                      <strong>Endorsement Guidelines:</strong>{" "}
                      <button
                        type="button"
                        onClick={() => setEndorsementModalOpen(true)}
                        className="inline-flex cursor-pointer items-center gap-0.5 rounded-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        aria-label="View endorsement or certification guidelines"
                      >
                        View Guidelines →
                      </button>
                    </span>
                  </div>
                </div>
              </Card>

              <Card className="rounded-2xl border border-border/60 bg-card p-6 space-y-4 shadow-xs">
                <div>
                  <h3 className="text-sm font-bold text-foreground">Recent Activity</h3>
                  <p className="pt-0.5 text-xs text-muted-foreground">Renewal review updates for Cycle {cycleNumber}.</p>
                </div>
                <div className="relative space-y-4 border-l border-border/60 pl-6">
                  {cycleActivityLogs.slice(0, 5).map((log) => {
                    const actionTitle = renewalActivityTitle(log);
                    const lowerTitle = actionTitle.toLowerCase();
                    const isApproved = lowerTitle.includes("approved");
                    const isRevision = lowerTitle.includes("revision") || lowerTitle.includes("rejected");
                    return (
                      <div key={log.id} className="relative min-w-0 space-y-1">
                        <div className={cn(
                          "absolute -left-[31px] top-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                          isApproved
                            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : isRevision
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                              : "border-primary/20 bg-primary/10 text-primary",
                        )}>
                          {isApproved ? <Check className="h-2.5 w-2.5" /> : isRevision ? <AlertTriangle className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
                        </div>
                        <p className="truncate text-xs font-bold leading-snug text-foreground">{actionTitle}</p>
                        <p className="text-[10px] font-medium text-muted-foreground">{formatFullActivityTimestamp(log.createdAt)}</p>
                      </div>
                    );
                  })}
                  {cycleActivityLogs.length === 0 && (
                    <p className="text-xs italic text-muted-foreground">No recent activity.</p>
                  )}
                </div>
                {onRenewalRecentActivityModal && cycleActivityLogs.length > 0 && (
                  <div className="border-t border-border/40 pt-3 text-right">
                    <button
                      type="button"
                      onClick={() => onRenewalRecentActivityModal(cycleActivityLogs)}
                      className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      View all →
                    </button>
                  </div>
                )}
              </Card>
          </aside>
          </div>

          <Dialog open={bulkUploadOpen} onOpenChange={(open) => open ? setBulkUploadOpen(true) : closeBulkUpload()}>
            <DialogContent className="grid w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-3xl border border-border/80 bg-card p-0 shadow-2xl sm:max-w-4xl">
              <DialogHeader className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 p-5 dark:via-indigo-950/10 dark:to-slate-900/40 sm:p-6">
                <div className="flex min-w-0 items-start gap-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-2xs">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <DialogTitle className="text-xl font-black tracking-tight text-foreground">Upload Renewal Documents</DialogTitle>
                    <DialogDescription className="text-xs font-medium text-muted-foreground">
                      {preferredRevisionDocumentTypeId
                        ? `Upload a corrected PDF for ${requiredDocTypes.find((doc) => doc.id === preferredRevisionDocumentTypeId)?.name || "the document marked for revision"}. It will be assigned automatically.`
                        : "Upload one or multiple required renewal documents for review."}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 space-y-6 overflow-y-auto p-5 [overscroll-behavior:contain] sm:p-6">
                <div
                  className="group relative cursor-pointer rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 p-7 text-center shadow-2xs transition-all duration-200 hover:border-primary/60 hover:bg-primary/10 dark:border-primary/40 dark:bg-primary/10 sm:p-8"
                  onDragOver={(event) => {
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "copy";
                  }}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleBulkFilesSelected(event.dataTransfer.files);
                  }}
                >
                  <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-card text-primary shadow-2xs transition-all duration-200 group-hover:scale-105 group-hover:border-primary/40">
                    <UploadCloud className="h-6 w-6" />
                  </div>
                  <p className="text-sm font-bold text-foreground">Drag &amp; drop your PDF files</p>
                  <p className="mt-1 text-xs font-medium text-muted-foreground">or browse your computer to upload multiple renewal documents.</p>
                  <label className="mt-4 inline-flex cursor-pointer">
                    <input
                      type="file"
                      multiple
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      aria-label="Browse renewal PDF files"
                      disabled={bulkUploading}
                      onChange={(event) => {
                        void handleBulkFilesSelected(event.target.files);
                        event.currentTarget.value = "";
                      }}
                    />
                    <span className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-2xs transition-transform hover:scale-[1.02] active:scale-[0.98]">
                      <FileUp className="h-4 w-4" /> Browse Files
                    </span>
                  </label>
                  <p className="mt-3 text-[11px] font-medium text-muted-foreground/70">Accepted format: PDF (.pdf) · Maximum 10 MB per file</p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      <Layers className="h-4 w-4 text-primary" /> Files Ready
                    </h3>
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-bold text-primary">
                      {bulkUploadCounts.total} File{bulkUploadCounts.total === 1 ? "" : "s"}
                    </span>
                  </div>

                  {bulkUploadFiles.length > 0 ? (
                    <div className="space-y-3">
                      {bulkUploadFiles.map((entry) => {
                        const duplicateAssignment = Boolean(entry.documentTypeId && bulkUploadFiles.some(
                          (other) => other.id !== entry.id && other.documentTypeId === entry.documentTypeId,
                        ));
                        const documentType = requiredDocTypes.find((doc) => doc.id === entry.documentTypeId);
                        const existingFile = documentType ? getFileForDoc(documentType) : null;
                        const isApproved = existingFile?.adminStatus === "approved" || existingFile?.adminStatus === "approved_green";
                        const isUnderReview = Boolean(existingFile && ["submitted", "under_review", "under_admin_review", "ready_for_review"].includes(existingFile.adminStatus));
                        const canAssign = new Set(bulkAssignableDocTypes.map((doc) => doc.id));
                        // Saving this batch changes its own targets to Under Review.
                        // Recheck availability only when the current operation is finished.
                        const hasLockedTarget = !bulkUploading && Boolean(documentType && !canAssign.has(documentType.id));
                        const validationError = entry.validationError || entry.uploadError;
                        const hasError = Boolean(validationError || duplicateAssignment || (entry.documentTypeId && hasLockedTarget));

                        return (
                          <div key={entry.id} className="space-y-3 rounded-2xl border border-border/70 bg-card p-4 shadow-2xs transition-colors hover:border-border">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-600 shadow-2xs dark:text-red-400">
                                  <FileText className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 space-y-0.5">
                                  <p className="truncate text-sm font-bold text-foreground" title={entry.file.name}>{entry.file.name}</p>
                                  <p className="text-xs font-medium text-muted-foreground">
                                    {formatFileSize(entry.file.size) ?? "0 B"}
                                    {documentType ? <span className="font-semibold text-primary"> · Mapped to: {documentType.name}</span> : null}
                                  </p>
                                </div>
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {bulkUploading ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Processing
                                  </span>
                                ) : hasError ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive/20 bg-destructive/10 px-2.5 py-1 text-[11px] font-bold text-destructive">
                                    <AlertCircle className="h-3 w-3" /> Error
                                  </span>
                                ) : entry.isValidating ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2.5 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-300">
                                    <Loader2 className="h-3 w-3 animate-spin" /> Checking PDF
                                  </span>
                                ) : entry.documentTypeId ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    <CheckCircle2 className="h-3 w-3" /> Ready
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-1 text-[11px] font-bold text-amber-600 dark:text-amber-400">
                                    <Clock className="h-3 w-3" /> Needs Type
                                  </span>
                                )}
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                                  disabled={bulkUploading}
                                  onClick={() => setBulkUploadFiles((current) => current.filter((item) => item.id !== entry.id))}
                                  aria-label={`Remove ${entry.file.name}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>

                            {!entry.validationError && !entry.isValidating && (
                              <div className="space-y-1.5 border-t border-border/40 pt-3">
                                <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Assign Required Document Type</label>
                                <Select
                                  value={entry.documentTypeId || "__unassigned__"}
                                  disabled={bulkUploading}
                                  onValueChange={(value) => setBulkUploadFiles((current) => current.map((item) => item.id === entry.id
                                    ? { ...item, documentTypeId: value === "__unassigned__" ? "" : value, uploadError: undefined }
                                    : item))}
                                >
                                  <SelectTrigger className="h-9 w-full rounded-xl border-border bg-background text-xs font-medium">
                                    <SelectValue placeholder="Select renewal requirement">
                                      {bulkUploading ? documentType?.name : undefined}
                                    </SelectValue>
                                  </SelectTrigger>
                                  <SelectContent className="max-h-[260px] rounded-xl">
                                    <SelectItem value="__unassigned__">Select document type</SelectItem>
                                    {requiredDocTypes.map((docType) => {
                                      const existing = getFileForDoc(docType);
                                      const docIsApproved = existing?.adminStatus === "approved" || existing?.adminStatus === "approved_green";
                                      const docIsUnderReview = Boolean(existing && ["submitted", "under_review", "under_admin_review", "ready_for_review"].includes(existing.adminStatus));
                                      const assignedElsewhere = bulkUploadFiles.some((other) => other.id !== entry.id && other.documentTypeId === docType.id);
                                      const unavailableForCycle = !canAssign.has(docType.id);
                                      const disabled = docIsApproved || docIsUnderReview || unavailableForCycle || assignedElsewhere;
                                      const reason = docIsApproved ? " — Approved" : docIsUnderReview ? " — Under Review" : assignedElsewhere ? " — Assigned" : unavailableForCycle ? " — Not available" : "";
                                      return <SelectItem key={docType.id} value={docType.id} disabled={disabled}>{docType.name}{reason}</SelectItem>;
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {duplicateAssignment ? (
                              <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> This document type is already assigned to another file in this batch.
                              </div>
                            ) : null}
                            {validationError ? (
                              <div role="alert" aria-live="polite" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {validationError}
                              </div>
                            ) : null}
                            {entry.documentTypeId && hasLockedTarget && !validationError ? (
                              <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-2.5 text-xs text-destructive">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                {isApproved ? "This requirement is approved and locked." : isUnderReview ? "This requirement is under review and cannot be re-uploaded." : "This requirement is not available for upload in the current renewal status."}
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-2xl border border-border/60 bg-muted/20 p-8 text-center">
                      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-card text-muted-foreground shadow-2xs">
                        <UploadCloud className="h-5 w-5" />
                      </div>
                      <p className="text-xs font-bold text-foreground">No files selected yet</p>
                      <p className="text-xs text-muted-foreground">Drag PDFs here or click Browse Files to begin.</p>
                    </div>
                  )}
                </div>
              </div>

              <DialogFooter className="z-20 flex shrink-0 flex-col items-center justify-between gap-3 rounded-b-3xl border-t border-border/80 bg-card/95 p-4 shadow-lg backdrop-blur-md sm:flex-row sm:px-6">
                <div className="text-xs font-medium text-muted-foreground">
                  <p className="font-bold text-foreground">
                    {bulkUploading
                      ? `Processing ${bulkUploadCounts.total} file${bulkUploadCounts.total === 1 ? "" : "s"}…`
                      : `${bulkUploadCounts.validReady} file${bulkUploadCounts.validReady === 1 ? "" : "s"} ready`}
                  </p>
                  {bulkUploadCounts.invalid || bulkUploadCounts.validating || bulkUploadCounts.unassigned || bulkUploadCounts.duplicate ? (
                    <p className={cn("mt-0.5 text-[11px]", bulkUploadCounts.invalid ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>
                      {bulkUploadCounts.invalid ? `${bulkUploadCounts.invalid} invalid` : null}
                      {bulkUploadCounts.validating ? `${bulkUploadCounts.invalid ? " · " : ""}Checking ${bulkUploadCounts.validating} PDF${bulkUploadCounts.validating === 1 ? "" : "s"}` : null}
                      {bulkUploadCounts.unassigned ? `${bulkUploadCounts.invalid || bulkUploadCounts.validating ? " · " : ""}${bulkUploadCounts.unassigned} need a document type` : null}
                      {bulkUploadCounts.duplicate ? ` · ${bulkUploadCounts.duplicate} duplicate assignment${bulkUploadCounts.duplicate === 1 ? "" : "s"}` : null}
                    </p>
                  ) : !bulkUploading && activeRenewal?.status === "needs_revision" && !canSubmitBulkUpload && bulkUploadCounts.validReady > 0 ? (
                    <p className="mt-0.5 text-[11px] text-amber-600 dark:text-amber-400">Replace every document marked for revision before resubmitting.</p>
                  ) : null}
                </div>

                <div className="flex w-full items-center gap-2.5 sm:w-auto">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 flex-1 rounded-xl border-border text-xs font-semibold hover:bg-accent sm:flex-initial"
                    disabled={!bulkUploadFiles.length || !isBulkUploadReady || bulkUploading}
                    onClick={() => requestBulkRenewalUpload("draft")}
                  >
                    Save as Draft
                  </Button>
                  <Button
                    type="button"
                    className="h-9 flex-1 gap-1.5 rounded-xl bg-primary text-xs font-bold text-primary-foreground shadow-2xs transition-all hover:scale-[1.02] active:scale-[0.98] sm:flex-initial"
                    disabled={!bulkUploadFiles.length || !canSubmitBulkUpload || bulkUploading}
                    onClick={() => requestBulkRenewalUpload("submit")}
                  >
                    <FileUp className="h-3.5 w-3.5" /> Submit Selected for Review
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={bulkUploadConfirmOpen} onOpenChange={setBulkUploadConfirmOpen}>
            <DialogContent className="max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-border/80 bg-card shadow-2xl sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {bulkUploadSubmitMode === "draft" ? "Save selected renewal documents as draft?" : activeRenewal?.status === "needs_revision" ? `Submit ${bulkUploadFiles.length} corrected document${bulkUploadFiles.length === 1 ? "" : "s"} for review?` : `Submit ${bulkUploadFiles.length} selected document${bulkUploadFiles.length === 1 ? "" : "s"} for admin review?`}
                </DialogTitle>
                <DialogDescription>
                  {bulkUploadSubmitMode === "draft"
                    ? "The selected files will be saved to this renewal cycle and can still be reviewed or replaced later."
                    : activeRenewal?.status === "needs_revision"
                      ? "The corrected files will be sent to PCYDO after every document requested for revision has been replaced."
                      : "Only these selected files will be sent to PCYDO for review. You can submit the remaining requirements later; all required documents must be approved before the renewal is verified."}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-xl border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
                <ul className="space-y-2">
                  {bulkUploadFiles.map((entry) => {
                    const docType = requiredDocTypes.find((doc) => doc.id === entry.documentTypeId);
                    return <li key={`${entry.id}-${entry.documentTypeId}`} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" /><span>{docType?.name || entry.file.name}</span></li>;
                  })}
                </ul>
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-row">
                <Button type="button" variant="outline" className="w-full sm:w-auto" disabled={bulkUploading} onClick={() => setBulkUploadConfirmOpen(false)}>Cancel</Button>
                <Button
                  type="button"
                  className="w-full sm:w-auto"
                  disabled={bulkUploading}
                  onClick={() => {
                    void handleBulkRenewalUpload(bulkUploadSubmitMode);
                  }}
                >
                  {bulkUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {bulkUploading
                    ? "Processing..."
                    : bulkUploadSubmitMode === "draft"
                      ? "Save Draft"
                      : activeRenewal?.status === "needs_revision"
                        ? "Submit Corrections"
                        : "Submit for Review"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <PortalDocumentDrawer
            open={Boolean(attachedRenewalPreview)}
            onOpenChange={(open) => {
              if (!open) setAttachedRenewalPreview(null);
            }}
            mode="attached"
            file={attachedRenewalPreview?.file}
            documentTypeName={attachedRenewalPreview?.documentTypeName}
            previewUrl={attachedRenewalPreview?.previewUrl || ""}
            previewCanInline
            organizationName={currentProfile?.organizationName || "Your organization"}
            saving={bulkUploading}
            downloading={downloadingRenewalAttachment}
            onDownloadFile={async (url, fileName) => {
              if (!openFile) return;
              setDownloadingRenewalAttachment(true);
              try {
                await openFile(url, fileName);
              } finally {
                setDownloadingRenewalAttachment(false);
              }
            }}
            onOpenInNewTab={(url) => {
              if (openFile) void openFile(url);
              else if (url) window.open(url, "_blank", "noopener,noreferrer");
            }}
            onReplaceFile={
              attachedRenewalPreview?.file.adminStatus === "needs_revision" && canCorrectFlaggedFiles
                ? () => {
                    const documentTypeId = attachedRenewalPreview.documentTypeId;
                    setAttachedRenewalPreview(null);
                    triggerRevisionReplacement(documentTypeId);
                  }
                : undefined
            }
          />

      </div>
      <EndorsementGuidelinesModal open={endorsementModalOpen} onOpenChange={setEndorsementModalOpen} />
    </div>
  );
};
