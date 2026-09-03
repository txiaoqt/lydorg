import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { majorClassificationOptions } from "@/lib/lydo-connect-data";

export type OrganizationFundingRow = {
  organizationId: string;
  urn: string;
  organizationName: string;
  majorClassification: string;
  barangay: string;
  totalRequested: number;
  totalReleased: number;
  totalLiquidated: number;
};

type OrganizationFundingTableProps = {
  rows: OrganizationFundingRow[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
  onView: (organizationId: string) => void;
};

const PAGE_SIZE = 10;

const formatFundingCurrency = (value: number) => `₱${Math.round(value).toLocaleString()}`;

export const OrganizationFundingTable = ({
  rows,
  searchValue,
  onSearchChange,
  classificationFilter,
  onClassificationFilterChange,
  onView,
}: OrganizationFundingTableProps) => {
  const [page, setPage] = useState(0);

  const filteredRows = useMemo(() => {
    const query = searchValue.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !query || row.urn.toLowerCase().includes(query) || row.organizationName.toLowerCase().includes(query);
      const matchesClassification = classificationFilter === "all" || row.majorClassification === classificationFilter;
      return matchesSearch && matchesClassification;
    });
  }, [rows, searchValue, classificationFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => filteredRows.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [filteredRows, clampedPage],
  );

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Search + filters */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
        <div className="flex h-10 min-w-[120px] flex-1 items-center gap-2 rounded-md border border-slate-300 bg-admin-surface px-3.5 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
          <input
            value={searchValue}
            onChange={(event) => {
              onSearchChange(event.target.value);
              setPage(0);
            }}
            placeholder="Search by URN or organization..."
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-fit shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="whitespace-nowrap">Fiscal Year</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[160px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem disabled className="rounded-none px-4 py-2.5 font-segoe text-sm text-slate-400">
              Coming soon
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
        <span className="w-6 shrink-0">
          <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" aria-hidden="true" />
        </span>
        <span className="w-[14%]">URN</span>
        <span className="w-[24%]">Organization Name</span>
        <span className="w-[16%]">Total Requested</span>
        <span className="w-[16%]">Total Released</span>
        <span className="w-[16%]">Total Liquidated</span>
        <span className="w-[90px] shrink-0">Actions</span>
      </div>

      {/* Rows */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No matching organizations</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting the search or classification filter.</p>
        </div>
      ) : (
        pageItems.map((row) => (
          <div
            key={row.organizationId}
            className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50"
          >
            <span className="w-6 shrink-0">
              <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" aria-hidden="true" />
            </span>

            <div className="flex w-[14%] items-center">
              <ReferenceCodeChip code={row.urn} />
            </div>

            <div className="flex w-[24%] min-w-0 items-center">
              <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">{row.organizationName}</p>
            </div>

            <div className="flex w-[16%] items-center">
              <p className="font-cascadia text-sm font-semibold leading-[140%] text-text-default">
                {formatFundingCurrency(row.totalRequested)}
              </p>
            </div>

            <div className="flex w-[16%] items-center">
              <p className="font-cascadia text-sm font-semibold leading-[140%] text-text-default">
                {formatFundingCurrency(row.totalReleased)}
              </p>
            </div>

            <div className="flex w-[16%] items-center">
              <p className="font-cascadia text-sm font-semibold leading-[140%] text-text-default">
                {formatFundingCurrency(row.totalLiquidated)}
              </p>
            </div>

            <div className="flex w-[90px] shrink-0 items-center">
              <button
                type="button"
                onClick={() => onView(row.organizationId)}
                className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-public-bg-brand px-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
              >
                <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                View
              </button>
            </div>
          </div>
        ))
      )}

      {/* Footer / pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
        <p className="font-segoe text-[13px] text-text-neutral-tertiary">
          Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
          <span className="text-text-default">{filteredRows.length}</span> organizations
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
