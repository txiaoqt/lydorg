import React, { useState, useEffect, useMemo, useRef } from "react";
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
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  UploadCloud,
  Check,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
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
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { OrganizationProfile, OrganizationRenewalRecord, SubmissionFile, TemplateRecord } from "@/lib/lydo-connect-data";
import type { UserFacingRenewalState } from "@/lib/organization-renewal";
import {
  fetchRenewalPacketInSupabase,
  fetchRenewalRequiredDocumentTypesInSupabase,
  uploadRenewalDocumentFileInSupabase,
  replaceRenewalDocumentFileInSupabase,
  userSubmitRenewalInSupabase,
  userResubmitRenewalInSupabase,
} from "@/lib/lydo-connect-supabase";

export interface UserPortalRenewalWorkspaceViewProps {
  currentProfile: OrganizationProfile | null;
  userRenewalState: UserFacingRenewalState | null;
  activeRenewal: OrganizationRenewalRecord | null;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  onStartRenewal?: () => void;
  startingRenewal?: boolean;
  openPreview?: (fileUrl: string, title: string) => void;
  openFile?: (fileUrl: string, downloadName?: string) => void;
  onRenewalUpdated?: (renewal: OrganizationRenewalRecord) => void;
}

const isPdfFile = (file: File) => file.type === "application/pdf" && /\.pdf$/i.test(file.name);

const validatePdfUpload = async (file: File) => {
  if (!isPdfFile(file)) return "Only PDF files can be uploaded for this renewal submission.";
  if (!file.size) return "The selected PDF is empty.";
  if (file.size > 25 * 1024 * 1024) return "File size must not exceed 25MB.";

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

export const UserPortalRenewalWorkspaceView: React.FC<UserPortalRenewalWorkspaceViewProps> = ({
  currentProfile,
  userRenewalState,
  activeRenewal: initialActiveRenewal,
  navigate,
  userRouteMap,
  onStartRenewal,
  startingRenewal = false,
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
  const [uploadingDocId, setUploadingDocId] = useState<string | null>(null);
  const [submittingRenewal, setSubmittingRenewal] = useState(false);
  const [resubmittingRenewal, setResubmittingRenewal] = useState(false);
  const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "approved" | "review" | "revision" | "missing">("all");

  // Hidden File Input Trigger State
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    docTypeId: string;
    docTypeName: string;
    isReplacement: boolean;
    fileId?: string;
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

  const orgName = currentProfile?.organizationName || "Organization";
  const cycleNumber = activeRenewal?.cycleNumber ?? userRenewalState?.cycleNumber ?? 2;
  const isReadOnlyRenewal =
    activeRenewal?.status === "submitted" ||
    activeRenewal?.status === "under_review" ||
    activeRenewal?.status === "resubmitted" ||
    activeRenewal?.status === "rejected" ||
    activeRenewal?.status === "approved";

  // Map file by document type ID
  const filesByDocTypeId = useMemo(() => {
    const map = new Map<string, SubmissionFile>();
    files.forEach((file) => {
      if (file.documentTypeId) {
        map.set(file.documentTypeId, file);
      }
    });
    return map;
  }, [files]);

  // File lookup helper
  const getFileForDoc = (doc: TemplateRecord): SubmissionFile | null => {
    return filesByDocTypeId.get(doc.id) || filesByDocTypeId.get(doc.databaseId) || null;
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

  const unresolvedFlaggedCount = useMemo(() => {
    return files.filter(
      (f) => f.adminStatus === "needs_revision" || f.adminStatus === "rejected_red" || f.adminStatus === "rejected",
    ).length;
  }, [files]);

  const completionPercent = totalMandatoryCount > 0
    ? Math.round((uploadedFilesCount / totalMandatoryCount) * 100)
    : 0;

  const isPacketComplete = totalMandatoryCount > 0 && uploadedFilesCount >= totalMandatoryCount;

  // File input triggers: cleanly separated draft upload vs hardened revision replacement
  const triggerDraftUpload = (docTypeId: string, docTypeName: string) => {
    setPendingUpload({ docTypeId, docTypeName, isReplacement: false });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const triggerRevisionReplacement = (fileId: string, docTypeId: string, docTypeName: string) => {
    setPendingUpload({ docTypeId, docTypeName, isReplacement: true, fileId });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  // File Input Change Handler
  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingUpload) return;

    const errorMsg = await validatePdfUpload(file);
    if (errorMsg) {
      toast({
        title: "Invalid file",
        description: errorMsg,
        variant: "destructive",
      });
      return;
    }

    if (pendingUpload.isReplacement && pendingUpload.fileId) {
      await handleReplacementFile(pendingUpload.fileId, pendingUpload.docTypeId, pendingUpload.docTypeName, file);
    } else {
      await handleUploadFile(pendingUpload.docTypeId, pendingUpload.docTypeName, file);
    }
  };

  // Upload handler for draft files
  const handleUploadFile = async (docTypeId: string, docTypeName: string, file: File) => {
    if (!currentProfile?.id || !activeRenewal?.id || !submission?.id) {
      toast({
        title: "Cannot upload",
        description: "Renewal packet is not initialized.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingDocId(docTypeId);
      const savedFile = await uploadRenewalDocumentFileInSupabase({
        organizationId: currentProfile.id,
        renewalId: activeRenewal.id,
        submissionId: submission.id,
        documentTypeId: docTypeId,
        file,
      });

      setFiles((prev) => {
        const remaining = prev.filter((f) => f.documentTypeId !== docTypeId && f.id !== savedFile.id);
        return [...remaining, savedFile];
      });

      toast({
        title: "Document uploaded",
        description: `${file.name} saved for ${docTypeName}.`,
      });
    } catch (err: any) {
      console.error("Failed to upload document:", err);
      toast({
        title: "Upload failed",
        description: err?.message || "Failed to upload document file.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocId(null);
    }
  };

  // Replacement handler for flagged files in revision
  const handleReplacementFile = async (fileId: string, docTypeId: string, docTypeName: string, file: File) => {
    if (!currentProfile?.id || !activeRenewal?.id) {
      toast({
        title: "Cannot replace",
        description: "Renewal context is missing.",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploadingDocId(docTypeId);
      const replacedFile = await replaceRenewalDocumentFileInSupabase({
        organizationId: currentProfile.id,
        renewalId: activeRenewal.id,
        fileId,
        documentTypeId: docTypeId,
        file,
      });

      setFiles((prev) => {
        const index = prev.findIndex((f) => f.id === fileId || f.documentTypeId === docTypeId);
        if (index >= 0) {
          const next = [...prev];
          next[index] = replacedFile;
          return next;
        }
        return [...prev, replacedFile];
      });

      toast({
        title: "Document replaced",
        description: `Replacement file ${file.name} submitted for ${docTypeName}.`,
      });
    } catch (err: any) {
      console.error("Replacement failed:", err);
      toast({
        title: "Replacement failed",
        description: err?.message || "Failed to replace document file.",
        variant: "destructive",
      });
    } finally {
      setUploadingDocId(null);
    }
  };

  // Submit Renewal Handler
  const handleFinalSubmit = async () => {
    if (!activeRenewal?.id) return;
    try {
      setSubmittingRenewal(true);
      const res = await userSubmitRenewalInSupabase(activeRenewal.id);
      toast({
        title: "Renewal Application Submitted",
        description: "Your 6 renewal documents are now under administrative review by LYDO.",
      });
      setConfirmSubmitOpen(false);

      const updated: OrganizationRenewalRecord = {
        ...activeRenewal,
        status: "submitted",
        submittedAt: res.submittedAt,
      };
      setActiveRenewal(updated);
      onRenewalUpdated?.(updated);

      // Refresh packet
      const packet = await fetchRenewalPacketInSupabase(activeRenewal.id);
      setSubmission(packet.submission);
      setFiles(packet.files);
    } catch (err: any) {
      console.error("Submission failed:", err);
      toast({
        title: "Submission failed",
        description: err?.message || "An unexpected error occurred during submission.",
        variant: "destructive",
      });
    } finally {
      setSubmittingRenewal(false);
    }
  };

  // Resubmit Renewal Handler
  const handleResubmit = async () => {
    if (!activeRenewal?.id) return;
    try {
      setResubmittingRenewal(true);
      const res = await userResubmitRenewalInSupabase(activeRenewal.id);
      toast({
        title: "Renewal Application Resubmitted",
        description: "Your corrected renewal documents have been submitted for review.",
      });

      const updated: OrganizationRenewalRecord = {
        ...activeRenewal,
        status: "resubmitted",
        updatedAt: res.resubmittedAt,
      };
      setActiveRenewal(updated);
      onRenewalUpdated?.(updated);

      // Refresh packet
      const packet = await fetchRenewalPacketInSupabase(activeRenewal.id);
      setSubmission(packet.submission);
      setFiles(packet.files);
    } catch (err: any) {
      console.error("Resubmission failed:", err);
      toast({
        title: "Resubmission failed",
        description: err?.message || "An unexpected error occurred during resubmission.",
        variant: "destructive",
      });
    } finally {
      setResubmittingRenewal(false);
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
          return file?.adminStatus === "submitted" || file?.adminStatus === "under_review";
        }
        if (statusFilter === "revision") {
          return file?.adminStatus === "needs_revision" || file?.adminStatus === "rejected_red";
        }
        if (statusFilter === "missing") {
          return !file?.fileUrl;
        }
        return true;
      });
  }, [requiredDocTypes, filesByDocTypeId, searchQuery, statusFilter]);

  const getStatusBadge = () => {
    switch (activeRenewal?.status) {
      case "draft":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30">Draft In Progress</Badge>;
      case "submitted":
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30">Submitted (Pending Review)</Badge>;
      case "under_review":
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30">Under Admin Review</Badge>;
      case "needs_revision":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">Revision Requested</Badge>;
      case "resubmitted":
        return <Badge variant="outline" className="bg-sky-500/10 text-sky-600 border-sky-500/30">Resubmitted (Under Review)</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">Approved</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/30">Not Approved</Badge>;
      default:
        if (userRenewalState?.canStartRenewal) {
          return <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Available to Start</Badge>;
        }
        return <Badge variant="outline" className="bg-muted text-muted-foreground border-border">Accreditation Standing</Badge>;
    }
  };

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

      {/* Main Container Card */}
      <Card className="border border-border/70 rounded-2xl shadow-xs overflow-hidden">
        <CardHeader className="bg-muted/20 border-b border-border/50 p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Y-TRACE Cycle {cycleNumber}
                </span>
                {getStatusBadge()}
              </div>
              <CardTitle className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Accreditation Renewal Workspace
              </CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Official renewal packet for <span className="font-semibold text-foreground">{orgName}</span>.
              </CardDescription>
            </div>

            {/* Top Right Action Button */}
            {userRenewalState?.canStartRenewal && !activeRenewal && (
              <Button
                onClick={onStartRenewal}
                disabled={startingRenewal}
                size="lg"
                className="font-bold text-xs sm:text-sm rounded-xl shrink-0"
              >
                {startingRenewal ? "Starting Renewal..." : "Initialize Renewal Draft →"}
              </Button>
            )}

            {activeRenewal?.status === "draft" && (
              <Button
                size="lg"
                disabled={!isPacketComplete || submittingRenewal}
                onClick={() => setConfirmSubmitOpen(true)}
                className="font-bold text-xs sm:text-sm rounded-xl shrink-0 gap-1.5"
              >
                {submittingRenewal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Submit Renewal Application →
                  </>
                )}
              </Button>
            )}

            {activeRenewal?.status === "needs_revision" && (
              <Button
                size="lg"
                disabled={unresolvedFlaggedCount > 0 || resubmittingRenewal}
                onClick={handleResubmit}
                className="font-bold text-xs sm:text-sm rounded-xl shrink-0 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {resubmittingRenewal ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Resubmitting...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Resubmit Renewal Application →
                  </>
                )}
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Expired Accreditation Alert with Paused Privileges Communication */}
          {userRenewalState?.isExpired && (
            <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-200 flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <h4 className="font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
                  Accreditation Term Expired • Renewal Window Open
                </h4>
                <p className="leading-relaxed">
                  Your organization's previous 3-year term has elapsed. Official privileges requiring active accreditation (new budget grants, pending budget releases, and YPOP score credits) are paused until renewal is officially approved. Previously released funds remain valid and subject to liquidation and accounting.
                </p>
                {userRenewalState.lateCutoffDate && (
                  <p className="font-semibold text-rose-700 dark:text-rose-300 pt-0.5">
                    Late renewal remains available through {userRenewalState.lateCutoffDate} (Day 180).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Admin Remarks Alert if revision requested or rejected */}
          {(userRenewalState?.adminRemarks || activeRenewal?.adminRemarks) && (
            <div
              className={cn(
                "p-4 rounded-xl border flex items-start gap-3",
                activeRenewal?.status === "rejected" || userRenewalState?.key === "renewal_rejected"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-800 dark:text-rose-200"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-200",
              )}
            >
              {activeRenewal?.status === "rejected" || userRenewalState?.key === "renewal_rejected" ? (
                <ShieldAlert className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
              )}
              <div className="space-y-1">
                <h4 className="text-xs font-bold uppercase tracking-wider">Administrator Remarks</h4>
                <p className="text-sm leading-relaxed">
                  {userRenewalState?.adminRemarks || activeRenewal?.adminRemarks}
                </p>
                {activeRenewal?.status === "rejected" && (
                  <p className="text-xs font-semibold mt-2 text-rose-700 dark:text-rose-300">
                    This renewal decision is final. Please contact the LYDO office directly to discuss next steps.
                  </p>
                )}
                {activeRenewal?.status === "needs_revision" && (
                  <p className="text-xs font-semibold mt-1 text-amber-700 dark:text-amber-300">
                    Please replace the flagged documents below and resubmit your packet for review.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Read-Only Status Banner when Submitted or Under Review */}
          {(activeRenewal?.status === "submitted" || activeRenewal?.status === "under_review" || activeRenewal?.status === "resubmitted") && (
            <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/10 text-sky-800 dark:text-sky-200 flex items-start gap-3">
              <Clock className="h-5 w-5 shrink-0 text-sky-600 mt-0.5" />
              <div className="space-y-1 text-xs sm:text-sm">
                <h4 className="font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300">
                  {activeRenewal.status === "resubmitted"
                    ? "Resubmitted Renewal Under Review"
                    : activeRenewal.status === "under_review"
                      ? "Active Administrator Review In Progress"
                      : "Renewal Application Submitted"}
                </h4>
                <p className="leading-relaxed">
                  Your renewal packet is currently in review by the LYDO administrator. While under review, documents are locked from modifications. You can preview your submitted files anytime.
                </p>
                {activeRenewal.submittedAt && (
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Submitted on {new Date(activeRenewal.submittedAt).toLocaleDateString("en-PH", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
          )}

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
                  ? "All 6 required documents are present in this packet."
                  : `Upload the remaining ${totalMandatoryCount - uploadedFilesCount} document${totalMandatoryCount - uploadedFilesCount === 1 ? "" : "s"} to enable submission.`}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/60 space-y-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-primary" /> Packet Standing
              </span>
              <p className="text-sm font-bold text-foreground capitalize">
                {activeRenewal?.status ? activeRenewal.status.replace("_", " ") : "Draft Not Started"}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Approved by LYDO: {approvedFilesCount} of {totalMandatoryCount}
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

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search renewal requirements..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-muted-foreground" />
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <Button
                  variant={statusFilter === "all" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="h-8 text-xs font-semibold px-2.5 rounded-lg"
                >
                  All ({requiredDocTypes.length})
                </Button>
                <Button
                  variant={statusFilter === "missing" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("missing")}
                  className="h-8 text-xs font-semibold px-2.5 rounded-lg"
                >
                  Missing ({Math.max(0, totalMandatoryCount - uploadedFilesCount)})
                </Button>
                <Button
                  variant={statusFilter === "revision" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("revision")}
                  className="h-8 text-xs font-semibold px-2.5 rounded-lg text-amber-600 dark:text-amber-400"
                >
                  Flagged ({unresolvedFlaggedCount})
                </Button>
                <Button
                  variant={statusFilter === "approved" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setStatusFilter("approved")}
                  className="h-8 text-xs font-semibold px-2.5 rounded-lg text-emerald-600 dark:text-emerald-400"
                >
                  Approved ({approvedFilesCount})
                </Button>
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
              {filteredRequirements.map((doc, index) => {
                const file = getFileForDoc(doc);
                const hasFile = Boolean(file && file.fileUrl);
                const isUploadingThis = uploadingDocId === doc.id;
                const isApproved = file?.adminStatus === "approved" || file?.adminStatus === "approved_green";
                const isRevision = file?.adminStatus === "needs_revision" || file?.adminStatus === "rejected_red" || file?.adminStatus === "rejected";
                const isSubmitted = file?.adminStatus === "submitted" || file?.adminStatus === "under_review";
                const isDraft = activeRenewal?.status === "draft" && hasFile;

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
                    {/* Top Row: Title, Metadata, Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 sm:gap-3">
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
                            <span className="text-xs font-bold text-muted-foreground mr-1">
                              {index + 1}.
                            </span>
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

                      {/* File Details Info */}
                      <div className="text-[11px] text-muted-foreground text-left sm:text-right shrink-0 pl-12 sm:pl-0">
                        {hasFile ? (
                          <>
                            <span className="font-semibold text-foreground break-all">{file!.fileName}</span>
                            {formatFileSize(file?.fileSize) && (
                              <span className="text-muted-foreground/70 ml-1">
                                ({formatFileSize(file?.fileSize)})
                              </span>
                            )}
                            <div className="text-[10px] text-muted-foreground/80">
                              {file?.uploadedAt ? `Uploaded ${new Date(file.uploadedAt).toLocaleDateString()}` : "Uploaded"}
                            </div>
                          </>
                        ) : (
                          <span className="italic text-muted-foreground/70">No file uploaded</span>
                        )}
                      </div>
                    </div>

                    {/* Admin Remarks Box for flagged revision documents */}
                    {file?.adminRemarks && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-bold">Correction Required:</p>
                          <p className="leading-relaxed">{file.adminRemarks}</p>
                        </div>
                      </div>
                    )}

                    {/* Bottom Action Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pt-2.5 border-t border-border/40 text-xs">
                      {/* Left: Template shortcut or state info */}
                      <div className="text-[11px] text-muted-foreground font-medium flex items-center gap-2">
                        {doc.templateFileUrl && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openPreview?.(doc.templateFileUrl, `${doc.name} (Template)`)}
                            className="h-7 text-[11px] font-semibold text-primary px-2 gap-1"
                          >
                            <FileText className="h-3 w-3" />
                            View Template
                          </Button>
                        )}
                        {isApproved && (
                          <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                            Locked • Document Approved
                          </span>
                        )}
                      </div>

                      {/* Right: Actions */}
                      <div className="flex flex-wrap items-center gap-2 justify-end">
                        {/* Preview File */}
                        {hasFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => openPreview?.(file!.fileUrl, file!.fileName)}
                            className="h-8 text-xs font-semibold gap-1.5"
                          >
                            <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                            Preview
                          </Button>
                        )}

                        {/* Download File */}
                        {hasFile && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => openFile?.(file!.fileUrl, file!.fileName)}
                            className="h-8 text-xs font-semibold gap-1.5 text-muted-foreground"
                          >
                            <Download className="h-3.5 w-3.5" />
                            Download
                          </Button>
                        )}

                        {/* Upload Button (Draft Mode & Missing) */}
                        {activeRenewal?.status === "draft" && !hasFile && (
                          <Button
                            type="button"
                            variant="default"
                            size="sm"
                            disabled={isUploadingThis}
                            onClick={() => triggerDraftUpload(doc.id, doc.name)}
                            className="h-8 text-xs font-bold gap-1.5 rounded-xl shadow-2xs"
                          >
                            {isUploadingThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <UploadCloud className="h-3.5 w-3.5" />
                                Upload Document
                              </>
                            )}
                          </Button>
                        )}

                        {/* Replace Button (Draft Mode & Has File) */}
                        {activeRenewal?.status === "draft" && hasFile && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isUploadingThis}
                            onClick={() => triggerDraftUpload(doc.id, doc.name)}
                            className="h-8 text-xs font-semibold gap-1.5 rounded-xl"
                          >
                            {isUploadingThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Replacing...
                              </>
                            ) : (
                              <>
                                <FileUp className="h-3.5 w-3.5 text-muted-foreground" />
                                Replace
                              </>
                            )}
                          </Button>
                        )}

                        {/* Replace Document Button (Needs Revision Mode on Flagged File) */}
                        {activeRenewal?.status === "needs_revision" && isRevision && (
                          <Button
                            type="button"
                            size="sm"
                            disabled={isUploadingThis}
                            onClick={() => triggerRevisionReplacement(file!.id, doc.id, doc.name)}
                            className="h-8 text-xs font-bold gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-2xs"
                          >
                            {isUploadingThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Replacing...
                              </>
                            ) : (
                              <>
                                <FileUp className="h-3.5 w-3.5" />
                                Replace Document
                              </>
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

          {/* Submission Confirmation Alert Dialog */}
          <AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
            <AlertDialogContent className="rounded-2xl max-w-lg">
              <AlertDialogHeader className="space-y-2">
                <AlertDialogTitle className="text-xl font-black">
                  Submit Renewal Application?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-xs sm:text-sm leading-relaxed text-muted-foreground space-y-2">
                  <span>
                    You are about to submit all 6 required documents for <strong>Cycle {cycleNumber}</strong>.
                  </span>
                  <span className="block">
                    Once submitted, your renewal packet will enter official administrative review by LYDO. Documents cannot be casually edited without an official revision request from the LYDO office.
                  </span>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="gap-2 sm:gap-0 pt-2">
                <AlertDialogCancel disabled={submittingRenewal} className="rounded-xl text-xs font-semibold">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  disabled={submittingRenewal}
                  onClick={handleFinalSubmit}
                  className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {submittingRenewal ? "Submitting..." : "Confirm & Submit Application"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
};
