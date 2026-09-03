import { useMemo, useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { majorClassificationOptions, type YPOPStatus } from "@/lib/lydo-connect-data";

export type YpopSubmissionStatusFilter = "all" | "pending_evaluation" | "qualified" | "not_qualified";

export type YpopSubmissionRow = {
  id: string;
  organizationId: string;
  organizationName: string;
  referenceId: string;
  majorClassification: string;
  status: YPOPStatus;
};

type YpopSubmissionsTableProps = {
  rows: YpopSubmissionRow[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
  statusFilter: YpopSubmissionStatusFilter;
  onStatusFilterChange: (value: YpopSubmissionStatusFilter) => void;
  onValidate: (row: YpopSubmissionRow) => void;
};

const STATUS_TABS: { value: YpopSubmissionStatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "pending_evaluation", label: "Pending Evaluation" },
  { value: "qualified", label: "Qualified" },
  { value: "not_qualified", label: "Not Qualified" },
];

const PAGE_SIZE = 10;

export const StatusLabel = ({ status }: { status: YPOPStatus }) => {
  if (status === "qualified") {
    return (
      <span className="inline-flex h-5 items-center justify-center rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1.5 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        Qualified
      </span>
    );
  }
  if (status === "not_qualified") {
    return (
      <span className="inline-flex h-6 items-center justify-center rounded-full border border-status-danger-border bg-danger-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-danger-secondary">
        Not Qualified
      </span>
    );
  }
  return (
    <span className="inline-flex h-6 items-center justify-center rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-[#2864C4]">
      Pending Evaluation
    </span>
  );
};

export const YpopSubmissionsTable = ({
  rows,
  searchValue,
  onSearchChange,
  classificationFilter,
  onClassificationFilterChange,
  statusFilter,
  onStatusFilterChange,
  onValidate,
}: YpopSubmissionsTableProps) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(() => rows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE), [rows, clampedPage]);

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
        <div className="flex h-10 min-w-[160px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
          <input
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setPage(0);
            }}
            placeholder="Search by organization..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-fit shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="whitespace-nowrap">{classificationFilter === "all" ? "All major classifications" : classificationFilter}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => {
                onClassificationFilterChange("all");
                setPage(0);
              }}
              className={cn(
                "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                classificationFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
              )}
            >
              All major classifications
            </DropdownMenuItem>
            {majorClassificationOptions.map((classification) => (
              <DropdownMenuItem
                key={classification}
                onClick={() => {
                  onClassificationFilterChange(classification);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  classificationFilter === classification && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {classification}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

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
                  active ? "bg-public-bg-brand text-public-text-neutral-on-neutral" : "text-text-default hover:bg-slate-50",
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
          <p className="font-segoe text-sm font-semibold text-text-default">No matching submissions</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting the search or status filter.</p>
        </div>
      ) : (
        pageItems.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50"
          >
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">{row.organizationName}</p>
              <ReferenceCodeChip code={row.referenceId || "—"} className="w-[120px] rounded" />
            </div>

            <div className="flex shrink-0 items-center gap-4">
              <StatusLabel status={row.status} />
              <button
                type="button"
                onClick={() => onValidate(row)}
                className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-public-bg-brand px-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
              >
                Validate
                <ArrowRight className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
              </button>
            </div>
          </div>
        ))
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
                    index === clampedPage ? "bg-public-bg-brand text-public-text-neutral-on-neutral" : "text-text-default hover:bg-slate-50",
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
