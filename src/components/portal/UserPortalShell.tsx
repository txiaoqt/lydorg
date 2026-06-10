import { useState } from "react";
import { Bell, ChevronDown, LogOut, Menu, User } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
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
  const activeItem = flattenItems(groups).find((item) => item.id === activeId) ?? flattenItems(groups)[0];
  const initials = userDisplayName
    ? userDisplayName.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase()
    : "";
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;
  const recentNotifications = [...(notifications ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-4">
          {/* Left — logo */}
          <div className="flex flex-1 min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button type="button" variant="outline" size="icon" className="lg:hidden shrink-0">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(20rem,88vw)] overflow-y-auto">
                <SheetHeader className="pr-8">
                  <BrandLogo showText imgClassName="h-10 w-10" className="min-w-0" />
                  <SheetTitle>{title}</SheetTitle>
                  <SheetDescription>{subtitle}</SheetDescription>
                </SheetHeader>
                {(userDisplayName || userEmail) && (
                  <div className="mt-3 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
                    {userDisplayName && <p className="text-sm font-medium">{userDisplayName}</p>}
                    {userEmail && <p className="text-xs text-muted-foreground mt-0.5">{userEmail}</p>}
                  </div>
                )}
                <div className="mt-6 space-y-5">
                  {groups.map((group) => (
                    <div key={group.id}>
                      <p className="px-1 pb-2 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
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
                                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
                                  active
                                    ? "bg-primary/10 text-primary ring-1 ring-primary/10"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                )}
                              >
                                <Icon className="h-4 w-4 shrink-0" />
                                <span>{item.label}</span>
                              </button>
                            </SheetClose>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                  <SheetClose asChild>
                    <Button type="button" variant="outline" className="w-full justify-start text-destructive hover:text-destructive" onClick={() => setSignOutConfirmOpen(true)}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
            <button type="button" onClick={() => onNavigate("dashboard")} className="inline-flex min-w-0 focus-visible:outline-none">
              <BrandLogo showText imgClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="min-w-0 text-sm sm:text-base" className="min-w-0" />
            </button>
          </div>

          {/* Center — nav group dropdowns */}
          <nav className="hidden items-center gap-2 lg:flex">
            {groups.map((group) => {
              const isGroupActive = group.items.some((item) => item.id === activeId);
              if (group.items.length === 1) {
                return (
                  <Button
                    key={group.id}
                    type="button"
                    variant="ghost"
                    className={cn(
                      "rounded-lg px-4 text-sm font-medium",
                      isGroupActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                    )}
                    onClick={() => onNavigate(group.items[0].id)}
                  >
                    {group.items[0].label}
                  </Button>
                );
              }
              return (
                <DropdownMenu key={group.id}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "gap-2 rounded-lg px-4 text-sm font-medium",
                        isGroupActive && "bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary",
                      )}
                    >
                      {group.label}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="center" className="min-w-[240px]">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const active = item.id === activeId;
                      return (
                        <DropdownMenuItem
                          key={item.id}
                          className={cn("gap-2 py-2", active && "bg-primary/10 text-primary focus:bg-primary/10 focus:text-primary")}
                          onClick={() => onNavigate(item.id)}
                        >
                          <Icon className="h-4 w-4" />
                          <span>{item.label}</span>
                        </DropdownMenuItem>
                      );
                    })}
                  </DropdownMenuContent>
                </DropdownMenu>
              );
            })}
          </nav>

          {/* Right — bell + avatar dropdown */}
          <div className="flex flex-1 hidden items-center justify-end gap-1 lg:flex">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-muted focus-visible:outline-none"
                  aria-label="Notifications"
                >
                  <Bell className="h-4 w-4" />
                  {unreadCount > 0 && (
                    <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <div className="flex items-center justify-between px-3 py-2">
                  <p className="text-sm font-semibold">Notifications</p>
                  {unreadCount > 0 && onMarkAllRead && (
                    <button type="button" onClick={onMarkAllRead} className="text-xs text-primary hover:underline">
                      Mark all as read
                    </button>
                  )}
                </div>
                <DropdownMenuSeparator />
                {recentNotifications.length === 0 ? (
                  <div className="px-3 py-6 text-center text-sm text-muted-foreground">No notifications yet.</div>
                ) : (
                  <div>
                    {recentNotifications.map((n) => (
                      <div key={n.id} className="flex gap-2.5 border-b border-border/40 px-3 py-2.5 last:border-0">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.isRead ? "bg-transparent" : "bg-primary"}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`text-sm leading-tight ${n.isRead ? "font-normal text-muted-foreground" : "font-medium text-foreground"}`}>
                              {n.title}
                            </p>
                            <p className="shrink-0 text-[10px] text-muted-foreground/60">
                              {new Date(n.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{n.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate("notifications")} className="justify-center text-sm text-primary hover:bg-primary hover:text-white focus:bg-primary focus:text-white">
                  View all notifications
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ring-2 ring-primary/20 transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Account menu"
                >
                  {initials || <User className="h-4 w-4" />}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium leading-tight">{userDisplayName ?? "Organization"}</p>
                  {userEmail && <p className="mt-0.5 text-xs text-muted-foreground">{userEmail}</p>}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate("organization-profile")} className="cursor-pointer gap-2">
                  <User className="h-4 w-4" />
                  My Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setSignOutConfirmOpen(true)}
                  className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-3 sm:px-4 sm:py-8">
        <section className="mb-4 rounded-2xl border border-border/60 bg-card/60 px-4 py-3 sm:mb-6 sm:px-5 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/60">
                {subtitle}
              </p>
              <h1 className="mt-0.5 truncate text-base font-semibold sm:text-lg">{title}</h1>
            </div>
            <div className="shrink-0 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary sm:text-sm">
              {activeItem?.label ?? title}
            </div>
          </div>
        </section>

        {children}
      </main>

      <AlertDialog open={signOutConfirmOpen} onOpenChange={setSignOutConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out?</AlertDialogTitle>
            <AlertDialogDescription>You will be returned to the login page.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onSignOut}>Sign Out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
