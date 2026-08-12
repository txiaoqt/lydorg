import { useEffect, useState } from "react";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  User,
  Sun,
  Moon,
  LayoutGrid,
  Sparkles,
  CheckCircle2,
  Clock,
  Layers,
  ShieldCheck,
  FileText
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { PortalNavGroup } from "./PortalShell";
import { UserFeatureIcon } from "./UserFeatureIcon";

type NotificationItem = {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

type UserPortalShellProps = {
  title: string;
  subtitle: string;
  hidePageBanner?: boolean;
  userDisplayName?: string;
  userEmail?: string;
  notifications?: NotificationItem[];
  onMarkAllRead?: () => void;
  groups: PortalNavGroup[];
  activeId: string;
  onNavigate: (id: string) => void;
  onSignOut: () => void;
  children: React.ReactNode;
};

const flattenItems = (groups: PortalNavGroup[]) => groups.flatMap((group) => group.items);

export const UserPortalShell = ({
  title,
  subtitle,
  hidePageBanner = false,
  userDisplayName,
  userEmail,
  notifications,
  onMarkAllRead,
  groups,
  activeId,
  onNavigate,
  onSignOut,
  children,
}: UserPortalShellProps) => {
  const [signOutConfirmOpen, setSignOutConfirmOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("theme-mode");
      if (saved === "dark") return true;
      if (saved === "light") return false;
      return (
        document.documentElement.classList.contains("dark") ||
        document.body.classList.contains("dark")
      );
    }
    return false;
  });

  const activeItem = flattenItems(groups).find((item) => item.id === activeId) ?? flattenItems(groups)[0];
  const initials = userDisplayName
    ? userDisplayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "";
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const recentNotifications = [...(notifications ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  // Sync global document theme class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      localStorage.setItem("theme-mode", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      localStorage.setItem("theme-mode", "light");
    }
  }, [isDarkMode]);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [activeId]);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      {/* Sticky Integrated Glassmorphic Navbar (Height ~60px, max-w-[1440px]) */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 dark:bg-background/80 backdrop-blur-2xl transition-colors">
        <div className="max-w-[1440px] mx-auto flex h-15 sm:h-16 items-center justify-between gap-3 px-3 sm:px-6">
          {/* Left — Logo & Mobile Trigger */}
          <div className="flex items-center gap-3 min-w-0">
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="lg:hidden shrink-0 h-9 w-9 rounded-xl border-border">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(20rem,88vw)] overflow-y-auto bg-card border-border safe-area-bottom">
                <SheetHeader className="pr-8">
                  <BrandLogo showText={false} className="min-w-0" />
                  <SheetTitle className="text-base font-bold text-foreground mt-2">{title}</SheetTitle>
                  <SheetDescription className="text-xs text-muted-foreground">{subtitle}</SheetDescription>
                </SheetHeader>

                {/* Mobile User Profile Button */}
                {(userDisplayName || userEmail) && (
                  <SheetClose asChild>
                    <button
                      type="button"
                      onClick={() => onNavigate("organization-profile")}
                      aria-label="Open My Profile"
                      className="mt-3 w-full rounded-2xl border border-border/70 bg-accent/30 p-3 text-left transition-all hover:bg-accent focus-visible:outline-none"
                    >
                      {userDisplayName && <p className="text-xs font-bold text-foreground">{userDisplayName}</p>}
                      {userEmail && <p className="mt-0.5 text-[11px] text-muted-foreground">{userEmail}</p>}
                    </button>
                  </SheetClose>
                )}

                {/* Mobile Nav Links */}
                <div className="mt-5 space-y-4">
                  {groups.map((group) => (
                    <div key={group.id} className="space-y-1">
                      <p className="px-1 pb-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        {group.label}
                      </p>
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          const active = item.id === activeId;
                          return (
                            <SheetClose asChild key={item.id}>
                              <button
                                type="button"
                                onClick={() => onNavigate(item.id)}
                                className={cn(
                                  "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-medium transition-colors",
                                  active
                                    ? "bg-primary/10 text-primary font-semibold"
                                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                                )}
                              >
                                <Icon className="h-4 w-4" />
                                <span>{item.label}</span>
                              </button>
                            </SheetClose>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Mobile Toggles */}
                  <div className="space-y-2 pt-2 border-t border-border/40">
                    <p className="px-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Preferences</p>
                    <button
                      type="button"
                      onClick={toggleDarkMode}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground transition-colors touch-target"
                    >
                      {isDarkMode ? (
                        <>
                          <Sun className="h-4 w-4 text-amber-400" />
                          <span>Switch to Light Mode</span>
                        </>
                      ) : (
                        <>
                          <Moon className="h-4 w-4 text-indigo-500" />
                          <span>Switch to Dark Mode</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Mobile Sign Out */}
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-destructive hover:text-destructive rounded-xl text-xs h-10 mt-2 touch-target"
                      onClick={() => setSignOutConfirmOpen(true)}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>

            <button type="button" onClick={() => onNavigate("dashboard")} className="inline-flex items-center focus-visible:outline-none group cursor-pointer">
              <BrandLogo showText={false} className="min-w-0 transition-transform group-hover:scale-105" />
            </button>
          </div>

          {/* Center — Horizontal Navigation Items with Modern Rounded Full Pills */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-accent/30 p-1 rounded-full border border-border/50 shadow-2xs">
            {groups.map((group) => {
              const isGroupActive = group.items.some((item) => item.id === activeId);
              if (group.items.length === 1) {
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={cn(
                      "rounded-full px-3.5 py-1 text-xs transition-all",
                      isGroupActive
                        ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/80 font-medium"
                    )}
                    onClick={() => onNavigate(group.items[0].id)}
                  >
                    {group.items[0].label}
                  </button>
                );
              }

              return (
                <DropdownMenu key={group.id} modal={false}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "flex items-center gap-1 rounded-full px-3.5 py-1 text-xs transition-all",
                        isGroupActive
                          ? "bg-primary text-primary-foreground font-semibold shadow-2xs"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/80 font-medium"
                      )}
                    >
                      <span>{group.label}</span>
                      <ChevronDown className="h-3 w-3 opacity-70" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[220px] p-2 rounded-2xl bg-card border-border/80 shadow-xl space-y-1">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = item.id === activeId;
                      return (
                        <DropdownMenuItem
                          key={item.id}
                          className={cn(
                            "gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-colors",
                            active ? "bg-primary/10 text-primary font-semibold" : "hover:bg-accent"
                          )}
                          onClick={() => onNavigate(item.id)}
                        >
                          <Icon className="h-4 w-4 text-primary shrink-0" />
                          <div>
                            <p className="font-semibold text-xs leading-none">{item.label}</p>
                          </div>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Right — Dark Mode + Bell + User Menu */}
          <div className="flex items-center gap-2">

            {/* Global Twin Pill: Dark / Light Mode */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 hover:bg-accent px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:scale-[1.02] active:scale-[0.98] transition-all shadow-2xs"
            >
              {isDarkMode ? (
                <>
                  <Sun className="h-3.5 w-3.5 text-amber-400" />
                  <span>Light</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Dark</span>
                </>
              )}
            </button>

            {/* Notification Bell Dropdown */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex h-8 w-8 items-center justify-center rounded-full border border-border/80 bg-background/80 hover:bg-accent transition-all focus-visible:outline-none shadow-2xs"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4 text-foreground" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-destructive animate-pulse" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] sm:w-80 max-w-80 p-3 rounded-2xl bg-card border-border/80 shadow-xl space-y-2">
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs font-bold text-foreground">Notifications</p>
                  {unreadCount > 0 && onMarkAllRead && (
                    <button type="button" onClick={onMarkAllRead} className="text-[11px] font-semibold text-primary hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator className="my-1" />
                {recentNotifications.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">No notifications yet.</div>
                ) : (
                  <div className="space-y-1.5">
                    <p className="px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recent</p>
                    {recentNotifications.map((n) => (
                      <div key={n.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-accent/50 transition-colors">
                        <span className={cn("mt-1 h-1.5 w-1.5 shrink-0 rounded-full", n.isRead ? "bg-transparent" : "bg-primary")} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-1">
                            <p className={cn("text-xs leading-tight", n.isRead ? "font-normal text-muted-foreground" : "font-semibold text-foreground")}>
                              {n.title}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {new Date(n.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                            </span>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem
                  onClick={() => onNavigate("notifications")}
                  className="justify-center text-xs font-semibold text-primary cursor-pointer hover:bg-primary/10 rounded-xl py-1.5"
                >
                  View All Notifications →
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Account Avatar Dropdown */}
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold ring-2 ring-primary/20 transition-transform hover:scale-105 focus-visible:outline-none"
                  aria-label="Account menu"
                >
                  {initials || <User className="h-4 w-4" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 p-2 rounded-2xl bg-card border-border/80 shadow-xl space-y-1">
                <div className="px-2 py-2">
                  <p className="text-xs font-extrabold text-foreground leading-tight">{userDisplayName ?? "Organization"}</p>
                  <p className="text-[10px] font-medium text-muted-foreground mt-0.5">Organization User</p>
                  {userEmail && <p className="mt-0.5 text-[11px] text-muted-foreground/80 truncate">{userEmail}</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onNavigate("organization-profile")}
                  className="cursor-pointer gap-2.5 p-2 rounded-xl text-xs font-medium hover:bg-accent"
                >
                  <User className="h-3.5 w-3.5 text-primary" />
                  <span>My Profile</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSignOutConfirmOpen(true)}
                  className="cursor-pointer gap-2.5 p-2 rounded-xl text-xs font-semibold text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className={cn("container mx-auto px-3 sm:px-4", hidePageBanner ? "pt-3 pb-8" : "py-3 sm:py-6")}>
        {!hidePageBanner ? (
          <section className="mb-4 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 sm:mb-6 sm:px-5 sm:py-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                  {subtitle}
                </p>
                <h1 className="mt-0.5 break-words text-base font-semibold sm:text-lg">{title}</h1>
              </div>
              <div className="w-fit max-w-full shrink-0 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary sm:text-sm">
                {activeItem?.label ?? title}
              </div>
            </div>
          </section>
        ) : null}

        <div className="mx-auto w-full max-w-[1440px]">
          {children}
        </div>
      </main>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent className="max-w-sm rounded-2xl bg-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">Sign Out</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground">
              Are you sure you want to sign out of your organization account?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-2">
            <AlertDialogCancel className="rounded-xl text-xs h-8">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold h-8"
              onClick={onSignOut}
            >
              Sign Out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
