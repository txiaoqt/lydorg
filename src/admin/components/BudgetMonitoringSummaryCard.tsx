type BudgetMonitoringSummaryCardProps = {
  fiscalYearLabel: string;
  annualAllocation: number | null;
  totalReleased: number;
  totalLiquidated: number;
  onManageRequests: () => void;
};

const formatCurrency = (value: number) => `₱${Math.round(value).toLocaleString()}`;

const BudgetStatChip = ({
  title,
  amount,
  className,
  titleClassName,
}: {
  title: string;
  amount: number | null;
  className: string;
  titleClassName?: string;
}) => (
  <div className={`flex h-[90px] w-full flex-col justify-between rounded-lg border px-4 py-3 shadow-2xs ${className}`}>
    <p className={`font-segoe text-[11px] font-semibold uppercase tracking-wider ${titleClassName ?? "text-muted-foreground"}`}>
      {title}
    </p>
    <p className="font-cascadia text-base font-bold leading-[120%] tracking-tight text-foreground">
      {formatCurrency(amount ?? 0)}
    </p>
  </div>
);

export const BudgetMonitoringSummaryCard = ({
  fiscalYearLabel,
  annualAllocation,
  totalReleased,
  totalLiquidated,
  onManageRequests,
}: BudgetMonitoringSummaryCardProps) => {
  const allocation = annualAllocation ?? 0;
  const releasedPct = allocation > 0 ? Math.min((totalReleased / allocation) * 100, 100) : 0;
  const liquidatedPct = allocation > 0 ? Math.min((totalLiquidated / allocation) * 100, 100 - releasedPct) : 0;
  const available = Math.max(allocation - totalReleased, 0);

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-xs lg:flex-[3]">
      <div className="flex items-start justify-between gap-3 border-b border-border px-2 py-3 pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-segoe text-lg font-semibold leading-none text-foreground">Budget Monitoring</h2>
          <p className="font-segoe text-[13px] font-normal leading-none text-muted-foreground">
            Track the office&rsquo;s FY budget allocation, releases, and liquidated funds.
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
            Annual Allocation &middot; {fiscalYearLabel}
          </p>
          <p className="font-cascadia text-[13px] font-bold leading-none text-foreground/90">
            {formatCurrency(allocation)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted/80 border border-border/40">
            <div className="h-full bg-amber-500 transition-all duration-300" style={{ width: `${releasedPct}%` }} />
            <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${liquidatedPct}%` }} />
          </div>
          <div className="flex flex-wrap items-center gap-4 pt-0.5">
            <span className="flex items-center gap-1.5 font-segoe text-[11px] font-medium leading-none text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              Budget Released
            </span>
            <span className="flex items-center gap-1.5 font-segoe text-[11px] font-medium leading-none text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
              Budget Liquidated
            </span>
            <span className="flex items-center gap-1.5 font-segoe text-[11px] font-medium leading-none text-muted-foreground">
              <span className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/40" />
              Available
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-0 pb-3">
        <BudgetStatChip
          title="Total Budget"
          amount={annualAllocation}
          className="border-border bg-card/90"
        />
        <BudgetStatChip
          title="Released"
          amount={totalReleased}
          className="border-amber-500/30 bg-amber-500/10 dark:border-amber-500/25 dark:bg-amber-500/10"
          titleClassName="text-amber-600 dark:text-amber-400"
        />
        <BudgetStatChip
          title="Liquidated"
          amount={totalLiquidated}
          className="border-emerald-500/30 bg-emerald-500/10 dark:border-emerald-500/25 dark:bg-emerald-500/10"
          titleClassName="text-emerald-600 dark:text-emerald-400"
        />
        <BudgetStatChip
          title="Available"
          amount={annualAllocation === null ? 0 : available}
          className="border-sky-500/30 bg-sky-500/10 dark:border-sky-500/25 dark:bg-sky-500/10"
          titleClassName="text-sky-600 dark:text-sky-400"
        />
      </div>
    </div>
  );
};
