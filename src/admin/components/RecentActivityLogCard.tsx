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
  <div className="flex min-w-0 flex-1 flex-col gap-2 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 shadow-sm lg:flex-[2]">
    <div className="flex items-start justify-between gap-3 border-b border-slate-300 px-2 py-3 pb-4">
      <div className="flex flex-col gap-1">
        <h2 className="font-segoe text-lg font-semibold leading-none text-text-default">Recent Activity Log</h2>
        <p className="font-segoe text-[13px] font-normal leading-none text-slate-500">
          Track recent actions and workflow updates across the system.
        </p>
      </div>
      <button
        type="button"
        onClick={onViewFullLog}
        className="shrink-0 rounded-md p-2 font-segoe text-[13px] font-semibold leading-[140%] text-public-text-brand transition-all hover:underline"
      >
        View full log
      </button>
    </div>

    {items.length === 0 ? (
      <div className="flex items-center gap-3 rounded-md bg-slate-50 px-4 py-3 text-sm text-slate-500">
        No recent activity yet.
      </div>
    ) : (
      <div className="flex flex-col">
        {items.map((item) => {
          const date = new Date(item.timestamp);
          const isValidDate = !Number.isNaN(date.getTime());
          const dayLabel = isValidDate ? formatDayLabel(date) : "";
          const timeLabel = isValidDate ? format(date, "h:mm a") : "";
          return (
            <div key={item.id} className="flex gap-2.5 px-4 py-2">
              <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-public-bg-brand" />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="truncate font-segoe text-sm font-semibold leading-[120%] text-public-text-neutral-default">
                    {item.activity}
                  </p>
                  <p className="shrink-0 font-cascadia text-[10px] font-normal leading-[140%] text-slate-500">
                    {dayLabel} &middot; {timeLabel}
                  </p>
                </div>
                <p className="truncate font-segoe text-[13px] font-normal leading-none text-public-text-neutral-default">
                  {item.detail}
                </p>
                <p className="font-segoe text-[10px] font-normal leading-[140%] text-slate-500">
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
