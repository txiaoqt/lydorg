import { useEffect, useState } from "react";
import { LogOut, Menu, PanelLeftClose, PanelLeftOpen, ShieldCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";

export type PortalNavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export type PortalNavGroup = {
  id: string;
  label: string;
  items: PortalNavItem[];
};

type PortalShellProps = {
  title: string;
  subtitle: string;
  groups: PortalNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
  userProfile?: { name: string; role: string };
};

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

  useEffect(() => {
    document.documentElement.classList.add("portal-shell-active");
    document.body.classList.add("portal-shell-active");

    return () => {
      document.documentElement.classList.remove("portal-shell-active");
      document.body.classList.remove("portal-shell-active");
    };
  }, []);

  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex h-full w-[18rem] min-w-[18rem] flex-col">
      {/* Sidebar header: logo + collapse/close button */}
      <div className="flex items-center justify-between gap-3 border-b border-border/70 p-4">
        <BrandLogo showText imgClassName="h-10 w-10" textClassName="min-w-0" className="min-w-0" />
        {mobile ? (
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setSidebarCollapsed(true)}
            className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Collapse sidebar"
          >
            <PanelLeftClose size={16} />
          </button>
        )}
      </div>

      {/* Nav items */}
      <div className="flex-1 overflow-y-auto p-3">
        <nav className="space-y-4">
          {groups.map((group, groupIndex) => (
            <div key={group.id} className={cn(groupIndex > 0 && "pt-2")}>
              {group.label ? (
                <p className="px-3 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = activeId === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        onNavigate(item.id);
                        if (mobile) setMobileOpen(false);
                      }}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors",
                        active
                          ? "bg-primary/10 text-primary ring-1 ring-primary/10"
                          : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar footer: user profile + sign out */}
      <div className="border-t border-border/70 p-3 space-y-1">
        {userProfile ? (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-foreground leading-none">{userProfile.name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">{userProfile.role}</p>
            </div>
          </div>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={onSignOut}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="h-dvh overflow-hidden bg-background text-foreground">
      <div className="flex h-full">
        {/* Desktop sidebar — animated width collapse */}
        <aside
          className={cn(
            "sticky top-0 hidden h-dvh shrink-0 border-r border-border/80 bg-background overflow-hidden transition-[width] duration-200 md:block",
            sidebarCollapsed ? "w-0 border-r-0" : "w-[18rem]",
          )}
        >
          <SidebarContent />
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
            "fixed inset-y-0 left-0 z-50 w-[min(18rem,85vw)] border-r border-border/80 bg-background shadow-2xl transition-transform duration-200 md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full",
          )}
        >
          <SidebarContent mobile />
        </aside>

        {/* Main content */}
        <main className="flex h-dvh min-w-0 flex-1 flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3 px-3 py-3 sm:px-6 lg:px-8">
                <div className="flex min-w-0 items-center gap-3">
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
                  {/* Desktop: expand sidebar when collapsed */}
                  {sidebarCollapsed ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setSidebarCollapsed(false)}
                        aria-label="Expand sidebar"
                        className="hidden md:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      >
                        <PanelLeftOpen className="h-[1.1rem] w-[1.1rem]" />
                      </button>
                      <span className="hidden md:block h-5 w-px shrink-0 bg-border/60" />
                    </>
                  ) : null}
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground/70">{subtitle}</p>
                    <h1 className="truncate text-lg font-semibold sm:text-xl">{title}</h1>
                  </div>
                </div>
              </div>
            </header>
            <div className="p-4 sm:p-6 lg:p-8">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};
