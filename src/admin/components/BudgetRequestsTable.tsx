import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, ChevronDown, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { pasigDistrictBarangays, pasigDistrictOptions, type PasigDistrict } from "@/lib/pasig-districts";
import { buildPublicRecordCode, majorClassificationOptions, type BudgetRequest, type OrganizationProfile } from "@/lib/lydo-connect-data";

export type BudgetRequestsStatusFilter =
  | "all"
  | "under_review"
  | "needs_revision"
  | "approved_for_ftf_green"
  | "hard_copy_submitted"
  | "budget_released";

type BudgetRequestsTableProps = {
  requests: BudgetRequest[];
  allRequests: BudgetRequest[];
  organizationsById: Record<string, OrganizationProfile>;
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: BudgetRequestsStatusFilter;
  onStatusFilterChange: (value: BudgetRequestsStatusFilter) => void;
  districtFilter: "all" | PasigDistrict;
  onDistrictFilterChange: (value: "all" | PasigDistrict) => void;
  barangayFilter: string;
  onBarangayFilterChange: (value: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
  onReview: (requestId: string) => void;
};

const STATUS_TABS: { value: BudgetRequestsStatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "under_review", label: "Pending Review" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "approved_for_ftf_green", label: "Onsite Required" },
  { value: "hard_copy_submitted", label: "Hardcopy Submitted" },
  { value: "budget_released", label: "Released" },
];

const PAGE_SIZE = 10;

const formatBudgetCurrency = (value: number) => `₱${Math.round(value).toLocaleString()}`;

export const StatusPill = ({ status }: { status: BudgetRequest["status"] }) => {
  if (status === "budget_released" || status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-mandatory-subtle bg-bg-mandatory-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-mandatory">
        {status === "completed" ? "Completed" : "Released"}
      </span>
    );
  }
  if (status === "hard_copy_submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-role-blue-border bg-role-blue-bg px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-role-blue-text">
        Hardcopy Submitted
      </span>
    );
  }
  if (status === "approved_for_ftf_green") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        Onsite Required
      </span>
    );
  }
  if (status === "needs_revision") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
        Needs Revision
      </span>
    );
  }
  if (status === "rejected_red") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-status-danger-border bg-danger-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-danger-secondary">
        Rejected
      </span>
    );
  }
  if (status === "draft") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-closed-subtle bg-neutral-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-secondary">
        Draft
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-info-secondary">
      {status === "under_review" ? "Pending Review" : "Submitted"}
    </span>
  );
};

const AmountCell = ({ requestedAmount, approvedAmount }: { requestedAmount: number; approvedAmount: number }) => (
  <div className="flex flex-col gap-1">
    <p className="flex items-center gap-6 font-segoe text-xs leading-[140%] text-slate-500">
      <span className="w-16 shrink-0">Requested</span>
      <span className="font-semibold text-text-default">{formatBudgetCurrency(requestedAmount)}</span>
    </p>
    {approvedAmount ? (
      <div className="flex items-center gap-1">
        <p className="flex items-center gap-6 font-segoe text-xs leading-[140%] text-slate-500">
          <span className="w-16 shrink-0">Approved</span>
          <span className="font-semibold text-text-default">{formatBudgetCurrency(approvedAmount)}</span>
        </p>
        {approvedAmount !== requestedAmount ? (
          <span
            className={cn(
              "flex items-center gap-0.5 font-segoe text-[11px] font-semibold leading-none",
              approvedAmount < requestedAmount ? "text-icon-danger-secondary" : "text-positive-secondary",
            )}
          >
            {approvedAmount < requestedAmount ? <ArrowDown className="h-3 w-3" strokeWidth={2} /> : <ArrowUp className="h-3 w-3" strokeWidth={2} />}
            {formatBudgetCurrency(Math.abs(approvedAmount - requestedAmount))}
          </span>
        ) : null}
      </div>
    ) : (
      <p className="flex items-center gap-6 font-segoe text-xs leading-[140%] text-slate-500">
        <span className="w-16 shrink-0">Approved</span>
        <span className="italic text-slate-400">Pending</span>
      </p>
    )}
  </div>
);

export const BudgetRequestsTable = ({
  requests,
  allRequests,
  organizationsById,
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  districtFilter,
  onDistrictFilterChange,
  barangayFilter,
  onBarangayFilterChange,
  classificationFilter,
  onClassificationFilterChange,
  onReview,
}: BudgetRequestsTableProps) => {
  const [page, setPage] = useState(0);

  const barangayOptions = useMemo(
    () =>
      Object.values(pasigDistrictBarangays)
        .flat()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(requests.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => requests.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [requests, clampedPage],
  );

  const changePage = (next: number) => {
    setPage(Math.max(0, Math.min(next, totalPages - 1)));
  };

  return (
    <div className="flex flex-col rounded-md border border-slate-300 bg-admin-surface shadow-sm">
      {/* Header: status tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-300 p-4">
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
            placeholder="Search by budget request ID or organization..."
            className="min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-public-fs-body-sm text-text-default outline-none placeholder:text-text-disabled"
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[156px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="truncate">{districtFilter === "all" ? "All districts" : districtFilter}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[156px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => {
                onDistrictFilterChange("all");
                setPage(0);
              }}
              className={cn(
                "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                districtFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
              )}
            >
              All districts
            </DropdownMenuItem>
            {pasigDistrictOptions.map((district) => (
              <DropdownMenuItem
                key={district}
                onClick={() => {
                  onDistrictFilterChange(district);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  districtFilter === district && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {district}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-10 w-[180px] shrink-0 items-center justify-between gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-2 font-segoe text-public-fs-body-sm text-text-default"
            >
              <span className="truncate">{barangayFilter === "all" ? "All barangays" : barangayFilter}</span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[220px] rounded-b-md rounded-t-none border-slate-300 p-0">
            <DropdownMenuItem
              onClick={() => {
                onBarangayFilterChange("all");
                setPage(0);
              }}
              className={cn(
                "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                barangayFilter === "all" && "bg-bg-info-tertiary text-public-text-brand",
              )}
            >
              All barangays
            </DropdownMenuItem>
            {barangayOptions.map((barangay) => (
              <DropdownMenuItem
                key={barangay.id}
                onClick={() => {
                  onBarangayFilterChange(barangay.name);
                  setPage(0);
                }}
                className={cn(
                  "rounded-none px-4 py-2.5 font-segoe text-sm text-text-default focus:bg-slate-50 focus:text-text-default",
                  barangayFilter === barangay.name && "bg-bg-info-tertiary text-public-text-brand",
                )}
              >
                {barangay.name}
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
      </div>

      {/* Column headers */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
        <span className="w-6 shrink-0">
          <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" aria-hidden="true" />
        </span>
        <span className="w-[13%]">Reference ID</span>
        <span className="w-[24%]">Project &amp; Organization</span>
        <span className="w-[19%]">Requested / Approved</span>
        <span className="w-[11%]">Submitted</span>
        <span className="w-[14%]">Status</span>
        <span className="w-[90px] shrink-0">Actions</span>
      </div>

      {/* Rows */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No matching budget requests</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting the search, status, or location filters.</p>
        </div>
      ) : (
        pageItems.map((request) => {
          const organization = organizationsById[request.organizationId];
          const submittedDate = new Date(request.createdAt);
          const isValidDate = !Number.isNaN(submittedDate.getTime());

          return (
            <div
              key={request.id}
              className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <span className="w-6 shrink-0">
                <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" aria-hidden="true" />
              </span>

              <div className="flex w-[13%] items-center">
                <ReferenceCodeChip code={buildPublicRecordCode("BR", request, allRequests)} className="w-[109px] rounded" />
              </div>

              <div className="flex w-[24%] min-w-0 flex-col gap-0.5">
                <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                  {request.activityTitle}
                </p>
                <p className="truncate font-segoe text-xs leading-[140%] text-slate-500">
                  {organization?.organizationName ?? "Unknown organization"}
                </p>
              </div>

              <div className="flex w-[19%] items-center">
                <AmountCell requestedAmount={request.requestedAmount} approvedAmount={request.approvedAmount} />
              </div>

              <div className="flex w-[11%] items-center">
                <p className="font-segoe text-sm font-normal leading-[140%] text-text-default">
                  {isValidDate ? format(submittedDate, "d MMM yyyy") : "—"}
                </p>
              </div>

              <div className="flex w-[14%] items-center">
                <StatusPill status={request.status} />
              </div>

              <div className="flex w-[90px] shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onReview(request.id)}
                  className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-public-bg-brand px-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover"
                >
                  <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                  Review
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
          <span className="text-text-default">{requests.length}</span> submissions
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
