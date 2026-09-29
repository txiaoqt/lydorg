export const BUDGET_MONITORING_LABELS = {
  allocation: "FY Budget Allocation",
  committed: "Approved / Committed",
  released: "Released Budget",
  liquidated: "Liquidated Budget",
  releasedAndLiquidated: "Released & Liquidated",
  pendingDisbursement: "Pending Disbursement",
  remainingHeadroom: "Remaining Headroom",
} as const;

export const BUDGET_MONITORING_COLORS = {
  allocation: {
    value: "text-slate-700",
    border: "border-slate-200",
    surface: "bg-slate-50",
    bar: "bg-slate-400",
    dot: "bg-slate-400",
  },
  committed: {
    value: "text-blue-700",
    border: "border-blue-200",
    surface: "bg-blue-50",
    bar: "bg-blue-600",
    dot: "bg-blue-600",
  },
  pendingDisbursement: {
    value: "text-blue-700",
    border: "border-blue-200",
    surface: "bg-blue-50",
    bar: "bg-blue-600",
    dot: "bg-blue-600",
  },
  released: {
    value: "text-cyan-700",
    border: "border-cyan-200",
    surface: "bg-cyan-50",
    bar: "bg-cyan-600",
    dot: "bg-cyan-600",
  },
  liquidated: {
    value: "text-emerald-700",
    border: "border-emerald-200",
    surface: "bg-emerald-50",
    bar: "bg-emerald-600",
    dot: "bg-emerald-600",
  },
  releasedAndLiquidated: {
    value: "text-emerald-700",
    border: "border-emerald-200",
    surface: "bg-emerald-50",
    bar: "bg-emerald-600",
    dot: "bg-emerald-600",
  },
  remainingHeadroom: {
    value: "text-slate-600",
    border: "border-slate-200",
    surface: "bg-slate-100",
    bar: "bg-slate-300",
    dot: "bg-slate-300",
  },
} as const;

export type BudgetMonitoringState = keyof typeof BUDGET_MONITORING_COLORS;

export type BudgetMonitoringMetrics = {
  pendingDisbursement: number;
  remainingHeadroom: number | null;
  isDeficit: boolean;
  deficitAmount: number;
};

/** Derived presentation metrics. Source totals remain owned by their existing data queries. */
export function deriveBudgetMonitoringMetrics({
  allocation,
  approved,
  released,
}: {
  allocation: number | null;
  approved: number;
  released: number;
}): BudgetMonitoringMetrics {
  const remainingHeadroom = allocation === null ? null : allocation - approved;
  const isDeficit = remainingHeadroom !== null && remainingHeadroom < 0;

  return {
    pendingDisbursement: Math.max(approved - released, 0),
    remainingHeadroom,
    isDeficit,
    deficitAmount: isDeficit ? Math.abs(remainingHeadroom) : 0,
  };
}

/** Widths share one allocation denominator. Overflow is clipped visually; source amounts stay signed and unchanged. */
export function getBudgetExecutionSegmentWidths({
  releasedAndLiquidated,
  pendingDisbursement,
  remainingHeadroom,
  totalAllocation,
}: {
  releasedAndLiquidated: number;
  pendingDisbursement: number;
  remainingHeadroom: number | null;
  totalAllocation: number | null;
}) {
  if (totalAllocation === null || !Number.isFinite(totalAllocation) || totalAllocation <= 0) {
    return { releasedAndLiquidated: 0, pendingDisbursement: 0, remainingHeadroom: 0 };
  }

  const releasedAmount = Math.min(Math.max(releasedAndLiquidated, 0), totalAllocation);
  const pendingAmount = Math.min(Math.max(pendingDisbursement, 0), totalAllocation - releasedAmount);
  const headroomAmount = Math.min(Math.max(remainingHeadroom ?? 0, 0), totalAllocation - releasedAmount - pendingAmount);
  const asPercent = (amount: number) => (amount / totalAllocation) * 100;

  return {
    releasedAndLiquidated: asPercent(releasedAmount),
    pendingDisbursement: asPercent(pendingAmount),
    remainingHeadroom: asPercent(headroomAmount),
  };
}
