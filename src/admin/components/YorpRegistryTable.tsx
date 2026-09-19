import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ChevronDown, ChevronLeft, ChevronRight, Eye, Search, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CategoryChip, ReferenceCodeChip } from "@/admin/components/InquiriesTable";
import {
  pasigDistrictBarangays,
  pasigDistrictOptions,
  getBarangayOptionsForDistrict,
  isBarangayInDistrict,
  type PasigDistrict,
} from "@/lib/pasig-districts";
import { majorClassificationOptions, type OrganizationProfile } from "@/lib/lydo-connect-data";

export type YorpStatus = "active" | "expiring_soon" | "expired";
export type YorpStatusFilter = "all" | YorpStatus;

export type YorpRegistryEntry = {
  org: OrganizationProfile;
  registrationDate: Date;
  expiryDate: Date;
  yorpStatus: YorpStatus;
};

type YorpRegistryTableProps = {
  entries: YorpRegistryEntry[];
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: YorpStatusFilter;
  onStatusFilterChange: (value: YorpStatusFilter) => void;
  districtFilter: "all" | PasigDistrict;
  onDistrictFilterChange: (value: "all" | PasigDistrict) => void;
  barangayFilter: string;
  onBarangayFilterChange: (value: string) => void;
  classificationFilter: string;
  onClassificationFilterChange: (value: string) => void;
  onView: (organizationId: string) => void;
  selectedOrgIds?: Set<string>;
  onSelectedOrgIdsChange?: (selectedIds: Set<string>) => void;
  onDeleteSelected?: () => void;
  isDeleting?: boolean;
};

const STATUS_TABS: { value: YorpStatusFilter; label: string }[] = [
  { value: "all", label: "All Status" },
  { value: "active", label: "Active" },
  { value: "expiring_soon", label: "Expiring Soon" },
  { value: "expired", label: "Expired" },
];

const PAGE_SIZE = 10;

const StatusPill = ({ status }: { status: YorpStatus }) => {
  if (status === "active") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
        Active
      </span>
    );
  }
  if (status === "expired") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-status-danger-border bg-danger-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-icon-danger-secondary">
        Expired
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
      Expiring Soon
    </span>
  );
};

export const YorpRegistryTable = ({
  entries,
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
  onView,
  selectedOrgIds,
  onSelectedOrgIdsChange,
  onDeleteSelected,
  isDeleting = false,
}: YorpRegistryTableProps) => {
  const [page, setPage] = useState(0);
  const [internalSelectedIds, setInternalSelectedIds] = useState<Set<string>>(new Set());
  const selectedIds = selectedOrgIds ?? internalSelectedIds;
  const setSelectedIds = onSelectedOrgIdsChange ?? setInternalSelectedIds;

  // Clear selection whenever filters or pagination change
  useEffect(() => {
    if (selectedIds.size > 0) {
      setSelectedIds(new Set());
    }
  }, [searchValue, statusFilter, districtFilter, barangayFilter, classificationFilter, page]);

  // Keyboard accessibility: Escape to clear selection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedIds.size > 0) {
        setSelectedIds(new Set());
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, setSelectedIds]);

  const barangayOptions = useMemo(
    () => getBarangayOptionsForDistrict(districtFilter),
    [districtFilter],
  );

  const handleDistrictFilterChange = (nextDistrict: "all" | PasigDistrict) => {
    onDistrictFilterChange(nextDistrict);
    setPage(0);
    if (!isBarangayInDistrict(barangayFilter, nextDistrict)) {
      onBarangayFilterChange("all");
    }
  };

  const totalPages = Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
  const clampedPage = Math.min(page, totalPages - 1);
  const pageItems = useMemo(
    () => entries.slice(clampedPage * PAGE_SIZE, clampedPage * PAGE_SIZE + PAGE_SIZE),
    [entries, clampedPage],
  );

  const visibleRowIds = useMemo(() => pageItems.map(({ org }) => org.id), [pageItems]);
  const pageSelectedCount = useMemo(
    () => pageItems.filter(({ org }) => selectedIds.has(org.id)).length,
    [pageItems, selectedIds],
  );
  const isAllPageSelected = pageItems.length > 0 && pageSelectedCount === pageItems.length;
  const isIndeterminate = pageSelectedCount > 0 && pageSelectedCount < pageItems.length;

  const handleToggleSelectAll = () => {
    if (isAllPageSelected) {
      const next = new Set(selectedIds);
      for (const id of visibleRowIds) {
        next.delete(id);
      }
      setSelectedIds(next);
    } else {
      const next = new Set(selectedIds);
      for (const id of visibleRowIds) {
        next.add(id);
      }
      setSelectedIds(next);
    }
  };

  const handleToggleRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

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
            placeholder="Search by URN or organization..."
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
          <DropdownMenuContent
            align="end"
            className="w-[156px] data-[side=bottom]:rounded-b-md data-[side=bottom]:rounded-t-none data-[side=top]:rounded-t-md data-[side=top]:rounded-b-none border-slate-300 p-0"
          >
            <DropdownMenuItem
              onClick={() => handleDistrictFilterChange("all")}
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
                onClick={() => handleDistrictFilterChange(district)}
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
          <DropdownMenuContent
            align="end"
            className="w-[220px] max-h-[300px] overflow-y-auto data-[side=bottom]:rounded-b-md data-[side=bottom]:rounded-t-none data-[side=top]:rounded-t-md data-[side=top]:rounded-b-none border-slate-300 p-0"
          >
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
              <span className="whitespace-nowrap">
                {classificationFilter === "all" ? "All major classifications" : classificationFilter}
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[240px] max-h-[300px] overflow-y-auto data-[side=bottom]:rounded-b-md data-[side=bottom]:rounded-t-none data-[side=top]:rounded-t-md data-[side=top]:rounded-b-none border-slate-300 p-0"
          >
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

      {/* Contextual selection action bar */}
      {selectedIds.size > 0 && (
        <div
          role="region"
          aria-label="Selection actions"
          className="flex items-center justify-between gap-4 border-b border-slate-300 bg-slate-50/95 px-4 py-2.5 transition-all animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center rounded-full bg-slate-200/80 px-2.5 py-0.5 font-segoe text-xs font-semibold text-slate-800">
              {selectedIds.size} {selectedIds.size === 1 ? "organization" : "organizations"} selected
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="font-segoe text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors px-2 py-1 rounded hover:bg-slate-200/60 active:scale-[0.98]"
            >
              Clear selection
            </button>
          </div>

          <div className="flex items-center gap-3">
            {selectedIds.size > 25 && (
              <span className="font-segoe text-xs text-amber-700 font-medium">
                Maximum 25 organizations per bulk deletion
              </span>
            )}
            <button
              type="button"
              onClick={onDeleteSelected}
              disabled={isDeleting || selectedIds.size === 0 || selectedIds.size > 25}
              title={
                selectedIds.size > 25
                  ? "A maximum of 25 organizations can be deleted in a single bulk operation."
                  : undefined
              }
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 font-segoe text-xs font-semibold transition-all active:scale-[0.98]",
                selectedIds.size > 0 && selectedIds.size <= 25
                  ? "border-red-300 bg-red-50/80 text-red-700 hover:bg-red-100 hover:border-red-400 cursor-pointer"
                  : "border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed opacity-60",
              )}
            >
              <Trash2 className={cn("h-3.5 w-3.5 shrink-0", selectedIds.size > 0 && selectedIds.size <= 25 ? "text-red-600" : "text-slate-400")} strokeWidth={1.6} />
              {selectedIds.size === 1 ? "Delete Account" : "Delete Selected"}
            </button>
          </div>
        </div>
      )}

      {/* Table content with horizontal containment */}
      <div className="min-w-0 overflow-x-auto">
        <div className="min-w-[840px]">
          {/* Column headers */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-300 bg-bg-neutral-subtle px-4 py-3 font-segoe text-xs font-semibold uppercase leading-[140%] text-text-neutral-tertiary">
            <span className="w-6 shrink-0 flex items-center justify-center">
              <input
                type="checkbox"
                ref={(el) => {
                  if (el) el.indeterminate = isIndeterminate;
                }}
                checked={isAllPageSelected}
                onChange={handleToggleSelectAll}
                className="h-4 w-4 rounded border-slate-300 text-public-bg-brand focus:ring-public-bg-brand cursor-pointer"
                aria-label="Select all visible organizations on current page"
              />
            </span>
            <span className="w-[14%]">URN</span>
            <span className="w-[19%]">Organization</span>
            <span className="w-[15%]">Major Classification</span>
            <span className="w-[12%]">Registration Date</span>
            <span className="w-[13%]">3-Year Expiry Date</span>
            <span className="w-[10%]">Status</span>
            <span className="w-[90px] shrink-0">Actions</span>
          </div>

          {/* Rows */}
          {pageItems.length === 0 ? (
            <div className="flex flex-col items-center gap-1 px-4 py-16 text-center">
              <p className="font-segoe text-sm font-semibold text-text-default">No matching organizations</p>
              <p className="font-segoe text-xs text-slate-500">Try adjusting the search, status, or location filters.</p>
            </div>
          ) : (
            pageItems.map(({ org, registrationDate, expiryDate, yorpStatus }) => {
              const isSelected = selectedIds.has(org.id);
              return (
                <div
                  key={org.id}
                  className={cn(
                    "flex items-center justify-between gap-2 border-b border-slate-300 p-4 transition-colors last:border-b-0 hover:bg-slate-50",
                    isSelected && "bg-blue-50/40 border-l-2 border-l-public-bg-brand",
                  )}
                >
                  <span className="w-6 shrink-0 flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleRow(org.id)}
                      className="h-4 w-4 rounded border-slate-300 text-public-bg-brand focus:ring-public-bg-brand cursor-pointer"
                      aria-label={`Select ${org.organizationName}`}
                    />
                  </span>

                  <div className="flex w-[14%] items-center">
                    <ReferenceCodeChip code={org.urn || "—"} />
                  </div>

                  <div className="flex w-[19%] min-w-0 flex-col gap-0.5">
                    <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
                      {org.organizationName}
                    </p>
                    <p className="truncate font-segoe text-xs leading-[140%] text-slate-500">
                      {[org.district, org.barangay].filter(Boolean).join(" · ") || "No location provided"}
                    </p>
                  </div>

                  <div className="flex w-[15%] items-center">
                    {org.majorClassification ? (
                      <CategoryChip category={org.majorClassification} />
                    ) : (
                      <span className="font-segoe text-xs text-slate-500">—</span>
                    )}
                  </div>

                  <div className="flex w-[12%] items-center">
                    <p className="font-segoe text-sm font-normal leading-[140%] text-text-default">
                      {format(registrationDate, "d MMM yyyy")}
                    </p>
                  </div>

                  <div className="flex w-[13%] items-center">
                    <p className="font-segoe text-sm font-normal leading-[140%] text-text-default">
                      {format(expiryDate, "d MMM yyyy")}
                    </p>
                  </div>

                  <div className="flex w-[10%] items-center">
                    <StatusPill status={yorpStatus} />
                  </div>

                  <div className="flex w-[90px] shrink-0 items-center">
                    <button
                      type="button"
                      onClick={() => onView(org.id)}
                      className="flex h-9 items-center gap-1.5 whitespace-nowrap rounded-md bg-public-bg-brand px-3 font-segoe text-public-fs-body-sm text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover active:scale-[0.98]"
                    >
                      <Eye className="h-3.5 w-3.5 shrink-0" strokeWidth={1.6} />
                      View
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Footer / pagination */}
      <div className="flex items-center justify-between gap-2 border-t border-slate-300 p-4">
        <p className="font-segoe text-[13px] text-text-neutral-tertiary">
          Showing <span className="text-text-default">{pageItems.length}</span> of{" "}
          <span className="text-text-default">{entries.length}</span> records
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
