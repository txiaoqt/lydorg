import { useEffect, useState } from "react";
import { Command as CommandPrimitive } from "cmdk";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import type { PortalNavItem } from "@/lib/lydo-connect-data";

type AdminSearchPaletteProps = {
  pages: PortalNavItem[];
  onNavigate: (id: string) => void;
};

const kbdPillClasses =
  "flex h-[22px] shrink-0 items-center justify-center rounded border border-border bg-muted/80 px-1.5 font-cascadia text-[10px] leading-[140%] text-muted-foreground";

export const AdminSearchPalette = ({ pages, onNavigate }: AdminSearchPaletteProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSelect = (id: string) => {
    onNavigate(id);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="group flex h-10 w-full max-w-[400px] items-center gap-2 rounded-md border border-border bg-admin-surface px-3.5 py-2.5 text-left transition-colors hover:border-primary/50"
        >
          <Search className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" strokeWidth={1.6} />
          <span className="min-w-0 flex-1 truncate font-segoe text-sm leading-[140%] text-muted-foreground group-hover:text-foreground">
            Search pages...
          </span>
          <span
            className={cn(
              kbdPillClasses,
              "group-hover:border-primary/30 group-hover:text-foreground",
            )}
          >
            Ctrl+K
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={8}
        className="w-[500px] max-h-[599px] overflow-hidden rounded-lg border border-border bg-popover p-0 shadow-lg"
      >
        <Command shouldFilter className="bg-popover text-popover-foreground">
          <div className="flex h-11 items-center gap-2 border-b border-border px-3.5 py-2.5">
            <Search className="h-4 w-4 shrink-0 text-primary" strokeWidth={1.6} />
            <CommandPrimitive.Input
              placeholder="Search pages..."
              className="h-auto min-w-0 flex-1 border-0 bg-transparent p-0 font-segoe text-sm leading-[140%] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <span className={kbdPillClasses}>ESC</span>
          </div>
          <CommandList className="max-h-[559px] p-2">
            <CommandEmpty className="py-6 text-center font-segoe text-sm text-muted-foreground">
              No matching pages.
            </CommandEmpty>
            <CommandGroup
              heading="Pages"
              className="p-0 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:font-segoe [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:leading-[140%] [&_[cmdk-group-heading]]:text-muted-foreground"
            >
              {pages.map((item) => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={item.label}
                    onSelect={() => handleSelect(item.id)}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 font-segoe text-sm leading-[140%] text-foreground transition-colors",
                      "data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};
