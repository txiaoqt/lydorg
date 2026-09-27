import { format } from "date-fns";

export type RecentActivityLogItem = {
  id: string;
  activity: string;
  detail: string;
  timestamp: string;
};

type RecentActivityLogCardProps = {
  items: RecentActivityLogItem[];
  actorName: string;
  actorRole: string;
  onViewFullLog: () => void;
};

const formatDayLabel = (date: Date) => {
  const now = new Date();
  if (date.toDateString() === now.toDateString()) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return format(date, "d MMM yyyy");
};

export const RecentActivityLogCard = ({ items, actorName, actorRole, onViewFullLog }: RecentActivityLogCardProps) => (
  <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-xs lg:flex-[2]">
    <div className="flex items-start justify-between gap-3 border-b border-border px-2 py-3 pb-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-segoe text-lg font-semibold leading-none text-foreground">Recent Activity Log</h2>
        <p className="font-segoe text-[13px] font-normal leading-none text-muted-foreground">
          Track recent actions and workflow updates across the system.
        </p>
      </div>
      <button
        type="button"
        onClick={onViewFullLog}
        className="shrink-0 rounded-md p-1.5 font-segoe text-[13px] font-semibold leading-[140%] text-primary transition-all hover:underline"
      >
        View full log
      </button>
    </div>

    {items.length === 0 ? (
      <div className="flex items-center gap-3 rounded-md border border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
        No recent activity yet.
      </div>
    ) : (
      <div className="flex flex-col divide-y divide-border/40">
        {items.map((item) => {
          const date = new Date(item.timestamp);
          const isValidDate = !Number.isNaN(date.getTime());
          const dayLabel = isValidDate ? formatDayLabel(date) : "";
          const timeLabel = isValidDate ? format(date, "h:mm a") : "";
          return (
            <div key={item.id} className="flex items-start gap-3 px-2 py-2.5 transition-colors hover:bg-muted/30 rounded-md">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-segoe text-sm font-semibold leading-snug text-foreground">
                    {item.activity}
                  </p>
                  <p className="shrink-0 font-cascadia text-[10px] font-medium leading-none text-muted-foreground">
                    {dayLabel} &middot; {timeLabel}
                  </p>
                </div>
                <p className="truncate font-segoe text-xs font-normal leading-snug text-muted-foreground">
                  {item.detail}
                </p>
                <p className="font-segoe text-[10px] font-normal leading-none text-muted-foreground/75">
                  By {actorName} ({actorRole})
                </p>
              </div>
            </div>
          );
        })}
      </div>
    )}
  </div>
);
