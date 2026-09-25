import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/portal/StatusBadge";
import { PortalDrawerDocumentSection } from "@/components/portal/PortalDrawerDocumentSection";
import { PortalAttachedFileRow } from "@/components/portal/PortalAttachedFileRow";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Calendar,
  MapPin,
  FileText,
  Upload,
  X,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  createYpopOrgActivityInSupabase,
  updateYpopOrgActivityInSupabase,
  uploadYpopOrgActivityFileToSupabase,
  deleteYpopOrgActivityFileFromSupabase,
  deleteYpopOrgActivityFromSupabase,
  resolveSupabaseFileUrl,
} from "@/lib/lydo-connect-supabase";
import {
  formatRevisionDeadline,
  getRevisionTimeRemaining,
  isRevisionExpired,
  isSubmissionRevisionLocked,
} from "@/lib/revision-deadline";
import type {
  YPOPEntry,
  YPOPOrgActivity,
  YPOPOrgActivityFile,
} from "@/lib/lydo-connect-data";

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

export interface YpopPpaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: YPOPEntry;
  activity: YPOPOrgActivity | null;
  orgActivityFiles: YPOPOrgActivityFile[];
  organizationId: string;
  userId: string;
  onActivitySaved: (activity: YPOPOrgActivity) => void;
  onActivityDeleted?: (activityId: string) => void;
  onFileCreated: (file: YPOPOrgActivityFile) => void;
  onFileDeleted: (fileId: string) => void;
}

export const YpopPpaModal: React.FC<YpopPpaModalProps> = ({
  open,
  onOpenChange,
  entry,
  activity,
  orgActivityFiles,
  organizationId,
  userId,
  onActivitySaved,
  onActivityDeleted,
  onFileCreated,
  onFileDeleted,
}) => {
  const [currentActivity, setCurrentActivity] = useState<YPOPOrgActivity | null>(activity);
  const [activityName, setActivityName] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [venue, setVenue] = useState("");
  const [narrativeReport, setNarrativeReport] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savingAction, setSavingAction] = useState<"draft" | "submit" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [resolvedPreviewUrl, setResolvedPreviewUrl] = useState<string | null>(null);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [errors, setErrors] = useState<{
    activityName?: string;
    activityDate?: string;
    venue?: string;
    narrativeReport?: string;
    files?: string;
  }>({});

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

  const isUnderReview =
    currentActivity?.status === "pending_evaluation" ||
    currentActivity?.status === "submitted" ||
    currentActivity?.status === "under_review";
  const isApproved = currentActivity?.status === "approved";
  const isNeedsRevision = currentActivity?.status === "needs_revision";
  const isRejected = currentActivity?.status === "rejected";
  const isDraft = !currentActivity || currentActivity.status === "draft";
  const isRevisionDeadlineExpired =
    isNeedsRevision &&
    (isRevisionExpired(currentActivity?.revisionDueAt) || isSubmissionRevisionLocked(currentActivity));
  const revisionDeadlineFormatted = isNeedsRevision ? formatRevisionDeadline(currentActivity?.revisionDueAt) : "";
  const revisionTimeRemaining = isNeedsRevision ? getRevisionTimeRemaining(currentActivity?.revisionDueAt) : null;
  const isReadOnly = isUnderReview || isApproved || isRejected || isRevisionDeadlineExpired;

  // Safe delete eligibility: organization-owned records in non-approved states
  const canDelete = Boolean(
    currentActivity &&
    ["draft", "pending_evaluation", "submitted", "under_review", "needs_revision", "rejected"].includes(currentActivity.status) &&
    currentActivity.status !== "approved"
  );

  const [pendingDeletedFileIds, setPendingDeletedFileIds] = useState<string[]>([]);

  const prevOpenRef = useRef(false);
  const prevActivityIdRef = useRef<string | null>(null);

  useEffect(() => {
    const isOpening = open && !prevOpenRef.current;
    const isDifferentActivity = (activity?.id ?? null) !== prevActivityIdRef.current;

    if (isOpening || isDifferentActivity) {
      setCurrentActivity(activity);
      setErrors({});
      setPendingFiles([]);
      setPendingDeletedFileIds([]);
      setSelectedFileId(null);
      if (activity) {
        setActivityName(activity.activityName || "");
        setActivityDate(activity.activityDate || "");
        setVenue(activity.venue || "");
        setNarrativeReport(activity.narrativeReport || "");
      } else {
        setActivityName("");
        setActivityDate(new Date().toISOString().split("T")[0]);
        setVenue("");
        setNarrativeReport("");
      }
    } else if (open && activity) {
      setCurrentActivity((prev) => {
        if (!prev) return activity;
        return {
          ...prev,
          ...activity,
        };
      });
    }

    prevOpenRef.current = open;
    prevActivityIdRef.current = activity?.id ?? null;
  }, [activity, open]);

  // Saved files for this activity from the store (excluding any marked for deletion during revision)
  const currentSavedFiles = currentActivity
    ? orgActivityFiles.filter(
        (f) => f.orgActivityId === currentActivity.id && !pendingDeletedFileIds.includes(f.id)
      )
    : [];

  // Local object URLs for staged pending files
  const [stagedFileObjects, setStagedFileObjects] = useState<
    Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      fileType: string;
      isStaged: boolean;
      rawFile: File;
      index: number;
    }>
  >([]);

  useEffect(() => {
    const objects = pendingFiles.map((f, idx) => ({
      id: `staged-${idx}-${f.name}`,
      fileName: f.name,
      fileUrl: URL.createObjectURL(f),
      fileSize: f.size,
      fileType: f.type || "Document",
      isStaged: true,
      rawFile: f,
      index: idx,
    }));
    setStagedFileObjects(objects);

    return () => {
      objects.forEach((obj) => URL.revokeObjectURL(obj.fileUrl));
    };
  }, [pendingFiles]);

  // Combined previewable file list
  const allFiles = [
    ...currentSavedFiles.map((f) => ({
      id: f.id,
      fileName: f.fileName,
      fileUrl: f.fileUrl,
      fileSize: f.fileSize,
      fileType: f.fileType,
      uploadedAt: f.uploadedAt,
      isStaged: false,
      rawFile: null,
      index: -1,
    })),
    ...stagedFileObjects,
  ];

  // Active file for canonical preview
  const activeFile = allFiles.find((f) => f.id === selectedFileId) || allFiles[0] || null;

  useEffect(() => {
    if (allFiles.length > 0) {
      if (!selectedFileId || !allFiles.some((f) => f.id === selectedFileId)) {
        setSelectedFileId(allFiles[0].id);
      }
    } else {
      setSelectedFileId(null);
    }
  }, [allFiles.length, selectedFileId]);

  // Resolve preview URL for active file
  useEffect(() => {
    let isMounted = true;
    if (!activeFile) {
      setResolvedPreviewUrl(null);
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
      setResolvedPreviewUrl(null);
      return;
    }
    resolveSupabaseFileUrl(activeFile.fileUrl)
      .then((url) => {
        if (isMounted) setResolvedPreviewUrl(url || null);
      })
      .catch(() => {
        if (isMounted) setResolvedPreviewUrl(null);
      });
    return () => {
      isMounted = false;
    };
  }, [activeFile?.id, activeFile?.fileUrl, activeFile?.isStaged]);

  if (!entry) return null;

  const handlePendingFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (errors.files) {
      setErrors((prev) => ({ ...prev, files: undefined }));
    }

    setPendingFiles((prev) => [...prev, ...selectedFiles]);
    toast({
      title: selectedFiles.length > 1 ? "Supporting documents added" : "Supporting document added",
      description: selectedFiles.length > 1 ? `${selectedFiles.length} files attached.` : "Document attached successfully.",
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteSavedFile = async (file: YPOPOrgActivityFile) => {
    setDeletingFileId(file.id);
    const localBlob = localBlobUrlsRef.current.get(file.id);
    if (localBlob) {
      URL.revokeObjectURL(localBlob);
      localBlobUrlsRef.current.delete(file.id);
    }
    localRawFilesRef.current.delete(file.id);

    try {
      await deleteYpopOrgActivityFileFromSupabase(file.id, file.fileUrl);
      onFileDeleted(file.id);
      if (selectedFileId === file.id) {
        const remaining = currentSavedFiles.filter((f) => f.id !== file.id);
        setSelectedFileId(remaining[0]?.id ?? null);
      }
      toast({ title: "File removed", description: "Attachment has been deleted." });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete attachment.",
        variant: "destructive",
      });
    } finally {
      setDeletingFileId(null);
    }
  };

  const handleDownloadFile = async (fileUrl: string, fileName: string, fileId: string) => {
    const staged = stagedFileObjects.find((s) => s.id === fileId);
    const localBlob = staged ? staged.fileUrl : localBlobUrlsRef.current.get(fileId);
    const downloadUrl = localBlob || (await resolveSupabaseFileUrl(fileUrl)) || (fileUrl?.startsWith("storage://") ? "" : fileUrl);

    if (!downloadUrl) {
      toast({
        title: "Download unavailable",
        description: "File preview or download is not accessible yet.",
        variant: "destructive",
      });
      return;
    }

    setDownloadingFileId(fileId);
    try {
      try {
        const response = await fetch(downloadUrl);
        if (!response.ok) throw new Error("Network response was not ok");
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = blobUrl;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
      } catch {
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error) {
      toast({
        title: "Download failed",
        description: error instanceof Error ? error.message : "Unable to download file.",
        variant: "destructive",
      });
    } finally {
      setDownloadingFileId(null);
    }
  };

  const validateSubmissionForm = () => {
    const nextErrors: typeof errors = {};
    if (!activityName.trim()) {
      nextErrors.activityName = "Activity Title is required.";
    }
    if (!activityDate) {
      nextErrors.activityDate = "Date Conducted is required.";
    }
    if (allFiles.length === 0) {
      nextErrors.files = "Attach at least one supporting document before submitting.";
    }
    setErrors(nextErrors);
    return nextErrors;
  };

  const handleSubmitReviewClick = async () => {
    if (uploading || saving) {
      toast({
        title: "Upload in progress",
        description: "Please wait for file attachments to finish uploading.",
        variant: "destructive",
      });
      return;
    }
    if (isRevisionDeadlineExpired) {
      toast({
        title: "Revision deadline expired",
        description: "This PPA activity is locked and can no longer be resubmitted.",
        variant: "destructive",
      });
      return;
    }
    const currentErrors = validateSubmissionForm();
    if (Object.keys(currentErrors).length > 0) {
      const firstError = Object.values(currentErrors)[0];
      toast({
        title: "Incomplete submission",
        description: firstError,
        variant: "destructive",
      });
      if (currentErrors.activityName) {
        document.getElementById("ppa-title")?.focus();
      } else if (currentErrors.activityDate) {
        document.getElementById("ppa-date")?.focus();
      }
      return;
    }
    await executeSave(true);
  };

  const handleSaveDraftClick = async () => {
    if (uploading || saving) return;
    if (!activityName.trim()) {
      toast({
        title: "Title required",
        description: "Please enter the activity title to save draft.",
        variant: "destructive",
      });
      setErrors((prev) => ({ ...prev, activityName: "Activity Title is required." }));
      document.getElementById("ppa-title")?.focus();
      return;
    }
    await executeSave(false);
  };

  const executeSave = async (submitForReview: boolean) => {
    setSaving(true);
    setSavingAction(submitForReview ? "submit" : "draft");
    try {
      const now = new Date().toISOString();
      let targetActivity: YPOPOrgActivity;

      if (currentActivity) {
        targetActivity = await updateYpopOrgActivityInSupabase(currentActivity.id, {
          activityName: activityName.trim(),
          activityDate,
          venue: venue.trim(),
          narrativeReport: narrativeReport.trim(),
          status: currentActivity.status === "needs_revision" ? "needs_revision" : "draft",
        });
      } else {
        targetActivity = await createYpopOrgActivityInSupabase({
          ypopEntryId: entry.id,
          organizationId,
          submittedBy: userId,
          activityName: activityName.trim(),
          activityDate,
          venue: venue.trim(),
          narrativeReport: narrativeReport.trim(),
          status: "draft",
          adminRemarks: "",
          submittedAt: "",
        });
      }
      setCurrentActivity(targetActivity);
      if (!submitForReview) {
        onActivitySaved(targetActivity);
      }

      // If submitForReview is true OR this is a normal draft (not needs_revision), persist file mutations to Supabase
      if (submitForReview || targetActivity.status === "draft") {
        if (pendingDeletedFileIds.length > 0) {
          for (const fileId of pendingDeletedFileIds) {
            const fileObj = orgActivityFiles.find((f) => f.id === fileId);
            if (fileObj) {
              await deleteYpopOrgActivityFileFromSupabase(fileId, fileObj.fileUrl);
              onFileDeleted(fileId);
            }
          }
          setPendingDeletedFileIds([]);
        }

        if (pendingFiles.length > 0) {
          for (const file of pendingFiles) {
            const savedFile = await uploadYpopOrgActivityFileToSupabase({
              orgActivityId: targetActivity.id,
              organizationId,
              file,
            });
            const blobUrl = URL.createObjectURL(file);
            localBlobUrlsRef.current.set(savedFile.id, blobUrl);
            localRawFilesRef.current.set(savedFile.id, file);
            onFileCreated(savedFile);
            setSelectedFileId(savedFile.id);
          }
          setPendingFiles([]);
        }
      }

      if (submitForReview) {
        const submittedActivity = await updateYpopOrgActivityInSupabase(targetActivity.id, {
          status: "submitted",
          submittedAt: now,
          adminRemarks: "",
          revisionHistory: [
            ...(targetActivity.revisionHistory ?? []),
            { action: "submitted", adminRemarks: isNeedsRevision ? "Revision submitted for evaluation." : "", changedAt: now },
          ],
        });
        setCurrentActivity(submittedActivity);
        onActivitySaved(submittedActivity);
        setConfirmSubmitOpen(false);
      }

      toast({
        title: submitForReview ? (isNeedsRevision ? "Revision resubmitted" : "PPA submitted for evaluation") : "Draft saved",
        description: submitForReview
          ? "Your organization PPA is now under evaluation by LYDO Admin."
          : "Draft saved successfully.",
      });
    } catch (error) {
      toast({
        title: "Unable to save PPA activity",
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
      setSavingAction(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!currentActivity) return;
    setDeleting(true);
    try {
      await deleteYpopOrgActivityFromSupabase(currentActivity.id);
      onActivityDeleted?.(currentActivity.id);
      setConfirmDeleteOpen(false);
      onOpenChange(false);
      toast({
        title: "PPA Deleted",
        description: "The organization PPA submission has been removed.",
      });
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Unable to delete activity.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  const headerCategoryAndStatus = (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full border text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
        Organization-Led PPA
      </span>
      {currentActivity?.status && (
        <span
          className={cn(
            "text-[10px] sm:text-[11px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center",
            isApproved && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
            isUnderReview && "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20",
            isNeedsRevision && "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
            isRejected && "bg-destructive/10 text-destructive border-destructive/20",
            isDraft && "bg-muted/80 text-muted-foreground border-border/70"
          )}
        >
          Status: {currentActivity.status.replace("_", " ").toUpperCase()}
        </span>
      )}
    </div>
  );

  const fileSectionTitle = allFiles.length === 1 ? "Attached File" : "Attached Files";

  const bodyContent = (
    <>
      {/* State Banners */}
      {isUnderReview && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3 shadow-2xs">
          <Clock className="h-4.5 w-4.5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 min-w-0 flex-1">
            <p className="font-bold text-blue-700 dark:text-blue-300">
              Awaiting Admin Validation
            </p>
            <p className="text-blue-600/90 dark:text-blue-400/90 leading-snug sm:leading-relaxed break-words">
              PPA activity and supporting documents have been submitted and are under review by the LYDO Admin team.
            </p>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3 shadow-2xs">
          <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 min-w-0 flex-1">
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              PPA Activity Approved
            </p>
            <p className="text-emerald-600/90 dark:text-emerald-400/90 leading-snug sm:leading-relaxed break-words">
              This project has been validated by LYDO Admin and unlocked bonus points toward your organization&apos;s YPOP incentive.
            </p>
          </div>
        </div>
      )}

      {isNeedsRevision && (
        <div
          className={cn(
            "p-3.5 sm:p-4 rounded-xl flex items-start gap-3 shadow-2xs border",
            isRevisionDeadlineExpired
              ? "bg-rose-500/10 border-rose-500/30 text-rose-900 dark:text-rose-200"
              : "bg-amber-500/10 border-amber-500/25 text-amber-900 dark:text-amber-200"
          )}
        >
          <AlertTriangle
            className={cn(
              "h-4.5 w-4.5 shrink-0 mt-0.5",
              isRevisionDeadlineExpired ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"
            )}
          />
          <div className="text-xs space-y-2 min-w-0 flex-1">
            <p
              className={cn(
                "font-bold",
                isRevisionDeadlineExpired ? "text-rose-700 dark:text-rose-300" : "text-amber-700 dark:text-amber-300"
              )}
            >
              {isRevisionDeadlineExpired ? "Revision Deadline Expired (Locked)" : "Admin Revision Requested"}
            </p>
            {currentActivity?.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-amber-500/20 text-foreground font-medium italic break-words">
                &ldquo;{currentActivity.adminRemarks}&rdquo;
              </div>
            )}
            {revisionDeadlineFormatted && (
              <p className="text-xs font-semibold">
                {isRevisionDeadlineExpired
                  ? `The 5-day resubmission deadline expired on ${revisionDeadlineFormatted}. Further file updates or resubmissions are locked.`
                  : `Resubmission deadline: ${revisionDeadlineFormatted} (${revisionTimeRemaining?.label})`}
              </p>
            )}
            {!isRevisionDeadlineExpired && (
              <p className="text-muted-foreground text-[11px] leading-snug sm:leading-relaxed break-words">
                Please review the admin remarks, update the details or attach corrected documents, and resubmit for verification.
              </p>
            )}
          </div>
        </div>
      )}

      {isRejected && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3 shadow-2xs">
          <XCircle className="h-4.5 w-4.5 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs space-y-2 min-w-0 flex-1">
            <p className="font-bold text-destructive">
              Activity Rejected by Admin
            </p>
            {currentActivity?.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-destructive/20 text-foreground font-medium italic break-words">
                &ldquo;{currentActivity.adminRemarks}&rdquo;
              </div>
            )}
            <p className="text-muted-foreground text-[11px] leading-snug sm:leading-relaxed break-words">
              This organization PPA submission was marked rejected by the administrator.
            </p>
          </div>
        </div>
      )}

      {Boolean(currentActivity && currentActivity.status === "draft" && currentSavedFiles.length > 0) && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-start gap-3 shadow-2xs">
          <FileText className="h-4.5 w-4.5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5 min-w-0 flex-1">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              Draft PPA Saved
            </p>
            <p className="text-slate-600/90 dark:text-slate-400/90 leading-snug sm:leading-relaxed break-words">
              Your PPA draft and supporting documents are saved. Click &ldquo;Submit for Review&rdquo; below when ready to submit to the Admin.
            </p>
          </div>
        </div>
      )}

      {/* Activity Details: Clean Read-Only Blocks (when submitted/approved/rejected) vs Editable Form (when draft/revision) */}
      {isReadOnly ? (
        <div className="space-y-3">
          <div className="border-b border-border/40 pb-1">
            <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Activity Information
            </h4>
          </div>

          <div className="p-3.5 sm:p-4 rounded-xl border border-border/70 bg-card shadow-2xs space-y-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Activity Title</span>
              <p className="text-sm sm:text-base font-bold text-foreground break-words">{activityName}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-border/50">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date Conducted</span>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span>
                    {activityDate
                      ? new Date(activityDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                      : "Not specified"}
                  </span>
                </p>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Venue / Location</span>
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="break-words">{venue || "Not specified"}</span>
                </p>
              </div>
            </div>

            {narrativeReport && (
              <div className="space-y-1 pt-2 border-t border-border/50">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Description</span>
                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed break-words">{narrativeReport}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4 pt-1">
          {/* Section 1: Activity Details */}
          <div className="space-y-3">
            <div className="border-b border-border/40 pb-1">
              <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Activity Details
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ppa-title" className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Activity Title</span>
                <span className="text-destructive">*</span>
              </Label>
              <Input
                id="ppa-title"
                placeholder="Enter activity title"
                value={activityName}
                onChange={(e) => {
                  setActivityName(e.target.value);
                  if (errors.activityName) setErrors((prev) => ({ ...prev, activityName: undefined }));
                }}
                className={cn(
                  "text-xs h-9 sm:h-8.5 rounded-lg border-border/80 transition-colors",
                  errors.activityName && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.activityName && (
                <p className="text-[11px] font-medium text-destructive mt-1">{errors.activityName}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ppa-date" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Date Conducted</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ppa-date"
                  type="date"
                  value={activityDate}
                  onChange={(e) => {
                    setActivityDate(e.target.value);
                    if (errors.activityDate) setErrors((prev) => ({ ...prev, activityDate: undefined }));
                  }}
                  className={cn(
                    "text-xs h-9 sm:h-8.5 rounded-lg border-border/80 transition-colors",
                    errors.activityDate && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {errors.activityDate && (
                  <p className="text-[11px] font-medium text-destructive mt-1">{errors.activityDate}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ppa-venue" className="text-xs font-semibold text-foreground flex items-center gap-1">
                  <span>Venue / Location</span>
                  <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="ppa-venue"
                  placeholder="e.g. Barangay Multipurpose Hall"
                  value={venue}
                  onChange={(e) => {
                    setVenue(e.target.value);
                    if (errors.venue) setErrors((prev) => ({ ...prev, venue: undefined }));
                  }}
                  className={cn(
                    "text-xs h-9 sm:h-8.5 rounded-lg border-border/80 transition-colors",
                    errors.venue && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                {errors.venue && (
                  <p className="text-[11px] font-medium text-destructive mt-1">{errors.venue}</p>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Activity Description */}
          <div className="space-y-3 pt-1">
            <div className="border-b border-border/40 pb-1">
              <h4 className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Activity Description
              </h4>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ppa-report" className="text-xs font-semibold text-foreground flex items-center gap-1">
                <span>Description</span>
                <span className="text-destructive">*</span>
              </Label>
              <Textarea
                id="ppa-report"
                placeholder="Description / narrative report summary of the activity..."
                value={narrativeReport}
                onChange={(e) => {
                  setNarrativeReport(e.target.value);
                  if (errors.narrativeReport) setErrors((prev) => ({ ...prev, narrativeReport: undefined }));
                }}
                rows={3}
                className={cn(
                  "text-xs resize-none rounded-lg border-border/80 transition-colors",
                  errors.narrativeReport && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {errors.narrativeReport && (
                <p className="text-[11px] font-medium text-destructive mt-1">{errors.narrativeReport}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Section 3: Supporting Documents / Attached Files */}
      <div className="space-y-3 pt-1 w-full min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-foreground flex items-center gap-1">
              <span>{isReadOnly ? fileSectionTitle : "Supporting Documents"}</span>
              {!isReadOnly && <span className="text-destructive">*</span>}
            </h4>
            {!isReadOnly && isDraft && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Please attach the following: Attendance Sheet and Narrative Report.
              </p>
            )}
            {!isReadOnly && isNeedsRevision && (
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Review previous attachments below. You can remove outdated files or attach updated documents for review.
              </p>
            )}
          </div>
          {allFiles.length > 0 && (
            <span className="text-[11px] text-muted-foreground font-mono">
              {allFiles.length} {allFiles.length === 1 ? "file" : "files"}
            </span>
          )}
        </div>

        {/* Upload dropzone (Only when editable) */}
        {!isReadOnly && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
              onChange={handlePendingFileSelection}
              className="hidden"
            />
            <div
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border border-dashed rounded-xl p-3 sm:p-4 text-center cursor-pointer transition-all space-y-1 select-none",
                errors.files
                  ? "border-destructive/80 bg-destructive/5 hover:border-destructive"
                  : "border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-accent/40"
              )}
            >
              <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-1">
                <Upload className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold text-primary">Click to browse file</p>
              <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                Supports PDF, DOCX, XLSX, JPG, JPEG, and PNG files up to 10 MB
              </p>
            </div>
            {errors.files && (
              <p className="text-[11px] font-medium text-destructive mt-1">{errors.files}</p>
            )}
          </>
        )}

        {/* Attached Files List - Single mechanism: Clicking an attached file selects it */}
        {allFiles.length > 0 && (
          <div
            className={cn(
              "space-y-2",
              allFiles.length > 3 && "max-h-[196px] overflow-y-auto pr-1 overscroll-contain py-0.5"
            )}
          >
            {allFiles.map((file) => {
              const isActive = activeFile?.id === file.id;
              const isStagedFile = Boolean(file.isStaged);
              return (
                <PortalAttachedFileRow
                  key={file.id}
                  file={file}
                  isActive={isActive}
                  onSelect={() => setSelectedFileId(file.id)}
                  status={
                    isStagedFile
                      ? "draft"
                      : isApproved
                      ? "verified"
                      : isUnderReview
                      ? "submitted"
                      : isNeedsRevision
                      ? "needs_revision"
                      : isRejected
                      ? "rejected"
                      : "draft"
                  }
                  statusLabel={
                    isStagedFile
                      ? "Ready to Upload"
                      : isApproved
                      ? "Approved"
                      : isUnderReview
                      ? "Pending Review"
                      : isNeedsRevision
                      ? "Needs Revision"
                      : isRejected
                      ? "Rejected"
                      : "Draft"
                  }
                  canDelete={!isReadOnly}
                  isDeleting={deletingFileId === file.id || uploading}
                  onDelete={() => {
                    if (file.isStaged) {
                      handleRemovePendingFile(file.index);
                    } else {
                      const saved = currentSavedFiles.find((f) => f.id === file.id);
                      if (saved) void handleDeleteSavedFile(saved);
                    }
                  }}
                  deleteTitle="Remove attachment"
                  deleteAriaLabel="Remove attachment"
                />
              );
            })}
          </div>
        )}

        {allFiles.length === 0 && (
          <div className="p-4 rounded-xl border border-dashed border-border/70 text-center text-xs text-muted-foreground">
            No supporting documents attached.
          </div>
        )}

        {/* Canonical Document Preview Section */}
        {activeFile && (
          <div className="pt-2">
            <PortalDrawerDocumentSection
              file={{
                id: activeFile.id,
                fileName: activeFile.fileName,
                fileUrl: activeFile.fileUrl,
                uploadedAt: activeFile.uploadedAt,
                rawFile: activeFile.rawFile,
              }}
              previewUrl={resolvedPreviewUrl || (activeFile.fileUrl.startsWith("storage://") ? "" : activeFile.fileUrl)}
              previewFile={activeFile.rawFile || localRawFilesRef.current.get(activeFile.id) || null}
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
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {headerCategoryAndStatus}
                </div>
              </div>

              <div className="space-y-1 pt-1">
                <SheetTitle
                  className="text-xl font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere]"
                  title={isReadOnly ? (activityName || "Organization-Led Activity Details") : (currentActivity ? "Edit Organization-Led Activity (PPA)" : "Log Organization-led Activities")}
                >
                  {isReadOnly
                    ? (activityName || "Organization-Led Activity Details")
                    : (currentActivity ? "Edit Organization-Led Activity (PPA)" : "Log Organization-led Activities")}
                </SheetTitle>
                <SheetDescription className="text-xs text-muted-foreground font-medium pt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-foreground/80">Organization-Led Activity Details</span>
                  <span>•</span>
                  <span>Record activities initiated and conducted by the organization.</span>
                </SheetDescription>
              </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
              {bodyContent}
            </div>

            {/* PINNED FOOTER */}
            <div className="h-16 py-3 px-6 sm:px-8 border-t border-border/70 bg-card flex items-center justify-between shrink-0">
              {isReadOnly ? (
                <>
                  <div>
                    {canDelete ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving || uploading || deleting}
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="h-9 px-3 rounded-xl text-xs sm:text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Submission</span>
                      </Button>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate mr-4">
                        Organization PPA • LYDO Pasig City
                      </p>
                    )}
                  </div>
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
              ) : (
                <>
                  <div>
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving || uploading || deleting}
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="h-9 px-3 rounded-xl text-xs sm:text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Submission</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving || uploading || deleting}
                        className="h-9 px-5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 justify-center"
                      >
                        Cancel
                      </Button>
                    </SheetClose>

                    {isDraft && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={saving || uploading || deleting}
                        onClick={() => void handleSaveDraftClick()}
                        className="h-9 px-4 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 justify-center"
                      >
                        {savingAction === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        <span>Save as Draft</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={saving || uploading || deleting}
                      onClick={handleSubmitReviewClick}
                      className="h-9 px-4 sm:px-5 text-xs sm:text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-1.5 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                    >
                      {savingAction === "submit" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Upload className="h-3.5 w-3.5" />
                      )}
                      <span>{isNeedsRevision ? "Resubmit for Review" : "Submit for Review"}</span>
                    </Button>
                  </div>
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
              <div className="flex items-center justify-between gap-2.5 w-full">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {headerCategoryAndStatus}
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

              <div className="space-y-1 min-w-0">
                <DialogTitle
                  className="text-base sm:text-lg font-bold text-foreground leading-snug break-words [overflow-wrap:anywhere] line-clamp-2"
                  title={isReadOnly ? (activityName || "Organization-Led Activity Details") : (currentActivity ? "Edit Organization-Led Activity (PPA)" : "Log Organization-led Activities")}
                >
                  {isReadOnly
                    ? (activityName || "Organization-Led Activity Details")
                    : (currentActivity ? "Edit Organization-Led Activity (PPA)" : "Log Organization-led Activities")}
                </DialogTitle>
                <DialogDescription className="text-[11px] sm:text-xs text-muted-foreground font-medium flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-foreground/80">Organization-Led Activity Details</span>
                  <span>•</span>
                  <span>Record activities initiated and conducted by the organization.</span>
                </DialogDescription>
              </div>
            </div>

            {/* SCROLLABLE BODY */}
            <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-3.5 sm:space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
              {bodyContent}
            </div>

            {/* PINNED FOOTER */}
            <div className="p-3 sm:px-6 sm:py-3.5 border-t border-border/70 bg-card shrink-0">
              {isReadOnly ? (
                <div className="flex items-center justify-between gap-2">
                  {canDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={saving || uploading || deleting}
                      onClick={() => setConfirmDeleteOpen(true)}
                      className="h-9 px-3 rounded-xl text-xs sm:text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete Submission</span>
                    </Button>
                  ) : (
                    <p className="text-xs sm:text-sm text-muted-foreground font-medium truncate mr-4">
                      Organization PPA • LYDO Pasig City
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                    className="h-9 px-6 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 justify-center"
                  >
                    Close Drawer
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                  <div>
                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={saving || uploading || deleting}
                        onClick={() => setConfirmDeleteOpen(true)}
                        className="w-full sm:w-auto h-9 px-3 rounded-xl text-xs sm:text-sm font-semibold text-destructive hover:text-destructive hover:bg-destructive/10 cursor-pointer gap-1.5 transition-colors justify-center"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete Submission</span>
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={saving || uploading || deleting}
                      onClick={() => onOpenChange(false)}
                      className="w-full sm:w-auto h-9 px-5 rounded-xl text-xs sm:text-sm font-semibold border border-border bg-background hover:bg-accent hover:text-accent-foreground text-foreground shadow-xs transition-all duration-150 active:scale-[0.98] cursor-pointer shrink-0 justify-center"
                    >
                      Cancel
                    </Button>

                    {isDraft && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={saving || uploading || deleting}
                        onClick={() => void handleSaveDraftClick()}
                        className="w-full sm:w-auto text-xs sm:text-sm font-semibold h-9 sm:h-9.5 px-3.5 sm:px-4 rounded-xl cursor-pointer border-border/80 hover:bg-muted text-foreground transition-colors active:scale-[0.98]"
                      >
                        {savingAction === "draft" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                        <span>Save as Draft</span>
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={saving || uploading || deleting}
                      onClick={handleSubmitReviewClick}
                      className="w-full sm:w-auto text-xs sm:text-sm font-semibold h-9 sm:h-9.5 px-4 sm:px-5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs gap-2 rounded-xl cursor-pointer transition-all active:scale-[0.98]"
                    >
                      {savingAction === "submit" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                      <span>{isNeedsRevision ? "Resubmit for Review" : "Submit for Review"}</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* SUBMISSION CONFIRMATION DIALOG */}
      <AlertDialog open={confirmSubmitOpen} onOpenChange={(val) => { if (!saving) setConfirmSubmitOpen(val); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Submit Organization-Led PPA?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              You are about to submit this activity for LYDO review. Once submitted, the record will enter the review process.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={saving} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={saving}
              onClick={(e) => {
                e.preventDefault();
                void executeSave(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {savingAction === "submit" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span>Submit for Review</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* SAFE DELETE CONFIRMATION DIALOG */}
      <AlertDialog open={confirmDeleteOpen} onOpenChange={(val) => { if (!deleting) setConfirmDeleteOpen(val); }}>
        <AlertDialogContent className="max-w-sm rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              Delete this PPA submission?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              This will permanently remove this organization-created activity record and its uploaded supporting files. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel disabled={deleting} className="rounded-xl text-xs font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-semibold gap-1.5 cursor-pointer"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>Delete Submission</span>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
