import React, { useRef, useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  Loader2,
  Calendar,
  MapPin,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
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
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { cn } from "@/lib/utils";
import {
  getYpopCityLedPoints,
  resolveYpopCityLedCategory,
  YPOP_CITY_LED_CATEGORY_LABELS,
  YPOP_CITY_LED_CATEGORY_TAG_STYLES,
  formatActivityDateRange,
  type YPOPCityActivity,
  type YPOPEventFile,
  type YPOPEventParticipation,
} from "@/lib/lydo-connect-data";
import {
  ensureYpopEventParticipationInSupabase,
  uploadYpopEventFileToSupabase,
  deleteYpopEventFileFromSupabase,
  updateYpopEventParticipationInSupabase,
  resolveSupabaseFileUrl,
} from "@/lib/lydo-connect-supabase";
import { PortalDrawerDocumentSection } from "@/components/portal/PortalDrawerDocumentSection";
import { PortalAttachedFileRow } from "@/components/portal/PortalAttachedFileRow";

export interface YpopProofDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: YPOPCityActivity | null;
  participation: YPOPEventParticipation | null;
  eventFiles: YPOPEventFile[];
  organizationId: string;
  onParticipationUpdated: (participation: YPOPEventParticipation) => void;
  onFileCreated: (file: YPOPEventFile) => void;
  onFileDeleted: (fileId: string) => void;
}

const useIsDesktop = () => {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 1024;
    }
    return true;
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mql = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      setIsDesktop(e.matches);
    };
    setIsDesktop(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return isDesktop;
};

export const YpopProofDrawer: React.FC<YpopProofDrawerProps> = ({
  open,
  onOpenChange,
  activity,
  participation,
  eventFiles,
  organizationId,
  onParticipationUpdated,
  onFileCreated,
  onFileDeleted,
}) => {
  const [currentParticipation, setCurrentParticipation] = useState<YPOPEventParticipation | null>(participation);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [confirmSubmitProofOpen, setConfirmSubmitProofOpen] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string>("");
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const localBlobUrlsRef = useRef<Map<string, string>>(new Map());
  const localRawFilesRef = useRef<Map<string, File>>(new Map());
  const isDesktop = useIsDesktop();

  useEffect(() => {
    return () => {
      localBlobUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      localBlobUrlsRef.current.clear();
      localRawFilesRef.current.clear();
    };
  }, []);

  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [pendingDeletedFileIds, setPendingDeletedFileIds] = useState<string[]>([]);

  const prevOpenRef = useRef(false);
  const prevActivityIdRef = useRef<string | null>(null);
  const prevParticipationIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isOpening = open && !prevOpenRef.current;
    const isDifferentActivity = (activity?.id ?? null) !== prevActivityIdRef.current;
    const isDifferentParticipation =
      (participation?.id ?? null) !== prevParticipationIdRef.current &&
      prevParticipationIdRef.current !== null &&
      participation?.id !== undefined;

    if (isOpening || isDifferentActivity || isDifferentParticipation) {
      setCurrentParticipation(participation);
      setPendingFiles([]);
      setPendingDeletedFileIds([]);
      setSelectedFileId(null);
    } else if (open && participation) {
      setCurrentParticipation((prev) => {
        if (!prev) return participation;
        return {
          ...prev,
          ...participation,
        };
      });
    }

    prevOpenRef.current = open;
    prevActivityIdRef.current = activity?.id ?? null;
    prevParticipationIdRef.current = participation?.id ?? null;
  }, [participation, activity, open]);

  const category = activity ? resolveYpopCityLedCategory(activity.category, activity.points) : "mandatory";
  const points = activity ? (activity.points ?? getYpopCityLedPoints(category)) : 0;

  const currentSavedFiles = currentParticipation
    ? eventFiles.filter((f) => f.participationId === currentParticipation.id && !pendingDeletedFileIds.includes(f.id))
    : [];

  const [stagedFileObjects, setStagedFileObjects] = useState<
    Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      fileType: string;
      uploadedAt: string;
      isStaged: boolean;
      rawFile: File;
      index: number;
    }>
  >([]);

  useEffect(() => {
    const objects = pendingFiles.map((f, idx) => ({
      id: `staged-city-${idx}-${f.name}`,
      fileName: f.name,
      fileUrl: URL.createObjectURL(f),
      fileSize: f.size,
      fileType: f.type || "Document",
      uploadedAt: new Date().toISOString(),
      isStaged: true,
      rawFile: f,
      index: idx,
    }));
    setStagedFileObjects(objects);

    return () => {
      objects.forEach((obj) => URL.revokeObjectURL(obj.fileUrl));
    };
  }, [pendingFiles]);

  const allFiles: Array<{
    id: string;
    fileName: string;
    fileUrl: string;
    fileSize?: number;
    fileType?: string;
    uploadedAt: string;
    isStaged?: boolean;
    rawFile?: File | null;
    index?: number;
  }> = [
    ...currentSavedFiles.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileUrl: f.fileUrl,
      fileSize: f.fileSize,
      fileType: f.fileType,
      uploadedAt: f.uploadedAt,
      isStaged: false,
      rawFile: localRawFilesRef.current.get(f.id) || null,
      index: -1,
    })),
    ...stagedFileObjects,
  ];

  const files = allFiles;

  const isVerified = currentParticipation?.status === "verified";
  const isNeedsRevision = currentParticipation?.status === "needs_revision";
  const isRejected = currentParticipation?.status === "rejected";
  const isPending =
    currentParticipation?.status === "pending_evaluation" ||
    currentParticipation?.status === "pending_verification";
  const isDraft = !currentParticipation || currentParticipation.status === "draft";
  const isEditable = !isVerified && !isRejected && !isPending && (isDraft || isNeedsRevision);

  const activeFile = files.find((f) => f.id === selectedFileId) || files[0] || null;

  useEffect(() => {
    let isMounted = true;
    if (!activeFile) {
      setResolvedPreviewUrl("");
      return;
    }

    if (activeFile.isStaged) {
      setResolvedPreviewUrl(activeFile.fileUrl);
      return;
    }

    const localBlob = localBlobUrlsRef.current.get(activeFile.id);
    if (localBlob) {
      setResolvedPreviewUrl(localBlob);
      return;
    }

    if (!activeFile.fileUrl) {
      setResolvedPreviewUrl("");
      return;
    }

    resolveSupabaseFileUrl(activeFile.fileUrl)
      .then((url) => {
        if (isMounted) {
          setResolvedPreviewUrl(url);
        }
      })
      .catch(() => {
        if (isMounted) {
          setResolvedPreviewUrl("");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [activeFile?.id, activeFile?.fileUrl, activeFile?.isStaged]);

  useEffect(() => {
    if (files.length > 0) {
      if (!selectedFileId || !files.some((f) => f.id === selectedFileId)) {
        setSelectedFileId(files[0].id);
      }
    } else {
      setSelectedFileId(null);
    }
  }, [files.length, selectedFileId]);

  if (!activity) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (isNeedsRevision) {
      setPendingFiles((prev) => [...prev, ...selectedFiles]);
      toast({
        title: selectedFiles.length > 1 ? "Proof files added" : "Proof file added",
        description: selectedFiles.length > 1 ? `Added ${selectedFiles.length} files.` : "File added successfully.",
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      let targetPart = currentParticipation;
      if (!targetPart) {
        targetPart = await ensureYpopEventParticipationInSupabase({
          activityId: activity.id,
          activityName: activity.name,
          activityDate: activity.startDate || activity.date || "",
          venue: activity.venue || "Pasig City",
        });
        setCurrentParticipation(targetPart);
        onParticipationUpdated(targetPart);
      }

      for (const file of selectedFiles) {
        const saved = await uploadYpopEventFileToSupabase({
          participationId: targetPart.id,
          organizationId,
          file,
        });
        const blobUrl = URL.createObjectURL(file);
        localBlobUrlsRef.current.set(saved.id, blobUrl);
        localRawFilesRef.current.set(saved.id, file);
        onFileCreated(saved);
        setSelectedFileId(saved.id);
      }
      toast({
        title: selectedFiles.length > 1 ? "Proof files uploaded" : "Proof file uploaded",
        description: selectedFiles.length > 1 ? `Uploaded ${selectedFiles.length} files successfully.` : "File added successfully.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteFile = async (file: { id: string; fileUrl: string; isStaged?: boolean; index?: number }) => {
    if (file.isStaged && typeof file.index === "number" && file.index >= 0) {
      setPendingFiles((prev) => prev.filter((_, i) => i !== file.index));
      if (selectedFileId === file.id) {
        const remaining = files.filter((f) => f.id !== file.id);
        setSelectedFileId(remaining[0]?.id ?? null);
      }
      toast({
        title: "File removed",
        description: "The proof file has been removed.",
      });
      return;
    }

    if (isNeedsRevision) {
      setPendingDeletedFileIds((prev) => (prev.includes(file.id) ? prev : [...prev, file.id]));
      if (selectedFileId === file.id) {
        const remaining = files.filter((f) => f.id !== file.id);
        setSelectedFileId(remaining[0]?.id ?? null);
      }
      toast({
        title: "File removed",
        description: "Proof file marked for removal on resubmission.",
      });
      return;
    }

    setDeletingFileId(file.id);
    const localBlob = localBlobUrlsRef.current.get(file.id);
    if (localBlob) {
      URL.revokeObjectURL(localBlob);
      localBlobUrlsRef.current.delete(file.id);
    }
    localRawFilesRef.current.delete(file.id);

    if (selectedFileId === file.id) {
      const remaining = files.filter((f) => f.id !== file.id);
      setSelectedFileId(remaining[0]?.id ?? null);
    }
    onFileDeleted(file.id);

    try {
      await deleteYpopEventFileFromSupabase(file.id, file.fileUrl);
      toast({
        title: "File removed",
        description: "The proof file has been deleted.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete file.",
        variant: "destructive",
      });
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string, fileId?: string) => {
    const localBlob = fileId ? localBlobUrlsRef.current.get(fileId) : undefined;
    const targetUrl = localBlob || (await resolveSupabaseFileUrl(fileUrl)) || (fileUrl?.startsWith("storage://") ? "" : fileUrl);
    if (!targetUrl) {
      toast({
        title: "Download unavailable",
        description: "File preview or download is not accessible yet.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (fileId) setDownloadingFileId(fileId);
      const response = await fetch(targetUrl);
      if (!response.ok) throw new Error("Failed to fetch file for download");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "proof-document.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      console.error("Direct blob download failed, falling back to link download:", err);
      const link = document.createElement("a");
      link.href = targetUrl;
      link.download = fileName || "proof-document.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } finally {
      if (fileId) setDownloadingFileId(null);
    }
  };

  const handleSaveDraft = async () => {
    if (uploading || submitting || savingDraft) return;

    setSavingDraft(true);
    try {
      let targetPart = currentParticipation;
      if (!targetPart) {
        targetPart = await ensureYpopEventParticipationInSupabase({
          activityId: activity.id,
          activityName: activity.name,
          activityDate: activity.startDate || activity.date || "",
          venue: activity.venue || "Pasig City",
        });
        setCurrentParticipation(targetPart);
        onParticipationUpdated(targetPart);
      } else {
        const updated = await updateYpopEventParticipationInSupabase(targetPart.id, {
          activityName: activity.name,
          activityDate: activity.startDate || activity.date || "",
          venue: activity.venue || "Pasig City",
          status: targetPart.status === "needs_revision" ? "needs_revision" : "draft",
        });
        setCurrentParticipation(updated);
        onParticipationUpdated(updated);
      }

      toast({
        title: "Draft saved",
        description: "Your participation proof has been saved as a draft.",
      });
    } catch (error) {
      toast({
        title: "Failed to save draft",
        description: error instanceof Error ? error.message : "Unable to save draft.",
        variant: "destructive",
      });
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmitProofClick = () => {
    if (uploading || savingDraft) {
      toast({
        title: "Upload in progress",
        description: "Please wait for file attachments to finish uploading.",
        variant: "destructive",
      });
      return;
    }
    if (!files.length) {
      toast({
        title: "Proof documents required",
        description: "Please attach at least one proof file (attendance sheet, photos, certificates) before submitting.",
        variant: "destructive",
      });
      return;
    }
    setConfirmSubmitProofOpen(true);
  };

  const handleSubmitProof = async () => {
    if (!files.length) {
      toast({
        title: "Proof documents required",
        description: "Please attach at least one proof file (attendance sheet, photos, certificates) before submitting.",
        variant: "destructive",
      });
      return;
    }

    if (!currentParticipation) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();

      if (isNeedsRevision) {
        if (pendingDeletedFileIds.length > 0) {
          for (const fileId of pendingDeletedFileIds) {
            const fileObj = eventFiles.find((f) => f.id === fileId);
            if (fileObj) {
              await deleteYpopEventFileFromSupabase(fileId, fileObj.fileUrl);
              onFileDeleted(fileId);
            }
          }
          setPendingDeletedFileIds([]);
        }

        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            const saved = await uploadYpopEventFileToSupabase({
              participationId: currentParticipation.id,
              organizationId,
              file,
            });
            const blobUrl = URL.createObjectURL(file);
            localBlobUrlsRef.current.set(saved.id, blobUrl);
            localRawFilesRef.current.set(saved.id, file);
            onFileCreated(saved);
            setSelectedFileId(saved.id);
          }
          setPendingFiles([]);
        }
      }

      const updated = await updateYpopEventParticipationInSupabase(currentParticipation.id, {
        proofSubmittedAt: now,
        status: "pending_evaluation",
        revisionHistory: [
          ...(currentParticipation.revisionHistory ?? []),
          {
            action: "pending_evaluation",
            adminRemarks:
              isNeedsRevision ? "Revision submitted for evaluation." : "Submitted for evaluation.",
            changedAt: now,
          },
        ],
      });
      setCurrentParticipation(updated);
      onParticipationUpdated(updated);
      setConfirmSubmitProofOpen(false);
      toast({
        title: isNeedsRevision ? "Revision resubmitted" : "Proof submitted for evaluation",
        description: "Your participation proof has been submitted to the Admin for evaluation.",
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "Unable to submit attendance proof.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const headerCategoryAndPoints = (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={cn(
          "text-[11px] font-bold px-2.5 py-0.5 rounded-full border",
          YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].className
        )}
        style={{
          color: YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].text,
          backgroundColor: YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].background,
          borderColor: YPOP_CITY_LED_CATEGORY_TAG_STYLES[category].border,
        }}
      >
        {YPOP_CITY_LED_CATEGORY_LABELS[category]} Activity
      </span>
      <span className="text-[11px] font-bold text-muted-foreground bg-muted/60 px-2.5 py-0.5 rounded-full border border-border/60">
        {points} Points Weight
      </span>
      {currentParticipation?.status && (
        <span
          className={cn(
            "text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full border inline-flex items-center",
            isVerified && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
            isPending && "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
            isNeedsRevision && "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
            isRejected && "bg-destructive/10 text-destructive border-destructive/20",
            isDraft && "bg-muted/80 text-muted-foreground border-border/70"
          )}
        >
          Status: {currentParticipation.status.replace("_", " ").toUpperCase()}
        </span>
      )}
    </div>
  );

  const headerDateTimeVenue = (
    <>
      <span className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" />
        {formatActivityDateRange(activity.startDate || activity.date, activity.endDate || activity.date)}
      </span>
      <span className="text-muted-foreground/40">•</span>
      <span className="flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        {activity.venue || "Pasig City"}
      </span>
    </>
  );

  const fileSectionTitle = files.length === 0
    ? "Attach File"
    : files.length > 1
      ? "Attached Files"
      : "Attached File";

  const bodyContent = (
    <>
      {/* Status Callout Banner */}
      {isVerified && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 min-w-0 flex-1">
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              Participation Verified
            </p>
            <p className="text-emerald-600/90 dark:text-emerald-400/90 leading-snug sm:leading-relaxed break-words">
              Attendance and supporting proof have been validated by the Admin. This activity contributes {points} points to your City-Led score.
            </p>
          </div>
        </div>
      )}

      {isNeedsRevision && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3 shadow-2xs">
          <AlertTriangle className="h-4.5 w-4.5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-2 min-w-0 flex-1">
            <p className="font-bold text-amber-700 dark:text-amber-300">
              Admin Revision Requested
            </p>
            {currentParticipation?.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-amber-500/20 text-foreground font-medium italic break-words">
                "{currentParticipation.adminRemarks}"
              </div>
            )}
            <p className="text-muted-foreground text-[11px] leading-snug sm:leading-relaxed break-words">
              Please review the admin remarks, attach updated proof files below, and resubmit for verification.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 shadow-2xs">
          <XCircle className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs space-y-2 min-w-0 flex-1">
            <p className="font-bold text-destructive">
              Participation Rejected
            </p>
            {currentParticipation?.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-destructive/20 text-foreground font-medium italic break-words">
                "{currentParticipation.adminRemarks}"
              </div>
            )}
            <p className="text-muted-foreground text-[11px] leading-snug sm:leading-relaxed break-words">
              This participation record was marked rejected by the administrator.
            </p>
          </div>
        </div>
      )}

      {isPending && !isNeedsRevision && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 shadow-2xs">
          <Clock className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 min-w-0 flex-1">
            <p className="font-bold text-blue-700 dark:text-blue-300">
              Awaiting Admin Validation
            </p>
            <p className="text-blue-600/90 dark:text-blue-400/90 leading-snug sm:leading-relaxed break-words">
              Proof documents have been submitted and are under review by the LYDO Admin team.
            </p>
          </div>
        </div>
      )}

      {isDraft && files.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-start gap-3 shadow-2xs">
          <FileText className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 min-w-0 flex-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              Draft Proof Attached
            </p>
            <p className="text-slate-600/90 dark:text-slate-400/90 leading-snug sm:leading-relaxed break-words">
              Your proof files are saved as a draft. Click &ldquo;Submit Proof for Review&rdquo; below when you are ready to submit to the Admin.
            </p>
          </div>
        </div>
      )}

      {/* Files Section */}
      <div className="space-y-3 pt-1 w-full min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
              <span>{fileSectionTitle}</span>
              {isEditable && isDraft && <span className="text-destructive">*</span>}
            </h4>
            {isDraft && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Please attach the following: Attendance Sheet and Narrative Report.
              </p>
            )}
          </div>
          {files.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-mono">
              {files.length} {files.length === 1 ? "file" : "files"}
            </span>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xlsx"
        />

        {/* Canonical Single Upload Surface: ONLY when isEditable (draft or needs_revision) */}
        {isEditable && (
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload proof documents: click or press enter to browse files"
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
            className="border border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-accent/40 rounded-xl p-3.5 sm:p-4 text-center cursor-pointer transition-all space-y-1 select-none focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1">
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
            </div>
            <p className="text-xs font-semibold text-primary">
              {uploading ? "Uploading files..." : "Click to browse file"}
            </p>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
              Supports PDF, DOCX, XLSX, JPG, JPEG, and PNG files up to 10 MB
            </p>
          </div>
        )}

        {/* Quiet empty-state notice for non-editable view when no files exist */}
        {!isEditable && files.length === 0 && (
          <div className="p-4 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
            No proof documents attached.
          </div>
        )}

        {files.length > 0 && (
          <div className="space-y-3">
            {/* Attached Files List - Single mechanism: Clicking an attached file selects it */}
            <div
              className={cn(
                "space-y-2",
                files.length > 3 && "max-h-[196px] overflow-y-auto pr-1 overscroll-contain py-0.5"
              )}
            >
              {files.map((file) => {
                const isActive = activeFile?.id === file.id;
                return (
                  <PortalAttachedFileRow
                    key={file.id}
                    file={file}
                    isActive={isActive}
                    onSelect={() => setSelectedFileId(file.id)}
                    status={
                      isVerified
                        ? "verified"
                        : isPending
                        ? "pending_evaluation"
                        : isNeedsRevision
                        ? "needs_revision"
                        : isRejected
                        ? "rejected"
                        : "draft"
                    }
                    statusLabel={
                      isVerified
                        ? "Approved"
                        : isPending
                        ? "Pending Evaluation"
                        : isNeedsRevision
                        ? "Needs Revision"
                        : isRejected
                        ? "Rejected"
                        : "Draft"
                    }
                    canDelete={isEditable}
                    isDeleting={deletingFileId === file.id}
                    onDelete={() => handleDeleteFile(file)}
                    deleteTitle="Remove file"
                    deleteAriaLabel="Remove file"
                  />
                );
              })}
            </div>

            {/* Canonical Document Preview Section */}
            {activeFile && (
              <div className="pt-2">
                <PortalDrawerDocumentSection
                  file={{
                    id: activeFile.id,
                    fileName: activeFile.fileName,
                    fileUrl: activeFile.fileUrl,
                    uploadedAt: activeFile.uploadedAt,
                  }}
                  previewUrl={resolvedPreviewUrl || (activeFile.fileUrl.startsWith("storage://") ? "" : activeFile.fileUrl)}
                  previewFile={localRawFilesRef.current.get(activeFile.id) || null}
                  isDownloading={downloadingFileId === activeFile.id}
                  onDownloadFile={(url, name, id) => void handleDownloadFile(url, name, id)}
                  formatDateTimeLabel={(date) => new Date(date).toLocaleDateString()}
                  sectionTitle="Document Preview"
                  emptyTitle="No document attached"
                  emptyDescription="No file has been attached to this record."
                  isMobile={!isDesktop}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );

  return (
    <>
      {/* DESKTOP / PC: Right-Side Drawer */}
      {isDesktop ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side="right"
            className="w-full sm:max-w-xl md:max-w-2xl p-0 gap-0 overflow-hidden flex flex-col bg-card border-l border-border/80 shadow-2xl"
          >
            {/* PINNED HEADER */}
            <div className="p-5 sm:p-6 border-b border-border/70 bg-card shrink-0 space-y-2">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  {headerCategoryAndPoints}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <SheetTitle
                  className="text-xl font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere]"
                  title={activity.name}
                >
                  {activity.name}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground font-medium pt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                  {headerDateTimeVenue}
                </SheetDescription>
              </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
              {bodyContent}
            </div>

            {/* PINNED FOOTER */}
            <div className="h-16 py-3 px-6 sm:px-8 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
              {isEditable ? (
                <>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={submitting || uploading || savingDraft}
                      className="h-9 px-5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 justify-center"
                    >
                      Cancel
                    </Button>
                  </SheetClose>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={submitting || uploading || savingDraft}
                      onClick={() => void handleSaveDraft()}
                      className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 justify-center"
                    >
                      {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      <span>Save as Draft</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting || uploading || savingDraft || files.length === 0}
                      onClick={handleSubmitProofClick}
                      className="h-9 px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 flex items-center gap-1.5 sm:gap-2 justify-center"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      <span>{isNeedsRevision ? "Resubmit Corrected Proof" : "Submit Proof for Review"}</span>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate mr-4">
                    YPOP Activity Proof • LYDO Pasig City
                  </p>
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-9 px-6 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 justify-center"
                    >
                      Close Drawer
                    </Button>
                  </SheetClose>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* MOBILE + TABLET: Centered Modal Dialog (< 1024px) */
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            hideCloseButton={true}
            className="w-[95vw] sm:w-[92vw] max-w-3xl h-[92dvh] sm:h-[90vh] max-h-[920px] p-0 overflow-hidden rounded-2xl border border-border/80 bg-card shadow-2xl flex flex-col transition-all duration-200"
          >
            {/* PINNED HEADER */}
            <div className="p-3.5 sm:p-4 border-b border-border/70 bg-card shrink-0 flex flex-col gap-2">
              {/* Row 1: Badges + Dedicated Close Button */}
              <div className="flex items-center justify-between gap-2.5 w-full">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {headerCategoryAndPoints}
                </div>

                <DialogClose asChild>
                  <button
                    type="button"
                    aria-label="Close modal"
                    className="h-8.5 w-8.5 rounded-full border border-border/70 hover:border-border bg-background/80 hover:bg-muted/80 text-muted-foreground hover:text-foreground flex items-center justify-center shrink-0 transition-all duration-150 active:scale-95 cursor-pointer focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </DialogClose>
              </div>

              {/* Row 2: Title */}
              <div className="space-y-1 min-w-0">
                <DialogTitle
                  className="text-base sm:text-lg font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere] line-clamp-2"
                  title={activity.name}
                >
                  {activity.name}
                </DialogTitle>
                {/* Row 3: Subtitle */}
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                  {headerDateTimeVenue}
                </DialogDescription>
              </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
              {bodyContent}
            </div>

            {/* PINNED FOOTER */}
            <div className="p-3 sm:px-6 sm:py-3.5 border-t border-border/70 bg-card shrink-0">
              {isEditable ? (
                <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={submitting || uploading || savingDraft}
                    onClick={() => onOpenChange(false)}
                    className="w-full sm:w-auto text-xs sm:text-sm font-semibold h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-xl cursor-pointer border-border/80 hover:bg-muted text-foreground transition-colors active:scale-[0.98]"
                  >
                    Cancel
                  </Button>

                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={submitting || uploading || savingDraft}
                      onClick={() => void handleSaveDraft()}
                      className="flex-1 sm:flex-initial h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border border-border/80 bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all active:scale-[0.98] cursor-pointer justify-center"
                    >
                      {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                      <span>Save as Draft</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      disabled={submitting || uploading || savingDraft || files.length === 0}
                      onClick={handleSubmitProofClick}
                      className="flex-1 sm:flex-initial h-9 sm:h-9.5 px-3.5 sm:px-4 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-1.5 rounded-xl cursor-pointer transition-all active:scale-[0.98] justify-center"
                    >
                      <Upload className="h-4 w-4" />
                      <span>{isNeedsRevision ? "Resubmit Corrected Proof" : "Submit Proof for Review"}</span>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate mr-4">
                    YPOP Activity Proof • LYDO Pasig City
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="h-9 px-6 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 justify-center"
                  >
                    Close Drawer
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* SUBMISSION CONFIRMATION DIALOG */}
      <AlertDialog open={confirmSubmitProofOpen} onOpenChange={(val) => { if (!submitting) setConfirmSubmitProofOpen(val); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Submit Proof of Attendance?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              You are about to submit your attendance proof for LYDO review. Once submitted, the record will enter the verification process.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={submitting} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={submitting}
              onClick={(e) => {
                e.preventDefault();
                void handleSubmitProof();
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span>Submit Proof</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
