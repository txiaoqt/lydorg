import React from "react";
import { X } from "lucide-react";
import {
  BudgetMonitoringFilters,
  TIME_PERIOD_LABELS,
  RELEASE_STATUS_LABELS,
  LIQUIDATION_STATUS_LABELS,
  SORT_BY_LABELS,
  getActiveFilterCount,
} from "@/lib/budget-monitoring-filters";

interface BudgetMonitoringFilterSummaryProps {
  filters: BudgetMonitoringFilters;
  onChangeFilters: (next: BudgetMonitoringFilters) => void;
  onResetFilters: () => void;
  selectedFiscalYear: number;
}

export const BudgetMonitoringFilterSummary = ({
  filters,
  onChangeFilters,
  onResetFilters,
  selectedFiscalYear,
}: BudgetMonitoringFilterSummaryProps) => {
  const activeCount = getActiveFilterCount(filters);
  if (activeCount === 0) return null;

  const chips: { key: string; label: string; onRemove: () => void }[] = [];

  if (filters.timePeriod !== "current_fy") {
    let label = TIME_PERIOD_LABELS[filters.timePeriod];
    if (filters.timePeriod === "previous_fy") {
      label = `FY ${selectedFiscalYear - 1}`;
    } else if (filters.timePeriod === "custom") {
      if (filters.customStartDate && filters.customEndDate) {
        label = `${filters.customStartDate} to ${filters.customEndDate}`;
      } else if (filters.customStartDate) {
        label = `From ${filters.customStartDate}`;
      } else if (filters.customEndDate) {
        label = `Until ${filters.customEndDate}`;
      } else {
        label = "Custom Date Range";
      }
    }
    chips.push({
      key: "timePeriod",
      label: `Period: ${label}`,
      onRemove: () =>
        onChangeFilters({
          ...filters,
          timePeriod: "current_fy",
          customStartDate: "",
          customEndDate: "",
        }),
    });
  }

  if (filters.purposeCategory !== "all") {
    chips.push({
      key: "purposeCategory",
      label: `Category: ${filters.purposeCategory}`,
      onRemove: () => onChangeFilters({ ...filters, purposeCategory: "all" }),
    });
  }

  if (filters.budgetStatus !== "all") {
    let statusLabel = filters.budgetStatus;
    if (filters.budgetStatus === "submitted_under_review") statusLabel = "Submitted / Under Review";
    else if (filters.budgetStatus === "needs_revision") statusLabel = "Needs Revision";
    else if (filters.budgetStatus === "awaiting_release") statusLabel = "Awaiting Release";
    else if (filters.budgetStatus === "budget_released") statusLabel = "Budget Released";
    else if (filters.budgetStatus === "completed") statusLabel = "Completed";
    else if (filters.budgetStatus === "rejected_red") statusLabel = "Rejected";

    chips.push({
      key: "budgetStatus",
      label: `Status: ${statusLabel}`,
      onRemove: () => onChangeFilters({ ...filters, budgetStatus: "all" }),
    });
  }

  if (filters.majorClassification !== "all") {
    chips.push({
      key: "majorClassification",
      label: `Classification: ${filters.majorClassification}`,
      onRemove: () => onChangeFilters({ ...filters, majorClassification: "all" }),
    });
  }

  if (filters.district !== "all") {
    chips.push({
      key: "district",
      label: `District: ${filters.district}`,
      onRemove: () => onChangeFilters({ ...filters, district: "all", barangay: "all" }),
    });
  }

  if (filters.barangay !== "all") {
    chips.push({
      key: "barangay",
      label: `Barangay: ${filters.barangay}`,
      onRemove: () => onChangeFilters({ ...filters, barangay: "all" }),
    });
  }

  if (filters.releaseStatus !== "all") {
    chips.push({
      key: "releaseStatus",
      label: `Release: ${RELEASE_STATUS_LABELS[filters.releaseStatus]}`,
      onRemove: () => onChangeFilters({ ...filters, releaseStatus: "all" }),
    });
  }

  if (filters.liquidationStatus !== "all") {
    chips.push({
      key: "liquidationStatus",
      label: `Liquidation: ${LIQUIDATION_STATUS_LABELS[filters.liquidationStatus]}`,
      onRemove: () => onChangeFilters({ ...filters, liquidationStatus: "all" }),
    });
  }

  if (filters.sortBy !== "approved_desc") {
    chips.push({
      key: "sortBy",
      label: `Sort: ${SORT_BY_LABELS[filters.sortBy]}`,
      onRemove: () => onChangeFilters({ ...filters, sortBy: "approved_desc" }),
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-3.5 py-2.5">
      <span className="font-segoe text-xs font-bold text-slate-600 dark:text-slate-400">
        Active Filters:
      </span>
      <div className="flex flex-wrap items-center gap-1.5 flex-1">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1 rounded-md bg-white dark:bg-admin-surface border border-slate-300 dark:border-slate-700 px-2 py-0.5 font-segoe text-[11px] font-semibold text-text-default shadow-2xs"
          >
            <span>{chip.label}</span>
            <button
              type="button"
              aria-label={`Remove filter ${chip.label}`}
              onClick={chip.onRemove}
              className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 rounded-sm p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <button
        type="button"
        onClick={onResetFilters}
        className="font-segoe text-xs font-semibold text-public-text-brand hover:underline"
      >
        Clear all
      </button>
    </div>
  );
};
