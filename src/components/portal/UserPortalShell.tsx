import { ChevronDown, LogOut, Menu } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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

type UserPortalShellProps = {
  title: string;
  subtitle: string;
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
  groups,
  activeId,
  onNavigate,
  onSignOut,
  children,
}: UserPortalShellProps) => {
  const activeItem = flattenItems(groups).find((item) => item.id === activeId) ?? flattenItems(groups)[0];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 backdrop-blur-xl">
        <div className="container mx-auto flex h-14 items-center justify-between gap-3 px-3 sm:h-16 sm:px-4">
          <div className="flex min-w-0 items-center gap-3">
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
                    <Button type="button" variant="outline" className="w-full justify-start" onClick={onSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </Button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
            <BrandLogo showText imgClassName="h-9 w-9 sm:h-10 sm:w-10" textClassName="min-w-0 text-sm sm:text-base" className="min-w-0" />
            <div className="hidden min-w-0 lg:block">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
                {subtitle}
              </p>
              <p className="truncate text-sm font-medium text-foreground/85">{activeItem?.label ?? title}</p>
            </div>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {groups.map((group) => {
              const isGroupActive = group.items.some((item) => item.id === activeId);
              return (
                <DropdownMenu key={group.id}>
                  <DropdownMenuTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className={cn(
                        "gap-2 rounded-full px-4 text-sm font-medium",
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

          <div className="hidden items-center gap-2 lg:flex">
            <div className="rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              {activeItem?.label ?? title}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={onSignOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>

        </div>
      </header>

      <main className="container mx-auto px-3 py-3 sm:px-4 sm:py-8">
        <section className="mb-4 rounded-3xl border border-border/70 bg-card/80 p-4 shadow-sm sm:mb-6 sm:p-5 md:p-6">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground/75">
            {subtitle}
          </p>
          <div className="mt-2 flex flex-col gap-3 sm:mt-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            <div>
              <h1 className="text-xl font-semibold leading-tight sm:text-3xl">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Navigate the organization workflow from the grouped menu above.
              </p>
            </div>
            <div className="inline-flex w-fit rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-xs font-medium text-primary sm:text-sm">
              {activeItem?.label ?? title}
            </div>
          </div>
        </section>

        {children}
      </main>
    </div>
  );
};
