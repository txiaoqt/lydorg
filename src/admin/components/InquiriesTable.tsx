import { useMemo, useState, type MouseEvent } from "react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Clock, Copy, Mail, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deriveInquiryCategory, INQUIRY_CATEGORY_OPTIONS, type InquiryRecord } from "@/lib/lydo-connect-data";
import { toast } from "@/hooks/use-toast";
import { ReplyEmailDialog } from "@/admin/components/ReplyEmailDialog";

type StatusFilter = "all" | InquiryRecord["status"];
type CategoryFilter = "all" | (typeof INQUIRY_CATEGORY_OPTIONS)[number];

type InquiriesTableProps = {
  inquiries: InquiryRecord[];
  getReferenceCode: (inquiry: InquiryRecord) => string;
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  categoryFilter: CategoryFilter;
  onCategoryFilterChange: (value: CategoryFilter) => void;
  onSelectInquiry: (inquiry: InquiryRecord) => void;
  onMarkResponded: (inquiry: InquiryRecord) => void | Promise<void>;
};

const STATUS_TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "pending_review", label: "Open" },
  { value: "reviewed", label: "Responded" },
  { value: "closed", label: "Closed" },
];

const PAGE_SIZE = 10;

export const StatusPill = ({ status }: { status: InquiryRecord["status"] }) => {
  if (status === "pending_review") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
        Open
      </span>
    );
  }
  if (status === "reviewed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-info-secondary">
        Responded
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-closed-subtle bg-neutral-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-secondary">
      Closed
    </span>
  );
};

export const CategoryChip = ({ category, className }: { category: string; className?: string }) => (
  <span
    className={cn(
      "inline-flex w-fit items-center rounded border border-border-tertiary-200 bg-public-bg-tertiary-100 px-1.5 py-1 font-segoe text-[10px] font-semibold leading-[140%] text-text-tertiary-800",
      className,
    )}
  >
    {category}
  </span>
);

export const ReferenceCodeChip = ({ code, className }: { code: string; className?: string }) => {
  const handleCopy = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void navigator.clipboard.writeText(code);
    toast({ title: "Copied", description: `${code} copied to clipboard.` });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex h-[22px] w-[115px] shrink-0 items-center gap-1.5 rounded-full border border-border-reference-chip bg-bg-reference-chip px-2 py-1.5 font-cascadia text-[10px] font-semibold leading-[140%] text-text-reference",
        className,
      )}
    >
      <span className="min-w-0 flex-1 truncate text-left">{code}</span>
      <Copy className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
    </button>
  );
};

export const ReplyEmailButton = ({
  onClick,
  className,
}: {
  onClick: () => void;
  className?: string;
}) => (
  <button
    type="button"
    onClick={(event) => {
      event.stopPropagation();
      onClick();
    }}
    className={cn(
      "flex shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-md bg-public-bg-brand px-2.5 py-1.5 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover",
      className,
    )}
  >
    <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
    Reply via Email
  </button>
);

export const InquiriesTable = ({
  inquiries,
  getReferenceCode,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  onSelectInquiry,
  onMarkResponded,
}: InquiriesTableProps) => {
  const [page, setPage] = useState(0);
  const [replyDialogInquiry, setReplyDialogInquiry] = useState<InquiryRecord | null>(null);

  const totalPages = Math.max(1, Math.ceil(inquiries.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => inquiries.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [inquiries, clampedPage],
  );

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Header: search + status tabs + category dropdown */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
        <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
          <input
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setPage(0);
            }}
            placeholder="Search inquiries..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
          />
        </div>

        <div className="flex h-10 shrink-0 items-center gap-1 rounded-md border border-slate-300 bg-admin-surface p-1.5">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => {
                  onStatusFilterChange(tab.value);
                  setPage(0);
                }}
                className={cn(
                  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-2 font-segoe text-sm font-semibold leading-none transition-colors",
                  active
                    ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                    : "text-text-default hover:bg-slate-50",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[156px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="whitespace-nowrap">{categoryFilter === "all" ? "All categories" : categoryFilter}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[156px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => {
                onCategoryFilterChange("all");
                setPage(0);
              }}
              className={cn(
                "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                categoryFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
              )}
            >
              All categories
            </DropdownMenuItem>
            {INQUIRY_CATEGORY_OPTIONS.map((category) => (
              <DropdownMenuItem
                key={category}
                onClick={() => {
                  onCategoryFilterChange(category);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  categoryFilter === category && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {category}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
        <span className="w-[12%]">Reference ID</span>
        <span className="w-[15%]">Organization</span>
        <span className="min-w-0 flex-1">Subject &amp; Preview</span>
        <span className="w-[15%]">Received</span>
        <span className="w-[10%]">Status</span>
        <span className="w-[168px] shrink-0">Actions</span>
      </div>

      {/* Rows */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No inquiries found</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting your search or filters.</p>
        </div>
      ) : (
        pageItems.map((inquiry) => {
          const code = getReferenceCode(inquiry);
          const category = deriveInquiryCategory(inquiry);
          const date = new Date(inquiry.createdAt);
          const isValidDate = !Number.isNaN(date.getTime());

          return (
            <div
              key={inquiry.id}
              onClick={() => onSelectInquiry(inquiry)}
              className="group flex cursor-pointer items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <div className="flex w-[12%] items-center">
                <ReferenceCodeChip code={code} />
              </div>

              <div className="flex w-[15%] flex-col gap-1">
                <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                  {inquiry.organizationName || inquiry.submitterName || "Unknown"}
                </p>
                <p className="truncate font-segoe text-xs leading-none text-slate-500">{inquiry.email}</p>
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1 pr-2">
                <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                  {inquiry.subject}
                </p>
                <p className="line-clamp-1 font-segoe text-xs leading-[140%] text-slate-500">{inquiry.description}</p>
                <CategoryChip category={category} />
              </div>

              <div className="flex w-[15%] flex-col gap-1">
                <p className="font-segoe text-xs font-semibold leading-[140%] text-text-default">
                  {isValidDate ? `${format(date, "d MMM yyyy")} · ${format(date, "h:mm a")}` : ""}
                </p>
                <p className="flex items-center gap-1 font-cascadia text-[10px] text-slate-500">
                  <Clock className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                  {isValidDate ? `${formatDistanceToNowStrict(date)} ago` : ""}
                </p>
              </div>

              <div className="flex w-[10%] items-center">
                <StatusPill status={inquiry.status} />
              </div>

              <div className="flex w-[168px] shrink-0 items-center gap-2">
                <ReplyEmailButton onClick={() => setReplyDialogInquiry(inquiry)} />
                <ChevronRight
                  className="h-4 w-4 shrink-0 text-text-disabled transition-colors group-hover:text-icon-info-secondary"
                  strokeWidth={1.6}
                />
              </div>
            </div>
          );
        })
      )}

      {/* Footer / pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
        <p className="font-segoe text-[13px] text-text-neutral-tertiary">
          Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
          <span className="text-text-default">{inquiries.length}</span> submissions
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => changePage(clampedPage - 1)}
            disabled={clampedPage === 0}
            className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-neutral-tertiary disabled:opacity-50"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.6} />
            Previous
          </button>
          <div className="flex items-center gap-2">
            {Array.from({ length: totalPages }, (_, index) => index)
              .slice(0, 5)
              .map((index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => changePage(index)}
                  className={cn(
                    "flex h-[29px] w-8 items-center justify-center rounded-lg font-segoe text-[13px]",
                    index === clampedPage
                      ? "bg-public-bg-brand text-public-text-neutral-on-neutral"
                      : "text-text-default hover:bg-slate-50",
                  )}
                >
                  {index + 1}
                </button>
              ))}
          </div>
          <button
            type="button"
            onClick={() => changePage(clampedPage + 1)}
            disabled={clampedPage >= totalPages - 1}
            className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-default disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>
      </div>

      <ReplyEmailDialog
        open={Boolean(replyDialogInquiry)}
        onOpenChange={(open) => {
          if (!open) setReplyDialogInquiry(null);
        }}
        email={replyDialogInquiry?.email ?? ""}
        subject={replyDialogInquiry?.subject ?? ""}
        organizationName={
          replyDialogInquiry
            ? replyDialogInquiry.organizationName || replyDialogInquiry.submitterName || "Unknown"
            : ""
        }
        onMarkResponded={() => (replyDialogInquiry ? onMarkResponded(replyDialogInquiry) : undefined)}
      />
    </div>
  );
};
