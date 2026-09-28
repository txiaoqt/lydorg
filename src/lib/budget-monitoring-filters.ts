import type {
  BudgetRequest,
  OrganizationProfile,
  LiquidationReport,
  BudgetRequestStatus,
} from "./lydo-connect-data";
import type { PurposeCategoryItem } from "@/admin/components/BudgetMonitoringOverview";
import type { OrganizationFundingRow } from "@/admin/components/OrganizationFundingTable";

export type TimePeriodOption =
  | "current_fy"
  | "previous_fy"
  | "ytd"
  | "last_30_days"
  | "last_90_days"
  | "last_6_months"
  | "custom"
  | "all_time";

export type SortByOption =
  | "approved_desc"
  | "approved_asc"
  | "released_desc"
  | "released_asc"
  | "liquidated_desc"
  | "liquidated_asc"
  | "requested_desc"
  | "requested_asc"
  | "category_asc"
  | "category_desc"
  | "org_asc"
  | "org_desc";

export type ReleaseStatusFilter = "all" | "not_released" | "partially_released" | "fully_released";

export type LiquidationStatusFilter = "all" | "not_liquidated" | "partially_liquidated" | "fully_liquidated";

export interface BudgetMonitoringFilters {
  timePeriod: TimePeriodOption;
  customStartDate?: string;
  customEndDate?: string;
  purposeCategory: string; // "all" or specific category name
  budgetStatus: string; // "all" or specific status or group
  majorClassification: string; // "all" or specific classification
  district: string; // "all" or specific district
  barangay: string; // "all" or specific barangay
  releaseStatus: ReleaseStatusFilter;
  liquidationStatus: LiquidationStatusFilter;
  sortBy: SortByOption;
}

export const DEFAULT_BUDGET_MONITORING_FILTERS: BudgetMonitoringFilters = {
  timePeriod: "current_fy",
  customStartDate: "",
  customEndDate: "",
  purposeCategory: "all",
  budgetStatus: "all",
  majorClassification: "all",
  district: "all",
  barangay: "all",
  releaseStatus: "all",
  liquidationStatus: "all",
  sortBy: "approved_desc",
};

export const TIME_PERIOD_LABELS: Record<TimePeriodOption, string> = {
  current_fy: "Current Fiscal Year",
  previous_fy: "Previous Fiscal Year",
  ytd: "Year to Date (YTD)",
  last_30_days: "Last 30 Days",
  last_90_days: "Last 90 Days",
  last_6_months: "Last 6 Months",
  custom: "Custom Date Range",
  all_time: "All Time",
};

export const SORT_BY_LABELS: Record<SortByOption, string> = {
  approved_desc: "Approved Amount — Highest to Lowest",
  approved_asc: "Approved Amount — Lowest to Highest",
  released_desc: "Released Amount — Highest to Lowest",
  released_asc: "Released Amount — Lowest to Highest",
  liquidated_desc: "Liquidated Amount — Highest to Lowest",
  liquidated_asc: "Liquidated Amount — Lowest to Highest",
  requested_desc: "Requested Amount — Highest to Lowest",
  requested_asc: "Requested Amount — Lowest to Highest",
  category_asc: "Purpose / Category — A to Z",
  category_desc: "Purpose / Category — Z to A",
  org_asc: "Organization Name — A to Z",
  org_desc: "Organization Name — Z to A",
};

export const RELEASE_STATUS_LABELS: Record<ReleaseStatusFilter, string> = {
  all: "All Release Statuses",
  not_released: "Not Released",
  partially_released: "Partially Released",
  fully_released: "Fully Released",
};

export const LIQUIDATION_STATUS_LABELS: Record<LiquidationStatusFilter, string> = {
  all: "All Liquidation Statuses",
  not_liquidated: "Not Liquidated",
  partially_liquidated: "Partially Liquidated",
  fully_liquidated: "Fully Liquidated",
};

export const APPROVED_BUDGET_STATUSES = new Set<string>([
  "awaiting_release",
  "approved_for_ftf_green",
  "hard_copy_submitted",
  "budget_released",
  "completed",
  "approved",
  "approved_green",
  "conditionally_approved_amber",
]);

export const RELEASED_BUDGET_STATUSES = new Set<string>([
  "budget_released",
  "completed",
  "released",
]);

/**
 * Resolves the primary date for a budget request record.
 */
export function getBudgetRequestRecordDate(r: BudgetRequest): Date {
  if (r.createdAt) {
    const d = new Date(r.createdAt);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (r.releaseDate) {
    const d = new Date(r.releaseDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (r.activityDate) {
    const d = new Date(r.activityDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Resolves the fiscal year of a budget request.
 */
export function getBudgetRequestFiscalYear(r: BudgetRequest): number {
  if (typeof r.fiscalYear === "number" && r.fiscalYear >= 2000 && r.fiscalYear <= 2100) {
    return r.fiscalYear;
  }
  if (r.releaseDate) {
    const yr = new Date(r.releaseDate).getFullYear();
    if (!Number.isNaN(yr)) return yr;
  }
  if (r.activityDate) {
    const yr = new Date(r.activityDate).getFullYear();
    if (!Number.isNaN(yr)) return yr;
  }
  if (r.createdAt) {
    const yr = new Date(r.createdAt).getFullYear();
    if (!Number.isNaN(yr)) return yr;
  }
  return new Date().getFullYear();
}

/**
 * Checks if a budget request matches a time period filter.
 */
export function matchesTimePeriod(
  r: BudgetRequest,
  timePeriod: TimePeriodOption,
  selectedFiscalYear: number,
  customStartDate?: string,
  customEndDate?: string,
  referenceNow: Date = new Date()
): boolean {
  const reqFy = getBudgetRequestFiscalYear(r);
  const recDate = getBudgetRequestRecordDate(r);
  const recTime = recDate.getTime();

  switch (timePeriod) {
    case "current_fy":
      return reqFy === selectedFiscalYear;

    case "previous_fy":
      return reqFy === selectedFiscalYear - 1;

    case "ytd": {
      const startOfYear = new Date(referenceNow.getFullYear(), 0, 1, 0, 0, 0, 0).getTime();
      const endOfToday = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate(), 23, 59, 59, 999).getTime();
      return recTime >= startOfYear && recTime <= endOfToday;
    }

    case "last_30_days": {
      const thirtyDaysAgo = new Date(referenceNow.getTime() - 30 * 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
      const endOfToday = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate(), 23, 59, 59, 999).getTime();
      return recTime >= thirtyDaysAgo && recTime <= endOfToday;
    }

    case "last_90_days": {
      const ninetyDaysAgo = new Date(referenceNow.getTime() - 90 * 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
      const endOfToday = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate(), 23, 59, 59, 999).getTime();
      return recTime >= ninetyDaysAgo && recTime <= endOfToday;
    }

    case "last_6_months": {
      const sixMonthsAgo = new Date(referenceNow.getTime() - 180 * 24 * 60 * 60 * 1000).setHours(0, 0, 0, 0);
      const endOfToday = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate(), 23, 59, 59, 999).getTime();
      return recTime >= sixMonthsAgo && recTime <= endOfToday;
    }

    case "custom": {
      if (!customStartDate && !customEndDate) return true;
      let passStart = true;
      let passEnd = true;

      if (customStartDate) {
        const start = new Date(`${customStartDate}T00:00:00`).getTime();
        if (!Number.isNaN(start)) {
          passStart = recTime >= start;
        }
      }

      if (customEndDate) {
        const end = new Date(`${customEndDate}T23:59:59.999`).getTime();
        if (!Number.isNaN(end)) {
          passEnd = recTime <= end;
        }
      }

      return passStart && passEnd;
    }

    case "all_time":
    default:
      return true;
  }
}

/**
 * Checks if a request matches the release status filter.
 */
export function matchesReleaseStatus(r: BudgetRequest, filter: ReleaseStatusFilter): boolean {
  if (filter === "all") return true;
  const released = Number(r.releasedAmount || 0);
  const approved = Number(r.approvedAmount || r.requestedAmount || 0);

  if (filter === "not_released") {
    return released === 0;
  }
  if (filter === "partially_released") {
    return released > 0 && (approved === 0 || released < approved);
  }
  if (filter === "fully_released") {
    return approved > 0 && released >= approved;
  }
  return true;
}

/**
 * Checks if a request matches the liquidation status filter.
 */
export function matchesLiquidationStatus(
  r: BudgetRequest,
  filter: LiquidationStatusFilter,
  liquidationMap: Map<string, LiquidationReport>
): boolean {
  if (filter === "all") return true;
  const liquidation = liquidationMap.get(r.id);
  const isCompletedLiquidated = liquidation?.status === "completed_liquidated" || r.status === "completed";
  const released = Number(r.releasedAmount || 0);

  if (filter === "fully_liquidated") {
    return isCompletedLiquidated;
  }
  if (filter === "partially_liquidated") {
    return (
      !isCompletedLiquidated &&
      Boolean(liquidation && ["under_review", "approved_for_ftf_green", "hard_copy_submitted"].includes(liquidation.status))
    );
  }
  if (filter === "not_liquidated") {
    return !isCompletedLiquidated && (!liquidation || liquidation.status === "pending_activity_completion" || liquidation.status === "not_started" || liquidation.status === "overdue" || liquidation.status === "draft" || liquidation.status === "submitted" || liquidation.status === "needs_revision");
  }
  return true;
}

/**
 * Checks if a budget request matches a budget status filter.
 */
export function matchesBudgetStatus(r: BudgetRequest, statusFilter: string): boolean {
  if (statusFilter === "all") return true;

  if (statusFilter === "submitted_under_review") {
    return r.status === "submitted" || r.status === "under_review";
  }
  if (statusFilter === "needs_revision") {
    return r.status === "needs_revision";
  }
  if (statusFilter === "awaiting_release") {
    return (
      r.status === "awaiting_release" ||
      r.status === "approved_for_ftf_green" ||
      r.status === "hard_copy_submitted"
    );
  }
  if (statusFilter === "budget_released") {
    return r.status === "budget_released";
  }
  if (statusFilter === "completed") {
    return r.status === "completed";
  }
  if (statusFilter === "rejected_red") {
    return r.status === "rejected_red";
  }

  return r.status === statusFilter;
}

/**
 * Main multidimensional filtering function for budget requests.
 */
export function filterBudgetRequests(
  requests: BudgetRequest[],
  filters: BudgetMonitoringFilters,
  organizationMap: Map<string, OrganizationProfile>,
  liquidationMap: Map<string, LiquidationReport>,
  selectedFiscalYear: number,
  referenceNow: Date = new Date()
): BudgetRequest[] {
  return requests.filter((r) => {
    // 1. Time Period
    if (!matchesTimePeriod(r, filters.timePeriod, selectedFiscalYear, filters.customStartDate, filters.customEndDate, referenceNow)) {
      return false;
    }

    // 2. Purpose / Category
    if (filters.purposeCategory !== "all") {
      const cat = (r.purposeCategory || "").trim().toLowerCase();
      if (cat !== filters.purposeCategory.trim().toLowerCase()) {
        return false;
      }
    }

    // 3. Budget Status
    if (!matchesBudgetStatus(r, filters.budgetStatus)) {
      return false;
    }

    // 4. Organization attributes (Major Classification, District, Barangay)
    const org = organizationMap.get(r.organizationId);
    if (filters.majorClassification !== "all") {
      if (!org || org.majorClassification !== filters.majorClassification) {
        return false;
      }
    }

    if (filters.district !== "all") {
      if (!org || (org.district || "").trim() !== filters.district.trim()) {
        return false;
      }
    }

    if (filters.barangay !== "all") {
      if (!org || (org.barangay || "").trim() !== filters.barangay.trim()) {
        return false;
      }
    }

    // 5. Release Status
    if (!matchesReleaseStatus(r, filters.releaseStatus)) {
      return false;
    }

    // 6. Liquidation Status
    if (!matchesLiquidationStatus(r, filters.liquidationStatus, liquidationMap)) {
      return false;
    }

    return true;
  });
}

/**
 * Computes the category breakdown array and sorts it.
 */
export function aggregatePurposeCategories(
  requests: BudgetRequest[],
  liquidationMap: Map<string, LiquidationReport>,
  sortBy: SortByOption
): PurposeCategoryItem[] {
  const totals = new Map<string, { approvedAmount: number; releasedAmount: number; count: number; liquidatedAmount: number; requestedAmount: number }>();

  requests.forEach((r) => {
    const category = (r.purposeCategory || "").trim() || "General / Uncategorized";
    const isApproved = APPROVED_BUDGET_STATUSES.has(r.status);
    const isReleased = RELEASED_BUDGET_STATUSES.has(r.status);
    const liquidation = liquidationMap.get(r.id);
    const isLiquidated = liquidation?.status === "completed_liquidated" || r.status === "completed";

    const app = isApproved ? Number(r.approvedAmount || r.requestedAmount || 0) : 0;
    const rel = isReleased ? Number(r.releasedAmount || 0) : 0;
    const liq = isLiquidated ? Number(r.releasedAmount || 0) : 0;
    const req = Number(r.requestedAmount || 0);

    const prev = totals.get(category) ?? {
      approvedAmount: 0,
      releasedAmount: 0,
      liquidatedAmount: 0,
      requestedAmount: 0,
      count: 0,
    };

    totals.set(category, {
      approvedAmount: prev.approvedAmount + app,
      releasedAmount: prev.releasedAmount + rel,
      liquidatedAmount: prev.liquidatedAmount + liq,
      requestedAmount: prev.requestedAmount + req,
      count: prev.count + 1,
    });
  });

  const list: (PurposeCategoryItem & { liquidatedAmount: number; requestedAmount: number })[] = Array.from(totals.entries()).map(
    ([category, d]) => ({
      category,
      approvedAmount: d.approvedAmount,
      releasedAmount: d.releasedAmount,
      liquidatedAmount: d.liquidatedAmount,
      requestedAmount: d.requestedAmount,
      count: d.count,
    })
  );

  // Apply sorting
  list.sort((left, right) => {
    switch (sortBy) {
      case "approved_asc":
        return left.approvedAmount - right.approvedAmount || left.category.localeCompare(right.category);
      case "released_desc":
        return right.releasedAmount - left.releasedAmount || left.category.localeCompare(right.category);
      case "released_asc":
        return left.releasedAmount - right.releasedAmount || left.category.localeCompare(right.category);
      case "liquidated_desc":
        return right.liquidatedAmount - left.liquidatedAmount || left.category.localeCompare(right.category);
      case "liquidated_asc":
        return left.liquidatedAmount - right.liquidatedAmount || left.category.localeCompare(right.category);
      case "requested_desc":
        return right.requestedAmount - left.requestedAmount || left.category.localeCompare(right.category);
      case "requested_asc":
        return left.requestedAmount - right.requestedAmount || left.category.localeCompare(right.category);
      case "category_asc":
        return left.category.localeCompare(right.category);
      case "category_desc":
        return right.category.localeCompare(left.category);
      case "approved_desc":
      default:
        return right.approvedAmount - left.approvedAmount || left.category.localeCompare(right.category);
    }
  });

  return list.map(({ category, approvedAmount, releasedAmount, count }) => ({
    category,
    approvedAmount,
    releasedAmount,
    count,
  }));
}

/**
 * Computes filtered organization funding rows and sorts them.
 */
export function aggregateOrganizationFundingRows(
  filteredRequests: BudgetRequest[],
  organizationProfiles: OrganizationProfile[],
  liquidationMap: Map<string, LiquidationReport>,
  sortBy: SortByOption
): OrganizationFundingRow[] {
  const requestsByOrg = new Map<string, BudgetRequest[]>();
  filteredRequests.forEach((r) => {
    const list = requestsByOrg.get(r.organizationId) ?? [];
    list.push(r);
    requestsByOrg.set(r.organizationId, list);
  });

  const rows: OrganizationFundingRow[] = [];

  organizationProfiles.forEach((org) => {
    const orgRequests = requestsByOrg.get(org.id);
    if (!orgRequests || orgRequests.length === 0) return;

    const totalRequested = orgRequests.reduce((sum, r) => sum + (r.requestedAmount || 0), 0);
    const totalReleased = orgRequests.reduce((sum, r) => {
      return sum + (RELEASED_BUDGET_STATUSES.has(r.status) ? r.releasedAmount || 0 : 0);
    }, 0);
    const totalLiquidated = orgRequests.reduce((sum, r) => {
      const isLiquidated = liquidationMap.get(r.id)?.status === "completed_liquidated" || r.status === "completed";
      return sum + (isLiquidated ? r.releasedAmount || 0 : 0);
    }, 0);

    rows.push({
      organizationId: org.id,
      urn: org.urn || "—",
      organizationName: org.organizationName,
      majorClassification: org.majorClassification || "Unclassified",
      barangay: org.barangay?.trim() || "Unassigned Barangay",
      totalRequested,
      totalReleased,
      totalLiquidated,
    });
  });

  // Apply sorting
  rows.sort((left, right) => {
    switch (sortBy) {
      case "org_asc":
        return left.organizationName.localeCompare(right.organizationName);
      case "org_desc":
        return right.organizationName.localeCompare(left.organizationName);
      case "released_desc":
        return right.totalReleased - left.totalReleased || left.organizationName.localeCompare(right.organizationName);
      case "released_asc":
        return left.totalReleased - right.totalReleased || left.organizationName.localeCompare(right.organizationName);
      case "liquidated_desc":
        return right.totalLiquidated - left.totalLiquidated || left.organizationName.localeCompare(right.organizationName);
      case "liquidated_asc":
        return left.totalLiquidated - right.totalLiquidated || left.organizationName.localeCompare(right.organizationName);
      case "requested_desc":
        return right.totalRequested - left.totalRequested || left.organizationName.localeCompare(right.organizationName);
      case "requested_asc":
        return left.totalRequested - right.totalRequested || left.organizationName.localeCompare(right.organizationName);
      case "approved_asc":
        return left.totalRequested - right.totalRequested || left.organizationName.localeCompare(right.organizationName);
      case "approved_desc":
      default:
        return right.totalReleased - left.totalReleased || left.organizationName.localeCompare(right.organizationName);
    }
  });

  return rows;
}

/**
 * Counts the active (non-default) filters.
 */
export function getActiveFilterCount(filters: BudgetMonitoringFilters): number {
  let count = 0;
  if (filters.timePeriod !== "current_fy") count += 1;
  if (filters.purposeCategory !== "all") count += 1;
  if (filters.budgetStatus !== "all") count += 1;
  if (filters.majorClassification !== "all") count += 1;
  if (filters.district !== "all") count += 1;
  if (filters.barangay !== "all") count += 1;
  if (filters.releaseStatus !== "all") count += 1;
  if (filters.liquidationStatus !== "all") count += 1;
  if (filters.sortBy !== "approved_desc") count += 1;
  return count;
}
