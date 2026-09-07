import React, { useMemo } from "react";
import { History } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatActivityActionLabel } from "@/components/activity/RecentActivityPreview";

export type ActivityTimelineItem = {
  id: string;
  message: React.ReactNode;
  note?: React.ReactNode;
  timestamp?: string | Date | null;
  timestampLabel?: string;
};

export interface OrganizationActivityHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: ActivityTimelineItem[];
  description?: string;
  emptyDescription?: string;
  onViewFullAuditTimeline?: () => void;
}

/**
 * Normalizes activity descriptions into clean, authoritative action labels.
 * Strips redundant "On [Date]" suffixes from database log strings since the date
 * is already displayed in the section header and timestamp.
 */
export const normalizeActivityTitle = (rawTitle: React.ReactNode): React.ReactNode => {
  if (typeof rawTitle !== "string") return rawTitle;
  let title = rawTitle.trim();

  // Strip redundant " On [MONTH] [DAY], [YEAR]." suffix
  title = title.replace(/\s+On\s+[A-Za-z]+(?:\s+\d{1,2})?,?\s+\d{4}\.?$/i, "");
  // Strip trailing period if present
  title = title.replace(/\.$/, "");

  return formatActivityActionLabel(title);
};

/**
 * Formats event timestamps into readable institutional format (e.g. "Aug 6, 2026 · 3:33 AM").
 */
export const formatEventTimestamp = (
  dateInput?: string | Date | null,
  fallbackLabel?: string
): string => {
  if (!dateInput) return fallbackLabel || "Date not recorded";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return fallbackLabel || String(dateInput);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const month = months[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;

  return `${month} ${day}, ${year} · ${hours}:${minutes} ${ampm}`;
};

/**
 * Formats uppercase chronological section headers (e.g. "AUGUST 6, 2026").
 */
export const formatGroupDateHeader = (dateInput?: string | Date | null): string => {
  if (!dateInput) return "RECENT ACTIVITY";
  const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(date.getTime())) return "RECENT ACTIVITY";

  const months = [
    "JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE",
    "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"
  ];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

/**
 * Determines restrained dot marker semantics along the timeline rail.
 * Avoids loud decorative icon containers; uses clean solid dots with subtle status coloring.
 */
export const getActivityMarker = (rawMessage?: React.ReactNode) => {
  const text = typeof rawMessage === "string" ? rawMessage.toLowerCase() : "";

  if (text.includes("verified") || text.includes("approved") || text.includes("completed")) {
    return {
      dotClassName: "bg-emerald-600 dark:bg-emerald-400 ring-emerald-500/20",
      category: "Verified",
    };
  }

  if (text.includes("revision") || text.includes("rejected") || text.includes("flagged") || text.includes("warning")) {
    return {
      dotClassName: "bg-amber-600 dark:bg-amber-400 ring-amber-500/20",
      category: "Action Required",
    };
  }

  if (text.includes("profile")) {
    return {
      dotClassName: "bg-primary ring-primary/20",
      category: "Profile Update",
    };
  }

  if (text.includes("document") || text.includes("upload") || text.includes("submitted") || text.includes("batch")) {
    return {
      dotClassName: "bg-sky-600 dark:bg-sky-400 ring-sky-500/20",
      category: "Document Action",
    };
  }

  if (text.includes("budget") || text.includes("grant") || text.includes("cash")) {
    return {
      dotClassName: "bg-indigo-600 dark:bg-indigo-400 ring-indigo-500/20",
      category: "Budget Action",
    };
  }

  if (text.includes("liquidation")) {
    return {
      dotClassName: "bg-purple-600 dark:bg-purple-400 ring-purple-500/20",
      category: "Liquidation Action",
    };
  }

  return {
    dotClassName: "bg-slate-400 dark:bg-slate-500 ring-slate-400/20",
    category: "General Update",
  };
};

export const OrganizationActivityHistoryModal: React.FC<OrganizationActivityHistoryModalProps> = ({
  open,
  onOpenChange,
  activities = [],
  description,
  emptyDescription = "Profile changes and admin review actions will appear here.",
}) => {
  // Sort activities chronologically descending (most recent first)
  const sortedActivities = useMemo(() => {
    return [...activities].sort((left, right) => {
      const leftTime = left.timestamp ? new Date(left.timestamp).getTime() : Number.NEGATIVE_INFINITY;
      const rightTime = right.timestamp ? new Date(right.timestamp).getTime() : Number.NEGATIVE_INFINITY;
      return rightTime - leftTime;
    });
  }, [activities]);

  // Group activities by date string (e.g. "AUGUST 6, 2026")
  const groupedActivities = useMemo(() => {
    const groups: Array<{ dateLabel: string; items: ActivityTimelineItem[] }> = [];

    sortedActivities.forEach((item) => {
      const dateLabel = formatGroupDateHeader(item.timestamp);
      let group = groups.find((g) => g.dateLabel === dateLabel);
      if (!group) {
        group = { dateLabel, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });

    return groups;
  }, [sortedActivities]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1.5rem)] sm:max-w-xl p-0 gap-0 overflow-hidden rounded-2xl bg-card border border-border/80 shadow-2xl flex flex-col max-h-[85vh]">
        {/* Refined Institutional Header */}
        <DialogHeader className="px-5 sm:px-6 pt-5 pb-3.5 border-b border-border/60 bg-muted/10 text-left shrink-0">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px] mb-1 tracking-wide">
            <History className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Official Audit Trail</span>
          </div>

          <div className="flex items-center justify-between gap-3 pr-6">
            <DialogTitle className="text-base sm:text-lg font-bold tracking-tight text-foreground">
              Organization Activity History
            </DialogTitle>
            <span className="text-[10px] font-mono font-medium text-muted-foreground bg-muted/80 px-2 py-0.5 rounded-full border border-border/60 shrink-0">
              {activities.length} {activities.length === 1 ? "event" : "events"}
            </span>
          </div>

          <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
            {description || "Complete chronological timeline of verification reviews, profile updates, and official compliance actions."}
          </DialogDescription>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/80 mt-1.5 pt-1.5 border-t border-border/40">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span className="truncate">
              {activities.length} recorded event{activities.length === 1 ? "" : "s"} · Official Y-TRACE Record
            </span>
          </div>
        </DialogHeader>

        {/* Scrollable Timeline Area with Tight Deliberate Density */}
        <div className="px-5 sm:px-6 py-4 overflow-y-auto max-h-[calc(85vh-9rem)] space-y-4 flex-1 pr-4 sm:pr-6">
          {groupedActivities.length > 0 ? (
            groupedActivities.map((group) => (
              <div key={group.dateLabel} className="space-y-2.5">
                {/* Chronological Section Header: uppercase tracked date + hairline rule */}
                <div className="flex items-center gap-2.5 pt-0.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/90 font-mono">
                    {group.dateLabel}
                  </span>
                  <div className="h-px bg-border/50 flex-1" />
                </div>

                {/* Vertical Timeline Rail */}
                <div className="relative space-y-2.5 py-0.5">
                  {/* Perfectly centered vertical connector line anchored to marker column center */}
                  <div
                    aria-hidden="true"
                    className="absolute left-3 top-0 bottom-0 w-px -translate-x-1/2 bg-border/70 pointer-events-none"
                  />

                  {group.items.map((item) => {
                    const title = normalizeActivityTitle(item.message);
                    const timestampFormatted = formatEventTimestamp(item.timestamp, item.timestampLabel);
                    const marker = getActivityMarker(item.message);

                    return (
                      <div
                        key={item.id}
                        className="relative group flex items-start gap-1 py-0.5"
                      >
                        {/* Fixed-width Timeline Marker Column: horizontally centers dot at 12px */}
                        <div className="relative z-10 w-6 shrink-0 flex items-center justify-center pt-1.5">
                          <div className="h-5 flex items-center justify-center">
                            <span
                              aria-hidden="true"
                              className={cn(
                                "h-2 w-2 rounded-full ring-4 ring-card transition-transform duration-150 group-hover:scale-125",
                                marker.dotClassName
                              )}
                            />
                          </div>
                        </div>

                        {/* Event Content with Scannable Typographic Hierarchy */}
                        <div className="space-y-0.5 flex-1 min-w-0 px-2 py-1.5 rounded-lg group-hover:bg-muted/30 transition-colors duration-150">
                          <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-2">
                            <h4 className="text-xs sm:text-sm font-semibold text-foreground leading-snug tracking-tight">
                              {title}
                            </h4>

                            <time
                              className="text-[11px] font-mono text-muted-foreground/80 shrink-0 tabular-nums"
                              dateTime={item.timestamp ? new Date(item.timestamp).toISOString() : undefined}
                            >
                              {timestampFormatted}
                            </time>
                          </div>

                          {item.note && (
                            <p className="mt-1 text-[11px] text-muted-foreground/90 bg-muted/25 border border-border/40 rounded-md px-2.5 py-1 leading-relaxed">
                              {item.note}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            /* Calm Institutional Empty State */
            <div className="py-10 px-4 text-center space-y-2.5">
              <div className="h-9 w-9 rounded-full bg-muted/40 border border-border/60 flex items-center justify-center mx-auto text-muted-foreground">
                <History className="h-4.5 w-4.5 text-muted-foreground/70" />
              </div>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-semibold text-foreground">No activity recorded yet</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto leading-relaxed">
                  {emptyDescription}
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
