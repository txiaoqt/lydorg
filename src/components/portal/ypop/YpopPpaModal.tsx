import React, { useRef, useState, useEffect } from "react";
import {
  FileText,
  Upload,
  Trash2,
  ExternalLink,
  Loader2,
  Calendar,
  MapPin,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  XCircle,
  X,
  UploadCloud,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  type YPOPOrgActivity,
  type YPOPOrgActivityFile,
  type YPOPEntry,
} from "@/lib/lydo-connect-data";
import {
  createYpopOrgActivityInSupabase,
  updateYpopOrgActivityInSupabase,
  uploadYpopOrgActivityFileToSupabase,
  deleteYpopOrgActivityFileFromSupabase,
  resolveSupabaseFileUrl,
} from "@/lib/lydo-connect-supabase";

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
  entry: YPOPEntry | null;
  activity: YPOPOrgActivity | null;
  orgActivityFiles: YPOPOrgActivityFile[];
  organizationId: string;
  userId: string;
  onActivitySaved: (activity: YPOPOrgActivity) => void;
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
  onFileCreated,
  onFileDeleted,
}) => {
  const [activityName, setActivityName] = useState("");
  const [activityDate, setActivityDate] = useState("");
  const [venue, setVenue] = useState("");
  const [narrativeReport, setNarrativeReport] = useState("");
  const [remarks, setRemarks] = useState("");
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDesktop = useIsDesktop();

  const isUnderReview = activity?.status === "submitted" || activity?.status === "under_review";
  const isApproved = activity?.status === "approved";
  const isNeedsRevision = activity?.status === "needs_revision";
  const isRejected = activity?.status === "rejected";
  const isDraft = !activity || activity.status === "draft";
  const isReadOnly = isUnderReview || isApproved || isRejected;

  useEffect(() => {
    if (activity) {
      setActivityName(activity.activityName || "");
      setActivityDate(activity.activityDate || "");
      setVenue(activity.venue || "");
      setNarrativeReport(activity.narrativeReport || "");
      setRemarks("");
      setPendingFiles([]);
    } else {
      setActivityName("");
      setActivityDate(new Date().toISOString().split("T")[0]);
      setVenue("");
      setNarrativeReport("");
      setRemarks("");
      setPendingFiles([]);
    }
  }, [activity, open]);

  if (!entry) return null;

  const currentSavedFiles = activity
    ? orgActivityFiles.filter((f) => f.orgActivityId === activity.id)
    : [];

  const handlePendingFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length) return;

    if (activity) {
      // If activity already exists, upload directly
      uploadDirectFiles(selectedFiles);
    } else {
      // If creating a new activity, stage in pending files
      setPendingFiles((prev) => [...prev, ...selectedFiles]);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadDirectFiles = async (filesToUpload: File[]) => {
    if (!activity) return;
    setUploading(true);
    try {
      for (const file of filesToUpload) {
        const saved = await uploadYpopOrgActivityFileToSupabase({
          orgActivityId: activity.id,
          organizationId,
          file,
        });
        onFileCreated(saved);
      }
      toast({
        title: "Attachment uploaded",
        description: `Uploaded ${filesToUpload.length} file(s) successfully.`,
      });
    } catch (error) {
      toast({
        title: "Attachment upload failed",
        description: error instanceof Error ? error.message : "Failed to upload file.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteSavedFile = async (file: YPOPOrgActivityFile) => {
    setDeletingFileId(file.id);
    try {
      await deleteYpopOrgActivityFileFromSupabase(file.id, file.fileUrl);
      onFileDeleted(file.id);
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

  const handleOpenFile = async (fileUrl: string) => {
    try {
      const url = await resolveSupabaseFileUrl(fileUrl);
      window.open(url || fileUrl, "_blank", "noopener,noreferrer");
    } catch {
      window.open(fileUrl, "_blank", "noopener,noreferrer");
    }
  };

  const handleSave = async (submitForReview: boolean) => {
    if (!activityName.trim()) {
      toast({ title: "Title required", description: "Please enter the activity title.", variant: "destructive" });
      return;
    }
    if (!activityDate) {
      toast({ title: "Date required", description: "Please specify the activity date.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const targetStatus = submitForReview ? "submitted" : (activity?.status ?? "draft");
      const now = new Date().toISOString();
      let targetActivityId = activity?.id;

      if (activity) {
        // Update existing
        const updated = await updateYpopOrgActivityInSupabase(activity.id, {
          activityName: activityName.trim(),
          activityDate,
          venue: venue.trim(),
          narrativeReport: narrativeReport.trim(),
          status: targetStatus,
          submittedAt: submitForReview ? now : activity.submittedAt,
        });
        onActivitySaved(updated);
        targetActivityId = updated.id;
      } else {
        // Create new
        const created = await createYpopOrgActivityInSupabase({
          ypopEntryId: entry.id,
          organizationId,
          submittedBy: userId,
          activityName: activityName.trim(),
          activityDate,
          venue: venue.trim(),
          narrativeReport: narrativeReport.trim(),
          status: targetStatus,
          adminRemarks: "",
          submittedAt: submitForReview ? now : "",
        });
        onActivitySaved(created);
        targetActivityId = created.id;
      }

      // If there are pending files staged for upload, upload them now
      if (targetActivityId && pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            const savedFile = await uploadYpopOrgActivityFileToSupabase({
              orgActivityId: targetActivityId,
              organizationId,
              file,
            });
            onFileCreated(savedFile);
          } catch (e) {
            console.error("Failed to upload pending file:", e);
          }
        }
      }

      toast({
        title: submitForReview ? "PPA submitted for review" : "PPA activity saved",
        description: submitForReview
          ? "Your organization PPA is now under review by LYDO Admin."
          : "Saved as draft.",
      });

      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Unable to save PPA activity",
        description: error instanceof Error ? error.message : "Please check your inputs and try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogAnother = () => {
    setActivityName("");
    setActivityDate(new Date().toISOString().split("T")[0]);
    setVenue("");
    setNarrativeReport("");
    setRemarks("");
    setPendingFiles([]);
    // Trigger reset by opening fresh
    onOpenChange(true);
  };

  const headerCategoryAndStatus = (
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
        Organization-Led PPA
      </span>
      {activity && (
        <span className="text-[11px] font-bold text-muted-foreground">
          Status: {activity.status.replace("_", " ").toUpperCase()}
        </span>
      )}
    </div>
  );

  const modalTitleText = activity
    ? isReadOnly
      ? "Organization-Led Activity Details"
      : "Edit Organization-Led Activity (PPA)"
    : "Log Organization-led Activities";

  const modalDescriptionText = "Record activities initiated and conducted by the organization.";

  const bodyContent = (
    <>
      {/* State Banners from Image 5 */}
      {isUnderReview && (
        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/25 flex items-start gap-2.5 text-xs">
          <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
          <p className="text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
            Submitted proof documents are sent to the admin for review and will remain pending until reviewed.
          </p>
        </div>
      )}

      {isApproved && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-start gap-2.5 text-xs">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-bold text-emerald-800 dark:text-emerald-300">PPA Activity Approved</p>
            <p className="text-emerald-700/90 dark:text-emerald-400/90 leading-relaxed">
              This project has been validated by LYDO Admin and unlocked bonus points toward your organization's YPOP incentive.
            </p>
          </div>
        </div>
      )}

      {isNeedsRevision && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-bold text-amber-800 dark:text-amber-300">Admin: Needs revision</p>
            {activity.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-amber-500/20 text-foreground font-medium">
                "{activity.adminRemarks}"
              </div>
            )}
            <p className="text-muted-foreground text-[11px]">
              Please review the admin remarks, update the details or attach corrected documents, and resubmit for review.
            </p>
          </div>
        </div>
      )}

      {isRejected && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/25 flex items-start gap-2.5 text-xs">
          <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
          <div className="space-y-1 flex-1">
            <p className="font-bold text-destructive">Activity Rejected by Admin</p>
            {activity.adminRemarks && (
              <div className="p-2.5 rounded-lg bg-background/80 border border-destructive/20 text-foreground font-medium">
                "{activity.adminRemarks}"
              </div>
            )}
          </div>
        </div>
      )}

      <div className="space-y-3.5 pt-1">
        <div className="space-y-1.5">
          <Label htmlFor="ppa-title" className="text-xs font-bold">
            Activity Title *
          </Label>
          <Input
            id="ppa-title"
            disabled={isReadOnly}
            placeholder="Enter activity title"
            value={activityName}
            onChange={(e) => setActivityName(e.target.value)}
            className="text-xs h-9"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="ppa-date" className="text-xs font-bold">
              Date Conducted *
            </Label>
            <Input
              id="ppa-date"
              type="date"
              disabled={isReadOnly}
              value={activityDate}
              onChange={(e) => setActivityDate(e.target.value)}
              className="text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ppa-venue" className="text-xs font-bold">
              Venue / Location
            </Label>
            <Input
              id="ppa-venue"
              disabled={isReadOnly}
              placeholder="e.g. Barangay Multipurpose Hall"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              className="text-xs h-9"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ppa-report" className="text-xs font-bold">
            Description *
          </Label>
          <Textarea
            id="ppa-report"
            disabled={isReadOnly}
            placeholder="Description / narrative report summary of the activity..."
            value={narrativeReport}
            onChange={(e) => setNarrativeReport(e.target.value)}
            rows={3}
            className="text-xs resize-none"
          />
        </div>

        {!isReadOnly && (
          <div className="space-y-1.5">
            <Label htmlFor="ppa-remarks" className="text-xs font-bold text-muted-foreground">
              Remarks (Optional)
            </Label>
            <Textarea
              id="ppa-remarks"
              placeholder="Any additional remarks or notes for the admin reviewer..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              rows={2}
              className="text-xs resize-none"
            />
          </div>
        )}

        {/* Attach File Section matching Image 5 & 6 */}
        <div className="space-y-2 pt-1">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-xs font-bold text-foreground">
                Attach File {!isReadOnly && <span className="text-destructive">*</span>}
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Please attach the following: Attendance Sheet and Narrative Report.
              </p>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg"
            onChange={handlePendingFileSelection}
            className="hidden"
          />

          {!isReadOnly && (
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

          {/* List of Files (Saved + Staged) */}
          <div className="space-y-2 pt-1">
            {/* Saved Supabase Files */}
            {currentSavedFiles.map((file) => (
              <div
                key={file.id}
                className="p-3 rounded-xl border border-border/70 bg-card flex items-center justify-between gap-3 shadow-2xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-[320px]">
                      {file.fileName}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {file.fileType || "Document"}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {isApproved && (
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Approved
                    </span>
                  )}
                  {isUnderReview && (
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                      Pending Review
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

                  {!isReadOnly && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deletingFileId === file.id}
                      onClick={() => handleDeleteSavedFile(file)}
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

            {/* Staged Pending Files */}
            {pendingFiles.map((file, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border border-dashed border-primary/40 bg-primary/5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-8 w-8 rounded-lg bg-primary/20 text-primary flex items-center justify-center shrink-0">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate max-w-[200px] sm:max-w-[320px]">
                      {file.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {(file.size / 1024).toFixed(0)} KB • Ready to upload
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemovePendingFile(idx)}
                  className="h-7 px-2 text-xs text-destructive hover:bg-destructive/10"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}

            {currentSavedFiles.length === 0 && pendingFiles.length === 0 && (
              <p className="text-[11px] text-muted-foreground italic text-center py-2">
                No files attached.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );

  // DESKTOP / PC: Right-Side Drawer matching Budget Request / Liquidation Report
  if (isDesktop) {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-[min(38rem,95vw)] sm:w-[540px] sm:max-w-xl overflow-y-auto bg-card border-border p-6 sm:p-7 space-y-6">
          <SheetHeader className="space-y-1 border-b border-border/60 pb-4">
            {headerCategoryAndStatus}
            <SheetTitle className="text-xl font-bold text-foreground leading-snug">
              {modalTitleText}
            </SheetTitle>
            <SheetDescription className="text-xs text-muted-foreground">
              {modalDescriptionText}
            </SheetDescription>
          </SheetHeader>

          {bodyContent}

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-border/60">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <SheetClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs font-semibold h-9 w-full sm:w-auto rounded-xl cursor-pointer"
                >
                  {isReadOnly ? "Close Drawer" : "Cancel"}
                </Button>
              </SheetClose>
              {isReadOnly && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleLogAnother}
                  className="text-xs font-bold h-9 text-primary hover:bg-primary/10 w-full sm:w-auto rounded-xl cursor-pointer"
                >
                  Log Another Activity
                </Button>
              )}
            </div>

            {!isReadOnly && (
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {isDraft && (
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={saving}
                    onClick={() => handleSave(false)}
                    className="text-xs font-bold h-9 rounded-xl cursor-pointer"
                  >
                    Save as Draft
                  </Button>
                )}
                <Button
                  type="button"
                  disabled={saving}
                  onClick={() => handleSave(true)}
                  className="text-xs font-bold h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1.5 rounded-xl cursor-pointer"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                  <span>{isNeedsRevision ? "Resubmit for Review" : "Submit for Review"}</span>
                </Button>
              </div>
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
        <DialogHeader className="space-y-1 border-b border-border/60 pb-4">
          {headerCategoryAndStatus}
          <DialogTitle className="text-xl font-bold text-foreground">
            {modalTitleText}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {modalDescriptionText}
          </DialogDescription>
        </DialogHeader>

        {bodyContent}

        {/* Footer Actions */}
        <DialogFooter className="flex flex-col sm:flex-row items-center justify-between gap-2 pt-4 border-t border-border/60">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="text-xs font-semibold h-9 w-full sm:w-auto rounded-xl cursor-pointer"
            >
              {isReadOnly ? "Close" : "Cancel"}
            </Button>
            {isReadOnly && (
              <Button
                type="button"
                variant="outline"
                onClick={handleLogAnother}
                className="text-xs font-bold h-9 text-primary hover:bg-primary/10 w-full sm:w-auto rounded-xl cursor-pointer"
              >
                Log Another Activity
              </Button>
            )}
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              {isDraft && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={saving}
                  onClick={() => handleSave(false)}
                  className="text-xs font-bold h-9 rounded-xl cursor-pointer"
                >
                  Save as Draft
                </Button>
              )}
              <Button
                type="button"
                disabled={saving}
                onClick={() => handleSave(true)}
                className="text-xs font-bold h-9 bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs gap-1.5 rounded-xl cursor-pointer"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                <span>{isNeedsRevision ? "Resubmit for Review" : "Submit for Review"}</span>
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
