import React, { useState, useMemo } from "react";
import {
  Bell,
  CheckCircle2,
  Clock,
  FileText,
  ClipboardList,
  CalendarDays,
  Medal,
  Megaphone,
  Check,
  Search,
  ChevronRight,
  Filter,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NotificationRecord } from "@/lib/lydo-connect-data";
import { formatFullActivityTimestamp } from "@/components/activity/RecentActivityPreview";

export interface UserPortalNotificationsWorkspaceViewProps {
  notifications: NotificationRecord[];
  onMarkRead?: (id: string) => Promise<void> | void;
  onMarkAllRead?: () => Promise<void> | void;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  formatShortPortalDate?: (dateStr: string) => string;
}

const getNotificationIcon = (relatedType?: string, type?: string) => {
  const norm = (relatedType || type || "").toLowerCase();
  if (norm.includes("document") || norm.includes("submission") || norm.includes("cbl")) {
    return FileText;
  }
  if (norm.includes("budget") || norm.includes("grant") || norm.includes("financial")) {
    return ClipboardList;
  }
  if (norm.includes("liquidation") || norm.includes("expense") || norm.includes("report")) {
    return CalendarDays;
  }
  if (norm.includes("ypop") || norm.includes("incentive") || norm.includes("score")) {
    return Medal;
  }
  if (norm.includes("news") || norm.includes("announcement") || norm.includes("release")) {
    return Megaphone;
  }
  return Bell;
};

const getTargetRoute = (
  relatedType?: string,
  type?: string,
  userRouteMap?: Record<string, string>
): { route: string; label: string } | null => {
  const norm = (relatedType || type || "").toLowerCase();
  if (norm.includes("document") || norm.includes("submission") || norm.includes("cbl")) {
    return { route: userRouteMap?.["document-submission"] || "/document-submission", label: "View Documents" };
  }
  if (norm.includes("budget") || norm.includes("grant") || norm.includes("financial")) {
    return { route: userRouteMap?.["budget-request"] || "/budget-request", label: "View Budget" };
  }
  if (norm.includes("liquidation") || norm.includes("expense") || norm.includes("report")) {
    return { route: userRouteMap?.["liquidation-reporting"] || "/liquidation-reporting", label: "View Liquidation" };
  }
  if (norm.includes("ypop") || norm.includes("incentive")) {
    return { route: userRouteMap?.["ypop"] || "/ypop", label: "View YPOP" };
  }
  if (norm.includes("news") || norm.includes("announcement")) {
    return { route: userRouteMap?.["news-releases"] || "/portal-news-releases", label: "View News" };
  }
  if (norm.includes("profile") || norm.includes("org")) {
    return { route: userRouteMap?.["organization-profile"] || "/organization-profile", label: "View Profile" };
  }
  return null;
};

export const UserPortalNotificationsWorkspaceView: React.FC<UserPortalNotificationsWorkspaceViewProps> = ({
  notifications,
  onMarkRead,
  onMarkAllRead,
  navigate,
  userRouteMap,
}) => {
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  const filteredNotifications = useMemo(() => {
    return notifications
      .filter((n) => {
        if (filter === "unread") return !n.isRead;
        if (filter === "read") return n.isRead;
        return true;
      })
      .filter((n) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          n.title.toLowerCase().includes(q) ||
          n.message.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [notifications, filter, searchQuery]);

  const handleMarkAll = async () => {
    if (!onMarkAllRead || unreadCount === 0 || isMarkingAll) return;
    try {
      setIsMarkingAll(true);
      await onMarkAllRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pt-0 pb-6 sm:py-2">
      {/* 1. Hero Workspace Header */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-4 sm:p-6 rounded-2xl border border-border/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1 max-w-[640px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-primary">Notification Center</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs text-muted-foreground">LYDO Y-TRACE</span>
            </div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/20 text-xs font-bold px-2.5 py-0.5 rounded-full"
                >
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium pt-0.5">
              Stay updated on compliance reviews, budget approvals, and announcements.
            </p>
          </div>

          {/* Action Button: Mark all as read */}
          {unreadCount > 0 && onMarkAllRead && (
            <div className="shrink-0 pt-1 sm:pt-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="rounded-xl border-border text-foreground text-xs font-semibold h-9 px-3.5 shadow-2xs hover:bg-accent transition-all cursor-pointer"
              >
                <Check className="h-3.5 w-3.5 mr-1.5 text-primary" />
                {isMarkingAll ? "Updating..." : "Mark All as Read"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Filter Tabs and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-2 sm:p-2.5 rounded-2xl shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-accent/20 p-1 rounded-xl border border-border/40">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            All ({notifications.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter("unread")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5",
              filter === "unread"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            Unread
            {unreadCount > 0 && (
              <span
                className={cn(
                  "px-1.5 py-0.2 rounded-full text-[10px] font-bold leading-none",
                  filter === "unread" ? "bg-white/20 text-white" : "bg-primary/15 text-primary"
                )}
              >
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setFilter("read")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer",
              filter === "read"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            Read ({notifications.length - unreadCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notifications..."
            className="pl-9 h-8.5 text-xs rounded-xl bg-background border-border"
          />
        </div>
      </div>

      {/* 3. Notification List Cards */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/80 bg-card p-10 text-center space-y-3">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <Bell className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications found"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {searchQuery
                  ? "No notifications matched your search term. Try adjusting your query."
                  : filter === "unread"
                  ? "You are all caught up! There are no pending unread notifications."
                  : "Notifications regarding your submissions, verification updates, and budget requests will appear here."}
              </p>
            </div>
            {filter !== "all" && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setFilter("all")}
                className="rounded-xl text-xs h-8 font-semibold mt-2"
              >
                View All Notifications
              </Button>
            )}
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const IconComponent = getNotificationIcon(notification.relatedType, notification.type);
            const targetAction = getTargetRoute(notification.relatedType, notification.type, userRouteMap);

            return (
              <Card
                key={notification.id}
                className={cn(
                  "rounded-2xl border transition-all duration-200 p-4 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 group shadow-2xs hover:shadow-xs",
                  notification.isRead
                    ? "bg-card border-border/60 hover:bg-accent/15"
                    : "bg-card border-primary/30 ring-1 ring-primary/15 hover:border-primary/50"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Category / Tone Icon */}
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-transform group-hover:scale-105",
                      notification.isRead
                        ? "bg-muted text-muted-foreground border border-border/50"
                        : "bg-primary/15 text-primary border border-primary/25 shadow-2xs"
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                  </div>

                  {/* Notification Content */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3
                        className={cn(
                          "text-xs sm:text-sm leading-snug break-words",
                          notification.isRead
                            ? "font-semibold text-foreground/90"
                            : "font-extrabold text-foreground"
                        )}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span className="inline-block h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-[11px] text-muted-foreground/70 font-medium pt-0.5">
                      {formatFullActivityTimestamp(notification.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t border-border/30 sm:border-t-0">
                  {!notification.isRead && onMarkRead && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkRead(notification.id)}
                      className="rounded-xl text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                    >
                      Mark Read
                    </Button>
                  )}
                  {targetAction && (
                    <Button
                      type="button"
                      variant={notification.isRead ? "outline" : "default"}
                      size="sm"
                      onClick={() => navigate(targetAction.route)}
                      className={cn(
                        "rounded-xl text-xs h-8 font-semibold gap-1 transition-all cursor-pointer",
                        notification.isRead
                          ? "border-border text-foreground hover:bg-accent"
                          : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-2xs"
                      )}
                    >
                      <span>{targetAction.label}</span>
                      <ChevronRight className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
};
export default UserPortalNotificationsWorkspaceView;
