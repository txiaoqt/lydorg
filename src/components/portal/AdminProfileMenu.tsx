import { Activity, ChevronDown, LogOut, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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

export const AdminProfileMenu = ({ userProfile, onSettings, onActivityLogs, onSignOut }: AdminProfileMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <button
        type="button"
        className="flex items-center gap-3 rounded-md px-2.5 py-2.5 transition-colors hover:bg-slate-50"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] bg-public-bg-brand font-segoe text-sm leading-[120%] text-public-text-on-brand">
          {getAvatarInitial(userProfile.name)}
        </div>
        <span className="max-w-[100px] truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
          {userProfile.name}
        </span>
        <ChevronDown className="h-5 w-5 shrink-0 text-text-disabled" strokeWidth={1.6} />
      </button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} className="w-[172px] rounded-md border border-gray-200 p-1 shadow-lg">
      <DropdownMenuLabel className="flex flex-col gap-1.5 px-3 py-3 font-normal">
        <span className="truncate font-segoe text-sm font-semibold leading-[140%] text-text-default">
          {userProfile.name}
        </span>
        <span className="truncate font-segoe text-xs leading-none text-slate-500">{userProfile.email}</span>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onSettings}
        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 font-segoe text-sm leading-none text-text-default focus:bg-slate-50 focus:text-text-default"
      >
        <Settings className="h-4 w-4 shrink-0" strokeWidth={1.6} />
        Settings
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={onActivityLogs}
        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 font-segoe text-sm leading-none text-text-default focus:bg-slate-50 focus:text-text-default"
      >
        <Activity className="h-4 w-4 shrink-0" strokeWidth={1.6} />
        Activity Logs
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        onClick={onSignOut}
        className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-2.5 font-segoe text-sm leading-none text-icon-danger-secondary focus:bg-danger-subtle focus:text-icon-danger-secondary"
      >
        <LogOut className="h-4 w-4 shrink-0" strokeWidth={1.6} />
        Sign out
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);
