import { useState } from "react";
import { format } from "date-fns";
import { Lock, Unlock } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { isSubmissionRevisionLocked, type RevisionLockStateItem } from "@/lib/revision-deadline";
import { unlockSubmissionRevision, type RevisionUnlockEntityType, type RevisionUnlockResult } from "@/lib/revision-unlock-api";

type Props = {
  entityType: RevisionUnlockEntityType;
  entityId: string;
  item: RevisionLockStateItem;
  onUnlocked: (result: RevisionUnlockResult) => void;
};

/** Shown only while a needs-revision submission is locked past its deadline. */
export function RevisionUnlockPanel({ entityType, entityId, item, onUnlocked }: Props) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!isSubmissionRevisionLocked(item)) return null;

  const dueDate = item.revisionDueAt ? new Date(item.revisionDueAt) : null;
  const dueLabel = dueDate && !Number.isNaN(dueDate.getTime()) ? format(dueDate, "MMMM d, yyyy 'at' h:mm a") : null;

  const unlock = async () => {
    setBusy(true);
    try {
      const result = await unlockSubmissionRevision(entityType, entityId);
      onUnlocked(result);
      setConfirmOpen(false);
      toast({ title: "Resubmission unlocked", description: "The organization can now upload its revised submission." });
    } catch (error) {
      toast({ title: "Unlock failed", description: error instanceof Error ? error.message : "Please try again.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-status-danger-border bg-danger-subtle px-4 py-3">
      <div className="flex min-w-0 items-start gap-2">
        <Lock aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-icon-danger-secondary" />
        <div className="min-w-0">
          <p className="font-inter text-[13px] font-semibold text-icon-danger-secondary">Revision deadline expired (locked)</p>
          <p className="font-inter text-xs text-slate-600">
            {dueLabel ? `The deadline passed on ${dueLabel}. ` : ""}The organization cannot resubmit until you unlock it.
          </p>
        </div>
      </div>
      <Button type="button" size="sm" variant="outline" onClick={() => setConfirmOpen(true)} disabled={busy}>
        <Unlock aria-hidden="true" className="mr-1.5 h-4 w-4" /> Unlock Resubmission
      </Button>
      <AlertDialog open={confirmOpen} onOpenChange={(open) => !busy && setConfirmOpen(open)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-inter text-base font-bold text-text-default">Unlock resubmission?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs leading-relaxed text-slate-600">
              The organization will be able to upload its revised submission again. The original deadline stays in the record history, and this action is logged.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel disabled={busy} className="h-9 text-xs font-medium">Cancel</AlertDialogCancel>
            <Button type="button" disabled={busy} onClick={() => void unlock()} className="h-9 text-xs font-semibold">
              {busy ? "Unlocking..." : "Unlock Resubmission"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
