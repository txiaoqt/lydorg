import { Activity, ChevronDown, LogOut, Monitor, Moon, Settings, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAdminTheme } from "@/admin/context/AdminThemeContext";
import { cn } from "@/lib/utils";

type AdminProfileMenuProps = {
  userProfile: { name: string; email: string };
  onSettings: () => void;
  onActivityLogs: () => void;
  onSignOut: () => void;
};

const getAvatarInitial = (name: string) => {
  const firstName = name.trim().split(/\s+/)[0] ?? "";
  return firstName.charAt(0).toUpperCase() || "?";
};

export const AdminProfileMenu = ({ userProfile, onSettings, onActivityLogs, onSignOut }: AdminProfileMenuProps) => {
  const { theme, setTheme } = useAdminTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-muted/60 dark:hover:bg-slate-800/60"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-public-bg-brand font-segoe text-sm leading-[120%] text-public-text-on-brand">
            {getAvatarInitial(userProfile.name)}
          </div>
          <span className="max-w-[120px] truncate font-segoe text-sm font-semibold leading-[140%] text-foreground">
            {userProfile.name}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[210px] rounded-lg border border-border bg-popover p-1 shadow-lg">
        <DropdownMenuLabel className="flex flex-col gap-1 px-3 py-2.5 font-normal">
          <span className="truncate font-segoe text-sm font-semibold leading-[140%] text-foreground">
            {userProfile.name}
          </span>
          <span className="truncate font-segoe text-xs leading-none text-muted-foreground">{userProfile.email}</span>
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator className="bg-border" />
        
        {/* Appearance / Theme Switcher */}
        <div className="px-2 py-1.5">
          <p className="px-1.5 pb-1.5 font-segoe text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Appearance
          </p>
          <div className="grid grid-cols-3 gap-1 rounded-md bg-muted/60 p-1">
            <button
              type="button"
              onClick={() => setTheme("light")}
              title="Light appearance"
              className={cn(
                "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition-all",
                theme === "light"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Sun className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span>Light</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("dark")}
              title="Dark appearance"
              className={cn(
                "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition-all",
                theme === "dark"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Moon className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span>Dark</span>
            </button>
            <button
              type="button"
              onClick={() => setTheme("system")}
              title="Match system appearance"
              className={cn(
                "flex items-center justify-center gap-1 rounded px-1.5 py-1 text-[11px] font-medium transition-all",
                theme === "system"
                  ? "bg-background text-foreground shadow-2xs font-semibold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Monitor className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
              <span>Auto</span>
            </button>
          </div>
        </div>

        <DropdownMenuSeparator className="bg-border" />

        <DropdownMenuItem
          onClick={onSettings}
          className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-segoe text-sm leading-none text-foreground focus:bg-muted focus:text-foreground"
        >
          <Settings className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={onActivityLogs}
          className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-segoe text-sm leading-none text-foreground focus:bg-muted focus:text-foreground"
        >
          <Activity className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.6} />
          Activity Logs
        </DropdownMenuItem>
        
        <DropdownMenuSeparator className="bg-border" />
        
        <DropdownMenuItem
          onClick={onSignOut}
          className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2 font-segoe text-sm leading-none text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.6} />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
