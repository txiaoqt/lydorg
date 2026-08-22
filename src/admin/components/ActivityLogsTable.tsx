import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { ActivityLog } from "@/lib/lydo-connect-data";
import { getFriendlyAuditAction, getFriendlyAuditCategory } from "@/lib/activity-log-export";

export type ActivityDateFilter = "all" | "7d" | "30d" | "90d";
export type ActivityCategoryFilter = "all" | string;

type ActivityLogsTableProps = {
  logs: ActivityLog[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  categoryFilter: ActivityCategoryFilter;
  onCategoryFilterChange: (value: ActivityCategoryFilter) => void;
  dateFilter: ActivityDateFilter;
  onDateFilterChange: (value: ActivityDateFilter) => void;
  adminAccountsById: Record<string, { displayName: string; email: string }>;
};

const CATEGORY_TABS: { value: ActivityCategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "organization_profile", label: "Organization" },
  { value: "budget_request", label: "Budget" },
  { value: "liquidation_report", label: "Liquidation" },
  { value: "news_release", label: "News Release" },
  { value: "document_submission", label: "Document" },
];

const DATE_FILTER_OPTIONS: { value: ActivityDateFilter; label: string }[] = [
  { value: "all", label: "All time" },
  { value: "90d", label: "Last 90 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "7d", label: "Last 7 days" },
];

const PAGE_SIZE = 10;

const CategoryPill = ({ category }: { category: string }) => (
  <span className="inline-flex w-fit items-center whitespace-nowrap rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-info-secondary">
    {getFriendlyAuditCategory(category)}
  </span>
);

export const ActivityLogsTable = ({
  logs,
  searchValue,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  dateFilter,
  onDateFilterChange,
  adminAccountsById,
}: ActivityLogsTableProps) => {
  const [page, setPage] = useState(0);

  const totalPages = Math.max(1, Math.ceil(logs.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => logs.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [logs, clampedPage],
  );

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  const activeDateLabel = DATE_FILTER_OPTIONS.find((option) => option.value === dateFilter)?.label ?? "All time";

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Category pill filters */}
      <div className="flex h-14 w-full flex-wrap items-center gap-1 border-b border-slate-300 px-4 py-1.5">
        {CATEGORY_TABS.map((tab) => {
          const active = categoryFilter === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                onCategoryFilterChange(tab.value);
                setPage(0);
              }}
              className={cn(
                "whitespace-nowrap rounded-full px-3 py-2 font-segoe text-sm font-semibold leading-none transition-colors",
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

      <div className="flex flex-col">
        {/* Header: search + date filter */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
          <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            <input
              value={searchValue}
              onChange={(event) => {
                onSearchChange(event.target.value);
                setPage(0);
              }}
              placeholder="Search activity logs..."
              className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-10 w-[156px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
              >
                <span className="whitespace-nowrap">{activeDateLabel}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[156px] rounded-b-md rounded-t-none border-slate-300 p-0">
              {DATE_FILTER_OPTIONS.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => {
                    onDateFilterChange(option.value);
                    setPage(0);
                  }}
                  className={cn(
                    "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                    dateFilter === option.value && "bg-bg-info-tertiary text-public-text-brand",
                  )}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Column headers */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
          <span className="w-[15%]">Date & Time</span>
          <span className="w-[15%]">Actor</span>
          <span className="w-[20%]">Category</span>
          <span className="w-[15%]">Action</span>
          <span className="min-w-0 flex-1">Details</span>
        </div>

        {/* Rows */}
        {pageItems.length === 0 ? (
          <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
            <p className="font-segoe text-sm font-semibold text-text-default">No activity found</p>
            <p className="font-segoe text-xs text-slate-500">Try adjusting your search or filters.</p>
          </div>
        ) : (
          pageItems.map((log) => {
            const date = new Date(log.createdAt);
            const isValidDate = !Number.isNaN(date.getTime());
            const admin = log.actorUserId ? adminAccountsById[log.actorUserId] : undefined;
            const actorName = admin?.displayName ?? (log.actorUserId ? "Administrator" : "System");
            const actorEmail = admin?.email ?? "";

            return (
              <div
                key={log.id}
                className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 last:border-b-0"
              >
                <div className="flex w-[15%] flex-col gap-1">
                  <p className="font-segoe text-xs font-semibold leading-[140%] text-text-default">
                    {isValidDate ? format(date, "h:mm:ss a") : ""}
                  </p>
                  <p className="font-segoe text-xs leading-[140%] text-slate-500">
                    {isValidDate ? format(date, "d MMM yyyy") : ""}
                  </p>
                </div>

                <div className="flex w-[15%] flex-col gap-1">
                  <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">{actorName}</p>
                  {actorEmail ? (
                    <p className="truncate font-segoe text-xs leading-[140%] text-slate-500">{actorEmail}</p>
                  ) : null}
                </div>

                <div className="flex w-[20%] items-center">
                  <CategoryPill category={log.relatedType} />
                </div>

                <div className="flex w-[15%] items-center">
                  <p className="font-segoe text-sm font-normal leading-[140%] text-text-default">
                    {getFriendlyAuditAction(log.action)}
                  </p>
                </div>

                <div className="flex min-w-0 flex-1 items-center">
                  <p className="line-clamp-2 font-segoe text-sm font-normal leading-[140%] text-slate-500">
                    {log.description}
                  </p>
                </div>
              </div>
            );
          })
        )}

        {/* Footer / pagination */}
        <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
          <p className="font-segoe text-[13px] text-text-neutral-tertiary">
            Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
            <span className="text-text-default">{logs.length}</span> records
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
    </div>
  );
};
