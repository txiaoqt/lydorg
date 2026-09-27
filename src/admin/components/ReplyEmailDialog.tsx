import { useState, useEffect } from "react";
import { CheckCircle, ExternalLink, Info, Loader2, Mail, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { normalizeInquiryStatus, type InquiryRecord } from "@/lib/lydo-connect-data";
import { buildInquiryGmailAccountChooserUrl } from "@/lib/inquiry-reply-url";
import { toast } from "@/hooks/use-toast";

type ReplyEmailDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inquiryId?: string;
  email: string;
  subject: string;
  organizationName: string;
  onMarkReviewed?: () => void | Promise<void>;
  onMarkResponded?: () => void | Promise<void>;
  inquiryStatus?: InquiryRecord["status"];
};

const FieldRow = ({
  label,
  value,
  withDivider,
  allowBreakAll,
}: {
  label: string;
  value: string;
  withDivider?: boolean;
  allowBreakAll?: boolean;
}) => (
  <div
    className={cn(
      "flex flex-col gap-1 py-1",
      withDivider && "border-b border-slate-300 pb-2.5",
    )}
  >
    <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider leading-none text-slate-500">{label}</p>
    <p
      className={cn(
        "font-segoe text-[13px] font-semibold leading-normal text-text-default",
        allowBreakAll ? "break-all" : "break-words [overflow-wrap:anywhere]",
      )}
    >
      {value}
    </p>
  </div>
);

export const ReplyEmailDialog = ({
  open,
  onOpenChange,
  email,
  subject,
  organizationName,
  onMarkReviewed,
  onMarkResponded,
  inquiryStatus,
}: ReplyEmailDialogProps) => {
  const [message, setMessage] = useState("");
  const [savingAction, setSavingAction] = useState<"email" | "status" | null>(null);

  const markAction = onMarkReviewed ?? onMarkResponded;
  const isAlreadyReviewed = inquiryStatus ? normalizeInquiryStatus(inquiryStatus) === "reviewed" : false;
  const replySubject = subject
    ? subject.toLowerCase().startsWith("re:")
      ? subject
      : `Re: ${subject}`
    : "Re: Inquiry";

  useEffect(() => {
    if (open) {
      setMessage("");
      setSavingAction(null);
    }
  }, [open]);

  const handleOpenGmail = async () => {
    if (isAlreadyReviewed) {
      onOpenChange(false);
      return;
    }

    setSavingAction("email");
    try {
      // Build Google Account Chooser URL which routes to Gmail Compose after account selection
      const accountChooserUrl = buildInquiryGmailAccountChooserUrl({
        recipientEmail: email,
        subject: replySubject,
        body: message,
      });

      window.open(accountChooserUrl, "_blank", "noopener,noreferrer");

      if (markAction) {
        await markAction();
      }

      toast({
        title: "Google Account Chooser Opened",
        description: "Google Account Chooser opened. Select your Google account and verify the From address in Gmail before sending.",
      });

      onOpenChange(false);
    } finally {
      setSavingAction(null);
    }
  };

  const handleManualMarkReviewed = async () => {
    if (isAlreadyReviewed) {
      onOpenChange(false);
      return;
    }
    setSavingAction("status");
    try {
      if (markAction) {
        await markAction();
      }
      onOpenChange(false);
    } finally {
      setSavingAction(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        hideCloseButton
        className="flex w-[500px] sm:w-[500px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col gap-5 overflow-y-auto rounded-md sm:rounded-md border border-slate-300 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <DialogTitle className="sr-only">Reply to Inquiry via Gmail</DialogTitle>
        <DialogDescription className="sr-only">
          Open Google Account Chooser and Gmail compose pre-populated with recipient and inquiry subject.
        </DialogDescription>

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
          {isAlreadyReviewed ? (
            <div className="flex items-start gap-2.5 rounded-md border border-slate-300 bg-bg-panel-subtle p-4">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
              <p className="font-segoe text-[13px] font-normal leading-[130%] text-text-default">
                This inquiry has already been marked as Reviewed. No further response actions are available.
              </p>
            </div>
          ) : (
            <div className="flex items-start gap-2.5 rounded-md border border-brand-info-border bg-brand-info-subtle p-3.5">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-public-bg-brand" strokeWidth={1.6} />
              <p className="font-segoe text-[12px] font-normal leading-[135%] text-public-bg-brand">
                Google Account Chooser will open first so you can select which Google account to use. Gmail Compose will then open addressed to{" "}
                <strong className="underline">{email}</strong>. After Gmail opens, make sure your From address is set to the appropriate account before sending.
              </p>
            </div>
          )}

          {/* Details Card */}
          <div className="flex flex-col gap-1.5 rounded-md border border-slate-300 bg-slate-50/60 p-3.5">
            <FieldRow label="Replying To (Recipient)" value={email} withDivider allowBreakAll />
            <FieldRow label="Subject" value={replySubject} />
          </div>

          {/* Message Draft (Optional) */}
          {!isAlreadyReviewed ? (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="inquiry-gmail-draft-message"
                  className="font-segoe text-[12px] font-semibold text-slate-700"
                >
                  Draft Reply Message <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <span className="font-segoe text-[11px] text-slate-400">
                  {message.length.toLocaleString()} chars
                </span>
              </div>
              <textarea
                id="inquiry-gmail-draft-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                disabled={savingAction !== null}
                placeholder="Draft your reply message here (will be pre-filled into Gmail)..."
                rows={4}
                className={cn(
                  "w-full rounded-md border border-slate-300 bg-white p-3 font-segoe text-[13px] leading-relaxed text-text-default placeholder:text-slate-400",
                  "focus:border-public-bg-brand focus:outline-none focus:ring-1 focus:ring-public-bg-brand disabled:bg-slate-100 disabled:opacity-60",
                )}
              />
              <p className="text-[11px] text-slate-500 leading-tight">
                Clicking the button below will open Google Account Chooser in a new tab. Select your account and send the reply from Gmail.
              </p>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1 border-t border-slate-200">
          {!isAlreadyReviewed ? (
            <>
              <button
                type="button"
                onClick={() => void handleOpenGmail()}
                disabled={savingAction !== null}
                className={cn(
                  "flex h-11 w-full items-center justify-center gap-2 rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm font-semibold leading-none text-public-text-neutral-on-neutral transition-colors",
                  "hover:bg-bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {savingAction === "email" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-white" strokeWidth={1.8} />
                ) : (
                  <ExternalLink className="h-4 w-4 shrink-0 text-white" strokeWidth={1.8} />
                )}
                Open Gmail &amp; Mark as Reviewed
              </button>

              <button
                type="button"
                onClick={() => void handleManualMarkReviewed()}
                disabled={savingAction !== null}
                className={cn(
                  "flex h-10 w-full items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-4 py-2.5 font-segoe text-public-fs-body-sm font-medium leading-none text-text-default transition-colors",
                  "hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50",
                )}
              >
                {savingAction === "status" ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-600" strokeWidth={1.6} />
                ) : (
                  <CheckCircle className="h-4 w-4 shrink-0 text-slate-600" strokeWidth={1.6} />
                )}
                Mark as Reviewed without Email
              </button>
            </>
          ) : null}

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={savingAction !== null}
            className={cn(
              "h-10 w-full rounded-md border border-slate-300 bg-admin-surface px-4 py-2.5 font-segoe text-public-fs-body-sm font-medium leading-none text-text-default transition-colors",
              "hover:bg-slate-50 disabled:opacity-50",
            )}
          >
            {isAlreadyReviewed ? "Close" : "Cancel"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

