import { format } from "date-fns";
import { Clock, Copy, Trash2, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
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

const STATUS_ACTIONS: { value: InquiryRecord["status"]; label: string }[] = [
  { value: "pending_review", label: "Open" },
  { value: "reviewed", label: "Responded" },
  { value: "closed", label: "Closed" },
];

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3 rounded-md border border-slate-300 bg-admin-surface p-5 sm:p-6">
    <p className="font-segoe text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
    {children}
  </div>
);

export const InquiryDetailDrawer = ({
  inquiry,
  referenceCode,
  onOpenChange,
  onUpdateStatus,
  onReplyEmail,
  onDeleteInquiry,
  saving,
}: InquiryDetailDrawerProps) => {
  const date = inquiry ? new Date(inquiry.createdAt) : null;
  const isValidDate = Boolean(date && !Number.isNaN(date.getTime()));

  const handleCopyEmail = () => {
    if (!inquiry) return;
    void navigator.clipboard.writeText(inquiry.email);
    toast({ title: "Copied", description: `${inquiry.email} copied to clipboard.` });
  };

  return (
    <Sheet open={Boolean(inquiry)} onOpenChange={onOpenChange}>
      <SheetContent side="right" showCloseButton={false} className="w-full gap-0 p-0 sm:max-w-[672px]">
        {inquiry ? (
          <div className="flex h-full flex-col">
            {/* Header */}
            <div className="flex items-start justify-between gap-3 border-b border-slate-300 bg-bg-panel-subtle px-6 sm:px-8 py-6">
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex items-center gap-2">
                  <ReferenceCodeChip code={referenceCode} className="w-fit" />
                  <StatusPill status={inquiry.status} />
                </div>
                <h2 className="break-words font-segoe text-base sm:text-lg font-semibold leading-snug text-text-default">
                  {inquiry.subject || "General Inquiry"}
                </h2>
                <p className="flex items-center gap-1.5 font-segoe text-xs leading-[140%] text-slate-500">
                  <Clock className="h-3.5 w-3.5 shrink-0 text-slate-400" strokeWidth={1.6} />
                  <span>Received</span>
                  <span className="font-cascadia text-xs text-slate-600">
                    {isValidDate ? `${format(date!, "d MMM yyyy")} · ${format(date!, "h:mm a")}` : ""}
                  </span>
                </p>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border-0 bg-transparent text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 active:scale-95"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </SheetClose>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6 sm:py-8">
              {/* Message Section */}
              <SectionCard title="Message">
                <div className="rounded-[6px] border border-slate-200 bg-white px-4 py-3.5 shadow-2xs">
                  <p className="whitespace-pre-wrap break-words font-segoe text-sm font-normal leading-relaxed text-text-default">
                    {inquiry.description}
                  </p>
                </div>
              </SectionCard>

              {/* Sender Information Section */}
              <SectionCard title="Sender Information">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <p className="font-segoe text-[11px] font-semibold uppercase tracking-wide text-slate-500">Organization</p>
                    <p className="break-words font-segoe text-sm font-semibold leading-snug text-text-default">
                      {inquiry.organizationName || inquiry.submitterName || "Unknown"}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="font-segoe text-[11px] font-semibold uppercase tracking-wide text-slate-500">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="min-w-0 truncate font-segoe text-sm font-semibold leading-snug text-text-default">{inquiry.email}</p>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="flex h-[22px] shrink-0 items-center gap-1 rounded-[4px] border border-slate-300 bg-admin-surface px-1.5 py-0.5 font-cascadia text-[9px] font-semibold leading-none text-slate-600 transition-colors hover:bg-slate-100 active:scale-95 cursor-pointer"
                      >
                        <Copy className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                        Copy Email
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              {/* Status Update Action */}
              <div className="flex flex-col gap-3 rounded-md border border-slate-300 bg-admin-surface p-5 sm:p-6">
                <p className="font-segoe text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Update Inquiry
                </p>
                <div className="flex gap-2">
                  {STATUS_ACTIONS.map((action) => {
                    const active = normalizeInquiryStatus(inquiry.status) === action.value;
                    return (
                      <button
                        key={action.value}
                        type="button"
                        disabled={saving}
                        onClick={() => onUpdateStatus(action.value)}
                        className={cn(
                          "flex-1 rounded-md border px-3 py-2 font-segoe text-xs sm:text-sm font-semibold leading-snug transition-colors disabled:opacity-50 cursor-pointer",
                          active
                            ? "border-transparent bg-public-bg-brand text-white shadow-xs"
                            : "border-slate-300 bg-white text-text-default hover:bg-slate-50 active:scale-[0.99]",
                        )}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sticky/Bottom Action Footer */}
              <div className="-mx-6 -mb-6 sm:-mb-8 mt-auto flex items-center justify-between gap-3 border-t border-slate-300 bg-bg-panel-subtle px-6 sm:px-8 py-4 sm:py-5">
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
                <ReplyEmailButton onClick={onReplyEmail} className="h-10 px-4 text-xs sm:text-sm font-semibold" />
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
