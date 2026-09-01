import { useState } from "react";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  Lock,
  Pencil,
  Save,
  Shield,
  Trash2,
  UserPlus,
  UserX,
  X,
} from "lucide-react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { ADMIN_PERMISSION_GROUPS } from "@/lib/admin-permissions";
import type { AdminRoleRecord } from "@/lib/lydo-connect-data";

const FIELD_CLASS =
  "flex h-8 w-full items-center gap-1.5 rounded-md border border-slate-300 bg-admin-surface px-2.5 py-2 font-segoe text-[13px] font-normal leading-[140%] text-text-default outline-none placeholder:text-text-disabled";

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="flex items-center gap-1 font-segoe text-[13px] font-normal leading-none text-text-default">
    {children}
    <span className="text-icon-danger-secondary">*</span>
  </label>
);

const getAccessPreviewGroups = (permissionCodes: string[]) =>
  ADMIN_PERMISSION_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissionCodes.includes(item.code)),
  })).filter((group) => group.items.length > 0);

type AdministratorFormDialogProps = {
  mode: "create" | "edit" | null;
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  email: string;
  onEmailChange: (value: string) => void;
  existingEmails: string[];
  roleOptions: AdminRoleRecord[];
  roleId: number | null;
  onRoleIdChange: (id: number) => void;
  unitOptions: { id: number; code: string; label: string }[];
  unitId: number | null;
  onUnitIdChange: (id: number) => void;
  isActive: boolean;
  isPasswordSet: boolean;
  isSelf: boolean;
  onSuspendToggle: () => void;
  onDeleteAdministrator: () => void;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
};

export const AdministratorFormDialog = ({
  mode,
  displayName,
  onDisplayNameChange,
  email,
  onEmailChange,
  existingEmails,
  roleOptions,
  roleId,
  onRoleIdChange,
  unitOptions,
  unitId,
  onUnitIdChange,
  isActive,
  isPasswordSet,
  isSelf,
  onSuspendToggle,
  onDeleteAdministrator,
  saving,
  onCancel,
  onSave,
}: AdministratorFormDialogProps) => {
  const [accessPreviewExpanded, setAccessPreviewExpanded] = useState(false);

  const selectedRole = roleOptions.find((role) => role.id === roleId) ?? null;
  const selectedUnit = unitOptions.find((unit) => unit.id === unitId) ?? null;
  const accessPreviewGroups = selectedRole ? getAccessPreviewGroups(selectedRole.permissionCodes) : [];

  const trimmedEmail = email.trim().toLowerCase();
  const isDuplicateEmail = mode === "create" && trimmedEmail !== "" && existingEmails.includes(trimmedEmail);

  return (
    <Dialog open={mode === "create" || mode === "edit"} onOpenChange={(open) => (!open ? onCancel() : undefined)}>
      <DialogContent
        hideCloseButton
        className="flex w-[560px] sm:w-[560px] max-w-[calc(100vw-2rem)] max-h-[calc(100dvh-2rem)] flex-col gap-6 overflow-y-auto rounded-md sm:rounded-md border border-gray-200 bg-admin-surface p-6 sm:p-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-300 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] bg-public-bg-secondary-100 p-2">
              {mode === "edit" ? (
                <Pencil className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
              ) : (
                <UserPlus className="h-5 w-5 text-public-text-brand-secondary" strokeWidth={1.6} />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <DialogTitle className="font-segoe text-lg font-semibold leading-none text-text-default">
                {mode === "edit" ? "Edit Administrator" : "Add Administrator"}
              </DialogTitle>
              <p className="font-segoe text-sm font-normal leading-none text-slate-500">
                {mode === "edit"
                  ? "Update an existing administrator's account and permissions."
                  : "Create a new administrator account and assign system access."}
              </p>
            </div>
          </div>
          <DialogClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="h-5 w-5 shrink-0 border-0 bg-transparent p-0 text-border-default transition-colors hover:text-public-text-secondary"
            >
              <X className="h-5 w-5" strokeWidth={2} />
            </button>
          </DialogClose>
        </div>

        <div className="flex flex-col gap-4 rounded-md border border-slate-300 bg-gray-50 p-6">
          <div className="flex flex-col gap-1.5">
            <Label>Full Name</Label>
            <input
              value={displayName}
              onChange={(event) => onDisplayNameChange(event.target.value)}
              placeholder="e.g. John Doe"
              className={FIELD_CLASS}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            {mode === "edit" ? (
              <div className="flex items-center gap-1.5">
                <Label>Email Address</Label>
                <span className="font-segoe text-[13px] font-normal leading-none text-public-text-secondary">
                  (Read-Only Identifier)
                </span>
                <span className="ml-auto inline-flex items-center gap-1 rounded border-[0.6px] border-slate-300 bg-admin-surface px-1.5 py-1 font-cascadia text-[8px] font-semibold leading-[140%] text-slate-500">
                  <Lock className="h-2.5 w-2.5 shrink-0" strokeWidth={1.6} />
                  READ-ONLY
                </span>
              </div>
            ) : (
              <Label>Email Address</Label>
            )}
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder="e.g. name@example.com"
              disabled={mode === "edit"}
              className={cn(
                FIELD_CLASS,
                mode === "edit" && "border-slate-300 bg-bg-neutral-subtle text-text-default",
                isDuplicateEmail && "border-icon-danger-secondary",
              )}
            />
            {mode === "edit" ? (
              <p className="font-segoe text-[11px] font-normal leading-[140%] text-slate-500">
                Official email addresses cannot be altered after account creation to maintain audit logs and security
                integrity.
              </p>
            ) : isDuplicateEmail ? (
              <p className="font-segoe text-[11px] font-normal leading-[140%] text-icon-danger-secondary">
                An administrator with this email already exists.
              </p>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>Administrative Role</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={cn(FIELD_CLASS, "justify-between")}>
                    <span className={selectedRole ? "text-text-default" : "text-text-disabled"}>
                      {selectedRole ? selectedRole.label : "Select role"}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] border-slate-300">
                  {roleOptions.map((role) => (
                    <DropdownMenuItem key={role.id} className="cursor-pointer" onClick={() => onRoleIdChange(role.id)}>
                      {role.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Office Unit</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button type="button" className={cn(FIELD_CLASS, "justify-between")}>
                    <span
                      className={cn(
                        "min-w-0 truncate whitespace-nowrap text-[11px]",
                        selectedUnit ? "text-text-default" : "text-text-disabled",
                      )}
                    >
                      {selectedUnit ? selectedUnit.label : "Select unit"}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[--radix-dropdown-menu-trigger-width] border-slate-300">
                  {unitOptions.map((unit) => (
                    <DropdownMenuItem key={unit.id} className="cursor-pointer" onClick={() => onUnitIdChange(unit.id)}>
                      {unit.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {mode === "create" ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-status-active-border bg-bg-success-subtle p-4">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 shrink-0 rounded-full bg-positive-secondary" />
              <p className="font-segoe text-[13px] font-semibold leading-[140%] text-positive-secondary">
                Initial Status: Invitation Pending
              </p>
            </div>
            <p className="font-segoe text-[13px] font-normal leading-[140%] text-positive-secondary">
              They&rsquo;ll set their own password using the link after you create this account.
            </p>
          </div>
        ) : null}

        {selectedRole ? (
          <div className="flex flex-col gap-4">
            <button
              type="button"
              onClick={() => setAccessPreviewExpanded((value) => !value)}
              className="flex h-12 items-center justify-between gap-2 rounded-md border border-slate-300 bg-gray-50 px-4 py-3 transition-colors hover:bg-slate-50"
            >
              <span className="flex items-center gap-2 font-segoe text-[13px] font-normal leading-[140%] text-text-default">
                <Shield className="h-4 w-4 shrink-0 text-public-text-neutral-default" strokeWidth={1.6} />
                Inherited Access Preview ({selectedRole.label})
              </span>
              {accessPreviewExpanded ? (
                <ChevronDown className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 text-text-disabled" strokeWidth={1.6} />
              )}
            </button>

            {accessPreviewExpanded ? (
              <div className="flex flex-col gap-4">
                {accessPreviewGroups.map((group) => (
                  <div key={group.label} className="flex flex-col gap-1.5">
                    <p className="font-segoe text-[11px] font-semibold leading-none text-slate-500">{group.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {group.items.map((item) => (
                        <span
                          key={item.code}
                          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-access-pill-border bg-access-pill-bg px-2 py-1.5 font-segoe text-[11px] font-semibold leading-[140%] text-public-text-brand-secondary"
                        >
                          <Check className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                          {item.label}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}

        {mode === "edit" ? (
          <>
            <div className="border-t border-slate-300" />

            <div className="flex items-center justify-between gap-2 rounded-md border border-slate-300 bg-gray-50 p-6">
              <div className="flex items-center gap-2">
                <p className="font-segoe text-[13px] font-normal leading-none text-text-default">Current Status:</p>
                {!isPasswordSet ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
                    Invitation Pending
                  </span>
                ) : isActive ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-success-subtle bg-bg-success-subtle px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-positive-secondary">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border-warning-subtle bg-amber-50 px-2 py-1 font-segoe text-xs font-semibold leading-[140%] text-text-warning-secondary">
                    Suspended
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onSuspendToggle}
                disabled={isSelf || saving}
                className="flex h-[34px] shrink-0 items-center gap-2 rounded-md border border-status-warning-border bg-admin-surface px-3 py-2 font-segoe text-[13px] font-normal leading-[140%] text-text-warning-secondary transition-colors hover:bg-amber-50 disabled:opacity-50 disabled:pointer-events-none"
              >
                <UserX className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                {isActive ? "Suspend Administrator" : "Reactivate Administrator"}
              </button>
            </div>

            <div className="flex flex-col gap-2.5 rounded-md border border-status-danger-border bg-danger-subtle p-6">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-icon-danger-secondary" strokeWidth={1.6} />
                <p className="font-segoe text-[13px] font-bold uppercase leading-[120%] text-icon-danger-secondary">
                  Danger Zone
                </p>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex max-w-[260px] flex-col gap-0.5">
                  <p className="text-justify font-segoe text-[13px] font-semibold leading-[120%] text-icon-danger-secondary">
                    Delete Administrator Account
                  </p>
                  <p className="text-justify font-segoe text-[11px] font-normal leading-[120%] text-icon-danger-secondary">
                    Permanently removes this administrator&rsquo;s account and login access. Past activity will remain in
                    the Activity Log for audit purposes. This action cannot be undone.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onDeleteAdministrator}
                  disabled={isSelf || saving}
                  className="flex h-[34px] shrink-0 items-center gap-2 rounded-md border border-status-danger-border-strong bg-admin-surface px-3 py-2 font-segoe text-[13px] font-normal leading-[140%] text-icon-danger-secondary transition-colors hover:bg-danger-subtle disabled:opacity-50 disabled:pointer-events-none"
                >
                  <Trash2 className="h-[13px] w-[13px] shrink-0" strokeWidth={1.6} />
                  Delete Administrator
                </button>
              </div>
            </div>
          </>
        ) : null}

        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="h-11 rounded-md border border-slate-300 bg-admin-surface px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-text-default transition-colors hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving || isDuplicateEmail}
            className="flex h-11 items-center gap-2 rounded-md bg-public-bg-brand px-4 py-3 font-segoe text-public-fs-body-sm font-normal leading-[140%] text-public-text-neutral-on-neutral transition-colors hover:bg-bg-brand-hover disabled:opacity-50"
          >
            {mode === "edit" ? (
              <Save className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            ) : (
              <UserPlus className="h-4 w-4 shrink-0" strokeWidth={1.6} />
            )}
            {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Administrator"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
