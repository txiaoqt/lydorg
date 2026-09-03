import { useState } from "react";
import { CheckCircle, ExternalLink, Info, Loader2, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent } from "@/components/ui/dialog";

type ReplyEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  email: string;
  subject: string;
  organizationName: string;
  onMarkResponded: () => void | Promise<void>;
};

const FieldRow = ({ label, value, withDivider }: { label: string; value: string; withDivider?: boolean }) => (
  <div
    className={cn(
      "flex items-center justify-between gap-2 py-1",
      withDivider && "border-b border-slate-300",
    )}
  >
    <p className="font-segoe text-[11px] font-semibold uppercase leading-none text-slate-500">{label}</p>
    <p className="truncate font-segoe text-[13px] font-semibold leading-none text-text-default">{value}</p>
  </div>
);

export const ReplyEmailDialog = ({
  open,
  onOpenChange,
  email,
  subject,
  organizationName,
  onMarkResponded,
}: ReplyEmailDialogProps) => {
  const [savingAction, setSavingAction] = useState<"email" | "status" | null>(null);

  const handleMarkResponded = async (action: "email" | "status") => {
    setSavingAction(action);
    try {
      await onMarkResponded();
      onOpenChange(false);
    } finally {
      setSavingAction(null);
    }
  };

  const handleOpenEmail = async () => {
    const composeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}&su=${encodeURIComponent(`Re: ${subject}`)}`;
    window.open(composeUrl, "_blank", "noopener,noreferrer");
    await handleMarkResponded("email");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex h-[526px] sm:h-[526px] w-[420px] sm:w-[420px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col gap-6 overflow-y-auto rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-public-bg-secondary-100 p-2">
              <Mail className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
            </div>
            <div className="flex flex-col gap-1">
              <p className="font-segoe text-lg font-semibold leading-none text-text-default">Reply via Email</p>
              <p className="font-segoe text-sm font-normal leading-none text-slate-500">{organizationName}</p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default shadow-none transition-colors hover:bg-transparent hover:text-public-text-secondary"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        <div className="flex flex-1 flex-col gap-4">
          <div className="flex items-start gap-2.5 rounded-md border border-brand-info-border bg-brand-info-subtle p-6">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
            <p className="text-justify font-segoe text-[13px] font-normal leading-[120%] text-public-bg-brand">
              Your reply will open in your default email client, addressed to{" "}
              <span className="font-semibold text-public-bg-brand underline">{email}</span>. Replies are sent
              outside the app.
            </p>
          </div>

          <div className="flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface p-6">
            <FieldRow label="Recipient" value={email} withDivider />
            <FieldRow label="Subject" value={subject} />
          </div>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={() => void handleOpenEmail()}
            disabled={savingAction !== null}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-1.5 rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-on-neutral transition-colors disabled:opacity-50",
              "hover:bg-bg-brand-hover",
            )}
          >
            {savingAction === "email" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-public-text-neutral-on-neutral" strokeWidth={1.6} />
            ) : (
              <ExternalLink className="h-4 w-4 shrink-0 text-public-text-neutral-on-neutral" strokeWidth={1.6} />
            )}
            Open Email &amp; Mark as Responded
          </button>
          <button
            type="button"
            onClick={() => void handleMarkResponded("status")}
            disabled={savingAction !== null}
            className={cn(
              "flex h-11 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default transition-colors disabled:opacity-50",
              "hover:bg-slate-50",
            )}
          >
            {savingAction === "status" ? (
              <Loader2 className="h-4 w-4 shrink-0 animate-spin text-public-text-neutral-default" strokeWidth={1.6} />
            ) : (
              <CheckCircle className="h-4 w-4 shrink-0 text-public-text-neutral-default" strokeWidth={1.6} />
            )}
            Mark as Responded
          </button>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={savingAction !== null}
            className={cn(
              "h-11 w-full rounded-md border-0 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-disabled transition-colors disabled:opacity-50",
              "hover:bg-slate-50 hover:text-text-default",
            )}
          >
            Cancel
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
