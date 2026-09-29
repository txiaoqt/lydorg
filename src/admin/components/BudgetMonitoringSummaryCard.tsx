import { BUDGET_MONITORING_COLORS, BUDGET_MONITORING_LABELS, deriveBudgetMonitoringMetrics } from "@/lib/budget-monitoring-presentation";
import { BudgetExecutionPipeline } from "@/components/portal/BudgetExecutionPipeline";

type BudgetMonitoringSummaryCardProps = {
  fiscalYearLabel: string;
  annualAllocation: number | null;
  totalApproved: number;
  totalReleased: number;
  totalLiquidated: number;
  onManageRequests: () => void;
};

const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const formatCurrency = (value: number | null) => value === null ? "—" : pesoFormatter.format(value);

const BudgetStatChip = ({
  title,
  amount,
  className,
  titleClassName,
  valueClassName,
}: {
  title: string;
  amount: number | null;
  className: string;
  titleClassName?: string;
  valueClassName?: string;
}) => (
  <div className={`flex h-[90px] min-w-0 w-full flex-col justify-between rounded-lg border px-3 py-3 shadow-2xs ${className}`}>
    <p className={`break-words font-segoe text-[11px] font-semibold uppercase leading-tight tracking-wider ${titleClassName ?? "text-muted-foreground"}`}>
      {title}
    </p>
    <p className={`font-cascadia text-base font-bold leading-[120%] tracking-tight ${valueClassName ?? "text-foreground"}`}>
      {formatCurrency(amount)}
    </p>
  </div>
);

export const BudgetMonitoringSummaryCard = ({
  fiscalYearLabel,
  annualAllocation,
  totalApproved,
  totalReleased,
  totalLiquidated,
  onManageRequests,
}: BudgetMonitoringSummaryCardProps) => {
  const metrics = deriveBudgetMonitoringMetrics({
    allocation: annualAllocation,
    approved: totalApproved,
    released: totalReleased,
  });

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-xs lg:flex-[3]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-2 py-3 pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-segoe text-lg font-semibold leading-none text-foreground">Budget Monitoring</h2>
          <p className="font-segoe text-[13px] font-normal leading-none text-muted-foreground">
            Track the office&rsquo;s allocation, approved commitments, releases, and completed liquidations for this fiscal year.
          </p>
        </div>
        <button
          type="button"
          onClick={onManageRequests}
          className="shrink-0 rounded-md p-1.5 font-segoe text-[13px] font-semibold leading-[140%] text-primary transition-all hover:underline"
        >
          Manage requests
        </button>
      </div>

      <div className="flex flex-col gap-3 px-3 py-3">
        <div className="flex items-center justify-between">
          <p className="font-segoe text-[13px] font-semibold leading-none text-foreground">
            {BUDGET_MONITORING_LABELS.allocation} &middot; {fiscalYearLabel}
          </p>
          <p className="font-cascadia text-[13px] font-bold leading-none text-foreground/90">
            {formatCurrency(annualAllocation)}
          </p>
        </div>

        <div className="border-t border-border pt-3">
          <p className="mb-3 font-segoe text-xs font-semibold text-foreground">
            Budget Execution Pipeline &middot; {fiscalYearLabel}
          </p>
          <BudgetExecutionPipeline
            releasedAndLiquidated={totalReleased}
            pendingDisbursement={metrics.pendingDisbursement}
            remainingHeadroom={metrics.remainingHeadroom}
            totalAllocation={annualAllocation}
            formatAmount={formatCurrency}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-0 pb-3 xl:grid-cols-3">
        <BudgetStatChip
          title={BUDGET_MONITORING_LABELS.allocation}
          amount={annualAllocation}
          className="border-border bg-card/90"
          valueClassName={BUDGET_MONITORING_COLORS.allocation.value}
        />
        <BudgetStatChip
          title={BUDGET_MONITORING_LABELS.committed}
          amount={totalApproved}
          className="border-blue-200 bg-blue-50"
          titleClassName={BUDGET_MONITORING_COLORS.committed.value}
          valueClassName={BUDGET_MONITORING_COLORS.committed.value}
        />
        <BudgetStatChip
          title={BUDGET_MONITORING_LABELS.released}
          amount={totalReleased}
          className={`${BUDGET_MONITORING_COLORS.released.border} ${BUDGET_MONITORING_COLORS.released.surface}`}
          titleClassName={BUDGET_MONITORING_COLORS.released.value}
          valueClassName={BUDGET_MONITORING_COLORS.released.value}
        />
        <BudgetStatChip
          title={BUDGET_MONITORING_LABELS.liquidated}
          amount={totalLiquidated}
          className={`${BUDGET_MONITORING_COLORS.liquidated.border} ${BUDGET_MONITORING_COLORS.liquidated.surface}`}
          titleClassName={BUDGET_MONITORING_COLORS.liquidated.value}
          valueClassName={BUDGET_MONITORING_COLORS.liquidated.value}
        />
        <BudgetStatChip
          title={BUDGET_MONITORING_LABELS.remainingHeadroom}
          amount={metrics.remainingHeadroom}
          className={`${BUDGET_MONITORING_COLORS.remainingHeadroom.border} ${BUDGET_MONITORING_COLORS.remainingHeadroom.surface}`}
          titleClassName={BUDGET_MONITORING_COLORS.remainingHeadroom.value}
          valueClassName={metrics.isDeficit ? "text-rose-700" : BUDGET_MONITORING_COLORS.remainingHeadroom.value}
        />
      </div>
    </div>
  );
};
