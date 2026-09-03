import { TrendingDown, TrendingUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type StatsCardProps = {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: "up" | "down";
  trendLabel?: string;
  description: string;
  onClick?: () => void;
};

export const StatsCard = ({ title, value, icon: Icon, trend, trendLabel, description, onClick }: StatsCardProps) => {
  const TrendIcon = trend === "down" ? TrendingDown : TrendingUp;
  const showTrend = Boolean(trendLabel);

  return (
    <div
      className={cn(
        "group flex flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-6 shadow-sm transition-colors hover:bg-slate-50",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <div className="flex items-start justify-between px-2">
        <p className="font-segoe text-[11px] font-semibold leading-[140%] text-slate-500">{title}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-neutral-100 p-2 transition-colors group-hover:bg-bg-info-secondary">
          <Icon
            className="h-4 w-4 text-slate-500 transition-colors group-hover:text-icon-info-secondary"
            strokeWidth={1.6}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 px-2">
        <div className="flex items-end justify-start gap-2">
          <p className="font-cascadia text-[32px] font-bold leading-[120%] tracking-[-0.02em] text-text-default">
            {value}
          </p>
          {showTrend ? (
            <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-slate-300 bg-slate-50 px-1.5 py-0.5 font-cascadia text-[10px] font-normal leading-[140%] text-slate-500 transition-colors group-hover:border-transparent group-hover:bg-transparent">
              <TrendIcon className="h-2.5 w-2.5 shrink-0 text-slate-500" strokeWidth={1.6} />
              {trendLabel}
            </span>
          ) : null}
        </div>
        <p className={cn("font-segoe text-[10px] font-normal leading-[140%] text-slate-500")}>{description}</p>
      </div>
    </div>
  );
};
