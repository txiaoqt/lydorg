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
  Award,
  Calendar,
  MapPin,
  UploadCloud,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
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
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();

  if (!activity) return null;

  const category = resolveYpopCityLedCategory(activity.category, activity.points);
  const points = activity.points ?? getYpopCityLedPoints(category);

  const files = participation
    ? eventFiles.filter((f) => f.participationId === participation.id)
    : [];

  const isVerified = participation?.status === "verified";
  const isNeedsRevision = participation?.status === "needs_revision";
  const isRejected = participation?.status === "rejected";
  const isPending = participation?.status === "pending_verification";
  const isDraft = !participation || participation.status === "draft";
  const isEditable = !isVerified && (isDraft || isNeedsRevision || isPending);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    setUploading(true);
    try {
      // Auto-ensure participation record exists on proof submission without requiring a separate Join action
      let targetPart = participation;
      if (!targetPart) {
        targetPart = await ensureYpopEventParticipationInSupabase({
          activityId: activity.id,
          activityName: activity.name,
          activityDate: activity.startDate || activity.date || "",
          venue: activity.venue || "Pasig City",
        });
        onParticipationUpdated(targetPart);
      }

      for (const file of selectedFiles) {
        const saved = await uploadYpopEventFileToSupabase({
          participationId: targetPart.id,
          organizationId,
          file,
        });
        onFileCreated(saved);
      }
      toast({
        title: "Proof files uploaded",
        description: `Uploaded ${selectedFiles.length} file(s) successfully as draft.`,
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

  const handleDeleteFile = async (file: YPOPEventFile) => {
    setDeletingFileId(file.id);
    try {
      await deleteYpopEventFileFromSupabase(file.id, file.fileUrl);
      onFileDeleted(file.id);
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

  const handleOpenFile = async (fileUrl: string) => {
    try {
      const url = await resolveSupabaseFileUrl(fileUrl);
      window.open(url || fileUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
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

    if (!participation) return;

    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      const updated = await updateYpopEventParticipationInSupabase(participation.id, {
        proofSubmittedAt: now,
        status: "pending_verification",
        revisionHistory: [
          ...(participation.revisionHistory ?? []),
          { action: "pending_verification", adminRemarks: remarks.trim() || (isNeedsRevision ? "Revision submitted for verification." : "Submitted for verification."), changedAt: now },
        ],
      });
      onParticipationUpdated(updated);
      toast({
        title: isNeedsRevision ? "Revision resubmitted" : "Proof submitted for verification",
        description: "Your participation proof has been submitted to the Admin for review.",
      });
      onOpenChange(false);
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
    <div className="flex items-center gap-2">
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
      <span className="text-xs font-bold text-muted-foreground">
        {points} Points Weight
      </span>
    </div>
  );

  const headerDateTimeVenue = (
    <>
      <span className="flex items-center gap-1">
        <Calendar className="h-3.5 w-3.5" />
        {formatActivityDateRange(activity.startDate || activity.date, activity.endDate || activity.date)}
      </span>
      <span className="flex items-center gap-1">
        <MapPin className="h-3.5 w-3.5" />
        {activity.venue || "Pasig City"}
      </span>
    </>
  );

  const bodyContent = (
    <>
      {/* Status Callout Banner */}
      {isVerified && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-emerald-700 dark:text-emerald-300">
              Participation Verified
            </p>
            <p className="text-emerald-600/90 dark:text-emerald-400/90">
              Attendance and supporting proof have been validated by the Admin. This activity contributes {points} points to your City-Led score.
            </p>
          </div>
        </div>
      )}

      {isNeedsRevision && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 flex-1">
            <p className="font-bold text-amber-700 dark:text-amber-300">
              Admin Revision Requested
            </p>
            {participation?.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-amber-500/20 text-foreground font-medium">
                "{participation.adminRemarks}"
              </div>
            )}
            <p className="text-muted-foreground text-[11px]">
              Please review the admin remarks, attach updated proof files below, and resubmit for verification.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5 flex-1">
            <p className="font-bold text-destructive">
              Participation Rejected
            </p>
            {participation?.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-destructive/20 text-foreground font-medium">
                "{participation.adminRemarks}"
              </div>
            )}
            <p className="text-muted-foreground text-[11px]">
              This participation record was marked rejected by the administrator.
            </p>
          </div>
        </div>
      )}

      {isPending && !isNeedsRevision && (
        <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
          <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-blue-700 dark:text-blue-300">
              Awaiting Admin Validation
            </p>
            <p className="text-blue-600/90 dark:text-blue-400/90">
              Proof documents have been submitted and are under review by the LYDO Admin team.
            </p>
          </div>
        </div>
      )}

      {isDraft && files.length > 0 && (
        <div className="p-4 rounded-xl bg-slate-500/10 border border-slate-500/20 flex items-start gap-3">
          <FileText className="h-5 w-5 text-slate-600 dark:text-slate-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold text-slate-700 dark:text-slate-300">
              Draft Proof Attached
            </p>
            <p className="text-slate-600/90 dark:text-slate-400/90">
              Your proof files are saved as a draft. Click &ldquo;Submit Proof for Review&rdquo; below when you are ready to submit to the Admin.
            </p>
          </div>
        </div>
      )}

      {/* Optional Remarks from Organization */}
      {isEditable && (
        <div className="space-y-1.5 pt-1">
          <Label htmlFor="city-remarks" className="text-xs font-bold text-muted-foreground">
            Remarks (Optional)
          </Label>
          <Textarea
            id="city-remarks"
            placeholder="Add any notes or context regarding your proof submission..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={2}
            className="text-xs resize-none"
          />
        </div>
      )}

      {/* Uploaded Files Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Attach File {isEditable && <span className="text-destructive">*</span>}
            </h4>
            <p className="text-[11px] text-muted-foreground">
              Please attach the following: Attendance Sheet and Narrative Report.
            </p>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          multiple
          accept="image/*,.pdf,.doc,.docx,.xlsx"
        />

        {isEditable && (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-border/80 hover:border-primary/50 bg-muted/20 hover:bg-accent/40 rounded-xl p-5 text-center cursor-pointer transition-all space-y-1.5"
          >
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <UploadCloud className="h-4 w-4" />
            </div>
            <p className="text-xs font-bold text-primary">Click to browse file</p>
            <p className="text-[11px] text-muted-foreground">
              Supports PDF, DOCX, and XLSX documents up to 10 MB
            </p>
          </div>
        )}

        {files.length === 0 ? (
          <div className="p-6 text-center rounded-xl border border-dashed border-border/80 text-xs text-muted-foreground space-y-2 bg-muted/20">
            <FileText className="h-7 w-7 text-muted-foreground mx-auto stroke-1" />
            <p className="font-semibold text-foreground">No proof files attached yet</p>
            <p className="text-[11px]">Upload attendance sheets, event photos, or certificates.</p>
            {isEditable && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs font-bold mt-2"
              >
                <Upload className="h-3.5 w-3.5 mr-1" /> Choose Files
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {files.map((file) => (
              <div
                key={file.id}
                className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate max-w-[220px] sm:max-w-[340px]" title={file.fileName}>
                      {file.fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {file.fileType || "Document"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isVerified && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Approved
                    </span>
                  )}
                  {isPending && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      Pending Review
                    </span>
                  )}
                  {isDraft && (
                    <span className="text-[10px] font-bold text-slate-600 bg-slate-500/10 px-2 py-0.5 rounded-full border border-slate-500/20">
                      Draft
                    </span>
                  )}
                  {isNeedsRevision && (
                    <span className="text-[10px] font-bold text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                      Needs Revision
                    </span>
                  )}
                  {isRejected && (
                    <span className="text-[10px] font-bold text-rose-600 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                      Rejected
                    </span>
                  )}

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleOpenFile(file.fileUrl)}
                    className="h-7 px-2 text-xs text-primary hover:bg-primary/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5 mr-1" /> View
                  </Button>
                  {isEditable && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingFileId === file.id}
                      onClick={() => handleDeleteFile(file)}
                      className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                    >
                      {deletingFileId === file.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );

  // DESKTOP / PC: Right-Side Drawer matching Budget Request / Liquidation Report
  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(38rem,95vw)] sm:w-[540px] sm:max-w-xl overflow-y-auto bg-card border-border p-6 sm:p-7 space-y-6">
          <SheetHeader className="space-y-2 border-b border-border/60 pb-4">
            {headerCategoryAndPoints}
            <SheetTitle className="text-xl font-bold text-foreground leading-snug">
              {activity.name}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
              {headerDateTimeVenue}
            </SheetDescription>
          </SheetHeader>

          {bodyContent}

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-border/60">
            <SheetClose asChild>
              <Button
                type="button"
                variant="outline"
                className="text-xs font-semibold h-9 rounded-xl cursor-pointer"
              >
                {isEditable ? "Cancel" : "Close Drawer"}
              </Button>
            </SheetClose>

            {isEditable && (
              <Button
                type="button"
                disabled={submitting || files.length === 0}
                onClick={handleSubmitProof}
                className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1.5 rounded-xl cursor-pointer"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                <span>{isNeedsRevision ? "Resubmit Corrected Proof" : "Submit Proof for Review"}</span>
              </Button>
            )}
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  // MOBILE + TABLET: Centered Modal Dialog matching Budget Request / Liquidation Report
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:w-[92vw] max-w-2xl max-h-[90vh] overflow-y-auto p-5 sm:p-6 space-y-4 rounded-2xl border border-border/80 bg-card shadow-2xl">
        <DialogHeader className="space-y-2 border-b border-border/60 pb-4">
          {headerCategoryAndPoints}
          <DialogTitle className="text-xl font-bold text-foreground">
            {activity.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
            {headerDateTimeVenue}
          </DialogDescription>
        </DialogHeader>

        {bodyContent}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/60">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="text-xs font-semibold h-9 rounded-xl cursor-pointer"
          >
            {isEditable ? "Cancel" : "Close"}
          </Button>

          {isEditable && (
            <Button
              type="button"
              disabled={submitting || files.length === 0}
              onClick={handleSubmitProof}
              className="h-9 text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1.5 rounded-xl cursor-pointer"
            >
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
              <span>{isNeedsRevision ? "Resubmit Corrected Proof" : "Submit Proof for Review"}</span>
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
