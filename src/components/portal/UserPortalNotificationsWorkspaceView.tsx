import React, { useState, useMemo } from "react";
import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  FileText,
  ClipboardList,
  CalendarDays,
  Medal,
  Megaphone,
  MessageSquare,
  Search,
  ChevronRight,
  RefreshCw,
  UserCheck,
  Coins,
  Receipt,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { NotificationRecord } from "@/lib/lydo-connect-data";

export interface UserPortalNotificationsWorkspaceViewProps {
  notifications: NotificationRecord[];
  onMarkRead?: (id: string) => Promise<void> | void;
  onMarkAllRead?: () => Promise<void> | void;
  navigate: (path: string) => void;
  userRouteMap: Record<string, string>;
  formatShortPortalDate?: (dateStr: string) => string;
}

interface NotificationTypeVisuals {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}

const getNotificationVisuals = (relatedType?: string, type?: string): NotificationTypeVisuals => {
  const norm = (relatedType || type || "").toLowerCase();
  if (norm.includes("document") || norm.includes("submission") || norm.includes("cbl")) {
    return {
      icon: FileText,
      tone: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    };
  }
  if (norm.includes("budget") || norm.includes("grant") || norm.includes("financial")) {
    return {
      icon: Coins,
      tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    };
  }
  if (norm.includes("liquidation") || norm.includes("expense") || norm.includes("receipt")) {
    return {
      icon: Receipt,
      tone: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    };
  }
  if (norm.includes("renewal") || norm.includes("accreditation")) {
    return {
      icon: RefreshCw,
      tone: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
    };
  }
  if (norm.includes("registration") || norm.includes("profile") || norm.includes("org")) {
    return {
      icon: UserCheck,
      tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    };
  }
  if (norm.includes("ypop") || norm.includes("incentive") || norm.includes("score")) {
    return {
      icon: Medal,
      tone: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20",
    };
  }
  if (norm.includes("news") || norm.includes("announcement") || norm.includes("release")) {
    return {
      icon: Megaphone,
      tone: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
    };
  }
  if (norm.includes("inquiry") || norm.includes("inquiries")) {
    return {
      icon: MessageSquare,
      tone: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
    };
  }
  return {
    icon: Bell,
    tone: "bg-primary/10 text-primary border-primary/20",
  };
};

const getTargetRoute = (
  relatedType?: string,
  type?: string,
  userRouteMap?: Record<string, string>,
  relatedId?: string
): { route: string; label: string } | null => {
  const norm = (relatedType || type || "").toLowerCase();
  if (norm.includes("document") || norm.includes("submission") || norm.includes("cbl")) {
    return { route: userRouteMap?.["document-submission"] || "/document-submission", label: "View Documents" };
  }
  if (norm.includes("budget") || norm.includes("grant") || norm.includes("financial")) {
    return { route: userRouteMap?.["budget-request"] || "/budget-request", label: "View Budget" };
  }
  if (norm.includes("liquidation") || norm.includes("expense") || norm.includes("receipt") || norm.includes("report")) {
    return { route: userRouteMap?.["liquidation-reporting"] || "/liquidation-reporting", label: "View Liquidation" };
  }
  if (norm.includes("renewal") || norm.includes("accreditation")) {
    return { route: userRouteMap?.["organization-renewal"] || "/organization-renewal", label: "View Renewal" };
  }
  if (norm.includes("registration") || norm.includes("profile") || norm.includes("org")) {
    return { route: userRouteMap?.["organization-profile"] || "/organization-profile", label: "View Profile" };
  }
  if (norm.includes("ypop") || norm.includes("incentive") || norm.includes("city_activity") || norm.includes("activity")) {
    const basePath = userRouteMap?.["ypop"] || "/ypop";
    const route = relatedId
      ? `${basePath}${basePath.includes("?") ? "&" : "?"}activityId=${encodeURIComponent(relatedId)}`
      : basePath;
    return { route, label: "View Activity" };
  }
  if (norm.includes("news") || norm.includes("release") || norm.includes("announcement")) {
    return { route: userRouteMap?.["news-releases"] || "/portal-news-releases", label: "View News" };
  }
  if (norm.includes("inquiry") || norm.includes("inquiries")) {
    const basePath = userRouteMap?.["inquiries"] || userRouteMap?.["dashboard"] || "/dashboard";
    const route = relatedId
      ? `${basePath}${basePath.includes("?") ? "&" : "?"}inquiryId=${encodeURIComponent(relatedId)}`
      : basePath;
    return { route, label: "View Inquiry" };
  }
  return null;
};

const formatNotificationTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24 && now.getDate() === date.getDate()) {
    const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
    return `Today at ${timeStr}`;
  }
  if (diffDay === 1 || (diffDay < 2 && now.getDate() !== date.getDate())) {
    const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "Asia/Manila" });
    return `Yesterday at ${timeStr}`;
  }

  const isCurrentYear = now.getFullYear() === date.getFullYear();
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: isCurrentYear ? undefined : "numeric",
    timeZone: "Asia/Manila",
  });
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
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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

  const handleNotificationClick = async (notification: NotificationRecord) => {
    if (!notification.isRead && onMarkRead) {
      await onMarkRead(notification.id);
    }
    const target = getTargetRoute(
      notification.relatedType,
      notification.type,
      userRouteMap,
      notification.relatedId
    );
    if (target) {
      navigate(target.route);
    }
  };

  return (
    <div className="bg-background text-foreground transition-colors duration-200 font-sans space-y-4 sm:space-y-6 max-w-[1440px] mx-auto pt-0 pb-8 sm:py-2">
      {/* 1. Hero Workspace Header */}
      <div className="bg-gradient-to-r from-card via-indigo-50/10 to-slate-50/40 dark:from-card dark:via-indigo-950/10 dark:to-slate-900/40 p-5 sm:p-7 rounded-2xl border border-border/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-[720px]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wide uppercase text-primary">Notification Center</span>
              <span className="text-muted-foreground/30">•</span>
              <span className="text-xs text-muted-foreground">LYDO Y-TRACE</span>
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                Notifications
              </h1>
              {unreadCount > 0 && (
                <Badge
                  variant="outline"
                  className="bg-primary/10 text-primary border-primary/25 text-xs font-bold px-2.5 py-0.5 rounded-full shadow-2xs"
                >
                  {unreadCount} unread
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium leading-relaxed">
              Stay updated on important announcements, reviews, approvals, budget updates, and other Y-TRACE activity.
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
                <CheckCheck className="h-3.5 w-3.5 mr-1.5 text-primary" />
                {isMarkingAll ? "Updating..." : "Mark all as read"}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* 2. Filter Tabs and Search Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border/60 p-2 sm:p-2.5 rounded-2xl shadow-xs">
        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-accent/25 p-1 rounded-xl border border-border/40 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
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
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap",
              filter === "unread"
                ? "bg-primary text-primary-foreground shadow-2xs"
                : "text-muted-foreground hover:text-foreground hover:bg-background/60"
            )}
          >
            <span>Unread</span>
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
              "px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap",
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
            className="pl-9 pr-8 h-9 text-xs rounded-xl bg-background border-border"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Notification List Cards */}
      <div className="space-y-2.5">
        {filteredNotifications.length === 0 ? (
          <Card className="rounded-2xl border border-dashed border-border/80 bg-card p-10 sm:p-14 text-center space-y-3.5">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto ring-8 ring-primary/5">
              <Bell className="h-7 w-7" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h3 className="text-base font-bold text-foreground">
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {searchQuery
                  ? "No notifications matched your search term. Try adjusting your query."
                  : filter === "unread"
                  ? "You’re all caught up. No pending unread notifications."
                  : "You’re all caught up. Important updates and activity related to your organization will appear here."}
              </p>
            </div>
            {(filter !== "all" || searchQuery) && (
              <div className="pt-1.5 flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setFilter("all");
                    setSearchQuery("");
                  }}
                  className="h-9.5 sm:h-10 px-5 rounded-xl border border-border/80 bg-background hover:bg-muted text-foreground text-xs sm:text-sm font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  View All Notifications
                </Button>
              </div>
            )}
          </Card>
        ) : (
          filteredNotifications.map((notification) => {
            const visual = getNotificationVisuals(notification.relatedType, notification.type);
            const IconComponent = visual.icon;
            const targetAction = getTargetRoute(
              notification.relatedType,
              notification.type,
              userRouteMap,
              notification.relatedId
            );

            return (
              <Card
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className={cn(
                  "rounded-2xl border transition-all duration-200 p-4 sm:p-4.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3.5 group cursor-pointer",
                  notification.isRead
                    ? "bg-card border-border/60 hover:bg-accent/20 hover:border-border shadow-2xs"
                    : "bg-primary/[0.03] dark:bg-primary/[0.06] border-primary/25 hover:border-primary/45 shadow-xs"
                )}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    void handleNotificationClick(notification);
                  }
                }}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  {/* Category / Tone Icon */}
                  <div
                    className={cn(
                      "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 transition-transform group-hover:scale-105 border",
                      notification.isRead
                        ? "bg-muted text-muted-foreground border-border/50"
                        : visual.tone
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
                            ? "font-semibold text-foreground/85"
                            : "font-bold text-foreground"
                        )}
                      >
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <span
                          className="inline-block h-2 w-2 rounded-full bg-primary shrink-0 animate-pulse"
                          title="Unread notification"
                        />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed break-words">
                      {notification.message}
                    </p>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground/75 font-medium pt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{formatNotificationTime(notification.createdAt)}</span>
                    </div>
                  </div>
                </div>

                {/* Right Action Buttons */}
                <div
                  className="flex items-center gap-2 shrink-0 self-end sm:self-center w-full sm:w-auto justify-end pt-1 sm:pt-0 border-t border-border/30 sm:border-t-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {!notification.isRead && onMarkRead && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onMarkRead(notification.id)}
                      className="rounded-xl text-xs h-8 text-muted-foreground hover:text-foreground cursor-pointer font-medium"
                    >
                      Mark read
                    </Button>
                  )}
                  {targetAction && (
                    <Button
                      type="button"
                      variant={notification.isRead ? "outline" : "default"}
                      size="sm"
                      onClick={() => {
                        if (!notification.isRead && onMarkRead) {
                          void onMarkRead(notification.id);
                        }
                        navigate(targetAction.route);
                      }}
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

