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

export const formatActivityActionLabel = (
  rawAction?: string,
  metadata?: Record<string, unknown> | null,
) => {
  if (!rawAction) return "Activity Recorded";
  let action = rawAction.trim();

  // Strip redundant date suffixes like " On AUGUST 6, 2026."
  action = action.replace(/\s+On\s+[A-Za-z]+(?:\s+\d{1,2})?,?\s+\d{4}\.?$/i, "");
  action = action.replace(/\.$/, "");

  const lower = action.toLowerCase();

  // 1. Internal/technical system action exclusions/mappings
  if (
    lower === "admin_notification_dispatched" ||
    lower.includes("notification_dispatched") ||
    lower.includes("notification dispatched")
  ) {
    return "Notification Processed";
  }
  if (lower === "document_review_decision_updated") {
    return "Document Reviewed";
  }

  // 2. Check metadata or description for specific document requirement names
  const docName = (metadata?.documentTypeName || metadata?.documentName || metadata?.name) as string | undefined;

  // Extract document name from common patterns:
  // "Organization account permanently suspended due to rejected registration document: [Name]"
  const rejectionMatch = action.match(/rejected registration document:\s*([^.]+)/i);
  if (rejectionMatch) {
    return `${rejectionMatch[1].trim()} rejected`;
  }

  // "The admin requested revisions for [Name]. Remarks: ..."
  const revisionMatch = action.match(/(?:requested revisions for|revisions for)\s+([^.]+?)(?:\.\s*Remarks:|$)/i);
  if (revisionMatch) {
    return `${revisionMatch[1].trim()} needs revision`;
  }

  // "Your registration document '[Name]' has been approved"
  const approvedMatch = action.match(/document\s+['"]?([^'"]+)['"]?\s+has been approved/i);
  if (approvedMatch) {
    return `${approvedMatch[1].trim()} approved`;
  }

  // "[Name] was submitted by" or "[Name] submitted for review"
  const submittedMatch = action.match(/^(.+?)\s+(?:was\s+)?submitted\s+by/i);
  if (submittedMatch && !lower.startsWith("admin ") && !lower.startsWith("budget")) {
    return `${submittedMatch[1].trim()} submitted for review`;
  }

  // If document name is known via metadata
  if (docName) {
    if (lower.includes("needs_revision") || lower.includes("revision")) {
      return `${docName} needs revision`;
    }
    if (lower.includes("approved") || lower.includes("completed")) {
      return `${docName} approved`;
    }
    if (lower.includes("rejected")) {
      return `${docName} rejected`;
    }
    if (lower.includes("resubmit")) {
      return `${docName} resubmitted for review`;
    }
    if (lower.includes("submit")) {
      return `${docName} submitted for review`;
    }
    return `${docName} reviewed`;
  }

  // 3. Batch and document actions
  if (
    lower === "submitted_batch_document_review" ||
    lower === "batch_submitted" ||
    lower.includes("submitted batch") ||
    lower.includes("submitted_batch") ||
    lower.includes("batch document submission")
  ) {
    return "Batch Documents Submitted";
  }
  if (
    lower === "reviewed_documents" ||
    lower === "documents_reviewed" ||
    lower === "review_documents" ||
    lower.includes("reviewed_documents")
  ) {
    return "Documents Reviewed";
  }
  if (
    lower === "approved_documents" ||
    lower === "document_approved" ||
    lower === "approve_document_submission" ||
    lower.includes("approved_documents") ||
    lower.includes("approved the accreditation documents")
  ) {
    return "Documents Approved";
  }
  if (
    lower === "needs_revision" ||
    lower === "revision_requested" ||
    lower === "document_needs_revision"
  ) {
    return "Revision Requested";
  }
  if (
    lower === "rejected_documents" ||
    lower === "document_rejected" ||
    lower === "reject_document_submission"
  ) {
    return "Document Rejected";
  }

  // 4. Liquidation actions
  if (
    lower === "completed_liquidation_report" ||
    lower === "liquidation_report_completed" ||
    lower === "completed liquidation report"
  ) {
    return "Liquidation Report Completed";
  }
  if (
    lower === "reviewed_liquidation_report" ||
    lower === "liquidation_report_reviewed" ||
    lower === "reviewed liquidation report"
  ) {
    return "Liquidation Report Reviewed";
  }
  if (
    lower === "approved_liquidation_report" ||
    lower === "liquidation_report_approved" ||
    lower === "approved liquidation report"
  ) {
    return "Liquidation Report Approved";
  }
  if (
    lower === "submitted_liquidation_report" ||
    lower === "liquidation_report_submitted" ||
    lower === "submitted liquidation report"
  ) {
    return "Liquidation Report Submitted";
  }

  // 5. Budget actions
  if (
    lower === "submitted_budget_request" ||
    lower === "budget_request_submitted" ||
    lower === "submitted budget request"
  ) {
    return "Budget Request Submitted";
  }
  if (
    lower === "approved_budget_request" ||
    lower === "budget_request_approved" ||
    lower === "approved budget request"
  ) {
    return "Budget Request Approved";
  }
  if (
    lower === "reviewed_budget_request" ||
    lower === "budget_request_reviewed" ||
    lower === "reviewed budget request"
  ) {
    return "Budget Request Reviewed";
  }
  if (
    lower === "release_budget" ||
    lower === "budget_released" ||
    lower.includes("budget released")
  ) {
    return "Budget Released";
  }

  // 6. Organization Profile & Verification
  if (
    lower === "verify_organization_profile" ||
    lower === "verified organization registration" ||
    lower === "verified organization" ||
    lower.includes("verified the organization profile")
  ) {
    return "Organization Profile Verified";
  }
  if (
    lower === "profile_updated" ||
    lower === "organization_profile_updated" ||
    lower === "updated organization profile"
  ) {
    return "Profile Updated";
  }
  if (lower === "accreditation_expired" || lower.includes("accreditation expired")) {
    return "Accreditation Expired";
  }
  if (
    lower === "suspended_organization" ||
    lower === "organization_suspended" ||
    lower.includes("suspended organization")
  ) {
    return "Account Suspended";
  }

  // 7. If action has "Marked ... As Verified"
  if (action.startsWith("Marked ") && action.endsWith(" As Verified")) {
    return action;
  }

  // 8. Sanitize technical terms from raw action string
  const sanitized = action
    .replace(/_/g, " ")
    .replace(/\b(RPC|trigger|api|backend|database|internal|dispatched)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!sanitized || /^(execution|sync|process|action)$/i.test(sanitized)) {
    return "Activity Recorded";
  }

  return sanitized.replace(/\b\w/g, (char) => char.toUpperCase());
};

export const formatDocumentActivityLabel = (
  log: any,
  templateDocuments?: Array<{ id: string; name: string; databaseId?: string }>,
) => {
  if (!log) return "Document Action Recorded";

  let docName = (log.metadata?.documentTypeName || log.metadata?.documentName) as string | undefined;

  if (!docName && templateDocuments?.length && log.relatedId) {
    const matched = templateDocuments.find(
      (t) =>
        t.id === log.relatedId ||
        t.databaseId === log.relatedId ||
        (t as any).documentTypeId === log.relatedId,
    );
    if (matched) {
      docName = matched.name;
    }
  }

  return formatActivityActionLabel(log.action || log.description || log.title, {
    ...log.metadata,
    ...(docName ? { documentTypeName: docName } : {}),
  });
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
