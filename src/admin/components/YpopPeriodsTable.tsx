import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Pencil, Search, Trash2, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { type YPOPPeriod, type YPOPPeriodStatus } from "@/lib/lydo-connect-data";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";

export type YpopPeriodStatusFilter = "all" | YPOPPeriodStatus;

export type YpopPeriodRow = {
  period: YPOPPeriod;
  submissionCount: number;
};

type YpopPeriodsTableProps = {
  rows: YpopPeriodRow[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: YpopPeriodStatusFilter;
  onStatusFilterChange: (value: YpopPeriodStatusFilter) => void;
  onEdit: (period: YPOPPeriod) => void;
  onDelete: (period: YPOPPeriod) => void;
  onViewSubmissions: (period: YPOPPeriod) => void;
};

const STATUS_TABS: { value: YpopPeriodStatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "open", label: "Open" },
  { value: "draft", label: "Draft" },
  { value: "closed", label: "Closed" },
];

const PAGE_SIZE = 10;

const StatusPill = ({ status }: { status: YPOPPeriodStatus }) => {
  if (status === "open") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        Open
      </span>
    );
  }
  if (status === "closed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-status-danger-border bg-danger-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-danger-secondary">
        Closed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-closed-subtle bg-neutral-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-secondary">
      Draft
    </span>
  );
};

export const YpopPeriodsTable = ({
  rows,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onEdit,
  onDelete,
  onViewSubmissions,
}: YpopPeriodsTableProps) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => rows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [rows, clampedPage],
  );

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Search + status tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
        <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
          <input
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setPage(0);
            }}
            placeholder="Search by semester id..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
          />
        </div>

        <div className="flex h-10 flex-wrap items-center gap-1 rounded-md border border-slate-300 bg-admin-surface p-1.5">
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
      </div>

      {/* Rows */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No matching semesters</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting the search or status filter.</p>
        </div>
      ) : (
        pageItems.map(({ period, submissionCount }) => {
          const deadlineDate = new Date(period.validationDeadline);
          const isValidDeadline = !Number.isNaN(deadlineDate.getTime());

          return (
            <div
              key={period.id}
              className="flex items-center justify-between gap-3 border-b border-slate-300 p-4 last:border-b-0"
            >
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-segoe text-sm font-semibold leading-none text-text-default">{period.semesterLabel}</p>
                  <ReferenceCodeChip code={period.semesterKey} />
                  <StatusPill status={period.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 font-segoe text-xs leading-none text-slate-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                    Deadline: {isValidDeadline ? format(deadlineDate, "d MMM yyyy") : "N/A"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                    {submissionCount} submission{submissionCount === 1 ? "" : "s"}
                  </span>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  aria-label="Edit semester"
                  onClick={() => onEdit(period)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface text-text-default transition-colors hover:bg-slate-50"
                >
                  <Pencil className="h-4 w-4" strokeWidth={1.6} />
                </button>
                <button
                  type="button"
                  aria-label="Delete semester"
                  onClick={() => onDelete(period)}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-admin-surface text-text-default transition-colors hover:bg-slate-50 hover:text-icon-danger-secondary"
                >
                  <Trash2 className="h-4 w-4" strokeWidth={1.6} />
                </button>
                <button
                  type="button"
                  onClick={() => onViewSubmissions(period)}
                  className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-public-bg-brand px-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                >
                  Submissions
                  <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                </button>
              </div>
            </div>
          );
        })
      )}

      {/* Footer / pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
        <p className="font-segoe text-[13px] text-text-neutral-tertiary">
          Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
          <span className="text-text-default">{rows.length}</span> records
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
    </div>
  );
};
