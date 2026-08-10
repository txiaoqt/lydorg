import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Search, Settings, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortalNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  count?: number;
};

export type PortalNavGroup = {
  id: string;
  label: string;
  items: PortalNavItem[];
};

type PortalShellProps = {
  groups: PortalNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
  userProfile?: { name: string; role: string; email?: string };
  notifications?: { id: string; title: string; message: string; isRead: boolean; createdAt: string }[];
  onMarkAllNotificationsRead?: () => void;
  onSidebarCollapsedChange?: (collapsed: boolean) => void;
};

type SidebarContentProps = {
  mobile?: boolean;
  collapsed?: boolean;
  groups: PortalNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
  onClose: () => void;
  onExpand?: () => void;
  userProfile?: { name: string; role: string; email?: string };
  onSignOut: () => void;
};

function getInitials(name: string): string {
  return (name.trim()[0] ?? "").toUpperCase();
}

const SidebarContent = ({
  mobile = false,
  collapsed = false,
  groups,
  activeId,
  onNavigate,
  onClose,
  onExpand,
  userProfile,
  onSignOut,
}: SidebarContentProps) => {
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);

  useEffect(() => {
    setTooltip(null);
  }, [collapsed]);

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white",
        collapsed ? "w-[72px]" : mobile ? "w-full min-w-0" : "w-[280px] min-w-[280px]",
      )}
    >
      {/* Logo row */}
      {collapsed ? (
        <div className="flex h-[80px] shrink-0 items-center justify-center border-b border-[#D9D9D9]">
          <button
            type="button"
            onClick={onExpand}
            className="group flex h-[30px] w-[30px] items-center justify-center rounded-md p-[6px] hover:bg-gray-100"
            aria-label="Expand sidebar"
          >
            <PanelLeftOpen
              className="h-[18px] w-[18px] text-[#757575] group-hover:text-[#1E1E1E]"
              strokeWidth={1.6}
            />
          </button>
        </div>
      ) : (
        <div className="flex h-[80px] shrink-0 items-center justify-between border-b border-[#D9D9D9] px-4 py-3">
          <div className="flex items-center gap-3">
            <img src="/y-trace-logo.png" alt="Y-TRACE" className="h-8 w-auto" />
            <div className="flex flex-col gap-[2px]">
              <span className="text-[14px] font-semibold leading-[140%] text-[#757575]">Y-TRACE</span>
              <span className="text-[12px] font-normal leading-[100%] text-[#B3B3B3]">Admin Portal</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={cn(
              "group h-[30px] w-[30px] items-center justify-center rounded-md p-[6px] hover:bg-gray-100",
              mobile ? "flex" : "hidden md:flex",
            )}
            aria-label={mobile ? "Close navigation" : "Collapse sidebar"}
          >
            {mobile ? (
              <X className="h-[18px] w-[18px] text-[#757575] group-hover:text-[#1E1E1E]" strokeWidth={1.6} />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px] text-[#757575] group-hover:text-[#1E1E1E]" strokeWidth={1.6} />
            )}
          </button>
        </div>
      )}

      {/* Nav items */}
      <div className="flex flex-1 flex-col overflow-y-auto p-[10px]">
        <nav className={cn("my-auto flex flex-col", collapsed ? "gap-8" : "gap-4")}>
          {groups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              {!collapsed && group.label ? (
                <span className="px-2 py-[6px] text-[11px] font-semibold uppercase tracking-wide text-[#757575]">
                  {group.label}
                </span>
              ) : null}
              <div className={cn("flex flex-col", collapsed ? "gap-3" : "gap-1")}>
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        if (mobile) onClose();
                      }}
                      onMouseEnter={collapsed ? (e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setTooltip({ label: item.label, x: rect.right + 8, y: rect.top + rect.height / 2 });
                      } : undefined}
                      onMouseLeave={collapsed ? () => setTooltip(null) : undefined}
                      className={cn(
                        "group flex h-[40px] w-full items-center rounded-md transition-colors",
                        collapsed ? "justify-center" : "gap-3 px-5 py-[10px] text-left",
                        active
                          ? "bg-[#F1F6FD] text-[#0E2F66]"
                          : "text-[#1E1E1E] hover:bg-[#F1F6FD] hover:text-[#0E2F66]",
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0 transition-colors",
                          active ? "text-[#0E2F66]" : "text-[#757575] group-hover:text-[#0E2F66]",
                        )}
                        strokeWidth={1.6}
                      />
                      {!collapsed && (
                        <span className="flex-1 text-[14px] font-normal leading-[140%]">{item.label}</span>
                      )}
                      {!collapsed && item.count != null && item.count > 0 && (
                        <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[#FFFBEB] px-[6px] py-[2px] font-mono text-[11px] font-semibold leading-[100%] text-[#975102]">
                          {item.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Profile row */}
      {collapsed ? (
        <div className="flex h-[80px] shrink-0 items-center justify-center border-t border-[#E5E7EB]">
          {userProfile && (
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E2F66]">
              <span className="text-[14px] font-normal text-[#F5F5F5]">{getInitials(userProfile.name)}</span>
            </div>
          )}
        </div>
      ) : (
        <div className="flex h-[80px] shrink-0 items-center justify-between border-t border-[#E5E7EB] px-4 py-6">
          {userProfile ? (
            <div className="flex items-center gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E2F66]">
                <span className="text-[14px] font-normal text-[#F5F5F5]">
                  {getInitials(userProfile.name)}
                </span>
              </div>
              <div className="flex flex-col gap-[2px]">
                <span className="text-[14px] font-semibold leading-[140%] text-[#757575]">{userProfile.name}</span>
                <span className="text-[12px] font-normal leading-[100%] text-[#B3B3B3]">{userProfile.role}</span>
              </div>
            </div>
          ) : (
            <div />
          )}
          <button
            type="button"
            onClick={onSignOut}
            className="group flex h-[30px] w-[30px] items-center justify-center rounded-md p-[6px]"
            aria-label="Sign out"
          >
            <LogOut className="h-[18px] w-[18px] text-[#757575] group-hover:text-[#C00F0C]" strokeWidth={1.6} />
          </button>
        </div>
      )}

      {/* Tooltip — fixed so it escapes the aside overflow:hidden */}
      {collapsed && tooltip && (
        <div
          style={{ position: "fixed", left: tooltip.x, top: tooltip.y, transform: "translateY(-50%)" }}
          className="pointer-events-none z-[9999] whitespace-nowrap rounded-md bg-[#1E1E1E] px-2 py-1 text-xs font-medium text-white shadow-lg"
        >
          {tooltip.label}
        </div>
      )}
    </div>
  );
};

export const PortalShell = ({
  groups,
  activeId,
  onNavigate,
  onSignOut,
  children,
  userProfile,
  notifications,
  onMarkAllNotificationsRead,
  onSidebarCollapsedChange,
}: PortalShellProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const contentScrollRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const unreadCount = (notifications ?? []).filter((n) => !n.isRead).length;

  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const allItems = groups.flatMap((g) => g.items);
    return q ? allItems.filter((item) => item.label.toLowerCase().includes(q)) : allItems;
  }, [groups, searchQuery]);

  useEffect(() => {
    document.documentElement.classList.add("portal-shell-active");
    document.body.classList.add("portal-shell-active");
    return () => {
      document.documentElement.classList.remove("portal-shell-active");
      document.body.classList.remove("portal-shell-active");
    };
  }, []);

  useEffect(() => {
    contentScrollRef.current?.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeId]);

  useEffect(() => {
    onSidebarCollapsedChange?.(sidebarCollapsed);
  }, [sidebarCollapsed, onSidebarCollapsedChange]);

  // Ctrl+K global shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setCommandOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Auto-focus input when command palette opens; clear query on close
  useEffect(() => {
    if (commandOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearchQuery("");
    }
  }, [commandOpen]);

  // Close profile dropdown on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  // Close notification dropdown on outside click
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        {/* Desktop sidebar */}
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 overflow-hidden border-r border-[#D9D9D9] transition-[width] duration-200 md:block",
            sidebarCollapsed ? "w-[72px]" : "w-[280px]",
          )}
        >
          <SidebarContent
            collapsed={sidebarCollapsed}
            groups={groups}
            activeId={activeId}
            onNavigate={onNavigate}
            onClose={() => setSidebarCollapsed(true)}
            onExpand={() => setSidebarCollapsed(false)}
            userProfile={userProfile}
            onSignOut={onSignOut}
          />
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
            "fixed inset-y-0 left-0 z-50 w-[min(280px,82vw)] overflow-hidden border-r border-[#D9D9D9] shadow-2xl transition-transform duration-200 md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent
            mobile
            groups={groups}
            activeId={activeId}
            onNavigate={onNavigate}
            onClose={() => setMobileOpen(false)}
            userProfile={userProfile}
            onSignOut={onSignOut}
          />
        </aside>

        {/* Main content */}
        <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <div ref={contentScrollRef} className="flex-1 min-w-0 overflow-y-auto">
            {/* Header */}
            <header className="sticky top-0 z-30 flex h-[80px] shrink-0 items-center gap-4 border-b border-[#E5E7EB] bg-white px-4">
              {/* Mobile menu toggle — hidden on desktop */}
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground md:hidden"
                onClick={() => setMobileOpen((v) => !v)}
                aria-label="Toggle navigation"
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Search bar — left-aligned */}
              <button
                type="button"
                onClick={() => setCommandOpen(true)}
                className="flex h-[40px] w-full max-w-[400px] items-center gap-2 rounded-md border border-[#D1D5DB] bg-white px-[14px] text-left"
              >
                <Search className="h-4 w-4 shrink-0 text-[#1E1E1E]" strokeWidth={1.6} />
                <span className="flex-1 text-sm leading-[140%] text-[#B3B3B3]">
                  <span className="hidden lg:inline">Jump to a page, or search actions...</span>
                  <span className="lg:hidden">Search</span>
                </span>
                <kbd className="hidden h-[22px] items-center rounded border-[0.6px] border-[#D1D5DB] bg-[#F5F5F5] px-[6px] text-[10px] leading-[140%] text-[#757575] lg:flex">
                  Ctrl+K
                </kbd>
              </button>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Right: notification + profile */}
              <div className="flex items-center gap-6">
                {/* Bell with dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    type="button"
                    onClick={() => setNotifOpen((v) => !v)}
                    className="relative flex h-[32px] w-[32px] items-center justify-center rounded-md border border-[#D1D5DB] bg-white p-2"
                    aria-label="Notifications"
                  >
                    <Bell className="h-[18px] w-[18px] text-[#2C2C2C]" strokeWidth={1.6} />
                    {unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#C00F0C] px-0.5 text-[9px] font-semibold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {notifOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-[300px] overflow-hidden rounded-md border border-[#E5E7EB] bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.10)]">
                      <div className="flex items-center justify-between border-b border-[#F0F1F3] px-4 py-3">
                        <span className="font-segoe text-[13px] font-semibold text-[#1E1E1E]">Notifications</span>
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={() => onMarkAllNotificationsRead?.()}
                            className="font-segoe text-[11px] text-[#0E2F66] hover:underline"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>
                      {(notifications ?? []).length === 0 ? (
                        <p className="px-4 py-4 font-segoe text-[13px] text-[#757575]">No notifications.</p>
                      ) : (
                        <div>
                          {(notifications ?? []).slice(0, 5).map((notif) => (
                            <div
                              key={notif.id}
                              className={`border-b border-[#F0F1F3] px-4 py-3 last:border-b-0 ${!notif.isRead ? "bg-[#F1F6FD]" : ""}`}
                            >
                              <p className="font-segoe text-[13px] font-medium leading-[130%] text-[#1E1E1E]">{notif.title}</p>
                              <p className="mt-0.5 font-segoe text-[12px] leading-[130%] text-[#757575]">{notif.message}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Profile */}
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((v) => !v)}
                    className="flex items-center gap-3"
                    aria-label="Profile menu"
                  >
                    {userProfile && (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0E2F66]">
                        <span className="text-[14px] font-normal text-[#F5F5F5]">
                          {getInitials(userProfile.name)}
                        </span>
                      </div>
                    )}
                    <span className="hidden text-[14px] font-semibold text-[#757575] sm:block">
                      {userProfile?.name}
                    </span>
                    <ChevronDown className="h-[18px] w-[18px] text-[#757575]" strokeWidth={1.6} />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-[172px] overflow-hidden rounded-md border border-[#E5E7EB] bg-white shadow-[0px_1px_4px_0px_rgba(0,0,0,0.10)]">
                      {/* Header: avatar + name + email */}
                      <div className="flex items-center gap-3 border-b border-[#E5E7EB] p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#0E2F66]">
                          <span className="text-[12px] font-normal text-[#F5F5F5]">
                            {userProfile ? getInitials(userProfile.name) : ""}
                          </span>
                        </div>
                        <div className="flex min-w-0 flex-col gap-[2px]">
                          <span className="truncate text-[13px] font-semibold leading-[140%] text-[#1E1E1E]">
                            {userProfile?.name}
                          </span>
                          <span className="truncate text-[11px] font-normal leading-[100%] text-[#B3B3B3]">
                            {userProfile?.email}
                          </span>
                        </div>
                      </div>

                      {/* Menu items */}
                      <div className="flex flex-col gap-1 border-b border-[#F0F1F3] py-1">
                        <button
                          type="button"
                          className="group flex w-full items-center gap-2 rounded-md px-3 py-[10px] hover:bg-[#F1F6FD]"
                        >
                          <User className="h-4 w-4 shrink-0 text-[#757575] group-hover:text-[#1E1E1E]" strokeWidth={1.6} />
                          <span className="text-[13px] font-normal leading-[100%] text-[#303030] group-hover:text-[#1E1E1E]">
                            My Profile
                          </span>
                        </button>
                        <button
                          type="button"
                          className="group flex w-full items-center gap-2 rounded-md px-3 py-[10px] hover:bg-[#F1F6FD]"
                        >
                          <Settings className="h-4 w-4 shrink-0 text-[#757575] group-hover:text-[#1E1E1E]" strokeWidth={1.6} />
                          <span className="text-[13px] font-normal leading-[100%] text-[#303030] group-hover:text-[#1E1E1E]">
                            Settings
                          </span>
                        </button>
                      </div>

                      {/* Sign out — danger on hover */}
                      <button
                        type="button"
                        onClick={() => { setProfileOpen(false); onSignOut(); }}
                        className="group flex w-full items-center gap-2 px-3 py-3 hover:bg-[#FEE9E7]"
                      >
                        <LogOut className="h-4 w-4 shrink-0 text-slate-500 group-hover:text-[#C00F0C]" strokeWidth={1.6} />
                        <span className="text-[13px] font-normal leading-[100%] text-slate-700 group-hover:text-[#C00F0C]">Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </header>

            <div className="min-w-0 p-3 sm:p-6 lg:p-8">{children}</div>
          </div>
        </main>
      </div>

      {/* Command palette */}
      {commandOpen && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-black/20"
            onClick={() => setCommandOpen(false)}
          />
          <div className="fixed inset-x-0 top-[20vh] z-[101] mx-auto max-w-[560px] overflow-hidden rounded-xl border border-[#E5E7EB] bg-white shadow-2xl">
            <div className="flex items-center gap-2 border-b border-[#E5E7EB] px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-[#757575]" strokeWidth={1.6} />
              <input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Escape") setCommandOpen(false); }}
                placeholder="Jump to a page, or search actions..."
                className="flex-1 bg-transparent text-sm text-[#1E1E1E] outline-none placeholder:text-[#B3B3B3]"
              />
              <kbd className="flex h-[22px] items-center rounded border-[0.6px] border-[#D1D5DB] bg-[#F5F5F5] px-[6px] text-[10px] leading-[140%] text-[#757575]">
                Esc
              </kbd>
            </div>
            <div className="max-h-[360px] overflow-y-auto py-2">
              {filteredItems.length > 0 ? (
                <>
                  <div className="px-3 py-[10px]">
                    <span className="text-[11px] font-semibold leading-[140%] text-[#757575]">Pages</span>
                  </div>
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          onNavigate(item.id);
                          setCommandOpen(false);
                          setSearchQuery("");
                        }}
                        className="group flex w-full items-center gap-3 rounded-md px-3 py-[10px] text-left hover:bg-[#F1F6FD]"
                      >
                        <Icon
                          className="h-[16px] w-[16px] shrink-0 text-[#757575] group-hover:text-[#1E1E1E]"
                          strokeWidth={1.6}
                        />
                        <span className="text-[12px] leading-[140%] text-[#757575] group-hover:text-[#1E1E1E]">
                          {item.label}
                        </span>
                      </button>
                    );
                  })}
                </>
              ) : (
                <p className="px-4 py-6 text-center text-sm text-[#B3B3B3]">No results found.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
