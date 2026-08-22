import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AdminSearchPalette } from "@/components/portal/AdminSearchPalette";
import { AdminProfileMenu } from "@/components/portal/AdminProfileMenu";
import { AdminBreadcrumb } from "@/components/portal/AdminBreadcrumb";
import type { PortalNavGroup, PortalNavItem } from "@/lib/lydo-connect-data";

type PortalShellProps = {
  title: string;
  subtitle: string;
  groups: PortalNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
  userProfile?: { name: string; role: string; email?: string };
};

const getAvatarInitial = (name: string) => {
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  return firstName.charAt(0).toUpperCase() || "?";
};

const sidebarIconButtonClasses =
  "flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-admin-surface p-1.5 text-public-text-neutral-default transition-colors hover:bg-slate-50";

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
          <p className="px-4 py-2 font-segoe text-[11px] font-semibold uppercase leading-[140%] tracking-wide text-slate-500">
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
                      ? "bg-bg-info-tertiary text-public-text-brand"
                      : "text-public-text-neutral-default hover:bg-slate-50",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.6} />
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
                    ? "bg-bg-info-tertiary text-public-text-brand"
                    : "text-text-default hover:bg-slate-50",
                )}
              >
                <Icon
                  className={cn("shrink-0", active ? "h-[13.5px] w-[13.5px]" : "h-[15px] w-[15px]")}
                  strokeWidth={1.6}
                />
                <span className="min-w-0 flex-1 truncate">{item.label}</span>
                {typeof item.count === "number" && item.count > 0 ? (
                  <span className="inline-flex h-[18px] shrink-0 items-center justify-center rounded-full bg-amber-50 px-1.5 font-mono text-[11px] font-semibold leading-none text-text-warning-secondary">
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
      "flex items-center border-t border-slate-300 py-6",
      collapsed ? "flex-col gap-3 px-2" : "justify-between px-4",
    )}
  >
    {userProfile && !collapsed ? (
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-public-bg-brand font-segoe text-sm leading-[120%] text-public-text-on-brand">
          {getAvatarInitial(userProfile.name)}
        </div>
        <div className="min-w-0 leading-none">
          <p className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
            {userProfile.name}
          </p>
          <p className="truncate font-segoe text-xs leading-none text-slate-500">{userProfile.role}</p>
        </div>
      </div>
    ) : null}
    <button
      type="button"
      onClick={onSignOut}
      aria-label="Sign out"
      className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-md bg-admin-surface p-1.5 text-public-text-neutral-default transition-colors hover:bg-slate-50 hover:text-icon-danger-secondary"
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
}: PortalShellProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const searchablePages = useMemo<PortalNavItem[]>(() => groups.flatMap((group) => group.items), [groups]);

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
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        {/* Desktop sidebar — expanded (280px) or icon-only rail (94px) */}
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-slate-300 bg-admin-surface transition-[width] duration-200 md:flex",
            sidebarCollapsed ? "w-[94px]" : "w-[280px]",
          )}
        >
          <div
            className={cn(
              "flex h-20 items-center border-b border-slate-300",
              sidebarCollapsed ? "flex-col justify-center gap-3 px-2" : "justify-between px-5",
            )}
          >
            {!sidebarCollapsed ? (
              <div className="flex min-w-0 items-center gap-3">
                <img src="/y-trace-logo-blue.png" alt="Y-TRACE" className="h-8 w-8 shrink-0 object-contain" />
                <div className="min-w-0 leading-none">
                  <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-text-default">
                    Y-TRACE
                  </p>
                  <p className="font-segoe text-xs leading-none text-slate-500">{title}</p>
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
            "fixed inset-y-0 left-0 z-50 flex w-[min(280px,82vw)] flex-col overflow-hidden border-r border-slate-300 bg-admin-surface shadow-2xl transition-transform duration-200 md:hidden safe-area-bottom",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <div className="flex h-20 items-center justify-between border-b border-slate-300 px-5">
            <div className="flex min-w-0 items-center gap-3">
              <img src="/y-trace-logo-blue.png" alt="Y-TRACE" className="h-8 w-8 shrink-0 object-contain" />
              <div className="min-w-0 leading-none">
                <p className="font-segoe text-public-fs-subheading-sm font-semibold leading-[140%] text-text-default">
                  Y-TRACE
                </p>
                <p className="font-segoe text-xs leading-none text-slate-500">{title}</p>
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
        <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-slate-300 bg-admin-surface">
              <div className="flex h-20 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {/* Mobile: opens drawer */}
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="md:hidden shrink-0"
                    onClick={() => setMobileOpen((v) => !v)}
                    aria-label="Toggle navigation"
                  >
                    <Menu className="h-4 w-4" />
                  </Button>
                  <AdminSearchPalette pages={searchablePages} onNavigate={onNavigate} />
                </div>
                {userProfile ? (
                  <AdminProfileMenu
                    userProfile={{ name: userProfile.name, email: userProfile.email ?? "" }}
                    onSettings={() => onNavigate("settings")}
                    onActivityLogs={() => onNavigate("activity-logs")}
                    onSignOut={onSignOut}
                  />
                ) : null}
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
