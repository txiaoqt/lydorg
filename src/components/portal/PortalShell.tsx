import { useEffect, useMemo, useState } from "react";
import { Bell, LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AdminSearchPalette } from "@/components/portal/AdminSearchPalette";
import { AdminProfileMenu } from "@/components/portal/AdminProfileMenu";
import { AdminBreadcrumb } from "@/components/portal/AdminBreadcrumb";
import type { PortalNavGroup, PortalNavItem } from "@/lib/lydo-connect-data";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type PortalShellProps = {
  title: string;
  subtitle: string;
  groups: PortalNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
  userProfile?: { name: string; role: string; email?: string };
  notifications?: NotificationItem[];
  onMarkAllRead?: () => void;
  onMarkRead?: (id: string) => void;
};

const getAvatarInitial = (name: string) => {
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  return firstName.charAt(0).toUpperCase() || "?";
};

const sidebarIconButtonClasses =
  "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-admin-surface p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

const NavList = ({
  groups,
  activeId,
  onNavigate,
  collapsed = false,
  mobile = false,
  onMobileNavigate,
}: {
  groups: PortalNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
  collapsed?: boolean;
  mobile?: boolean;
  onMobileNavigate?: () => void;
}) => (
  <nav className={cn("flex-1 overflow-y-auto", collapsed ? "space-y-3 px-2 py-4" : "space-y-6 px-2.5 py-4")}>
    {groups.map((group) => (
      <div key={group.id} className={collapsed ? "space-y-1" : "space-y-2"}>
        {!collapsed && group.label ? (
          <p className="px-4 py-2 font-segoe text-[11px] font-semibold uppercase leading-[140%] tracking-wide text-muted-foreground">
            {group.label}
          </p>
        ) : null}
        <div className={collapsed ? "flex flex-col items-center gap-1" : "space-y-1 pl-3"}>
          {group.items.map((item: PortalNavItem) => {
            const Icon = item.icon;
            const active = activeId === item.id;
            const handleClick = () => {
              onNavigate(item.id);
              if (mobile) onMobileNavigate?.();
            };

            if (collapsed) {
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  onClick={handleClick}
                  className={cn(
                    "flex h-10 w-[42px] items-center justify-center rounded-md transition-colors",
                    active
                      ? "bg-primary/15 text-primary font-semibold dark:bg-primary/25 dark:text-sky-300"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  {Icon ? <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} /> : null}
                </button>
              );
            }

            return (
              <button
                key={item.id}
                type="button"
                onClick={handleClick}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-segoe text-sm font-normal leading-[140%] transition-colors",
                  active
                    ? "bg-primary/15 text-primary font-semibold dark:bg-primary/25 dark:text-sky-300"
                    : "text-foreground/80 hover:bg-muted/70 hover:text-foreground",
                )}
              >
                {Icon ? (
                  <Icon
                    className={cn("shrink-0", active ? "h-[14px] w-[14px]" : "h-[15px] w-[15px]")}
                    strokeWidth={1.6}
                  />
                ) : null}
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {typeof item.count === "number" && item.count > 0 ? (
                  <span className="inline-flex h-[18px] shrink-0 items-center justify-center rounded-full bg-amber-500/15 border border-amber-500/20 px-1.5 font-mono text-[11px] font-semibold leading-none text-amber-600 dark:text-amber-400">
                    {item.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>
    ))}
  </nav>
);

const SidebarFooter = ({
  userProfile,
  onSignOut,
  collapsed = false,
}: {
  userProfile?: { name: string; role: string };
  onSignOut: () => void;
  collapsed?: boolean;
}) => (
  <div
    className={cn(
      "flex items-center border-t border-border py-6",
      collapsed ? "flex-col gap-3 px-2" : "justify-between px-4",
    )}
  >
    {userProfile && !collapsed ? (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-public-bg-brand font-segoe text-sm leading-[120%] text-public-text-on-brand">
          {getAvatarInitial(userProfile.name)}
        </div>
        <div className="min-w-0 leading-none">
          <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-foreground">
            {userProfile.name}
          </p>
          <p className="truncate font-segoe text-xs leading-none text-muted-foreground">{userProfile.role}</p>
        </div>
      </div>
    ) : null}
    <button
      type="button"
      onClick={onSignOut}
      aria-label="Sign out"
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-admin-surface p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
    >
      <LogOut size={18} strokeWidth={1.6} />
    </button>
  </div>
);

export const PortalShell = ({
  title,
  subtitle,
  groups,
  activeId,
  onNavigate,
  onSignOut,
  children,
  userProfile,
  notifications,
  onMarkAllRead,
  onMarkRead,
}: PortalShellProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [notificationDropdownOpen, setNotificationDropdownOpen] = useState(false);

  const searchablePages = useMemo<PortalNavItem[]>(() => groups.flatMap((group) => group.items), [groups]);
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const recentNotifications = useMemo(
    () => [...(notifications ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8),
    [notifications]
  );

  useEffect(() => {
    setNotificationDropdownOpen(false);
  }, [activeId]);

  useEffect(() => {
    document.documentElement.classList.add("portal-shell-active");
    document.body.classList.add("portal-shell-active");

    return () => {
      document.documentElement.classList.remove("portal-shell-active");
      document.body.classList.remove("portal-shell-active");
    };
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [mobileOpen]);

  return (
    <div className="admin-shell h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        {/* Desktop sidebar — expanded (280px) or icon-only rail (94px) */}
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border bg-admin-surface transition-[width] duration-200 md:flex",
            sidebarCollapsed ? "w-[94px]" : "w-[280px]",
          )}
        >
          <div
            className={cn(
              "flex h-20 items-center border-b border-border",
              sidebarCollapsed ? "flex-col justify-center gap-3 px-2" : "justify-between px-5",
            )}
          >
            {!sidebarCollapsed ? (
              <div className="flex min-w-0 items-center gap-3">
                <img src="/y-trace-logo-blue.png" alt="Y-TRACE" className="h-8 w-8 shrink-0 object-contain" />
                <div className="min-w-0 leading-none">
                  <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-foreground">
                    Y-TRACE
                  </p>
                  <p className="font-segoe text-xs leading-none text-muted-foreground">{title}</p>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => setSidebarCollapsed((v) => !v)}
              aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              className={sidebarIconButtonClasses}
            >
              {sidebarCollapsed ? (
                <PanelLeftOpen size={18} strokeWidth={1.6} />
              ) : (
                <PanelLeftClose size={18} strokeWidth={1.6} />
              )}
            </button>
          </div>

          <NavList groups={groups} activeId={activeId} onNavigate={onNavigate} collapsed={sidebarCollapsed} />

          <SidebarFooter userProfile={userProfile} onSignOut={onSignOut} collapsed={sidebarCollapsed} />
        </aside>

        {/* Mobile overlay backdrop */}
        {mobileOpen ? (
          <button
            type="button"
            aria-label="Close navigation overlay"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-40 bg-foreground/40 backdrop-blur-[1px] md:hidden"
          />
        ) : null}

        {/* Mobile drawer */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex w-[min(280px,82vw)] flex-col overflow-hidden border-r border-border bg-admin-surface shadow-2xl transition-transform duration-200 md:hidden safe-area-bottom",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-20 items-center justify-between border-b border-border px-5">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/y-trace-logo-blue.png" alt="Y-TRACE" className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0 leading-none">
                <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-foreground">
                  Y-TRACE
                </p>
                <p className="font-segoe text-xs leading-none text-muted-foreground">{title}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
              className={sidebarIconButtonClasses}
            >
              <X size={18} strokeWidth={1.6} />
            </button>
          </div>

          <NavList
            groups={groups}
            activeId={activeId}
            onNavigate={onNavigate}
            mobile
            onMobileNavigate={() => setMobileOpen(false)}
          />

          <SidebarFooter userProfile={userProfile} onSignOut={onSignOut} />
        </aside>

        {/* Main content */}
        <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden bg-background">
          <div className="portal-shell-scroller flex-1 overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-border bg-admin-surface/95 backdrop-blur-xs">
              <div className="flex h-20 items-center justify-between gap-3 px-3 sm:px-4 lg:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {/* Mobile: opens drawer */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="md:hidden shrink-0 border-border"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-label="Toggle navigation"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <AdminSearchPalette pages={searchablePages} onNavigate={onNavigate} />
                </div>
                <div className="flex items-center gap-2">
                  {notifications ? (
                    <DropdownMenu
                      modal={false}
                      open={notificationDropdownOpen}
                      onOpenChange={setNotificationDropdownOpen}
                    >
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background/80 hover:bg-accent transition-all focus-visible:outline-none shadow-2xs"
                          aria-label="Notifications"
                        >
                          <Bell className="h-4 w-4 text-foreground" />
                          {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive" />
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        sideOffset={6}
                        collisionPadding={16}
                        className="w-[calc(100vw-32px)] sm:w-80 max-w-[calc(100vw-32px)] sm:max-w-80 p-2 sm:p-2.5 rounded-2xl bg-card border border-border/80 shadow-xl flex flex-col max-h-[360px] sm:max-h-[420px] overflow-hidden"
                      >
                        {/* Fixed Header */}
                        <div className="flex items-center justify-between px-2 py-1 shrink-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground tracking-tight">Notifications</p>
                            {unreadCount > 0 && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 leading-none">
                                {unreadCount}
                              </span>
                            )}
                          </div>
                          {unreadCount > 0 && onMarkAllRead && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMarkAllRead();
                              }}
                              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer transition-colors"
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        <DropdownMenuSeparator className="my-1 bg-border/60 shrink-0" />

                        {/* Scrollable Notification List */}
                        <div className="flex-1 overflow-y-auto min-h-0 space-y-0.5 pr-0.5">
                          {recentNotifications.length === 0 ? (
                            <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                              No notifications yet.
                            </div>
                          ) : (
                            recentNotifications.map((n) => (
                              <DropdownMenuItem
                                key={n.id}
                                asChild
                                className="p-0 focus:bg-transparent cursor-pointer rounded-xl"
                              >
                                <div
                                  onClick={() => {
                                    setNotificationDropdownOpen(false);
                                    if (!n.isRead && onMarkRead) {
                                      onMarkRead(n.id);
                                    }
                                    onNavigate("notifications");
                                  }}
                                  className={cn(
                                    "flex items-start gap-2 p-2 rounded-xl transition-colors cursor-pointer group w-full",
                                    n.isRead
                                      ? "hover:bg-accent/40"
                                      : "bg-primary/[0.04] hover:bg-primary/[0.08]"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                                      n.isRead ? "bg-transparent" : "bg-primary"
                                    )}
                                  />
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-baseline justify-between gap-1.5">
                                      <p
                                        className={cn(
                                          "text-xs leading-tight truncate",
                                          n.isRead ? "font-medium text-foreground/80" : "font-bold text-foreground"
                                        )}
                                      >
                                        {n.title}
                                      </p>
                                      <span className="shrink-0 text-[10px] text-muted-foreground font-medium">
                                        {new Date(n.createdAt).toLocaleDateString("en-PH", {
                                          month: "short",
                                          day: "numeric",
                                        })}
                                      </span>
                                    </div>
                                    <p className="line-clamp-1 text-[11px] text-muted-foreground leading-snug">
                                      {n.message}
                                    </p>
                                  </div>
                                </div>
                              </DropdownMenuItem>
                            ))
                          )}
                        </div>

                        <DropdownMenuSeparator className="my-1 bg-border/60 shrink-0" />

                        {/* Fixed Footer Action */}
                        <DropdownMenuItem
                          onClick={() => {
                            setNotificationDropdownOpen(false);
                            onNavigate("notifications");
                          }}
                          className="justify-center text-xs font-semibold text-primary cursor-pointer hover:bg-primary/10 rounded-xl py-1.5 shrink-0"
                        >
                          View All Notifications →
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : null}
                  {userProfile ? (
                    <AdminProfileMenu
                      userProfile={{ name: userProfile.name, email: userProfile.email ?? "" }}
                      onSettings={() => onNavigate("settings")}
                      onActivityLogs={() => onNavigate("activity-logs")}
                      onSignOut={onSignOut}
                    />
                  ) : null}
                </div>
              </div>
            </header>
            <AdminBreadcrumb groups={groups} activeId={activeId} />
            <div className="px-4 py-3 sm:py-6 lg:py-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};
