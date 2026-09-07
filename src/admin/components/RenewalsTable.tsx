import { useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip, ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import { pasigDistrictBarangays, pasigDistrictOptions, type PasigDistrict } from "@/lib/pasig-districts";
import { majorClassificationOptions, type OrganizationRenewalStatus } from "@/lib/lydo-connect-data";

export type RenewalStatusFilter = "all" | "submitted" | "pending_review" | "needs_revision" | "approved" | "rejected";

export type AdminRenewalQueueEntry = {
  renewalId: string;
  organizationId: string;
  cycleNumber: number;
  organizationName: string;
  referenceIdentifier: string;
  district: string;
  barangay: string;
  majorClassification: string;
  currentAccreditationExpiry: string | null;
  documentCount: { submitted: number; required: number };
  submittedDate: string | null;
  renewalStatus: OrganizationRenewalStatus;
  linkedDocumentSubmissionId: string | null;
  currentAccreditationId: string | null;
  adminRemarks: string | null;
};

export type RenewalsTableProps = {
  renewals: AdminRenewalQueueEntry[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: RenewalStatusFilter;
  onStatusFilterChange: (value: RenewalStatusFilter) => void;
  districtFilter: "all" | PasigDistrict;
  onDistrictFilterChange: (value: "all" | PasigDistrict) => void;
  barangayFilter: string;
  onBarangayFilterChange: (value: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
  onReview: (renewalId: string) => void;
};

const STATUS_TABS: { value: RenewalStatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "submitted", label: "Submitted" },
  { value: "pending_review", label: "Pending Review" },
  { value: "needs_revision", label: "Needs Revision" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

const PAGE_SIZE = 10;

export const RenewalStatusPill = ({ status }: { status: OrganizationRenewalStatus }) => {
  if (status === "submitted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-sky-700">
        Submitted
      </span>
    );
  }
  if (status === "approved") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        Approved
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-status-danger-border bg-danger-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-danger-secondary">
        Rejected
      </span>
    );
  }
  if (status === "needs_revision") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-amber-700">
        Needs Revision
      </span>
    );
  }
  if (status === "under_review" || status === "resubmitted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-bg-info-secondary bg-bg-info-tertiary px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-info-secondary">
        Pending Review
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-closed-subtle bg-neutral-100 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-public-text-secondary">
      Pending Review
    </span>
  );
};

const DocumentsPill = ({ submitted, required }: { submitted: number; required: number }) => {
  const complete = required > 0 && submitted >= required;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1 font-segoe text-xs font-semibold leading-[140%]",
        complete
          ? "border-border-success-subtle bg-bg-success-subtle text-positive-secondary"
          : "border-border-warning-subtle bg-amber-50 text-text-warning-secondary",
      )}
    >
      {submitted}/{required} {complete ? "Complete" : "Incomplete"}
    </span>
  );
};

export const RenewalsTable = ({
  renewals,
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
}: RenewalsTableProps) => {
  const [page, setPage] = useState(0);

  const barangayOptions = useMemo(
    () =>
      Object.values(pasigDistrictBarangays)
        .flat()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [],
  );

  const totalPages = Math.max(1, Math.ceil(renewals.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => renewals.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [renewals, clampedPage],
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
            placeholder="Search by renewal reference or organization..."
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
        <span className="w-[14%]">Reference / Cycle</span>
        <span className="w-[20%]">Organization</span>
        <span className="w-[16%]">Classification</span>
        <span className="w-[13%]">Documents</span>
        <span className="w-[10%]">Submitted</span>
        <span className="w-[12%]">Status</span>
        <span className="w-[90px] shrink-0">Actions</span>
      </div>

      {/* Rows */}
      {pageItems.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
          <p className="font-segoe text-sm font-semibold text-text-default">No matching renewal applications</p>
          <p className="font-segoe text-xs text-slate-500">Try adjusting the search, status, or location filters.</p>
        </div>
      ) : (
        pageItems.map((item) => {
          const submittedDate = item.submittedDate ? new Date(item.submittedDate) : null;
          const isValidDate = submittedDate ? !Number.isNaN(submittedDate.getTime()) : false;

          return (
            <div
              key={item.renewalId}
              className="flex items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50"
            >
              <span className="w-6 shrink-0">
                <input type="checkbox" disabled className="h-4 w-4 rounded border-slate-300" aria-hidden="true" />
              </span>

              <div className="flex w-[14%] flex-col gap-0.5">
                <ReferenceCodeChip code={item.referenceIdentifier || "—"} />
                <span className="font-segoe text-[11px] font-medium text-slate-500">
                  Cycle {item.cycleNumber}
                </span>
              </div>

              <div className="flex w-[20%] min-w-0 flex-col gap-0.5">
                <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                  {item.organizationName}
                </p>
                <p className="truncate font-segoe text-xs leading-[140%] text-slate-500">
                  {[item.district, item.barangay].filter(Boolean).join(" · ") || "No location provided"}
                </p>
              </div>

              <div className="flex w-[16%] flex-col gap-0.5">
                {item.majorClassification ? (
                  <CategoryChip category={item.majorClassification} />
                ) : (
                  <span className="font-segoe text-xs text-slate-500">—</span>
                )}
                {item.currentAccreditationExpiry ? (
                  <span className="font-segoe text-[11px] text-slate-500">
                    Expiry: {format(new Date(item.currentAccreditationExpiry), "d MMM yyyy")}
                  </span>
                ) : null}
              </div>

              <div className="flex w-[13%] items-center">
                <DocumentsPill submitted={item.documentCount.submitted} required={item.documentCount.required} />
              </div>

              <div className="flex w-[10%] items-center">
                <p className="font-segoe text-sm font-normal leading-[140%] text-text-default">
                  {isValidDate && submittedDate ? format(submittedDate, "d MMM yyyy") : "—"}
                </p>
              </div>

              <div className="flex w-[12%] items-center">
                <RenewalStatusPill status={item.renewalStatus} />
              </div>

              <div className="flex w-[90px] shrink-0 items-center">
                <button
                  type="button"
                  onClick={() => onReview(item.renewalId)}
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
          <span className="text-text-default">{renewals.length}</span> renewals
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
                      : "text-text-neutral-tertiary hover:bg-slate-100",
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
            className="flex items-center gap-2 rounded-md px-3 py-2 font-segoe text-[13px] text-text-neutral-tertiary disabled:opacity-50"
          >
            Next
            <ChevronRight className="h-4 w-4" strokeWidth={1.6} />
          </button>
        </div>
      </div>
    </div>
  );
};
