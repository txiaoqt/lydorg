import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, ExternalLink, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { pasigDistrictBarangays, pasigDistrictOptions, type PasigDistrict } from "@/lib/pasig-districts";
import { buildPublicRecordCode, majorClassificationOptions, type BudgetRequest, type LiquidationReport, type OrganizationProfile } from "@/lib/lydo-connect-data";

export type LiquidationReportsStatusFilter =
  | "all"
  | "ongoing_activity"
  | "pending_review"
  | "hardcopy_submitted"
  | "liquidated"
  | "overdue";

type LiquidationReportsTableProps = {
  reports: LiquidationReport[];
  allReports: LiquidationReport[];
  organizationsById: Record<string, OrganizationProfile>;
  budgetRequestsById: Record<string, BudgetRequest>;
  allBudgetRequests: BudgetRequest[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: LiquidationReportsStatusFilter;
  onStatusFilterChange: (value: LiquidationReportsStatusFilter) => void;
  districtFilter: "all" | PasigDistrict;
  onDistrictFilterChange: (value: "all" | PasigDistrict) => void;
  barangayFilter: string;
  onBarangayFilterChange: (value: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
  onReview: (reportId: string) => void;
  onOpenLinkedRequest: (requestId: string) => void;
};

const STATUS_TABS: { value: LiquidationReportsStatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "ongoing_activity", label: "Ongoing Activity" },
  { value: "pending_review", label: "Pending Review" },
  { value: "hardcopy_submitted", label: "Hardcopy Submitted" },
  { value: "liquidated", label: "Liquidated" },
  { value: "overdue", label: "Overdue" },
];

const ONGOING_ACTIVITY_STATUSES = new Set<LiquidationReport["status"]>([
  "pending_activity_completion",
  "not_started",
  "draft",
  "needs_revision",
  "approved_for_ftf_green",
]);

export function matchesLiquidationStatusFilter(
  status: LiquidationReport["status"],
  filter: LiquidationReportsStatusFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "ongoing_activity") return ONGOING_ACTIVITY_STATUSES.has(status);
  if (filter === "pending_review") return status === "submitted" || status === "under_review";
  if (filter === "hardcopy_submitted") return status === "hard_copy_submitted";
  if (filter === "liquidated") return status === "completed_liquidated";
  if (filter === "overdue") return status === "overdue";
  return true;
}

const STATUS_LABEL_CONFIG: Record<LiquidationReport["status"], { label: string; className: string }> = {
  pending_activity_completion: {
    label: "Ongoing Activity",
    className: "border-border-warning-subtle bg-bg-warning-subtle text-text-warning-secondary",
  },
  not_started: {
    label: "Ongoing Activity",
    className: "border-border-warning-subtle bg-bg-warning-subtle text-text-warning-secondary",
  },
  draft: {
    label: "Ongoing Activity",
    className: "border-border-warning-subtle bg-bg-warning-subtle text-text-warning-secondary",
  },
  needs_revision: {
    label: "Ongoing Activity",
    className: "border-border-warning-subtle bg-bg-warning-subtle text-text-warning-secondary",
  },
  approved_for_ftf_green: {
    label: "Ongoing Activity",
    className: "border-border-warning-subtle bg-bg-warning-subtle text-text-warning-secondary",
  },
  rejected_red: {
    label: "Rejected",
    className: "border-status-danger-border bg-danger-subtle text-icon-danger-secondary",
  },
  submitted: {
    label: "Pending Review",
    className: "border-bg-info-secondary bg-bg-info-tertiary text-icon-info-secondary",
  },
  under_review: {
    label: "Pending Review",
    className: "border-bg-info-secondary bg-bg-info-tertiary text-icon-info-secondary",
  },
  hard_copy_submitted: {
    label: "Hardcopy Submitted",
    className: "border-cyan-200 bg-cyan-50 text-cyan-700",
  },
  completed_liquidated: {
    label: "Liquidated",
    className: "border-border-success-subtle bg-bg-success-subtle text-positive-secondary",
  },
  overdue: {
    label: "Overdue",
    className: "border-status-danger-border bg-danger-subtle text-icon-danger-secondary",
  },
};

export const LiquidationStatusLabel = ({ status }: { status: LiquidationReport["status"] }) => {
  const config = STATUS_LABEL_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-2 py-1 font-segoe text-xs font-semibold leading-[140%]",
        config.className,
      )}
    >
      {config.label}
    </span>
  );
};

const PAGE_SIZE = 10;

function formatShortDate(value?: string | null) {
  if (!value) return "Pending";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";
  return format(date, "d MMM yyyy");
}

export const LiquidationReportsTable = ({
  reports,
  allReports,
  organizationsById,
  budgetRequestsById,
  allBudgetRequests,
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
  onOpenLinkedRequest,
}: LiquidationReportsTableProps) => {
  const [page, setPage] = useState(0);

  const barangayOptions = useMemo(
    () =>
      Object.values(pasigDistrictBarangays)
        .flat()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(reports.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => reports.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [reports, clampedPage],
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
            placeholder="Search by liquidation ID or organization..."
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
        <span className="w-[24%]">Organization &amp; Project</span>
        <span className="w-[15%]">Linked Request</span>
        <span className="w-[13%]">Deadline</span>
        <span className="w-[14%]">Status</span>
        <span className="w-[90px] shrink-0">Actions</span>
      </div>

      {/* Rows */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No matching liquidation reports</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting the search, status, or location filters.</p>
        </div>
      ) : (
        pageItems.map((report) => {
          const organization = organizationsById[report.organizationId];
          const linkedBudget = budgetRequestsById[report.budgetRequestId];

          return (
            <div
              key={report.id}
              className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <span className="w-6 shrink-0">
                <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" aria-hidden="true" />
              </span>

              <div className="flex w-[13%] items-center">
                <ReferenceCodeChip code={buildPublicRecordCode("LR", report, allReports)} className="w-[109px] rounded" />
              </div>

              <div className="flex w-[24%] min-w-0 flex-col gap-0.5">
                <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                  {linkedBudget?.activityTitle ?? "Approved budget"}
                </p>
                <p className="truncate font-segoe text-xs leading-[140%] text-slate-500">
                  {organization?.organizationName ?? "Unknown organization"}
                </p>
              </div>

              <div className="flex w-[15%] items-center">
                {linkedBudget ? (
                  <button
                    type="button"
                    onClick={() => onOpenLinkedRequest(linkedBudget.id)}
                    className="flex h-[22px] w-[109px] shrink-0 items-center gap-1.5 rounded border border-border-reference-chip bg-bg-reference-chip px-2 py-1.5 font-cascadia text-[10px] font-semibold leading-[140%] text-text-reference transition-colors hover:bg-slate-100"
                  >
                    <span className="min-w-0 flex-1 truncate text-left">{buildPublicRecordCode("BR", linkedBudget, allBudgetRequests)}</span>
                    <ExternalLink className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                  </button>
                ) : (
                  <span className="font-segoe text-xs text-slate-400">—</span>
                )}
              </div>

              <div className="flex w-[13%] items-center">
                <p className="font-segoe text-sm font-normal leading-[140%] text-text-default">{formatShortDate(report.deadlineAt)}</p>
              </div>

              <div className="flex w-[14%] items-center">
                <LiquidationStatusLabel status={report.status} />
              </div>

              <div className="flex w-[90px] shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onReview(report.id)}
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
          <span className="text-text-default">{reports.length}</span> submissions
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
