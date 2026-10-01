import {
  BUDGET_MONITORING_COLORS,
  BUDGET_MONITORING_LABELS,
  getBudgetExecutionSegmentWidths,
} from "@/lib/budget-monitoring-presentation";
import { cn } from "@/lib/utils";

type BudgetExecutionPipelineProps = {
  releasedAndLiquidated: number;
  pendingDisbursement: number;
  remainingHeadroom: number | null;
  totalAllocation: number | null;
  formatAmount: (amount: number | null) => string;
  className?: string;
};

const states = [
  "releasedAndLiquidated",
  "pendingDisbursement",
  "remainingHeadroom",
] as const;

/** One allocation track. Liquidated funds are already included in the released amount. */
export function BudgetExecutionPipeline({
  releasedAndLiquidated,
  pendingDisbursement,
  remainingHeadroom,
  totalAllocation,
  formatAmount,
  className,
}: BudgetExecutionPipelineProps) {
  const amounts = { releasedAndLiquidated, pendingDisbursement, remainingHeadroom };
  const widths = getBudgetExecutionSegmentWidths({
    ...amounts,
    totalAllocation,
  });
  const formattedAmount = (amount: number | null) =>
    amount === null ? "Unavailable" : formatAmount(amount);

  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap sm:items-start sm:gap-x-8 sm:gap-y-3">
        {states.map((state) => {
          const colors = BUDGET_MONITORING_COLORS[state];
          return (
            <div key={state} className="flex min-w-0 items-start gap-2.5">
              <span aria-hidden="true" className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm", colors.dot)} />
              <div className="min-w-0 space-y-0.5">
                <p className="font-segoe text-xs font-medium leading-snug text-slate-700">
                  {BUDGET_MONITORING_LABELS[state]}
                </p>
                <p className={cn("break-words font-cascadia text-sm font-bold tabular-nums", remainingHeadroom !== null && state === "remainingHeadroom" && remainingHeadroom < 0 ? "text-rose-700" : colors.value)}>
                  {formattedAmount(amounts[state])}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div
        role="img"
        aria-label={`Budget execution pipeline. ${states.map((state) => `${BUDGET_MONITORING_LABELS[state]}: ${formattedAmount(amounts[state])}`).join("; ")}.`}
        className="flex h-3 w-full overflow-hidden rounded-md bg-slate-200"
      >
        {states.map((state) => (
          <div
            key={state}
            aria-hidden="true"
            data-budget-state={state}
            className={cn("h-full shrink-0", BUDGET_MONITORING_COLORS[state].bar)}
            style={{ width: `${widths[state]}%` }}
          />
        ))}
      </div>
    </div>
  );
}
