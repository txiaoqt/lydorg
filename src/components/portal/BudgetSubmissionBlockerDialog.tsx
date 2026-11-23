import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getBudgetSubmissionBlockerCopy, type BudgetSubmissionBlocker } from "@/lib/budget-submission-blocker";

export function BudgetSubmissionBlockerDialog({
  open,
  onOpenChange,
  blocker,
  onAction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blocker: BudgetSubmissionBlocker | null;
  onAction?: () => void;
}) {
  if (!blocker) return null;
  const copy = getBudgetSubmissionBlockerCopy(blocker);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-2rem)] rounded-2xl sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-800 sm:mx-0">
            <AlertTriangle aria-hidden="true" className="h-5 w-5" />
          </div>
          <DialogTitle>{copy.heading}</DialogTitle>
          <DialogDescription>{copy.description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {onAction ? (
            <Button type="button" onClick={onAction}>
              {copy.actionLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
