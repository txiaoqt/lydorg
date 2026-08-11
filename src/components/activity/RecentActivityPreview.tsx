import { type ReactNode, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Info,
  Calendar
} from "lucide-react";

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

export const formatActivityActionLabel = (rawAction?: string) => {
  if (!rawAction) return "Document Action Recorded";
  const action = rawAction.toLowerCase().trim();

  if (action === "submitted_batch_document_review" || action === "batch_submitted" || action.includes("submitted batch") || action.includes("submitted_batch")) {
    return "Batch Documents Submitted";
  }
  if (action === "reviewed_documents" || action === "documents_reviewed" || action.includes("reviewed_documents")) {
    return "Documents Reviewed";
  }
  if (action === "approved_documents" || action === "document_approved" || action === "approved" || action.includes("approved")) {
    return "Documents Approved";
  }
  if (action === "needs_revision" || action === "revision_requested" || action.includes("revision")) {
    return "Revision Requested";
  }
  if (action === "rejected_documents" || action === "document_rejected" || action === "rejected" || action.includes("rejected")) {
    return "Document Rejected";
  }
  if (action === "profile_updated" || action.includes("profile")) {
    return "Profile Updated";
  }

  return rawAction
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatFullActivityTimestamp = (dateInput?: string | Date | null) => {
  if (!dateInput) return "Aug 6, 2026 • 2:45 PM";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return String(dateInput);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year} • ${hours}:${minutes} ${ampm}`;
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

function getActivityStatusIcon(rawMessage?: ReactNode) {
  const text = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";
  if (text.includes("approved") || text.includes("completed")) {
    return {
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      tone: "bg-emerald-500/10 border-emerald-500/20"
    };
  }
  if (text.includes("revision") || text.includes("warning")) {
    return {
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      tone: "bg-amber-500/10 border-amber-500/20"
    };
  }
  if (text.includes("rejected") || text.includes("error")) {
    return {
      icon: <XCircle className="h-4 w-4 text-rose-600 dark:text-rose-400 shrink-0" />,
      tone: "bg-rose-500/10 border-rose-500/20"
    };
  }
  if (text.includes("submitted") || text.includes("review") || text.includes("batch")) {
    return {
      icon: <Clock className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />,
      tone: "bg-indigo-500/10 border-indigo-500/20"
    };
  }
  return {
    icon: <Info className="h-4 w-4 text-primary shrink-0" />,
    tone: "bg-primary/10 border-primary/20"
  };
}

export function RecentActivityList({
  activities,
  emptyMessage = "No recent activity yet.",
  emptyDescription,
  maxItems,
  listClassName,
  itemClassName,
}: RecentActivityListProps) {
  // CRITICAL FIX FOR REACT RULES OF HOOKS:
  // All hooks (useMemo) MUST be called unconditionally at the very top before any early returns.
  const sortedActivities = useMemo(() => sortRecentActivities(activities), [activities]);
  const visibleActivities = useMemo(
    () => (maxItems ? sortedActivities.slice(0, maxItems) : sortedActivities),
    [sortedActivities, maxItems]
  );

  // Group activities by Date String (e.g. Today, Aug 6, 2026)
  const groupedActivities = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: RecentActivityItem[] }> = [];
    visibleActivities.forEach((item) => {
      let dateLabel = "Recent Updates";
      if (item.timestamp) {
        const dateObj = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
        if (!Number.isNaN(dateObj.getTime())) {
          const now = new Date();
          const isToday = dateObj.toDateString() === now.toDateString();
          const yesterday = new Date(now);
          yesterday.setDate(now.getDate() - 1);
          const isYesterday = dateObj.toDateString() === yesterday.toDateString();

          if (isToday) dateLabel = "Today";
          else if (isYesterday) dateLabel = "Yesterday";
          else {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            dateLabel = `${months[dateObj.getMonth()]} ${dateObj.getDate()}, ${dateObj.getFullYear()}`;
          }
        }
      }

      let existing = groups.find((g) => g.dateLabel === dateLabel);
      if (!existing) {
        existing = { dateLabel, items: [] };
        groups.push(existing);
      }
      existing.items.push(item);
    });
    return groups;
  }, [visibleActivities]);

  // Early return AFTER all hooks have executed unconditionally
  if (!visibleActivities.length) {
    return (
      <div className="rounded-2xl border border-border/60 bg-muted/10 px-5 py-4 text-sm text-muted-foreground text-center">
        <p className="font-semibold text-foreground">{emptyMessage}</p>
        {emptyDescription ? <p className="mt-1 text-xs">{emptyDescription}</p> : null}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4 max-h-[60vh] overflow-y-auto pr-1", listClassName)}>
      {groupedActivities.map((group) => (
        <div key={group.dateLabel} className="space-y-2">
          {/* Date Group Header Badge */}
          <div className="sticky top-0 z-10 bg-card/90 backdrop-blur-xs py-1">
            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider bg-accent/60 px-2.5 py-0.5 rounded-md border border-border/40 inline-flex items-center gap-1.5">
              <Calendar className="h-3 w-3 text-primary shrink-0" />
              {group.dateLabel}
            </span>
          </div>

          {/* Stacked Activity Cards with Hover Feedback */}
          <div className="space-y-2">
            {group.items.map((activity) => {
              const displayTitle = typeof activity.message === "string"
                ? formatActivityActionLabel(activity.message)
                : activity.message;
              const timestampFormatted = activity.timestampLabel || formatFullActivityTimestamp(activity.timestamp);
              const { icon, tone } = getActivityStatusIcon(displayTitle);

              return (
                <div
                  key={activity.id}
                  className={cn(
                    "rounded-2xl border border-border/60 bg-background/80 p-3.5 sm:p-4 hover:bg-accent/40 hover:border-primary/30 transition-all duration-200 shadow-2xs group cursor-default",
                    itemClassName
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl border shrink-0 flex items-center justify-center", tone)}>
                      {icon}
                    </div>
                    <div className="min-w-0 flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <div className="min-w-0 space-y-0.5">
                        <h4 className="text-xs font-bold text-foreground leading-tight truncate">
                          {displayTitle}
                        </h4>
                        {activity.note && (
                          <p className="text-[11px] text-muted-foreground line-clamp-1">
                            {activity.note}
                          </p>
                        )}
                      </div>
                      <time
                        className="text-[10px] text-muted-foreground font-medium shrink-0 self-start sm:self-center"
                        dateTime={buildDateTimeValue(activity.timestamp)}
                      >
                        {timestampFormatted}
                      </time>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
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
    <div className={cn("recent-activity-card rounded-2xl border border-border/60 bg-card p-5 shadow-xs space-y-4", className)}>
      {(title || description) && (
        <div className={cn("recent-activity-header space-y-0.5", headerClassName)}>
          {title ? <h3 className="recent-activity-title text-sm font-bold text-foreground">{title}</h3> : null}
          {description ? <p className="recent-activity-description text-xs text-muted-foreground">{description}</p> : null}
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
          className="recent-activity-view-all text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1 cursor-pointer pt-2 border-t border-border/40 w-full justify-end"
          onClick={onViewAll}
        >
          {viewAllLabel} →
        </button>
      ) : null}
    </div>
  );
}
