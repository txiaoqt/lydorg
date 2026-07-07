import { type ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";

export type RecentActivityItem = {
  id: string;
  message: ReactNode;
  note?: ReactNode;
  timestamp?: string | Date | null;
  timestampLabel?: string;
};

type RecentActivityListProps = {
  activities: RecentActivityItem[];
  emptyMessage?: string;
  emptyDescription?: string;
  maxItems?: number;
  listClassName?: string;
  itemClassName?: string;
};

type RecentActivityPreviewProps = RecentActivityListProps & {
  title?: string;
  description?: string;
  onViewAll?: () => void;
  viewAllLabel?: string;
  className?: string;
  headerClassName?: string;
};

const sortRecentActivities = (activities: RecentActivityItem[]) =>
  [...activities].sort((left, right) => {
    const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : Number.NEGATIVE_INFINITY;
    const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : Number.NEGATIVE_INFINITY;
    return rightTime - leftTime;
  });

function buildDateTimeValue(value?: string | Date | null) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function RecentActivityList({
  activities,
  emptyMessage = "No recent activity yet.",
  emptyDescription,
  maxItems,
  listClassName,
  itemClassName,
}: RecentActivityListProps) {
  const sortedActivities = useMemo(() => sortRecentActivities(activities), [activities]);
  const visibleActivities = maxItems ? sortedActivities.slice(0, maxItems) : sortedActivities;

  if (!visibleActivities.length) {
    return (
      <div className="rounded-xl border border-border/60 bg-muted/10 px-4 py-3 text-sm text-muted-foreground">
        <p>{emptyMessage}</p>
        {emptyDescription ? <p className="mt-1 text-xs">{emptyDescription}</p> : null}
      </div>
    );
  }

  return (
    <ul className={cn("recent-activity-list m-0 list-none p-0", listClassName)}>
      {visibleActivities.map((activity) => (
        <li
          key={activity.id}
          className={cn(
            "recent-activity-item grid grid-cols-[auto_minmax(0,1fr)] gap-2.5 py-3 first:pt-0 last:pb-0",
            "[&+&]:border-t [&+&]:border-border/60",
            itemClassName,
          )}
        >
          <span className="recent-activity-dot mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
          <div className="recent-activity-content min-w-0">
            <div className="recent-activity-message text-sm leading-5 text-foreground">{activity.message}</div>
            {activity.note ? <div className="mt-1 text-xs leading-5 text-muted-foreground">{activity.note}</div> : null}
            {activity.timestampLabel ? (
              <time
                className="recent-activity-time mt-1 block text-xs text-muted-foreground"
                dateTime={buildDateTimeValue(activity.timestamp)}
              >
                {activity.timestampLabel}
              </time>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function RecentActivityPreview({
  activities,
  title = "Recent Activity",
  description,
  maxItems = 3,
  onViewAll,
  viewAllLabel = "View full activity log",
  emptyMessage = "No recent activity yet.",
  emptyDescription,
  className,
  headerClassName,
  listClassName,
  itemClassName,
}: RecentActivityPreviewProps) {
  const sortedActivities = useMemo(() => sortRecentActivities(activities), [activities]);
  const hasMoreActivities = sortedActivities.length > maxItems;

  return (
    <div className={cn("recent-activity-card rounded-[1.05rem] border border-border/70 bg-background p-4 shadow-sm sm:p-4", className)}>
      {(title || description) && (
        <div className={cn("recent-activity-header mb-3.5", headerClassName)}>
          {title ? <h3 className="recent-activity-title text-base font-semibold text-foreground">{title}</h3> : null}
          {description ? <p className="recent-activity-description mt-1 text-sm text-muted-foreground">{description}</p> : null}
        </div>
      )}

      <RecentActivityList
        activities={sortedActivities}
        maxItems={maxItems}
        emptyMessage={emptyMessage}
        emptyDescription={emptyDescription}
        listClassName={listClassName}
        itemClassName={itemClassName}
      />

      {hasMoreActivities && onViewAll ? (
        <button
          type="button"
          className="recent-activity-view-all mt-3 inline-flex text-sm font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
          onClick={onViewAll}
        >
          {viewAllLabel}
        </button>
      ) : null}
    </div>
  );
}
