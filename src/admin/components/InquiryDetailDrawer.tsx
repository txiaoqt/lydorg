import { format } from "date-fns";
import { Clock, Copy, X } from "lucide-react";
import { Sheet, SheetClose, SheetContent } from "@/components/ui/sheet";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { deriveInquiryCategory, type InquiryRecord } from "@/lib/lydo-connect-data";
import { CategoryChip, ReferenceCodeChip, ReplyEmailButton, StatusPill } from "@/admin/components/InquiriesTable";

type InquiryDetailDrawerProps = {
  inquiry: InquiryRecord | null;
  referenceCode: string;
  onOpenChange: (open: boolean) => void;
  onUpdateStatus: (status: InquiryRecord["status"]) => void;
  onReplyEmail: () => void;
  saving: boolean;
};

const STATUS_ACTIONS: { value: InquiryRecord["status"]; label: string }[] = [
  { value: "pending_review", label: "Open" },
  { value: "reviewed", label: "Responded" },
  { value: "closed", label: "Closed" },
];

const SectionCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-3 rounded-md border border-slate-300 bg-admin-surface p-6">
    <p className="text-justify font-segoe text-[13px] font-semibold uppercase leading-none text-slate-500">{title}</p>
    {children}
  </div>
);

export const InquiryDetailDrawer = ({
  inquiry,
  referenceCode,
  onOpenChange,
  onUpdateStatus,
  onReplyEmail,
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
            <div className="flex items-start justify-between gap-3 border-b border-slate-300 bg-bg-panel-subtle px-8 py-6">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <ReferenceCodeChip code={referenceCode} className="w-fit" />
                  <StatusPill status={inquiry.status} />
                </div>
                <h2 className="font-segoe text-lg font-semibold leading-none text-text-default">{inquiry.subject}</h2>
                <p className="flex items-center gap-1 font-segoe text-xs leading-[140%] text-slate-500">
                  <Clock className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                  Received{" "}
                  <span className="font-cascadia text-xs text-slate-500">
                    {isValidDate ? `${format(date!, "d MMM yyyy")} · ${format(date!, "h:mm a")}` : ""}
                  </span>
                </p>
              </div>
              <SheetClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default transition-colors hover:text-public-text-secondary"
                >
                  <X className="h-5 w-5" strokeWidth={2} />
                </button>
              </SheetClose>
            </div>

            {/* Body */}
            <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-8">
              <SectionCard title="Sender Information">
                <div className="flex items-start gap-4">
                  <div className="flex flex-1 flex-col gap-2">
                    <p className="font-segoe text-[11px] font-semibold leading-none text-slate-500">Organization</p>
                    <p className="font-segoe text-sm font-semibold leading-none text-text-default">
                      {inquiry.organizationName || inquiry.submitterName || "Unknown"}
                    </p>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    <p className="font-segoe text-[11px] font-semibold leading-none text-slate-500">Email</p>
                    <div className="flex items-center gap-2">
                      <p className="font-segoe text-sm font-semibold leading-none text-text-default">{inquiry.email}</p>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        className="flex h-[19px] shrink-0 items-center gap-1 rounded-[4px] border-[0.6px] border-slate-300 bg-admin-surface px-1 py-1 font-cascadia text-[8px] font-semibold leading-[140%] text-slate-500 transition-colors hover:bg-slate-50"
                      >
                        <Copy className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                        Copy Email
                      </button>
                    </div>
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Subject &amp; Category">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-segoe text-sm font-semibold leading-[140%] text-text-default">
                      {inquiry.subject}
                    </p>
                  </div>
                  <div className="flex-1">
                    <CategoryChip
                      category={deriveInquiryCategory(inquiry)}
                      className="h-[26px] min-w-[52px] w-fit shrink-0 justify-center gap-1 rounded-[4px] border px-2 py-0 font-segoe text-sm font-semibold leading-none"
                    />
                  </div>
                </div>
              </SectionCard>

              <SectionCard title="Message">
                <div className="rounded-[6px] border border-slate-300 bg-bg-panel-subtle px-4 py-3">
                  <p className="whitespace-pre-wrap text-justify font-segoe text-sm font-normal leading-[140%] text-text-default">
                    {inquiry.description}
                  </p>
                </div>
              </SectionCard>

              <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-bg-panel-subtle p-6">
                <p className="text-justify font-segoe text-[13px] font-semibold uppercase leading-none text-slate-500">
                  Update Inquiry
                </p>
                <div className="flex gap-2">
                  {STATUS_ACTIONS.map((action) => {
                    const active = inquiry.status === action.value;
                    return (
                      <button
                        key={action.value}
                        type="button"
                        disabled={saving}
                        onClick={() => onUpdateStatus(action.value)}
                        className={cn(
                          "flex-1 rounded-md border border-slate-300 px-3 py-2 font-segoe text-public-fs-body-sm leading-[140%] transition-colors disabled:opacity-50",
                          active
                            ? "border-transparent bg-bg-brand-hover text-public-text-neutral-on-neutral"
                            : "bg-admin-surface text-text-default hover:bg-slate-50",
                        )}
                      >
                        {action.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="-mx-6 -mb-8 mt-auto flex items-center justify-end gap-3 border-t border-slate-300 bg-bg-panel-subtle px-8 py-6">
                <ReplyEmailButton onClick={onReplyEmail} className="h-11 w-[146px]" />
              </div>
            </div>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
};
