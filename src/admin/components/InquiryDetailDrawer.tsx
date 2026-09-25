import { useState } from "react";
import { format } from "date-fns";
import { Check, Clock, Copy, Trash2, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { normalizeInquiryStatus, type InquiryRecord } from "@/lib/lydo-connect-data";
import { ReferenceCodeChip, ReplyEmailButton, StatusPill } from "@/admin/components/InquiriesTable";

type InquiryDetailDrawerProps = {
  inquiry: InquiryRecord | null;
  referenceCode: string;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (status: InquiryRecord["status"]) => void;
  onReplyEmail: () => void;
  onDeleteInquiry?: (inquiry: InquiryRecord) => void;
  saving: boolean;
};

const STATUS_ACTIONS: {
  value: InquiryRecord["status"];
  label: string;
}[] = [
  { value: "pending_review", label: "Pending Review" },
  { value: "reviewed", label: "Reviewed" },
  { value: "closed", label: "Closed" },
];

export const InquiryDetailDrawer = ({
  inquiry,
  referenceCode,
  onOpenChange,
  onUpdateStatus,
  onReplyEmail,
  onDeleteInquiry,
  saving,
}: InquiryDetailDrawerProps) => {
  const [copied, setCopied] = useState(false);

  const date = inquiry ? new Date(inquiry.createdAt) : null;
  const isValidDate = Boolean(date && !Number.isNaN(date.getTime()));

  const handleCopyEmail = () => {
    if (!inquiry) return;
    void navigator.clipboard.writeText(inquiry.email);
    setCopied(true);
    toast({ title: "Copied", description: `${inquiry.email} copied to clipboard.` });
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <Sheet open={Boolean(inquiry)} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="flex h-full w-full flex-col gap-0 p-0 sm:max-w-[672px] border-l border-slate-300 bg-admin-surface shadow-lg z-50"
      >
        <SheetTitle className="sr-only">
          {inquiry ? `${inquiry.subject || "Inquiry"} details` : "Inquiry details"}
        </SheetTitle>
        <SheetDescription className="sr-only">
          Inquiry message, submitter contact details, reference ID, and workflow status.
        </SheetDescription>

        {inquiry ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-300 bg-bg-panel-subtle px-6 sm:px-8 py-6">
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ReferenceCodeChip code={referenceCode} className="w-fit" />
                  <StatusPill status={inquiry.status} />
                </div>
                <h2 className="break-words font-segoe text-lg font-semibold leading-snug text-text-default">
                  {inquiry.subject || "General Inquiry"}
                </h2>
                <div className="flex items-center gap-1.5 font-segoe text-xs leading-[140%] text-slate-500">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.6} />
                  <span>Received</span>
                  <span className="font-cascadia text-xs text-slate-600">
                    {isValidDate ? `${format(date!, "d MMM yyyy")} · ${format(date!, "h:mm a")}` : ""}
                  </span>
                </div>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default transition-colors hover:text-public-text-secondary cursor-pointer"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </SheetClose>
            </div>

            {/* Scrollable Body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 sm:px-8 py-6 sm:py-8">
              {/* Message Section */}
              <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-admin-surface p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-300 pb-3">
                  <p className="font-segoe text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Message
                  </p>
                </div>
                <p className="whitespace-pre-wrap break-words font-segoe text-sm font-normal leading-relaxed text-text-default">
                  {inquiry.description}
                </p>
              </div>

              {/* Sender Information Section */}
              <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-admin-surface p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-300 pb-3">
                  <p className="font-segoe text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Sender Information
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <p className="font-segoe text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Organization
                    </p>
                    <p className="break-words font-segoe text-sm font-semibold leading-snug text-text-default">
                      {inquiry.organizationName || inquiry.submitterName || "Unknown"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="font-segoe text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Email
                    </p>
                    <div className="flex flex-col gap-2">
                      <p className="break-all font-segoe text-sm font-semibold leading-snug text-text-default">
                        {inquiry.email}
                      </p>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="flex h-[24px] w-fit shrink-0 items-center gap-1 rounded-[4px] border border-slate-300 bg-admin-surface px-2 py-0.5 font-cascadia text-[10px] font-semibold leading-none text-slate-600 transition-colors hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        {copied ? (
                          <>
                            <Check className="h-2.5 w-2.5 text-emerald-600" strokeWidth={2} />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-2.5 w-2.5 shrink-0 text-slate-500" strokeWidth={1.6} />
                            <span>Copy Email</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Update Segmented Control */}
              <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-admin-surface p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-1.5 border-b border-slate-300 pb-3">
                  <p className="font-segoe text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Update Inquiry Status
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-slate-50 p-1">
                  {STATUS_ACTIONS.map((action) => {
                    const active = normalizeInquiryStatus(inquiry.status) === action.value;
                    return (
                      <button
                        key={action.value}
                        type="button"
                        disabled={saving}
                        aria-pressed={active}
                        onClick={() => onUpdateStatus(action.value)}
                        className={cn(
                          "inline-flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-segoe text-xs font-semibold leading-none transition-colors sm:text-sm cursor-pointer disabled:opacity-50",
                          active
                            ? "bg-public-bg-brand text-public-text-neutral-on-neutral shadow-xs font-bold"
                            : "text-text-default hover:bg-white hover:text-slate-900",
                        )}
                      >
                        <span>{action.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Bottom Action Footer */}
            <div className="mt-auto flex shrink-0 items-center justify-between gap-3 border-t border-slate-300 bg-bg-panel-subtle px-6 sm:px-8 py-4 sm:py-5">
              {onDeleteInquiry ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => onDeleteInquiry(inquiry)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 font-segoe text-xs sm:text-sm font-semibold text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:opacity-50 active:scale-95 cursor-pointer"
                >
                  <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.6} />
                  Delete Inquiry
                </button>
              ) : <div />}
              {inquiry && normalizeInquiryStatus(inquiry.status) === "pending_review" ? (
                <ReplyEmailButton onClick={onReplyEmail} className="h-10 px-4 text-xs sm:text-sm font-semibold" />
              ) : null}
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
