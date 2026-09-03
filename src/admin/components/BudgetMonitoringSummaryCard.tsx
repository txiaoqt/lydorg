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
}: {
  title: string;
  amount: number | null;
  className: string;
}) => (
  <div className={`flex h-[90px] w-full flex-col gap-2 rounded-md border px-4 py-3 ${className}`}>
    <p className="font-segoe text-[11px] font-semibold uppercase leading-[140%] text-slate-500">{title}</p>
    <p className="font-cascadia text-base font-bold leading-[120%] tracking-[-0.02em] text-text-default">
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
    <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 shadow-sm lg:flex-[3]">
      <div className="flex items-start justify-between gap-3 border-b border-slate-300 px-2 py-3 pb-4">
        <div className="flex flex-col gap-1">
          <h2 className="font-segoe text-lg font-semibold leading-none text-text-default">Budget Monitoring</h2>
          <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
            Track the office&rsquo;s FY budget allocation, releases, and liquidated funds.
          </p>
        </div>
        <button
          type="button"
          onClick={onManageRequests}
          className="shrink-0 rounded-md p-2 font-segoe text-[13px] font-semibold leading-[140%] text-public-text-brand transition-all hover:underline"
        >
          Manage requests
        </button>
      </div>

      <div className="flex flex-col gap-3 px-4 py-3">
        <div className="flex items-center justify-between">
          <p className="font-segoe text-[13px] font-semibold leading-none text-text-default">
            Annual Allocation &middot; {fiscalYearLabel}
          </p>
          <p className="font-cascadia text-[13px] font-normal leading-none text-slate-500">
            {formatCurrency(allocation)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-bg-neutral-subtle">
            <div className="h-full bg-bg-warning-default" style={{ width: `${releasedPct}%` }} />
            <div className="h-full bg-bg-success-default" style={{ width: `${liquidatedPct}%` }} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-segoe text-[11px] font-normal leading-none text-slate-500">
              <span className="h-2 w-2 shrink-0 rounded-full bg-bg-warning-default" />
              Budget Released
            </span>
            <span className="flex items-center gap-1.5 font-segoe text-[11px] font-normal leading-none text-slate-500">
              <span className="h-2 w-2 shrink-0 rounded-full bg-bg-success-default" />
              Budget Liquidated
            </span>
            <span className="flex items-center gap-1.5 font-segoe text-[11px] font-normal leading-none text-slate-500">
              <span className="h-2 w-2 shrink-0 rounded-full bg-bg-neutral-subtle" />
              Available
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-0 pb-4">
        <BudgetStatChip title="Total Budget" amount={annualAllocation} className="border-slate-300 bg-admin-surface" />
        <BudgetStatChip title="Released" amount={totalReleased} className="border-warning-subtle bg-amber-50" />
        <BudgetStatChip title="Liquidated" amount={totalLiquidated} className="border-success-subtle bg-bg-success-subtle" />
        <BudgetStatChip
          title="Available"
          amount={annualAllocation === null ? 0 : available}
          className="border-slate-300 bg-slate-50"
        />
      </div>
    </div>
  );
};
