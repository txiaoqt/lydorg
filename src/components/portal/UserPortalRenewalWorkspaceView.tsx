import React, { useState, useEffect, useMemo, useRef } from "react";
import JSZip from "jszip";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  FileUp,
  Loader2,
  Search,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  Check,
  Info,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
import { resolveCleanTemplateDownloadFileName, type OrganizationProfile, type OrganizationRenewalRecord, type SubmissionFile, type TemplateRecord } from "@/lib/lydo-connect-data";
import type { UserFacingRenewalState } from "@/lib/organization-renewal";
import {
  isSubmissionRevisionLocked,
} from "@/lib/revision-deadline";
import {
  fetchRenewalPacketInSupabase,
  fetchRenewalRequiredDocumentTypesInSupabase,
  subscribeToRenewalPacketChangesInSupabase,
  userStartOrGetRenewalDraftInSupabase,
  uploadRenewalDocumentFileInSupabase,
  replaceRenewalDocumentFileInSupabase,
  resolveSupabaseFileUrl,
  userSubmitRenewalInSupabase,
  userResubmitRenewalInSupabase,
} from "@/lib/lydo-connect-supabase";

export interface UserPortalRenewalWorkspaceViewProps {
  currentProfile: OrganizationProfile | null;
  userRenewalState: UserFacingRenewalState | null;
  activeRenewal: OrganizationRenewalRecord | null;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  openPreview?: (fileUrl: string, title: string) => void | Promise<void>;
  openFile?: (fileUrl: string, downloadName?: string) => void;
  onRenewalUpdated?: (renewal: OrganizationRenewalRecord) => void;
}

const isPdfFile = (file: File) => file.type === "application/pdf" && /\.pdf$/i.test(file.name);

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
  navigate,
  userRouteMap,
  openPreview,
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
  const [bulkUploadFiles, setBulkUploadFiles] = useState<RenewalBatchFile[]>([]);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [downloadingAllTemplates, setDownloadingAllTemplates] = useState(false);
  const [openingPreviewKey, setOpeningPreviewKey] = useState<string | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "review" | "revision">("all");

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

  // Admin review decisions are written in another session. Subscribe to packet
  // changes and refresh while this workspace is open so cell statuses/remarks
  // update without requiring the user to reload the page.
  useEffect(() => {
    const renewalId = activeRenewal?.id;
    if (!renewalId) return;

    let cancelled = false;
    let refreshInProgress = false;
    const refreshPacket = async () => {
      if (cancelled || refreshInProgress || document.visibilityState === "hidden") return;
      refreshInProgress = true;
      try {
        const packet = await fetchRenewalPacketInSupabase(renewalId);
        if (!cancelled) {
          setSubmission(packet.submission);
          setFiles(packet.files);
        }
      } catch (error) {
        // Keep the currently displayed packet if a background refresh fails.
        console.warn("Could not refresh renewal review updates:", error);
      } finally {
        refreshInProgress = false;
      }
    };

    const unsubscribe = subscribeToRenewalPacketChangesInSupabase(
      renewalId,
      submission?.id,
      () => void refreshPacket(),
    );
    const refreshInterval = window.setInterval(() => void refreshPacket(), 15000);
    window.addEventListener("focus", refreshPacket);
    document.addEventListener("visibilitychange", refreshPacket);

    return () => {
      cancelled = true;
      unsubscribe();
      window.clearInterval(refreshInterval);
      window.removeEventListener("focus", refreshPacket);
      document.removeEventListener("visibilitychange", refreshPacket);
    };
  }, [activeRenewal?.id, submission?.id]);

  const orgName = currentProfile?.organizationName || "Organization";
  const cycleNumber = activeRenewal?.cycleNumber ?? userRenewalState?.cycleNumber ?? 2;
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

  const isRenewalRevisionLocked = useMemo(() => {
    if (activeRenewal?.status !== "needs_revision") return false;
    return isSubmissionRevisionLocked(activeRenewal);
  }, [activeRenewal]);

  const bulkAssignableDocTypes = useMemo(() => {
    if (!activeRenewal) return userRenewalState?.canStartRenewal ? requiredDocTypes : [];
    if (activeRenewal.status === "draft") return requiredDocTypes;
    if (!activeRenewal || !["needs_revision", "under_review", "submitted", "resubmitted"].includes(activeRenewal.status)) return [];
    if (activeRenewal.status === "needs_revision" && isRenewalRevisionLocked) return [];
    return requiredDocTypes.filter((doc) => {
      const file = getFileForDoc(doc);
      return Boolean(
        file &&
          file.adminStatus === "needs_revision" &&
          !isSubmissionRevisionLocked(file),
      );
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
      bulkUploadFiles.every((entry) => !entry.validationError && Boolean(entry.documentTypeId)) &&
      new Set(assignedIds).size === bulkUploadFiles.length
    );
  }, [bulkUploadFiles]);

  const canSubmitBulkUpload = useMemo(() => {
    if (!isBulkUploadReady || !bulkUploadFiles.length) return false;
    const stagedRequirementIds = new Set(bulkUploadFiles.map((entry) => entry.documentTypeId));
    return requiredDocTypes.every((doc) => {
      const existing = getFileForDoc(doc);
      if (!existing) return stagedRequirementIds.has(doc.id);
      if (existing.adminStatus === "needs_revision" || existing.adminStatus === "rejected_red" || existing.adminStatus === "rejected") {
        return stagedRequirementIds.has(doc.id);
      }
      return true;
    });
  }, [activeRenewal?.id, bulkUploadFiles, filesByDocTypeId, isBulkUploadReady, requiredDocTypes]);

  const completionPercent = totalMandatoryCount > 0
    ? Math.round((uploadedFilesCount / totalMandatoryCount) * 100)
    : 0;
  const isPacketComplete = totalMandatoryCount > 0 && uploadedFilesCount >= totalMandatoryCount;

  // Row actions select one requirement, then stage its file in the renewal upload dialog.
  const triggerDraftUpload = (docTypeId: string) => {
    setPendingUpload({ docTypeId });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const triggerRevisionReplacement = (docTypeId: string) => {
    setPendingUpload({ docTypeId });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
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
    setBulkUploadOpen(true);
  };

  const handleBulkFilesSelected = async (selectedFiles: FileList | File[] | null) => {
    const filesToAdd = Array.from(selectedFiles ?? []);
    if (!filesToAdd.length) return;

    const stagedFiles = await Promise.all(
      filesToAdd.map(async (file): Promise<RenewalBatchFile> => ({
        id: createRenewalBatchFileId(),
        file,
        documentTypeId: "",
        validationError: (await validatePdfUpload(file)) || undefined,
      })),
    );
    setBulkUploadFiles((current) => [...current, ...stagedFiles]);
  };

  const closeBulkUpload = () => {
    if (bulkUploading) return;
    setBulkUploadOpen(false);
    setBulkUploadFiles([]);
    setPendingUpload(null);
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

  const handleBulkRenewalUpload = async (mode: "draft" | "submit") => {
    if (
      activeRenewal?.status === "approved" ||
      !isBulkUploadReady ||
      (mode === "submit" && !canSubmitBulkUpload) ||
      !currentProfile?.id
    ) return;

    setBulkUploading(true);
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

      for (const entry of bulkUploadFiles) {
        const docType = bulkAssignableDocTypes.find((doc) => doc.id === entry.documentTypeId);
        if (!docType) {
          failures.push({ ...entry, uploadError: "Choose a valid renewal requirement for this file." });
          continue;
        }

        const existingFile = getFileForDoc(docType);
        try {
          const savedFile =
            existingFile && ["needs_revision", "rejected_red", "rejected"].includes(existingFile.adminStatus)
              ? await replaceRenewalDocumentFileInSupabase({
                  organizationId: currentProfile.id,
                  renewalId: renewal.id,
                  fileId: existingFile.id,
                  documentTypeId: docType.id,
                  documentTypeName: docType.name,
                  submitForReview: mode === "submit",
                  file: entry.file,
                })
              : await uploadRenewalDocumentFileInSupabase({
                  organizationId: currentProfile.id,
                  renewalId: renewal.id,
                  submissionId: renewalSubmission.id,
                  documentTypeId: docType.id,
                  documentTypeName: docType.name,
                  file: entry.file,
                });
          uploaded.push({ ...savedFile, documentTypeName: docType.name });
        } catch (error) {
          failures.push({
            ...entry,
            uploadError: error instanceof Error ? error.message : "This file could not be uploaded.",
          });
        }
      }

      if (uploaded.length) {
        setFiles((current) => {
          const remaining = current.filter(
            (existing) => !uploaded.some((saved) => saved.id === existing.id || saved.documentTypeId === existing.documentTypeId),
          );
          return [...remaining, ...uploaded];
        });
      }

      if (mode === "submit" && uploaded.length && !failures.length) {
        const flaggedFiles = files.filter(
          (file) => file.adminStatus === "needs_revision" || file.adminStatus === "rejected_red" || file.adminStatus === "rejected",
        );
        const allFlaggedFilesReplaced =
          renewal.status === "needs_revision" &&
          flaggedFiles.length > 0 &&
          flaggedFiles.every((flaggedFile) => uploaded.some((saved) => saved.id === flaggedFile.id));

        if (allFlaggedFilesReplaced) {
          const result = await userResubmitRenewalInSupabase(renewal.id);
          const updated = { ...renewal, status: "resubmitted" as const, updatedAt: result.resubmittedAt };
          renewal = updated;
          setActiveRenewal(updated);
          onRenewalUpdated?.(updated);
          toast({ title: "Renewal submitted for review", description: "Your corrected documents are now with the PCYDO administrator." });
        } else if (renewal.status === "draft") {
          const result = await userSubmitRenewalInSupabase(renewal.id);
          const updated: OrganizationRenewalRecord = { ...renewal, status: "submitted", submittedAt: result.submittedAt };
          renewal = updated;
          setActiveRenewal(updated);
          onRenewalUpdated?.(updated);
          toast({ title: "Renewal submitted for review", description: `Your ${totalMandatoryCount} required documents are now with the PCYDO administrator.` });
        }

        const packet = await fetchRenewalPacketInSupabase(renewal.id);
        setSubmission(packet.submission);
        setFiles(packet.files);
      } else if (uploaded.length) {
        toast({
          title: failures.length ? "Some renewal documents saved" : mode === "draft" ? "Renewal draft saved" : "Renewal documents saved",
          description: failures.length
            ? `${uploaded.length} file${uploaded.length === 1 ? " was" : "s were"} saved; ${failures.length} need${failures.length === 1 ? "s" : ""} attention.`
            : mode === "draft"
              ? "Your files are saved as a draft and have not been sent to admin."
              : "Files were saved, but the renewal could not be submitted. Review the remaining requirements and try again.",
          variant: failures.length || mode === "submit" ? "destructive" : undefined,
        });
      }

      setBulkUploadFiles(failures);
      if (!failures.length) {
        setBulkUploadOpen(false);
        setBulkUploadFiles([]);
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
      setBulkUploading(false);
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
          return file?.adminStatus === "needs_revision" || file?.adminStatus === "rejected_red";
        }
        return true;
      });
  }, [requiredDocTypes, filesByDocTypeId, searchQuery, statusFilter]);

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-6 max-w-[1440px] mx-auto py-4">
      {/* Hidden File Input for Native PDF Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileInputChange}
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label="Upload document file"
      />

      {/* Navigation Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border/50 pb-4">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(userRouteMap.dashboard || "/dashboard")}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Dashboard</span>
          </Button>
          <span className="text-muted-foreground/40">•</span>
          <span className="text-xs font-semibold text-primary">Accreditation Renewal</span>
        </div>
      </div>

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
                Accreditation Renewal Workspace
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
                Official renewal packet for <span className="font-semibold text-foreground">{orgName}</span>.
              </p>
            </div>

            <div className="flex flex-col items-stretch sm:items-end gap-2.5 w-full sm:w-auto shrink-0">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
                <Button
                  type="button"
                  onClick={() => {
                    setBulkUploadFiles([]);
                    setBulkUploadOpen(true);
                  }}
                  disabled={
                    bulkUploading ||
                    activeRenewal?.status === "approved" ||
                    (!activeRenewal?.id && !userRenewalState?.canStartRenewal)
                  }
                  className="rounded-full bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90 h-9 px-4 text-xs font-bold transition-all shrink-0 gap-1.5 justify-center"
                >
                  <FileUp className="h-4 w-4" />
                  Upload Multiple Documents
                </Button>
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
          {/* Packet Completeness & Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-2 col-span-1 md:col-span-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> Required Documents Uploaded
                </span>
                <span className="font-black text-foreground">
                  {uploadedFilesCount} of {totalMandatoryCount} ({completionPercent}%)
                </span>
              </div>
              <Progress value={completionPercent} className="h-2 rounded-full" />
              <p className="text-[11px] text-muted-foreground">
                {isPacketComplete
                  ? `All ${totalMandatoryCount} required documents are present in this packet.`
                  : `Upload the remaining ${totalMandatoryCount - uploadedFilesCount} document${totalMandatoryCount - uploadedFilesCount === 1 ? "" : "s"} to enable submission.`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Packet Standing
              </span>
              <p className="text-sm font-bold text-foreground">
                {!activeRenewal
                  ? "Draft Not Started"
                  : activeRenewal.status === "draft"
                    ? "Draft"
                    : activeRenewal.status === "approved"
                      ? "Verified"
                      : "Pending Review"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Approved by PCYDO: {approvedFilesCount} of {totalMandatoryCount}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-primary" /> Late Window Cutoff
              </span>
              <p className="text-sm font-bold text-foreground">
                {userRenewalState?.lateCutoffDate || "Day 180"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {userRenewalState?.isExpired ? "Within 180-day grace cutoff" : "Prior to expiration"}
              </p>
            </div>
          </div>

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
                  onClick={() => setStatusFilter(filter)}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-xs font-semibold transition-all whitespace-nowrap cursor-pointer",
                    statusFilter === filter
                      ? "bg-primary text-primary-foreground shadow-2xs"
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
            </div>
          </div>

          {/* Loading indicator */}
          {loadingPacket && (
            <div className="py-12 text-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
              <p className="text-xs text-muted-foreground font-medium">Loading renewal packet and files...</p>
            </div>
          )}

          {/* Packet error notice */}
          {packetError && !loadingPacket && (
            <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/10 text-destructive text-xs">
              <p className="font-bold">Error loading renewal packet</p>
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
                const documentRemarks = file?.adminRemarks || (
                  isRevision && unresolvedFlaggedCount === 1
                    ? userRenewalState?.adminRemarks || activeRenewal?.adminRemarks
                    : null
                );

                // Status Badge Render
                const renderDocBadge = () => {
                  if (isApproved) {
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 shrink-0">
                        <Check className="h-3 w-3" /> Approved
                      </span>
                    );
                  }
                  if (isRevision) {
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20 shrink-0">
                        <AlertTriangle className="h-3 w-3" /> Needs Revision
                      </span>
                    );
                  }
                  if (isDraft) {
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20 shrink-0">
                        <FileText className="h-3 w-3" /> Draft Saved
                      </span>
                    );
                  }
                  if (isSubmitted) {
                    return (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20 shrink-0">
                        <Clock className="h-3 w-3" /> Under Review
                      </span>
                    );
                  }
                  return (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground bg-accent px-2.5 py-0.5 rounded-full border border-border/60 shrink-0">
                      Not Uploaded
                    </span>
                  );
                };

                return (
                  <Card
                    key={doc.id}
                    className={cn(
                      "rounded-2xl border bg-card p-4 sm:p-5 space-y-3 shadow-xs transition-all duration-200",
                      isRevision
                        ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-500/10"
                        : isApproved
                          ? "border-emerald-500/30"
                          : "border-border/60",
                    )}
                  >
                    {/* Top Header Row follows the Documents Submissions requirement cards. */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={cn(
                            "h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                            isApproved
                              ? "bg-emerald-500/10 text-emerald-600"
                              : isRevision
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-primary/10 text-primary",
                          )}
                        >
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

                    {/* Admin Remarks Box for flagged revision documents */}
                    {documentRemarks && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold">Correction Required:</p>
                          <p className="leading-relaxed">{documentRemarks}</p>
                        </div>
                      </div>
                    )}

                    {/* Metadata & Actions Footer Row follows Documents Submissions. */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2.5 border-t border-border/40 text-xs text-muted-foreground">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <span className="font-semibold text-foreground bg-accent/60 px-2 py-0.5 rounded-md border border-border/40 text-[11px] shrink-0">PDF</span>
                        <span>•</span>
                        <span className="truncate">
                          {hasFile
                            ? `${file?.fileName || "Attached document"}${formatFileSize(file?.fileSize) ? ` (${formatFileSize(file?.fileSize)})` : ""} · ${file?.uploadedAt ? `Uploaded ${new Date(file.uploadedAt).toLocaleDateString()}` : "Uploaded"}`
                            : "Never uploaded"}
                        </span>
                        <span>•</span>
                        {isApproved ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Locked from modification</span>
                        ) : isSubmitted ? (
                          <span className="text-sky-600 dark:text-sky-400 font-semibold">Awaiting Review</span>
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
                            className="h-8 min-w-[112px] rounded-xl border-border text-xs font-medium hover:bg-accent cursor-pointer justify-center"
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
                            onClick={() => void handleOpenPreview(`attached:${doc.id}`, file!.fileUrl, file!.fileName)}
                            className="h-8 min-w-[128px] rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 justify-center shadow-2xs"
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
                        {activeRenewal?.status === "draft" && !hasFile && (
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
                        {activeRenewal?.status === "draft" && hasFile && (
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

                        {/* Replace Document Button (Needs Revision Mode on Flagged File) */}
                        {canCorrectFlaggedFiles && file?.adminStatus === "needs_revision" && !isSubmissionRevisionLocked(file) && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isRenewalRevisionLocked}
                            onClick={() => triggerRevisionReplacement(doc.id)}
                            className={cn(
                              "h-8 text-xs font-bold gap-1.5 rounded-xl shadow-2xs",
                              isRenewalRevisionLocked
                                ? "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
                                : "bg-amber-600 hover:bg-amber-700 text-white"
                            )}
                          >
                            {isRenewalRevisionLocked ? (
                              <>
                                <ShieldAlert className="h-3.5 w-3.5" />
                                Revision Locked
                              </>
                            ) : (
                              <>Replace Document</>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          <Dialog open={bulkUploadOpen} onOpenChange={(open) => open ? setBulkUploadOpen(true) : closeBulkUpload()}>
            <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-2xl p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col max-h-[90vh]">
              <DialogHeader className="px-5 sm:px-6 pt-5 pb-4 border-b border-border/60 bg-muted/10 text-left shrink-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <UploadCloud className="h-5 w-5" />
                  </div>
                  <div>
                    <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
                      Upload Renewal Documents
                    </DialogTitle>
                    <DialogDescription className="mt-0.5 text-xs text-muted-foreground">
                      Add several PDFs, assign each to a requirement, then save them as a draft or send the complete packet to PCYDO.
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="min-h-0 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
                <label
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    void handleBulkFilesSelected(event.dataTransfer.files);
                  }}
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/[0.03] px-4 py-7 text-center transition-colors hover:bg-primary/[0.06]"
                >
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    multiple
                    className="sr-only"
                    aria-label="Choose multiple renewal documents"
                    onChange={(event) => {
                      void handleBulkFilesSelected(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                  <FileUp className="h-6 w-6 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Choose or drop PDF files here</span>
                  <span className="text-xs text-muted-foreground">PDF only, up to 10 MB per file</span>
                </label>

                {bulkUploadFiles.length > 0 ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {bulkUploadFiles.length} file{bulkUploadFiles.length === 1 ? "" : "s"} selected
                      </p>
                      <button
                        type="button"
                        disabled={bulkUploading}
                        onClick={() => setBulkUploadFiles([])}
                        className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                      >
                        Clear all
                      </button>
                    </div>
                    {bulkUploadFiles.map((entry) => (
                      <div key={entry.id} className="grid gap-2 rounded-xl border border-border/70 bg-background p-3 sm:grid-cols-[minmax(0,1fr)_minmax(210px,0.9fr)_auto] sm:items-center">
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-foreground">{entry.file.name}</p>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">{formatFileSize(entry.file.size)}</p>
                          {entry.validationError || entry.uploadError ? (
                            <p className="mt-1 text-[11px] font-medium text-destructive">
                              {entry.validationError || entry.uploadError}
                            </p>
                          ) : null}
                        </div>
                        <select
                          value={entry.documentTypeId}
                          disabled={bulkUploading || Boolean(entry.validationError)}
                          onChange={(event) =>
                            setBulkUploadFiles((current) =>
                              current.map((fileEntry) =>
                                fileEntry.id === entry.id
                                  ? { ...fileEntry, documentTypeId: event.target.value }
                                  : fileEntry,
                              ),
                            )
                          }
                          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                          aria-label={`Requirement for ${entry.file.name}`}
                        >
                          <option value="">Assign a renewal requirement</option>
                          {bulkAssignableDocTypes.map((docType) => {
                            const assignedElsewhere = bulkUploadFiles.some(
                              (other) => other.id !== entry.id && other.documentTypeId === docType.id,
                            );
                            return (
                              <option key={docType.id} value={docType.id} disabled={assignedElsewhere}>
                                {docType.name}{assignedElsewhere ? " (assigned)" : ""}
                              </option>
                            );
                          })}
                        </select>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          disabled={bulkUploading}
                          onClick={() => setBulkUploadFiles((current) => current.filter((item) => item.id !== entry.id))}
                          aria-label={`Remove ${entry.file.name}`}
                          className="h-9 w-9 justify-self-end text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 px-3.5 py-3 text-xs leading-relaxed text-muted-foreground">
                  {!activeRenewal || activeRenewal.status === "draft"
                    ? "Save as Draft keeps these files in your renewal workspace without sending them to admin. Submit for Review sends the complete packet directly to PCYDO."
                    : activeRenewal?.status === "needs_revision"
                      ? "Save as Draft stores your corrections without resubmitting. Submit Corrections sends the corrected packet back to PCYDO once every flagged item is replaced."
                      : "Only documents marked Needs Revision can be changed. Save as Draft stores your corrections; Submit Corrections sends them back to PCYDO."}
                </div>
              </div>

              <DialogFooter className="shrink-0 flex flex-col-reverse gap-2 border-t border-border/60 bg-muted/10 px-5 py-3.5 sm:flex-row sm:justify-between sm:px-6">
                <p className="self-center text-xs text-muted-foreground">
                  {bulkUploadFiles.length} selected · {bulkUploadFiles.filter((entry) => !entry.validationError && entry.documentTypeId).length} assigned
                </p>
                <div className="flex flex-col-reverse gap-2 sm:flex-row">
                  <Button type="button" variant="outline" disabled={bulkUploading} onClick={closeBulkUpload}>
                    Cancel
                  </Button>
                  <Button type="button" variant="outline" disabled={!isBulkUploadReady || bulkUploading} onClick={() => void handleBulkRenewalUpload("draft")}>
                    Save as Draft
                  </Button>
                  <Button type="button" disabled={!canSubmitBulkUpload || bulkUploading} onClick={() => void handleBulkRenewalUpload("submit")}>
                    {bulkUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    {bulkUploading ? "Submitting…" : activeRenewal?.status === "needs_revision" ? "Submit Corrections" : "Submit for Review"}
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

      </div>
    </div>
  );
};
