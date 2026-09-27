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
        "group flex flex-col gap-2 rounded-lg border border-border bg-card px-4 py-5 shadow-xs transition-all hover:bg-muted/40 hover:border-border/80",
        onClick && "cursor-pointer hover:-translate-y-0.5",
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
        <p className="font-segoe text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/70 border border-border/50 text-foreground/80 transition-colors group-hover:bg-primary/15 group-hover:text-primary dark:group-hover:text-sky-300">
          <Icon
            className="h-4 w-4 transition-colors"
            strokeWidth={1.75}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 px-2">
        <div className="flex items-end justify-start gap-2">
          <p className="font-cascadia text-[30px] font-bold leading-[120%] tracking-tight text-foreground">
            {value}
          </p>
          {showTrend ? (
            <span className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 font-cascadia text-[10px] font-medium leading-[140%] text-muted-foreground">
              <TrendIcon className="h-2.5 w-2.5 shrink-0 text-muted-foreground" strokeWidth={1.6} />
              {trendLabel}
            </span>
          ) : null}
        </div>
        <p className="font-segoe text-[11px] font-normal leading-[140%] text-muted-foreground/80">{description}</p>
      </div>
    </div>
  );
};
